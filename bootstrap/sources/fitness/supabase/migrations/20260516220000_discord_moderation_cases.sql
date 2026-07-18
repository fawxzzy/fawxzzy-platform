create table if not exists public.discord_moderation_cases (
  id uuid primary key default gen_random_uuid(),
  action text not null default 'purgatory',
  severity text not null default 'purgatory',
  status text not null default 'active',
  target_discord_user_id text not null,
  target_discord_username text null,
  target_fitness_user_id uuid null references auth.users(id) on delete set null,
  target_member_number integer null,
  moderator_discord_user_id text not null,
  moderator_discord_username text null,
  reason text not null,
  duration_seconds integer null,
  expires_at timestamptz null,
  removed_role_ids jsonb not null default '[]'::jsonb,
  restored_role_ids jsonb not null default '[]'::jsonb,
  purgatory_role_id text null,
  purgatory_channel_id text null,
  log_channel_id text null,
  log_message_id text null,
  release_note text null,
  released_by_discord_user_id text null,
  released_at timestamptz null,
  resolved_by_discord_user_id text null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_moderation_cases_action_check check (action in ('notice', 'warning', 'purgatory', 'release')),
  constraint discord_moderation_cases_severity_check check (severity in ('notice', 'warning', 'purgatory', 'critical')),
  constraint discord_moderation_cases_status_check check (status in ('active', 'released', 'expired', 'resolved', 'failed')),
  constraint discord_moderation_cases_reason_length_check check (char_length(reason) between 1 and 1000),
  constraint discord_moderation_cases_release_note_length_check check (
    release_note is null or char_length(release_note) <= 1000
  ),
  constraint discord_moderation_cases_duration_seconds_check check (
    duration_seconds is null or duration_seconds > 0
  ),
  constraint discord_moderation_cases_purgatory_duration_check check (
    action = 'purgatory' or duration_seconds is null
  ),
  constraint discord_moderation_cases_purgatory_expiration_check check (
    action = 'purgatory' or expires_at is null
  )
);

create index if not exists discord_moderation_cases_target_status_idx
  on public.discord_moderation_cases (target_discord_user_id, status);

create index if not exists discord_moderation_cases_status_created_at_idx
  on public.discord_moderation_cases (status, created_at desc);

create index if not exists discord_moderation_cases_expires_at_active_idx
  on public.discord_moderation_cases (expires_at)
  where status = 'active' and expires_at is not null;

alter table public.discord_moderation_cases enable row level security;
