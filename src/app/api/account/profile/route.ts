import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeWarName } from "@/lib/war-name";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Configuração administrativa indisponível." }, { status: 503 });

  const body = await request.json();
  const fullName = String(body.full_name || "").trim();
  const rank = String(body.rank || "").trim();
  const warName = String(body.war_name || "").trim();
  const avatarUrl = body.avatar_url === null ? null : String(body.avatar_url || "").trim();

  if (fullName.length < 5) return NextResponse.json({ error: "Informe seu nome completo." }, { status: 400 });
  if (rank.length < 2) return NextResponse.json({ error: "Informe seu posto ou graduação." }, { status: 400 });
  if (warName.length < 2) return NextResponse.json({ error: "Informe seu nome de guerra." }, { status: 400 });

  const normalized = normalizeWarName(warName);
  const { data: profiles } = await admin.from("profiles").select("id,war_name").neq("id", user.id).neq("war_name", "");
  if (profiles?.some((profile) => normalizeWarName(profile.war_name) === normalized)) {
    return NextResponse.json({ error: "Esse nome de guerra já está em uso." }, { status: 409 });
  }

  if (avatarUrl) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const expectedPrefix = `${supabaseUrl}/storage/v1/object/public/profile-photos/${user.id}/`;
    if (!supabaseUrl || !avatarUrl.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Endereço da foto de perfil inválido." }, { status: 400 });
    }
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: fullName, rank, war_name: warName })
    .eq("id", user.id);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, full_name: fullName, rank, war_name: warName, avatar_url: avatarUrl },
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "UPDATE_PROFILE",
    entity_type: "profile",
    entity_id: user.id,
    details: { rank, war_name: warName, avatar_changed: avatarUrl !== (user.user_metadata.avatar_url || null) },
  });

  return NextResponse.json({
    message: "Perfil atualizado com sucesso.",
    profile: { full_name: fullName, rank, war_name: warName, avatar_url: avatarUrl },
  });
}
