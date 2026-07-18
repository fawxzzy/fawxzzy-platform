import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { gitBlobSha1, root, sha256 } from '../scripts/generate-target-bootstrap.mjs';
import {
  computeCombinedSourceSha256,
  computeSourceChainSha256,
  verifyFrozenSourceAcceptance,
  verifyTargetBootstrap
} from '../scripts/verify-target-bootstrap.mjs';

const appLabels = { discordos: 'DiscordOS', fitness: 'Fitness', mazer: 'Mazer' };

function actualRows(manifest) {
  return Object.fromEntries(['discordos', 'fitness', 'mazer'].map((app) => [app, manifest.migrations
    .filter((migration) => migration.app === app)
    .map((migration) => {
      const bytes = fs.readFileSync(path.join(root, ...migration.copied_path.split('/')));
      return {
        order: migration.order,
        path: migration.path,
        blob: gitBlobSha1(bytes),
        raw_sha256: sha256(bytes),
        byte_count: bytes.length
      };
    })]));
}

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

test('actual copied bytes reproduce every frozen chain and the combined source identity', () => {
  const config = JSON.parse(fs.readFileSync(`${root}/bootstrap/generator/config.v1.json`, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  const rowsByApp = actualRows(manifest);
  for (const source of config.sources) assert.equal(computeSourceChainSha256(rowsByApp[source.app]), source.chain_manifest_sha256, source.app);
  const combined = computeCombinedSourceSha256(config.sources.map((source) => ({
    app_label: appLabels[source.app],
    commit: source.commit,
    tree: source.tree,
    chain_manifest_sha256: computeSourceChainSha256(rowsByApp[source.app])
  })));
  assert.equal(combined, config.evidence.accepted_combined_manifest_sha256);
  assert.deepEqual(verifyFrozenSourceAcceptance({
    sourceRowsByApp: rowsByApp,
    sourceIdentities: config.sources,
    acceptedChains: manifest.accepted_source_chain_sha256,
    configuredCombinedSha256: config.evidence.accepted_combined_manifest_sha256,
    acceptedCombinedSha256: manifest.evidence_artifact.accepted_combined_manifest_sha256
  }), {
    actualChains: manifest.accepted_source_chain_sha256,
    actualCombinedSha256: config.evidence.accepted_combined_manifest_sha256
  });
});

test('substituted copied bytes and immutable source identity fail frozen acceptance', () => {
  const config = JSON.parse(fs.readFileSync(`${root}/bootstrap/generator/config.v1.json`, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  const rowsByApp = actualRows(manifest);
  const original = rowsByApp.discordos[0];
  const substituted = Buffer.from('substituted immutable migration bytes\n', 'utf8');
  rowsByApp.discordos[0] = {
    ...original,
    blob: gitBlobSha1(substituted),
    raw_sha256: sha256(substituted),
    byte_count: substituted.length
  };
  assert.throws(() => verifyFrozenSourceAcceptance({
    sourceRowsByApp: rowsByApp,
    sourceIdentities: config.sources,
    acceptedChains: manifest.accepted_source_chain_sha256,
    configuredCombinedSha256: config.evidence.accepted_combined_manifest_sha256,
    acceptedCombinedSha256: manifest.evidence_artifact.accepted_combined_manifest_sha256
  }), /copied-byte chain digest mismatch/);

  const identityRows = actualRows(manifest);
  const substitutedIdentities = config.sources.map((source) => source.app === 'discordos'
    ? { ...source, commit: '0'.repeat(40) }
    : source);
  assert.throws(() => verifyFrozenSourceAcceptance({
    sourceRowsByApp: identityRows,
    sourceIdentities: substitutedIdentities,
    acceptedChains: manifest.accepted_source_chain_sha256,
    configuredCombinedSha256: config.evidence.accepted_combined_manifest_sha256,
    acceptedCombinedSha256: manifest.evidence_artifact.accepted_combined_manifest_sha256
  }), /discordos commit mismatch/);
});

test('stale and missing frozen digest bindings fail closed', () => {
  const config = JSON.parse(fs.readFileSync(`${root}/bootstrap/generator/config.v1.json`, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  const rowsByApp = actualRows(manifest);
  assert.throws(() => verifyFrozenSourceAcceptance({
    sourceRowsByApp: rowsByApp,
    sourceIdentities: config.sources,
    acceptedChains: { ...manifest.accepted_source_chain_sha256, fitness: '0'.repeat(64) },
    configuredCombinedSha256: config.evidence.accepted_combined_manifest_sha256,
    acceptedCombinedSha256: manifest.evidence_artifact.accepted_combined_manifest_sha256
  }), /fitness accepted chain digest mismatch/);
  const missing = { ...manifest.accepted_source_chain_sha256 };
  delete missing.mazer;
  assert.throws(() => verifyFrozenSourceAcceptance({
    sourceRowsByApp: rowsByApp,
    sourceIdentities: config.sources,
    acceptedChains: missing,
    configuredCombinedSha256: config.evidence.accepted_combined_manifest_sha256,
    acceptedCombinedSha256: manifest.evidence_artifact.accepted_combined_manifest_sha256
  }), /accepted-chain denominator mismatch/);
});

test('blocked Fitness candidate is dependency evidence, never an executable source input', () => {
  const config = JSON.parse(fs.readFileSync(`${root}/bootstrap/generator/config.v1.json`, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  const dependency = config.blocked_dependencies[0];
  assert.equal(dependency.decision, 'BLOCKED');
  assert.ok(manifest.migrations.every((migration) => migration.commit !== dependency.source_candidate_head));
});
