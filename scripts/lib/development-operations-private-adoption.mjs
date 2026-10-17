import { createHash } from 'node:crypto';
import { canonicalizeOperationsJson } from './development-operations-digest.mjs';
import { parseCandidateOperationsJson } from './development-operations-json.mjs';

// A private work-domain candidate only. The installed operations projection is
// deliberately not a rich-card writer, and these functions have no I/O.
const idPattern = /^FF-[A-Z0-9][A-Z0-9-]*$/u;
const criterionPattern = /^CR-[A-Z0-9][A-Z0-9-]*$/u;
const hashPattern = /^sha256:[0-9a-f]{64}$/u;
const recordFields = ['stable_id', 'version', 'visibility', 'lifecycle', 'accepted_status', 'triage_status', 'last_triaged_at', 'title', 'description', 'priority', 'criteria', 'dependency_ids', 'superseded_by'];
const changeFields = ['stable_id', 'expected_version', 'expected_record_digest', 'expected_incoming_ids', 'next'];

function reject(code) {
  const error = new TypeError(`Candidate private-card adoption rejected: ${code}`);
  error.code = `ERR_PRIVATE_CARD_ADOPTION_${code}`;
  throw error;
}
function keys(value, fields, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).length !== fields.length
      || fields.some((field) => !Object.hasOwn(value, field))) reject(code);
}
function unique(values, code) {
  if (new Set(values).size !== values.length) reject(code);
}
function digest(value) {
  return `sha256:${createHash('sha256').update(canonicalizeOperationsJson(value)).digest('hex')}`;
}
export function candidatePrivateCardDigest(rawJson) {
  const value = parseCandidateOperationsJson(rawJson);
  return digest(value);
}
function validateRecord(record) {
  keys(record, recordFields, 'RECORD_FIELDS');
  if (!idPattern.test(record.stable_id) || !Number.isSafeInteger(record.version) || record.version < 1
      || record.visibility !== 'PRIVATE'
      || !['planned', 'active', 'fixed'].includes(record.lifecycle)
      || !['not_accepted', 'accepted'].includes(record.accepted_status)
      || !['untriaged', 'triaged'].includes(record.triage_status)
      || (record.last_triaged_at !== null && typeof record.last_triaged_at !== 'string')
      || typeof record.title !== 'string' || typeof record.description !== 'string'
      || !['low', 'medium', 'high'].includes(record.priority)
      || !Array.isArray(record.criteria) || !Array.isArray(record.dependency_ids)
      || (record.superseded_by !== null && !idPattern.test(record.superseded_by))) reject('RECORD_VALUE');
  unique(record.dependency_ids, 'DUPLICATE_EDGE');
  if (record.dependency_ids.some((id) => !idPattern.test(id))) reject('EDGE_ID');
  for (const criterion of record.criteria) {
    keys(criterion, ['id', 'text', 'history'], 'CRITERION_FIELDS');
    if (!criterionPattern.test(criterion.id) || typeof criterion.text !== 'string'
        || !Array.isArray(criterion.history) || criterion.history.some((item) => typeof item !== 'string')) reject('CRITERION_VALUE');
  }
  unique(record.criteria.map((criterion) => criterion.id), 'DUPLICATE_CRITERION');
}
function graph(records) {
  const byId = new Map();
  const criteria = new Map();
  for (const record of records) {
    validateRecord(record);
    if (byId.has(record.stable_id)) reject('DUPLICATE_CARD');
    byId.set(record.stable_id, record);
    for (const criterion of record.criteria) {
      if (criteria.has(criterion.id)) reject('DUPLICATE_CRITERION');
      criteria.set(criterion.id, { owner: record.stable_id, criterion });
    }
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) reject('CYCLE');
    if (visited.has(id)) return;
    const record = byId.get(id);
    if (!record) reject('ORPHAN');
    visiting.add(id);
    for (const dependency of record.dependency_ids) {
      if (dependency === id) reject('SELF_EDGE');
      visit(dependency);
    }
    visiting.delete(id); visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
  return { byId, criteria };
}
function incoming(byId, target) {
  return [...byId.values()].filter((record) => record.dependency_ids.includes(target))
    .map((record) => record.stable_id).sort();
}

/**
 * Deterministic private-plan candidate, never an authorization or delivery API.
 * The raw JSON comes from a later trusted readback only after that transport and
 * writer are separately adopted. Caller-supplied hashes and role names prove none.
 * Returns no titles, descriptions, criteria, or private source objects.
 */
export function planCandidatePrivateCardAdoption(rawJson) {
  const input = parseCandidateOperationsJson(rawJson);
  keys(input, ['batch_id', 'baseline', 'changes', 'original_criterion_ids', 'expected_graph_digest', 'prior_batch'], 'INPUT_FIELDS');
  if (typeof input.batch_id !== 'string' || !/^syn_[a-z0-9_-]+$/u.test(input.batch_id)
      || !Array.isArray(input.baseline) || input.baseline.length !== 39
      || !Array.isArray(input.changes) || input.changes.length > 24
      || !Array.isArray(input.original_criterion_ids) || input.original_criterion_ids.length !== 153
      || !hashPattern.test(input.expected_graph_digest)) reject('INPUT_VALUE');
  const before = graph(input.baseline);
  if ([...before.byId.values()].filter((record) => record.lifecycle === 'fixed').length !== 15) reject('BASELINE_STATES');
  if (digest(input.baseline) !== input.expected_graph_digest) reject('GRAPH_PREIMAGE');
  unique(input.original_criterion_ids, 'ORIGINAL_CRITERION_DUPLICATE');
  if (input.original_criterion_ids.some((id) => !criterionPattern.test(id) || !before.criteria.has(id))) reject('ORIGINAL_CRITERION_MISSING');
  const changed = new Map();
  for (const change of input.changes) {
    keys(change, changeFields, 'CHANGE_FIELDS');
    const old = before.byId.get(change.stable_id);
    if (!old || changed.has(change.stable_id) || old.lifecycle === 'fixed') reject('CHANGE_ID');
    if (change.expected_version !== old.version || change.expected_record_digest !== digest(old)) reject('RECORD_PREIMAGE');
    if (!Array.isArray(change.expected_incoming_ids) || JSON.stringify(change.expected_incoming_ids) !== JSON.stringify(incoming(before.byId, old.stable_id))) reject('INCOMING_PREIMAGE');
    validateRecord(change.next);
    if (change.next.stable_id !== old.stable_id || change.next.version !== old.version + 1
        || change.next.accepted_status !== old.accepted_status
        || change.next.triage_status !== old.triage_status
        || change.next.last_triaged_at !== old.last_triaged_at
        || change.next.lifecycle === 'fixed') reject('PLAN_BOUNDARY');
    changed.set(change.stable_id, change.next);
  }
  const afterRows = input.baseline.map((record) => changed.get(record.stable_id) ?? record);
  const after = graph(afterRows);
  for (const [id, { owner, criterion: original }] of before.criteria) {
    const retained = after.criteria.get(id);
    const current = retained?.criterion;
    const permittedOwner = after.byId.get(owner).superseded_by ?? owner;
    if (!current || current.history.length < original.history.length
        || JSON.stringify(current.history.slice(0, original.history.length)) !== JSON.stringify(original.history)
        || (current.text !== original.text && current.history.length === original.history.length)
        || retained.owner !== permittedOwner) reject('CRITERION_HISTORY_LOSS');
  }
  for (const original of input.baseline) {
    const current = after.byId.get(original.stable_id);
    const target = current.superseded_by;
    if (original.superseded_by !== null && target !== original.superseded_by) reject('SUPERSESSION_HISTORY_LOSS');
    if (target !== null) {
      if (target === original.stable_id || !after.byId.has(target)
          || (original.superseded_by === null && !changed.has(target))
          || after.byId.get(target).superseded_by !== null) reject('SUPERSESSION_TARGET');
      if (current.criteria.length !== 0) reject('ABSORBED_CRITERIA');
    }
    for (const edge of original.dependency_ids) {
      const redirected = after.byId.get(edge)?.superseded_by ?? edge;
      if (!current.dependency_ids.includes(redirected)) reject('EDGE_LOSS');
    }
  }
  for (const original of input.baseline) {
    const target = after.byId.get(original.stable_id).superseded_by;
    if (target === null) continue;
    for (const source of incoming(before.byId, original.stable_id)) {
      if (!after.byId.get(source).dependency_ids.includes(target)) reject('INCOMING_EDGE_LOSS');
    }
  }
  const inputDigest = digest({ batch_id: input.batch_id, baseline: input.baseline, changes: input.changes,
    original_criterion_ids: input.original_criterion_ids, expected_graph_digest: input.expected_graph_digest });
  if (input.prior_batch !== null) {
    keys(input.prior_batch, ['batch_id', 'input_digest'], 'PRIOR_FIELDS');
    if (input.prior_batch.batch_id !== input.batch_id || !hashPattern.test(input.prior_batch.input_digest)) reject('PRIOR_VALUE');
    if (input.prior_batch.input_digest !== inputDigest) reject('IDEMPOTENCY_COLLISION');
  }
  return Object.freeze({ kind: 'candidate_only', authorized: false, write_admitted: false,
    public_export_allowed: false, disposition: input.prior_batch ? 'exact_repeat_no_op' : 'proposed',
    batch_id: input.batch_id, input_digest: inputDigest, baseline_digest: input.expected_graph_digest,
    post_graph_digest: digest(afterRows), changed_ids: [...changed.keys()].sort() });
}
