alter table public.profiles
  add column if not exists preferred_weight_unit text not null default 'lbs',
  add column if not exists preferred_distance_unit text not null default 'mi';

alter table public.profiles
  drop constraint if exists profiles_preferred_weight_unit_check,
  add constraint profiles_preferred_weight_unit_check check (preferred_weight_unit in ('lbs', 'kg'));

alter table public.profiles
  drop constraint if exists profiles_preferred_distance_unit_check,
  add constraint profiles_preferred_distance_unit_check check (preferred_distance_unit in ('mi', 'km'));
