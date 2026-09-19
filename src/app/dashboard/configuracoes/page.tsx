import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsPanel } from "./settings-panel";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,war_name,rank,email")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/dashboard");

  return <SettingsPanel initialProfile={{
    ...profile,
    email: profile.email || user.email || "",
    avatar_url: typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null,
  }} />;
}
