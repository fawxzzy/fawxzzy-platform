import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('npm test and full verification share the serial file concurrency contract', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const runner = fs.readFileSync(new URL('../scripts/verify-repository.mjs', import.meta.url), 'utf8');
  assert.equal(pkg.scripts.test, 'node --test --test-concurrency=1');
  assert.match(runner, /spawnSync\(process\.execPath, \['--test', '--test-concurrency=1'\],/u);
});

test('full verification still runs all repository tests and propagates failure', () => {
  const runner = fs.readFileSync(new URL('../scripts/verify-repository.mjs', import.meta.url), 'utf8');
  assert.match(runner, /if \(tests\.status !== 0\)/u);
  assert.match(runner, /ok: contracts\.ok && repository\.ok && tests\.status === 0/u);
  assert.match(runner, /if \(!report\.ok\) process\.exitCode = 1/u);
  assert.doesNotMatch(runner, /--test-name-pattern|--test-skip-pattern/u);
});
