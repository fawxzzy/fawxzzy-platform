create table if not exists public.session_follow_up_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null,
  job_kind text not null check (job_kind in ('exercise_stats', 'fitness_integrations')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempt_count int not null default 0,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null
);

create unique index if not exists session_follow_up_jobs_session_kind_uq
  on public.session_follow_up_jobs (session_id, job_kind);

create index if not exists session_follow_up_jobs_user_status_idx
  on public.session_follow_up_jobs (user_id, status, updated_at desc);

alter table public.session_follow_up_jobs enable row level security;

create policy "session_follow_up_jobs_select_own"
  on public.session_follow_up_jobs
  for select
  using (user_id = auth.uid());

create policy "session_follow_up_jobs_insert_own"
  on public.session_follow_up_jobs
  for insert
  with check (user_id = auth.uid());

create policy "session_follow_up_jobs_update_own"
  on public.session_follow_up_jobs
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "session_follow_up_jobs_delete_own"
  on public.session_follow_up_jobs
  for delete
  using (user_id = auth.uid());
