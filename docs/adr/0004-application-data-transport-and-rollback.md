# ADR 0004: application-data transport and rollback contract

- Status: `CURRENT`
- Source lifecycle: `SOURCE_READY`
- Execution lifecycle: `EXECUTION_BLOCKED`
- Apply admitted: `false`

## Context

The platform has a byte-exact, provider-ledger-canonical 122-migration bootstrap package, but schema provenance is not an application-data migration protocol. A transport must close concurrent source writes, row deletion, foreign-key ordering, idempotent retry, target conflict, rollback, and receipt-redaction boundaries before any product adapter or provider action can be admitted.

Supabase database backups and logical dumps have managed-platform boundaries; Auth-owned state and Storage object bodies remain separate evidence denominators. Row Level Security and Data API exposure are also independent controls. The generic data contract therefore neither claims complete managed-state transport nor grants API access.

## Decision

Application data follows one closed lifecycle:

1. `S0_COMPLETE_SNAPSHOT`
2. `SOURCE_WRITES_CONTINUE`
3. `S1_COMPLETE_KEY_AND_ROW_DIFF`
4. `EXPLICIT_TOMBSTONES`
5. `AUTHORIZED_WRITE_BARRIER`
6. `S2_FINAL_DIFF`
7. `CAS_APPLY`
8. `PARITY`
9. `OBSERVATION`
10. `SEPARATELY_APPROVED_SOURCE_PAUSE`

S1 and S2 compare the complete primary-key set and canonical row digests. Timestamps, revisions, and high-water marks can accelerate the scan but cannot replace it. Deletes are explicit tombstones. A key that reappears must be classified as an explicit resurrection or a new generation; it is never silently treated as an update.

Inserts and updates run parent first. Deletes run child first. Every foreign-key cycle needs a declared staging plan and deterministic synthetic proof. Derived caches are excluded or deterministically rebuilt only after authoritative parity. External-effect paths remain quarantined through rehearsal and rollback.

Every mutation uses the exact idempotency commitment components declared in the contract. Compare-and-swap accepts only `ABSENT` or the exact expected target digest. A matching prior mutation is idempotent reuse; an unexpected digest is quarantined and never overwritten.

The append-only mutation journal records every committed mutation, reuse, and conflict quarantine with enough digest-only preimage and postimage evidence to reverse committed mutations in reverse dependency and reverse commit order. Reverse catch-up into an active source needs separate explicit authority.

Public receipts are closed and aggregate-only. They may contain counts, booleans, cutoffs, non-identifying high-water marks, quarantine classes, private commitments, and digests. They may not contain rows, primary keys, names, emails, usernames, user numbers or ranges, UUIDs or ranges, secrets, project references, SQL, payloads, provider responses, or machine paths.

## Consequences

This contract is app-agnostic. DiscordOS, Fitness, and Mazer each still require a separate adapter contract. Data API containment, accepted recovery and quarantined restore, faithful contained replay, target bootstrap, shared Auth identity mapping, service-membership readiness, and all three adapters remain blocking dependencies. No source pause, reverse catch-up, target write, provider action, or deployment is admitted here.
