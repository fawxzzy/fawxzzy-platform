-- 0302_backfill_session_exercises_exercise_id.sql
-- Backfill orphaned session_exercises.exercise_id values when routine_day_exercise_id points to a canonical routine_day_exercises row.

UPDATE public.session_exercises AS se
SET exercise_id = rde.exercise_id
FROM public.routine_day_exercises AS rde
WHERE se.exercise_id IS NULL
  AND se.routine_day_exercise_id IS NOT NULL
  AND se.routine_day_exercise_id = rde.id
  AND se.user_id = rde.user_id;
