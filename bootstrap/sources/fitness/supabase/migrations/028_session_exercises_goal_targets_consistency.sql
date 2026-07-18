-- 028_session_exercises_goal_targets_consistency.sql
-- Ensure session exercise target columns cover all supported Add Exercise goal metrics.

ALTER TABLE public.session_exercises
  ADD COLUMN IF NOT EXISTS target_reps integer,
  ADD COLUMN IF NOT EXISTS target_weight numeric,
  ADD COLUMN IF NOT EXISTS target_weight_unit text,
  ADD COLUMN IF NOT EXISTS target_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS target_distance numeric,
  ADD COLUMN IF NOT EXISTS target_distance_unit text,
  ADD COLUMN IF NOT EXISTS target_calories numeric;

ALTER TABLE public.session_exercises
  DROP CONSTRAINT IF EXISTS session_exercises_target_reps_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_weight_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_duration_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_distance_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_calories_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_weight_unit_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_distance_unit_check;

ALTER TABLE public.session_exercises
  ADD CONSTRAINT session_exercises_target_reps_nonnegative_check
    CHECK (target_reps IS NULL OR target_reps >= 0),
  ADD CONSTRAINT session_exercises_target_weight_nonnegative_check
    CHECK (target_weight IS NULL OR target_weight >= 0),
  ADD CONSTRAINT session_exercises_target_duration_nonnegative_check
    CHECK (target_duration_seconds IS NULL OR target_duration_seconds >= 0),
  ADD CONSTRAINT session_exercises_target_distance_nonnegative_check
    CHECK (target_distance IS NULL OR target_distance >= 0),
  ADD CONSTRAINT session_exercises_target_calories_nonnegative_check
    CHECK (target_calories IS NULL OR target_calories >= 0),
  ADD CONSTRAINT session_exercises_target_weight_unit_check
    CHECK (target_weight_unit IS NULL OR target_weight_unit IN ('lbs', 'kg')),
  ADD CONSTRAINT session_exercises_target_distance_unit_check
    CHECK (target_distance_unit IS NULL OR target_distance_unit IN ('mi', 'km', 'm'));
