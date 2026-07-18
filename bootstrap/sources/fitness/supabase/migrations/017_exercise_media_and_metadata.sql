alter table public.exercises
  add column if not exists how_to_short text null,
  add column if not exists primary_muscles text[] null,
  add column if not exists secondary_muscles text[] null,
  add column if not exists movement_pattern text null,
  add column if not exists image_howto_path text null,
  add column if not exists image_muscles_path text null;

alter table public.exercises
  drop constraint if exists exercises_movement_pattern_check;

alter table public.exercises
  add constraint exercises_movement_pattern_check
  check (
    movement_pattern is null
    or movement_pattern in ('push', 'pull', 'hinge', 'squat', 'carry', 'rotation')
  );

-- Equipment values include legacy seeded values today. Keep DB permissive and validate
-- canonical values in server actions while we migrate toward standardized tags.

update public.exercises
set
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg',
  how_to_short = 'Start from a dead hang, pull your chest up to the bar, then lower under control.',
  primary_muscles = array['lats', 'upper back'],
  secondary_muscles = array['biceps', 'core'],
  movement_pattern = 'pull',
  equipment = 'bodyweight'
where lower(name) = 'pull-up';

update public.exercises
set
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg',
  how_to_short = 'Keep your feet planted, lower the bar to mid-chest, then press to lockout.',
  primary_muscles = array['chest', 'triceps'],
  secondary_muscles = array['front delts'],
  movement_pattern = 'push',
  equipment = 'barbell'
where lower(name) in ('bench press', 'barbell bench press');

update public.exercises
set
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg',
  how_to_short = 'Brace your core, sit between your hips, then stand up driving through mid-foot.',
  primary_muscles = array['quads', 'glutes'],
  secondary_muscles = array['core', 'adductors'],
  movement_pattern = 'squat',
  equipment = 'barbell'
where lower(name) in ('squat', 'back squat');

update public.exercises
set
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg',
  how_to_short = 'Hinge at the hips, pull elbows back toward your hips, and pause before lowering.',
  primary_muscles = array['lats', 'mid back'],
  secondary_muscles = array['rear delts', 'biceps'],
  movement_pattern = 'pull',
  equipment = 'barbell'
where lower(name) in ('row', 'barbell row');

update public.exercises
set
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg',
  how_to_short = 'Lock your torso, pull the bar to your upper chest, then control the return.',
  primary_muscles = array['lats'],
  secondary_muscles = array['biceps', 'rear delts'],
  movement_pattern = 'pull',
  equipment = 'cable'
where lower(name) = 'lat pulldown';

update public.exercises
set
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg',
  how_to_short = 'Raise the weights out to shoulder height with a slight bend in your elbows.',
  primary_muscles = array['side delts'],
  secondary_muscles = array['upper traps'],
  movement_pattern = 'push',
  equipment = 'dumbbell'
where lower(name) = 'lateral raise';

-- Replace SVG placeholder paths with Supabase Storage URLs for real images.
