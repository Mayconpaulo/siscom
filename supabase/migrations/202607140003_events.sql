-- SISCOM Sprint 0.3 — agenda e eventos
create type public.event_type as enum ('solenidade','reuniao','entrevista','cobertura','visita','outro');
create type public.event_status as enum ('planejado','confirmado','concluido','cancelado');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '',
  event_type public.event_type not null default 'outro',
  status public.event_status not null default 'planejado',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  location text not null default '',
  responsible_unit text not null default '',
  notes text not null default '',
  demand_id uuid references public.demands(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_event_period check (ends_at >= starts_at)
);
create index events_period_idx on public.events(starts_at, ends_at);
create index events_status_idx on public.events(status);

create table public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(event_id,profile_id)
);

create trigger events_updated before update on public.events for each row execute procedure public.set_updated_at();

create or replace function public.track_event() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.audit_log(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),tg_op,'event',coalesce(new.id,old.id)::text,jsonb_build_object('title',coalesce(new.title,old.title)));
  return coalesce(new,old);
end; $$;
create trigger events_audit after insert or update or delete on public.events for each row execute procedure public.track_event();

alter table public.events enable row level security;
alter table public.event_participants enable row level security;
create policy "authenticated manage events" on public.events for all to authenticated using (true) with check (true);
create policy "authenticated manage participants" on public.event_participants for all to authenticated using (true) with check (true);
