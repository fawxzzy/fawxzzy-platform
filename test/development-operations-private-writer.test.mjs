import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { candidatePrivateCardDigest, planCandidatePrivateCardAdoption } from '../scripts/lib/development-operations-private-adoption.mjs';
import { rehearseCandidatePrivateCardWrite } from '../scripts/lib/development-operations-private-writer.mjs';
import { createValidator } from '../scripts/lib/contracts.mjs';

const digest = (value) => candidatePrivateCardDigest(JSON.stringify(value));
const id = (n) => `FF-${String(n).padStart(3, '0')}`;
const criterionId = (n) => `CR-${String(n).padStart(3, '0')}`;
function fixture() {
  let criterion = 1;
  const baseline = Array.from({ length: 39 }, (_, index) => ({
    stable_id: id(index + 1), version: 1, visibility: 'PRIVATE',
    lifecycle: index < 24 ? 'planned' : 'fixed', accepted_status: 'not_accepted',
    triage_status: 'untriaged', last_triaged_at: null, title: 'synthetic private title',
    description: 'synthetic private description', priority: 'medium',
    criteria: index < 24 ? Array.from({ length: index < 9 ? 7 : 6 }, () => ({
      id: criterionId(criterion++), text: 'synthetic private criterion', history: ['initial']
    })) : [], dependency_ids: [], superseded_by: null
  }));
  return { batch_id: 'syn_writer_a', baseline, changes: [],
    original_criterion_ids: baseline.flatMap((card) => card.criteria.map((item) => item.id)),
    expected_graph_digest: digest(baseline), prior_batch: null };
}
function change(plan, index, mutate) {
  const original = plan.baseline[index];
  const next = structuredClone(original); next.version += 1; mutate(next);
  plan.changes.push({ stable_id: original.stable_id, expected_version: original.version,
    expected_body_digest: digest(original), next });
}
function create(plan, stableId) {
  const next = structuredClone(plan.baseline[0]);
  Object.assign(next, { stable_id: stableId, version: 1, criteria: [], dependency_ids: [] });
  plan.changes.push({ stable_id: stableId, expected_version: 0, expected_body_digest: null, next });
}
const admission = { source_revision: 'a'.repeat(40), trust_receipt: `sha256:${'b'.repeat(64)}` };
function ports(plan, options = {}) {
  const durable = { graph: structuredClone(plan.baseline), batches: new Map() };
  let calls = 0;
  const sourcePort = { readVerifiedImmutablePlan: async () => JSON.stringify(plan), readVerifiedAdmission: async () => ({ batch_id: plan.batch_id, ...admission }) };
  const storePort = { transaction: async (work) => {
    const graph = structuredClone(durable.graph);
    const batches = new Map(durable.batches);
    const tx = {
      readBatch: async (batchId) => batches.get(batchId) ?? null,
      readFullGraph: async () => structuredClone(graph),
      compareAndSwap: async ({ stable_id, expected_version, expected_body_digest, next }) => {
        calls += 1;
        if (options.failCasAt === calls) return false;
        const index = graph.findIndex((card) => card.stable_id === stable_id);
        if (expected_version === 0) {
          if (index >= 0 || expected_body_digest !== null) return false;
          graph.push(structuredClone(next));
          graph.sort((left, right) => (left.stable_id < right.stable_id ? -1 : 1));
          return true;
        }
        if (index < 0 || graph[index].version !== expected_version
            || digest(graph[index]) !== expected_body_digest) return false;
        graph[index] = structuredClone(next);
        if (options.corruptPostimage) graph[index].priority = 'low';
        return true;
      },
      recordBatch: async (batch) => {
        if (options.failReceipt) throw new Error('synthetic receipt failure');
        // Every NOT NULL column of work.private_card_batches must be present, and nothing else.
        assert.deepEqual(Object.keys(batch).sort(), ['baseline_digest', 'batch_id', 'changed_ids', 'input_digest',
          'post_graph_digest', 'source_revision', 'trust_receipt']);
        batches.set(batch.batch_id, structuredClone(batch));
      }
    };
    const result = await work(tx);
    durable.graph = graph; durable.batches = batches;
    return result;
  } };
  return { sourcePort, storePort, durable };
}

test('contract explicitly keeps every installed trust and storage gate closed', () => {
  const contract = JSON.parse(fs.readFileSync(new URL('../contracts/v1/operations/private-card-adoption-contract.json', import.meta.url)));
  const validate = createValidator().getSchema('urn:fawxzzy:platform:schemas:v1:private-card-adoption-contract');
  assert.equal(validate(contract), true);
  assert.equal(contract.lifecycle.owner_adopted, false);
  assert.equal(contract.candidate_writer.synthetic_rehearsal_is_installation, false);
  assert.equal(contract.binding.physical_namespace, 'UNKNOWN');
});
test('integrated source and private transaction rehearsal commits changed cards with one batch receipt', async () => {
  const plan = fixture();
  change(plan, 0, (next) => { next.priority = 'high'; });
  change(plan, 1, (next) => { next.title = 'synthetic changed private title'; });
  const p = ports(plan);
  const first = await rehearseCandidatePrivateCardWrite(p);
  assert.equal(first.disposition, 'synthetic_transaction_rehearsed');
  assert.deepEqual(first.changed_ids, ['FF-001', 'FF-002']);
  assert.equal(first.authorized, false);
  assert.equal(first.write_admitted, false);
  assert.ok(!JSON.stringify(first).includes('synthetic private'));
  assert.equal(p.durable.graph[0].version, 2);
  assert.equal(p.durable.graph[1].title, 'synthetic changed private title');
  assert.equal(p.durable.batches.get(plan.batch_id).input_digest, first.input_digest);
  assert.equal(p.durable.batches.get(plan.batch_id).source_revision, admission.source_revision);
  assert.equal(p.durable.batches.get(plan.batch_id).trust_receipt, admission.trust_receipt);
  assert.deepEqual(p.durable.batches.get(plan.batch_id).changed_ids, ['FF-001', 'FF-002']);
  const repeat = await rehearseCandidatePrivateCardWrite(p);
  assert.equal(repeat.disposition, 'exact_repeat_no_op');
  assert.equal(p.durable.graph[0].version, 2);
  plan.changes[0].next.priority = 'low';
  await assert.rejects(rehearseCandidatePrivateCardWrite(p), { code: 'ERR_PRIVATE_CARD_WRITER_IDEMPOTENCY_COLLISION' });
});
test('graph drift rejects before any card write and caller prior receipt cannot impersonate storage', async () => {
  const plan = fixture(); change(plan, 0, (next) => { next.priority = 'high'; });
  const p = ports(plan); p.durable.graph[5].version = 2;
  await assert.rejects(rehearseCandidatePrivateCardWrite(p), { code: 'ERR_PRIVATE_CARD_WRITER_GRAPH_PREIMAGE' });
  assert.equal(p.durable.batches.size, 0);
  plan.prior_batch = { batch_id: plan.batch_id, input_digest: digest([]) };
  await assert.rejects(rehearseCandidatePrivateCardWrite(p), { code: 'ERR_PRIVATE_CARD_WRITER_CALLER_PRIOR_BATCH' });
});
test('mid-batch CAS failure, postimage drift and receipt failure roll back every synthetic change', async () => {
  for (const options of [{ failCasAt: 2 }, { corruptPostimage: true }, { failReceipt: true }]) {
    const plan = fixture();
    change(plan, 0, (next) => { next.priority = 'high'; });
    change(plan, 1, (next) => { next.title = 'synthetic updated'; });
    const p = ports(plan, options); const original = digest(p.durable.graph);
    await assert.rejects(rehearseCandidatePrivateCardWrite(p));
    assert.equal(digest(p.durable.graph), original);
    assert.equal(p.durable.batches.size, 0);
  }
});
test('missing ports, unverified-shaped source and empty updates fail closed', async () => {
  await assert.rejects(rehearseCandidatePrivateCardWrite({}), { code: 'ERR_PRIVATE_CARD_WRITER_PORT' });
  const empty = fixture();
  await assert.rejects(rehearseCandidatePrivateCardWrite(ports(empty)), { code: 'ERR_PRIVATE_CARD_WRITER_EMPTY_CHANGESET' });
  const p = ports(empty); p.sourcePort.readVerifiedImmutablePlan = async () => ({ raw: JSON.stringify(empty) });
  await assert.rejects(rehearseCandidatePrivateCardWrite(p), { code: 'ERR_PRIVATE_CARD_WRITER_SOURCE' });
});
test('creates go through the same transaction with expected_version 0 and a null digest', async () => {
  const plan = fixture(); create(plan, 'FF-040'); change(plan, 0, (next) => { next.priority = 'high'; });
  const p = ports(plan);
  const result = await rehearseCandidatePrivateCardWrite(p);
  assert.deepEqual(result.changed_ids, ['FF-001', 'FF-040']);
  assert.equal(p.durable.graph.length, 40);
  assert.equal(p.durable.graph.at(-1).stable_id, 'FF-040');
});
// ---- admission validation, snapshot and binding to the plan ----
const plain = () => ({ batch_id: 'syn_writer_a', ...admission });
function admitted() { const plan = fixture(); change(plan, 0, (next) => { next.priority = 'high'; }); return plan; }
function runWith(readVerifiedAdmission, plan = admitted()) {
  const p = ports(plan); p.sourcePort.readVerifiedAdmission = readVerifiedAdmission;
  let opened = 0; const open = p.storePort.transaction;
  p.storePort.transaction = (work) => { opened += 1; return open(work); };
  return { p, plan, opened: () => opened, run: () => rehearseCandidatePrivateCardWrite(p) };
}
async function assertAdmissionRejected(bad, label, code = 'ERR_PRIVATE_CARD_WRITER_ADMISSION') {
  const h = runWith(async () => bad);
  await assert.rejects(h.run(), { code }, label);
  assert.equal(h.opened(), 0, `${label}: the store must not be opened`);
  assert.equal(h.p.durable.batches.size, 0, label);
}
test('a structurally malformed admission from the source port fails closed before the store opens', async () => {
  for (const [label, bad] of [['null', null], ['string', 'x'], ['array', []], ['empty', {}],
    ['source_revision x', { ...plain(), source_revision: 'x' }],
    ['extra key', { ...plain(), extra: 1 }],
    ['missing source_revision', (({ source_revision, ...rest }) => rest)(plain())],
    ['missing trust_receipt', (({ trust_receipt, ...rest }) => rest)(plain())],
    ['missing batch_id', (({ batch_id, ...rest }) => rest)(plain())],
    ['symbol key', { ...plain(), [Symbol('s')]: 1 }],
    ['class instance', Object.assign(new (class Admission {})(), plain())],
    ['proxy', new Proxy(plain(), {})]]) await assertAdmissionRejected(bad, label);
});
test('source_revision must be exactly 40 lowercase hex characters', async () => {
  for (const bad of ['a'.repeat(39), 'a'.repeat(41), 'A'.repeat(40), 'g'.repeat(40), `${'a'.repeat(39)}A`, `${'a'.repeat(40)}\n`,
    ` ${'a'.repeat(39)}`, '', 'NOT-A-REVISION', 7, null, undefined, ['a'.repeat(40)], { toString: () => 'a'.repeat(40) }]) {
    await assertAdmissionRejected({ ...plain(), source_revision: bad }, `source_revision ${String(bad).slice(0, 12)}`);
  }
  for (const good of ['0123456789abcdef'.repeat(2) + '01234567', 'f'.repeat(40)]) {
    const h = runWith(async () => ({ ...plain(), source_revision: good }));
    await h.run(); assert.equal(h.p.durable.batches.get('syn_writer_a').source_revision, good);
  }
});
test('trust_receipt must be exactly sha256: plus 64 lowercase hex characters', async () => {
  for (const bad of [`sha256:${'b'.repeat(63)}`, `sha256:${'b'.repeat(65)}`, `sha256:${'B'.repeat(64)}`, 'b'.repeat(64), `sha512:${'b'.repeat(64)}`,
    `sha256:${'g'.repeat(64)}`, `SHA256:${'b'.repeat(64)}`, `sha256:${'b'.repeat(64)}\n`, ` sha256:${'b'.repeat(64)}`, 'sha256:', '', 5, null, undefined]) {
    await assertAdmissionRejected({ ...plain(), trust_receipt: bad }, `trust_receipt ${String(bad).slice(0, 14)}`);
  }
  const good = `sha256:${'0123456789abcdef'.repeat(4)}`;
  const h = runWith(async () => ({ ...plain(), trust_receipt: good }));
  await h.run(); assert.equal(h.p.durable.batches.get('syn_writer_a').trust_receipt, good);
});
test('the admission batch_id follows the SQL batch_id shape and optional sealed digests must be well formed', async () => {
  for (const bad of ['', 'S', 'Syn_writer_a', 'syn writer', `s${'a'.repeat(128)}`, 5, null]) {
    await assertAdmissionRejected({ ...plain(), batch_id: bad }, `batch_id ${String(bad).slice(0, 12)}`);
  }
  for (const field of ['input_digest', 'baseline_digest', 'post_graph_digest']) {
    for (const bad of ['sha256:abc', `sha256:${'A'.repeat(64)}`, 'x', 7, null]) {
      await assertAdmissionRejected({ ...plain(), [field]: bad }, `${field} ${String(bad).slice(0, 12)}`);
    }
  }
});
test('a getter, accessor or later mutation by the port cannot change what is validated and recorded', async () => {
  // Port 1: accessor that returns valid values at first and an invalid one later (the review's spoof.mjs).
  let reads = 0;
  const spoof = {}; Object.defineProperty(spoof, 'source_revision', { enumerable: true, get: () => (++reads <= 2 ? 'a'.repeat(40) : 'NOT-A-REVISION') });
  Object.assign(spoof, { batch_id: 'syn_writer_a', trust_receipt: admission.trust_receipt });
  const a = runWith(async () => spoof);
  await assert.rejects(a.run(), { code: 'ERR_PRIVATE_CARD_WRITER_ADMISSION' });
  assert.equal(a.p.durable.batches.size, 0);
  assert.equal(reads, 0, 'the accessor must never be invoked');
  // Port 2: a plain object the port keeps mutating after handing it over.
  const held = plain();
  const b = runWith(async () => held);
  const inner = b.p.storePort.transaction;
  b.p.storePort.transaction = (work) => inner(async (tx) => {
    const original = tx.readBatch;
    tx.readBatch = async (id) => { held.source_revision = 'NOT-A-REVISION'; held.trust_receipt = 'tampered'; held.batch_id = 'syn_other'; return original(id); };
    return work(tx);
  });
  await b.run();
  const recorded = b.p.durable.batches.get('syn_writer_a');
  assert.equal(recorded.source_revision, admission.source_revision);
  assert.equal(recorded.trust_receipt, admission.trust_receipt);
  // A null-prototype plain object is acceptable.
  const c = runWith(async () => Object.assign(Object.create(null), plain()));
  await c.run();
  assert.equal(c.p.durable.batches.get('syn_writer_a').source_revision, admission.source_revision);
});
test('the admission must belong to the plan: batch_id and any stated sealed digest must match, before the store opens', async () => {
  const plan = admitted();
  const proposal = planCandidatePrivateCardAdoption(JSON.stringify(plan));
  const mismatch = 'ERR_PRIVATE_CARD_WRITER_ADMISSION_MISMATCH';
  await assertAdmissionRejected({ ...plain(), batch_id: 'syn_writer_b' }, 'other batch', mismatch);
  await assertAdmissionRejected({ ...plain(), batch_id: 'writer_a' }, 'batch without prefix', mismatch);
  const other = `sha256:${'9'.repeat(64)}`;
  for (const field of ['input_digest', 'baseline_digest', 'post_graph_digest']) {
    await assertAdmissionRejected({ ...plain(), [field]: other }, `${field} mismatch`, mismatch);
  }
  const matching = { ...plain(), input_digest: proposal.input_digest, baseline_digest: proposal.baseline_digest, post_graph_digest: proposal.post_graph_digest };
  const h = runWith(async () => matching, plan);
  assert.equal((await h.run()).disposition, 'synthetic_transaction_rehearsed');
  // Plan and admission read at different moments: a plan whose content changed no longer matches the sealed digest.
  const drifted = runWith(async () => matching);
  drifted.plan.changes[0].next.priority = 'low';
  await assert.rejects(drifted.run(), { code: mismatch });
  assert.equal(drifted.p.durable.batches.size, 0);
  assert.equal(drifted.opened(), 0);
});
