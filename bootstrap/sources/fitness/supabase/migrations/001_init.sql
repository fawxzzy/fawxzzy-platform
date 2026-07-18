create extension if not exists pgcrypto;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  performed_at timestamptz not null default now(),
  notes text null
);

create table if not exists public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null,
  exercise_id uuid not null,
  position int not null default 0,
  notes text null
);

create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises(id) on delete cascade,
  user_id uuid not null,
  set_index int not null,
  weight numeric not null,
  reps int not null,
  rpe numeric null,
  is_warmup boolean not null default false,
  notes text null
);

alter table public.sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.sets enable row level security;

create policy "sessions_select_own"
  on public.sessions
  for select
  using (user_id = auth.uid());

create policy "sessions_insert_own"
  on public.sessions
  for insert
  with check (user_id = auth.uid());

create policy "sessions_update_own"
  on public.sessions
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "sessions_delete_own"
  on public.sessions
  for delete
  using (user_id = auth.uid());

create policy "session_exercises_select_own"
  on public.session_exercises
  for select
  using (user_id = auth.uid());

create policy "session_exercises_insert_own"
  on public.session_exercises
  for insert
  with check (user_id = auth.uid());

create policy "session_exercises_update_own"
  on public.session_exercises
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "session_exercises_delete_own"
  on public.session_exercises
  for delete
  using (user_id = auth.uid());

create policy "sets_select_own"
  on public.sets
  for select
  using (user_id = auth.uid());

create policy "sets_insert_own"
  on public.sets
  for insert
  with check (user_id = auth.uid());

create policy "sets_update_own"
  on public.sets
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "sets_delete_own"
  on public.sets
  for delete
  using (user_id = auth.uid());
