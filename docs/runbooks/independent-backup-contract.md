# Independent backup source contract

Status: `CURRENT`
Decision: `FP-MAN-015`
Source lifecycle: `SOURCE_READY`
Execution: `BLOCKED`

## Purpose

This source contract freezes the independently governed backup and restore evidence required before the Fawxzzy shared Supabase project can load shared Auth or application data. It does not publish a workflow, create a bucket, install credentials, generate or upload a backup, create a restore project, or mutate Supabase.

## Approved architecture

- A private Backblaze B2 account in Canada East is the destination class.
- The bucket and every accepted object require Object Lock in compliance mode.
- A private GitHub Actions scheduler requests a full export every six hours; a separately operated watchdog must detect stale or failed backups.
- The export streams through `age` before upload. Automation receives public recipients only, never a private recovery identity.
- Two private recovery identities remain offline on distinct encrypted media, with one copy offsite.
- Ordinary accepted exports retain a 35-day lock. The first accepted export in each month retains a 400-day lock.
- Provider daily Physical backups with seven-day retention remain complementary evidence; they are not replaced by the logical lane.

Backblaze documents that Object Lock must be enabled and that compliance-mode retention cannot be removed, although it can be extended. Its Canada East account region is Toronto and cannot be changed after account creation. Supabase documents that Pro projects receive seven daily backups, that database backups omit Storage object bodies, and that logical exports remain available through the CLI even when physical backups are enabled.

Primary references:

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/troubleshooting/download-logical-backups
- https://www.backblaze.com/docs/cloud-storage-object-lock
- https://www.backblaze.com/docs/cloud-storage-data-regions

## Coverage boundary

An accepted logical receipt covers exactly eight units: application schemas/catalog, roles/memberships/grants/default ACLs, the migration ledger, application data, Auth identity data/password hashes, Auth control-plane metadata, Storage metadata, and Storage object bodies.

Storage object bodies are `NOT_APPLICABLE` only while their exact aggregate count is zero. The first non-zero object count requires a separately accepted body-recovery contract and digest. Supabase database backup evidence cannot satisfy that unit.

Logical export mechanics must treat these as separate evidence classes:

- roles and schema/data export;
- migration-ledger preservation;
- custom changes in managed Auth and Storage schemas;
- Auth identity/password-hash data;
- Auth control-plane configuration that is not represented by a database dump;
- provider Physical backup inventory;
- Storage object bodies.

The exact export and restore commands remain action-time implementation evidence. Source text must not embed connection values, credentials, private keys, raw rows, SQL bodies, user identifiers, or provider payloads.

## Receipt acceptance

The deterministic validator requires:

1. the exact project identity and source commit;
2. safe Postgres/tool versions and UTC timestamps;
3. the recovery point (`snapshot_at`) within the eight-hour freshness limit, regardless of how recently upload completed;
4. plaintext, ciphertext, migration-ledger, and canonical manifest SHA-256 values;
5. streaming `age` encryption with no persistent plaintext;
6. at least two distinct public recipient IDs;
7. an immutable destination version plus current compliance-mode Object Lock evidence;
8. a separate, closed, current accepted-exports manifest whose canonical digest matches the receipt, whose immutable export identities are strictly time-ordered and distinct, and whose exact current-export entry lets the validator derive first-of-month status; retention is 35 days generally and 400 days when the current export is the first manifest entry;
9. all eight coverage units with aggregate counts and private digests;
10. current independent-watchdog and provider Physical-backup evidence;
11. current budget-stop control, the four-unit monthly report, and projected cost at or below the $15 manual-approval ceiling;
12. a canonical `FP-MAN-015` decision reference;
13. production-service RTO remaining `UNKNOWN`.

The accepted-exports manifest is supplied independently from the receipt at validation time. It carries only completion timestamps, immutable destination versions, ciphertext digests, and a sanitized source-evidence digest. The validator checks its closed schema, canonical digest, observation window, UTC month, strict ordering, unique immutable identities, and exactly one correlation to the current receipt; a self-reported ordinal cannot select short retention.

The JSON Schema closes the complete receipt, accepted-exports manifest, and every nested evidence object; unrecognized properties cannot be accepted merely because they evade heuristic field-name checks. Calendar-invalid timestamps, malformed or missing monthly-selection evidence, negative or uncorrelated recovery durations, future-dated, stale, over-ceiling, incomplete, or digest-mismatched evidence fail closed. A projected cost over $5 is a warning; a cost over $15, or unavailable reliable budget-stop control, requires a new manual approval before execution continues.

## Restore-to-new-project quarantine

`RESTORE_REHEARSED` requires a new isolated project with no application environment, Auth delivery/hooks, database webhooks, DNS/aliases, Edge schedules, `pg_cron`, `pg_net`, queues, Realtime, Storage events, subscriptions, or wrappers enabled. Each disabled unit requires a distinct evidence digest. Traffic remains off and canaries are synthetic only.

Catalog, security, Auth, and data parity each require an aggregate count and private digest. The rehearsal records failure declaration, restore start, and data-plane-ready timestamps. The validator derives RPO from `snapshot_at` to failure declaration and derives quarantined data-plane RTO from failure declaration to data-plane readiness; the submitted numerical values must exactly equal those calculations. The derived RPO must be no more than eight hours and the derived quarantined data-plane RTO no more than twelve hours. These are approved objectives, not production-service measurements. Production-service RTO stays `UNKNOWN` until a separately authorized rehearsal measures the entire service path.

A failed restore clone is quarantined. Deleting it requires separate exact authority; the recovery packet cannot silently dispose of evidence.

## Lifecycle and authority

The closed lifecycle is `PLANNED`, `SOURCE_READY`, `EXECUTION_BLOCKED`, `BACKUP_CURRENT`, `RESTORE_REHEARSED`, or `DRIFTED`. This repository may claim `SOURCE_READY` for the reviewed contract while every execution gate remains `BLOCKED`.

Provider setup, credential or key installation, workflow publication, backup generation/upload, restore rehearsal, target schema/Auth/data bootstrap, cutover, source pause/deletion, and production each require a separately admitted action packet. Any drift in project identity, policy, coverage, freshness, cost controls, destination immutability, or quarantine returns the lane to `DRIFTED` or `EXECUTION_BLOCKED`.

## Source verification

From the repository root:

```text
npm ci
node --test test/independent-backup-contract.test.mjs
npm run validate
npm test
npm run verify
npm run verify
```

The focused test must pass twice. Repeated full verification reports must be byte-identical. Repository verification enforces canonical JSON, LF endings, allowed paths, and secret/machine-path boundaries.
