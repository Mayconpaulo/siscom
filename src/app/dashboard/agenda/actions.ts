"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EventActionState = { error?: string };
type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

function participantIds(formData: FormData) {
  try {
    const parsed = JSON.parse(String(formData.get("participant_ids") || "[]"));
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

async function syncParticipants(supabase: SupabaseServerClient, eventId: string, desiredIds: string[]) {
  const { data, error } = await supabase.from("event_participants").select("profile_id").eq("event_id", eventId);
  if (error) return error.message;
  const currentIds = (data || []).map((item) => item.profile_id);
  const removeIds = currentIds.filter((id) => !desiredIds.includes(id));
  const addIds = desiredIds.filter((id) => !currentIds.includes(id));
  if (removeIds.length) {
    const result = await supabase.from("event_participants").delete().eq("event_id", eventId).in("profile_id", removeIds);
    if (result.error) return result.error.message;
  }
  if (addIds.length) {
    const result = await supabase.from("event_participants").insert(addIds.map((profileId) => ({ event_id: eventId, profile_id: profileId })));
    if (result.error) return result.error.message;
  }
}

function eventValues(formData: FormData, userId?: string) {
  const demand = String(formData.get("demand_id") || "");
  return {
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || ""),
    event_type: String(formData.get("event_type") || "outro"),
    status: String(formData.get("status") || "planejado"),
    starts_at: new Date(String(formData.get("starts_at") || "")).toISOString(),
    ends_at: new Date(String(formData.get("ends_at") || "")).toISOString(),
    all_day: formData.get("all_day") === "on",
    location: String(formData.get("location") || ""),
    responsible_unit: String(formData.get("responsible_unit") || ""),
    notes: String(formData.get("notes") || ""),
    demand_id: demand || null,
    ...(userId ? { created_by: userId } : {}),
  };
}

function validateEvent(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const starts = String(formData.get("starts_at") || "");
  const ends = String(formData.get("ends_at") || "");
  if (title.length < 3 || !starts || !ends) return "Informe título, início e término.";
  if (new Date(ends) < new Date(starts)) return "O término não pode ser anterior ao início.";
}

export async function createEvent(_: EventActionState, formData: FormData): Promise<EventActionState> {
  const validation = validateEvent(formData);
  if (validation) return { error: validation };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou." };
  const { data: event, error } = await supabase.from("events").insert(eventValues(formData, user.id)).select("id").single();
  if (error || !event) return { error: error?.message || "Não foi possível criar a atividade." };
  const participantError = await syncParticipants(supabase, event.id, participantIds(formData));
  if (participantError) return { error: participantError };
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard");
  redirect("/dashboard/agenda");
}

export async function updateEvent(id: string, _: EventActionState, formData: FormData): Promise<EventActionState> {
  const validation = validateEvent(formData);
  if (validation) return { error: validation };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou." };
  const { error } = await supabase.from("events").update(eventValues(formData)).eq("id", id);
  if (error) return { error: error.message };
  const participantError = await syncParticipants(supabase, id, participantIds(formData));
  if (participantError) return { error: participantError };
  revalidatePath("/dashboard/agenda");
  revalidatePath(`/dashboard/agenda/${id}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/agenda/${id}`);
}

export async function deleteEvent(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("events").delete().eq("id", String(formData.get("id")));
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard");
  redirect("/dashboard/agenda");
}
