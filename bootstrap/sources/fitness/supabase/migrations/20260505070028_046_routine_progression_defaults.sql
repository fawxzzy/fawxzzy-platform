ALTER TABLE public.routines
ADD COLUMN IF NOT EXISTS default_progression_playbook_id text,
ADD COLUMN IF NOT EXISTS default_progression_playbook_config jsonb;

ALTER TABLE public.routines
DROP CONSTRAINT IF EXISTS routines_default_progression_playbook_id_check;

ALTER TABLE public.routines
ADD CONSTRAINT routines_default_progression_playbook_id_check
CHECK (
  default_progression_playbook_id IS NULL
  OR default_progression_playbook_id IN (
    'double_progression',
    'fixed_load_rep_range_progression',
    'deload_after_stall'
  )
);

ALTER TABLE public.routines
DROP CONSTRAINT IF EXISTS routines_default_progression_playbook_config_check;

ALTER TABLE public.routines
ADD CONSTRAINT routines_default_progression_playbook_config_check
CHECK (
  default_progression_playbook_config IS NULL
  OR jsonb_typeof(default_progression_playbook_config) = 'object'
);
