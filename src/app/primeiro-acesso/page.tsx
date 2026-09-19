import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { createClient } from "@/lib/supabase/server";
import { FirstAccessForm } from "./first-access-form";

export const metadata = { title: "Complete seu cadastro" };

export default async function FirstAccessPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("war_name,profile_completed,must_change_password,active").eq("id", user.id).single();
  if (!profile?.active) redirect("/login?acesso=inativo");
  if (profile.profile_completed && !profile.must_change_password) redirect("/dashboard");
  return <main className="min-h-dvh bg-slate-50 p-5 sm:p-8"><div className="mx-auto max-w-2xl"><Brand /><section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm sm:p-9"><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Primeiro acesso</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Complete seu cadastro</h1><p className="mb-7 mt-2 text-sm leading-6 text-slate-500">Antes de acessar o SISCOM, confirme seus dados e substitua a senha temporária por uma senha pessoal.</p><FirstAccessForm warName={profile.war_name} /></section></div></main>;
}
