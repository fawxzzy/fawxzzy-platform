-- 0301_session_exercises_target_sets_range_columns.sql
-- Add nullable set-range columns for session_exercises as additive-only schema evolution.

ALTER TABLE public.session_exercises
  ADD COLUMN IF NOT EXISTS target_sets_min integer,
  ADD COLUMN IF NOT EXISTS target_sets_max integer;

ALTER TABLE public.session_exercises
  DROP CONSTRAINT IF EXISTS session_exercises_target_sets_min_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_sets_max_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_sets_range_check;

ALTER TABLE public.session_exercises
  ADD CONSTRAINT session_exercises_target_sets_min_nonnegative_check
    CHECK (target_sets_min IS NULL OR target_sets_min >= 0),
  ADD CONSTRAINT session_exercises_target_sets_max_nonnegative_check
    CHECK (target_sets_max IS NULL OR target_sets_max >= 0),
  ADD CONSTRAINT session_exercises_target_sets_range_check
    CHECK (target_sets_min IS NULL OR target_sets_max IS NULL OR target_sets_min <= target_sets_max);
