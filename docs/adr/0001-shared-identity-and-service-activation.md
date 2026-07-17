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

Supabase Auth may automatically link verified identities with the same email and supports authenticated manual linking. That provider behavior is not sufficient evidence for joining legacy source identities, so the migration ledger and adjudication gate remain authoritative.

### Global profile and user creation

A future Auth user-data trigger creates the global profile. The target SQL packet must prove the trigger in a local Supabase-compatible environment because a failing Auth trigger can block signups.

The contracted trigger function is private, `SECURITY DEFINER`, fixed to an empty search path, checks `auth.uid()` against its subject, accepts no caller-selected user ID, and has execute revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`. If local verification cannot satisfy those constraints for every admitted Auth creation path, SQL generation stops for a revised architecture decision; it must not weaken the guard silently.

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

### Schema and API isolation

- `platform_shared` contains only global identity, service catalog, membership, and activation receipt contracts.
- `platform_private` contains non-exposed ledgers and privileged helpers.
- `discordos`, `fitness`, and `mazer` contain product profiles, entitlements, and transported product data.
- `public` contains no product tables.
- Data API exposure and grants are explicit; RLS is enabled and forced on every contracted relation.
- Source provenance is immutable, and transport cannot perform semantic cross-product table merges.

### Domains and browser sessions

The public hub is `https://fawxzzy.com`. The neutral shared account origin is `https://account.fawxzzy.com`. Product origins are `https://fitness.fawxzzy.com` and `https://mazer.fawxzzy.com`.

Phase 1 shares Auth identity and database contracts while each origin establishes and stores its own browser session. Cross-origin SSO is deferred to a future threat model and architecture packet. Production redirects and recovery destinations are exact; wildcard production redirects are forbidden.

Custom SMTP is `REQUIRED` before production Auth email delivery. Provider selection is `OWNER_DECISION`; credentials and live configuration do not belong in this repository.

## Consequences

- Product teams gain one identity backbone without losing schema, authorization, or billing boundaries.
- Activation is retry-safe and auditable.
- Migration requires explicit identity adjudication and provenance rather than optimistic email matching.
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
- Supabase API security and explicit exposure: https://supabase.com/docs/guides/api/securing-your-api
