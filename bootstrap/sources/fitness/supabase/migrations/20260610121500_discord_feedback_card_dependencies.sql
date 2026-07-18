alter table public.discord_feedback_reports
  add column if not exists card_id text null,
  add column if not exists card_phase text null,
  add column if not exists card_priority text null,
  add column if not exists depends_on text[] null,
  add column if not exists dependency_notes text null;

alter table public.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_card_id_check;

alter table public.discord_feedback_reports
  add constraint discord_feedback_reports_card_id_check check (
    card_id is null
    or (
      char_length(card_id) <= 40
      and card_id ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$'
    )
  );

alter table public.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_card_phase_check;

alter table public.discord_feedback_reports
  add constraint discord_feedback_reports_card_phase_check check (
    card_phase is null
    or (
      char_length(btrim(card_phase)) > 0
      and char_length(card_phase) <= 80
    )
  );

alter table public.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_card_priority_check;

alter table public.discord_feedback_reports
  add constraint discord_feedback_reports_card_priority_check check (
    card_priority is null
    or card_priority in ('P0', 'P1', 'P2', 'P3')
  );

alter table public.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_depends_on_check;

alter table public.discord_feedback_reports
  add constraint discord_feedback_reports_depends_on_check check (
    depends_on is null
    or array_position(depends_on, null) is null
  );

alter table public.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_dependency_notes_check;

alter table public.discord_feedback_reports
  add constraint discord_feedback_reports_dependency_notes_check check (
    dependency_notes is null
    or (
      char_length(btrim(dependency_notes)) > 0
      and char_length(dependency_notes) <= 240
    )
  );

comment on column public.discord_feedback_reports.card_id is
  'Stable roadmap card identifier for dependency-aware feedback board cards.';

comment on column public.discord_feedback_reports.card_phase is
  'Optional rollout phase label for dependency-aware feedback board cards.';

comment on column public.discord_feedback_reports.card_priority is
  'Optional bounded planning priority for dependency-aware feedback board cards (P0-P3).';

comment on column public.discord_feedback_reports.depends_on is
  'Optional list of prerequisite feedback card ids or exact titles used for export-time dependency validation.';

comment on column public.discord_feedback_reports.dependency_notes is
  'Optional human note describing sequencing, blocking, or prerequisite expectations for a feedback card.';
