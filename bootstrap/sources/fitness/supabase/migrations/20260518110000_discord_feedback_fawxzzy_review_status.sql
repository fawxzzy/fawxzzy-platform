alter table public.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_status_check;

alter table public.discord_feedback_reports
  add constraint discord_feedback_reports_status_check check (
    status in ('new', 'needs_info', 'confirmed', 'fawxzzy_review', 'in_progress', 'fixed', 'closed', 'duplicate', 'spam', 'withdrawn')
  );
