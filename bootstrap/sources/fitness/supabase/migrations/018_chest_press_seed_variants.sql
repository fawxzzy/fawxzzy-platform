-- Optional enum extension for movement_pattern when the column is backed by an enum type.
-- PostgreSQL note: when adding a new enum value inside a transaction, that value may not
-- be usable until after commit. Keep this block separate from dependent DML if needed.
--
-- do $$
-- declare
--   movement_enum_type text;
-- begin
--   select t.typname
--   into movement_enum_type
--   from pg_attribute a
--   join pg_class c on c.oid = a.attrelid
--   join pg_namespace n on n.oid = c.relnamespace
--   join pg_type t on t.oid = a.atttypid
--   where n.nspname = 'public'
--     and c.relname = 'exercises'
--     and a.attname = 'movement_pattern'
--     and t.typtype = 'e';
--
--   if movement_enum_type is not null then
--     execute format(
--       'alter type public.%I add value if not exists %L',
--       movement_enum_type,
--       'push'
--     );
--   end if;
-- end $$;

-- Variant A: primary_muscles + secondary_muscles are TEXT[]
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exercises'
      and column_name = 'primary_muscles'
      and udt_name = '_text'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exercises'
      and column_name = 'secondary_muscles'
      and udt_name = '_text'
  ) then
    update public.exercises
    set
      how_to_short = 'Keep shoulders down and back, press handles forward, then return with control.',
      primary_muscles = array['chest', 'triceps']::text[],
      secondary_muscles = array['front delts']::text[],
      movement_pattern = 'push',
      equipment = 'machine'
    where (is_global, name) = (true, 'Bench Press');

    insert into public.exercises (
      name,
      user_id,
      is_global,
      primary_muscle,
      equipment,
      how_to_short,
      primary_muscles,
      secondary_muscles,
      movement_pattern
    )
    select
      'Chest Press',
      null,
      true,
      'Chest',
      'Machine',
      'Keep shoulders down and back, press handles forward, then return with control.',
      array['chest', 'triceps']::text[],
      array['front delts']::text[],
      'push'
    where not exists (
      select 1
      from public.exercises
      where (is_global, name) = (true, 'Chest Press')
    );
  end if;
end $$;

-- Variant B: primary_muscles + secondary_muscles are JSONB
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exercises'
      and column_name = 'primary_muscles'
      and data_type = 'jsonb'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exercises'
      and column_name = 'secondary_muscles'
      and data_type = 'jsonb'
  ) then
    update public.exercises
    set
      how_to_short = 'Keep shoulders down and back, press handles forward, then return with control.',
      primary_muscles = '["chest", "triceps"]'::jsonb,
      secondary_muscles = '["front delts"]'::jsonb,
      movement_pattern = 'push',
      equipment = 'machine'
    where (is_global, name) = (true, 'Bench Press');

    insert into public.exercises (
      name,
      user_id,
      is_global,
      primary_muscle,
      equipment,
      how_to_short,
      primary_muscles,
      secondary_muscles,
      movement_pattern
    )
    select
      'Chest Press',
      null,
      true,
      'Chest',
      'Machine',
      'Keep shoulders down and back, press handles forward, then return with control.',
      '["chest", "triceps"]'::jsonb,
      '["front delts"]'::jsonb,
      'push'
    where not exists (
      select 1
      from public.exercises
      where (is_global, name) = (true, 'Chest Press')
    );
  end if;
end $$;
