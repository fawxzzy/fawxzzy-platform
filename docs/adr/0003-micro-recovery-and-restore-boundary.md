# ADR 0003: Micro recovery and restore boundary

- Status: CURRENT
- Decision date: 2026-07-18
- Decision: FP-MAN-013
- Provider execution admitted: false

## Context

The consolidated target is approved to remain on the Pro plan with Micro compute. Point-in-Time Recovery and the Small compute prerequisite are deferred. The approved recovery posture retains the provider's daily Physical backups with seven-day retention and requires an independently governed encrypted export plus one restore-to-new-project rehearsal before shared Auth or application data is loaded.

The repository previously mentioned backups, rollback, and restore evidence only as downstream gates. It did not define a closed backup denominator, an encryption boundary, an immutable destination receipt, a restore quarantine, or measured RPO/RTO evidence.

## Decision

Recovery evidence is represented by four versioned, sanitized documents:

1. the policy-bound Micro recovery contract;
2. an encrypted backup manifest;
3. an external-effects disable manifest for the restored clone;
4. a restore rehearsal receipt.

The independent export must be encrypted as a client-side stream before it reaches its destination. Persistent plaintext is forbidden. Public receipts retain only metadata references, aggregate counts, private digests, ciphertext bytes and digest, timestamps, and status values. Key material, provider endpoints, connection values, raw rows, SQL, user identities, and secret-bearing logs are outside the contract.

The destination must be independently governed, versioned, and immutable for the accepted retention interval. The exact provider, encryption algorithm, key custody installation, cadence, retention, alert channel, logical export/Auth mechanism, and numerical RPO/RTO remain `UNKNOWN` execution gates. Source code cannot promote them to accepted facts.

A `CURRENT` backup receipt must keep its immutable backup version retained through backup completion, rehearsal acceptance, and the injected action-time validation clock. Equality at the latest boundary is accepted; an expiry one second earlier fails closed. A status flag such as `never_delete_before_restore_acceptance` is not evidence unless the timestamps satisfy those boundaries.

Receipt digests use SHA-256 over canonical JSON with lexicographically sorted object keys, preserved array order, two-space indentation, and one final LF. The document's own digest field is omitted from its digest preimage. Non-finite numbers are rejected.

## Coverage boundary

The closed coverage denominator is:

- application schemas and catalog objects;
- roles, memberships, grants, and default ACLs;
- application data;
- Auth identity data;
- Auth control-plane configuration;
- Storage metadata;
- Storage object bodies.

Database backups and database-only clones do not include Storage object bodies. The Storage body unit stays separate and a non-zero object count blocks acceptance unless a separately accepted body-recovery receipt exists.

Provider restore documentation distinguishes database content from control-plane configuration. Database schema, data, roles, permissions, and Auth database records can be present in a clone, while Storage objects, Edge Functions, Auth settings and API keys, Realtime settings, and other project settings require separate readback or reconfiguration. The contract therefore records those units independently and never infers one from another.

## Restore quarantine

A restored project is untrusted until the exact external-effect denominator is disabled and proved. This includes Cron, queues, database network calls, webhooks, Auth delivery and hooks, Edge schedules, Realtime, Storage events, application traffic, DNS, host aliases, and environment routing.

Each of the twelve `CURRENT` disabled units requires its own non-null lowercase SHA-256 evidence digest. Digests must be distinct across the denominator, and the unit/digest pairs are bound into the canonical external-effects manifest digest. Self-reported booleans, null evidence, malformed digests, omitted fields, or digest reuse cannot satisfy quarantine acceptance.

No application credential, DNS alias, environment route, or traffic release is admitted during rehearsal. Catalog, security, application-data, Auth, and control-plane parity are aggregate-only. Source systems stay unchanged. Clone disposal is a separate provider mutation and is not implied by rehearsal completion.

## RPO and RTO

The source contract defines deterministic measurement from four UTC timestamps: recovery point, failure declaration, restore start, and restore completion. It does not invent objectives. Numerical RPO and RTO remain `UNKNOWN` until a rehearsal produces measurements and the operator accepts objectives under a later bounded packet.

Action-time acceptance requires a sanitized owner-decision receipt reference containing a stable uppercase hyphenated decision ID, lowercase SHA-256 receipt digest, acceptance timestamp, and the exact approved RPO/RTO objective values. The decision timestamp must be at or after restore completion and no later than rehearsal acceptance. Objective values must match exactly, and the complete reference is included in the restore receipt digest. Operator prose, identity, provider URLs, secrets, and machine paths are not allowed.

## Consequences

- Recovery source validation can run offline with no provider credentials.
- Shared Auth or data load remains blocked until current backup, retention, restore, quarantine, parity, and accepted RPO/RTO evidence exists.
- Daily Physical backups remain useful but are not treated as independent encrypted exports.
- Small compute and PITR remain deferred and unauthorized.
- Storage body recovery activates separately when Storage becomes non-empty.

## Official references checked

- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase Restore to a new project](https://supabase.com/docs/guides/platform/clone-project)
- [Supabase Storage object downloads](https://supabase.com/docs/guides/storage/management/download-objects)
- [Supabase Auth user migration](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects)
- [Supabase changelog](https://supabase.com/changelog)
