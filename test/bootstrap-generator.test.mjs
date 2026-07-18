import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  generatedInertArtifactContractV1,
  generateTargetBootstrap,
  namespaceRewrite,
  parseFunctionDefinition,
  parseFunctionPrivilegeStatement,
  parseFunctionSearchPath,
  resolveGeneratedInertArtifactPath,
  root,
  splitSqlStatements,
  verifyFitnessFunctionSearchPaths
} from '../scripts/generate-target-bootstrap.mjs';

const inertArtifactDirectory = `${root}/${generatedInertArtifactContractV1.directory}`;

function listSqlFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = `${directory}/${entry.name}`;
    return entry.isDirectory() ? listSqlFiles(entryPath) : entry.isFile() && entry.name.endsWith('.sql') ? [entryPath] : [];
  }).sort();
}

function digestOutputs() {
  const paths = [
    ...fs.readdirSync(`${root}/bootstrap/manifests`).sort().map((name) => `bootstrap/manifests/${name}`),
    ...fs.readdirSync(inertArtifactDirectory).sort().map((name) => `${generatedInertArtifactContractV1.directory}/${name}`)
  ];
  const hash = crypto.createHash('sha256');
  for (const relativePath of paths) hash.update(relativePath).update('\0').update(fs.readFileSync(`${root}/${relativePath}`));
  return hash.digest('hex');
}

test('two generator runs are byte-identical', () => {
  const before = digestOutputs();
  const firstReport = generateTargetBootstrap();
  const first = digestOutputs();
  const secondReport = generateTargetBootstrap();
  const second = digestOutputs();
  assert.equal(firstReport.ok, true);
  assert.deepEqual(firstReport, secondReport);
  assert.equal(before, first);
  assert.equal(first, second);
});

test('every generated SQL artifact carries the non-apply marker', () => {
  for (const filename of fs.readdirSync(inertArtifactDirectory)) {
    assert.match(fs.readFileSync(`${inertArtifactDirectory}/${filename}`, 'utf8'), /^-- APPLY_ADMITTED=false\n/);
  }
});

test('generated SQL is path-level inert and closed to the exact artifact namespace', () => {
  assert.deepEqual(listSqlFiles(`${root}/supabase/migrations`), []);
  assert.deepEqual(fs.readdirSync(inertArtifactDirectory).sort(), generatedInertArtifactContractV1.filenames);
  for (const filename of generatedInertArtifactContractV1.filenames) {
    assert.equal(resolveGeneratedInertArtifactPath(filename), path.join(inertArtifactDirectory, filename));
  }
  assert.throws(() => resolveGeneratedInertArtifactPath('../escape.sql'), /undeclared generated inert artifact/);
  assert.throws(() => resolveGeneratedInertArtifactPath('copy.sql'), /undeclared generated inert artifact/);
});

test('Fitness namespace rewriting canonicalizes only the function-header search_path clause', () => {
  const source = `
    CrEaTe OR
      RePlAcE FuNcTiOn public.example(target_id uuid)
    returns text
    LaNgUaGe sql
    SET search_path = PUBLIC , PG_TEMP
    AS $body$
      select 'set search_path = public, pg_temp';
      -- set search_path = public, pg_temp
    $body$;
  `;
  const rewritten = namespaceRewrite(source, 'fitness');
  const parsed = parseFunctionSearchPath(rewritten, 'fitness');
  assert.equal(parsed.malformed, false);
  assert.equal(parsed.present, true);
  assert.deepEqual(parsed.schemas, ['fitness', 'pg_temp']);
  assert.match(rewritten, /FuNcTiOn fitness\.example/i);
  assert.match(rewritten, /set search_path = fitness, pg_temp/);
  assert.match(rewritten, /select 'set search_path = public, pg_temp'/);
  assert.match(rewritten, /-- set search_path = public, pg_temp/);

  const plainCreate = namespaceRewrite(`
    CREATE FUNCTION public.plain() returns void
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $$ begin null; end; $$;
  `, 'fitness');
  assert.deepEqual(parseFunctionSearchPath(plainCreate, 'fitness').schemas, ['fitness', 'pg_temp']);
});

test('Fitness namespace rewriting and final-state validation fail closed on unsafe search paths', () => {
  const definition = (clause) => `
    create or replace function public.example() returns void
    language plpgsql
    ${clause}
    as $$ begin null; end; $$;
  `;
  for (const clause of [
    'set search_path to public, pg_temp',
    'set search_path = public, pg_temp, extensions',
    'set search_path = public, extensions',
    'set search_path = public, pg_temp set search_path = public, pg_temp'
  ]) {
    assert.throws(() => namespaceRewrite(definition(clause), 'fitness'), /search_path/);
  }

  const missing = namespaceRewrite(definition(''), 'fitness');
  assert.match(verifyFitnessFunctionSearchPaths([missing])[0], /missing search_path/);

  const initialMissing = namespaceRewrite(definition(''), 'fitness');
  const finalConfigured = namespaceRewrite(definition('set search_path = public, pg_temp'), 'fitness');
  assert.deepEqual(verifyFitnessFunctionSearchPaths([initialMissing, finalConfigured]), []);
});

test('Fitness search_path regeneration preserves every non-Fitness generated SQL identity', () => {
  const expected = {
    '00000000000001_mazer_schema_inert.sql': '1f8eeee06bab1878b51e85cfdda09d766e17765d66366de69e406d8f58bd72ac',
    '00000000000003_discordos_schema_inert.sql': '5b2783d8f6a78a2a9898c94559b31c168dcb1b5deebc1546365c1c8f09ade79f',
    '00000000000004_platform_security_overlay_inert.sql': '591673cf965aaa19c2cf5dcdfc3458fae43173bfa435dc03b0c0c49589709541'
  };
  for (const [filename, digest] of Object.entries(expected)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(`${inertArtifactDirectory}/${filename}`)).digest('hex');
    assert.equal(actual, digest, filename);
  }
});

test('generated function ACL closure is exact, unique, and follows the final definition', () => {
  const expected = new Map([
    ['00000000000002_fitness_schema_inert.sql', new Map([
      ['fitness.claim_session_follow_up_jobs(uuid, uuid, timestamptz, timestamptz)', 2],
      ['fitness.reorder_routine_day_exercises(uuid, uuid, uuid[])', 2],
      ['fitness.reorder_routine_days(uuid, uuid, uuid[])', 1],
      ['fitness.repack_routine_day_exercise_positions_after_delete()', 3],
      ['fitness.repack_session_exercise_positions_after_delete()', 3]
    ])],
    ['00000000000003_discordos_schema_inert.sql', new Map([['discordos.set_updated_at()', 1]])]
  ]);
  for (const [filename, signatureCounts] of expected) {
    const signatures = [...signatureCounts.keys()].sort();
    const fallback = filename.includes('_fitness_') ? 'fitness' : 'discordos';
    const statements = splitSqlStatements(fs.readFileSync(`${inertArtifactDirectory}/${filename}`, 'utf8'));
    const definitions = new Map();
    const privileges = new Map();
    statements.forEach((statement, index) => {
      const definition = parseFunctionDefinition(statement, fallback);
      if (definition) {
        const state = definitions.get(definition.signature) ?? { count: 0, finalIndex: -1 };
        state.count += 1;
        state.finalIndex = index;
        definitions.set(definition.signature, state);
      }
      const privilege = parseFunctionPrivilegeStatement(statement, fallback);
      if (privilege && !privilege.malformed) {
        assert.equal(privileges.has(privilege.signature), false, privilege.signature);
        privileges.set(privilege.signature, { index, privilege });
      }
    });
    assert.deepEqual([...definitions.keys()].sort(), signatures);
    assert.deepEqual([...privileges.keys()].sort(), signatures);
    for (const signature of signatures) {
      const { index, privilege } = privileges.get(signature);
      assert.equal(definitions.get(signature).count, signatureCounts.get(signature), signature);
      assert.ok(index > definitions.get(signature).finalIndex, signature);
      assert.equal(privilege.action, 'revoke');
      assert.deepEqual(privilege.roles, ['anon', 'authenticated', 'public', 'service_role']);
    }
  }
});
