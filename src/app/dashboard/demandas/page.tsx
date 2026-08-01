import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Plus, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { profileDisplayName } from "@/lib/profile";
import type { Demand } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CompletionCheckbox } from "./completion-checkbox";

type Profile = { id: string; full_name: string; war_name: string; rank: string };
type DemandView = "all" | "mine" | "pending" | "completed";
type SearchParams = Promise<{ q?: string; view?: string }>;

const views: { value: DemandView; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "mine", label: "Minhas" },
  { value: "pending", label: "Pendentes" },
  { value: "completed", label: "Concluídas" },
];

function isCompleted(demand: Demand) { return demand.status === "concluida"; }
function isOpen(demand: Demand) { return !isCompleted(demand); }
function isOverdue(demand: Demand) { return Boolean(demand.due_at && new Date(demand.due_at) < new Date() && isOpen(demand)); }
function isDueSoon(demand: Demand) {
  if (!demand.due_at || !isOpen(demand)) return false;
  const remaining = new Date(demand.due_at).getTime() - Date.now();
  return remaining >= 0 && remaining <= 72 * 60 * 60 * 1000;
}
function profileName(profile?: Profile) { return profile ? profileDisplayName(profile) : "Não definido"; }

export default async function DemandsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = await searchParams;
  const q = (filters.q || "").trim().toLocaleLowerCase("pt-BR");
  const view: DemandView = views.some((item) => item.value === filters.view) ? filters.view as DemandView : "all";
  const supabase = await createClient();
  let demands: Demand[] = [];
  let profiles: Profile[] = [];
  let userId = "";
  let databaseError = false;

  if (supabase) {
    const { data: authData } = await supabase.auth.getUser();
    userId = authData.user?.id || "";
    const [demandsResult, profilesResult] = await Promise.all([
      supabase.from("demands").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,war_name,rank").order("war_name"),
    ]);
    demands = (demandsResult.data || []) as Demand[];
    profiles = (profilesResult.data || []) as Profile[];
    databaseError = Boolean(demandsResult.error);
  } else databaseError = true;

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const ordered = [...demands].sort((a, b) => {
    const aMine = a.assigned_to === userId ? 1 : 0;
    const bMine = b.assigned_to === userId ? 1 : 0;
    return bMine - aMine || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const filtered = ordered.filter((demand) => {
    const text = `${demand.protocol} ${demand.title} ${demand.description}`.toLocaleLowerCase("pt-BR");
    const matchesView = view === "all" || (view === "mine" && demand.assigned_to === userId) || (view === "pending" && !isCompleted(demand)) || (view === "completed" && isCompleted(demand));
    return (!q || text.includes(q)) && matchesView;
  });
  const openCount = demands.filter(isOpen).length;
  const overdueCount = demands.filter(isOverdue).length;
  const dueSoonCount = demands.filter(isDueSoon).length;
  const completedCount = demands.filter(isCompleted).length;

  function filterHref(nextView: DemandView) {
    const params = new URLSearchParams();
    if (nextView !== "all") params.set("view", nextView);
    if (filters.q) params.set("q", filters.q);
    const query = params.toString();
    return `/dashboard/demandas${query ? `?${query}` : ""}`;
  }

  return <div className="min-h-dvh bg-slate-50 p-5 pt-20 sm:p-8 lg:pt-8"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-bold text-slate-950">Demandas</h1><p className="mt-1 text-sm text-slate-500">Todas as demandas são visíveis; as atribuídas a você aparecem primeiro.</p></div><Button asChild className="bg-emerald-950"><Link href="/dashboard/demandas/nova"><Plus size={17} />Nova demanda</Link></Button></div>
    {databaseError && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">Não foi possível carregar as demandas. Verifique a conexão com o Supabase.</p>}

    <div className="my-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="flex items-center gap-4 p-4"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><FileText size={20} /></span><div><p className="text-2xl font-bold">{openCount}</p><p className="text-xs text-slate-500">Demandas pendentes</p></div></Card>
      <Card className="flex items-center gap-4 p-4"><span className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-700"><AlertTriangle size={20} /></span><div><p className="text-2xl font-bold">{overdueCount}</p><p className="text-xs text-slate-500">Com prazo vencido</p></div></Card>
      <Card className="flex items-center gap-4 p-4"><span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><CalendarClock size={20} /></span><div><p className="text-2xl font-bold">{dueSoonCount}</p><p className="text-xs text-slate-500">Vencem em até 3 dias</p></div></Card>
      <Card className="flex items-center gap-4 p-4"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={20} /></span><div><p className="text-2xl font-bold">{completedCount}</p><p className="text-xs text-slate-500">Concluídas</p></div></Card>
    </div>

    <div className="mb-5 rounded-xl border bg-white p-3"><div className="mb-3 grid grid-cols-2 gap-2 sm:flex">{views.map((item) => <Link key={item.value} href={filterHref(item.value)} className={cn("rounded-lg border px-4 py-2 text-center text-sm font-semibold transition hover:bg-muted", view === item.value && "border-emerald-800 bg-emerald-950 text-white dark:border-amber-300 dark:bg-amber-300 dark:text-emerald-950")}>{item.label}</Link>)}</div><form className="flex flex-col gap-2 sm:flex-row"><input type="hidden" name="view" value={view} /><label className="flex h-11 flex-1 items-center gap-2 rounded-lg border bg-slate-50 px-3 text-sm text-slate-500"><Search size={17} /><input name="q" defaultValue={filters.q} className="w-full bg-transparent text-slate-800 outline-none" placeholder="Protocolo, título ou descrição..." /></label><Button type="submit" variant="outline">Buscar</Button></form></div>

    <Card className="overflow-hidden"><div className="hidden grid-cols-[90px_minmax(250px,1fr)_190px_160px_130px] gap-3 border-b bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400 lg:grid"><span>Protocolo</span><span>Demanda</span><span>Responsável</span><span>Prazo</span><span>Conclusão</span></div>
      {filtered.length === 0 ? <div className="grid place-items-center p-14 text-center"><FileText className="mb-3 text-slate-300" /><p className="font-semibold">Nenhuma demanda encontrada</p><p className="mt-1 text-sm text-slate-500">Altere o filtro ou cadastre uma nova solicitação.</p></div> : filtered.map((demand) => {
        const overdue = isOverdue(demand); const dueSoon = isDueSoon(demand); const mine = demand.assigned_to === userId;
        return <div key={demand.id} className={cn("grid gap-3 border-b px-5 py-4 transition last:border-0 lg:grid-cols-[90px_minmax(250px,1fr)_190px_160px_130px] lg:items-center", mine && "bg-emerald-50/50 dark:bg-emerald-950/20")}>
          <Link href={`/dashboard/demandas/${demand.id}`} className="text-xs font-bold text-emerald-800 dark:text-amber-300">#{demand.protocol}</Link>
          <div><div className="flex flex-wrap items-center gap-2"><Link href={`/dashboard/demandas/${demand.id}`} className="text-sm font-semibold text-slate-800 hover:underline">{demand.title}</Link>{mine && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100"><UserRound size={11} />Minha demanda</span>}</div><p className="mt-1 line-clamp-1 text-xs text-slate-500">{demand.description}</p></div>
          <span className="text-xs text-slate-600"><span className="mr-1 font-semibold lg:hidden">Responsável:</span>{profileName(profileMap.get(demand.assigned_to || ""))}</span>
          <span className={`text-xs font-semibold ${overdue ? "text-red-700" : dueSoon ? "text-amber-700" : "text-slate-600"}`}><span className="mr-1 font-semibold lg:hidden">Prazo:</span>{demand.due_at ? new Date(demand.due_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Sem prazo"}{overdue && <small className="block font-bold">Vencida</small>}{dueSoon && <small className="block font-bold">Prazo próximo</small>}</span>
          <CompletionCheckbox demandId={demand.id} initialCompleted={isCompleted(demand)} />
        </div>;
      })}
    </Card>
  </div></div>;
}
