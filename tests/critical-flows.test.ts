import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  isDesignatedOwner,
  OWNER_EMAIL,
  postLoginDestination,
  validateFirstAccess,
  validateTemporaryAccess,
} from "../src/lib/access-control";
import { readApiResponse } from "../src/lib/api-response";
import { auditActionLabel, auditSubject, isCompletionEvent } from "../src/lib/audit";
import { extractBadgeIdentities } from "../src/lib/badge-import";
import { extractBirthdayPeople } from "../src/lib/birthday-import";
import { extractReferenceFields } from "../src/lib/reference-extraction";
import { internalEmailForWarName, normalizeWarName } from "../src/lib/war-name";
import { activityPeriodRange, composeWorkNotes, detectCommunicationFronts, isWithinPeriod, parseWorkNotes, workPeriodRange } from "../src/lib/work-summary";

test("somente a conta oficial ativa é reconhecida como proprietária", () => {
  assert.equal(isDesignatedOwner(OWNER_EMAIL, { email: OWNER_EMAIL, access_level: "owner", active: true }), true);
  assert.equal(isDesignatedOwner("outro@example.com", { email: OWNER_EMAIL, access_level: "owner", active: true }), false);
  assert.equal(isDesignatedOwner(OWNER_EMAIL, { email: OWNER_EMAIL, access_level: "user", active: true }), false);
  assert.equal(isDesignatedOwner(OWNER_EMAIL, { email: OWNER_EMAIL, access_level: "owner", active: false }), false);
});

test("login direciona primeiro acesso e usuários já completos corretamente", () => {
  assert.equal(postLoginDestination(null), "/primeiro-acesso");
  assert.equal(postLoginDestination({ profile_completed: false, must_change_password: false }), "/primeiro-acesso");
  assert.equal(postLoginDestination({ profile_completed: true, must_change_password: true }), "/primeiro-acesso");
  assert.equal(postLoginDestination({ profile_completed: true, must_change_password: false }), "/dashboard");
});

test("valida cadastro inicial e bloqueia e-mail interno", () => {
  assert.equal(validateFirstAccess({ fullName: "João da Silva", rank: "Cabo", email: "joao@example.com", password: "segura123" }), null);
  assert.equal(validateFirstAccess({ fullName: "João da Silva", rank: "Cabo", email: "joao@siscom.invalid", password: "segura123" }), "Informe um e-mail válido.");
  assert.equal(validateFirstAccess({ fullName: "João da Silva", rank: "Cabo", email: "joao@example.com", password: "curta" }), "A nova senha deve ter pelo menos 8 caracteres.");
});

test("gera login temporário determinístico e valida sua senha", () => {
  assert.equal(normalizeWarName("  João D'Ávila  "), "joao.d.avila");
  assert.equal(internalEmailForWarName("João D'Ávila"), "joao.d.avila@siscom.invalid");
  assert.equal(validateTemporaryAccess("Silva", "Temporaria9"), null);
  assert.equal(validateTemporaryAccess("S", "Temporaria9"), "Informe um nome de guerra válido.");
});

test("importação de crachás extrai nome e documento", () => {
  const result = extractBadgeIdentities([
    ["Nome completo", "Identidade"],
    ["MARIA APARECIDA SOUZA", "123.456.789-00"],
  ]);
  assert.deepEqual(result, [{ name: "MARIA APARECIDA SOUZA", identity: "123.456.789-00" }]);
});

test("importação de aniversariantes interpreta o relatório padrão", () => {
  const people = extractBirthdayPeople([[
    { text: "Mês de agosto de 2026", x: 20, y: 780 },
    { text: "1", x: 40, y: 700 },
    { text: "CB", x: 170, y: 700 },
    { text: "COM", x: 220, y: 700 },
    { text: "JOÃO DA SILVA", x: 340, y: 700 },
    { text: "15/08/1990", x: 420, y: 700 },
  ]], "aniversariantes-2026.pdf");
  assert.equal(people.length, 1);
  assert.deepEqual({ name: people[0].fullName, day: people[0].day, month: people[0].month, year: people[0].year }, { name: "JOÃO DA SILVA", day: 15, month: 8, year: 2026 });
});

test("referência elogiosa preserva destinatário, data e texto", () => {
  const fields = extractReferenceFields([
    "REFERÊNCIA ELOGIOSA",
    "CB JOÃO DA SILVA",
    "O militar demonstrou elevado profissionalismo e dedicação no cumprimento de suas atribuições.",
    "Rio de Janeiro, 1º de agosto de 2026.",
  ]);
  assert.match(fields.recipient, /JOÃO DA SILVA/i);
  assert.match(fields.text, /elevado profissionalismo/i);
  assert.match(fields.date, /agosto de 2026/i);
});

test("respostas não JSON apresentam erros úteis", async () => {
  await assert.rejects(
    readApiResponse(new Response("Payload too large", { status: 413, headers: { "content-type": "text/plain" } })),
    /15 MB/,
  );
  await assert.rejects(
    readApiResponse(new Response("Unauthorized", { status: 401, headers: { "content-type": "text/plain" } })),
    /sessão expirou/,
  );
});

test("service worker não armazena páginas privadas nem APIs", async () => {
  const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /STATIC_SHELL[^;]*(?:login|dashboard)/);
  assert.match(source, /!url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(source, /!url\.pathname\.startsWith\("\/dashboard"\)/);
});

test("auditoria diferencia criação, alteração e conclusão", () => {
  const creation = { action: "INSERT", entity_type: "demand", entity_id: "demand-1", details: { title: "Cobertura da solenidade", protocol: 1024 } };
  const update = { action: "UPDATE", entity_type: "event", details: { title: "Formatura", previous_status: "planejado", status: "confirmado" } };
  const completion = { action: "UPDATE", entity_type: "demand", details: { title: "Cobertura da solenidade", previous_status: "em_andamento", status: "concluida" } };
  assert.equal(auditActionLabel(creation), "Criou demanda");
  assert.equal(auditActionLabel(update), "Alterou atividade da agenda");
  assert.equal(auditActionLabel(completion), "Concluiu demanda");
  assert.equal(isCompletionEvent(completion), true);
  assert.equal(auditSubject(creation), "#1024 — Cobertura da solenidade");
});

test("resumo de produção identifica frentes e respeita o período selecionado", () => {
  const fronts = detectCommunicationFronts("Cobertura da formatura", "Fotos tratadas, vídeo editado e link entregue", "Drone empregado");
  assert.deepEqual(fronts.map((front) => front.label), ["Fotografia", "Vídeo", "Drone", "Links"]);

  const { start, end } = workPeriodRange("mes", new Date("2026-08-20T12:00:00-03:00"));
  assert.equal(start.getDate(), 1);
  assert.equal(isWithinPeriod("2026-08-10T15:00:00-03:00", start, end), true);
  assert.equal(isWithinPeriod("2026-07-31T23:00:00-03:00", start, end), false);
});

test("quadro de atividades preserva providências, militares e observações sem novas colunas", () => {
  const notes = composeWorkNotes({
    providences: ["Fotografia", "Vídeo", "Drone"],
    military: "Paulo Silva, Perluci e Barros",
    observations: "Material entregue à unidade apoiada.",
  });
  assert.deepEqual(parseWorkNotes(notes), {
    providences: ["Fotografia", "Vídeo", "Drone"],
    military: "Paulo Silva, Perluci e Barros",
    observations: "Material entregue à unidade apoiada.",
  });

  const { start, end } = activityPeriodRange("mes", new Date("2026-08-20T12:00:00-03:00"));
  assert.equal(start.getDate(), 1);
  assert.equal(end.getMonth(), 7);
  assert.equal(end.getDate(), 31);
});
