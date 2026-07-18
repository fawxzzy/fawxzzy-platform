create table if not exists public.discord_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  discord_user_id text null,
  discord_username text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists discord_verification_tokens_token_hash_uq
  on public.discord_verification_tokens (token_hash);

create index if not exists discord_verification_tokens_user_id_expires_at_idx
  on public.discord_verification_tokens (user_id, expires_at);

create index if not exists discord_verification_tokens_discord_user_id_idx
  on public.discord_verification_tokens (discord_user_id)
  where discord_user_id is not null;

alter table public.discord_verification_tokens enable row level security;

create or replace function public.consume_discord_verification_token(
  input_token_hash text,
  input_discord_user_id text,
  input_discord_username text default null
)
returns table (
  ok boolean,
  user_id uuid,
  user_number integer,
  user_kind text,
  expires_at timestamptz,
  consumed_at timestamptz,
  error text
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  return query
  with matched as (
    select token.id, token.user_id, token.expires_at
    from public.discord_verification_tokens as token
    where token.token_hash = input_token_hash
      and token.consumed_at is null
      and token.expires_at > now()
    order by token.created_at desc
    limit 1
    for update
  ),
  updated as (
    update public.discord_verification_tokens as token
    set
      consumed_at = now(),
      discord_user_id = input_discord_user_id,
      discord_username = nullif(trim(input_discord_username), ''),
      updated_at = now()
    from matched
    where token.id = matched.id
    returning token.user_id, token.expires_at, token.consumed_at
  )
  select
    true as ok,
    updated.user_id,
    profiles.user_number,
    profiles.user_kind,
    updated.expires_at,
    updated.consumed_at,
    null::text as error
  from updated
  left join public.profiles
    on profiles.id = updated.user_id;

  if found then
    return;
  end if;

  return query
  select
    false as ok,
    null::uuid as user_id,
    null::integer as user_number,
    null::text as user_kind,
    null::timestamptz as expires_at,
    null::timestamptz as consumed_at,
    'invalid_or_expired_token'::text as error;
end;
$$;

revoke execute on function public.consume_discord_verification_token(text, text, text) from public;
revoke execute on function public.consume_discord_verification_token(text, text, text) from anon;
revoke execute on function public.consume_discord_verification_token(text, text, text) from authenticated;
grant execute on function public.consume_discord_verification_token(text, text, text) to service_role;
