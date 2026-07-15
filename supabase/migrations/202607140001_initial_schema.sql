-- SISCOM Sprint 0.2 — schema inicial
create extension if not exists pgcrypto;

create type public.access_level as enum ('user', 'owner');
create type public.demand_status as enum ('aberta', 'em_andamento', 'concluida', 'cancelada');
create type public.demand_priority as enum ('baixa', 'normal', 'alta', 'urgente');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  rank text not null default '',
  email text not null,
  access_level public.access_level not null default 'user',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence public.demand_protocol_seq start 1001;
create table public.demands (
  id uuid primary key default gen_random_uuid(),
  protocol bigint not null unique default nextval('public.demand_protocol_seq'),
  title text not null check (char_length(title) between 3 and 160),
  description text not null,
  requesting_unit text not null,
  priority public.demand_priority not null default 'normal',
  status public.demand_status not null default 'aberta',
  due_at timestamptz,
  created_by uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index demands_status_idx on public.demands(status);
create index demands_created_at_idx on public.demands(created_at desc);

create table public.demand_history (
  id bigint generated always as identity primary key,
  demand_id uuid not null references public.demands(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  event text not null,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_owner() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and access_level='owner' and active=true);
$$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,email,access_level)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email,
    case when not exists(select 1 from public.profiles) then 'owner'::public.access_level else 'user'::public.access_level end);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger demands_updated before update on public.demands for each row execute procedure public.set_updated_at();

create or replace function public.track_demand() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.demand_history(demand_id,actor_id,event,previous_data,new_data)
  values(coalesce(new.id,old.id),auth.uid(),tg_op,case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
  insert into public.audit_log(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),tg_op,'demand',coalesce(new.id,old.id)::text,jsonb_build_object('title',coalesce(new.title,old.title)));
  return coalesce(new,old);
end; $$;
create trigger demands_audit after insert or update or delete on public.demands for each row execute procedure public.track_demand();

alter table public.profiles enable row level security;
alter table public.demands enable row level security;
alter table public.demand_history enable row level security;
alter table public.audit_log enable row level security;

create policy "authenticated read profiles" on public.profiles for select to authenticated using (true);
create policy "owner manages profiles" on public.profiles for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "user updates self" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid() and access_level=(select access_level from public.profiles where id=auth.uid()));
create policy "authenticated manage demands" on public.demands for all to authenticated using (true) with check (true);
create policy "authenticated read demand history" on public.demand_history for select to authenticated using (true);
create policy "owner reads audit" on public.audit_log for select to authenticated using (public.is_owner());

grant usage on sequence public.demand_protocol_seq to authenticated;
