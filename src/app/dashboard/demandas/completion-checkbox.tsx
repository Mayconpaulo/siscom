"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setDemandCompleted } from "./actions";

export function CompletionCheckbox({ demandId, initialCompleted, compact = false }: { demandId: string; initialCompleted: boolean; compact?: boolean }) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    const previous = completed;
    setCompleted(next); setError("");
    startTransition(async () => {
      const result = await setDemandCompleted(demandId, next);
      if (result.error) { setCompleted(previous); setError(result.error); }
      else router.refresh();
    });
  }

  return <div className={compact ? "" : "lg:justify-self-start"} title={error || undefined}>
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-xs font-semibold">
      <input type="checkbox" checked={completed} disabled={pending} onChange={(event) => change(event.target.checked)} className="size-5 accent-emerald-800 disabled:opacity-50" aria-label={completed ? "Marcar demanda como pendente" : "Marcar demanda como concluída"} />
      <span className={completed ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500"}>{pending ? "Salvando..." : completed ? "Concluída" : "Pendente"}</span>
    </label>
    {error && <p className="mt-1 text-[10px] text-red-600">{error}</p>}
  </div>;
}
