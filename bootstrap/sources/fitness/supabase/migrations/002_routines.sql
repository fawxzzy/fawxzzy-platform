-- 002_routines.sql

create extension if not exists pgcrypto;

-- -------------------------
-- PROFILES (user settings)
-- -------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/Toronto',
  active_routine_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete_own"
  on public.profiles
  for delete
  using (id = auth.uid());

-- -------------------------
-- ROUTINES (template layer)
-- -------------------------
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  cycle_length_days int not null check (cycle_length_days >= 1 and cycle_length_days <= 365),
  start_date date not null,
  timezone text not null default 'America/Toronto',
  progression_mode text not null default 'progressive_overload',
  temperament text not null default 'moderate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.routines enable row level security;

create policy "routines_select_own"
  on public.routines
  for select
  using (user_id = auth.uid());

create policy "routines_insert_own"
  on public.routines
  for insert
  with check (user_id = auth.uid());

create policy "routines_update_own"
  on public.routines
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "routines_delete_own"
  on public.routines
  for delete
  using (user_id = auth.uid());

-- -------------------------
-- ROUTINE DAYS
-- -------------------------
create table if not exists public.routine_days (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_id uuid not null,
  day_index int not null,
  name text null,
  is_rest boolean not null default false,
  notes text null,
  created_at timestamptz not null default now()
);

-- 1..cycle_length_days is enforced in app logic and by unique constraint.
-- (DB-level check needs cross-table access, so we keep it simple.)
create unique index if not exists routine_days_routine_id_day_index_uq
  on public.routine_days (routine_id, day_index);

alter table public.routine_days enable row level security;

create policy "routine_days_select_own"
  on public.routine_days
  for select
  using (user_id = auth.uid());

create policy "routine_days_insert_own"
  on public.routine_days
  for insert
  with check (user_id = auth.uid());

create policy "routine_days_update_own"
  on public.routine_days
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "routine_days_delete_own"
  on public.routine_days
  for delete
  using (user_id = auth.uid());

-- -------------------------
-- ROUTINE DAY EXERCISES
-- -------------------------
create table if not exists public.routine_day_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_day_id uuid not null references public.routine_days(id) on delete cascade,
  user_id uuid not null,
  exercise_id uuid not null,
  position int not null default 0,
  target_sets int null,
  rep_range_min int null,
  rep_range_max int null,
  notes text null,
  created_at timestamptz not null default now()
);

alter table public.routine_day_exercises enable row level security;

create policy "routine_day_exercises_select_own"
  on public.routine_day_exercises
  for select
  using (user_id = auth.uid());

create policy "routine_day_exercises_insert_own"
  on public.routine_day_exercises
  for insert
  with check (user_id = auth.uid());

create policy "routine_day_exercises_update_own"
  on public.routine_day_exercises
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "routine_day_exercises_delete_own"
  on public.routine_day_exercises
  for delete
  using (user_id = auth.uid());

-- -------------------------
-- LINK SESSIONS TO ROUTINES
-- -------------------------
alter table public.sessions
  add column if not exists routine_id uuid null references public.routines(id),
  add column if not exists routine_day_index int null;

-- -------------------------
-- INDEXES (performance)
-- -------------------------
create index if not exists routines_user_updated_at_idx
  on public.routines (user_id, updated_at desc);

create index if not exists routine_days_routine_day_idx
  on public.routine_days (routine_id, day_index);

create index if not exists routine_day_exercises_day_pos_idx
  on public.routine_day_exercises (routine_day_id, position);

create index if not exists profiles_active_routine_idx
  on public.profiles (active_routine_id);

create index if not exists sessions_user_performed_at_idx
  on public.sessions (user_id, performed_at desc);
