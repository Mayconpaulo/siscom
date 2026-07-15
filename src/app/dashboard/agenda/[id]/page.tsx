import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, FileText, MapPin, Pencil, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, EventStatus, EventType } from "@/lib/types";

const typeLabels: Record<EventType, string> = { solenidade: "Solenidade", reuniao: "Reunião", entrevista: "Entrevista", cobertura: "Cobertura", visita: "Visita", outro: "Outro" };
const statusLabels: Record<EventStatus, string> = { planejado: "Planejado", confirmado: "Confirmado", concluido: "Concluído", cancelado: "Cancelado" };
const statusTone: Record<EventStatus, string> = { planejado: "bg-slate-100 text-slate-700", confirmado: "bg-blue-100 text-blue-800", concluido: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800" };

function dateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Info({ icon: Icon, label, children }: { icon: typeof CalendarDays; label: string; children: React.ReactNode }) {
  return <div className="flex gap-3 rounded-xl border bg-slate-50/70 p-4"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-emerald-900 shadow-sm"><Icon size={17} /></div><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p><div className="mt-1 text-sm font-semibold text-slate-800">{children}</div></div></div>;
}

export default async function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const event = data as CalendarEvent;
  const [{ data: demand }, { data: creator }] = await Promise.all([
    event.demand_id ? supabase.from("demands").select("id,protocol,title").eq("id", event.demand_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("profiles").select("full_name,rank").eq("id", event.created_by).maybeSingle(),
  ]);

  return <div className="min-h-dvh bg-slate-50 p-5 pt-20 sm:p-8 lg:pt-8"><div className="mx-auto max-w-4xl">
    <Link href="/dashboard/agenda" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ArrowLeft size={16} />Voltar à agenda</Link>
    <Card className="overflow-hidden">
      <div className="border-b bg-emerald-950 p-6 text-white sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="min-w-0"><div className="mb-3 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{typeLabels[event.event_type]}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[event.status]}`}>{statusLabels[event.status]}</span>{event.all_day && <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-emerald-950">Dia inteiro</span>}</div><h1 className="text-2xl font-bold sm:text-3xl">{event.title}</h1><p className="mt-2 text-sm text-emerald-100/70">Informações completas da atividade</p></div>
          <Button asChild className="shrink-0 bg-amber-300 text-emerald-950 hover:bg-amber-200"><Link href={`/dashboard/agenda/${event.id}/editar`}><Pencil size={16} />Editar atividade</Link></Button>
        </div>
      </div>
      <CardContent className="p-5 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Info icon={CalendarDays} label="Início">{dateTime(event.starts_at)}</Info>
          <Info icon={Clock3} label="Término">{dateTime(event.ends_at)}</Info>
          <Info icon={MapPin} label="Local">{event.location || "Não informado"}</Info>
          <Info icon={Users} label="Unidade responsável">{event.responsible_unit || "Não informada"}</Info>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="space-y-5">
            <section><h2 className="mb-2 flex items-center gap-2 font-bold text-slate-900"><FileText size={17} />Descrição</h2><p className="whitespace-pre-wrap rounded-xl border bg-white p-4 text-sm leading-6 text-slate-600">{event.description || "Nenhuma descrição informada."}</p></section>
            <section><h2 className="mb-2 flex items-center gap-2 font-bold text-slate-900"><ShieldCheck size={17} />Observações internas</h2><p className="whitespace-pre-wrap rounded-xl border bg-amber-50/50 p-4 text-sm leading-6 text-slate-600">{event.notes || "Nenhuma observação registrada."}</p></section>
          </div>
          <aside className="space-y-4 rounded-xl border bg-slate-50 p-4 text-sm">
            <div><p className="text-xs font-bold uppercase text-slate-400">Demanda relacionada</p>{demand ? <Link href="/dashboard/demandas" className="mt-1 block font-semibold text-emerald-800">#{demand.protocol} — {demand.title}</Link> : <p className="mt-1 text-slate-500">Nenhuma</p>}</div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Criada por</p><p className="mt-1 font-semibold text-slate-700">{creator ? `${creator.rank ? `${creator.rank}. ` : ""}${creator.full_name}` : "Usuário do SISCOM"}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Última atualização</p><p className="mt-1 text-slate-600">{new Date(event.updated_at).toLocaleString("pt-BR")}</p></div>
          </aside>
        </div>
      </CardContent>
    </Card>
  </div></div>;
}
