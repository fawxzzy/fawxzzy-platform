alter table public.session_exercises
  add column if not exists copilot_feedback_signal text null,
  add column if not exists copilot_feedback_note text null,
  add column if not exists copilot_feedback_updated_at timestamptz null;

alter table public.session_exercises
  drop constraint if exists session_exercises_copilot_feedback_signal_check;

alter table public.session_exercises
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

alter table public.session_exercises
  drop constraint if exists session_exercises_copilot_feedback_note_length_check;

alter table public.session_exercises
  add constraint session_exercises_copilot_feedback_note_length_check check (
    copilot_feedback_note is null
    or char_length(copilot_feedback_note) <= 240
  );

comment on column public.session_exercises.copilot_feedback_signal is
  'Deterministic session-copilot feedback signal captured for the current exercise during an active or completed session.';

comment on column public.session_exercises.copilot_feedback_note is
  'Optional bounded note attached to the deterministic session-copilot feedback signal.';

comment on column public.session_exercises.copilot_feedback_updated_at is
  'Last time the deterministic session-copilot feedback payload was changed for this session exercise.';
