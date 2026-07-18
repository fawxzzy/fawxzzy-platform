create or replace function public.repack_session_exercise_positions_after_delete()
returns trigger
language plpgsql
as $$
begin
  with shifted as (
    update public.session_exercises
    set position = -(position + 1)
    where session_id = old.session_id
      and user_id = old.user_id
      and position > old.position
    returning id
  )
  update public.session_exercises as target
  set position = -target.position - 2
  from shifted
  where target.id = shifted.id;

  return old;
end;
$$;

create or replace function public.repack_routine_day_exercise_positions_after_delete()
returns trigger
language plpgsql
as $$
begin
  with shifted as (
    update public.routine_day_exercises
    set position = -(position + 1)
    where routine_day_id = old.routine_day_id
      and user_id = old.user_id
      and position > old.position
    returning id
  )
  update public.routine_day_exercises as target
  set position = -target.position - 2
  from shifted
  where target.id = shifted.id;

  return old;
end;
$$;

create or replace function public.claim_session_follow_up_jobs(
  target_session_id uuid,
  target_user_id uuid,
  stale_before timestamptz,
  claim_time timestamptz default now()
)
returns table (
  id uuid,
  job_kind text,
  status text,
  attempt_count int
)
language plpgsql
as $$
begin
  return query
  update public.session_follow_up_jobs
  set status = 'processing',
      attempt_count = session_follow_up_jobs.attempt_count + 1,
      last_error = null,
      completed_at = null,
      updated_at = claim_time
  where session_id = target_session_id
    and user_id = target_user_id
    and (
      status in ('pending', 'failed')
      or (status = 'processing' and updated_at < stale_before)
    )
  returning
    session_follow_up_jobs.id,
    session_follow_up_jobs.job_kind,
    session_follow_up_jobs.status,
    session_follow_up_jobs.attempt_count;
end;
$$;
