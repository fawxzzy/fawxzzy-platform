# Storage, Edge, and Realtime execution denominator

## Purpose

This runbook describes the offline evidence contract at
`contracts/v1/rehearsal/storage-edge-realtime-execution-denominator-contract.json`.
The contract closes the non-row execution denominator that must be reviewed
before a separately authorized disposable-target rehearsal can claim parity.
It is source evidence only: `SOURCE_READY`, `EXECUTION_BLOCKED`, and
`apply_admitted=false`.

The contract contains no provider connection, credential, SQL bytes, executor,
deployment command, rollback command, or deletion authority. The checked-in
receipt is the one canonical `BLOCKED` projection. A `CURRENT` receipt can be
validated only with action-time evidence supplied by an external, separately
authorized executor.

## Immutable source bindings

The contract binds:

- exactly 122 source migrations and zero SQL under the standard migration
  discovery path;
- the separate migration-package and governance-manifest identities;
- the four ordered inert SQL review artifacts, their byte lengths and digests,
  the generator/config/verifier identities, and the 721 executable-statement
  denominator;
- a reviewed promoted-byte manifest digest and a closed expected-state query
  model.

The validator reads each inert artifact and rejects byte, order, path, toolchain,
package, governance, bundle-manifest, or query-model drift. SQL bytes and an
executor are forbidden in the receipt.

## Closed execution denominator

The fixed action order captures the following surfaces before and after any
future separately authorized rehearsal:

1. **Storage** — complete bucket settings, object metadata, multipart uploads,
   object-body count/bytes/checksum commitments, exhausted pagination, and two
   fresh independent body-inventory reads. A zero-object result must be
   explicitly `ZERO_COMPLETE`; a nonzero result must be fully enumerated and
   stable across both reads. Future body transfer must use the Storage API, not
   direct SQL. Object keys and bodies never enter the receipt.
2. **Edge Functions** — complete function, route, schedule, hook, and
   secret-name-set commitments, including entrypoint/import-map/static-asset
   configuration and `verify_jwt` policy. Secret values are forbidden. The
   evidence includes zero invocation/egress and separately authenticated
   undeploy and credential-revocation receipts.
3. **Realtime** — complete service settings and limits, publication membership,
   replica identity for every published table, private-schema RLS/grants, the
   six JSON/binary client/REST/database Broadcast paths, message/replay
   disposition, and an explicit `EPHEMERAL_NOT_MIGRATED` Presence disposition.
   Connected clients and emitted events remain zero during rehearsal evidence.
4. **Outbound effects** — an exact ordered denominator for Vault, Cron,
   `pg_net`, database webhooks, wrappers, foreign servers, subscriptions, and
   other outbound units. Two complete reads must agree; history growth and
   external effects must remain zero. URLs and secret material are redacted.
5. **Data API** — sanitized action-time preimage, contained postimage, and
   rollback readbacks using only the `rest:read` OAuth scope and
   `data_api_config_read` permission. JWT secrets, headers, and raw provider
   responses are never persisted. Bootstrap containment is disabled with no
   exposed schemas, `extensions` as the only extra search path, and automatic
   public exposure off.

The complete read A/read B pair recomputes the closed expected-state digest from
the exact subject, run, package, reviewed bundle evidence, every surface
aggregate, and the Data API postimage. Independent readers, executions, evidence
receipts, complete pagination, fresh observations, and a bounded observation
window are required. A fourth, distinct pinned Ed25519 trust domain authenticates
one forward-evidence ledger covering the bundle review, Data API postimage,
complete reads A/B, and zero-effect proof. The signed subject binds the exact
subject, run, trusted action time, package, manifest and query-model identities,
evidence receipts, observation times, completeness, and all zero-effect counts.
Caller-supplied keys or trust anchors are not receipt evidence.

The evidence chronology is enforced from the authenticated timestamps: bundle
review precedes the Data API execution preimage, the contained Data API postimage
precedes complete read A, complete read B precedes zero-effect verification, and
zero-effect verification precedes rollback completion. Labels in
`completed_actions` are not treated as chronology proof.

## Zero-effect and rollback proof

A `CURRENT` receipt requires all eight effect counters to be zero: outbound
network requests, Storage writes, Edge invocations, Realtime broadcasts and
clients, Cron and `pg_net` history growth, and webhook invocations.

Rollback follows the exact inverse order frozen in the contract. It must prove
the captured preimage was restored, bind a per-surface receipt set, and include
distinct independently authenticated target-absence and credential-revocation
receipts. Per-surface rollback, target-absence, and credential-revocation
evidence use three distinct pinned Ed25519 trust domains; their checked-in
anchors are blocked and uninstalled, so this source package cannot manufacture
a `CURRENT` receipt. A broad database drop is not rollback. The source contract never
authorizes rollback, disposal, credential revocation, provider mutation, or
apply.

## Receipt validation and redaction

The trusted action time is injected by the validator caller; the receipt's own
timestamp is not a clock authority. Evidence older than 900 seconds, future
evidence, incomplete or unexhausted pagination, missing/duplicate/reordered
surfaces, `UNKNOWN` promotion, mismatched reads, false-zero claims, nonzero
effects, bundle/review/read/zero-effect substitution, wrong signer or trust
identity, cross-phase chronology inversion, partial rollback, or reused evidence
identities fail closed.

Receipts permit only counts, booleans, timestamps, closed labels, and one-way
digests. Raw provider responses, project references, provider URLs, object keys
or bodies, secret values, credentials, SQL bytes, machine paths, and PII are
rejected.

## Provider documentation boundary

The source contract reflects the current documented provider boundaries:

- Storage object bodies are transferred through the Storage/S3 APIs and are
  separate from database-backup metadata:
  https://supabase.com/docs/guides/storage/management/download-objects
- Edge function configuration includes entrypoint/import-map and JWT
  verification policy; secrets remain provider-managed:
  https://supabase.com/docs/guides/functions/function-configuration
  and https://supabase.com/docs/guides/functions/auth
- Scheduled Edge invocations combine Cron, `pg_net`, and Vault and therefore
  belong in the outbound-effect denominator:
  https://supabase.com/docs/guides/functions/schedule-functions
- Realtime Broadcast supports client, REST, and database paths, while channel
  authorization depends on RLS over Realtime messages:
  https://supabase.com/docs/guides/realtime/broadcast
  and https://supabase.com/docs/guides/realtime/authorization

These references define evidence surfaces; they do not grant provider access or
execution authority.

## Verification

Run:

```text
npm run validate
node --test --test-concurrency=1 test/storage-edge-realtime-execution-denominator-contract.test.mjs test/target-bootstrap-contract.test.mjs test/auth-app-data-rehearsal-contract.test.mjs test/recovery.test.mjs
npm test
npm run verify
```

Run `npm run verify` twice and require byte-identical output. Also require
`git diff --check`, an exact eight-path source diff, unchanged inert/package
bytes, 122 migrations, zero standard migration SQL, and
`apply_admitted=false`.
