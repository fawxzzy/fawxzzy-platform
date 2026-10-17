import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { candidatePrivateCardDigest } from '../scripts/lib/development-operations-private-adoption.mjs';
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
    expected_record_digest: digest(original), expected_incoming_ids: [], next });
}
function ports(plan, options = {}) {
  const durable = { graph: structuredClone(plan.baseline), batches: new Map() };
  let calls = 0;
  const sourcePort = { readVerifiedImmutablePlan: async () => JSON.stringify(plan) };
  const storePort = { transaction: async (work) => {
    const graph = structuredClone(durable.graph);
    const batches = new Map(durable.batches);
    const tx = {
      readBatch: async (batchId) => batches.get(batchId) ?? null,
      readFullGraph: async () => structuredClone(graph),
      compareAndSwap: async ({ stable_id, expected_version, expected_record_digest, next }) => {
        calls += 1;
        if (options.failCasAt === calls) return false;
        const index = graph.findIndex((card) => card.stable_id === stable_id);
        if (index < 0 || graph[index].version !== expected_version
            || digest(graph[index]) !== expected_record_digest) return false;
        graph[index] = structuredClone(next);
        if (options.corruptPostimage) graph[index].priority = 'low';
        return true;
      },
      recordBatch: async (batch) => {
        if (options.failReceipt) throw new Error('synthetic receipt failure');
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
