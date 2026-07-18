create table if not exists public.discord_spotify_queue_items (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid null references public.discord_spotify_lobbies(id) on delete cascade,
  status text not null default 'pending',
  spotify_uri text not null,
  spotify_url text null,
  track_title text null,
  artist_name text null,
  album_name text null,
  duration_ms integer null,
  suggested_by_discord_user_id text not null,
  suggested_by_spotify_user_id text null,
  approved_by_discord_user_id text null,
  rejected_by_discord_user_id text null,
  removed_by_discord_user_id text null,
  rejection_reason text null,
  removal_reason text null,
  queue_position integer null,
  approved_at timestamptz null,
  rejected_at timestamptz null,
  removed_at timestamptz null,
  played_at timestamptz null,
  skipped_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_spotify_queue_items_status_check check (
    status in ('pending', 'approved', 'rejected', 'removed', 'played', 'skipped')
  ),
  constraint discord_spotify_queue_items_spotify_uri_check check (
    spotify_uri ~ '^spotify:track:[A-Za-z0-9]{22}$'
  ),
  constraint discord_spotify_queue_items_spotify_url_length_check check (
    spotify_url is null or char_length(spotify_url) <= 500
  ),
  constraint discord_spotify_queue_items_track_title_length_check check (
    track_title is null or char_length(track_title) <= 200
  ),
  constraint discord_spotify_queue_items_artist_name_length_check check (
    artist_name is null or char_length(artist_name) <= 200
  ),
  constraint discord_spotify_queue_items_album_name_length_check check (
    album_name is null or char_length(album_name) <= 200
  ),
  constraint discord_spotify_queue_items_duration_ms_check check (
    duration_ms is null or duration_ms > 0
  ),
  constraint discord_spotify_queue_items_suggested_by_discord_user_id_check check (
    suggested_by_discord_user_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_queue_items_suggested_by_spotify_user_id_length_check check (
    suggested_by_spotify_user_id is null or char_length(suggested_by_spotify_user_id) between 1 and 200
  ),
  constraint discord_spotify_queue_items_approved_by_discord_user_id_check check (
    approved_by_discord_user_id is null or approved_by_discord_user_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_queue_items_rejected_by_discord_user_id_check check (
    rejected_by_discord_user_id is null or rejected_by_discord_user_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_queue_items_removed_by_discord_user_id_check check (
    removed_by_discord_user_id is null or removed_by_discord_user_id ~ '^[0-9]{5,32}$'
  ),
  constraint discord_spotify_queue_items_rejection_reason_length_check check (
    rejection_reason is null or char_length(rejection_reason) <= 500
  ),
  constraint discord_spotify_queue_items_removal_reason_length_check check (
    removal_reason is null or char_length(removal_reason) <= 500
  ),
  constraint discord_spotify_queue_items_queue_position_check check (
    queue_position is null or queue_position > 0
  )
);

create index if not exists discord_spotify_queue_items_lobby_status_queue_position_idx
  on public.discord_spotify_queue_items (lobby_id, status, queue_position nulls last, created_at asc);

create index if not exists discord_spotify_queue_items_suggested_by_discord_user_id_created_at_idx
  on public.discord_spotify_queue_items (suggested_by_discord_user_id, created_at desc);

create index if not exists discord_spotify_queue_items_status_created_at_idx
  on public.discord_spotify_queue_items (status, created_at desc);

alter table public.discord_spotify_queue_items enable row level security;
