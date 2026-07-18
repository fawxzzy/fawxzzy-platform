import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { gitBlobSha1, root, sha256 } from '../scripts/generate-target-bootstrap.mjs';
import { verifyTargetBootstrap } from '../scripts/verify-target-bootstrap.mjs';

test('immutable source manifest and accepted denominators verify', () => {
  const report = verifyTargetBootstrap({ checkDeterminism: false });
  assert.equal(report.ok, true, report.failures.join('\n'));
  assert.deepEqual(report.counts, {
    migrations: 122, tables: 41, functions: 30, policies: 74, triggers: 10,
    index_identities: 134, constraint_units: 281, extension_dependencies: 3,
    held_data_effects: 358, dynamic_templates: 11, held_cron_units: 1
  });
});

test('every copied source file matches its byte count, raw digest, and Git blob identity', () => {
  const manifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  for (const migration of manifest.migrations) {
    const bytes = fs.readFileSync(`${root}/${migration.copied_path}`);
    assert.equal(bytes.length, migration.byte_count, migration.copied_path);
    assert.equal(sha256(bytes), migration.raw_sha256, migration.copied_path);
    assert.equal(gitBlobSha1(bytes), migration.blob, migration.copied_path);
  }
});

test('blocked Fitness candidate is dependency evidence, never an executable source input', () => {
  const config = JSON.parse(fs.readFileSync(`${root}/bootstrap/generator/config.v1.json`, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  const dependency = config.blocked_dependencies[0];
  assert.equal(dependency.decision, 'BLOCKED');
  assert.ok(manifest.migrations.every((migration) => migration.commit !== dependency.source_candidate_head));
});
