import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeFunctionDependencyStatement,
  buildGenerationPlan,
  classifyStatement,
  parseFunctionDefinition,
  splitSqlStatements
} from '../scripts/generate-target-bootstrap.mjs';

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

test('function parser accepts OR REPLACE across case and whitespace and resolves dependency statements', () => {
  const definition = parseFunctionDefinition('CrEaTe\n OR   RePlAcE\tFuNcTiOn PUBLIC  .  DISCORDOS_MIXED() returns void language sql as $$ select 1 $$;', 'discordos');
  assert.deepEqual(definition, { identity: 'public.discordos_mixed', or_replace: true });
  for (const sql of [
    'grant execute on function public.discordos_mixed() to authenticated;',
    'revoke execute on function public.discordos_mixed() from PUBLIC;',
    'comment on function public.discordos_mixed() is null;',
    'create trigger run_it after insert on discordos.events execute function public.discordos_mixed();'
  ]) {
    assert.deepEqual(analyzeFunctionDependencyStatement(sql, 'discordos').references, ['public.discordos_mixed']);
  }
  assert.equal(analyzeFunctionDependencyStatement('comment on function ;', 'discordos').malformed, true);
});

test('generation plan closes held function dependencies transitively', () => {
  const statements = splitSqlStatements(`
    create function public.discordos_root() returns void language sql security definer as $$ select 1 $$;
    create function discordos.wrapper() returns void language sql as $$ select public.discordos_root() $$;
    grant execute on function discordos.wrapper() to authenticated;
    revoke execute on function public.discordos_root() from PUBLIC;
    comment on function public.discordos_root() is null;
    create trigger root_trigger after insert on discordos.events execute function public.discordos_root();
  `);
  const record = {
    app: 'discordos', filename: '001.sql', path: 'supabase/migrations/001.sql', commit: 'a', blob: 'b', raw_sha256: 'c', statements
  };
  const plan = buildGenerationPlan([record], {
    dynamic_allowlist: [],
    held_sources: { fitness_number_migrations: [], discordos_scheduler_activation: '999.sql' },
    resolved_dynamic_policy_source: { path: 'never.sql' }
  });
  assert.equal(plan.units.filter((unit) => unit.blocker_class).length, statements.length);
  assert.equal(plan.units[1].blocker_class, 'held_function_dependency');
  assert.equal(plan.units[2].blocker_class, 'held_function_dependency');
  assert.deepEqual(plan.held_functions, ['discordos:discordos.wrapper', 'discordos:public.discordos_root']);
});
