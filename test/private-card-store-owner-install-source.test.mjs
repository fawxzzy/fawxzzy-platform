import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sqlPath = 'contracts/v1/installations/private-card-store-r001.sql';
const expectedSha = '6908a5094d8b9f06390ef14adea618ead5412a0648079ff207aea2b582b682bf';
const manifest = JSON.parse(readFileSync(path.join(root, 'contracts/v1/installations/private-card-store-r001.manifest.json'), 'utf8'));

test('private card owner source pins the reviewed SQL bytes without provider discovery', () => {
  const sql = readFileSync(path.join(root, sqlPath));
  assert.equal(sql.length, 15733);
  assert.equal(createHash('sha256').update(sql).digest('hex'), expectedSha);
  assert.equal(manifest.sql_path, sqlPath);
  assert.equal(manifest.sql_sha256, expectedSha);
  assert.equal(manifest.sql_bytes, sql.length);
  assert.equal(manifest.migration_name, 'private_card_store_r001');
  assert.equal(manifest.provider_discovered, false);
  assert.equal(manifest.server_assigned_migration_version, 'UNKNOWN');
  assert.equal(manifest.execution, 'BLOCKED');
  assert.equal(manifest.apply_admitted, false);
});
