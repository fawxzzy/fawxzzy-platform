create table if not exists public.discord_member_links (
  id uuid primary key default gen_random_uuid(),
  fitness_user_id uuid not null references auth.users(id) on delete cascade,
  discord_user_id text not null,
  discord_username text null,
  user_number integer null,
  user_kind text not null default 'unknown',
  verified_role_granted_at timestamptz null,
  nickname_sync_status text not null default 'not_attempted',
  nickname_synced_at timestamptz null,
  last_error_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_member_links_fitness_user_id_uq unique (fitness_user_id),
  constraint discord_member_links_discord_user_id_uq unique (discord_user_id),
  constraint discord_member_links_user_kind_check check (user_kind in ('human', 'automation', 'unknown')),
  constraint discord_member_links_nickname_sync_status_check check (
    nickname_sync_status in ('not_attempted', 'synced', 'failed', 'skipped')
  )
);

alter table public.discord_member_links enable row level security;

create or replace function public.upsert_discord_member_link(
  input_fitness_user_id uuid,
  input_discord_user_id text,
  input_discord_username text default null,
  input_user_number integer default null,
  input_user_kind text default 'unknown',
  input_verified_role_granted_at timestamptz default null,
  input_nickname_sync_status text default 'not_attempted',
  input_nickname_synced_at timestamptz default null,
  input_last_error_code text default null
)
returns public.discord_member_links
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  existing_fitness_link_id uuid;
  existing_discord_link_id uuid;
  target_link_id uuid;
  upserted_link public.discord_member_links;
begin
  if input_user_kind not in ('human', 'automation', 'unknown') then
    raise exception 'invalid user_kind for discord member link: %', input_user_kind
      using errcode = '23514';
  end if;

  if input_nickname_sync_status not in ('not_attempted', 'synced', 'failed', 'skipped') then
    raise exception 'invalid nickname_sync_status for discord member link: %', input_nickname_sync_status
      using errcode = '23514';
  end if;

  select link.id
  into existing_fitness_link_id
  from public.discord_member_links as link
  where link.fitness_user_id = input_fitness_user_id
  limit 1
  for update;

  select link.id
  into existing_discord_link_id
  from public.discord_member_links as link
  where link.discord_user_id = input_discord_user_id
  limit 1
  for update;

  if existing_fitness_link_id is not null
    and existing_discord_link_id is not null
    and existing_fitness_link_id <> existing_discord_link_id then
    raise exception 'discord member link conflict for fitness user % and discord user %',
      input_fitness_user_id,
      input_discord_user_id
      using errcode = '23505';
  end if;

  target_link_id := coalesce(existing_fitness_link_id, existing_discord_link_id, gen_random_uuid());

  insert into public.discord_member_links (
    id,
    fitness_user_id,
    discord_user_id,
    discord_username,
    user_number,
    user_kind,
    verified_role_granted_at,
    nickname_sync_status,
    nickname_synced_at,
    last_error_code,
    created_at,
    updated_at
  )
  values (
    target_link_id,
    input_fitness_user_id,
    input_discord_user_id,
    nullif(trim(input_discord_username), ''),
    input_user_number,
    input_user_kind,
    input_verified_role_granted_at,
    input_nickname_sync_status,
    input_nickname_synced_at,
    nullif(trim(input_last_error_code), ''),
    now(),
    now()
  )
  on conflict (id) do update
  set
    fitness_user_id = excluded.fitness_user_id,
    discord_user_id = excluded.discord_user_id,
    discord_username = excluded.discord_username,
    user_number = excluded.user_number,
    user_kind = excluded.user_kind,
    verified_role_granted_at = excluded.verified_role_granted_at,
    nickname_sync_status = excluded.nickname_sync_status,
    nickname_synced_at = excluded.nickname_synced_at,
    last_error_code = excluded.last_error_code,
    updated_at = now()
  returning *
  into upserted_link;

  return upserted_link;
end;
$$;

revoke execute on function public.upsert_discord_member_link(uuid, text, text, integer, text, timestamptz, text, timestamptz, text) from public;
revoke execute on function public.upsert_discord_member_link(uuid, text, text, integer, text, timestamptz, text, timestamptz, text) from anon;
revoke execute on function public.upsert_discord_member_link(uuid, text, text, integer, text, timestamptz, text, timestamptz, text) from authenticated;
grant execute on function public.upsert_discord_member_link(uuid, text, text, integer, text, timestamptz, text, timestamptz, text) to service_role;
