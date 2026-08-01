import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "../event-form";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ modo?: string }> }) {
  const params = await searchParams;
  const isCompletedMode = params.modo === "realizado";
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase.from("demands").select("id,protocol,title").neq("status", "concluida").order("created_at", { ascending: false })
    : { data: [] };

  return <div className="min-h-dvh bg-slate-50 p-4 pt-20 sm:p-8 lg:pt-8"><div className="mx-auto max-w-3xl">
    <Link href={isCompletedMode ? "/dashboard" : "/dashboard/agenda"} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ArrowLeft size={16} />{isCompletedMode ? "Voltar à visão geral" : "Voltar à agenda"}</Link>
    <div className="flex items-start gap-4">
      {isCompletedMode && <div className="mt-1 grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-950 text-amber-300"><CheckCircle2 size={21} /></div>}
      <div><h1 className="text-3xl font-bold text-slate-950">{isCompletedMode ? "Registrar trabalho realizado" : "Nova atividade"}</h1><p className="mb-6 mt-2 text-sm text-slate-500">{isCompletedMode ? "Documente uma atividade, produção ou entrega que a equipe já concluiu." : "Planeje eventos, coberturas e compromissos da seção."}</p></div>
    </div>
    {isCompletedMode && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><strong>Registro rápido:</strong> informe a missão, o período, o que foi entregue, os militares envolvidos e as frentes empregadas — por exemplo: foto, vídeo, drone, boletim, link ou crachás.</div>}
    <Card><CardContent className="p-5 sm:p-6"><EventForm demands={data || []} mode={isCompletedMode ? "realizado" : "planejado"} /></CardContent></Card>
  </div></div>;
}
