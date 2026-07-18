# Micro recovery source runbook

Status: `CURRENT`
Decision: `FP-MAN-013`
Provider execution: `BLOCKED`
Backup execution: `BLOCKED`
Restore execution: `BLOCKED`

## Purpose

This runbook validates the source contracts for the approved Pro/Micro recovery posture. It does not connect to Supabase, create a backup, choose a destination, install a key, schedule work, create a restore project, or load schema, Auth, or data.

## Source verification

From the repository root:

```text
npm ci
npm run validate
npm test
npm run verify
npm run verify
```

The two verification reports must be byte-identical. Validation must remain offline and reject provider URLs, connection values, keys, secrets, raw rows, SQL, user identifiers, and machine paths.

## Frozen source denominator

The recovery contract binds:

- the Fawxzzy shared Supabase project, immutable ref `bxtcuhkotumitoqtrcej`;
- Pro plan and Micro compute;
- provider daily Physical backups with seven-day retention;
- deferred and unauthorized PITR and compute resize;
- an independent encrypted export required before shared Auth or data load;
- seven backup coverage units;
- twelve external-effect units;
- nine action-time execution gates;
- sanitized backup, quarantine, restore, retention, and alert receipts.

## Action-time preflight

All of these remain held until a separately authorized packet proves them:

1. exact export cadence and freshness threshold;
2. exact retention interval;
3. independently governed destination and immutable-version capability;
4. encryption algorithm and metadata-only key reference;
5. secure key installation, custody, and rotation;
6. alert channel and delivery proof;
7. supported logical export and Auth coverage mechanism;
8. current provider backup readback;
9. restore project capacity, region, cost, and action-time approval;
10. numerical RPO/RTO objectives.

Any `UNKNOWN` remains a stop condition. No manual policy question is created merely to replace missing execution evidence.

## Backup receipt sequence

When separately admitted, an owner packet must:

1. capture a fresh sanitized source denominator;
2. stream the export through client-side encryption before destination delivery;
3. prevent persistent plaintext;
4. record only the metadata key reference;
5. prove destination versioning and immutability;
6. record ciphertext bytes, ciphertext SHA-256, completion time, and retention expiry;
7. record aggregate coverage counts and private digests for all seven units;
8. calculate the canonical manifest digest using lexicographically sorted object keys, preserved array order, two-space JSON, one final LF, and SHA-256, excluding the manifest's own digest field;
9. deliver and verify stale/failure alerts;
10. leave source routing and provider configuration unchanged.

The manifest cannot become `CURRENT` while any required unit is `UNKNOWN`.

## Restore-to-new-project rehearsal

A later authorized rehearsal must use one named backup version and a newly created isolated project. Before catalog or data inspection, it must prove the twelve-unit external-effect denominator disabled. Application credentials, DNS, aliases, and environment routing remain absent, and traffic remains unreleased.

Readback must compare exact aggregate denominators and private digests for:

- catalog objects and ownership;
- RLS, grants, policies, functions, triggers, and default ACL posture;
- application data;
- Auth identity data;
- Auth control-plane configuration.

Database restore evidence does not prove Storage body recovery. A non-zero Storage object count requires a separate body-recovery contract and receipt before rehearsal acceptance.

## RPO/RTO measurement

The rehearsal records exact UTC seconds for the recovery point, failure declaration, restore start, and restore completion. The validator computes:

- RPO as failure declaration minus recovery point;
- RTO as restore completion minus restore start.

Claimed numerical measurements must equal the deterministic calculation. Objective values remain `UNKNOWN` until explicitly accepted after measured evidence exists.

## Observation and rollback

Observation begins only after quarantine and parity pass, still without production traffic. Any digest mismatch, incomplete denominator, unexpected effect, restore error, or stale backup blocks acceptance.

Rollback means stopping the rehearsal and preserving the source, backup version, manifests, and evidence. It never means mutating a source project. Clone disposal, retention expiry, backup deletion, source pause, and source deletion each require their own later authority.

## Alerts

The source contract requires these event classes:

- backup failure;
- stale backup;
- digest mismatch;
- destination write failure;
- incomplete manifest;
- restore rehearsal failure.

The destination channel and delivery mechanism remain `UNKNOWN` until installed and tested securely.
