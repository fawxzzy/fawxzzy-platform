import { parseCandidateOperationsJson } from './development-operations-json.mjs';
import { candidatePrivateCardDigest, planCandidatePrivateCardAdoption } from './development-operations-private-adoption.mjs';

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

/**
 * Models the canonical work-domain writer's one-transaction boundary. A later
 * server-only composition root must authenticate immutable source and operator
 * context and supply a serializable, private, single-writer storage adapter.
 * Injecting a function here does not establish either trust or installation.
 */
export async function rehearseCandidatePrivateCardWrite({ sourcePort, storePort }) {
  requireMethod(sourcePort, 'readVerifiedImmutablePlan');
  requireMethod(storePort, 'transaction');
  const raw = await sourcePort.readVerifiedImmutablePlan();
  if (typeof raw !== 'string') reject('SOURCE');
  const input = parseCandidateOperationsJson(raw);
  if (input.prior_batch !== null) reject('CALLER_PRIOR_BATCH');
  const proposal = planCandidatePrivateCardAdoption(raw);
  if (proposal.changed_ids.length === 0) reject('EMPTY_CHANGESET');
  const changes = new Map(input.changes.map((change) => [change.stable_id, change]));
  return storePort.transaction(async (tx) => {
    for (const method of ['readBatch', 'readFullGraph', 'compareAndSwap', 'recordBatch']) requireMethod(tx, method);
    const prior = await tx.readBatch(proposal.batch_id);
    if (prior !== null) {
      if (!prior || prior.batch_id !== proposal.batch_id || prior.input_digest !== proposal.input_digest
          || prior.post_graph_digest !== proposal.post_graph_digest) reject('IDEMPOTENCY_COLLISION');
      return Object.freeze({ kind: 'candidate_only', authorized: false, write_admitted: false,
        disposition: 'exact_repeat_no_op', batch_id: proposal.batch_id,
        input_digest: proposal.input_digest, post_graph_digest: proposal.post_graph_digest });
    }
    const before = await tx.readFullGraph();
    if (!Array.isArray(before) || candidatePrivateCardDigest(JSON.stringify(before)) !== proposal.baseline_digest) reject('GRAPH_PREIMAGE');
    for (const id of proposal.changed_ids) {
      const change = changes.get(id);
      const updated = await tx.compareAndSwap({ stable_id: id, expected_version: change.expected_version,
        expected_record_digest: change.expected_record_digest, next: change.next });
      if (updated !== true) reject('CAS');
    }
    const after = await tx.readFullGraph();
    if (!Array.isArray(after) || candidatePrivateCardDigest(JSON.stringify(after)) !== proposal.post_graph_digest) reject('POSTIMAGE');
    await tx.recordBatch({ batch_id: proposal.batch_id, input_digest: proposal.input_digest,
      post_graph_digest: proposal.post_graph_digest });
    return Object.freeze({ kind: 'candidate_only', authorized: false, write_admitted: false,
      disposition: 'synthetic_transaction_rehearsed', batch_id: proposal.batch_id,
      input_digest: proposal.input_digest, post_graph_digest: proposal.post_graph_digest,
      changed_ids: proposal.changed_ids });
  });
}
