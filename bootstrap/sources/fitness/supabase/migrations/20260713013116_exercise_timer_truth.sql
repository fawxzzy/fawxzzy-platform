alter table public.session_exercises
  add column if not exists exercise_timer_enabled boolean not null default false,
  add column if not exists exercise_timer_mode text,
  add column if not exists exercise_timer_target_seconds integer,
  add column if not exists exercise_timer_elapsed_seconds integer not null default 0,
  add column if not exists exercise_timer_status text not null default 'idle',
  add column if not exists exercise_timer_started_at timestamptz,
  add column if not exists exercise_timer_completed_at timestamptz;

alter table public.session_exercises
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
  on public.session_exercises (user_id, session_id, exercise_timer_status)
  where exercise_timer_enabled = true;
