alter table public.profiles
  add column if not exists user_number integer null,
  add column if not exists user_kind text not null default 'human',
  add column if not exists user_number_assigned_at timestamptz null;

alter table public.profiles
  drop constraint if exists profiles_user_kind_check,
  add constraint profiles_user_kind_check check (user_kind in ('human', 'automation', 'unknown'));

create unique index if not exists profiles_user_number_uq
  on public.profiles (user_number)
  where user_number is not null;

create sequence if not exists public.real_user_number_seq
  as integer
  increment by 1
  minvalue 1
  start with 1
  cache 1;

create or replace function public.is_automation_auth_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = target_user_id
      and (
        lower(coalesce(u.raw_app_meta_data ->> 'account_kind', '')) = 'automation'
        or lower(coalesce(u.raw_user_meta_data ->> 'account_kind', '')) = 'automation'
        or lower(coalesce(u.email, '')) ~ '(^|[^a-z0-9])(codex|test|qa|example|preview|local)([^a-z0-9]|$)'
      )
  );
$$;

create or replace function public.assign_real_user_number_on_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if new.user_number is not null then
    if new.user_kind not in ('human', 'automation', 'unknown') then
      new.user_kind := 'human';
    end if;
    new.user_number_assigned_at := coalesce(new.user_number_assigned_at, now());
    return new;
  end if;

  if public.is_automation_auth_user(new.id) then
    new.user_kind := 'automation';
    new.user_number := null;
    new.user_number_assigned_at := null;
    return new;
  end if;

  new.user_kind := 'human';
  new.user_number := nextval('public.real_user_number_seq');
  new.user_number_assigned_at := coalesce(new.user_number_assigned_at, now());
  return new;
end;
$$;

drop trigger if exists profiles_assign_real_user_number_before_insert on public.profiles;

create trigger profiles_assign_real_user_number_before_insert
before insert on public.profiles
for each row
execute function public.assign_real_user_number_on_profile_insert();

update public.profiles
set user_kind = 'unknown'
where user_number is null
  and user_kind = 'human';

update public.profiles p
set
  user_kind = 'automation',
  user_number = null,
  user_number_assigned_at = null
where public.is_automation_auth_user(p.id);

-- Operator step after applying this migration:
-- Reserve Zac as member #0 using the real auth email in the target environment.
-- This is intentionally not hardcoded in repo history.
--
-- update public.profiles p
-- set
--   user_number = 0,
--   user_kind = 'human',
--   user_number_assigned_at = coalesce(p.user_number_assigned_at, now())
-- from auth.users u
-- where u.id = p.id
--   and lower(coalesce(u.email, '')) = lower('YOUR_REAL_EMAIL_HERE');

update public.profiles
set user_number_assigned_at = coalesce(user_number_assigned_at, now())
where user_number is not null;

do $$
declare
  next_user_number integer;
begin
  select coalesce(max(user_number) + 1, 1)
  into next_user_number
  from public.profiles
  where user_number is not null
    and user_number >= 1;

  execute format(
    'alter sequence public.real_user_number_seq restart with %s',
    greatest(next_user_number, 1)
  );
end;
$$;
