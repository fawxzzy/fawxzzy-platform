# ADR 0001: Shared identity and service activation

Status: `CURRENT`

## Context

DiscordOS, Fitness, and Mazer are moving toward one target Supabase platform. Consolidation must remove duplicate authentication identities without collapsing product boundaries, treating a service membership as payment, trusting user-editable metadata, or implying that one Auth database automatically shares browser sessions between origins.

This packet freezes contracts only. It makes no live Supabase or hosting change and contains no executable migration SQL.

## Decision

### Identity

- One person has exactly one target row in `auth.users` and one `platform_shared.global_profiles` row.
- A source identity maps to the target identity through the append-only `platform_private.source_identity_ledger`.
- Re-key events preserve source project, source identifier, target identifier, version, decision provenance, and time in the future data model.
- Source identities are never merged merely because normalized email values match. Automatic source migration merges are forbidden.
- The known Fitness/Mazer normalized-email collision is recorded only as count `1` with `OWNER_DECISION`; the repository contains no PII.
- Identity linking and collision adjudication require a controlled reauthentication path. Manual or automatic linking cannot replace migration evidence.

FP-MAN-006 and FP-MAN-007 establish one globally unique canonical username for human accounts. Fitness is the initial canonical source for matched human profile fields; Mazer and DiscordOS are cross-check sources. A future normalized username key must be deterministic and database-unique, and claim/create/rename must be atomic and server-side. UI availability is advisory. Account identity, immutable source IDs and digests, rollback mappings, and username aliases/history remain distinct and preserved. Username alone is never identity evidence, and bots or service identities cannot become humans without explicit linkage evidence.

Every human account also has one immutable global `user_number`, independent of username, billing, and service membership. Existing accepted Fitness member/rank numbers are preserved exactly. Future signups through any entry service allocate atomically from one monotonic authoritative database sequence; numbers are unique, never reused, and never renumbered. FP-MAN-009 fixes the legacy allocation order after the highest preserved Fitness number by earliest independently verified creation time, then source priority and immutable source account ID. Inventory and dry-run planning are allowed, but all backfill writes remain `BLOCKED` in this packet.

Supabase Auth may automatically link verified identities with the same email and supports authenticated manual linking. That provider behavior is not sufficient evidence for joining legacy source identities, so the migration ledger and adjudication gate remain authoritative.

### Global profile and user creation

A future Auth user-data trigger creates the global profile and atomically allocates the `user_number` for new human accounts. The target SQL packet must prove the trigger in a local Supabase-compatible environment because a failing Auth trigger can block signups.

The contracted trigger function is private, `SECURITY DEFINER`, fixed to an empty search path, derives the inserted subject from `NEW.id`, accepts no caller-selected user ID, and has execute revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`. It does not require `auth.uid()`, which is not the subject source in an Auth-service insert transaction. Caller-accessible RPCs remain separately required to derive and validate `auth.uid()`. If local verification cannot satisfy those boundaries for every admitted Auth creation path, SQL generation stops for a revised architecture decision; it must not weaken the guard silently.

### Service membership and activation

- The service catalog contains DiscordOS, Fitness, and Mazer.
- Membership states are exactly `pending`, `active`, and `suspended`.
- Global signup may create a pending membership for discoverable Fitness and Mazer services.
- First authenticated visit to Fitness or Mazer calls one allowlisted activation boundary.
- The activation boundary derives the subject from `auth.uid()`; requests cannot contain a target user ID.
- Missing or pending membership becomes active in the same transaction that creates the product profile.
- An existing active membership and profile are idempotently reused.
- Suspended membership rejects self-activation and requires controlled reinstatement.

The future activation RPC is the only exposed `SECURITY DEFINER` function in this contract. It is explicitly allowlisted, uses an empty search path, validates `auth.uid()`, accepts no user ID argument, revokes default `PUBLIC` execute, grants execute only to `authenticated`, and is covered by negative tests.

### Authorization and billing

Membership means that a person may enter a service; it is not payment or subscription entitlement. Paid access stays in product-owned entitlement relations under `discordos`, `fitness`, and `mazer`.

RLS uses ownership predicates derived from `auth.uid()`. No policy or function may authorize from `user_metadata` or `raw_user_meta_data`, because authenticated users can edit that data. Update policies require both `USING` and `WITH CHECK`.

The security matrix is closed-world. It admits exactly twelve named relations, their complete grant and policy sets with exact predicates, and exactly two privileged functions: the Auth insert trigger and the activation RPC. An added permissive policy, changed predicate or grant, or third privileged function fails deterministic validation even if it is otherwise well-shaped.

### Schema and API isolation

- `platform_shared` contains only global identity, service catalog, membership, and activation receipt contracts.
- `platform_private` contains non-exposed ledgers and privileged helpers.
- `discordos`, `fitness`, and `mazer` contain product profiles, entitlements, and transported product data.
- `public` contains no product tables.
- Data API exposure and grants are explicit; RLS is enabled and forced on every contracted relation.
- Source provenance is immutable, and transport cannot perform semantic cross-product table merges.

### Domains and browser sessions

The public hub is `https://fawxzzy.com`, with `https://www.fawxzzy.com` contracted to redirect to it. The neutral shared account origin is `https://account.fawxzzy.com`. Product origins are `https://fitness.fawxzzy.com` and `https://mazer.fawxzzy.com`. `https://fawxzzyfitness.com` remains a compatibility redirect until cutover proof admits retirement.

Phase 1 uses email/password with email verification off, leaked-password protection on, and a provider-native minimum length of 10. There is no restrictive 20-character or application cap: account surfaces must accept at least 64 characters, should retain capacity for 128 or more, and must never truncate. No native provider maximum field is claimed. Social, phone, anonymous, magic-link-only, and enforced MFA are deferred; TOTP may be considered later.

The account origin owns neutral sign-in, sign-out, account update, and recovery surfaces. Fitness may retain branded account UX while converging on shared Auth. Mazer requires an account section and canonical-username slot. Recovery is centralized on the account origin.

Phase 1 shares Auth identity and database contracts while each origin establishes and stores its own browser session. Cross-origin SSO is deferred to phase 2 and may use a PKCE/code or one-time backend exchange; shared refresh cookies and URL tokens are forbidden. Production redirects and recovery destinations are exact; wildcard production redirects are forbidden.

Custom SMTP is `REQUIRED` before production Auth email delivery. FP-MAN-003 selects the operator's `fawxzzy.com` Google/Gmail service and `no-reply@account.fawxzzy.com`, subject to secure provider/domain setup. Credentials and live configuration do not belong in this repository.

### Auth migration and lifecycle safety

Supabase documents that Auth tables and password hashes can migrate without forcing password resets solely because of migration. This three-source consolidation nevertheless preserves the target-owned signing identity and forbids copying any source JWT or service-role secret. Source tokens intentionally become invalid; controlled reauthentication establishes new account, Fitness, and Mazer sessions.

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
