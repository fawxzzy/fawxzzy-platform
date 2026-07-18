-- 023_routine_session_exercise_measurement_overrides.sql
-- Add per-routine-exercise and per-session-exercise measurement/unit overrides.

ALTER TABLE public.routine_day_exercises
  ADD COLUMN IF NOT EXISTS measurement_type text,
  ADD COLUMN IF NOT EXISTS default_unit text;

ALTER TABLE public.routine_day_exercises
  DROP CONSTRAINT IF EXISTS routine_day_exercises_measurement_type_check;

ALTER TABLE public.routine_day_exercises
  ADD CONSTRAINT routine_day_exercises_measurement_type_check
  CHECK (
    measurement_type IS NULL
    OR measurement_type IN ('reps', 'time', 'distance', 'time_distance')
  );

ALTER TABLE public.session_exercises
  ADD COLUMN IF NOT EXISTS measurement_type text,
  ADD COLUMN IF NOT EXISTS default_unit text;

ALTER TABLE public.session_exercises
  DROP CONSTRAINT IF EXISTS session_exercises_measurement_type_check;

ALTER TABLE public.session_exercises
  ADD CONSTRAINT session_exercises_measurement_type_check
  CHECK (
    measurement_type IS NULL
    OR measurement_type IN ('reps', 'time', 'distance', 'time_distance')
  );

-- Verification queries:
-- SELECT count(*) AS routine_day_exercises_measurement_type_set
-- FROM public.routine_day_exercises
-- WHERE measurement_type IS NOT NULL;

-- SELECT count(*) AS session_exercises_measurement_type_set
-- FROM public.session_exercises
-- WHERE measurement_type IS NOT NULL;
