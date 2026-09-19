"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, LoaderCircle, RotateCcw, UploadCloud, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readApiResponse } from "@/lib/api-response";

type Fields = { recipient: string; date: string; text: string };
const emptyFields: Fields = { recipient: "", date: "", text: "" };

export function ReferenceGenerator() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [extracted, setExtracted] = useState(false);

  async function extract() {
    if (!file) { setError("Selecione um documento Word."); return; }
    setError(""); setExtracting(true);
    try {
      const formData = new FormData(); formData.append("file", file);
      const response = await fetch("/api/referencia-elogiosa/extract", { method: "POST", body: formData });
      const json = await readApiResponse<{ error?: string; fields?: Fields }>(response);
      if (!response.ok || !json.fields) setError(json.error || "Não encontrei informações no documento."); else { setFields(json.fields); setExtracted(true); }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível enviar o documento. Verifique sua conexão e tente novamente.");
    } finally {
      setExtracting(false);
    }
  }

  async function generate() {
    setError(""); setGenerating(true);
    try {
      const response = await fetch("/api/referencia-elogiosa/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) });
      if (!response.ok) { const json = await readApiResponse<{ error?: string }>(response); setError(json.error || "Não foi possível gerar o documento."); return; }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "referencia-elogiosa.docx";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Não foi possível gerar o documento. Verifique sua conexão e tente novamente.");
    } finally {
      setGenerating(false);
    }
  }

  function reset() {
    setFile(null); setFields(emptyFields); setExtracted(false); setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
    <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Etapa 1</p><h2 className="mt-1 text-xl font-bold text-slate-950">Enviar documento</h2><p className="mt-1 text-sm leading-6 text-slate-500">O arquivo deve conter o destinatário, o texto do elogio e a data.</p></div>
      <input ref={inputRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(event) => { const selected = event.target.files?.[0] || null; setFile(selected); setExtracted(false); setError(""); }} />
      <button type="button" onClick={() => inputRef.current?.click()} className="group flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 px-5 text-center transition hover:border-emerald-700/40 hover:bg-emerald-50/50">
        <span className="grid size-14 place-items-center rounded-2xl bg-emerald-950 text-amber-300 shadow-md transition group-hover:-translate-y-0.5"><UploadCloud size={25} /></span>
        {file ? <><p className="mt-4 max-w-full truncate text-sm font-bold text-slate-800">{file.name}</p><p className="mt-1 text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB • Clique para substituir</p></> : <><p className="mt-4 text-sm font-bold text-slate-800">Selecionar documento Word</p><p className="mt-1 text-xs text-slate-400">Formato DOCX • máximo de 10 MB</p></>}
      </button>
      <Button type="button" onClick={extract} disabled={!file || extracting} className="mt-4 h-11 w-full bg-emerald-950">{extracting ? <LoaderCircle size={17} className="animate-spin" /> : <WandSparkles size={17} />}{extracting ? "Extraindo informações..." : "Extrair informações"}</Button>
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Importante:</strong> confira todos os campos antes de gerar. A extração automática pode exigir pequenos ajustes.</div>
    </section>

    <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Etapa 2</p><h2 className="mt-1 text-xl font-bold text-slate-950">Revisar e gerar</h2><p className="mt-1 text-sm text-slate-500">Você pode corrigir qualquer informação extraída.</p></div>{extracted && <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800"><CheckCircle2 size={13} />EXTRAÍDO</span>}</div>
      <div className="space-y-4">
        {!extracted && !fields.recipient && !fields.date && !fields.text && <div className="rounded-xl border border-dashed bg-slate-50 px-4 py-5 text-center text-sm leading-6 text-slate-500">Os dados extraídos aparecerão aqui. Você também pode preencher os campos manualmente.</div>}
        <div><label className="mb-1.5 block text-sm font-semibold text-slate-700" htmlFor="recipient">Destinatário</label><Input id="recipient" value={fields.recipient} onChange={(event) => setFields({ ...fields, recipient: event.target.value })} placeholder="Ex.: 1º TEN INF NOME COMPLETO" className="h-11" /></div>
        <div><label className="mb-1.5 block text-sm font-semibold text-slate-700" htmlFor="reference-date">Data</label><Input id="reference-date" value={fields.date} onChange={(event) => setFields({ ...fields, date: event.target.value })} placeholder="Ex.: Rio de Janeiro, 08 de janeiro de 2026." className="h-11" /></div>
        <div><label className="mb-1.5 block text-sm font-semibold text-slate-700" htmlFor="reference-text">Texto da referência</label><textarea id="reference-text" value={fields.text} onChange={(event) => setFields({ ...fields, text: event.target.value })} placeholder="O texto extraído aparecerá aqui para revisão." className="min-h-72 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" /></div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={reset} className="w-full sm:w-auto"><RotateCcw size={16} />Limpar</Button><Button type="button" onClick={generate} disabled={generating || !fields.recipient || !fields.date || fields.text.length < 30} className="w-full bg-emerald-950 sm:w-auto">{generating ? <LoaderCircle size={17} className="animate-spin" /> : <Download size={17} />}{generating ? "Gerando Word..." : "Gerar Referência Elogiosa"}</Button></div>
    </section>
  </div>;
}
