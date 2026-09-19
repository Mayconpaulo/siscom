import { CakeSlice, Images } from "lucide-react";
import { BirthdayCardGenerator } from "./birthday-card-generator";

export const metadata = { title: "Cartões de Aniversário | SISCOM" };

export default function BirthdayCardsPage() {
  return <div className="min-h-dvh bg-slate-50 p-5 pt-20 sm:p-8 lg:pt-8">
    <div className="mx-auto max-w-7xl">
      <section className="relative mb-7 overflow-hidden rounded-3xl bg-emerald-950 px-6 py-7 text-white shadow-lg sm:px-8">
        <div className="absolute -right-16 -top-24 size-64 rounded-full border border-amber-300/15" />
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-red-700 via-amber-300 to-emerald-600" />
        <div className="relative flex items-center justify-between gap-6">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-amber-300"><CakeSlice size={16} />Comunicação institucional</p><h1 className="mt-3 text-3xl font-bold tracking-tight">Cartões de Aniversário</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100/70">Crie um cartão individual ou envie o relatório mensal para gerar todos os aniversariantes em imagens PNG separadas.</p></div>
          <div className="hidden size-16 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-amber-300 sm:grid"><Images size={29} /></div>
        </div>
      </section>
      <BirthdayCardGenerator />
    </div>
  </div>;
}

