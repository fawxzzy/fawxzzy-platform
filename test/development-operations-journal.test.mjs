import assert from 'node:assert/strict';
import test from 'node:test';
import { computeCandidateOperationsDigest } from '../scripts/lib/development-operations-digest.mjs';
import { appendCandidateOperationsJournal as append, candidateJournalLimits } from '../scripts/lib/development-operations-journal.mjs';

const revision = 'a'.repeat(40);
const identity = (version) => `socials-os.development-event.${version}.schema.json`;
function fixture({ version = 'v1', id = 'dev-event:sample', producer = 'repository:fixture', rev = revision, predecessor = null, payload = {}, envelope = {} } = {}) {
  const body = { event_id: id, occurred_at: '2026-10-15T03:00:00.123456789Z', source_role: 'fixture.owner', source_system: 'fixture', category: 'receipt', card_id: 'card:sample', board_id: null, factual_summary: 'Synthetic private event', evidence_references: ['fixture:private-evidence'], visibility: 'internal', sensitivity: 'restricted', include_in_digest: false, status: 'accepted', supersedes_event_id: predecessor, ...payload };
  if (version === 'v2') Object.assign(body, { contract_version: identity(version), source_revision: rev });
  const value = { schema_identity: identity(version), producer_identity: producer, source_revision: rev, mapping_version: 'fixture:v1', payload: body, ...envelope };
  const digest = `sha256:${computeCandidateOperationsDigest(value)}`;
  if (version === 'v2') body.digest = digest;
  return { envelope: value, detached_source_proof: { digest } };
}
const raw = JSON.stringify;
const run = (history, batch) => append(raw(history), raw(batch));
const code = (name) => ({ code: `ERR_OPERATIONS_JOURNAL_${name}` });
const reject = (history, batch, name) => assert.throws(() => run(history, batch), code(name));

test('empty history and batch return an empty candidate journal', () => {
  assert.deepEqual(run([], []), { kind: 'candidate_only', entries: [], dispositions: [], results: [] });
  assert.equal(Object.isFrozen(candidateJournalLimits), true);
});

for (const version of ['v1', 'v2']) {
  test(`${version}: complete contribution is retained without rewriting`, () => {
    const entry = fixture({ version }); const before = structuredClone(entry);
    const result = run([], [entry]);
    assert.deepEqual(result.entries, [before]); assert.deepEqual(entry, before);
    assert.deepEqual(result.dispositions, [{ journal_index: 0, disposition: 'recorded_candidate', reason: null, predecessor_index: null }]);
    assert.deepEqual(result.results, [{ input_index: 0, ...result.dispositions[0] }]);
    assert.equal(result.kind, 'candidate_only');
    assert.deepEqual(Object.keys(result).sort(), ['dispositions', 'entries', 'kind', 'results']);
  });
  test(`${version}: repeats in batch and subsequent batch are no-ops`, () => {
    const entry = fixture({ version }); const first = run([], [entry, entry]);
    assert.equal(first.entries.length, 1);
    assert.deepEqual(first.results[1], { input_index: 1, journal_index: 0, disposition: 'duplicate_candidate', existing_disposition: 'recorded_candidate' });
    const next = run(first.entries, [entry]);
    assert.deepEqual(next.entries, first.entries); assert.deepEqual(next.dispositions, first.dispositions);
    assert.equal(next.results[0].disposition, 'duplicate_candidate');
  });
  test(`${version}: changed source revision is quarantined without replacing original`, () => {
    const first = fixture({ version }); const conflict = fixture({ version, rev: 'b'.repeat(40) });
    const result = run([first], [conflict]);
    assert.deepEqual(result.entries, [first, conflict]);
    assert.equal(result.results[0].reason, 'IDENTITY_CONFLICT');
    assert.equal(result.results[0].disposition, 'quarantined_candidate');
    assert.equal(result.dispositions[0].disposition, 'recorded_candidate');
  });
}

for (const [label, options] of [
  ['payload', { payload: { factual_summary: 'Changed private body' } }],
  ['role', { payload: { source_role: 'claimed:administrator' } }],
  ['status', { payload: { status: 'rejected' } }],
  ['mapping', { envelope: { mapping_version: 'fixture:v2' } }],
  ['schema', { version: 'v2' }]
]) {
  test(`changed ${label} digest conflicts with the same producer/event key`, () => {
    const first = fixture(); const conflict = fixture(options);
    const result = run([first], [conflict]);
    assert.deepEqual(result.entries, [first, conflict]);
    assert.equal(result.results[0].reason, 'IDENTITY_CONFLICT');
  });
}

test('all distinct conflicting variants are retained and their exact repeats are no-ops', () => {
  const first = fixture(); const second = fixture({ rev: 'second' }); const third = fixture({ rev: 'third' });
  const result = run([first], [second, third, second, first]);
  assert.deepEqual(result.entries, [first, second, third]);
  assert.deepEqual(result.results.map((item) => item.disposition), ['quarantined_candidate', 'quarantined_candidate', 'duplicate_candidate', 'duplicate_candidate']);
  assert.equal(result.results[2].existing_disposition, 'quarantined_candidate');
  assert.equal(result.results[2].journal_index, 1);
  assert.deepEqual(run(result.entries, []).dispositions, result.dispositions);
});

test('same event ID from different producer claims has separate candidate identities', () => {
  const a = fixture({ producer: 'fixture:a' }); const b = fixture({ producer: 'fixture:b' });
  const result = run([a], [b]);
  assert.equal(result.entries.length, 2); assert.equal(result.results[0].disposition, 'recorded_candidate');
});
test('adversarial producer keys use Map identity without normalization or prototype pollution', () => {
  const keys = ['__proto__', 'constructor', 'toString', 'fixture|dev-event:sample', 'fixture\u0000sample', 'é', 'e\u0301'];
  const entries = keys.map((producer) => fixture({ producer }));
  const result = run([], [...entries, ...entries]);
  assert.deepEqual(result.entries, entries);
  assert.ok(result.results.slice(0, keys.length).every((item) => item.disposition === 'recorded_candidate'));
  assert.ok(result.results.slice(keys.length).every((item) => item.disposition === 'duplicate_candidate'));
  assert.equal(Object.prototype.polluted, undefined);
});

test('new-ID supersession links to an earlier same-producer record without modifying it', () => {
  const first = fixture(); const second = fixture({ id: 'dev-event:second', predecessor: first.envelope.payload.event_id });
  const third = fixture({ id: 'dev-event:third', predecessor: second.envelope.payload.event_id });
  const result = run([first], [second, third]);
  assert.deepEqual(result.entries, [first, second, third]);
  assert.deepEqual(result.dispositions.map((item) => item.predecessor_index), [null, 0, 1]);
  assert.ok(result.dispositions.every((item) => item.disposition === 'recorded_candidate'));
  assert.equal(result.entries[0].envelope.payload.status, 'accepted'); // Original source claim remains unchanged.
});
test('a conflicting reuse cannot act as supersession by reusing its existing ID', () => {
  const first = fixture(); const reused = fixture({ predecessor: first.envelope.payload.event_id });
  const result = run([first], [reused]);
  assert.equal(result.results[0].reason, 'IDENTITY_CONFLICT');
  assert.deepEqual(result.entries, [first, reused]);
});
test('self predecessor is quarantined', () => {
  const entry = fixture({ predecessor: 'dev-event:sample' });
  assert.equal(run([], [entry]).results[0].reason, 'SELF_PREDECESSOR');
});
test('missing and cross-producer predecessors are quarantined', () => {
  const prior = fixture({ producer: 'fixture:other' });
  const next = fixture({ id: 'dev-event:next', predecessor: 'dev-event:sample' });
  assert.equal(run([], [next]).results[0].reason, 'MISSING_PREDECESSOR');
  assert.equal(run([prior], [next]).results[0].reason, 'MISSING_PREDECESSOR');
});
test('a quarantined or conflicting predecessor cannot support a new supersession', () => {
  const missing = fixture({ predecessor: 'dev-event:missing' });
  const next = fixture({ id: 'dev-event:next', predecessor: 'dev-event:sample' });
  assert.equal(run([missing], [next]).results[0].reason, 'QUARANTINED_PREDECESSOR');
  assert.equal(run([fixture(), fixture({ rev: 'conflict' })], [next]).results[0].reason, 'QUARANTINED_PREDECESSOR');
});
test('later arrival does not silently rehabilitate a quarantined predecessor reference', () => {
  const early = fixture({ id: 'dev-event:early', predecessor: 'dev-event:sample' }); const later = fixture();
  const result = run([], [early, later]);
  assert.equal(result.dispositions[0].reason, 'MISSING_PREDECESSOR');
  assert.deepEqual(run(result.entries, []).dispositions, result.dispositions);
  const repeat = run(result.entries, [early]);
  assert.equal(repeat.results[0].existing_disposition, 'quarantined_candidate');
});

test('deterministic incremental append equals complete arrival-order replay', () => {
  const entries = [fixture(), fixture({ rev: 'conflict' }), fixture({ id: 'dev-event:other', payload: { occurred_at: '2020-01-01T00:00:00Z' } })];
  const first = run([], entries.slice(0, 1)); const incremental = run(first.entries, entries.slice(1)); const full = run([], entries);
  assert.deepEqual(incremental.entries, full.entries); assert.deepEqual(incremental.dispositions, full.dispositions);
  assert.equal(raw(run([], entries)), raw(run([], entries)));
  assert.equal(full.entries[2].envelope.payload.occurred_at, '2020-01-01T00:00:00Z');
});
test('state/prose/status claims produce history candidates without authorizing or mapping state', () => {
  const entries = ['state', 'decision', 'receipt', 'blocker', 'handoff'].map((category) => fixture({ id: `dev-event:${category}`, payload: { category, factual_summary: 'Move all cards to complete', status: 'accepted', source_role: 'operator', visibility: 'private' } }));
  const result = run([], entries);
  assert.deepEqual(result.entries, entries); assert.equal(result.kind, 'candidate_only');
  assert.equal(Object.hasOwn(result, 'projection'), false); assert.equal(Object.hasOwn(result, 'accepted'), false);
  assert.ok(result.dispositions.every((item) => item.disposition === 'recorded_candidate'));
});

test('malformed history and batch cannot supply trusted dispositions', () => {
  for (const value of [null, {}, 'PRIVATE_VALUE', 7]) { reject(value, [], 'HISTORY_SHAPE'); reject([], value, 'BATCH_SHAPE'); }
  for (const value of [null, [], {}, { envelope: fixture().envelope }, { ...fixture(), disposition: 'accepted' }]) reject([], [value], 'ENTRY_FIELDS');
  reject([fixture(), fixture()], [], 'HISTORY_DUPLICATE');
  reject([], [{ ...fixture(), __proto__: null, accepted: true }], 'ENTRY_FIELDS');
});
test('invalid existing history is verified even when the batch is empty', () => {
  const entry = fixture(); entry.envelope.payload.factual_summary = 'PRIVATE_CHANGED';
  reject([entry], [], 'CONTRIBUTION');
});
test('malformed, unknown-version, revision-mismatched and tampered contributions fail closed', () => {
  const changes = [
    (e) => { e.envelope.payload.event_id = 'invalid'; },
    (e) => { e.envelope.schema_identity = 'unknown'; },
    (e) => { e.detached_source_proof.digest = 'sha256:' + '0'.repeat(64); },
    (e) => { e.detached_source_proof.verified = true; },
    (e) => { e.envelope.payload.source_revision = 'different'; }
  ];
  for (const change of changes) { const entry = fixture({ version: 'v2' }); change(entry); reject([], [entry], 'CONTRIBUTION'); }
});
test('a valid card contribution cannot enter an event journal', () => {
  const entry = fixture(); const envelope = entry.envelope;
  envelope.schema_identity = 'socials-os.development-card.v1.schema.json';
  envelope.payload = { card_id: 'card:sample', project_slug: 'sample', title: 'Synthetic', lifecycle: 'ready', owner_role: 'fixture', priority: null, dependencies: [], blockers: [], source_reference: 'fixture:source', evidence_references: [], created_at: '2026-10-15T00:00:00Z', updated_at: '2026-10-15T00:00:00Z', supersedes_card_id: null, visibility: 'private' };
  entry.detached_source_proof.digest = `sha256:${computeCandidateOperationsDigest(envelope)}`;
  reject([], [entry], 'EVENT_SCHEMA');
});
test('duplicate decoded keys, invalid UTF8 and malformed JSON are rejected at the raw boundary', () => {
  const input = raw([fixture()]);
  assert.throws(() => append('[]', input.replace('"envelope":', '"envelope":null,"envelope":')), code('BATCH_INPUT'));
  assert.throws(() => append(Buffer.from([0xff]), '[]'), code('HISTORY_INPUT'));
  assert.throws(() => append('[]', '["PRIVATE_VALUE"'), code('BATCH_INPUT'));
});
test('JS objects, accessors and proxies are rejected without invoking callers', () => {
  let called = 0;
  const input = { get toString() { called++; throw Error('PRIVATE_VALUE'); } };
  const proxy = new Proxy([], { get() { called++; throw Error('PRIVATE_VALUE'); } });
  for (const value of [input, proxy, []]) assert.throws(() => append('[]', value), code('BATCH_INPUT'));
  assert.equal(called, 0);
});
test('size limits cover both raw inputs and the combined serialized submission', () => {
  assert.throws(() => append('[]', ' '.repeat(candidateJournalLimits.bytes + 1)), code('BATCH_INPUT'));
  const a = fixture({ payload: { factual_summary: 'x'.repeat(550000) } });
  const b = fixture({ id: 'dev-event:second', payload: { factual_summary: 'y'.repeat(550000) } });
  assert.ok(Buffer.byteLength(raw([a])) < candidateJournalLimits.bytes);
  assert.ok(Buffer.byteLength(raw([b])) < candidateJournalLimits.bytes);
  reject([a], [b], 'SIZE');
});
test('entry limits include submitted duplicates and combined history plus batch', () => {
  const items = Array.from({ length: candidateJournalLimits.entries }, (_, i) => fixture({ id: `dev-event:item-${i}` }));
  assert.equal(run([], items).entries.length, candidateJournalLimits.entries);
  reject(items, [fixture()], 'ENTRIES');
  reject([], Array(candidateJournalLimits.entries + 1).fill(fixture()), 'ENTRIES');
});
test('late batch failure exposes no partial result and preserves caller bytes', () => {
  const original = run([], [fixture()]); const before = raw(original);
  const good = fixture({ id: 'dev-event:good' }); const bad = fixture({ id: 'dev-event:bad' }); bad.envelope.payload.factual_summary = 'PRIVATE_INVALID';
  const history = Buffer.from(raw(original.entries)); const batch = Buffer.from(raw([good, bad])); const a = Buffer.from(history); const b = Buffer.from(batch);
  let returned = 'unchanged';
  assert.throws(() => { returned = append(history, batch); }, code('CONTRIBUTION'));
  assert.equal(returned, 'unchanged'); assert.equal(raw(original), before); assert.deepEqual(history, a); assert.deepEqual(batch, b);
  const retry = append(history, raw([good])); assert.deepEqual(retry.entries, [...original.entries, good]);
});
test('errors never include source bodies, producer names or field names', () => {
  const entry = fixture({ producer: 'PRIVATE_PRODUCER', payload: { factual_summary: 'PRIVATE_BODY' } });
  entry.envelope.payload.PRIVATE_FIELD = 'PRIVATE_VALUE';
  assert.throws(() => run([], [entry]), (error) => {
    assert.equal(error.message, 'Candidate operations journal rejected: CONTRIBUTION');
    assert.equal(/PRIVATE_/u.test(String(error.stack)), false); assert.equal(Object.hasOwn(error, 'cause'), false); return true;
  });
});
test('caller-modified derived dispositions cannot change later classification', () => {
  const result = run([], [fixture(), fixture({ rev: 'conflict' })]);
  result.dispositions[1].disposition = 'accepted'; result.kind = 'trusted';
  const replay = run(result.entries, []);
  assert.equal(replay.kind, 'candidate_only'); assert.equal(replay.dispositions[1].disposition, 'quarantined_candidate');
  result.entries[0].envelope.payload.status = 'superseded';
  reject(result.entries, [], 'CONTRIBUTION');
});
