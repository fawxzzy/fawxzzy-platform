import { spawnSync } from 'node:child_process';
import { validateContracts } from './lib/contracts.mjs';
import { validateRepository } from './lib/repository.mjs';

const contracts = validateContracts();
const repository = validateRepository();
// Generator tests rewrite shared deterministic fixtures. Match npm test's
// serial file policy so digest readers cannot observe a partial rewrite.
const tests = spawnSync(process.execPath, ['--test', '--test-concurrency=1'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: { ...process.env, NO_COLOR: '1' }
});

if (tests.status !== 0) {
  process.stderr.write(tests.stdout);
  process.stderr.write(tests.stderr);
}

const report = {
  ok: contracts.ok && repository.ok && tests.status === 0,
  contracts,
  repository,
  tests: {
    ok: tests.status === 0
  }
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
