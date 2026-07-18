create extension if not exists pgcrypto;

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid null,
  is_global boolean not null default false,
  primary_muscle text null,
  equipment text null,
  created_at timestamptz not null default now()
);

alter table public.exercises
  add column if not exists user_id uuid null,
  add column if not exists is_global boolean not null default false,
  add column if not exists primary_muscle text null,
  add column if not exists equipment text null,
  add column if not exists created_at timestamptz not null default now();

update public.exercises
set is_global = (user_id is null)
where is_global is distinct from (user_id is null);

alter table public.exercises
  drop constraint if exists exercises_name_non_empty;

alter table public.exercises
  add constraint exercises_name_non_empty
  check (length(btrim(name)) > 0);

create unique index if not exists exercises_global_name_uq
  on public.exercises ((lower(btrim(name))))
  where user_id is null;

create unique index if not exists exercises_user_name_uq
  on public.exercises (user_id, (lower(btrim(name))))
  where user_id is not null;

with seed_rows (name, user_id, is_global, primary_muscle, equipment) as (
  values
    ('Bench Press', null::uuid, true, 'Chest', 'Barbell'),
    ('Back Squat', null::uuid, true, 'Legs', 'Barbell'),
    ('Deadlift', null::uuid, true, 'Back', 'Barbell'),
    ('Barbell Row', null::uuid, true, 'Back', 'Barbell'),
    ('Overhead Press', null::uuid, true, 'Shoulders', 'Barbell'),
    ('Pull-Up', null::uuid, true, 'Back', 'Bodyweight')
)
insert into public.exercises (name, user_id, is_global, primary_muscle, equipment)
select seed.name, seed.user_id, seed.is_global, seed.primary_muscle, seed.equipment
from seed_rows as seed
where not exists (
  select 1
  from public.exercises as existing
  where existing.user_id is null
    and lower(btrim(existing.name)) = lower(btrim(seed.name))
);

alter table public.exercises enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'exercises' and policyname = 'exercises_select_global_or_own'
  ) then
    create policy "exercises_select_global_or_own"
      on public.exercises
      for select
      using (user_id is null or user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'exercises' and policyname = 'exercises_insert_own_only'
  ) then
    create policy "exercises_insert_own_only"
      on public.exercises
      for insert
      with check (user_id = auth.uid() and user_id is not null and is_global = false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'exercises' and policyname = 'exercises_update_own_only'
  ) then
    create policy "exercises_update_own_only"
      on public.exercises
      for update
      using (user_id = auth.uid() and user_id is not null)
      with check (user_id = auth.uid() and user_id is not null and is_global = false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'exercises' and policyname = 'exercises_delete_own_only'
  ) then
    create policy "exercises_delete_own_only"
      on public.exercises
      for delete
      using (user_id = auth.uid() and user_id is not null);
  end if;
end $$;

do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'routine_day_exercises'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'exercise_id'
  limit 1;

  if fk_name is not null then
    execute format('alter table public.routine_day_exercises drop constraint if exists %I', fk_name);
  end if;

  alter table public.routine_day_exercises
    add constraint routine_day_exercises_exercise_id_fkey
    foreign key (exercise_id)
    references public.exercises(id)
    on delete restrict;
end $$;

do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'session_exercises'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'exercise_id'
  limit 1;

  if fk_name is not null then
    execute format('alter table public.session_exercises drop constraint if exists %I', fk_name);
  end if;

  alter table public.session_exercises
    add constraint session_exercises_exercise_id_fkey
    foreign key (exercise_id)
    references public.exercises(id)
    on delete restrict;
end $$;

create index if not exists exercises_lookup_idx
  on public.exercises (is_global desc, name asc);
