-- SISCOM — notificações internas de atribuição de demandas
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  demand_id uuid references public.demands(id) on delete cascade,
  kind text not null default 'demand_assigned',
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
on public.notifications(user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists n_select on public.notifications;
create policy n_select on public.notifications
for select to authenticated using (user_id = auth.uid());

drop policy if exists n_update on public.notifications;
create policy n_update on public.notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists n_delete on public.notifications;
create policy n_delete on public.notifications
for delete to authenticated using (user_id = auth.uid());

create or replace function public.notify_demand_assignment() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.assigned_to is not null and
     (tg_op = 'INSERT' or old.assigned_to is distinct from new.assigned_to) then
    insert into public.notifications(user_id, demand_id, title, message)
    values(
      new.assigned_to,
      new.id,
      'Nova demanda atribuída',
      format('A demanda #%s — %s foi atribuída a você.', new.protocol, new.title)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists demands_assignment_notification on public.demands;
create trigger demands_assignment_notification
after insert or update of assigned_to on public.demands
for each row execute procedure public.notify_demand_assignment();
