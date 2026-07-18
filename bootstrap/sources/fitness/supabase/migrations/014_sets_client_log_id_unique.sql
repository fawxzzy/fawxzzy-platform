alter table public.sets
  add column if not exists client_log_id text null;

create unique index if not exists sets_user_id_client_log_id_uq
  on public.sets (user_id, client_log_id)
  where client_log_id is not null;
