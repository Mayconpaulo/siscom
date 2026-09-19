-- SISCOM — garante um único proprietário, vinculado à conta oficial.

do $$
begin
  if exists (
    select 1 from auth.users
    where lower(email) = 'mayconpaulo6000@gmail.com'
  ) then
    update public.profiles
    set access_level = 'user'::public.access_level
    where access_level = 'owner'
      and id not in (
        select id from auth.users
        where lower(email) = 'mayconpaulo6000@gmail.com'
      );

    update public.profiles as profile
    set email = 'mayconpaulo6000@gmail.com',
        access_level = 'owner'::public.access_level,
        active = true
    from auth.users as auth_user
    where profile.id = auth_user.id
      and lower(auth_user.email) = 'mayconpaulo6000@gmail.com';
  end if;
end $$;

create unique index if not exists profiles_single_owner_idx
  on public.profiles (access_level)
  where access_level = 'owner';

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1
    from public.profiles
    where id = auth.uid()
      and lower(email) = 'mayconpaulo6000@gmail.com'
      and access_level = 'owner'
      and active = true
  );
$$;

create or replace function public.protect_owner_profile() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op = 'DELETE' then
    if old.access_level = 'owner' or lower(old.email) = 'mayconpaulo6000@gmail.com' then
      raise exception 'O perfil proprietário não pode ser excluído.';
    end if;
    return old;
  end if;

  if old.access_level = 'owner' or lower(old.email) = 'mayconpaulo6000@gmail.com' then
    if new.access_level <> 'owner'
      or lower(new.email) <> 'mayconpaulo6000@gmail.com'
      or new.active is not true then
      raise exception 'O perfil proprietário deve permanecer ativo e protegido.';
    end if;
  elsif new.access_level = 'owner' or lower(new.email) = 'mayconpaulo6000@gmail.com' then
    raise exception 'Somente a conta oficial pode ser proprietária.';
  end if;

  return new;
end; $$;

drop trigger if exists protect_owner_profile_trigger on public.profiles;
create trigger protect_owner_profile_trigger
before update or delete on public.profiles
for each row execute procedure public.protect_owner_profile();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  is_temporary boolean;
  new_war_name text;
  is_designated_owner boolean;
begin
  is_temporary := coalesce((new.raw_user_meta_data->>'temporary_access')::boolean, false);
  is_designated_owner := lower(coalesce(new.email, '')) = 'mayconpaulo6000@gmail.com';
  new_war_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'war_name'), ''),
    case when is_designated_owner then 'Silva' else 'Militar-' || substr(new.id::text, 1, 8) end
  );

  insert into public.profiles(
    id, full_name, war_name, rank, email, access_level,
    active, profile_completed, must_change_password
  )
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new_war_name,
    coalesce(new.raw_user_meta_data->>'rank', ''),
    lower(new.email),
    case when is_designated_owner then 'owner'::public.access_level else 'user'::public.access_level end,
    true,
    not is_temporary,
    is_temporary
  );
  return new;
end; $$;
