alter table public.sessions
  add column if not exists status text not null default 'in_progress';

alter table public.sessions
  drop constraint if exists sessions_status_check;

alter table public.sessions
  add constraint sessions_status_check
  check (status in ('in_progress', 'completed'));

update public.sessions
set status = 'completed'
where status = 'in_progress';

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sessions' and policyname = 'sessions_update_own'
  ) then
    create policy "sessions_update_own"
      on public.sessions
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;
