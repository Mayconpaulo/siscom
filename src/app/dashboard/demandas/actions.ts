"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type DemandActionState = { error?: string; success?: boolean };

function values(formData: FormData) {
  const assignedTo = String(formData.get("assigned_to") || "");
  const dueAt = String(formData.get("due_at") || "");
  return {
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    requesting_unit: String(formData.get("requesting_unit") || "").trim(),
    priority: String(formData.get("priority") || "normal"),
    status: String(formData.get("status") || "aberta"),
    due_at: dueAt ? new Date(dueAt).toISOString() : null,
    assigned_to: assignedTo || null,
  };
}

function validate(formData: FormData) {
  const data = values(formData);
  if (data.title.length < 3 || !data.description || !data.requesting_unit) return "Preencha título, unidade solicitante e descrição.";
}

export async function createDemand(_: DemandActionState, formData: FormData): Promise<DemandActionState> {
  const validation = validate(formData);
  if (validation) return { error: validation };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou." };
  const { data, error } = await supabase.from("demands").insert({ ...values(formData), created_by: user.id }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/dashboard/demandas"); revalidatePath("/dashboard");
  redirect(`/dashboard/demandas/${data.id}`);
}

export async function updateDemand(id: string, _: DemandActionState, formData: FormData): Promise<DemandActionState> {
  const validation = validate(formData);
  if (validation) return { error: validation };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou." };
  const { error } = await supabase.from("demands").update(values(formData)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/demandas"); revalidatePath(`/dashboard/demandas/${id}`); revalidatePath("/dashboard");
  redirect(`/dashboard/demandas/${id}`);
}

export async function addDemandComment(id: string, _: DemandActionState, formData: FormData): Promise<DemandActionState> {
  const content = String(formData.get("content") || "").trim();
  if (content.length < 2) return { error: "Escreva uma atualização antes de registrar." };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou." };
  const { error } = await supabase.from("demand_comments").insert({ demand_id: id, author_id: user.id, content });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/demandas/${id}`);
  return { success: true };
}
