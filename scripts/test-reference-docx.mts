import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractParagraphsFromDocx, readDocxEntry, replaceDocxEntry } from "../src/lib/docx-zip.ts";
import { extractReferenceFields, fillReferenceTemplate } from "../src/lib/reference-extraction.ts";

const templatePath = path.join(process.cwd(), "src", "data", "templates", "referencia-elogiosa-base.docx");
const outputPath = path.join(process.cwd(), "tmp-referencia-elogiosa-teste.docx");
const template = await readFile(templatePath);
const xml = readDocxEntry(template, "word/document.xml").toString("utf8");
const generatedXml = fillReferenceTemplate(xml, {
  recipient: "1º TEN INF JOÃO DA SILVA",
  date: "Rio de Janeiro, 17 de julho de 2026.",
  text: "Elogio o militar pelo elevado padrão de desempenho demonstrado no cumprimento de suas atribuições.\n\nSua dedicação contribuiu diretamente para o êxito das missões da Organização Militar.",
});
const generated = replaceDocxEntry(template, "word/document.xml", Buffer.from(generatedXml, "utf8"));
await writeFile(outputPath, generated);

const paragraphs = extractParagraphsFromDocx(generated);
const fields = extractReferenceFields(paragraphs);
if (!paragraphs.some((paragraph) => paragraph.includes("JOÃO DA SILVA"))) throw new Error("Destinatário não foi inserido.");
if (!paragraphs.some((paragraph) => paragraph.includes("17 de julho de 2026"))) throw new Error("Data não foi inserida.");
if (!paragraphs.some((paragraph) => paragraph.includes("elevado padrão"))) throw new Error("Texto não foi inserido.");

console.log(JSON.stringify({ outputPath, bytes: generated.length, paragraphs: paragraphs.length, extracted: fields }, null, 2));
