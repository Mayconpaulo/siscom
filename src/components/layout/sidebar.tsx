"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Bot, CalendarDays, ChevronLeft, FileImage, FileText, LayoutDashboard, LogOut, Menu, Newspaper, Radio, Settings, Users, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const items = [
  { label: "Visão geral", href: "/dashboard", icon: LayoutDashboard },
  { label: "Demandas", href: "/dashboard/demandas", icon: FileText },
  { label: "Agenda", href: "/dashboard/agenda", icon: CalendarDays },
  { label: "Assistente de Cerimonial", href: "/dashboard/assistente", icon: Bot },
  { label: "Gerador de prismas", href: "/dashboard/ferramentas/prismas", icon: FileImage },
  { label: "Imprensa", href: "/dashboard/imprensa", icon: Newspaper },
  { label: "Mídias", href: "/dashboard/midias", icon: Radio },
  { label: "Relatórios", href: "/dashboard/relatorios", icon: BarChart3 },
];

export function Sidebar({ isOwner = false }: { isOwner?: boolean }) {
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
    <button onClick={() => setOpen(true)} className="fixed left-4 top-4 z-30 grid size-11 place-items-center rounded-xl bg-emerald-950 text-white shadow-lg lg:hidden" aria-label="Abrir menu"><Menu /></button>
    {open && <button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
    <aside className={cn("fixed inset-y-0 left-0 z-40 flex flex-col bg-emerald-950 text-white transition-all duration-300 lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full", compact ? "w-[84px]" : "w-[268px]")}>
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-5"><Brand compact={compact} inverse /><button onClick={() => setOpen(false)} className="lg:hidden"><X /></button></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">{items.map(({ label, href, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-emerald-100/70 transition hover:bg-white/10 hover:text-white", active(href) && "bg-amber-300 text-emerald-950 hover:bg-amber-300 hover:text-emerald-950")}><Icon size={19} />{!compact && label}</Link>)}
        {isOwner && <Link href="/dashboard/usuarios" onClick={() => setOpen(false)} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-emerald-100/70 transition hover:bg-white/10 hover:text-white", active("/dashboard/usuarios") && "bg-amber-300 text-emerald-950")}><Users size={19} />{!compact && "Gerenciar usuários"}</Link>}
      </nav>
      <div className="border-t border-white/10 p-3"><Link href="/dashboard/configuracoes" className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-emerald-100/70 hover:bg-white/10"><Settings size={19} />{!compact && "Configurações"}</Link><button onClick={logout} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-emerald-100/70 hover:bg-white/10"><LogOut size={19} />{!compact && "Sair do sistema"}</button></div>
      <button onClick={() => setCompact(!compact)} className="absolute -right-3 top-24 hidden size-7 place-items-center rounded-full border bg-white text-emerald-950 shadow lg:grid"><ChevronLeft size={15} className={cn("transition", compact && "rotate-180")} /></button>
    </aside>
    <div className={cn("hidden transition-all lg:block", compact ? "w-[84px]" : "w-[268px]")} />
  </>;
}
