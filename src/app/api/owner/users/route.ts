import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    admin.from("profiles").select("id,full_name,rank,email,access_level,active,created_at,updated_at").order("created_at"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (error || authError) return NextResponse.json({ error: error?.message || authError?.message }, { status: 400 });
  const authUsers = new Map(authData.users.map((user) => [user.id, user]));
  const users = profiles.map((profile) => {
    const authUser = authUsers.get(profile.id);
    return { ...profile, last_sign_in_at: authUser?.last_sign_in_at || null, invited_at: authUser?.invited_at || null, email_confirmed_at: authUser?.email_confirmed_at || null };
  });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const owner = await authorize();
  if (!owner) return NextResponse.json({ error: "Acesso exclusivo do proprietário." }, { status: 403 });
  const admin = createAdminClient();
  if (!admin) return adminUnavailable();
  const body = await request.json();
  const action = String(body.action || "invite");
  const origin = new URL(request.url).origin;

  if (action === "reset_password") {
    const { data: profile } = await admin.from("profiles").select("email").eq("id", String(body.id)).maybeSingle();
    if (!profile) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    const { error } = await admin.auth.resetPasswordForEmail(profile.email, { redirectTo: `${origin}/redefinir-senha` });
    return NextResponse.json(error ? { error: error.message } : { message: "Link de acesso enviado por e-mail." }, { status: error ? 400 : 200 });
  }

  const fullName = String(body.full_name || "").trim();
  const rank = String(body.rank || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (fullName.length < 3 || !rank || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Informe nome, graduação e e-mail válidos." }, { status: 400 });
  const { data: existing } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (existing) return NextResponse.json({ error: "Já existe um usuário com esse e-mail." }, { status: 409 });
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName, rank }, redirectTo: `${origin}/redefinir-senha` });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (data.user) await admin.from("profiles").update({ full_name: fullName, rank, access_level: "user", active: true }).eq("id", data.user.id);
  await admin.from("audit_log").insert({ actor_id: owner.id, action: "INVITE", entity_type: "profile", entity_id: data.user?.id, details: { email, full_name: fullName, rank } });
  return NextResponse.json({ user: data.user, message: "Convite enviado com sucesso." }, { status: 201 });
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
  if (!id || fullName.length < 3 || !rank) return NextResponse.json({ error: "Informe nome e graduação válidos." }, { status: 400 });
  const { data: target } = await admin.from("profiles").select("access_level").eq("id", id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  if (target.access_level === "owner" && !active) return NextResponse.json({ error: "O perfil proprietário não pode ser desativado." }, { status: 400 });
  const { error: authError } = await admin.auth.admin.updateUserById(id, { user_metadata: { full_name: fullName, rank }, ban_duration: active ? "none" : "876000h" });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
  const { error } = await admin.from("profiles").update({ full_name: fullName, rank, active }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("audit_log").insert({ actor_id: owner.id, action: active ? "UPDATE" : "DEACTIVATE", entity_type: "profile", entity_id: id, details: { full_name: fullName, rank, active } });
  return NextResponse.json({ message: active ? "Perfil atualizado." : "Usuário desativado." });
}
