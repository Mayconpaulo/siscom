"use client";

import Link from "next/link";
import { Bell, CheckCheck, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SiscomNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NotificationsBell({ initialNotifications, mobile = false }: { initialNotifications: SiscomNotification[]; mobile?: boolean }) {
  const [items, setItems] = useState(initialNotifications);
  const [open, setOpen] = useState(false);
  const unread = items.filter((item) => !item.read_at).length;

  async function markRead(id: number) {
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: readAt } : item));
    await createClient().from("notifications").update({ read_at: readAt }).eq("id", id);
  }

  async function markAllRead() {
    const readAt = new Date().toISOString();
    const unreadIds = items.filter((item) => !item.read_at).map((item) => item.id);
    if (!unreadIds.length) return;
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || readAt })));
    await createClient().from("notifications").update({ read_at: readAt }).in("id", unreadIds);
  }

  return <div className={cn("relative", mobile && "fixed right-4 top-4 z-50 lg:hidden")}>
    <button type="button" onClick={() => setOpen((current) => !current)} className={cn("relative grid size-10 place-items-center rounded-xl border transition", mobile ? "border-emerald-900/10 bg-white text-emerald-950 shadow-lg dark:border-white/10 dark:bg-slate-900 dark:text-amber-300" : "border-white/10 bg-white/10 text-emerald-100 hover:bg-white/15")} aria-label={unread ? `${unread} notificações não lidas` : "Notificações"} aria-expanded={open}>
      <Bell size={19} />
      {unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-amber-300 px-1 text-[10px] font-extrabold leading-5 text-emerald-950">{unread > 9 ? "9+" : unread}</span>}
    </button>
    {open && <div className={cn("z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl", mobile ? "fixed right-4 top-16" : "absolute right-0 top-12")}>
      <div className="flex items-center justify-between border-b p-4"><div><p className="text-sm font-bold">Notificações</p><p className="text-[11px] text-slate-500">{unread ? `${unread} não lida${unread === 1 ? "" : "s"}` : "Tudo em dia"}</p></div><div className="flex items-center gap-1">{unread > 0 && <button type="button" onClick={markAllRead} className="rounded-lg p-2 text-emerald-700 hover:bg-muted dark:text-amber-300" aria-label="Marcar todas como lidas"><CheckCheck size={17} /></button>}<button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-muted" aria-label="Fechar notificações"><X size={17} /></button></div></div>
      <div className="max-h-96 overflow-y-auto">{items.length === 0 ? <div className="p-8 text-center"><Bell className="mx-auto mb-3 text-slate-300" /><p className="text-sm font-semibold">Nenhuma notificação</p><p className="mt-1 text-xs text-slate-500">Novas atribuições aparecerão aqui.</p></div> : items.map((item) => <Link key={item.id} href={item.demand_id ? `/dashboard/demandas/${item.demand_id}` : "/dashboard/demandas"} onClick={() => { markRead(item.id); setOpen(false); }} className={cn("block border-b p-4 transition last:border-0 hover:bg-muted", !item.read_at && "bg-amber-50/70 dark:bg-amber-300/10")}><div className="flex gap-3">{!item.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-400" />}<div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.message}</p><time className="mt-2 block text-[10px] text-slate-400">{new Date(item.created_at).toLocaleString("pt-BR")}</time></div></div></Link>)}</div>
    </div>}
  </div>;
}
