export type PdfTextItem = { text: string; x: number; y: number };

export const PERSONNEL_REPORT_HEADERS = [
  "ORD", "IDENTIDADE", "OM", "SIGLA", "QUALIFICACAO",
  "NOME GUERRA", "NOME", "DATA NASC", "DIA", "SITUACAO",
];

const PERSONNEL_REPORT_BOUNDARIES = [49, 96, 153.5, 194, 250.5, 323.5, 385, 443, 494];

export function personnelReportRows(items: PdfTextItem[]) {
  const headerY = items
    .filter((item) => item.x < 60 && item.text.toLocaleUpperCase("pt-BR") === "ORD")
    .sort((a, b) => b.y - a.y)[0]?.y;
  if (headerY === undefined) return null;
  const hasExpectedHeaders = ["IDENTIDADE", "DATA NASC", "SITUACAO"].every((header) =>
    items.some((item) => item.text.toLocaleUpperCase("pt-BR") === header));
  if (!hasExpectedHeaders) return null;

  const anchors = items
    .filter((item) => item.x < 58 && item.y < headerY - 8 && /^\d{1,4}$/.test(item.text))
    .sort((a, b) => b.y - a.y);
  if (!anchors.length) return [];

  return anchors.map((anchor, index) => {
    const top = index === 0 ? headerY - 8 : (anchors[index - 1].y + anchor.y) / 2;
    const bottom = index === anchors.length - 1 ? anchor.y - 40 : (anchor.y + anchors[index + 1].y) / 2;
    const cells = Array.from({ length: PERSONNEL_REPORT_HEADERS.length }, () => [] as PdfTextItem[]);
    items
      .filter((item) => item.y < top && item.y > bottom)
      .forEach((item) => {
        const column = PERSONNEL_REPORT_BOUNDARIES.findIndex((boundary) => item.x < boundary);
        cells[column < 0 ? cells.length - 1 : column].push(item);
      });
    return cells.map((cell) => cell
      .sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x)
      .map((item) => item.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim());
  });
}
