import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectInertSql } from '../scripts/verify-target-bootstrap.mjs';

const marker = '-- APPLY_ADMITTED=false\n';

test('security verifier rejects data, Cron, network, extension, provider, and public-object effects', () => {
  const fixtures = [
    'insert into fitness.profiles(id) values (1);',
    "select cron.schedule('job', '* * * * *', 'select 1');",
    "select net.http_post(url := 'blocked');",
    'create extension pg_cron;',
    'create table auth.shadow(id bigint);',
    'create table public.product_table(id bigint);',
    'select 1; -- https://example.invalid/hook'
  ];
  for (const fixture of fixtures) assert.notEqual(inspectInertSql('negative.sql', `${marker}${fixture}\n`).length, 0, fixture);
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
