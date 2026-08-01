-- SISCOM — perfis e convites com graduação
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,rank,email,access_level)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'rank',''),
    new.email,
    case when not exists(select 1 from public.profiles) then 'owner'::public.access_level else 'user'::public.access_level end
  );
  return new;
end; $$;
