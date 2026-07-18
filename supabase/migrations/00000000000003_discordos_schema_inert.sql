-- APPLY_ADMITTED=false
-- INERT SOURCE PACKAGE: review and contained replay are required before any apply.

-- source supabase/migrations/20260612082758_discordos_feedback_runtime_schema_v1.sql blob 9c980b931a63f380d1e1fd23b7036b63292ff32b raw_sha256 9ccf19680336d55c1e907b3a37e046ab51c782f3e01a3a40537e7bb55c7d7bea
create schema if not exists discordos;

create table if not exists discordos.discord_feedback_reports (
  report_id text primary key,
  report_type text not null check (report_type in ('bug', 'feature', 'fix')),
  short_display_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reporter_discord_user_id text,
  reporter_fitness_user_id text,
  reporter_member_number integer,
  reporter_user_kind text check (reporter_user_kind in ('human', 'automation', 'unknown')),
  forum_channel_id text,
  forum_thread_id text,
  forum_message_id text,
  status text not null default 'new' check (status in ('new', 'needs_info', 'confirmed', 'fawxzzy_review', 'in_progress', 'fixed', 'closed', 'duplicate', 'spam', 'withdrawn')),
  completion_review_status text not null default 'not_required' check (completion_review_status in ('not_required', 'pending', 'approved', 'needs_followup')),
  status_updated_at timestamptz,
  status_updated_by_discord_user_id text,
  status_note text,
  completion_reviewed_at timestamptz,
  completion_reviewed_by_discord_user_id text,
  completion_review_note text,
  forum_title text,
  forum_applied_tag_ids text[] not null default '{}',
  reporter_mentioned_at timestamptz,
  runtime_warnings text[] not null default '{}',
  last_forum_sync_at timestamptz
);

create table if not exists discordos.discord_feedback_audit_events (
  id uuid primary key default gen_random_uuid(),
  report_id text not null references discordos.discord_feedback_reports(report_id) on delete cascade,
  action text not null check (action in ('status_update', 'completion_review', 'withdraw', 'reporter_update', 'staff_update', 'duplicate_signal', 'sync_format')),
  actor_label text,
  include_reporter_mention boolean not null default false,
  status_before text check (status_before is null or status_before in ('new', 'needs_info', 'confirmed', 'fawxzzy_review', 'in_progress', 'fixed', 'closed', 'duplicate', 'spam', 'withdrawn')),
  status_after text check (status_after is null or status_after in ('new', 'needs_info', 'confirmed', 'fawxzzy_review', 'in_progress', 'fixed', 'closed', 'duplicate', 'spam', 'withdrawn')),
  completion_review_status text check (completion_review_status is null or completion_review_status in ('not_required', 'pending', 'approved', 'needs_followup')),
  note text,
  duplicate_count integer check (duplicate_count is null or duplicate_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists discordos.discord_feedback_completion_reviews (
  id uuid primary key default gen_random_uuid(),
  report_id text not null references discordos.discord_feedback_reports(report_id) on delete cascade,
  status text not null check (status in ('not_required', 'pending', 'approved', 'needs_followup')),
  reviewed_by_discord_user_id text not null,
  reviewed_at timestamptz not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists discord_feedback_reports_short_display_id_idx on discordos.discord_feedback_reports(short_display_id);

create index if not exists discord_feedback_reports_status_idx on discordos.discord_feedback_reports(status);

create index if not exists discord_feedback_reports_forum_thread_id_idx on discordos.discord_feedback_reports(forum_thread_id);

create index if not exists discord_feedback_audit_events_report_id_created_at_idx on discordos.discord_feedback_audit_events(report_id, created_at desc);

create index if not exists discord_feedback_completion_reviews_report_id_reviewed_at_idx on discordos.discord_feedback_completion_reviews(report_id, reviewed_at desc);

create or replace function discordos.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_discord_feedback_reports_updated_at on discordos.discord_feedback_reports;

create trigger set_discord_feedback_reports_updated_at
before update on discordos.discord_feedback_reports
for each row
execute function discordos.set_updated_at();

alter table discordos.discord_feedback_reports enable row level security;

alter table discordos.discord_feedback_audit_events enable row level security;

alter table discordos.discord_feedback_completion_reviews enable row level security;

revoke all on schema discordos from public, anon, authenticated;

revoke all on all tables in schema discordos from public, anon, authenticated;

revoke all on all functions in schema discordos from public, anon, authenticated;

grant usage on schema discordos to service_role;

grant all privileges on all tables in schema discordos to service_role;

grant all privileges on all functions in schema discordos to service_role;

grant usage, select on all sequences in schema discordos to service_role;

comment on schema discordos is 'Private DiscordOS-owned runtime schema; not exposed to anon/authenticated clients.';

comment on table discordos.discord_feedback_reports is 'DiscordOS feedback report contract landing table. Fitness remains live source until approved cutover.';

comment on table discordos.discord_feedback_audit_events is 'DiscordOS feedback audit event contract table.';

comment on table discordos.discord_feedback_completion_reviews is 'DiscordOS feedback completion review event contract table.';

-- source supabase/migrations/20260612082854_discordos_set_updated_at_search_path.sql blob 0ff111bd7e04052ca953d8cec29dbce06f7e9599 raw_sha256 ad7ccd4b44ae3848d1301f32869231b5868621a27e50b7129cc80645904a6ac7
alter function discordos.set_updated_at() set search_path = discordos, pg_temp;

-- source supabase/migrations/20260612162531_discordos_feedback_proof_rpc.sql blob 0d7c65a82d79380452ee8d2afaccdd4ddd8d1d59 raw_sha256 548b695c619e71acc8f6da4ac7fd86f643f1688ecf379c5d6016c09982b62bb3
create or replace function public.discordos_insert_feedback_proof(payload jsonb)
returns setof discordos.discord_feedback_reports
language plpgsql
security invoker
set search_path = public, discordos, pg_temp
as $$
declare
  inserted discordos.discord_feedback_reports;
  proof_report_id text := payload->>'report_id';
begin
  if proof_report_id is null or proof_report_id not like 'edge-persist-proof-%' then
    raise exception 'proof_report_id_prefix_required' using errcode = '22023';
  end if;

  insert into discordos.discord_feedback_reports (
    report_id,
    report_type,
    short_display_id,
    created_at,
    updated_at,
    reporter_discord_user_id,
    reporter_fitness_user_id,
    reporter_member_number,
    reporter_user_kind,
    forum_channel_id,
    forum_thread_id,
    forum_message_id,
    status,
    completion_review_status,
    status_note,
    forum_title,
    forum_applied_tag_ids,
    runtime_warnings
  )
  values (
    proof_report_id,
    payload->>'report_type',
    payload->>'short_display_id',
    coalesce((payload->>'created_at')::timestamptz, now()),
    coalesce((payload->>'updated_at')::timestamptz, now()),
    payload->>'reporter_discord_user_id',
    payload->>'reporter_fitness_user_id',
    nullif(payload->>'reporter_member_number', '')::integer,
    payload->>'reporter_user_kind',
    payload->>'forum_channel_id',
    payload->>'forum_thread_id',
    payload->>'forum_message_id',
    coalesce(payload->>'status', 'new'),
    coalesce(payload->>'completion_review_status', 'not_required'),
    payload->>'status_note',
    payload->>'forum_title',
    coalesce(
      array(select jsonb_array_elements_text(payload->'forum_applied_tag_ids')),
      '{}'::text[]
    ),
    coalesce(
      array(select jsonb_array_elements_text(payload->'runtime_warnings')),
      '{}'::text[]
    )
  )
  returning * into inserted;

  return next inserted;
end;
$$;

revoke all on function public.discordos_insert_feedback_proof(jsonb) from public, anon, authenticated;

grant execute on function public.discordos_insert_feedback_proof(jsonb) to service_role;

comment on function public.discordos_insert_feedback_proof(jsonb) is
  'Service-role-only proof insert wrapper for DiscordOS feedback persistence. Accepts edge-persist-proof-* report ids only.';

-- source supabase/migrations/20260612175354_discordos_feedback_shadow_transfer_proof_rpc.sql blob 174bba7c8de97c7c3ac693e29bf0c3b38826c480 raw_sha256 0c2f0e8a5b36af7637523e0933d46050202caa00cd33d16fb02fbf84c8fcc3a7
create or replace function public.discordos_insert_feedback_proof(payload jsonb)
returns setof discordos.discord_feedback_reports
language plpgsql
security invoker
set search_path = public, discordos, pg_temp
as $$
declare
  inserted discordos.discord_feedback_reports;
  proof_report_id text := payload->>'report_id';
begin
  if proof_report_id is null
    or (
      proof_report_id not like 'edge-persist-proof-%'
      and proof_report_id not like 'shadow-transfer-proof-%'
    )
  then
    raise exception 'proof_report_id_prefix_required' using errcode = '22023';
  end if;

  insert into discordos.discord_feedback_reports (
    report_id,
    report_type,
    short_display_id,
    created_at,
    updated_at,
    reporter_discord_user_id,
    reporter_fitness_user_id,
    reporter_member_number,
    reporter_user_kind,
    forum_channel_id,
    forum_thread_id,
    forum_message_id,
    status,
    completion_review_status,
    status_note,
    forum_title,
    forum_applied_tag_ids,
    runtime_warnings
  )
  values (
    proof_report_id,
    payload->>'report_type',
    payload->>'short_display_id',
    coalesce((payload->>'created_at')::timestamptz, now()),
    coalesce((payload->>'updated_at')::timestamptz, now()),
    payload->>'reporter_discord_user_id',
    payload->>'reporter_fitness_user_id',
    nullif(payload->>'reporter_member_number', '')::integer,
    payload->>'reporter_user_kind',
    payload->>'forum_channel_id',
    payload->>'forum_thread_id',
    payload->>'forum_message_id',
    coalesce(payload->>'status', 'new'),
    coalesce(payload->>'completion_review_status', 'not_required'),
    payload->>'status_note',
    payload->>'forum_title',
    coalesce(
      array(select jsonb_array_elements_text(payload->'forum_applied_tag_ids')),
      '{}'::text[]
    ),
    coalesce(
      array(select jsonb_array_elements_text(payload->'runtime_warnings')),
      '{}'::text[]
    )
  )
  returning * into inserted;

  return next inserted;
end;
$$;

revoke all on function public.discordos_insert_feedback_proof(jsonb) from public, anon, authenticated;

grant execute on function public.discordos_insert_feedback_proof(jsonb) to service_role;

comment on function public.discordos_insert_feedback_proof(jsonb) is
  'Service-role-only proof insert wrapper for DiscordOS feedback persistence. Accepts edge-persist-proof-* and shadow-transfer-proof-* report ids only.';

-- source supabase/migrations/20260612212851_discordos_feedback_fitness_live_transfer_proof_rpc.sql blob 5fb6cf93956e632af19e8451757e769570a254fa raw_sha256 3bc17726abd4c930862264523dc294fd50face8c56f8db7e14b4a303074b1c60
create or replace function public.discordos_insert_feedback_proof(payload jsonb)
returns setof discordos.discord_feedback_reports
language plpgsql
security invoker
set search_path = public, discordos, pg_temp
as $$
declare
  inserted discordos.discord_feedback_reports;
  proof_report_id text := payload->>'report_id';
begin
  if proof_report_id is null
    or (
      proof_report_id not like 'edge-persist-proof-%'
      and proof_report_id not like 'shadow-transfer-proof-%'
      and proof_report_id not like 'fitness-live-transfer-%'
    )
  then
    raise exception 'proof_report_id_prefix_required' using errcode = '22023';
  end if;

  insert into discordos.discord_feedback_reports (
    report_id,
    report_type,
    short_display_id,
    created_at,
    updated_at,
    reporter_discord_user_id,
    reporter_fitness_user_id,
    reporter_member_number,
    reporter_user_kind,
    forum_channel_id,
    forum_thread_id,
    forum_message_id,
    status,
    completion_review_status,
    status_note,
    forum_title,
    forum_applied_tag_ids,
    runtime_warnings
  )
  values (
    proof_report_id,
    payload->>'report_type',
    payload->>'short_display_id',
    coalesce((payload->>'created_at')::timestamptz, now()),
    coalesce((payload->>'updated_at')::timestamptz, now()),
    payload->>'reporter_discord_user_id',
    payload->>'reporter_fitness_user_id',
    nullif(payload->>'reporter_member_number', '')::integer,
    payload->>'reporter_user_kind',
    payload->>'forum_channel_id',
    payload->>'forum_thread_id',
    payload->>'forum_message_id',
    coalesce(payload->>'status', 'new'),
    coalesce(payload->>'completion_review_status', 'not_required'),
    payload->>'status_note',
    payload->>'forum_title',
    coalesce(
      array(select jsonb_array_elements_text(payload->'forum_applied_tag_ids')),
      '{}'::text[]
    ),
    coalesce(
      array(select jsonb_array_elements_text(payload->'runtime_warnings')),
      '{}'::text[]
    )
  )
  returning * into inserted;

  return next inserted;
end;
$$;

revoke all on function public.discordos_insert_feedback_proof(jsonb) from public, anon, authenticated;

grant execute on function public.discordos_insert_feedback_proof(jsonb) to service_role;

comment on function public.discordos_insert_feedback_proof(jsonb) is
  'Service-role-only proof insert wrapper for DiscordOS feedback persistence. Accepts edge-persist-proof-*, shadow-transfer-proof-*, and fitness-live-transfer-* report ids only.';

-- source supabase/migrations/20260612222352_discordos_live_transfer_status_rpc.sql blob 40e26b2709f8937fec067f75da44cd8589340972 raw_sha256 449924e88fe3a2a1a0ad2c0fdfb82a17e5364fb609b88e222428b0210d68afcb
create or replace function public.discordos_get_live_transfer_status()
returns jsonb
language sql
security invoker
set search_path = public, discordos, pg_temp
as $$
with transfer_rows as (
  select
    report_id,
    report_type,
    reporter_user_kind,
    reporter_discord_user_id,
    status,
    completion_review_status,
    runtime_warnings,
    created_at,
    updated_at,
    coalesce(runtime_warnings, '{}'::text[]) @> array['edge_persist_writer_proof_only']::text[] as proof_only
  from discordos.discord_feedback_reports
  where report_id like 'fitness-live-transfer-%'
),
counts as (
  select
    count(*)::integer as fitness_live_transfer_count,
    count(*) filter (where reporter_user_kind = 'human')::integer as human_fitness_live_transfer_count,
    count(*) filter (where not proof_only)::integer as non_proof_fitness_live_transfer_count,
    count(*) filter (where reporter_user_kind = 'human' and not proof_only)::integer as human_non_proof_fitness_live_transfer_count,
    max(created_at) as latest_fitness_live_transfer_at
  from transfer_rows
),
latest_any as (
  select
    report_id,
    report_type,
    reporter_user_kind,
    reporter_discord_user_id,
    status,
    completion_review_status,
    runtime_warnings,
    proof_only,
    created_at,
    updated_at
  from transfer_rows
  order by created_at desc
  limit 1
),
latest_human_non_proof as (
  select
    report_id,
    report_type,
    reporter_user_kind,
    reporter_discord_user_id,
    status,
    completion_review_status,
    runtime_warnings,
    proof_only,
    created_at,
    updated_at
  from transfer_rows
  where reporter_user_kind = 'human'
    and not proof_only
  order by created_at desc
  limit 1
)
select jsonb_build_object(
  'fitnessLiveTransferCount', coalesce(counts.fitness_live_transfer_count, 0),
  'humanFitnessLiveTransferCount', coalesce(counts.human_fitness_live_transfer_count, 0),
  'nonProofFitnessLiveTransferCount', coalesce(counts.non_proof_fitness_live_transfer_count, 0),
  'humanNonProofFitnessLiveTransferCount', coalesce(counts.human_non_proof_fitness_live_transfer_count, 0),
  'latestFitnessLiveTransferAt', counts.latest_fitness_live_transfer_at,
  'liveSignedTransferReady', coalesce(counts.human_non_proof_fitness_live_transfer_count, 0) > 0,
  'latestTransferRow', (select to_jsonb(latest_any) from latest_any),
  'latestHumanNonProofTransferRow', (select to_jsonb(latest_human_non_proof) from latest_human_non_proof)
)
from counts;
$$;

revoke all on function public.discordos_get_live_transfer_status() from public, anon, authenticated;

grant execute on function public.discordos_get_live_transfer_status() to service_role;

comment on function public.discordos_get_live_transfer_status() is
  'Service-role-only live transfer status summary for DiscordOS cutover proof capture. Returns non-secret row metadata for fitness-live-transfer-* rows.';

-- source supabase/migrations/20260613144114_discordos_runtime_health_cron_runs.sql blob ecc1c8913c67eab728b24164fae3baff755db19a raw_sha256 b19d9f31e4fb7d14bfe74e4033fccc8bf115abda199895619671de45abc73f7c
create table if not exists discordos.runtime_health_cron_runs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null unique,
  schedule_name text not null,
  source text not null default 'vercel-cron-runtime-health',
  status text not null check (status in ('pass', 'fail')),
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  event_type text not null,
  event_severity text not null check (event_severity in ('info', 'warning', 'error', 'critical')),
  posture text,
  readiness_percent integer check (readiness_percent is null or readiness_percent between 0 and 100),
  blocked_reasons text[] not null default '{}',
  alert_event_type text,
  alert_severity text,
  alert_delivery_enabled boolean not null default false,
  alert_delivery_status text,
  alert_delivery_target_type text,
  alert_delivered boolean not null default false,
  artifact_written boolean not null default false,
  destructive boolean not null default false,
  reason_codes text[] not null default '{}'
);

create index if not exists runtime_health_cron_runs_generated_at_idx
  on discordos.runtime_health_cron_runs(generated_at desc);

create index if not exists runtime_health_cron_runs_schedule_generated_at_idx
  on discordos.runtime_health_cron_runs(schedule_name, generated_at desc);

alter table discordos.runtime_health_cron_runs enable row level security;

revoke all on table discordos.runtime_health_cron_runs from public, anon, authenticated;

grant all privileges on table discordos.runtime_health_cron_runs to service_role;

create or replace function public.discordos_insert_runtime_health_cron_run(payload jsonb)
returns setof discordos.runtime_health_cron_runs
language plpgsql
security invoker
set search_path = public, discordos, pg_temp
as $$
declare
  inserted discordos.runtime_health_cron_runs;
  payload_run_id text := payload->>'run_id';
  payload_schedule_name text := payload->>'schedule_name';
  payload_generated_at timestamptz := nullif(payload->>'generated_at', '')::timestamptz;
  payload_status text := coalesce(payload->>'status', 'fail');
begin
  if payload_run_id is null or payload_run_id not like 'runtime-health-cron-%' then
    raise exception 'runtime_health_cron_run_id_prefix_required' using errcode = '22023';
  end if;

  if payload_schedule_name is null or payload_schedule_name = '' then
    raise exception 'runtime_health_cron_schedule_name_required' using errcode = '22023';
  end if;

  insert into discordos.runtime_health_cron_runs (
    run_id,
    schedule_name,
    source,
    status,
    generated_at,
    event_type,
    event_severity,
    posture,
    readiness_percent,
    blocked_reasons,
    alert_event_type,
    alert_severity,
    alert_delivery_enabled,
    alert_delivery_status,
    alert_delivery_target_type,
    alert_delivered,
    artifact_written,
    destructive,
    reason_codes
  )
  values (
    payload_run_id,
    payload_schedule_name,
    coalesce(payload->>'source', 'vercel-cron-runtime-health'),
    payload_status,
    coalesce(payload_generated_at, now()),
    coalesce(payload->>'event_type', 'discordos.runtime_health.cron_fail'),
    coalesce(payload->>'event_severity', 'error'),
    payload->>'posture',
    nullif(payload->>'readiness_percent', '')::integer,
    coalesce(
      array(select jsonb_array_elements_text(payload->'blocked_reasons')),
      '{}'::text[]
    ),
    payload->>'alert_event_type',
    payload->>'alert_severity',
    coalesce((payload->>'alert_delivery_enabled')::boolean, false),
    payload->>'alert_delivery_status',
    payload->>'alert_delivery_target_type',
    coalesce((payload->>'alert_delivered')::boolean, false),
    coalesce((payload->>'artifact_written')::boolean, false),
    coalesce((payload->>'destructive')::boolean, false),
    coalesce(
      array(select jsonb_array_elements_text(payload->'reason_codes')),
      '{}'::text[]
    )
  )
  on conflict (run_id) do update set
    schedule_name = excluded.schedule_name,
    source = excluded.source,
    status = excluded.status,
    generated_at = excluded.generated_at,
    event_type = excluded.event_type,
    event_severity = excluded.event_severity,
    posture = excluded.posture,
    readiness_percent = excluded.readiness_percent,
    blocked_reasons = excluded.blocked_reasons,
    alert_event_type = excluded.alert_event_type,
    alert_severity = excluded.alert_severity,
    alert_delivery_enabled = excluded.alert_delivery_enabled,
    alert_delivery_status = excluded.alert_delivery_status,
    alert_delivery_target_type = excluded.alert_delivery_target_type,
    alert_delivered = excluded.alert_delivered,
    artifact_written = excluded.artifact_written,
    destructive = excluded.destructive,
    reason_codes = excluded.reason_codes
  returning * into inserted;

  return next inserted;
end;
$$;

revoke all on function public.discordos_insert_runtime_health_cron_run(jsonb) from public, anon, authenticated;

grant execute on function public.discordos_insert_runtime_health_cron_run(jsonb) to service_role;

create or replace function public.discordos_get_runtime_health_cron_run_status()
returns jsonb
language sql
security invoker
set search_path = public, discordos, pg_temp
as $$
with latest_any as (
  select *
  from discordos.runtime_health_cron_runs
  order by generated_at desc
  limit 1
),
latest_pass as (
  select *
  from discordos.runtime_health_cron_runs
  where status = 'pass'
  order by generated_at desc
  limit 1
),
counts as (
  select
    count(*)::integer as total_count,
    count(*) filter (where status = 'pass')::integer as pass_count,
    count(*) filter (where status = 'fail')::integer as fail_count,
    max(generated_at) as latest_generated_at
  from discordos.runtime_health_cron_runs
)
select jsonb_build_object(
  'totalCount', coalesce(counts.total_count, 0),
  'passCount', coalesce(counts.pass_count, 0),
  'failCount', coalesce(counts.fail_count, 0),
  'latestGeneratedAt', counts.latest_generated_at,
  'latestRun', (select to_jsonb(latest_any) from latest_any),
  'latestPassingRun', (select to_jsonb(latest_pass) from latest_pass)
)
from counts;
$$;

revoke all on function public.discordos_get_runtime_health_cron_run_status() from public, anon, authenticated;

grant execute on function public.discordos_get_runtime_health_cron_run_status() to service_role;

comment on table discordos.runtime_health_cron_runs is
  'Private DiscordOS runtime-health cron execution receipts. Service-role only; no public policies.';

comment on function public.discordos_insert_runtime_health_cron_run(jsonb) is
  'Service-role-only sanitized runtime-health cron receipt upsert. Accepts runtime-health-cron-* run ids only.';

comment on function public.discordos_get_runtime_health_cron_run_status() is
  'Service-role-only runtime-health cron receipt status summary. Returns non-secret execution metadata.';

-- source supabase/migrations/20260615005519_discordos_board_cards.sql blob 8270e0284c62a36dc968ca6a9276a34b72052df0 raw_sha256 271b1204835324dcd37f5c8d7d5930ee465d5d256f6f3f6f8254d3cdd2f4f4fd
create schema if not exists discordos;

create table if not exists discordos.discordos_board_cards (
  card_id text primary key,
  workflow text not null,
  kind text not null check (kind in ('feature', 'bug', 'ops', 'release', 'moderation')),
  current_state text not null check (current_state in ('opened', 'in_progress', 'blocked', 'completed', 'closed')),
  source_thread_id text,
  publication_thread_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  latest_transition_at timestamptz,
  latest_transition_actor text,
  latest_transition_note_present boolean not null default false,
  proof_payload jsonb not null default '{}'::jsonb,
  reason_codes text[] not null default '{}'
);

create index if not exists discordos_board_cards_workflow_idx
  on discordos.discordos_board_cards(workflow);

create index if not exists discordos_board_cards_current_state_idx
  on discordos.discordos_board_cards(current_state);

create index if not exists discordos_board_cards_source_thread_id_idx
  on discordos.discordos_board_cards(source_thread_id);

create index if not exists discordos_board_cards_workflow_state_idx
  on discordos.discordos_board_cards(workflow, current_state);

drop trigger if exists set_discordos_board_cards_updated_at on discordos.discordos_board_cards;

create trigger set_discordos_board_cards_updated_at
before update on discordos.discordos_board_cards
for each row
execute function discordos.set_updated_at();

alter table discordos.discordos_board_cards enable row level security;

revoke all on table discordos.discordos_board_cards from public, anon, authenticated;

grant all privileges on table discordos.discordos_board_cards to service_role;

comment on table discordos.discordos_board_cards is
  'Private DiscordOS board/card workflow state table. Service-role only; no public policies.';

comment on column discordos.discordos_board_cards.card_id is
  'Idempotency key for board/card workflow state.';

comment on column discordos.discordos_board_cards.proof_payload is
  'Bounded non-secret proof payload for board/card state transitions.';

-- source supabase/migrations/20260615005542_discordos_moderation_audit_log.sql blob 61ce93ee1f8063badf4005d330b3bc7d37dbacde raw_sha256 082cadea1d7380556d6788c7984daa43b631d1449ef2045a0adbdf71644cbcb0
create schema if not exists discordos;

create table if not exists discordos.discordos_moderation_audit_log (
  case_id text primary key,
  action_type text not null check (action_type in ('note', 'warn', 'timeout', 'remove_content', 'escalate', 'close')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  actor_discord_user_fingerprint text not null,
  subject_discord_user_fingerprint text not null,
  guild_id text not null,
  channel_id text,
  reason_present boolean not null default false,
  note_present boolean not null default false,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  proof_payload jsonb not null default '{}'::jsonb,
  reason_codes text[] not null default '{}'
);

create index if not exists discordos_moderation_audit_log_action_type_idx
  on discordos.discordos_moderation_audit_log(action_type);

create index if not exists discordos_moderation_audit_log_subject_idx
  on discordos.discordos_moderation_audit_log(subject_discord_user_fingerprint);

create index if not exists discordos_moderation_audit_log_occurred_at_idx
  on discordos.discordos_moderation_audit_log(occurred_at desc);

create index if not exists discordos_moderation_audit_log_case_action_idx
  on discordos.discordos_moderation_audit_log(case_id, action_type);

alter table discordos.discordos_moderation_audit_log enable row level security;

revoke all on table discordos.discordos_moderation_audit_log from public, anon, authenticated;

grant all privileges on table discordos.discordos_moderation_audit_log to service_role;

comment on table discordos.discordos_moderation_audit_log is
  'Private DiscordOS moderation audit ledger table. Service-role only; no public policies.';

comment on column discordos.discordos_moderation_audit_log.case_id is
  'Idempotency key for moderation audit shadow rows.';

comment on column discordos.discordos_moderation_audit_log.actor_discord_user_fingerprint is
  'Sanitized actor fingerprint; raw Discord user id is not stored in this shadow audit table.';

comment on column discordos.discordos_moderation_audit_log.subject_discord_user_fingerprint is
  'Sanitized subject fingerprint; raw Discord user id is not stored in this shadow audit table.';

-- source supabase/migrations/20260615020059_discordos_board_moderation_writer_rpcs.sql blob d552f52ed5107e2fab0aea4fbb5209a1e71fec67 raw_sha256 5468f43543a2640afd30061904cd06be158c9cbfc117f19cefbf35905fa1b094
create or replace function public.discordos_upsert_board_card(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = discordos, public, pg_temp
as $$
declare
  inserted_row discordos.discordos_board_cards%rowtype;
  reason_codes text[];
begin
  if nullif(payload->>'card_id', '') is null then
    raise exception 'missing_card_id';
  end if;
  if nullif(payload->>'workflow', '') is null then
    raise exception 'missing_workflow';
  end if;

  select coalesce(array_agg(value), '{}'::text[])
  into reason_codes
  from jsonb_array_elements_text(coalesce(payload->'reason_codes', '[]'::jsonb)) as value;

  insert into discordos.discordos_board_cards (
    card_id,
    workflow,
    kind,
    current_state,
    source_thread_id,
    latest_transition_at,
    latest_transition_actor,
    latest_transition_note_present,
    proof_payload,
    reason_codes
  )
  values (
    payload->>'card_id',
    payload->>'workflow',
    coalesce(nullif(payload->>'kind', ''), 'ops'),
    coalesce(nullif(payload->>'current_state', ''), 'opened'),
    nullif(payload->>'source_thread_id', ''),
    now(),
    nullif(payload->>'latest_transition_actor', ''),
    coalesce((payload->>'latest_transition_note_present')::boolean, false),
    coalesce(payload->'proof_payload', '{}'::jsonb),
    coalesce(reason_codes, '{}'::text[])
  )
  on conflict (card_id) do update set
    workflow = excluded.workflow,
    kind = excluded.kind,
    current_state = excluded.current_state,
    source_thread_id = excluded.source_thread_id,
    latest_transition_at = excluded.latest_transition_at,
    latest_transition_actor = excluded.latest_transition_actor,
    latest_transition_note_present = excluded.latest_transition_note_present,
    proof_payload = excluded.proof_payload,
    reason_codes = excluded.reason_codes
  returning * into inserted_row;

  return jsonb_build_object(
    'cardId', inserted_row.card_id,
    'workflow', inserted_row.workflow,
    'kind', inserted_row.kind,
    'currentState', inserted_row.current_state,
    'sourceThreadIdPresent', inserted_row.source_thread_id is not null,
    'latestTransitionActorPresent', inserted_row.latest_transition_actor is not null,
    'latestTransitionNotePresent', inserted_row.latest_transition_note_present,
    'updatedAt', inserted_row.updated_at,
    'operation', 'upsert'
  );
end;
$$;

create or replace function public.discordos_insert_moderation_audit(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = discordos, public, pg_temp
as $$
declare
  audit_row discordos.discordos_moderation_audit_log%rowtype;
  inserted boolean := true;
  reason_codes text[];
begin
  if nullif(payload->>'case_id', '') is null then
    raise exception 'missing_case_id';
  end if;
  if nullif(payload->>'action_type', '') is null then
    raise exception 'missing_action_type';
  end if;

  select coalesce(array_agg(value), '{}'::text[])
  into reason_codes
  from jsonb_array_elements_text(coalesce(payload->'reason_codes', '[]'::jsonb)) as value;

  insert into discordos.discordos_moderation_audit_log (
    case_id,
    action_type,
    severity,
    actor_discord_user_fingerprint,
    subject_discord_user_fingerprint,
    guild_id,
    channel_id,
    reason_present,
    note_present,
    proof_payload,
    reason_codes
  )
  values (
    payload->>'case_id',
    payload->>'action_type',
    coalesce(nullif(payload->>'severity', ''), 'medium'),
    payload->>'actor_discord_user_fingerprint',
    payload->>'subject_discord_user_fingerprint',
    payload->>'guild_id',
    nullif(payload->>'channel_id', ''),
    coalesce((payload->>'reason_present')::boolean, false),
    coalesce((payload->>'note_present')::boolean, false),
    coalesce(payload->'proof_payload', '{}'::jsonb),
    coalesce(reason_codes, '{}'::text[])
  )
  on conflict (case_id) do nothing
  returning * into audit_row;

  if audit_row.case_id is null then
    inserted := false;
    select *
    into audit_row
    from discordos.discordos_moderation_audit_log
    where case_id = payload->>'case_id';
  end if;

  return jsonb_build_object(
    'caseId', audit_row.case_id,
    'actionType', audit_row.action_type,
    'severity', audit_row.severity,
    'actorFingerprintPresent', audit_row.actor_discord_user_fingerprint is not null,
    'subjectFingerprintPresent', audit_row.subject_discord_user_fingerprint is not null,
    'guildIdPresent', audit_row.guild_id is not null,
    'reasonPresent', audit_row.reason_present,
    'notePresent', audit_row.note_present,
    'occurredAt', audit_row.occurred_at,
    'operation', case when inserted then 'inserted' else 'duplicate_existing' end
  );
end;
$$;

create or replace function public.discordos_get_product_workflow_readback()
returns jsonb
language sql
security invoker
set search_path = discordos, public, pg_temp
as $$
  select jsonb_build_object(
    'boardCardCount', (select count(*) from discordos.discordos_board_cards),
    'moderationAuditCount', (select count(*) from discordos.discordos_moderation_audit_log),
    'latestBoardCard', (
      select jsonb_build_object(
        'cardId', card_id,
        'workflow', workflow,
        'kind', kind,
        'currentState', current_state,
        'updatedAt', updated_at,
        'latestTransitionAt', latest_transition_at
      )
      from discordos.discordos_board_cards
      order by updated_at desc
      limit 1
    ),
    'latestModerationAudit', (
      select jsonb_build_object(
        'caseId', case_id,
        'actionType', action_type,
        'severity', severity,
        'reasonPresent', reason_present,
        'notePresent', note_present,
        'occurredAt', occurred_at
      )
      from discordos.discordos_moderation_audit_log
      order by occurred_at desc
      limit 1
    ),
    'generatedAt', now()
  );
$$;

create or replace function public.discordos_search_moderation_audit(payload jsonb)
returns jsonb
language sql
security invoker
set search_path = discordos, public, pg_temp
as $$
  with params as (
    select
      nullif(payload->>'case_id', '') as case_id,
      nullif(payload->>'action_type', '') as action_type,
      nullif(payload->>'subject_discord_user_fingerprint', '') as subject_discord_user_fingerprint,
      least(greatest(coalesce((payload->>'limit')::int, 10), 1), 50) as row_limit
  ),
  rows as (
    select
      log.case_id,
      log.action_type,
      log.severity,
      log.actor_discord_user_fingerprint,
      log.subject_discord_user_fingerprint,
      log.reason_present,
      log.note_present,
      log.occurred_at
    from discordos.discordos_moderation_audit_log log, params
    where (params.case_id is null or log.case_id = params.case_id)
      and (params.action_type is null or log.action_type = params.action_type)
      and (
        params.subject_discord_user_fingerprint is null
        or log.subject_discord_user_fingerprint = params.subject_discord_user_fingerprint
      )
    order by log.occurred_at desc
    limit (select row_limit from params)
  )
  select jsonb_build_object(
    'rows', coalesce(jsonb_agg(jsonb_build_object(
      'caseId', case_id,
      'actionType', action_type,
      'severity', severity,
      'actorFingerprint', actor_discord_user_fingerprint,
      'subjectFingerprint', subject_discord_user_fingerprint,
      'reasonPresent', reason_present,
      'notePresent', note_present,
      'occurredAt', occurred_at
    )), '[]'::jsonb),
    'returnedCount', count(*),
    'generatedAt', now()
  )
  from rows;
$$;

revoke all on function public.discordos_upsert_board_card(jsonb) from public, anon, authenticated;

revoke all on function public.discordos_insert_moderation_audit(jsonb) from public, anon, authenticated;

revoke all on function public.discordos_get_product_workflow_readback() from public, anon, authenticated;

revoke all on function public.discordos_search_moderation_audit(jsonb) from public, anon, authenticated;

grant execute on function public.discordos_upsert_board_card(jsonb) to service_role;

grant execute on function public.discordos_insert_moderation_audit(jsonb) to service_role;

grant execute on function public.discordos_get_product_workflow_readback() to service_role;

grant execute on function public.discordos_search_moderation_audit(jsonb) to service_role;

comment on function public.discordos_upsert_board_card(jsonb) is
  'Service-role-only DiscordOS board/card guarded writer RPC. Keeps private table unexposed to anon/authenticated roles.';

comment on function public.discordos_insert_moderation_audit(jsonb) is
  'Service-role-only DiscordOS moderation audit guarded writer RPC. Stores sanitized fingerprints only.';

comment on function public.discordos_get_product_workflow_readback() is
  'Service-role-only DiscordOS product workflow readback RPC for operator dashboards.';

comment on function public.discordos_search_moderation_audit(jsonb) is
  'Service-role-only DiscordOS moderation audit sanitized review/search RPC.';

-- source supabase/migrations/20260615034751_discordos_music_sesh_storage.sql blob 871cd8e76673828aae04f223f1e0049d69a629a2 raw_sha256 b8f32e82f494c7b970b2b8afddb94f9525cd8d9da88344e6c14d235247738cbd
create schema if not exists discordos;

create table if not exists discordos.discordos_music_sesh_sessions (
  session_id text primary key,
  guild_id text not null,
  channel_id text not null,
  current_state text not null check (current_state in ('open', 'locked', 'closed')),
  opened_by_fingerprint text not null,
  opened_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  proof_payload jsonb not null default '{}'::jsonb,
  reason_codes text[] not null default '{}'
);

create table if not exists discordos.discordos_music_sesh_queue_items (
  queue_item_id text primary key,
  session_id text not null references discordos.discordos_music_sesh_sessions(session_id) on delete cascade,
  item_title text not null,
  requested_by_fingerprint text not null,
  queue_position integer not null default 0,
  current_state text not null default 'queued' check (current_state in ('queued', 'skipped', 'played')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  proof_payload jsonb not null default '{}'::jsonb,
  reason_codes text[] not null default '{}'
);

create table if not exists discordos.discordos_music_sesh_votes (
  vote_id text primary key,
  session_id text not null references discordos.discordos_music_sesh_sessions(session_id) on delete cascade,
  queue_item_id text references discordos.discordos_music_sesh_queue_items(queue_item_id) on delete cascade,
  actor_fingerprint text not null,
  vote_direction text not null check (vote_direction in ('up', 'down')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  proof_payload jsonb not null default '{}'::jsonb,
  reason_codes text[] not null default '{}',
  unique (session_id, queue_item_id, actor_fingerprint)
);

create index if not exists discordos_music_sesh_sessions_state_idx
  on discordos.discordos_music_sesh_sessions(current_state);

create index if not exists discordos_music_sesh_queue_items_session_idx
  on discordos.discordos_music_sesh_queue_items(session_id);

create index if not exists discordos_music_sesh_votes_session_idx
  on discordos.discordos_music_sesh_votes(session_id);

drop trigger if exists set_discordos_music_sesh_sessions_updated_at on discordos.discordos_music_sesh_sessions;

create trigger set_discordos_music_sesh_sessions_updated_at
before update on discordos.discordos_music_sesh_sessions
for each row
execute function discordos.set_updated_at();

drop trigger if exists set_discordos_music_sesh_queue_items_updated_at on discordos.discordos_music_sesh_queue_items;

create trigger set_discordos_music_sesh_queue_items_updated_at
before update on discordos.discordos_music_sesh_queue_items
for each row
execute function discordos.set_updated_at();

drop trigger if exists set_discordos_music_sesh_votes_updated_at on discordos.discordos_music_sesh_votes;

create trigger set_discordos_music_sesh_votes_updated_at
before update on discordos.discordos_music_sesh_votes
for each row
execute function discordos.set_updated_at();

alter table discordos.discordos_music_sesh_sessions enable row level security;

alter table discordos.discordos_music_sesh_queue_items enable row level security;

alter table discordos.discordos_music_sesh_votes enable row level security;

revoke all on table discordos.discordos_music_sesh_sessions from public, anon, authenticated;

revoke all on table discordos.discordos_music_sesh_queue_items from public, anon, authenticated;

revoke all on table discordos.discordos_music_sesh_votes from public, anon, authenticated;

grant all privileges on table discordos.discordos_music_sesh_sessions to service_role;

grant all privileges on table discordos.discordos_music_sesh_queue_items to service_role;

grant all privileges on table discordos.discordos_music_sesh_votes to service_role;

comment on table discordos.discordos_music_sesh_sessions is
  'Private DiscordOS Music Sesh session state table. Service-role only; no public policies.';

comment on table discordos.discordos_music_sesh_queue_items is
  'Private DiscordOS Music Sesh queue table. Service-role only; no public policies.';

comment on table discordos.discordos_music_sesh_votes is
  'Private DiscordOS Music Sesh vote table. Service-role only; no public policies.';

comment on column discordos.discordos_music_sesh_sessions.session_id is
  'Idempotency key for Music Sesh session state.';

comment on column discordos.discordos_music_sesh_queue_items.queue_item_id is
  'Idempotency key for Music Sesh queue items.';

comment on column discordos.discordos_music_sesh_votes.vote_id is
  'Idempotency key for Music Sesh votes.';

-- source supabase/migrations/20260615034829_discordos_music_sesh_writer_rpcs.sql blob cfdf19b3ba84223143222e6d130536d52721c5cf raw_sha256 d1d6d74f651c384c4bada1e3ca798ef8267d7ca5f10bb331596035e9e44c4036
create or replace function public.discordos_upsert_music_sesh_event(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = discordos, public, pg_temp
as $$
declare
  session_row discordos.discordos_music_sesh_sessions%rowtype;
  queue_row discordos.discordos_music_sesh_queue_items%rowtype;
  vote_row discordos.discordos_music_sesh_votes%rowtype;
  reason_codes text[];
  action_type text := coalesce(nullif(payload->>'action', ''), 'queue_item');
begin
  if nullif(payload->>'session_id', '') is null then
    raise exception 'missing_session_id';
  end if;
  if nullif(payload->>'guild_id', '') is null then
    raise exception 'missing_guild_id';
  end if;
  if nullif(payload->>'channel_id', '') is null then
    raise exception 'missing_channel_id';
  end if;
  if nullif(payload->>'actor_fingerprint', '') is null then
    raise exception 'missing_actor_fingerprint';
  end if;

  select coalesce(array_agg(value), '{}'::text[])
  into reason_codes
  from jsonb_array_elements_text(coalesce(payload->'reason_codes', '[]'::jsonb)) as value;

  insert into discordos.discordos_music_sesh_sessions (
    session_id,
    guild_id,
    channel_id,
    current_state,
    opened_by_fingerprint,
    proof_payload,
    reason_codes
  )
  values (
    payload->>'session_id',
    payload->>'guild_id',
    payload->>'channel_id',
    case
      when action_type = 'close_session' then 'closed'
      when action_type = 'lock_session' then 'locked'
      else 'open'
    end,
    payload->>'actor_fingerprint',
    coalesce(payload->'proof_payload', '{}'::jsonb),
    coalesce(reason_codes, '{}'::text[])
  )
  on conflict (session_id) do update set
    guild_id = excluded.guild_id,
    channel_id = excluded.channel_id,
    current_state = excluded.current_state,
    proof_payload = excluded.proof_payload,
    reason_codes = excluded.reason_codes
  returning * into session_row;

  if action_type = 'queue_item' and nullif(payload->>'queue_item_id', '') is not null then
    insert into discordos.discordos_music_sesh_queue_items (
      queue_item_id,
      session_id,
      item_title,
      requested_by_fingerprint,
      queue_position,
      proof_payload,
      reason_codes
    )
    values (
      payload->>'queue_item_id',
      payload->>'session_id',
      coalesce(nullif(payload->>'item_title', ''), 'Untitled'),
      payload->>'actor_fingerprint',
      coalesce((payload->>'queue_position')::int, 0),
      coalesce(payload->'proof_payload', '{}'::jsonb),
      coalesce(reason_codes, '{}'::text[])
    )
    on conflict (queue_item_id) do update set
      item_title = excluded.item_title,
      requested_by_fingerprint = excluded.requested_by_fingerprint,
      queue_position = excluded.queue_position,
      proof_payload = excluded.proof_payload,
      reason_codes = excluded.reason_codes
    returning * into queue_row;
  end if;

  if action_type = 'vote' and nullif(payload->>'vote_id', '') is not null then
    insert into discordos.discordos_music_sesh_votes (
      vote_id,
      session_id,
      queue_item_id,
      actor_fingerprint,
      vote_direction,
      proof_payload,
      reason_codes
    )
    values (
      payload->>'vote_id',
      payload->>'session_id',
      nullif(payload->>'queue_item_id', ''),
      payload->>'actor_fingerprint',
      coalesce(nullif(payload->>'vote_direction', ''), 'up'),
      coalesce(payload->'proof_payload', '{}'::jsonb),
      coalesce(reason_codes, '{}'::text[])
    )
    on conflict (session_id, queue_item_id, actor_fingerprint) do update set
      vote_direction = excluded.vote_direction,
      proof_payload = excluded.proof_payload,
      reason_codes = excluded.reason_codes
    returning * into vote_row;
  end if;

  return jsonb_build_object(
    'sessionId', session_row.session_id,
    'currentState', session_row.current_state,
    'queueItemId', queue_row.queue_item_id,
    'voteId', vote_row.vote_id,
    'action', action_type,
    'operation', 'upsert'
  );
end;
$$;

create or replace function public.discordos_get_music_sesh_readback()
returns jsonb
language sql
security invoker
set search_path = discordos, public, pg_temp
as $$
  select jsonb_build_object(
    'sessionCount', (select count(*) from discordos.discordos_music_sesh_sessions),
    'queueItemCount', (select count(*) from discordos.discordos_music_sesh_queue_items),
    'voteCount', (select count(*) from discordos.discordos_music_sesh_votes),
    'latestSession', (
      select jsonb_build_object(
        'sessionId', session_id,
        'currentState', current_state,
        'updatedAt', updated_at
      )
      from discordos.discordos_music_sesh_sessions
      order by updated_at desc
      limit 1
    ),
    'latestQueueItem', (
      select jsonb_build_object(
        'queueItemId', queue_item_id,
        'sessionId', session_id,
        'currentState', current_state,
        'updatedAt', updated_at
      )
      from discordos.discordos_music_sesh_queue_items
      order by updated_at desc
      limit 1
    ),
    'generatedAt', now()
  );
$$;

revoke all on function public.discordos_upsert_music_sesh_event(jsonb) from public, anon, authenticated;

revoke all on function public.discordos_get_music_sesh_readback() from public, anon, authenticated;

grant execute on function public.discordos_upsert_music_sesh_event(jsonb) to service_role;

grant execute on function public.discordos_get_music_sesh_readback() to service_role;

comment on function public.discordos_upsert_music_sesh_event(jsonb) is
  'Service-role-only DiscordOS Music Sesh guarded writer RPC. Stores sanitized fingerprints only.';

comment on function public.discordos_get_music_sesh_readback() is
  'Service-role-only DiscordOS Music Sesh operator readback RPC.';

-- source supabase/migrations/20260627201353_discordos_feedback_runtime_extract_v2.sql blob d27ab78e338e514dd7934adba33d82f10709087f raw_sha256 479544d4aaf95b53847058158bc817e1131f84dd751a7bd461fddeb71bb85fd9
alter table discordos.discord_feedback_reports
  add column if not exists source text not null default 'discord',
  add column if not exists severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'blocker')),
  add column if not exists effort_points integer,
  add column if not exists card_id text,
  add column if not exists card_phase text,
  add column if not exists card_priority text check (card_priority is null or card_priority in ('P0', 'P1', 'P2', 'P3')),
  add column if not exists depends_on text[],
  add column if not exists dependency_notes text,
  add column if not exists area text,
  add column if not exists summary text,
  add column if not exists details text,
  add column if not exists steps_to_reproduce text,
  add column if not exists screenshot_url text,
  add column if not exists attachment_count integer not null default 0,
  add column if not exists attachment_metadata jsonb,
  add column if not exists attachment_pruned boolean not null default false,
  add column if not exists reporter_discord_username text,
  add column if not exists discord_interaction_id text,
  add column if not exists duplicate_fingerprint text,
  add column if not exists duplicate_count integer not null default 1,
  add column if not exists first_seen_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists staff_channel_message_id text,
  add column if not exists closed_at timestamptz,
  add column if not exists pruned_at timestamptz,
  add column if not exists details_pruned boolean not null default false,
  add column if not exists triage_notes text;

create index if not exists discord_feedback_reports_report_type_status_idx
  on discordos.discord_feedback_reports(report_type, status);

create index if not exists discord_feedback_reports_last_seen_at_idx
  on discordos.discord_feedback_reports(last_seen_at desc);

create index if not exists discord_feedback_reports_reporter_user_updated_idx
  on discordos.discord_feedback_reports(reporter_discord_user_id, updated_at desc);

create index if not exists discord_feedback_reports_duplicate_fingerprint_idx
  on discordos.discord_feedback_reports(duplicate_fingerprint);

comment on column discordos.discord_feedback_reports.summary is
  'DiscordOS-owned extracted feedback summary copied from the Fitness lifecycle model.';

comment on column discordos.discord_feedback_reports.details is
  'DiscordOS-owned extracted feedback detail body copied from the Fitness lifecycle model.';

comment on column discordos.discord_feedback_reports.steps_to_reproduce is
  'DiscordOS-owned extracted section override storage for bug/feature feedback cards.';
