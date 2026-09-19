-- SISCOM — configurações de perfil, nome de guerra obrigatório e fotos

-- Corrige o perfil proprietário legado e os demais perfis anteriores ao
-- primeiro acesso por nome de guerra.
update public.profiles
set war_name = 'Silva'
where access_level = 'owner' and trim(war_name) = '';

update public.profiles
set war_name = coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), 'Militar') || '-' || substr(id::text, 1, 4)
where trim(war_name) = '';

alter table public.profiles
  drop constraint if exists profiles_war_name_required;

alter table public.profiles
  add constraint profiles_war_name_required check (char_length(trim(war_name)) >= 2);

-- Mantém a obrigatoriedade também para contas criadas fora do fluxo de convite.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  is_temporary boolean;
  new_war_name text;
begin
  is_temporary := coalesce((new.raw_user_meta_data->>'temporary_access')::boolean, false);
  new_war_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'war_name'), ''),
    'Militar-' || substr(new.id::text, 1, 8)
  );

  insert into public.profiles(
    id, full_name, war_name, rank, email, access_level,
    profile_completed, must_change_password
  )
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new_war_name,
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

-- Fotos públicas de perfil; cada usuário só pode gerenciar sua própria pasta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users read own profile photos" on storage.objects;
drop policy if exists "users upload own profile photos" on storage.objects;
drop policy if exists "users update own profile photos" on storage.objects;
drop policy if exists "users delete own profile photos" on storage.objects;

create policy "users read own profile photos" on storage.objects
for select to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users upload own profile photos" on storage.objects
for insert to authenticated
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update own profile photos" on storage.objects
for update to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own profile photos" on storage.objects
for delete to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
