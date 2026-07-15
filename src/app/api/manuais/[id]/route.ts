import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCeremonialDocument } from "@/lib/ceremonial-knowledge";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });

  const { id } = await params;
  const document = getCeremonialDocument(id);
  if (!document) return NextResponse.json({ error: "Manual não encontrado." }, { status: 404 });

  const filePath = path.join(process.cwd(), "src", "data", "manuals", document.fileName);
  const file = await readFile(filePath);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(file.byteLength),
      "Content-Disposition": `inline; filename="${document.id}.pdf"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
