import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { compareJsonbKeys, jsonbDigest, jsonbText } from '../scripts/lib/development-operations-jsonb.mjs';

// Hermetic pin of the JS model of PostgreSQL `jsonb::text` / digest. scripts/fixtures/jsonb-golden-vectors.mjs
// holds results captured from a REAL PostgreSQL server (see scripts/generate-jsonb-golden-vectors.mjs), so this
// file needs no database yet fails if key order, string escaping or number handling drift from PostgreSQL.
const fixtureUrl = new URL('../scripts/fixtures/jsonb-golden-vectors.mjs', import.meta.url);
const { default: fixture } = await import(fixtureUrl);
const expectedText = (vector) => Buffer.from(vector.expected_utf8_hex, 'hex').toString('utf8');

test('the golden fixture is large, ASCII-only, unique and from a real server', () => {
  assert.match(fixture.postgres_server_version, /^(16|17)\./u);
  assert.ok(fixture.vectors.length >= 150, `only ${fixture.vectors.length} vectors`);
  assert.equal(new Set(fixture.vectors.map((vector) => vector.name)).size, fixture.vectors.length);
  assert.doesNotMatch(fs.readFileSync(fixtureUrl, 'utf8'), /[^\x09\x0a\x0d\x20-\x7e]/u);
  for (const vector of fixture.vectors) {
    assert.match(vector.digest, /^sha256:[0-9a-f]{64}$/u, vector.name);
    // The stored digest is the sha256 of the stored text, so a hand-edited text cannot keep a matching digest.
    assert.equal(vector.digest, `sha256:${createHash('sha256').update(Buffer.from(vector.expected_utf8_hex, 'hex')).digest('hex')}`, vector.name);
  }
  const names = fixture.vectors.map((vector) => vector.name).join('\n');
  for (const required of ['keys b,a', 'number -0', 'string control U+001f', 'string DEL U+007F', 'string U+2028', 'string U+2029',
    'string slash', 'number 9007199254740991', 'number -9007199254740991', 'nested empty containers', 'string 10000 ascii',
    'keys astral', 'random document 01']) assert.ok(names.includes(required), `fixture lost ${required}`);
});

test('jsonbText equals PostgreSQL jsonb::text for every golden vector', () => {
  for (const vector of fixture.vectors) {
    const value = JSON.parse(vector.input);
    assert.equal(jsonbText(value), expectedText(vector), vector.name);
  }
});

test('jsonbDigest equals PostgreSQL sha256 over jsonb::text for every golden vector', () => {
  for (const vector of fixture.vectors) assert.equal(jsonbDigest(JSON.parse(vector.input)), vector.digest, vector.name);
});

test('the fixture really exercises negative zero and prototype-named keys (the parse is not normalising them away)', () => {
  const negative = fixture.vectors.find((vector) => vector.name === 'number -0');
  assert.ok(Object.is(JSON.parse(negative.input), -0));
  assert.equal(expectedText(negative), '0');
  const proto = fixture.vectors.find((vector) => vector.name === 'keys __proto__ constructor toString');
  assert.ok(Object.hasOwn(JSON.parse(proto.input), '__proto__'));
});

test('key order is UTF-8 byte length first, then bytewise, never UTF-16 order or bytes alone', () => {
  const sorted = (keys) => [...keys].sort(compareJsonbKeys);
  assert.deepEqual(sorted(['b', 'aa', 'a', 'ab']), ['a', 'b', 'aa', 'ab']);
  assert.deepEqual(sorted(['ab', 'é']), ['ab', 'é']); // same 2 bytes, then 0x61 < 0xc3
  assert.deepEqual(sorted(['é', 'a']), ['a', 'é']);
  assert.deepEqual(sorted(['abc', '中']), ['abc', '中']); // 3 bytes each
  assert.deepEqual(sorted(['\u{1f600}', 'abc']), ['abc', '\u{1f600}']);
  assert.deepEqual(sorted(['￿', '\u{10000}']), ['￿', '\u{10000}']); // 3 bytes before 4, though UTF-16 order is the reverse
  assert.equal(jsonbText({ b: 1, aa: 2, a: 3 }), '{"a": 3, "b": 1, "aa": 2}');
});

test('anything PostgreSQL could print differently is rejected instead of guessed', () => {
  for (const [value, code] of [
    [1.5, 'ERR_JSONB_NUMBER'], [0.1, 'ERR_JSONB_NUMBER'], [1e21, 'ERR_JSONB_NUMBER'], [2 ** 53, 'ERR_JSONB_NUMBER'], [-(2 ** 53), 'ERR_JSONB_NUMBER'],
    [Number.NaN, 'ERR_JSONB_NUMBER'], [Number.POSITIVE_INFINITY, 'ERR_JSONB_NUMBER'],
    ['a\u0000b', 'ERR_JSONB_NUL'], ['\ud800', 'ERR_JSONB_UNICODE'], ['\udc00x', 'ERR_JSONB_UNICODE'], ['x\ud83d', 'ERR_JSONB_UNICODE'],
    [{ 'k\u0000': 1 }, 'ERR_JSONB_NUL'], [undefined, 'ERR_JSONB_VALUE'], [() => 1, 'ERR_JSONB_VALUE'], [10n, 'ERR_JSONB_VALUE'],
    [Symbol('s'), 'ERR_JSONB_VALUE'], [new Date(0), 'ERR_JSONB_VALUE'], [new Map(), 'ERR_JSONB_VALUE'],
    [new Proxy({}, {}), 'ERR_JSONB_VALUE'], [[, 1], 'ERR_JSONB_VALUE'], [{ [Symbol('s')]: 1 }, 'ERR_JSONB_VALUE']
  ]) assert.throws(() => jsonbText(value), { code }, String(typeof value === 'symbol' ? 'symbol' : value));
  let deep = 1;
  for (let i = 0; i < 70; i += 1) deep = [deep];
  assert.throws(() => jsonbText(deep), { code: 'ERR_JSONB_DEPTH' });
  assert.equal(jsonbText(Array.from({ length: 3 }, () => null)), '[null, null, null]');
  assert.equal(jsonbText(Object.assign(Object.create(null), { b: 1, a: 2 })), '{"a": 2, "b": 1}');
});
