import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { buildCandidatePrivateCardSqlPayload, candidatePrivateCardDigest, maxPrivateCardChanges, planCandidatePrivateCardAdoption } from '../scripts/lib/development-operations-private-adoption.mjs';
import { jsonbText, sortCardsByStableId } from '../scripts/lib/development-operations-jsonb.mjs';
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
  input.changes.push({ stable_id: old.stable_id, expected_version: old.version,
    expected_body_digest: digest(old), next });
}
function create(input, stableId, mutate = () => {}) {
  const next = structuredClone(input.baseline[0]);
  Object.assign(next, { stable_id: stableId, version: 1, criteria: [], dependency_ids: [] });
  mutate(next);
  input.changes.push({ stable_id: stableId, expected_version: 0, expected_body_digest: null, next });
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
  const body = fixture(); change(body, 0, (next) => { next.priority = 'high'; });
  body.changes[0].expected_body_digest = digest(body.baseline[1]); rejection(body, 'RECORD_PREIMAGE');
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

test('old five-key change shape and any extra or missing wire key are rejected', () => {
  const old = fixture(); change(old, 0, (next) => { next.priority = 'high'; });
  const legacy = structuredClone(old);
  legacy.changes[0] = { stable_id: 'FF-001', expected_version: 1, expected_record_digest: digest(old.baseline[0]),
    expected_incoming_ids: [], next: legacy.changes[0].next };
  rejection(legacy, 'CHANGE_FIELDS');
  const extra = structuredClone(old); extra.changes[0].expected_incoming_ids = []; rejection(extra, 'CHANGE_FIELDS');
  const missing = structuredClone(old); delete missing.changes[0].expected_body_digest; rejection(missing, 'CHANGE_FIELDS');
});
test('creates use expected_version 0 with a null digest and version 1, and never touch existing ids', () => {
  const input = fixture(); create(input, 'FF-040', (next) => { next.dependency_ids = ['FF-001']; });
  const result = plan(input);
  assert.deepEqual(result.changed_ids, ['FF-040']);
  assert.equal(result.post_graph_digest, digest([...input.baseline, input.changes[0].next]));
  const built = buildCandidatePrivateCardSqlPayload(JSON.stringify(input));
  assert.deepEqual(Object.keys(built.payload).sort(), ['baseline', 'batch_id', 'changes']);
  assert.deepEqual(Object.keys(built.payload.changes[0]).sort(), ['expected_body_digest', 'expected_version', 'next', 'stable_id']);
  assert.equal(built.payload.changes[0].expected_body_digest, null);
  const digestText = (value) => `sha256:${createHash('sha256').update(jsonbText(value)).digest('hex')}`;
  assert.equal(built.plan.input_digest, digestText(built.payload));
  const version = fixture(); create(version, 'FF-040', (next) => { next.version = 2; }); rejection(version, 'PLAN_BOUNDARY');
  const digestSet = fixture(); create(digestSet, 'FF-040'); digestSet.changes[0].expected_body_digest = digest(digestSet.baseline[0]);
  rejection(digestSet, 'RECORD_PREIMAGE');
  const existing = fixture(); create(existing, 'FF-001'); rejection(existing, 'CHANGE_ID');
  const accepted = fixture(); create(accepted, 'FF-040', (next) => { next.accepted_status = 'accepted'; }); rejection(accepted, 'PLAN_BOUNDARY');
  const duplicate = fixture(); create(duplicate, 'FF-040'); create(duplicate, 'FF-040'); rejection(duplicate, 'CHANGE_ID');
  const updateTwice = fixture(); change(updateTwice, 0, (next) => { next.priority = 'high'; });
  change(updateTwice, 0, (next) => { next.priority = 'low'; }); rejection(updateTwice, 'CHANGE_ID');
});
test('change cap is the SQL cap of 39, with the 24 updatable records as a separate fixed-record bound', () => {
  assert.equal(maxPrivateCardChanges, 39);
  // 24 non-fixed baseline records updated + 15 creates = 39 changes: accepted, and SQL accepts 1..39.
  const full = fixture();
  for (let index = 0; index < 24; index += 1) change(full, index, (next) => { next.priority = 'high'; });
  for (let index = 0; index < 15; index += 1) create(full, cardId(100 + index));
  assert.equal(full.changes.length, 39);
  assert.equal(plan(full).changed_ids.length, 39);
  create(full, 'FF-999'); assert.equal(full.changes.length, 40); rejection(full, 'INPUT_VALUE');
  // The 25th update necessarily hits a fixed record: rejected per record, not by count.
  const fixed = fixture();
  for (let index = 0; index < 25; index += 1) change(fixed, index, (next) => { next.priority = 'high'; });
  rejection(fixed, 'CHANGE_ID');
});
test('payload and graph row order follow stable_id bytewise, independent of caller order', () => {
  const sorted = fixture(); change(sorted, 0, (next) => { next.priority = 'high'; }); change(sorted, 1, (next) => { next.priority = 'low'; });
  const shuffled = structuredClone(sorted);
  shuffled.baseline.reverse(); shuffled.changes.reverse();
  assert.deepEqual(plan(shuffled), plan(sorted));
  assert.deepEqual(buildCandidatePrivateCardSqlPayload(JSON.stringify(shuffled)).payload.baseline.map((r) => r.stable_id),
    sorted.baseline.map((r) => r.stable_id));
  // C collation: '-' (0x2d) sorts before '0' (0x30), so FF-1-A precedes FF-10 (locale collations differ).
  assert.deepEqual(sortCardsByStableId([{ stable_id: 'FF-10' }, { stable_id: 'FF-1-A' }, { stable_id: 'FF-1' }]).map((r) => r.stable_id),
    ['FF-1', 'FF-1-A', 'FF-10']);
});
test('no-change plans stay plannable but cannot become a SQL payload', () => {
  const input = fixture();
  assert.deepEqual(plan(input).changed_ids, []);
  assert.throws(() => buildCandidatePrivateCardSqlPayload(JSON.stringify(input)), { code: 'ERR_PRIVATE_CARD_ADOPTION_EMPTY_CHANGESET' });
});
test('U+0000 and non-integer numbers are rejected because jsonb cannot represent them faithfully', () => {
  const nul = fixture(); change(nul, 0, (next) => { next.title = 'bad-NUL-title'; });
  const rawNul = JSON.stringify(nul).replace('bad-NUL-title', 'bad\\u0000title');
  assert.throws(() => planCandidatePrivateCardAdoption(rawNul), { code: 'ERR_JSONB_NUL' });
  const rawNulBaseline = JSON.stringify(fixture()).replace('synthetic private description', 'x\\u0000y');
  assert.throws(() => planCandidatePrivateCardAdoption(rawNulBaseline), { code: 'ERR_JSONB_NUL' });
  for (const token of ['1.0', '1e2', '1.5', '9007199254740993']) {
    const raw = JSON.stringify(fixture()).replace('"version":1', `"version":${token}`);
    assert.throws(() => planCandidatePrivateCardAdoption(raw), { code: 'ERR_JSONB_NUMBER' }, token);
  }
});
