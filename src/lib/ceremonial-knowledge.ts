import knowledge from "@/data/ceremonial-knowledge.json";

export type KnowledgeSource = { id: string; documentId: string; source: string; page: number; content: string };

const stopWords = new Set(["a", "ao", "aos", "as", "com", "como", "da", "das", "de", "do", "dos", "e", "ela", "ele", "em", "eu", "fica", "ficam", "o", "os", "para", "por", "qual", "que", "se", "tem", "tenho", "um", "uma", "vai"]);

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function queryTerms(question: string) {
  const normalized = normalize(question);
  const originalTerms = normalized.split(" ").filter((term) => term.length > 2 && !stopWords.has(term));
  const additions: string[] = [];
  if (/general|coronel|major|tenente|capitao|autoridade|palanque|posicion/.test(normalized)) additions.push("precedencia", "lugar honra", "direita", "esquerda", "centro", "dispositivo", "autoridades", "palanque");
  if (/bandeira|estandarte|simbolo/.test(normalized)) additions.push("guarda bandeira", "incorporacao", "entrada", "saida", "deslocamento", "posicao", "lado");
  if (/recepcao|despedida|honra/.test(normalized)) additions.push("honras", "recepcao", "despedida", "autoridade");
  if (/comando|passagem/.test(normalized)) additions.push("passagem comando", "substituido", "substituto", "dispositivo");
  return { normalized, originalTerms, terms: [...new Set([...originalTerms, ...additions.flatMap((item) => item.split(" "))])] };
}

export function searchCeremonialKnowledge(question: string, limit = 8): KnowledgeSource[] {
  const query = queryTerms(question);
  return knowledge.chunks.map((chunk) => {
    const content = normalize(chunk.content);
    const source = normalize(chunk.source);
    let score = 0;
    if (query.normalized.length > 8 && content.includes(query.normalized)) score += 25;
    score += query.originalTerms.filter((term) => content.includes(term)).length * 8;
    for (const term of query.terms) {
      const occurrences = content.split(term).length - 1;
      score += Math.min(occurrences, 5) * 2;
      if (source.includes(term)) score += 5;
    }
    if (content.includes("precedencia")) score += query.terms.includes("precedencia") ? 4 : 0;
    if (content.includes("direita") || content.includes("esquerda")) score += query.terms.includes("direita") ? 3 : 0;
    if (/palanque|posicion/.test(query.normalized)) {
      if (content.includes("palanque")) score += 20;
      if (content.includes("lugar de honra")) score += 12;
      if (source.includes("cerimonial")) score += 8;
    }
    if (query.normalized.includes("bandeira")) {
      if (source.includes("guarda-bandeira")) score += 20;
      if (content.includes("incorporacao") || content.includes("desincorporacao")) score += 8;
    }
    if (content.includes("indice de assuntos")) score -= 18;
    return { chunk, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(({ chunk }) => ({ id: chunk.id, documentId: chunk.documentId, source: chunk.source, page: chunk.page, content: chunk.content }));
}

export const ceremonialDocuments = knowledge.documents.map(({ id, title, pages }) => ({ id, title, pages }));

export function getCeremonialDocument(id: string) {
  return knowledge.documents.find((document) => document.id === id);
}
