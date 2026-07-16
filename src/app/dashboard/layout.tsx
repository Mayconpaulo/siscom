import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  let isOwner = false;
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");
    const { data: profile } = await supabase.from("profiles").select("access_level,active").eq("id", data.user.id).maybeSingle();
    if (!profile?.active) redirect("/login?acesso=inativo");
    isOwner = profile.access_level === "owner";
  }
  return <div className="flex min-h-dvh"><Sidebar isOwner={isOwner} /><main className="min-w-0 flex-1">{children}</main></div>;
}

