import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronRight, Clock3, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { profileDisplayName, profileInitials } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  const supabase = await createClient();
  let profile = { full_name: "Usuário", war_name: "Usuário", rank: "", access_level: "user" };
  let avatarUrl: string | null = null;
  let pending = 0, mine = 0, done = 0, events = 0;
  let demands: { id: string; protocol: number; title: string; due_at: string | null }[] = [];
  let nextEvent: { title: string; starts_at: string; location: string | null } | null = null;

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      avatarUrl = typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null;
      const [{ data: p }, { count: pn }, { count: mn }, { count: dn }, { count: ev }, { data: ds }, { data: ne }] = await Promise.all([
        supabase.from("profiles").select("full_name,war_name,rank,access_level").eq("id", user.id).single(),
        supabase.from("demands").select("*", { count: "exact", head: true }).neq("status", "concluida"),
        supabase.from("demands").select("*", { count: "exact", head: true }).eq("assigned_to", user.id).neq("status", "concluida"),
        supabase.from("demands").select("*", { count: "exact", head: true }).eq("status", "concluida").gte("updated_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from("events").select("*", { count: "exact", head: true }).gte("starts_at", new Date().toISOString()).lte("starts_at", new Date(Date.now() + 7 * 86400000).toISOString()).neq("status", "cancelado"),
        supabase.from("demands").select("id,protocol,title,due_at").eq("assigned_to", user.id).neq("status", "concluida").order("due_at", { ascending: true, nullsFirst: false }).limit(3),
        supabase.from("events").select("title,starts_at,location,event_type").gte("starts_at", new Date().toISOString()).neq("status", "cancelado").order("starts_at").limit(1).maybeSingle(),
      ]);
      if (p) profile = p;
      pending = pn ?? 0; mine = mn ?? 0; done = dn ?? 0; events = ev ?? 0;
      demands = ds || [];
      nextEvent = ne;
    }
  }

  const metrics = [
    { label: "Demandas pendentes", value: pending, delta: "Visíveis para toda a equipe", icon: FileText, color: "bg-amber-50 text-amber-700" },
    { label: "Minhas demandas", value: mine, delta: "Atribuídas a você", icon: Clock3, color: "bg-blue-50 text-blue-700" },
    { label: "Concluídas no mês", value: done, delta: "Entregas realizadas", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
    { label: "Ações programadas", value: events, delta: "Próximos 7 dias", icon: CalendarDays, color: "bg-violet-50 text-violet-700" },
  ];

  return <div className="min-h-dvh bg-slate-50">
    <header className="flex h-20 items-center justify-end border-b bg-white px-5 sm:px-8 lg:justify-between">
      <div className="hidden lg:block"><h1 className="text-xl font-bold text-slate-950">Visão geral</h1><p className="text-xs capitalize text-slate-500">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p></div>
      <div className="flex items-center gap-3"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center overflow-hidden rounded-xl bg-emerald-950 text-xs font-bold text-amber-300">{avatarUrl ? <img src={avatarUrl} alt={`Foto de ${profileDisplayName(profile)}`} className="size-full object-cover" /> : profileInitials(profile)}</div><div className="hidden sm:block"><p className="text-sm font-semibold text-slate-800">{profileDisplayName(profile)}</p><p className="text-[11px] text-slate-500">{profile.access_level === "owner" ? "Proprietário" : "Usuário"}</p></div></div></div>
    </header>
    <div className="p-5 sm:p-8">
      <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-slate-500">Bem-vindo de volta, {profile.war_name || "Usuário"}.</p><h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Situação operacional</h2></div><div className="flex gap-2"><Button asChild variant="outline"><Link href="/dashboard/agenda/novo"><CalendarDays size={17} />Nova atividade</Link></Button><Button asChild className="bg-emerald-950 dark:bg-amber-300"><Link href="/dashboard/demandas/nova"><Plus size={17} />Nova demanda</Link></Button></div></section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, delta, icon: Icon, color }) => <Card key={label}><CardContent className="p-5"><div className="mb-5 flex items-start justify-between"><div className={`grid size-10 place-items-center rounded-xl ${color}`}><Icon size={19} /></div><span className="text-[11px] font-semibold text-slate-400">TEMPO REAL</span></div><p className="text-3xl font-bold text-slate-950">{String(value).padStart(2, "0")}</p><p className="mt-1 text-sm text-slate-500">{label}</p><p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-amber-300">{delta}</p></CardContent></Card>)}</section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_.8fr]">
        <Card><div className="flex items-center justify-between border-b p-5"><div><h3 className="font-bold">Minhas demandas pendentes</h3><p className="text-xs text-slate-500">Atribuídas a você, ordenadas pelo prazo</p></div><Link href="/dashboard/demandas?view=mine" className="text-xs font-semibold text-emerald-800 dark:text-amber-300">Ver todas</Link></div>{demands.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Nenhuma demanda pendente atribuída a você.</p> : demands.map((demand) => <Link href={`/dashboard/demandas/${demand.id}`} key={demand.id} className="flex items-center gap-4 border-b p-5 transition hover:bg-muted last:border-0"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">#{demand.protocol} — {demand.title}</p><p className="mt-1 text-xs text-slate-500">{demand.due_at ? `Prazo: ${new Date(demand.due_at).toLocaleString("pt-BR")}` : "Sem prazo definido"}</p></div><ChevronRight size={16} className="text-slate-300" /></Link>)}</Card>
        <Card><div className="border-b bg-emerald-950 p-5 text-white"><CalendarDays className="text-amber-300" /><p className="mt-6 text-xs font-semibold uppercase tracking-wider text-emerald-100/60">Próxima atividade</p><p className="mt-2 text-xl font-bold">{nextEvent?.title || "Agenda livre"}</p></div><CardContent>{nextEvent ? <><p className="text-sm font-semibold">{new Date(nextEvent.starts_at).toLocaleString("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}</p><p className="mt-1 text-xs text-slate-500">{nextEvent.location || "Local não informado"}</p></> : <p className="text-sm text-slate-500">Cadastre uma atividade para iniciar o planejamento.</p>}<Link href="/dashboard/agenda" className="mt-5 inline-flex text-xs font-bold text-emerald-800 dark:text-amber-300">Abrir agenda</Link></CardContent></Card>
      </section>
    </div>
  </div>;
}
