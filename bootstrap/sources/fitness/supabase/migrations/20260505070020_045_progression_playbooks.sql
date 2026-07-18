ALTER TABLE public.routine_day_exercises
ADD COLUMN IF NOT EXISTS progression_playbook_id text,
ADD COLUMN IF NOT EXISTS progression_playbook_config jsonb;

ALTER TABLE public.routine_day_exercises
DROP CONSTRAINT IF EXISTS routine_day_exercises_progression_playbook_id_check;

ALTER TABLE public.routine_day_exercises
ADD CONSTRAINT routine_day_exercises_progression_playbook_id_check
CHECK (
  progression_playbook_id IS NULL
  OR progression_playbook_id IN (
    'double_progression',
    'fixed_load_rep_range_progression',
    'deload_after_stall'
  )
);

ALTER TABLE public.routine_day_exercises
DROP CONSTRAINT IF EXISTS routine_day_exercises_progression_playbook_config_check;

ALTER TABLE public.routine_day_exercises
ADD CONSTRAINT routine_day_exercises_progression_playbook_config_check
CHECK (
  progression_playbook_config IS NULL
  OR jsonb_typeof(progression_playbook_config) = 'object'
);
