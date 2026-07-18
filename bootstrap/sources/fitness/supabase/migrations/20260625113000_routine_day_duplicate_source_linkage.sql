alter table public.routine_days
  add column if not exists duplicate_source_routine_day_id uuid null references public.routine_days(id) on delete set null;

create index if not exists routine_days_duplicate_source_idx
  on public.routine_days (duplicate_source_routine_day_id);
