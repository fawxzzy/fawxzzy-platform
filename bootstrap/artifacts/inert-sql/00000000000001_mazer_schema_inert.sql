-- APPLY_ADMITTED=false
-- INERT SOURCE PACKAGE: review and contained replay are required before any apply.

create schema if not exists mazer;

-- source supabase/migrations/20260709045557_mazer_progression_state.sql blob c388edfb799b4f90ba2e28efbe3065bbc2e8e4c1 raw_sha256 8df9389fd41e293814fbf8f65caef0555a077e55314d9ac58ef04dc78eb3411a
create table if not exists mazer.mazer_progression_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version > 0),
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
  last_completed_cycle_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

comment on table mazer.mazer_progression_states is
  'Per-user Mazer progression save state. The game remains local-first; this table is optional remote sync for signed-in users.';

comment on column mazer.mazer_progression_states.state is
  'Normalized LegacyProgressionState payload, intentionally compact and client-owned by the signed-in user.';

grant select, insert, update on mazer.mazer_progression_states to authenticated;

grant select, insert, update, delete on mazer.mazer_progression_states to service_role;

alter table mazer.mazer_progression_states enable row level security;

create policy "Mazer users can read their own progression"
on mazer.mazer_progression_states
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Mazer users can create their own progression"
on mazer.mazer_progression_states
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Mazer users can update their own progression"
on mazer.mazer_progression_states
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- source supabase/migrations/20260709045648_mazer_account_storage_contracts.sql blob d81ff74cae0293f30391deea6f8bdf7ef6fc5612 raw_sha256 ff1bc232ab0383acd3fbf4f6d5147a17639be5f2f45585cd26f148b18ec88943
alter table mazer.mazer_progression_states
  add column if not exists player_level integer not null default 1 check (player_level between 1 and 99),
  add column if not exists player_rank text not null default 'E' check (player_rank in ('E', 'D', 'C', 'B', 'A', 'S')),
  add column if not exists player_target_complexity integer not null default 24 check (player_target_complexity between 1 and 240),
  add column if not exists player_completed_cycles integer not null default 0 check (player_completed_cycles >= 0);

comment on column mazer.mazer_progression_states.player_level is
  'Indexed player-facing level extracted from the compact local-first progression state.';

comment on column mazer.mazer_progression_states.player_rank is
  'Indexed player-facing rank extracted from the compact local-first progression state.';

comment on column mazer.mazer_progression_states.player_target_complexity is
  'Indexed player target complexity used for future account/floor matchmaking and dashboards.';

comment on column mazer.mazer_progression_states.player_completed_cycles is
  'Indexed count of completed played-game cycles for the signed-in user.';

create table if not exists mazer.mazer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 64),
  selected_control_mode text not null default 'stick' check (selected_control_mode in ('stick', 'arrows')),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

comment on table mazer.mazer_profiles is
  'Per-user Mazer profile and player-facing preferences. This is game-owned and separate from other Fawxzzy apps.';

comment on column mazer.mazer_profiles.settings is
  'Player-facing settings that can sync across devices. Gameplay remains local-first if remote sync is disabled.';

create table if not exists mazer.mazer_ai_progression_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  runner_key text not null default 'menu-runner' check (runner_key ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  schema_version integer not null default 1 check (schema_version > 0),
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 16384),
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object' and octet_length(summary::text) <= 4096),
  level integer not null default 1 check (level between 1 and 99),
  rank text not null default 'E' check (rank in ('E', 'D', 'C', 'B', 'A', 'S')),
  target_complexity integer not null default 20 check (target_complexity between 1 and 240),
  completed_cycles integer not null default 0 check (completed_cycles >= 0),
  last_completed_cycle_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (user_id, runner_key)
);

comment on table mazer.mazer_ai_progression_states is
  'Per-account AI-runner progression. Kept separate from the human player track so demo AI learning can evolve independently.';

comment on column mazer.mazer_ai_progression_states.state is
  'Compact AI-runner progression track payload, not a full replay log.';

comment on column mazer.mazer_ai_progression_states.summary is
  'Small indexed/debuggable summary for future Playbook/Atlas/Cortex analysis without large replay storage.';

create table if not exists mazer.mazer_cycle_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  surface text not null check (surface in ('play', 'menu-demo')),
  maze_seed integer not null,
  maze_size integer not null check (maze_size > 0),
  route_quality text,
  start_cell jsonb not null default '{}'::jsonb check (jsonb_typeof(start_cell) = 'object'),
  goal_cell jsonb not null default '{}'::jsonb check (jsonb_typeof(goal_cell) = 'object'),
  path_length integer not null default 0 check (path_length >= 0),
  wrong_turns integer not null default 0 check (wrong_turns >= 0),
  backtracks integer not null default 0 check (backtracks >= 0),
  completion_time_ms integer not null default 0 check (completion_time_ms >= 0),
  reset_used boolean not null default false,
  control_mode text,
  average_frame_ms numeric(8, 3) not null default 0 check (average_frame_ms >= 0),
  receipt jsonb not null default '{}'::jsonb check (jsonb_typeof(receipt) = 'object' and octet_length(receipt::text) <= 8192),
  completed_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

comment on table mazer.mazer_cycle_receipts is
  'Compact per-cycle learning receipts for Mazer. Store summaries, not full high-volume telemetry streams.';

comment on column mazer.mazer_cycle_receipts.receipt is
  'Optional compact receipt payload. Keep bounded; do not store long raw frame/event streams here.';

create index if not exists mazer_progression_states_player_level_idx
  on mazer.mazer_progression_states (player_level, player_rank);

create index if not exists mazer_ai_progression_states_user_level_idx
  on mazer.mazer_ai_progression_states (user_id, level, rank);

create index if not exists mazer_cycle_receipts_user_completed_idx
  on mazer.mazer_cycle_receipts (user_id, completed_at desc);

create index if not exists mazer_cycle_receipts_surface_completed_idx
  on mazer.mazer_cycle_receipts (surface, completed_at desc);

revoke all on table mazer.mazer_profiles from anon;

revoke all on table mazer.mazer_ai_progression_states from anon;

revoke all on table mazer.mazer_cycle_receipts from anon;

grant select, insert, update on mazer.mazer_profiles to authenticated;

grant select, insert, update on mazer.mazer_ai_progression_states to authenticated;

grant select, insert on mazer.mazer_cycle_receipts to authenticated;

grant select, insert, update, delete on mazer.mazer_profiles to service_role;

grant select, insert, update, delete on mazer.mazer_ai_progression_states to service_role;

grant select, insert, update, delete on mazer.mazer_cycle_receipts to service_role;

alter table mazer.mazer_profiles enable row level security;

alter table mazer.mazer_ai_progression_states enable row level security;

alter table mazer.mazer_cycle_receipts enable row level security;

drop policy if exists "Mazer users can read their own profile" on mazer.mazer_profiles;

create policy "Mazer users can read their own profile"
on mazer.mazer_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Mazer users can create their own profile" on mazer.mazer_profiles;

create policy "Mazer users can create their own profile"
on mazer.mazer_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Mazer users can update their own profile" on mazer.mazer_profiles;

create policy "Mazer users can update their own profile"
on mazer.mazer_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Mazer users can read their own ai progression" on mazer.mazer_ai_progression_states;

create policy "Mazer users can read their own ai progression"
on mazer.mazer_ai_progression_states
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Mazer users can create their own ai progression" on mazer.mazer_ai_progression_states;

create policy "Mazer users can create their own ai progression"
on mazer.mazer_ai_progression_states
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Mazer users can update their own ai progression" on mazer.mazer_ai_progression_states;

create policy "Mazer users can update their own ai progression"
on mazer.mazer_ai_progression_states
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Mazer users can read their own cycle receipts" on mazer.mazer_cycle_receipts;

create policy "Mazer users can read their own cycle receipts"
on mazer.mazer_cycle_receipts
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Mazer users can create their own cycle receipts" on mazer.mazer_cycle_receipts;

create policy "Mazer users can create their own cycle receipts"
on mazer.mazer_cycle_receipts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- source supabase/migrations/20260709045725_mazer_tighten_public_table_grants.sql blob 85f723c96e82773fc5cc99c69b7fb5ba1db320f1 raw_sha256 4bf5fd2cc2f4156615461d144279ed67cfb3d65a5277e1acdda4c2b0c2fbd6c5
revoke all on table mazer.mazer_progression_states from anon, authenticated, service_role;

revoke all on table mazer.mazer_profiles from anon, authenticated, service_role;

revoke all on table mazer.mazer_ai_progression_states from anon, authenticated, service_role;

revoke all on table mazer.mazer_cycle_receipts from anon, authenticated, service_role;

grant select, insert, update on mazer.mazer_progression_states to authenticated;

grant select, insert, update on mazer.mazer_profiles to authenticated;

grant select, insert, update on mazer.mazer_ai_progression_states to authenticated;

grant select, insert on mazer.mazer_cycle_receipts to authenticated;

grant select, insert, update, delete on mazer.mazer_progression_states to service_role;

grant select, insert, update, delete on mazer.mazer_profiles to service_role;

grant select, insert, update, delete on mazer.mazer_ai_progression_states to service_role;

grant select, insert, update, delete on mazer.mazer_cycle_receipts to service_role;

-- source supabase/migrations/20260716211513_account_state_revisions.sql blob f8803b9660a96acbca3f94b2130fd71c86f63ed3 raw_sha256 ce2916685ab9a7734988a1e0403bb03818f78c6f2fbcc9832ce5f552086448ae
alter table mazer.mazer_progression_states
  add column if not exists revision bigint not null default 0 check (revision >= 0);

alter table mazer.mazer_profiles
  add column if not exists revision bigint not null default 0 check (revision >= 0);

comment on column mazer.mazer_progression_states.revision is
  'Monotonic optimistic-concurrency revision. Authenticated clients must compare before replacing canonical account progression.';

comment on column mazer.mazer_profiles.revision is
  'Monotonic optimistic-concurrency revision for player-facing settings synced across devices.';
