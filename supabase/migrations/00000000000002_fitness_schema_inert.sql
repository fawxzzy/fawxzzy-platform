-- APPLY_ADMITTED=false
-- INERT SOURCE PACKAGE: review and contained replay are required before any apply.

create schema if not exists fitness;

-- source supabase/migrations/001_init.sql blob ea2be3c4175e5878ff364956120172712cd732fe raw_sha256 d4b0fd3f945a6caa979d280709af9138e384e67c27f3c37ae0307af111e5a88d
create table if not exists fitness.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  performed_at timestamptz not null default now(),
  notes text null
);

create table if not exists fitness.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references fitness.sessions(id) on delete cascade,
  user_id uuid not null,
  exercise_id uuid not null,
  position int not null default 0,
  notes text null
);

create table if not exists fitness.sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references fitness.session_exercises(id) on delete cascade,
  user_id uuid not null,
  set_index int not null,
  weight numeric not null,
  reps int not null,
  rpe numeric null,
  is_warmup boolean not null default false,
  notes text null
);

alter table fitness.sessions enable row level security;

alter table fitness.session_exercises enable row level security;

alter table fitness.sets enable row level security;

create policy "sessions_select_own"
  on fitness.sessions
  for select
  using (user_id = auth.uid());

create policy "sessions_insert_own"
  on fitness.sessions
  for insert
  with check (user_id = auth.uid());

create policy "sessions_update_own"
  on fitness.sessions
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "sessions_delete_own"
  on fitness.sessions
  for delete
  using (user_id = auth.uid());

create policy "session_exercises_select_own"
  on fitness.session_exercises
  for select
  using (user_id = auth.uid());

create policy "session_exercises_insert_own"
  on fitness.session_exercises
  for insert
  with check (user_id = auth.uid());

create policy "session_exercises_update_own"
  on fitness.session_exercises
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "session_exercises_delete_own"
  on fitness.session_exercises
  for delete
  using (user_id = auth.uid());

create policy "sets_select_own"
  on fitness.sets
  for select
  using (user_id = auth.uid());

create policy "sets_insert_own"
  on fitness.sets
  for insert
  with check (user_id = auth.uid());

create policy "sets_update_own"
  on fitness.sets
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "sets_delete_own"
  on fitness.sets
  for delete
  using (user_id = auth.uid());

-- source supabase/migrations/002_routines.sql blob b415a6d7bd44501b3daaf97db9afd336edc79940 raw_sha256 7eed5d0745a7d43618daf118e6e5d352f89f900e7125b96a5751587e51c74cef
-- -------------------------
-- PROFILES (user settings)
-- -------------------------
create table if not exists fitness.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/Toronto',
  active_routine_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fitness.profiles enable row level security;

create policy "profiles_select_own"
  on fitness.profiles
  for select
  using (id = auth.uid());

create policy "profiles_insert_own"
  on fitness.profiles
  for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on fitness.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete_own"
  on fitness.profiles
  for delete
  using (id = auth.uid());

-- -------------------------
-- ROUTINES (template layer)
-- -------------------------
create table if not exists fitness.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  cycle_length_days int not null check (cycle_length_days >= 1 and cycle_length_days <= 365),
  start_date date not null,
  timezone text not null default 'America/Toronto',
  progression_mode text not null default 'progressive_overload',
  temperament text not null default 'moderate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fitness.routines enable row level security;

create policy "routines_select_own"
  on fitness.routines
  for select
  using (user_id = auth.uid());

create policy "routines_insert_own"
  on fitness.routines
  for insert
  with check (user_id = auth.uid());

create policy "routines_update_own"
  on fitness.routines
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "routines_delete_own"
  on fitness.routines
  for delete
  using (user_id = auth.uid());

-- -------------------------
-- ROUTINE DAYS
-- -------------------------
create table if not exists fitness.routine_days (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references fitness.routines(id) on delete cascade,
  user_id uuid not null,
  day_index int not null,
  name text null,
  is_rest boolean not null default false,
  notes text null,
  created_at timestamptz not null default now()
);

-- 1..cycle_length_days is enforced in app logic and by unique constraint.
-- (DB-level check needs cross-table access, so we keep it simple.)
create unique index if not exists routine_days_routine_id_day_index_uq
  on fitness.routine_days (routine_id, day_index);

alter table fitness.routine_days enable row level security;

create policy "routine_days_select_own"
  on fitness.routine_days
  for select
  using (user_id = auth.uid());

create policy "routine_days_insert_own"
  on fitness.routine_days
  for insert
  with check (user_id = auth.uid());

create policy "routine_days_update_own"
  on fitness.routine_days
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "routine_days_delete_own"
  on fitness.routine_days
  for delete
  using (user_id = auth.uid());

-- -------------------------
-- ROUTINE DAY EXERCISES
-- -------------------------
create table if not exists fitness.routine_day_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_day_id uuid not null references fitness.routine_days(id) on delete cascade,
  user_id uuid not null,
  exercise_id uuid not null,
  position int not null default 0,
  target_sets int null,
  rep_range_min int null,
  rep_range_max int null,
  notes text null,
  created_at timestamptz not null default now()
);

alter table fitness.routine_day_exercises enable row level security;

create policy "routine_day_exercises_select_own"
  on fitness.routine_day_exercises
  for select
  using (user_id = auth.uid());

create policy "routine_day_exercises_insert_own"
  on fitness.routine_day_exercises
  for insert
  with check (user_id = auth.uid());

create policy "routine_day_exercises_update_own"
  on fitness.routine_day_exercises
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "routine_day_exercises_delete_own"
  on fitness.routine_day_exercises
  for delete
  using (user_id = auth.uid());

-- -------------------------
-- LINK SESSIONS TO ROUTINES
-- -------------------------
alter table fitness.sessions
  add column if not exists routine_id uuid null references fitness.routines(id),
  add column if not exists routine_day_index int null;

-- -------------------------
-- INDEXES (performance)
-- -------------------------
create index if not exists routines_user_updated_at_idx
  on fitness.routines (user_id, updated_at desc);

create index if not exists routine_days_routine_day_idx
  on fitness.routine_days (routine_id, day_index);

create index if not exists routine_day_exercises_day_pos_idx
  on fitness.routine_day_exercises (routine_day_id, position);

create index if not exists profiles_active_routine_idx
  on fitness.profiles (active_routine_id);

create index if not exists sessions_user_performed_at_idx
  on fitness.sessions (user_id, performed_at desc);

-- source supabase/migrations/003_sets_reps_history.sql blob 7053eec1766223b74defc52acc348ff52252d7aa raw_sha256 d0cd5463502aebb400a4419b16e76d00bae98b328159a260b2d4ec84e6ab70d2
-- 003_sets_reps_history.sql

alter table fitness.routine_day_exercises
  add column if not exists target_sets int null,
  add column if not exists target_reps int null;

alter table fitness.sessions
  add column if not exists name text null,
  add column if not exists routine_day_name text null;

alter table fitness.session_exercises
  add column if not exists is_skipped boolean not null default false;

alter table fitness.sets
  add column if not exists duration_seconds int null;

-- source supabase/migrations/004_timers.sql blob 4752f813c322ab1131e749216f8860027777bab6 raw_sha256 6e4b2dea73d4634a09ed59b10a8ce4c71fd377b7bdab8326323ed481e50e02a8
-- 004_timers.sql

alter table fitness.sessions
  add column if not exists duration_seconds int null;

alter table fitness.sets
  add column if not exists duration_seconds int null;

-- source supabase/migrations/005_ui_core_fix_pack.sql blob 236152389ab757d0a3d85f73968b8bd2b9f6eb72 raw_sha256 cbe4a50db76cde4386c9d57105addddc1c4301977cb8ec88f62459fb8b46bb44
alter table fitness.routine_day_exercises
  add column if not exists target_reps_min integer,
  add column if not exists target_reps_max integer;

alter table fitness.routine_day_exercises
  drop constraint if exists routine_day_exercises_target_reps_range_check;

alter table fitness.routine_day_exercises
  add constraint routine_day_exercises_target_reps_range_check
  check (
    (target_reps_min is null and target_reps_max is null)
    or (
      target_reps_min is not null
      and target_reps_max is not null
      and target_reps_min >= 1
      and target_reps_max >= 1
      and target_reps_min <= target_reps_max
    )
  );

alter table fitness.routines
  add column if not exists weight_unit text not null default 'lbs';

alter table fitness.routines
  drop constraint if exists routines_weight_unit_check;

alter table fitness.routines
  add constraint routines_weight_unit_check
  check (weight_unit in ('lbs', 'kg'));

-- source supabase/migrations/006_session_status.sql blob 9be6b8ef66ef0ff0387f0964f0002755ff18c0b9 raw_sha256 6ef3c574c34e349ad3a5c367ab159e1004f15165b100341f2db32b2a656f69c1
alter table fitness.sessions
  add column if not exists status text not null default 'in_progress';

alter table fitness.sessions
  drop constraint if exists sessions_status_check;

alter table fitness.sessions
  add constraint sessions_status_check
  check (status in ('in_progress', 'completed'));

-- source supabase/migrations/007_relax_rep_range_constraint.sql blob abb4d26d6dbeee3023b8e00867008d07ab5f6d60 raw_sha256 602443c368bbd4e2ba5990bfd35dbdfdd596814ff774ae43ce20be4f3bb66c8e
alter table fitness.routine_day_exercises
  drop constraint if exists routine_day_exercises_target_reps_range_check;

alter table fitness.routine_day_exercises
  add constraint routine_day_exercises_target_reps_range_check
  check (
    (target_reps_min is null or target_reps_min >= 1)
    and (target_reps_max is null or target_reps_max >= 1)
    and (
      target_reps_min is null
      or target_reps_max is null
      or target_reps_min <= target_reps_max
    )
  );

-- source supabase/migrations/008_exercises_table_and_rls.sql blob 369431a8775f8102b9b725be81bb2b864eb6831e raw_sha256 10b80cac3fc490c3060969ddfc72e23cebf92ecc343b5312621f6a151dae93fa
create table if not exists fitness.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid null,
  is_global boolean not null default false,
  primary_muscle text null,
  equipment text null,
  created_at timestamptz not null default now()
);

alter table fitness.exercises
  add column if not exists user_id uuid null,
  add column if not exists is_global boolean not null default false,
  add column if not exists primary_muscle text null,
  add column if not exists equipment text null,
  add column if not exists created_at timestamptz not null default now();

alter table fitness.exercises
  drop constraint if exists exercises_name_non_empty;

alter table fitness.exercises
  add constraint exercises_name_non_empty
  check (length(btrim(name)) > 0);

create unique index if not exists exercises_global_name_uq
  on fitness.exercises ((lower(btrim(name))))
  where user_id is null;

create unique index if not exists exercises_user_name_uq
  on fitness.exercises (user_id, (lower(btrim(name))))
  where user_id is not null;

alter table fitness.exercises enable row level security;

create index if not exists exercises_lookup_idx
  on fitness.exercises (is_global desc, name asc);

-- source supabase/migrations/010_routine_targets_weight_duration.sql blob d9cb007b97855c937edb99ae184213b542d89d5c raw_sha256 cbb358e2939e845ac37f01823d7efc53257627911c31221614db82bb0ed6634b
alter table fitness.routine_day_exercises
  add column if not exists target_weight numeric,
  add column if not exists target_duration_seconds integer;

alter table fitness.routine_day_exercises
  drop constraint if exists routine_day_exercises_target_weight_nonnegative_check,
  drop constraint if exists routine_day_exercises_target_duration_nonnegative_check;

alter table fitness.routine_day_exercises
  add constraint routine_day_exercises_target_weight_nonnegative_check
  check (target_weight is null or target_weight >= 0),
  add constraint routine_day_exercises_target_duration_nonnegative_check
  check (target_duration_seconds is null or target_duration_seconds >= 0);

-- source supabase/migrations/011_exercises_id_uuid_backfill.sql blob 8353782d01a79c9c57fcd0760efff24e31577f91 raw_sha256 938d7c1011518c003b1843a852ea2823375de1145b52645db605602aba1a5908
-- Keep exercise naming uniqueness deterministic for global + per-user catalogs.
drop index if exists fitness.exercises_global_name_uq;

create unique index exercises_global_name_uq
  on fitness.exercises (name)
  where user_id is null;

drop index if exists fitness.exercises_user_name_uq;

create unique index exercises_user_name_uq
  on fitness.exercises (user_id, name)
  where user_id is not null;

-- source supabase/migrations/012_fix_exercises_id_nulls_constraints.sql blob 4c1a7c477d617ffede97e670049e3c459399f1fe raw_sha256 a20592afb339f6bf768929e009ec00cc64a256029afebc7be54885e79e6402d1
-- 2) Enforce auto-generated UUID IDs.
alter table fitness.exercises
  alter column id set default gen_random_uuid();

alter table fitness.exercises
  alter column id set not null;

-- 4) Deterministic uniqueness for global + per-user names.
create unique index if not exists exercises_global_name_uq
  on fitness.exercises (name)
  where user_id is null;

create unique index if not exists exercises_user_name_uq
  on fitness.exercises (user_id, name)
  where user_id is not null;

-- source supabase/migrations/013_sets_session_exercise_set_index_unique.sql blob b71514db062e1945ee2eb3494e8af75d91bf2acb raw_sha256 337b497a7b309298ea6db168cae0857094b9125e5d4a7cf3f91fad7ce9777a61
-- Ensure each set index is unique per exercise instance to support safe append retries.
create unique index if not exists sets_session_exercise_id_set_index_uq
  on fitness.sets (session_exercise_id, set_index);

-- source supabase/migrations/014_sets_client_log_id_unique.sql blob cfada0735ed33aeefda0542ae9c5de56e36f2636 raw_sha256 de8c46fc23efc77d94aeb678e7559f7f67f483347e5a7b71be055667c93071db
alter table fitness.sets
  add column if not exists client_log_id text null;

create unique index if not exists sets_user_id_client_log_id_uq
  on fitness.sets (user_id, client_log_id)
  where client_log_id is not null;

-- source supabase/migrations/015_history_log_audit_notes.sql blob 3d19c47a78a56bd83ef80c33024fc4cb87aaee59 raw_sha256 9d0552194e500faa47300756794f821fb6f18162d55371f0550884133fdf3058
alter table fitness.sessions
  add column if not exists day_name_override text null,
  add column if not exists notes text null;

alter table fitness.session_exercises
  add column if not exists notes text null;

-- source supabase/migrations/016_weight_unit_overrides.sql blob ddca4c784fc3d124182c7d622662d89530d0d00d raw_sha256 ce5e69601a85a25d0eb8375b108af392d57da0b556c4b9a6490c40de70b5aee7
alter table fitness.routine_day_exercises
  add column if not exists target_weight_unit text;

alter table fitness.routine_day_exercises
  drop constraint if exists routine_day_exercises_target_weight_unit_check;

alter table fitness.routine_day_exercises
  add constraint routine_day_exercises_target_weight_unit_check
  check (target_weight_unit is null or target_weight_unit in ('lbs', 'kg'));

alter table fitness.sets
  add column if not exists weight_unit text;

alter table fitness.sets
  drop constraint if exists sets_weight_unit_check;

alter table fitness.sets
  add constraint sets_weight_unit_check
  check (weight_unit is null or weight_unit in ('lbs', 'kg'));

-- source supabase/migrations/017_exercise_media_and_metadata.sql blob 8823cfe8ac656a6d28dc3cd8e7339b057e50f890 raw_sha256 f9b6345b02b9ce2e08b7fac5ba69a0e38262587c54ff1247c6e510d027e6f28f
alter table fitness.exercises
  add column if not exists how_to_short text null,
  add column if not exists primary_muscles text[] null,
  add column if not exists secondary_muscles text[] null,
  add column if not exists movement_pattern text null,
  add column if not exists image_howto_path text null,
  add column if not exists image_muscles_path text null;

alter table fitness.exercises
  drop constraint if exists exercises_movement_pattern_check;

alter table fitness.exercises
  add constraint exercises_movement_pattern_check
  check (
    movement_pattern is null
    or movement_pattern in ('push', 'pull', 'hinge', 'squat', 'carry', 'rotation')
  );

-- Replace SVG placeholder paths with Supabase Storage URLs for real images.

-- source supabase/migrations/019_exercise_metadata_defaults_and_constraints.sql blob d0d0a9cc84634e6af15ff80955c448db3f9a5d4d raw_sha256 46eb40949a5deb1227a370cd87b6b2a85d171b88daf5cd3c5f4cf0fe5deb00fd
-- B) Set defaults for all future inserts.
ALTER TABLE fitness.exercises
  ALTER COLUMN image_howto_path SET DEFAULT '/exercises/placeholders/howto.svg',
  ALTER COLUMN image_muscles_path SET DEFAULT '/exercises/placeholders/muscles.svg';

-- D) Prevent duplicate global exercise names (case/whitespace-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS exercises_global_name_uq
  ON fitness.exercises (lower(btrim(name)))
  WHERE is_global = true;

-- Verification queries (manual; do not run as part of migration):
-- 1) Confirm no missing global metadata remains:
-- SELECT id, name
-- FROM fitness.exercises
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
-- FROM fitness.exercises
-- WHERE is_global = true
-- GROUP BY lower(btrim(name))
-- HAVING count(*) > 1;

-- source supabase/migrations/020_global_exercises_metadata_backfill.sql blob 83b7f99fc7224500f938fdeefd8b84f00fc89244 raw_sha256 e51a9af684cc2047392b5aa0986be269a2707162094800a0e29a3113601bcb46
-- QA snippet (run manually in Supabase SQL editor):
-- 1) zero global rows with NULL/empty images
-- SELECT count(*) AS missing_global_images
-- FROM fitness.exercises
-- WHERE is_global = TRUE
--   AND (
--     image_howto_path IS NULL OR btrim(image_howto_path) = ''
--     OR image_muscles_path IS NULL OR btrim(image_muscles_path) = ''
--   );

-- 2) zero global rows missing/empty movement_pattern
-- SELECT count(*) AS missing_global_movement_pattern
-- FROM fitness.exercises
-- WHERE is_global = TRUE
--   AND (movement_pattern IS NULL OR btrim(movement_pattern) = '');

-- 3) zero global rows with empty primary_muscles
-- SELECT count(*) AS empty_global_primary_muscles
-- FROM fitness.exercises
-- WHERE is_global = TRUE
--   AND (primary_muscles IS NULL OR cardinality(primary_muscles) = 0);

-- 4) count of matched global rows equals JSON count
-- WITH json_names AS (
--   SELECT * FROM (VALUES
--     ('Ab Wheel Rollout'),
--     ('Abductor Machine'),
--     ('Adductor Machine'),
--     ('Air Bike Sprint'),
--     ('Alternating Dumbbell Curl'),
--     ('Arnold Press'),
--     ('Back Extension'),
--     ('Back Squat'),
--     ('Barbell Bench Press'),
--     ('Barbell Curl'),
--     ('Barbell Row'),
--     ('Bulgarian Split Squat'),
--     ('Cable Crunch'),
--     ('Cable Curl'),
--     ('Cable Fly'),
--     ('Cable Kickback'),
--     ('Cable Lateral Raise'),
--     ('Cable Rear Delt Fly'),
--     ('Calf Raise (Seated)'),
--     ('Calf Raise (Standing)'),
--     ('Chest-Supported Row'),
--     ('Chin-Up'),
--     ('Close-Grip Bench Press'),
--     ('Close-Grip Lat Pulldown'),
--     ('Close-Grip Push-Up'),
--     ('Concentration Curl'),
--     ('Cross-Body Hammer Curl'),
--     ('Dead Bug'),
--     ('Deadlift'),
--     ('Decline Barbell Bench Press'),
--     ('Decline Dumbbell Bench Press'),
--     ('Deficit Push-Up'),
--     ('Dips (Chest)'),
--     ('Dips (Triceps)'),
--     ('Donkey Calf Raise'),
--     ('Dumbbell Bench Press'),
--     ('Dumbbell Curl'),
--     ('Dumbbell Fly'),
--     ('Dumbbell Overhead Triceps Extension'),
--     ('Dumbbell Row'),
--     ('EZ-Bar Curl'),
--     ('Face Pull'),
--     ('Front Raise'),
--     ('Front Squat'),
--     ('Glute Bridge'),
--     ('Goblet Squat'),
--     ('Hack Squat'),
--     ('Hammer Curl'),
--     ('Hanging Leg Raise'),
--     ('High-Bar Back Squat'),
--     ('High-to-Low Cable Fly'),
--     ('Hip Thrust'),
--     ('Hollow Body Hold'),
--     ('Incline Barbell Bench Press'),
--     ('Incline Dumbbell Bench Press'),
--     ('Incline Dumbbell Curl'),
--     ('Incline Dumbbell Fly'),
--     ('Incline Walk'),
--     ('Jump Rope'),
--     ('Lat Pulldown'),
--     ('Lateral Raise'),
--     ('Leaning Cable Lateral Raise'),
--     ('Leg Extension'),
--     ('Leg Press'),
--     ('Low-Bar Back Squat'),
--     ('Low-to-High Cable Fly'),
--     ('Lying Leg Curl'),
--     ('Lying Leg Raise'),
--     ('Machine Biceps Curl'),
--     ('Machine Crunch'),
--     ('Machine Row'),
--     ('Machine Shoulder Press'),
--     ('Neutral-Grip Pull-Up'),
--     ('Nordic Curl'),
--     ('Overhead Press'),
--     ('Overhead Triceps Extension'),
--     ('Pallof Press'),
--     ('Paused Back Squat'),
--     ('Paused Barbell Bench Press'),
--     ('Paused Deadlift'),
--     ('Paused Front Squat'),
--     ('Pec Deck'),
--     ('Pendlay Row'),
--     ('Plank'),
--     ('Plate Front Raise'),
--     ('Preacher Curl'),
--     ('Pull-Up'),
--     ('Push Press'),
--     ('Push-Up'),
--     ('Rack Pull'),
--     ('Rear Delt Fly'),
--     ('Reverse Hyperextension'),
--     ('Reverse Lunge'),
--     ('Reverse Pec Deck'),
--     ('Reverse-Grip Pushdown'),
--     ('Romanian Deadlift'),
--     ('Rope Pushdown'),
--     ('Rowing Machine'),
--     ('Russian Twist'),
--     ('Seated Barbell Overhead Press'),
--     ('Seated Cable Row'),
--     ('Seated Dumbbell Shoulder Press'),
--     ('Seated Leg Curl'),
--     ('Side Plank'),
--     ('Single-Arm Cable Row'),
--     ('Single-Arm Dumbbell Bench Press'),
--     ('Single-Arm Dumbbell Row'),
--     ('Single-Arm Lat Pulldown'),
--     ('Single-Leg Hip Thrust'),
--     ('Single-Leg Press'),
--     ('Single-Leg Romanian Deadlift'),
--     ('Skullcrusher'),
--     ('Sled Push'),
--     ('Smith Machine Bench Press'),
--     ('Smith Machine Shoulder Press'),
--     ('Smith Machine Squat'),
--     ('Snatch-Grip Deadlift'),
--     ('Stair Climber'),
--     ('Stationary Bike'),
--     ('Step-Up'),
--     ('Stiff-Leg Deadlift'),
--     ('Straight-Arm Pulldown'),
--     ('T-Bar Row'),
--     ('Tempo Back Squat'),
--     ('Tempo Barbell Bench Press'),
--     ('Tempo Deadlift'),
--     ('Treadmill Run'),
--     ('Triceps Pushdown'),
--     ('Upright Row'),
--     ('Walking Lunge'),
--     ('Weighted Plank'),
--     ('Weighted Pull-Up'),
--     ('Weighted Push-Up'),
--     ('Wide-Grip Lat Pulldown'),
--     ('Yates Row'),
--     ('Chest Press')
--   ) AS v(name)
-- )
-- SELECT
--   (SELECT count(*) FROM json_names) AS json_count,
--   (SELECT count(*)
--    FROM fitness.exercises e
--    JOIN json_names j
--      ON lower(btrim(e.name)) = lower(btrim(j.name))
--    WHERE e.is_global = TRUE) AS matched_global_rows;

-- 5) optional: JSON names that did not match a DB global row
-- WITH json_names AS (
--   SELECT * FROM (VALUES
--     ('Ab Wheel Rollout'),
--     ('Abductor Machine'),
--     ('Adductor Machine'),
--     ('Air Bike Sprint'),
--     ('Alternating Dumbbell Curl'),
--     ('Arnold Press'),
--     ('Back Extension'),
--     ('Back Squat'),
--     ('Barbell Bench Press'),
--     ('Barbell Curl'),
--     ('Barbell Row'),
--     ('Bulgarian Split Squat'),
--     ('Cable Crunch'),
--     ('Cable Curl'),
--     ('Cable Fly'),
--     ('Cable Kickback'),
--     ('Cable Lateral Raise'),
--     ('Cable Rear Delt Fly'),
--     ('Calf Raise (Seated)'),
--     ('Calf Raise (Standing)'),
--     ('Chest-Supported Row'),
--     ('Chin-Up'),
--     ('Close-Grip Bench Press'),
--     ('Close-Grip Lat Pulldown'),
--     ('Close-Grip Push-Up'),
--     ('Concentration Curl'),
--     ('Cross-Body Hammer Curl'),
--     ('Dead Bug'),
--     ('Deadlift'),
--     ('Decline Barbell Bench Press'),
--     ('Decline Dumbbell Bench Press'),
--     ('Deficit Push-Up'),
--     ('Dips (Chest)'),
--     ('Dips (Triceps)'),
--     ('Donkey Calf Raise'),
--     ('Dumbbell Bench Press'),
--     ('Dumbbell Curl'),
--     ('Dumbbell Fly'),
--     ('Dumbbell Overhead Triceps Extension'),
--     ('Dumbbell Row'),
--     ('EZ-Bar Curl'),
--     ('Face Pull'),
--     ('Front Raise'),
--     ('Front Squat'),
--     ('Glute Bridge'),
--     ('Goblet Squat'),
--     ('Hack Squat'),
--     ('Hammer Curl'),
--     ('Hanging Leg Raise'),
--     ('High-Bar Back Squat'),
--     ('High-to-Low Cable Fly'),
--     ('Hip Thrust'),
--     ('Hollow Body Hold'),
--     ('Incline Barbell Bench Press'),
--     ('Incline Dumbbell Bench Press'),
--     ('Incline Dumbbell Curl'),
--     ('Incline Dumbbell Fly'),
--     ('Incline Walk'),
--     ('Jump Rope'),
--     ('Lat Pulldown'),
--     ('Lateral Raise'),
--     ('Leaning Cable Lateral Raise'),
--     ('Leg Extension'),
--     ('Leg Press'),
--     ('Low-Bar Back Squat'),
--     ('Low-to-High Cable Fly'),
--     ('Lying Leg Curl'),
--     ('Lying Leg Raise'),
--     ('Machine Biceps Curl'),
--     ('Machine Crunch'),
--     ('Machine Row'),
--     ('Machine Shoulder Press'),
--     ('Neutral-Grip Pull-Up'),
--     ('Nordic Curl'),
--     ('Overhead Press'),
--     ('Overhead Triceps Extension'),
--     ('Pallof Press'),
--     ('Paused Back Squat'),
--     ('Paused Barbell Bench Press'),
--     ('Paused Deadlift'),
--     ('Paused Front Squat'),
--     ('Pec Deck'),
--     ('Pendlay Row'),
--     ('Plank'),
--     ('Plate Front Raise'),
--     ('Preacher Curl'),
--     ('Pull-Up'),
--     ('Push Press'),
--     ('Push-Up'),
--     ('Rack Pull'),
--     ('Rear Delt Fly'),
--     ('Reverse Hyperextension'),
--     ('Reverse Lunge'),
--     ('Reverse Pec Deck'),
--     ('Reverse-Grip Pushdown'),
--     ('Romanian Deadlift'),
--     ('Rope Pushdown'),
--     ('Rowing Machine'),
--     ('Russian Twist'),
--     ('Seated Barbell Overhead Press'),
--     ('Seated Cable Row'),
--     ('Seated Dumbbell Shoulder Press'),
--     ('Seated Leg Curl'),
--     ('Side Plank'),
--     ('Single-Arm Cable Row'),
--     ('Single-Arm Dumbbell Bench Press'),
--     ('Single-Arm Dumbbell Row'),
--     ('Single-Arm Lat Pulldown'),
--     ('Single-Leg Hip Thrust'),
--     ('Single-Leg Press'),
--     ('Single-Leg Romanian Deadlift'),
--     ('Skullcrusher'),
--     ('Sled Push'),
--     ('Smith Machine Bench Press'),
--     ('Smith Machine Shoulder Press'),
--     ('Smith Machine Squat'),
--     ('Snatch-Grip Deadlift'),
--     ('Stair Climber'),
--     ('Stationary Bike'),
--     ('Step-Up'),
--     ('Stiff-Leg Deadlift'),
--     ('Straight-Arm Pulldown'),
--     ('T-Bar Row'),
--     ('Tempo Back Squat'),
--     ('Tempo Barbell Bench Press'),
--     ('Tempo Deadlift'),
--     ('Treadmill Run'),
--     ('Triceps Pushdown'),
--     ('Upright Row'),
--     ('Walking Lunge'),
--     ('Weighted Plank'),
--     ('Weighted Pull-Up'),
--     ('Weighted Push-Up'),
--     ('Wide-Grip Lat Pulldown'),
--     ('Yates Row'),
--     ('Chest Press')
--   ) AS v(name)
-- )
-- SELECT j.name
-- FROM json_names j
-- LEFT JOIN fitness.exercises e
--   ON e.is_global = TRUE
--  AND lower(btrim(e.name)) = lower(btrim(j.name))
-- WHERE e.id IS NULL
-- ORDER BY j.name;

-- source supabase/migrations/021_exercise_measurement_and_set_distance.sql blob 43541315914b08068b18b9c60127432d3e2da4dc raw_sha256 16881d2eff85c401ba6b821a0ecc489cbf02312a50dd810d3efcbd588352c521
-- 021_exercise_measurement_and_set_distance.sql
-- Add exercise-level measurement contract fields and set-level distance logging fields.

-- 1) Exercise-level fields.
ALTER TABLE fitness.exercises
  ADD COLUMN IF NOT EXISTS measurement_type text,
  ADD COLUMN IF NOT EXISTS default_unit text,
  ADD COLUMN IF NOT EXISTS calories_estimation_method text;

ALTER TABLE fitness.exercises
  ALTER COLUMN measurement_type SET DEFAULT 'reps',
  ALTER COLUMN measurement_type SET NOT NULL;

-- 2) Set-level fields for distance and calories.
ALTER TABLE fitness.sets
  ADD COLUMN IF NOT EXISTS distance numeric,
  ADD COLUMN IF NOT EXISTS distance_unit text,
  ADD COLUMN IF NOT EXISTS calories numeric;

ALTER TABLE fitness.sets
  DROP CONSTRAINT IF EXISTS sets_distance_unit_check;

ALTER TABLE fitness.sets
  ADD CONSTRAINT sets_distance_unit_check
  CHECK (distance_unit IS NULL OR distance_unit IN ('mi', 'km', 'm'));

-- Verification queries (manual; do not run as part of migration):
-- 1) Count exercises by measurement type:
-- SELECT measurement_type, count(*)
-- FROM fitness.exercises
-- GROUP BY measurement_type
-- ORDER BY measurement_type;

-- 2) Confirm no exercises have NULL/empty measurement_type:
-- SELECT count(*)
-- FROM fitness.exercises
-- WHERE measurement_type IS NULL OR btrim(measurement_type) = '';

-- 3) Check sets that have distance but no distance_unit:
-- SELECT count(*)
-- FROM fitness.sets
-- WHERE distance IS NOT NULL AND distance_unit IS NULL;

-- source supabase/migrations/0221_routine_day_exercise_cardio_targets.sql blob 887e139c109c2a4dea185eac4ac4b06350b1f60e raw_sha256 2fc9499be218c26564802cc94717f0e32efe6379311cef8d3baba20c1b638ab1
-- 0221_routine_day_exercise_cardio_targets.sql
-- Add optional cardio-oriented routine targets.

ALTER TABLE fitness.routine_day_exercises
  ADD COLUMN IF NOT EXISTS target_distance numeric,
  ADD COLUMN IF NOT EXISTS target_distance_unit text,
  ADD COLUMN IF NOT EXISTS target_calories numeric;

ALTER TABLE fitness.routine_day_exercises
  DROP CONSTRAINT IF EXISTS routine_day_exercises_target_distance_unit_check;

ALTER TABLE fitness.routine_day_exercises
  ADD CONSTRAINT routine_day_exercises_target_distance_unit_check
  CHECK (target_distance_unit IS NULL OR target_distance_unit IN ('mi', 'km', 'm'));

-- source supabase/migrations/0222_profile_unit_preferences.sql blob a50d7de4955d4320e3b914e3b8aa63e5120175f1 raw_sha256 4c9012eb90a4f7853188e067e64d53b94f3104c35a066a59f60d6b6ef34cc6a8
alter table fitness.profiles
  add column if not exists preferred_weight_unit text not null default 'lbs',
  add column if not exists preferred_distance_unit text not null default 'mi';

alter table fitness.profiles
  drop constraint if exists profiles_preferred_weight_unit_check,
  add constraint profiles_preferred_weight_unit_check check (preferred_weight_unit in ('lbs', 'kg'));

alter table fitness.profiles
  drop constraint if exists profiles_preferred_distance_unit_check,
  add constraint profiles_preferred_distance_unit_check check (preferred_distance_unit in ('mi', 'km'));

-- source supabase/migrations/023_routine_session_exercise_measurement_overrides.sql blob 38adcae9c9da864d4d2a9f1480eb6008d2a5df2a raw_sha256 68d69fd3212e06f258a8891a6f7e869bc907a8edc1433833e45a06a1cabfb9a0
-- 023_routine_session_exercise_measurement_overrides.sql
-- Add per-routine-exercise and per-session-exercise measurement/unit overrides.

ALTER TABLE fitness.routine_day_exercises
  ADD COLUMN IF NOT EXISTS measurement_type text,
  ADD COLUMN IF NOT EXISTS default_unit text;

ALTER TABLE fitness.routine_day_exercises
  DROP CONSTRAINT IF EXISTS routine_day_exercises_measurement_type_check;

ALTER TABLE fitness.routine_day_exercises
  ADD CONSTRAINT routine_day_exercises_measurement_type_check
  CHECK (
    measurement_type IS NULL
    OR measurement_type IN ('reps', 'time', 'distance', 'time_distance')
  );

ALTER TABLE fitness.session_exercises
  ADD COLUMN IF NOT EXISTS measurement_type text,
  ADD COLUMN IF NOT EXISTS default_unit text;

ALTER TABLE fitness.session_exercises
  DROP CONSTRAINT IF EXISTS session_exercises_measurement_type_check;

ALTER TABLE fitness.session_exercises
  ADD CONSTRAINT session_exercises_measurement_type_check
  CHECK (
    measurement_type IS NULL
    OR measurement_type IN ('reps', 'time', 'distance', 'time_distance')
  );

-- Verification queries:
-- SELECT count(*) AS routine_day_exercises_measurement_type_set
-- FROM fitness.routine_day_exercises
-- WHERE measurement_type IS NOT NULL;

-- SELECT count(*) AS session_exercises_measurement_type_set
-- FROM fitness.session_exercises
-- WHERE measurement_type IS NOT NULL;

-- source supabase/migrations/024_session_exercises_routine_day_exercise_fk.sql blob d95ac0aac9c07978a85959d70023572c1f0ccb78 raw_sha256 b4c396146231e5a408ce4ea5f958a3c77e22a8aacfcab3a6ab800c3d04f59e76
-- 024_session_exercises_routine_day_exercise_fk.sql
-- Link session_exercises rows back to their exact planned routine_day_exercises row.

ALTER TABLE fitness.session_exercises
  ADD COLUMN IF NOT EXISTS routine_day_exercise_id uuid;

CREATE INDEX IF NOT EXISTS idx_session_exercises_routine_day_exercise_id
  ON fitness.session_exercises(routine_day_exercise_id);

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

-- source supabase/migrations/025_session_exercises_performed_index.sql blob 71db66f141ad1aaed364e78655583829f23003ac raw_sha256 2069fc9544799e4d2d876a5b929ab3195622297e123a192d7efc39a10f72c3b7
-- 025_session_exercises_performed_index.sql
-- Additive performed order index to preserve actual exercise logging order in history.

ALTER TABLE fitness.session_exercises
  ADD COLUMN IF NOT EXISTS performed_index integer NULL;

CREATE INDEX IF NOT EXISTS idx_session_exercises_session_performed_index
  ON fitness.session_exercises(session_id, performed_index)
  WHERE performed_index IS NOT NULL;

-- source supabase/migrations/026_exercise_stats_cache.sql blob 22da38067b19794be28feba5056942713954d852 raw_sha256 3a932ce660894c73e75e5534f3090088ad9f2343bf831ecf3cdaecae91c5e534
create table if not exists fitness.exercise_stats (
  user_id uuid not null,
  exercise_id uuid not null references fitness.exercises(id) on delete cascade,
  last_weight numeric null,
  last_reps int null,
  last_unit text null,
  last_performed_at timestamptz null,
  pr_weight numeric null,
  pr_reps int null,
  pr_est_1rm numeric null,
  pr_achieved_at timestamptz null,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table fitness.exercise_stats enable row level security;

create policy "exercise_stats_select_own"
  on fitness.exercise_stats
  for select
  using (user_id = auth.uid());

create policy "exercise_stats_insert_own"
  on fitness.exercise_stats
  for insert
  with check (user_id = auth.uid());

create policy "exercise_stats_update_own"
  on fitness.exercise_stats
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "exercise_stats_delete_own"
  on fitness.exercise_stats
  for delete
  using (user_id = auth.uid());

create index if not exists session_exercises_user_exercise_session_idx
  on fitness.session_exercises (user_id, exercise_id, session_id);

create index if not exists sets_user_session_exercise_set_index_idx
  on fitness.sets (user_id, session_exercise_id, set_index desc);

create index if not exists sessions_user_status_performed_idx
  on fitness.sessions (user_id, status, performed_at desc);

-- source supabase/migrations/027_session_exercises_target_calories.sql blob 117f784016f5af19cf8d0d1483cff7ffe4f8baad raw_sha256 62353e5c7dec6de57ad425343159afbf0169334b0cd1dcda3f2421aa3013a45c
-- 027_session_exercises_target_calories.sql
-- Add optional per-session exercise calories target for measurement parity with routine targets.

ALTER TABLE fitness.session_exercises
  ADD COLUMN IF NOT EXISTS target_calories numeric;

ALTER TABLE fitness.session_exercises
  DROP CONSTRAINT IF EXISTS session_exercises_target_calories_nonnegative_check;

ALTER TABLE fitness.session_exercises
  ADD CONSTRAINT session_exercises_target_calories_nonnegative_check
  CHECK (target_calories IS NULL OR target_calories >= 0);

-- source supabase/migrations/028_session_exercises_goal_targets_consistency.sql blob 4e9c5deb560a941c7660d7e3e76738d49beca219 raw_sha256 f65e70e1cc1f6e27479a59f28c4a371060193cee129e2b6a375cbc74d16792b9
-- 028_session_exercises_goal_targets_consistency.sql
-- Ensure session exercise target columns cover all supported Add Exercise goal metrics.

ALTER TABLE fitness.session_exercises
  ADD COLUMN IF NOT EXISTS target_reps integer,
  ADD COLUMN IF NOT EXISTS target_weight numeric,
  ADD COLUMN IF NOT EXISTS target_weight_unit text,
  ADD COLUMN IF NOT EXISTS target_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS target_distance numeric,
  ADD COLUMN IF NOT EXISTS target_distance_unit text,
  ADD COLUMN IF NOT EXISTS target_calories numeric;

ALTER TABLE fitness.session_exercises
  DROP CONSTRAINT IF EXISTS session_exercises_target_reps_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_weight_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_duration_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_distance_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_calories_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_weight_unit_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_distance_unit_check;

ALTER TABLE fitness.session_exercises
  ADD CONSTRAINT session_exercises_target_reps_nonnegative_check
    CHECK (target_reps IS NULL OR target_reps >= 0),
  ADD CONSTRAINT session_exercises_target_weight_nonnegative_check
    CHECK (target_weight IS NULL OR target_weight >= 0),
  ADD CONSTRAINT session_exercises_target_duration_nonnegative_check
    CHECK (target_duration_seconds IS NULL OR target_duration_seconds >= 0),
  ADD CONSTRAINT session_exercises_target_distance_nonnegative_check
    CHECK (target_distance IS NULL OR target_distance >= 0),
  ADD CONSTRAINT session_exercises_target_calories_nonnegative_check
    CHECK (target_calories IS NULL OR target_calories >= 0),
  ADD CONSTRAINT session_exercises_target_weight_unit_check
    CHECK (target_weight_unit IS NULL OR target_weight_unit IN ('lbs', 'kg')),
  ADD CONSTRAINT session_exercises_target_distance_unit_check
    CHECK (target_distance_unit IS NULL OR target_distance_unit IN ('mi', 'km', 'm'));

-- source supabase/migrations/029_session_exercises_range_goal_columns.sql blob 9c0944eb99f36e8728f31d1a69691d41f519590b raw_sha256 3da9518f614be88e30ed87db82812c5605307e27949bf750c02f9c672c93fdca
-- 029_session_exercises_range_goal_columns.sql
-- Add nullable range-goal columns for session_exercises. Additive only: keep legacy single-value target_* columns.

ALTER TABLE fitness.session_exercises
  ADD COLUMN IF NOT EXISTS target_reps_min integer,
  ADD COLUMN IF NOT EXISTS target_reps_max integer,
  ADD COLUMN IF NOT EXISTS target_weight_min numeric,
  ADD COLUMN IF NOT EXISTS target_weight_max numeric,
  ADD COLUMN IF NOT EXISTS target_time_seconds_min integer,
  ADD COLUMN IF NOT EXISTS target_time_seconds_max integer,
  ADD COLUMN IF NOT EXISTS target_distance_min numeric,
  ADD COLUMN IF NOT EXISTS target_distance_max numeric,
  ADD COLUMN IF NOT EXISTS target_calories_min numeric,
  ADD COLUMN IF NOT EXISTS target_calories_max numeric;

ALTER TABLE fitness.session_exercises
  DROP CONSTRAINT IF EXISTS session_exercises_target_reps_min_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_reps_max_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_weight_min_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_weight_max_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_time_seconds_min_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_time_seconds_max_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_distance_min_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_distance_max_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_calories_min_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_calories_max_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_reps_range_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_weight_range_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_time_seconds_range_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_distance_range_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_calories_range_check;

ALTER TABLE fitness.session_exercises
  ADD CONSTRAINT session_exercises_target_reps_min_nonnegative_check
    CHECK (target_reps_min IS NULL OR target_reps_min >= 0),
  ADD CONSTRAINT session_exercises_target_reps_max_nonnegative_check
    CHECK (target_reps_max IS NULL OR target_reps_max >= 0),
  ADD CONSTRAINT session_exercises_target_weight_min_nonnegative_check
    CHECK (target_weight_min IS NULL OR target_weight_min >= 0),
  ADD CONSTRAINT session_exercises_target_weight_max_nonnegative_check
    CHECK (target_weight_max IS NULL OR target_weight_max >= 0),
  ADD CONSTRAINT session_exercises_target_time_seconds_min_nonnegative_check
    CHECK (target_time_seconds_min IS NULL OR target_time_seconds_min >= 0),
  ADD CONSTRAINT session_exercises_target_time_seconds_max_nonnegative_check
    CHECK (target_time_seconds_max IS NULL OR target_time_seconds_max >= 0),
  ADD CONSTRAINT session_exercises_target_distance_min_nonnegative_check
    CHECK (target_distance_min IS NULL OR target_distance_min >= 0),
  ADD CONSTRAINT session_exercises_target_distance_max_nonnegative_check
    CHECK (target_distance_max IS NULL OR target_distance_max >= 0),
  ADD CONSTRAINT session_exercises_target_calories_min_nonnegative_check
    CHECK (target_calories_min IS NULL OR target_calories_min >= 0),
  ADD CONSTRAINT session_exercises_target_calories_max_nonnegative_check
    CHECK (target_calories_max IS NULL OR target_calories_max >= 0),
  ADD CONSTRAINT session_exercises_target_reps_range_check
    CHECK (target_reps_min IS NULL OR target_reps_max IS NULL OR target_reps_min <= target_reps_max),
  ADD CONSTRAINT session_exercises_target_weight_range_check
    CHECK (target_weight_min IS NULL OR target_weight_max IS NULL OR target_weight_min <= target_weight_max),
  ADD CONSTRAINT session_exercises_target_time_seconds_range_check
    CHECK (target_time_seconds_min IS NULL OR target_time_seconds_max IS NULL OR target_time_seconds_min <= target_time_seconds_max),
  ADD CONSTRAINT session_exercises_target_distance_range_check
    CHECK (target_distance_min IS NULL OR target_distance_max IS NULL OR target_distance_min <= target_distance_max),
  ADD CONSTRAINT session_exercises_target_calories_range_check
    CHECK (target_calories_min IS NULL OR target_calories_max IS NULL OR target_calories_min <= target_calories_max);

-- source supabase/migrations/0301_session_exercises_target_sets_range_columns.sql blob a31ca3ac6d1b1b8f4f83ff4536b0b85660c6dc61 raw_sha256 fc5150c341e11bdc637d2da54d2c23225ce0d365b4fc54e0ddb114ab41ee26ac
-- 0301_session_exercises_target_sets_range_columns.sql
-- Add nullable set-range columns for session_exercises as additive-only schema evolution.

ALTER TABLE fitness.session_exercises
  ADD COLUMN IF NOT EXISTS target_sets_min integer,
  ADD COLUMN IF NOT EXISTS target_sets_max integer;

ALTER TABLE fitness.session_exercises
  DROP CONSTRAINT IF EXISTS session_exercises_target_sets_min_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_sets_max_nonnegative_check,
  DROP CONSTRAINT IF EXISTS session_exercises_target_sets_range_check;

ALTER TABLE fitness.session_exercises
  ADD CONSTRAINT session_exercises_target_sets_min_nonnegative_check
    CHECK (target_sets_min IS NULL OR target_sets_min >= 0),
  ADD CONSTRAINT session_exercises_target_sets_max_nonnegative_check
    CHECK (target_sets_max IS NULL OR target_sets_max >= 0),
  ADD CONSTRAINT session_exercises_target_sets_range_check
    CHECK (target_sets_min IS NULL OR target_sets_max IS NULL OR target_sets_min <= target_sets_max);

-- source supabase/migrations/031_exercise_stats_actual_pr_columns.sql blob 6d5b804f1cb78be1811d31da51a9d6d69a521429 raw_sha256 51305cd3bd9d32c9a9c5e9660d2cba5a018bd3fa50f0002e8a59cc5bb40129a5
alter table fitness.exercise_stats
  add column if not exists actual_pr_weight numeric null,
  add column if not exists actual_pr_reps int null,
  add column if not exists actual_pr_at timestamptz null;

-- source supabase/migrations/035_session_and_routine_ordering_hardening.sql blob 336f69efdfe2f3db992fe591d4bf15787a26e11b raw_sha256 7a91f9c4b4825245a3b788d34f20eabb54abdbd787370fb0a7cb1f311b87aea4
create unique index if not exists session_exercises_session_id_position_uq
  on fitness.session_exercises (session_id, position);

create unique index if not exists routine_day_exercises_routine_day_id_position_uq
  on fitness.routine_day_exercises (routine_day_id, position);

create or replace function fitness.repack_session_exercise_positions_after_delete()
returns trigger
language plpgsql
as $$
begin
  update fitness.session_exercises
  set position = position - 1
  where session_id = old.session_id
    and user_id = old.user_id
    and position > old.position;

  return old;
end;
$$;

drop trigger if exists session_exercises_repack_after_delete on fitness.session_exercises;

create trigger session_exercises_repack_after_delete
after delete on fitness.session_exercises
for each row
execute function fitness.repack_session_exercise_positions_after_delete();

create or replace function fitness.repack_routine_day_exercise_positions_after_delete()
returns trigger
language plpgsql
as $$
begin
  update fitness.routine_day_exercises
  set position = position - 1
  where routine_day_id = old.routine_day_id
    and user_id = old.user_id
    and position > old.position;

  return old;
end;
$$;

drop trigger if exists routine_day_exercises_repack_after_delete on fitness.routine_day_exercises;

create trigger routine_day_exercises_repack_after_delete
after delete on fitness.routine_day_exercises
for each row
execute function fitness.repack_routine_day_exercise_positions_after_delete();

create or replace function fitness.reorder_routine_day_exercises(
  target_routine_day_id uuid,
  target_user_id uuid,
  ordered_exercise_row_ids uuid[]
)
returns void
language plpgsql
as $$
begin
  update fitness.routine_day_exercises as target
  set position = -ordered.ordinality
  from unnest(ordered_exercise_row_ids) with ordinality as ordered(id, ordinality)
  where target.id = ordered.id
    and target.routine_day_id = target_routine_day_id
    and target.user_id = target_user_id;

  update fitness.routine_day_exercises as target
  set position = ordered.ordinality - 1
  from unnest(ordered_exercise_row_ids) with ordinality as ordered(id, ordinality)
  where target.id = ordered.id
    and target.routine_day_id = target_routine_day_id
    and target.user_id = target_user_id;
end;
$$;

-- source supabase/migrations/036_session_follow_up_jobs.sql blob d3a24e822255cdb0479c248e7c6a02661bb70884 raw_sha256 658954be54e71ae49b18163aeeb7ad43c489dda2b66b287239f36f257c8eae2a
create table if not exists fitness.session_follow_up_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references fitness.sessions(id) on delete cascade,
  user_id uuid not null,
  job_kind text not null check (job_kind in ('exercise_stats', 'fitness_integrations')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempt_count int not null default 0,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null
);

create unique index if not exists session_follow_up_jobs_session_kind_uq
  on fitness.session_follow_up_jobs (session_id, job_kind);

create index if not exists session_follow_up_jobs_user_status_idx
  on fitness.session_follow_up_jobs (user_id, status, updated_at desc);

alter table fitness.session_follow_up_jobs enable row level security;

create policy "session_follow_up_jobs_select_own"
  on fitness.session_follow_up_jobs
  for select
  using (user_id = auth.uid());

create policy "session_follow_up_jobs_insert_own"
  on fitness.session_follow_up_jobs
  for insert
  with check (user_id = auth.uid());

create policy "session_follow_up_jobs_update_own"
  on fitness.session_follow_up_jobs
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "session_follow_up_jobs_delete_own"
  on fitness.session_follow_up_jobs
  for delete
  using (user_id = auth.uid());

-- source supabase/migrations/037_follow_up_job_leases_and_safe_repack.sql blob 4fa5cbd13a151f5f39aadcc41ef3d6eb5515cb36 raw_sha256 f2352133da51ca9e6c7b5016e2c5c7c9144369d4eeebf0d5394594921df976dd
create or replace function fitness.repack_session_exercise_positions_after_delete()
returns trigger
language plpgsql
as $$
begin
  with shifted as (
    update fitness.session_exercises
    set position = -(position + 1)
    where session_id = old.session_id
      and user_id = old.user_id
      and position > old.position
    returning id
  )
  update fitness.session_exercises as target
  set position = -target.position - 2
  from shifted
  where target.id = shifted.id;

  return old;
end;
$$;

create or replace function fitness.repack_routine_day_exercise_positions_after_delete()
returns trigger
language plpgsql
as $$
begin
  with shifted as (
    update fitness.routine_day_exercises
    set position = -(position + 1)
    where routine_day_id = old.routine_day_id
      and user_id = old.user_id
      and position > old.position
    returning id
  )
  update fitness.routine_day_exercises as target
  set position = -target.position - 2
  from shifted
  where target.id = shifted.id;

  return old;
end;
$$;

create or replace function fitness.claim_session_follow_up_jobs(
  target_session_id uuid,
  target_user_id uuid,
  stale_before timestamptz,
  claim_time timestamptz default now()
)
returns table (
  id uuid,
  job_kind text,
  status text,
  attempt_count int
)
language plpgsql
as $$
begin
  return query
  update fitness.session_follow_up_jobs
  set status = 'processing',
      attempt_count = session_follow_up_jobs.attempt_count + 1,
      last_error = null,
      completed_at = null,
      updated_at = claim_time
  where session_id = target_session_id
    and user_id = target_user_id
    and (
      status in ('pending', 'failed')
      or (status = 'processing' and updated_at < stale_before)
    )
  returning
    session_follow_up_jobs.id,
    session_follow_up_jobs.job_kind,
    session_follow_up_jobs.status,
    session_follow_up_jobs.attempt_count;
end;
$$;

-- source supabase/migrations/040_exercise_curation_tags_and_howto_refresh.sql blob 279d931f79600301b23429a943f0e5dfc1907b40 raw_sha256 2ab298bac9dedfa782742854fc2ab4c4659b46a3f2d3775b107d5593e23acb9c
-- 040_exercise_curation_tags_and_howto_refresh.sql
-- Generated from supabase/data/global_exercises_canonical.json via scripts/refresh-exercise-catalog.mjs.

ALTER TABLE fitness.exercises
  ADD COLUMN IF NOT EXISTS curation_tags jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Verification:
-- SELECT name, jsonb_object_keys(curation_tags) FROM fitness.exercises WHERE is_global = TRUE LIMIT 20;
-- SELECT count(*) FROM fitness.exercises WHERE is_global = TRUE AND (how_to_short IS NULL OR btrim(how_to_short) = '');

-- source supabase/migrations/041_allow_measurement_optional_session_and_routine_goals.sql blob 5e787b1819d13b6edc031466bd741004e17d5e12 raw_sha256 0bbdab1dc5d457b6db25d2c4f33a355a3d0a0e2cecc240e53b64344b9de7ae0e
ALTER TABLE fitness.routine_day_exercises
DROP CONSTRAINT IF EXISTS routine_day_exercises_measurement_type_check;

ALTER TABLE fitness.routine_day_exercises
ADD CONSTRAINT routine_day_exercises_measurement_type_check
CHECK (
  measurement_type IS NULL
  OR measurement_type IN ('reps', 'time', 'distance', 'time_distance', 'none')
);

ALTER TABLE fitness.session_exercises
DROP CONSTRAINT IF EXISTS session_exercises_measurement_type_check;

ALTER TABLE fitness.session_exercises
ADD CONSTRAINT session_exercises_measurement_type_check
CHECK (
  measurement_type IS NULL
  OR measurement_type IN ('reps', 'time', 'distance', 'time_distance', 'none')
);

-- source supabase/migrations/042_global_exercises_canonical_upsert.sql blob e173a06c9025e04d8662a21deb671173417a7dde raw_sha256 7d8a39573487ffd478f7cc397913f7c81411c49820f6033c9ecbcc2a59b405e9
-- 042_global_exercises_canonical_upsert.sql
-- Idempotently sync production global exercises from supabase/data/global_exercises_canonical.json.
-- Safe to run after 040, and also guards curation_tags if 040 was not applied yet.

BEGIN;

ALTER TABLE fitness.exercises
  ADD COLUMN IF NOT EXISTS curation_tags jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMIT;

-- Verification:
-- SELECT count(*) FROM fitness.exercises WHERE is_global = TRUE;
-- SELECT name FROM fitness.exercises WHERE is_global = TRUE AND name IN ('Bodyweight Squat', 'Inverted Row', 'Cable Woodchop', 'Burpee', 'Smith Machine Hip Thrust', 'Machine Pulldown') ORDER BY name;
-- SELECT count(*) FROM fitness.exercises WHERE is_global = TRUE AND (curation_tags IS NULL OR curation_tags = '{}'::jsonb);

-- source supabase/migrations/043_hide_standalone_stretch_catalog_rows.sql blob 42a8bd9aef05ad8aeb5efd8db644bc70a711a78f raw_sha256 f5231385f72b80ecac0c5f92616e2d1a692ee61b88cdca738386a1ddee077346
-- Hide standalone stretch catalog rows from the global picker while preserving
-- historical exercise references that may still point at these records.
alter table fitness.exercises
  add column if not exists slug text null;

-- source supabase/migrations/20260505065000_exercise_optional_metadata_columns.sql blob ee811872c0d2911e87e9f36335393bbbf5164546 raw_sha256 86e2ae304c1d4e0f7517c686f1679ea21568f67ddc0ffa9ead731c5aa9b4b793
-- Reconcile optional exercise metadata columns used by app selectors before
-- later catalog repair migrations reference them.
alter table fitness.exercises
  add column if not exists image_path text null,
  add column if not exists image_icon_path text null,
  add column if not exists slug text null,
  add column if not exists kind text null,
  add column if not exists type text null,
  add column if not exists tags text[] null,
  add column if not exists categories text[] null;

create index if not exists exercises_slug_idx
  on fitness.exercises (slug)
  where slug is not null;

-- source supabase/migrations/20260505070020_045_progression_playbooks.sql blob 458f7cb0716d675dc26421c8f018e7550654d97c raw_sha256 91ed6ebab1fa392a8fec17b1873e210549a7e1ab4346c8f52466751b619bc313
ALTER TABLE fitness.routine_day_exercises
ADD COLUMN IF NOT EXISTS progression_playbook_id text,
ADD COLUMN IF NOT EXISTS progression_playbook_config jsonb;

ALTER TABLE fitness.routine_day_exercises
DROP CONSTRAINT IF EXISTS routine_day_exercises_progression_playbook_id_check;

ALTER TABLE fitness.routine_day_exercises
ADD CONSTRAINT routine_day_exercises_progression_playbook_id_check
CHECK (
  progression_playbook_id IS NULL
  OR progression_playbook_id IN (
    'double_progression',
    'fixed_load_rep_range_progression',
    'deload_after_stall'
  )
);

ALTER TABLE fitness.routine_day_exercises
DROP CONSTRAINT IF EXISTS routine_day_exercises_progression_playbook_config_check;

ALTER TABLE fitness.routine_day_exercises
ADD CONSTRAINT routine_day_exercises_progression_playbook_config_check
CHECK (
  progression_playbook_config IS NULL
  OR jsonb_typeof(progression_playbook_config) = 'object'
);

-- source supabase/migrations/20260505070028_046_routine_progression_defaults.sql blob c2372b4dfa6b69b07d5d1b003060598ddb9882e6 raw_sha256 789952d974bd2bf2758cb9b4607ad4cc47c3e1a02db3d80e638ff5956b1d41b0
ALTER TABLE fitness.routines
ADD COLUMN IF NOT EXISTS default_progression_playbook_id text,
ADD COLUMN IF NOT EXISTS default_progression_playbook_config jsonb;

ALTER TABLE fitness.routines
DROP CONSTRAINT IF EXISTS routines_default_progression_playbook_id_check;

ALTER TABLE fitness.routines
ADD CONSTRAINT routines_default_progression_playbook_id_check
CHECK (
  default_progression_playbook_id IS NULL
  OR default_progression_playbook_id IN (
    'double_progression',
    'fixed_load_rep_range_progression',
    'deload_after_stall'
  )
);

ALTER TABLE fitness.routines
DROP CONSTRAINT IF EXISTS routines_default_progression_playbook_config_check;

ALTER TABLE fitness.routines
ADD CONSTRAINT routines_default_progression_playbook_config_check
CHECK (
  default_progression_playbook_config IS NULL
  OR jsonb_typeof(default_progression_playbook_config) = 'object'
);

-- source supabase/migrations/20260506090000_allow_routine_failure_rep_sentinel.sql blob 016162c37371eba2348ea67da2ab72002d44e623 raw_sha256 12f0675310460d87a6180ec13ab2d6b7bbf7ee865fb335eda2dda104840a07d6
alter table fitness.routine_day_exercises
  drop constraint if exists routine_day_exercises_target_reps_range_check;

alter table fitness.routine_day_exercises
  add constraint routine_day_exercises_target_reps_range_check
  check (
    (target_reps_min is null or target_reps_min >= 0)
    and (target_reps_max is null or target_reps_max >= 0)
    and (
      target_reps_min is null
      or target_reps_max is null
      or target_reps_min <= target_reps_max
    )
  );

-- source supabase/migrations/20260506173000_047_function_search_path_hardening.sql blob 96c1c4c83e01c9231544a930894fbe9e56a5d94b raw_sha256 d6a56a08e9778f194f993333dbe58eb4585826056854ed9b43f80d19e7fa2645
create or replace function fitness.repack_session_exercise_positions_after_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  with shifted as (
    update fitness.session_exercises
    set position = -(position + 1)
    where session_id = old.session_id
      and user_id = old.user_id
      and position > old.position
    returning id
  )
  update fitness.session_exercises as target
  set position = -target.position - 2
  from shifted
  where target.id = shifted.id;

  return old;
end;
$$;

create or replace function fitness.repack_routine_day_exercise_positions_after_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  with shifted as (
    update fitness.routine_day_exercises
    set position = -(position + 1)
    where routine_day_id = old.routine_day_id
      and user_id = old.user_id
      and position > old.position
    returning id
  )
  update fitness.routine_day_exercises as target
  set position = -target.position - 2
  from shifted
  where target.id = shifted.id;

  return old;
end;
$$;

create or replace function fitness.reorder_routine_day_exercises(
  target_routine_day_id uuid,
  target_user_id uuid,
  ordered_exercise_row_ids uuid[]
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update fitness.routine_day_exercises as target
  set position = -ordered.ordinality
  from unnest(ordered_exercise_row_ids) with ordinality as ordered(id, ordinality)
  where target.id = ordered.id
    and target.routine_day_id = target_routine_day_id
    and target.user_id = target_user_id;

  update fitness.routine_day_exercises as target
  set position = ordered.ordinality - 1
  from unnest(ordered_exercise_row_ids) with ordinality as ordered(id, ordinality)
  where target.id = ordered.id
    and target.routine_day_id = target_routine_day_id
    and target.user_id = target_user_id;
end;
$$;

create or replace function fitness.claim_session_follow_up_jobs(
  target_session_id uuid,
  target_user_id uuid,
  stale_before timestamptz,
  claim_time timestamptz default now()
)
returns table (
  id uuid,
  job_kind text,
  status text,
  attempt_count int
)
language plpgsql
set search_path = public, pg_temp
as $$
begin
  return query
  update fitness.session_follow_up_jobs
  set status = 'processing',
      attempt_count = fitness.session_follow_up_jobs.attempt_count + 1,
      last_error = null,
      completed_at = null,
      updated_at = claim_time
  where session_id = target_session_id
    and user_id = target_user_id
    and (
      status in ('pending', 'failed')
      or (status = 'processing' and updated_at < stale_before)
    )
  returning
    fitness.session_follow_up_jobs.id,
    fitness.session_follow_up_jobs.job_kind,
    fitness.session_follow_up_jobs.status,
    fitness.session_follow_up_jobs.attempt_count;
end;
$$;

-- source supabase/migrations/20260507130000_049_fk_covering_indexes.sql blob 31bbfdbf2f22d9082a16dd18951eb55fca048974 raw_sha256 0a74f57da9ad944bcb43db7083cbeff1a82e667305584b0188945f674445d002
-- 049_fk_covering_indexes.sql
-- Add covering indexes only for advisor-confirmed foreign keys that are still uncovered.

create index if not exists idx_exercise_stats_exercise_id
  on fitness.exercise_stats (exercise_id);

create index if not exists idx_routine_day_exercises_exercise_id
  on fitness.routine_day_exercises (exercise_id);

create index if not exists idx_session_exercises_exercise_id
  on fitness.session_exercises (exercise_id);

create index if not exists idx_sessions_routine_id
  on fitness.sessions (routine_id);

-- source supabase/migrations/20260507162000_seed_global_pilates_exercises.sql blob 4088724b2251ed234c887ae81292832a4abf247a raw_sha256 6129969f2982ccc85c1930453f16fea1379a89fc5f851be6e98139bf0df3c8c1
-- Seed curated Pilates global exercises.
-- Zone/intensity targets stay layered on exercises; these rows are implementable movements.

BEGIN;

ALTER TABLE fitness.exercises
  ADD COLUMN IF NOT EXISTS curation_tags jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMIT;

-- Verification:
-- SELECT name, measurement_type, default_unit FROM fitness.exercises WHERE user_id IS NULL AND name LIKE 'Pilates %' ORDER BY name;

-- source supabase/migrations/20260509100000_050_session_core_rls_initplan.sql blob 146ef7e103da4e620cdb0f54497ecc2b463b4d39 raw_sha256 04ca24f21610cd2eb8c166bb4413f1157ebe6d0368cedb58c8f071255cb40b24
-- 050_session_core_rls_initplan.sql
-- Rewrite session-core RLS policies into initplan-friendly auth.uid() forms.
-- Scope is intentionally limited to sessions, session_exercises, and sets.

drop policy if exists "sessions_select_own" on fitness.sessions;

create policy "sessions_select_own"
  on fitness.sessions
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "sessions_insert_own" on fitness.sessions;

create policy "sessions_insert_own"
  on fitness.sessions
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "sessions_update_own" on fitness.sessions;

create policy "sessions_update_own"
  on fitness.sessions
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "sessions_delete_own" on fitness.sessions;

create policy "sessions_delete_own"
  on fitness.sessions
  for delete
  using (user_id = (select auth.uid()));

drop policy if exists "session_exercises_select_own" on fitness.session_exercises;

create policy "session_exercises_select_own"
  on fitness.session_exercises
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "session_exercises_insert_own" on fitness.session_exercises;

create policy "session_exercises_insert_own"
  on fitness.session_exercises
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "session_exercises_update_own" on fitness.session_exercises;

create policy "session_exercises_update_own"
  on fitness.session_exercises
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "session_exercises_delete_own" on fitness.session_exercises;

create policy "session_exercises_delete_own"
  on fitness.session_exercises
  for delete
  using (user_id = (select auth.uid()));

drop policy if exists "sets_select_own" on fitness.sets;

create policy "sets_select_own"
  on fitness.sets
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "sets_insert_own" on fitness.sets;

create policy "sets_insert_own"
  on fitness.sets
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "sets_update_own" on fitness.sets;

create policy "sets_update_own"
  on fitness.sets
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "sets_delete_own" on fitness.sets;

create policy "sets_delete_own"
  on fitness.sets
  for delete
  using (user_id = (select auth.uid()));

-- source supabase/migrations/20260509103000_profile_qa_visibility.sql blob 94e2a657c93743128f487a41a77b152313b05f2f raw_sha256 ad8b95f2b962d5758c17b56948c975457d7cf906cc5f37d060e7ee52cd11797c
alter table fitness.profiles
  add column if not exists show_qa_llel_data boolean not null default false;

-- source supabase/migrations/20260509113000_051_progression_events.sql blob f31bce280d9f2f4080e9ef757b9601a01c62b866 raw_sha256 0a778ca2183bddc07777b4a7600772b42359c4ca4d66d1a4bd7b3cb2d8c05b83
create table if not exists fitness.progression_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  routine_id uuid not null references fitness.routines(id) on delete cascade,
  routine_day_exercise_id uuid not null references fitness.routine_day_exercises(id) on delete cascade,
  exercise_id uuid not null references fitness.exercises(id) on delete cascade,
  event_type text not null check (event_type in (
    'promotion_applied',
    'promotion_reverted',
    'lock_in',
    'deload_applied',
    'review_acknowledged',
    'manual_target_change'
  )),
  from_target jsonb not null,
  to_target jsonb not null,
  method text not null,
  vector text not null,
  step jsonb null,
  reason text not null,
  source_session_id uuid null references fitness.sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists progression_events_user_created_at_idx
  on fitness.progression_events (user_id, created_at desc);

create index if not exists progression_events_routine_id_idx
  on fitness.progression_events (routine_id);

create index if not exists progression_events_routine_day_exercise_id_idx
  on fitness.progression_events (routine_day_exercise_id);

create index if not exists progression_events_exercise_id_idx
  on fitness.progression_events (exercise_id);

create index if not exists progression_events_event_type_idx
  on fitness.progression_events (event_type);

create index if not exists progression_events_source_session_id_idx
  on fitness.progression_events (source_session_id);

alter table fitness.progression_events enable row level security;

drop policy if exists "progression_events_select_own" on fitness.progression_events;

create policy "progression_events_select_own"
  on fitness.progression_events
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "progression_events_insert_own" on fitness.progression_events;

create policy "progression_events_insert_own"
  on fitness.progression_events
  for insert
  with check (user_id = (select auth.uid()));

-- source supabase/migrations/20260510090000_052_routine_core_rls_initplan.sql blob c77f26b71f3a8b742b99652f90eb2891bb2a8c67 raw_sha256 e3a6453bb5a1100d02cb22e8aab88dc00d37f61c3fa3883de383f52411fc680f
-- 052_routine_core_rls_initplan.sql
-- Rewrite routine-core RLS policies into initplan-friendly auth.uid() forms.
-- Scope is intentionally limited to routines, routine_days, and routine_day_exercises.

drop policy if exists "routines_select_own" on fitness.routines;

create policy "routines_select_own"
  on fitness.routines
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "routines_insert_own" on fitness.routines;

create policy "routines_insert_own"
  on fitness.routines
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "routines_update_own" on fitness.routines;

create policy "routines_update_own"
  on fitness.routines
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "routines_delete_own" on fitness.routines;

create policy "routines_delete_own"
  on fitness.routines
  for delete
  using (user_id = (select auth.uid()));

drop policy if exists "routine_days_select_own" on fitness.routine_days;

create policy "routine_days_select_own"
  on fitness.routine_days
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "routine_days_insert_own" on fitness.routine_days;

create policy "routine_days_insert_own"
  on fitness.routine_days
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "routine_days_update_own" on fitness.routine_days;

create policy "routine_days_update_own"
  on fitness.routine_days
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "routine_days_delete_own" on fitness.routine_days;

create policy "routine_days_delete_own"
  on fitness.routine_days
  for delete
  using (user_id = (select auth.uid()));

drop policy if exists "routine_day_exercises_select_own" on fitness.routine_day_exercises;

create policy "routine_day_exercises_select_own"
  on fitness.routine_day_exercises
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "routine_day_exercises_insert_own" on fitness.routine_day_exercises;

create policy "routine_day_exercises_insert_own"
  on fitness.routine_day_exercises
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "routine_day_exercises_update_own" on fitness.routine_day_exercises;

create policy "routine_day_exercises_update_own"
  on fitness.routine_day_exercises
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "routine_day_exercises_delete_own" on fitness.routine_day_exercises;

create policy "routine_day_exercises_delete_own"
  on fitness.routine_day_exercises
  for delete
  using (user_id = (select auth.uid()));

-- source supabase/migrations/20260510110000_053_profile_catalog_rls_initplan.sql blob 31be74fd985db676327efdae0ad07a69528dbf46 raw_sha256 31c42fdad8df22f900dc1c2395a55ffd5cbc7466a4d721fa69c02604cc2e39ff
-- 053_profile_catalog_rls_initplan.sql
-- Rewrite profile/catalog-core RLS policies into initplan-friendly auth.uid() forms.
-- Scope is intentionally limited to profiles, exercises, and exercise_stats.

drop policy if exists "profiles_select_own" on fitness.profiles;

create policy "profiles_select_own"
  on fitness.profiles
  for select
  using (id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on fitness.profiles;

create policy "profiles_insert_own"
  on fitness.profiles
  for insert
  with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on fitness.profiles;

create policy "profiles_update_own"
  on fitness.profiles
  for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "profiles_delete_own" on fitness.profiles;

create policy "profiles_delete_own"
  on fitness.profiles
  for delete
  using (id = (select auth.uid()));

drop policy if exists "exercises_select_global_or_own" on fitness.exercises;

create policy "exercises_select_global_or_own"
  on fitness.exercises
  for select
  using ((user_id is null) or (user_id = (select auth.uid())));

drop policy if exists "exercises_insert_own_only" on fitness.exercises;

create policy "exercises_insert_own_only"
  on fitness.exercises
  for insert
  with check ((user_id = (select auth.uid())) and (user_id is not null) and (is_global = false));

drop policy if exists "exercises_update_own_only" on fitness.exercises;

create policy "exercises_update_own_only"
  on fitness.exercises
  for update
  using ((user_id = (select auth.uid())) and (user_id is not null))
  with check ((user_id = (select auth.uid())) and (user_id is not null) and (is_global = false));

drop policy if exists "exercises_delete_own_only" on fitness.exercises;

create policy "exercises_delete_own_only"
  on fitness.exercises
  for delete
  using ((user_id = (select auth.uid())) and (user_id is not null));

drop policy if exists "exercise_stats_select_own" on fitness.exercise_stats;

create policy "exercise_stats_select_own"
  on fitness.exercise_stats
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "exercise_stats_insert_own" on fitness.exercise_stats;

create policy "exercise_stats_insert_own"
  on fitness.exercise_stats
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "exercise_stats_update_own" on fitness.exercise_stats;

create policy "exercise_stats_update_own"
  on fitness.exercise_stats
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "exercise_stats_delete_own" on fitness.exercise_stats;

create policy "exercise_stats_delete_own"
  on fitness.exercise_stats
  for delete
  using (user_id = (select auth.uid()));

-- source supabase/migrations/20260511093000_054_follow_up_jobs_rls_initplan.sql blob b275da58c2514c3613c3cd4e3d456948ab98745d raw_sha256 531407b35b91dfc94e34ae791304d999a2e75f8eda3440205d9bb744ef7ef942
-- 054_follow_up_jobs_rls_initplan.sql
-- Rewrite follow-up-job RLS policies into initplan-friendly auth.uid() forms.
-- Scope is intentionally limited to session_follow_up_jobs.

drop policy if exists "session_follow_up_jobs_select_own" on fitness.session_follow_up_jobs;

create policy "session_follow_up_jobs_select_own"
  on fitness.session_follow_up_jobs
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "session_follow_up_jobs_insert_own" on fitness.session_follow_up_jobs;

create policy "session_follow_up_jobs_insert_own"
  on fitness.session_follow_up_jobs
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "session_follow_up_jobs_update_own" on fitness.session_follow_up_jobs;

create policy "session_follow_up_jobs_update_own"
  on fitness.session_follow_up_jobs
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "session_follow_up_jobs_delete_own" on fitness.session_follow_up_jobs;

create policy "session_follow_up_jobs_delete_own"
  on fitness.session_follow_up_jobs
  for delete
  using (user_id = (select auth.uid()));

-- source supabase/migrations/20260513113000_055_routine_schedule_mode.sql blob 58c73b40a638aaac5ba7cd62814e147b69149d21 raw_sha256 815070276416fda72e23fa3b4e67088ea32fc32dd8da74bad448851a058c31bf
alter table fitness.routines
  add column if not exists schedule_mode text not null default 'weekday_anchored';

-- source supabase/migrations/20260514120000_054_discord_verification_tokens.sql blob 288c2f7cea46f0692ad2fd4ce9bdfb1107a6db29 raw_sha256 da0f0593b4426996a6c144be7ee3ceeaf0756a4dc191b184dc281c715bfa9f93
create table if not exists fitness.discord_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  discord_user_id text null,
  discord_username text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists discord_verification_tokens_token_hash_uq
  on fitness.discord_verification_tokens (token_hash);

create index if not exists discord_verification_tokens_user_id_expires_at_idx
  on fitness.discord_verification_tokens (user_id, expires_at);

create index if not exists discord_verification_tokens_discord_user_id_idx
  on fitness.discord_verification_tokens (discord_user_id)
  where discord_user_id is not null;

alter table fitness.discord_verification_tokens enable row level security;

-- source supabase/migrations/20260515090309_055_discord_member_links.sql blob 0e0b4aa43a78a6fa25ef353c47772546a3446753 raw_sha256 cf648134f9df74e231605bf52c575b0e8053b86a6461d5f10f4b9bed4cef3467
create table if not exists fitness.discord_member_links (
  id uuid primary key default gen_random_uuid(),
  fitness_user_id uuid not null references auth.users(id) on delete cascade,
  discord_user_id text not null,
  discord_username text null,
  user_number integer null,
  user_kind text not null default 'unknown',
  verified_role_granted_at timestamptz null,
  nickname_sync_status text not null default 'not_attempted',
  nickname_synced_at timestamptz null,
  last_error_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_member_links_fitness_user_id_uq unique (fitness_user_id),
  constraint discord_member_links_discord_user_id_uq unique (discord_user_id),
  constraint discord_member_links_user_kind_check check (user_kind in ('human', 'automation', 'unknown')),
  constraint discord_member_links_nickname_sync_status_check check (
    nickname_sync_status in ('not_attempted', 'synced', 'failed', 'skipped')
  )
);

alter table fitness.discord_member_links enable row level security;

-- source supabase/migrations/20260515130000_057_discord_bug_reports.sql blob f1e89ec947c4b7ad4bc2c46aa37c5341b4f81975 raw_sha256 99f6529d580685bfe02373f9f0065b0084ffabca18e241c0bc1e7bb814511369
create table if not exists fitness.discord_bug_reports (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'discord',
  status text not null default 'new',
  severity text not null default 'medium',
  area text null,
  summary text not null,
  details text null,
  steps_to_reproduce text null,
  screenshot_url text null,
  reporter_discord_user_id text not null,
  reporter_discord_username text null,
  reporter_fitness_user_id uuid null references auth.users(id) on delete set null,
  reporter_member_number integer null,
  reporter_user_kind text null,
  discord_interaction_id text null,
  duplicate_fingerprint text null,
  duplicate_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  discord_forum_channel_id text null,
  discord_forum_thread_id text null,
  discord_forum_message_id text null,
  staff_channel_message_id text null,
  closed_at timestamptz null,
  pruned_at timestamptz null,
  details_pruned boolean not null default false,
  triage_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_bug_reports_source_check check (source = 'discord'),
  constraint discord_bug_reports_status_check check (
    status in ('new', 'triaged', 'accepted', 'duplicate', 'closed', 'spam')
  ),
  constraint discord_bug_reports_severity_check check (
    severity in ('low', 'medium', 'high', 'blocker')
  ),
  constraint discord_bug_reports_reporter_user_kind_check check (
    reporter_user_kind is null or reporter_user_kind in ('human', 'automation', 'unknown')
  ),
  constraint discord_bug_reports_area_length_check check (
    area is null or char_length(area) <= 80
  ),
  constraint discord_bug_reports_summary_length_check check (
    char_length(summary) between 1 and 120
  ),
  constraint discord_bug_reports_reporter_discord_user_id_check check (
    reporter_discord_user_id ~ '^[0-9]{1,32}$'
  ),
  constraint discord_bug_reports_details_length_check check (
    details is null or char_length(details) <= 1200
  ),
  constraint discord_bug_reports_steps_length_check check (
    steps_to_reproduce is null or char_length(steps_to_reproduce) <= 1200
  ),
  constraint discord_bug_reports_screenshot_url_length_check check (
    screenshot_url is null or char_length(screenshot_url) <= 500
  )
);

create index if not exists discord_bug_reports_status_created_at_idx
  on fitness.discord_bug_reports (status, created_at desc);

create index if not exists discord_bug_reports_severity_created_at_idx
  on fitness.discord_bug_reports (severity, created_at desc);

create index if not exists discord_bug_reports_reporter_discord_user_id_created_at_idx
  on fitness.discord_bug_reports (reporter_discord_user_id, created_at desc);

create index if not exists discord_bug_reports_duplicate_fingerprint_idx
  on fitness.discord_bug_reports (duplicate_fingerprint)
  where duplicate_fingerprint is not null;

create index if not exists discord_bug_reports_discord_forum_thread_id_idx
  on fitness.discord_bug_reports (discord_forum_thread_id)
  where discord_forum_thread_id is not null;

create index if not exists discord_bug_reports_status_closed_at_idx
  on fitness.discord_bug_reports (status, closed_at desc);

create index if not exists discord_bug_reports_status_pruned_at_idx
  on fitness.discord_bug_reports (status, pruned_at desc);

create index if not exists discord_bug_reports_status_last_seen_at_idx
  on fitness.discord_bug_reports (status, last_seen_at desc);

alter table fitness.discord_bug_reports enable row level security;

-- source supabase/migrations/20260515140000_058_discord_bug_report_forum_tags.sql blob c006a378f542ca8c4c1ad9dc61847239f37f4ec7 raw_sha256 05f9ab6f05e5e294222d6bf5b0fc9a1504433f6ca3afb518fe038560b4d89704
alter table fitness.discord_bug_reports
  add column if not exists report_type text not null default 'bug',
  add column if not exists discord_forum_applied_tag_ids text[] null,
  add column if not exists discord_forum_title text null,
  add column if not exists status_updated_at timestamptz null,
  add column if not exists status_updated_by_discord_user_id text null,
  add column if not exists status_note text null,
  add column if not exists reporter_mentioned_at timestamptz null;

alter table fitness.discord_bug_reports
  add constraint discord_bug_reports_status_check check (
    status in ('new', 'needs_info', 'confirmed', 'in_progress', 'fixed', 'closed', 'duplicate', 'spam')
  );

create index if not exists discord_bug_reports_report_type_status_last_seen_at_idx
  on fitness.discord_bug_reports (report_type, status, last_seen_at desc);

create index if not exists discord_bug_reports_status_updated_at_idx
  on fitness.discord_bug_reports (status_updated_at desc)
  where status_updated_at is not null;

-- source supabase/migrations/20260515150000_059_discord_feedback_reports.sql blob 987dfdba9fcad5dcee8577dd8775a79ca1245b67 raw_sha256 f3a5c65cd9aa8f2b06bee05ddc4095c79facbfa2dbf2f052f534bddd0d678e27
create table if not exists fitness.discord_feedback_reports (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'discord',
  report_type text not null default 'bug',
  status text not null default 'new',
  severity text not null default 'medium',
  area text null,
  summary text not null,
  details text null,
  steps_to_reproduce text null,
  screenshot_url text null,
  reporter_discord_user_id text not null,
  reporter_discord_username text null,
  reporter_fitness_user_id uuid null references auth.users(id) on delete set null,
  reporter_member_number integer null,
  reporter_user_kind text null,
  discord_interaction_id text null,
  duplicate_fingerprint text null,
  duplicate_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  discord_forum_channel_id text null,
  discord_forum_thread_id text null,
  discord_forum_message_id text null,
  discord_forum_applied_tag_ids text[] null,
  discord_forum_title text null,
  staff_channel_message_id text null,
  triage_notes text null,
  status_updated_at timestamptz null,
  status_updated_by_discord_user_id text null,
  status_note text null,
  reporter_mentioned_at timestamptz null,
  closed_at timestamptz null,
  pruned_at timestamptz null,
  details_pruned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fitness.discord_feedback_reports
  add column if not exists source text not null default 'discord',
  add column if not exists report_type text not null default 'bug',
  add column if not exists status text not null default 'new',
  add column if not exists severity text not null default 'medium',
  add column if not exists area text null,
  add column if not exists summary text null,
  add column if not exists details text null,
  add column if not exists steps_to_reproduce text null,
  add column if not exists screenshot_url text null,
  add column if not exists reporter_discord_user_id text null,
  add column if not exists reporter_discord_username text null,
  add column if not exists reporter_fitness_user_id uuid null references auth.users(id) on delete set null,
  add column if not exists reporter_member_number integer null,
  add column if not exists reporter_user_kind text null,
  add column if not exists discord_interaction_id text null,
  add column if not exists duplicate_fingerprint text null,
  add column if not exists duplicate_count integer not null default 1,
  add column if not exists first_seen_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists discord_forum_channel_id text null,
  add column if not exists discord_forum_thread_id text null,
  add column if not exists discord_forum_message_id text null,
  add column if not exists discord_forum_applied_tag_ids text[] null,
  add column if not exists discord_forum_title text null,
  add column if not exists staff_channel_message_id text null,
  add column if not exists triage_notes text null,
  add column if not exists status_updated_at timestamptz null,
  add column if not exists status_updated_by_discord_user_id text null,
  add column if not exists status_note text null,
  add column if not exists reporter_mentioned_at timestamptz null,
  add column if not exists closed_at timestamptz null,
  add column if not exists pruned_at timestamptz null,
  add column if not exists details_pruned boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table fitness.discord_feedback_reports
  alter column summary set not null,
  alter column reporter_discord_user_id set not null;

alter table fitness.discord_feedback_reports
  add constraint discord_feedback_reports_source_check check (source = 'discord'),
  add constraint discord_feedback_reports_report_type_check check (
    report_type in ('bug', 'feature', 'fix')
  ),
  add constraint discord_feedback_reports_status_check check (
    status in ('new', 'needs_info', 'confirmed', 'in_progress', 'fixed', 'closed', 'duplicate', 'spam', 'withdrawn')
  ),
  add constraint discord_feedback_reports_severity_check check (
    severity in ('low', 'medium', 'high', 'blocker')
  ),
  add constraint discord_feedback_reports_reporter_user_kind_check check (
    reporter_user_kind is null or reporter_user_kind in ('human', 'automation', 'unknown')
  ),
  add constraint discord_feedback_reports_area_length_check check (
    area is null or char_length(area) <= 80
  ),
  add constraint discord_feedback_reports_summary_length_check check (
    char_length(summary) between 1 and 120
  ),
  add constraint discord_feedback_reports_reporter_discord_user_id_check check (
    reporter_discord_user_id ~ '^[0-9]{1,32}$'
  ),
  add constraint discord_feedback_reports_details_length_check check (
    details is null or char_length(details) <= 1200
  ),
  add constraint discord_feedback_reports_steps_length_check check (
    steps_to_reproduce is null or char_length(steps_to_reproduce) <= 1200
  ),
  add constraint discord_feedback_reports_screenshot_url_length_check check (
    screenshot_url is null or char_length(screenshot_url) <= 500
  ),
  add constraint discord_feedback_reports_forum_title_length_check check (
    discord_forum_title is null or char_length(discord_forum_title) <= 100
  ),
  add constraint discord_feedback_reports_status_note_length_check check (
    status_note is null or char_length(status_note) <= 1000
  );

create index if not exists discord_feedback_reports_report_type_status_last_seen_at_idx
  on fitness.discord_feedback_reports (report_type, status, last_seen_at desc);

create index if not exists discord_feedback_reports_status_last_seen_at_idx
  on fitness.discord_feedback_reports (status, last_seen_at desc);

create index if not exists discord_feedback_reports_status_created_at_idx
  on fitness.discord_feedback_reports (status, created_at desc);

create index if not exists discord_feedback_reports_severity_created_at_idx
  on fitness.discord_feedback_reports (severity, created_at desc);

create index if not exists discord_feedback_reports_reporter_discord_user_id_created_at_idx
  on fitness.discord_feedback_reports (reporter_discord_user_id, created_at desc);

create index if not exists discord_feedback_reports_duplicate_fingerprint_idx
  on fitness.discord_feedback_reports (duplicate_fingerprint)
  where duplicate_fingerprint is not null;

create index if not exists discord_feedback_reports_discord_forum_thread_id_idx
  on fitness.discord_feedback_reports (discord_forum_thread_id)
  where discord_forum_thread_id is not null;

create index if not exists discord_feedback_reports_status_closed_at_idx
  on fitness.discord_feedback_reports (status, closed_at desc);

create index if not exists discord_feedback_reports_status_pruned_at_idx
  on fitness.discord_feedback_reports (status, pruned_at desc);

create index if not exists discord_feedback_reports_status_updated_at_idx
  on fitness.discord_feedback_reports (status_updated_at desc)
  where status_updated_at is not null;

alter table fitness.discord_feedback_reports enable row level security;

-- source supabase/migrations/20260515160000_060_discord_member_number_sync_queue.sql blob d9a2b18735d5882ec3a6ac53cd675ebc8320fce5 raw_sha256 c9624c8c86acac9d605c80675ba0162d82cd3408a204052307b8e3a9f2701ab5
alter table fitness.discord_member_links
  drop constraint if exists discord_member_links_nickname_sync_status_check;

alter table fitness.discord_member_links
  add constraint discord_member_links_nickname_sync_status_check
  check (nickname_sync_status in ('not_attempted', 'needs_sync', 'synced', 'failed', 'skipped'));

-- source supabase/migrations/20260516063128_discord_update_drafts.sql blob 8279d7d9791c6124417abd050f16225f35a3a24a raw_sha256 5fc1249e5ccfd48f05e7f7c584ebe16a8315a439ff6ba20c194493ae3de44a3e
create table if not exists fitness.discord_update_drafts (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'vercel',
  status text not null default 'draft',
  deployment_id text not null,
  deployment_url text null,
  production_url text null,
  vercel_project_id text null,
  vercel_project_name text null,
  vercel_target text null,
  git_commit_sha text null,
  git_commit_ref text null,
  git_commit_message text null,
  user_facing_title text null,
  user_facing_changes text null,
  user_facing_why_it_matters text null,
  discord_channel_id text null,
  discord_message_id text null,
  published_by_discord_user_id text null,
  published_at timestamptz null,
  skipped_by_discord_user_id text null,
  skipped_at timestamptz null,
  skip_reason text null,
  webhook_received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_update_drafts_source_check check (source in ('vercel')),
  constraint discord_update_drafts_status_check check (status in ('draft', 'published', 'skipped', 'ignored', 'failed')),
  constraint discord_update_drafts_deployment_id_uq unique (deployment_id),
  constraint discord_update_drafts_user_facing_title_length_check check (
    user_facing_title is null or char_length(user_facing_title) <= 120
  ),
  constraint discord_update_drafts_user_facing_changes_length_check check (
    user_facing_changes is null or char_length(user_facing_changes) <= 1500
  ),
  constraint discord_update_drafts_user_facing_why_it_matters_length_check check (
    user_facing_why_it_matters is null or char_length(user_facing_why_it_matters) <= 800
  ),
  constraint discord_update_drafts_skip_reason_length_check check (
    skip_reason is null or char_length(skip_reason) <= 500
  ),
  constraint discord_update_drafts_vercel_target_length_check check (
    vercel_target is null or char_length(vercel_target) <= 40
  ),
  constraint discord_update_drafts_discord_channel_id_check check (
    discord_channel_id is null or discord_channel_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_update_drafts_discord_message_id_check check (
    discord_message_id is null or discord_message_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_update_drafts_published_by_discord_user_id_check check (
    published_by_discord_user_id is null or published_by_discord_user_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_update_drafts_skipped_by_discord_user_id_check check (
    skipped_by_discord_user_id is null or skipped_by_discord_user_id ~ '^[0-9]{5,32}$'
  )
);

create index if not exists discord_update_drafts_status_created_at_idx
  on fitness.discord_update_drafts (status, created_at desc);

create unique index if not exists discord_update_drafts_deployment_id_idx
  on fitness.discord_update_drafts (deployment_id);

create index if not exists discord_update_drafts_git_commit_sha_idx
  on fitness.discord_update_drafts (git_commit_sha)
  where git_commit_sha is not null;

create index if not exists discord_update_drafts_published_at_idx
  on fitness.discord_update_drafts (published_at desc)
  where published_at is not null;

alter table fitness.discord_update_drafts enable row level security;

-- source supabase/migrations/20260516174200_discord_feedback_attachments.sql blob d4d5286334b7436c88ad450c378c8c6603304dbe raw_sha256 6a2c821e74994b785a372fa44dca821e81c331fdf39fe2559102754272b212d8
alter table fitness.discord_feedback_reports
  add column if not exists attachment_count integer not null default 0,
  add column if not exists attachment_metadata jsonb null,
  add column if not exists attachment_pruned boolean not null default false;

alter table fitness.discord_feedback_reports
  add constraint discord_feedback_reports_attachment_count_check check (
    attachment_count between 0 and 3
  ),
  add constraint discord_feedback_reports_attachment_metadata_check check (
    attachment_metadata is null
    or (
      jsonb_typeof(attachment_metadata) = 'array'
      and jsonb_array_length(attachment_metadata) <= 3
    )
  );

-- source supabase/migrations/20260516220000_discord_moderation_cases.sql blob d3a4cc339db731fed57122c87adcc96c38fca09a raw_sha256 7d93bd00856667c3a50be488e801c6afec9fcf3902eb03fe08ae5a5e227b0784
create table if not exists fitness.discord_moderation_cases (
  id uuid primary key default gen_random_uuid(),
  action text not null default 'purgatory',
  severity text not null default 'purgatory',
  status text not null default 'active',
  target_discord_user_id text not null,
  target_discord_username text null,
  target_fitness_user_id uuid null references auth.users(id) on delete set null,
  target_member_number integer null,
  moderator_discord_user_id text not null,
  moderator_discord_username text null,
  reason text not null,
  duration_seconds integer null,
  expires_at timestamptz null,
  removed_role_ids jsonb not null default '[]'::jsonb,
  restored_role_ids jsonb not null default '[]'::jsonb,
  purgatory_role_id text null,
  purgatory_channel_id text null,
  log_channel_id text null,
  log_message_id text null,
  release_note text null,
  released_by_discord_user_id text null,
  released_at timestamptz null,
  resolved_by_discord_user_id text null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_moderation_cases_action_check check (action in ('notice', 'warning', 'purgatory', 'release')),
  constraint discord_moderation_cases_severity_check check (severity in ('notice', 'warning', 'purgatory', 'critical')),
  constraint discord_moderation_cases_status_check check (status in ('active', 'released', 'expired', 'resolved', 'failed')),
  constraint discord_moderation_cases_reason_length_check check (char_length(reason) between 1 and 1000),
  constraint discord_moderation_cases_release_note_length_check check (
    release_note is null or char_length(release_note) <= 1000
  ),
  constraint discord_moderation_cases_duration_seconds_check check (
    duration_seconds is null or duration_seconds > 0
  ),
  constraint discord_moderation_cases_purgatory_duration_check check (
    action = 'purgatory' or duration_seconds is null
  ),
  constraint discord_moderation_cases_purgatory_expiration_check check (
    action = 'purgatory' or expires_at is null
  )
);

create index if not exists discord_moderation_cases_target_status_idx
  on fitness.discord_moderation_cases (target_discord_user_id, status);

create index if not exists discord_moderation_cases_status_created_at_idx
  on fitness.discord_moderation_cases (status, created_at desc);

create index if not exists discord_moderation_cases_expires_at_active_idx
  on fitness.discord_moderation_cases (expires_at)
  where status = 'active' and expires_at is not null;

alter table fitness.discord_moderation_cases enable row level security;

-- source supabase/migrations/20260518103000_steps_distance_unit_support.sql blob 924536c08d02e58e2185ee6f44a87e5fbc05e2d1 raw_sha256 264463f850bacc63d0ebb3e6f81609cc784948295775388da97be5c739faa120
alter table fitness.routine_day_exercises
  drop constraint if exists routine_day_exercises_target_distance_unit_check;

alter table fitness.routine_day_exercises
  add constraint routine_day_exercises_target_distance_unit_check
  check (target_distance_unit is null or target_distance_unit in ('mi', 'km', 'm', 'steps'));

alter table fitness.session_exercises
  drop constraint if exists session_exercises_target_distance_unit_check;

alter table fitness.session_exercises
  add constraint session_exercises_target_distance_unit_check
  check (target_distance_unit is null or target_distance_unit in ('mi', 'km', 'm', 'steps'));

alter table fitness.sets
  drop constraint if exists sets_distance_unit_check;

alter table fitness.sets
  add constraint sets_distance_unit_check
  check (distance_unit is null or distance_unit in ('mi', 'km', 'm', 'steps'));

-- source supabase/migrations/20260518110000_discord_feedback_fawxzzy_review_status.sql blob dcebf9432e50c45a82ba8ed4cc3c95832ef15702 raw_sha256 8c7323a567ba45ea53252b5d6d1211b36587cfbbd5ad7eb53f7ea2663974182c
alter table fitness.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_status_check;

alter table fitness.discord_feedback_reports
  add constraint discord_feedback_reports_status_check check (
    status in ('new', 'needs_info', 'confirmed', 'fawxzzy_review', 'in_progress', 'fixed', 'closed', 'duplicate', 'spam', 'withdrawn')
  );

-- source supabase/migrations/20260518163000_discord_feedback_completion_review.sql blob 30e44670ba1e5a386dcb1f73bd403b25610b0ef3 raw_sha256 6030ee7214b1884054ff840d417360ef318273dff46758e07fc3514093b61f66
alter table fitness.discord_feedback_reports
  add column if not exists completion_review_status text not null default 'not_required',
  add column if not exists completion_reviewed_at timestamptz null,
  add column if not exists completion_reviewed_by_discord_user_id text null,
  add column if not exists completion_review_note text null;

alter table fitness.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_completion_review_status_check;

alter table fitness.discord_feedback_reports
  add constraint discord_feedback_reports_completion_review_status_check
  check (completion_review_status in ('not_required', 'pending', 'approved', 'needs_followup'));

create index if not exists idx_discord_feedback_reports_completion_review_status
  on fitness.discord_feedback_reports (completion_review_status, updated_at desc);

-- source supabase/migrations/20260518233447_discord_spotify_connections.sql blob 16cdd269429e753d1ca578640b39f9d63fc4e550 raw_sha256 4fa4a766d91adb1573ead0dfdc73ba6894561c248522b5ab34e4c4d42bde2092
create table if not exists fitness.discord_spotify_connections (
  id uuid primary key default gen_random_uuid(),
  discord_user_id text not null,
  spotify_user_id text not null,
  spotify_display_name text null,
  spotify_product text not null default 'unknown',
  is_premium boolean not null default false,
  encrypted_refresh_token text not null,
  access_token_expires_at timestamptz null,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  last_checked_at timestamptz null,
  disconnected_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_spotify_connections_discord_user_id_uq unique (discord_user_id),
  constraint discord_spotify_connections_product_check check (
    spotify_product in ('premium', 'free', 'open', 'unknown')
  ),
  constraint discord_spotify_connections_discord_user_id_check check (
    discord_user_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_connections_refresh_token_length_check check (
    char_length(encrypted_refresh_token) between 20 and 4096
  )
);

create index if not exists discord_spotify_connections_spotify_user_id_idx
  on fitness.discord_spotify_connections (spotify_user_id);

create index if not exists discord_spotify_connections_is_premium_idx
  on fitness.discord_spotify_connections (is_premium);

create index if not exists discord_spotify_connections_disconnected_at_idx
  on fitness.discord_spotify_connections (disconnected_at);

alter table fitness.discord_spotify_connections enable row level security;

-- source supabase/migrations/20260519000000_discord_spotify_lobbies.sql blob 3571b3da4f459317812463f8134b21b047d82dee raw_sha256 44d39f919e428cc27871dbec5257efa08461be5ece6eef79e68c9c876369cc3b
create table if not exists fitness.discord_spotify_lobbies (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'closed',
  host_discord_user_id text null,
  host_spotify_user_id text null,
  title text null,
  description text null,
  panel_channel_id text null,
  panel_message_id text null,
  opened_at timestamptz null,
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_spotify_lobbies_status_check check (
    status in ('open', 'closed')
  ),
  constraint discord_spotify_lobbies_host_discord_user_id_check check (
    host_discord_user_id is null or host_discord_user_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_lobbies_host_spotify_user_id_length_check check (
    host_spotify_user_id is null or char_length(host_spotify_user_id) between 1 and 200
  ),
  constraint discord_spotify_lobbies_panel_channel_id_check check (
    panel_channel_id is null or panel_channel_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_lobbies_panel_message_id_check check (
    panel_message_id is null or panel_message_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_lobbies_title_length_check check (
    title is null or char_length(title) <= 120
  ),
  constraint discord_spotify_lobbies_description_length_check check (
    description is null or char_length(description) <= 500
  )
);

create index if not exists discord_spotify_lobbies_status_idx
  on fitness.discord_spotify_lobbies (status);

create index if not exists discord_spotify_lobbies_host_discord_user_id_idx
  on fitness.discord_spotify_lobbies (host_discord_user_id);

create index if not exists discord_spotify_lobbies_panel_channel_id_idx
  on fitness.discord_spotify_lobbies (panel_channel_id);

create index if not exists discord_spotify_lobbies_updated_at_idx
  on fitness.discord_spotify_lobbies (updated_at desc);

alter table fitness.discord_spotify_lobbies enable row level security;

-- source supabase/migrations/20260519013000_discord_spotify_queue_items.sql blob 6182b29bff4032332733f51e1f6380400e734df5 raw_sha256 bedf6d2d754d7586157bf9b5b72da3504f55f6409a92d149a8e9dcb9cd88ca9b
create table if not exists fitness.discord_spotify_queue_items (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid null references fitness.discord_spotify_lobbies(id) on delete cascade,
  status text not null default 'pending',
  spotify_uri text not null,
  spotify_url text null,
  track_title text null,
  artist_name text null,
  album_name text null,
  duration_ms integer null,
  suggested_by_discord_user_id text not null,
  suggested_by_spotify_user_id text null,
  approved_by_discord_user_id text null,
  rejected_by_discord_user_id text null,
  removed_by_discord_user_id text null,
  rejection_reason text null,
  removal_reason text null,
  queue_position integer null,
  approved_at timestamptz null,
  rejected_at timestamptz null,
  removed_at timestamptz null,
  played_at timestamptz null,
  skipped_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_spotify_queue_items_status_check check (
    status in ('pending', 'approved', 'rejected', 'removed', 'played', 'skipped')
  ),
  constraint discord_spotify_queue_items_spotify_uri_check check (
    spotify_uri ~ '^spotify:track:[A-Za-z0-9]{22}$'
  ),
  constraint discord_spotify_queue_items_spotify_url_length_check check (
    spotify_url is null or char_length(spotify_url) <= 500
  ),
  constraint discord_spotify_queue_items_track_title_length_check check (
    track_title is null or char_length(track_title) <= 200
  ),
  constraint discord_spotify_queue_items_artist_name_length_check check (
    artist_name is null or char_length(artist_name) <= 200
  ),
  constraint discord_spotify_queue_items_album_name_length_check check (
    album_name is null or char_length(album_name) <= 200
  ),
  constraint discord_spotify_queue_items_duration_ms_check check (
    duration_ms is null or duration_ms > 0
  ),
  constraint discord_spotify_queue_items_suggested_by_discord_user_id_check check (
    suggested_by_discord_user_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_queue_items_suggested_by_spotify_user_id_length_check check (
    suggested_by_spotify_user_id is null or char_length(suggested_by_spotify_user_id) between 1 and 200
  ),
  constraint discord_spotify_queue_items_approved_by_discord_user_id_check check (
    approved_by_discord_user_id is null or approved_by_discord_user_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_queue_items_rejected_by_discord_user_id_check check (
    rejected_by_discord_user_id is null or rejected_by_discord_user_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_queue_items_removed_by_discord_user_id_check check (
    removed_by_discord_user_id is null or removed_by_discord_user_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_queue_items_rejection_reason_length_check check (
    rejection_reason is null or char_length(rejection_reason) <= 500
  ),
  constraint discord_spotify_queue_items_removal_reason_length_check check (
    removal_reason is null or char_length(removal_reason) <= 500
  ),
  constraint discord_spotify_queue_items_queue_position_check check (
    queue_position is null or queue_position > 0
  )
);

create index if not exists discord_spotify_queue_items_lobby_status_queue_position_idx
  on fitness.discord_spotify_queue_items (lobby_id, status, queue_position nulls last, created_at asc);

create index if not exists discord_spotify_queue_items_suggested_by_discord_user_id_created_at_idx
  on fitness.discord_spotify_queue_items (suggested_by_discord_user_id, created_at desc);

create index if not exists discord_spotify_queue_items_status_created_at_idx
  on fitness.discord_spotify_queue_items (status, created_at desc);

alter table fitness.discord_spotify_queue_items enable row level security;

-- source supabase/migrations/20260519170000_discord_spotify_rooms_phase5.sql blob 6d3ffab515fee9a9dc4b93432f3d385442cf7088 raw_sha256 7dc47e4d46663dcb7e372876d5def428b17b2eeba15be4ac588627dff82e297f
alter table fitness.discord_spotify_lobbies
  add column if not exists room_slug text not null default 'main',
  add column if not exists room_name text not null default 'Main Room',
  add column if not exists visibility text not null default 'public',
  add column if not exists join_key_hash text null;

alter table fitness.discord_spotify_lobbies
  drop constraint if exists discord_spotify_lobbies_visibility_check;

alter table fitness.discord_spotify_lobbies
  add constraint discord_spotify_lobbies_visibility_check check (
    visibility in ('public', 'private')
  );

alter table fitness.discord_spotify_lobbies
  drop constraint if exists discord_spotify_lobbies_room_slug_length_check;

alter table fitness.discord_spotify_lobbies
  add constraint discord_spotify_lobbies_room_slug_length_check check (
    char_length(room_slug) between 1 and 48
  );

alter table fitness.discord_spotify_lobbies
  drop constraint if exists discord_spotify_lobbies_room_name_length_check;

alter table fitness.discord_spotify_lobbies
  add constraint discord_spotify_lobbies_room_name_length_check check (
    char_length(room_name) between 1 and 80
  );

create index if not exists discord_spotify_lobbies_room_slug_idx
  on fitness.discord_spotify_lobbies (room_slug);

create table if not exists fitness.discord_spotify_room_members (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references fitness.discord_spotify_lobbies(id) on delete cascade,
  discord_user_id text not null,
  spotify_user_id text null,
  status text not null default 'joined',
  joined_at timestamptz not null default now(),
  left_at timestamptz null,
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_spotify_room_members_status_check check (
    status in ('joined', 'left')
  ),
  constraint discord_spotify_room_members_discord_user_id_check check (
    discord_user_id ~ '^[0-9]{5,32}$'
  )
);

create unique index if not exists discord_spotify_room_members_lobby_user_idx
  on fitness.discord_spotify_room_members (lobby_id, discord_user_id);

create index if not exists discord_spotify_room_members_lobby_status_idx
  on fitness.discord_spotify_room_members (lobby_id, status, updated_at desc);

alter table fitness.discord_spotify_room_members enable row level security;

-- source supabase/migrations/20260520120000_discord_spotify_phase6_queue_lifecycle.sql blob 1ffd22f8c5c3ca276839c078e05807ed4239ee36 raw_sha256 4979a23fc2d9c00d2e1a5ac81c50ae9f3f1ccfa6e05e70af249c4a0b3ee78bb7
alter table fitness.discord_spotify_lobbies
  add column if not exists approval_mode text not null default 'auto_approve_jam_ready',
  add column if not exists spotify_mirror_enabled boolean not null default false,
  add column if not exists spotify_mirror_last_synced_at timestamptz null,
  add column if not exists spotify_mirror_error_count integer not null default 0,
  add column if not exists stop_playback_on_close boolean not null default false;

alter table fitness.discord_spotify_lobbies
  drop constraint if exists discord_spotify_lobbies_approval_mode_check;

alter table fitness.discord_spotify_lobbies
  add constraint discord_spotify_lobbies_approval_mode_check check (
    approval_mode in ('auto_approve_jam_ready', 'review', 'host_only')
  );

alter table fitness.discord_spotify_lobbies
  drop constraint if exists discord_spotify_lobbies_spotify_mirror_error_count_check;

alter table fitness.discord_spotify_lobbies
  add constraint discord_spotify_lobbies_spotify_mirror_error_count_check check (
    spotify_mirror_error_count >= 0
  );

alter table fitness.discord_spotify_queue_items
  add column if not exists source_type text not null default 'discord_link',
  add column if not exists approval_state text null,
  add column if not exists playback_state text null,
  add column if not exists dedupe_key text null,
  add column if not exists mirror_first_seen_at timestamptz null,
  add column if not exists mirror_last_seen_at timestamptz null,
  add column if not exists display_position integer null,
  add column if not exists cleared_reason text null,
  add column if not exists playback_started_at timestamptz null,
  add column if not exists playback_finished_at timestamptz null;

alter table fitness.discord_spotify_queue_items
  alter column approval_state set not null,
  alter column approval_state set default 'pending',
  alter column playback_state set not null,
  alter column playback_state set default 'queued';

alter table fitness.discord_spotify_queue_items
  drop constraint if exists discord_spotify_queue_items_source_type_check;

alter table fitness.discord_spotify_queue_items
  add constraint discord_spotify_queue_items_source_type_check check (
    source_type in ('discord_search', 'discord_link', 'spotify_mirror')
  );

alter table fitness.discord_spotify_queue_items
  drop constraint if exists discord_spotify_queue_items_approval_state_check;

alter table fitness.discord_spotify_queue_items
  add constraint discord_spotify_queue_items_approval_state_check check (
    approval_state in ('pending', 'approved', 'rejected', 'removed')
  );

alter table fitness.discord_spotify_queue_items
  drop constraint if exists discord_spotify_queue_items_playback_state_check;

alter table fitness.discord_spotify_queue_items
  add constraint discord_spotify_queue_items_playback_state_check check (
    playback_state in ('queued', 'playing', 'played', 'skipped', 'cleared')
  );

alter table fitness.discord_spotify_queue_items
  drop constraint if exists discord_spotify_queue_items_display_position_check;

alter table fitness.discord_spotify_queue_items
  add constraint discord_spotify_queue_items_display_position_check check (
    display_position is null or display_position > 0
  );

alter table fitness.discord_spotify_queue_items
  drop constraint if exists discord_spotify_queue_items_cleared_reason_length_check;

alter table fitness.discord_spotify_queue_items
  add constraint discord_spotify_queue_items_cleared_reason_length_check check (
    cleared_reason is null or char_length(cleared_reason) <= 120
  );

create index if not exists discord_spotify_lobbies_phase6_mirror_idx
  on fitness.discord_spotify_lobbies (status, spotify_mirror_enabled, spotify_mirror_last_synced_at desc);

create index if not exists discord_spotify_queue_items_lobby_lifecycle_idx
  on fitness.discord_spotify_queue_items (lobby_id, approval_state, playback_state, display_position nulls last, created_at asc);

create index if not exists discord_spotify_queue_items_lobby_dedupe_idx
  on fitness.discord_spotify_queue_items (lobby_id, dedupe_key);

create index if not exists discord_spotify_queue_items_mirror_seen_idx
  on fitness.discord_spotify_queue_items (lobby_id, mirror_last_seen_at desc)
  where source_type = 'spotify_mirror';

-- source supabase/migrations/20260524100805_discord_feedback_effort_points.sql blob 0e2f730b088df1caea9e052d122e86ce99de55fe raw_sha256 53b05b8ee8a5dad7263d406daea45e059ac12ba5f24782dc794886cbf08ce0fb
alter table fitness.discord_feedback_reports
  add column if not exists effort_points integer null;

alter table fitness.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_effort_points_check;

alter table fitness.discord_feedback_reports
  add constraint discord_feedback_reports_effort_points_check check (
    effort_points is null
    or effort_points in (1, 2, 3, 5, 8, 13, 21, 34, 55)
  );

comment on column fitness.discord_feedback_reports.effort_points is
  'Deterministic Fibonacci effort estimate for feedback card sizing.';

-- source supabase/migrations/20260524164827_discord_message_command_claims.sql blob bdd13f4c4b43ea041718be042a80c001b09df35a raw_sha256 8e8a4d8924f3814ab68b2d7abcbdaaaf1e6560184cb9ad9d09a5309589b30ddc
create table if not exists fitness.discord_message_command_claims (
  channel_id text not null,
  message_id text not null,
  command_kind text not null,
  claim_status text not null default 'processing'
    check (claim_status in ('processing', 'completed', 'failed')),
  response_action text null,
  result_code text null,
  claimed_at timestamptz not null default timezone('utc', now()),
  last_attempt_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz null,
  primary key (channel_id, message_id)
);

alter table fitness.discord_message_command_claims enable row level security;

revoke all on fitness.discord_message_command_claims from anon;

revoke all on fitness.discord_message_command_claims from authenticated;

-- source supabase/migrations/20260610121500_discord_feedback_card_dependencies.sql blob 24d1ef87bf4af630497f6c60ab06940b1d6d4683 raw_sha256 8ed27f1af71d5cd0105b9077e63d1c978f2b1cc6195e3f527132939406659f39
alter table fitness.discord_feedback_reports
  add column if not exists card_id text null,
  add column if not exists card_phase text null,
  add column if not exists card_priority text null,
  add column if not exists depends_on text[] null,
  add column if not exists dependency_notes text null;

alter table fitness.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_card_id_check;

alter table fitness.discord_feedback_reports
  add constraint discord_feedback_reports_card_id_check check (
    card_id is null
    or (
      char_length(card_id) <= 40
      and card_id ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$'
    )
  );

alter table fitness.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_card_phase_check;

alter table fitness.discord_feedback_reports
  add constraint discord_feedback_reports_card_phase_check check (
    card_phase is null
    or (
      char_length(btrim(card_phase)) > 0
      and char_length(card_phase) <= 80
    )
  );

alter table fitness.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_card_priority_check;

alter table fitness.discord_feedback_reports
  add constraint discord_feedback_reports_card_priority_check check (
    card_priority is null
    or card_priority in ('P0', 'P1', 'P2', 'P3')
  );

alter table fitness.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_depends_on_check;

alter table fitness.discord_feedback_reports
  add constraint discord_feedback_reports_depends_on_check check (
    depends_on is null
    or array_position(depends_on, null) is null
  );

alter table fitness.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_dependency_notes_check;

alter table fitness.discord_feedback_reports
  add constraint discord_feedback_reports_dependency_notes_check check (
    dependency_notes is null
    or (
      char_length(btrim(dependency_notes)) > 0
      and char_length(dependency_notes) <= 240
    )
  );

comment on column fitness.discord_feedback_reports.card_id is
  'Stable roadmap card identifier for dependency-aware feedback board cards.';

comment on column fitness.discord_feedback_reports.card_phase is
  'Optional rollout phase label for dependency-aware feedback board cards.';

comment on column fitness.discord_feedback_reports.card_priority is
  'Optional bounded planning priority for dependency-aware feedback board cards (P0-P3).';

comment on column fitness.discord_feedback_reports.depends_on is
  'Optional list of prerequisite feedback card ids or exact titles used for export-time dependency validation.';

comment on column fitness.discord_feedback_reports.dependency_notes is
  'Optional human note describing sequencing, blocking, or prerequisite expectations for a feedback card.';

-- source supabase/migrations/20260613051127_sessions_routine_delete_cascade.sql blob 6e71bc2909ea302abdd237081a49fed5bd992a41 raw_sha256 3c40703bd92a2399cfea1e86babf0b5ab77fd6d90bef93d40c6d948252fa3ccf
alter table fitness.sessions
  drop constraint if exists sessions_routine_id_fkey;

alter table fitness.sessions
  add constraint sessions_routine_id_fkey
  foreign key (routine_id)
  references fitness.routines(id)
  on delete cascade;

-- source supabase/migrations/20260613124500_routine_day_reorder.sql blob c670db8e9fa9f63e2464ada68f646912860ec6ef raw_sha256 8b8b4be74cc7c9ad1180f37d07c592170a54f7e0153a7b093077a6fe390b201f
create or replace function fitness.reorder_routine_days(
  target_routine_id uuid,
  target_user_id uuid,
  ordered_routine_day_ids uuid[]
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update fitness.routine_days as target
  set day_index = -ordered.ordinality
  from unnest(ordered_routine_day_ids) with ordinality as ordered(id, ordinality)
  where target.id = ordered.id
    and target.routine_id = target_routine_id
    and target.user_id = target_user_id;

  update fitness.routine_days as target
  set day_index = ordered.ordinality
  from unnest(ordered_routine_day_ids) with ordinality as ordered(id, ordinality)
  where target.id = ordered.id
    and target.routine_id = target_routine_id
    and target.user_id = target_user_id;
end;
$$;

-- source supabase/migrations/20260625072308_workout_plan_templates.sql blob e417c6276fef8d62ee66deca51bd619ce1c85ff0 raw_sha256 2acf868df4b4ad813ea9c39385441e256d137951eea8855eba91e2c50ffe75c8
create table if not exists fitness.workout_plan_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  is_rest boolean not null default false,
  source_routine_day_id uuid null references fitness.routine_days(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workout_plan_templates_user_name_uq
  on fitness.workout_plan_templates (user_id, lower(name));

create index if not exists workout_plan_templates_user_updated_idx
  on fitness.workout_plan_templates (user_id, updated_at desc);

alter table fitness.workout_plan_templates enable row level security;

drop policy if exists "workout_plan_templates_select_own" on fitness.workout_plan_templates;

create policy "workout_plan_templates_select_own"
  on fitness.workout_plan_templates
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "workout_plan_templates_insert_own" on fitness.workout_plan_templates;

create policy "workout_plan_templates_insert_own"
  on fitness.workout_plan_templates
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "workout_plan_templates_update_own" on fitness.workout_plan_templates;

create policy "workout_plan_templates_update_own"
  on fitness.workout_plan_templates
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "workout_plan_templates_delete_own" on fitness.workout_plan_templates;

create policy "workout_plan_templates_delete_own"
  on fitness.workout_plan_templates
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on fitness.workout_plan_templates to authenticated;

grant select, insert, update, delete on fitness.workout_plan_templates to service_role;

create table if not exists fitness.workout_plan_template_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_plan_template_id uuid not null references fitness.workout_plan_templates(id) on delete cascade,
  user_id uuid not null,
  exercise_id uuid not null,
  position int not null default 0,
  target_sets int null,
  target_reps int null,
  target_reps_min int null,
  target_reps_max int null,
  target_weight numeric null,
  target_weight_unit text null,
  target_duration_seconds int null,
  target_distance numeric null,
  target_distance_unit text null,
  target_calories int null,
  measurement_type text null,
  default_unit text null,
  notes text null,
  progression_playbook_id text null,
  progression_playbook_config jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workout_plan_template_exercises_template_position_uq
  on fitness.workout_plan_template_exercises (workout_plan_template_id, position);

create index if not exists workout_plan_template_exercises_template_idx
  on fitness.workout_plan_template_exercises (workout_plan_template_id, position);

alter table fitness.workout_plan_template_exercises enable row level security;

drop policy if exists "workout_plan_template_exercises_select_own" on fitness.workout_plan_template_exercises;

create policy "workout_plan_template_exercises_select_own"
  on fitness.workout_plan_template_exercises
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "workout_plan_template_exercises_insert_own" on fitness.workout_plan_template_exercises;

create policy "workout_plan_template_exercises_insert_own"
  on fitness.workout_plan_template_exercises
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "workout_plan_template_exercises_update_own" on fitness.workout_plan_template_exercises;

create policy "workout_plan_template_exercises_update_own"
  on fitness.workout_plan_template_exercises
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "workout_plan_template_exercises_delete_own" on fitness.workout_plan_template_exercises;

create policy "workout_plan_template_exercises_delete_own"
  on fitness.workout_plan_template_exercises
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on fitness.workout_plan_template_exercises to authenticated;

grant select, insert, update, delete on fitness.workout_plan_template_exercises to service_role;

alter table fitness.routine_days
  add column if not exists workout_plan_template_id uuid null references fitness.workout_plan_templates(id) on delete set null,
  add column if not exists workout_plan_template_edit_choice_required boolean not null default false;

create index if not exists routine_days_workout_plan_template_idx
  on fitness.routine_days (workout_plan_template_id);

alter table fitness.routine_day_exercises
  add column if not exists workout_plan_template_exercise_id uuid null references fitness.workout_plan_template_exercises(id) on delete set null;

create index if not exists routine_day_exercises_template_exercise_idx
  on fitness.routine_day_exercises (workout_plan_template_exercise_id);

-- source supabase/migrations/20260625113000_routine_day_duplicate_source_linkage.sql blob 7455926c8ab474663a44327937cd7f8627fa4f4c raw_sha256 7476e3fd35240f420cd7ab95832f26b786ad709c75ff864b499beae34083daf5
alter table fitness.routine_days
  add column if not exists duplicate_source_routine_day_id uuid null references fitness.routine_days(id) on delete set null;

create index if not exists routine_days_duplicate_source_idx
  on fitness.routine_days (duplicate_source_routine_day_id);

-- source supabase/migrations/20260629011500_session_copilot_feedback.sql blob 6539d79a79519bb5ebc514cbdc1f4df6759920d1 raw_sha256 2d13d24ff927d7f12a22b7aa9f109f05d38ac5991dc0e8461dacda6984707c7a
alter table fitness.session_exercises
  add column if not exists copilot_feedback_signal text null,
  add column if not exists copilot_feedback_note text null,
  add column if not exists copilot_feedback_updated_at timestamptz null;

alter table fitness.session_exercises
  drop constraint if exists session_exercises_copilot_feedback_signal_check;

alter table fitness.session_exercises
  add constraint session_exercises_copilot_feedback_signal_check check (
    copilot_feedback_signal is null
    or copilot_feedback_signal in (
      'completed_as_planned',
      'too_easy',
      'too_hard',
      'form_breakdown',
      'pain_flag',
      'bad_day',
      'override_used'
    )
  );

alter table fitness.session_exercises
  drop constraint if exists session_exercises_copilot_feedback_note_length_check;

alter table fitness.session_exercises
  add constraint session_exercises_copilot_feedback_note_length_check check (
    copilot_feedback_note is null
    or char_length(copilot_feedback_note) <= 240
  );

comment on column fitness.session_exercises.copilot_feedback_signal is
  'Deterministic session-copilot feedback signal captured for the current exercise during an active or completed session.';

comment on column fitness.session_exercises.copilot_feedback_note is
  'Optional bounded note attached to the deterministic session-copilot feedback signal.';

comment on column fitness.session_exercises.copilot_feedback_updated_at is
  'Last time the deterministic session-copilot feedback payload was changed for this session exercise.';

-- source supabase/migrations/20260629193000_session_copilot_feedback_effort.sql blob 2056fdc8eb032bdaec0cbec6d36e57f8a9840060 raw_sha256 3e8c9cf002d9a9fcba350b8207b521c8c8a8567e0b60080301e10f0b0cf2c26a
alter table fitness.session_exercises
  add column if not exists copilot_feedback_effort smallint null;

alter table fitness.session_exercises
  drop constraint if exists session_exercises_copilot_feedback_effort_check;

alter table fitness.session_exercises
  add constraint session_exercises_copilot_feedback_effort_check check (
    copilot_feedback_effort is null
    or copilot_feedback_effort between 1 and 10
  );

comment on column fitness.session_exercises.copilot_feedback_effort is
  'Optional 1-10 effort rating paired with deterministic session-copilot feedback for a session exercise.';

-- source supabase/migrations/20260701174902_billing_lifetime_pro.sql blob 476bb920fd284b73e3c9f213ab362a56a04658d4 raw_sha256 f6c158f4438244d73b77100360d5b0eeab56e89ae400d4b6176897f97e1aae9b
create table if not exists fitness.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  stripe_customer_id text not null unique,
  billing_email text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_customers_user_idx
  on fitness.billing_customers (user_id);

alter table fitness.billing_customers enable row level security;

drop policy if exists "billing_customers_select_own" on fitness.billing_customers;

create policy "billing_customers_select_own"
  on fitness.billing_customers
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on fitness.billing_customers to authenticated;

grant select, insert, update, delete on fitness.billing_customers to service_role;

create table if not exists fitness.billing_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  purchase_kind text not null,
  status text not null default 'pending',
  stripe_checkout_session_id text null,
  stripe_payment_intent_id text null,
  stripe_customer_id text null,
  stripe_price_id text null,
  amount_total integer null,
  currency text null,
  completed_at timestamptz null,
  raw_event_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fitness.billing_purchases
  drop constraint if exists billing_purchases_purchase_kind_check;

alter table fitness.billing_purchases
  add constraint billing_purchases_purchase_kind_check check (
    purchase_kind in ('lifetime_pro')
  );

alter table fitness.billing_purchases
  drop constraint if exists billing_purchases_status_check;

alter table fitness.billing_purchases
  add constraint billing_purchases_status_check check (
    status in ('pending', 'completed', 'cancelled', 'failed')
  );

create unique index if not exists billing_purchases_checkout_session_uq
  on fitness.billing_purchases (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists billing_purchases_payment_intent_uq
  on fitness.billing_purchases (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists billing_purchases_raw_event_uq
  on fitness.billing_purchases (raw_event_id)
  where raw_event_id is not null;

create index if not exists billing_purchases_user_created_idx
  on fitness.billing_purchases (user_id, created_at desc);

create index if not exists billing_purchases_user_kind_status_idx
  on fitness.billing_purchases (user_id, purchase_kind, status);

alter table fitness.billing_purchases enable row level security;

drop policy if exists "billing_purchases_select_own" on fitness.billing_purchases;

create policy "billing_purchases_select_own"
  on fitness.billing_purchases
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on fitness.billing_purchases to authenticated;

grant select, insert, update, delete on fitness.billing_purchases to service_role;

create table if not exists fitness.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entitlement_key text not null,
  status text not null default 'active',
  granted_at timestamptz not null default now(),
  granted_via_purchase_id uuid null references fitness.billing_purchases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fitness.user_entitlements
  drop constraint if exists user_entitlements_entitlement_key_check;

alter table fitness.user_entitlements
  add constraint user_entitlements_entitlement_key_check check (
    entitlement_key in ('pro_lifetime')
  );

alter table fitness.user_entitlements
  drop constraint if exists user_entitlements_status_check;

alter table fitness.user_entitlements
  add constraint user_entitlements_status_check check (
    status in ('active', 'revoked')
  );

create unique index if not exists user_entitlements_user_key_uq
  on fitness.user_entitlements (user_id, entitlement_key);

create index if not exists user_entitlements_user_status_idx
  on fitness.user_entitlements (user_id, status);

alter table fitness.user_entitlements enable row level security;

drop policy if exists "user_entitlements_select_own" on fitness.user_entitlements;

create policy "user_entitlements_select_own"
  on fitness.user_entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on fitness.user_entitlements to authenticated;

grant select, insert, update, delete on fitness.user_entitlements to service_role;

comment on table fitness.billing_customers is
  'Stripe customer mappings for Fitness monetization.';

comment on table fitness.billing_purchases is
  'Durable purchase receipts for one-time monetization events such as Lifetime Pro.';

comment on table fitness.user_entitlements is
  'Product-access truth derived from verified billing events.';

;

-- source supabase/migrations/20260701175406_billing_entitlement_fk_index.sql blob ac541cb710941ea042dc62b9fcce476b991115a0 raw_sha256 dfc68d6cf5382711c4bbeda57e3d74df44e98cb3886cef133eb3cf31a3080367
create index if not exists user_entitlements_granted_via_purchase_idx
  on fitness.user_entitlements (granted_via_purchase_id);

;

-- source supabase/migrations/20260701213803_billing_pro_subscription.sql blob 6ad81a0bfa0198d0263a9ead3f96663ee348f785 raw_sha256 31ecff28785122d03c19a3314c92734da3a9ccdc7cdbed76c0b8cf696c545961
alter table fitness.billing_customers
  add column if not exists latest_stripe_subscription_id text null;

alter table fitness.billing_purchases
  add column if not exists stripe_subscription_id text null,
  add column if not exists stripe_invoice_id text null,
  add column if not exists billing_interval text null,
  add column if not exists billing_interval_count integer null,
  add column if not exists period_start timestamptz null,
  add column if not exists period_end timestamptz null;

alter table fitness.billing_purchases
  drop constraint if exists billing_purchases_purchase_kind_check;

alter table fitness.billing_purchases
  add constraint billing_purchases_purchase_kind_check check (
    purchase_kind in ('lifetime_pro', 'pro_subscription')
  );

alter table fitness.billing_purchases
  drop constraint if exists billing_purchases_billing_interval_check;

alter table fitness.billing_purchases
  add constraint billing_purchases_billing_interval_check check (
    billing_interval in ('month', 'year') or billing_interval is null
  );

create index if not exists billing_purchases_subscription_idx
  on fitness.billing_purchases (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists billing_purchases_invoice_idx
  on fitness.billing_purchases (stripe_invoice_id)
  where stripe_invoice_id is not null;

alter table fitness.user_entitlements
  add column if not exists expires_at timestamptz null,
  add column if not exists source_subscription_id text null;

alter table fitness.user_entitlements
  drop constraint if exists user_entitlements_entitlement_key_check;

alter table fitness.user_entitlements
  add constraint user_entitlements_entitlement_key_check check (
    entitlement_key in ('pro_lifetime', 'pro')
  );

comment on table fitness.billing_purchases is
  'Durable purchase receipts for one-time and recurring Fitness monetization events.';

comment on table fitness.user_entitlements is
  'Product-access truth derived from verified billing events, including recurring Pro access.';

-- source supabase/migrations/20260709073000_billing_subscription_receipt_dedupe.sql blob 5d15f5b7232f40e750c696b536d5b08145c64037 raw_sha256 2ba64e3725d014abca605528175f551826f43da433caf8c30c27b96d804569ea
create unique index if not exists billing_purchases_subscription_uq
  on fitness.billing_purchases (stripe_subscription_id)
  where purchase_kind = 'pro_subscription'
    and stripe_subscription_id is not null;

-- source supabase/migrations/20260709074946_supabase_performance_advisor_safe_indexes.sql blob 77c02f54092a9c34d267949401421af596eaddf3 raw_sha256 26775bb3e9f933cbc862fbe68b7119473c0c8967a116b0628427eab27676a005
-- FF-SEC-001 P1 advisor cleanup.
-- Adds covering indexes for launch-adjacent foreign keys and removes one
-- duplicate unique index while preserving the existing unique constraint index.

create index if not exists discord_feedback_reports_reporter_fitness_user_id_idx
  on fitness.discord_feedback_reports (reporter_fitness_user_id);

create index if not exists discord_moderation_cases_target_fitness_user_id_idx
  on fitness.discord_moderation_cases (target_fitness_user_id);

create index if not exists workout_plan_templates_source_routine_day_id_idx
  on fitness.workout_plan_templates (source_routine_day_id);

drop index if exists fitness.discord_update_drafts_deployment_id_idx;

-- source supabase/migrations/20260713013116_exercise_timer_truth.sql blob e9acdd4b24c17dfc254503254b570a52a79548bf raw_sha256 388c4aa3bec9e7dd91d42bfe34fa0e8da2a4cc27652a7e9b9fca5c2bc8dedeb3
alter table fitness.session_exercises
  add column if not exists exercise_timer_enabled boolean not null default false,
  add column if not exists exercise_timer_mode text,
  add column if not exists exercise_timer_target_seconds integer,
  add column if not exists exercise_timer_elapsed_seconds integer not null default 0,
  add column if not exists exercise_timer_status text not null default 'idle',
  add column if not exists exercise_timer_started_at timestamptz,
  add column if not exists exercise_timer_completed_at timestamptz;

alter table fitness.session_exercises
  drop constraint if exists session_exercises_timer_mode_check,
  add constraint session_exercises_timer_mode_check
    check (exercise_timer_mode is null or exercise_timer_mode in ('count_up', 'countdown')),
  drop constraint if exists session_exercises_timer_target_check,
  add constraint session_exercises_timer_target_check
    check (exercise_timer_target_seconds is null or exercise_timer_target_seconds between 1 and 86400),
  drop constraint if exists session_exercises_timer_elapsed_check,
  add constraint session_exercises_timer_elapsed_check
    check (exercise_timer_elapsed_seconds between 0 and 86400),
  drop constraint if exists session_exercises_timer_status_check,
  add constraint session_exercises_timer_status_check
    check (exercise_timer_status in ('idle', 'running', 'paused', 'completed')),
  drop constraint if exists session_exercises_timer_enabled_config_check,
  add constraint session_exercises_timer_enabled_config_check
    check (
      (exercise_timer_enabled and exercise_timer_mode is not null)
      or
      (
        not exercise_timer_enabled
        and exercise_timer_status in ('idle', 'paused')
        and exercise_timer_started_at is null
      )
    );

create index if not exists session_exercises_timer_enabled_history_idx
  on fitness.session_exercises (user_id, session_id, exercise_timer_status)
  where exercise_timer_enabled = true;

-- source supabase/migrations/20260713020801_set_timing_truth.sql blob 5e34f762a255dcf40087e605f8f009e3215f1dff raw_sha256 82ce3b62e60c0c729405ae1af487b382de44d8c618c6dd07232223acd0348bd2
alter table fitness.sets
  add column if not exists logged_at timestamptz;

create index if not exists sets_recovery_timing_idx
  on fitness.sets (user_id, session_exercise_id, logged_at)
  where logged_at is not null;

-- source supabase/migrations/20260716033653_routine_day_optional.sql blob f3fa17151024a57f9e62575f6dc4e8f5898fa5af raw_sha256 2b8d8b73e03f77b6034030a934a31b299529d852e406d4f74322d80866c45172
alter table fitness.routine_days
  add column if not exists is_optional boolean not null default false;

alter table fitness.routine_days
  drop constraint if exists routine_days_rest_optional_exclusive;

alter table fitness.routine_days
  add constraint routine_days_rest_optional_exclusive
  check (not (is_rest and is_optional));

-- Effective function ACL closure: no application role is authorized in this inert package.
revoke execute on function fitness.claim_session_follow_up_jobs(uuid, uuid, timestamptz, timestamptz) from PUBLIC, anon, authenticated, service_role;
revoke execute on function fitness.reorder_routine_day_exercises(uuid, uuid, uuid[]) from PUBLIC, anon, authenticated, service_role;
revoke execute on function fitness.reorder_routine_days(uuid, uuid, uuid[]) from PUBLIC, anon, authenticated, service_role;
revoke execute on function fitness.repack_routine_day_exercise_positions_after_delete() from PUBLIC, anon, authenticated, service_role;
revoke execute on function fitness.repack_session_exercise_positions_after_delete() from PUBLIC, anon, authenticated, service_role;

-- resolved dynamic policy expansion: exactly 10 identities
revoke all privileges on table fitness.discord_feedback_reports from PUBLIC, anon, authenticated;
grant all privileges on table fitness.discord_feedback_reports to service_role;
create policy discord_feedback_reports_deny_public_api_access on fitness.discord_feedback_reports for all to anon, authenticated using (false) with check (false);

revoke all privileges on table fitness.discord_member_links from PUBLIC, anon, authenticated;
grant all privileges on table fitness.discord_member_links to service_role;
create policy discord_member_links_deny_public_api_access on fitness.discord_member_links for all to anon, authenticated using (false) with check (false);

revoke all privileges on table fitness.discord_message_command_claims from PUBLIC, anon, authenticated;
grant all privileges on table fitness.discord_message_command_claims to service_role;
create policy discord_message_command_claims_deny_public_api_access on fitness.discord_message_command_claims for all to anon, authenticated using (false) with check (false);

revoke all privileges on table fitness.discord_moderation_cases from PUBLIC, anon, authenticated;
grant all privileges on table fitness.discord_moderation_cases to service_role;
create policy discord_moderation_cases_deny_public_api_access on fitness.discord_moderation_cases for all to anon, authenticated using (false) with check (false);

revoke all privileges on table fitness.discord_spotify_connections from PUBLIC, anon, authenticated;
grant all privileges on table fitness.discord_spotify_connections to service_role;
create policy discord_spotify_connections_deny_public_api_access on fitness.discord_spotify_connections for all to anon, authenticated using (false) with check (false);

revoke all privileges on table fitness.discord_spotify_lobbies from PUBLIC, anon, authenticated;
grant all privileges on table fitness.discord_spotify_lobbies to service_role;
create policy discord_spotify_lobbies_deny_public_api_access on fitness.discord_spotify_lobbies for all to anon, authenticated using (false) with check (false);

revoke all privileges on table fitness.discord_spotify_queue_items from PUBLIC, anon, authenticated;
grant all privileges on table fitness.discord_spotify_queue_items to service_role;
create policy discord_spotify_queue_items_deny_public_api_access on fitness.discord_spotify_queue_items for all to anon, authenticated using (false) with check (false);

revoke all privileges on table fitness.discord_spotify_room_members from PUBLIC, anon, authenticated;
grant all privileges on table fitness.discord_spotify_room_members to service_role;
create policy discord_spotify_room_members_deny_public_api_access on fitness.discord_spotify_room_members for all to anon, authenticated using (false) with check (false);

revoke all privileges on table fitness.discord_update_drafts from PUBLIC, anon, authenticated;
grant all privileges on table fitness.discord_update_drafts to service_role;
create policy discord_update_drafts_deny_public_api_access on fitness.discord_update_drafts for all to anon, authenticated using (false) with check (false);

revoke all privileges on table fitness.discord_verification_tokens from PUBLIC, anon, authenticated;
grant all privileges on table fitness.discord_verification_tokens to service_role;
create policy discord_verification_tokens_deny_public_api_access on fitness.discord_verification_tokens for all to anon, authenticated using (false) with check (false);
