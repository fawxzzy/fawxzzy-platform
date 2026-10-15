# Private development operations source proposal

Status: `OWNER_DECISION`

## Scope

This package is repository-only, secret-free and non-executable at every provider boundary. It is a concrete candidate for owner contract adoption; green checks do not make it adopted or installed. It includes no production Auth gate, digest implementation, database schema, SQL, network client or consumer route.

## Verify local source

```text
node --test test/development-operations-contract.test.mjs
npm run validate
npm run verify
git diff --check
```

Run focused validation twice and compare a deterministic summary, excluding runner timings. Require the exact changed-path allowlist, canonical JSON/LF, repository secret/machine-path checks and unchanged executable artifacts. Review the whole immutable patch independently. Preserve owner checkouts, prior drafts and unrelated changes.

## Next acceptance boundaries

1. The canonical data owner accepts or revises all candidate wire choices. Resolve operator-grant storage, source observation thresholds and exact snapshot transport in separately scoped implementation packets. Consumer owner accepts the private response contract. Until then status remains OWNER_DECISION and owner_adopted=false.
2. Prove producer/revision identity, canonical digest vectors, explicit version dispatch and conflict quarantine with synthetic adversarial data before any live intake. A valid source schema alone does not grant trust.
3. Choose physical storage separately. Rehearse exact retained-source mapping, dependencies, append-only history, deterministic replay and rollback on an admitted disposable target. Preserve archived originals; do not reactivate retired DiscordOS rows.
4. Prove server-only operator authorization/revocation and response redaction. Deny ordinary/signed-out/cross-user requests and demonstrate no operational data in their HTML, JSON, static assets, caches or logs.
5. Prove transactional projection, complete watermark and all five health states. A fixture access_result or accepted_redacted_projection is a hypothetical input, never live evidence.
6. Only a later exact apply/release packet may install and verify the actual private consumer. Receipt should distinguish source review, owner adoption, rehearsal, installation and runtime acceptance.

## Failure prevention

Before working from a retained draft, compare immutable current owner visibility, writer, source and lifecycle contracts. A newer unpublished local receipt does not supersede accepted architecture. An old export whose command was deliberately retired must not be silently restored as a current feed.

## Observation and rollback

Record aggregate accepted/duplicate/quarantined/incompatible counts, projection revision, source watermark, lag, access denials and rollback result without source bodies or personal fields. Future rollback preserves full source history and restores only a proven previous projection. This local proposal itself requires no provider rollback because it has zero provider effects.
