"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type FineTuning = { nameSize: number; roleSize: number; offsetX: number; offsetY: number; gap: number };
const defaults: FineTuning = { nameSize: 49, roleSize: 37, offsetX: 0, offsetY: 0, gap: 49 };

function fitText(context: CanvasRenderingContext2D, text: string, size: number, maxWidth: number, weight: number) {
  let fitted = size;
  while (fitted > 20) {
    context.font = `${weight} ${fitted}px Arial`;
    if (context.measureText(text).width <= maxWidth) break;
    fitted -= 1;
  }
  return fitted;
}

export function PrismaGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [quantity, setQuantity] = useState<1 | 2>(2);
  const [names, setNames] = useState(["CAP LUCAS MENDES", "CAP LUCAS MENDES"]);
  const [roles, setRoles] = useState(["CHEFE 3ª SEÇÃO", "CHEFE 3ª SEÇÃO"]);
  const [tuning, setTuning] = useState<FineTuning>(defaults);

  useEffect(() => {
    const image = new Image();
    image.src = "/prisma-template.png";
    image.onload = () => { imageRef.current = image; setReady(true); setTemplateError(""); };
    image.onerror = () => setTemplateError("Não foi possível carregar o modelo do prisma. Atualize a página e tente novamente.");
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const paperWidth = 936;
    const prismaHeight = Math.round(paperWidth * 693 / 1032);
    const paperX = Math.round((canvas.width - paperWidth) / 2);
    const writePrisma = (x: number, y: number, width: number, height: number, name: string, role: string) => {
      const scaleX = width / 1032;
      const scaleY = height / 693;
      context.drawImage(image, x, y, width, height);
      const centerX = x + 516 * scaleX + tuning.offsetX;
      const topY = y + 174 * scaleY + tuning.offsetY;
      const bottomY = y + 502 * scaleY + tuning.offsetY;
      const maxWidth = 610 * scaleX;
      const nameSize = fitText(context, name, tuning.nameSize, maxWidth, 700);
      const roleSize = fitText(context, role, tuning.roleSize, maxWidth, 400);
      context.fillStyle = "#000000";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.save();
      context.translate(centerX, topY);
      context.rotate(Math.PI);
      context.font = `700 ${nameSize}px Arial`;
      context.fillText(name, 0, 0);
      context.font = `400 ${roleSize}px Arial`;
      context.fillText(role, 0, tuning.gap);
      context.restore();
      context.font = `700 ${nameSize}px Arial`;
      context.fillText(name, centerX, bottomY);
      context.font = `400 ${roleSize}px Arial`;
      context.fillText(role, centerX, bottomY + tuning.gap);
    };

    if (quantity === 1) {
      writePrisma(paperX, Math.round((canvas.height - prismaHeight) / 2), paperWidth, prismaHeight, names[0], roles[0]);
    } else {
      const sheetGap = 0;
      const top = Math.round((canvas.height - prismaHeight * 2 - sheetGap) / 2);
      writePrisma(paperX, top, paperWidth, prismaHeight, names[0], roles[0]);
      writePrisma(paperX, top + prismaHeight + sheetGap, paperWidth, prismaHeight, names[1], roles[1]);
    }
  }, [names, quantity, roles, tuning]);

  useEffect(() => { if (ready) draw(); }, [draw, ready]);

  function changeText(kind: "name" | "role", index: number, value: string) {
    const setter = kind === "name" ? setNames : setRoles;
    const current = kind === "name" ? names : roles;
    setter(current.map((item, itemIndex) => itemIndex === index ? value.toUpperCase() : item));
  }

  function download() {
    draw();
    const link = document.createElement("a");
    link.download = "PRISMAS_A4.png";
    link.href = canvasRef.current?.toDataURL("image/png") || "";
    link.click();
  }

  function print() { draw(); window.print(); }

  return <div className="grid items-start gap-6 xl:grid-cols-[380px_1fr]">
    <Card className="p-5 sm:p-6">
      <div><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Quantidade na folha</label><select value={quantity} onChange={(event) => setQuantity(Number(event.target.value) as 1 | 2)} className="h-11 w-full rounded-lg border bg-white px-3 text-sm"><option value={1}>1 prisma</option><option value={2}>2 prismas</option></select></div>
      {[0, 1].slice(0, quantity).map((index) => <section key={index} className="mt-5 rounded-xl border bg-slate-50 p-4"><h2 className="font-bold text-slate-900">Prisma {index + 1}</h2><label className="mb-1.5 mt-3 block text-xs font-bold uppercase text-slate-500">Nome</label><Input value={names[index]} onChange={(event) => changeText("name", index, event.target.value)} /><label className="mb-1.5 mt-3 block text-xs font-bold uppercase text-slate-500">Função</label><Input value={roles[index]} onChange={(event) => changeText("role", index, event.target.value)} /></section>)}
      <section className="mt-5 rounded-xl border p-4"><h2 className="font-bold text-slate-900">Ajustes finos</h2><p className="mt-1 text-xs text-slate-500">Os ajustes valem para todos os prismas da folha.</p>{([
        ["nameSize", "Tamanho do nome", 30, 70], ["roleSize", "Tamanho da função", 22, 54], ["offsetX", "Ajuste horizontal", -80, 80], ["offsetY", "Ajuste vertical", -50, 50], ["gap", "Espaço entre nome e função", 34, 75],
      ] as [keyof FineTuning, string, number, number][]).map(([field, label, min, max]) => <div key={field} className="mt-4"><div className="mb-1.5 flex items-center justify-between"><label className="text-xs font-bold uppercase text-slate-500">{label}</label><span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold">{tuning[field]}</span></div><input type="range" min={min} max={max} value={tuning[field]} onChange={(event) => setTuning({ ...tuning, [field]: Number(event.target.value) })} className="w-full accent-emerald-900" /></div>)}</section>
      {templateError && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{templateError}</p>}
      <div className="mt-5 grid gap-2"><Button onClick={download} disabled={!ready} className="bg-emerald-950"><Download size={17} />Baixar PNG A4</Button><Button onClick={print} disabled={!ready} variant="outline"><Printer size={17} />Imprimir / salvar em PDF</Button><Button onClick={() => setTuning(defaults)} variant="outline"><RotateCcw size={17} />Restaurar ajustes</Button></div>
    </Card>
    <div className="relative rounded-2xl bg-slate-950 p-2 shadow-inner sm:p-4"><canvas id="prisma-canvas" ref={canvasRef} width={1240} height={1754} className="h-auto w-full bg-white shadow-xl" aria-label="Pré-visualização da folha A4 com prismas" />{!ready && !templateError && <div role="status" className="absolute inset-2 grid place-items-center bg-white/90 text-center text-sm font-semibold text-slate-600 sm:inset-4">Carregando modelo do prisma...</div>}</div>
    <style jsx global>{`@media print { @page { size: A4; margin: 0; } body * { visibility: hidden !important; } #prisma-canvas { visibility: visible !important; position: fixed; inset: 0; width: 210mm !important; height: 297mm !important; box-shadow: none !important; } }`}</style>
  </div>;
}
