# ADR 0005: Provider-neutral data convergence and Music Sesh boundary

Status: `CURRENT`

## Context

The Platform needs a smaller, clearer data model without erasing product ownership or turning historical provider identifiers into canonical keys. The accepted operator decision `decision-platform-data-convergence-music-sesh-independent-2026-07-30` establishes two simultaneous constraints:

1. Shared Auth identity, minimal shared profiles, service memberships, external identity mappings, and a provider-neutral work model may converge when evidence supports an explicit mapping.
2. Music Sesh remains an independent product and database domain. It is not a DiscordOS residue category and is not part of the shared work, Fitness, or Mazer domains. While its target and regenerated artifact are unadmitted, its complete storage source block is excluded from the Platform executable projection by exact statement-set identity.

This packet freezes source contracts only. Live aggregate inventory, provider configuration, target state, credentials, Data API state, Auth and application data, and action-time proof remain `UNKNOWN`. It contains no executable SQL and grants no apply, deployment, production, deletion, or source-retirement authority.

## Decision

### Shared identity stays minimal

The shared identity domain is limited to a global profile, service membership, and external identity mapping. Billing and entitlements remain app-owned. Membership is service activation, not payment authority.

Every source-to-target identity link requires explicit evidence and immutable provenance. A matching email, username, UUID, or password hash never proves that two records describe the same human. Ambiguous or conflicting records are quarantined; they are not silently merged. Controlled reauthentication remains part of the later execution boundary.

### Work becomes provider-neutral

The canonical logical work domain contains projects, cards, events, dependencies, and external references. Its physical target namespace remains `UNKNOWN` until a later source decision.

Discord feedback and board records may transform into the work domain only through versioned mappings and rehearsal evidence. Discord identifiers are optional external references. They never determine ownership, identity, authorization, or canonical record keys.

### Product domains retain ownership

- Fitness authoritative facts remain Fitness-owned. Derived stats may be rebuilt, pending jobs may be drained or regenerated, and exercise aliases may be canonicalized only after referential and replay proof. Fitness billing and entitlements remain separate from shared membership.
- Mazer remains app-owned. A later decision must select one authoritative progression representation and prove that JSON and indexed-column forms cannot drift.
- Music Sesh remains an independent product and database domain. The convergence manifests contain no Music Sesh mapping into any other domain.

### Classification is closed and deletion is not inferred

Every planned source category uses exactly one of `KEEP`, `TRANSFORM`, `DERIVE`, `ARCHIVE`, or `OMIT`.

`OMIT` is a candidate classification, not deletion permission. Promotion of an omission candidate requires fresh live aggregate inventory, disposable rehearsal, retention proof, rollback proof, and separate action-time deletion authority. Expired tokens or claims, stale provider identifiers, disconnected credentials, and obsolete cron details therefore remain blocked until those proofs exist.

### Transformation is source-only

Transformation mappings contain logical domains and entities, evidence requirements, and rollback gates. They contain no SQL, provider payload, project credentials, raw identities, machine paths, or live records. Every mapping remains rehearsal-bound and execution-blocked.

## Consequences

- Data-convergence decisions are reviewable without granting target access.
- Identity consolidation cannot use convenient but unsafe equality assumptions.
- Product ownership stays explicit while shared surfaces remain small.
- DiscordOS can contract into a provider-neutral work model without preserving Discord as core ownership.
- Music Sesh cannot be accidentally swept into a generic cleanup or convergence batch.
- Destructive omission requires a later, evidence-backed decision rather than inheriting authority from source classification.

## Alternatives rejected

- **Fold Music Sesh into the work domain:** rejected because it is an independent product and database domain.
- **Use Discord IDs as canonical keys:** rejected because provider identifiers are optional external references, not ownership.
- **Merge identities by email, username, UUID, or password hash:** rejected because equality is not adjudication evidence.
- **Treat membership as billing entitlement:** rejected because the owners and revocation semantics differ.
- **Generate migration SQL with the design contract:** rejected because executable migration source and apply are separately gated.
- **Delete records classified `OMIT`:** rejected because classification is not action-time deletion authority.

## Verification boundary

The repository validator checks all three convergence instances against closed schemas and semantic invariants. Negative tests cover domain collapse, Music Sesh folding, Music Sesh executable leakage, adapter/gate/statement-set drift, silent identity merging, destructive omission promotion, executable SQL inclusion, live-fact promotion, unknown fields, prototype drift, and noncanonical object representation.
