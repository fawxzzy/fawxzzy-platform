import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createValidator, loadDocuments, validateContracts } from '../scripts/lib/contracts.mjs';
import { operationsContractPath, operationsExamplesPath, operationsSchemaId, validateDevelopmentOperationsDocuments } from '../scripts/lib/development-operations-contract.mjs';

function documents() {
  return Object.fromEntries([operationsContractPath, operationsExamplesPath].map((p) => [p, JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'))]));
}

test('closed contract and72synthetic policy combinations validate without runtime authority', () => {
  const docs = documents();
  assert.deepEqual(validateDevelopmentOperationsDocuments(docs), []);
  assert.equal(docs[operationsExamplesPath].cases.length, 72);
  assert.equal(docs[operationsContractPath].status, 'OWNER_DECISION');
  assert.equal(docs[operationsContractPath].lifecycle.apply_admitted, false);
  const validator = createValidator();
  assert.equal(validator.getSchema(`${operationsSchemaId}#/$defs/contract`)(docs[operationsContractPath]), true);
  assert.equal(validator.getSchema(`${operationsSchemaId}#/$defs/examples`)(docs[operationsExamplesPath]), true);
});

for (const [name, change] of [
  ['owner adoption', (c) => { c.lifecycle.owner_adopted = true; }],
  ['apply authority', (c) => { c.lifecycle.apply_admitted = true; }],
  ['public visibility', (c) => { c.candidate_wire_decisions.response.visibility = 'PUBLIC'; }],
  ['editable metadata', (c) => { c.candidate_wire_decisions.operator_access.user_metadata_authorizes = true; }],
  ['ordinary auth', (c) => { c.candidate_wire_decisions.operator_access.ordinary_auth_sufficient = true; }],
  ['physical namespace', (c) => { c.domain.physical_namespace = 'public'; }],
  ['parallel writer', (c) => { c.domain.owner_direct_projection_writes = true; }],
  ['Music Sesh collapse', (c) => { c.domain.music_sesh = 'INCLUDED'; }],
  ['provider identifier authority', (c) => { c.domain.discord_ids = 'CANONICAL_KEYS'; }],
  ['implicit version upgrade', (c) => { c.version_dispatch.v1_fresh_to_v2_healthy = true; }],
  ['digest coverage drift', (c) => { c.candidate_wire_decisions.digest.covered_fields.pop(); }],
  ['overwrite conflicting ID', (c) => { c.candidate_wire_decisions.idempotency.conflicting_reuse = 'OVERWRITE'; }],
  ['prose lifecycle inference', (c) => { c.candidate_wire_decisions.state_mapping.prose_drives_lifecycle = true; }],
  ['unknown healthy', (c) => { c.candidate_wire_decisions.watermark.unknown_threshold_is_healthy = true; }],
  ['raw references', (c) => { c.candidate_wire_decisions.response.raw_evidence_references = true; }],
  ['sanitized flag bypass', (c) => { c.candidate_wire_decisions.response.sanitized_flag_sufficient = true; }],
  ['runtime actions', (c) => { c.health.actions_enabled = true; }],
  ['SQL generation', (c) => { c.effects.sql_generated = true; }],
  ['secret-shaped extra field', (c) => { c.unapproved_extra = 'synthetic'; }],
]) {
  test(`reject contract drift: ${name}`, () => {
    const docs = documents(); change(docs[operationsContractPath]);
    assert.ok(validateDevelopmentOperationsDocuments(docs).length > 0);
  });
}

for (const [name, mutate] of [
  ['denied data', (rows) => { rows[0].expected.payload = 'current'; }],
  ['current stale truth', (rows) => { const c=rows.find((r)=>r.input.access_result==='operator_verified' && r.input.health==='stale' && r.input.accepted_redacted_projection); c.expected.current_truth=true; }],
  ['unavailable cards', (rows) => { const c=rows.find((r)=>r.input.access_result==='operator_verified' && r.input.health==='unavailable' && r.input.identity_validated); c.expected.payload='current'; }],
  ['missing marker', (rows) => { const c=rows.find((r)=>r.expected.payload==='last_accepted'); c.expected.visible_marker=false; }],
  ['missing watermark', (rows) => { const c=rows.find((r)=>r.expected.payload==='last_accepted'); c.expected.watermark_required=false; }],
  ['duplicate ID', (rows) => { rows[1].id=rows[0].id; }],
  ['duplicate input', (rows) => { rows[1].input=structuredClone(rows[0].input); }],
  ['incomplete denominator', (rows) => { rows.pop(); }],
]) {
  test(`reject synthetic fixture drift: ${name}`, () => {
    const docs=documents(); mutate(docs[operationsExamplesPath].cases);
    assert.ok(validateDevelopmentOperationsDocuments(docs).length>0);
  });
}

test('reject accessors, proxies, prototypes, sparse arrays and non-JSON values without invoking them', () => {
  let invoked=0;
  const getter=documents(); Object.defineProperty(getter[operationsContractPath], 'status', {enumerable:true,get(){invoked++;return 'OWNER_DECISION';}});
  const proxy=documents(); proxy[operationsContractPath]=new Proxy(proxy[operationsContractPath],{get(){invoked++;throw new Error('must not run');}});
  const inherited=documents(); Object.setPrototypeOf(inherited[operationsContractPath], {injected:true});
  const sparse=documents(); delete sparse[operationsExamplesPath].cases[0];
  const circular=documents(); circular[operationsContractPath].self=circular[operationsContractPath];
  const mapGetter={}; Object.defineProperty(mapGetter,operationsContractPath,{get(){invoked++;return {};}});
  for (const docs of [getter,proxy,inherited,sparse,circular,mapGetter,null,[]]) assert.ok(validateDevelopmentOperationsDocuments(docs).length>0);
  assert.equal(invoked,0);
});

test('all synthetic cases preserve access and unavailable precedence independently of evaluator', () => {
  const rows = documents()[operationsExamplesPath].cases;
  for (const {input, expected} of rows) {
    if (input.access_result !== 'operator_verified') {
      assert.equal(expected.render_state, 'denied');
      assert.equal(expected.payload, 'none');
    }
    if (['unavailable','incompatible'].includes(input.health)) assert.equal(expected.payload, 'none');
    if (expected.current_truth) {
      assert.equal(input.access_result, 'operator_verified');
      assert.equal(input.health, 'healthy');
      assert.equal(input.identity_validated, true);
      assert.equal(input.accepted_redacted_projection, true);
    }
    assert.equal(expected.actions_enabled, false);
  }
});

test('repository includes proposal while retaining sealed and convergence denominators', () => {
  assert.ok(loadDocuments()[operationsContractPath]);
  const result=validateContracts();
  assert.equal(result.ok,true);
  assert.deepEqual([result.schema_count,result.document_count,result.semantic_check_groups],[28,27,27]);
  assert.deepEqual([result.source_planning_schema_count,result.source_planning_document_count,result.source_planning_semantic_check_groups],[3,3,1]);
  assert.deepEqual([result.private_operations_schema_count,result.private_operations_document_count,result.private_operations_semantic_check_groups],[1,2,1]);
  assert.deepEqual([result.observation_schema_count,result.observation_document_count,result.observation_semantic_check_groups],[1,1,1]);
  assert.deepEqual([result.validated_schema_count,result.validated_document_count,result.validated_semantic_check_groups],[33,33,30]);
  assert.deepEqual(validateContracts(),result);
});
