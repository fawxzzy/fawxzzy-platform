-- 032_backfill_cardio_session_exercise_default_unit.sql
-- Backfill cardio session_exercises default_unit so it stays aligned with measurement_type.

UPDATE public.session_exercises se
SET default_unit = CASE se.measurement_type
  WHEN 'time' THEN 'time'
  WHEN 'distance' THEN 'distance'
  WHEN 'time_distance' THEN 'time_distance'
  ELSE se.default_unit
END
FROM public.exercises e
WHERE se.exercise_id = e.id
  AND lower(coalesce(e.primary_muscle, '')) = 'cardio'
  AND se.measurement_type IN ('time', 'distance', 'time_distance')
  AND (se.default_unit IS NULL OR se.default_unit = 'reps');

-- Optional uplift: if Incline Walk logged any distance, treat measurement_type/default_unit as time_distance.
UPDATE public.session_exercises se
SET measurement_type = 'time_distance',
    default_unit = 'time_distance'
FROM public.exercises e
WHERE se.exercise_id = e.id
  AND lower(coalesce(e.name, '')) = 'incline walk'
  AND EXISTS (
    SELECT 1
    FROM public.sets s
    WHERE s.session_exercise_id = se.id
      AND coalesce(s.distance, 0) > 0
  )
  AND se.measurement_type = 'time';
