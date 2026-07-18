with normalized_session_positions as (
  select
    id,
    row_number() over (partition by session_id order by position asc, id asc) - 1 as normalized_position
  from public.session_exercises
),
normalized_routine_positions as (
  select
    id,
    row_number() over (partition by routine_day_id order by position asc, id asc) - 1 as normalized_position
  from public.routine_day_exercises
)
update public.session_exercises as target
set position = source.normalized_position
from normalized_session_positions as source
where target.id = source.id
  and target.position is distinct from source.normalized_position;

with normalized_routine_positions as (
  select
    id,
    row_number() over (partition by routine_day_id order by position asc, id asc) - 1 as normalized_position
  from public.routine_day_exercises
)
update public.routine_day_exercises as target
set position = source.normalized_position
from normalized_routine_positions as source
where target.id = source.id
  and target.position is distinct from source.normalized_position;

create unique index if not exists session_exercises_session_id_position_uq
  on public.session_exercises (session_id, position);

create unique index if not exists routine_day_exercises_routine_day_id_position_uq
  on public.routine_day_exercises (routine_day_id, position);

create or replace function public.repack_session_exercise_positions_after_delete()
returns trigger
language plpgsql
as $$
begin
  update public.session_exercises
  set position = position - 1
  where session_id = old.session_id
    and user_id = old.user_id
    and position > old.position;

  return old;
end;
$$;

drop trigger if exists session_exercises_repack_after_delete on public.session_exercises;
create trigger session_exercises_repack_after_delete
after delete on public.session_exercises
for each row
execute function public.repack_session_exercise_positions_after_delete();

create or replace function public.repack_routine_day_exercise_positions_after_delete()
returns trigger
language plpgsql
as $$
begin
  update public.routine_day_exercises
  set position = position - 1
  where routine_day_id = old.routine_day_id
    and user_id = old.user_id
    and position > old.position;

  return old;
end;
$$;

drop trigger if exists routine_day_exercises_repack_after_delete on public.routine_day_exercises;
create trigger routine_day_exercises_repack_after_delete
after delete on public.routine_day_exercises
for each row
execute function public.repack_routine_day_exercise_positions_after_delete();

create or replace function public.reorder_routine_day_exercises(
  target_routine_day_id uuid,
  target_user_id uuid,
  ordered_exercise_row_ids uuid[]
)
returns void
language plpgsql
as $$
begin
  update public.routine_day_exercises as target
  set position = -ordered.ordinality
  from unnest(ordered_exercise_row_ids) with ordinality as ordered(id, ordinality)
  where target.id = ordered.id
    and target.routine_day_id = target_routine_day_id
    and target.user_id = target_user_id;

  update public.routine_day_exercises as target
  set position = ordered.ordinality - 1
  from unnest(ordered_exercise_row_ids) with ordinality as ordered(id, ordinality)
  where target.id = ordered.id
    and target.routine_day_id = target_routine_day_id
    and target.user_id = target_user_id;
end;
$$;
