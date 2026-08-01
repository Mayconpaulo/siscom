import { Award, FileSearch, ShieldCheck } from "lucide-react";
import { ReferenceGenerator } from "./reference-generator";

export const metadata = { title: "Gerar Referência Elogiosa" };

export default function ReferencePage() {
  return <div className="min-h-dvh bg-slate-50 p-5 pt-20 sm:p-8 lg:pt-8">
    <div className="mx-auto max-w-6xl">
      <section className="relative mb-7 overflow-hidden rounded-3xl bg-emerald-950 px-6 py-7 text-white shadow-lg sm:px-8">
        <div className="absolute -right-16 -top-24 size-64 rounded-full border border-amber-300/15" />
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-red-700 via-amber-300 to-emerald-600" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-amber-300"><Award size={16} />Documentos institucionais</p><h1 className="mt-3 text-3xl font-bold tracking-tight">Gerar Referência Elogiosa</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/65">Envie o documento com as informações do militar. O SISCOM extrai os dados, permite a revisão e gera o Word no padrão da Unidade.</p></div>
          <div className="hidden size-16 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-amber-300 sm:grid"><FileSearch size={28} /></div>
        </div>
      </section>
      <ReferenceGenerator />
      <p className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck size={14} className="text-emerald-700" />O documento é processado somente para gerar a referência e não fica armazenado.</p>
    </div>
  </div>;
}
