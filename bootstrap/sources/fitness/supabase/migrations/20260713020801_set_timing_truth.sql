alter table public.sets
  add column if not exists logged_at timestamptz;

create index if not exists sets_recovery_timing_idx
  on public.sets (user_id, session_exercise_id, logged_at)
  where logged_at is not null;
