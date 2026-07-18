create table if not exists public.discord_bug_reports (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'discord',
  status text not null default 'new',
  severity text not null default 'medium',
  area text null,
  summary text not null,
  details text null,
  steps_to_reproduce text null,
  screenshot_url text null,
  reporter_discord_user_id text not null,
  reporter_discord_username text null,
  reporter_fitness_user_id uuid null references auth.users(id) on delete set null,
  reporter_member_number integer null,
  reporter_user_kind text null,
  discord_interaction_id text null,
  duplicate_fingerprint text null,
  duplicate_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  discord_forum_channel_id text null,
  discord_forum_thread_id text null,
  discord_forum_message_id text null,
  staff_channel_message_id text null,
  closed_at timestamptz null,
  pruned_at timestamptz null,
  details_pruned boolean not null default false,
  triage_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_bug_reports_source_check check (source = 'discord'),
  constraint discord_bug_reports_status_check check (
    status in ('new', 'triaged', 'accepted', 'duplicate', 'closed', 'spam')
  ),
  constraint discord_bug_reports_severity_check check (
    severity in ('low', 'medium', 'high', 'blocker')
  ),
  constraint discord_bug_reports_reporter_user_kind_check check (
    reporter_user_kind is null or reporter_user_kind in ('human', 'automation', 'unknown')
  ),
  constraint discord_bug_reports_area_length_check check (
    area is null or char_length(area) <= 80
  ),
  constraint discord_bug_reports_summary_length_check check (
    char_length(summary) between 1 and 120
  ),
  constraint discord_bug_reports_reporter_discord_user_id_check check (
    reporter_discord_user_id ~ '^[0-9]{1,32}$'
  ),
  constraint discord_bug_reports_details_length_check check (
    details is null or char_length(details) <= 1200
  ),
  constraint discord_bug_reports_steps_length_check check (
    steps_to_reproduce is null or char_length(steps_to_reproduce) <= 1200
  ),
  constraint discord_bug_reports_screenshot_url_length_check check (
    screenshot_url is null or char_length(screenshot_url) <= 500
  )
);

create index if not exists discord_bug_reports_status_created_at_idx
  on public.discord_bug_reports (status, created_at desc);

create index if not exists discord_bug_reports_severity_created_at_idx
  on public.discord_bug_reports (severity, created_at desc);

create index if not exists discord_bug_reports_reporter_discord_user_id_created_at_idx
  on public.discord_bug_reports (reporter_discord_user_id, created_at desc);

create index if not exists discord_bug_reports_duplicate_fingerprint_idx
  on public.discord_bug_reports (duplicate_fingerprint)
  where duplicate_fingerprint is not null;

create index if not exists discord_bug_reports_discord_forum_thread_id_idx
  on public.discord_bug_reports (discord_forum_thread_id)
  where discord_forum_thread_id is not null;

create index if not exists discord_bug_reports_status_closed_at_idx
  on public.discord_bug_reports (status, closed_at desc);

create index if not exists discord_bug_reports_status_pruned_at_idx
  on public.discord_bug_reports (status, pruned_at desc);

create index if not exists discord_bug_reports_status_last_seen_at_idx
  on public.discord_bug_reports (status, last_seen_at desc);

alter table public.discord_bug_reports enable row level security;
