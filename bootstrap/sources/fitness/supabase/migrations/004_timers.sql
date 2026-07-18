-- 004_timers.sql

alter table public.sessions
  add column if not exists duration_seconds int null;

alter table public.sets
  add column if not exists duration_seconds int null;
