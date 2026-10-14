# Private development operations source proposal

Status: `OWNER_DECISION`

## Scope

This package is repository-only, secret-free and non-executable at every provider boundary. It is a concrete candidate for owner contract adoption; green checks do not make it adopted or installed. It includes no production Auth gate, database schema, SQL, network client or consumer route. The candidate digest helper below implements only proposed covered-byte computation.

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

## Candidate canonical digest helper

`scripts/lib/development-operations-digest.mjs` exports `canonicalizeOperationsJson`
and `computeCandidateOperationsDigest`. It follows [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html)
for primitive serialization, recursive UTF-16 key ordering and final UTF-8 bytes.
Array order, Unicode normalization form, timestamp strings and precision-bearing
strings remain unchanged. Event ordering by UTF-8 bytes is a separate contract.

The digest covers the exact five envelope fields. Only the root `payload.digest`
string is omitted; nested fields named `digest` remain covered. The helper returns
a lowercase hexadecimal SHA-256 and never mutates input. It does not compare a
submitted digest, validate a contribution schema, verify producer/revision identity,
authorize an operator, or make the proposal adopted. A caller must complete each
of those gates before accepting data, even when computed hashes match.

Inputs are plain JSON values represented as local JavaScript objects. Proxies,
accessors, custom prototypes, non-enumerable fields, symbol keys, sparse arrays,
cycles, invalid Unicode and non-finite numbers are rejected without invoking
input getters or `toJSON`. Candidate computation is bounded to depth 64, 100000
visited values and 1048576 serialized UTF-8 bytes. These implementation bounds
are not approved source-observation or runtime transport policy.

Callers must enforce bounded I-JSON parsing with duplicate-key rejection before
calling this value-based helper. `JSON.parse` alone loses duplicate-key evidence;
this module cannot recover it. Callers must preserve numbers requiring more than
IEEE754 precision as schema-approved strings and must not coerce timestamp strings
to dates before hashing. Syntax/version checks for a supplied `payload.digest`
remain external; omission of that field is for digest computation only.

Run `node --test test/development-operations-digest.test.mjs` for normative numeric
and UTF-8 vectors, envelope binding, mutation preservation and adversarial inputs.
Only synthetic fixtures are used; live intake, storage, authorization, redaction,
mapping, rollback and consumer acceptance remain separate prerequisites.

## Failure prevention

Before working from a retained draft, compare immutable current owner visibility, writer, source and lifecycle contracts. A newer unpublished local receipt does not supersede accepted architecture. An old export whose command was deliberately retired must not be silently restored as a current feed.

## Observation and rollback

Record aggregate accepted/duplicate/quarantined/incompatible counts, projection revision, source watermark, lag, access denials and rollback result without source bodies or personal fields. Future rollback preserves full source history and restores only a proven previous projection. This local proposal itself requires no provider rollback because it has zero provider effects.
