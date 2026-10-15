import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { candidateDigestLimits } from '../scripts/lib/development-operations-digest.mjs';
import { verifyCandidateOperationsIntegrity as verify } from '../scripts/lib/development-operations-integrity.mjs';

const contract = JSON.parse(fs.readFileSync(new URL('../contracts/v1/operations/development-operations-contract.json', import.meta.url)));
const rules = contract.candidate_wire_decisions.digest.payload_digest_by_schema;
const schemas = Object.keys(rules);
const eventV2 = 'socials-os.development-event.v2.schema.json';

// Deliberately minimal carrier fixtures, not full contribution-schema examples.
// Expected bytes are independent of the candidate canonicalization/hash helper.
function fixture(schema = schemas[0]) {
  const envelope = { schema_identity: schema, producer_identity: 'repository:123', source_revision: 'a'.repeat(40), mapping_version: 'v1', payload: { value: 7 } };
  const bytes = `{"mapping_version":"v1","payload":{"value":7},"producer_identity":"repository:123","schema_identity":${JSON.stringify(schema)},"source_revision":"${'a'.repeat(40)}"}`;
  const digest = `sha256:${createHash('sha256').update(bytes, 'utf8').digest('hex')}`;
  if (schema === eventV2) envelope.payload.digest = digest;
  return { envelope, proof: { digest }, digest };
}
const run = ({ envelope, proof }) => verify(JSON.stringify(envelope), JSON.stringify(proof));
const rejects = (input, code) => assert.throws(() => run(input), { code: `ERR_OPERATIONS_INTEGRITY_${code}` });

for (const schema of schemas) {
  test(`exact detached digest and carrier: ${schema}`, () => {
    const input = fixture(schema);
    assert.equal(run(input), input.digest);
    assert.equal(rules[schema], schema === eventV2 ? 'REQUIRED_MATCH_DETACHED_DIGEST' : 'FORBIDDEN_BY_SOURCE_SCHEMA');
  });
  test(`reject tampered payload: ${schema}`, () => {
    const input = fixture(schema); input.envelope.payload.value = 8;
    rejects(input, 'DIGEST_MISMATCH');
  });
  test(`enforce payload digest presence: ${schema}`, () => {
    const input = fixture(schema);
    if (schema === eventV2) delete input.envelope.payload.digest;
    else input.envelope.payload.digest = input.digest;
    rejects(input, schema === eventV2 ? 'PAYLOAD_DIGEST_REQUIRED' : 'PAYLOAD_DIGEST_FORBIDDEN');
  });
}

test('contract has exactly the five supported schema identities', () => {
  assert.deepEqual(schemas, [
    'socials-os.development-card.v1.schema.json', 'socials-os.development-board.v1.schema.json',
    'socials-os.development-event.v1.schema.json', 'socials-os.development-board.v2.schema.json', eventV2
  ]);
});

test('unknown, aliased and prototype-shaped identities do not dispatch', () => {
  for (const schema of ['unknown', '__proto__', 'constructor', eventV2.toUpperCase(), `${eventV2} `]) {
    rejects(fixture(schema), 'SCHEMA_IDENTITY');
  }
});

test('missing, extra, array and primitive detached proof are rejected', () => {
  for (const proof of [{}, { digest: fixture().digest, verified: true }, [], null, 'digest', 1, true]) {
    rejects({ ...fixture(), proof }, 'PROOF_FIELDS');
  }
});

const malformed = [null, 1, true, {}, [], '', 'a'.repeat(64), `SHA256:${'a'.repeat(64)}`,
  `sha256:${'A'.repeat(64)}`, `sha256:${'a'.repeat(63)}`, `sha256:${'a'.repeat(65)}`,
  `sha256:${'g'.repeat(64)}`, `sha256:${'a'.repeat(64)}\n`, ` sha256:${'a'.repeat(64)}`];
test('detached digest has exact lowercase syntax without coercion', () => {
  for (const digest of malformed) rejects({ ...fixture(), proof: { digest } }, 'DIGEST_FORMAT');
});

test('event-v2 payload digest has exact syntax and matches detached evidence', () => {
  for (const digest of malformed.filter((x) => typeof x === 'string')) {
    const input = fixture(eventV2); input.envelope.payload.digest = digest;
    rejects(input, 'PAYLOAD_DIGEST_FORMAT');
  }
  const input = fixture(eventV2); input.envelope.payload.digest = `sha256:${'0'.repeat(64)}`;
  rejects(input, 'PAYLOAD_DIGEST_MISMATCH');
});

test('matching caller-supplied digests still require computed-byte equality', () => {
  const input = fixture(eventV2);
  input.proof.digest = input.envelope.payload.digest = `sha256:${'0'.repeat(64)}`;
  rejects(input, 'DIGEST_MISMATCH');
});

test('each binding field and nested digest are covered', () => {
  for (const field of ['producer_identity', 'source_revision', 'mapping_version']) {
    const input = fixture(); input.envelope[field] += 'changed'; rejects(input, 'DIGEST_MISMATCH');
  }
  const input = fixture(); input.envelope.schema_identity = schemas[1]; rejects(input, 'DIGEST_MISMATCH');
  const nested = fixture(); nested.envelope.payload.nested = { digest: 'additional-covered-field' };
  rejects(nested, 'DIGEST_MISMATCH');
});

test('envelope shape and binding types are checked before success', () => {
  for (const value of [null, [], true, {}, { ...fixture().envelope, authority: true },
    { ...fixture().envelope, producer_identity: 123 }, { ...fixture().envelope, payload: [] }]) {
    assert.throws(() => verify(JSON.stringify(value), JSON.stringify(fixture().proof)));
  }
});

test('duplicate raw keys and invalid UTF8 are rejected in either input', () => {
  const input = fixture(); const envelope = JSON.stringify(input.envelope); const proof = JSON.stringify(input.proof);
  assert.throws(() => verify(envelope.replace('"value":7', '"value":7,"value":7'), proof), /DUPLICATE/u);
  assert.throws(() => verify(envelope, proof.replace('}', `,"digest":"${input.digest}"}`)), /DUPLICATE/u);
  for (const [a, b] of [[Buffer.from([0xff]), proof], [envelope, Buffer.from([0xff])]]) {
    assert.throws(() => verify(a, b), /UTF8/u);
  }
});

test('both raw inputs are bounded including whitespace', () => {
  const input = fixture(); const envelope = JSON.stringify(input.envelope); const proof = JSON.stringify(input.proof);
  const large = ' '.repeat(candidateDigestLimits.bytes + 1);
  assert.throws(() => verify(large + envelope, proof), /SIZE/u);
  assert.throws(() => verify(envelope, large + proof), /SIZE/u);
});

test('raw objects, getters and proxies are never consumed as input', () => {
  let reads = 0;
  const value = { get digest() { reads += 1; return fixture().digest; } };
  const proxy = new Proxy({}, { get() { reads += 1; throw Error('input side effect'); } });
  for (const raw of [value, proxy]) {
    assert.throws(() => verify(raw, JSON.stringify(fixture().proof)));
    assert.throws(() => verify(JSON.stringify(fixture().envelope), raw));
  }
  assert.equal(reads, 0);
});

test('byte inputs remain identical on success and rejection', () => {
  const input = fixture(eventV2); const a = Buffer.from(JSON.stringify(input.envelope)); const b = Buffer.from(JSON.stringify(input.proof));
  const beforeA = Buffer.from(a); const beforeB = Buffer.from(b);
  assert.equal(verify(a, b), input.digest); assert.deepEqual(a, beforeA); assert.deepEqual(b, beforeB);
  const wrong = Buffer.from(JSON.stringify({ digest: `sha256:${'0'.repeat(64)}` })); const beforeWrong = Buffer.from(wrong);
  assert.throws(() => verify(a, wrong)); assert.deepEqual(a, beforeA); assert.deepEqual(wrong, beforeWrong);
});

test('key order and whitespace do not change integrity and no input is rewritten', () => {
  const input = fixture(eventV2); const before = JSON.stringify(input);
  const reversed = Object.fromEntries(Object.entries(input.envelope).reverse());
  assert.equal(verify(JSON.stringify(reversed, null, 2), JSON.stringify(input.proof, null, 2)), input.digest);
  assert.equal(JSON.stringify(input), before);
});

test('errors never echo raw source data or the supplied digest', () => {
  const input = fixture(); input.envelope.payload.value = 'private-marker';
  assert.throws(() => run(input), (error) => error.code === 'ERR_OPERATIONS_INTEGRITY_DIGEST_MISMATCH'
    && !error.message.includes('private-marker') && !error.message.includes(input.digest));
});
