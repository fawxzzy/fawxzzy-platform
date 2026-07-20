# ADR 0001: Shared identity and service activation

Status: `CURRENT`

## Context

DiscordOS, Fitness, and Mazer are moving toward one target Supabase platform. Consolidation must remove duplicate authentication identities without collapsing product boundaries, treating a service membership as payment, trusting user-editable metadata, or implying that one Auth database automatically shares browser sessions between origins.

This packet freezes contracts only. It makes no live Supabase or hosting change and contains no executable migration SQL.

The project registry is directional and closed by position: `bxtcuhkotumitoqtrcej` is the sole `target`; DiscordOS `nwexsktuuenfdegzrbut`, Fitness `lpswxoyfniocuhljgzbc`, and Mazer `geknvnrmktchljnyddwp` are `source` entries. Reversing those roles is contract-invalid.

## Decision

### Identity

- `auth.users.id` is the sole canonical human key. One person has exactly one target row in `auth.users` and one one-to-one `platform_shared.global_profiles` row.
- A source identity maps to the target identity through the append-only `platform_private.source_identity_ledger`.
- Re-key events preserve source project, source identifier, target identifier, version, decision provenance, and time in the future data model.
- Source identities are never merged merely because normalized email values match. Automatic source migration merges are forbidden.
- The known Fitness/Mazer normalized-email collision is recorded only as count `1` with `OWNER_DECISION`; the repository contains no PII.
- Identity linking and collision adjudication require a controlled reauthentication path. Manual or automatic linking cannot replace migration evidence.

FP-MAN-006 and FP-MAN-007 establish one globally unique canonical username for human accounts. Fitness is the initial canonical source for matched human profile fields; Mazer and DiscordOS are cross-check sources. A future normalized username key must be deterministic and database-unique, and claim/create/rename must be atomic and server-side. UI availability is advisory. Account identity, immutable source IDs and digests, rollback mappings, and username aliases/history remain distinct and preserved. Username alone is never identity evidence, and bots or service identities cannot become humans without explicit linkage evidence.

Every human account also has one immutable global `user_number`, independent of username, billing, and service membership. Existing accepted Fitness member/rank numbers are preserved exactly. FP-MAN-007 remains the verified-identity and global-number policy decision; FP-MAN-009 binds the root allocation/ordering contract. Future signups through any entry service allocate atomically from one monotonic authoritative database sequence; numbers are unique, never reused, and never renumbered. FP-MAN-009 fixes the legacy allocation order after the highest preserved Fitness number by earliest independently verified creation time, then source priority and immutable source account ID. Inventory and dry-run planning are allowed, but all backfill writes remain `BLOCKED` in this packet.

Supabase Auth may automatically link verified identities with the same email and supports authenticated manual linking. That provider behavior is not sufficient evidence for joining legacy source identities, so the migration ledger and adjudication gate remain authoritative.

### Global profile and user creation

A future Auth user-data trigger creates the global profile and atomically allocates the `user_number` for new human accounts. The target SQL packet must prove the trigger in a local Supabase-compatible environment because a failing Auth trigger can block signups.

The contracted trigger function is private, `SECURITY DEFINER`, fixed to an empty search path, derives the inserted subject from `NEW.id`, accepts no caller-selected user ID, and has execute revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`. It does not require `auth.uid()`, which is not the subject source in an Auth-service insert transaction. Caller-accessible RPCs remain separately required to derive and validate `auth.uid()`. If local verification cannot satisfy those boundaries for every admitted Auth creation path, SQL generation stops for a revised architecture decision; it must not weaken the guard silently.

### Service membership and activation

- The service catalog contains DiscordOS, Fitness, and Mazer.
- Fitness owns `fitness.profiles` and `fitness.user_entitlements`; Mazer owns `mazer.mazer_profiles` but has no generic entitlement/admin contract; DiscordOS remains operational with no human activation, profile, or entitlement contract until separately approved.
- Membership states are exactly `pending`, `active`, and `suspended`.
- The transition set is exactly seven entries. Global-signup discovery is authorized only by `system_account_creation`; first-visit activation, reuse, or suspended rejection is `authenticated_self`; suspension and controlled reinstatement are `privileged_service_control`. Missing, extra, duplicate, or contradictory transitions are invalid.
- Global signup may create a pending membership for discoverable Fitness and Mazer services.
- First authenticated visit to Fitness or Mazer calls one allowlisted activation boundary.
- The activation boundary derives the subject from `auth.uid()`; requests cannot contain a target user ID.
- Missing or pending membership becomes active in the same transaction that creates the product profile.
- An existing active membership and profile are idempotently reused.
- Suspended membership rejects self-activation and requires controlled reinstatement.
- Activation receipts are closed-world: `ACTIVATED` pairs only with `active`/`CREATED`, `REUSED` only with `active`/`REUSED`, and `REJECTED_SUSPENDED` only with `suspended`/`PRESERVED`.
- Membership identity is immutable `(user_id, service_id)`, revisions are monotonic, every transition is auditable, and clients cannot write membership rows.
- Existing human Fitness member numbers copy unchanged, preserve high-water, and are never reused, gap-filled, or renumbered. Discord IDs are external linkage evidence; usernames, display names, and member numbers are snapshots only and never linking or authorization evidence.
- Suspension preserves history. Hard delete is forbidden; retirement/tombstone behavior remains `BLOCKED`. The account portal reads only a sanitized authoritative membership model.

The future activation RPC is the only exposed `SECURITY DEFINER` function in this contract. It is explicitly allowlisted, uses an empty search path, validates `auth.uid()`, accepts no user ID argument, revokes default `PUBLIC` execute, grants execute only to `authenticated`, and is covered by negative tests.

### Authorization and billing

Membership means that a person may enter a service; it is not payment or subscription entitlement. Fitness entitlement remains product-owned; Mazer entitlement/admin semantics are deliberately undefined, and DiscordOS human entitlement remains unapproved.

RLS uses ownership predicates derived from `auth.uid()`. No policy or function may authorize from `user_metadata` or `raw_user_meta_data`, because authenticated users can edit that data. Update policies require both `USING` and `WITH CHECK`.

Product-profile policies require both row ownership and an active membership for the same caller. Row ownership preserves each accepted source relation: `fitness.profiles.id` and `mazer.mazer_profiles.user_id` bind directly to `(select auth.uid())`. Every admitted Fitness and Mazer membership subquery separately binds `m.user_id` directly to the same caller; an unqualified inner `user_id`, a missing membership predicate, or a suspended membership is never sufficient.

The contract declares no directly mutable `platform_shared.global_profiles` storage columns. The `authenticated` role therefore has `SELECT` only, no relation-wide `UPDATE`, an empty authenticated column-update set, and no direct update policy. `user_number`, canonical username and its normalized key, source identity/provenance, lifecycle state, and server-maintained timestamps are explicitly server-owned. The approved account-update surface does not imply a broad table grant; a later schema packet must name any mutable columns and their exact validation boundary before direct updates can be admitted.

The security matrix is closed-world. It admits exactly nine named relations, their complete grant and policy sets with exact predicates, and exactly two privileged functions: the Auth insert trigger and the activation RPC. Grants and RLS remain distinct proof layers. An added permissive policy, changed predicate or grant, or third privileged function fails deterministic validation even if it is otherwise well-shaped.

### Schema and API isolation

- `platform_shared` contains only global identity, service catalog, membership, and activation receipt contracts.
- `platform_private` contains non-exposed ledgers and privileged helpers.
- `discordos`, `fitness`, and `mazer` contain product profiles, entitlements, and transported product data.
- `public` contains no product tables.
- Data API exposure and grants are explicit; RLS is enabled and forced on every contracted relation.
- Source provenance is immutable, and transport cannot perform semantic cross-product table merges.

### Domains and browser sessions

The public hub is `https://fawxzzy.com`, with `https://www.fawxzzy.com` contracted to redirect to it. The neutral shared account origin is `https://account.fawxzzy.com`. Product origins are `https://fitness.fawxzzy.com` and `https://mazer.fawxzzy.com`. `https://fawxzzyfitness.com` remains a compatibility redirect until cutover proof admits retirement.

FP-MAN-012 ratifies the phase-1 Auth/security/session posture. Product UI exposes email/password only; email verification stays off, leaked-password protection stays on, and the provider-native minimum stays 10. There is no restrictive 20-character or application cap: account surfaces must accept at least 64 characters, should retain capacity for 128 or more, and must never truncate. Recent authentication is required for password changes. The current password is required for signed-in password and email changes, secure email change is required, and application/server enforcement remains required for email changes while the native hosted current-password capability is `UNKNOWN`. Social, phone, anonymous, magic-link-only, and enforced MFA remain deferred. TOTP is available and optional but unenforced; SMS MFA and passkeys remain `BLOCKED`; the AAL1 maximum age remains 900 seconds.

The account origin owns neutral sign-in, sign-out, account update, and recovery surfaces. Fitness may retain branded account UX while converging on shared Auth. Mazer requires an account section and canonical-username slot. Recovery is centralized at the verified route `https://account.fawxzzy.com/reset-password?recovery=1`, which is also present in the exact ordered redirect allowlist after the account callback and before the existing Fitness and Mazer callbacks.

Phase 1 shares Auth identity and database contracts while each origin establishes and stores its own browser session. Multiple devices are allowed and single-session enforcement is off. Absolute session lifetime is 2,592,000 seconds, inactivity timeout is 604,800 seconds, refresh compromise detection and rotation remain enabled, and the refresh-token reuse interval is 10 seconds. Cross-origin SSO is deferred to phase 2 and may use a PKCE/code or one-time backend exchange; shared refresh cookies and URL tokens are forbidden. Production redirects and recovery destinations are exact; wildcard and localhost production URLs are forbidden.

Managed CAPTCHA is required for public signup and password reset after secure installation. Provider class remains `UNKNOWN`; credentials and live configuration remain `BLOCKED`; no bypass allowlist is admitted. The independent passwordless-email provider toggle remains `UNKNOWN` and product UI exposure remains `BLOCKED`. Manual client identity linking is disabled. Privileged migration/reconciliation linking requires verified deterministic identity evidence and can never use username alone. JWT expiry and signing-key class remain `UNKNOWN`, and the contract structurally forbids secret-bearing key material.

Custom SMTP is `REQUIRED` before production Auth email delivery. FP-MAN-003 selects the operator's `fawxzzy.com` Google/Gmail service and `no-reply@account.fawxzzy.com`, subject to secure provider/domain setup. Credentials and live configuration do not belong in this repository. Provider application remains `BLOCKED` with `apply_admitted=false`; a later packet requires a fresh preimage, expected-state mutation authority, exact readback, and exact rollback evidence.

### Auth migration and lifecycle safety

Supabase documents that Auth tables and password hashes can migrate without forcing password resets solely because of migration. This three-source consolidation nevertheless preserves the target-owned signing identity and forbids copying any source JWT or service-role secret. Source tokens intentionally become invalid; controlled reauthentication establishes new account, Fitness, and Mazer sessions.

The import rehearsal contract is source-ready but execution-blocked. It is synthetic-only: it binds the exact reviewed source anchors, admits only adjudicated canonical human mappings, keeps compatible password hashes opaque, excludes sessions, tokens, cookies, secrets, keys, and provider settings, and emits only aggregate or one-way evidence. S0 requires an authoritative snapshot and S1 requires a complete re-export/diff covering additions, changes, and tombstones. A normalized-email or missing-evidence collision is quarantined; username/display-name, UUID, and password-hash equality never merge identities. A batch fails if an individual quarantine cannot be isolated. Memberships stage as pending and activate only after immutable mapping, profile parity, a new per-origin target session, `auth.uid()`-derived subject, and current recovery/rollback proof. TOTP portability remains `UNKNOWN` and defaults to re-enrollment. Preview is ordered account shell, Mazer, Fitness, then DiscordOS; it carries no production authority.

Matched human identities follow the adjudicated canonical mapping. Fitness supplies the canonical matched account/password record; Mazer-only humans may retain migrated hashes when evidence is sufficient; DiscordOS bot/service identities remain excluded without explicit human linkage. Product foreign keys re-key only through immutable source mappings. Three Auth schemas are never copied wholesale over one another. Storage object bodies remain a separate action-time inventory surface.

FP-MAN-010 establishes archive-first cleanup with exact disposition manifests. Raw retirement requires deterministic transformation, completeness, provenance, digest correlation, schema validity, replay/idempotency, backup/restore, retention, rollback, accepted derivative, and separate exact deletion authority. Uncertain data is quarantined; authoritative evidence, audit/security records, source-of-truth artifacts, required history, and unproven raw data are preserved. Destructive cleanup remains `BLOCKED`.

## Consequences

- Product teams gain one identity backbone without losing schema, authorization, or billing boundaries.
- Activation is retry-safe and auditable.
- Migration requires explicit identity adjudication and provenance rather than optimistic email matching.
- Global usernames and user numbers gain database-enforced uniqueness without becoming identity evidence or entitlement.
- Users may authenticate separately on account, Fitness, and Mazer origins in phase 1.
- SQL generation, local database verification, rehearsal, live configuration, import, cutover, and retirement remain later gated work.

## Alternatives rejected

- **Use membership as entitlement:** rejected because discovery and billing have different owners and revocation semantics.
- **Authorize with user metadata:** rejected because it is user-editable and unsuitable for authorization.
- **Put shared and product tables in `public`:** rejected because it obscures ownership and enlarges the exposed surface.
- **Automatically merge by normalized email:** rejected because collisions require human adjudication and controlled reauthentication.
- **Assume shared browser sessions from one Auth project:** rejected because identity consolidation and cross-origin session transfer are separate security problems.

## Current primary references

- Supabase user management and Auth trigger guidance: https://supabase.com/docs/guides/auth/managing-user-data
- Supabase identity linking: https://supabase.com/docs/guides/auth/auth-identity-linking
- Supabase RLS and metadata guidance: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase database function security: https://supabase.com/docs/guides/database/functions
- Supabase redirect URL guidance: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase custom SMTP guidance: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase password security: https://supabase.com/docs/guides/auth/password-security
- Supabase Auth user migration: https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects
- Supabase backup and Storage-body boundary: https://supabase.com/docs/guides/platform/backups
- Supabase API security and explicit exposure: https://supabase.com/docs/guides/api/securing-your-api
- NIST SP 800-63B password usability guidance: https://pages.nist.gov/800-63-4/sp800-63b.html
