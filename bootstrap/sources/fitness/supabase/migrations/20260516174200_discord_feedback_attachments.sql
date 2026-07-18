alter table public.discord_feedback_reports
  add column if not exists attachment_count integer not null default 0,
  add column if not exists attachment_metadata jsonb null,
  add column if not exists attachment_pruned boolean not null default false;

update public.discord_feedback_reports
set attachment_count = 0
where attachment_count is null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.discord_feedback_reports'::regclass
      and conname in (
        'discord_feedback_reports_attachment_count_check',
        'discord_feedback_reports_attachment_metadata_check'
      )
  loop
    execute format('alter table public.discord_feedback_reports drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.discord_feedback_reports
  add constraint discord_feedback_reports_attachment_count_check check (
    attachment_count between 0 and 3
  ),
  add constraint discord_feedback_reports_attachment_metadata_check check (
    attachment_metadata is null
    or (
      jsonb_typeof(attachment_metadata) = 'array'
      and jsonb_array_length(attachment_metadata) <= 3
    )
  );
