import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { computeCandidateOperationsDigest, candidateDigestLimits } from '../scripts/lib/development-operations-digest.mjs';
import { verifyCandidateOperationsContribution as verify } from '../scripts/lib/development-operations-contribution.mjs';

const directory = new URL('../contracts/v1/operations/source-schemas/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('source-manifest.json', directory), 'utf8'));
const schemas = manifest.schemas.map((entry) => JSON.parse(fs.readFileSync(new URL(entry.local_path, new URL('../', import.meta.url)), 'utf8')));
const revision = 'a'.repeat(40);
const instant = '2026-10-15T02:00:00.123456789Z';
const card = { card_id: 'card:sample', project_slug: 'sample', title: 'Synthetic card', lifecycle: 'ready', owner_role: 'fixture.owner', priority: null, dependencies: [], blockers: [], source_reference: 'fixture:source', evidence_references: [], created_at: instant, updated_at: instant, supersedes_card_id: null, visibility: 'private' };
const board = { board_id: 'board:sample', title: 'Synthetic board', ordered_lanes: ['ready'], card_selectors: ['fixture:all'], visibility: 'private', source_revision: revision, generated_at: instant, read_model_health: 'fresh' };
const event = { event_id: 'dev-event:sample', occurred_at: instant, source_role: 'fixture.owner', source_system: 'fixture', category: 'receipt', card_id: 'card:sample', board_id: null, factual_summary: 'Synthetic event', evidence_references: [], visibility: 'internal', sensitivity: 'restricted', include_in_digest: false, status: 'accepted', supersedes_event_id: null };
function fixture(identity = schemas[0].$id) {
  let payload;
  if (identity.includes('card.')) payload = structuredClone(card);
  else if (identity.includes('board.')) {
    payload = structuredClone(board);
    if (identity.includes('.v2.')) Object.assign(payload, { contract_version: identity, projection_revision: 'fixture:projection', source_watermark: 'fixture:watermark', read_model_health: 'healthy' });
  } else {
    payload = structuredClone(event);
    if (identity.includes('.v2.')) Object.assign(payload, { contract_version: identity, source_revision: revision });
  }
  return { schema_identity: identity, producer_identity: 'repository:fixture', source_revision: revision, mapping_version: 'v1', payload };
}
function serialized(envelope) {
  const digest = `sha256:${computeCandidateOperationsDigest(envelope)}`;
  if (envelope.schema_identity === schemas[4].$id) envelope.payload.digest = digest;
  return { raw: JSON.stringify(envelope), proof: JSON.stringify({ digest }), digest };
}
const run = (envelope) => { const { raw, proof } = serialized(envelope); return verify(raw, proof); };
const rejects = (envelope, code = 'SCHEMA') => assert.throws(() => run(envelope), { code: `ERR_OPERATIONS_CONTRIBUTION_${code}` });

test('five source copies have fixed provenance and exact canonical byte pins', () => {
  assert.equal(manifest.repository, 'fawxzzy/socials-os');
  assert.equal(manifest.commit, '6662045aaedb20b0da657ebd982faf9729004afc');
  assert.equal(manifest.status, 'OWNER_DECISION');
  assert.equal(manifest.producer_authentication, false);
  assert.deepEqual(manifest.schemas.map((entry) => entry.upstream_sha256), [
    'aadb3ba3ba7f8e397f9d9dd4be54e557145cacc8119bf7c44f07cdb1b3d9739e',
    'fcab29797a2f03c50b74f62174002d7cea983e9e321efd1f962d5dd776f2a3ea',
    '104512b570d2b751f0ef67ca7a646a5588bae9a8d9842ade94b40391778eb465',
    'b233c5d2cf6e0f7d804525cd4e45e1a775e7043724abdc72eadc147fedabfe1c',
    '1f5dc8efd348c5ecc258473ba0f81e4aedd309a8b60cc42a2579221f79ac1c54'
  ]);
  for (const [index, entry] of manifest.schemas.entries()) {
    const bytes = fs.readFileSync(new URL(entry.local_path, new URL('../', import.meta.url)));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.local_sha256);
    assert.equal(bytes.toString(), `${JSON.stringify(schemas[index], null, 2)}\n`);
    assert.equal(schemas[index].$id, entry.identity);
  }
});

for (const schema of schemas) {
  test(`complete valid contribution: ${schema.$id}`, () => {
    const input = serialized(fixture(schema.$id));
    const a = Buffer.from(input.raw); const b = Buffer.from(input.proof);
    const beforeA = Buffer.from(a); const beforeB = Buffer.from(b);
    assert.equal(verify(a, b), input.digest);
    assert.deepEqual(a, beforeA); assert.deepEqual(b, beforeB);
  });
  test(`incomplete digest-valid carrier fails full schema: ${schema.$id}`, () => {
    const input = fixture(schema.$id); input.payload = { value: 7 }; rejects(input);
  });
  test(`closed contribution rejects unknown fields: ${schema.$id}`, () => {
    const input = fixture(schema.$id); input.payload.private_unrecognized_name = 'PRIVATE_VALUE'; rejects(input);
  });
  for (const field of schema.required.filter((name) => name !== 'digest')) {
    test(`required ${schema.$id} ${field}`, () => {
      const input = fixture(schema.$id); delete input.payload[field]; rejects(input);
    });
  }
}

test('v2 declared schema cannot be swapped even with a recomputed digest', () => {
  for (const schema of schemas.slice(3)) {
    const input = fixture(schema.$id); input.payload.contract_version = schemas[0].$id; rejects(input);
  }
});
test('v2 source revision must equal the envelope byte for byte', () => {
  for (const schema of schemas.slice(3)) {
    const input = fixture(schema.$id); input.payload.source_revision = 'b'.repeat(40); rejects(input, 'V2_BINDING');
  }
});
test('v1 vocabulary is preserved and never upgraded implicitly', () => {
  const input = fixture(schemas[1].$id); input.payload.read_model_health = 'healthy'; rejects(input);
  const next = fixture(schemas[3].$id); next.payload.read_model_health = 'fresh'; rejects(next);
  assert.equal(typeof run(fixture(schemas[1].$id)), 'string');
});
test('types are not coerced and defaults or unknown-field removal are disabled', () => {
  for (const [identity, field, value] of [[schemas[0].$id, 'title', 7], [schemas[2].$id, 'include_in_digest', 'false'], [schemas[1].$id, 'ordered_lanes', 'ready'], [schemas[0].$id, 'priority', false]]) {
    const input = fixture(identity); input.payload[field] = value; rejects(input);
  }
});
test('events require at least one target; board-only events remain valid', () => {
  for (const schema of [schemas[2], schemas[4]]) {
    const input = fixture(schema.$id); input.payload.card_id = null; rejects(input);
    input.payload.board_id = 'board:sample'; assert.equal(typeof run(input), 'string');
  }
});
test('array uniqueness and empty-array requirements are enforced', () => {
  const a = fixture(); a.payload.dependencies = ['card:peer', 'card:peer']; rejects(a);
  const b = fixture(schemas[1].$id); b.payload.ordered_lanes = []; rejects(b);
  const c = fixture(schemas[2].$id); c.payload.evidence_references = ['fixture:same', 'fixture:same']; rejects(c);
});

const badDates = ['2026-02-30T00:00:00Z', '1900-02-29T00:00:00Z', '2026-13-01T00:00:00Z', '2026-10-15', '2026-10-15T00:00:00', '2026-10-15 00:00:00Z', '2026-10-15T24:00:00Z', '2026-10-15T00:00:00+00', '2026-10-15T00:00:00+0000', '2026-10-15T00:00:00+24:00', '2026-10-15T00:00:00+00:60', '2026-10-15T00:00:00Z\n'];
test('date-time validates syntax and calendar rather than Date.parse normalization', () => {
  for (const schema of schemas) {
    const field = schema.$id.includes('card.') ? 'created_at' : schema.$id.includes('board.') ? 'generated_at' : 'occurred_at';
    for (const value of badDates) { const input = fixture(schema.$id); input.payload[field] = value; rejects(input); }
  }
});
test('valid zones, leap-year dates and timestamp precision are preserved', () => {
  for (const value of ['2000-02-29T12:34:56Z', '2024-02-29t12:34:56z', '2026-10-15T12:34:56.12345678901234567890+05:30', '2026-10-15T00:00:00-00:00', '2016-12-31T23:59:60Z', '2017-01-01T00:59:60+01:00', '2016-12-31T18:29:60-05:30']) {
    const input = fixture(); input.payload.created_at = value;
    const { raw, proof, digest } = serialized(input);
    assert.equal(verify(raw, proof), digest); assert.equal(JSON.parse(raw).payload.created_at, value);
  }
});
test('leap-second branch cannot admit impossible local hours or minutes', () => {
  for (const value of ['2016-12-31T24:59:60+01:00', '2016-12-31T23:99:60+00:40', '2016-12-31T25:59:60+02:00']) {
    const input = fixture(); input.payload.created_at = value; rejects(input);
  }
});
test('unsupported schemas, duplicate keys, invalid UTF8 and byte bounds fail before validation', () => {
  const input = serialized(fixture());
  assert.throws(() => verify(input.raw.replace(schemas[0].$id, 'unknown'), input.proof), /SCHEMA_IDENTITY/u);
  assert.throws(() => verify(input.raw.replace('"title":', '"title":"duplicate","title":'), input.proof), /DUPLICATE/u);
  assert.throws(() => verify(Buffer.from([0xff]), input.proof), /UTF8/u);
  assert.throws(() => verify(' '.repeat(candidateDigestLimits.bytes + 1) + input.raw, input.proof), /SIZE/u);
});
test('full schema success still requires matching detached integrity', () => {
  const input = serialized(fixture());
  assert.throws(() => verify(input.raw.replace('Synthetic card', 'Changed card'), input.proof), /DIGEST_MISMATCH/u);
});
test('schema rejection never exposes input values or field names', () => {
  const input = fixture(); input.payload.PRIVATE_FIELD = 'PRIVATE_VALUE';
  assert.throws(() => run(input), (error) => error.message === 'Candidate operations contribution rejected: SCHEMA' && !String(error.stack).includes('PRIVATE_VALUE'));
});
test('matching source strings are not proof of authenticated producer or live access', () => {
  const input = fixture(); input.producer_identity = 'untrusted:claimed-owner'; input.mapping_version = 'unadopted:claim';
  assert.equal(typeof run(input), 'string'); // Only schema/integrity, no trust or authorization flag.
});
