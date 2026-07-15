export type AccessLevel = "user" | "owner";

export type DemandStatus = "aberta" | "em_andamento" | "concluida" | "cancelada";
export type DemandPriority = "baixa" | "normal" | "alta" | "urgente";

export interface Demand {
  id: string;
  protocol: number;
  title: string;
  description: string;
  requesting_unit: string;
  priority: DemandPriority;
  status: DemandStatus;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  assigned_to: string | null;
}

export interface DemandHistory {
  id: number;
  demand_id: string;
  actor_id: string;
  event: "INSERT" | "UPDATE" | "DELETE";
  previous_data: Partial<Demand> | null;
  new_data: Partial<Demand> | null;
  created_at: string;
}

export interface DemandComment {
  id: number;
  demand_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export type EventType = "solenidade" | "reuniao" | "entrevista" | "cobertura" | "visita" | "outro";
export type EventStatus = "planejado" | "confirmado" | "concluido" | "cancelado";
export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_type: EventType;
  status: EventStatus;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  location: string;
  responsible_unit: string;
  notes: string;
  demand_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
