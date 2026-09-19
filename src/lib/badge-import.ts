export type ImportedBadgeIdentity = {
  name: string;
  identity: string;
};

export type BadgeColumnMapping = {
  columns: Array<{ index: number; label: string }>;
  rows: string[][];
  suggestedNameIndex: number;
  suggestedIdentityIndex: number;
};

const NAME_HEADERS = ["nome", "nome completo", "militar", "pessoa", "servidor", "funcionario", "funcionário"];
const DOCUMENT_HEADERS = ["identidade", "idt", "rg", "cpf", "documento", "registro"];
const DOCUMENT_LABEL = /\b(?:cpf|identidade|idt|rg|documento|registro)\b\s*(?:n[ºo°.]?\s*)?[:\-–]?\s*/i;
const CPF_PATTERN = /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/;
const GENERIC_DOCUMENT_PATTERN = /\b(?:\d[.\-\s]?){6,11}[\dXx]\b/;
const MAX_IDENTITIES = 500;

function searchValue(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
}

function cleanCell(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function isHeader(value: string, options: string[]) {
  const normalized = searchValue(value).replace(/[:*]/g, "").trim();
  return options.some((option) => normalized === searchValue(option) || normalized.startsWith(`${searchValue(option)} `));
}

function formatDocument(raw: string) {
  const cleaned = raw.replace(DOCUMENT_LABEL, "").replace(/^[\s:;,.\-–]+|[\s:;,.\-–]+$/g, "").trim();
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return cleaned.replace(/\s+/g, "");
}

function documentMatch(value: string, permissive = true) {
  const normalized = cleanCell(value);
  const cpf = normalized.match(CPF_PATTERN)?.[0];
  if (cpf) return { raw: cpf, value: formatDocument(cpf) };

  const label = normalized.match(DOCUMENT_LABEL);
  if (label) {
    const tail = normalized.slice((label.index ?? 0) + label[0].length);
    const candidate = tail.match(GENERIC_DOCUMENT_PATTERN)?.[0] ?? tail.match(/^[A-Za-z0-9.\-/]{5,20}/)?.[0];
    if (candidate) return { raw: candidate, value: formatDocument(candidate) };
  }

  if (!permissive || /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(normalized)) return null;
  const generic = normalized.match(GENERIC_DOCUMENT_PATTERN)?.[0];
  if (!generic) return null;
  const compact = generic.replace(/[.\-\s]/g, "");
  if (compact.length < 7 || compact.length > 12) return null;
  return { raw: generic, value: formatDocument(generic) };
}

function cleanName(value: string, documentRaw?: string) {
  let result = cleanCell(value);
  if (documentRaw) result = result.replace(documentRaw, " ");
  result = result
    .replace(DOCUMENT_LABEL, " ")
    .replace(/^\s*(?:\d{1,4}[.)º°\-–:]?\s+)+/, "")
    .replace(/[|;,:\-–]+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return result;
}

function looksLikeName(value: string) {
  const normalized = cleanName(value);
  if (normalized.length < 5 || normalized.length > 100 || isHeader(normalized, [...NAME_HEADERS, ...DOCUMENT_HEADERS])) return false;
  if (/\b(?:pagina|página|relacao|relação|assinatura|observacao|observação|total|ordem|data)\b/i.test(normalized)) return false;
  const words = normalized.match(/[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’-]*/g) ?? [];
  const letters = (normalized.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) ?? []).length;
  return words.length >= 2 && letters / Math.max(1, normalized.length) >= 0.55;
}

function bestName(cells: string[], documentRaw?: string) {
  return cells
    .map((cell) => cleanName(cell, documentRaw))
    .filter(looksLikeName)
    .sort((a, b) => b.length - a.length)[0] ?? "";
}

function deduplicate(items: ImportedBadgeIdentity[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${searchValue(item.name)}|${item.identity.replace(/\W/g, "").toUpperCase()}`;
    if (!item.name || !item.identity || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_IDENTITIES);
}

/** Extrai pares de nome e identidade/CPF de linhas de tabelas ou de texto. */
export function extractBadgeIdentities(rows: string[][]) {
  const normalizedRows = rows
    .map((row) => row.map(cleanCell).filter(Boolean))
    .filter((row) => row.length > 0);
  const identities: ImportedBadgeIdentity[] = [];
  let nameColumn = -1;
  let documentColumn = -1;

  for (const cells of normalizedRows) {
    const nextNameColumn = cells.findIndex((cell) => isHeader(cell, NAME_HEADERS));
    const nextDocumentColumn = cells.findIndex((cell) => isHeader(cell, DOCUMENT_HEADERS));
    if (nextNameColumn >= 0 && nextDocumentColumn >= 0 && nextNameColumn !== nextDocumentColumn) {
      nameColumn = nextNameColumn;
      documentColumn = nextDocumentColumn;
      continue;
    }

    if (nameColumn >= 0 && documentColumn >= 0) {
      const nameCell = cells[nameColumn] ?? "";
      const documentCell = cells[documentColumn] ?? "";
      const document = documentMatch(documentCell);
      const name = cleanName(nameCell, document?.raw);
      if (document && looksLikeName(name)) {
        identities.push({ name, identity: document.value });
        continue;
      }
    }

    const joined = cells.join(" | ");
    const document = documentMatch(joined);
    if (!document) continue;
    let name = bestName(cells.filter((cell) => !cell.includes(document.raw)), document.raw);
    if (!name && cells.length === 1) name = cleanName(cells[0], document.raw);
    if (looksLikeName(name)) identities.push({ name, identity: document.value });
  }

  // Documentos Word e alguns PDFs podem separar nome e documento em linhas consecutivas.
  for (let index = 0; index < normalizedRows.length - 1; index += 1) {
    const current = normalizedRows[index].join(" ");
    const next = normalizedRows[index + 1].join(" ");
    const currentDocument = documentMatch(current);
    const nextDocument = documentMatch(next);
    if (looksLikeName(current) && !currentDocument && nextDocument) {
      identities.push({ name: cleanName(current), identity: nextDocument.value });
    } else if (currentDocument && !nextDocument && looksLikeName(next)) {
      identities.push({ name: cleanName(next), identity: currentDocument.value });
    }
  }

  return deduplicate(identities);
}

export function parseDelimitedText(text: string, extension: string) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((line) => line.trim());
  if (extension !== ".csv") {
    return lines.map((line) => line.split(/\t|;|\s{2,}/).map(cleanCell).filter(Boolean));
  }

  const samples = lines.slice(0, 10).join("\n");
  const candidates = [";", "\t", ","];
  const delimiter = candidates.sort((a, b) => samples.split(b).length - samples.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  const input = `${text.replace(/\r\n?/g, "\n")}\n`;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(cleanCell(value)); value = "";
    } else if (character === "\n" && !quoted) {
      row.push(cleanCell(value));
      if (row.some(Boolean)) rows.push(row);
      row = []; value = "";
    } else value += character;
  }
  return rows;
}

/** Prepara uma tabela para o usuário escolher quais campos alimentarão o crachá. */
export function buildBadgeColumnMapping(rows: string[][]): BadgeColumnMapping | null {
  const normalized = rows
    .map((row) => row.map(cleanCell))
    .filter((row) => row.some(Boolean));
  if (!normalized.length) return null;

  const maximumWidth = Math.min(20, Math.max(...normalized.map((row) => row.length)));
  if (maximumWidth < 2) return null;

  let headerIndex = -1;
  let bestHeaderScore = 0;
  normalized.slice(0, 40).forEach((row, index) => {
    const score = row.reduce((total, cell) => total
      + (isHeader(cell, NAME_HEADERS) ? 4 : 0)
      + (isHeader(cell, DOCUMENT_HEADERS) ? 4 : 0), 0);
    if (score > bestHeaderScore) {
      bestHeaderScore = score;
      headerIndex = index;
    }
  });

  const header = headerIndex >= 0 ? normalized[headerIndex] : [];
  const labels = Array.from({ length: maximumWidth }, (_, index) => {
    const label = header[index]?.replace(/[:*]+$/g, "").trim();
    return label || `Coluna ${index + 1}`;
  });
  const uniqueLabels = labels.map((label, index) => labels.indexOf(label) === index ? label : `${label} (${index + 1})`);
  const dataRows = normalized
    .slice(headerIndex >= 0 ? headerIndex + 1 : 0)
    .map((row) => Array.from({ length: maximumWidth }, (_, index) => row[index] ?? ""))
    .filter((row) => row.some(Boolean))
    .slice(0, MAX_IDENTITIES);

  if (!dataRows.length) return null;
  const exactNameIndex = header.findIndex((cell) => {
    const normalized = searchValue(cell).replace(/[:*]/g, "").trim();
    return normalized === "nome" || normalized === "nome completo";
  });
  const suggestedNameIndex = exactNameIndex >= 0
    ? exactNameIndex
    : header.findIndex((cell) => isHeader(cell, NAME_HEADERS));
  const suggestedIdentityIndex = header.findIndex((cell) => isHeader(cell, DOCUMENT_HEADERS));

  return {
    columns: uniqueLabels.map((label, index) => ({ index, label })),
    rows: dataRows,
    suggestedNameIndex: suggestedNameIndex >= 0 ? suggestedNameIndex : 0,
    suggestedIdentityIndex: suggestedIdentityIndex >= 0 ? suggestedIdentityIndex : Math.min(1, maximumWidth - 1),
  };
}

/** Aplica as colunas escolhidas manualmente, sem tentar adivinhar seus títulos. */
export function mapBadgeColumns(rows: string[][], nameIndex: number, identityIndex: number) {
  return deduplicate(rows.map((row) => ({
    name: cleanCell(row[nameIndex] ?? ""),
    identity: formatDocument(row[identityIndex] ?? ""),
  })));
}
