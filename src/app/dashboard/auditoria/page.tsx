import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, CheckCircle2, FileClock, Filter, PlusCircle, Search, ShieldCheck, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isDesignatedOwner } from "@/lib/access-control";
import { auditActionLabel, auditEntityLabel, auditSubject, isCompletionEvent, type AuditLogEntry } from "@/lib/audit";
import { profileDisplayName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Profile = { id: string; full_name: string; war_name: string; rank: string };
type AuditView = "all" | "demand" | "event" | "profile";
type SearchParams = Promise<{ q?: string; view?: string }>;

const views: Array<{ value: AuditView; label: string }> = [
  { value: "all", label: "Tudo" },
  { value: "demand", label: "Demandas" },
  { value: "event", label: "Agenda" },
  { value: "profile", label: "Usuários" },
];

function entryHref(entry: AuditLogEntry) {
  if (!entry.entity_id || entry.action === "DELETE") return null;
  if (entry.entity_type === "demand") return `/dashboard/demandas/${entry.entity_id}`;
  if (entry.entity_type === "event") return `/dashboard/agenda/${entry.entity_id}`;
  if (entry.entity_type === "profile") return "/dashboard/usuarios";
  return null;
}

export const metadata = { title: "Auditoria | SISCOM" };

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const selectedView: AuditView = views.some((item) => item.value === params.view) ? params.view as AuditView : "all";
  const query = (params.q || "").trim().toLocaleLowerCase("pt-BR");
  const supabase = await createClient();
  if (!supabase) redirect("/dashboard");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: ownerProfile } = await supabase.from("profiles").select("access_level,active,email").eq("id", user.id).single();
  if (!isDesignatedOwner(user.email, ownerProfile)) redirect("/dashboard");

  let auditQuery = supabase
    .from("audit_log")
    .select("id,actor_id,action,entity_type,entity_id,details,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (selectedView !== "all") auditQuery = auditQuery.eq("entity_type", selectedView);

  const [{ data: entriesData, error }, { data: profilesData }] = await Promise.all([
    auditQuery,
    supabase.from("profiles").select("id,full_name,war_name,rank"),
  ]);
  const entries = (entriesData || []) as AuditLogEntry[];
  const profiles = (profilesData || []) as Profile[];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const filtered = entries.filter((entry) => {
    if (!query) return true;
    const actor = entry.actor_id ? profileMap.get(entry.actor_id) : undefined;
    const text = [auditActionLabel(entry), auditSubject(entry), auditEntityLabel(entry.entity_type), actor ? profileDisplayName(actor) : "Sistema", JSON.stringify(entry.details)].join(" ").toLocaleLowerCase("pt-BR");
    return text.includes(query);
  });
  const createdCount = entries.filter((entry) => entry.action === "INSERT" || entry.action === "CREATE_TEMPORARY_ACCESS").length;
  const changedCount = entries.filter((entry) => entry.action === "UPDATE" || entry.action === "UPDATE_PROFILE").length;
  const completedCount = entries.filter(isCompletionEvent).length;

  function viewHref(view: AuditView) {
    const next = new URLSearchParams();
    if (view !== "all") next.set("view", view);
    if (params.q) next.set("q", params.q);
    const suffix = next.toString();
    return `/dashboard/auditoria${suffix ? `?${suffix}` : ""}`;
  }

  return <div className="min-h-dvh bg-slate-50 p-5 pt-20 sm:p-8 lg:pt-8"><div className="mx-auto max-w-7xl">
    <section className="relative overflow-hidden rounded-3xl bg-emerald-950 px-6 py-7 text-white shadow-lg sm:px-8">
      <div className="absolute -right-16 -top-24 size-64 rounded-full border border-amber-300/15" />
      <div className="relative flex items-center justify-between gap-6"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-amber-300"><ShieldCheck size={16} />Acesso exclusivo do proprietário</p><h1 className="mt-3 text-3xl font-bold tracking-tight">Auditoria do SISCOM</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100/70">Consulte quem criou, alterou, comentou ou concluiu demandas, atividades e cadastros.</p></div><FileClock className="hidden text-amber-300 sm:block" size={48} /></div>
    </section>

    {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">Não foi possível carregar a trilha de auditoria.</p>}
    <section className="my-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="flex items-center gap-4 p-4"><span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><Activity size={19} /></span><div><p className="text-2xl font-bold">{entries.length}</p><p className="text-xs text-slate-500">Registros carregados</p></div></Card>
      <Card className="flex items-center gap-4 p-4"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><PlusCircle size={19} /></span><div><p className="text-2xl font-bold">{createdCount}</p><p className="text-xs text-slate-500">Criações</p></div></Card>
      <Card className="flex items-center gap-4 p-4"><span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><FileClock size={19} /></span><div><p className="text-2xl font-bold">{changedCount}</p><p className="text-xs text-slate-500">Alterações</p></div></Card>
      <Card className="flex items-center gap-4 p-4"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={19} /></span><div><p className="text-2xl font-bold">{completedCount}</p><p className="text-xs text-slate-500">Conclusões identificadas</p></div></Card>
    </section>

    <section className="mb-5 rounded-2xl border bg-white p-3 shadow-sm"><div className="mb-3 grid grid-cols-2 gap-2 sm:flex">{views.map((view) => <Link key={view.value} href={viewHref(view.value)} className={cn("rounded-lg border px-4 py-2 text-center text-sm font-semibold transition hover:bg-slate-50", selectedView === view.value && "border-emerald-950 bg-emerald-950 text-white")}>{view.label}</Link>)}</div><form className="flex flex-col gap-2 sm:flex-row"><input type="hidden" name="view" value={selectedView} /><label className="flex h-11 flex-1 items-center gap-2 rounded-lg border bg-slate-50 px-3 text-sm text-slate-500"><Search size={17} /><input name="q" defaultValue={params.q} className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none" placeholder="Ação, pessoa, título ou protocolo..." /></label><Button type="submit" variant="outline"><Filter size={16} />Filtrar</Button></form></section>

    <Card className="overflow-hidden">{filtered.length === 0 ? <div className="grid place-items-center p-14 text-center"><FileClock className="mb-3 text-slate-300" /><p className="font-semibold">Nenhum registro encontrado</p><p className="mt-1 text-sm text-slate-500">Altere os filtros ou aguarde novas ações no sistema.</p></div> : <div className="divide-y">{filtered.map((entry) => {
      const actor = entry.actor_id ? profileMap.get(entry.actor_id) : undefined;
      const href = entryHref(entry);
      const content = <><div className="flex min-w-0 flex-1 items-start gap-3"><span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl", isCompletionEvent(entry) ? "bg-emerald-100 text-emerald-800" : entry.action === "DELETE" || entry.action === "DEACTIVATE" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700")}><Activity size={16} /></span><div className="min-w-0"><p className="text-sm font-bold text-slate-900">{auditActionLabel(entry)}</p><p className="mt-1 break-words text-sm text-slate-600">{auditSubject(entry)}</p><p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400"><span className="inline-flex items-center gap-1"><UserRound size={12} />{actor ? profileDisplayName(actor) : "Sistema"}</span><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" })}</time><span className="uppercase">{auditEntityLabel(entry.entity_type)}</span></p></div></div></>;
      return href ? <Link key={entry.id} href={href} className="flex p-4 transition hover:bg-slate-50 sm:p-5">{content}</Link> : <article key={entry.id} className="flex p-4 sm:p-5">{content}</article>;
    })}</div>}</Card>
    <p className="mt-4 text-center text-xs text-slate-400">São exibidos os 200 registros mais recentes do filtro selecionado.</p>
  </div></div>;
}
