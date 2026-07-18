alter table public.sessions
  add column if not exists day_name_override text null,
  add column if not exists notes text null;

alter table public.session_exercises
  add column if not exists notes text null;

-- Ensure owner-scoped update/select policies exist for audit edits.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sessions' and policyname = 'sessions_select_own'
  ) then
    create policy "sessions_select_own"
      on public.sessions
      for select
      using (user_id = auth.uid());
  end if;

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
    where schemaname = 'public' and tablename = 'session_exercises' and policyname = 'session_exercises_select_own'
  ) then
    create policy "session_exercises_select_own"
      on public.session_exercises
      for select
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
end $$;
