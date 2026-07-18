create table if not exists public.discord_spotify_connections (
  id uuid primary key default gen_random_uuid(),
  discord_user_id text not null,
  spotify_user_id text not null,
  spotify_display_name text null,
  spotify_product text not null default 'unknown',
  is_premium boolean not null default false,
  encrypted_refresh_token text not null,
  access_token_expires_at timestamptz null,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  last_checked_at timestamptz null,
  disconnected_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_spotify_connections_discord_user_id_uq unique (discord_user_id),
  constraint discord_spotify_connections_product_check check (
    spotify_product in ('premium', 'free', 'open', 'unknown')
  ),
  constraint discord_spotify_connections_discord_user_id_check check (
    discord_user_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_connections_refresh_token_length_check check (
    char_length(encrypted_refresh_token) between 20 and 4096
  )
);

create index if not exists discord_spotify_connections_spotify_user_id_idx
  on public.discord_spotify_connections (spotify_user_id);

create index if not exists discord_spotify_connections_is_premium_idx
  on public.discord_spotify_connections (is_premium);

create index if not exists discord_spotify_connections_disconnected_at_idx
  on public.discord_spotify_connections (disconnected_at);

alter table public.discord_spotify_connections enable row level security;
