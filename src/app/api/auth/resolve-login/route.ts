import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWarName } from "@/lib/war-name";

export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Acesso indisponível." }, { status: 503 });
  const body = await request.json();
  const login = normalizeWarName(String(body.login || ""));
  if (login.length < 2) return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  const { data, error } = await admin.from("profiles").select("war_name,email,active").neq("war_name", "");
  if (error) return NextResponse.json({ error: "Não foi possível autenticar." }, { status: 400 });
  const profile = data.find((item) => normalizeWarName(item.war_name) === login);
  if (!profile?.active) return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  return NextResponse.json({ email: profile.email });
}
