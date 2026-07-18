alter table public.routine_days
  add column if not exists is_optional boolean not null default false;

alter table public.routine_days
  drop constraint if exists routine_days_rest_optional_exclusive;

alter table public.routine_days
  add constraint routine_days_rest_optional_exclusive
  check (not (is_rest and is_optional));
