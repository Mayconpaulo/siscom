"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CakeSlice, CheckCircle2, Download, FileUp, Images, LoaderCircle, Package, UploadCloud, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { birthdayCardLabels, birthdayCardTypes, monthNames, type BirthdayCardType, type BirthdayPerson } from "@/lib/birthday-cards";
import { birthdayCardsZip, downloadBirthdayCard, downloadBlob, renderBirthdayCard } from "@/lib/birthday-card-canvas";
import { readApiResponse } from "@/lib/api-response";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 15 }, (_, index) => currentYear + index);
const emptyPerson: BirthdayPerson = { id: "individual", rank: "", qualification: "", fullName: "", day: 1, month: new Date().getMonth() + 1, year: currentYear, type: "normal" };

function TypeSelector({ value, onChange }: { value: BirthdayCardType; onChange: (value: BirthdayCardType) => void }) {
  return <div className="grid gap-2 sm:grid-cols-3">{birthdayCardTypes.map((type) => <button key={type} type="button" onClick={() => onChange(type)} className={`rounded-xl border px-3 py-3 text-left transition ${value === type ? "border-emerald-800 bg-emerald-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-700/40"}`}><span className="block text-xs font-bold uppercase tracking-wide">{type === "normal" ? "Normal" : type === "commander" ? "Comandante" : "Adjunto"}</span><span className={`mt-1 block text-[11px] ${value === type ? "text-emerald-100/70" : "text-slate-400"}`}>{birthdayCardLabels[type]}</span></button>)}</div>;
}

function Preview({ person }: { person: BirthdayPerson }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!canvasRef.current) return;
    renderBirthdayCard(person, canvasRef.current).then(() => setError("")).catch((reason) => setError(reason instanceof Error ? reason.message : "Falha na prévia."));
  }, [person]);
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner"><canvas ref={canvasRef} width={1600} height={1135} className="block aspect-[1600/1135] w-full" />{error && <p className="p-3 text-sm text-red-700">{error}</p>}</div>;
}

function DateFields({ person, update }: { person: BirthdayPerson; update: (values: Partial<BirthdayPerson>) => void }) {
  return <div className="grid grid-cols-[.65fr_1.35fr_1fr] gap-3">
    <label className="text-sm font-semibold text-slate-700">Dia<Input type="number" min={1} max={31} value={person.day} onChange={(event) => update({ day: Math.min(31, Math.max(1, Number(event.target.value))) })} className="mt-1.5 h-11" /></label>
    <label className="text-sm font-semibold text-slate-700">Mês<select value={person.month} onChange={(event) => update({ month: Number(event.target.value) })} className="mt-1.5 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">{monthNames.map((month, index) => <option key={month} value={index + 1}>{month[0].toUpperCase() + month.slice(1)}</option>)}</select></label>
    <label className="text-sm font-semibold text-slate-700">Ano<select value={person.year} onChange={(event) => update({ year: Number(event.target.value) })} className="mt-1.5 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">{years.map((year) => <option key={year}>{year}</option>)}</select></label>
  </div>;
}

export function BirthdayCardGenerator() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"individual" | "batch">("individual");
  const [person, setPerson] = useState<BirthdayPerson>(emptyPerson);
  const [people, setPeople] = useState<BirthdayPerson[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const selected = people.find((item) => item.id === selectedId) ?? people[0];
  const validIndividual = person.rank.trim() && person.fullName.trim() && person.day > 0;
  const batchMonth = selected?.month ?? new Date().getMonth() + 1;
  const batchYear = selected?.year ?? currentYear;

  const previewPerson = useMemo(() => mode === "individual" ? {
    ...person,
    rank: person.rank || "POSTO/GRAD",
    qualification: person.qualification || "",
    fullName: person.fullName || "NOME COMPLETO",
  } : selected, [mode, person, selected]);

  function updatePerson(values: Partial<BirthdayPerson>) { setPerson((current) => ({ ...current, ...values })); }
  function updateImported(id: string, values: Partial<BirthdayPerson>) { setPeople((current) => current.map((item) => item.id === id ? { ...item, ...values } : item)); }
  function updateAllDate(values: Partial<Pick<BirthdayPerson, "month" | "year">>) { setPeople((current) => current.map((item) => ({ ...item, ...values }))); }

  async function extract() {
    if (!file) return;
    setExtracting(true); setError("");
    try {
      const data = new FormData(); data.append("file", file);
      const response = await fetch("/api/cartoes-aniversario/extract", { method: "POST", body: data });
      const json = await readApiResponse<{ error?: string; people?: BirthdayPerson[] }>(response);
      if (!response.ok) throw new Error(json.error || "Não foi possível extrair o relatório.");
      if (!json.people?.length) throw new Error("Nenhum aniversariante foi encontrado no documento.");
      setPeople(json.people); setSelectedId(json.people[0]?.id ?? "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível enviar o PDF."); }
    finally { setExtracting(false); }
  }

  async function downloadOne(target: BirthdayPerson) {
    setDownloading(true); setError("");
    try { await downloadBirthdayCard(target); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível baixar o cartão."); }
    finally { setDownloading(false); }
  }

  async function downloadAll() {
    setDownloading(true); setProgress(0); setError("");
    try {
      const zip = await birthdayCardsZip(people, setProgress);
      downloadBlob(zip, `cartoes-aniversario-${monthNames[batchMonth - 1]}-${batchYear}.zip`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível gerar os cartões."); }
    finally { setDownloading(false); }
  }

  return <div>
    <div className="mb-6 grid grid-cols-2 rounded-2xl border bg-white p-1.5 shadow-sm sm:max-w-xl">
      <button type="button" onClick={() => setMode("individual")} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${mode === "individual" ? "bg-emerald-950 text-white shadow" : "text-slate-500"}`}><UserRound size={17} />Cartão individual</button>
      <button type="button" onClick={() => setMode("batch")} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${mode === "batch" ? "bg-emerald-950 text-white shadow" : "text-slate-500"}`}><Images size={17} />Gerar em lote</button>
    </div>

    {mode === "individual" ? <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Dados do cartão</p><h2 className="mt-1 text-xl font-bold text-slate-950">Aniversariante</h2>
        <div className="mt-5 space-y-4">
          <TypeSelector value={person.type} onChange={(type) => updatePerson({ type })} />
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Posto ou graduação<Input value={person.rank} onChange={(event) => updatePerson({ rank: event.target.value })} placeholder="Ex.: 3º SGT" className="mt-1.5 h-11 uppercase" /></label><label className="text-sm font-semibold text-slate-700">Qualificação<Input value={person.qualification} onChange={(event) => updatePerson({ qualification: event.target.value })} placeholder="Ex.: INF ou -" className="mt-1.5 h-11 uppercase" /></label></div>
          <label className="block text-sm font-semibold text-slate-700">Nome completo<Input value={person.fullName} onChange={(event) => updatePerson({ fullName: event.target.value })} placeholder="Nome completo do aniversariante" className="mt-1.5 h-11 uppercase" /></label>
          <DateFields person={person} update={updatePerson} />
        </div>
        {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <Button type="button" onClick={() => downloadOne(person)} disabled={!validIndividual || downloading} className="mt-5 h-11 w-full bg-emerald-950"><Download size={17} />{downloading ? "Gerando PNG..." : "Baixar cartão em PNG"}</Button>
      </section>
      <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Prévia</p><h2 className="mt-1 text-xl font-bold">1600 × 1135 pixels</h2></div><CheckCircle2 className="text-emerald-700" /></div>{previewPerson && <Preview person={previewPerson} />}</section>
    </div> : <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Relatório mensal</p><h2 className="mt-1 text-xl font-bold text-slate-950">Importar aniversariantes</h2><p className="mt-1 text-sm text-slate-500">Envie o PDF no padrão do relatório de aniversariantes do mês.</p></div><div className="flex flex-col gap-2 sm:flex-row"><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPeople([]); setError(""); }} /><Button type="button" variant="outline" onClick={() => inputRef.current?.click()}><FileUp size={17} />{file ? "Trocar PDF" : "Selecionar PDF"}</Button><Button type="button" onClick={extract} disabled={!file || extracting} className="bg-emerald-950">{extracting ? <LoaderCircle size={17} className="animate-spin" /> : <UploadCloud size={17} />}{extracting ? "Extraindo..." : "Extrair aniversariantes"}</Button></div></div>
        {file && <p className="mt-4 break-all rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">{file.name}</p>}{!file && !error && <p className="mt-4 rounded-xl border border-dashed bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">Nenhum relatório selecionado. Envie o PDF mensal para começar.</p>}{error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>

      {people.length > 0 && <><section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-emerald-700"><CheckCircle2 size={15} />{people.length} aniversariantes encontrados</p><h2 className="mt-1 text-xl font-bold">Confira antes de gerar</h2></div><div className="flex flex-wrap items-end gap-2"><label className="text-xs font-bold text-slate-600">Mês<select value={batchMonth} onChange={(event) => updateAllDate({ month: Number(event.target.value) })} className="mt-1 block h-10 rounded-md border bg-white px-3 text-sm font-normal">{monthNames.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label><label className="text-xs font-bold text-slate-600">Ano<select value={batchYear} onChange={(event) => updateAllDate({ year: Number(event.target.value) })} className="mt-1 block h-10 rounded-md border bg-white px-3 text-sm font-normal">{years.map((year) => <option key={year}>{year}</option>)}</select></label><Button type="button" onClick={downloadAll} disabled={downloading} className="h-10 bg-emerald-950"><Package size={17} />{downloading ? `Gerando ${progress}/${people.length}` : "Baixar todos em ZIP"}</Button></div></div>
        <div className="mt-5 max-h-[540px] overflow-auto rounded-xl border"><table className="w-full min-w-[880px] text-left text-sm"><thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3">Dia</th><th className="p-3">Posto/Grad.</th><th className="p-3">Qualificação</th><th className="p-3">Nome completo</th><th className="p-3">Modelo</th><th className="p-3"></th></tr></thead><tbody>{people.map((item) => <tr key={item.id} onClick={() => setSelectedId(item.id)} className={`border-t transition hover:bg-emerald-50/50 ${selected?.id === item.id ? "bg-emerald-50" : ""}`}><td className="p-2"><Input type="number" min={1} max={31} value={item.day} onChange={(event) => updateImported(item.id, { day: Number(event.target.value) })} className="h-9 w-16" /></td><td className="p-2"><Input value={item.rank} onChange={(event) => updateImported(item.id, { rank: event.target.value })} className="h-9 w-28" /></td><td className="p-2"><Input value={item.qualification} onChange={(event) => updateImported(item.id, { qualification: event.target.value })} className="h-9 w-28" /></td><td className="p-2"><Input value={item.fullName} onChange={(event) => updateImported(item.id, { fullName: event.target.value })} className="h-9 min-w-72" /></td><td className="p-2"><select value={item.type} onChange={(event) => updateImported(item.id, { type: event.target.value as BirthdayCardType })} className="h-9 rounded-md border bg-white px-2 text-xs">{birthdayCardTypes.map((type) => <option key={type} value={type}>{birthdayCardLabels[type]}</option>)}</select></td><td className="p-2"><button type="button" onClick={(event) => { event.stopPropagation(); downloadOne(item); }} className="grid size-9 place-items-center rounded-lg text-emerald-800 hover:bg-emerald-100" aria-label={`Baixar cartão de ${item.fullName}`}><Download size={16} /></button></td></tr>)}</tbody></table></div>
      </section>
      {selected && <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Cartão selecionado</p><h2 className="mt-1 text-lg font-bold">{selected.rank} {selected.fullName}</h2></div><Button type="button" variant="outline" onClick={() => downloadOne(selected)}><Download size={16} />Baixar este</Button></div><Preview person={selected} /></section>}</>}
    </div>}
  </div>;
}
