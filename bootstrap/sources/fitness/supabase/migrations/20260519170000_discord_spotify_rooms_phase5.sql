alter table public.discord_spotify_lobbies
  add column if not exists room_slug text not null default 'main',
  add column if not exists room_name text not null default 'Main Room',
  add column if not exists visibility text not null default 'public',
  add column if not exists join_key_hash text null;

alter table public.discord_spotify_lobbies
  drop constraint if exists discord_spotify_lobbies_visibility_check;

alter table public.discord_spotify_lobbies
  add constraint discord_spotify_lobbies_visibility_check check (
    visibility in ('public', 'private')
  );

alter table public.discord_spotify_lobbies
  drop constraint if exists discord_spotify_lobbies_room_slug_length_check;

alter table public.discord_spotify_lobbies
  add constraint discord_spotify_lobbies_room_slug_length_check check (
    char_length(room_slug) between 1 and 48
  );

alter table public.discord_spotify_lobbies
  drop constraint if exists discord_spotify_lobbies_room_name_length_check;

alter table public.discord_spotify_lobbies
  add constraint discord_spotify_lobbies_room_name_length_check check (
    char_length(room_name) between 1 and 80
  );

update public.discord_spotify_lobbies
set
  room_slug = coalesce(nullif(room_slug, ''), 'main'),
  room_name = coalesce(nullif(room_name, ''), 'Main Room'),
  visibility = case when visibility in ('public', 'private') then visibility else 'public' end
where room_slug is distinct from coalesce(nullif(room_slug, ''), 'main')
   or room_name is distinct from coalesce(nullif(room_name, ''), 'Main Room')
   or visibility not in ('public', 'private');

create index if not exists discord_spotify_lobbies_room_slug_idx
  on public.discord_spotify_lobbies (room_slug);

create table if not exists public.discord_spotify_room_members (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.discord_spotify_lobbies(id) on delete cascade,
  discord_user_id text not null,
  spotify_user_id text null,
  status text not null default 'joined',
  joined_at timestamptz not null default now(),
  left_at timestamptz null,
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_spotify_room_members_status_check check (
    status in ('joined', 'left')
  ),
  constraint discord_spotify_room_members_discord_user_id_check check (
    discord_user_id ~ '^[0-9]{5,32}$'
  )
);

create unique index if not exists discord_spotify_room_members_lobby_user_idx
  on public.discord_spotify_room_members (lobby_id, discord_user_id);

create index if not exists discord_spotify_room_members_lobby_status_idx
  on public.discord_spotify_room_members (lobby_id, status, updated_at desc);

alter table public.discord_spotify_room_members enable row level security;
