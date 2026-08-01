"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronRight, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { profileDisplayName } from "@/lib/profile";
import type { CalendarEvent, EventStatus, EventType } from "@/lib/types";
import { communicationFronts, composeWorkNotes, parseWorkNotes } from "@/lib/work-summary";

const statusLabels: Record<EventStatus, string> = { planejado: "Planejada", confirmado: "Confirmada", concluido: "Realizada", cancelado: "Cancelada" };
const statusTones: Record<EventStatus, string> = {
  planejado: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100",
  confirmado: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200",
  concluido: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  cancelado: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200",
};
const typeLabels: Record<EventType, string> = { solenidade: "Solenidade", reuniao: "Reunião", entrevista: "Entrevista", cobertura: "Cobertura", visita: "Visita", outro: "Outro" };
const cellInput = "w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:bg-amber-50/70 focus:ring-2 focus:ring-amber-400/15 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-amber-300 dark:focus:bg-emerald-950/60 dark:focus:ring-amber-300/15";
type ProfileOption = { id: string; full_name: string; war_name: string; rank: string };

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

export function ActivityBoard({ initialEvents, profiles, initialParticipants }: { initialEvents: CalendarEvent[]; profiles: ProfileOption[]; initialParticipants: Record<string, string[]> }) {
  const [events, setEvents] = useState(initialEvents);
  const [participants, setParticipants] = useState(initialParticipants);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState<string[]>([]);
  const [openProvidences, setOpenProvidences] = useState<string | null>(null);
  const [openMilitary, setOpenMilitary] = useState<string | null>(null);
  const [customProvidence, setCustomProvidence] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => setEvents(initialEvents), [initialEvents]);
  useEffect(() => setParticipants(initialParticipants), [initialParticipants]);

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

  function addCustomProvidence(event: CalendarEvent) {
    const label = (customProvidence[event.id] || "").trim();
    if (!label) return;
    const details = parseWorkNotes(event.notes);
    if (!details.providences.some((item) => item.toLocaleLowerCase("pt-BR") === label.toLocaleLowerCase("pt-BR"))) {
      void savePatch(event.id, { notes: composeWorkNotes({ ...details, providences: [...details.providences, label] }) });
    }
    setCustomProvidence((current) => ({ ...current, [event.id]: "" }));
  }

  async function toggleParticipant(event: CalendarEvent, profileId: string) {
    const currentIds = participants[event.id] || [];
    const selected = currentIds.includes(profileId);
    const nextIds = selected ? currentIds.filter((id) => id !== profileId) : [...currentIds, profileId];
    setError("");
    setParticipants((current) => ({ ...current, [event.id]: nextIds }));
    const result = selected
      ? await supabase.from("event_participants").delete().eq("event_id", event.id).eq("profile_id", profileId)
      : await supabase.from("event_participants").insert({ event_id: event.id, profile_id: profileId });
    if (result.error) {
      setParticipants((current) => ({ ...current, [event.id]: currentIds }));
      setError(result.error.message || "Não foi possível atualizar os militares envolvidos.");
    }
  }

  async function deleteActivity(event: CalendarEvent) {
    const confirmed = window.confirm(`Excluir permanentemente a atividade “${event.title}”? Esta ação não poderá ser desfeita.`);
    if (!confirmed) return;
    setError("");
    setSaving((current) => [...current, event.id]);
    const { error: deleteError } = await supabase.from("events").delete().eq("id", event.id);
    if (deleteError) setError(deleteError.message || "Não foi possível excluir a atividade.");
    else {
      setEvents((current) => current.filter((item) => item.id !== event.id));
      setParticipants((current) => { const next = { ...current }; delete next[event.id]; return next; });
    }
    setSaving((current) => current.filter((item) => item !== event.id));
  }

  return <>
    {error && <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">{error}</div>}
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1280px] border-collapse text-left">
        <thead className="bg-emerald-950 text-[11px] uppercase tracking-wide text-emerald-50">
          <tr><th className="sticky left-0 z-10 w-[260px] min-w-[260px] bg-emerald-950 px-5 py-4">Atividade</th><th className="w-[150px] px-4 py-4">Missão</th><th className="w-[180px] px-4 py-4">Início</th><th className="w-[180px] px-4 py-4">Término</th><th className="w-[250px] px-4 py-4">Providências</th><th className="w-[250px] px-4 py-4">Militares envolvidos</th><th className="w-[135px] px-4 py-4">Situação</th><th className="w-20 px-3 py-4"><span className="sr-only">Ações</span></th></tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
          <tr className="bg-amber-50/60 dark:bg-emerald-950/35">
            <td className="sticky left-0 z-[2] bg-amber-50 px-5 py-3 dark:bg-emerald-950"><div className="flex items-center gap-2"><Plus size={16} className="shrink-0 text-emerald-800 dark:text-amber-300" /><input aria-label="Nova atividade" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onBlur={() => void createInlineEvent()} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} disabled={creating} placeholder="Clique e digite uma atividade" className={`${cellInput} font-semibold placeholder:text-emerald-800 dark:placeholder:text-amber-200`} />{creating && <LoaderCircle size={16} className="animate-spin text-emerald-800 dark:text-amber-300" />}</div></td>
            <td colSpan={7} className="px-4 py-3 text-xs text-slate-500 dark:text-slate-300">Digite a atividade primeiro. Uma nova linha será criada para você completar as demais colunas.</td>
          </tr>
          {events.length === 0 && !newTitle ? <tr><td colSpan={8} className="px-6 py-14 text-center text-sm text-slate-500">Nenhuma atividade neste período. Comece digitando na primeira linha.</td></tr> : events.map((event) => {
            const details = parseWorkNotes(event.notes);
            const providences = details.providences;
            const selectedIds = participants[event.id] || [];
            const selectedProfiles = profiles.filter((profile) => selectedIds.includes(profile.id));
            const isSaving = saving.includes(event.id);
            return <tr key={event.id} className="align-top bg-white dark:bg-slate-900">
              <td className="sticky left-0 z-[1] bg-white px-3 py-3 dark:bg-slate-900"><TextCell value={event.title} placeholder="Atividade" ariaLabel={`Atividade ${event.title}`} onCommit={(title) => { if (title.length >= 3) void savePatch(event.id, { title }); else setError("A atividade precisa ter pelo menos 3 caracteres."); }} /><p className="px-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500">{isSaving ? "Salvando..." : typeLabels[event.event_type]}</p></td>
              <td className="px-2 py-3"><TextCell value={event.responsible_unit} placeholder="Adicionar missão" ariaLabel={`Missão de ${event.title}`} onCommit={(responsible_unit) => void savePatch(event.id, { responsible_unit })} /></td>
              <td className="px-2 py-3"><input aria-label={`Início de ${event.title}`} type="datetime-local" value={localDateTime(event.starts_at)} onChange={(input) => saveStart(event, input.target.value)} className={cellInput} /></td>
              <td className="px-2 py-3"><input aria-label={`Término de ${event.title}`} type="datetime-local" value={localDateTime(event.ends_at)} onChange={(input) => saveEnd(event, input.target.value)} className={cellInput} /></td>
              <td className="relative px-2 py-3"><div className={`${cellInput} min-h-10`}><div className="flex flex-wrap items-center gap-1">{providences.map((item) => <span key={item} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-900 dark:bg-amber-300/20 dark:text-amber-200">{item}<button type="button" onClick={() => updateProvidence(event, item)} aria-label={`Remover ${item}`} className="rounded-full"><X size={11} /></button></span>)}<button type="button" onClick={() => setOpenProvidences((current) => current === event.id ? null : event.id)} className="grid size-6 place-items-center rounded-full border border-dashed border-emerald-700 text-emerald-800 dark:border-amber-300 dark:text-amber-300" aria-label="Adicionar providência"><Plus size={13} /></button></div></div>{openProvidences === event.id && <div className="mt-2 rounded-xl border bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800"><div className="flex flex-wrap gap-1.5">{communicationFronts.map((front) => { const selected = details.providences.includes(front.label); return <button type="button" key={front.label} onClick={() => updateProvidence(event, front.label)} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${selected ? "border-emerald-900 bg-emerald-950 text-white dark:border-amber-300 dark:bg-amber-300 dark:text-emerald-950" : "bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"}`}>{selected && <Check size={10} />}{front.label}</button>; })}</div><div className="mt-2 flex gap-2"><input value={customProvidence[event.id] || ""} onChange={(input) => setCustomProvidence((current) => ({ ...current, [event.id]: input.target.value }))} onKeyDown={(input) => { if (input.key === "Enter") { input.preventDefault(); addCustomProvidence(event); } }} placeholder="Outra providência" className={`${cellInput} border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900`} /><button type="button" onClick={() => addCustomProvidence(event)} className="rounded-lg bg-emerald-950 px-3 text-xs font-bold text-white dark:bg-amber-300 dark:text-emerald-950">Adicionar</button></div></div>}</td>
              <td className="relative px-2 py-3"><button type="button" onClick={() => setOpenMilitary((current) => current === event.id ? null : event.id)} className={`${cellInput} min-h-10 text-left`}><span className="flex flex-wrap gap-1">{selectedProfiles.length ? selectedProfiles.map((profile) => <span key={profile.id} className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">{profileDisplayName(profile)}</span>) : details.military ? <span className="text-xs text-slate-500 dark:text-slate-300">{details.military}</span> : <span className="text-slate-400 dark:text-slate-500">Selecionar militares...</span>}</span></button>{openMilitary === event.id && <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800">{profiles.map((profile) => { const selected = selectedIds.includes(profile.id); return <button type="button" key={profile.id} onClick={() => void toggleParticipant(event, profile.id)} className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold ${selected ? "border-emerald-800 bg-emerald-950 text-white dark:border-amber-300 dark:bg-amber-300 dark:text-emerald-950" : "border-transparent bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}><span>{profileDisplayName(profile)}</span>{selected && <Check size={14} />}</button>; })}</div>}</td>
              <td className="px-2 py-3"><select aria-label={`Situação de ${event.title}`} value={event.status} onChange={(input) => void savePatch(event.id, { status: input.target.value as EventStatus })} className={`${cellInput} font-bold ${statusTones[event.status]}`}><option value="planejado">Planejada</option><option value="confirmado">Confirmada</option><option value="concluido">Realizada</option><option value="cancelado">Cancelada</option></select><p className="mt-1 px-2 text-[10px] text-slate-400 dark:text-slate-500">{statusLabels[event.status]}</p></td>
              <td className="px-2 py-4"><div className="flex items-center gap-1"><Link href={`/dashboard/agenda/${event.id}`} aria-label={`Abrir detalhes de ${event.title}`} className="grid size-8 place-items-center rounded-lg text-slate-400 transition focus:bg-amber-50 focus:text-emerald-800 focus:outline-none dark:text-slate-500 dark:focus:bg-emerald-950 dark:focus:text-amber-300"><ChevronRight size={17} /></Link><button type="button" onClick={() => void deleteActivity(event)} aria-label={`Excluir ${event.title}`} className="grid size-8 place-items-center rounded-lg text-slate-400 transition focus:bg-red-50 focus:text-red-700 focus:outline-none dark:text-slate-500 dark:focus:bg-red-950/50 dark:focus:text-red-300"><Trash2 size={15} /></button></div></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  </>;
}
