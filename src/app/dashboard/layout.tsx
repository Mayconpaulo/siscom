import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/server";
import type { SiscomNotification } from "@/lib/types";
import { isDesignatedOwner } from "@/lib/access-control";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  let isOwner = false;
  let notifications: SiscomNotification[] = [];
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");
    const [{ data: profile }, { data: notificationData }] = await Promise.all([
      supabase.from("profiles").select("access_level,active,email").eq("id", data.user.id).maybeSingle(),
      supabase.from("notifications").select("id,user_id,demand_id,kind,title,message,read_at,created_at").eq("user_id", data.user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    if (!profile?.active) redirect("/login?acesso=inativo");
    isOwner = isDesignatedOwner(data.user.email, profile);
    notifications = (notificationData || []) as SiscomNotification[];
  }
  return <div className="flex min-h-dvh"><Sidebar isOwner={isOwner} notifications={notifications} /><main className="min-w-0 flex-1">{children}</main></div>;
}
