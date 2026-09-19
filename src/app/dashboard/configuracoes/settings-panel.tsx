"use client";

import { useRef, useState } from "react";
import { Bell, Camera, Check, ImagePlus, Laptop, LoaderCircle, LockKeyhole, Moon, Save, Sun, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTheme, type ThemePreference } from "@/components/theme-provider";
import { profileDisplayName, profileInitials } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Profile = {
  full_name: string;
  war_name: string;
  rank: string;
  email: string;
  avatar_url: string | null;
};

const themes: { value: ThemePreference; label: string; description: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", description: "Interface sempre clara", icon: Sun },
  { value: "dark", label: "Escuro", description: "Mais conforto em pouca luz", icon: Moon },
  { value: "system", label: "Sistema", description: "Segue o dispositivo", icon: Laptop },
];

export function SettingsPanel({ initialProfile }: { initialProfile: Profile }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const fileInput = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(nextAvatarUrl: string | null = draft.avatar_url) {
    setSaving(true); setError(""); setMessage("");
    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, avatar_url: nextAvatarUrl }),
    });
    const json = await response.json();
    if (!response.ok) setError(json.error || "Não foi possível atualizar o perfil.");
    else {
      const next = { ...draft, ...json.profile };
      setProfile(next); setDraft(next); setMessage(json.message); router.refresh();
    }
    setSaving(false);
    return response.ok;
  }

  async function uploadPhoto(file?: File) {
    if (!file) return;
    setError(""); setMessage("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Use uma foto JPG, PNG ou WebP."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("A foto deve ter no máximo 2 MB."); return; }
    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Sua sessão expirou."); setUploading(false); return; }
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
    if (uploadError) { setError(uploadError.message); setUploading(false); return; }
    const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
    setDraft((current) => ({ ...current, avatar_url: avatarUrl }));
    const ok = await save(avatarUrl);
    if (!ok) setDraft((current) => ({ ...current, avatar_url: profile.avatar_url }));
    setUploading(false);
  }

  async function removePhoto() {
    setUploading(true); setError(""); setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Sua sessão expirou."); setUploading(false); return; }
    const { data: files } = await supabase.storage.from("profile-photos").list(user.id);
    if (files?.length) await supabase.storage.from("profile-photos").remove(files.map((file) => `${user.id}/${file.name}`));
    setDraft((current) => ({ ...current, avatar_url: null }));
    await save(null);
    setUploading(false);
  }

  return <div className="min-h-dvh bg-slate-50 p-5 pt-20 sm:p-8 lg:pt-8"><div className="mx-auto max-w-6xl">
    <header className="mb-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700 dark:text-amber-300">Preferências pessoais</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Configurações</h1><p className="mt-1 text-sm text-slate-500">Atualize seu perfil e personalize a aparência do SISCOM.</p></header>

    {(error || message) && <div role="status" className={cn("mb-5 rounded-xl border p-3 text-sm", error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>{error || message}</div>}

    <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_.8fr]">
      <Card className="overflow-hidden"><div className="border-b p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-950 text-amber-300"><UserRound size={19} /></span><div><h2 className="font-bold">Meu perfil</h2><p className="text-xs text-slate-500">O tratamento no sistema usa posto/graduação e nome de guerra.</p></div></div></div>
        <form onSubmit={(event) => { event.preventDefault(); save(); }} className="p-5 sm:p-6">
          <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-950 text-2xl font-bold text-amber-300 shadow-sm">{draft.avatar_url ? <img src={draft.avatar_url} alt={`Foto de ${profileDisplayName(draft)}`} className="size-full object-cover" /> : profileInitials(draft)}<button type="button" onClick={() => fileInput.current?.click()} className="absolute inset-x-0 bottom-0 grid h-8 place-items-center bg-slate-950/70 text-white" aria-label="Alterar foto"><Camera size={15} /></button></div>
            <div><p className="font-bold text-slate-900">{profileDisplayName(draft)}</p><p className="mt-1 text-sm text-slate-500">JPG, PNG ou WebP, com até 2 MB.</p><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileInput.current?.click()}>{uploading ? <LoaderCircle size={15} className="animate-spin" /> : <ImagePlus size={15} />}Escolher foto</Button>{draft.avatar_url && <Button type="button" size="sm" variant="ghost" className="text-red-700 dark:text-red-400" disabled={uploading} onClick={removePhoto}><Trash2 size={15} />Remover</Button>}</div><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => uploadPhoto(event.target.files?.[0])} /></div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-semibold">Nome completo</label><Input value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} minLength={5} required /><p className="mt-1.5 text-xs text-slate-500">Usado somente para controle administrativo.</p></div><div><label className="mb-1.5 block text-sm font-semibold">Posto/graduação</label><Input value={draft.rank} onChange={(event) => setDraft({ ...draft, rank: event.target.value })} minLength={2} required placeholder="Ex.: Cabo" /></div><div><label className="mb-1.5 block text-sm font-semibold">Nome de guerra</label><Input value={draft.war_name} onChange={(event) => setDraft({ ...draft, war_name: event.target.value })} minLength={2} required /></div><div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-semibold">E-mail</label><Input value={draft.email} disabled /><p className="mt-1.5 text-xs text-slate-500">Para alterar o e-mail de acesso, procure o proprietário do sistema.</p></div></div>
          <div className="mt-6 flex justify-end"><Button disabled={saving || uploading} className="bg-emerald-950 dark:bg-amber-300">{saving ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}{saving ? "Salvando..." : "Salvar perfil"}</Button></div>
        </form>
      </Card>

      <div className="space-y-6"><Card><div className="border-b p-5"><h2 className="font-bold">Aparência</h2><p className="text-xs text-slate-500">Escolha como o SISCOM aparece neste dispositivo.</p></div><div className="space-y-2 p-3">{themes.map(({ value, label, description, icon: Icon }) => <button key={value} type="button" onClick={() => setTheme(value)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-muted", theme === value && "border-emerald-700 bg-emerald-50 dark:border-amber-300 dark:bg-amber-300/10")}><span className="grid size-10 place-items-center rounded-lg bg-muted text-slate-700"><Icon size={18} /></span><span className="flex-1"><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-slate-500">{description}</span></span>{theme === value && <Check size={17} className="text-emerald-700 dark:text-amber-300" />}</button>)}</div></Card>
        <Card><div className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Próximas configurações</p><div className="mt-4 space-y-4"><div className="flex gap-3"><Bell size={18} className="mt-0.5 text-emerald-700 dark:text-amber-300" /><div><p className="text-sm font-semibold">Notificações</p><p className="text-xs text-slate-500">Alertas de prazos, demandas e agenda.</p></div></div><div className="flex gap-3"><LockKeyhole size={18} className="mt-0.5 text-emerald-700 dark:text-amber-300" /><div><p className="text-sm font-semibold">Segurança</p><p className="text-xs text-slate-500">Sessões ativas e alteração de senha.</p></div></div></div><span className="mt-5 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">PLANEJADO</span></div></Card>
      </div>
    </div>
  </div></div>;
}
