create table if not exists public.exercise_stats (
  user_id uuid not null,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  last_weight numeric null,
  last_reps int null,
  last_unit text null,
  last_performed_at timestamptz null,
  pr_weight numeric null,
  pr_reps int null,
  pr_est_1rm numeric null,
  pr_achieved_at timestamptz null,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.exercise_stats enable row level security;

create policy "exercise_stats_select_own"
  on public.exercise_stats
  for select
  using (user_id = auth.uid());

create policy "exercise_stats_insert_own"
  on public.exercise_stats
  for insert
  with check (user_id = auth.uid());

create policy "exercise_stats_update_own"
  on public.exercise_stats
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "exercise_stats_delete_own"
  on public.exercise_stats
  for delete
  using (user_id = auth.uid());

create index if not exists session_exercises_user_exercise_session_idx
  on public.session_exercises (user_id, exercise_id, session_id);

create index if not exists sets_user_session_exercise_set_index_idx
  on public.sets (user_id, session_exercise_id, set_index desc);

create index if not exists sessions_user_status_performed_idx
  on public.sessions (user_id, status, performed_at desc);
