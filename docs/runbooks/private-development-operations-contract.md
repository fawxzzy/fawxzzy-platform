# Private development operations source proposal

Status: `OWNER_DECISION`

## Scope

This package is repository-only, secret-free and non-executable at every provider boundary. It is a concrete candidate for owner contract adoption; green checks do not make it adopted or installed. It includes no production Auth gate, database schema, SQL, network client or consumer route. The candidate helpers below implement bounded parsing, proposed covered-byte computation, supplied-digest/carrier comparison and complete contribution-schema validation. They do not authenticate source or authorize access.

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

Expected integrity evidence is detached from both that envelope and its source
payload: `detached_source_proof.digest` must be bound to an independently verified
immutable source and the exact envelope. All five contribution schemas require
this evidence under the candidate policy. The carrier rules are:

| Source schema | Payload digest rule |
| --- | --- |
| Card v1 | Forbidden by the unchanged source schema |
| Board v1 | Forbidden by the unchanged source schema |
| Event v1 | Forbidden by the unchanged source schema |
| Board v2 | Forbidden by the unchanged source schema |
| Event v2 | Existing required field must match the detached digest |

Both supplied digests use `sha256:` followed by 64 lowercase hexadecimal digits;
the hash helper returns only the 64 digits. Never add or replace a payload field
to satisfy integrity validation. Unknown schemas, missing proof, unverified source
binding or a mismatch must prevent acceptance and current-truth claims. A detached
digest submitted by an untrusted caller is not verified source evidence. Its
transport, source verification and runtime integration remain adoption prerequisites. The local comparison helper below supplies the bounded candidate comparison only.

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
are performed by the separate candidate integrity helper below; omission in this
hash helper is for digest computation only.

Run `node --test test/development-operations-digest.test.mjs` for normative numeric
and UTF-8 vectors, envelope binding, mutation preservation and adversarial inputs.
Only synthetic fixtures are used; live intake, storage, authorization, redaction,
mapping, rollback and consumer acceptance remain separate prerequisites.

## Candidate bounded JSON parser

`scripts/lib/development-operations-json.mjs` exports
`parseCandidateOperationsJson` for the prerequisite above. It accepts a primitive
string or a genuine Uint8Array (including Buffer), checks UTF-8 bytes with fatal
decoding, and rejects a leading BOM. For strings already decoded by the caller,
the caller must have rejected invalid original UTF-8; replacement characters
cannot reveal bytes lost by an earlier permissive decoder.

Following [RFC 7493](https://www.rfc-editor.org/rfc/rfc7493.html), decoded object
names must be unique within each object, and strings and names cannot contain
unpaired surrogates or Unicode noncharacters. Escaped names participate in the
same duplicate check. Unicode normalization and timestamp strings are preserved.
Numbers use ordinary finite IEEE754 binary64 semantics, including rounding and
underflow; precision-bearing identifiers and exact decimals must be schema-approved
strings. The parser is not an arbitrary-precision numeric transport.

Raw input is limited to 1048576 UTF-8 bytes (including whitespace), depth 64 and
100000 values, matching the candidate digest limits. Shared byte buffers,
unsupported input objects and proxies are rejected. Input coercion, getters,
iterators and revivers are never called. Errors contain a fixed code, never
source data or field names. Prototype-like names remain ordinary own data fields;
later consumers must not copy them into prototype-sensitive destinations.

Run `node --test test/development-operations-json.test.mjs` for duplicate-name,
encoding, grammar, size, depth, count and digest-composition proofs. This local
candidate is not wired to an intake endpoint. The contribution helper below
adds schema/version validation. Trusted producer/revision binding, quarantine
and private consumer authorization remain separate acceptance gates.

## Candidate detached integrity comparison

`scripts/lib/development-operations-integrity.mjs` exports
`verifyCandidateOperationsIntegrity(envelopeInput, proofInput)`. Both inputs are
raw JSON strings or Uint8Array bytes and independently use the bounded parser
above, including duplicate-name rejection. The proof input is the local value
of `detached_source_proof` and must contain exactly one field, `digest`. No
`verified` flag or other authority assertion is accepted in this value. This
local API does not define or install the eventual proof transport.

The helper validates the exact five-field envelope shape and nonempty string
bindings, recognizes only the five declared carrier identities, and requires
an exact `sha256:` prefix plus 64 lowercase hexadecimal digits. Event v2 must
already contain the same correctly formatted payload digest; the other four
schemas must not contain that field. All cases compare the supplied digest
against independently recomputed canonical covered bytes. Nothing is inserted,
removed or rewritten in either input. Each raw input has the parser's existing
byte/depth/value limits; their combined raw-byte ceiling is twice its per-input
byte limit. Errors use fixed codes without input contents.

On success it returns only the matching prefixed digest. This does not prove
that a caller's producer/revision claims or detached evidence are authentic.
A caller able to alter both payload and proof can compute a matching pair.
Full contribution-schema validation (including v2 body/envelope identity),
trusted immutable source binding, mapping and operator authorization must still
succeed before data is accepted. The contribution wrapper below supplies the
first of those checks. No acceptance/current-truth/access flag is
returned, and this candidate is not wired to an intake or production gate.

Run `node --test test/development-operations-integrity.test.mjs` for all five
carrier rules, independent expected hash bytes, tampering, malformed/duplicate
proof, raw-input bounds and immutability. Minimal carrier fixtures deliberately
do not assert full source-schema validity.

## Candidate complete contribution validation

`scripts/lib/development-operations-contribution.mjs` exports
`verifyCandidateOperationsContribution(envelopeInput, proofInput)`. It composes
the bounded raw parser and detached-integrity comparison with Ajv 8.17.1 checks
against all five complete Socials contribution schemas. Only the exact declared
identity dispatches a validator. Required fields, closed properties, types,
enums, patterns, array constraints and event target requirements are enforced.
V2 `contract_version` must match the envelope schema and `source_revision` must
match the envelope revision byte for byte. V1 records retain their original
schemas and vocabulary; there is no implicit migration or revision rewriting.

The schema copies under `contracts/v1/operations/source-schemas/` preserve the
parsed definitions from Socials commit
`6662045aaedb20b0da657ebd982faf9729004afc`. Only JSON formatting changes to meet
this repository's canonical two-space/LF rule. `source-manifest.json` records
both upstream-byte and local-byte SHA-256 hashes. The module checks the five
fixed local hashes before compiling; input cannot choose a file or supply a
schema. There is no remote schema fetch. These pins establish source custody,
not the authenticity of an incoming producer or contribution.

Date-time validation uses pinned `ajv-formats` 3.0.1 in full mode, preceded by
the [RFC3339](https://www.rfc-editor.org/rfc/rfc3339#section-5.6) grammar's explicit
time separator, zone shape and local clock/offset ranges. The grammar guard
also applies during leap-second validation, when the library alone can accept
out-of-range local components. Calendar dates and leap-second position are
checked by the library. Fractional precision, case and offset strings are retained;
timestamps are never converted to Date values. This is not a historical
leap-second bulletin, chronological ordering or observation-freshness check.
Coercion, defaults and unknown-property removal are disabled. Ajv's detailed
errors are cleared after each validation; rejection exposes a fixed error code
and no caller field names or values.

Each raw input retains the parser's byte/depth/value ceilings; the helper
returns only the matching prefixed digest and never modifies either input.
A fully valid schema and matching digest still do not prove trusted immutable
source identity, approved mapping, snapshot relations, private operator access,
redaction or owner adoption. This helper remains unwired to live intake.

Run `node --test test/development-operations-contribution.test.mjs` for all five
full positive fixtures, every required field, closed properties, types, version
and revision mismatches, malformed dates, legacy vocabulary, event targeting,
duplicate keys, UTF-8/bounds, digest tampering and input preservation.

## Candidate append-only event journal

`scripts/lib/development-operations-journal.mjs` exports
`appendCandidateOperationsJournal(historyInput, batchInput)`. Both inputs are
bounded raw JSON arrays. Each entry contains exactly `envelope` and
`detached_source_proof`, with the same values consumed by the complete
contribution validator. Only event v1 and event v2 enter this candidate journal.
Every retained history entry is revalidated; a caller-supplied disposition or
`verified` flag is not trusted. The API does not authenticate either input.

The result has `kind: candidate_only`, retained `entries`, recomputed
`dispositions` for each retained index and `results` for each batch index. Store
only `entries` as the next local candidate history input. These entries contain
unchanged private source bodies: this is an internal source helper, not a
redacted response or a public serialization boundary. No caller status, producer
name, role or valid digest grants trust, current truth or operator access.

The candidate behavior is:

- A new `(producer_identity,event_id)` is a `recorded_candidate`.
- An exact producer/event/revision/digest repeat is `duplicate_candidate` and
  adds no row. Its result reports the existing candidate disposition, including
  quarantine. Duplicate rows in submitted retained history are rejected rather
  than silently removing an original row.
- Conflicting reuse appends a `quarantined_candidate` with `IDENTITY_CONFLICT`,
  retaining both original and conflicting evidence. Each distinct conflict is
  retained once; repeating it does not clear its quarantine.
- Supersession requires a new event ID and an explicit earlier predecessor in
  the same producer's journal. Self, missing, ambiguous or quarantined references
  quarantine the new entry. The original entry and its source status are never
  rewritten. A later arrival does not silently rehabilitate an earlier
  quarantined reference. These conservative linkage rules await owner adoption.

Submission is limited to 256 history-plus-batch entries, counting duplicates,
and 1048576 bytes for their combined JSON serialization. Each raw input also
retains the existing parser's byte/depth/value limits. These local candidate
bounds are not a retention policy or an approved runtime transport. No entries
are truncated or evicted when a bound is reached. Parsing and all candidate
updates are local; a rejected batch returns no partial journal and changes no
caller input. Errors contain only fixed codes and no source content.

Arrival order is preserved, including occurrence strings and source statuses.
Both state and non-state events remain history candidates. This module does not
apply lifecycle prose, select a snapshot, normalize time, reorder late events,
compute a watermark or establish a transactional database projection. A conflict
can prevent a later predecessor link without deleting an earlier row; a future
trusted projection must derive its own complete consistency state from retained
history. Source trust, approved mapping, observation freshness, operator grants,
redaction and runtime adoption remain open prerequisites.

Run `node --test test/development-operations-journal.test.mjs` for v1/v2 append,
duplicate/conflict cases, predecessor rules, replay equivalence, retained-history
validation, adversarial identities, bounded submissions, fixed errors and
all-or-nothing batch failure. Fixtures are synthetic and no provider is invoked.

## Failure prevention

Before working from a retained draft, compare immutable current owner visibility, writer, source and lifecycle contracts. A newer unpublished local receipt does not supersede accepted architecture. An old export whose command was deliberately retired must not be silently restored as a current feed.

## Observation and rollback

Record aggregate accepted/duplicate/quarantined/incompatible counts, projection revision, source watermark, lag, access denials and rollback result without source bodies or personal fields. Future rollback preserves full source history and restores only a proven previous projection. This local proposal itself requires no provider rollback because it has zero provider effects.
