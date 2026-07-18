create extension if not exists pgcrypto;

-- 1) Backfill missing IDs before tightening constraints.
update public.exercises
set id = gen_random_uuid()
where id is null;

-- 2) Enforce auto-generated UUID IDs.
alter table public.exercises
  alter column id set default gen_random_uuid();

alter table public.exercises
  alter column id set not null;

-- 3) Ensure id is key-like with minimal blast radius.
do $$
declare
  pk_name text;
  pk_columns text[];
begin
  select tc.constraint_name,
         array_agg(kcu.column_name order by kcu.ordinal_position)
    into pk_name, pk_columns
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
   and tc.table_name = kcu.table_name
  where tc.table_schema = 'public'
    and tc.table_name = 'exercises'
    and tc.constraint_type = 'PRIMARY KEY'
  group by tc.constraint_name
  limit 1;

  if pk_name is null then
    alter table public.exercises
      add constraint exercises_pkey primary key (id);
  elsif pk_columns <> array['id'] then
    if not exists (
      select 1
      from information_schema.table_constraints
      where table_schema = 'public'
        and table_name = 'exercises'
        and constraint_type = 'UNIQUE'
        and constraint_name = 'exercises_id_key'
    ) then
      alter table public.exercises
        add constraint exercises_id_key unique (id);
    end if;
  end if;
end $$;

-- 4) Deterministic uniqueness for global + per-user names.
create unique index if not exists exercises_global_name_uq
  on public.exercises (name)
  where user_id is null;

create unique index if not exists exercises_user_name_uq
  on public.exercises (user_id, name)
  where user_id is not null;

-- 5) Ensure exercise references exist and restrict deletes.
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.referential_constraints rc
      on tc.constraint_name = rc.constraint_name
     and tc.table_schema = rc.constraint_schema
    join information_schema.constraint_column_usage ccu
      on rc.unique_constraint_name = ccu.constraint_name
     and rc.unique_constraint_schema = ccu.constraint_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'routine_day_exercises'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'exercise_id'
      and ccu.table_name = 'exercises'
      and ccu.column_name = 'id'
      and rc.delete_rule = 'RESTRICT'
  ) then
    alter table public.routine_day_exercises
      add constraint routine_day_exercises_exercise_id_restrict_fkey
      foreign key (exercise_id)
      references public.exercises(id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.referential_constraints rc
      on tc.constraint_name = rc.constraint_name
     and tc.table_schema = rc.constraint_schema
    join information_schema.constraint_column_usage ccu
      on rc.unique_constraint_name = ccu.constraint_name
     and rc.unique_constraint_schema = ccu.constraint_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'session_exercises'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'exercise_id'
      and ccu.table_name = 'exercises'
      and ccu.column_name = 'id'
      and rc.delete_rule = 'RESTRICT'
  ) then
    alter table public.session_exercises
      add constraint session_exercises_exercise_id_restrict_fkey
      foreign key (exercise_id)
      references public.exercises(id)
      on delete restrict;
  end if;
end $$;

-- 6) Sanity assert after backfill/enforcement.
do $$
declare
  null_count bigint;
begin
  select count(*) into null_count
  from public.exercises
  where id is null;

  if null_count > 0 then
    raise exception 'public.exercises.id still contains null values after UUID backfill';
  end if;
end $$;
