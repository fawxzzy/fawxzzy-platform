alter table public.routine_day_exercises
  drop constraint if exists routine_day_exercises_target_reps_range_check;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'routine_day_exercises'
      and pg_get_constraintdef(c.oid) ilike '%target_reps_min%'
      and pg_get_constraintdef(c.oid) ilike '%target_reps_max%'
  loop
    execute format('alter table public.routine_day_exercises drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.routine_day_exercises
  add constraint routine_day_exercises_target_reps_range_check
  check (
    (target_reps_min is null or target_reps_min >= 1)
    and (target_reps_max is null or target_reps_max >= 1)
    and (
      target_reps_min is null
      or target_reps_max is null
      or target_reps_min <= target_reps_max
    )
  );
