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
  assert.ok(failures.some((failure) => failure.includes('must check auth.uid()')));
  assert.ok(failures.some((failure) => failure.includes('search_path must be fixed to empty')));
  assert.ok(failures.some((failure) => failure.includes('PUBLIC execute must be revoked')));
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
