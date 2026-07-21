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

### Mazer adapter

The first product adapter is source-ready but execution-blocked. It binds the four accepted provider-canonical Mazer relations without treating the later three-file default-branch chain as replacement history.

- `mazer_profiles` is authoritative application data, but it is not preinserted. A private digest-bound seed is looked up through the immutable identity mapping and consumed in the same server-side transaction that activates the pending Mazer membership. The caller supplies no user ID. Exact existing profile state is reused; conflicting state is quarantined. When a complete S0/S1/S2 key comparison proves that an owner of authoritative progression, AI-runner progression, or cycle-receipt data has no source profile, the server creates a versioned schema-default seed (`display_name=null`, `selected_control_mode=stick`, empty settings) in that same activation transaction. The caller cannot supply or override those values. Ambiguous or incomplete absence evidence leaves membership pending and quarantines the owner; no source row is silently dropped.
- `mazer_progression_states` is authoritative state. Its revision can narrow change detection, but S0, S1, and S2 still compare the complete key set and complete canonical row digests.
- `mazer_ai_progression_states` is authoritative per-runner state, not a rebuildable mirror of human progression. Transport preserves every `(user_id, runner_key)` identity and every source column, including the independent `state` and `summary` payloads. Complete runner-key and row-digest parity, CAS conflict quarantine, explicit tombstones, and reverse-order journal rollback are mandatory; deriving or defaulting runner keys from human progression is forbidden.
- `mazer_cycle_receipts` is append-only history. Existing identities are preserved; the target default UUID generator is never used during transport. Deletes remain explicit tombstones.

The adapter rekeys every source `user_id` only through `platform_private.source_identity_ledger`. Presentation values such as `display_name` never become identity evidence. Profile or membership history is preserved on deletion, all CAS conflicts quarantine without overwrite, and external effects remain disabled. Public receipts retain only aggregates and one-way commitments.

## Consequences

The generic contract remains app-agnostic. Mazer now has one closed source-ready adapter; Fitness and DiscordOS still require separate adapters. Because all three are required, application-data execution remains blocked. Data API containment, accepted recovery and quarantined restore, faithful contained replay, target bootstrap, shared Auth identity mapping, and service-membership readiness also remain blocking dependencies. No source pause, reverse catch-up, target write, provider action, or deployment is admitted here.
