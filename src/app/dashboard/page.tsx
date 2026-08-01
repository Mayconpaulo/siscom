import Link from "next/link";
import { CalendarDays, ChevronRight, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { profileDisplayName, profileInitials } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, EventStatus, EventType } from "@/lib/types";
import { activityPeriodRange, detectCommunicationFronts, parseWorkNotes, type WorkPeriod } from "@/lib/work-summary";

type DashboardProfile = { full_name: string; war_name: string; rank: string; access_level: string };
type DashboardSearch = Promise<{ periodo?: string; situacao?: string; q?: string }>;
type StatusFilter = "todas" | EventStatus;

const periods: { value: WorkPeriod; label: string }[] = [
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "30dias", label: "Últimos 30 dias" },
];
const statuses: { value: StatusFilter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "planejado", label: "Planejadas" },
  { value: "confirmado", label: "Confirmadas" },
  { value: "concluido", label: "Realizadas" },
  { value: "cancelado", label: "Canceladas" },
];
const statusLabels: Record<EventStatus, string> = { planejado: "Planejada", confirmado: "Confirmada", concluido: "Realizada", cancelado: "Cancelada" };
const statusTones: Record<EventStatus, string> = {
  planejado: "border-slate-200 bg-slate-100 text-slate-700",
  confirmado: "border-blue-200 bg-blue-50 text-blue-700",
  concluido: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelado: "border-red-200 bg-red-50 text-red-700",
};
const typeLabels: Record<EventType, string> = { solenidade: "Solenidade", reuniao: "Reunião", entrevista: "Entrevista", cobertura: "Cobertura", visita: "Visita", outro: "Outro" };

function formatDate(value: string, allDay: boolean) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("pt-BR"),
    detail: allDay ? date.toLocaleDateString("pt-BR", { weekday: "long" }) : date.toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" }),
  };
}

export default async function Dashboard({ searchParams }: { searchParams: DashboardSearch }) {
  const params = await searchParams;
  const period: WorkPeriod = periods.some((item) => item.value === params.periodo) ? params.periodo as WorkPeriod : "mes";
  const status: StatusFilter = statuses.some((item) => item.value === params.situacao) ? params.situacao as StatusFilter : "todas";
  const query = (params.q || "").trim().toLocaleLowerCase("pt-BR");
  const now = new Date();
  const { start, end } = activityPeriodRange(period, now);
  const supabase = await createClient();
  let profile: DashboardProfile = { full_name: "Usuário", war_name: "Usuário", rank: "", access_level: "user" };
  let avatarUrl: string | null = null;
  let events: CalendarEvent[] = [];
  let databaseError = false;

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      avatarUrl = typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null;
      const [profileResult, eventsResult] = await Promise.all([
        supabase.from("profiles").select("full_name,war_name,rank,access_level").eq("id", user.id).single(),
        supabase.from("events").select("*").lte("starts_at", end.toISOString()).gte("ends_at", start.toISOString()).order("starts_at", { ascending: true }),
      ]);
      if (profileResult.data) profile = profileResult.data;
      events = (eventsResult.data || []) as CalendarEvent[];
      databaseError = Boolean(eventsResult.error);
    }
  } else databaseError = true;

  const filteredEvents = events.filter((event) => {
    const notes = parseWorkNotes(event.notes);
    const searchable = [event.title, event.responsible_unit, event.location, event.description, notes.providences.join(" "), notes.military].join(" ").toLocaleLowerCase("pt-BR");
    return (status === "todas" || event.status === status) && (!query || searchable.includes(query));
  });
  const completedCount = events.filter((event) => event.status === "concluido").length;
  const plannedCount = events.filter((event) => event.status === "planejado" || event.status === "confirmado").length;

  function filterHref(next: { periodo?: WorkPeriod; situacao?: StatusFilter }) {
    const url = new URLSearchParams();
    const nextPeriod = next.periodo || period;
    const nextStatus = next.situacao || status;
    if (nextPeriod !== "mes") url.set("periodo", nextPeriod);
    if (nextStatus !== "todas") url.set("situacao", nextStatus);
    if (params.q) url.set("q", params.q);
    return `/dashboard${url.size ? `?${url}` : ""}`;
  }

  return <div className="min-h-dvh bg-slate-50">
    <header className="flex h-20 items-center justify-between border-b bg-white px-5 pr-20 sm:px-8 sm:pr-20 lg:pr-8">
      <div><h1 className="text-lg font-bold text-slate-950 lg:text-xl">Quadro de atividades</h1><p className="text-[11px] capitalize text-slate-500 lg:text-xs">{now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p></div>
      <div className="hidden items-center gap-3 lg:flex"><div className="grid size-10 place-items-center overflow-hidden rounded-xl bg-emerald-950 text-xs font-bold text-amber-300">{avatarUrl ? <img src={avatarUrl} alt={`Foto de ${profileDisplayName(profile)}`} className="size-full object-cover" /> : profileInitials(profile)}</div><div><p className="text-sm font-semibold text-slate-800">{profileDisplayName(profile)}</p><p className="text-[11px] text-slate-500">{profile.access_level === "owner" ? "Proprietário" : "Usuário"}</p></div></div>
    </header>

    <div className="mx-auto max-w-[1600px] p-4 sm:p-8">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-emerald-800">Comunicação Social</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Atividades, missões e providências</h2><p className="mt-2 text-sm text-slate-500">Um único quadro para acompanhar o que está planejado, em execução e realizado.</p></div>
        <Button asChild className="w-full bg-emerald-950 sm:w-auto"><Link href="/dashboard/agenda/novo"><Plus size={17} />Adicionar atividade</Link></Button>
      </div>

      {databaseError && <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">Não foi possível carregar as atividades. Tente novamente em alguns instantes.</p>}

      <Card className="overflow-hidden">
        <div className="border-b bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">{periods.map((item) => <Link key={item.value} href={filterHref({ periodo: item.value })} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-bold transition ${period === item.value ? "border-emerald-950 bg-emerald-950 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>{item.label}</Link>)}</div>
            <div className="flex gap-2 overflow-x-auto pb-1">{statuses.map((item) => <Link key={item.value} href={filterHref({ situacao: item.value })} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${status === item.value ? "bg-amber-300 text-emerald-950" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item.label}</Link>)}</div>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-xs text-slate-500"><strong className="text-slate-800">{events.length}</strong> atividades no período · <strong className="text-emerald-700">{completedCount}</strong> realizadas · <strong className="text-blue-700">{plannedCount}</strong> planejadas</p>
            <form className="flex w-full gap-2 lg:max-w-md"><input type="hidden" name="periodo" value={period} /><input type="hidden" name="situacao" value={status} /><label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-slate-50 px-3 text-sm text-slate-500"><Search size={16} /><input name="q" defaultValue={params.q} className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none" placeholder="Buscar atividade, missão ou militar" /></label><Button type="submit" size="sm" variant="outline">Buscar</Button></form>
          </div>
          <p className="mt-3 text-[11px] text-slate-400 lg:hidden">Deslize o quadro para o lado para visualizar todas as colunas.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left">
            <thead className="bg-emerald-950 text-[11px] uppercase tracking-wide text-emerald-50">
              <tr><th className="sticky left-0 z-10 w-[260px] min-w-[260px] bg-emerald-950 px-5 py-4">Atividade</th><th className="w-[150px] px-4 py-4">Missão</th><th className="w-[140px] px-4 py-4">Início</th><th className="w-[140px] px-4 py-4">Término</th><th className="w-[230px] px-4 py-4">Providências</th><th className="w-[220px] px-4 py-4">Militares envolvidos</th><th className="w-[120px] px-4 py-4">Situação</th><th className="w-12 px-3 py-4"><span className="sr-only">Abrir</span></th></tr>
            </thead>
            <tbody className="divide-y bg-white">{filteredEvents.length === 0 ? <tr><td colSpan={8} className="px-6 py-16 text-center"><CalendarDays className="mx-auto mb-3 text-slate-300" /><p className="font-semibold text-slate-700">Nenhuma atividade encontrada</p><p className="mt-1 text-sm text-slate-500">Altere os filtros ou adicione uma atividade.</p></td></tr> : filteredEvents.map((event) => {
              const notes = parseWorkNotes(event.notes);
              const detected = detectCommunicationFronts(event.title, event.description, event.notes).map((front) => front.label);
              const providences = notes.providences.length ? notes.providences : detected.length ? detected : [typeLabels[event.event_type]];
              const starts = formatDate(event.starts_at, event.all_day);
              const ends = formatDate(event.ends_at, event.all_day);
              return <tr key={event.id} className="group transition hover:bg-emerald-50/40">
                <td className="sticky left-0 z-[1] bg-white px-5 py-4 group-hover:bg-[#f7fcf9]"><Link href={`/dashboard/agenda/${event.id}`} className="block font-bold text-slate-800 hover:text-emerald-800">{event.title}</Link><p className="mt-1 text-[11px] font-semibold text-slate-400">{typeLabels[event.event_type]}</p></td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-700">{event.responsible_unit || event.location || "—"}</td>
                <td className="px-4 py-4"><p className="text-sm font-semibold text-slate-700">{starts.date}</p><p className="mt-1 capitalize text-[11px] text-slate-500">{starts.detail}</p></td>
                <td className="px-4 py-4"><p className="text-sm font-semibold text-slate-700">{ends.date}</p><p className="mt-1 capitalize text-[11px] text-slate-500">{ends.detail}</p></td>
                <td className="px-4 py-4"><div className="flex flex-wrap gap-1.5">{providences.map((item) => <span key={item} className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-900">{item}</span>)}</div></td>
                <td className="px-4 py-4 text-sm leading-5 text-slate-600">{notes.military || "Não informado"}</td>
                <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusTones[event.status]}`}>{statusLabels[event.status]}</span></td>
                <td className="px-3 py-4"><Link href={`/dashboard/agenda/${event.id}`} aria-label={`Abrir ${event.title}`} className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-emerald-800"><ChevronRight size={17} /></Link></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>;
}
