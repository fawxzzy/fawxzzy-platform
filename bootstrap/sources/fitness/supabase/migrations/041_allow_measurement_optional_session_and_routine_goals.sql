ALTER TABLE public.routine_day_exercises
DROP CONSTRAINT IF EXISTS routine_day_exercises_measurement_type_check;

ALTER TABLE public.routine_day_exercises
ADD CONSTRAINT routine_day_exercises_measurement_type_check
CHECK (
  measurement_type IS NULL
  OR measurement_type IN ('reps', 'time', 'distance', 'time_distance', 'none')
);

ALTER TABLE public.session_exercises
DROP CONSTRAINT IF EXISTS session_exercises_measurement_type_check;

ALTER TABLE public.session_exercises
ADD CONSTRAINT session_exercises_measurement_type_check
CHECK (
  measurement_type IS NULL
  OR measurement_type IN ('reps', 'time', 'distance', 'time_distance', 'none')
);
