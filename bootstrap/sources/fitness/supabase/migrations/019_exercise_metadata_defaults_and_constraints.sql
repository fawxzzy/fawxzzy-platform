-- 019_exercise_metadata_defaults_and_constraints.sql
-- Add placeholder backfills/defaults and global-only integrity checks for exercise metadata.

-- A) Backfill placeholder images for existing rows where values are null/empty.
UPDATE public.exercises
SET image_howto_path = '/exercises/placeholders/howto.svg'
WHERE image_howto_path IS NULL OR btrim(image_howto_path) = '';

UPDATE public.exercises
SET image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE image_muscles_path IS NULL OR btrim(image_muscles_path) = '';

-- B) Set defaults for all future inserts.
ALTER TABLE public.exercises
  ALTER COLUMN image_howto_path SET DEFAULT '/exercises/placeholders/howto.svg',
  ALTER COLUMN image_muscles_path SET DEFAULT '/exercises/placeholders/muscles.svg';

-- B.1) Backfill required global metadata so new constraints can be applied safely.
UPDATE public.exercises
SET how_to_short = 'How-to details coming soon.'
WHERE is_global = true
  AND (how_to_short IS NULL OR btrim(how_to_short) = '');

UPDATE public.exercises
SET movement_pattern = 'push'
WHERE is_global = true
  AND (movement_pattern IS NULL OR btrim(movement_pattern) = '');

UPDATE public.exercises
SET primary_muscles = ARRAY['unspecified']::text[]
WHERE is_global = true
  AND (primary_muscles IS NULL OR cardinality(primary_muscles) = 0);

-- C) Enforce complete metadata for global exercises only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exercises_global_howto_required_chk'
      AND conrelid = 'public.exercises'::regclass
  ) THEN
    ALTER TABLE public.exercises
      ADD CONSTRAINT exercises_global_howto_required_chk
      CHECK (
        NOT is_global
        OR (how_to_short IS NOT NULL AND btrim(how_to_short) <> '')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exercises_global_movement_required_chk'
      AND conrelid = 'public.exercises'::regclass
  ) THEN
    ALTER TABLE public.exercises
      ADD CONSTRAINT exercises_global_movement_required_chk
      CHECK (
        NOT is_global
        OR (movement_pattern IS NOT NULL AND btrim(movement_pattern) <> '')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exercises_global_primary_muscles_required_chk'
      AND conrelid = 'public.exercises'::regclass
  ) THEN
    ALTER TABLE public.exercises
      ADD CONSTRAINT exercises_global_primary_muscles_required_chk
      CHECK (
        NOT is_global
        OR (primary_muscles IS NOT NULL AND cardinality(primary_muscles) > 0)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exercises_global_images_required_chk'
      AND conrelid = 'public.exercises'::regclass
  ) THEN
    ALTER TABLE public.exercises
      ADD CONSTRAINT exercises_global_images_required_chk
      CHECK (
        NOT is_global
        OR (
          image_howto_path IS NOT NULL
          AND btrim(image_howto_path) <> ''
          AND image_muscles_path IS NOT NULL
          AND btrim(image_muscles_path) <> ''
        )
      );
  END IF;
END
$$;

-- D) Prevent duplicate global exercise names (case/whitespace-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS exercises_global_name_uq
  ON public.exercises (lower(btrim(name)))
  WHERE is_global = true;

-- Verification queries (manual; do not run as part of migration):
-- 1) Confirm no missing global metadata remains:
-- SELECT id, name
-- FROM public.exercises
-- WHERE is_global = true
--   AND (
--     how_to_short IS NULL OR btrim(how_to_short) = ''
--     OR movement_pattern IS NULL OR btrim(movement_pattern) = ''
--     OR primary_muscles IS NULL OR cardinality(primary_muscles) = 0
--     OR image_howto_path IS NULL OR btrim(image_howto_path) = ''
--     OR image_muscles_path IS NULL OR btrim(image_muscles_path) = ''
--   );

-- 2) Confirm placeholder defaults are active:
-- SELECT column_name, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'exercises'
--   AND column_name IN ('image_howto_path', 'image_muscles_path');

-- 3) Confirm no duplicate global names under normalized key:
-- SELECT lower(btrim(name)) AS normalized_name, count(*)
-- FROM public.exercises
-- WHERE is_global = true
-- GROUP BY lower(btrim(name))
-- HAVING count(*) > 1;
