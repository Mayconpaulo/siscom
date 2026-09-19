export type AuditDetails = Record<string, unknown>;

export type AuditLogEntry = {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: AuditDetails;
  created_at: string;
};

const entityLabels: Record<string, string> = {
  demand: "demanda",
  event: "atividade da agenda",
  profile: "usuário",
};

export function auditEntityLabel(entityType: string) {
  return entityLabels[entityType] || "registro";
}

export function isCompletionEvent(entry: Pick<AuditLogEntry, "action" | "entity_type" | "details">) {
  if (entry.action !== "UPDATE") return false;
  if (entry.entity_type === "demand") return entry.details.status === "concluida" && entry.details.previous_status !== "concluida";
  if (entry.entity_type === "event") return entry.details.status === "concluido" && entry.details.previous_status !== "concluido";
  return false;
}

export function auditActionLabel(entry: Pick<AuditLogEntry, "action" | "entity_type" | "details">) {
  const entity = auditEntityLabel(entry.entity_type);
  if (isCompletionEvent(entry)) return `Concluiu ${entity}`;
  const labels: Record<string, string> = {
    INSERT: `Criou ${entity}`,
    UPDATE: `Alterou ${entity}`,
    DELETE: `Excluiu ${entity}`,
    COMMENT: "Comentou em demanda",
    CREATE_TEMPORARY_ACCESS: "Criou acesso temporário",
    COMPLETE_FIRST_ACCESS: "Concluiu primeiro acesso",
    UPDATE_PROFILE: "Atualizou o próprio perfil",
    DEACTIVATE: "Desativou usuário",
  };
  return labels[entry.action] || `Executou ${entry.action.toLocaleLowerCase("pt-BR")} em ${entity}`;
}

export function auditSubject(entry: Pick<AuditLogEntry, "entity_type" | "entity_id" | "details">) {
  const title = typeof entry.details.title === "string" ? entry.details.title : "";
  const warName = typeof entry.details.war_name === "string" ? entry.details.war_name : "";
  const protocol = typeof entry.details.protocol === "number" ? `#${entry.details.protocol}` : "";
  return [protocol, title || warName || entry.entity_id || auditEntityLabel(entry.entity_type)].filter(Boolean).join(" — ");
}
