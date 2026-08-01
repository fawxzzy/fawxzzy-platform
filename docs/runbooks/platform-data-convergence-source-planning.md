# Platform data-convergence source-planning runbook

Status: `CURRENT`

## Purpose

Use this runbook to prepare versioned, provider-neutral convergence evidence. It is a repository-only planning procedure. It does not authorize provider access, live inventory, target mutation, SQL generation, apply, deployment, production, deletion, or source retirement.

## Inputs

- `contracts/v1/convergence/platform-data-convergence-contract.json`
- `contracts/v1/convergence/table-classification-manifest.json`
- `contracts/v1/convergence/source-to-target-transformation-manifest.json`
- the accepted operator decision bound by the convergence contract
- separately authorized aggregate inventory and rehearsal evidence, when those later exist

Do not put credentials, project secrets, connection strings, raw provider responses, raw identities, live rows, or machine-specific paths in these artifacts.

## Planning sequence

1. **Freeze the source denominator.** Record immutable source anchors and aggregate counts in a separately reviewed evidence packet. Until then, live inventory remains `UNKNOWN`.
2. **Classify source categories.** Use only `KEEP`, `TRANSFORM`, `DERIVE`, `ARCHIVE`, or `OMIT`. A static category is not a final live-table disposition.
3. **Preserve product boundaries.** Shared identity stays minimal; Fitness and Mazer remain app-owned; Music Sesh remains an independent product and database domain.
4. **Map identities explicitly.** Create source-to-target mappings from independently verified evidence. Quarantine conflicts. Never merge by email, username, UUID, or password-hash equality.
5. **Map work records provider-neutrally.** Transform supported Discord feedback and board records into projects, cards, events, dependencies, and optional external references. Provider identifiers never become ownership keys.
6. **Plan app-owned transformations.** Preserve Fitness facts, rebuild only derived material, prove alias referential integrity, keep billing separate, and require a single Mazer progression authority.
7. **Rehearse without production authority.** Use only a separately admitted disposable target. Prove deterministic replay, parity, provenance, idempotency, quarantine, and rollback.
8. **Promote no live fact implicitly.** Green source tests, historical receipts, or a reviewed manifest do not prove current provider configuration, Data API state, credentials, Auth/data state, or target readiness.
9. **Require a later action-time gate.** Any executable migration, live apply, omission, deletion, deployment, or retirement requires a fresh exact decision and current evidence.

## Classification evidence

Each live relation considered by a later inventory packet must identify:

- immutable source anchor and aggregate denominator;
- authoritative owner and retention class;
- selected classification and rationale;
- source-to-target mapping version, if transformed;
- derivative inputs and deterministic rebuild rule, if derived;
- archive retention and restore proof, if archived;
- omission prerequisites and separate deletion authority, if omitted;
- rollback and reconciliation procedure;
- conflict and quarantine counts without raw identity leakage.

## Fail-closed conditions

Stop source planning and return a finding when:

- Music Sesh appears in a shared, work, Fitness, Mazer, or DiscordOS target mapping;
- a Discord identifier becomes a canonical identity or ownership key;
- an identity mapping relies on email, username, UUID, or password-hash equality;
- an `OMIT` candidate is treated as deleted or deletion-ready;
- live facts are promoted from `UNKNOWN` without separately authorized durable proof;
- executable SQL, a provider client, network access, credentials, raw provider responses, or machine paths enter the packet;
- a path outside the admitted ceiling changes.

## Verification

Run:

```text
npm test
npm run validate
npm run verify
```

The focused convergence tests must also pass twice with byte-identical output. Run no-fix formatting checks, `git diff --check`, the exact-path allowlist, JSON/LF checks, and forbidden-surface scans. Keep the index empty and freeze an unstaged content-addressed seal before independent review.

`validateContracts()` preserves the executable-bundle compatibility denominator in `schema_count`, `document_count`, and `semantic_check_groups`. The convergence package reports its additive source-planning denominator separately, while the `validated_*` fields report the full repository totals. This keeps immutable executable-bundle receipts stable without excluding the convergence schemas, documents, or semantic checks from validation.

## Lifecycle handoff

Successful source review yields only `SOURCE_READY / EXECUTION_BLOCKED / apply_admitted=false`. A later inventory, migration, apply, deployment, production, omission, deletion, or source-retirement packet must be admitted independently.
