import { deflateRawSync, inflateRawSync } from "node:zlib";

type ZipEntry = {
  name: string;
  flags: number;
  method: number;
  time: number;
  date: number;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  compressedData: Buffer;
};

const LOCAL_FILE = 0x04034b50;
const CENTRAL_FILE = 0x02014b50;
const END_OF_CENTRAL = 0x06054b50;

function findEndOfCentral(data: Buffer) {
  const minimum = Math.max(0, data.length - 65_557);
  for (let offset = data.length - 22; offset >= minimum; offset -= 1) {
    if (data.readUInt32LE(offset) === END_OF_CENTRAL) return offset;
  }
  throw new Error("O arquivo Word está incompleto ou corrompido.");
}

function readEntries(data: Buffer): ZipEntry[] {
  const end = findEndOfCentral(data);
  const count = data.readUInt16LE(end + 10);
  let offset = data.readUInt32LE(end + 16);
  const entries: ZipEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    if (data.readUInt32LE(offset) !== CENTRAL_FILE) throw new Error("Estrutura DOCX inválida.");
    const flags = data.readUInt16LE(offset + 8);
    const method = data.readUInt16LE(offset + 10);
    const time = data.readUInt16LE(offset + 12);
    const date = data.readUInt16LE(offset + 14);
    const crc = data.readUInt32LE(offset + 16);
    const compressedSize = data.readUInt32LE(offset + 20);
    const uncompressedSize = data.readUInt32LE(offset + 24);
    const nameLength = data.readUInt16LE(offset + 28);
    const extraLength = data.readUInt16LE(offset + 30);
    const commentLength = data.readUInt16LE(offset + 32);
    const localOffset = data.readUInt32LE(offset + 42);
    const name = data.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");

    if (data.readUInt32LE(localOffset) !== LOCAL_FILE) throw new Error("Entrada DOCX inválida.");
    const localNameLength = data.readUInt16LE(localOffset + 26);
    const localExtraLength = data.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    entries.push({
      name, flags, method, time, date, crc, compressedSize, uncompressedSize,
      compressedData: Buffer.from(data.subarray(dataOffset, dataOffset + compressedSize)),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function inflate(entry: ZipEntry) {
  if (entry.method === 0) return entry.compressedData;
  if (entry.method === 8) return inflateRawSync(entry.compressedData);
  throw new Error("O documento usa uma compactação não suportada.");
}

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const value of data) crc = crcTable[(crc ^ value) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function readDocxEntry(data: Buffer, name: string) {
  const entry = readEntries(data).find((item) => item.name === name);
  if (!entry) throw new Error(`O documento não contém ${name}.`);
  return inflate(entry);
}

export function replaceDocxEntry(data: Buffer, name: string, replacement: Buffer) {
  const entries = readEntries(data);
  let replaced = false;
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const isTarget = entry.name === name;
    const uncompressed = isTarget ? replacement : null;
    const method = isTarget ? 8 : entry.method;
    const compressed = isTarget ? deflateRawSync(replacement) : entry.compressedData;
    const crc = isTarget ? crc32(replacement) : entry.crc;
    const uncompressedSize = isTarget ? replacement.length : entry.uncompressedSize;
    if (isTarget) replaced = true;
    const flags = (entry.flags & ~0x08) | 0x0800;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_FILE, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(entry.time, 10);
    local.writeUInt16LE(entry.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(uncompressedSize, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuffer, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_FILE, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(entry.time, 12);
    central.writeUInt16LE(entry.date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(uncompressedSize, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, nameBuffer);
    localOffset += local.length + nameBuffer.length + compressed.length;
  }

  if (!replaced) throw new Error(`Não foi possível atualizar ${name}.`);
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_OF_CENTRAL, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function decodeEntities(value: string) {
  return value
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

export function extractParagraphsFromDocx(data: Buffer) {
  const xml = readDocxEntry(data, "word/document.xml").toString("utf8");
  return [...xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)]
    .map((match) => decodeEntities(match[1]
      .replace(/<w:tab\s*\/>/g, "\t")
      .replace(/<w:br(?:\s[^>]*)?\/>/g, "\n")
      .replace(/<[^>]+>/g, "")))
    .map((text) => text.replace(/\u00a0/g, " ").trim())
    .filter(Boolean);
}
