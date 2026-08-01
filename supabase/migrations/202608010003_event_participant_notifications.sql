-- SISCOM — participantes e notificações internas de atividades
alter table public.notifications
add column if not exists event_id uuid references public.events(id) on delete cascade;

create index if not exists notifications_event_idx
on public.notifications(event_id, user_id, created_at desc);

create or replace function public.notify_event_participant() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  activity public.events%rowtype;
begin
  select * into activity from public.events where id = new.event_id;

  if activity.id is not null
     and activity.ends_at >= now()
     and activity.status <> 'cancelado' then
    insert into public.notifications(user_id, event_id, kind, title, message)
    values(
      new.profile_id,
      activity.id,
      'event_assigned',
      'Você foi incluído em uma atividade',
      format(
        '%s — início em %s.',
        activity.title,
        to_char(activity.starts_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI')
      )
    );
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'event_participant_notification'
      and tgrelid = 'public.event_participants'::regclass
  ) then
    create trigger event_participant_notification
    after insert on public.event_participants
    for each row execute procedure public.notify_event_participant();
  end if;
end;
$$;
