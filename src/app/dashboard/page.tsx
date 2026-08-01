import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileImage,
  FileText,
  IdCard,
  Plus,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { profileDisplayName, profileInitials } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, Demand } from "@/lib/types";
import {
  communicationFronts,
  detectCommunicationFronts,
  isWithinPeriod,
  type WorkPeriod,
  workPeriodRange,
} from "@/lib/work-summary";

type DashboardProfile = {
  id?: string;
  full_name: string;
  war_name: string;
  rank: string;
  access_level: string;
};

type WorkItem = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  href: string;
  kind: "atividade" | "entrega";
  fronts: ReturnType<typeof detectCommunicationFronts>;
  responsible?: string;
};

const periods: { value: WorkPeriod; label: string; shortLabel: string }[] = [
  { value: "semana", label: "Esta semana", shortLabel: "Semana" },
  { value: "mes", label: "Este mês", shortLabel: "Mês" },
  { value: "30dias", label: "Últimos 30 dias", shortLabel: "30 dias" },
];

function periodHref(period: WorkPeriod) {
  return period === "mes" ? "/dashboard" : `/dashboard?periodo=${period}`;
}

function formatWorkDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(" de ", " ");
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const params = await searchParams;
  const period: WorkPeriod = periods.some((item) => item.value === params.periodo) ? params.periodo as WorkPeriod : "mes";
  const now = new Date();
  const { start, end } = workPeriodRange(period, now);
  const supabase = await createClient();

  let profile: DashboardProfile = { full_name: "Usuário", war_name: "Usuário", rank: "", access_level: "user" };
  let avatarUrl: string | null = null;
  let completedDemands: Demand[] = [];
  let completedEvents: CalendarEvent[] = [];
  let upcomingEvents: CalendarEvent[] = [];
  let profiles: Array<{ id: string; full_name: string; war_name: string; rank: string }> = [];
  let pendingDemands = 0;

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      avatarUrl = typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null;
      const [profileResult, demandResult, eventResult, upcomingResult, profileListResult, pendingResult] = await Promise.all([
        supabase.from("profiles").select("id,full_name,war_name,rank,access_level").eq("id", user.id).single(),
        supabase.from("demands").select("*").eq("status", "concluida").gte("updated_at", start.toISOString()).lte("updated_at", end.toISOString()).order("updated_at", { ascending: false }).limit(100),
        supabase.from("events").select("*").eq("status", "concluido").gte("ends_at", start.toISOString()).lte("ends_at", end.toISOString()).order("ends_at", { ascending: false }).limit(100),
        supabase.from("events").select("*").gte("starts_at", now.toISOString()).lte("starts_at", new Date(now.getTime() + 7 * 86400000).toISOString()).neq("status", "cancelado").order("starts_at").limit(4),
        supabase.from("profiles").select("id,full_name,war_name,rank"),
        supabase.from("demands").select("*", { count: "exact", head: true }).neq("status", "concluida").neq("status", "cancelada"),
      ]);
      if (profileResult.data) profile = profileResult.data;
      completedDemands = (demandResult.data || []) as Demand[];
      completedEvents = (eventResult.data || []) as CalendarEvent[];
      upcomingEvents = (upcomingResult.data || []) as CalendarEvent[];
      profiles = profileListResult.data || [];
      pendingDemands = pendingResult.count || 0;
    }
  }

  const profileMap = new Map(profiles.map((item) => [item.id, item]));
  const workItems: WorkItem[] = [
    ...completedEvents.filter((event) => isWithinPeriod(event.ends_at, start, end)).map((event) => ({
      id: `event-${event.id}`,
      title: event.title,
      subtitle: event.responsible_unit || event.location || "Atividade da Comunicação Social",
      date: event.ends_at,
      href: `/dashboard/agenda/${event.id}`,
      kind: "atividade" as const,
      fronts: detectCommunicationFronts(event.title, event.description, event.notes),
    })),
    ...completedDemands.filter((demand) => isWithinPeriod(demand.updated_at, start, end)).map((demand) => ({
      id: `demand-${demand.id}`,
      title: demand.title,
      subtitle: demand.requesting_unit || `Demanda #${demand.protocol}`,
      date: demand.updated_at,
      href: `/dashboard/demandas/${demand.id}`,
      kind: "entrega" as const,
      fronts: detectCommunicationFronts(demand.title, demand.description),
      responsible: demand.assigned_to ? profileDisplayName(profileMap.get(demand.assigned_to)) : undefined,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const frontCounts = communicationFronts.map((front) => ({
    ...front,
    count: workItems.filter((item) => item.fronts.some((itemFront) => itemFront.label === front.label)).length,
  })).filter((front) => front.count > 0).sort((a, b) => b.count - a.count);
  const identifiedProducts = frontCounts.reduce((total, front) => total + front.count, 0);
  const periodLabel = periods.find((item) => item.value === period)?.label.toLocaleLowerCase("pt-BR") || "no período";

  const metrics = [
    { label: "Trabalhos registrados", value: workItems.length, note: periodLabel, icon: ClipboardCheck, tone: "bg-emerald-100 text-emerald-800" },
    { label: "Atividades realizadas", value: completedEvents.length, note: "coberturas e ações", icon: CalendarCheck2, tone: "bg-blue-100 text-blue-800" },
    { label: "Entregas concluídas", value: completedDemands.length, note: "demandas finalizadas", icon: BadgeCheck, tone: "bg-amber-100 text-amber-900" },
    { label: "Produtos identificados", value: identifiedProducts, note: "por frente de atuação", icon: Sparkles, tone: "bg-violet-100 text-violet-800" },
  ];

  const quickActions = [
    { label: "Registrar trabalho", description: "Inclua algo já realizado", href: "/dashboard/agenda/novo?modo=realizado", icon: CheckCircle2, featured: true },
    { label: "Planejar atividade", description: "Adicione um compromisso futuro", href: "/dashboard/agenda/novo", icon: CalendarDays },
    { label: "Nova demanda", description: "Registre uma solicitação", href: "/dashboard/demandas/nova", icon: Plus },
    { label: "Gerar crachás", description: "Produção individual ou em lote", href: "/dashboard/crachas", icon: IdCard },
    { label: "Cartões", description: "Aniversariantes do período", href: "/dashboard/ferramentas/cartoes-aniversario", icon: FileImage },
    { label: "Prismas", description: "Prepare identificações de mesa", href: "/dashboard/ferramentas/prismas", icon: FileText },
  ];

  return <div className="min-h-dvh bg-slate-50">
    <header className="flex h-20 items-center justify-between border-b bg-white px-5 pr-20 sm:px-8 sm:pr-20 lg:pr-8">
      <div><h1 className="text-lg font-bold text-slate-950 lg:text-xl">Visão geral</h1><p className="text-[11px] capitalize text-slate-500 lg:text-xs">{now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p></div>
      <div className="hidden items-center gap-3 lg:flex"><div className="grid size-10 place-items-center overflow-hidden rounded-xl bg-emerald-950 text-xs font-bold text-amber-300">{avatarUrl ? <img src={avatarUrl} alt={`Foto de ${profileDisplayName(profile)}`} className="size-full object-cover" /> : profileInitials(profile)}</div><div><p className="text-sm font-semibold text-slate-800">{profileDisplayName(profile)}</p><p className="text-[11px] text-slate-500">{profile.access_level === "owner" ? "Proprietário" : "Usuário"}</p></div></div>
    </header>

    <div className="mx-auto max-w-[1500px] p-4 sm:p-8">
      <section className="overflow-hidden rounded-3xl bg-emerald-950 text-white shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute -right-10 -top-16 size-56 rounded-full border-[38px] border-white/5" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-amber-300">Produção da Comunicação Social</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">O que a equipe realizou e entregou</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100/70">Acompanhe coberturas, materiais e serviços concluídos. O planejamento continua disponível, mas a produção realizada ocupa o centro do painel.</p>
            </div>
            <Button asChild className="w-full bg-amber-300 text-emerald-950 hover:bg-amber-200 sm:w-auto"><Link href="/dashboard/agenda/novo?modo=realizado"><CheckCircle2 size={18} />Registrar trabalho realizado</Link></Button>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Período do resumo">{periods.map((item) => <Link key={item.value} href={periodHref(item.value)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${period === item.value ? "border-emerald-950 bg-emerald-950 text-white dark:border-amber-300 dark:bg-amber-300 dark:text-emerald-950" : "bg-white text-slate-600 hover:bg-slate-100"}`}><span className="sm:hidden">{item.shortLabel}</span><span className="hidden sm:inline">{item.label}</span></Link>)}</div>
        <div className="mt-2 grid grid-cols-2 gap-3 xl:grid-cols-4">{metrics.map(({ label, value, note, icon: Icon, tone }) => <Card key={label} className="border-0"><CardContent className="p-4 sm:p-5"><div className={`mb-4 grid size-10 place-items-center rounded-xl ${tone}`}><Icon size={19} /></div><p className="text-3xl font-bold text-slate-950">{String(value).padStart(2, "0")}</p><p className="mt-1 text-sm font-semibold text-slate-700">{label}</p><p className="mt-1 text-xs text-slate-500">{note}</p></CardContent></Card>)}</div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between"><div><h3 className="text-lg font-bold text-slate-950">Ações rápidas</h3><p className="text-xs text-slate-500">Comece pelas tarefas mais usadas</p></div></div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 xl:grid-cols-6">{quickActions.map(({ label, description, href, icon: Icon, featured }) => <Link href={href} key={label} className={`group min-w-[180px] rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-w-0 ${featured ? "border-emerald-900 bg-emerald-950 text-white" : "bg-white"}`}><div className={`grid size-10 place-items-center rounded-xl ${featured ? "bg-amber-300 text-emerald-950" : "bg-slate-100 text-emerald-900"}`}><Icon size={19} /></div><p className="mt-4 text-sm font-bold">{label}</p><p className={`mt-1 text-xs ${featured ? "text-emerald-100/70" : "text-slate-500"}`}>{description}</p></Link>)}</div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b p-5"><div><h3 className="font-bold">Produção recente</h3><p className="text-xs text-slate-500">Atividades realizadas e entregas concluídas {periodLabel}</p></div><Link href="/dashboard/demandas?view=completed" className="hidden text-xs font-bold text-emerald-800 sm:inline">Ver entregas</Link></div>
          {workItems.length === 0 ? <div className="grid place-items-center px-6 py-14 text-center"><div className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Camera /></div><p className="mt-4 font-bold">Nenhum trabalho registrado neste período</p><p className="mt-1 max-w-sm text-sm text-slate-500">Registre uma cobertura, produção ou entrega que a equipe já realizou.</p><Button asChild className="mt-5"><Link href="/dashboard/agenda/novo?modo=realizado">Registrar agora</Link></Button></div> : workItems.slice(0, 8).map((item) => <Link href={item.href} key={item.id} className="group flex gap-3 border-b p-4 transition hover:bg-slate-50 last:border-0 sm:gap-4 sm:p-5"><div className={`grid size-11 shrink-0 place-items-center rounded-xl ${item.kind === "entrega" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{item.kind === "entrega" ? <BadgeCheck size={20} /> : <CalendarCheck2 size={20} />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{item.title}</p><p className="mt-1 truncate text-xs text-slate-500">{item.subtitle}{item.responsible && item.responsible !== "Não definido" ? ` • ${item.responsible}` : ""}</p></div><span className="shrink-0 text-[11px] font-semibold uppercase text-slate-400">{formatWorkDate(item.date)}</span></div><div className="mt-2 flex flex-wrap gap-1.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.kind === "entrega" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{item.kind === "entrega" ? "ENTREGUE" : "REALIZADO"}</span>{item.fronts.slice(0, 3).map((front) => <span key={front.label} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${front.tone}`}>{front.label}</span>)}</div></div><ChevronRight size={17} className="mt-3 shrink-0 text-slate-300 transition group-hover:translate-x-0.5" /></Link>)}
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden"><div className="border-b p-5"><h3 className="font-bold">Frentes empregadas</h3><p className="text-xs text-slate-500">Produtos reconhecidos nos registros</p></div><CardContent className="p-5">{frontCounts.length === 0 ? <p className="text-sm text-slate-500">Ao descrever os trabalhos, informe itens como foto, vídeo, drone, boletim, links ou crachás.</p> : <div className="space-y-4">{frontCounts.slice(0, 6).map((front) => <div key={front.label}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-semibold text-slate-700">{front.label}</span><span className="font-bold text-slate-500">{front.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-800" style={{ width: `${Math.max(12, (front.count / frontCounts[0].count) * 100)}%` }} /></div></div>)}</div>}</CardContent></Card>

          <Card className="overflow-hidden"><div className="flex items-center justify-between border-b p-5"><div><h3 className="font-bold">Próximos 7 dias</h3><p className="text-xs text-slate-500">Planejamento mantido como apoio</p></div><CalendarDays size={19} className="text-emerald-800" /></div>{upcomingEvents.length === 0 ? <p className="p-6 text-sm text-slate-500">Nenhuma atividade futura cadastrada.</p> : upcomingEvents.map((event) => <Link href={`/dashboard/agenda/${event.id}`} key={event.id} className="flex items-center gap-3 border-b p-4 transition hover:bg-slate-50 last:border-0"><div className="min-w-12 rounded-lg bg-slate-100 p-2 text-center"><p className="text-[9px] font-bold uppercase text-slate-500">{new Date(event.starts_at).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</p><p className="text-lg font-bold text-emerald-950">{new Date(event.starts_at).getDate()}</p></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{event.title}</p><p className="mt-1 truncate text-xs text-slate-500">{event.responsible_unit || event.location || "Sem missão informada"}</p></div><ArrowRight size={15} className="text-slate-300" /></Link>)}</Card>

          <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm"><span className="flex items-center gap-2 text-slate-600"><UsersRound size={17} />{pendingDemands} demandas ainda em andamento</span><Link href="/dashboard/demandas?view=pending" className="font-bold text-emerald-800">Abrir</Link></div>
        </div>
      </section>
    </div>
  </div>;
}
