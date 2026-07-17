import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectContent, validateRepository, validateRepositoryEntries } from '../scripts/lib/repository.mjs';

test('repository policy checks pass and are deterministic', () => {
  const first = validateRepository();
  const second = validateRepository();
  assert.deepEqual(first, second);
  assert.deepEqual(first.failures, []);
  assert.equal(first.ok, true);
});

test('secret scanner rejects credential-shaped values', () => {
  const value = `sb_${'secret'}_${'x'.repeat(24)}`;
  assert.ok(inspectContent('fixture.txt', value).some((failure) => failure.includes('Supabase secret key')));
});

test('machine-path scanner rejects host-specific paths', () => {
  const value = ['C:', 'Users', 'operator', 'project'].join('\\');
  assert.ok(inspectContent('fixture.txt', value).some((failure) => failure.includes('machine-specific absolute path')));
});

test('line-ending scanner rejects CRLF', () => {
  assert.ok(inspectContent('fixture.txt', 'first\r\nsecond\r\n').some((failure) => failure.includes('CR or CRLF')));
});

test('nested work and outputs paths cannot bypass repository checks', () => {
  const secret = `sb_${'secret'}_${'x'.repeat(24)}`;
  const machinePath = ['C:', 'Users', 'operator', 'project'].join('\\');
  const failures = validateRepositoryEntries([
    {
      relativePath: 'docs/work/credentials.txt',
      content: `${secret}\n${machinePath}\n`
    },
    {
      relativePath: 'contracts/v1/outputs/data.json',
      content: `${JSON.stringify({ value: secret, path: machinePath }, null, 2)}\n`
    },
    {
      relativePath: 'contracts/v1/outputs/migration.sql',
      content: 'select 1;\n'
    }
  ]);
  assert.ok(failures.some((failure) => failure.includes('docs/work/credentials.txt: path is outside')));
  assert.ok(failures.some((failure) => failure.includes('docs/work/credentials.txt: Supabase secret key detected')));
  assert.ok(failures.some((failure) => failure.includes('docs/work/credentials.txt: machine-specific absolute path detected')));
  assert.ok(failures.some((failure) => failure.includes('contracts/v1/outputs/data.json: path is outside')));
  assert.ok(failures.some((failure) => failure.includes('contracts/v1/outputs/data.json: Supabase secret key detected')));
  assert.ok(failures.some((failure) => failure.includes('contracts/v1/outputs/data.json: machine-specific absolute path detected')));
  assert.ok(failures.some((failure) => failure.includes('contracts/v1/outputs/migration.sql: executable SQL is forbidden')));
});
