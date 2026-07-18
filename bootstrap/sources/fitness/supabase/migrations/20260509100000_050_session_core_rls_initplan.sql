-- 050_session_core_rls_initplan.sql
-- Rewrite session-core RLS policies into initplan-friendly auth.uid() forms.
-- Scope is intentionally limited to sessions, session_exercises, and sets.

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own"
  on public.sessions
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own"
  on public.sessions
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own"
  on public.sessions
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own"
  on public.sessions
  for delete
  using (user_id = (select auth.uid()));

drop policy if exists "session_exercises_select_own" on public.session_exercises;
create policy "session_exercises_select_own"
  on public.session_exercises
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "session_exercises_insert_own" on public.session_exercises;
create policy "session_exercises_insert_own"
  on public.session_exercises
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "session_exercises_update_own" on public.session_exercises;
create policy "session_exercises_update_own"
  on public.session_exercises
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "session_exercises_delete_own" on public.session_exercises;
create policy "session_exercises_delete_own"
  on public.session_exercises
  for delete
  using (user_id = (select auth.uid()));

drop policy if exists "sets_select_own" on public.sets;
create policy "sets_select_own"
  on public.sets
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "sets_insert_own" on public.sets;
create policy "sets_insert_own"
  on public.sets
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "sets_update_own" on public.sets;
create policy "sets_update_own"
  on public.sets
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "sets_delete_own" on public.sets;
create policy "sets_delete_own"
  on public.sets
  for delete
  using (user_id = (select auth.uid()));
