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
- Never use username alone as identity evidence. Keep the immutable account identifier separate from the global canonical username.
- Preserve accepted Fitness user numbers exactly. Global `user_number` allocation is monotonic, immutable, never reused, and independent of membership or billing.
- Preserve the target-owned JWT signing identity. Never copy a source JWT or service-role secret into the target.
- Treat cleanup as classify, normalize, deduplicate, archive, and quarantine—not deletion authority.
- Prefer reversible cutover steps. Source pause comes after proven target operation and rollback readiness; deletion is a separate destructive decision.
- Generate SQL only in the next separately authorized packet and prove it locally before any target write.

## Gate 0: Contract freeze

Entry: repository bootstrap admitted.

Required evidence:

1. Versioned project, service, identity, membership, activation, migration, cutover, domain/session, and security contracts.
2. Position-bound registry roles, exact service-to-schema/profile/entitlement mappings, and the complete seven-entry membership lifecycle with explicit authorization semantics.
3. Closed status vocabulary and machine-readable blocked operations.
4. Deterministic schema, semantic, negative, path, line-ending, JSON, secret, and machine-path checks.
5. Hosted CI green on the exact contract head.
6. Approved FP-MAN-001 through FP-MAN-010 policy contracts, with execution gates still independently blocked.

Exit: draft PR reviewed and accepted. This gate does not admit a target write.

## Gate 1: Read-only source inventories

Entry: Gate 0 accepted and a new packet names each readable source.

Required evidence per source:

- schema, extensions, functions, triggers, policies, grants, Auth configuration, Storage, Functions, Cron, Realtime, and provider-setting manifests;
- row counts and content-addressed data manifests without repository PII;
- identity counts, provider distribution, and collision counts without exposed identities;
- accepted Fitness user-number inventory, highest preserved number, independently verified creation-time evidence, and deterministic source-priority denominator;
- username normalization/collision inventory and human-versus-service identity classification;
- application readers/writers and environment dependency inventory;
- backup and restore capability.
- Storage object-body inventory re-read at action time; the current known denominator of zero is not action-time proof.
- DiscordOS board, event, projection, readback, scheduler, update-draft, Auth, rollback, and observation behavior denominators.

Exit: denominators are frozen and unknowns remain `UNKNOWN` rather than inferred.

## Gate 2: SQL and transport generation

Entry: inventories complete, collision policy accepted, and an isolated verification environment available.

Required evidence:

- ordered schema creation for `platform_shared`, `platform_private`, `discordos`, `fitness`, and `mazer`;
- explicit schema exposure, grants, RLS policies, trigger, and function definitions matching the security matrix;
- target/source direction matching the position-bound project registry and product relations matching each service's exact owning schema;
- lifecycle generation matching all seven admitted transitions and their `system_account_creation`, `authenticated_self`, or `privileged_service_control` authorization boundary;
- fixed search paths, `NEW.id` derivation in the Auth insert trigger, `auth.uid()` guards only on caller-accessible RPCs, revoked default execute, and negative authorization tests;
- product-profile predicates that bind membership rows directly to `auth.uid()` and require the caller's service membership to be active;
- no relation-wide authenticated `UPDATE` on the global profile, no direct update policy, and an empty direct column-update set until a later contract explicitly declares mutable profile columns;
- a deterministic normalized global-username key with a database `UNIQUE` boundary and atomic server-side claim/create/rename;
- a global `user_number` field on the global profile with an authoritative sequence, uniqueness, post-migration non-nullability, immutable allocation, and exact Fitness-number preservation;
- transport mappings that preserve source keys and immutable re-key provenance;
- idempotent apply and rollback plans;
- proof that no product table is created in `public`;
- no executable backfill until the aggregate collision and numbering dry-runs pass the separately admitted write gate.

Exit: generated artifacts pass local Supabase-compatible verification twice. Failure of the Auth trigger or activation guard blocks the packet.

## Gate 3: Isolated rehearsal

Entry: generated artifacts accepted; rehearsal target explicitly named.

Required evidence:

- clean apply, replay, rollback, restore, and re-apply;
- count and checksum parity by source relation;
- Auth import rehearsal with collision quarantine and controlled reauthentication receipts;
- activation outcomes for missing, pending, active, and suspended memberships, with receipts limited to `ACTIVATED`/`active`/`CREATED`, `REUSED`/`active`/`REUSED`, or `REJECTED_SUSPENDED`/`suspended`/`PRESERVED`;
- negative RLS and function tests for anonymous, wrong-user, suspended, stale-session, and direct-write attempts;
- negative policy tests for unqualified or tautological membership predicates, missing membership, suspended membership, relation-wide global-profile update, and every immutable or server-owned column grant;
- negative closed-world tests proving any extra policy, predicate/grant drift, or third privileged function fails;
- negative lifecycle tests for missing, extra, duplicate, contradictory, and suspended self-activation transitions; negative catalog and registry tests for cross-service relation swaps and role reversal;
- username collision, advisory-availability race, user-number concurrency, reuse, renumbering, and bot/service exclusion tests;
- adjudicated Auth migration rehearsal proving password-hash preservation where accepted, target-owned signing identity, source-session invalidation, and controlled per-origin reauthentication;
- exact redirect, recovery, and custom SMTP configuration plan with no live mutation.
- current encrypted independent backup and retention receipts under FP-MAN-013;
- one quarantined restore-to-new-project rehearsal with the closed external-effects denominator disabled;
- immutable source authorization of the DiscordOS external-effect authenticator policy before signature verification; action receipts cannot substitute the key identity, public key, verifier, algorithm, signature domain, policy version, or status, and the operational anchor remains `BLOCKED` until a separately authorized source change installs it;
- aggregate catalog, security, application-data, Auth-identity, and Auth-control-plane parity;
- measured RPO/RTO evidence and explicit objective acceptance;
- a separate Storage object-body recovery receipt when the object denominator is non-zero.

Exit: parity and rollback evidence are exact and reproducible.

The provider's daily Physical backup is one recovery layer, not the independent encrypted export. Neither a database backup nor a database-only clone proves Storage object-body coverage. Exact cadence, retention, destination, key installation, alert channel, export/Auth mechanism, numerical objectives, provider readback, and restore cost remain action-time gates documented in `docs/runbooks/micro-recovery.md`.

## Gate 4: Bounded target migration

Entry: action-time approval names the target project, migration artifacts, rollback anchor, and maintenance window.

Sequence:

1. Capture fresh source manifests and establish the write-control window.
2. Apply reviewed schema and security artifacts.
3. Import Auth identities through the accepted mapping, preserve accepted hashes without copying source signing secrets, invalidate source sessions, and quarantine collisions.
4. Import each product schema without semantic cross-product merges.
5. Verify counts, checksums, foreign keys, policies, grants, functions, and application probes.
6. Record an immutable receipt before releasing the next gate.

Rollback: stop target writes, restore the pre-migration target anchor, keep source routing unchanged, and preserve evidence. No source pause or deletion is implied.

## Gate 5: Application cutover

Entry: target parity, redirect/recovery readiness, SMTP readiness, rollback rehearsal, and separately named environment and production approvals.

Sequence:

1. Cut over one application lane at a time.
2. Establish per-origin phase-1 sessions; do not add cross-origin SSO. Preserve the `fawxzzyfitness.com` compatibility redirect.
3. Verify neutral account sign-in, sign-out, update, centralized recovery, product-branded Auth, sign-up, first-visit activation, existing membership reuse, suspended rejection, password capacity without truncation, and product entitlement enforcement.
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

Before any raw-data or project retirement, produce an exact archive-first disposition manifest. Each item must be classified as raw, derived, canonical, duplicate, obsolete, quarantined, immutable evidence, retention-bound, or secret-bearing. Retirement requires accepted derivative coverage, deterministic replay, complete provenance and digest correlation, schema validity, idempotency, backup/restore, retention satisfaction, rollback, DiscordOS functional parity, observation, and separate exact action-time deletion authority.

## DiscordOS isolated-rehearsal boundary

DiscordOS schema or data may not enter an isolated rehearsal until the product-specific external-effect manifest passes alongside the generic twelve-unit denominator. The manifest must correlate the accepted source snapshot, exact source and package commits/digests, all six Edge versions and digest classes, the sole Cron/helper path, extension versions, and every zero or non-zero aggregate external-effect surface to the named rehearsal snapshot. The rehearsal identity must be a valid disposable project distinct from the shared target, DiscordOS source, and every additional source or production project explicitly protected by the manifest; missing, duplicate, substituted, or malformed protected identities block the rehearsal.

The inert schema stage may precede provider extension installation only when the Data API is disabled, outbound network access is denied, no application credentials or traffic exist, and Edge, Cron, helper activation, aliases, provider writes, and `apply_admitted` all remain held. Shared Auth or application data still waits for the accepted independent backup and quarantined restore rehearsal.

`pg_net` 0.20.0-to-0.20.4 static parity does not admit runtime use. Behavioral acceptance requires the complete disposable synthetic-sink test denominator and two zero-growth observations separated by more than two source Cron intervals. Each observation and per-effect proof must be at or inside the contract-owned 7,200-second freshness boundary under an injected action-time clock, with exact UTC-second timestamps in monotonic order; action payloads cannot widen that maximum. Any enabled effect, stale or future evidence, missing or duplicate identity, circular digest, source/target/snapshot mismatch, positive enabled count, unverified receipt, or raw value-bearing evidence blocks rehearsal.

Per-effect acceptance additionally requires an actual domain-separated Ed25519 signature verified against the immutable public trust-anchor identity in the versioned manifest. The signed subject correlates the manifest, effect, observation, external receipt, verifier/key, and result metadata. Self-asserted status or digests, unknown trust identities, malformed keys or signatures, invalid signatures, replay, and any correlated-field substitution fail closed. The reusable source example keeps the operational anchor `BLOCKED`; a later action packet must install and read back an authorized public anchor without introducing private signing material into this repository.

Rollback is evidence-preserving: keep egress denied, deactivate scheduling first, withdraw credentials and routing, preserve queue/history and sink receipts, and restore only the captured rehearsal preimage or discard the disposable project. The active DiscordOS source, PR #105, PR #106, and production behavior remain outside this source contract and cannot be changed by implication.

## Current receipt

- Target writes: `BLOCKED`
- Data import: `BLOCKED`
- Auth import: `BLOCKED`
- Vercel environment cutover: `BLOCKED`
- Production deployment: `BLOCKED`
- Source pause: `BLOCKED`
- Source deletion: `BLOCKED`
- Executable migration SQL: `NOT_APPLICABLE` to this packet
