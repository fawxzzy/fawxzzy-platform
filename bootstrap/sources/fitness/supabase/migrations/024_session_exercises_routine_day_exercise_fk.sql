-- 024_session_exercises_routine_day_exercise_fk.sql
-- Link session_exercises rows back to their exact planned routine_day_exercises row.

ALTER TABLE public.session_exercises
  ADD COLUMN IF NOT EXISTS routine_day_exercise_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'session_exercises_routine_day_exercise_id_fkey'
      AND conrelid = 'public.session_exercises'::regclass
  ) THEN
    ALTER TABLE public.session_exercises
      ADD CONSTRAINT session_exercises_routine_day_exercise_id_fkey
      FOREIGN KEY (routine_day_exercise_id)
      REFERENCES public.routine_day_exercises(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_session_exercises_routine_day_exercise_id
  ON public.session_exercises(routine_day_exercise_id);

-- Verification queries:
-- SELECT column_name, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'session_exercises'
--   AND column_name = 'routine_day_exercise_id';
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'session_exercises_routine_day_exercise_id_fkey';
