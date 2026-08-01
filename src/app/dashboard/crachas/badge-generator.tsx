"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, CopyPlus, FileUp, IdCard, LoaderCircle, Palette, Plus, Printer, Ruler, Trash2, Undo2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { readApiResponse } from "@/lib/api-response";
import { mapBadgeColumns, type BadgeColumnMapping } from "@/lib/badge-import";

type SideMode = "front" | "front-back";
type Identity = { id: string; name: string; identity: string; copies: number };
type Colors = { top: string; topStripe: string; bottomStripe: string; bottom: string };

const PAGE_WIDTH_MM = 190;
const PAGE_HEIGHT_MM = 277;
const PAGE_MARGIN_MM = 10;
const GAP_MM = 4;
const PREVIEW_SCALE = 2.45;

const initialIdentity: Identity = { id: "initial", name: "DIEGO AUGUSTO DE RESENDE", identity: "0405857970", copies: 1 };
const defaultColors: Colors = { top: "#08782b", topStripe: "#ffdf00", bottomStripe: "#ffdf00", bottom: "#08782b" };

function contrastColor(hex: string) {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 145 ? "#08120e" : "#ffffff";
}

function capacity(width: number, height: number, sides: SideMode) {
  const itemWidth = width * (sides === "front-back" ? 2 : 1);
  const columns = Math.max(0, Math.floor((PAGE_WIDTH_MM + GAP_MM) / (itemWidth + GAP_MM)));
  const rows = Math.max(0, Math.floor((PAGE_HEIGHT_MM + GAP_MM) / (height + GAP_MM)));
  return { columns, rows, maximum: columns * rows, itemWidth };
}

function chunks<T>(items: T[], size: number) {
  if (size < 1) return [];
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

function parseCentimeters(value: string) {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatCentimeters(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function BadgeFace({ width, height, topText, bottomText, identity, colors, scale, print, joined }: {
  width: number; height: number; topText: string; bottomText: string; identity: Identity; colors: Colors;
  scale: number; print?: boolean; joined?: boolean;
}) {
  const unit = (value: number) => print ? `${value}mm` : `${value * scale}px`;
  const headingSize = Math.max(2.6, Math.min(8.5, height * 0.105));
  const nameSize = Math.max(2.4, Math.min(5.2, Math.min(width * 0.047, height * 0.085)));
  const idSize = Math.max(2.2, Math.min(4.4, height * 0.071));
  return <div className="badge-face" style={{
    width: unit(width), height: unit(height),
    border: `${unit(0.35)} solid #111827`, borderRightWidth: joined ? 0 : unit(0.35),
    display: "grid", gridTemplateRows: "18% 4% 56% 4% 18%", overflow: "hidden", background: "#ffffff",
  }}>
    <div style={{ display: "grid", placeItems: "center", background: colors.top, color: contrastColor(colors.top), fontSize: unit(headingSize), fontWeight: 900, letterSpacing: unit(0.7), lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", padding: `0 ${unit(1.5)}` }}>{topText.toLocaleUpperCase("pt-BR")}</div>
    <div style={{ background: colors.topStripe }} />
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: unit(1.2), padding: `${unit(1.2)} ${unit(1.8)}`, color: "#0f172a" }}>
      <img src="/brasao-1-bimec.png" alt="" draggable={false} style={{ width: "17%", maxHeight: "82%", objectFit: "contain", flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1, textAlign: "center", textTransform: "uppercase" }}>
        <div style={{ fontSize: unit(nameSize), fontWeight: 900, lineHeight: 1.04, overflowWrap: "anywhere" }}>{identity.name || "NOME COMPLETO"}</div>
        <div style={{ marginTop: unit(1.1), fontSize: unit(idSize), fontWeight: 500, lineHeight: 1 }}>{identity.identity || "IDENTIDADE"}</div>
      </div>
      <img src="/brasao-1-bimec.png" alt="" draggable={false} style={{ width: "17%", maxHeight: "82%", objectFit: "contain", flexShrink: 0 }} />
    </div>
    <div style={{ background: colors.bottomStripe }} />
    <div style={{ display: "grid", placeItems: "center", background: colors.bottom, color: contrastColor(colors.bottom), fontSize: unit(headingSize), fontWeight: 900, letterSpacing: unit(0.55), lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", padding: `0 ${unit(1.5)}` }}>{bottomText.toLocaleUpperCase("pt-BR")}</div>
  </div>;
}

function BadgeItem({ width, height, sides, topText, bottomText, identity, colors, scale, print }: {
  width: number; height: number; sides: SideMode; topText: string; bottomText: string; identity: Identity; colors: Colors; scale: number; print?: boolean;
}) {
  return <div className="badge-print-item" style={{ display: "flex", flex: "0 0 auto" }}>
    <BadgeFace width={width} height={height} topText={topText} bottomText={bottomText} identity={identity} colors={colors} scale={scale} print={print} joined={sides === "front-back"} />
    {sides === "front-back" && <BadgeFace width={width} height={height} topText={topText} bottomText={bottomText} identity={identity} colors={colors} scale={scale} print={print} />}
  </div>;
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="flex items-center gap-3 rounded-xl border bg-card p-3"><input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="size-10 cursor-pointer rounded-lg border-0 bg-transparent p-0" /><span><span className="block text-xs font-semibold">{label}</span><span className="font-mono text-[11px] uppercase text-slate-500">{value}</span></span></label>;
}

export function BadgeGenerator() {
  const [widthText, setWidthText] = useState("8,5");
  const [heightText, setHeightText] = useState("5,2");
  const width = parseCentimeters(widthText) * 10;
  const height = parseCentimeters(heightText) * 10;
  const [topText, setTopText] = useState("11º BIMTH");
  const [bottomText, setBottomText] = useState("1º BIMEC (ES)");
  const [sides, setSides] = useState<SideMode>("front-back");
  const [colors, setColors] = useState<Colors>(defaultColors);
  const [identities, setIdentities] = useState<Identity[]>([initialIdentity]);
  const [previousIdentities, setPreviousIdentities] = useState<Identity[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [columnMapping, setColumnMapping] = useState<BadgeColumnMapping | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [nameColumn, setNameColumn] = useState(0);
  const [identityColumn, setIdentityColumn] = useState(1);
  const [previewPage, setPreviewPage] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const layout = useMemo(() => capacity(width, height, sides), [width, height, sides]);
  const [perPage, setPerPage] = useState(layout.maximum);

  useEffect(() => {
    setPerPage((current) => layout.maximum < 1 ? 0 : Math.max(1, Math.min(current || layout.maximum, layout.maximum)));
  }, [layout.maximum]);

  const badges = useMemo(() => identities.flatMap((identity) => Array.from({ length: Math.max(1, identity.copies) }, () => identity)), [identities]);
  const sheets = useMemo(() => chunks(badges, perPage), [badges, perPage]);
  const previewBadges = sheets[previewPage] ?? [];

  useEffect(() => {
    setPreviewPage((current) => Math.max(0, Math.min(current, Math.max(0, sheets.length - 1))));
  }, [sheets.length]);

  function changeIdentity(id: string, values: Partial<Identity>) {
    setIdentities((current) => current.map((identity) => identity.id === id ? { ...identity, ...values } : identity));
  }

  function addIdentity() {
    setIdentities((current) => [...current, { id: crypto.randomUUID(), name: "", identity: "", copies: 1 }]);
  }

  function removeIdentity(id: string) {
    setIdentities((current) => current.length === 1 ? current : current.filter((identity) => identity.id !== id));
  }

  function applyPreset(nextWidth: number, nextHeight: number) {
    setWidthText(formatCentimeters(nextWidth)); setHeightText(formatCentimeters(nextHeight));
  }

  function finishImport(values: Array<{ name: string; identity: string }>, fileName: string, limited = false) {
    const imported = values.map((identity) => ({ ...identity, id: crypto.randomUUID(), copies: 1 }));
    setPreviousIdentities(identities);
    setIdentities(imported);
    setPreviewPage(0);
    setColumnMapping(null);
    setImportMessage(`${imported.length} pessoa(s) importada(s) de “${fileName}”. Revise os dados abaixo antes de imprimir.${limited ? " Foram importados os primeiros 500 registros." : ""}`);
  }

  function applyColumnMapping() {
    if (!columnMapping) return;
    setImportError("");
    if (nameColumn === identityColumn) {
      setImportError("Escolha colunas diferentes para o nome e para a identidade/CPF.");
      return;
    }
    const mapped = mapBadgeColumns(columnMapping.rows, nameColumn, identityColumn);
    if (!mapped.length) {
      setImportError("Não encontrei registros preenchidos nessas colunas. Confira a prévia e escolha outras opções.");
      return;
    }
    finishImport(mapped, importFileName, mapped.length === 500);
  }

  async function importDocument(file: File) {
    setImporting(true);
    setImportError("");
    setImportMessage("");
    setColumnMapping(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/crachas/extract", { method: "POST", body: formData });
      const result = await readApiResponse<{ error?: string; identities?: Array<{ name: string; identity: string }>; mapping?: BadgeColumnMapping | null; limited?: boolean }>(response);
      if (!response.ok) throw new Error(result.error || "Não foi possível importar o documento.");
      if (result.mapping?.columns.length) {
        setColumnMapping(result.mapping);
        setImportFileName(file.name);
        setNameColumn(result.mapping.suggestedNameIndex);
        setIdentityColumn(result.mapping.suggestedIdentityIndex);
        setImportMessage("Documento lido. Escolha abaixo quais informações serão usadas no crachá.");
      } else if (result.identities?.length) {
        finishImport(result.identities, file.name, result.limited);
      } else throw new Error(result.error || "Não encontrei informações que possam ser importadas.");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Não foi possível importar o documento.");
    } finally {
      setImporting(false);
    }
  }

  function undoImport() {
    if (!previousIdentities) return;
    setIdentities(previousIdentities);
    setPreviousIdentities(null);
    setImportMessage("");
    setPreviewPage(0);
  }

  return <div className="min-h-dvh bg-slate-50 p-5 pt-20 sm:p-8 lg:pt-8"><div className="mx-auto max-w-[1500px]">
    <header className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700 dark:text-amber-300">Produção gráfica</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Crachás</h1><p className="mt-1 text-sm text-slate-500">Monte, distribua em folhas A4 e imprima crachás no padrão institucional.</p></div><Button onClick={() => window.print()} disabled={layout.maximum < 1 || badges.length < 1}><Printer size={17} />Imprimir / salvar em PDF</Button></header>

    <div className="grid items-start gap-6 xl:grid-cols-[480px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card className="p-5"><div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-950 text-amber-300"><Ruler size={19} /></span><div><h2 className="font-bold">Formato</h2><p className="text-xs text-slate-500">Medidas físicas em centímetros, com vírgula decimal.</p></div></div>
          <div className="mb-4 grid grid-cols-2 gap-2"><Button type="button" variant="outline" size="sm" onClick={() => applyPreset(8.5, 5.2)}>Militar · 8,5 × 5,2 cm</Button><Button type="button" variant="outline" size="sm" onClick={() => applyPreset(9.5, 6.8)}>Obra · 9,5 × 6,8 cm</Button></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Largura (cm)<Input type="text" inputMode="decimal" value={widthText} onChange={(event) => setWidthText(event.target.value.replace(/[^0-9,.]/g, ""))} onBlur={() => width > 0 && setWidthText(formatCentimeters(width / 10))} placeholder="8,5" className="mt-1.5" /></label><label className="text-sm font-semibold">Altura (cm)<Input type="text" inputMode="decimal" value={heightText} onChange={(event) => setHeightText(event.target.value.replace(/[^0-9,.]/g, ""))} onBlur={() => height > 0 && setHeightText(formatCentimeters(height / 10))} placeholder="5,2" className="mt-1.5" /></label></div>
          <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setSides("front")} className={cn("rounded-xl border p-3 text-left text-sm transition", sides === "front" && "border-emerald-700 bg-emerald-50 dark:border-amber-300 dark:bg-amber-300/10")}><span className="block font-bold">Somente frente</span><span className="text-xs text-slate-500">Uma face por crachá</span></button><button type="button" onClick={() => setSides("front-back")} className={cn("rounded-xl border p-3 text-left text-sm transition", sides === "front-back" && "border-emerald-700 bg-emerald-50 dark:border-amber-300 dark:bg-amber-300/10")}><span className="block font-bold">Frente e verso</span><span className="text-xs text-slate-500">Faces coladas para dobrar</span></button></div>
          <div className={cn("mt-4 rounded-xl border p-3 text-sm", layout.maximum > 0 ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100" : "border-red-200 bg-red-50 text-red-700")}><strong>{layout.maximum > 0 ? `Limite calculado: ${layout.maximum} por página` : "Este tamanho não cabe em uma folha A4."}</strong>{layout.maximum > 0 && <span className="mt-1 block text-xs">Grade máxima: {layout.columns} coluna(s) × {layout.rows} linha(s).</span>}</div>
          {layout.maximum > 0 && <label className="mt-4 block text-sm font-semibold">Crachás por página<Input type="number" min={1} max={layout.maximum} value={perPage} onChange={(event) => setPerPage(Math.max(1, Math.min(layout.maximum, Number(event.target.value))))} className="mt-1.5" /><span className="mt-1.5 block text-xs font-normal text-slate-500">O valor nunca ultrapassa o limite calculado.</span></label>}
        </Card>

        <Card className="p-5"><div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-950 text-amber-300"><IdCard size={19} /></span><div><h2 className="font-bold">Textos fixos</h2><p className="text-xs text-slate-500">Aplicados a todos os crachás.</p></div></div><div className="space-y-4"><label className="text-sm font-semibold">Parte superior<Input value={topText} onChange={(event) => setTopText(event.target.value)} maxLength={40} className="mt-1.5" /></label><label className="text-sm font-semibold">Parte inferior<Input value={bottomText} onChange={(event) => setBottomText(event.target.value)} maxLength={40} className="mt-1.5" /></label></div></Card>

        <Card className="p-5"><div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-950 text-amber-300"><Palette size={19} /></span><div><h2 className="font-bold">Cores das faixas</h2><p className="text-xs text-slate-500">Cada faixa pode ter uma cor própria.</p></div></div><div className="grid gap-3 sm:grid-cols-2"><ColorControl label="Faixa superior" value={colors.top} onChange={(top) => setColors({ ...colors, top })} /><ColorControl label="Filete superior" value={colors.topStripe} onChange={(topStripe) => setColors({ ...colors, topStripe })} /><ColorControl label="Filete inferior" value={colors.bottomStripe} onChange={(bottomStripe) => setColors({ ...colors, bottomStripe })} /><ColorControl label="Faixa inferior" value={colors.bottom} onChange={(bottom) => setColors({ ...colors, bottom })} /></div><Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setColors(defaultColors)}>Restaurar cores institucionais</Button></Card>

        <Card className="p-5"><div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-950 text-amber-300"><FileUp size={19} /></span><div><h2 className="font-bold">Importar relação</h2><p className="text-xs text-slate-500">Extraia nomes e documentos de uma lista pronta.</p></div></div>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.xlsx,.csv,.txt" className="hidden" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void importDocument(file); }} />
          <button type="button" disabled={importing} onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-emerald-700/40 bg-emerald-50/60 px-4 py-7 text-center text-sm font-bold text-emerald-950 transition hover:border-emerald-700 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60 dark:border-amber-300/40 dark:bg-amber-300/5 dark:text-amber-200 dark:hover:border-amber-300 dark:hover:bg-amber-300/10">{importing ? <LoaderCircle className="animate-spin" size={20} /> : <FileUp size={20} />}{importing ? "Lendo documento..." : "Selecionar documento"}</button>
          <p className="mt-3 text-center text-xs leading-5 text-slate-500">PDF com texto, Word (.docx), Excel (.xlsx), CSV ou TXT · até 15 MB</p>
          {columnMapping && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <h3 className="text-sm font-bold text-emerald-950">Escolha onde usar cada informação</h3>
            <p className="mt-1 text-xs leading-5 text-emerald-900/70">Exemplo: selecione “Militar” para preencher o nome completo do crachá.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">Usar como nome completo<select value={nameColumn} onChange={(event) => setNameColumn(Number(event.target.value))} className="mt-1.5 h-10 w-full rounded-md border bg-white px-3 text-sm font-normal">{columnMapping.columns.map((column) => <option key={column.index} value={column.index}>{column.label}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-700">Usar como identidade/CPF<select value={identityColumn} onChange={(event) => setIdentityColumn(Number(event.target.value))} className="mt-1.5 h-10 w-full rounded-md border bg-white px-3 text-sm font-normal">{columnMapping.columns.map((column) => <option key={column.index} value={column.index}>{column.label}</option>)}</select></label>
            </div>
            <div className="mt-4 overflow-auto rounded-lg border bg-white"><table className="w-full min-w-[520px] text-left text-xs"><thead className="bg-slate-100 text-slate-500"><tr>{columnMapping.columns.map((column) => <th key={column.index} className="p-2 font-bold">{column.label}</th>)}</tr></thead><tbody>{columnMapping.rows.slice(0, 5).map((row, rowIndex) => <tr key={rowIndex} className="border-t">{columnMapping.columns.map((column) => <td key={column.index} className="max-w-52 truncate p-2">{row[column.index] || "—"}</td>)}</tr>)}</tbody></table></div>
            <p className="mt-2 text-[11px] text-slate-500">Prévia dos primeiros {Math.min(5, columnMapping.rows.length)} registros encontrados.</p>
            <Button type="button" onClick={applyColumnMapping} className="mt-4 w-full bg-emerald-950"><CheckCircle2 size={16} />Aplicar aos crachás</Button>
          </div>}
          <div aria-live="polite">{importError && <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"><AlertCircle className="mt-0.5 shrink-0" size={17} /><span>{importError}</span></div>}{importMessage && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"><div className="flex gap-2"><CheckCircle2 className="mt-0.5 shrink-0" size={17} /><span>{importMessage}{!columnMapping && <strong className="mt-1 block">{badges.length} crachá(s) distribuído(s) em {Math.max(1, sheets.length)} página(s).</strong>}</span></div>{previousIdentities && !columnMapping && <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={undoImport}><Undo2 size={15} />Desfazer importação</Button>}</div>}</div>
        </Card>

        <Card className="p-5"><div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-950 text-amber-300"><UsersRound size={19} /></span><div><h2 className="font-bold">Identificações</h2><p className="text-xs text-slate-500">Revise nome, identidade/CPF e quantidade de cópias.</p></div></div><Button type="button" size="sm" variant="outline" onClick={addIdentity}><Plus size={15} />Adicionar</Button></div><div className="space-y-4">{identities.map((identity, index) => <div key={identity.id} className="rounded-xl border bg-muted/30 p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Identificação {index + 1}</p><button type="button" onClick={() => removeIdentity(identity.id)} disabled={identities.length === 1} className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-30" aria-label={`Remover identificação ${index + 1}`}><Trash2 size={16} /></button></div><div className="space-y-3"><label className="text-xs font-semibold">Nome completo<Input value={identity.name} onChange={(event) => changeIdentity(identity.id, { name: event.target.value })} maxLength={100} className="mt-1" /></label><div className="grid gap-3 sm:grid-cols-[1fr_110px]"><label className="text-xs font-semibold">Identidade ou CPF<Input value={identity.identity} onChange={(event) => changeIdentity(identity.id, { identity: event.target.value })} maxLength={30} className="mt-1" /></label><label className="text-xs font-semibold">Cópias<Input type="number" min={1} max={99} value={identity.copies} onChange={(event) => changeIdentity(identity.id, { copies: Math.max(1, Math.min(99, Number(event.target.value))) })} className="mt-1" /></label></div></div></div>)}</div><Button type="button" variant="outline" className="mt-4 w-full" onClick={addIdentity}><CopyPlus size={16} />Nova identificação</Button></Card>
      </div>

      <Card className="sticky top-5 overflow-hidden"><div className="flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center"><div><h2 className="font-bold">Pré-visualização da página {previewPage + 1}</h2><p className="text-xs text-slate-500">{badges.length} crachá(s) em {Math.max(1, sheets.length)} página(s) · folha A4</p></div><div className="flex items-center gap-2"><Button type="button" variant="outline" size="icon" disabled={previewPage === 0} onClick={() => setPreviewPage((page) => Math.max(0, page - 1))} aria-label="Página anterior"><ChevronLeft size={17} /></Button><span className="min-w-20 text-center text-xs font-bold">{previewPage + 1} de {Math.max(1, sheets.length)}</span><Button type="button" variant="outline" size="icon" disabled={previewPage >= sheets.length - 1} onClick={() => setPreviewPage((page) => Math.min(sheets.length - 1, page + 1))} aria-label="Próxima página"><ChevronRight size={17} /></Button></div></div><div className="overflow-auto bg-slate-200/70 p-5 dark:bg-slate-950"><div className="mx-auto bg-white shadow-xl" style={{ width: 210 * PREVIEW_SCALE, minHeight: 297 * PREVIEW_SCALE, padding: PAGE_MARGIN_MM * PREVIEW_SCALE, display: "flex", alignContent: "flex-start", alignItems: "flex-start", flexWrap: "wrap", gap: GAP_MM * PREVIEW_SCALE, boxSizing: "border-box" }}>{layout.maximum < 1 ? <div className="grid size-full min-h-96 place-items-center text-center text-sm text-red-700">Reduza as medidas para visualizar o crachá na folha.</div> : previewBadges.map((identity, index) => <BadgeItem key={`${identity.id}-${previewPage}-${index}`} width={width} height={height} sides={sides} topText={topText} bottomText={bottomText} identity={identity} colors={colors} scale={PREVIEW_SCALE} />)}</div></div><div className="border-t p-4 text-xs leading-5 text-slate-500">Use as setas para conferir todas as páginas. O brasão original é apenas redimensionado, sem recorte ou alteração. Para as cores saírem corretamente, habilite “gráficos de fundo” na janela de impressão.</div></Card>
    </div>

    <div className="badge-print-root" aria-hidden="true">{sheets.map((sheet, sheetIndex) => <div className="badge-print-sheet" key={sheetIndex}>{sheet.map((identity, index) => <BadgeItem key={`${identity.id}-${index}`} width={width} height={height} sides={sides} topText={topText} bottomText={bottomText} identity={identity} colors={colors} scale={1} print />)}</div>)}</div>
  </div></div>;
}
