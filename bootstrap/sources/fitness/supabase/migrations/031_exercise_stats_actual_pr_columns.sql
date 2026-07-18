alter table public.exercise_stats
  add column if not exists actual_pr_weight numeric null,
  add column if not exists actual_pr_reps int null,
  add column if not exists actual_pr_at timestamptz null;
