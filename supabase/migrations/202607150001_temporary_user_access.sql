-- SISCOM — acesso inicial por nome de guerra e senha temporária
alter table public.profiles
  add column if not exists war_name text not null default '',
  add column if not exists profile_completed boolean not null default true,
  add column if not exists must_change_password boolean not null default false;

create unique index if not exists profiles_war_name_unique
  on public.profiles (lower(war_name))
  where war_name <> '';

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  is_temporary boolean;
begin
  is_temporary := coalesce((new.raw_user_meta_data->>'temporary_access')::boolean, false);

  insert into public.profiles(
    id, full_name, war_name, rank, email, access_level,
    profile_completed, must_change_password
  )
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'war_name',''),
    coalesce(new.raw_user_meta_data->>'rank',''),
    new.email,
    case when not exists(select 1 from public.profiles)
      then 'owner'::public.access_level
      else 'user'::public.access_level
    end,
    not is_temporary,
    is_temporary
  );
  return new;
end; $$;

