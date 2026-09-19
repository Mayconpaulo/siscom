import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readDocxEntry, replaceDocxEntry } from "@/lib/docx-zip";
import { fillReferenceTemplate, type ReferenceFields } from "@/lib/reference-extraction";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
  const body = await request.json();
  const fields: ReferenceFields = {
    recipient: String(body.recipient || "").trim(),
    date: String(body.date || "").trim(),
    text: String(body.text || "").trim(),
  };
  if (fields.recipient.length < 3 || fields.date.length < 6 || fields.text.length < 30) {
    return NextResponse.json({ error: "Confira o destinatário, a data e o texto antes de gerar." }, { status: 400 });
  }
  try {
    const templatePath = path.join(process.cwd(), "src", "data", "templates", "referencia-elogiosa-base.docx");
    const template = await readFile(templatePath);
    const xml = readDocxEntry(template, "word/document.xml").toString("utf8");
    const generatedXml = fillReferenceTemplate(xml, fields);
    const generated = replaceDocxEntry(template, "word/document.xml", Buffer.from(generatedXml, "utf8"));
    const safeName = fields.recipient.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    return new Response(new Uint8Array(generated), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="referencia-elogiosa-${safeName || "militar"}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível gerar o documento." }, { status: 500 });
  }
}
