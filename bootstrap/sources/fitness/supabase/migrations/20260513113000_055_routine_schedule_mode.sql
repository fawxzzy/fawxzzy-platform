alter table public.routines
  add column if not exists schedule_mode text not null default 'weekday_anchored';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'routines_schedule_mode_check'
      and conrelid = 'public.routines'::regclass
  ) then
    alter table public.routines
      add constraint routines_schedule_mode_check
      check (schedule_mode in ('weekday_anchored', 'rolling_n_day'));
  end if;
end
$$;
