-- 049_fk_covering_indexes.sql
-- Add covering indexes only for advisor-confirmed foreign keys that are still uncovered.

create index if not exists idx_exercise_stats_exercise_id
  on public.exercise_stats (exercise_id);

create index if not exists idx_routine_day_exercises_exercise_id
  on public.routine_day_exercises (exercise_id);

create index if not exists idx_session_exercises_exercise_id
  on public.session_exercises (exercise_id);

create index if not exists idx_sessions_routine_id
  on public.sessions (routine_id);
