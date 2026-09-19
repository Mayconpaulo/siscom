"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, CakeSlice, CalendarDays, ChevronLeft, FileClock, FileImage, FileText, IdCard, LayoutDashboard, LogOut, Menu, ScrollText, Settings, Users, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { SiscomNotification } from "@/lib/types";

const items = [
  { label: "Visão geral", href: "/dashboard", icon: LayoutDashboard },
  { label: "Demandas", href: "/dashboard/demandas", icon: FileText },
  { label: "Agenda", href: "/dashboard/agenda", icon: CalendarDays },
  { label: "Crachás", href: "/dashboard/crachas", icon: IdCard },
  { label: "Assistente Militar", href: "/dashboard/assistente", icon: Bot },
  { label: "Gerador de prismas", href: "/dashboard/ferramentas/prismas", icon: FileImage },
  { label: "Cartões de aniversário", href: "/dashboard/ferramentas/cartoes-aniversario", icon: CakeSlice },
  { label: "Referência elogiosa", href: "/dashboard/ferramentas/referencia-elogiosa", icon: ScrollText },
];

export function Sidebar({ isOwner = false, notifications = [] }: { isOwner?: boolean; notifications?: SiscomNotification[] }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const active = (href: string) => href === "/dashboard" ? path === href : path.startsWith(href);
  async function logout() {
    try { await createClient().auth.signOut(); }
    finally { router.replace("/login"); router.refresh(); }
  }
  return <>
    <NotificationsBell initialNotifications={notifications} mobile />
    <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 items-end rounded-2xl border border-white/20 bg-emerald-950 px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-2 text-white shadow-2xl lg:hidden" aria-label="Navegação principal">
      <Link href="/dashboard" className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold text-emerald-100/70", active("/dashboard") && "text-amber-300")}><LayoutDashboard size={19} /><span>Início</span></Link>
      <Link href="/dashboard/crachas" className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold text-emerald-100/70", active("/dashboard/crachas") && "text-amber-300")}><IdCard size={19} /><span>Crachás</span></Link>
      <button onClick={() => setOpen(true)} className="relative -mt-7 flex min-w-0 flex-col items-center gap-1 text-[10px] font-bold text-amber-300" aria-label="Abrir menu completo"><span className="grid size-14 place-items-center rounded-2xl border-4 border-slate-50 bg-amber-300 text-emerald-950 shadow-lg"><Menu size={24} /></span><span>Menu</span></button>
      <Link href="/dashboard/agenda" className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold text-emerald-100/70", active("/dashboard/agenda") && "text-amber-300")}><CalendarDays size={19} /><span>Agenda</span></Link>
      <Link href="/dashboard/ferramentas/prismas" className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold text-emerald-100/70", active("/dashboard/ferramentas/prismas") && "text-amber-300")}><FileImage size={19} /><span>Prismas</span></Link>
    </nav>
    {open && <button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
    <aside className={cn("fixed inset-y-0 left-0 z-40 flex flex-col bg-emerald-950 text-white transition-all duration-300 lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full", compact ? "w-[84px]" : "w-[268px]")}>
      <div className="flex h-20 items-center justify-between gap-2 border-b border-white/10 px-5"><Brand compact={compact} inverse /><div className="flex items-center gap-1">{!compact && <div className="hidden lg:block"><NotificationsBell initialNotifications={notifications} /></div>}<button onClick={() => setOpen(false)} className="lg:hidden"><X /></button></div></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">{items.map(({ label, href, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-emerald-100/70 transition hover:bg-white/10 hover:text-white", active(href) && "bg-amber-300 text-emerald-950 hover:bg-amber-300 hover:text-emerald-950")}><Icon size={19} />{!compact && label}</Link>)}
        {isOwner && <Link href="/dashboard/usuarios" onClick={() => setOpen(false)} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-emerald-100/70 transition hover:bg-white/10 hover:text-white", active("/dashboard/usuarios") && "bg-amber-300 text-emerald-950")}><Users size={19} />{!compact && "Gerenciar usuários"}</Link>}
        {isOwner && <Link href="/dashboard/auditoria" onClick={() => setOpen(false)} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-emerald-100/70 transition hover:bg-white/10 hover:text-white", active("/dashboard/auditoria") && "bg-amber-300 text-emerald-950")}><FileClock size={19} />{!compact && "Auditoria"}</Link>}
      </nav>
      <div className="border-t border-white/10 p-3">{compact && <div className="mb-1 hidden justify-center lg:flex"><NotificationsBell initialNotifications={notifications} /></div>}<Link href="/dashboard/configuracoes" onClick={() => setOpen(false)} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-emerald-100/70 transition hover:bg-white/10 hover:text-white", active("/dashboard/configuracoes") && "bg-amber-300 text-emerald-950 hover:bg-amber-300 hover:text-emerald-950")}><Settings size={19} />{!compact && "Configurações"}</Link><button onClick={logout} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-emerald-100/70 hover:bg-white/10"><LogOut size={19} />{!compact && "Sair do sistema"}</button></div>
      <button onClick={() => setCompact(!compact)} className="absolute -right-3 top-24 hidden size-7 place-items-center rounded-full border bg-white text-emerald-950 shadow lg:grid"><ChevronLeft size={15} className={cn("transition", compact && "rotate-180")} /></button>
    </aside>
    <div className={cn("hidden transition-all lg:block", compact ? "w-[84px]" : "w-[268px]")} />
  </>;
}
