import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import {
  buildCandidatePrivateCardSqlPayload, candidatePrivateCardGraphDigest, planCandidatePrivateCardAdoption
} from '../scripts/lib/development-operations-private-adoption.mjs';
import { jsonbDigest, jsonbText, sortCardsByStableId } from '../scripts/lib/development-operations-jsonb.mjs';

// Proves the JS side against the pinned SQL on a REAL PostgreSQL server. Skipped unless PG_TEST_URL is
// set, so the normal `npm test` stays hermetic and needs no database.
//
//   PG_TEST_URL     libpq URI (user postgres, host 127.0.0.1, trust auth) of a THROWAWAY local cluster,
//                   scheme postgresql, any database name, for example port 54339 and database postgres
//   PG_TEST_PSQL    optional path to psql (default: psql on PATH)
//   PG_TEST_LOCALE  optional non-C collation (for example "en_US.UTF-8" or "English_United States.1252")
//                   used for the informational collation-divergence control
//
// The test creates databases pc_pr37_c / pc_pr37_loc and cluster-global roles platform_ops_owner,
// platform_card_{sealer,writer,reader} and stand-ins anon/authenticated/service_role, then drops them
// again. Never point it at a shared or provider cluster; it refuses non-loopback hosts.
const url = process.env.PG_TEST_URL;
const psql = process.env.PG_TEST_PSQL || 'psql';
const localeCollation = process.env.PG_TEST_LOCALE || '';
const skip = url ? false : 'PG_TEST_URL is not set (real-PostgreSQL integration test)';
const installSql = new URL('../contracts/v1/installations/private-card-store-r001.sql', import.meta.url);
const DB_C = 'pc_pr37_c';
const DB_LOC = 'pc_pr37_loc';
const sourceRevision = 'c'.repeat(40);
const trustReceipt = `sha256:${'d'.repeat(64)}`;

function connection(database) {
  const parsed = new URL(url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)) throw new Error('PG_TEST_URL must be a loopback host');
  parsed.pathname = `/${database}`;
  return parsed.toString();
}
function run(database, text, extra = []) {
  const result = spawnSync(psql, ['-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-d', connection(database), ...extra, '-f', '-'],
    { input: text, encoding: 'utf8', env: { ...process.env, PGCLIENTENCODING: 'UTF8' }, maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  return { status: result.status, out: result.stdout.replaceAll('\r\n', '\n').trim(), err: result.stderr };
}
function sql(database, text) {
  const result = run(database, text);
  if (result.status !== 0) throw new Error(`psql failed: ${result.err}`);
  return result.out;
}
function sqlFails(database, text, message) {
  const result = run(database, text);
  assert.notEqual(result.status, 0, `expected failure containing ${message}`);
  assert.match(result.err, new RegExp(message), result.err);
}
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const asRole = (role, statement) => `SET ROLE ${role}; ${statement}`;
const seal = (batch, plan) => asRole('platform_card_sealer',
  `SELECT platform_private.private_card_seal(${literal(batch.payloadText)}::jsonb, ${literal(plan.baseline_digest)},
     ${literal(plan.post_graph_digest)}, ${literal(sourceRevision)}, ${literal(trustReceipt)}, now() + interval '10 minutes');`);
const apply = (payloadText) => asRole('platform_card_writer',
  `SELECT platform_private.private_card_apply(${literal(payloadText)}::jsonb);`);

// Synthetic 39-card graph (24 planned, 15 fixed, 153 criteria), same shape the planner requires.
const cardId = (n) => `FF-${String(n).padStart(3, '0')}`;
function fixture(batchId = 'syn_pg_a') {
  let criterion = 1;
  const baseline = Array.from({ length: 39 }, (_, index) => ({
    stable_id: cardId(index + 1), version: 1, visibility: 'PRIVATE', lifecycle: index < 24 ? 'planned' : 'fixed',
    accepted_status: 'not_accepted', triage_status: 'untriaged', last_triaged_at: null,
    title: 'synthetic é "private" \\ title', description: 'synthetic private description\nline two 😀', priority: 'medium',
    criteria: index < 24 ? Array.from({ length: index < 9 ? 7 : 6 }, () => ({
      id: `CR-${String(criterion++).padStart(3, '0')}`, text: 'synthetic private criterion', history: ['initial'] })) : [],
    dependency_ids: [], superseded_by: null }));
  return { batch_id: batchId, baseline, changes: [],
    original_criterion_ids: baseline.flatMap((card) => card.criteria.map((item) => item.id)),
    expected_graph_digest: jsonbDigest(baseline), prior_batch: null };
}
function update(input, index, mutate) {
  const old = input.baseline[index];
  const next = structuredClone(old); next.version += 1; mutate(next);
  input.changes.push({ stable_id: old.stable_id, expected_version: old.version, expected_body_digest: jsonbDigest(old), next });
}
function create(input, stableId, mutate = () => {}) {
  const next = structuredClone(input.baseline[0]);
  Object.assign(next, { stable_id: stableId, version: 1, criteria: [], dependency_ids: [] });
  mutate(next);
  input.changes.push({ stable_id: stableId, expected_version: 0, expected_body_digest: null, next });
}
const build = (input) => buildCandidatePrivateCardSqlPayload(JSON.stringify(input));

// Reset the database to exactly the baseline (owner-direct inserts as superuser; body_digest computed
// by Postgres itself, then compared with the JS digest).
function resetGraph(input) {
  const rows = input.baseline.map((card) => `(${literal(card.stable_id)}, ${card.version}, ${literal(jsonbText(card))}::jsonb)`).join(',\n');
  sql(DB_C, `BEGIN;
    TRUNCATE work.private_card_batches, work.private_cards, platform_private.private_card_admissions;
    INSERT INTO work.private_cards(stable_id, version, body, body_digest)
      SELECT s, v, b, 'sha256:' || encode(sha256(convert_to(b::text, 'UTF8')), 'hex') FROM (VALUES ${rows}) AS t(s, v, b);
    COMMIT;`);
}
const readGraph = () => JSON.parse(sql(DB_C, asRole('platform_card_reader', 'SELECT platform_private.private_card_read_graph();')));
const readBatch = (batchId) => JSON.parse(sql(DB_C, asRole('platform_card_writer',
  `SELECT platform_private.private_card_read_batch(${literal(batchId)});`)));
const storedDigests = () => Object.fromEntries(sql(DB_C, 'SELECT stable_id || chr(9) || body_digest FROM work.private_cards ORDER BY stable_id;')
  .split('\n').map((line) => line.split('\t')));
const countRows = (table) => Number(sql(DB_C, `SELECT count(*) FROM ${table};`));
// psql prints SET ROLE as nothing under -q; the SELECT result is the only output line.
const lastLine = (text) => text.split('\n').at(-1);

function cleanup() {
  for (const database of [DB_C, DB_LOC]) run('postgres', `DROP DATABASE IF EXISTS ${database} WITH (FORCE);`);
  run('postgres', `DROP ROLE IF EXISTS platform_card_sealer, platform_card_writer, platform_card_reader;`);
}

test.before(() => {
  if (skip) return;
  cleanup();
  sql('postgres', `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'platform_ops_owner') THEN CREATE ROLE platform_ops_owner NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
  END $$;`);
  sql('postgres', `CREATE DATABASE ${DB_C} TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C';`);
  sql(DB_C, 'CREATE SCHEMA work AUTHORIZATION platform_ops_owner; CREATE SCHEMA platform_private AUTHORIZATION platform_ops_owner;');
  // The SQL file is the pinned artifact; it runs unmodified, in its own transaction.
  const result = spawnSync(psql, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', connection(DB_C), '-f', fileURLToPath(installSql)],
    { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
test.after(() => { if (!skip) cleanup(); });

test('real server: C collation, pinned SQL installed, 39-card baseline digests equal Postgres body_digest', { skip }, () => {
  assert.equal(sql(DB_C, 'SELECT datcollate FROM pg_database WHERE datname = current_database();'), 'C');
  const input = fixture(); resetGraph(input);
  const stored = storedDigests();
  for (const card of input.baseline) assert.equal(jsonbDigest(card), stored[card.stable_id], card.stable_id);
  assert.equal(candidatePrivateCardGraphDigest(readGraph()), planCandidatePrivateCardAdoption(JSON.stringify(input)).baseline_digest);
  assert.deepEqual(readGraph(), sortCardsByStableId(input.baseline));
});

test('real server: jsonbText equals Postgres jsonb::text for edge-case and fuzzed values', { skip }, () => {
  const vectors = [
    null, true, false, 0, -0, -1, 7, 9007199254740991, -9007199254740991, '', 'plain',
    'quote " backslash \\ slash / tab \t nl \n cr \r bs \b ff \f', 'ctl \u0001\u001f\u007f\u0080  ﻿',
    'é中😀🏳️', [], {}, [[], {}, [null]],
    { bb: 1, a: 2, ccc: 3, 'é': 4, z: 5, aa: 6, 'è': 7, '': 8, 'a b': 9, '😀': 10, 'Z': 11, 'a': 12, 'B': 13 },
    { zz: { y: [1, 2, { b: 1, a: 2 }], x: 'v' }, k: [] }
  ];
  let seed = 20261105;
  const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const alphabet = ['a', 'B', 'z', '0', ' ', '"', '\\', '\n', '\u0001', 'é', 'è', '中', '😀', '-', '_'];
  const text = () => Array.from({ length: Math.floor(random() * 5) }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
  const make = (depth) => {
    const pick = random();
    if (depth > 3 || pick < 0.3) return [null, true, false, Math.floor(random() * 2000) - 1000, text()][Math.floor(random() * 5)];
    if (pick < 0.65) return Array.from({ length: Math.floor(random() * 4) }, () => make(depth + 1));
    return Object.fromEntries(Array.from({ length: Math.floor(random() * 6) }, () => [text(), make(depth + 1)]));
  };
  for (let index = 0; index < 300; index += 1) vectors.push(make(0));
  const lines = vectors.map((value, index) => `${index}\t${JSON.stringify(value)}`);
  // One round trip: feed all vectors through jsonb and return text + digest per row.
  const rows = vectors.map((value, index) => `(${index}, ${literal(JSON.stringify(value))}::jsonb)`).join(',');
  const out = sql(DB_C, `SELECT i || chr(9) || (v::text) || chr(9) || 'sha256:' || encode(sha256(convert_to(v::text, 'UTF8')), 'hex')
    FROM (VALUES ${rows}) AS t(i, v) ORDER BY i;`).split('\n');
  // Strings may contain newlines only escaped (\n), so one output line per vector.
  assert.equal(out.length, vectors.length);
  vectors.forEach((value, index) => {
    const [i, pgText, pgDigest] = out[index].split('\t');
    assert.equal(Number(i), index);
    assert.equal(jsonbText(value), pgText, `vector ${index}: ${lines[index]}`);
    assert.equal(jsonbDigest(value), pgDigest, `vector ${index}`);
  });
  // jsonb refuses U+0000 and JS refuses it too; non-integer numbers are refused in JS because scale is lost.
  sqlFails(DB_C, `SELECT '"a\\u0000b"'::jsonb;`, 'unsupported Unicode escape sequence');
  assert.throws(() => jsonbText('a\u0000b'), { code: 'ERR_JSONB_NUL' });
  assert.equal(sql(DB_C, `SELECT '1.0'::jsonb::text || ' ' || '1e2'::jsonb::text;`), '1.0 100');
  assert.throws(() => jsonbText(1.0 + 0.5), { code: 'ERR_JSONB_NUMBER' });
});

test('real server: row order. JS bytewise sort equals ORDER BY stable_id under C; other collations reported', { skip }, () => {
  const ids = ['FF-10', 'FF-1-A', 'FF-1', 'FF-A', 'FF-0', 'FF-Z9', 'FF-1A', 'FF-001', 'FF-01-B', 'FF-9', 'FF-A-1', 'FF-AB'];
  const query = `SELECT string_agg(x, ',' ORDER BY x) FROM unnest(ARRAY[${ids.map(literal).join(',')}]) AS x;`;
  assert.equal(sql(DB_C, query), sortCardsByStableId(ids.map((stable_id) => ({ stable_id }))).map((r) => r.stable_id).join(','));
  if (!localeCollation) return;
  sql('postgres', `CREATE DATABASE ${DB_LOC} TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE ${literal(localeCollation)} LC_CTYPE ${literal(localeCollation)};`);
  const located = sql(DB_LOC, query);
  const bytewise = sql(DB_C, query);
  // The pinned SQL orders by the database default collation. If a database's order differs from
  // bytewise, JS graph digests would not equal SQL digests and apply would fail closed with
  // PRIVATE_CARD_GRAPH_PREIMAGE. Whether a given locale differs is platform-specific (glibc before 2.28
  // ignored punctuation; Windows NLS and ICU do not for [A-Z0-9-]), so this reports instead of asserting.
  console.log(`# collation control (${localeCollation}): C=${bytewise} | locale=${located} | differs=${located !== bytewise}`);
});

test('real server: update + create applied through seal/apply; JS digests equal Postgres digests', { skip }, () => {
  const input = fixture('syn_pg_commit');
  update(input, 0, (next) => { next.priority = 'high'; next.title = 'changed é title'; });
  update(input, 1, (next) => { next.criteria.push({ id: 'CR-900', text: 'added', history: ['added'] }); });
  create(input, 'FF-040', (next) => { next.dependency_ids = ['FF-001']; next.title = 'a created card'; });
  resetGraph(input);
  const batch = build(input);
  const { plan, payload } = batch;
  assert.deepEqual(Object.keys(payload).sort(), ['baseline', 'batch_id', 'changes']);

  // seal returns SQL's input_digest of the exact payload
  assert.equal(lastLine(sql(DB_C, seal(batch, plan))), plan.input_digest);
  const admission = sql(DB_C, `SELECT input_digest || ' ' || baseline_digest || ' ' || post_graph_digest FROM platform_private.private_card_admissions WHERE batch_id = 'syn_pg_commit';`);
  assert.equal(admission, `${plan.input_digest} ${plan.baseline_digest} ${plan.post_graph_digest}`);

  const applied = JSON.parse(lastLine(sql(DB_C, apply(batch.payloadText))));
  assert.equal(applied.disposition, 'committed');
  assert.equal(applied.input_digest, plan.input_digest);
  assert.equal(applied.post_graph_digest, plan.post_graph_digest);
  assert.deepEqual(applied.changed_ids, plan.changed_ids);

  const receipt = readBatch('syn_pg_commit');
  assert.deepEqual(receipt, { batch_id: 'syn_pg_commit', input_digest: plan.input_digest, baseline_digest: plan.baseline_digest,
    post_graph_digest: plan.post_graph_digest, changed_ids: plan.changed_ids });
  assert.equal(sql(DB_C, `SELECT source_revision || ' ' || trust_receipt FROM work.private_card_batches;`), `${sourceRevision} ${trustReceipt}`);

  const graph = readGraph();
  assert.equal(graph.length, 40);
  assert.equal(candidatePrivateCardGraphDigest(graph), plan.post_graph_digest);
  assert.equal(candidatePrivateCardGraphDigest(graph), receipt.post_graph_digest);
  const stored = storedDigests();
  for (const card of graph) assert.equal(jsonbDigest(card), stored[card.stable_id], `body_digest ${card.stable_id}`);
  assert.equal(stored['FF-040'], jsonbDigest(input.changes.find((c) => c.stable_id === 'FF-040').next));
  assert.equal(sql(DB_C, `SELECT version FROM work.private_cards WHERE stable_id = 'FF-040';`), '1');
  assert.equal(sql(DB_C, `SELECT version FROM work.private_cards WHERE stable_id = 'FF-001';`), '2');
  assert.notEqual(sql(DB_C, `SELECT consumed_at IS NOT NULL FROM platform_private.private_card_admissions;`), 'f');

  // Idempotent exact repeat: no new write, same digests (also with the planner's own prior_batch rule).
  const repeat = JSON.parse(lastLine(sql(DB_C, apply(batch.payloadText))));
  assert.equal(repeat.disposition, 'exact_repeat_no_op');
  assert.equal(repeat.input_digest, plan.input_digest);
  assert.equal(repeat.post_graph_digest, plan.post_graph_digest);
  assert.equal(countRows('work.private_card_batches'), 1);
  assert.equal(candidatePrivateCardGraphDigest(readGraph()), plan.post_graph_digest);
  const replanned = planCandidatePrivateCardAdoption(JSON.stringify({ ...input, prior_batch: { batch_id: 'syn_pg_commit', input_digest: receipt.input_digest } }));
  assert.equal(replanned.disposition, 'exact_repeat_no_op');

  // Collision: same batch_id, different payload.
  const other = fixture('syn_pg_commit');
  update(other, 0, (next) => { next.priority = 'low'; });
  const otherBatch = build(other);
  assert.notEqual(otherBatch.plan.input_digest, plan.input_digest);
  sqlFails(DB_C, apply(otherBatch.payloadText), 'PRIVATE_CARD_BATCH_COLLISION');
  assert.equal(candidatePrivateCardGraphDigest(readGraph()), plan.post_graph_digest);
});

test('real server: CAS mismatch, stale baseline, unadmitted and wrong-shape payloads are rejected and leave no trace', { skip }, () => {
  const input = fixture('syn_pg_cas');
  update(input, 0, (next) => { next.priority = 'high'; });
  update(input, 1, (next) => { next.priority = 'low'; });
  resetGraph(input);
  const batch = build(input);
  const before = candidatePrivateCardGraphDigest(readGraph());

  // Not admitted: nothing sealed yet.
  sqlFails(DB_C, apply(batch.payloadText), 'PRIVATE_CARD_BATCH_NOT_ADMITTED');

  // Real CAS conflict inside SQL: right baseline, wrong expected_body_digest on the second change.
  const forged = structuredClone(batch.payload);
  forged.changes[1].expected_body_digest = jsonbDigest(input.baseline[5]);
  const forgedBatch = { payloadText: jsonbText(forged) };
  assert.equal(lastLine(sql(DB_C, seal(forgedBatch, batch.plan))), jsonbDigest(forged));
  sqlFails(DB_C, apply(forgedBatch.payloadText), 'PRIVATE_CARD_CAS');
  assert.equal(candidatePrivateCardGraphDigest(readGraph()), before, 'first change must roll back with the second');
  assert.equal(countRows('work.private_card_batches'), 0);
  assert.equal(sql(DB_C, 'SELECT count(*) FROM platform_private.private_card_admissions WHERE consumed_at IS NOT NULL;'), '0');

  // Stale baseline: the card moved after the payload was sealed.
  resetGraph(input);
  sql(DB_C, `UPDATE work.private_cards SET body = jsonb_set(body, '{priority}', '"high"') WHERE stable_id = 'FF-010';`);
  sql(DB_C, seal(batch, batch.plan));
  sqlFails(DB_C, apply(batch.payloadText), 'PRIVATE_CARD_GRAPH_PREIMAGE');
  resetGraph(input);

  // Post-image mismatch: sealed post digest is not what the changes produce.
  const wrongPost = { ...batch.plan, post_graph_digest: jsonbDigest([]) };
  const postBatch = fixture('syn_pg_post'); update(postBatch, 0, (next) => { next.priority = 'high'; });
  const postBuilt = build(postBatch);
  sql(DB_C, seal(postBuilt, { ...postBuilt.plan, post_graph_digest: wrongPost.post_graph_digest }));
  sqlFails(DB_C, apply(postBuilt.payloadText), 'PRIVATE_CARD_GRAPH_POSTIMAGE');
  assert.equal(candidatePrivateCardGraphDigest(readGraph()), before);
});

test('real server: the old five-key change shape and the six-key planner input are rejected by SQL and by JS', { skip }, () => {
  const input = fixture('syn_pg_old');
  update(input, 0, (next) => { next.priority = 'high'; });
  resetGraph(input);
  const batch = build(input);
  const legacy = structuredClone(batch.payload);
  const [only] = legacy.changes;
  legacy.changes = [{ stable_id: only.stable_id, expected_version: only.expected_version,
    expected_record_digest: only.expected_body_digest, expected_incoming_ids: [], next: only.next }];
  const legacyText = jsonbText(legacy);
  sql(DB_C, seal({ payloadText: legacyText }, batch.plan));
  sqlFails(DB_C, apply(legacyText), 'PRIVATE_CARD_CHANGE_INVALID');
  // Six-key planner input cannot even be sealed.
  const sixKeys = { ...batch.payload, original_criterion_ids: input.original_criterion_ids, expected_graph_digest: input.expected_graph_digest };
  sqlFails(DB_C, seal({ payloadText: jsonbText(sixKeys) }, batch.plan), 'PRIVATE_CARD_SEAL_INVALID');
  sqlFails(DB_C, apply(jsonbText(sixKeys)), 'PRIVATE_CARD_BATCH_INVALID');
  // JS rejects the legacy change shape before it could ever be sealed.
  const jsLegacy = structuredClone(input);
  jsLegacy.changes[0] = { stable_id: only.stable_id, expected_version: 1, expected_record_digest: only.expected_body_digest,
    expected_incoming_ids: [], next: only.next };
  assert.throws(() => planCandidatePrivateCardAdoption(JSON.stringify(jsLegacy)), { code: 'ERR_PRIVATE_CARD_ADOPTION_CHANGE_FIELDS' });
  assert.equal(countRows('work.private_card_batches'), 0);
});

test('real server: SQL accepts exactly 1..39 changes, as the JS cap does', { skip }, () => {
  const full = fixture('syn_pg_full');
  for (let index = 0; index < 24; index += 1) update(full, index, (next) => { next.priority = 'high'; });
  for (let index = 0; index < 15; index += 1) create(full, cardId(100 + index));
  resetGraph(full);
  const batch = build(full);
  assert.equal(batch.payload.changes.length, 39);
  sql(DB_C, seal(batch, batch.plan));
  const applied = JSON.parse(lastLine(sql(DB_C, apply(batch.payloadText))));
  assert.equal(applied.disposition, 'committed');
  assert.equal(applied.post_graph_digest, batch.plan.post_graph_digest);
  assert.equal(applied.changed_ids.length, 39);
  assert.equal(candidatePrivateCardGraphDigest(readGraph()), batch.plan.post_graph_digest);

  // 40 changes: JS refuses to plan, and a hand-built payload is refused by SQL apply.
  const over = fixture('syn_pg_over');
  for (let index = 0; index < 24; index += 1) update(over, index, (next) => { next.priority = 'high'; });
  for (let index = 0; index < 16; index += 1) create(over, cardId(100 + index));
  assert.throws(() => planCandidatePrivateCardAdoption(JSON.stringify(over)), { code: 'ERR_PRIVATE_CARD_ADOPTION_INPUT_VALUE' });
  resetGraph(over);
  const base = build(full);
  const payload40 = sortedPayload(over);
  sql(DB_C, seal({ payloadText: jsonbText(payload40) }, base.plan));
  sqlFails(DB_C, apply(jsonbText(payload40)), 'PRIVATE_CARD_BATCH_INVALID');
  // zero changes: SQL refuses as well (JS plans it but cannot build a payload)
  const none = { batch_id: 'syn_pg_none', baseline: sortCardsByStableId(over.baseline), changes: [] };
  sqlFails(DB_C, apply(jsonbText(none)), 'PRIVATE_CARD_BATCH_INVALID');
});

function sortedPayload(input) {
  return { batch_id: input.batch_id, baseline: sortCardsByStableId(input.baseline),
    changes: [...input.changes].sort((a, b) => (a.stable_id < b.stable_id ? -1 : 1)) };
}

test('real server: the 128-character batch_id cap is the same in JS and SQL', { skip }, () => {
  const longest = `syn_${'a'.repeat(124)}`;
  assert.equal(longest.length, 128);
  const input = fixture(longest);
  update(input, 0, (next) => { next.priority = 'high'; });
  resetGraph(input);
  const batch = build(input);
  assert.equal(lastLine(sql(DB_C, seal(batch, batch.plan))), batch.plan.input_digest);
  const tooLong = fixture(`${longest}a`);
  update(tooLong, 0, (next) => { next.priority = 'high'; });
  assert.throws(() => build(tooLong), { code: 'ERR_PRIVATE_CARD_ADOPTION_INPUT_VALUE' });
  const sqlOnly = { ...batch.payload, batch_id: `${longest}a` };
  sqlFails(DB_C, seal({ payloadText: jsonbText(sqlOnly) }, batch.plan), 'PRIVATE_CARD_SEAL_INVALID');
});

test('pinned SQL bytes used by this test are unchanged', { skip }, () => {
  const bytes = fs.readFileSync(installSql);
  assert.equal(bytes.length, 15733);
  // Full digest, not just length: the same value the manifest and the owner-install-source test pin.
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '6908a5094d8b9f06390ef14adea618ead5412a0648079ff207aea2b582b682bf');
});
