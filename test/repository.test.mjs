import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectContent, validateRepository } from '../scripts/lib/repository.mjs';

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
