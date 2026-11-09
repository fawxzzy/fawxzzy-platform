import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { candidatePrivateCardDigest, planCandidatePrivateCardAdoption } from '../scripts/lib/development-operations-private-adoption.mjs';
import { createValidator, validateContracts } from '../scripts/lib/contracts.mjs';

const cardId = (n) => `FF-${String(n).padStart(3, '0')}`;
const criterionId = (n) => `CR-${String(n).padStart(3, '0')}`;
const digest = (value) => candidatePrivateCardDigest(JSON.stringify(value));
function fixture() {
  let criterion = 1;
  const baseline = Array.from({ length: 39 }, (_, index) => {
    const criteria = index < 24 ? Array.from({ length: index < 9 ? 7 : 6 }, () => ({
      id: criterionId(criterion++), text: 'synthetic private criterion', history: ['initial']
    })) : [];
    return { stable_id: cardId(index + 1), version: 1, visibility: 'PRIVATE',
      lifecycle: index < 24 ? 'planned' : 'fixed', accepted_status: 'not_accepted',
      triage_status: 'untriaged', last_triaged_at: null, title: 'synthetic private title',
      description: 'synthetic private description', priority: 'medium', criteria,
      dependency_ids: [], superseded_by: null };
  });
  return { batch_id: 'syn_batch_a', baseline, changes: [],
    original_criterion_ids: baseline.flatMap((record) => record.criteria.map((c) => c.id)),
    expected_graph_digest: digest(baseline), prior_batch: null };
}
function change(input, index, mutate) {
  const old = input.baseline[index];
  const next = structuredClone(old); next.version += 1; mutate(next);
  const expected_incoming_ids = input.baseline.filter((record) => record.dependency_ids.includes(old.stable_id))
    .map((record) => record.stable_id).sort();
  input.changes.push({ stable_id: old.stable_id, expected_version: old.version,
    expected_record_digest: digest(old), expected_incoming_ids, next });
}
const plan = (input) => planCandidatePrivateCardAdoption(JSON.stringify(input));
const rejection = (input, code) => assert.throws(() => plan(input), { code: `ERR_PRIVATE_CARD_ADOPTION_${code}` });

test('closed source contract stays unadopted and bound to the existing work domain', () => {
  const contract = JSON.parse(fs.readFileSync(new URL('../contracts/v1/operations/private-card-adoption-contract.json', import.meta.url)));
  const validate = createValidator().getSchema('urn:fawxzzy:platform:schemas:v1:private-card-adoption-contract');
  assert.equal(validate(contract), true);
  assert.equal(contract.lifecycle.apply_admitted, false);
  assert.equal(contract.binding.canonical_writer, 'FawxzzyPlatform');
  assert.equal(contract.binding.physical_namespace, 'UNKNOWN');
  assert.equal(validateContracts().ok, true);
});
test('complete 39-card and 153-criterion synthetic graph produces no write authority or private payload', () => {
  const input = fixture(); change(input, 0, (next) => { next.priority = 'high'; });
  const result = plan(input);
  assert.deepEqual(result.changed_ids, ['FF-001']);
  assert.equal(result.kind, 'candidate_only');
  assert.equal(result.authorized, false); assert.equal(result.write_admitted, false);
  assert.equal(result.public_export_allowed, false);
  assert.ok(!JSON.stringify(result).includes('synthetic private'));
  assert.equal(result.disposition, 'proposed');
  input.prior_batch = { batch_id: input.batch_id, input_digest: result.input_digest };
  assert.equal(plan(input).disposition, 'exact_repeat_no_op');
  input.changes[0].next.priority = 'low';
  rejection(input, 'IDEMPOTENCY_COLLISION');
});
test('absorption preserves criterion IDs/history and redirects incoming dependencies', () => {
  const input = fixture(); input.baseline[2].dependency_ids = ['FF-002'];
  input.expected_graph_digest = digest(input.baseline);
  change(input, 0, (next) => { next.criteria.push(...structuredClone(input.baseline[1].criteria)); });
  change(input, 1, (next) => { next.criteria = []; next.superseded_by = 'FF-001'; });
  change(input, 2, (next) => { next.dependency_ids = ['FF-001']; });
  assert.deepEqual(plan(input).changed_ids, ['FF-001', 'FF-002', 'FF-003']);
  const lost = structuredClone(input);
  lost.changes[2].next.dependency_ids = [];
  rejection(lost, 'EDGE_LOSS');
  const history = structuredClone(input);
  history.changes[0].next.criteria.at(-1).history = [];
  rejection(history, 'CRITERION_HISTORY_LOSS');
  const wrongSurvivor = structuredClone(input);
  wrongSurvivor.changes[0].next.criteria.splice(-input.baseline[1].criteria.length);
  wrongSurvivor.changes[2].next.criteria.push(...structuredClone(input.baseline[1].criteria));
  rejection(wrongSurvivor, 'CRITERION_HISTORY_LOSS');
});
test('an already-absorbed baseline permits a later no-change or unrelated plan', () => {
  const input = fixture();
  input.baseline[0].criteria.push(...input.baseline[1].criteria);
  input.baseline[1].criteria = [];
  input.baseline[1].superseded_by = 'FF-001';
  input.expected_graph_digest = digest(input.baseline);
  assert.deepEqual(plan(input).changed_ids, []);
  change(input, 3, (next) => { next.priority = 'high'; });
  assert.deepEqual(plan(input).changed_ids, ['FF-004']);
});
test('exact record and whole-graph preimages are mandatory', () => {
  const input = fixture(); change(input, 0, (next) => { next.priority = 'high'; });
  input.changes[0].expected_version = 2; rejection(input, 'RECORD_PREIMAGE');
  const graph = fixture(); graph.expected_graph_digest = digest([]); rejection(graph, 'GRAPH_PREIMAGE');
  const incoming = fixture(); incoming.baseline[2].dependency_ids = ['FF-001'];
  incoming.expected_graph_digest = digest(incoming.baseline); change(incoming, 0, (next) => { next.priority = 'high'; });
  incoming.changes[0].expected_incoming_ids = []; rejection(incoming, 'INCOMING_PREIMAGE');
});
test('private visibility, accepted status, triage and fixed baselines cannot be rewritten as plans', () => {
  const visibility = fixture(); change(visibility, 0, (next) => { next.visibility = 'PUBLIC'; }); rejection(visibility, 'RECORD_VALUE');
  const accepted = fixture(); change(accepted, 0, (next) => { next.accepted_status = 'accepted'; }); rejection(accepted, 'PLAN_BOUNDARY');
  const triage = fixture(); change(triage, 0, (next) => { next.triage_status = 'triaged'; }); rejection(triage, 'PLAN_BOUNDARY');
  const fixed = fixture(); change(fixed, 24, (next) => { next.priority = 'high'; }); rejection(fixed, 'CHANGE_ID');
});
test('self, orphan, cycle and dependency loss are rejected', () => {
  const self = fixture(); change(self, 0, (next) => { next.dependency_ids = ['FF-001']; }); rejection(self, 'SELF_EDGE');
  const orphan = fixture(); change(orphan, 0, (next) => { next.dependency_ids = ['FF-999']; }); rejection(orphan, 'ORPHAN');
  const cycle = fixture(); change(cycle, 0, (next) => { next.dependency_ids = ['FF-002']; });
  change(cycle, 1, (next) => { next.dependency_ids = ['FF-001']; }); rejection(cycle, 'CYCLE');
  const lost = fixture(); lost.baseline[0].dependency_ids = ['FF-002'];
  lost.expected_graph_digest = digest(lost.baseline); change(lost, 0, (next) => { next.dependency_ids = []; }); rejection(lost, 'EDGE_LOSS');
});
test('missing original criterion, duplicate card and opaque extra fields fail closed', () => {
  const missing = fixture(); change(missing, 0, (next) => { next.criteria.pop(); }); rejection(missing, 'CRITERION_HISTORY_LOSS');
  const duplicate = fixture(); duplicate.baseline[1].stable_id = 'FF-001';
  duplicate.expected_graph_digest = digest(duplicate.baseline); rejection(duplicate, 'DUPLICATE_CARD');
  const extra = fixture(); extra.changes_extra = 'synthetic'; rejection(extra, 'INPUT_FIELDS');
});
