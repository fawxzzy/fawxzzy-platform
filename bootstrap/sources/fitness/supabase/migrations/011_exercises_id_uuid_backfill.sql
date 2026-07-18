create extension if not exists pgcrypto;

-- Ensure exercises.id is uuid, auto-generated, and never null.
do $$
declare
  id_data_type text;
  id_udt_name text;
  duplicate_count bigint;
  null_count bigint;
  pk_name text;
  pk_columns text[];
begin
  select c.data_type, c.udt_name
    into id_data_type, id_udt_name
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'exercises'
    and c.column_name = 'id';

  if id_data_type is null then
    raise exception 'public.exercises.id column is missing';
  end if;

  if id_data_type <> 'uuid' and id_udt_name <> 'uuid' then
    execute $sql$
      alter table public.exercises
      alter column id type uuid
      using (
        case
          when id is null then null
          when id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then id::text::uuid
          else gen_random_uuid()
        end
      )
    $sql$;
  end if;

  execute 'update public.exercises set id = gen_random_uuid() where id is null';
  execute 'alter table public.exercises alter column id set default gen_random_uuid()';
  execute 'alter table public.exercises alter column id set not null';

  execute 'select count(*) from (select id from public.exercises group by id having count(*) > 1) d'
    into duplicate_count;
  if duplicate_count > 0 then
    raise exception 'Cannot enforce primary key on exercises.id; duplicate ids found';
  end if;

  execute 'select count(*) from public.exercises where id is null' into null_count;
  if null_count > 0 then
    raise exception 'Cannot enforce primary key on exercises.id; null ids remain';
  end if;

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
    execute 'alter table public.exercises add constraint exercises_pkey primary key (id)';
  elsif pk_columns <> array['id'] then
    execute format('alter table public.exercises drop constraint %I', pk_name);
    execute 'alter table public.exercises add constraint exercises_pkey primary key (id)';
  end if;
end $$;

-- Keep exercise naming uniqueness deterministic for global + per-user catalogs.
drop index if exists public.exercises_global_name_uq;
create unique index exercises_global_name_uq
  on public.exercises (name)
  where user_id is null;

drop index if exists public.exercises_user_name_uq;
create unique index exercises_user_name_uq
  on public.exercises (user_id, name)
  where user_id is not null;

-- Ensure referencing tables point to exercises(id) with restrictive delete behavior.
do $$
declare
  fk_name text;
  fk_delete_rule text;
  fk_ref_table text;
  fk_ref_column text;
begin
  select tc.constraint_name,
         rc.delete_rule,
         ccu.table_name,
         ccu.column_name
    into fk_name, fk_delete_rule, fk_ref_table, fk_ref_column
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
  limit 1;

  if fk_name is null
     or fk_ref_table <> 'exercises'
     or fk_ref_column <> 'id'
     or fk_delete_rule not in ('RESTRICT', 'NO ACTION') then
    if fk_name is not null then
      execute format('alter table public.routine_day_exercises drop constraint %I', fk_name);
    end if;

    execute '
      alter table public.routine_day_exercises
      add constraint routine_day_exercises_exercise_id_fkey
      foreign key (exercise_id)
      references public.exercises(id)
      on delete restrict
    ';
  end if;
end $$;

do $$
declare
  fk_name text;
  fk_delete_rule text;
  fk_ref_table text;
  fk_ref_column text;
begin
  select tc.constraint_name,
         rc.delete_rule,
         ccu.table_name,
         ccu.column_name
    into fk_name, fk_delete_rule, fk_ref_table, fk_ref_column
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
  limit 1;

  if fk_name is null
     or fk_ref_table <> 'exercises'
     or fk_ref_column <> 'id'
     or fk_delete_rule not in ('RESTRICT', 'NO ACTION') then
    if fk_name is not null then
      execute format('alter table public.session_exercises drop constraint %I', fk_name);
    end if;

    execute '
      alter table public.session_exercises
      add constraint session_exercises_exercise_id_fkey
      foreign key (exercise_id)
      references public.exercises(id)
      on delete restrict
    ';
  end if;
end $$;
