"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { postLoginDestination } from "@/lib/access-control";

export function LoginForm() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const login = String(data.get("login") || "").trim();
    try {
      let email = login.toLowerCase();
      if (!login.includes("@")) {
        const response = await fetch("/api/auth/resolve-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login }) });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Credenciais inválidas.");
        email = json.email;
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: String(data.get("password")) });
      if (signInError) throw new Error("Nome de guerra ou senha inválidos.");
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("profile_completed,must_change_password").eq("id", user!.id).single();
      router.replace(postLoginDestination(profile));
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={submit} className="space-y-5">
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="login">Nome de guerra ou e-mail</label>
      <div className="relative"><UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><Input className="h-12 rounded-xl border-slate-300 bg-white/80 pl-11 text-[15px] shadow-sm transition focus-visible:border-[#1c6248] focus-visible:ring-[#1c6248]/20 dark:border-slate-700 dark:bg-slate-900/80" id="login" name="login" autoComplete="username" placeholder="Ex.: SILVA" required /></div>
    </div>
    <div>
      <div className="mb-2 flex items-center justify-between"><label className="text-sm font-semibold text-slate-700" htmlFor="password">Senha</label><Link href="/esqueci-senha" className="text-xs font-semibold text-[#1c6248] transition hover:text-[#a71919] hover:underline dark:text-amber-300">Esqueci minha senha</Link></div>
      <div className="relative"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><Input className="h-12 rounded-xl border-slate-300 bg-white/80 px-11 text-[15px] shadow-sm transition focus-visible:border-[#1c6248] focus-visible:ring-[#1c6248]/20 dark:border-slate-700 dark:bg-slate-900/80" id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <Button className="group h-12 w-full rounded-xl bg-[#123f2f] text-sm font-bold text-white shadow-[0_10px_24px_rgba(18,63,47,.18)] transition hover:bg-[#0b3325]" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight className="transition-transform group-hover:translate-x-0.5" size={18} />}Acessar ambiente seguro</Button>
    <p className="text-center text-[11px] leading-5 text-slate-400">Uso exclusivo de pessoal autorizado.</p>
  </form>;
}
