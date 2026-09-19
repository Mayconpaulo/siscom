import { extname } from "node:path";
import ExcelJS from "exceljs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractParagraphsFromDocx } from "@/lib/docx-zip";
import { buildBadgeColumnMapping, extractBadgeIdentities, parseDelimitedText } from "@/lib/badge-import";
import { PERSONNEL_REPORT_HEADERS, personnelReportRows, type PdfTextItem } from "@/lib/personnel-pdf-table";

export const runtime = "nodejs";
export const maxDuration = 30;

const SUPPORTED_EXTENSIONS = new Set([".pdf", ".docx", ".xlsx", ".csv", ".txt"]);
const MAX_FILE_SIZE = 15 * 1024 * 1024;

function excelValue(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toLocaleDateString("pt-BR");
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("text" in value) return value.text;
  if ("result" in value) return excelValue(value.result ?? "");
  if ("error" in value) return value.error;
  return "";
}

function decodeText(buffer: Buffer) {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("\uFFFD")) return utf8.replace(/^\uFEFF/, "");
  return new TextDecoder("windows-1252").decode(buffer).replace(/^\uFEFF/, "");
}

async function pdfRows(buffer: Buffer) {
  const document = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  try {
    const rows: string[][] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = content.items.flatMap((item) => {
        if (!("str" in item) || !item.str.trim()) return [];
        return [{ text: item.str.trim(), x: item.transform[4], y: item.transform[5] }];
      });
      const personnelRows = personnelReportRows(items);
      if (personnelRows) rows.push(...personnelRows);
      else {
        const text = items
          .sort((a, b) => Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x)
          .map((item) => item.text)
          .join("\n");
        rows.push(...parseDelimitedText(text, ".txt"));
      }
    }
    return rows.length && rows[0].length === PERSONNEL_REPORT_HEADERS.length
      ? [PERSONNEL_REPORT_HEADERS, ...rows]
      : rows;
  } finally {
    await document.destroy();
  }
}

async function documentRows(buffer: Buffer, extension: string) {
  if (extension === ".docx") return extractParagraphsFromDocx(buffer).map((paragraph) => [paragraph]);
  if (extension === ".csv" || extension === ".txt") return parseDelimitedText(decodeText(buffer), extension);
  if (extension === ".xlsx") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const rows: string[][] = [];
    workbook.eachSheet((worksheet) => {
      worksheet.eachRow((row) => {
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => cells.push(excelValue(cell.value).trim()));
        if (cells.some(Boolean)) rows.push(cells);
      });
    });
    return rows;
  }
  return pdfRows(buffer);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente no SISCOM." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecione um documento para importar." }, { status: 400 });
  const extension = extname(file.name).toLocaleLowerCase("pt-BR");
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: "Formato não aceito. Envie PDF, DOCX, XLSX, CSV ou TXT." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "O documento deve ter no máximo 15 MB." }, { status: 400 });

  try {
    const rows = await documentRows(Buffer.from(await file.arrayBuffer()), extension);
    const identities = extractBadgeIdentities(rows);
    const mapping = buildBadgeColumnMapping(rows);
    if (identities.length === 0 && !mapping) {
      const scannedPdf = extension === ".pdf" && rows.join("").trim().length < 30;
      return NextResponse.json({
        error: scannedPdf
          ? "Este PDF parece ser apenas uma imagem. Envie um PDF com texto, Word, Excel, CSV ou TXT."
          : "Não encontrei pares de nome completo e identidade/CPF. Confira se o documento possui essas duas informações.",
      }, { status: 422 });
    }
    return NextResponse.json({ identities, mapping, count: identities.length, limited: identities.length === 500 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível ler o documento." }, { status: 400 });
  }
}
