-- 029_session_exercises_range_goal_columns.sql
-- Add nullable range-goal columns for session_exercises. Additive only: keep legacy single-value target_* columns.

ALTER TABLE public.session_exercises
  ADD COLUMN IF NOT EXISTS target_reps_min integer,
  ADD COLUMN IF NOT EXISTS target_reps_max integer,
  ADD COLUMN IF NOT EXISTS target_weight_min numeric,
  ADD COLUMN IF NOT EXISTS target_weight_max numeric,
  ADD COLUMN IF NOT EXISTS target_time_seconds_min integer,
  ADD COLUMN IF NOT EXISTS target_time_seconds_max integer,
  ADD COLUMN IF NOT EXISTS target_distance_min numeric,
  ADD COLUMN IF NOT EXISTS target_distance_max numeric,
  ADD COLUMN IF NOT EXISTS target_calories_min numeric,
  ADD COLUMN IF NOT EXISTS target_calories_max numeric;

ALTER TABLE public.session_exercises
  DROP CONSTRAINT IF EXISTS session_exercises_target_reps_min_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_reps_max_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_weight_min_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_weight_max_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_time_seconds_min_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_time_seconds_max_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_distance_min_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_distance_max_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_calories_min_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_calories_max_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_reps_range_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_weight_range_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_time_seconds_range_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_distance_range_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_calories_range_check;

ALTER TABLE public.session_exercises
  ADD CONSTRAINT session_exercises_target_reps_min_nonnegative_check
    CHECK (target_reps_min IS NULL OR target_reps_min >= 0),
  ADD CONSTRAINT session_exercises_target_reps_max_nonnegative_check
    CHECK (target_reps_max IS NULL OR target_reps_max >= 0),
  ADD CONSTRAINT session_exercises_target_weight_min_nonnegative_check
    CHECK (target_weight_min IS NULL OR target_weight_min >= 0),
  ADD CONSTRAINT session_exercises_target_weight_max_nonnegative_check
    CHECK (target_weight_max IS NULL OR target_weight_max >= 0),
  ADD CONSTRAINT session_exercises_target_time_seconds_min_nonnegative_check
    CHECK (target_time_seconds_min IS NULL OR target_time_seconds_min >= 0),
  ADD CONSTRAINT session_exercises_target_time_seconds_max_nonnegative_check
    CHECK (target_time_seconds_max IS NULL OR target_time_seconds_max >= 0),
  ADD CONSTRAINT session_exercises_target_distance_min_nonnegative_check
    CHECK (target_distance_min IS NULL OR target_distance_min >= 0),
  ADD CONSTRAINT session_exercises_target_distance_max_nonnegative_check
    CHECK (target_distance_max IS NULL OR target_distance_max >= 0),
  ADD CONSTRAINT session_exercises_target_calories_min_nonnegative_check
    CHECK (target_calories_min IS NULL OR target_calories_min >= 0),
  ADD CONSTRAINT session_exercises_target_calories_max_nonnegative_check
    CHECK (target_calories_max IS NULL OR target_calories_max >= 0),
  ADD CONSTRAINT session_exercises_target_reps_range_check
    CHECK (target_reps_min IS NULL OR target_reps_max IS NULL OR target_reps_min <= target_reps_max),
  ADD CONSTRAINT session_exercises_target_weight_range_check
    CHECK (target_weight_min IS NULL OR target_weight_max IS NULL OR target_weight_min <= target_weight_max),
  ADD CONSTRAINT session_exercises_target_time_seconds_range_check
    CHECK (target_time_seconds_min IS NULL OR target_time_seconds_max IS NULL OR target_time_seconds_min <= target_time_seconds_max),
  ADD CONSTRAINT session_exercises_target_distance_range_check
    CHECK (target_distance_min IS NULL OR target_distance_max IS NULL OR target_distance_min <= target_distance_max),
  ADD CONSTRAINT session_exercises_target_calories_range_check
    CHECK (target_calories_min IS NULL OR target_calories_max IS NULL OR target_calories_min <= target_calories_max);
