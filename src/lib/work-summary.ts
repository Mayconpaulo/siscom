export type WorkPeriod = "semana" | "mes" | "30dias";

export type CommunicationFront = {
  label: string;
  tone: string;
  patterns: RegExp[];
};

export const communicationFronts: CommunicationFront[] = [
  { label: "Fotografia", tone: "bg-blue-100 text-blue-800", patterns: [/\bfoto/i, /fotograf/i, /edi[cç][aã]o de imagem/i] },
  { label: "Vídeo", tone: "bg-violet-100 text-violet-800", patterns: [/v[ií]deo/i, /filmagem/i, /reel/i] },
  { label: "Drone", tone: "bg-cyan-100 text-cyan-800", patterns: [/drone/i, /imagem a[eé]rea/i] },
  { label: "Crachás", tone: "bg-amber-100 text-amber-900", patterns: [/crach[aá]/i] },
  { label: "Boletins", tone: "bg-orange-100 text-orange-800", patterns: [/boletim/i, /informex/i] },
  { label: "Links", tone: "bg-sky-100 text-sky-800", patterns: [/\blink\b/i, /\burl\b/i] },
  { label: "Design", tone: "bg-pink-100 text-pink-800", patterns: [/\barte\b/i, /cart[aã]o/i, /anivers[aá]rio/i] },
  { label: "Textos", tone: "bg-lime-100 text-lime-800", patterns: [/mat[eé]ria/i, /release/i, /\btexto\b/i, /nota para imprensa/i] },
  { label: "Prismas", tone: "bg-yellow-100 text-yellow-900", patterns: [/prisma/i] },
  { label: "Museu", tone: "bg-stone-200 text-stone-800", patterns: [/museu/i] },
];

export function detectCommunicationFronts(...parts: Array<string | null | undefined>) {
  const content = parts.filter(Boolean).join(" ");
  return communicationFronts.filter((front) => front.patterns.some((pattern) => pattern.test(content)));
}

export function workPeriodRange(period: WorkPeriod, reference = new Date()) {
  const end = new Date(reference);
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);

  if (period === "semana") {
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
  } else if (period === "mes") {
    start.setDate(1);
  } else {
    start.setDate(start.getDate() - 29);
  }

  return { start, end };
}

export function isWithinPeriod(value: string, start: Date, end: Date) {
  const time = new Date(value).getTime();
  return time >= start.getTime() && time <= end.getTime();
}
