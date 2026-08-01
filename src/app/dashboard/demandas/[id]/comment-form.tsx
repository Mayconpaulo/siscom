"use client";

import { useActionState, useEffect, useRef } from "react";
import { MessageSquarePlus } from "lucide-react";
import { addDemandComment } from "../actions";
import { Button } from "@/components/ui/button";

export function CommentForm({ demandId }: { demandId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(addDemandComment.bind(null, demandId), {});
  useEffect(() => { if (state.success) formRef.current?.reset(); }, [state.success]);
  return <form ref={formRef} action={action} className="rounded-xl border bg-white p-4"><label className="mb-2 flex items-center gap-2 text-sm font-bold"><MessageSquarePlus size={17} />Registrar atualização</label><textarea name="content" required minLength={2} rows={3} className="w-full rounded-lg border bg-slate-50 p-3 text-sm outline-none focus:border-emerald-700" placeholder="Informe o andamento, decisão ou observação relevante..." />{state.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}<div className="mt-3 flex justify-end"><Button disabled={pending} className="bg-emerald-950">{pending ? "Registrando..." : "Registrar andamento"}</Button></div></form>;
}
