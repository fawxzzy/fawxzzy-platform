-- 034_normalize_cardio_units_values_only.sql
-- Normalize cardio measurement metadata to allowed/default unit values without schema changes.

-- exercises.default_unit must use constraint-safe values: reps, seconds, minutes, meters, miles, km.
UPDATE public.exercises e
SET default_unit = CASE e.measurement_type
  WHEN 'time' THEN 'minutes'
  WHEN 'distance' THEN 'miles'
  WHEN 'time_distance' THEN 'miles'
  ELSE e.default_unit
END
WHERE e.measurement_type IN ('time', 'distance', 'time_distance')
  AND (
    e.default_unit IS NULL
    OR e.default_unit NOT IN ('reps', 'seconds', 'minutes', 'meters', 'miles', 'km')
  );

-- Cardio session_exercises should mirror canonical exercise measurement_type.
UPDATE public.session_exercises se
SET measurement_type = e.measurement_type
FROM public.exercises e
WHERE se.exercise_id = e.id
  AND e.measurement_type IN ('time', 'distance', 'time_distance')
  AND se.measurement_type IS DISTINCT FROM e.measurement_type;

-- Normalize session_exercises.default_unit for cardio rows, preserving existing valid cardio values.
UPDATE public.session_exercises se
SET default_unit = e.default_unit
FROM public.exercises e
WHERE se.exercise_id = e.id
  AND e.measurement_type IN ('time', 'distance', 'time_distance')
  AND (
    se.default_unit IS NULL
    OR se.default_unit NOT IN ('seconds', 'minutes', 'meters', 'miles', 'km', 'reps')
  );
