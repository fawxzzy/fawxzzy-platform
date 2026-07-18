-- 038_fix_strength_exercise_measurement_labels.sql
-- Correct strength exercises that were mislabeled as cardio-style measurements.

UPDATE public.exercises
SET measurement_type = 'reps',
    default_unit = 'reps'
WHERE is_global = TRUE
  AND lower(btrim(name)) IN ('seated cable row', 'walking lunge')
  AND (
    measurement_type IS DISTINCT FROM 'reps'
    OR default_unit IS DISTINCT FROM 'reps'
  );

UPDATE public.routine_day_exercises AS rde
SET measurement_type = 'reps',
    default_unit = 'reps'
FROM public.exercises AS e
WHERE rde.exercise_id = e.id
  AND lower(btrim(e.name)) IN ('seated cable row', 'walking lunge')
  AND (
    rde.measurement_type IS DISTINCT FROM 'reps'
    OR rde.default_unit IS DISTINCT FROM 'reps'
  );

UPDATE public.session_exercises AS se
SET measurement_type = 'reps',
    default_unit = 'reps'
FROM public.exercises AS e
WHERE se.exercise_id = e.id
  AND lower(btrim(e.name)) IN ('seated cable row', 'walking lunge')
  AND (
    se.measurement_type IS DISTINCT FROM 'reps'
    OR se.default_unit IS DISTINCT FROM 'reps'
  );
