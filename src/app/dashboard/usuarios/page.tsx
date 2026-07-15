import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UsersPanel } from "./users-panel";

export default async function UsersPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/dashboard");
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("profiles").select("access_level,active").eq("id", user!.id).single();
  if (data?.access_level !== "owner" || !data.active) redirect("/dashboard");
  return <div className="min-h-dvh bg-slate-50 p-5 pt-20 sm:p-8 lg:pt-8"><div className="mx-auto max-w-7xl"><h1 className="text-3xl font-bold text-slate-950">Gestão de usuários</h1><p className="mb-6 mt-2 text-sm text-slate-500">Cadastre, atualize e controle o acesso dos integrantes do SISCOM.</p><UsersPanel /></div></div>;
}
