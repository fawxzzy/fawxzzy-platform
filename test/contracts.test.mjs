import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createValidator,
  loadDocuments,
  validateContracts,
  validateSchemaInstances,
  validateSemantics
} from '../scripts/lib/contracts.mjs';

test('all versioned contract instances satisfy their schemas and semantics', () => {
  const report = validateContracts();
  assert.deepEqual(report.failures, []);
  assert.equal(report.ok, true);
});

test('contract validation output is deterministic', () => {
  assert.deepEqual(validateContracts(), validateContracts());
  assert.equal(JSON.stringify(validateContracts()), JSON.stringify(validateContracts()));
});

test('activation request schema rejects a caller-selected subject', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/activation/activation-request.example.json'].user_id = '00000000-0000-4000-8000-000000000003';
  const failures = validateSchemaInstances(documents, createValidator());
  assert.ok(failures.some((failure) => failure.includes('activation-request.example.json')));
});

test('semantic checks reject an unblocked migration operation', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/gates/migration-gate-state.json'].operation_gates[0].status = 'CURRENT';
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('every operation must remain BLOCKED')));
});

test('semantic checks reject unsafe definer functions', () => {
  const documents = structuredClone(loadDocuments());
  const databaseFunction = documents['contracts/v1/security/rls-grant-function-matrix.json'].functions[0];
  databaseFunction.auth_uid_check = false;
  databaseFunction.fixed_search_path = 'public';
  databaseFunction.execute_revoked_from = [];
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('must derive and check auth.uid()')));
  assert.ok(failures.some((failure) => failure.includes('search_path must be fixed to empty')));
  assert.ok(failures.some((failure) => failure.includes('PUBLIC execute must be revoked')));
  assert.ok(failures.some((failure) => failure.includes('exact function contract changed')));
});

test('Auth insert trigger derives its subject from NEW.id without auth.uid()', () => {
  const documents = structuredClone(loadDocuments());
  const authTrigger = documents['contracts/v1/security/rls-grant-function-matrix.json'].functions[1];
  authTrigger.auth_uid_check = true;
  authTrigger.subject_source = 'auth.uid()';
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('NEW.id without auth.uid()')));
  assert.ok(failures.some((failure) => failure.includes('exact function contract changed')));
});

test('closed-world relation validation rejects an extra permissive policy', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/security/rls-grant-function-matrix.json'].relations[0].policies.push({
    name: 'unsafe read all authenticated profiles',
    command: 'SELECT',
    role: 'authenticated',
    using: 'true',
    with_check: null
  });
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('exact grants and complete admitted policy set changed')));
});

test('closed-world function validation rejects a third privileged function', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/security/rls-grant-function-matrix.json'].functions.push({
    name: 'platform_private.on_auth_user_created',
    security: 'DEFINER',
    exposure: 'trigger_only',
    fixed_search_path: '',
    auth_uid_check: false,
    subject_source: 'NEW.id',
    user_id_argument_allowed: false,
    execute_grants: [],
    execute_revoked_from: ['PUBLIC', 'anon', 'authenticated', 'service_role'],
    atomic_relations: ['platform_shared.global_profiles']
  });
  const semanticFailures = validateSemantics(documents);
  assert.ok(semanticFailures.some((failure) => failure.includes('function count changed')));
  const schemaFailures = validateSchemaInstances(documents, createValidator());
  assert.ok(schemaFailures.some((failure) => failure.includes('rls-grant-function-matrix.json')));
});

test('semantic checks reject editable metadata authorization', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/security/rls-grant-function-matrix.json'].relations[0].policies[0].using = "auth.jwt() -> 'user_metadata' ->> 'admin' = 'true'";
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('editable metadata authorization is forbidden')));
});

test('semantic checks reject product relations in public', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/security/rls-grant-function-matrix.json'].relations[0].name = 'public.user_profiles';
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('no public relations')));
});

test('semantic checks reject undeclared authorization helpers', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/security/rls-grant-function-matrix.json'].relations[0].policies[0].using = 'has_admin_access((select auth.uid()))';
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('undeclared authorization helper')));
});

test('semantic checks reject production redirect wildcards', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/auth/domain-session-contract.json'].auth_configuration.exact_redirect_urls[0] = 'https://*.fawxzzy.com/auth/callback';
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('must be exact')));
});

test('password policy rejects restrictive caps and truncation', () => {
  const documents = structuredClone(loadDocuments());
  const capacity = documents['contracts/v1/auth/domain-session-contract.json'].auth_policy.password_length.capacity;
  capacity.restrictive_app_cap_allowed = true;
  capacity.minimum_supported_characters = 20;
  capacity.never_truncate = false;
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('restrictive application password caps are forbidden')));
  assert.ok(failures.some((failure) => failure.includes('support at least 64 characters')));
  assert.ok(failures.some((failure) => failure.includes('password truncation is forbidden')));
});

test('identity policy rejects username-only matching and write-gate drift', () => {
  const documents = structuredClone(loadDocuments());
  const identity = documents['contracts/v1/identity/identity-map.json'];
  identity.username_contract.identity_matching.username_alone_forbidden = false;
  identity.username_contract.backfill_status = 'CURRENT';
  identity.user_number_contract.non_fitness_backfill.status = 'CURRENT';
  identity.cleanup_contract.destructive_cleanup_status = 'CURRENT';
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('username-only identity matching must remain forbidden')));
  assert.ok(failures.some((failure) => failure.includes('username backfill writes must remain BLOCKED')));
  assert.ok(failures.some((failure) => failure.includes('legacy user_number backfill writes must remain BLOCKED')));
  assert.ok(failures.some((failure) => failure.includes('destructive cleanup must remain BLOCKED')));
});

test('global user_number invariants reject reuse or renumbering', () => {
  const documents = structuredClone(loadDocuments());
  const numbering = documents['contracts/v1/identity/identity-map.json'].user_number_contract;
  numbering.monotonic = false;
  numbering.never_reused = false;
  numbering.never_renumbered = false;
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('monotonic, never reused, and never renumbered')));
});
