alter table public.profiles add column if not exists rank text not null default '';

update public.profiles
set full_name = 'Paulo Silva', rank = 'Cabo', access_level = 'owner'
where lower(email) = lower('mayconpaulo6000@gmail.com');
