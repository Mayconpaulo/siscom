"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EventActionState = { error?: string };

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
  const { error } = await supabase.from("events").insert(eventValues(formData, user.id));
  if (error) return { error: error.message };
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
