import assert from 'node:assert/strict';
import test from 'node:test';
import { computeCandidateOperationsDigest } from '../scripts/lib/development-operations-digest.mjs';
import { rehearseCandidateOperationsProjection as project } from '../scripts/lib/development-operations-projection.mjs';

const rev = 'a'.repeat(40); const otherRev = 'b'.repeat(40);
const mapping = 'socials-card-snapshot:v1'; const producer = 'github-repository:1301080630';
const stamp = '2026-10-15T03:00:00.123456789Z';
function seal(payload, type, { source = producer, revision = rev, version = 'v1' } = {}) {
  const schema = `socials-os.development-${type}.${version}.schema.json`;
  if (version === 'v2') Object.assign(payload, { contract_version: schema, source_revision: revision });
  const envelope = { schema_identity: schema, producer_identity: source, source_revision: revision, mapping_version: mapping, payload };
  const digest = `sha256:${computeCandidateOperationsDigest(envelope)}`;
  if (version === 'v2' && type === 'event') payload.digest = digest;
  return { envelope, detached_source_proof: { digest } };
}
function card(id = 'card:sample', changes = {}, options = {}) {
  return seal({ card_id: id, project_slug: 'fixture-project', title: 'PRIVATE_TITLE_SENTINEL', lifecycle: 'planning', owner_role: 'PRIVATE_ROLE_SENTINEL', priority: 'high', dependencies: [], blockers: ['PRIVATE_BLOCKER_SENTINEL'], source_reference: 'PRIVATE_SOURCE_SENTINEL', evidence_references: ['PRIVATE_EVIDENCE_SENTINEL'], created_at: stamp, updated_at: stamp, supersedes_card_id: null, visibility: 'private', ...changes }, 'card', options);
}
function event(id = 'dev-event:sample', changes = {}, options = {}) {
  return seal({ event_id: id, occurred_at: stamp, source_role: 'PRIVATE_EVENT_ROLE', source_system: 'fixture', category: 'state', card_id: 'card:sample', board_id: null, factual_summary: 'PRIVATE_SUMMARY_SENTINEL', evidence_references: ['PRIVATE_EVENT_EVIDENCE'], visibility: 'private', sensitivity: 'restricted', include_in_digest: false, status: 'accepted', supersedes_event_id: null, ...changes }, 'event', options);
}
function producerPolicy(source = producer, changes = {}) {
  return { producer_identity: source, source_revision: rev, admitted_revisions: [rev], observed_at: stamp, max_observation_age_seconds: 3600, complete: true, ...changes };
}
function fixture() {
  const input = { history: [], batch: [], snapshots: [], associations: [], policy: { mapping_version: mapping, registry_revision: 'c'.repeat(40), redaction_revision: 'd'.repeat(40), producers: [producerPolicy()], redactions: [] }, now: '2026-10-15T03:01:00Z' };
  add(input, event(), card()); return input;
}
function add(input, e, c, redaction = {}) {
  input.batch.push(e); input.snapshots.push(c);
  input.associations.push({ producer_identity: e.envelope.producer_identity, event_id: e.envelope.payload.event_id, event_digest: e.detached_source_proof.digest, snapshot_digest: c.detached_source_proof.digest });
  input.policy.redactions.push({ snapshot_digest: c.detached_source_proof.digest, title: 'Reviewed display title', owner_role: 'fixture.owner', blocker_codes: ['DEPENDENCY_PENDING'], evidence_handles: ['evidence:abcdefghijklmnop'], ...redaction });
}
const run = (input) => project(JSON.stringify(input));
const rejected = (input, code) => assert.throws(() => run(input), { code: `ERR_OPERATIONS_PROJECTION_${code}` });
const health = (input, expected) => { const result = run(input); assert.equal(result.health, expected); assert.deepEqual(result.cards, []); assert.equal(result.projection_revision, null); assert.equal(result.authoritative, false); };

test('integrates journal, exact snapshot mapping, explicit policy, closed response and revision', () => {
  const input = fixture(); const before = structuredClone(input); const output = run(input);
  assert.deepEqual(input, before); assert.equal(output.kind, 'candidate_only'); assert.equal(output.health, 'healthy');
  assert.equal(output.authoritative, false); assert.equal(output.actions_enabled, false); assert.match(output.projection_revision, /^sha256:[a-f0-9]{64}$/u);
  assert.deepEqual(Object.keys(output.cards[0]).sort(), ['stable_id', 'title', 'lifecycle', 'owner_role', 'created_at', 'updated_at', 'dependency_ids', 'blocker_codes', 'evidence_handles', 'supersedes_id'].sort());
  assert.equal(output.cards[0].title, 'Reviewed display title'); assert.equal(output.cards[0].lifecycle, 'planning');
  assert.equal(JSON.stringify(output).includes('PRIVATE_'), false);
});
test('hypothetical empty complete denominator yields zero-card candidate, never authority', () => {
  const input = fixture(); for (const k of ['batch', 'snapshots', 'associations']) input[k] = []; input.policy.redactions = [];
  const output = run(input); assert.equal(output.health, 'healthy'); assert.deepEqual(output.cards, []); assert.equal(output.authoritative, false);
});
test('v2 event composes without rewriting its source payload', () => {
  const input = fixture(); input.batch = []; input.snapshots = []; input.associations = []; input.policy.redactions = [];
  add(input, event('dev-event:second', {}, { version: 'v2' }), card()); assert.equal(run(input).health, 'healthy');
});
test('exact duplicate and history replay preserve the candidate revision', () => {
  const input = fixture(); const expected = run(input); input.batch.push(structuredClone(input.batch[0]));
  assert.deepEqual(run(input), expected); input.history = [input.batch.shift()]; input.batch = [];
  assert.deepEqual(run(input), expected);
});
test('non-state prose cannot move lifecycle', () => {
  const input = fixture(); input.batch.push(event('dev-event:receipt', { category: 'receipt', factual_summary: 'completed; lifecycle=completed' }));
  assert.equal(run(input).cards[0].lifecycle, 'planning');
});
for (const status of ['superseded', 'rejected']) test(`source status ${status} does not establish state`, () => {
  const input = fixture(); input.batch = [event('dev-event:sample', { status })]; input.associations = [];
  assert.deepEqual(run(input).cards, []);
});
test('conflicting event identity prevents current candidate projection', () => {
  const input = fixture(); input.batch.push(event('dev-event:sample', { factual_summary: 'different' })); health(input, 'incompatible');
});
test('quarantined predecessor prevents projection', () => {
  const input = fixture(); input.batch.push(event('dev-event:next', { supersedes_event_id: 'dev-event:missing', category: 'receipt' })); health(input, 'incompatible');
});
test('explicit state supersession uses a new event, preserving originals', () => {
  const input = fixture(); const newer = '2026-10-15T03:00:01Z';
  add(input, event('dev-event:next', { supersedes_event_id: 'dev-event:sample', occurred_at: newer }), card('card:sample', { lifecycle: 'completed', updated_at: newer }));
  assert.equal(run(input).cards[0].lifecycle, 'completed'); assert.equal(input.batch[0].envelope.payload.status, 'accepted');
});
test('supersession fork is incompatible', () => {
  const input = fixture();
  for (const [id, time] of [['next', '01'], ['other', '02']]) add(input, event(`dev-event:${id}`, { supersedes_event_id: 'dev-event:sample', occurred_at: `2026-10-15T03:00:${time}Z` }), card('card:sample', { updated_at: `2026-10-15T03:00:${time}Z` }));
  health(input, 'incompatible');
});
test('state supersession cannot point to a non-state predecessor', () => {
  const input = fixture(); input.history = [event('dev-event:receipt', { category: 'receipt' })]; input.batch = []; input.snapshots = []; input.associations = []; input.policy.redactions = [];
  add(input, event('dev-event:sample', { supersedes_event_id: 'dev-event:receipt' }), card()); health(input, 'incompatible');
});
test('accepted non-state event cannot claim a state predecessor', () => {
  const input = fixture(); input.batch.push(event('dev-event:receipt', { category: 'receipt', supersedes_event_id: 'dev-event:sample' }));
  health(input, 'incompatible');
});
test('rejected-status successor remains non-effective source history', () => {
  const input = fixture(); const expected = run(input);
  input.batch.push(event('dev-event:rejected', { category: 'receipt', status: 'rejected', supersedes_event_id: 'dev-event:sample' }));
  assert.deepEqual(run(input), expected);
});
for (const [name, mutate] of [
  ['missing association', (x) => { x.associations = []; }],
  ['wrong event digest', (x) => { x.associations[0].event_digest = `sha256:${'0'.repeat(64)}`; }],
  ['wrong snapshot digest', (x) => { x.associations[0].snapshot_digest = `sha256:${'0'.repeat(64)}`; }],
  ['wrong producer association', (x) => { x.associations[0].producer_identity = 'another'; }],
  ['unknown mapping', (x) => { x.policy.mapping_version = 'other:v1'; }],
  ['missing producer', (x) => { x.policy.producers = [producerPolicy('another')]; }]
]) test(`${name} prevents projection`, () => { const input = fixture(); mutate(input); health(input, 'incompatible'); });
test('snapshot from another admitted producer cannot satisfy event association', () => {
  const input = fixture(); input.policy.producers.push(producerPolicy('another')); input.batch = []; input.snapshots = []; input.associations = []; input.policy.redactions = [];
  add(input, event(), card('card:sample', {}, { source: 'another' })); health(input, 'incompatible');
});
test('snapshot from a different admitted revision cannot satisfy association', () => {
  const input = fixture(); input.policy.producers[0].admitted_revisions.push(otherRev); input.batch = []; input.snapshots = []; input.associations = []; input.policy.redactions = [];
  add(input, event(), card('card:sample', {}, { revision: otherRev })); health(input, 'incompatible');
});
test('wrong card identity cannot satisfy association', () => {
  const input = fixture(); input.batch = []; input.snapshots = []; input.associations = []; input.policy.redactions = [];
  add(input, event(), card('card:other')); health(input, 'incompatible');
});
test('board-target state is explicitly unsupported by card mapping', () => {
  const input = fixture(); input.batch = []; input.snapshots = []; input.associations = []; input.policy.redactions = [];
  add(input, event('dev-event:sample', { board_id: 'board:sample' }), card()); health(input, 'incompatible');
});
for (const [label, mutations] of [
  ['nanosecond ordering', ['2026-10-15T03:00:00.1234567891Z', '2026-10-15T03:00:00.1234567892Z']],
  ['zone-normalized ordering', ['2026-10-15T04:00:01+01:00', '2026-10-14T23:00:02-04:00']],
  ['day-boundary ordering', ['2026-10-15T02:59:59Z', '2026-10-15T03:00:00Z']]
]) test(`${label}: later event wins despite reverse arrival`, () => {
  const input = fixture(); input.batch = []; input.snapshots = []; input.associations = []; input.policy.redactions = [];
  for (const [index, at] of [mutations[1], mutations[0]].entries()) add(input, event(`dev-event:event${index}`, { occurred_at: at }), card('card:sample', { created_at: '2026-01-01T00:00:00Z', updated_at: at, lifecycle: index === 0 ? 'completed' : 'planning' }));
  assert.equal(run(input).cards[0].lifecycle, 'completed');
});
test('equivalent instants tie by UTF8 event ID independent of arrival', () => {
  const input = fixture(); input.batch = []; input.snapshots = []; input.associations = []; input.policy.redactions = [];
  add(input, event('dev-event:zz', { occurred_at: '2026-10-15T04:00:01+01:00' }), card('card:sample', { updated_at: '2026-10-15T03:00:01Z', lifecycle: 'completed' }));
  add(input, event('dev-event:aa', { occurred_at: '2026-10-15T03:00:01.000Z' }), card('card:sample', { updated_at: '2026-10-15T03:00:01Z' }));
  const output = run(input); assert.equal(output.cards[0].lifecycle, 'completed'); input.batch.reverse(); assert.deepEqual(run(input), output);
});
for (const at of ['2016-12-31T23:59:60Z', '2026-10-15T03:00:00-00:00']) test(`unsupported exact instant ${at} fails closed`, () => {
  const input = fixture(); input.batch = []; input.snapshots = []; input.associations = []; input.policy.redactions = [];
  add(input, event('dev-event:sample', { occurred_at: at }), card()); health(input, 'incompatible');
});
test('future state and reversed snapshot dates fail closed', () => {
  for (const changes of [{ updated_at: '2026-10-16T00:00:00Z' }, { created_at: '2026-10-16T00:00:00Z' }]) {
    const input = fixture(); input.batch = []; input.snapshots = []; input.associations = []; input.policy.redactions = [];
    add(input, event(), card('card:sample', changes)); health(input, 'incompatible');
  }
});
test('exact observation threshold preserves fractional precision', () => {
  const input = fixture(); input.now = '2026-10-15T04:00:00.123456789Z'; assert.equal(run(input).health, 'healthy');
  input.now = '2026-10-15T04:00:00.1234567890000000001Z'; health(input, 'stale');
});
test('freshness changes do not change source projection identity', () => {
  const input = fixture(); const first = run(input).projection_revision; input.policy.producers[0].observed_at = '2026-10-15T03:00:30Z';
  assert.equal(run(input).projection_revision, first);
});
test('complete watermark includes silent producers and is UTF8 sorted', () => {
  const input = fixture(); input.policy.producers.push(producerPolicy('é'), producerPolicy('z')); const output = run(input);
  assert.deepEqual(output.source_watermark.map((p) => p.producer_identity), [producer, 'z', 'é']);
  input.policy.producers.reverse(); assert.deepEqual(run(input), output);
});
test('missing observation completeness and future observation are reconciling', () => {
  for (const changes of [{ complete: false }, { observed_at: '2026-10-16T00:00:00Z' }]) {
    const input = fixture(); Object.assign(input.policy.producers[0], changes); health(input, 'reconciling');
  }
});
test('one stale silent producer prevents a healthy complete denominator', () => {
  const input = fixture(); input.policy.producers.push(producerPolicy('other', { observed_at: '2026-10-14T03:00:00Z' })); health(input, 'stale');
});
test('redaction is mandatory even for source sanitized claims', () => {
  const input = fixture(); input.policy.redactions = []; health(input, 'reconciling');
});
test('redaction policy revision and content bind projection identity', () => {
  const input = fixture(); const first = run(input).projection_revision; input.policy.redaction_revision = 'e'.repeat(40); assert.notEqual(run(input).projection_revision, first);
  const second = run(input).projection_revision; input.policy.redactions[0].title = 'New reviewed title'; assert.notEqual(run(input).projection_revision, second);
});
test('producer qualified card IDs do not collide', () => {
  const input = fixture(); input.policy.producers.push(producerPolicy('another'));
  add(input, event('dev-event:sample', {}, { source: 'another' }), card('card:sample', {}, { source: 'another' }));
  const output = run(input); assert.equal(output.cards.length, 2); assert.notEqual(output.cards[0].stable_id, output.cards[1].stable_id);
});
test('known same-producer dependencies become qualified IDs', () => {
  const input = fixture(); input.batch = []; input.snapshots = []; input.associations = []; input.policy.redactions = [];
  add(input, event(), card('card:sample', { dependencies: ['card:other'], supersedes_card_id: 'card:other' }));
  add(input, event('dev-event:other', { card_id: 'card:other' }), card('card:other'));
  const output = run(input); const sample = output.cards.find((c) => c.stable_id.endsWith(':sample')); const other = output.cards.find((c) => c.stable_id.endsWith(':other'));
  assert.deepEqual(sample.dependency_ids, [other.stable_id]); assert.equal(sample.supersedes_id, other.stable_id);
});
for (const id of ['card:missing', 'card:sample']) test(`unknown or self dependency ${id} prevents projection`, () => {
  const input = fixture(); input.batch = []; input.snapshots = []; input.associations = []; input.policy.redactions = [];
  add(input, event(), card('card:sample', { dependencies: [id] })); health(input, 'reconciling');
});
for (const [label, mutate, code] of [
  ['top-level assertion', (x) => { x.verified = true; }, 'FIELDS'],
  ['duplicate producer', (x) => { x.policy.producers.push(structuredClone(x.policy.producers[0])); }, 'PRODUCER_POLICY'],
  ['no freshness default', (x) => { delete x.policy.producers[0].max_observation_age_seconds; }, 'PRODUCER_POLICY'],
  ['zero freshness', (x) => { x.policy.producers[0].max_observation_age_seconds = 0; }, 'PRODUCER_POLICY'],
  ['unadmitted source', (x) => { x.policy.producers[0].admitted_revisions = []; }, 'PRODUCER_POLICY'],
  ['invalid observation date', (x) => { x.policy.producers[0].observed_at = '2026-02-30T00:00:00Z'; }, 'OBSERVATION'],
  ['invalid current date', (x) => { x.now = '2026-02-29T00:00:00Z'; }, 'CLOCK'],
  ['duplicate snapshot', (x) => { x.snapshots.push(structuredClone(x.snapshots[0])); }, 'SNAPSHOT_DUPLICATE'],
  ['snapshot assertion', (x) => { x.snapshots[0].verified = true; }, 'SNAPSHOT_FIELDS'],
  ['snapshot corruption', (x) => { x.snapshots[0].envelope.payload.title = 'tampered'; }, 'SNAPSHOT'],
  ['duplicate association', (x) => { x.associations.push(structuredClone(x.associations[0])); }, 'ASSOCIATION_DUPLICATE'],
  ['extra association property', (x) => { x.associations[0].approved = true; }, 'ASSOCIATION'],
  ['duplicate redaction', (x) => { x.policy.redactions.push(structuredClone(x.policy.redactions[0])); }, 'REDACTION'],
  ['redaction assertion', (x) => { x.policy.redactions[0].sanitized = true; }, 'REDACTION'],
  ['raw evidence URL', (x) => { x.policy.redactions[0].evidence_handles = ['https://private.example/evidence']; }, 'REDACTION'],
  ['blocker prose', (x) => { x.policy.redactions[0].blocker_codes = ['private secret prose']; }, 'REDACTION'],
  ['control characters', (x) => { x.policy.redactions[0].title = 'title\nprivate'; }, 'REDACTION'],
  ['array bounds', (x) => { x.associations = Array.from({ length: 257 }, () => x.associations[0]); }, 'ARRAY'],
  ['late invalid journal row', (x) => { x.batch.push({ envelope: { private: 'sentinel' } }); }, 'JOURNAL']
]) test(`${label} rejects atomically with a fixed code`, () => {
  const input = fixture(); mutate(input); const before = JSON.stringify(input); rejected(input, code); assert.equal(JSON.stringify(input), before);
});
test('raw duplicate-key/object inputs are rejected before processing', () => {
  assert.throws(() => project('{"history":[],"history":[]}'), { code: 'ERR_OPERATIONS_PROJECTION_INPUT' });
  assert.throws(() => project(fixture()), { code: 'ERR_OPERATIONS_PROJECTION_INPUT' });
});
test('fixed errors never echo source content', () => {
  const input = fixture(); input.snapshots[0].envelope.payload.secret = 'HIGHLY_PRIVATE';
  assert.throws(() => run(input), (error) => !String(error).includes('HIGHLY_PRIVATE') && error.code === 'ERR_OPERATIONS_PROJECTION_SNAPSHOT');
});
test('fresh retry after a rejected candidate carries no partial state', () => {
  const input = fixture(); const expected = run(input); input.policy.redactions[0].title = '\n'; rejected(input, 'REDACTION'); assert.deepEqual(run(fixture()), expected);
});
