-- SISCOM — andamento e comentários das demandas
create table public.demand_comments (
  id bigint generated always as identity primary key,
  demand_id uuid not null references public.demands(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  content text not null check (char_length(content) between 2 and 2000),
  created_at timestamptz not null default now()
);

create index demand_comments_demand_idx on public.demand_comments(demand_id, created_at desc);
alter table public.demand_comments enable row level security;
create policy "authenticated manage demand comments" on public.demand_comments
for all to authenticated using (true) with check (true);

create or replace function public.track_demand_comment() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.audit_log(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),'COMMENT','demand',new.demand_id::text,jsonb_build_object('comment_id',new.id));
  return new;
end; $$;
create trigger demand_comments_audit after insert on public.demand_comments
for each row execute procedure public.track_demand_comment();
