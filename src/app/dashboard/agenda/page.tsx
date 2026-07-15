import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, EventType } from "@/lib/types";

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const typeTone: Record<EventType, string> = {
  solenidade: "bg-amber-100 text-amber-900 border-amber-300",
  reuniao: "bg-blue-100 text-blue-800 border-blue-300",
  entrevista: "bg-violet-100 text-violet-800 border-violet-300",
  cobertura: "bg-emerald-100 text-emerald-800 border-emerald-300",
  visita: "bg-cyan-100 text-cyan-800 border-cyan-300",
  outro: "bg-slate-100 text-slate-700 border-slate-300",
};

function pad(number: number) { return String(number).padStart(2, "0"); }
function key(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function monthHref(date: Date) { return `/dashboard/agenda?mes=${date.getFullYear()}-${pad(date.getMonth() + 1)}`; }
function dayStart(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function dayEnd(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999); }

function eventsForDay(events: CalendarEvent[], date: Date) {
  const start = dayStart(date).getTime();
  const end = dayEnd(date).getTime();
  return events
    .filter((event) => new Date(event.starts_at).getTime() <= end && new Date(event.ends_at).getTime() >= start)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime() || a.title.localeCompare(b.title));
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const params = await searchParams;
  const match = /^(\d{4})-(\d{2})$/.exec(params.mes || "");
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) - 1 : now.getMonth();
  const start = new Date(year, month, 1);
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const gridEnd = dayEnd(days[41]);
  const supabase = await createClient();
  let events: CalendarEvent[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("events")
      .select("*")
      .lte("starts_at", gridEnd.toISOString())
      .gte("ends_at", dayStart(gridStart).toISOString())
      .order("starts_at");
    events = (data || []) as CalendarEvent[];
  }

  const upcoming = events.filter((event) => new Date(event.ends_at) >= now && event.status !== "cancelado").slice(0, 6);
  const previousMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const firstGridKey = key(gridStart);
  const lastGridKey = key(gridEnd);

  return <div className="min-h-dvh bg-slate-50 p-4 pt-20 sm:p-8 lg:pt-8"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><h1 className="text-3xl font-bold text-slate-950">Agenda operacional</h1><p className="mt-1 text-sm text-slate-500">Eventos, coberturas e compromissos da Comunicação Social.</p></div>
      <Button asChild className="bg-emerald-950"><Link href="/dashboard/agenda/novo"><Plus size={17} />Nova atividade</Link></Button>
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_310px]">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b p-4 sm:p-5">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-emerald-950 text-amber-300"><CalendarDays size={19} /></div><div><h2 className="font-bold capitalize">{monthNames[month]} de {year}</h2><p className="text-xs text-slate-500">{events.length} atividades no período</p></div></div>
          <div className="flex gap-2"><Link aria-label="Mês anterior" href={monthHref(previousMonth)} className="grid size-9 place-items-center rounded-lg border bg-white"><ChevronLeft size={17} /></Link><Link aria-label="Próximo mês" href={monthHref(nextMonth)} className="grid size-9 place-items-center rounded-lg border bg-white"><ChevronRight size={17} /></Link></div>
        </div>
        <div className="grid grid-cols-7 border-b bg-slate-50">{weekdays.map((day) => <div key={day} className="p-2 text-center text-[10px] font-bold uppercase text-slate-400 sm:p-3 sm:text-xs">{day}</div>)}</div>
        <div className="grid grid-cols-7">{days.map((date) => {
          const dateKey = key(date);
          const items = eventsForDay(events, date);
          const current = date.getMonth() === month;
          const today = dateKey === key(now);
          return <div key={dateKey} className={`min-h-20 border-b border-r p-1.5 sm:min-h-28 sm:p-2 ${current ? "bg-white" : "bg-slate-50/70"}`}>
            <span className={`grid size-6 place-items-center rounded-full text-xs font-semibold sm:size-7 ${today ? "bg-emerald-950 text-white" : current ? "text-slate-700" : "text-slate-300"}`}>{date.getDate()}</span>
            <div className="mt-1 space-y-1">{items.slice(0, 3).map((event) => {
              const eventStartKey = key(new Date(event.starts_at));
              const eventEndKey = key(new Date(event.ends_at));
              const beginsSegment = dateKey === eventStartKey || date.getDay() === 1 || dateKey === firstGridKey;
              const endsSegment = dateKey === eventEndKey || date.getDay() === 0 || dateKey === lastGridKey;
              const segmentClasses = `${beginsSegment ? "rounded-l border-l ml-0" : "-ml-1.5 border-l-0 sm:-ml-2"} ${endsSegment ? "rounded-r border-r mr-0" : "-mr-1.5 border-r-0 sm:-mr-2"}`;
              const label = beginsSegment ? `${dateKey === eventStartKey && !event.all_day ? `${new Date(event.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ` : ""}${event.title}` : " ";
              return <Link href={`/dashboard/agenda/${event.id}`} key={event.id} className={`relative z-10 block h-5 truncate border-y px-1.5 py-0.5 text-[9px] font-semibold transition hover:z-20 hover:brightness-95 sm:h-6 sm:text-[11px] ${segmentClasses} ${typeTone[event.event_type]}`} title={`Abrir ${event.title} — ${new Date(event.starts_at).toLocaleDateString("pt-BR")} a ${new Date(event.ends_at).toLocaleDateString("pt-BR")}`}>{label}</Link>;
            })}{items.length > 3 && <p className="text-[9px] font-semibold text-slate-400">+{items.length - 3} atividades</p>}</div>
          </div>;
        })}</div>
      </Card>
      <aside><Card className="overflow-hidden"><div className="border-b p-5"><h3 className="font-bold">Próximas atividades</h3><p className="text-xs text-slate-500">Agenda a partir de agora</p></div>{upcoming.length === 0 ? <div className="p-8 text-center"><CalendarDays className="mx-auto mb-3 text-slate-300" /><p className="text-sm text-slate-500">Nenhuma atividade prevista.</p></div> : upcoming.map((event) => <Link href={`/dashboard/agenda/${event.id}`} key={event.id} className="block border-b p-4 transition hover:bg-slate-50 last:border-0"><div className="flex items-start gap-3"><div className="min-w-12 rounded-lg bg-emerald-50 p-2 text-center"><p className="text-[9px] font-bold uppercase text-emerald-700">{monthNames[new Date(event.starts_at).getMonth()].slice(0, 3)}</p><p className="text-lg font-bold text-emerald-950">{new Date(event.starts_at).getDate()}</p></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{event.title}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 size={12} />{new Date(event.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{key(new Date(event.starts_at)) !== key(new Date(event.ends_at)) && ` até ${new Date(event.ends_at).toLocaleDateString("pt-BR")}`}</p>{event.location && <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500"><MapPin size={12} />{event.location}</p>}</div></div></Link>)}</Card></aside>
    </div>
  </div></div>;
}
