-- Hide standalone stretch catalog rows from the global picker while preserving
-- historical exercise references that may still point at these records.
alter table public.exercises
  add column if not exists slug text null;

update public.exercises
set is_global = false
where user_id is null
  and is_global = true
  and slug in ('hamstring-stretch', 'hip-flexor-stretch');
