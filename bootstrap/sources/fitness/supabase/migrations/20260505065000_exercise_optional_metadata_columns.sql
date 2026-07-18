-- Reconcile optional exercise metadata columns used by app selectors before
-- later catalog repair migrations reference them.
alter table public.exercises
  add column if not exists image_path text null,
  add column if not exists image_icon_path text null,
  add column if not exists slug text null,
  add column if not exists kind text null,
  add column if not exists type text null,
  add column if not exists tags text[] null,
  add column if not exists categories text[] null;

create index if not exists exercises_slug_idx
  on public.exercises (slug)
  where slug is not null;
