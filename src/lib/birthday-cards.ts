export const birthdayCardTypes = ["normal", "commander", "adjutant"] as const;

export type BirthdayCardType = (typeof birthdayCardTypes)[number];

export type BirthdayPerson = {
  id: string;
  rank: string;
  qualification: string;
  fullName: string;
  day: number;
  month: number;
  year: number;
  type: BirthdayCardType;
};

export const birthdayCardLabels: Record<BirthdayCardType, string> = {
  normal: "Prezado companheiro",
  commander: "Eterno Comandante",
  adjutant: "Eterno Adjunto de Comando",
};

export const birthdayCardBackgrounds: Record<BirthdayCardType, string> = {
  normal: "/templates/cartoes-aniversario/normal.png",
  commander: "/templates/cartoes-aniversario/eterno-comandante.png",
  adjutant: "/templates/cartoes-aniversario/eterno-adjunto.png",
};

export const monthNames = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function recipientLine(person: BirthdayPerson) {
  const title = [person.rank, person.qualification === "-" ? "" : person.qualification, person.fullName]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleUpperCase("pt-BR");
  return `${person.type === "commander" ? "AO SENHOR" : "AO"} ${title}`;
}

export function birthdayDateLine(person: BirthdayPerson) {
  return `Quartel na Vila Militar, RJ, ${person.day} de ${monthNames[person.month - 1]} de ${person.year}.`;
}

export function safeBirthdayFilename(person: BirthdayPerson) {
  const name = person.fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLocaleLowerCase("pt-BR");
  return `cartao-aniversario-${String(person.day).padStart(2, "0")}-${String(person.month).padStart(2, "0")}-${name || "militar"}.png`;
}

