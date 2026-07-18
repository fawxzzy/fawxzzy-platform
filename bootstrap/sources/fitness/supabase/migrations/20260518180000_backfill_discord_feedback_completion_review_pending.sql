update public.discord_feedback_reports
set completion_review_status = 'pending'
where status in ('fixed', 'closed')
  and completion_review_status = 'not_required'
  and coalesce(discord_forum_channel_id, '') <> '1505827424766660780'
  and lower(coalesce(area, '')) not in ('discord feedback qa', 'feedback testing')
  and lower(concat_ws(' ', coalesce(area, ''), coalesce(summary, ''), coalesce(details, ''))) not like '%feedback canary%'
  and lower(concat_ws(' ', coalesce(area, ''), coalesce(summary, ''), coalesce(details, ''))) not like '%canonical discord feedback canary%';
