/*
  Member numbers are compact public display slots, not permanent identity ids.
  Zac remains reserved as #0 by explicit operator action only.
  Positive human member numbers compact to 1..N after human deletions.
  If linked Discord users already exist, operator tooling should resync discord_member_links
  snapshots and Discord nicknames after compaction.
*/

create or replace function public.compact_human_member_numbers_preserving_zero()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  next_user_number integer;
begin
  with ordered as (
    select
      p.id,
      row_number() over (
        order by
          p.user_number asc nulls last,
          p.user_number_assigned_at asc nulls last,
          p.id asc
      ) as compact_number
    from public.profiles as p
    where p.user_kind = 'human'
      and p.user_number is not null
      and p.user_number > 0
  )
  update public.profiles as p
  set user_number = -ordered.compact_number
  from ordered
  where p.id = ordered.id
    and p.user_number is distinct from -ordered.compact_number;

  update public.profiles as p
  set user_number = -p.user_number
  where p.user_kind = 'human'
    and p.user_number is not null
    and p.user_number < 0;

  select coalesce(max(p.user_number) + 1, 1)
  into next_user_number
  from public.profiles as p
  where p.user_kind = 'human'
    and p.user_number is not null
    and p.user_number >= 1;

  execute format(
    'alter sequence public.real_user_number_seq restart with %s',
    greatest(next_user_number, 1)
  );
end;
$$;

comment on function public.compact_human_member_numbers_preserving_zero() is
  'Compacts positive human member numbers into public slots 1..N, preserves operator-reserved #0, and leaves automation users unnumbered. Discord link snapshots and guild nicknames should be resynced after compaction.';

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
  end if;

  return null;
end;
$$;

drop trigger if exists profiles_compact_human_member_numbers_after_delete on public.profiles;

create trigger profiles_compact_human_member_numbers_after_delete
after delete on public.profiles
for each row
execute function public.compact_human_member_numbers_after_profile_delete();

select public.compact_human_member_numbers_preserving_zero();
