alter table public.routine_day_exercises
  add column if not exists target_weight numeric,
  add column if not exists target_duration_seconds integer;

alter table public.routine_day_exercises
  drop constraint if exists routine_day_exercises_target_weight_nonnegative_check,
  drop constraint if exists routine_day_exercises_target_duration_nonnegative_check;

alter table public.routine_day_exercises
  add constraint routine_day_exercises_target_weight_nonnegative_check
  check (target_weight is null or target_weight >= 0),
  add constraint routine_day_exercises_target_duration_nonnegative_check
  check (target_duration_seconds is null or target_duration_seconds >= 0);
