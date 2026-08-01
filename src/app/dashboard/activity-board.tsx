"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronRight, LoaderCircle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEvent, EventStatus, EventType } from "@/lib/types";
import { communicationFronts, composeWorkNotes, detectCommunicationFronts, parseWorkNotes } from "@/lib/work-summary";

const statusLabels: Record<EventStatus, string> = { planejado: "Planejada", confirmado: "Confirmada", concluido: "Realizada", cancelado: "Cancelada" };
const statusTones: Record<EventStatus, string> = {
  planejado: "border-slate-200 bg-slate-100 text-slate-700",
  confirmado: "border-blue-200 bg-blue-50 text-blue-700",
  concluido: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelado: "border-red-200 bg-red-50 text-red-700",
};
const typeLabels: Record<EventType, string> = { solenidade: "Solenidade", reuniao: "Reunião", entrevista: "Entrevista", cobertura: "Cobertura", visita: "Visita", outro: "Outro" };
const cellInput = "w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-2 text-sm text-slate-700 outline-none transition hover:border-slate-200 hover:bg-white focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-700/10";

function localDateTime(value: string) {
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function TextCell({ value, placeholder, onCommit, ariaLabel }: { value: string; placeholder: string; onCommit: (value: string) => void; ariaLabel: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return <input aria-label={ariaLabel} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (draft.trim() !== value.trim()) onCommit(draft.trim()); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} placeholder={placeholder} className={cellInput} />;
}

export function ActivityBoard({ initialEvents }: { initialEvents: CalendarEvent[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState<string[]>([]);
  const [openProvidences, setOpenProvidences] = useState<string | null>(null);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => setEvents(initialEvents), [initialEvents]);

  async function createInlineEvent() {
    const title = newTitle.trim();
    if (!title) return;
    if (title.length < 3) {
      setError("A atividade precisa ter pelo menos 3 caracteres.");
      return;
    }
    setCreating(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Sua sessão expirou. Entre novamente no SISCOM.");
      setCreating(false);
      return;
    }
    const now = new Date().toISOString();
    const { data, error: insertError } = await supabase.from("events").insert({
      title,
      description: "",
      event_type: "outro",
      status: "planejado",
      starts_at: now,
      ends_at: now,
      all_day: false,
      location: "",
      responsible_unit: "",
      notes: composeWorkNotes({ providences: [], military: "", observations: "" }),
      demand_id: null,
      created_by: user.id,
    }).select("*").single();
    if (insertError || !data) setError(insertError?.message || "Não foi possível criar a atividade.");
    else {
      setEvents((current) => [data as CalendarEvent, ...current]);
      setNewTitle("");
    }
    setCreating(false);
  }

  async function savePatch(id: string, patch: Partial<CalendarEvent>) {
    const previous = events.find((event) => event.id === id);
    if (!previous) return;
    setError("");
    setSaving((current) => [...current, id]);
    setEvents((current) => current.map((event) => event.id === id ? { ...event, ...patch } : event));
    const { error: updateError } = await supabase.from("events").update(patch).eq("id", id);
    if (updateError) {
      setEvents((current) => current.map((event) => event.id === id ? previous : event));
      setError(updateError.message || "Não foi possível salvar a alteração.");
    }
    setSaving((current) => current.filter((item) => item !== id));
  }

  function saveStart(event: CalendarEvent, value: string) {
    if (!value) return;
    const startsAt = new Date(value).toISOString();
    const patch: Partial<CalendarEvent> = { starts_at: startsAt };
    if (new Date(startsAt) > new Date(event.ends_at)) patch.ends_at = startsAt;
    void savePatch(event.id, patch);
  }

  function saveEnd(event: CalendarEvent, value: string) {
    if (!value) return;
    const endsAt = new Date(value).toISOString();
    if (new Date(endsAt) < new Date(event.starts_at)) {
      setError("O término não pode ser anterior ao início.");
      return;
    }
    void savePatch(event.id, { ends_at: endsAt });
  }

  function updateProvidence(event: CalendarEvent, label: string) {
    const details = parseWorkNotes(event.notes);
    const providences = details.providences.includes(label) ? details.providences.filter((item) => item !== label) : [...details.providences, label];
    void savePatch(event.id, { notes: composeWorkNotes({ ...details, providences }) });
  }

  function updateMilitary(event: CalendarEvent, military: string) {
    const details = parseWorkNotes(event.notes);
    void savePatch(event.id, { notes: composeWorkNotes({ ...details, military }) });
  }

  return <>
    {error && <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">{error}</div>}
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] border-collapse text-left">
        <thead className="bg-emerald-950 text-[11px] uppercase tracking-wide text-emerald-50">
          <tr><th className="sticky left-0 z-10 w-[260px] min-w-[260px] bg-emerald-950 px-5 py-4">Atividade</th><th className="w-[150px] px-4 py-4">Missão</th><th className="w-[180px] px-4 py-4">Início</th><th className="w-[180px] px-4 py-4">Término</th><th className="w-[230px] px-4 py-4">Providências</th><th className="w-[220px] px-4 py-4">Militares envolvidos</th><th className="w-[135px] px-4 py-4">Situação</th><th className="w-12 px-3 py-4"><span className="sr-only">Abrir</span></th></tr>
        </thead>
        <tbody className="divide-y bg-white">
          <tr className="bg-amber-50/60">
            <td className="sticky left-0 z-[2] bg-amber-50 px-5 py-3"><div className="flex items-center gap-2"><Plus size={16} className="shrink-0 text-emerald-800" /><input aria-label="Nova atividade" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onBlur={() => void createInlineEvent()} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} disabled={creating} placeholder="Clique e digite uma atividade" className={`${cellInput} font-semibold placeholder:text-emerald-800`} />{creating && <LoaderCircle size={16} className="animate-spin text-emerald-800" />}</div></td>
            <td colSpan={7} className="px-4 py-3 text-xs text-slate-500">Digite a atividade primeiro. Uma nova linha será criada para você completar as demais colunas.</td>
          </tr>
          {events.length === 0 && !newTitle ? <tr><td colSpan={8} className="px-6 py-14 text-center text-sm text-slate-500">Nenhuma atividade neste período. Comece digitando na primeira linha.</td></tr> : events.map((event) => {
            const details = parseWorkNotes(event.notes);
            const detected = detectCommunicationFronts(event.title, event.description, event.notes).map((front) => front.label);
            const providences = details.providences.length ? details.providences : detected;
            const isSaving = saving.includes(event.id);
            return <tr key={event.id} className="group align-top transition hover:bg-emerald-50/40">
              <td className="sticky left-0 z-[1] bg-white px-3 py-3 group-hover:bg-[#f7fcf9]"><TextCell value={event.title} placeholder="Atividade" ariaLabel={`Atividade ${event.title}`} onCommit={(title) => { if (title.length >= 3) void savePatch(event.id, { title }); else setError("A atividade precisa ter pelo menos 3 caracteres."); }} /><p className="px-2 text-[10px] font-semibold text-slate-400">{isSaving ? "Salvando..." : typeLabels[event.event_type]}</p></td>
              <td className="px-2 py-3"><TextCell value={event.responsible_unit} placeholder="Adicionar missão" ariaLabel={`Missão de ${event.title}`} onCommit={(responsible_unit) => void savePatch(event.id, { responsible_unit })} /></td>
              <td className="px-2 py-3"><input aria-label={`Início de ${event.title}`} type="datetime-local" value={localDateTime(event.starts_at)} onChange={(input) => saveStart(event, input.target.value)} className={cellInput} /></td>
              <td className="px-2 py-3"><input aria-label={`Término de ${event.title}`} type="datetime-local" value={localDateTime(event.ends_at)} onChange={(input) => saveEnd(event, input.target.value)} className={cellInput} /></td>
              <td className="relative px-2 py-3"><button type="button" onClick={() => setOpenProvidences((current) => current === event.id ? null : event.id)} className={`${cellInput} min-h-10 text-left`}><span className="flex flex-wrap gap-1">{providences.length ? providences.map((item) => <span key={item} className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-900">{item}</span>) : <span className="text-slate-400">Selecionar...</span>}</span></button>{openProvidences === event.id && <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl border bg-slate-50 p-2.5">{communicationFronts.map((front) => { const selected = details.providences.includes(front.label); return <button type="button" key={front.label} onClick={() => updateProvidence(event, front.label)} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${selected ? "border-emerald-900 bg-emerald-950 text-white" : "bg-white text-slate-600"}`}>{selected && <Check size={10} />}{front.label}</button>; })}</div>}</td>
              <td className="px-2 py-3"><TextCell value={details.military} placeholder="Adicionar militares" ariaLabel={`Militares de ${event.title}`} onCommit={(military) => updateMilitary(event, military)} /></td>
              <td className="px-2 py-3"><select aria-label={`Situação de ${event.title}`} value={event.status} onChange={(input) => void savePatch(event.id, { status: input.target.value as EventStatus })} className={`${cellInput} font-bold ${statusTones[event.status]}`}><option value="planejado">Planejada</option><option value="confirmado">Confirmada</option><option value="concluido">Realizada</option><option value="cancelado">Cancelada</option></select><p className="mt-1 px-2 text-[10px] text-slate-400">{statusLabels[event.status]}</p></td>
              <td className="px-3 py-4"><Link href={`/dashboard/agenda/${event.id}`} aria-label={`Abrir detalhes de ${event.title}`} className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-emerald-800"><ChevronRight size={17} /></Link></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  </>;
}
