alter table public.routine_day_exercises
  add column if not exists target_weight_unit text;

alter table public.routine_day_exercises
  drop constraint if exists routine_day_exercises_target_weight_unit_check;

alter table public.routine_day_exercises
  add constraint routine_day_exercises_target_weight_unit_check
  check (target_weight_unit is null or target_weight_unit in ('lbs', 'kg'));

alter table public.sets
  add column if not exists weight_unit text;

alter table public.sets
  drop constraint if exists sets_weight_unit_check;

alter table public.sets
  add constraint sets_weight_unit_check
  check (weight_unit is null or weight_unit in ('lbs', 'kg'));
