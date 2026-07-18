alter table public.discord_feedback_reports
  add column if not exists effort_points integer null;

alter table public.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_effort_points_check;

alter table public.discord_feedback_reports
  add constraint discord_feedback_reports_effort_points_check check (
    effort_points is null
    or effort_points in (1, 2, 3, 5, 8, 13, 21, 34, 55)
  );

comment on column public.discord_feedback_reports.effort_points is
  'Deterministic Fibonacci effort estimate for feedback card sizing.';
