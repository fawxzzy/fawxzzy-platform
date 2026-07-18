alter table public.sessions
  drop constraint if exists sessions_routine_id_fkey;

alter table public.sessions
  add constraint sessions_routine_id_fkey
  foreign key (routine_id)
  references public.routines(id)
  on delete cascade;
