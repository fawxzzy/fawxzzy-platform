-- 025_session_exercises_performed_index.sql
-- Additive performed order index to preserve actual exercise logging order in history.

ALTER TABLE public.session_exercises
  ADD COLUMN IF NOT EXISTS performed_index integer NULL;

CREATE INDEX IF NOT EXISTS idx_session_exercises_session_performed_index
  ON public.session_exercises(session_id, performed_index)
  WHERE performed_index IS NOT NULL;
