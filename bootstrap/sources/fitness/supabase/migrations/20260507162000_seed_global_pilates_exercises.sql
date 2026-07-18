-- Seed curated Pilates global exercises.
-- Zone/intensity targets stay layered on exercises; these rows are implementable movements.

BEGIN;

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS curation_tags jsonb NOT NULL DEFAULT '{}'::jsonb;

WITH pilates_rows (
  name,
  primary_muscle,
  equipment,
  how_to_short,
  primary_muscles,
  secondary_muscles,
  movement_pattern,
  image_howto_path,
  image_muscles_path,
  measurement_type,
  default_unit,
  calories_estimation_method,
  curation_tags
) AS (
VALUES
  (
    'Pilates Hundred',
    'core',
    'Bodyweight',
    'Brace with the low ribs heavy, pump the arms from the shoulders, and keep the breath steady without letting the low back arch.',
    ARRAY['core']::text[],
    ARRAY['hip flexors']::text[],
    'push',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'time',
    's',
    NULL,
    '{"pattern_detail":["trunk_bracing"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["trunk_bracing"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Roll-Up',
    'core',
    'Bodyweight',
    'Peel the spine up one segment at a time, reach forward with control, then roll back down without using momentum.',
    ARRAY['core']::text[],
    ARRAY['hip flexors']::text[],
    'hinge',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'reps',
    'reps',
    NULL,
    '{"pattern_detail":["spinal_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["spinal_control"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Single-Leg Stretch',
    'core',
    'Bodyweight',
    'Keep the trunk curled and quiet, switch legs smoothly, and pull the knee in without yanking the neck.',
    ARRAY['core']::text[],
    ARRAY['hip flexors']::text[],
    'rotation',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'reps',
    'reps',
    NULL,
    '{"pattern_detail":["anti_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["alternating"],"loading_profile":["bodyweight"],"joint_emphasis":["trunk_control"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Double-Leg Stretch',
    'core',
    'Bodyweight',
    'Reach arms and legs away only as far as you can keep the trunk still, then sweep back to the tucked position.',
    ARRAY['core']::text[],
    ARRAY['hip flexors']::text[],
    'push',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'reps',
    'reps',
    NULL,
    '{"pattern_detail":["anti_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["trunk_control"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Single Straight-Leg Stretch',
    'core',
    'Bodyweight',
    'Keep both legs long, switch with control, and maintain a steady trunk curl without bouncing the lifted leg.',
    ARRAY['core']::text[],
    ARRAY['hamstrings']::text[],
    'hinge',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'reps',
    'reps',
    NULL,
    '{"pattern_detail":["hamstring_mobility"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["alternating"],"loading_profile":["bodyweight"],"joint_emphasis":["hip_flexion_control"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Criss-Cross',
    'core',
    'Bodyweight',
    'Rotate from the ribs toward the opposite knee, keep the pelvis heavy, and switch sides without rushing.',
    ARRAY['core']::text[],
    ARRAY['obliques']::text[],
    'rotation',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'reps',
    'reps',
    NULL,
    '{"pattern_detail":["trunk_rotation"],"plane_of_motion":["transverse"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["alternating"],"loading_profile":["bodyweight"],"joint_emphasis":["rotation_control"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Teaser',
    'core',
    'Bodyweight',
    'Balance tall through the spine, hold the legs and trunk in a V shape, and lower before the low back takes over.',
    ARRAY['core']::text[],
    ARRAY['hip flexors']::text[],
    'hinge',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'time',
    's',
    NULL,
    '{"pattern_detail":["trunk_bracing"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["mobility","core_stability"],"difficulty":["advanced"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["trunk_bracing"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Swan',
    'back',
    'Bodyweight',
    'Press the chest forward and up with long legs, keep the neck neutral, and avoid dumping into the low back.',
    ARRAY['back']::text[],
    ARRAY['glutes']::text[],
    'hinge',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'reps',
    'reps',
    NULL,
    '{"pattern_detail":["spinal_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["prone"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["spinal_extension"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Swimming',
    'back',
    'Bodyweight',
    'Reach opposite arm and leg long, flutter with small controlled reps, and keep the neck relaxed.',
    ARRAY['back']::text[],
    ARRAY['glutes', 'shoulders']::text[],
    'hinge',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'time',
    's',
    NULL,
    '{"pattern_detail":["contralateral_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["prone"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["alternating"],"loading_profile":["bodyweight"],"joint_emphasis":["posterior_chain_control"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Shoulder Bridge',
    'glutes',
    'Bodyweight',
    'Roll the hips up from the mat, keep the ribs stacked, and lower through the spine with control.',
    ARRAY['glutes']::text[],
    ARRAY['hamstrings', 'core']::text[],
    'hinge',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'reps',
    'reps',
    NULL,
    '{"pattern_detail":["hip_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["hip_extension"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Side-Lying Leg Lift',
    'glutes, hips',
    'Bodyweight',
    'Stack the hips, lift the top leg without rolling backward, and lower slowly to keep tension.',
    ARRAY['glutes', 'hips']::text[],
    ARRAY['core']::text[],
    'hinge',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'reps',
    'reps',
    NULL,
    '{"pattern_detail":["hip_abduction"],"plane_of_motion":["frontal"],"exercise_utility":["basic"],"body_position":["side_lying"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["unilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["hip_abduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Clam',
    'glutes, hips',
    'Bodyweight',
    'Keep heels together and hips stacked, open the top knee from the hip, then close without rocking the pelvis.',
    ARRAY['glutes', 'hips']::text[],
    ARRAY['core']::text[],
    'rotation',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'reps',
    'reps',
    NULL,
    '{"pattern_detail":["hip_external_rotation"],"plane_of_motion":["transverse"],"exercise_utility":["basic"],"body_position":["side_lying"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["unilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["hip_rotation"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Plank',
    'core',
    'Bodyweight',
    'Press the floor away, keep ribs and pelvis stacked, and hold a straight line without sagging.',
    ARRAY['core']::text[],
    ARRAY['shoulders', 'glutes']::text[],
    'push',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'time',
    's',
    NULL,
    '{"pattern_detail":["trunk_bracing"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["plank"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["trunk_bracing"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Side Plank',
    'core',
    'Bodyweight',
    'Stack the shoulder and hips, press away from the floor, and keep the body long without rotating forward.',
    ARRAY['core']::text[],
    ARRAY['shoulders', 'glutes']::text[],
    'push',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'time',
    's',
    NULL,
    '{"pattern_detail":["lateral_trunk_bracing"],"plane_of_motion":["frontal"],"exercise_utility":["basic"],"body_position":["side_plank"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["unilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["lateral_trunk_bracing"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Leg Circles',
    'core, hips',
    'Bodyweight',
    'Keep the pelvis heavy while the leg circles from the hip, using a range you can control.',
    ARRAY['core', 'hips']::text[],
    ARRAY['hip flexors']::text[],
    'rotation',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'reps',
    'reps',
    NULL,
    '{"pattern_detail":["hip_circumduction"],"plane_of_motion":["transverse"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["unilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["hip_control"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Saw',
    'core, back',
    'Bodyweight',
    'Sit tall, rotate through the ribs, reach toward the opposite foot, then stack the spine back up.',
    ARRAY['core', 'back']::text[],
    ARRAY['hamstrings']::text[],
    'rotation',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'time',
    's',
    NULL,
    '{"pattern_detail":["trunk_rotation"],"plane_of_motion":["transverse"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["rotation_control"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Spine Stretch Forward',
    'back, hamstrings',
    'Bodyweight',
    'Sit tall, nod the head and round forward from the upper spine, then rebuild the posture one segment at a time.',
    ARRAY['back', 'hamstrings']::text[],
    ARRAY['core']::text[],
    'hinge',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'time',
    's',
    NULL,
    '{"pattern_detail":["spinal_flexion_mobility"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["spinal_control"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  ),
  (
    'Pilates Mermaid Stretch',
    'hips, obliques',
    'Bodyweight',
    'Sit grounded, reach one arm overhead, and side-bend through the ribs while both hips stay heavy.',
    ARRAY['hips', 'obliques']::text[],
    ARRAY['back']::text[],
    'rotation',
    '/exercises/placeholders/howto.svg',
    '/exercises/placeholders/muscles.svg',
    'time',
    's',
    NULL,
    '{"pattern_detail":["lateral_flexion_mobility"],"plane_of_motion":["frontal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["mobility","core_stability"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["lateral_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
  )
),
inserted AS (
  INSERT INTO public.exercises (
    name, user_id, is_global, primary_muscle, equipment, how_to_short,
    primary_muscles, secondary_muscles, movement_pattern, image_howto_path, image_muscles_path,
    measurement_type, default_unit, calories_estimation_method, curation_tags
  )
  SELECT
    source.name, NULL::uuid, TRUE, source.primary_muscle, source.equipment, source.how_to_short,
    source.primary_muscles, source.secondary_muscles, source.movement_pattern, source.image_howto_path, source.image_muscles_path,
    source.measurement_type, source.default_unit, source.calories_estimation_method, source.curation_tags
  FROM pilates_rows AS source
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.exercises AS existing
    WHERE existing.user_id IS NULL
      AND lower(btrim(existing.name)) = lower(btrim(source.name))
  )
  RETURNING name
)
UPDATE public.exercises AS target
SET
  is_global = TRUE,
  primary_muscle = source.primary_muscle,
  equipment = source.equipment,
  how_to_short = source.how_to_short,
  primary_muscles = source.primary_muscles,
  secondary_muscles = source.secondary_muscles,
  movement_pattern = source.movement_pattern,
  image_howto_path = source.image_howto_path,
  image_muscles_path = source.image_muscles_path,
  measurement_type = source.measurement_type,
  default_unit = source.default_unit,
  calories_estimation_method = source.calories_estimation_method,
  curation_tags = source.curation_tags
FROM pilates_rows AS source
WHERE target.user_id IS NULL
  AND lower(btrim(target.name)) = lower(btrim(source.name));

COMMIT;

-- Verification:
-- SELECT name, measurement_type, default_unit FROM public.exercises WHERE user_id IS NULL AND name LIKE 'Pilates %' ORDER BY name;
