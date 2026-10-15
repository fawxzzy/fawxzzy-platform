import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { canonicalizeOperationsJson as canonicalize, computeCandidateOperationsDigest as digest, candidateDigestLimits as limits } from '../scripts/lib/development-operations-digest.mjs';

// Independent normative expected bytes/numbers: RFC 8785 sections 3.2.4 and Appendix B.
// https://www.rfc-editor.org/rfc/rfc8785.html
test('RFC 8785 complete sample matches normative UTF-8 bytes', () => {
  const value = { numbers: [333333333.33333329, 1e30, 4.50, 2e-3, 1e-27], string: '\u20ac$\u000f\nA\'B"\\\\"/', literals: [null, true, false] };
  const expectedHex = '7b226c69746572616c73223a5b6e756c6c2c747275652c66616c73655d2c226e756d62657273223a5b3333333333333333332e333333333333332c31652b33302c342e352c302e3030322c31652d32375d2c22737472696e67223a22e282ac245c75303030665c6e4127425c225c5c5c5c5c222f227d';
  assert.equal(Buffer.from(canonicalize(value), 'utf8').toString('hex'), expectedHex);
});

const numberVectors = [
  ['0000000000000000', '0'], ['8000000000000000', '0'],
  ['0000000000000001', '5e-324'], ['8000000000000001', '-5e-324'],
  ['7fefffffffffffff', '1.7976931348623157e+308'], ['ffefffffffffffff', '-1.7976931348623157e+308'],
  ['4340000000000000', '9007199254740992'], ['c340000000000000', '-9007199254740992'],
  ['4430000000000000', '295147905179352830000'],
  ['44b52d02c7e14af5', '9.999999999999997e+22'], ['44b52d02c7e14af6', '1e+23'], ['44b52d02c7e14af7', '1.0000000000000001e+23'],
  ['444b1ae4d6e2ef4e', '999999999999999700000'], ['444b1ae4d6e2ef4f', '999999999999999900000'], ['444b1ae4d6e2ef50', '1e+21'],
  ['3eb0c6f7a0b5ed8c', '9.999999999999997e-7'], ['3eb0c6f7a0b5ed8d', '0.000001'],
  ['41b3de4355555553', '333333333.3333332'], ['41b3de4355555554', '333333333.33333325'], ['41b3de4355555555', '333333333.3333333'],
  ['41b3de4355555556', '333333333.3333334'], ['41b3de4355555557', '333333333.33333343'],
  ['becbf647612f3696', '-0.0000033333333333333333'], ['43143ff3c1cb0959', '1424953923781206.2']
];
for (const [hex, expected] of numberVectors) test(`RFC 8785 IEEE754 ${hex}`, () => {
  assert.equal(canonicalize(Buffer.from(hex, 'hex').readDoubleBE()), expected);
});

test('sorts raw UTF-16 keys recursively without changing array order', () => {
  const input = { '\ufb33': 7, '\ud83d\ude00': 6, '\u20ac': 5, '\u00f6': 4, '\u0080': 3, '1': 2, '\r': 1 };
  assert.equal(canonicalize(input), '{"\\r":1,"1":2,"\u0080":3,"\u00f6":4,"\u20ac":5,"\ud83d\ude00":6,"\ufb33":7}');
  assert.equal(canonicalize({ '2': [{ z: 0, a: 1 }, 2, 1], '10': true }), '{"10":true,"2":[{"a":1,"z":0},2,1]}');
});

test('preserves Unicode normalization, timestamps and high-precision strings', () => {
  assert.notEqual(canonicalize('\u00e9'), canonicalize('e\u0301'));
  assert.equal(canonicalize({ big: '9007199254740993', time: '2026-10-14T00:00:00.000000001Z' }), '{"big":"9007199254740993","time":"2026-10-14T00:00:00.000000001Z"}');
});

const envelope = () => ({ schema_identity: 'socials-os.development-event.v1.schema.json', producer_identity: 'repository:123', source_revision: 'a'.repeat(40), mapping_version: 'v1', payload: { event_id: 'event-1', nested: { digest: 'retained' }, value: 7 } });

test('hashes exactly the five canonical binding fields with only root payload.digest omitted', () => {
  const input = envelope();
  input.payload.digest = 'old';
  const expectedBytes = '{"mapping_version":"v1","payload":{"event_id":"event-1","nested":{"digest":"retained"},"value":7},"producer_identity":"repository:123","schema_identity":"socials-os.development-event.v1.schema.json","source_revision":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}';
  assert.equal(digest(input), createHash('sha256').update(expectedBytes, 'utf8').digest('hex'));
  assert.equal(digest(input), digest(envelope()));
  assert.equal(input.payload.digest, 'old');
  input.payload.digest = 'different';
  assert.equal(digest(input), digest(envelope()));
  input.payload.nested.digest = 'changed';
  assert.notEqual(digest(input), digest(envelope()));
});

test('every binding field and payload mutation changes the digest', () => {
  for (const key of ['schema_identity', 'producer_identity', 'source_revision', 'mapping_version']) {
    const input = envelope(); input[key] += '-changed';
    assert.notEqual(digest(input), digest(envelope()), key);
  }
  const input = envelope(); input.payload.value += 1;
  assert.notEqual(digest(input), digest(envelope()));
});

test('field insertion order and object freezing do not change covered bytes', () => {
  const input = envelope(); const reversed = Object.fromEntries(Object.entries(input).reverse());
  reversed.payload = Object.freeze(Object.fromEntries(Object.entries(input.payload).reverse()));
  assert.equal(digest(Object.freeze(reversed)), digest(input));
  assert.equal(canonicalize(Object.assign(Object.create(null), { b: 2, a: 1 })), '{"a":1,"b":2}');
});

test('rejects missing, extra, hidden and incorrectly typed envelope fields', () => {
  for (const key of Object.keys(envelope())) {
    const input = envelope(); delete input[key]; assert.throws(() => digest(input));
  }
  assert.throws(() => digest({ ...envelope(), extra: true }));
  const joinedFields = { 'mapping_version|payload|producer_identity|schema_identity|source_revision': true };
  assert.throws(() => digest(joinedFields), { code: 'ERR_OPERATIONS_DIGEST_ENVELOPE_FIELDS' });
  for (const value of ['', null, 1, []]) assert.throws(() => digest({ ...envelope(), producer_identity: value }));
  for (const payload of [null, [], new Date(), 1]) assert.throws(() => digest({ ...envelope(), payload }));
  const input = envelope(); Object.defineProperty(input, 'hidden', { value: true });
  assert.throws(() => digest(input), /HIDDEN_FIELD/u);
});

test('rejects non-JSON values and non-finite IEEE754 numbers', () => {
  for (const value of [undefined, 1n, Symbol('x'), () => 1, NaN, Infinity, -Infinity]) {
    assert.throws(() => canonicalize(value));
    assert.throws(() => canonicalize({ value }));
    assert.throws(() => canonicalize([value]));
  }
  for (const hex of ['7fffffffffffffff', '7ff0000000000000']) assert.throws(() => canonicalize(Buffer.from(hex, 'hex').readDoubleBE()), /NUMBER/u);
});

test('rejects lone surrogates in keys, values and excluded digest', () => {
  for (const value of ['\ud800', '\udfff', 'x\ud800y', '\udfff\ud800']) {
    assert.throws(() => canonicalize(value), /UNICODE/u);
    assert.throws(() => canonicalize({ [value]: true }), /UNICODE/u);
    const input = envelope(); input.payload.digest = value;
    assert.throws(() => digest(input), /UNICODE/u);
  }
});

test('never invokes input getters, proxies or toJSON hooks', () => {
  let calls = 0;
  const accessor = Object.defineProperty({}, 'field', { enumerable: true, get() { calls += 1; return 1; } });
  const proxy = new Proxy({}, { ownKeys() { calls += 1; return []; }, getPrototypeOf() { calls += 1; return Object.prototype; } });
  const hook = { toJSON() { calls += 1; return {}; } };
  for (const value of [accessor, proxy, hook]) assert.throws(() => canonicalize(value));
  const input = envelope(); Object.defineProperty(input.payload, 'digest', { enumerable: true, get() { calls += 1; return 'ignored'; } });
  assert.throws(() => digest(input), /ACCESSOR/u);
  assert.throws(() => digest(proxy), /OBJECT/u);
  assert.equal(calls, 0);
});

test('rejects custom prototypes, sparse arrays, hidden fields and symbol keys', () => {
  for (const value of [new Date(), new Map(), new Set(), Buffer.from('x'), Object.create({ inherited: true }), new Number(1)]) assert.throws(() => canonicalize(value), /PROTOTYPE/u);
  assert.throws(() => canonicalize(new Array(2)), /ARRAY_SHAPE/u);
  const extra = [1]; extra.extra = true;
  assert.throws(() => canonicalize(extra), /ARRAY_SHAPE/u);
  const hidden = Object.defineProperty({}, 'secret', { value: true });
  assert.throws(() => canonicalize(hidden), /HIDDEN_FIELD/u);
  assert.throws(() => canonicalize({ [Symbol('x')]: true }), /SYMBOL_KEY/u);
});

test('detects cycles while allowing repeated plain JSON subobjects', () => {
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => canonicalize(cyclic), /CYCLE/u);
  const child = { z: 1 }; assert.equal(canonicalize([child, child]), '[{"z":1},{"z":1}]');
});

test('enforces bounded depth, value count and UTF-8 output size', () => {
  let deep = null;
  for (let i = 0; i < limits.depth; i += 1) deep = [deep];
  assert.doesNotThrow(() => canonicalize(deep));
  assert.throws(() => canonicalize([deep]), /DEPTH/u);
  assert.throws(() => canonicalize(new Array(limits.nodes + 1)), /NODES/u);
  assert.throws(() => canonicalize(Array(limits.nodes).fill(null)), /NODES/u);
  assert.doesNotThrow(() => canonicalize('x'.repeat(limits.bytes - 2)));
  assert.throws(() => canonicalize('x'.repeat(limits.bytes - 1)), /SIZE/u);
  assert.throws(() => canonicalize('\u20ac'.repeat(Math.ceil(limits.bytes / 3))), /SIZE/u);
});

test('prototype-shaped JSON keys remain data and errors never echo payloads', () => {
  assert.equal(canonicalize(JSON.parse('{"__proto__":{"x":1},"constructor":2}')), '{"__proto__":{"x":1},"constructor":2}');
  const input = envelope(); input.payload['private-marker'] = undefined;
  assert.throws(() => digest(input), (error) => error.code === 'ERR_OPERATIONS_DIGEST_VALUE' && !error.message.includes('private-marker'));
});
