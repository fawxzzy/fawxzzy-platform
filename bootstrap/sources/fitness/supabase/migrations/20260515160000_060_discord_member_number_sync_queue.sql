alter table public.discord_member_links
  drop constraint if exists discord_member_links_nickname_sync_status_check;

alter table public.discord_member_links
  add constraint discord_member_links_nickname_sync_status_check
  check (nickname_sync_status in ('not_attempted', 'needs_sync', 'synced', 'failed', 'skipped'));

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

  if input_nickname_sync_status not in ('not_attempted', 'needs_sync', 'synced', 'failed', 'skipped') then
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

create or replace function public.refresh_discord_member_link_member_number_snapshots()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  rows_updated integer := 0;
begin
  update public.discord_member_links as link
  set
    user_number = profile.user_number,
    user_kind = profile.user_kind,
    nickname_sync_status = case
      when profile.user_kind = 'human'
        and profile.user_number is not null
        and profile.user_number >= 0
        then 'needs_sync'
      else 'skipped'
    end,
    nickname_synced_at = null,
    last_error_code = null,
    updated_at = now()
  from public.profiles as profile
  where profile.id = link.fitness_user_id
    and (
      link.user_number is distinct from profile.user_number
      or link.user_kind is distinct from profile.user_kind
      or link.nickname_sync_status is distinct from case
        when profile.user_kind = 'human'
          and profile.user_number is not null
          and profile.user_number >= 0
          then 'needs_sync'
        else 'skipped'
      end
      or link.nickname_synced_at is not null
      or link.last_error_code is not null
    );

  get diagnostics rows_updated = row_count;
  return rows_updated;
end;
$$;

comment on function public.refresh_discord_member_link_member_number_snapshots() is
  'Refreshes discord_member_links user_number and user_kind snapshots from profiles and marks Discord nickname sync rows as needs_sync without calling Discord directly.';

create or replace function public.compact_human_member_numbers_after_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if old.user_kind = 'human'
    and old.user_number is not null
    and old.user_number > 0 then
    perform public.compact_human_member_numbers_preserving_zero();
    perform public.refresh_discord_member_link_member_number_snapshots();
  end if;

  return null;
end;
$$;

select public.refresh_discord_member_link_member_number_snapshots();
