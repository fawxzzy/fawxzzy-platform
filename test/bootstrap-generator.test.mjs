import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import {
  generateTargetBootstrap,
  parseFunctionDefinition,
  parseFunctionPrivilegeStatement,
  root,
  splitSqlStatements
} from '../scripts/generate-target-bootstrap.mjs';

function digestOutputs() {
  const paths = [
    ...fs.readdirSync(`${root}/bootstrap/manifests`).sort().map((name) => `bootstrap/manifests/${name}`),
    ...fs.readdirSync(`${root}/supabase/migrations`).sort().map((name) => `supabase/migrations/${name}`)
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
  for (const filename of fs.readdirSync(`${root}/supabase/migrations`)) {
    assert.match(fs.readFileSync(`${root}/supabase/migrations/${filename}`, 'utf8'), /^-- APPLY_ADMITTED=false\n/);
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
    const statements = splitSqlStatements(fs.readFileSync(`${root}/supabase/migrations/${filename}`, 'utf8'));
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
