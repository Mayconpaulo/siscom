import Image from "next/image";
import { cn } from "@/lib/utils";

export function Brand({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return <div className="flex items-center gap-3">
    <div className={cn("grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border p-1", inverse ? "border-white/15 bg-white/10" : "border-emerald-900/10 bg-emerald-950")}>
      <Image src="/brasao-1-bimec.png" alt="Brasão do 1º BIMEC (ES)" width={42} height={58} className="h-full w-auto object-contain" priority />
    </div>
    {!compact && <div><p className={cn("text-lg font-extrabold tracking-[.13em]", inverse ? "text-white" : "text-emerald-950")}>SISCOM</p><p className={cn("text-[9px] font-semibold uppercase tracking-[.17em]", inverse ? "text-emerald-100/60" : "text-slate-500")}>Comunicação Social Integrada</p></div>}
  </div>;
}
