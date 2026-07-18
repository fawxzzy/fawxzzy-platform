create table if not exists public.discord_spotify_lobbies (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'closed',
  host_discord_user_id text null,
  host_spotify_user_id text null,
  title text null,
  description text null,
  panel_channel_id text null,
  panel_message_id text null,
  opened_at timestamptz null,
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_spotify_lobbies_status_check check (
    status in ('open', 'closed')
  ),
  constraint discord_spotify_lobbies_host_discord_user_id_check check (
    host_discord_user_id is null or host_discord_user_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_lobbies_host_spotify_user_id_length_check check (
    host_spotify_user_id is null or char_length(host_spotify_user_id) between 1 and 200
  ),
  constraint discord_spotify_lobbies_panel_channel_id_check check (
    panel_channel_id is null or panel_channel_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_lobbies_panel_message_id_check check (
    panel_message_id is null or panel_message_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_lobbies_title_length_check check (
    title is null or char_length(title) <= 120
  ),
  constraint discord_spotify_lobbies_description_length_check check (
    description is null or char_length(description) <= 500
  )
);

create index if not exists discord_spotify_lobbies_status_idx
  on public.discord_spotify_lobbies (status);

create index if not exists discord_spotify_lobbies_host_discord_user_id_idx
  on public.discord_spotify_lobbies (host_discord_user_id);

create index if not exists discord_spotify_lobbies_panel_channel_id_idx
  on public.discord_spotify_lobbies (panel_channel_id);

create index if not exists discord_spotify_lobbies_updated_at_idx
  on public.discord_spotify_lobbies (updated_at desc);

alter table public.discord_spotify_lobbies enable row level security;
