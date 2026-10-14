# ADR 0007: Private development operations contract proposal

Status: `OWNER_DECISION`

## Context and boundary

Socials OS architecture at `6662045aaedb20b0da657ebd982faf9729004afc` accepts an operator-only, non-public operations read model. ADR0005 already defines the provider-neutral logical `work` domain. A public static owner-export snapshot does not satisfy either source freshness or private access. This proposal reuses those decisions. It grants no source adoption, Auth, SQL, provider, apply or release authority.

## Proposed wire decisions

The closed contract instance under `contracts/v1/operations/` captures seven proposed boundaries. All remain pending owner adoption:

1. A trusted source envelope declares the exact schema and binds server-verified immutable producer identity, source revision, mapping version and unchanged payload. V2 body identity must match. V1 remains non-self-identifying with its original vocabulary; no implicit conversion.
2. SHA-256 covers an RFC8785 canonical object containing schema identity, producer identity, source revision, mapping version and payload with its own `digest` field omitted. This defines proposed bytes, not an implemented digest verifier. The later implementation must supply independent canonicalization vectors, timestamp/Unicode edge cases and exact source binding.
3. `(producer_identity,event_id)` is the global event key. An exact producer/event/revision/digest repeat is a no-op. Conflicting reuse is quarantined, never overwritten; a supersession uses a new event ID with explicit predecessor. The producer's immutable identity must not be inferred from its submitted name.
4. State events require an exact validated card or board snapshot bound to ID, schema, source revision, snapshot digest and mapping version. Other events append history only. Prose cannot mutate lifecycle. The snapshot transport and mapping remain a separate implementation prerequisite; this document does not add fields to published Socials schemas.
5. Ordering uses occurrence instants without precision loss, then producer identity, event ID and digest in UTF-8 byte order. Late events rebuild atomically from accepted history. A watermark covers the complete sorted producer/revision set, not one convenient latest event. Each producer requires an explicit maximum observation-age policy; unknown thresholds or missing producers prevent healthy truth. Source commit age is not freshness of the latest verified observation.
6. A server-verified canonical subject requires a server-owned operator grant and revocation check. Authentication alone, editable metadata or client assertions never suffice. Grant storage and its implementation remain `UNKNOWN`.
7. The response uses a closed field allowlist with opaque evidence handles, mandatory redaction before serialization and no restricted summaries, raw references or source objects. No public/static operational payload or shared cache. A sanitized flag and noindex are not security proofs.

## Health and synthetic examples

Only `healthy` exposes authoritative current truth. `stale` and `reconciling` may show a previous accepted redacted projection with a visible marker and watermark. `unavailable` exposes no cards. `incompatible` quarantines affected records; the conservative synthetic examples withhold the whole payload. All states are read-only.

The 72 examples exhaust three hypothetical access results, six hypothetical health inputs, projection presence and schema-identity validity. They validate the proposed policy, not credentials, operator grants, redaction, source integrity or a running service. The evaluator is named `evaluateSyntheticOperationsFixture` to preserve that distinction; it must not be imported as a production authorization gate.

## Migration and ownership

FawxzzyPlatform remains the sole canonical writer and owns storage, validation and projection. Socials owns contribution schemas. FawxzzyWeb owns private presentation and authenticated reads. The migration coordinator prepares proposals and evidence without gaining owner publication rights. Physical work storage is unknown; no new schema or tables are selected. Discord IDs remain optional external references. Retained historical board data is provenance until an admitted transformation proves exact mappings and quarantine. Music Sesh remains independent.

## Verification and rollback

Schema, semantic and negative tests cover fixed proposal boundaries and all synthetic cases. Additive coverage has its own counters, preserving sealed executable-bundle counts28/27/27 and convergence counts3/3/1. All existing executable artifacts remain byte-identical. Reverting this source proposal changes no provider or runtime state. Runtime transaction, redaction, operator isolation, recovery and installed acceptance remain unperformed prerequisites.
