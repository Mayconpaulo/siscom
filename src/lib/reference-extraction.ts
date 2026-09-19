const datePattern = /(?:Rio de Janeiro,\s*)?\d{1,2}[º°]?\s+de\s+[A-Za-zÀ-ÿ]+\s+de\s+\d{4}\.?/i;
const titlePattern = /ELOGIO\s+DE\s+(?:OFICIAL|PRAÇA)\s*[–—-]\s*/i;
const rankPattern = /\b(?:GEN(?:\s+EX|\s+DIV|\s+BDA)?|CEL|TEN\s+CEL|MAJ|CAP|1º\s+TEN|2º\s+TEN|ASP|ST|1º\s+SGT|2º\s+SGT|3º\s+SGT|CB|SD)\b/i;

export type ReferenceFields = { recipient: string; date: string; text: string };

export function extractReferenceFields(paragraphs: string[]): ReferenceFields {
  const headingIndex = paragraphs.findIndex((paragraph) => /REFER[ÊE]NCIA\s+ELOGIOSA/i.test(paragraph));
  const titleIndex = paragraphs.findIndex((paragraph) => titlePattern.test(paragraph));
  const titleLine = titleIndex >= 0 ? paragraphs[titleIndex] : "";
  const afterTitle = titleLine.replace(titlePattern, "").trim();
  const recipientFromTitle = afterTitle.match(/^(.+?)(?=\s{2,}|\s+Ao\s+|$)/i)?.[1]?.trim() || "";
  const searchFrom = Math.max(0, headingIndex + 1);
  const fallbackRecipientIndex = paragraphs.findIndex((paragraph, index) =>
    index >= searchFrom && paragraph.length < 130 && rankPattern.test(paragraph) && paragraph === paragraph.toUpperCase());
  const fallbackRecipient = fallbackRecipientIndex >= 0 ? paragraphs[fallbackRecipientIndex] : "";
  const recipient = recipientFromTitle || fallbackRecipient;
  const date = paragraphs.map((paragraph) => paragraph.match(datePattern)?.[0]).find(Boolean) || "";

  const body: string[] = [];
  if (titleIndex >= 0) {
    const firstBody = recipient ? afterTitle.slice(afterTitle.indexOf(recipient) + recipient.length).trim() : "";
    if (firstBody) body.push(firstBody);
    for (let index = titleIndex + 1; index < paragraphs.length; index += 1) {
      const paragraph = paragraphs[index].trim();
      if (!paragraph) continue;
      if (datePattern.test(paragraph) || /Leões\s+de\s+Guerra/i.test(paragraph)) break;
      body.push(paragraph);
    }
  } else if (fallbackRecipientIndex >= 0) {
    for (let index = fallbackRecipientIndex + 1; index < paragraphs.length; index += 1) {
      const paragraph = paragraphs[index].trim();
      if (!paragraph) continue;
      if (datePattern.test(paragraph) || /Leões\s+de\s+Guerra/i.test(paragraph)) break;
      body.push(paragraph);
    }
  }

  return { recipient, date, text: body.join("\n\n") };
}

export function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function fillReferenceTemplate(xml: string, fields: ReferenceFields) {
  const lineBreaks = (value: string) => escapeXml(value).replace(/\r?\n/g, '</w:t><w:br/><w:t xml:space="preserve">');
  const replacements: Record<string, string> = {
    "{{DESTINATARIO}}": escapeXml(fields.recipient.toUpperCase()),
    "{{TEXTO}}": lineBreaks(fields.text),
    "{{DATA}}": escapeXml(fields.date),
  };
  let output = xml;
  for (const [placeholder, value] of Object.entries(replacements)) {
    if (!output.includes(placeholder)) throw new Error(`Campo ${placeholder} não encontrado no modelo.`);
    output = output.replace(placeholder, value);
  }
  return output;
}
