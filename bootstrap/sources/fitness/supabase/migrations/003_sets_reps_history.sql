-- 003_sets_reps_history.sql

alter table public.routine_day_exercises
  add column if not exists target_sets int null,
  add column if not exists target_reps int null;

alter table public.sessions
  add column if not exists name text null,
  add column if not exists routine_day_name text null;

alter table public.session_exercises
  add column if not exists is_skipped boolean not null default false;

alter table public.sets
  add column if not exists duration_seconds int null;
