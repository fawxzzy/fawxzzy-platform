alter table public.session_exercises
  add column if not exists copilot_feedback_effort smallint null;

alter table public.session_exercises
  drop constraint if exists session_exercises_copilot_feedback_effort_check;

alter table public.session_exercises
  add constraint session_exercises_copilot_feedback_effort_check check (
    copilot_feedback_effort is null
    or copilot_feedback_effort between 1 and 10
  );

comment on column public.session_exercises.copilot_feedback_effort is
  'Optional 1-10 effort rating paired with deterministic session-copilot feedback for a session exercise.';
