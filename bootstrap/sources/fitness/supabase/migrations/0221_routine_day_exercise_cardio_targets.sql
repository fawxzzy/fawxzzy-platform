-- 0221_routine_day_exercise_cardio_targets.sql
-- Add optional cardio-oriented routine targets.

ALTER TABLE public.routine_day_exercises
  ADD COLUMN IF NOT EXISTS target_distance numeric,
  ADD COLUMN IF NOT EXISTS target_distance_unit text,
  ADD COLUMN IF NOT EXISTS target_calories numeric;

ALTER TABLE public.routine_day_exercises
  DROP CONSTRAINT IF EXISTS routine_day_exercises_target_distance_unit_check;

ALTER TABLE public.routine_day_exercises
  ADD CONSTRAINT routine_day_exercises_target_distance_unit_check
  CHECK (target_distance_unit IS NULL OR target_distance_unit IN ('mi', 'km', 'm'));
