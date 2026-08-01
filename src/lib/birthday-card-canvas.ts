import { birthdayCardBackgrounds, birthdayDateLine, recipientLine, safeBirthdayFilename, type BirthdayPerson } from "@/lib/birthday-cards";

const WIDTH = 1600;
const HEIGHT = 1135;
const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string) {
  if (!imageCache.has(src)) {
    imageCache.set(src, new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Não foi possível carregar o modelo do cartão."));
      image.src = src;
    }));
  }
  return imageCache.get(src)!;
}

function fittedFont(context: CanvasRenderingContext2D, text: string, initialSize: number, maxWidth: number) {
  let size = initialSize;
  do {
    context.font = `${size}px "Times New Roman", Times, serif`;
    if (context.measureText(text).width <= maxWidth) return size;
    size -= 1;
  } while (size >= 27);
  return size;
}

export async function renderBirthdayCard(person: BirthdayPerson, canvas?: HTMLCanvasElement) {
  const target = canvas ?? document.createElement("canvas");
  target.width = WIDTH;
  target.height = HEIGHT;
  const context = target.getContext("2d");
  if (!context) throw new Error("Seu navegador não conseguiu preparar a imagem.");
  const background = await loadImage(birthdayCardBackgrounds[person.type]);
  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.drawImage(background, 0, 0, WIDTH, HEIGHT);
  context.fillStyle = "#202020";
  context.textAlign = "center";
  context.textBaseline = "alphabetic";

  const recipient = recipientLine(person);
  context.letterSpacing = "1px";
  fittedFont(context, recipient, 44, 1370);
  context.fillText(recipient, WIDTH / 2, person.type === "normal" ? 415 : 435);

  const date = birthdayDateLine(person);
  context.letterSpacing = "0.25px";
  fittedFont(context, date, 35, 900);
  context.fillText(date, WIDTH / 2, 810);
  return target;
}

export function canvasPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Não foi possível gerar o PNG.")), "image/png"));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function downloadBirthdayCard(person: BirthdayPerson) {
  const canvas = await renderBirthdayCard(person);
  downloadBlob(await canvasPng(canvas), safeBirthdayFilename(person));
}

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const value of data) crc = crcTable[(crc ^ value) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function write16(view: DataView, offset: number, value: number) { view.setUint16(offset, value, true); }
function write32(view: DataView, offset: number, value: number) { view.setUint32(offset, value, true); }

export async function birthdayCardsZip(people: BirthdayPerson[], onProgress?: (done: number) => void) {
  const encoder = new TextEncoder();
  const localParts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  let offset = 0;

  for (let index = 0; index < people.length; index += 1) {
    const person = people[index];
    const png = new Uint8Array(await (await canvasPng(await renderBirthdayCard(person))).arrayBuffer());
    const name = encoder.encode(safeBirthdayFilename(person));
    const crc = crc32(png);
    const local = new ArrayBuffer(30);
    const localView = new DataView(local);
    write32(localView, 0, 0x04034b50); write16(localView, 4, 20); write16(localView, 6, 0x0800);
    write16(localView, 8, 0); write32(localView, 14, crc); write32(localView, 18, png.length);
    write32(localView, 22, png.length); write16(localView, 26, name.length);
    localParts.push(local, name, png);

    const central = new ArrayBuffer(46);
    const centralView = new DataView(central);
    write32(centralView, 0, 0x02014b50); write16(centralView, 4, 20); write16(centralView, 6, 20);
    write16(centralView, 8, 0x0800); write16(centralView, 10, 0); write32(centralView, 16, crc);
    write32(centralView, 20, png.length); write32(centralView, 24, png.length); write16(centralView, 28, name.length);
    write32(centralView, 42, offset);
    centralParts.push(central, name);
    offset += 30 + name.length + png.length;
    onProgress?.(index + 1);
  }

  const centralSize = centralParts.reduce((sum, part) => sum + (part instanceof ArrayBuffer ? part.byteLength : part instanceof Uint8Array ? part.byteLength : 0), 0);
  const end = new ArrayBuffer(22);
  const endView = new DataView(end);
  write32(endView, 0, 0x06054b50); write16(endView, 8, people.length); write16(endView, 10, people.length);
  write32(endView, 12, centralSize); write32(endView, 16, offset);
  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}
