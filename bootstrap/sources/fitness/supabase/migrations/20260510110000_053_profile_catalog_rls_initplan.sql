-- 053_profile_catalog_rls_initplan.sql
-- Rewrite profile/catalog-core RLS policies into initplan-friendly auth.uid() forms.
-- Scope is intentionally limited to profiles, exercises, and exercise_stats.

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles
  for delete
  using (id = (select auth.uid()));

drop policy if exists "exercises_select_global_or_own" on public.exercises;
create policy "exercises_select_global_or_own"
  on public.exercises
  for select
  using ((user_id is null) or (user_id = (select auth.uid())));

drop policy if exists "exercises_insert_own_only" on public.exercises;
create policy "exercises_insert_own_only"
  on public.exercises
  for insert
  with check ((user_id = (select auth.uid())) and (user_id is not null) and (is_global = false));

drop policy if exists "exercises_update_own_only" on public.exercises;
create policy "exercises_update_own_only"
  on public.exercises
  for update
  using ((user_id = (select auth.uid())) and (user_id is not null))
  with check ((user_id = (select auth.uid())) and (user_id is not null) and (is_global = false));

drop policy if exists "exercises_delete_own_only" on public.exercises;
create policy "exercises_delete_own_only"
  on public.exercises
  for delete
  using ((user_id = (select auth.uid())) and (user_id is not null));

drop policy if exists "exercise_stats_select_own" on public.exercise_stats;
create policy "exercise_stats_select_own"
  on public.exercise_stats
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "exercise_stats_insert_own" on public.exercise_stats;
create policy "exercise_stats_insert_own"
  on public.exercise_stats
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "exercise_stats_update_own" on public.exercise_stats;
create policy "exercise_stats_update_own"
  on public.exercise_stats
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "exercise_stats_delete_own" on public.exercise_stats;
create policy "exercise_stats_delete_own"
  on public.exercise_stats
  for delete
  using (user_id = (select auth.uid()));
