-- 020_global_exercises_metadata_backfill.sql
-- Backfill full global exercise metadata from supabase/data/global_exercises_canonical.json.

UPDATE public.exercises SET
  how_to_short = 'Kneel with the wheel under your shoulders, roll forward while bracing your trunk, then pull back to the start.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY['hip flexors']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Ab Wheel Rollout'));

UPDATE public.exercises SET
  how_to_short = 'Sit tall and press your knees outward against the pads, then return with control.',
  primary_muscles = ARRAY['abductors','glutes']::text[],
  secondary_muscles = ARRAY['core']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Abductor Machine'));

UPDATE public.exercises SET
  how_to_short = 'Sit upright and squeeze your legs inward against the pads, then return slowly.',
  primary_muscles = ARRAY['adductors']::text[],
  secondary_muscles = ARRAY['core']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Adductor Machine'));

UPDATE public.exercises SET
  how_to_short = 'Drive hard with arms and legs together at a high effort, then ease down under control.',
  primary_muscles = ARRAY['cardio']::text[],
  secondary_muscles = ARRAY[]::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Air Bike Sprint'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Alternating Dumbbell Curl'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Arnold Press'));

UPDATE public.exercises SET
  how_to_short = 'Hinge over the pad, extend your hips and spine to neutral, then lower with control.',
  primary_muscles = ARRAY['lower back']::text[],
  secondary_muscles = ARRAY['glutes','hamstrings']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Back Extension'));

UPDATE public.exercises SET
  how_to_short = 'Brace your torso, sit down between your hips, and stand by driving through mid-foot.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['core','adductors']::text[],
  movement_pattern = 'squat',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Back Squat'));

UPDATE public.exercises SET
  how_to_short = 'Lower the bar to mid-chest with control, press to lockout, and keep your shoulders set.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Barbell Bench Press'));

UPDATE public.exercises SET
  how_to_short = 'Keep elbows near your sides, curl the bar to shoulder height, and lower without swinging.',
  primary_muscles = ARRAY['biceps']::text[],
  secondary_muscles = ARRAY['forearms']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Barbell Curl'));

UPDATE public.exercises SET
  how_to_short = 'Hinge at the hips, row the bar toward your lower ribs, then lower while holding position.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['rear delts','biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Barbell Row'));

UPDATE public.exercises SET
  how_to_short = 'Set your rear foot on a bench, drop your back knee down, and drive up through the front leg.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['adductors','core']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Bulgarian Split Squat'));

UPDATE public.exercises SET
  how_to_short = 'Kneel at the cable, flex your trunk down by bracing your abs, and return under control.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY['hip flexors']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Cable Crunch'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Cable Curl'));

UPDATE public.exercises SET
  how_to_short = 'With a soft elbow bend, bring the handles together in front of your chest and return slowly.',
  primary_muscles = ARRAY['chest']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Cable Fly'));

UPDATE public.exercises SET
  how_to_short = 'Brace your torso, extend one leg straight back against the cable, and return with control.',
  primary_muscles = ARRAY['glutes']::text[],
  secondary_muscles = ARRAY['hamstrings','core']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Cable Kickback'));

UPDATE public.exercises SET
  how_to_short = 'Raise your arm out to shoulder height with a slight elbow bend, then lower slowly.',
  primary_muscles = ARRAY['side delts']::text[],
  secondary_muscles = ARRAY['upper traps']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Cable Lateral Raise'));

UPDATE public.exercises SET
  how_to_short = 'Pull the handles out and back at shoulder height, then return without shrugging.',
  primary_muscles = ARRAY['rear delts']::text[],
  secondary_muscles = ARRAY['upper back']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Cable Rear Delt Fly'));

UPDATE public.exercises SET
  how_to_short = 'Press through the balls of your feet to raise your heels high, then lower to a full stretch.',
  primary_muscles = ARRAY['calves']::text[],
  secondary_muscles = ARRAY[]::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Calf Raise (Seated)'));

UPDATE public.exercises SET
  how_to_short = 'Rise onto your toes with control, pause at the top, and lower your heels slowly.',
  primary_muscles = ARRAY['calves']::text[],
  secondary_muscles = ARRAY[]::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Calf Raise (Standing)'));

UPDATE public.exercises SET
  how_to_short = 'Keep your chest on the pad, pull elbows back, and lower the handles under control.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['rear delts','biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Chest-Supported Row'));

UPDATE public.exercises SET
  how_to_short = 'Start from a dead hang, pull your chest up to the bar, and lower to full extension.',
  primary_muscles = ARRAY['lats','biceps']::text[],
  secondary_muscles = ARRAY['upper back','core']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Chin-Up'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Close-Grip Bench Press'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Close-Grip Lat Pulldown'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Close-Grip Push-Up'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Concentration Curl'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Cross-Body Hammer Curl'));

UPDATE public.exercises SET
  how_to_short = 'Brace your lower back to the floor, extend opposite arm and leg, and return without arching.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY['hip flexors']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dead Bug'));

UPDATE public.exercises SET
  how_to_short = 'Hinge to the bar with a neutral spine, stand tall by driving through the floor, and lower with control.',
  primary_muscles = ARRAY['glutes','hamstrings']::text[],
  secondary_muscles = ARRAY['lower back','core']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Deadlift'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Decline Barbell Bench Press'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Decline Dumbbell Bench Press'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Deficit Push-Up'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dips (Chest)'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dips (Triceps)'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Donkey Calf Raise'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dumbbell Bench Press'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dumbbell Curl'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dumbbell Fly'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dumbbell Overhead Triceps Extension'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dumbbell Row'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('EZ-Bar Curl'));

UPDATE public.exercises SET
  how_to_short = 'Pull the rope toward your face with elbows high, squeeze your upper back, and return slowly.',
  primary_muscles = ARRAY['rear delts','upper back']::text[],
  secondary_muscles = ARRAY['upper traps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Face Pull'));

UPDATE public.exercises SET
  how_to_short = 'Raise the weight in front to shoulder height with control, then lower slowly.',
  primary_muscles = ARRAY['front delts']::text[],
  secondary_muscles = ARRAY['upper traps']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Front Raise'));

UPDATE public.exercises SET
  how_to_short = 'Keep elbows high, sit down between your hips, and stand while maintaining an upright torso.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['core','adductors']::text[],
  movement_pattern = 'squat',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Front Squat'));

UPDATE public.exercises SET
  how_to_short = 'Press through your heels to lift hips to full extension, squeeze glutes, and lower slowly.',
  primary_muscles = ARRAY['glutes']::text[],
  secondary_muscles = ARRAY['hamstrings','core']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Glute Bridge'));

UPDATE public.exercises SET
  how_to_short = 'Hold the weight at your chest, squat down between your hips, and stand tall with control.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['core','adductors']::text[],
  movement_pattern = 'squat',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Goblet Squat'));

UPDATE public.exercises SET
  how_to_short = 'Lower under control until deep knee bend, then drive through mid-foot to stand.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['adductors']::text[],
  movement_pattern = 'squat',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Hack Squat'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Hammer Curl'));

UPDATE public.exercises SET
  how_to_short = 'Hang from the bar, raise your legs by flexing at the hips, and lower without swinging.',
  primary_muscles = ARRAY['hip flexors','core']::text[],
  secondary_muscles = ARRAY[]::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Hanging Leg Raise'));

UPDATE public.exercises SET
  how_to_short = 'Lower under control through a full range, then drive back up with stable trunk position.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['adductors']::text[],
  movement_pattern = 'squat',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('High-Bar Back Squat'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('High-to-Low Cable Fly'));

UPDATE public.exercises SET
  how_to_short = 'Drive your hips up against the bench support, squeeze at lockout, and lower with control.',
  primary_muscles = ARRAY['glutes']::text[],
  secondary_muscles = ARRAY['hamstrings','core']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Hip Thrust'));

UPDATE public.exercises SET
  how_to_short = 'Press your lower back into the floor, hold arms and legs extended, and keep constant tension.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY['hip flexors']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Hollow Body Hold'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Incline Barbell Bench Press'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Incline Dumbbell Bench Press'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Incline Dumbbell Curl'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Incline Dumbbell Fly'));

UPDATE public.exercises SET
  how_to_short = 'Perform the movement at a steady effort for the prescribed pace or duration while maintaining controlled form.',
  primary_muscles = ARRAY['cardio']::text[],
  secondary_muscles = ARRAY[]::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Incline Walk'));

UPDATE public.exercises SET
  how_to_short = 'Jump lightly on the balls of your feet while turning the rope in a steady rhythm.',
  primary_muscles = ARRAY['cardio']::text[],
  secondary_muscles = ARRAY['calves']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Jump Rope'));

UPDATE public.exercises SET
  how_to_short = 'Pull the bar to your upper chest with a tall torso, then let it rise under control.',
  primary_muscles = ARRAY['lats']::text[],
  secondary_muscles = ARRAY['biceps','upper back']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Lat Pulldown'));

UPDATE public.exercises SET
  how_to_short = 'Raise your arms out to shoulder height with soft elbows, then lower slowly.',
  primary_muscles = ARRAY['side delts']::text[],
  secondary_muscles = ARRAY['upper traps']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Lateral Raise'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Leaning Cable Lateral Raise'));

UPDATE public.exercises SET
  how_to_short = 'Extend your knees to lift the pad, squeeze at the top, and lower with control.',
  primary_muscles = ARRAY['quads']::text[],
  secondary_muscles = ARRAY[]::text[],
  movement_pattern = 'squat',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Leg Extension'));

UPDATE public.exercises SET
  how_to_short = 'Lower the sled until knees are deeply bent, then press back up through mid-foot.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['adductors']::text[],
  movement_pattern = 'squat',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Leg Press'));

UPDATE public.exercises SET
  how_to_short = 'Lower under control through a full range, then drive back up with stable trunk position.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['adductors']::text[],
  movement_pattern = 'squat',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Low-Bar Back Squat'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Low-to-High Cable Fly'));

UPDATE public.exercises SET
  how_to_short = 'Curl your heels toward your glutes, squeeze the hamstrings, and lower slowly.',
  primary_muscles = ARRAY['hamstrings']::text[],
  secondary_muscles = ARRAY['calves']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Lying Leg Curl'));

UPDATE public.exercises SET
  how_to_short = 'Keep your lower back braced as you raise your legs up, then lower without arching.',
  primary_muscles = ARRAY['hip flexors','core']::text[],
  secondary_muscles = ARRAY[]::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Lying Leg Raise'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Machine Biceps Curl'));

UPDATE public.exercises SET
  how_to_short = 'Curl your torso forward against resistance, squeeze your abs, and return slowly.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY['hip flexors']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Machine Crunch'));

UPDATE public.exercises SET
  how_to_short = 'Pull the handles toward your torso with elbows back, then return under control.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps','rear delts']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Machine Row'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Machine Shoulder Press'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Neutral-Grip Pull-Up'));

UPDATE public.exercises SET
  how_to_short = 'Lower your body forward from the knees with control, then pull back using your hamstrings.',
  primary_muscles = ARRAY['hamstrings']::text[],
  secondary_muscles = ARRAY['glutes']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Nordic Curl'));

UPDATE public.exercises SET
  how_to_short = 'Press the bar overhead in a straight path, lock out with control, and lower to the start.',
  primary_muscles = ARRAY['front delts','triceps']::text[],
  secondary_muscles = ARRAY['side delts','core']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Overhead Press'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Overhead Triceps Extension'));

UPDATE public.exercises SET
  how_to_short = 'Press the cable straight out from your chest, resist trunk rotation, and return slowly.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY['upper back']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Pallof Press'));

UPDATE public.exercises SET
  how_to_short = 'Lower under control through a full range, then drive back up with stable trunk position.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['adductors']::text[],
  movement_pattern = 'squat',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Paused Back Squat'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Paused Barbell Bench Press'));

UPDATE public.exercises SET
  how_to_short = 'Hinge from the hips with a braced torso, complete the rep under control, and return smoothly.',
  primary_muscles = ARRAY['glutes','hamstrings']::text[],
  secondary_muscles = ARRAY['lower back']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Paused Deadlift'));

UPDATE public.exercises SET
  how_to_short = 'Lower under control through a full range, then drive back up with stable trunk position.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['adductors']::text[],
  movement_pattern = 'squat',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Paused Front Squat'));

UPDATE public.exercises SET
  how_to_short = 'Perform each rep with controlled tempo and a braced trunk through full range of motion.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY[]::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Pec Deck'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Pendlay Row'));

UPDATE public.exercises SET
  how_to_short = 'Hold a straight line from shoulders to heels while bracing your trunk and breathing steadily.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY['glutes']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Plank'));

UPDATE public.exercises SET
  how_to_short = 'Raise the plate to shoulder height with control and lower slowly without swinging.',
  primary_muscles = ARRAY['front delts']::text[],
  secondary_muscles = ARRAY['upper traps']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Plate Front Raise'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Preacher Curl'));

UPDATE public.exercises SET
  how_to_short = 'Start from a dead hang, pull your chest toward the bar, and lower to full extension.',
  primary_muscles = ARRAY['lats','upper back']::text[],
  secondary_muscles = ARRAY['biceps','core']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Pull-Up'));

UPDATE public.exercises SET
  how_to_short = 'Dip slightly at the knees, drive the bar overhead explosively, and lower under control.',
  primary_muscles = ARRAY['front delts','triceps']::text[],
  secondary_muscles = ARRAY['quads','core']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Push Press'));

UPDATE public.exercises SET
  how_to_short = 'Keep a rigid plank, lower your chest toward the floor, and press back to full arm extension.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts','core']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Push-Up'));

UPDATE public.exercises SET
  how_to_short = 'Start with the bar on pins, hinge into position, stand tall, and lower to the rack with control.',
  primary_muscles = ARRAY['glutes','hamstrings']::text[],
  secondary_muscles = ARRAY['lower back','upper back']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Rack Pull'));

UPDATE public.exercises SET
  how_to_short = 'Hinge slightly, open your arms out and back at shoulder level, then lower slowly.',
  primary_muscles = ARRAY['rear delts']::text[],
  secondary_muscles = ARRAY['upper back']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Rear Delt Fly'));

UPDATE public.exercises SET
  how_to_short = 'Swing your legs up to hip level using glutes and hamstrings, then lower with control.',
  primary_muscles = ARRAY['glutes','hamstrings']::text[],
  secondary_muscles = ARRAY['lower back']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Reverse Hyperextension'));

UPDATE public.exercises SET
  how_to_short = 'Step one leg back, lower both knees under control, and drive through the front foot to stand.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['adductors','core']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Reverse Lunge'));

UPDATE public.exercises SET
  how_to_short = 'Perform each rep with controlled tempo and a braced trunk through full range of motion.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY[]::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Reverse Pec Deck'));

UPDATE public.exercises SET
  how_to_short = 'Perform each rep with controlled tempo and a braced trunk through full range of motion.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY[]::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Reverse-Grip Pushdown'));

UPDATE public.exercises SET
  how_to_short = 'Hinge at the hips with soft knees until hamstrings stretch, then stand tall by driving hips forward.',
  primary_muscles = ARRAY['hamstrings','glutes']::text[],
  secondary_muscles = ARRAY['lower back']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Romanian Deadlift'));

UPDATE public.exercises SET
  how_to_short = 'Perform each rep with controlled tempo and a braced trunk through full range of motion.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY[]::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Rope Pushdown'));

UPDATE public.exercises SET
  how_to_short = 'Push through your legs, finish with a torso swing and arm pull, then recover smoothly.',
  primary_muscles = ARRAY['cardio']::text[],
  secondary_muscles = ARRAY['lats','quads']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Rowing Machine'));

UPDATE public.exercises SET
  how_to_short = 'Lean back with a braced trunk, rotate your torso side to side, and keep your ribcage controlled.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY['hip flexors']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Russian Twist'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Seated Barbell Overhead Press'));

UPDATE public.exercises SET
  how_to_short = 'Sit tall, pull the handle toward your lower ribs, and return with shoulder control.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps','rear delts']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Seated Cable Row'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Seated Dumbbell Shoulder Press'));

UPDATE public.exercises SET
  how_to_short = 'Curl your heels down and back under the pad, squeeze, and lower slowly.',
  primary_muscles = ARRAY['hamstrings']::text[],
  secondary_muscles = ARRAY['calves']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Seated Leg Curl'));

UPDATE public.exercises SET
  how_to_short = 'Stack your body sideways on one forearm, lift hips, and hold a straight line.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY['abductors']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Side Plank'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Single-Arm Cable Row'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Single-Arm Dumbbell Bench Press'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Single-Arm Dumbbell Row'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Single-Arm Lat Pulldown'));

UPDATE public.exercises SET
  how_to_short = 'Drive one heel into the floor to raise your hips, squeeze at the top, and lower slowly.',
  primary_muscles = ARRAY['glutes']::text[],
  secondary_muscles = ARRAY['hamstrings','core']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Single-Leg Hip Thrust'));

UPDATE public.exercises SET
  how_to_short = 'Press the sled with one leg through full range, then lower under control.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['adductors']::text[],
  movement_pattern = 'squat',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Single-Leg Press'));

UPDATE public.exercises SET
  how_to_short = 'Hinge on one leg with hips square, lower until tension builds, and stand tall with control.',
  primary_muscles = ARRAY['hamstrings','glutes']::text[],
  secondary_muscles = ARRAY['core']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Single-Leg Romanian Deadlift'));

UPDATE public.exercises SET
  how_to_short = 'Perform each rep with controlled tempo and a braced trunk through full range of motion.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY[]::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Skullcrusher'));

UPDATE public.exercises SET
  how_to_short = 'Lean into the sled and drive it forward with short powerful steps at a steady pace.',
  primary_muscles = ARRAY['cardio']::text[],
  secondary_muscles = ARRAY['quads','glutes']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Sled Push'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Smith Machine Bench Press'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Smith Machine Shoulder Press'));

UPDATE public.exercises SET
  how_to_short = 'Brace your torso, squat to depth on the fixed bar path, and stand by driving through mid-foot.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['adductors','core']::text[],
  movement_pattern = 'squat',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Smith Machine Squat'));

UPDATE public.exercises SET
  how_to_short = 'Hinge from the hips with a braced torso, complete the rep under control, and return smoothly.',
  primary_muscles = ARRAY['glutes','hamstrings']::text[],
  secondary_muscles = ARRAY['lower back']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Snatch-Grip Deadlift'));

UPDATE public.exercises SET
  how_to_short = 'Maintain a steady stepping cadence while keeping your torso tall and core braced.',
  primary_muscles = ARRAY['cardio']::text[],
  secondary_muscles = ARRAY['quads','glutes']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Stair Climber'));

UPDATE public.exercises SET
  how_to_short = 'Pedal smoothly at your target resistance and cadence while maintaining stable posture.',
  primary_muscles = ARRAY['cardio']::text[],
  secondary_muscles = ARRAY['quads','hamstrings']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Stationary Bike'));

UPDATE public.exercises SET
  how_to_short = 'Place one foot on the box, drive through it to stand tall, and lower back with control.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['hamstrings','core']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Step-Up'));

UPDATE public.exercises SET
  how_to_short = 'Hinge with mostly straight knees until hamstrings stretch, then extend hips to stand tall.',
  primary_muscles = ARRAY['hamstrings','glutes']::text[],
  secondary_muscles = ARRAY['lower back']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Stiff-Leg Deadlift'));

UPDATE public.exercises SET
  how_to_short = 'With nearly straight elbows, pull the bar down to your thighs and return slowly.',
  primary_muscles = ARRAY['lats']::text[],
  secondary_muscles = ARRAY['core']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Straight-Arm Pulldown'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('T-Bar Row'));

UPDATE public.exercises SET
  how_to_short = 'Lower under control through a full range, then drive back up with stable trunk position.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['adductors']::text[],
  movement_pattern = 'squat',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Tempo Back Squat'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Tempo Barbell Bench Press'));

UPDATE public.exercises SET
  how_to_short = 'Hinge from the hips with a braced torso, complete the rep under control, and return smoothly.',
  primary_muscles = ARRAY['glutes','hamstrings']::text[],
  secondary_muscles = ARRAY['lower back']::text[],
  movement_pattern = 'hinge',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Tempo Deadlift'));

UPDATE public.exercises SET
  how_to_short = 'Run at your target pace with a light mid-foot strike and controlled arm swing.',
  primary_muscles = ARRAY['cardio']::text[],
  secondary_muscles = ARRAY['quads','calves']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Treadmill Run'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Triceps Pushdown'));

UPDATE public.exercises SET
  how_to_short = 'Pull the bar vertically to upper chest with elbows leading, then lower under control.',
  primary_muscles = ARRAY['side delts','upper traps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Upright Row'));

UPDATE public.exercises SET
  how_to_short = 'Step forward into a lunge, lower under control, and drive through the lead foot into the next step.',
  primary_muscles = ARRAY['quads','glutes']::text[],
  secondary_muscles = ARRAY['hamstrings','core']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Walking Lunge'));

UPDATE public.exercises SET
  how_to_short = 'Hold a rigid plank with added load while keeping your trunk braced and hips level.',
  primary_muscles = ARRAY['core']::text[],
  secondary_muscles = ARRAY['glutes']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Weighted Plank'));

UPDATE public.exercises SET
  how_to_short = 'Start from a dead hang with added load, pull your chest to the bar, and lower under control.',
  primary_muscles = ARRAY['lats','upper back']::text[],
  secondary_muscles = ARRAY['biceps','core']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Weighted Pull-Up'));

UPDATE public.exercises SET
  how_to_short = 'Press or raise the load with a stable torso, control the lowering phase, and avoid momentum.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Weighted Push-Up'));

UPDATE public.exercises SET
  how_to_short = 'Pull the bar to your upper chest with a wide grip, then return slowly.',
  primary_muscles = ARRAY['lats','upper back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Wide-Grip Lat Pulldown'));

UPDATE public.exercises SET
  how_to_short = 'Pull the load toward your torso with controlled tempo, squeeze at peak contraction, and return slowly.',
  primary_muscles = ARRAY['lats','mid back']::text[],
  secondary_muscles = ARRAY['biceps']::text[],
  movement_pattern = 'pull',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Yates Row'));

UPDATE public.exercises SET
  how_to_short = 'Press the handles away from your chest to full extension, then lower with control.',
  primary_muscles = ARRAY['chest','triceps']::text[],
  secondary_muscles = ARRAY['front delts']::text[],
  movement_pattern = 'push',
  image_howto_path = '/exercises/placeholders/howto.svg',
  image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Chest Press'));

-- Safety backfill: ensure no global exercise has null/empty image paths.
UPDATE public.exercises SET image_howto_path = '/exercises/placeholders/howto.svg'
WHERE is_global = TRUE
  AND (image_howto_path IS NULL OR btrim(image_howto_path) = '');

UPDATE public.exercises SET image_muscles_path = '/exercises/placeholders/muscles.svg'
WHERE is_global = TRUE
  AND (image_muscles_path IS NULL OR btrim(image_muscles_path) = '');

-- QA snippet (run manually in Supabase SQL editor):
-- 1) zero global rows with NULL/empty images
-- SELECT count(*) AS missing_global_images
-- FROM public.exercises
-- WHERE is_global = TRUE
--   AND (
--     image_howto_path IS NULL OR btrim(image_howto_path) = ''
--     OR image_muscles_path IS NULL OR btrim(image_muscles_path) = ''
--   );

-- 2) zero global rows missing/empty movement_pattern
-- SELECT count(*) AS missing_global_movement_pattern
-- FROM public.exercises
-- WHERE is_global = TRUE
--   AND (movement_pattern IS NULL OR btrim(movement_pattern) = '');

-- 3) zero global rows with empty primary_muscles
-- SELECT count(*) AS empty_global_primary_muscles
-- FROM public.exercises
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
--    FROM public.exercises e
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
-- LEFT JOIN public.exercises e
--   ON e.is_global = TRUE
--  AND lower(btrim(e.name)) = lower(btrim(j.name))
-- WHERE e.id IS NULL
-- ORDER BY j.name;
