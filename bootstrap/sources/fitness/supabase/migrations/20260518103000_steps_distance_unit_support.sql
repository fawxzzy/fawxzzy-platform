alter table public.routine_day_exercises
  drop constraint if exists routine_day_exercises_target_distance_unit_check;

alter table public.routine_day_exercises
  add constraint routine_day_exercises_target_distance_unit_check
  check (target_distance_unit is null or target_distance_unit in ('mi', 'km', 'm', 'steps'));

alter table public.session_exercises
  drop constraint if exists session_exercises_target_distance_unit_check;

alter table public.session_exercises
  add constraint session_exercises_target_distance_unit_check
  check (target_distance_unit is null or target_distance_unit in ('mi', 'km', 'm', 'steps'));

alter table public.sets
  drop constraint if exists sets_distance_unit_check;

alter table public.sets
  add constraint sets_distance_unit_check
  check (distance_unit is null or distance_unit in ('mi', 'km', 'm', 'steps'));
