"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
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
      router.replace(!profile?.profile_completed || profile.must_change_password ? "/primeiro-acesso" : "/dashboard");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível autenticar.");
    } finally { setLoading(false); }
  }

  return <form onSubmit={submit} className="space-y-5"><div><label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="login">Nome de guerra ou e-mail</label><div className="relative"><UserRound className="absolute left-3.5 top-3.5 text-slate-400" size={17} /><Input className="pl-10" id="login" name="login" autoComplete="username" placeholder="Ex.: SILVA" required /></div></div><div><div className="mb-2 flex justify-between"><label className="text-sm font-semibold text-slate-700" htmlFor="password">Senha</label><Link href="/esqueci-senha" className="text-xs font-semibold text-emerald-800 hover:underline">Esqueci minha senha</Link></div><div className="relative"><LockKeyhole className="absolute left-3.5 top-3.5 text-slate-400" size={17} /><Input className="px-10" id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required /><button type="button" onClick={() => setVisible(!visible)} aria-label="Mostrar senha" className="absolute right-3.5 top-3 text-slate-400">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>{error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<Button className="w-full bg-emerald-950 hover:bg-emerald-900" disabled={loading}>{loading && <LoaderCircle className="animate-spin" size={18} />}Acessar ambiente seguro</Button><p className="text-center text-xs leading-5 text-slate-500">Acesso restrito a usuários autorizados. Todas as ações são registradas para fins de auditoria.</p></form>;
}

