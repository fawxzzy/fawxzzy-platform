-- 021_exercise_measurement_and_set_distance.sql
-- Add exercise-level measurement contract fields and set-level distance logging fields.

-- 1) Exercise-level fields.
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS measurement_type text,
  ADD COLUMN IF NOT EXISTS default_unit text,
  ADD COLUMN IF NOT EXISTS calories_estimation_method text;

UPDATE public.exercises
SET measurement_type = 'reps'
WHERE measurement_type IS NULL
  OR btrim(measurement_type) = ''
  OR measurement_type NOT IN ('reps', 'time', 'distance', 'time_distance');

ALTER TABLE public.exercises
  ALTER COLUMN measurement_type SET DEFAULT 'reps',
  ALTER COLUMN measurement_type SET NOT NULL;

UPDATE public.exercises
SET default_unit = CASE measurement_type
  WHEN 'reps' THEN 'reps'
  WHEN 'time' THEN 'seconds'
  WHEN 'distance' THEN 'mi'
  WHEN 'time_distance' THEN 'mi'
  ELSE default_unit
END
WHERE default_unit IS NULL
  OR btrim(default_unit) = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exercises_measurement_type_check'
      AND conrelid = 'public.exercises'::regclass
  ) THEN
    ALTER TABLE public.exercises
      ADD CONSTRAINT exercises_measurement_type_check
      CHECK (measurement_type IN ('reps', 'time', 'distance', 'time_distance'));
  END IF;
END
$$;

-- 2) Set-level fields for distance and calories.
ALTER TABLE public.sets
  ADD COLUMN IF NOT EXISTS distance numeric,
  ADD COLUMN IF NOT EXISTS distance_unit text,
  ADD COLUMN IF NOT EXISTS calories numeric;

ALTER TABLE public.sets
  DROP CONSTRAINT IF EXISTS sets_distance_unit_check;

ALTER TABLE public.sets
  ADD CONSTRAINT sets_distance_unit_check
  CHECK (distance_unit IS NULL OR distance_unit IN ('mi', 'km', 'm'));

-- Verification queries (manual; do not run as part of migration):
-- 1) Count exercises by measurement type:
-- SELECT measurement_type, count(*)
-- FROM public.exercises
-- GROUP BY measurement_type
-- ORDER BY measurement_type;

-- 2) Confirm no exercises have NULL/empty measurement_type:
-- SELECT count(*)
-- FROM public.exercises
-- WHERE measurement_type IS NULL OR btrim(measurement_type) = '';

-- 3) Check sets that have distance but no distance_unit:
-- SELECT count(*)
-- FROM public.sets
-- WHERE distance IS NOT NULL AND distance_unit IS NULL;
