alter table public.discord_spotify_lobbies
  add column if not exists approval_mode text not null default 'auto_approve_jam_ready',
  add column if not exists spotify_mirror_enabled boolean not null default false,
  add column if not exists spotify_mirror_last_synced_at timestamptz null,
  add column if not exists spotify_mirror_error_count integer not null default 0,
  add column if not exists stop_playback_on_close boolean not null default false;

update public.discord_spotify_lobbies
set
  approval_mode = case
    when approval_mode = 'auto' then 'auto_approve_jam_ready'
    when approval_mode in ('auto_approve_jam_ready', 'review', 'host_only') then approval_mode
    else 'auto_approve_jam_ready'
  end,
  stop_playback_on_close = false
where approval_mode is distinct from 'auto_approve_jam_ready'
  or stop_playback_on_close is distinct from false;

alter table public.discord_spotify_lobbies
  drop constraint if exists discord_spotify_lobbies_approval_mode_check;

alter table public.discord_spotify_lobbies
  add constraint discord_spotify_lobbies_approval_mode_check check (
    approval_mode in ('auto_approve_jam_ready', 'review', 'host_only')
  );

alter table public.discord_spotify_lobbies
  drop constraint if exists discord_spotify_lobbies_spotify_mirror_error_count_check;

alter table public.discord_spotify_lobbies
  add constraint discord_spotify_lobbies_spotify_mirror_error_count_check check (
    spotify_mirror_error_count >= 0
  );

alter table public.discord_spotify_queue_items
  add column if not exists source_type text not null default 'discord_link',
  add column if not exists approval_state text null,
  add column if not exists playback_state text null,
  add column if not exists dedupe_key text null,
  add column if not exists mirror_first_seen_at timestamptz null,
  add column if not exists mirror_last_seen_at timestamptz null,
  add column if not exists display_position integer null,
  add column if not exists cleared_reason text null,
  add column if not exists playback_started_at timestamptz null,
  add column if not exists playback_finished_at timestamptz null;

update public.discord_spotify_queue_items
set
  approval_state = case
    when approval_state is not null then approval_state
    when status = 'pending' then 'pending'
    when status in ('approved', 'played', 'skipped') then 'approved'
    when status = 'rejected' then 'rejected'
    when status = 'removed' then 'removed'
    else 'pending'
  end,
  playback_state = case
    when playback_state is not null then playback_state
    when status = 'played' then 'played'
    when status = 'skipped' then 'skipped'
    when status = 'removed' then 'cleared'
    else 'queued'
  end,
  display_position = coalesce(display_position, queue_position),
  playback_started_at = coalesce(playback_started_at, played_at),
  playback_finished_at = coalesce(playback_finished_at, played_at);

alter table public.discord_spotify_queue_items
  alter column approval_state set not null,
  alter column approval_state set default 'pending',
  alter column playback_state set not null,
  alter column playback_state set default 'queued';

alter table public.discord_spotify_queue_items
  drop constraint if exists discord_spotify_queue_items_source_type_check;

alter table public.discord_spotify_queue_items
  add constraint discord_spotify_queue_items_source_type_check check (
    source_type in ('discord_search', 'discord_link', 'spotify_mirror')
  );

alter table public.discord_spotify_queue_items
  drop constraint if exists discord_spotify_queue_items_approval_state_check;

alter table public.discord_spotify_queue_items
  add constraint discord_spotify_queue_items_approval_state_check check (
    approval_state in ('pending', 'approved', 'rejected', 'removed')
  );

alter table public.discord_spotify_queue_items
  drop constraint if exists discord_spotify_queue_items_playback_state_check;

alter table public.discord_spotify_queue_items
  add constraint discord_spotify_queue_items_playback_state_check check (
    playback_state in ('queued', 'playing', 'played', 'skipped', 'cleared')
  );

alter table public.discord_spotify_queue_items
  drop constraint if exists discord_spotify_queue_items_display_position_check;

alter table public.discord_spotify_queue_items
  add constraint discord_spotify_queue_items_display_position_check check (
    display_position is null or display_position > 0
  );

alter table public.discord_spotify_queue_items
  drop constraint if exists discord_spotify_queue_items_cleared_reason_length_check;

alter table public.discord_spotify_queue_items
  add constraint discord_spotify_queue_items_cleared_reason_length_check check (
    cleared_reason is null or char_length(cleared_reason) <= 120
  );

create index if not exists discord_spotify_lobbies_phase6_mirror_idx
  on public.discord_spotify_lobbies (status, spotify_mirror_enabled, spotify_mirror_last_synced_at desc);

create index if not exists discord_spotify_queue_items_lobby_lifecycle_idx
  on public.discord_spotify_queue_items (lobby_id, approval_state, playback_state, display_position nulls last, created_at asc);

create index if not exists discord_spotify_queue_items_lobby_dedupe_idx
  on public.discord_spotify_queue_items (lobby_id, dedupe_key);

create index if not exists discord_spotify_queue_items_mirror_seen_idx
  on public.discord_spotify_queue_items (lobby_id, mirror_last_seen_at desc)
  where source_type = 'spotify_mirror';
