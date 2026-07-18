-- FF-SEC-001 P1 advisor cleanup.
-- Adds covering indexes for launch-adjacent foreign keys and removes one
-- duplicate unique index while preserving the existing unique constraint index.

create index if not exists discord_feedback_reports_reporter_fitness_user_id_idx
  on public.discord_feedback_reports (reporter_fitness_user_id);

create index if not exists discord_moderation_cases_target_fitness_user_id_idx
  on public.discord_moderation_cases (target_fitness_user_id);

create index if not exists workout_plan_templates_source_routine_day_id_idx
  on public.workout_plan_templates (source_routine_day_id);

drop index if exists public.discord_update_drafts_deployment_id_idx;
