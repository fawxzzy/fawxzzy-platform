import { types } from 'node:util';
import { parseCandidateOperationsJson } from './development-operations-json.mjs';
import { candidatePrivateCardGraphDigest, planCandidatePrivateCardAdoption } from './development-operations-private-adoption.mjs';

// Source-only integration seam. There is no installed source verifier, private
// storage adapter, caller authorization, route, or provider connection here.
function reject(code) {
  const error = new TypeError(`Candidate private-card writer rejected: ${code}`);
  error.code = `ERR_PRIVATE_CARD_WRITER_${code}`;
  throw error;
}
function requireMethod(object, name) {
  if (!object || typeof object[name] !== 'function') reject('PORT');
}
// work.private_card_batches requires source_revision and trust_receipt (NOT NULL). In SQL they come
// from the sealed admission row, never from the apply payload, so the verified-source port supplies them.
// The admission row is keyed by batch_id and also holds the sealed digests, so the port must say which
// batch it admits (batch_id, required) and may state the sealed digests (checked against the plan when given).
const admissionDigestFields = ['input_digest', 'baseline_digest', 'post_graph_digest'];
const admissionKeys = ['batch_id', 'source_revision', 'trust_receipt', ...admissionDigestFields];
const sha256Pattern = /^sha256:[0-9a-f]{64}$/u;
/**
 * Snapshot of the port's admission: own enumerable DATA properties only (a getter, proxy or non-plain
 * prototype is rejected), each primitive read exactly once, validated, and copied into a fresh frozen
 * object. Nothing the port holds can change what is recorded after this returns.
 */
function verifiedAdmission(admission) {
  if (!admission || typeof admission !== 'object' || Array.isArray(admission) || types.isProxy(admission)) reject('ADMISSION');
  const prototype = Object.getPrototypeOf(admission);
  if (prototype !== Object.prototype && prototype !== null) reject('ADMISSION');
  const names = Reflect.ownKeys(admission);
  const copy = {};
  for (const name of names) {
    if (typeof name !== 'string' || !admissionKeys.includes(name)) reject('ADMISSION');
    const descriptor = Object.getOwnPropertyDescriptor(admission, name);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) reject('ADMISSION');
    copy[name] = descriptor.value;
  }
  for (const required of ['batch_id', 'source_revision', 'trust_receipt']) if (!Object.hasOwn(copy, required)) reject('ADMISSION');
  if (typeof copy.batch_id !== 'string' || !/^[a-z][a-z0-9_-]{1,127}$/u.test(copy.batch_id)
      || typeof copy.source_revision !== 'string' || !/^[0-9a-f]{40}$/u.test(copy.source_revision)
      || typeof copy.trust_receipt !== 'string' || !sha256Pattern.test(copy.trust_receipt)) reject('ADMISSION');
  for (const field of admissionDigestFields) {
    if (Object.hasOwn(copy, field) && (typeof copy[field] !== 'string' || !sha256Pattern.test(copy[field]))) reject('ADMISSION');
  }
  return Object.freeze(copy);
}

/**
 * Models the canonical work-domain writer's one-transaction boundary. A later
 * server-only composition root must authenticate immutable source and operator
 * context and supply a serializable, private, single-writer storage adapter.
 * Injecting a function here does not establish either trust or installation.
 */
export async function rehearseCandidatePrivateCardWrite({ sourcePort, storePort }) {
  requireMethod(sourcePort, 'readVerifiedImmutablePlan');
  requireMethod(sourcePort, 'readVerifiedAdmission');
  requireMethod(storePort, 'transaction');
  const raw = await sourcePort.readVerifiedImmutablePlan();
  if (typeof raw !== 'string') reject('SOURCE');
  const admission = verifiedAdmission(await sourcePort.readVerifiedAdmission());
  const input = parseCandidateOperationsJson(raw);
  if (input.prior_batch !== null) reject('CALLER_PRIOR_BATCH');
  const proposal = planCandidatePrivateCardAdoption(raw);
  if (proposal.changed_ids.length === 0) reject('EMPTY_CHANGESET');
  // The admission must be the one sealed for THIS plan: same batch and, when the port states them, same digests.
  if (admission.batch_id !== proposal.batch_id
      || (Object.hasOwn(admission, 'input_digest') && admission.input_digest !== proposal.input_digest)
      || (Object.hasOwn(admission, 'baseline_digest') && admission.baseline_digest !== proposal.baseline_digest)
      || (Object.hasOwn(admission, 'post_graph_digest') && admission.post_graph_digest !== proposal.post_graph_digest)) reject('ADMISSION_MISMATCH');
  const changes = new Map(input.changes.map((change) => [change.stable_id, change]));
  return storePort.transaction(async (tx) => {
    for (const method of ['readBatch', 'readFullGraph', 'compareAndSwap', 'recordBatch']) requireMethod(tx, method);
    const prior = await tx.readBatch(proposal.batch_id);
    if (prior !== null) {
      // Same rule as private_card_apply: only input_digest decides collision vs exact repeat.
      if (prior.batch_id !== proposal.batch_id || prior.input_digest !== proposal.input_digest) reject('IDEMPOTENCY_COLLISION');
      return Object.freeze({ kind: 'candidate_only', authorized: false, write_admitted: false,
        disposition: 'exact_repeat_no_op', batch_id: proposal.batch_id,
        input_digest: proposal.input_digest, post_graph_digest: prior.post_graph_digest });
    }
    const before = await tx.readFullGraph();
    if (!Array.isArray(before) || candidatePrivateCardGraphDigest(before) !== proposal.baseline_digest) reject('GRAPH_PREIMAGE');
    for (const id of proposal.changed_ids) {
      const change = changes.get(id);
      // expected_version 0 is a create (expected_body_digest null), otherwise a body-digest CAS.
      const updated = await tx.compareAndSwap({ stable_id: id, expected_version: change.expected_version,
        expected_body_digest: change.expected_body_digest, next: change.next });
      if (updated !== true) reject('CAS');
    }
    const after = await tx.readFullGraph();
    if (!Array.isArray(after) || candidatePrivateCardGraphDigest(after) !== proposal.post_graph_digest) reject('POSTIMAGE');
    await tx.recordBatch({ batch_id: proposal.batch_id, input_digest: proposal.input_digest,
      baseline_digest: proposal.baseline_digest, post_graph_digest: proposal.post_graph_digest,
      source_revision: admission.source_revision, trust_receipt: admission.trust_receipt,
      changed_ids: [...proposal.changed_ids] });
    return Object.freeze({ kind: 'candidate_only', authorized: false, write_admitted: false,
      disposition: 'synthetic_transaction_rehearsed', batch_id: proposal.batch_id,
      input_digest: proposal.input_digest, post_graph_digest: proposal.post_graph_digest,
      changed_ids: proposal.changed_ids });
  });
}
