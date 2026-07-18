-- Ensure each set index is unique per exercise instance to support safe append retries.
create unique index if not exists sets_session_exercise_id_set_index_uq
  on public.sets (session_exercise_id, set_index);
