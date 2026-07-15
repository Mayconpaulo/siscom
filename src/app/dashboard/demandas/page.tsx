import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Filter, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Demand, DemandPriority, DemandStatus } from "@/lib/types";

const statusLabel: Record<DemandStatus, string> = { aberta: "Aberta", em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada" };
const statusTone: Record<DemandStatus, string> = { aberta: "bg-amber-50 text-amber-700", em_andamento: "bg-blue-50 text-blue-700", concluida: "bg-emerald-50 text-emerald-700", cancelada: "bg-slate-100 text-slate-600" };
const priorityLabel: Record<DemandPriority, string> = { baixa: "Baixa", normal: "Normal", alta: "Alta", urgente: "Urgente" };
const priorityTone: Record<DemandPriority, string> = { baixa: "text-slate-500", normal: "text-blue-700", alta: "text-orange-700", urgente: "text-red-700" };
type Profile = { id: string; full_name: string; rank: string };
type SearchParams = Promise<{ q?: string; status?: string; priority?: string }>;

function isOpen(demand: Demand) { return !["concluida", "cancelada"].includes(demand.status); }
function isOverdue(demand: Demand) { return Boolean(demand.due_at && new Date(demand.due_at) < new Date() && isOpen(demand)); }
function isDueSoon(demand: Demand) {
  if (!demand.due_at || !isOpen(demand)) return false;
  const remaining = new Date(demand.due_at).getTime() - Date.now();
  return remaining >= 0 && remaining <= 72 * 60 * 60 * 1000;
}
function profileName(profile?: Profile) { return profile ? `${profile.rank ? `${profile.rank}. ` : ""}${profile.full_name}` : "Não definido"; }

export default async function DemandsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = await searchParams;
  const q = (filters.q || "").trim().toLocaleLowerCase("pt-BR");
  const status = filters.status || "todas";
  const priority = filters.priority || "todas";
  const supabase = await createClient();
  let demands: Demand[] = [];
  let profiles: Profile[] = [];
  let databaseError = false;

  if (supabase) {
    const [demandsResult, profilesResult] = await Promise.all([
      supabase.from("demands").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,rank").order("full_name"),
    ]);
    demands = (demandsResult.data || []) as Demand[];
    profiles = (profilesResult.data || []) as Profile[];
    databaseError = Boolean(demandsResult.error);
  } else databaseError = true;

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const filtered = demands.filter((demand) => {
    const text = `${demand.protocol} ${demand.title} ${demand.requesting_unit} ${demand.description}`.toLocaleLowerCase("pt-BR");
    return (!q || text.includes(q)) && (status === "todas" || demand.status === status) && (priority === "todas" || demand.priority === priority);
  });
  const openCount = demands.filter(isOpen).length;
  const overdueCount = demands.filter(isOverdue).length;
  const dueSoonCount = demands.filter(isDueSoon).length;
  const completedCount = demands.filter((demand) => demand.status === "concluida").length;

  return <div className="min-h-dvh bg-slate-50 p-5 pt-20 sm:p-8 lg:pt-8"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-bold text-slate-950">Demandas</h1><p className="mt-1 text-sm text-slate-500">Cadastro, distribuição e acompanhamento das solicitações.</p></div><Button asChild className="bg-emerald-950"><Link href="/dashboard/demandas/nova"><Plus size={17} />Nova demanda</Link></Button></div>
    {databaseError && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">Não foi possível carregar as demandas. Verifique a conexão com o Supabase.</p>}

    <div className="my-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="flex items-center gap-4 p-4"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><FileText size={20} /></span><div><p className="text-2xl font-bold">{openCount}</p><p className="text-xs text-slate-500">Demandas ativas</p></div></Card>
      <Card className="flex items-center gap-4 p-4"><span className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-700"><AlertTriangle size={20} /></span><div><p className="text-2xl font-bold">{overdueCount}</p><p className="text-xs text-slate-500">Com prazo vencido</p></div></Card>
      <Card className="flex items-center gap-4 p-4"><span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><CalendarClock size={20} /></span><div><p className="text-2xl font-bold">{dueSoonCount}</p><p className="text-xs text-slate-500">Vencem em até 3 dias</p></div></Card>
      <Card className="flex items-center gap-4 p-4"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={20} /></span><div><p className="text-2xl font-bold">{completedCount}</p><p className="text-xs text-slate-500">Concluídas</p></div></Card>
    </div>

    <form className="mb-5 grid gap-3 rounded-xl border bg-white p-3 md:grid-cols-[1fr_190px_190px_auto]">
      <label className="flex h-11 items-center gap-2 rounded-lg border bg-slate-50 px-3 text-sm text-slate-500"><Search size={17} /><input name="q" defaultValue={filters.q} className="w-full bg-transparent text-slate-800 outline-none" placeholder="Protocolo, título ou unidade..." /></label>
      <select name="status" defaultValue={status} className="h-11 rounded-lg border bg-white px-3 text-sm"><option value="todas">Todas as situações</option><option value="aberta">Aberta</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option><option value="cancelada">Cancelada</option></select>
      <select name="priority" defaultValue={priority} className="h-11 rounded-lg border bg-white px-3 text-sm"><option value="todas">Todas as prioridades</option><option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select>
      <Button type="submit" variant="outline"><Filter size={16} />Filtrar</Button>
    </form>

    <Card className="overflow-hidden"><div className="hidden grid-cols-[90px_minmax(250px,1fr)_180px_150px_140px_130px] gap-3 border-b bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400 lg:grid"><span>Protocolo</span><span>Demanda</span><span>Responsável</span><span>Prazo</span><span>Prioridade</span><span>Situação</span></div>
      {filtered.length === 0 ? <div className="grid place-items-center p-14 text-center"><FileText className="mb-3 text-slate-300" /><p className="font-semibold">Nenhuma demanda encontrada</p><p className="mt-1 text-sm text-slate-500">Altere os filtros ou cadastre uma nova solicitação.</p></div> : filtered.map((demand) => {
        const overdue = isOverdue(demand); const dueSoon = isDueSoon(demand);
        return <Link href={`/dashboard/demandas/${demand.id}`} key={demand.id} className="grid gap-3 border-b px-5 py-4 transition hover:bg-emerald-50/40 last:border-0 lg:grid-cols-[90px_minmax(250px,1fr)_180px_150px_140px_130px] lg:items-center">
          <span className="text-xs font-bold text-emerald-800">#{demand.protocol}</span><div><p className="text-sm font-semibold text-slate-800">{demand.title}</p><p className="mt-1 line-clamp-1 text-xs text-slate-500">{demand.requesting_unit} · {demand.description}</p></div><span className="text-xs text-slate-600">{profileName(profileMap.get(demand.assigned_to || ""))}</span><span className={`text-xs font-semibold ${overdue ? "text-red-700" : dueSoon ? "text-amber-700" : "text-slate-600"}`}>{demand.due_at ? new Date(demand.due_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Sem prazo"}{overdue && <small className="block font-bold">Vencida</small>}{dueSoon && <small className="block font-bold">Prazo próximo</small>}</span><span className={`text-xs font-bold ${priorityTone[demand.priority]}`}>{priorityLabel[demand.priority]}</span><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${statusTone[demand.status]}`}>{statusLabel[demand.status]}</span>
        </Link>;
      })}
    </Card>
  </div></div>;
}
