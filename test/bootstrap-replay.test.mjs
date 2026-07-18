import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { root, simulateCatalog, splitSqlStatements } from '../scripts/generate-target-bootstrap.mjs';

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
