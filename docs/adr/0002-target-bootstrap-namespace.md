# ADR 0002: inert target-bootstrap namespace package

- Status: CURRENT
- Decision date: 2026-07-17
- Apply admitted: false

## Context

The consolidated platform needs a reproducible schema source before any target project can be changed. The accepted source boundary is 122 immutable migrations: 17 DiscordOS migrations, 101 Fitness migrations, and 4 Mazer migrations. They are evidence inputs, not an instruction to replay historical side effects.

The three histories contain product objects that were originally created in different namespace conventions, 358 top-level data effects, 11 catalog-dependent dynamic templates, three extension declarations, and one Cron activation. Fitness also has a forward global-number dependency that remains blocked on an unmerged source candidate and contained replay acceptance.

Fitness PR #108 and hosted-replay-harness PR #2 are tracked by the versioned `fitness-pr108-replay-gate` contract. That contract ratchets their immutable heads, trees, migration-chain digests, sole candidate migration identity, and review/replay lifecycle without changing the accepted bootstrap. The accepted package remains 122 migrations (17 DiscordOS, 101 Fitness, 4 Mazer); the 102nd Fitness candidate is provenance only and is forbidden from `bootstrap/sources`, generated manifests, and inert SQL.

## Decision

The repository stores the exact raw migration bytes under `bootstrap/sources`. Each byte stream is bound to its source app, commit, tree, path, Git blob, raw digest, byte count, and order in `source-migrations.v1.json`. The verifier independently recomputes each frozen source-chain digest from the actual copied bytes using `version|path|git_blob|raw_sha256|raw_bytes` lines, then recomputes the combined digest from app label, immutable commit, immutable root tree, and recomputed chain digest. Frozen acceptance values are verifier-owned and must match both generator configuration and generated manifests; copied-byte substitution, source-identity substitution, stale digests, or missing bindings fail closed. The accepted combined-manifest digest and each source-chain digest remain separate from both package identities described below.

The provider-ledger canonical provenance ratchet is a separate closed gate. It records the accepted 17 DiscordOS and 4 Mazer historical units, their catalog/provenance digests, and each unit's provider-ledger identity, accepted path, commit, Git blob, raw digest, byte count, and terminal effect classes. Current DiscordOS and Mazer default-branch discovery is explicitly non-canonical and cannot rename, replace, delete, collapse, or regenerate an accepted historical unit. Digest model `SEPARATE_MIGRATION_AND_GOVERNANCE_V1` binds the six migration-derived manifests plus four inert SQL artifacts as the immutable migration package (`b65d1c0b73607218cc37826d9bb77c25704ea18f957abba7b5667a79d0a2c8db`) and binds `namespace-plan.v1.json` independently as governance (`82e7ecad9a68addff14c43c3bc237c54af2dd5d48cda454c0e1c121a3e4536ec`). The former mixed digest (`80482b9bbfaf70b5980dd290b78def12d0af898cc10ee12f402b46d378fdbf83`) is retained only as superseded evidence and must never be recomputed or promoted as either current identity. The verifier fails closed on path overlap, path substitution, either digest drifting, mapping/source-count drift, or executable promotion.

The target namespace is closed:

- `public` contains no product tables. A public RPC requires a later control-plane and security proof.
- `platform_shared` is limited to reviewed shared identity and service contracts.
- `discordos`, `fitness`, and `mazer` own product objects.
- `platform_private` and `discordos_private` are unexposed helper schemas.
- `auth`, `storage`, `extensions`, `realtime`, and other provider schemas are managed prerequisites and are never recreated from application history.

Generation is fail-closed. Fitness and Mazer `public` product identities are rewritten to their owning product schema, and each generated slice creates its owning schema idempotently before the first qualified product object. The ten Fitness deny policies are expanded into exact static identities. Top-level data effects, all catalog-dependent dynamic identities, extension activation, the DiscordOS scheduler boundary, network-capable helpers, SECURITY DEFINER source functions, and Fitness number transformation are held with source-statement provenance.

Public DiscordOS RPC definitions are a separate control-plane boundary. Both `CREATE FUNCTION` and `CREATE OR REPLACE FUNCTION` forms are held regardless of case or whitespace. When a function definition is held, the generator transitively holds every source statement that resolves or references it, including grants, revokes, comments, triggers, policies, calls, and dependent function definitions. The generated DiscordOS database slice therefore retains admitted non-RPC schema objects while emitting no `public.discordos_*` function.

The four generated SQL files live only under `bootstrap/artifacts/inert-sql`. They are inert review artifacts, not Supabase migrations, and the repository admits no blocked SQL under `supabase/migrations` or an alternate executable migration directory. The files still begin with `APPLY_ADMITTED=false` as machine-readable package state, but a SQL comment is not an execution guard and cannot substitute for path-level inertness. The generator and verifier freeze the exact four paths, reject missing, duplicate, renamed, copied, or escaped representations, and fail when ordinary Supabase migration discovery finds any SQL.

Publication validation uses one physical-identity model for the repository, immutable source/configuration inputs, standard migration discovery, generated manifests, and inert SQL targets. Linux validation derives the repository and every planned source coordinate from the normalized governing mount root plus the visible path relative to that mount point. Same-device alternate roots that can expose the repository or intersect a planned source coordinate fail closed, including whole-root, repository-subtree, ancestor-subtree, and encoded aliases when `/` is the governing mount. Nested mounts block only when they intersect a planned input, discovery, or publication path; unrelated sibling roots, unrelated mounted `node_modules`, and unrelated devices do not block. Link-like paths, case-fold aliases on Windows, observable device/inode aliases, parent/child escapes, and identity drift between final validation and publication fail closed.

A future admitted execution packet must explicitly promote or copy reviewed, digest-verified artifact bytes into a separate execution-only migration bundle under new action-time authority. This source packet must not create that bundle, configure migration-path indirection, or retain a second executable representation.

Repository validation excludes only the exact root-local directories `node_modules`, `outputs`, and `work`; a regular file with one of those names remains visible to path and content validation. An exact excluded root link is accepted only when its target is provably a directory, and it is never traversed. Git metadata is handled as its own exact root entry. Unknown, nested, broken, or file-target links and unsupported filesystem entry types fail closed rather than being traversed or silently omitted.

## Security boundary

The merged identity contract remains authoritative for target-only relation, grant, policy, and function expectations. This package emits schema and closed expectation overlays but does not invent missing table columns or function bodies. In particular:

- no product object is created in `public`;
- Mazer and Fitness schemas exist before filename-ordered replay reaches any qualified object in their slices;
- every held function and dependent source statement is preserved in deterministic evidence, and no reference to an absent held function enters generated output;
- private schemas receive no browser-role grants;
- PUBLIC function execution is not admitted;
- extension and provider-managed object creation is absent;
- no top-level data effect, Cron activation, network hook, project binding, provider command, or credential value is emitted;
- membership remains distinct from billing entitlement;
- the global-number transformation remains `BLOCKED`.
- Fitness PR #108 exact-head review, adapter merge, replay execution, Fitness merge, and target apply remain `BLOCKED`; only the adapter source review is `CURRENT`.
- Provider-ledger canonical provenance is `CURRENT` evidence only; it preserves historical package bytes and paths and does not admit a source refresh, SQL generation, or target apply.

PostgreSQL 17 is the required source contract; the live target version remains `UNKNOWN`. The 36 creator/schema/object-class entries are an assertion and disposition matrix, not 36 executable statements. Twelve `postgres` TABLES/SEQUENCES units enter inert SQL. Six `postgres` FUNCTIONS units require the existing same-transaction, signature-specific EXECUTE revocation because PostgreSQL schema-scoped default revokes cannot subtract the global/built-in function default. The 18 `supabase_admin` units are `BLOCKED_PROVIDER_ROLE` / `NOT_EXECUTABLE`, bound to sanitized receipts `FP-TGT-SECURITY-BASELINE-001` (SQLSTATE `42501`, exact rollback) and `FP-TGT-PROVIDER-DEFAULT-ACL-001`. No generated artifact contains `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin`.

The compensating source invariant asserts `current_user=postgres`, creates and owns all six application schemas as `postgres`, revokes schema `CREATE` from `supabase_admin`, and requires governed application tables, sequences, and functions to be created under `postgres`. `public` is not an application schema. Zero application tables, views, materialized views, sequences, types, or functions are admitted there. The terminal containment classification is `CONTAINABLE_WITH_HARD_GATES`, but bootstrap readiness remains `BLOCKED_PROVIDER_SUPPORT_REQUIRED` until action-time owner/default-ACL/public-object assertions, the exact provider-helper manifest, negative probes, and rollback proof pass.

Data API state is held source contract, not a provider mutation. Contract v1.5.0 separates the observed current preimage from the required containment postimage: the target is currently enabled with ordered Exposed schemas `[graphql_public, public]`, ordered Extra search path `[public, extensions]`, automatic exposure off, tables 0/0, functions 1/0, and the view denominator still `UNKNOWN/UNKNOWN`; the required state is disabled with Exposed schemas `[]`, Extra search path `[extensions]`, and automatic exposure off. Two earlier guarded Overview Save attempts did not persist, Settings Save was not attempted, rollback was unnecessary, persisted provider mutations remain zero, and the final state equals the observed preimage. Sanitized Support evidence event `onv1_55591cb81248118dcfeda1db7e9fde7f713373eb6c059f8aada78789e1f5e4fa` binds case `SU-425819`, but its authoritative lifecycle status remains `UNKNOWN`. A separate closed evidence object records only that the latest sanitized Support request implies `CUSTOMER_ACTION_REQUESTED`; it explicitly does not promote that inference into case status. The displayed response time is `2026-07-22 08:51 America/New_York`. Support could not reproduce the issue and recommended the documented PostgREST configuration endpoint plus an extension-free observation fallback. This still does not confirm a provider defect, root cause, role change, or paid action.

The prior two-Save authority is consumed. Data API gate v1.5.0 preserves corrected FP-MAN-047 question `onv1_ed934a7382f5e52e6ceea9ea73011f9ff70a46d31bd6061a3dc7645946cad0df` and canonical answer envelope `onv1_2a47e6b7bfb21d11ffe4cf87a7091f8aafb2d75ffebf25b3914dd6c03d8bb570`, each with its independently recomputable payload digest. The verbatim answer text retains a separate one-way digest and is never treated as envelope identity. `FP-MAN-037` remains only a rejected cross-project decision-ID collision: it grants zero Data API authority, has executed zero Data API attempts, and may never be reused for this gate.

FP-MAN-047's sole guarded attempt is terminally consumed. The contract binds canonical consumption receipt `onv1_6258aed05023737d6403a35dcf0867e873ab64513578d25713c9584c830e3836` and terminal receipt `onv1_6515ddefc604a92dcf4849395a0dfd19a191b1139891a233318636f5a81e683b`. Consume-before-interaction ordering was not proven, so the outcome is `PREINTERACTION_LEDGER_VALIDATION_FAILURE` / `NO_SAVE_CONFIRMED`: Dashboard Saves 0, post-attempt readbacks 0, rollback Saves 0, and persisted provider mutations 0. FP-MAN-048 is a distinct successor bound to question `onv1_2580303e3f1ebdd0a580df1821b57dc0263c46bfabdd4b1dcf328d9c0c53ca49` and answer `onv1_049d86e0094c7cbd6aadbb7bbb235fa857d404809428d427cf2c6657ca4d2cd8`; successor attempt `FP-DATA-API-CONTAINMENT-RETRY-20260722-001` remains unconsumed 0/1. Its completed phase-1 authority was read-only. It grants no Management API write, provider execution, or Save, and an action-time confirmation plus a separate provider-execution packet remain required.

The official Management API reference documents GET and PATCH `/v1/projects/{ref}/postgrest` with scopes `rest:read` and `rest:write`, permissions `data_api_config_read` and `data_api_config_write`, and optional-string `db_schema`. Support recommends an empty-string projection for disabling the Data API, but public documentation does not guarantee those semantics. The documented `pg_pgrst_no_exposed_schemas` sentinel is an implementation marker, not standalone success proof. Exact configuration readback remains required, and this source contract authorizes zero Management API or Dashboard requests. Screenshots, network bodies, headers, cookies, tokens, keys, request or response payloads, user data, PII, project secrets, and machine paths must never enter the source contract or public receipt.

Before any later activation, `public` must be absent. The maximum ordered exposed allowlist is `platform_shared`, `discordos`, `mazer`, and `fitness`; `graphql_public`, `public`, private schemas, extensions, and provider schemas are never exposed. Explicit grants, RLS, independent settings readback, and negative REST/GraphQL/RPC probes remain required and unexecuted. Rollback is exact and expected-state guarded: restore selector settings first, then Data API enablement. Setting mutation, bootstrap apply, and target apply all remain blocked.

Supabase now treats table grants as an explicit concern separate from RLS policy design, so the target direction is explicit grants with deny-by-default schema posture. SECURITY DEFINER helpers must stay private or be narrowly allowlisted with fixed search paths and caller checks. These are source expectations only; Data API exposed-schema settings remain a later control-plane gate.

## Constraint identities

The accepted constraint denominator is 281 units: 158 named catalog identities and 123 unnamed source units. Static source parsing retains candidate identities and exact provenance, but final provider-generated names and the remaining catalog-dependent delta stay `BLOCKED` until two contained replay catalogs are byte-identical. The generator never guesses those identities to make a package appear executable.

## Consequences

This package can be reviewed and reproduced without a Supabase session or runtime installation. It cannot be applied safely. Supabase applies files discovered under `supabase/migrations` in timestamp order, so blocked review artifacts remain outside that directory while their internal namespace-before-object order stays an explicit generated invariant. A later packet must close contained replay, provider prerequisites, target security, Data API/Auth control-plane, identity/data load, Edge/Cron activation, application cutover, and retirement gates in order.

## Primary references checked

- [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Supabase function security](https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker)
- [Supabase API grants and function exposure](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase provider-managed schema restrictions](https://supabase.com/changelog/34270-restricting-access-on-auth-storage-and-realtime-schemas-on-april-21-2025)
- [Supabase explicit table grants change](https://github.com/orgs/supabase/discussions/35654)
- [PostgreSQL 17 ALTER DEFAULT PRIVILEGES](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html)
- [PostgreSQL 17 privileges](https://www.postgresql.org/docs/17/ddl-priv.html)
- [Supabase Postgres roles](https://supabase.com/docs/guides/database/postgres/roles)
- [Supabase PostgreSQL 17 platform transition](https://supabase.com/changelog/46080-self-hosted-supabase-upgrading-from-pg-15-to-17-breaking-change)
