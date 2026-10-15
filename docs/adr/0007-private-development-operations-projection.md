# ADR 0007: Private development operations contract proposal

Status: `OWNER_DECISION`

## Context and boundary

Socials OS architecture at `6662045aaedb20b0da657ebd982faf9729004afc` accepts an operator-only, non-public operations read model. ADR0005 already defines the provider-neutral logical `work` domain. A public static owner-export snapshot does not satisfy either source freshness or private access. This proposal reuses those decisions. It grants no source adoption, Auth, SQL, provider, apply or release authority.

## Proposed wire decisions

The closed contract instance under `contracts/v1/operations/` captures seven proposed boundaries. All remain pending owner adoption:

1. A trusted source envelope declares the exact schema and binds server-verified immutable producer identity, source revision, mapping version and unchanged payload. V2 body identity must match. V1 remains non-self-identifying with its original vocabulary; no implicit conversion.
2. SHA-256 covers an RFC8785 canonical object containing schema identity, producer identity, source revision, mapping version and payload with its own `digest` field omitted when present. The expected digest travels separately in `detached_source_proof.digest`, bound to the server-verified immutable source and exact envelope. All five schemas require this detached evidence; a client-supplied claim is not authority. Card v1, board v1, event v1 and board v2 forbid a payload digest. Event v2 requires its existing `payload.digest` to match the detached digest. Both use `sha256:` followed by 64 lowercase hexadecimal characters; the candidate hash helper returns the hexadecimal portion. Never insert or replace a field in the retained source to make a check pass. Missing, unknown or mismatched evidence rejects acceptance and current-truth claims. The candidate serializer, bounded parser and supplied-digest/carrier comparison now have local source implementations. The comparison accepts two bounded raw JSON inputs and returns only the matching prefixed digest; it does not validate the complete contribution schema or authenticate a producer. Trusted source binding and detached-proof transport remain unimplemented adoption prerequisites.
3. `(producer_identity,event_id)` is the global event key. An exact producer/event/revision/digest repeat is a no-op. Conflicting reuse is quarantined, never overwritten; a supersession uses a new event ID with explicit predecessor. The producer's immutable identity must not be inferred from its submitted name.
4. State events require an exact validated card or board snapshot bound to ID, schema, source revision, snapshot digest and mapping version. Other events append history only. Prose cannot mutate lifecycle. The snapshot transport and mapping remain a separate implementation prerequisite; this document does not add fields to published Socials schemas.
5. Ordering uses occurrence instants without precision loss, then producer identity, event ID and digest in UTF-8 byte order. Late events rebuild atomically from accepted history. A watermark covers the complete sorted producer/revision set, not one convenient latest event. Each producer requires an explicit maximum observation-age policy; unknown thresholds or missing producers prevent healthy truth. Source commit age is not freshness of the latest verified observation.
6. A server-verified canonical subject requires a server-owned operator grant and revocation check. Authentication alone, editable metadata or client assertions never suffice. Grant storage and its implementation remain `UNKNOWN`.
7. The response uses a closed field allowlist with opaque evidence handles, mandatory redaction before serialization and no restricted summaries, raw references or source objects. No public/static operational payload or shared cache. A sanitized flag and noindex are not security proofs.

## Health and synthetic examples

The carrier distinction follows the five closed contribution schemas at the
accepted Socials commit above. Four use `additionalProperties: false` without a
`digest` property; only event v2 declares and requires it. A universal
`payload.digest` requirement would make valid older contributions impossible to
accept without rewriting them. The detached proof is outside the five-field
canonical envelope and outside the source payload; its transport and verification
must be accepted separately. A matching SHA-256 proves neither producer identity
nor permission. No contribution schema is changed by this proposal.

The candidate `verifyCandidateOperationsContribution` wrapper now composes
bounded parsing and integrity comparison with complete validation against those
five pinned schemas. It checks v2 body identity and source revision against the
envelope without rewriting v1 records. Canonical local schema copies retain
upstream and local byte hashes; Ajv and a pinned full date-time format validator
enforce the schema without coercion, defaults or property removal. Only the
matching digest is returned. Source authenticity, approved mapping, redaction,
operator access and live intake remain separate adoption prerequisites.

The candidate event journal now supplies bounded local append-only history,
exact-repeat no-ops and conflicting-identity quarantine using the complete event
validators. Its retained-history and batch inputs are raw JSON; prior computed
dispositions are never trusted input. A new-ID supersession must reference an
earlier, unique, non-quarantined candidate from the same producer. Missing, self,
ambiguous or quarantined references remain quarantined without rewriting source
or deleting history. These conservative local linkage rules remain proposed
adoption choices. The journal preserves arrival order; chronological replay,
snapshot mapping, trusted source transport and consumer redaction remain separate.
Caller `status`, role and producer strings cannot grant acceptance or access.

The integrated `rehearseCandidateOperationsProjection` now composes that journal
with exact card-snapshot associations, an explicit complete producer policy,
precision-preserving event ordering, closed display mapping and candidate
watermarks. Its input is one bounded raw JSON object. All producer, admission,
observation and redaction policy fields are hypothetical inputs: the module has
no trusted transport, operator check, database or live consumer. Every result
remains `candidate_only` and `authoritative: false`, even when its hypothetical
health is healthy. The separately reviewed runtime design must supply those
boundaries before adoption.

Mapping `socials-card-snapshot:v1` admits only exact card v1 snapshots for accepted
state events. It never infers state from prose, rewrites v1/v2 payloads, or treats
a producer's status as runtime acceptance. Board-state mappings remain unsupported.
An event and snapshot must match producer, admitted revision, mapping and card ID.
Conflict/quarantine or unsupported mapping withholds the entire projection.
Explicit state supersession requires an earlier state for the same card, no
fork, and nondecreasing occurrence time. An accepted non-state event claiming a
state predecessor makes the candidate incompatible. Rejected/superseded source
statuses remain non-effective history and do not remove an accepted state.

The local policy supplies separately reviewed display fields bound to a snapshot
digest; copying a source title, blocker prose, raw reference or sanitized flag is
not allowed. Runtime must independently authenticate the Platform-owned policy
pin; a producer-controlled manifest cannot approve redaction. Source repository
identity must bind every claimed producer/revision before this candidate API.
Producer-qualified IDs prevent cross-owner card collisions. Missing/self links
or missing display dispositions withhold cards as reconciling.

Occurrence ordering uses Gregorian integer seconds and exact fractional strings,
then UTF8 producer/event/digest ordering. Leap-second ordering and unknown offset
`-00:00` are explicitly unsupported; they cannot produce a healthy candidate.
Complete producer watermarks, registry/redaction pins, mapping, selected digests
and closed mapped cards bind the projection revision. Observation freshness is
explicit per producer and never inferred from commit age. This helper has no
prior accepted generation, so stale/reconciling/incompatible results contain no
cards. External unavailability remains the future runtime adapter's decision.

Only `healthy` exposes authoritative current truth. `stale` and `reconciling` may show a previous accepted redacted projection with a visible marker and watermark. `unavailable` exposes no cards. `incompatible` quarantines affected records; the conservative synthetic examples withhold the whole payload. All states are read-only.

The 72 examples exhaust three hypothetical access results, six hypothetical health inputs, projection presence and schema-identity validity. They validate the proposed policy, not credentials, operator grants, redaction, source integrity or a running service. The evaluator is named `evaluateSyntheticOperationsFixture` to preserve that distinction; it must not be imported as a production authorization gate.

## Migration and ownership

FawxzzyPlatform remains the sole canonical writer and owns storage, validation and projection. Socials owns contribution schemas. FawxzzyWeb owns private presentation and authenticated reads. The migration coordinator prepares proposals and evidence without gaining owner publication rights. Physical work storage is unknown; no new schema or tables are selected. Discord IDs remain optional external references. Retained historical board data is provenance until an admitted transformation proves exact mappings and quarantine. Music Sesh remains independent.

## Verification and rollback

Schema, semantic and negative tests cover fixed proposal boundaries and all synthetic cases. Additive coverage has its own counters, preserving sealed executable-bundle counts28/27/27 and convergence counts3/3/1. All existing executable artifacts remain byte-identical. Reverting this source proposal changes no provider or runtime state. Runtime transaction, redaction, operator isolation, recovery and installed acceptance remain unperformed prerequisites.
