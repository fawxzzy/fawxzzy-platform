create or replace function public.reorder_routine_days(
  target_routine_id uuid,
  target_user_id uuid,
  ordered_routine_day_ids uuid[]
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update public.routine_days as target
  set day_index = -ordered.ordinality
  from unnest(ordered_routine_day_ids) with ordinality as ordered(id, ordinality)
  where target.id = ordered.id
    and target.routine_id = target_routine_id
    and target.user_id = target_user_id;

  update public.routine_days as target
  set day_index = ordered.ordinality
  from unnest(ordered_routine_day_ids) with ordinality as ordered(id, ordinality)
  where target.id = ordered.id
    and target.routine_id = target_routine_id
    and target.user_id = target_user_id;
end;
$$;
