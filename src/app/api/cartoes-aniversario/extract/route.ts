import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractBirthdayPeople, type PositionedPdfText } from "@/lib/birthday-import";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_SIZE = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente no SISCOM." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecione o relatório de aniversariantes." }, { status: 400 });
  if (!file.name.toLocaleLowerCase("pt-BR").endsWith(".pdf")) return NextResponse.json({ error: "Envie o relatório no formato PDF." }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "O PDF deve ter no máximo 15 MB." }, { status: 400 });

  let document: Awaited<ReturnType<typeof getDocument>["promise"]> | undefined;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    document = await getDocument({ data, useSystemFonts: true }).promise;
    const pages: PositionedPdfText[][] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.flatMap((item) => {
        if (!("str" in item) || !item.str.trim()) return [];
        return [{ text: item.str.trim(), x: item.transform[4], y: item.transform[5] }];
      }));
    }
    const people = extractBirthdayPeople(pages, file.name);
    if (!people.length) {
      return NextResponse.json({ error: "Não encontrei aniversariantes no padrão esperado. Confira se este é o relatório correto." }, { status: 422 });
    }
    return NextResponse.json({ people, count: people.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível ler o PDF." }, { status: 400 });
  } finally {
    await document?.destroy();
  }
}

