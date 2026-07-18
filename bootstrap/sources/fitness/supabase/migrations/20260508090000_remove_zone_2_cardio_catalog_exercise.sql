-- Remove the standalone Zone 2 Cardio catalog card from app selection surfaces.
-- Exercise rows are restrict-referenced by historical routine/session rows, so we
-- de-globalize instead of deleting to avoid destructive history/routine mutation.
update public.exercises
set is_global = false
where user_id is null
  and (
    lower(coalesce(slug, '')) = 'zone-2-cardio'
    or lower(name) = 'zone 2 cardio'
  );
