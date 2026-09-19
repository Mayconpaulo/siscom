import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractParagraphsFromDocx } from "@/lib/docx-zip";
import { extractReferenceFields } from "@/lib/reference-extraction";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecione um documento Word." }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".docx")) return NextResponse.json({ error: "Envie um arquivo no formato .docx." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "O documento deve ter no máximo 10 MB." }, { status: 400 });
  try {
    const paragraphs = extractParagraphsFromDocx(Buffer.from(await file.arrayBuffer()));
    const fields = extractReferenceFields(paragraphs);
    return NextResponse.json({ fields, paragraph_count: paragraphs.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível ler o documento." }, { status: 400 });
  }
}
