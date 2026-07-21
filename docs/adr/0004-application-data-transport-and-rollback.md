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

### Fitness adapter

The second product adapter is also source-ready and execution-blocked. It binds the accepted 101-migration Fitness source exactly, keeps the held PR #108 migration and hosted replay outside accepted inputs, and leaves the full 122-migration package byte-identical. Its closed denominator contains 27 historical relation identities: 11 authoritative relations, one rebuildable cache, one held entitlement relation, two unresolved billing relations, one unresolved follow-up-job relation, ten unresolved Discord/external relations, and one explicitly superseded historical relation.

`public.profiles.id` remains the source profile owner key and is mapped only through the immutable shared identity ledger. The profile is a private seed consumed atomically with pending Fitness membership activation; no request may provide a user ID or preinsert the profile. A complete S0/S1/S2 absence proof does not authorize an invented Fitness default profile: owners with authoritative child data and no proven source profile remain pending and quarantined without dropping rows.

Core workout state uses complete key and canonical-row comparisons plus CAS. Inserts are parent-first and deletes are explicit, child-first tombstones. The nullable references between `routine_days` and `workout_plan_templates`, plus the nullable `routine_days.duplicate_source_routine_day_id` self-reference, form the declared cycle set. Rehearsal must insert these references as null and then patch the exact expected references through CAS. Its deterministic proof includes two routine-day rows that reference each other through `duplicate_source_routine_day_id`, demonstrating that rowwise parent-first insertion stalls while null-first staging and exact CAS patching succeeds. `progression_events` preserves append-only identities. `exercise_stats` is excluded from transport and rebuilt only after authoritative workout parity.

Existing Fitness member numbers are copied unchanged, including their high-water mark and gaps. Reuse, gap filling, renumbering, compaction, and caller-selected allocation are forbidden by the transport contract. The accepted 101-migration chain still contains compaction behavior, while the retirement migration and faithful replay are held dependencies; therefore post-migration allocation remains `BLOCKED` rather than being inferred safe.

Billing customers, purchases, entitlements, session follow-up jobs, and Discord-named relations are not silently imported or discarded. Billing and entitlement state waits for verified billing provenance and a closed adapter. Follow-up jobs remain quarantined as operational effects. Discord identities, commands, moderation, Spotify/provider state, update drafts, verification tokens, and reporting state remain explicit `UNKNOWN`/held classes; Discord IDs, usernames, snapshots, and Fitness numbers cannot link or authorize a human. The historical `discord_bug_reports` identity is explicitly excluded as superseded by `discord_feedback_reports`.

## Consequences

The generic contract remains app-agnostic. Mazer and Fitness now have closed source-ready adapters; DiscordOS still requires a separate adapter. Because all three are required, application-data execution remains blocked. Data API containment, accepted recovery and quarantined restore, faithful contained replay, target bootstrap, shared Auth identity mapping, Fitness PR #108 retirement, and service-membership readiness also remain blocking dependencies. No source pause, reverse catch-up, target write, provider action, or deployment is admitted here.
