-- 054_follow_up_jobs_rls_initplan.sql
-- Rewrite follow-up-job RLS policies into initplan-friendly auth.uid() forms.
-- Scope is intentionally limited to session_follow_up_jobs.

drop policy if exists "session_follow_up_jobs_select_own" on public.session_follow_up_jobs;
create policy "session_follow_up_jobs_select_own"
  on public.session_follow_up_jobs
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "session_follow_up_jobs_insert_own" on public.session_follow_up_jobs;
create policy "session_follow_up_jobs_insert_own"
  on public.session_follow_up_jobs
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "session_follow_up_jobs_update_own" on public.session_follow_up_jobs;
create policy "session_follow_up_jobs_update_own"
  on public.session_follow_up_jobs
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "session_follow_up_jobs_delete_own" on public.session_follow_up_jobs;
create policy "session_follow_up_jobs_delete_own"
  on public.session_follow_up_jobs
  for delete
  using (user_id = (select auth.uid()));
