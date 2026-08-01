import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent } from "@/lib/types";
import { EventForm } from "../../event-form";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const [{ data: event }, { data: demands }, { data: profiles }, { data: participants }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    supabase.from("demands").select("id,protocol,title").neq("status", "concluida").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,full_name,war_name,rank").eq("active", true).order("rank").order("war_name"),
    supabase.from("event_participants").select("profile_id").eq("event_id", id),
  ]);
  if (!event) notFound();
  const demandOptions = [...(demands || [])];
  if (event.demand_id && !demandOptions.some((item) => item.id === event.demand_id)) {
    const { data: related } = await supabase.from("demands").select("id,protocol,title").eq("id", event.demand_id).maybeSingle();
    if (related) demandOptions.push(related);
  }
  return <div className="min-h-dvh bg-slate-50 p-5 pt-20 sm:p-8 lg:pt-8"><div className="mx-auto max-w-3xl">
    <Link href={`/dashboard/agenda/${id}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ArrowLeft size={16} />Voltar aos detalhes</Link>
    <h1 className="text-3xl font-bold text-slate-950">Editar atividade</h1><p className="mb-6 mt-2 text-sm text-slate-500">Atualize as informações e salve as alterações no calendário.</p>
    <Card><CardContent className="p-6"><EventForm demands={demandOptions} profiles={profiles || []} participantIds={(participants || []).map((item) => item.profile_id)} event={event as CalendarEvent} /></CardContent></Card>
  </div></div>;
}
