import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { root, simulateCatalog, splitSqlStatements } from '../scripts/generate-target-bootstrap.mjs';
import {
  generatedFunctionPrivilegeContractV1,
  verifyEffectiveFunctionAcls,
  verifyGeneratedFunctionPrivileges,
  verifySchemaCreationOrder
} from '../scripts/verify-target-bootstrap.mjs';

test('catalog simulation applies create, replace, and drop in order', () => {
  const catalog = simulateCatalog(splitSqlStatements(`
    create table fitness.keep_me(id bigint);
    create table fitness.drop_me(id bigint);
    drop table fitness.drop_me;
    create function fitness.f() returns int language sql as $$ select 1; $$;
    create or replace function fitness.f() returns int language sql as $$ select 2; $$;
    create policy own_row on fitness.keep_me using (true);
    drop policy own_row on fitness.keep_me;
    create index keep_me_idx on fitness.keep_me(id);
    create trigger keep_me_trigger before insert on fitness.keep_me execute function fitness.f();
  `));
  assert.deepEqual(catalog.tables, ['fitness.keep_me']);
  assert.deepEqual(catalog.functions, ['fitness.f']);
  assert.deepEqual(catalog.policies, []);
  assert.deepEqual(catalog.indexes, ['keep_me_idx']);
  assert.deepEqual(catalog.triggers, ['fitness.keep_me::keep_me_trigger']);
});

test('all replay-dependent identities remain fail-closed', () => {
  const dynamic = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/dynamic-units.v1.json`, 'utf8'));
  const objects = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-objects.v1.json`, 'utf8'));
  assert.equal(dynamic.units.length, 11);
  assert.ok(dynamic.units.every((unit) => unit.status === 'BLOCKED'));
  assert.equal(objects.constraint_units.status, 'BLOCKED');
  assert.equal(objects.constraint_units.unresolved_named_candidate_delta, 14);
});

test('filename-order replay creates each product namespace before its first qualified object', () => {
  const marker = '-- APPLY_ADMITTED=false\n';
  assert.deepEqual(verifySchemaCreationOrder([
    ['01_mazer.sql', `${marker}create schema if not exists mazer; create table mazer.profiles(id bigint);`],
    ['02_fitness.sql', `${marker}create schema if not exists fitness; create table fitness.profiles(id bigint);`]
  ]), []);
  assert.match(verifySchemaCreationOrder([
    ['01_bad.sql', `${marker}create table fitness.profiles(id bigint);`]
  ])[0], /fitness schema is referenced before creation/);
});

test('actual generated product slices lead with their idempotent namespace creation', () => {
  for (const [filename, schema] of [
    ['00000000000001_mazer_schema_inert.sql', 'mazer'],
    ['00000000000002_fitness_schema_inert.sql', 'fitness']
  ]) {
    const statements = splitSqlStatements(fs.readFileSync(`${root}/supabase/migrations/${filename}`, 'utf8'));
    assert.match(statements[0], new RegExp(`create\\s+schema\\s+if\\s+not\\s+exists\\s+${schema}`, 'i'));
  }
});

test('effective ACL replay preserves revocation across CREATE OR REPLACE', () => {
  const marker = '-- APPLY_ADMITTED=false\n';
  const sql = `${marker}
    create function fitness.example(target_id uuid) returns void language sql as $$ select 1 $$;
    revoke execute on function fitness.example(uuid) from PUBLIC, anon, authenticated, service_role;
    create or replace function fitness.example(target_id uuid) returns void language sql as $$ select 2 $$;
  `;
  assert.deepEqual(verifyEffectiveFunctionAcls(
    '00000000000002_fitness_schema_inert.sql',
    sql,
    ['fitness.example(uuid)'],
    { 'fitness.example(uuid)': 2 }
  ), []);
});

test('versioned generated function privilege contract freezes the complete current corpus', () => {
  assert.equal(generatedFunctionPrivilegeContractV1.version, '1.0.0');
  assert.deepEqual(Object.keys(generatedFunctionPrivilegeContractV1.functions).sort(), [
    'discordos.set_updated_at()',
    'fitness.claim_session_follow_up_jobs(uuid, uuid, timestamptz, timestamptz)',
    'fitness.reorder_routine_day_exercises(uuid, uuid, uuid[])',
    'fitness.reorder_routine_days(uuid, uuid, uuid[])',
    'fitness.repack_routine_day_exercise_positions_after_delete()',
    'fitness.repack_session_exercise_positions_after_delete()'
  ]);
  assert.ok(Object.values(generatedFunctionPrivilegeContractV1.functions).every((entry) => entry.allowed_execute_roles.length === 0));
  const files = fs.readdirSync(`${root}/supabase/migrations`)
    .filter((filename) => filename.endsWith('.sql'))
    .sort()
    .map((filename) => [filename, fs.readFileSync(`${root}/supabase/migrations/${filename}`, 'utf8')]);
  assert.deepEqual(verifyGeneratedFunctionPrivileges(files, generatedFunctionPrivilegeContractV1), []);
});
