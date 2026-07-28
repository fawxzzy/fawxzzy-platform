# Independent backup contract — GitHub recovery-vault governance

Status: `BLOCKED` · version `2.2.0` · decision `FP-MAN-015`

This document describes a source-only, zero-dollar governance contract for an independent recovery path for the shared Supabase project. It does not create a repository, enable releases, export data, access keys, upload assets, change retention, restore anything, apply migrations, or alter production.

## Governance lineage

The active source contract preserves `FP-MAN-015` and binds the operator direction event `onv1_706060909f09a341088af11beac48acd10e8d6d7c4ef02b6985df5170df76fa6`. `FP-MAN-051` is retained only as superseded history with zero Backblaze or Cloudflare authority. `FP-MAN-052` is a closed zero-cost Phase 1 authority for repository provisioning and immutable-release enablement only; it grants no backup, export, key, release, retention, restore, Supabase, apply, deployment, or production authority. No historical provider decision is reopened or reinterpreted.

## Planned destination

The destination is the dedicated private GitHub recovery-vault repository `fawxzzy/fawxzzy-recovery-vault`, separate from the public Platform source repository and the Recovery Automation source repository. The content-addressed FP-MAN-052 Phase 1 result proves the repository is private, empty, and has immutable releases enabled. Its sanitized readback records zero releases, assets, branches, tags, workflows, Actions/Dependabot/Codespaces secrets, environments, hooks, and deployments at actual incremental cost USD 0. This capability evidence does not prove cryptographic backup readiness. This contract makes no legal or compliance-grade WORM claim.

Google Drive mirroring is deferred to a separate optional provider packet and is not required for this design.

## Supabase provider boundary

Supabase's current backup documentation distinguishes logical and physical database backups. Physical backups and PITR may not provide a downloadable dashboard artifact, and database backups contain Storage metadata rather than Storage object bodies. The separate [restore-to-new-project](https://supabase.com/docs/guides/platform/clone-project) flow is also database-focused: Storage objects and settings, Edge Functions, Auth settings and API keys, Realtime settings, database extensions and settings, and read replicas require separate reconfiguration or evidence.

Those provider capabilities cannot substitute for this independent archive. The source contract therefore rejects a default `supabase db dump` as complete proof, requires a separate current Storage-body receipt whenever the object denominator is nonempty, and keeps provider restore, configuration, credentials, application traffic, and clone disposal blocked. Current provider documentation: [Database Backups](https://supabase.com/docs/guides/platform/backups), [Backup and Restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), and [Restore to a new project](https://supabase.com/docs/guides/platform/clone-project).

## Export and encryption boundaries

The future export path must stream a logical Supabase database dump through `age` encryption without persistent plaintext. Automation may use public recipient material only; at least two public age recipient fingerprints are required, and private-key access remains blocked. A default `supabase db dump` alone is incomplete because all eight coverage units remain required:

1. application schemas and catalog;
2. roles, memberships, grants, and default ACLs;
3. migration ledger;
4. application data;
5. Auth identity data and password hashes;
6. Auth control-plane metadata;
7. Storage metadata; and
8. Storage object bodies.

Storage object bodies retain their separate recovery contract boundary. A nonempty body denominator without a current receipt remains blocked.

## Release and retention contract

Encrypted chunks are capped at `1,900,000,000` bytes and each release at `1000` assets. The lifecycle is draft upload, publish once, immutable verification, and no tag reuse. Each release binds a signed sanitized manifest, SHA-256 digests, public recipient fingerprints, source identity, and a required GitHub release attestation. Whole-release deletion requires separate destructive authority.

The retention policy target is operational rather than WORM: 35 days for standard releases and 400 days for the first provider-accepted release in each UTC month. Receipt version `2.1.0` removes the caller-supplied first-month boolean. Here, provider acceptance has one closed meaning: the native GitHub release object's `published_at` timestamp. The candidate's `published_at`, not the backup snapshot or completion timestamp, determines the UTC month and starts its 35-day or 400-day retention deadline. A July 31 snapshot that GitHub publishes on August 1 therefore belongs to the August selection ledger.

A `CURRENT` receipt binds its candidate to a complete `GET /repos/{owner}/{repo}/releases` inventory using the pinned `2022-11-28` GitHub REST API version. Each eligible entry carries native `id`, `tag_name`, `draft`, `prerelease`, `immutable`, `created_at`, and `published_at` fields. The closed inclusion predicate is `draft=false`, `prerelease=false`, `immutable=true`, and `published_at` inside the ledger month. Entries are ordered by `published_at` and then `tag_name`; the unique first entry is the only candidate eligible for `FIRST_MONTHLY_400_DAY`, and every later candidate must use `STANDARD_35_DAY`.

The monthly ledger carries its exact entry count, stable native identities, raw-response page digests, `per_page=100`, a terminal page proving pagination exhaustion, total native release count, matching first-page ETag digests from before and after enumeration, inventory and pagination-snapshot digests, completeness and single-head concurrency state, observation time, and a domain-separated Ed25519 signature authenticated by the existing distinct independent-readback trust anchor. Missing, duplicate, reordered, cross-month, ineligible, stale, unsigned, forged, incomplete, pagination-truncated, ETag-changing, ambiguous, or forked inventories fail closed. The proof selects a retention class; it grants no backup generation, release publication, retention mutation, or deletion authority. Any deletion, shortening, or retention-policy change remains separately gated. Maximum cost is exactly `$0`; unknown or paid capability is a hard stop.

## Evidence and prohibited material

Receipts are aggregate-only and use lexicographic object-key ordering, preserved array order, two-space JSON, LF line endings, and SHA-256 digests. They may contain sanitized counts, sizes, timestamps, release identity, source identity, recipient fingerprints, and attestation references only. They must never contain connection values, credentials, private keys, provider payloads, raw rows, raw SQL, row identifiers, or user identifiers.

The version `2.1.0` backup receipt is a closed object under the `2.2.0` source-governance contract. Historical `2.0.0` receipts remain historical and cannot be promoted to `CURRENT`; they lack the monthly-ledger proof. The current complete field denominator is frozen in the contract and schema; missing fields, extra fields, substituted coverage units, or caller-defined safety labels fail closed. Schema failure terminates validation before any nested semantic access, so malformed arrays or objects return deterministic findings instead of throwing. A `CURRENT` receipt must prove all eight coverage units, exact aggregate-count keys, source commit and migration-ledger identity, bounded chunk and asset counts, ciphertext and asset-manifest digests, exact-zero-cost evidence, freshness within 28,800 seconds, watchdog evidence, Storage-body state, the signed monthly selection, the resulting 35-day or 400-day deadline, and a restore-quarantine state with all twelve external-effect classes disabled. A `BLOCKED` receipt must keep freshness, watchdog, Storage-body evidence, release attestation, immutable/tag state, signer, independent readback, and an empty monthly ledger in one coherent blocked combination; mixing `CURRENT` or `VERIFIED` subevidence into a blocked receipt fails closed. A status label alone is never evidence.

Receipt identity is acyclic and recomputable. `source_state_sha256` binds the closed source-state projection; `manifest_sha256` binds the sanitized manifest projection; `receipt_id` binds every required receipt field except `receipt_id` itself and the release attestation. A public evidence event is valid only when its identifier is exactly `onv1_` plus the SHA-256 digest recomputed from the complete canonical receipt payload. Relabeling, cross-correlation, replay under a different release identity, or a caller-asserted digest fails closed.

The GitHub release attestation is also a closed object. A `CURRENT` receipt requires a pinned Ed25519 publisher trust anchor and signature over the domain-separated attestation status, schema, repository, release tag, immutable-release state, `tag_reused`, exact asset-manifest, manifest and ciphertext digests, observation time, signer identity, and independent-readback evidence digest. The readback is not a caller-computed self-hash: it has its own domain-separated Ed25519 signature, pinned reader trust anchor, native GitHub receipt digest, reader identity, observation method, repository, release tag, immutable and tag-reuse state, exact assets, observed `receipt_id`, timestamp, and content address. The monthly ledger uses that independent reader's pinned trust anchor with a separate signature domain, so a release publisher cannot self-assert the accepted-release inventory. The signed subject includes the exact GitHub API mapping, inclusion predicate, stable identity fields, pagination proof, and native release entries. The reader identity and key must differ from the release publisher and signing key. The checked-in contract marks provider capability and immutable-release setup `CURRENT` while both trust anchors remain `BLOCKED`; therefore it still cannot certify a `CURRENT` backup receipt until separately reviewed key, recipient, signed-manifest, ciphertext, coverage, watchdog, monthly-ledger, and independent-readback evidence exists.

The executable proof suite proves one-release 400-day selection and later-release 35-day selection. It rejects incomplete, duplicate, missing, reordered, cross-month, stale, forged, relabeled, ambiguous, or forked monthly inventories, as well as quarantined-restore evidence when the closed external-effect or parity denominator is missing or reordered, application traffic is promoted, or failed-clone disposal is treated as implicitly authorized.

Decision history is position-specific and closed. `FP-MAN-015` must retain `authority: SOURCE_GOVERNANCE_ONLY`; `FP-MAN-051` must remain `SUPERSEDED` for `ZERO_BACKBLAZE_OR_CLOUDFLARE_AUTHORITY` with `provider_authority: NONE`; and `FP-MAN-052` must remain limited to zero-cost repository provisioning plus immutable-release enablement with `backup_authority: NONE`.

Only provider setup, GitHub vault provisioning, and immutable-release enablement are `CURRENT`. Credential or key installation, workflow publication, backup generation, export, encryption, upload, release publication, retention deletion, restore, SQL/Auth/data access, migration/bootstrap apply, target bootstrap, cutover, source pause or deletion, deployment, production, billing, paid capability, and destructive actions remain `BLOCKED`.

## Verification

From the isolated source worktree, run contract validation, the focused independent-backup suite, the full test suite, and repository verification twice with byte-identical output. Confirm canonical JSON/LF output, the five-path ceiling, no secrets/PII/machine paths/raw provider payloads, all negative regressions, unchanged migration bytes, and `apply_admitted=false`. Keep the source unstaged; publication and independent review are separate lifecycle gates.

```text
node scripts/validate-contracts.mjs
node --test --test-concurrency=1 test/independent-backup-contract.test.mjs
npm test
npm run verify
```
