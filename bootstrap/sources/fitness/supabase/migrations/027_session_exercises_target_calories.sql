-- 027_session_exercises_target_calories.sql
-- Add optional per-session exercise calories target for measurement parity with routine targets.

ALTER TABLE public.session_exercises
  ADD COLUMN IF NOT EXISTS target_calories numeric;

ALTER TABLE public.session_exercises
  DROP CONSTRAINT IF EXISTS session_exercises_target_calories_nonnegative_check;

ALTER TABLE public.session_exercises
  ADD CONSTRAINT session_exercises_target_calories_nonnegative_check
  CHECK (target_calories IS NULL OR target_calories >= 0);
