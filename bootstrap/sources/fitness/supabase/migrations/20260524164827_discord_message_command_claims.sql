create table if not exists public.discord_message_command_claims (
  channel_id text not null,
  message_id text not null,
  command_kind text not null,
  claim_status text not null default 'processing'
    check (claim_status in ('processing', 'completed', 'failed')),
  response_action text null,
  result_code text null,
  claimed_at timestamptz not null default timezone('utc', now()),
  last_attempt_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz null,
  primary key (channel_id, message_id)
);

alter table public.discord_message_command_claims enable row level security;

revoke all on public.discord_message_command_claims from anon;
revoke all on public.discord_message_command_claims from authenticated;
