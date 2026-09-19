"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FirstAccessForm({ warName }: { warName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    if (password !== String(data.get("confirm_password"))) { setError("As novas senhas não são iguais."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/account/complete-profile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: data.get("full_name"), rank: data.get("rank"), email: data.get("email"), password }),
      });
      const json = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) { setError(json?.error || "Não foi possível concluir o cadastro."); return; }
      router.replace("/dashboard"); router.refresh();
    } catch {
      setError("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={submit} className="space-y-4">
    <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Nome de guerra</label><Input value={warName} disabled className="bg-slate-100 font-semibold" /></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-semibold">Nome completo</label><Input name="full_name" placeholder="Nome completo" required minLength={5} autoComplete="name" /></div><div><label className="mb-1.5 block text-sm font-semibold">Graduação</label><Input name="rank" placeholder="Ex.: Cabo" required /></div><div><label className="mb-1.5 block text-sm font-semibold">E-mail</label><Input name="email" type="email" placeholder="seuemail@exemplo.com" required autoComplete="email" /></div><div><label className="mb-1.5 block text-sm font-semibold">Nova senha</label><Input name="password" type="password" required minLength={8} autoComplete="new-password" /></div><div><label className="mb-1.5 block text-sm font-semibold">Confirmar nova senha</label><Input name="confirm_password" type="password" required minLength={8} autoComplete="new-password" /></div></div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <Button className="h-11 w-full bg-emerald-950" disabled={loading}>{loading && <LoaderCircle size={18} className="animate-spin" />}{loading ? "Salvando cadastro..." : "Concluir cadastro e entrar"}</Button>
  </form>;
}
