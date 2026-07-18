import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyStatement, splitSqlStatements } from '../scripts/generate-target-bootstrap.mjs';

test('SQL splitter preserves semicolons inside quotes, identifiers, comments, and dollar bodies', () => {
  const sql = `
    select 'a;''b';
    select "semi;colon";
    /* outer ; /* nested ; */ done */ select 1;
    -- ignored ;
    create function demo() returns void language plpgsql as $body$
    begin perform 'inside;body'; end;
    $body$;
  `;
  const statements = splitSqlStatements(sql);
  assert.equal(statements.length, 4);
  assert.match(statements[3], /inside;body/);
});

test('SQL splitter rejects unterminated lexical states', () => {
  assert.throws(() => splitSqlStatements("select 'unterminated;"), /unterminated SQL lexical state/);
  assert.throws(() => splitSqlStatements('select /* nested'), /unterminated SQL lexical state/);
  assert.throws(() => splitSqlStatements('do $$ begin;'), /unterminated SQL lexical state/);
});

test('statement classifier distinguishes data, extension, Cron, network, and dynamic identities', () => {
  assert.equal(classifyStatement('update fitness.profiles set x = 1;').dataEffect, true);
  assert.equal(classifyStatement('create extension pg_cron;').extensionDependency, true);
  assert.equal(classifyStatement("select cron.schedule('job', '* * * * *', 'select 1');").cronActivation, true);
  assert.equal(classifyStatement("select net.http_post(url := 'blocked');").networkEffect, true);
  assert.equal(classifyStatement("do $$ begin execute format('drop index %I', n); end $$;").dynamicIdentity, true);
});
