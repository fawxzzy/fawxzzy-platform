alter table public.routine_day_exercises
  drop constraint if exists routine_day_exercises_target_reps_range_check;

alter table public.routine_day_exercises
  add constraint routine_day_exercises_target_reps_range_check
  check (
    (target_reps_min is null or target_reps_min >= 0)
    and (target_reps_max is null or target_reps_max >= 0)
    and (
      target_reps_min is null
      or target_reps_max is null
      or target_reps_min <= target_reps_max
    )
  );
