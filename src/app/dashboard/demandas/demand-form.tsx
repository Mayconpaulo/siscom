"use client";

import { useActionState } from "react";
import { createDemand, updateDemand } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Demand } from "@/lib/types";

type ProfileOption = { id: string; full_name: string; rank: string };
const initialState: { error?: string } = {};
function localDateTime(value: string | null | undefined) { if (!value) return ""; const date = new Date(value); const pad = (number: number) => String(number).padStart(2, "0"); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }

export function DemandForm({ profiles, demand }: { profiles: ProfileOption[]; demand?: Demand }) {
  const demandAction = demand ? updateDemand.bind(null, demand.id) : createDemand;
  const [state, action, pending] = useActionState(demandAction, initialState);
  return <form action={action} className="space-y-5">
    <div><label className="mb-2 block text-sm font-semibold">Título *</label><Input name="title" required minLength={3} defaultValue={demand?.title} placeholder="Ex.: Cobertura fotográfica da solenidade" /></div>
    <div className="grid gap-5 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-semibold">Unidade solicitante *</label><Input name="requesting_unit" required defaultValue={demand?.requesting_unit} placeholder="Ex.: Comando" /></div><div><label className="mb-2 block text-sm font-semibold">Prazo</label><Input name="due_at" type="datetime-local" defaultValue={localDateTime(demand?.due_at)} /></div></div>
    <div className="grid gap-5 sm:grid-cols-3"><div><label className="mb-2 block text-sm font-semibold">Prioridade</label><select name="priority" defaultValue={demand?.priority || "normal"} className="h-11 w-full rounded-lg border bg-white px-3.5 text-sm"><option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div><div><label className="mb-2 block text-sm font-semibold">Situação</label><select name="status" defaultValue={demand?.status || "aberta"} className="h-11 w-full rounded-lg border bg-white px-3.5 text-sm"><option value="aberta">Aberta</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option><option value="cancelada">Cancelada</option></select></div><div><label className="mb-2 block text-sm font-semibold">Responsável</label><select name="assigned_to" defaultValue={demand?.assigned_to || ""} className="h-11 w-full rounded-lg border bg-white px-3.5 text-sm"><option value="">Não definido</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.rank ? `${profile.rank}. ` : ""}{profile.full_name}</option>)}</select></div></div>
    <div><label className="mb-2 block text-sm font-semibold">Descrição *</label><textarea name="description" required rows={7} defaultValue={demand?.description} className="w-full rounded-lg border bg-white p-3.5 text-sm outline-none focus:border-emerald-700" placeholder="Descreva a necessidade, público e entregáveis..." /></div>
    {state.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
    <div className="flex justify-end"><Button disabled={pending} className="bg-emerald-950">{pending ? "Salvando..." : demand ? "Salvar alterações" : "Cadastrar demanda"}</Button></div>
  </form>;
}
