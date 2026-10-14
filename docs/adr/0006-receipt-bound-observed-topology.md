# ADR 0006: Separate observed topology from historical migration preconditions

Status: OWNER_DECISION

## Context

The original project registry describes migration preconditions requiring active
sources. Later owner receipts record the three source project deletions and the
retained master. Editing the historical registry would change the meaning of old
contracts and could incorrectly open execution gates.

## Decision

Preserve the original registry, schemas, executable bundle and operation gates.
Add an independently validated, receipt-bound observed topology snapshot and an
explicit reporting command. The snapshot records the settled October 11 evidence;
it is not a fresh provider census or authorization to repeat a completed effect.

Register its schema and document in the existing contract loader. Pin the reviewed
snapshot and historical registry in semantic validation. Keep the original
executable validation denominator unchanged and report observation coverage
separately. The existing repository path policy already admits all new paths.

## Consequences

Use `npm run topology:show` for the latest retained observation in this version.
Do not use the historical registry as a current operational inventory. Reporting
requires all contract validation to pass; no provider connection is available.
Changing a snapshot requires updated evidence, schema, semantic identity, tests,
and independent review. A new runtime need cannot be authorized by this document.

The candidate remains OWNER_DECISION until the source owner adopts it. Adoption
does not establish surviving application acceptance or resolve other migration
requirements. Receipt references are provenance, not commands or readable secrets.
