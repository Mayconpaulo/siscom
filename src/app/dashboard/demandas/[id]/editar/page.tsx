import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Demand } from "@/lib/types";
import { DemandForm } from "../../demand-form";

export default async function EditDemandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const [{ data: demand }, { data: profiles }] = await Promise.all([supabase.from("demands").select("*").eq("id", id).maybeSingle(), supabase.from("profiles").select("id,full_name,war_name,rank").eq("active", true).order("war_name")]);
  if (!demand) notFound();
  return <div className="min-h-dvh bg-slate-50 p-5 pt-20 sm:p-8 lg:pt-8"><div className="mx-auto max-w-3xl"><Link href={`/dashboard/demandas/${id}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ArrowLeft size={16} />Voltar aos detalhes</Link><h1 className="text-3xl font-bold text-slate-950">Editar demanda #{demand.protocol}</h1><p className="mb-6 mt-2 text-sm text-slate-500">Atualize o responsável, prazo, conclusão ou conteúdo.</p><Card><CardContent className="p-6"><DemandForm profiles={profiles || []} demand={demand as Demand} /></CardContent></Card></div></div>;
}
