import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { inspectInertSql, verifyEffectiveFunctionAcls } from '../scripts/verify-target-bootstrap.mjs';

const marker = '-- APPLY_ADMITTED=false\n';

test('security verifier rejects data, Cron, network, extension, provider, and public-object effects', () => {
  const fixtures = [
    'insert into fitness.profiles(id) values (1);',
    "select cron.schedule('job', '* * * * *', 'select 1');",
    "select net.http_post(url := 'blocked');",
    'create extension pg_cron;',
    'create table auth.shadow(id bigint);',
    'create table public.product_table(id bigint);',
    'CrEaTe\n OR   RePlAcE\tFuNcTiOn PUBLIC  .  DISCORDOS_LEAK() returns void language sql as $$ select 1 $$;',
    'select 1; -- https://example.invalid/hook'
  ];
  for (const fixture of fixtures) assert.notEqual(inspectInertSql('negative.sql', `${marker}${fixture}\n`).length, 0, fixture);
});

test('security verifier rejects every dependent reference to a held function', () => {
  const held = ['fitness.is_automation_auth_user'];
  const fixtures = [
    'grant execute on function fitness.is_automation_auth_user(uuid) to authenticated;',
    'revoke execute on function fitness.is_automation_auth_user(uuid) from PUBLIC;',
    'comment on function fitness.is_automation_auth_user(uuid) is null;',
    'create trigger check_user before insert on fitness.profiles execute function fitness.is_automation_auth_user();',
    'create function fitness.wrapper() returns boolean language sql as $$ select fitness.is_automation_auth_user(auth.uid()) $$;'
  ];
  for (const fixture of fixtures) {
    assert.notEqual(inspectInertSql('00000000000002_fitness_schema_inert.sql', `${marker}${fixture}\n`, held).length, 0, fixture);
  }
  assert.notEqual(inspectInertSql('negative.sql', `${marker}comment on function ;\n`, held).length, 0);
});

test('actual held evidence closes the previously broken Fitness function references', () => {
  const dispositions = JSON.parse(fs.readFileSync(new URL('../bootstrap/manifests/dispositions.v1.json', import.meta.url), 'utf8'));
  const expected = [
    'fitness.assign_real_user_number_on_profile_insert',
    'fitness.is_automation_auth_user',
    'fitness.consume_discord_verification_token',
    'fitness.upsert_discord_member_link',
    'fitness.compact_human_member_numbers_preserving_zero',
    'fitness.refresh_discord_member_link_member_number_snapshots'
  ];
  const targets = new Set(dispositions.held_functions.map((unit) => unit.target_identity));
  for (const identity of expected) assert.equal(targets.has(identity), true, identity);
  assert.ok(dispositions.held_statements.some((unit) => unit.blocker_class === 'held_function_dependency' && unit.referenced_held_functions.some((reference) => reference.target_identity === 'fitness.is_automation_auth_user')));
});

test('security verifier rejects private exposure, PUBLIC execute, provider commands, and missing marker', () => {
  const fixtures = [
    `${marker}grant usage on schema platform_private to authenticated;`,
    `${marker}grant execute on function fitness.f() to PUBLIC;`,
    `${marker}supabase db push;`,
    'select 1;'
  ];
  for (const fixture of fixtures) assert.notEqual(inspectInertSql('negative.sql', fixture).length, 0, fixture);
});

test('security verifier accepts a deny-by-default inert schema unit', () => {
  const sql = `${marker}create schema if not exists fitness;\nrevoke all on schema fitness from PUBLIC, anon, authenticated;\n`;
  assert.deepEqual(inspectInertSql('positive.sql', sql), []);
});

test('effective function ACL verifier rejects missing, unmatched, extra, and explicit privilege reintroduction', () => {
  const expected = ['fitness.example(uuid)'];
  const expectedCounts = { 'fitness.example(uuid)': 1 };
  const definition = 'create function fitness.example(target_id uuid) returns void language sql as $$ select 1 $$;';
  const exact = 'revoke execute on function fitness.example(uuid) from PUBLIC, anon, authenticated, service_role;';
  const filename = '00000000000002_fitness_schema_inert.sql';
  assert.deepEqual(verifyEffectiveFunctionAcls(filename, `${marker}${definition}\n${exact}\n`, expected, expectedCounts), []);
  for (const sql of [
    `${marker}${definition}\n`,
    `${marker}revoke execute on function fitness.example(uuid) from PUBLIC, anon, authenticated, service_role;\n${definition}\n`,
    `${marker}${definition}\nrevoke execute on function fitness.example(uuid) from anon, authenticated, service_role;\n`,
    `${marker}${definition}\n${exact}\ngrant execute on function fitness.example(uuid) to authenticated;\n`,
    `${marker}${definition}\n${exact}\ngrant execute on all functions in schema fitness to authenticated;\n`,
    `${marker}${definition}\n${exact}\ngrant execute on function fitness.example(uuid) to undeclared_role;\n`,
    `${marker}${definition}\n${exact}\ngrant execute on all routines in schema fitness to authenticated;\n`
  ]) {
    assert.notEqual(verifyEffectiveFunctionAcls(filename, sql, expected, expectedCounts).length, 0, sql);
  }
  assert.notEqual(
    verifyEffectiveFunctionAcls(filename, `${marker}${definition}\ncreate or replace function fitness.example(target_id uuid) returns void language sql as $$ select 2 $$;\n${exact}\n`, expected, expectedCounts).length,
    0
  );
});

test('effective function ACL verifier respects ordered schema and default privilege settlement', () => {
  const filename = '00000000000002_fitness_schema_inert.sql';
  const definition = 'create function fitness.example(target_id uuid) returns void language sql as $$ select 1 $$;';
  const expected = ['fitness.example(uuid)'];
  const counts = { 'fitness.example(uuid)': 1 };
  const schemaSettled = `${marker}${definition}
    grant execute on all functions in schema fitness to authenticated;
    revoke all privileges on all functions in schema fitness from PUBLIC, anon, authenticated, service_role;
  `;
  assert.deepEqual(verifyEffectiveFunctionAcls(filename, schemaSettled, expected, counts), []);

  const defaultSettled = `${marker}
    alter default privileges in schema fitness grant execute on functions to authenticated;
    ${definition}
    revoke execute on function fitness.example(uuid) from PUBLIC, anon, authenticated, service_role;
  `;
  assert.deepEqual(verifyEffectiveFunctionAcls(filename, defaultSettled, expected, counts), []);

  const defaultExposed = `${marker}
    alter default privileges in schema fitness grant execute on functions to authenticated;
    ${definition}
    revoke execute on function fitness.example(uuid) from PUBLIC;
  `;
  assert.notEqual(verifyEffectiveFunctionAcls(filename, defaultExposed, expected, counts).length, 0);

  const laterSettled = `${marker}${definition}
    revoke execute on function fitness.example(uuid) from PUBLIC, anon, authenticated, service_role;
    grant execute on function fitness.example(uuid) to authenticated;
    revoke execute on function fitness.example(uuid) from authenticated;
  `;
  assert.deepEqual(verifyEffectiveFunctionAcls(filename, laterSettled, expected, counts), []);
});

test('effective function ACL verifier preserves overload and mixed OR REPLACE identities', () => {
  const filename = '00000000000002_fitness_schema_inert.sql';
  const sql = `${marker}
    CrEaTe FuNcTiOn fitness.example(target_id uuid) returns void language sql as $$ select 1 $$;
    CREATE FUNCTION fitness.example(label text) returns void language sql as $$ select 1 $$;
    cReAtE OR\n RePlAcE FUNCTION fitness.example(target_id uuid) returns void language sql as $$ select 2 $$;
    revoke execute on function fitness.example(uuid) from PUBLIC, anon, authenticated, service_role;
    revoke execute on function fitness.example(text) from PUBLIC, anon, authenticated, service_role;
  `;
  assert.deepEqual(
    verifyEffectiveFunctionAcls(
      filename,
      sql,
      ['fitness.example(text)', 'fitness.example(uuid)'],
      { 'fitness.example(text)': 1, 'fitness.example(uuid)': 2 }
    ),
    []
  );
});

test('effective function ACL verifier fails closed on malformed and owner-dependent privileges', () => {
  const filename = '00000000000002_fitness_schema_inert.sql';
  const definition = 'create function fitness.example(target_id uuid) returns void language sql as $$ select 1 $$;';
  const expected = ['fitness.example(uuid)'];
  const counts = { 'fitness.example(uuid)': 1 };
  for (const statement of [
    'grant execute on all functions in schema ;',
    'alter default privileges for role owner in schema fitness grant execute on functions to authenticated;',
    'grant execute on all routines in schema fitness to authenticated;',
    'revoke execute on function fitness.example(table%type) from PUBLIC;'
  ]) {
    const sql = `${marker}${definition}
      revoke execute on function fitness.example(uuid) from PUBLIC, anon, authenticated, service_role;
      ${statement}
    `;
    assert.notEqual(verifyEffectiveFunctionAcls(filename, sql, expected, counts).length, 0, statement);
  }
});

test('a newly added function is rejected even when explicitly revoked', () => {
  const filename = '00000000000002_fitness_schema_inert.sql';
  const sql = `${marker}
    create function fitness.undeclared() returns void language sql as $$ select 1 $$;
    revoke execute on function fitness.undeclared() from PUBLIC, anon, authenticated, service_role;
  `;
  assert.notEqual(verifyEffectiveFunctionAcls(filename, sql, [], {}).length, 0);
});
