alter table public.routine_day_exercises
  add column if not exists target_reps_min integer,
  add column if not exists target_reps_max integer;

alter table public.routine_day_exercises
  drop constraint if exists routine_day_exercises_target_reps_range_check;

alter table public.routine_day_exercises
  add constraint routine_day_exercises_target_reps_range_check
  check (
    (target_reps_min is null and target_reps_max is null)
    or (
      target_reps_min is not null
      and target_reps_max is not null
      and target_reps_min >= 1
      and target_reps_max >= 1
      and target_reps_min <= target_reps_max
    )
  );

alter table public.routines
  add column if not exists weight_unit text not null default 'lbs';

alter table public.routines
  drop constraint if exists routines_weight_unit_check;

alter table public.routines
  add constraint routines_weight_unit_check
  check (weight_unit in ('lbs', 'kg'));

do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
   and ccu.table_schema = tc.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'session_exercises'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'session_id'
    and ccu.table_name = 'sessions'
  limit 1;

  if fk_name is not null then
    execute format('alter table public.session_exercises drop constraint %I', fk_name);
  end if;

  alter table public.session_exercises
    add constraint session_exercises_session_id_fkey
    foreign key (session_id)
    references public.sessions(id)
    on delete cascade;
end $$;

do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
   and ccu.table_schema = tc.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'sets'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'session_exercise_id'
    and ccu.table_name = 'session_exercises'
  limit 1;

  if fk_name is not null then
    execute format('alter table public.sets drop constraint %I', fk_name);
  end if;

  alter table public.sets
    add constraint sets_session_exercise_id_fkey
    foreign key (session_exercise_id)
    references public.session_exercises(id)
    on delete cascade;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sessions' and policyname = 'sessions_update_own'
  ) then
    create policy "sessions_update_own"
      on public.sessions
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sessions' and policyname = 'sessions_delete_own'
  ) then
    create policy "sessions_delete_own"
      on public.sessions
      for delete
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'session_exercises' and policyname = 'session_exercises_update_own'
  ) then
    create policy "session_exercises_update_own"
      on public.session_exercises
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'session_exercises' and policyname = 'session_exercises_delete_own'
  ) then
    create policy "session_exercises_delete_own"
      on public.session_exercises
      for delete
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sets' and policyname = 'sets_update_own'
  ) then
    create policy "sets_update_own"
      on public.sets
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sets' and policyname = 'sets_delete_own'
  ) then
    create policy "sets_delete_own"
      on public.sets
      for delete
      using (user_id = auth.uid());
  end if;
end $$;
