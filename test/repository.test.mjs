import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { inspectContent, listWorkingTreeFiles, validateRepository, validateRepositoryEntries } from '../scripts/lib/repository.mjs';

function withTemporaryDirectory(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fawxzzy-platform-repository-'));
  try {
    return run(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

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
  assert.ok(failures.some((failure) => failure.includes('contracts/v1/outputs/migration.sql: SQL is outside the inert bootstrap boundary')));
});

test('root local exclusions apply only to directories while same-named files stay visible', () => {
  for (const name of ['node_modules', 'outputs', 'work']) {
    withTemporaryDirectory((directory) => {
      fs.writeFileSync(path.join(directory, name), 'visible to validation\n', 'utf8');
      assert.deepEqual(listWorkingTreeFiles(directory), [name]);
    });
    withTemporaryDirectory((directory) => {
      fs.mkdirSync(path.join(directory, name));
      fs.writeFileSync(path.join(directory, name, 'local-only.txt'), 'excluded local content\n', 'utf8');
      assert.deepEqual(listWorkingTreeFiles(directory), []);
    });
  }
});

test('unsupported link-like repository entries fail closed instead of being omitted', () => {
  withTemporaryDirectory((directory) => {
    const original = fs.readdirSync;
    fs.readdirSync = () => [{
      name: 'escape',
      isDirectory: () => false,
      isFile: () => false,
      isSymbolicLink: () => true
    }];
    try {
      assert.throws(() => listWorkingTreeFiles(directory), /symbolic links and junctions are not supported/);
    } finally {
      fs.readdirSync = original;
    }
  });
});

test('an exact excluded root directory link is omitted without traversal', () => {
  withTemporaryDirectory((directory) => {
    const originalRead = fs.readdirSync;
    const originalStat = fs.statSync;
    fs.readdirSync = () => [{
      name: 'node_modules',
      isDirectory: () => false,
      isFile: () => false,
      isSymbolicLink: () => true
    }];
    fs.statSync = () => ({ isDirectory: () => true });
    try {
      assert.deepEqual(listWorkingTreeFiles(directory), []);
    } finally {
      fs.readdirSync = originalRead;
      fs.statSync = originalStat;
    }
  });
});

test('unsupported ambiguous filesystem entry types fail closed', () => {
  withTemporaryDirectory((directory) => {
    const original = fs.readdirSync;
    fs.readdirSync = () => [{
      name: 'ambiguous',
      isDirectory: () => false,
      isFile: () => false,
      isSymbolicLink: () => false
    }];
    try {
      assert.throws(() => listWorkingTreeFiles(directory), /unsupported filesystem entry type/);
    } finally {
      fs.readdirSync = original;
    }
  });
});
