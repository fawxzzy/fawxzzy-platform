import assert from 'node:assert/strict';
import test from 'node:test';
import { createValidator, loadDocuments, validateSchemaInstances, validateSemantics } from '../scripts/lib/contracts.mjs';
import { observedTopologyPath, summarizeObservedProjectTopology, validateObservedProjectTopology } from '../scripts/lib/observed-topology.mjs';
import { validateRepositoryEntries } from '../scripts/lib/repository.mjs';

test('observed topology reports the settled snapshot without opening historical execution gates', () => {
  const documents = loadDocuments();
  assert.deepEqual(validateObservedProjectTopology(documents), []);
  assert.deepEqual(validateSchemaInstances(documents, createValidator()), []);
  assert.deepEqual(validateSemantics(documents), []);
  const result = summarizeObservedProjectTopology(documents);
  assert.equal(result.ok, true);
  assert.equal(result.target.ref, 'bxtcuhkotumitoqtrcej');
  assert.equal(result.target.availability, 'active');
  assert.equal(result.retired_sources.length, 3);
  assert.ok(result.retired_sources.every((source) => source.availability === 'deleted'));
  assert.equal(result.fresh_provider_observation, false);
  assert.equal(result.execution_authorized, false);
  assert.equal(result.replay_authorized, false);
  assert.equal(result.owner_adoption, 'OWNER_DECISION');
  const historical = documents['contracts/v1/registry/project-registry.json'];
  assert.ok(historical.operation_gates.every((gate) => gate.status === 'BLOCKED'));
  assert.ok(historical.sources.every((source) => source.availability === 'active'));
  result.target.ref = 'changed';
  assert.equal(documents[observedTopologyPath].target.ref, 'bxtcuhkotumitoqtrcej');
});

const mutations = [
  ['master identity', (value) => { value.target.ref = 'other'; }],
  ['master retirement', (value) => { value.target.availability = 'deleted'; }],
  ['legacy resurrection', (value) => { value.retired_sources[0].availability = 'active'; }],
  ['source substitution', (value) => { value.retired_sources[1].ref = value.target.ref; }],
  ['missing legacy', (value) => { value.retired_sources.pop(); }],
  ['extra legacy', (value) => { value.retired_sources.push(value.retired_sources[0]); }],
  ['receipt substitution', (value) => { value.retired_sources[0].evidence_ref += 'changed'; }],
  ['execution', (value) => { value.authority.execution_authorized = true; }],
  ['replay', (value) => { value.authority.replay_authorized = true; }],
  ['implicit adoption', (value) => { value.authority.owner_adoption = 'CURRENT'; }],
  ['freshness', (value) => { value.fresh_provider_observation = true; }],
  ['timestamp', (value) => { value.evidence_recorded_at = 'now'; }],
  ['gate opening', (value) => { value.historical_operation_gates[0].status = 'CURRENT'; }],
  ['historical preimage', (value) => { value.historical_registry.sha256 = '0'.repeat(64); }],
  ['unknown property', (value) => { value.extra = true; }]
];
for (const [name, mutate] of mutations) {
  test(`observed topology rejects ${name} through schema, semantics and report`, () => {
    const documents = loadDocuments();
    mutate(documents[observedTopologyPath]);
    assert.ok(validateSchemaInstances(documents, createValidator()).some((failure) => failure.includes(observedTopologyPath)));
    assert.ok(validateSemantics(documents).some((failure) => failure.includes('observed topology:')));
    assert.equal(summarizeObservedProjectTopology(documents).ok, false);
  });
}

test('observed topology rejects missing and malformed documents without throwing', () => {
  for (const value of [undefined, null, [], false, 'invalid', {}]) {
    const documents = loadDocuments();
    documents[observedTopologyPath] = value;
    assert.ok(validateObservedProjectTopology(documents).length);
    assert.equal(summarizeObservedProjectTopology(documents).ok, false);
  }
  const cyclic = {}; cyclic.self = cyclic;
  assert.ok(validateObservedProjectTopology({ [observedTopologyPath]: cyclic }).length);
});

test('observed topology cannot reinterpret or rewrite the historical registry', () => {
  const documents = loadDocuments();
  documents['contracts/v1/registry/project-registry.json'].sources[0].availability = 'deleted';
  assert.ok(validateObservedProjectTopology(documents).includes('observed topology: historical registry preimage mismatch'));
  assert.equal(summarizeObservedProjectTopology(documents).ok, false);
});

test('new observed topology artifacts are admitted by the existing repository path policy', () => {
  const documents = loadDocuments();
  assert.deepEqual(validateRepositoryEntries([
    { relativePath: observedTopologyPath, content: `${JSON.stringify(documents[observedTopologyPath], null, 2)}\n` },
    { relativePath: 'scripts/lib/observed-topology.mjs', content: '// repository-only\n' },
    { relativePath: 'docs/adr/0006-receipt-bound-observed-topology.md', content: '# Decision\n' },
    { relativePath: 'docs/runbooks/observed-project-topology.md', content: '# Runbook\n' }
  ]), []);
});
