# Consolidated platform migration program

Status: `BLOCKED`

## Purpose

Move DiscordOS, Fitness, and Mazer to the target platform while preserving source provenance, product semantics, rollback capability, and separately approved retirement. This is a control runbook, not an execution script.

## Non-negotiable controls

- Keep target and all source projects active until their explicit gates close.
- Never store or print keys, tokens, passwords, connection strings, user data, or provider link state in this repository.
- Never merge product tables semantically during transport. Preserve source schema, table, primary key, and content-addressed provenance.
- Never infer that membership grants paid access.
- Never use normalized email alone to merge source identities.
- Prefer reversible cutover steps. Source pause comes after proven target operation and rollback readiness; deletion is a separate destructive decision.
- Generate SQL only in the next separately authorized packet and prove it locally before any target write.

## Gate 0: Contract freeze

Entry: repository bootstrap admitted.

Required evidence:

1. Versioned project, service, identity, membership, activation, migration, cutover, domain/session, and security contracts.
2. Closed status vocabulary and machine-readable blocked operations.
3. Deterministic schema, semantic, negative, path, line-ending, JSON, secret, and machine-path checks.
4. Hosted CI green on the exact contract head.

Exit: draft PR reviewed and accepted. This gate does not admit a target write.

## Gate 1: Read-only source inventories

Entry: Gate 0 accepted and a new packet names each readable source.

Required evidence per source:

- schema, extensions, functions, triggers, policies, grants, Auth configuration, Storage, Functions, Cron, Realtime, and provider-setting manifests;
- row counts and content-addressed data manifests without repository PII;
- identity counts, provider distribution, and collision counts without exposed identities;
- application readers/writers and environment dependency inventory;
- backup and restore capability.

Exit: denominators are frozen and unknowns remain `UNKNOWN` rather than inferred.

## Gate 2: SQL and transport generation

Entry: inventories complete, collision policy accepted, and an isolated verification environment available.

Required evidence:

- ordered schema creation for `platform_shared`, `platform_private`, `discordos`, `fitness`, and `mazer`;
- explicit schema exposure, grants, RLS policies, trigger, and function definitions matching the security matrix;
- fixed search paths, `auth.uid()` guards, revoked default execute, and negative authorization tests;
- transport mappings that preserve source keys and immutable re-key provenance;
- idempotent apply and rollback plans;
- proof that no product table is created in `public`.

Exit: generated artifacts pass local Supabase-compatible verification twice. Failure of the Auth trigger or activation guard blocks the packet.

## Gate 3: Isolated rehearsal

Entry: generated artifacts accepted; rehearsal target explicitly named.

Required evidence:

- clean apply, replay, rollback, restore, and re-apply;
- count and checksum parity by source relation;
- Auth import rehearsal with collision quarantine and controlled reauthentication receipts;
- activation outcomes for missing, pending, active, and suspended memberships;
- negative RLS and function tests for anonymous, wrong-user, suspended, stale-session, and direct-write attempts;
- exact redirect, recovery, and custom SMTP configuration plan with no live mutation.

Exit: parity and rollback evidence are exact and reproducible.

## Gate 4: Bounded target migration

Entry: action-time approval names the target project, migration artifacts, rollback anchor, and maintenance window.

Sequence:

1. Capture fresh source manifests and establish the write-control window.
2. Apply reviewed schema and security artifacts.
3. Import Auth identities through the accepted mapping and quarantine collisions.
4. Import each product schema without semantic cross-product merges.
5. Verify counts, checksums, foreign keys, policies, grants, functions, and application probes.
6. Record an immutable receipt before releasing the next gate.

Rollback: stop target writes, restore the pre-migration target anchor, keep source routing unchanged, and preserve evidence. No source pause or deletion is implied.

## Gate 5: Application cutover

Entry: target parity, redirect/recovery readiness, SMTP readiness, rollback rehearsal, and separately named environment and production approvals.

Sequence:

1. Cut over one application lane at a time.
2. Establish per-origin phase-1 sessions; do not add cross-origin SSO.
3. Verify sign-up, sign-in, recovery, first-visit activation, existing membership reuse, suspended rejection, and product entitlement enforcement.
4. Observe target and source readers, writers, errors, and Auth delivery.
5. Roll back the lane if parity or authorization evidence regresses.

Vercel environment changes and production deployment remain separate actions even when migration is accepted.

## Gate 6: Source pause

Entry: sustained observation shows zero required source readers/writers and an accepted rollback window has elapsed.

Required evidence:

- target traffic and data parity;
- no remaining application, automation, or operator dependency on the source;
- fresh restorable backups;
- named source-pause approval.

Pause is reversible. A paused source is not retired or deletable by implication.

## Gate 7: Retirement and deletion

Entry: each named source has independently passed pause, observation, zero-traffic, legal/retention, and restore gates.

Deletion requires a separate destructive action-time approval naming the exact project. Approval for one source does not apply to another. If any evidence is missing, the status remains `BLOCKED` or `UNKNOWN` and the source stays active or reversibly paused.

## Current receipt

- Target writes: `BLOCKED`
- Data import: `BLOCKED`
- Auth import: `BLOCKED`
- Vercel environment cutover: `BLOCKED`
- Production deployment: `BLOCKED`
- Source pause: `BLOCKED`
- Source deletion: `BLOCKED`
- Executable migration SQL: `NOT_APPLICABLE` to this packet
