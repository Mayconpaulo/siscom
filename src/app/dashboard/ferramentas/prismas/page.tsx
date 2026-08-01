import { PrismaGenerator } from "./prisma-generator";

export default function PrismaGeneratorPage() {
  return <div className="min-h-dvh bg-slate-50 p-4 pt-20 sm:p-8 lg:pt-8"><div className="mx-auto max-w-7xl">
    <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Ferramentas de apoio</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Gerador de prismas</h1><p className="mt-2 text-sm text-slate-500">Prepare prismas de identificação, visualize a folha A4 e exporte para impressão.</p></div>
    <PrismaGenerator />
  </div></div>;
}
