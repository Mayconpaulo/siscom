"use client";

import { useEffect, useState } from "react";
import { Mail, Save, ShieldCheck, UserCheck, UserRoundPlus, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type User = { id: string; full_name: string; rank: string; email: string; access_level: "user" | "owner"; active: boolean; last_sign_in_at: string | null; invited_at: string | null; email_confirmed_at: string | null };

export function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function load() {
    const response = await fetch("/api/owner/users", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) setError(json.error); else setUsers(json.users);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setSending(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/owner/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "invite", full_name: data.get("full_name"), rank: data.get("rank"), email: data.get("email") }) });
    const json = await response.json();
    if (!response.ok) setError(json.error); else { setMessage(json.message); form.reset(); await load(); }
    setSending(false);
  }

  async function update(user: User) {
    setError(""); setMessage("");
    const response = await fetch("/api/owner/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(user) });
    const json = await response.json();
    if (!response.ok) setError(json.error); else { setMessage(json.message); await load(); }
  }

  async function sendAccess(user: User) {
    setError(""); setMessage("");
    const response = await fetch("/api/owner/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset_password", id: user.id }) });
    const json = await response.json();
    if (!response.ok) setError(json.error); else setMessage(json.message);
  }

  function change(id: string, values: Partial<User>) { setUsers((current) => current.map((user) => user.id === id ? { ...user, ...values } : user)); }

  return <div className="space-y-6">
    <form onSubmit={invite} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-emerald-950 text-amber-300"><UserRoundPlus size={19} /></div><div><h2 className="font-bold">Convidar novo usuário</h2><p className="text-xs text-slate-500">O usuário receberá um link para criar a senha.</p></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_180px_1fr_auto]"><Input name="full_name" placeholder="Nome completo" required minLength={3} /><Input name="rank" placeholder="Graduação" required /><Input name="email" type="email" placeholder="E-mail" required /><Button disabled={sending} className="bg-emerald-950">{sending ? "Enviando..." : "Enviar convite"}</Button></div></form>
    {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <div><div className="mb-3 flex items-end justify-between"><div><h2 className="text-lg font-bold">Usuários do SISCOM</h2><p className="text-xs text-slate-500">{users.filter((user) => user.active).length} ativos de {users.length} cadastrados</p></div></div>
      {loading ? <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500">Carregando usuários...</div> : users.length === 0 ? <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">Nenhum usuário cadastrado.</div> : <div className="space-y-3">{users.map((user) => <article key={user.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${!user.active ? "opacity-70" : ""}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="min-w-0 xl:w-64"><div className="flex items-center gap-2"><span className={`grid size-9 place-items-center rounded-lg ${user.access_level === "owner" ? "bg-amber-100 text-amber-800" : user.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{user.access_level === "owner" ? <ShieldCheck size={17} /> : user.active ? <UserCheck size={17} /> : <UserX size={17} />}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{user.rank ? `${user.rank}. ` : ""}{user.full_name || "Nome não informado"}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div></div><div className="mt-2 flex gap-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${user.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{user.active ? "ATIVO" : "INATIVO"}</span>{user.access_level === "owner" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">PROPRIETÁRIO</span>}</div></div>
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Nome</label><Input value={user.full_name} onChange={(event) => change(user.id, { full_name: event.target.value })} /></div><div><label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Graduação</label><Input value={user.rank} onChange={(event) => change(user.id, { rank: event.target.value })} /></div></div>
          <div className="text-xs text-slate-500 xl:w-40"><p className="font-semibold text-slate-600">Último acesso</p><p>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("pt-BR") : "Ainda não acessou"}</p></div>
          <div className="flex flex-wrap gap-2 xl:w-72 xl:justify-end"><Button type="button" variant="outline" onClick={() => sendAccess(user)}><Mail size={15} />Enviar acesso</Button><Button type="button" variant="outline" onClick={() => update(user)}><Save size={15} />Salvar</Button>{user.access_level !== "owner" && <Button type="button" variant="outline" className={user.active ? "text-red-700" : "text-emerald-800"} onClick={() => { const next = { ...user, active: !user.active }; change(user.id, { active: next.active }); update(next); }}>{user.active ? <><UserX size={15} />Desativar</> : <><UserCheck size={15} />Ativar</>}</Button>}</div>
        </div>
      </article>)}</div>}
    </div>
  </div>;
}
