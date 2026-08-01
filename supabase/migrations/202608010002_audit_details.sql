-- SISCOM — amplia os detalhes da auditoria para identificar conclusões e responsáveis.

create index if not exists audit_log_created_at_idx on public.audit_log(created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log(entity_type, created_at desc);

create or replace function public.track_demand() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.demand_history(demand_id,actor_id,event,previous_data,new_data)
  values(coalesce(new.id,old.id),auth.uid(),tg_op,case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
  insert into public.audit_log(actor_id,action,entity_type,entity_id,details)
  values(
    auth.uid(),
    tg_op,
    'demand',
    coalesce(new.id,old.id)::text,
    jsonb_strip_nulls(jsonb_build_object(
      'title', coalesce(new.title,old.title),
      'protocol', coalesce(new.protocol,old.protocol),
      'previous_status', case when tg_op='UPDATE' then old.status::text else null end,
      'status', case when tg_op<>'DELETE' then new.status::text else old.status::text end,
      'assigned_to', case when tg_op<>'DELETE' then new.assigned_to else old.assigned_to end
    ))
  );
  return coalesce(new,old);
end; $$;

create or replace function public.track_event() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.audit_log(actor_id,action,entity_type,entity_id,details)
  values(
    auth.uid(),
    tg_op,
    'event',
    coalesce(new.id,old.id)::text,
    jsonb_strip_nulls(jsonb_build_object(
      'title', coalesce(new.title,old.title),
      'previous_status', case when tg_op='UPDATE' then old.status::text else null end,
      'status', case when tg_op<>'DELETE' then new.status::text else old.status::text end
    ))
  );
  return coalesce(new,old);
end; $$;
