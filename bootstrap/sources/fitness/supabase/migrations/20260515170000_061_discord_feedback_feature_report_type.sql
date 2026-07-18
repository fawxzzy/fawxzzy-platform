do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'discord_bug_reports'
  ) then
    alter table public.discord_bug_reports
      drop constraint if exists discord_bug_reports_report_type_check;

    update public.discord_bug_reports
    set report_type = 'feature'
    where report_type = 'feat';

    alter table public.discord_bug_reports
      add constraint discord_bug_reports_report_type_check check (
        report_type in ('bug', 'feature', 'fix')
      );
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'discord_feedback_reports'
  ) then
    alter table public.discord_feedback_reports
      drop constraint if exists discord_bug_reports_report_type_check,
      drop constraint if exists discord_feedback_reports_report_type_check;

    update public.discord_feedback_reports
    set report_type = 'feature'
    where report_type = 'feat';

    alter table public.discord_feedback_reports
      add constraint discord_feedback_reports_report_type_check check (
        report_type in ('bug', 'feature', 'fix')
      );
  end if;
end $$;
