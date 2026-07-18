create table if not exists public.progression_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  routine_id uuid not null references public.routines(id) on delete cascade,
  routine_day_exercise_id uuid not null references public.routine_day_exercises(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  event_type text not null check (event_type in (
    'promotion_applied',
    'promotion_reverted',
    'lock_in',
    'deload_applied',
    'review_acknowledged',
    'manual_target_change'
  )),
  from_target jsonb not null,
  to_target jsonb not null,
  method text not null,
  vector text not null,
  step jsonb null,
  reason text not null,
  source_session_id uuid null references public.sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists progression_events_user_created_at_idx
  on public.progression_events (user_id, created_at desc);

create index if not exists progression_events_routine_id_idx
  on public.progression_events (routine_id);

create index if not exists progression_events_routine_day_exercise_id_idx
  on public.progression_events (routine_day_exercise_id);

create index if not exists progression_events_exercise_id_idx
  on public.progression_events (exercise_id);

create index if not exists progression_events_event_type_idx
  on public.progression_events (event_type);

create index if not exists progression_events_source_session_id_idx
  on public.progression_events (source_session_id);

alter table public.progression_events enable row level security;

drop policy if exists "progression_events_select_own" on public.progression_events;
create policy "progression_events_select_own"
  on public.progression_events
  for select
  using (user_id = (select auth.uid()));

drop policy if exists "progression_events_insert_own" on public.progression_events;
create policy "progression_events_insert_own"
  on public.progression_events
  for insert
  with check (user_id = (select auth.uid()));
