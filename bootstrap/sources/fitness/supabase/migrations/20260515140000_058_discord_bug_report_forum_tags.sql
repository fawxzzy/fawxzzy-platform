alter table public.discord_bug_reports
  add column if not exists report_type text not null default 'bug',
  add column if not exists discord_forum_applied_tag_ids text[] null,
  add column if not exists discord_forum_title text null,
  add column if not exists status_updated_at timestamptz null,
  add column if not exists status_updated_by_discord_user_id text null,
  add column if not exists status_note text null,
  add column if not exists reporter_mentioned_at timestamptz null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'discord_bug_reports_status_check'
      and conrelid = 'public.discord_bug_reports'::regclass
  ) then
    alter table public.discord_bug_reports
      drop constraint discord_bug_reports_status_check;
  end if;
end $$;

alter table public.discord_bug_reports
  add constraint discord_bug_reports_status_check check (
    status in ('new', 'needs_info', 'confirmed', 'in_progress', 'fixed', 'closed', 'duplicate', 'spam')
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'discord_bug_reports_report_type_check'
      and conrelid = 'public.discord_bug_reports'::regclass
  ) then
    alter table public.discord_bug_reports
      add constraint discord_bug_reports_report_type_check check (
        report_type in ('bug', 'feat', 'fix')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'discord_bug_reports_forum_title_length_check'
      and conrelid = 'public.discord_bug_reports'::regclass
  ) then
    alter table public.discord_bug_reports
      add constraint discord_bug_reports_forum_title_length_check check (
        discord_forum_title is null or char_length(discord_forum_title) <= 100
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'discord_bug_reports_status_note_length_check'
      and conrelid = 'public.discord_bug_reports'::regclass
  ) then
    alter table public.discord_bug_reports
      add constraint discord_bug_reports_status_note_length_check check (
        status_note is null or char_length(status_note) <= 1000
      );
  end if;
end $$;

create index if not exists discord_bug_reports_report_type_status_last_seen_at_idx
  on public.discord_bug_reports (report_type, status, last_seen_at desc);

create index if not exists discord_bug_reports_status_updated_at_idx
  on public.discord_bug_reports (status_updated_at desc)
  where status_updated_at is not null;
