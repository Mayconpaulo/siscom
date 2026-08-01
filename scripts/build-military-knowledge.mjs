import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const ROOT = process.cwd();
const KNOWLEDGE_PATH = path.join(ROOT, "src", "data", "ceremonial-knowledge.json");
const MANUALS_DIR = path.join(ROOT, "src", "data", "manuals");
const INDEX_SOURCE = "C:\\Users\\mayco\\Downloads\\Pasta RUE - Introdução_Indice.pdf";
const INDEX_FILE = "rue-indice.pdf";

const publications = [
  ["00123820630fbcfd2df8f", "u0poWRjmkFtY"],
  ["0012382064be93ef2b326", "iEhKN1rWMVGh"],
  ["00123820620f5e3a95e68", "sYoSVDemqmtw"],
  ["0012382063f3020e08963", "t9o0g4lOPAre"],
  ["001238206d4c3025b01f4", "SMVcI0TLvQ4o"],
  ["0012382063f8ab4484ebf", "SPKaawEIaSsq"],
  ["001238206d1c9adc51ee4", "ut3PZS0T034m"],
  ["001238206136a78cba68b", "BpWulY1DcU4X"],
  ["001238206d4e7385c7ee5", "xQYCmmxhy6G3"],
  ["001238206038b7ed85e21", "50ExHUYXpJmD"],
  ["0012382067eca8891ab3c", "19kEZv2Rjggr"],
  ["001238206286c63575bf4", "z6LTHUM8xdkb"],
  ["001238206812f88e9c4bb", "hkm2a9FdwpGK"],
  ["001238206f9bf1a7ed8ed", "EwAZWztx3AbK"],
  ["0012382060e09b0806440", "G3FlIhtNmBBV"],
];

function readVarint(buffer, start) {
  let value = 0;
  let shift = 0;
  let offset = start;
  while (offset < buffer.length) {
    const byte = buffer[offset++];
    value += (byte & 0x7f) * 2 ** shift;
    if (!(byte & 0x80)) return [value, offset];
    shift += 7;
    if (shift > 49) throw new Error("Varint inválido");
  }
  throw new Error("Fim inesperado do arquivo binário");
}

function parseFields(buffer) {
  let offset = 0;
  const result = [];
  while (offset < buffer.length) {
    let key;
    [key, offset] = readVarint(buffer, offset);
    const field = key >> 3;
    const wire = key & 7;
    if (wire === 0) {
      let value;
      [value, offset] = readVarint(buffer, offset);
      result.push({ field, wire, value });
    } else if (wire === 1) {
      result.push({ field, wire });
      offset += 8;
    } else if (wire === 2) {
      let length;
      [length, offset] = readVarint(buffer, offset);
      if (offset + length > buffer.length) throw new Error("Campo binário truncado");
      result.push({ field, wire, data: buffer.subarray(offset, offset + length) });
      offset += length;
    } else if (wire === 5) {
      result.push({ field, wire });
      offset += 4;
    } else {
      throw new Error(`Tipo binário desconhecido: ${wire}`);
    }
  }
  return result;
}

function extractStrings(buffer, depth = 0) {
  if (depth > 7) return [];
  let fields;
  try {
    fields = parseFields(buffer);
  } catch {
    return [];
  }
  const strings = [];
  for (const field of fields) {
    if (field.wire !== 2) continue;
    try {
      const value = new TextDecoder("utf-8", { fatal: true }).decode(field.data).replace(/\s+/g, " ").trim();
      const characters = [...value];
      const printable = characters.filter((character) => character >= " " || "\n\r\t".includes(character)).length;
      if (value.length > 3 && printable / Math.max(1, characters.length) > 0.94 && /[A-Za-zÀ-ÿ]/.test(value)) strings.push(value);
    } catch {
      // The field can be another nested protobuf message.
    }
    strings.push(...extractStrings(field.data, depth + 1));
  }
  return strings;
}

function cleanPageStrings(strings) {
  const unique = [];
  for (const value of strings) {
    if (!unique.includes(value)) unique.push(value);
  }
  return unique.filter((value, index) => !unique.some((other, otherIndex) => otherIndex !== index && other.length > value.length + 12 && other.includes(value)));
}

function splitContent(content, maxLength = 3600, overlap = 350) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const parts = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + maxLength, normalized.length);
    if (end < normalized.length) {
      const boundary = Math.max(normalized.lastIndexOf(". ", end), normalized.lastIndexOf("; ", end));
      if (boundary > start + maxLength * 0.6) end = boundary + 1;
    }
    parts.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return parts;
}

function titleFromCalameo(name) {
  return name
    .replace(/^5°_EDIÇÃO_?/i, "RUE 5ª Edição — ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJsonp(value) {
  return JSON.parse(value.slice(value.indexOf("(") + 1, value.lastIndexOf(")")));
}

async function fetchPublication(bookId, authId) {
  const metadataResponse = await fetch(`https://d.calameo.com/3.0.0/book.php?bkcode=${bookId}&authid=${authId}`);
  if (!metadataResponse.ok) throw new Error(`Falha ao consultar ${bookId}: ${metadataResponse.status}`);
  const metadata = parseJsonp(await metadataResponse.text()).content;
  const expires = metadataResponse.headers.get("x-calameo-hash-expires");
  const acl = metadataResponse.headers.get("x-calameo-hash-path");
  const signature = metadataResponse.headers.get("x-calameo-hash-signature");
  if (!expires || !acl || !signature) throw new Error(`Assinatura de leitura ausente em ${bookId}`);
  const token = `exp=${expires}~acl=${acl}~hmac=${signature}`;
  const textUrl = `https://ps.calameoassets.com/${metadata.key}/text.bin?_token_=${token}`;
  const textResponse = await fetch(textUrl);
  if (!textResponse.ok) throw new Error(`Falha ao ler texto de ${bookId}: ${textResponse.status}`);
  const binary = Buffer.from(await textResponse.arrayBuffer());
  const pageFields = parseFields(binary).filter((field) => field.field === 4 && field.wire === 2);
  const pages = pageFields.map((field) => cleanPageStrings(extractStrings(field.data)).join("\n"));
  return {
    id: `rue-${bookId}`,
    calameoId: bookId,
    title: titleFromCalameo(metadata.name),
    pages: metadata.document.pages,
    externalUrl: metadata.url.view,
    pageText: pages,
  };
}

async function extractPdfPages(filePath) {
  const data = new Uint8Array(await readFile(filePath));
  const pdf = await getDocument({ data, disableWorker: true, verbosity: 0 }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const text = await page.getTextContent();
    pages.push(text.items.map((item) => ("str" in item ? item.str : "")).join(" ").replace(/\s+/g, " ").trim());
  }
  await pdf.destroy();
  return pages;
}

function makeChunks(document, pages) {
  return pages.flatMap((content, pageIndex) => splitContent(content).map((part, partIndex) => ({
    id: `${document.id}-p${pageIndex + 1}-${partIndex + 1}`,
    documentId: document.id,
    source: document.title,
    page: pageIndex + 1,
    part: partIndex + 1,
    content: part,
  })));
}

async function main() {
  const existing = JSON.parse(await readFile(KNOWLEDGE_PATH, "utf8"));
  const oldDocuments = existing.documents.filter((document) => !document.id.startsWith("rue-"));
  const oldDocumentIds = new Set(oldDocuments.map((document) => document.id));
  const oldChunks = existing.chunks.filter((chunk) => oldDocumentIds.has(chunk.documentId));

  await mkdir(MANUALS_DIR, { recursive: true });
  const indexTarget = path.join(MANUALS_DIR, INDEX_FILE);
  await copyFile(INDEX_SOURCE, indexTarget);
  const indexBytes = await readFile(indexTarget);
  const indexPages = await extractPdfPages(indexTarget);
  const indexDocument = {
    id: "rue-indice",
    title: "Regulamento de Uniformes do Exército — Introdução e Índice",
    pages: indexPages.length,
    sha256: createHash("sha256").update(indexBytes).digest("hex"),
    fileName: INDEX_FILE,
  };

  const linkedDocuments = [];
  const linkedChunks = [];
  for (const [bookId, authId] of publications) {
    const publication = await fetchPublication(bookId, authId);
    const { pageText, ...document } = publication;
    linkedDocuments.push(document);
    linkedChunks.push(...makeChunks(document, pageText));
    console.log(`${document.title}: ${pageText.length} páginas, ${makeChunks(document, pageText).length} trechos`);
  }

  const result = {
    version: 2,
    documents: [...oldDocuments, indexDocument, ...linkedDocuments],
    chunks: [...oldChunks, ...makeChunks(indexDocument, indexPages), ...linkedChunks],
  };
  await writeFile(KNOWLEDGE_PATH, `${JSON.stringify(result)}\n`, "utf8");
  console.log(`Base concluída: ${result.documents.length} documentos e ${result.chunks.length} trechos.`);
}

await main();
