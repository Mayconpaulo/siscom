import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { DemandForm } from "../demand-form";

export default async function NewDemandPage() {
  const supabase = await createClient();
  const { data: profiles } = supabase ? await supabase.from("profiles").select("id,full_name,rank").eq("active", true).order("full_name") : { data: [] };
  return <div className="min-h-dvh bg-slate-50 p-5 pt-20 sm:p-8 lg:pt-8"><div className="mx-auto max-w-3xl"><Link href="/dashboard/demandas" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ArrowLeft size={16} />Voltar às demandas</Link><h1 className="text-3xl font-bold text-slate-950">Nova demanda</h1><p className="mb-6 mt-2 text-sm text-slate-500">Registre a solicitação e defina o acompanhamento operacional.</p><Card><CardContent className="p-6"><DemandForm profiles={profiles || []} /></CardContent></Card></div></div>;
}
