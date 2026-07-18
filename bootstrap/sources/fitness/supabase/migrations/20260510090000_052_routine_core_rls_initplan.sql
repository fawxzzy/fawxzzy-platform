-- 052_routine_core_rls_initplan.sql
-- Rewrite routine-core RLS policies into initplan-friendly auth.uid() forms.
-- Scope is intentionally limited to routines, routine_days, and routine_day_exercises.

drop policy if exists "routines_select_own" on public.routines;
create policy "routines_select_own"
  on public.routines
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "routines_insert_own" on public.routines;
create policy "routines_insert_own"
  on public.routines
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "routines_update_own" on public.routines;
create policy "routines_update_own"
  on public.routines
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "routines_delete_own" on public.routines;
create policy "routines_delete_own"
  on public.routines
  for delete
  using (user_id = (select auth.uid()));

drop policy if exists "routine_days_select_own" on public.routine_days;
create policy "routine_days_select_own"
  on public.routine_days
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "routine_days_insert_own" on public.routine_days;
create policy "routine_days_insert_own"
  on public.routine_days
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "routine_days_update_own" on public.routine_days;
create policy "routine_days_update_own"
  on public.routine_days
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "routine_days_delete_own" on public.routine_days;
create policy "routine_days_delete_own"
  on public.routine_days
  for delete
  using (user_id = (select auth.uid()));

drop policy if exists "routine_day_exercises_select_own" on public.routine_day_exercises;
create policy "routine_day_exercises_select_own"
  on public.routine_day_exercises
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "routine_day_exercises_insert_own" on public.routine_day_exercises;
create policy "routine_day_exercises_insert_own"
  on public.routine_day_exercises
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "routine_day_exercises_update_own" on public.routine_day_exercises;
create policy "routine_day_exercises_update_own"
  on public.routine_day_exercises
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "routine_day_exercises_delete_own" on public.routine_day_exercises;
create policy "routine_day_exercises_delete_own"
  on public.routine_day_exercises
  for delete
  using (user_id = (select auth.uid()));
