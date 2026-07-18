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

comment on table discordos.runtime_health_cron_runs is
  'Private DiscordOS runtime-health cron execution receipts. Service-role only; no public policies.';

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

-- Effective function ACL closure: no application role is authorized in this inert package.
revoke execute on function discordos.set_updated_at() from PUBLIC, anon, authenticated, service_role;
