import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInternalSiscomEmail } from "@/lib/war-name";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Configuração administrativa indisponível." }, { status: 503 });

  const body = await request.json();
  const fullName = String(body.full_name || "").trim();
  const rank = String(body.rank || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (fullName.length < 5) return NextResponse.json({ error: "Informe seu nome completo." }, { status: 400 });
  if (!rank) return NextResponse.json({ error: "Informe sua graduação." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email) || isInternalSiscomEmail(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "A nova senha deve ter pelo menos 8 caracteres." }, { status: 400 });

  const { data: duplicate } = await admin.from("profiles").select("id").ilike("email", email).neq("id", user.id).maybeSingle();
  if (duplicate) return NextResponse.json({ error: "Este e-mail já está vinculado a outro usuário." }, { status: 409 });
  const { data: profile } = await admin.from("profiles").select("war_name").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });

  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    email, password, email_confirm: true,
    user_metadata: { ...user.user_metadata, full_name: fullName, rank, war_name: profile.war_name, temporary_access: false },
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
  const { error } = await admin.from("profiles").update({ full_name: fullName, rank, email, profile_completed: true, must_change_password: false }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("audit_log").insert({ actor_id: user.id, action: "COMPLETE_FIRST_ACCESS", entity_type: "profile", entity_id: user.id, details: { war_name: profile.war_name } });
  return NextResponse.json({ message: "Cadastro concluído com sucesso." });
}

