import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, FileText, History, Pencil, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { profileDisplayName } from "@/lib/profile";
import type { Demand, DemandComment, DemandHistory } from "@/lib/types";
import { CommentForm } from "./comment-form";
import { CompletionCheckbox } from "../completion-checkbox";

const fieldLabels: Record<string, string> = { title: "título", description: "descrição", requesting_unit: "unidade solicitante", priority: "prioridade", status: "situação", due_at: "prazo", assigned_to: "responsável" };
type Profile = { id: string; full_name: string; war_name: string; rank: string };
function profileName(profile?: Profile) { return profile ? profileDisplayName(profile) : "Não definido"; }
function changedFields(item: DemandHistory) { if (item.event === "INSERT") return "Demanda criada"; const previous = item.previous_data || {}, next = item.new_data || {}; const changed = Object.keys(fieldLabels).filter((field) => JSON.stringify(previous[field as keyof Demand]) !== JSON.stringify(next[field as keyof Demand])).map((field) => fieldLabels[field]); return changed.length ? `Alterou: ${changed.join(", ")}` : "Demanda atualizada"; }

export default async function DemandDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const [{ data: demandData }, { data: profilesData }, { data: historyData }, { data: commentsData }, { data: eventsData }] = await Promise.all([
    supabase.from("demands").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("id,full_name,war_name,rank").order("war_name"),
    supabase.from("demand_history").select("*").eq("demand_id", id).order("created_at", { ascending: false }).limit(40),
    supabase.from("demand_comments").select("*").eq("demand_id", id).order("created_at", { ascending: false }),
    supabase.from("events").select("id,title,starts_at,status").eq("demand_id", id).order("starts_at", { ascending: false }).limit(5),
  ]);
  if (!demandData) notFound();
  const demand = demandData as Demand;
  const profiles = (profilesData || []) as Profile[];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const history = (historyData || []) as DemandHistory[];
  const comments = (commentsData || []) as DemandComment[];
  const overdue = demand.due_at && new Date(demand.due_at) < new Date() && !["concluida", "cancelada"].includes(demand.status);

  return <div className="min-h-dvh bg-slate-50 p-5 pt-20 sm:p-8 lg:pt-8"><div className="mx-auto max-w-6xl"><Link href="/dashboard/demandas" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ArrowLeft size={16} />Voltar às demandas</Link>
    <Card className="overflow-hidden"><div className="border-b bg-emerald-950 p-6 text-white sm:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="mb-3 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">#{demand.protocol}</span>{overdue && <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">Prazo vencido</span>}</div><h1 className="text-2xl font-bold sm:text-3xl">{demand.title}</h1></div><div className="flex flex-col items-start gap-3 sm:items-end"><div className="rounded-xl bg-white px-3 py-1 text-emerald-950"><CompletionCheckbox demandId={id} initialCompleted={demand.status === "concluida"} compact /></div><Button asChild className="shrink-0 bg-amber-300 text-emerald-950 hover:bg-amber-200"><Link href={`/dashboard/demandas/${id}/editar`}><Pencil size={16} />Editar demanda</Link></Button></div></div></div>
      <CardContent className="p-5 sm:p-8"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border bg-slate-50 p-4"><UserRound className="mb-3 text-emerald-800" size={19} /><p className="text-[10px] font-bold uppercase text-slate-400">Responsável</p><p className="mt-1 text-sm font-semibold">{profileName(profileMap.get(demand.assigned_to || ""))}</p></div><div className="rounded-xl border bg-slate-50 p-4"><CalendarClock className="mb-3 text-emerald-800" size={19} /><p className="text-[10px] font-bold uppercase text-slate-400">Prazo</p><p className={`mt-1 text-sm font-semibold ${overdue ? "text-red-700" : ""}`}>{demand.due_at ? new Date(demand.due_at).toLocaleString("pt-BR") : "Sem prazo definido"}</p></div><div className="rounded-xl border bg-slate-50 p-4"><Users className="mb-3 text-emerald-800" size={19} /><p className="text-[10px] font-bold uppercase text-slate-400">Criada por</p><p className="mt-1 text-sm font-semibold">{profileName(profileMap.get(demand.created_by))}</p></div><div className="rounded-xl border bg-slate-50 p-4"><Clock3 className="mb-3 text-emerald-800" size={19} /><p className="text-[10px] font-bold uppercase text-slate-400">Última atualização</p><p className="mt-1 text-sm font-semibold">{new Date(demand.updated_at).toLocaleString("pt-BR")}</p></div></div>
        <section className="mt-6"><h2 className="mb-2 flex items-center gap-2 font-bold"><FileText size={18} />Descrição da demanda</h2><p className="whitespace-pre-wrap rounded-xl border bg-white p-5 text-sm leading-6 text-slate-600">{demand.description}</p></section>
      </CardContent></Card>
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px]"><section className="space-y-4"><CommentForm demandId={id} /><Card><div className="border-b p-5"><h2 className="font-bold">Andamentos registrados</h2><p className="text-xs text-slate-500">Observações operacionais da equipe</p></div>{comments.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Nenhum andamento registrado.</p> : comments.map((comment) => <div key={comment.id} className="border-b p-5 last:border-0"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{profileName(profileMap.get(comment.author_id))}</p><time className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleString("pt-BR")}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{comment.content}</p></div>)}</Card></section>
      <aside className="space-y-6"><Card><div className="border-b p-5"><h2 className="flex items-center gap-2 font-bold"><History size={18} />Histórico</h2><p className="text-xs text-slate-500">Alterações automáticas</p></div>{history.length === 0 ? <p className="p-6 text-sm text-slate-500">Sem alterações registradas.</p> : history.map((item) => <div key={item.id} className="flex gap-3 border-b p-4 last:border-0"><span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-800"><CheckCircle2 size={14} /></span><div><p className="text-xs font-semibold text-slate-700">{changedFields(item)}</p><p className="mt-1 text-[11px] text-slate-400">{profileName(profileMap.get(item.actor_id))} • {new Date(item.created_at).toLocaleString("pt-BR")}</p></div></div>)}</Card>
        {eventsData && eventsData.length > 0 && <Card><div className="border-b p-5"><h2 className="font-bold">Atividades relacionadas</h2></div>{eventsData.map((event) => <Link key={event.id} href={`/dashboard/agenda/${event.id}`} className="block border-b p-4 text-sm transition hover:bg-slate-50 last:border-0"><p className="font-semibold">{event.title}</p><p className="mt-1 text-xs text-slate-500">{new Date(event.starts_at).toLocaleString("pt-BR")}</p></Link>)}</Card>}
      </aside></div>
  </div></div>;
}
