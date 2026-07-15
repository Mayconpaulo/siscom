"use client";

import { useActionState } from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { createEvent, updateEvent } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CalendarEvent } from "@/lib/types";

type DemandOption = { id: string; protocol: number; title: string };
const initial: { error?: string } = {};

function localDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventForm({ demands, event }: { demands: DemandOption[]; event?: CalendarEvent }) {
  const eventAction = event ? updateEvent.bind(null, event.id) : createEvent;
  const [state, action, pending] = useActionState(eventAction, initial);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-semibold">Título *</label>
        <Input name="title" required minLength={3} defaultValue={event?.title} placeholder="Ex.: Cobertura da solenidade de formatura" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold">Tipo</label>
          <select name="event_type" defaultValue={event?.event_type || "solenidade"} className="h-11 w-full rounded-lg border bg-white px-3.5 text-sm">
            <option value="solenidade">Solenidade</option><option value="reuniao">Reunião</option><option value="entrevista">Entrevista</option><option value="cobertura">Cobertura</option><option value="visita">Visita</option><option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">Situação</label>
          <select name="status" defaultValue={event?.status || "planejado"} className="h-11 w-full rounded-lg border bg-white px-3.5 text-sm">
            <option value="planejado">Planejado</option><option value="confirmado">Confirmado</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarDays size={15} />Início *</label>
          <Input name="starts_at" type="datetime-local" required defaultValue={localDateTime(event?.starts_at)} />
        </div>
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold"><Clock size={15} />Término *</label>
          <Input name="ends_at" type="datetime-local" required defaultValue={localDateTime(event?.ends_at)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input name="all_day" type="checkbox" defaultChecked={event?.all_day} className="size-4 accent-emerald-900" />Atividade de dia inteiro
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold"><MapPin size={15} />Local</label>
          <Input name="location" defaultValue={event?.location} placeholder="Ex.: Pátio de formaturas" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">Unidade responsável</label>
          <Input name="responsible_unit" defaultValue={event?.responsible_unit} placeholder="Ex.: Comunicação Social" />
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">Demanda relacionada</label>
        <select name="demand_id" defaultValue={event?.demand_id || ""} className="h-11 w-full rounded-lg border bg-white px-3.5 text-sm">
          <option value="">Nenhuma demanda</option>
          {demands.map((demand) => <option key={demand.id} value={demand.id}>#{demand.protocol} — {demand.title}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">Descrição</label>
        <textarea name="description" rows={4} defaultValue={event?.description} className="w-full rounded-lg border bg-white p-3.5 text-sm outline-none focus:border-emerald-700" />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">Observações internas</label>
        <textarea name="notes" rows={3} defaultValue={event?.notes} className="w-full rounded-lg border bg-white p-3.5 text-sm outline-none focus:border-emerald-700" />
      </div>
      {state.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <div className="flex justify-end">
        <Button disabled={pending} className="bg-emerald-950">{pending ? "Salvando..." : event ? "Salvar alterações" : "Cadastrar atividade"}</Button>
      </div>
    </form>
  );
}
