import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCandidateOperationsJson as parse, candidateJsonLimits as limits } from '../scripts/lib/development-operations-json.mjs';
import { computeCandidateOperationsDigest as digest } from '../scripts/lib/development-operations-digest.mjs';

function rejects(input, code) {
  assert.throws(() => parse(input), { name: 'TypeError', code: `ERR_OPERATIONS_JSON_${code}`, message: `Candidate operations JSON rejected: ${code}` });
}

for (const text of ['null', 'true', 'false', '0', '-0', '1e30', '0.0000000000001', '333333333.33333329', '5e-324', '1e-400', '""', '"a\\n\\t\\u0000"', '"😀"', '"\\ud83d\\ude00"', '[]', '{}', '{"a":[null,true,false,1.2e+3,{"b":"z"}]}', ' \r\n\t { "a" : 1 } \n']) {
  test(`matches JSON binary64 semantics for ${JSON.stringify(text)}`, () => assert.deepEqual(parse(text), JSON.parse(text)));
}

test('UTF-8 Buffer and Uint8Array views respect their exact bounds and preserve input', () => {
  const bytes = Buffer.from('x{"é":"😀"}y');
  const before = Buffer.from(bytes);
  const view = bytes.subarray(1, -1);
  assert.deepEqual(parse(view), { é: '😀' });
  assert.deepEqual(parse(new Uint8Array(view)), { é: '😀' });
  assert.deepEqual(bytes, before);
});

for (const text of ['{"x":1,"x":2}', '{"x":1,"\\u0078":2}', '{"😀":1,"\\ud83d\\ude00":2}', '{"a":[{"x":1,"x":2}]}', '{"__proto__":1,"__proto__":2}', '{"":1,"":2}']) {
  test(`reject decoded duplicate names ${text}`, () => rejects(text, 'DUPLICATE_KEY'));
}

test('same names in separate objects are allowed; Unicode normalization is not applied', () => {
  assert.deepEqual(parse('[{"x":1},{"x":2}]'), [{ x: 1 }, { x: 2 }]);
  assert.equal(Object.keys(parse('{"é":1,"é":2}')).length, 2);
});

test('prototype-like keys remain own data without polluting prototypes', () => {
  const output = parse('{"__proto__":{"polluted":true},"constructor":2,"toString":3}');
  assert.equal(Object.getPrototypeOf(output), Object.prototype);
  assert.equal(Object.hasOwn(output, '__proto__'), true);
  assert.equal(output.__proto__.polluted, true);
  assert.equal({}.polluted, undefined);
});

for (const text of ['', ' ', '01', '-01', '+1', '.1', '1.', '1e', '1e+', 'NaN', 'Infinity', 'undefined', 'truefalse', 'null 0', '[1,]', '[,1]', '{"x":1,}', '{x:1}', '{"x" 1}', '/*comment*/{}', '\ufeff{}', '{}\u00a0', '"unterminated', '"\\x00"', '"\\u123"', '"raw\nline"', '"\\"']) {
  test(`reject malformed JSON ${JSON.stringify(text)}`, () => rejects(text, 'SYNTAX'));
}

for (const point of [0xd800, 0xdfff, 0xfdd0, 0xfdef, 0xfffe, 0xffff, 0x1fffe, 0x10ffff]) {
  test(`reject I-JSON forbidden Unicode U+${point.toString(16)} in names and values`, () => {
    const text = JSON.stringify(String.fromCodePoint(point));
    rejects(text, 'UNICODE');
    rejects(`{${text}:0}`, 'UNICODE');
  });
}

for (const hex of ['ff', 'c080', 'eda080', 'f4908080', 'e282', 'efbbbf7b7d']) {
  test(`reject invalid UTF-8 or BOM ${hex}`, () => rejects(Buffer.from(hex, 'hex'), hex.startsWith('efbbbf') ? 'SYNTAX' : 'UTF8'));
}

test('reject overflow; preserve precision-bearing and timestamp strings', () => {
  rejects('1e400', 'NUMBER');
  rejects('-1e400', 'NUMBER');
  assert.deepEqual(parse('["9007199254740993","2026-01-01T00:00:00.000Z"]'), ['9007199254740993', '2026-01-01T00:00:00.000Z']);
});

test('reject unsupported input without coercion or proxy traps', () => {
  let calls = 0;
  const hostile = { toString() { calls += 1; throw new Error(); } };
  const proxy = new Proxy(new Uint8Array([48]), { get() { calls += 1; throw new Error(); } });
  for (const input of [null, undefined, 1, new String('0'), new Uint16Array([48]), hostile, proxy]) rejects(input, 'INPUT');
  assert.equal(calls, 0);
});

test('intrinsic byte view access ignores hostile property getters', () => {
  let calls = 0;
  const bytes = new Uint8Array([48]);
  for (const key of ['buffer', 'byteLength', 'byteOffset', 'constructor', Symbol.iterator]) Object.defineProperty(bytes, key, { get() { calls += 1; throw new Error(); } });
  assert.equal(parse(bytes), 0);
  assert.equal(calls, 0);
  rejects(new Uint8Array(new SharedArrayBuffer(1)), 'SHARED_BUFFER');
});

test('enforce inclusive depth and value count bounds', () => {
  const nested = (depth) => '['.repeat(depth) + '0' + ']'.repeat(depth);
  assert.doesNotThrow(() => parse(nested(limits.depth)));
  rejects(nested(limits.depth + 1), 'DEPTH');
  assert.equal(parse('[' + Array(limits.nodes - 1).fill('0').join(',') + ']').length, limits.nodes - 1);
  rejects('[' + Array(limits.nodes).fill('0').join(',') + ']', 'NODES');
});

test('enforce raw UTF-8 byte limit including insignificant whitespace', () => {
  assert.equal(parse('0' + ' '.repeat(limits.bytes - 1)), 0);
  rejects('0' + ' '.repeat(limits.bytes), 'SIZE');
  rejects('"' + 'é'.repeat(limits.bytes / 2) + '"', 'SIZE');
  rejects(new Uint8Array(limits.bytes + 1), 'SIZE');
});

test('diagnostics never echo input data or field names', () => {
  rejects('{"synthetic-private-name":1,"synthetic-private-name":2}', 'DUPLICATE_KEY');
  rejects('"synthetic-private-value\\q"', 'SYNTAX');
});

test('parse then digest preserves candidate covered bytes but does not authenticate them', () => {
  const envelope = { mapping_version: 'candidate.v1', payload: { digest: 'submitted', items: [{ id: 'one' }] }, producer_identity: 'synthetic', schema_identity: 'candidate.schema', source_revision: 'rev-1' };
  assert.equal(digest(parse(Buffer.from(JSON.stringify(envelope)))), digest(envelope));
  rejects(JSON.stringify(envelope).replace('"mapping_version":', '"mapping_version":"conflict","mapping_version":'), 'DUPLICATE_KEY');
});
