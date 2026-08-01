"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, BookOpen, Bot, CircleHelp, ExternalLink, FileCheck2, LoaderCircle, RotateCcw, Send, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Document = { id: string; title: string; pages: number };
type Source = { source: string; page: number; url: string };
type Position = { order: number; label: string; subtitle: string; highlight: boolean };
type Diagram = { kind: "line"; title: string; perspective: string; positions: Position[] };
type Message = { id: string; role: "user" | "assistant"; content: string; followUpQuestion?: string; diagram?: Diagram | null; sources?: Source[] };

const examples = [
  "Tenho um general, um coronel e um major. Mostre como posicioná-los no palanque.",
  "Tenho cinco militares no palanque. Mostre a ordem por antiguidade.",
  "Por qual lado a Bandeira Nacional entra na cerimônia?",
];

function PositionDiagram({ diagram }: { diagram: Diagram }) {
  return <div className="mt-4 overflow-hidden rounded-xl border border-emerald-900/10 bg-slate-50">
    <div className="border-b bg-emerald-950 px-4 py-3 text-white"><p className="text-sm font-bold">{diagram.title || "Dispositivo sugerido"}</p><p className="mt-0.5 text-[10px] text-emerald-100/65">{diagram.perspective}</p></div>
    <div className="overflow-x-auto p-4"><div className="mx-auto flex min-w-max items-end justify-center gap-2 sm:gap-3">{diagram.positions.map((position, index) => <div key={`${position.order}-${position.label}-${index}`} className={`relative w-28 rounded-xl border-2 p-3 text-center shadow-sm sm:w-32 ${position.highlight ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <span className={`mx-auto mb-2 grid size-7 place-items-center rounded-full text-[11px] font-black ${position.highlight ? "bg-amber-300 text-emerald-950" : "bg-emerald-950 text-white"}`}>{position.order}º</span>
      <p className="line-clamp-2 text-xs font-bold text-slate-800">{position.label}</p><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{position.subtitle}</p>{position.highlight && <span className="mt-2 inline-block rounded-full bg-amber-200 px-2 py-0.5 text-[9px] font-bold text-amber-900">LUGAR DE HONRA</span>}
    </div>)}</div>
      <div className="mx-auto mt-6 flex max-w-2xl items-center gap-3 text-emerald-900"><span className="h-px flex-1 bg-emerald-800/30" /><span className="flex items-center gap-1.5 text-[10px] font-black tracking-[0.18em]"><ArrowUp size={14} />FRENTE DO PALANQUE</span><span className="h-px flex-1 bg-emerald-800/30" /></div>
    </div>
  </div>;
}

export function AssistantChat({ documents }: { documents: Document[] }) {
  const welcome: Message = { id: "welcome", role: "assistant", content: "Descreva a situação. Eu direi como fazer e, quando houver posicionamento, mostrarei o desenho." };
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function ask(event?: FormEvent, suggestion?: string) {
    event?.preventDefault();
    const text = (suggestion || question).trim();
    if (text.length < 3 || loading) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages); setQuestion(""); setError(""); setLoading(true);
    try {
      const history = messages.filter((message) => message.id !== "welcome").map(({ role, content, followUpQuestion }) => ({ role, content: [content, followUpQuestion].filter(Boolean).join("\n") }));
      const response = await fetch("/api/assistente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, history }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível obter a resposta.");
      setMessages([...nextMessages, { id: crypto.randomUUID(), role: "assistant", content: data.answer, followUpQuestion: data.followUpQuestion, diagram: data.diagram, sources: data.sources }]);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível obter a resposta."); }
    finally { setLoading(false); }
  }

  function clearChat() { setMessages([{ ...welcome, id: crypto.randomUUID() }]); setError(""); }

  return <div className="min-h-dvh bg-slate-100 p-4 pt-20 sm:p-6 lg:p-8"><div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
    <section className="flex min-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
      <header className="flex items-center justify-between gap-4 border-b bg-emerald-950 px-5 py-4 text-white sm:px-6"><div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-300 text-emerald-950"><Bot size={23} /></span><div><h1 className="font-bold sm:text-lg">Assistente Militar</h1><p className="text-xs text-emerald-100/65">Orientação direta com base nos manuais oficiais</p></div></div><Button onClick={clearChat} variant="outline" className="shrink-0 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><RotateCcw size={15} /><span className="hidden sm:inline">Nova consulta</span></Button></header>
      <div className="flex-1 space-y-5 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(5,150,105,0.06),_transparent_34%)] p-4 sm:p-6">
        {messages.length === 1 && <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-bold text-amber-900"><Sparkles size={17} />Experimente</p><div className="mt-3 flex flex-wrap gap-2">{examples.map((example) => <button key={example} onClick={() => ask(undefined, example)} className="rounded-full border border-amber-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800">{example}</button>)}</div></div>}
        {messages.map((message) => <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}><span className={`mt-1 hidden size-8 shrink-0 place-items-center rounded-lg sm:grid ${message.role === "user" ? "order-2 bg-slate-200 text-slate-600" : "bg-emerald-950 text-amber-300"}`}>{message.role === "user" ? <UserRound size={16} /> : <Bot size={17} />}</span><div className={`max-w-3xl rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-tr-sm bg-emerald-950 text-white" : "w-full rounded-tl-sm border bg-white text-slate-700 shadow-sm"}`}>
          <p className="whitespace-pre-wrap font-medium">{message.content}</p>
          {message.followUpQuestion && <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950"><CircleHelp className="mt-0.5 shrink-0" size={18} /><div><p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Preciso saber</p><p className="mt-1 text-sm font-semibold">{message.followUpQuestion}</p></div></div>}
          {message.diagram && <PositionDiagram diagram={message.diagram} />}
          {message.role === "assistant" && message.sources && message.sources.length > 0 && <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">{message.sources.map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" title={source.source} className="inline-flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:border-emerald-700 hover:bg-emerald-50"><BookOpen size={15} />Abrir no manual · p. {source.page}<ExternalLink size={12} /></a>)}</div>}
        </div></article>)}
        {loading && <div className="flex items-center gap-3 text-sm text-slate-500"><span className="grid size-8 place-items-center rounded-lg bg-emerald-950 text-amber-300"><Bot size={17} /></span><span className="flex items-center gap-2 rounded-2xl border bg-white px-4 py-3"><LoaderCircle className="animate-spin" size={16} />Montando a orientação...</span></div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={ask} className="border-t bg-white p-4 sm:p-5">{error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex items-end gap-2 rounded-2xl border bg-slate-50 p-2 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-100"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(); } }} rows={2} maxLength={1500} placeholder="Informe a cerimônia, os nomes ou postos e o que precisa posicionar..." className="max-h-36 min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none" /><Button disabled={loading || question.trim().length < 3} className="size-11 shrink-0 bg-emerald-950 p-0" aria-label="Enviar pergunta"><Send size={18} /></Button></div><p className="mt-2 text-center text-[11px] text-slate-400">Quanto mais específico você for, mais preciso será o desenho.</p></form>
    </section>
    <aside className="space-y-5"><Card className="p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><ShieldCheck size={20} /></span><div><h2 className="text-sm font-bold">Modo operacional</h2><p className="text-xs text-slate-500">Resposta curta e aplicável</p></div></div><div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Se uma informação realmente mudar a orientação, o assistente fará uma pergunta objetiva antes de montar o dispositivo.</div></Card>
      <Card className="overflow-hidden"><div className="border-b p-5"><h2 className="flex items-center gap-2 text-sm font-bold"><FileCheck2 size={17} className="text-emerald-800" />Base documental</h2><p className="mt-1 text-xs text-slate-500">{documents.length} manuais · {documents.reduce((total, document) => total + document.pages, 0)} páginas</p></div><div className="max-h-[55dvh] overflow-y-auto">{documents.map((document) => <div key={document.id} className="border-b px-5 py-3 last:border-0"><p className="text-xs font-semibold leading-5 text-slate-700">{document.title}</p><p className="mt-0.5 text-[10px] text-slate-400">{document.pages} páginas</p></div>)}</div></Card>
    </aside>
  </div></div>;
}
