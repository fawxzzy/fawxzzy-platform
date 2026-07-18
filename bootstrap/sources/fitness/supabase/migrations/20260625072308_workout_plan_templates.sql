create table if not exists public.workout_plan_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  is_rest boolean not null default false,
  source_routine_day_id uuid null references public.routine_days(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workout_plan_templates_user_name_uq
  on public.workout_plan_templates (user_id, lower(name));

create index if not exists workout_plan_templates_user_updated_idx
  on public.workout_plan_templates (user_id, updated_at desc);

alter table public.workout_plan_templates enable row level security;

drop policy if exists "workout_plan_templates_select_own" on public.workout_plan_templates;
create policy "workout_plan_templates_select_own"
  on public.workout_plan_templates
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "workout_plan_templates_insert_own" on public.workout_plan_templates;
create policy "workout_plan_templates_insert_own"
  on public.workout_plan_templates
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "workout_plan_templates_update_own" on public.workout_plan_templates;
create policy "workout_plan_templates_update_own"
  on public.workout_plan_templates
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "workout_plan_templates_delete_own" on public.workout_plan_templates;
create policy "workout_plan_templates_delete_own"
  on public.workout_plan_templates
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.workout_plan_templates to authenticated;
grant select, insert, update, delete on public.workout_plan_templates to service_role;

create table if not exists public.workout_plan_template_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_plan_template_id uuid not null references public.workout_plan_templates(id) on delete cascade,
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
  on public.workout_plan_template_exercises (workout_plan_template_id, position);

create index if not exists workout_plan_template_exercises_template_idx
  on public.workout_plan_template_exercises (workout_plan_template_id, position);

alter table public.workout_plan_template_exercises enable row level security;

drop policy if exists "workout_plan_template_exercises_select_own" on public.workout_plan_template_exercises;
create policy "workout_plan_template_exercises_select_own"
  on public.workout_plan_template_exercises
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "workout_plan_template_exercises_insert_own" on public.workout_plan_template_exercises;
create policy "workout_plan_template_exercises_insert_own"
  on public.workout_plan_template_exercises
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "workout_plan_template_exercises_update_own" on public.workout_plan_template_exercises;
create policy "workout_plan_template_exercises_update_own"
  on public.workout_plan_template_exercises
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "workout_plan_template_exercises_delete_own" on public.workout_plan_template_exercises;
create policy "workout_plan_template_exercises_delete_own"
  on public.workout_plan_template_exercises
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.workout_plan_template_exercises to authenticated;
grant select, insert, update, delete on public.workout_plan_template_exercises to service_role;

alter table public.routine_days
  add column if not exists workout_plan_template_id uuid null references public.workout_plan_templates(id) on delete set null,
  add column if not exists workout_plan_template_edit_choice_required boolean not null default false;

create index if not exists routine_days_workout_plan_template_idx
  on public.routine_days (workout_plan_template_id);

alter table public.routine_day_exercises
  add column if not exists workout_plan_template_exercise_id uuid null references public.workout_plan_template_exercises(id) on delete set null;

create index if not exists routine_day_exercises_template_exercise_idx
  on public.routine_day_exercises (workout_plan_template_exercise_id);
