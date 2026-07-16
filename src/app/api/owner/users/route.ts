import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { internalEmailForWarName, normalizeWarName } from "@/lib/war-name";

async function authorize() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("access_level,active").eq("id", user.id).single();
  return data?.access_level === "owner" && data.active ? user : null;
}

function adminUnavailable() {
  return NextResponse.json({ error: "Configuração administrativa indisponível." }, { status: 503 });
}

export async function GET() {
  if (!await authorize()) return NextResponse.json({ error: "Acesso exclusivo do proprietário." }, { status: 403 });
  const admin = createAdminClient();
  if (!admin) return adminUnavailable();
  const [{ data: profiles, error }, { data: authData, error: authError }] = await Promise.all([
    admin.from("profiles").select("id,full_name,war_name,rank,email,access_level,active,profile_completed,must_change_password,created_at,updated_at").order("created_at"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (error || authError) return NextResponse.json({ error: error?.message || authError?.message }, { status: 400 });
  const authUsers = new Map(authData.users.map((user) => [user.id, user]));
  const users = profiles.map((profile) => ({ ...profile, last_sign_in_at: authUsers.get(profile.id)?.last_sign_in_at || null }));
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const owner = await authorize();
  if (!owner) return NextResponse.json({ error: "Acesso exclusivo do proprietário." }, { status: 403 });
  const admin = createAdminClient();
  if (!admin) return adminUnavailable();
  const body = await request.json();
  const action = String(body.action || "create_temporary");
  const origin = new URL(request.url).origin;

  if (action === "reset_password") {
    const { data: profile } = await admin.from("profiles").select("email,profile_completed").eq("id", String(body.id)).maybeSingle();
    if (!profile) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    if (!profile.profile_completed) return NextResponse.json({ error: "Este usuário ainda precisa concluir o primeiro acesso." }, { status: 400 });
    const { error } = await admin.auth.resetPasswordForEmail(profile.email, { redirectTo: `${origin}/redefinir-senha` });
    return NextResponse.json(error ? { error: error.message } : { message: "Link para redefinir a senha enviado por e-mail." }, { status: error ? 400 : 200 });
  }

  const warName = String(body.war_name || "").trim();
  const normalized = normalizeWarName(warName);
  const temporaryPassword = String(body.temporary_password || "");
  if (warName.length < 2 || normalized.length < 2) return NextResponse.json({ error: "Informe um nome de guerra válido." }, { status: 400 });
  if (temporaryPassword.length < 8) return NextResponse.json({ error: "A senha temporária deve ter pelo menos 8 caracteres." }, { status: 400 });
  const { data: existingProfiles } = await admin.from("profiles").select("war_name").neq("war_name", "");
  if (existingProfiles?.some((profile) => normalizeWarName(profile.war_name) === normalized)) return NextResponse.json({ error: "Esse nome de guerra já está em uso." }, { status: 409 });

  const internalEmail = internalEmailForWarName(warName);
  const { data, error } = await admin.auth.admin.createUser({ email: internalEmail, password: temporaryPassword, email_confirm: true, user_metadata: { war_name: warName, temporary_access: true } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data.user) return NextResponse.json({ error: "Não foi possível criar o usuário." }, { status: 400 });
  const { error: profileError } = await admin.from("profiles").update({ full_name: "", war_name: warName, rank: "", email: internalEmail, access_level: "user", active: true, profile_completed: false, must_change_password: true }).eq("id", data.user.id);
  if (profileError) { await admin.auth.admin.deleteUser(data.user.id); return NextResponse.json({ error: profileError.message }, { status: 400 }); }
  await admin.from("audit_log").insert({ actor_id: owner.id, action: "CREATE_TEMPORARY_ACCESS", entity_type: "profile", entity_id: data.user.id, details: { war_name: warName } });
  return NextResponse.json({ message: `Acesso de ${warName} criado. Entregue a senha temporária pessoalmente.` }, { status: 201 });
}

export async function PATCH(request: Request) {
  const owner = await authorize();
  if (!owner) return NextResponse.json({ error: "Acesso exclusivo do proprietário." }, { status: 403 });
  const admin = createAdminClient();
  if (!admin) return adminUnavailable();
  const body = await request.json();
  const id = String(body.id || "");
  const fullName = String(body.full_name || "").trim();
  const rank = String(body.rank || "").trim();
  const active = Boolean(body.active);
  if (!id) return NextResponse.json({ error: "Usuário inválido." }, { status: 400 });
  const { data: target } = await admin.from("profiles").select("access_level,profile_completed").eq("id", id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  if (target.profile_completed && (fullName.length < 3 || !rank)) return NextResponse.json({ error: "Informe nome e graduação válidos." }, { status: 400 });
  if (target.access_level === "owner" && !active) return NextResponse.json({ error: "O perfil proprietário não pode ser desativado." }, { status: 400 });
  const { error: authError } = await admin.auth.admin.updateUserById(id, { user_metadata: { full_name: fullName, rank }, ban_duration: active ? "none" : "876000h" });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
  const { error } = await admin.from("profiles").update({ full_name: fullName, rank, active }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("audit_log").insert({ actor_id: owner.id, action: active ? "UPDATE" : "DEACTIVATE", entity_type: "profile", entity_id: id, details: { full_name: fullName, rank, active } });
  return NextResponse.json({ message: active ? "Perfil atualizado." : "Usuário desativado." });
}

