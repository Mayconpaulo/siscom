import type { BirthdayPerson } from "@/lib/birthday-cards";

export type PositionedPdfText = { text: string; x: number; y: number };

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function joinColumn(items: PositionedPdfText[], minX: number, maxX: number) {
  return clean(items
    .filter((item) => item.x >= minX && item.x < maxX)
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .map((item) => item.text)
    .join(" "));
}

function detectMonth(pages: PositionedPdfText[][]) {
  const header = pages.flat().map((item) => item.text).join(" ");
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const byHeader = months.findIndex((month) => new RegExp(`m[eê]s\\s+de\\s+${month}`, "i").test(header));
  if (byHeader >= 0) return byHeader + 1;
  const date = header.match(/\b\d{2}\/(\d{2})\/\d{4}\b/);
  return date ? Number(date[1]) : new Date().getMonth() + 1;
}

function detectYear(pages: PositionedPdfText[][], filename: string) {
  const fromName = filename.match(/\b(20\d{2})\b/)?.[1];
  if (fromName) return Number(fromName);
  const header = pages.flat().map((item) => item.text).join(" ");
  return Number(header.match(/\b(20\d{2})\b/)?.[1] ?? new Date().getFullYear());
}

/** Extrai as colunas do relatório padrão de aniversariantes do Exército. */
export function extractBirthdayPeople(pages: PositionedPdfText[][], filename: string): BirthdayPerson[] {
  const month = detectMonth(pages);
  const year = detectYear(pages, filename);
  const people: BirthdayPerson[] = [];

  pages.forEach((pageItems, pageIndex) => {
    const anchors = pageItems
      .filter((item) => item.x >= 34 && item.x < 56 && item.y < 740 && /^\d{1,3}$/.test(item.text.trim()))
      .sort((a, b) => b.y - a.y);

    if (pageIndex > 0 && people.length && anchors.length) {
      const firstUpper = anchors.length > 1 ? anchors[0].y + (anchors[0].y - anchors[1].y) / 2 : anchors[0].y + 32;
      const continuation = joinColumn(pageItems.filter((item) => item.y > firstUpper && item.y < 765 && !/^NOME$/i.test(item.text)), 330, 408);
      if (continuation && !/^NOME$/i.test(continuation)) {
        people[people.length - 1].fullName = clean(`${people[people.length - 1].fullName} ${continuation}`);
      }
    }

    anchors.forEach((anchor, index) => {
      const upper = index === 0 ? Math.min(765, anchor.y + (anchors[index + 1] ? (anchor.y - anchors[index + 1].y) / 2 : 35)) : (anchors[index - 1].y + anchor.y) / 2;
      const lower = index === anchors.length - 1 ? Math.max(25, anchor.y - (anchors[index - 1] ? (anchors[index - 1].y - anchor.y) / 2 : 35)) : (anchor.y + anchors[index + 1].y) / 2;
      const row = pageItems.filter((item) => item.y <= upper && item.y > lower && !(item.y > 740 && /^(?:ORD|IDENTIDADE|OM|SIGLA|QUALIFICACAO|NOME|GUERRA|DATA NASC|DIA|SITUACAO)$/i.test(item.text)));
      const rank = joinColumn(row, 160, 211);
      const qualification = joinColumn(row, 211, 270) || "-";
      const fullName = joinColumn(row, 330, 408);
      const birthDate = row.find((item) => item.x >= 404 && item.x < 467 && /^\d{2}\/\d{2}\/\d{4}$/.test(item.text.trim()))?.text.trim();
      const day = Number(birthDate?.slice(0, 2) ?? joinColumn(row, 467, 505));
      if (!rank || !fullName || !Number.isInteger(day) || day < 1 || day > 31) return;
      people.push({
        id: `${pageIndex + 1}-${anchor.text}-${people.length}`,
        rank,
        qualification,
        fullName,
        day,
        month,
        year,
        type: "normal",
      });
    });
  });

  const seen = new Set<string>();
  return people.filter((person) => {
    const key = `${person.fullName}|${person.day}|${person.month}`.toLocaleUpperCase("pt-BR");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
