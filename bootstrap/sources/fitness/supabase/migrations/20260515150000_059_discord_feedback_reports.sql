do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'discord_bug_reports'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'discord_feedback_reports'
  ) then
    alter table public.discord_bug_reports rename to discord_feedback_reports;
  end if;
end $$;

create table if not exists public.discord_feedback_reports (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'discord',
  report_type text not null default 'bug',
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
  discord_forum_applied_tag_ids text[] null,
  discord_forum_title text null,
  staff_channel_message_id text null,
  triage_notes text null,
  status_updated_at timestamptz null,
  status_updated_by_discord_user_id text null,
  status_note text null,
  reporter_mentioned_at timestamptz null,
  closed_at timestamptz null,
  pruned_at timestamptz null,
  details_pruned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.discord_feedback_reports
  add column if not exists source text not null default 'discord',
  add column if not exists report_type text not null default 'bug',
  add column if not exists status text not null default 'new',
  add column if not exists severity text not null default 'medium',
  add column if not exists area text null,
  add column if not exists summary text null,
  add column if not exists details text null,
  add column if not exists steps_to_reproduce text null,
  add column if not exists screenshot_url text null,
  add column if not exists reporter_discord_user_id text null,
  add column if not exists reporter_discord_username text null,
  add column if not exists reporter_fitness_user_id uuid null references auth.users(id) on delete set null,
  add column if not exists reporter_member_number integer null,
  add column if not exists reporter_user_kind text null,
  add column if not exists discord_interaction_id text null,
  add column if not exists duplicate_fingerprint text null,
  add column if not exists duplicate_count integer not null default 1,
  add column if not exists first_seen_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists discord_forum_channel_id text null,
  add column if not exists discord_forum_thread_id text null,
  add column if not exists discord_forum_message_id text null,
  add column if not exists discord_forum_applied_tag_ids text[] null,
  add column if not exists discord_forum_title text null,
  add column if not exists staff_channel_message_id text null,
  add column if not exists triage_notes text null,
  add column if not exists status_updated_at timestamptz null,
  add column if not exists status_updated_by_discord_user_id text null,
  add column if not exists status_note text null,
  add column if not exists reporter_mentioned_at timestamptz null,
  add column if not exists closed_at timestamptz null,
  add column if not exists pruned_at timestamptz null,
  add column if not exists details_pruned boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.discord_feedback_reports
set
  summary = coalesce(nullif(summary, ''), 'Untitled feedback'),
  reporter_discord_user_id = coalesce(nullif(reporter_discord_user_id, ''), '0')
where summary is null
   or reporter_discord_user_id is null
   or reporter_discord_user_id = '';

alter table public.discord_feedback_reports
  alter column summary set not null,
  alter column reporter_discord_user_id set not null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.discord_feedback_reports'::regclass
      and conname in (
        'discord_bug_reports_source_check',
        'discord_feedback_reports_source_check',
        'discord_bug_reports_status_check',
        'discord_feedback_reports_status_check',
        'discord_bug_reports_severity_check',
        'discord_feedback_reports_severity_check',
        'discord_bug_reports_reporter_user_kind_check',
        'discord_feedback_reports_reporter_user_kind_check',
        'discord_bug_reports_area_length_check',
        'discord_feedback_reports_area_length_check',
        'discord_bug_reports_summary_length_check',
        'discord_feedback_reports_summary_length_check',
        'discord_bug_reports_reporter_discord_user_id_check',
        'discord_feedback_reports_reporter_discord_user_id_check',
        'discord_bug_reports_details_length_check',
        'discord_feedback_reports_details_length_check',
        'discord_bug_reports_steps_length_check',
        'discord_feedback_reports_steps_length_check',
        'discord_bug_reports_screenshot_url_length_check',
        'discord_feedback_reports_screenshot_url_length_check',
        'discord_bug_reports_report_type_check',
        'discord_feedback_reports_report_type_check',
        'discord_bug_reports_forum_title_length_check',
        'discord_feedback_reports_forum_title_length_check',
        'discord_bug_reports_status_note_length_check',
        'discord_feedback_reports_status_note_length_check'
      )
  loop
    execute format('alter table public.discord_feedback_reports drop constraint %I', constraint_name);
  end loop;
end $$;

do $$
declare
  index_name text;
begin
  for index_name in
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'discord_feedback_reports'
      and indexname in (
        'discord_bug_reports_status_created_at_idx',
        'discord_bug_reports_severity_created_at_idx',
        'discord_bug_reports_reporter_discord_user_id_created_at_idx',
        'discord_bug_reports_duplicate_fingerprint_idx',
        'discord_bug_reports_discord_forum_thread_id_idx',
        'discord_bug_reports_status_closed_at_idx',
        'discord_bug_reports_status_pruned_at_idx',
        'discord_bug_reports_status_last_seen_at_idx',
        'discord_bug_reports_report_type_status_last_seen_at_idx',
        'discord_bug_reports_status_updated_at_idx'
      )
  loop
    execute format('drop index if exists public.%I', index_name);
  end loop;
end $$;

alter table public.discord_feedback_reports
  add constraint discord_feedback_reports_source_check check (source = 'discord'),
  add constraint discord_feedback_reports_report_type_check check (
    report_type in ('bug', 'feature', 'fix')
  ),
  add constraint discord_feedback_reports_status_check check (
    status in ('new', 'needs_info', 'confirmed', 'in_progress', 'fixed', 'closed', 'duplicate', 'spam', 'withdrawn')
  ),
  add constraint discord_feedback_reports_severity_check check (
    severity in ('low', 'medium', 'high', 'blocker')
  ),
  add constraint discord_feedback_reports_reporter_user_kind_check check (
    reporter_user_kind is null or reporter_user_kind in ('human', 'automation', 'unknown')
  ),
  add constraint discord_feedback_reports_area_length_check check (
    area is null or char_length(area) <= 80
  ),
  add constraint discord_feedback_reports_summary_length_check check (
    char_length(summary) between 1 and 120
  ),
  add constraint discord_feedback_reports_reporter_discord_user_id_check check (
    reporter_discord_user_id ~ '^[0-9]{1,32}$'
  ),
  add constraint discord_feedback_reports_details_length_check check (
    details is null or char_length(details) <= 1200
  ),
  add constraint discord_feedback_reports_steps_length_check check (
    steps_to_reproduce is null or char_length(steps_to_reproduce) <= 1200
  ),
  add constraint discord_feedback_reports_screenshot_url_length_check check (
    screenshot_url is null or char_length(screenshot_url) <= 500
  ),
  add constraint discord_feedback_reports_forum_title_length_check check (
    discord_forum_title is null or char_length(discord_forum_title) <= 100
  ),
  add constraint discord_feedback_reports_status_note_length_check check (
    status_note is null or char_length(status_note) <= 1000
  );

create index if not exists discord_feedback_reports_report_type_status_last_seen_at_idx
  on public.discord_feedback_reports (report_type, status, last_seen_at desc);

create index if not exists discord_feedback_reports_status_last_seen_at_idx
  on public.discord_feedback_reports (status, last_seen_at desc);

create index if not exists discord_feedback_reports_status_created_at_idx
  on public.discord_feedback_reports (status, created_at desc);

create index if not exists discord_feedback_reports_severity_created_at_idx
  on public.discord_feedback_reports (severity, created_at desc);

create index if not exists discord_feedback_reports_reporter_discord_user_id_created_at_idx
  on public.discord_feedback_reports (reporter_discord_user_id, created_at desc);

create index if not exists discord_feedback_reports_duplicate_fingerprint_idx
  on public.discord_feedback_reports (duplicate_fingerprint)
  where duplicate_fingerprint is not null;

create index if not exists discord_feedback_reports_discord_forum_thread_id_idx
  on public.discord_feedback_reports (discord_forum_thread_id)
  where discord_forum_thread_id is not null;

create index if not exists discord_feedback_reports_status_closed_at_idx
  on public.discord_feedback_reports (status, closed_at desc);

create index if not exists discord_feedback_reports_status_pruned_at_idx
  on public.discord_feedback_reports (status, pruned_at desc);

create index if not exists discord_feedback_reports_status_updated_at_idx
  on public.discord_feedback_reports (status_updated_at desc)
  where status_updated_at is not null;

alter table public.discord_feedback_reports enable row level security;
