// Regenerates scripts/fixtures/jsonb-golden-vectors.mjs from a REAL PostgreSQL server.
//
//   PG_TEST_URL=<libpq URI of the throwaway loopback cluster> PG_TEST_PSQL=<path to psql> \
//     node scripts/generate-jsonb-golden-vectors.mjs
//
// Throwaway loopback cluster only (the script refuses other hosts and creates nothing: it runs SELECTs).
// Every input is ASCII-only JSON text (non-ASCII is \u-escaped) and every result comes back hex encoded, so no
// console or pipe re-encoding can change a vector. The committed fixture is what `npm test` checks
// jsonbText/jsonbDigest against with no database; this script is only needed to refresh or extend it.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const url = process.env.PG_TEST_URL;
const psql = process.env.PG_TEST_PSQL || 'psql';
if (!url) throw new Error('PG_TEST_URL is required');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)) throw new Error('PG_TEST_URL must be a loopback host');

// ASCII-only JSON text: every code unit above 0x7e (and DEL) is written as \uXXXX.
const ascii = (text) => text.replace(/[^\x20-\x7e\t\n\r]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
const J = (value) => ascii(JSON.stringify(value));
const vectors = [];
const add = (name, jsonText) => vectors.push({ name, input: ascii(jsonText) });
const addValue = (name, value) => add(name, JSON.stringify(value));
const cp = (...points) => String.fromCodePoint(...points);

// scalars and numbers
add('null', 'null'); add('true', 'true'); add('false', 'false');
for (const n of ['0', '-0', '1', '-1', '7', '10', '100', '1000000', '9007199254740991', '-9007199254740991',
  '9007199254740990', '4294967296', '-2147483648', '2147483647']) add(`number ${n}`, n);
add('array of numbers incl -0', '[0, -0, 1, -1, 9007199254740991, -9007199254740991]');
add('object with -0 value', '{"z": -0}');

// strings: every C0 control individually, plus the neighbours that must NOT be escaped
for (let unit = 1; unit < 0x20; unit += 1) addValue(`string control U+${unit.toString(16).padStart(4, '0')}`, `a${String.fromCharCode(unit)}b`);
for (const [label, ch] of [['DEL U+007F', cp(0x7f)], ['U+0080', cp(0x80)], ['U+009F', cp(0x9f)], ['NBSP U+00A0', cp(0xa0)],
  ['U+00E9', cp(0xe9)], ['U+0800', cp(0x800)], ['U+2028', cp(0x2028)], ['U+2029', cp(0x2029)], ['U+FEFF', cp(0xfeff)],
  ['U+FFFD', cp(0xfffd)], ['U+FFFE', cp(0xfffe)], ['U+FFFF', cp(0xffff)], ['U+E000', cp(0xe000)], ['U+FF5E', cp(0xff5e)],
  ['U+4E2D', cp(0x4e2d)], ['U+10000', cp(0x10000)], ['U+1D538', cp(0x1d538)], ['U+1F600', cp(0x1f600)], ['U+10FFFF', cp(0x10ffff)],
  ['slash', '/'], ['escaped-looking slash', '\\/'], ['quote', '"'], ['backslash', '\\'], ['backslash-u text', '\\u0041'],
  ['apostrophe', "'"], ['percent and dollar', '%s $1 $$'], ['tilde', '~'], ['space only', ' '], ['tab and newline mix', '\t\n\r\u000b\f\b'],
  ['empty', '']]) addValue(`string ${label}`, `x${ch}y`);
addValue('string empty alone', '');
addValue('string all C0 controls', Array.from({ length: 31 }, (_, i) => String.fromCharCode(i + 1)).join(''));
addValue('string all C0 controls plus DEL and C1', Array.from({ length: 0x21 }, (_, i) => String.fromCharCode(i + 0x7f)).join(''));
addValue('string quote and backslash runs', '"\\"\\\\"\\\\\\"');
addValue('string 10000 ascii', 'a'.repeat(10000));
addValue('string 3000 astral', cp(0x1f600).repeat(3000));
addValue('string 20000 controls mix', 'ab\u001f\u007f\n"\\'.repeat(2500));
addValue('string 2000 three-byte', cp(0x4e2d).repeat(2000));

// key order: UTF-8 byte length first, then bytewise
const order = (name, keys) => add(name, `{${keys.map((k, i) => `${JSON.stringify(k)}: ${i}`).join(', ')}}`);
order('keys b,a', ['b', 'a']);
order('keys aa,b (length before bytes)', ['aa', 'b']);
order('keys b,aa,a,ab,B,A', ['b', 'aa', 'a', 'ab', 'B', 'A']);
order('keys 10,9,1', ['10', '9', '1']);
order('keys integer-like 2,10,1', ['2', '10', '1']);
order('keys empty first', ['a', '']);
order('keys e-acute (2 bytes) vs ab', [cp(0xe9), 'ab']);
order('keys e-acute vs a', [cp(0xe9), 'a']);
order('keys e-acute vs z (utf16 length 1 vs 2 bytes)', ['zz', cp(0xe9), 'z']);
order('keys 3-byte CJK vs abc vs ab', [cp(0x4e2d), 'abc', 'ab']);
order('keys 3-byte U+E000 U+FFFD U+FFFF U+FF5E U+4E2D', [cp(0xffff), cp(0xe000), cp(0xfffd), cp(0xff5e), cp(0x4e2d)]);
order('keys astral 4-byte vs abcd vs abc', [cp(0x1f600), 'abcd', 'abc']);
order('keys astral U+1D538 U+1F600 U+10FFFF U+10000', [cp(0x1f600), cp(0x10ffff), cp(0x1d538), cp(0x10000)]);
order('keys 3-byte BMP-high vs 4-byte astral', [cp(0xff5e), cp(0x1f600), cp(0xe000)]);
order('keys utf16-vs-utf8 order (U+FF5E vs U+1F600 only differ by length)', [cp(0x1f600), cp(0xff5e)]);
order('keys 2-byte U+00E9 U+00A0 U+0080 U+07FF', [cp(0x7ff), cp(0xe9), cp(0x80), cp(0xa0)]);
order('keys controls and DEL', ['\u007f', '\u001f', '\u0001', ' ', '"', '\\']);
order('keys with escapes sort by raw bytes', ['\n', '\t', '\\', '"', '/']);
order('keys 128 vs 127 bytes', ['b'.repeat(128), 'z'.repeat(127), 'a'.repeat(128)]);
order('keys 1000 and 999 chars', ['y'.repeat(1000), 'z'.repeat(999)]);
order('keys case', ['a', 'B', 'A', 'b', '_', '-']);
order('keys mixed widths same byte length 4', ['abcd', cp(0xe9, 0xe9), cp(0xe9) + 'ab', cp(0x1f600), 'a' + cp(0x4e2d)]);
add('keys __proto__ constructor toString', '{"toString": 1, "__proto__": 2, "constructor": 3, "hasOwnProperty": 4}');
add('keys __proto__ nested', '{"a": {"__proto__": {"b": 1}}}');
addValue('key 5000 chars', { ['k'.repeat(5000)]: 1, k: 2 });
addValue('key with control chars and quotes', { 'a"b': 1, 'a\\b': 2, 'a\nb': 3, 'a\u001fb': 4, 'a\u007fb': 5 });

// containers and nesting
add('empty array', '[]'); add('empty object', '{}');
add('nested empty containers', '[[], {}, [[]], [{}], {"a": []}, {"a": {}}, {"": {}}]');
add('array of nulls/bools', '[null, true, false, null]');
add('array whitespace tolerant input', ' [ 1 ,\n 2 ,\t{ "b" : 1 , "a" : [ ] } ] ');
add('object whitespace tolerant input', '\r\n{ "b"\t:\n1, "a" : { "d":2,"c":3 } }\n');
add('deep arrays 40', `${'['.repeat(40)}1${']'.repeat(40)}`);
add('deep objects 30', `${'{"a": '.repeat(30)}null${'}'.repeat(30)}`);
add('wide object 200 keys', `{${Array.from({ length: 200 }, (_, i) => `"k${(i * 37) % 200}": ${i}`).join(', ')}}`);
add('wide array 2000', `[${Array.from({ length: 2000 }, (_, i) => i - 1000).join(', ')}]`);
add('object in array in object', '{"b": [{"y": 1, "x": [2, {"bb": 1, "a": 2}]}], "a": "s"}');
add('card-like record', J({ stable_id: 'FF-001', version: 1, visibility: 'PRIVATE', lifecycle: 'planned', accepted_status: 'not_accepted',
  triage_status: 'untriaged', last_triaged_at: null, title: 't', description: 'd', priority: 'medium',
  criteria: [{ id: 'CR-001', text: 'x', history: ['i'] }], dependency_ids: [], superseded_by: null }));
add('payload-like', J({ batch_id: 'syn_x', baseline: [], changes: [{ stable_id: 'FF-001', expected_version: 0, expected_body_digest: null, next: { version: 1 } }] }));
add('card with unicode text', J({ title: `caf${cp(0xe9)} ${cp(0x4e2d)}${cp(0x6587)} ${cp(0x1f600)}`, description: 'line1\nline2\t"q" \\ / \u0007', criteria: [] }));

// seeded random documents (reproducible: the committed fixture holds PostgreSQL's answers)
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rand = mulberry(20261105);
const pool = ['a', 'b', 'z', 'A', '0', '_', '-', '/', '"', '\\', '\n', '\u001f', '\u007f', cp(0xe9), cp(0x4e2d), cp(0xff5e), cp(0xe000), cp(0xffff), cp(0x1f600), cp(0x1d538), cp(0x10ffff)];
const pick = (list) => list[Math.floor(rand() * list.length)];
const text = (max) => Array.from({ length: Math.floor(rand() * max) }, () => pick(pool)).join('');
function randomValue(depth) {
  const roll = rand();
  if (depth > 4 || roll < 0.3) return pick([null, true, false, 0, -0, 1, -17, 9007199254740991, -9007199254740991, 123456, text(8), text(40)]);
  if (roll < 0.6) return Array.from({ length: Math.floor(rand() * 5) }, () => randomValue(depth + 1));
  const object = {};
  for (let i = Math.floor(rand() * 7); i > 0; i -= 1) object[text(5)] = randomValue(depth + 1);
  return object;
}
for (let i = 0; i < 24; i += 1) {
  const value = { r: randomValue(0), k: Object.fromEntries(Array.from({ length: 6 }, () => [text(4), randomValue(2)])) };
  add(`random document ${String(i + 1).padStart(2, '0')}`, JSON.stringify(value, (key, v) => (Object.is(v, -0) ? '__NEGZERO__' : v)).replaceAll('"__NEGZERO__"', '-0'));
}

// ---- ask PostgreSQL ----
const lit = (value) => `'${value.replaceAll("'", "''")}'`;
const script = ['\\set ON_ERROR_STOP on', "SELECT 'version=' || current_setting('server_version');",
  ...vectors.map((vector, i) => `SELECT ${i}, encode(convert_to(j::text, 'UTF8'), 'hex'), 'sha256:' || encode(sha256(convert_to(j::text, 'UTF8')), 'hex')
    FROM (SELECT ${lit(vector.input)}::jsonb AS j) s;`)].join('\n');
const parsed = new URL(url);
const result = spawnSync(psql, ['-X', '-q', '-t', '-A', '-F', '|', '-d', parsed.toString(), '-f', '-'],
  { input: script, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`psql failed: ${result.stderr}`);
const lines = result.stdout.replaceAll('\r\n', '\n').split('\n').filter(Boolean);
const version = lines.shift().replace('version=', '');
if (lines.length !== vectors.length) throw new Error(`expected ${vectors.length} rows, got ${lines.length}`);
const out = vectors.map((vector, i) => {
  const [index, hex, digest] = lines[i].split('|');
  if (Number(index) !== i) throw new Error(`row ${i} out of order`);
  return { name: vector.name, input: vector.input, expected_utf8_hex: hex, digest };
});
const names = new Set(out.map((v) => v.name));
if (names.size !== out.length) throw new Error('duplicate vector names');
const fixture = { generated_by: 'scripts/generate-jsonb-golden-vectors.mjs', postgres_server_version: version,
  note: 'input is ASCII JSON text; expected_utf8_hex is the UTF-8 bytes of PostgreSQL jsonb::text (hex, so there is no escaping ambiguity) and digest is sha256 over those bytes; both come from a real server.',
  vectors: out };
const target = fileURLToPath(new URL('./fixtures/jsonb-golden-vectors.mjs', import.meta.url));
// A data module (not .json) because the repository policy allowlist admits JSON only under contracts/.
writeFileSync(target, `// Generated by scripts/generate-jsonb-golden-vectors.mjs from a real PostgreSQL server. Do not edit by hand.\nexport default ${JSON.stringify(fixture, null, 1)};\n`);
console.log(`wrote ${out.length} vectors from PostgreSQL ${version}`);
