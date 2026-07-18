alter table public.discord_feedback_reports
  add column if not exists completion_review_status text not null default 'not_required',
  add column if not exists completion_reviewed_at timestamptz null,
  add column if not exists completion_reviewed_by_discord_user_id text null,
  add column if not exists completion_review_note text null;

update public.discord_feedback_reports
set completion_review_status = 'not_required'
where completion_review_status is null;

alter table public.discord_feedback_reports
  drop constraint if exists discord_feedback_reports_completion_review_status_check;

alter table public.discord_feedback_reports
  add constraint discord_feedback_reports_completion_review_status_check
  check (completion_review_status in ('not_required', 'pending', 'approved', 'needs_followup'));

create index if not exists idx_discord_feedback_reports_completion_review_status
  on public.discord_feedback_reports (completion_review_status, updated_at desc);
