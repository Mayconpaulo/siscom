import Image from "next/image";
import { redirect } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Acesso seguro" };

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (data.user) redirect("/dashboard");

  return <main className="min-h-dvh bg-[#071c16] lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(440px,.88fr)]">
    <section className="relative flex min-h-[290px] overflow-hidden text-white lg:min-h-dvh lg:items-center lg:justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_44%_44%,rgba(35,111,75,.58),transparent_42%),linear-gradient(145deg,#0b3325_0%,#061a14_62%,#04120e_100%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(217,176,82,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(217,176,82,.18)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="absolute inset-y-0 right-0 hidden w-px bg-gradient-to-b from-transparent via-[#d6ae54]/70 to-transparent lg:block" />
      <div className="absolute -left-28 top-1/2 size-[520px] -translate-y-1/2 rounded-full border border-[#e1bd68]/10 lg:left-1/2 lg:size-[650px] lg:-translate-x-1/2" />
      <div className="absolute -left-16 top-1/2 size-[390px] -translate-y-1/2 rounded-full border border-[#e1bd68]/10 lg:left-1/2 lg:size-[520px] lg:-translate-x-1/2" />

      <div className="relative z-10 flex w-full items-center gap-5 px-6 py-7 sm:px-10 lg:h-full lg:max-w-3xl lg:flex-col lg:justify-center lg:px-12 lg:py-10">
        <div className="absolute left-8 top-8 hidden items-center gap-3 lg:flex">
          <span className="grid size-9 place-items-center rounded-lg border border-[#e1bd68]/35 bg-black/15 text-[#e1bd68]"><ShieldCheck size={18} /></span>
          <div><p className="text-xs font-bold tracking-[.24em] text-[#e1bd68]">SISCOM</p><p className="text-[10px] uppercase tracking-[.18em] text-white/45">Ambiente institucional</p></div>
        </div>

        <div className="relative shrink-0">
          <div className="absolute inset-x-[18%] bottom-[6%] h-12 rounded-full bg-black/55 blur-2xl lg:h-16" />
          <Image src="/brasao-1-bimec.png" alt="Brasão do 1º Batalhão de Infantaria Mecanizado (Escola)" width={1340} height={1800} priority className="relative h-[215px] w-auto drop-shadow-[0_18px_32px_rgba(0,0,0,.48)] sm:h-[245px] lg:h-[56vh] lg:max-h-[600px] lg:min-h-[440px]" />
        </div>

        <div className="min-w-0 lg:text-center">
          <div className="mb-3 hidden items-center justify-center gap-3 lg:flex"><span className="h-px w-12 bg-[#a71919]" /><span className="size-1.5 rotate-45 bg-[#d9b052]" /><span className="h-px w-12 bg-[#a71919]" /></div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#e1bd68] sm:text-xs">Exército Brasileiro</p>
          <h1 className="mt-1 max-w-sm text-xl font-bold leading-tight sm:text-2xl lg:max-w-none lg:text-3xl">1º Batalhão de Infantaria<br className="hidden lg:block" /> Mecanizado (Escola)</h1>
          <p className="mt-2 hidden text-xs uppercase tracking-[.18em] text-white/45 lg:block">Regimento Sampaio</p>
        </div>
      </div>
    </section>

    <section className="relative flex min-h-[calc(100dvh-290px)] items-center justify-center overflow-hidden rounded-t-[28px] bg-[#f6f4ef] px-5 py-9 sm:px-10 lg:min-h-dvh lg:rounded-none lg:px-12 lg:py-12 dark:bg-[#0d1713]">
      <div className="absolute right-0 top-0 size-64 translate-x-1/2 -translate-y-1/2 rounded-full border border-[#c7a358]/20" />
      <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-[#971b1e] via-[#d5ae58] to-[#0b553b] lg:left-auto lg:top-0 lg:h-full lg:w-1 lg:bg-gradient-to-b" />
      <div className="relative w-full max-w-[440px]">
        <div className="mb-8 flex items-center justify-between">
          <div><p className="text-[11px] font-extrabold uppercase tracking-[.22em] text-[#8a6a2f] dark:text-amber-300">Sistema Integrado</p><p className="mt-1 text-sm font-semibold text-[#173b2e] dark:text-emerald-100">Comunicação Social</p></div>
          <span className="grid size-11 place-items-center rounded-xl border border-[#d8c59b] bg-white/70 text-[#194b37] shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-amber-300"><LockKeyhole size={20} /></span>
        </div>

        <div className="mb-7">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#1c6248] dark:text-amber-300"><span className="h-px w-8 bg-[#a71919]" />Acesso seguro</p>
          <h2 className="text-3xl font-bold tracking-[-.035em] text-slate-950 sm:text-[2.15rem]">Bem-vindo ao SISCOM</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Entre com seu nome de guerra ou e-mail institucional.</p>
        </div>

        <LoginForm />

        <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-200/80 pt-5 text-[11px] text-slate-400"><ShieldCheck size={14} className="text-[#1c6248]" /><span>Conexão protegida • Acesso monitorado</span></div>
        <p className="mt-3 text-center text-[10px] uppercase tracking-[.12em] text-slate-400">© 2026 1º BIMEC (ES) • SISCOM</p>
      </div>
    </section>
  </main>;
}
