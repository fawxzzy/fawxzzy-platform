-- 039_seed_global_stretch.sql
-- Promote Stretch to the global exercise catalog with complete metadata.

INSERT INTO public.exercises (
  name,
  user_id,
  is_global,
  primary_muscle,
  equipment,
  how_to_short,
  primary_muscles,
  secondary_muscles,
  movement_pattern,
  image_howto_path,
  image_muscles_path,
  measurement_type,
  default_unit
)
SELECT
  'Stretch',
  NULL::uuid,
  TRUE,
  'recovery',
  'Bodyweight',
  'Complete your planned stretch or mobility drill, then mark the set when finished.',
  ARRAY['recovery']::text[],
  ARRAY[]::text[],
  'push',
  '/exercises/placeholders/howto.svg',
  '/exercises/placeholders/muscles.svg',
  'reps',
  'reps'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.exercises AS existing
  WHERE existing.user_id IS NULL
    AND lower(btrim(existing.name)) = lower(btrim('Stretch'))
);

UPDATE public.exercises
SET primary_muscle = 'recovery',
    equipment = 'Bodyweight',
    how_to_short = 'Complete your planned stretch or mobility drill, then mark the set when finished.',
    primary_muscles = ARRAY['recovery']::text[],
    secondary_muscles = ARRAY[]::text[],
    movement_pattern = 'push',
    image_howto_path = '/exercises/placeholders/howto.svg',
    image_muscles_path = '/exercises/placeholders/muscles.svg',
    measurement_type = 'reps',
    default_unit = 'reps'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Stretch'));
