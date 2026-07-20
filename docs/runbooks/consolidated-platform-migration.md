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
- Keep JWT expiry and signing class `UNKNOWN` until safely read; never store signing material. Keep Auth provider application `BLOCKED` and `apply_admitted=false` until fresh preimage, bounded expected-state authority, exact readback, and rollback are admitted.
- Expose only email/password in phase-1 product UI. Do not expose passwordless email, enable client identity linking, add a shared-domain refresh cookie, or place Auth tokens in URLs.
- Treat cleanup as classify, normalize, deduplicate, archive, and quarantine—not deletion authority.
- Prefer reversible cutover steps. Source pause comes after proven target operation and rollback readiness; deletion is a separate destructive decision.
- Generate SQL only in the next separately authorized packet and prove it locally before any target write.
- Treat the 122-unit Platform package as provider-ledger canonical history. DiscordOS and Mazer current repository chains are discovery evidence only and cannot silently refresh, rename, remove, or replace accepted historical bytes or paths.

## Gate 0: Contract freeze

Entry: repository bootstrap admitted.

Required evidence:

1. Versioned project, service, identity, membership, activation, migration, cutover, domain/session, and security contracts.
2. Position-bound registry roles, `auth.users.id` as the sole canonical human key, exact service-to-schema/profile/entitlement mappings, and the complete seven-entry membership lifecycle with immutable `(user_id, service_id)`, monotonic revision, auditable transitions, and no client writes.
3. Closed status vocabulary and machine-readable blocked operations.
4. Deterministic schema, semantic, negative, path, line-ending, JSON, secret, and machine-path checks.
5. Hosted CI green on the exact contract head.
6. Approved FP-MAN-001 through FP-MAN-010 policy contracts, with execution gates still independently blocked.
7. Closed provider-canonical provenance evidence for the 17 DiscordOS and 4 Mazer historical units, bound to the accepted 122-unit package without promoting apply authority.

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
- product-profile predicates that preserve `fitness.profiles.id` and `mazer.mazer_profiles.user_id` as their respective source-owned user keys, bind membership rows directly to `auth.uid()`, and require the caller's service membership to be active;
- activation that accepts no caller-supplied user ID and atomically creates only `fitness.profiles` or `mazer.mazer_profiles`; DiscordOS human activation/profile/entitlement remains unapproved;
- Fitness member numbers that copy unchanged, preserve high-water, and never reuse, fill gaps, or renumber; Mazer generic entitlement/admin semantics remain undefined;
- authorization predicates that never use user metadata, usernames, display names, Discord IDs, or Fitness numbers; account-portal membership reads remain sanitized and authoritative;
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
- negative policy tests for substituted product-profile owner keys, unqualified or tautological membership predicates, missing membership, suspended membership, relation-wide global-profile update, and every immutable or server-owned column grant;
- negative closed-world tests proving any extra policy, predicate/grant drift, or third privileged function fails;
- negative lifecycle tests for missing, extra, duplicate, contradictory, and suspended self-activation transitions; negative catalog and registry tests for cross-service relation swaps and role reversal;
- username collision, advisory-availability race, user-number concurrency, reuse, renumbering, and bot/service exclusion tests;
- adjudicated Auth migration rehearsal proving password-hash preservation where accepted, target-owned signing identity, source-session invalidation, and controlled per-origin reauthentication;
- exact ordered redirect and verified recovery route plan; recent-auth/current-password/secure-email-change enforcement; CAPTCHA, optional TOTP, blocked SMS/passkeys, session lifetime/inactivity/reuse controls, disabled manual identity linking, and custom SMTP configuration, all with no live mutation;
- deterministic negative proof for all 24 domain/session drift classes, including unknown capability promotion, secret-bearing JWT fields, provider-gate promotion, and regression of password, verification, SMTP, per-origin, cookie, or URL-token protections;
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

Before any real Auth import, run the separately authorized synthetic-only shared-Auth import and controlled-reauthentication rehearsal. Freeze S0 authoritative evidence, then require S1 complete re-export/diff for additions, changes, and tombstones. Quarantine normalized-email, missing, or contradictory identity evidence; never merge on username, display name, cross-project UUID, or password-hash equality. Exclude source sessions, tokens, cookies, signing material, keys, and provider settings. Stage memberships as pending; activate only when immutable mapping, exact profile parity, a new per-origin target session, `auth.uid()` binding, and recovery/rollback evidence all pass. The rehearsal preview order is account shell, Mazer, Fitness, DiscordOS. It is `EXECUTION_BLOCKED` until a separate target packet admits it.

Application-data transport is governed by `contracts/v1/transport/app-data-transport-contract.json`, its closed public receipt, and the append-only mutation-journal contract. The fixed lifecycle is S0 complete snapshot, source-write continuation, S1 complete key-and-row diff, explicit tombstones, authorized write barrier, S2 final diff, CAS apply, parity, observation, and only then separately approved source pause. S1 and S2 compare complete primary-key sets and canonical row digests; timestamps, revisions, and high-water marks are accelerators only.

For each later product adapter, declare parent-first insert/update order, child-first delete order, and a staging plan plus synthetic proof for every foreign-key cycle. Treat a reappearing tombstoned key as an explicit resurrection or new generation. Compare-and-swap may act only on `ABSENT` or an exact expected digest. Matching committed mutations are reused idempotently; conflicts are quarantined and never overwritten. Keep derived caches excluded or rebuild them only after authoritative parity, and keep all external effects quarantined throughout rehearsal and rollback.

The mutation journal is append-only and must cover every committed mutation, idempotent reuse, and conflict quarantine. Rollback follows reverse dependency and reverse commit order using digest-bound preimage and postimage evidence. Catch-up back into a source is a separate mutation requiring separate authority. Public receipts remain aggregate-only and cannot contain raw rows, identifiers, user-number or UUID ranges, secrets, project references, SQL, payloads, provider responses, or machine paths.

Rollback: stop target writes, restore the pre-migration target anchor, keep source routing unchanged, and preserve evidence. No source pause or deletion is implied.

## Gate 5: Application cutover

Entry: target parity, redirect/recovery readiness, SMTP readiness, rollback rehearsal, and separately named environment and production approvals.

Sequence:

1. Cut over one application lane at a time.
2. Establish per-origin phase-1 sessions with multiple devices allowed, single-session enforcement off, a 30-day absolute lifetime, a 7-day inactivity timeout, refresh compromise detection/rotation, and a 10-second reuse interval. Do not add cross-origin SSO. Preserve the `fawxzzyfitness.com` compatibility redirect.
3. Verify neutral account sign-in, sign-out, update, the exact account reset route, product-branded Auth, email/password-only UI, recent-auth/current-password account changes, secure email change, managed CAPTCHA, optional unenforced TOTP, disabled client identity linking, sign-up, first-visit activation, existing membership reuse, suspended rejection, password capacity without truncation, and product entitlement enforcement.
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

`pg_net` 0.20.0-to-0.20.4 static parity does not admit runtime use. Behavioral acceptance requires an independently authenticated disposable synthetic-sink receipt covering the complete ordered nine-case denominator, exact source/target extension versions, test-manifest and run identities, sanitized expected/actual outcome classes, and canonical per-case digests. The two zero-growth observations must also be independently authenticated, separated by more than two source Cron intervals, and bind unique pre/post readback identities, canonical aggregate counts and digests, the protected source, disposable rehearsal, snapshot/run, and independent receipt. Each observation, behavioral result, and per-effect proof must be at or inside the contract-owned 7,200-second freshness boundary under an injected action-time clock, with exact UTC-second timestamps in monotonic order; action payloads cannot widen that maximum. Any enabled effect, stale or future evidence, missing or duplicate identity, circular or self-reported digest, source/target/snapshot/run/version mismatch, positive growth, incomplete or failing test case, unverified receipt, signer substitution, or raw value-bearing evidence blocks rehearsal.

Per-effect acceptance additionally requires an actual domain-separated Ed25519 signature verified against the immutable public trust-anchor identity in the versioned manifest. The signed subject correlates the manifest, effect, observation, external receipt, verifier/key, and result metadata. The authentication result uses canonical lifecycle `status: CURRENT` and a distinct closed `verification.outcome: PASS`; both are signed, both are required, and neither substitutes for cryptographic verification. Self-asserted status or digests, status/verification conflation, unknown aliases or case variants, omitted verification, `PASS` without a valid signature, a valid signature with a non-`CURRENT` lifecycle, unknown trust identities, malformed keys or signatures, invalid signatures, replay, and any correlated-field substitution fail closed. The reusable source example keeps the operational anchor `BLOCKED`; a later action packet must install and read back an authorized public anchor without introducing private signing material into this repository.

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
- Generic application-data contract: `SOURCE_READY`
- Application-data execution and all three product adapters: `BLOCKED`
