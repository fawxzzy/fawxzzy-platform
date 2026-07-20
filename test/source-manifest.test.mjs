import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { gitBlobSha1, root, sha256 } from '../scripts/generate-target-bootstrap.mjs';
import {
  computeCombinedSourceSha256,
  computeSourceChainSha256,
  verifyFrozenSourceAcceptance,
  verifyAppDataTransportContracts,
  verifyMazerAppDataAdapter,
  verifyFitnessPr108ReplayGate,
  verifyProviderCanonicalProvenance,
  verifySharedAuthImportRehearsal,
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

test('provider-canonical historical provenance binds the accepted DiscordOS and Mazer package', () => {
  const gate = JSON.parse(fs.readFileSync(`${root}/contracts/v1/gates/migration-gate-state.json`, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  const report = verifyTargetBootstrap({ checkDeterminism: false });
  assert.deepEqual(verifyProviderCanonicalProvenance({ gate, sourceManifest: manifest, deterministicPackageSha256: report.deterministic_digest }), []);

  const substituted = structuredClone(gate);
  substituted.provider_canonical_provenance.effect_mappings[0].accepted_path = substituted.provider_canonical_provenance.effect_mappings[1].accepted_path;
  assert.ok(verifyProviderCanonicalProvenance({ gate: substituted, sourceManifest: manifest, deterministicPackageSha256: report.deterministic_digest }).some((failure) => failure.includes('effect mapping digest drift')));

  const promoted = structuredClone(gate);
  promoted.provider_canonical_provenance.apply_admitted = true;
  assert.ok(verifyProviderCanonicalProvenance({ gate: promoted, sourceManifest: manifest, deterministicPackageSha256: report.deterministic_digest }).some((failure) => failure.includes('non-executable')));
});

test('shared Auth import rehearsal remains source-ready and execution-blocked', () => {
  const gate = JSON.parse(fs.readFileSync(`${root}/contracts/v1/gates/migration-gate-state.json`, 'utf8'));
  const contract = JSON.parse(fs.readFileSync(`${root}/contracts/v1/auth/import-rehearsal-contract.json`, 'utf8'));
  assert.deepEqual(verifySharedAuthImportRehearsal({ contract, gate }), []);
  const promoted = structuredClone(gate);
  promoted.shared_auth_import_reauth_rehearsal.apply_admitted = true;
  assert.ok(verifySharedAuthImportRehearsal({ contract, gate: promoted }).some((failure) => failure.includes('gate drift')));
  const substituted = structuredClone(contract);
  substituted.source_anchors[0].commit = '0'.repeat(40);
  assert.ok(verifySharedAuthImportRehearsal({ contract: substituted, gate }).some((failure) => failure.includes('source anchors drift')));
});

test('app data transport remains source-ready, execution-blocked, and package-neutral', () => {
  const gate = JSON.parse(fs.readFileSync(`${root}/contracts/v1/gates/migration-gate-state.json`, 'utf8'));
  const contract = JSON.parse(fs.readFileSync(`${root}/contracts/v1/transport/app-data-transport-contract.json`, 'utf8'));
  const receipt = JSON.parse(fs.readFileSync(`${root}/contracts/v1/transport/app-data-receipt.example.json`, 'utf8'));
  const journal = JSON.parse(fs.readFileSync(`${root}/contracts/v1/transport/app-data-mutation-journal-contract.json`, 'utf8'));
  assert.deepEqual(verifyAppDataTransportContracts({ contract, receipt, journal, gate }), []);

  const sourceManifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  assert.equal(sourceManifest.migrations.length, 122);
  assert.equal(gate.provider_canonical_provenance.accepted_package.deterministic_package_sha256, '80482b9bbfaf70b5980dd290b78def12d0af898cc10ee12f402b46d378fdbf83');
  assert.equal(gate.app_data_transport.apply_admitted, false);
});

test('app data verifier rejects snapshot, CAS, journal, and gate promotion', () => {
  const gate = JSON.parse(fs.readFileSync(`${root}/contracts/v1/gates/migration-gate-state.json`, 'utf8'));
  const contract = JSON.parse(fs.readFileSync(`${root}/contracts/v1/transport/app-data-transport-contract.json`, 'utf8'));
  const receipt = JSON.parse(fs.readFileSync(`${root}/contracts/v1/transport/app-data-receipt.example.json`, 'utf8'));
  const journal = JSON.parse(fs.readFileSync(`${root}/contracts/v1/transport/app-data-mutation-journal-contract.json`, 'utf8'));

  const incomplete = structuredClone(receipt);
  incomplete.snapshot_completeness.S2_complete_key_and_row_diff = false;
  assert.ok(verifyAppDataTransportContracts({ contract, receipt: incomplete, journal, gate }).some((failure) => failure.includes('snapshot completeness')));

  const conflicted = structuredClone(receipt);
  conflicted.cas_counts.unexpected_overwrite = 1;
  assert.ok(verifyAppDataTransportContracts({ contract, receipt: conflicted, journal, gate }).some((failure) => failure.includes('CAS conflict')));

  const mutableJournal = structuredClone(journal);
  mutableJournal.append_only = false;
  assert.ok(verifyAppDataTransportContracts({ contract, receipt, journal: mutableJournal, gate }).some((failure) => failure.includes('journal lifecycle')));

  const promotedGate = structuredClone(gate);
  promotedGate.app_data_transport.apply_admitted = true;
  assert.ok(verifyAppDataTransportContracts({ contract, receipt, journal, gate: promotedGate }).some((failure) => failure.includes('migration gate drift')));
});

test('Mazer app data adapter remains package-neutral and execution-blocked', () => {
  const gate = JSON.parse(fs.readFileSync(`${root}/contracts/v1/gates/migration-gate-state.json`, 'utf8'));
  const adapter = JSON.parse(fs.readFileSync(`${root}/contracts/v1/transport/mazer-app-data-adapter-contract.json`, 'utf8'));
  const sourceManifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  assert.deepEqual(verifyMazerAppDataAdapter({ adapter, gate }), []);
  assert.equal(sourceManifest.migrations.length, 122);
  assert.equal(sourceManifest.migrations.filter((migration) => migration.app === 'mazer').length, 4);
  assert.equal(gate.provider_canonical_provenance.accepted_package.deterministic_package_sha256, '80482b9bbfaf70b5980dd290b78def12d0af898cc10ee12f402b46d378fdbf83');
  assert.equal(adapter.apply_admitted, false);
  assert.equal(gate.app_data_adapters.apply_admitted, false);
  assert.equal(gate.app_data_adapters.all_adapters_ready, false);
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
  const dependency = config.blocked_dependencies.find((candidate) => candidate.id === 'fitness-global-number-forward-transform');
  assert.equal(dependency.decision, 'BLOCKED');
  assert.ok(manifest.migrations.every((migration) => migration.commit !== dependency.source_candidate_head));
});

test('Fitness PR 108 and replay adapter provenance ratchet remains non-executable', () => {
  const config = JSON.parse(fs.readFileSync(`${root}/bootstrap/generator/config.v1.json`, 'utf8'));
  const gate = JSON.parse(fs.readFileSync(`${root}/contracts/v1/gates/fitness-pr108-replay-gate.json`, 'utf8'));
  const sourceManifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  assert.deepEqual(verifyFitnessPr108ReplayGate({ config, gate, sourceManifest }), []);
  assert.equal(sourceManifest.migrations.length, 122);
  assert.equal(sourceManifest.migrations.filter((migration) => migration.app === 'fitness').length, 101);
  assert.ok(sourceManifest.migrations.every((migration) => migration.path !== gate.fitness_candidate.candidate_migration.path));
});

test('Fitness PR 108 provenance ratchet rejects candidate leakage and promoted lifecycle claims', () => {
  const config = JSON.parse(fs.readFileSync(`${root}/bootstrap/generator/config.v1.json`, 'utf8'));
  const gate = JSON.parse(fs.readFileSync(`${root}/contracts/v1/gates/fitness-pr108-replay-gate.json`, 'utf8'));
  const sourceManifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  const promoted = structuredClone(gate);
  promoted.lifecycle.target_apply = 'CURRENT';
  promoted.lifecycle.fitness_merge = 'CURRENT';
  assert.ok(verifyFitnessPr108ReplayGate({ config, gate: promoted, sourceManifest }).some((failure) => failure.includes('target_apply must remain BLOCKED')));

  const leaked = structuredClone(sourceManifest);
  leaked.migrations.push({
    app: 'fitness',
    path: gate.fitness_candidate.candidate_migration.path,
    blob: gate.fitness_candidate.candidate_migration.blob,
    raw_sha256: gate.fitness_candidate.candidate_migration.raw_sha256,
    commit: gate.fitness_candidate.head_commit
  });
  const failures = verifyFitnessPr108ReplayGate({ config, gate, sourceManifest: leaked });
  assert.ok(failures.some((failure) => failure.includes('must remain 122 migrations')));
  assert.ok(failures.some((failure) => failure.includes('candidate path leaked')));
  assert.ok(failures.some((failure) => failure.includes('candidate blob leaked')));
  assert.ok(failures.some((failure) => failure.includes('candidate digest leaked')));
  assert.ok(failures.some((failure) => failure.includes('candidate head leaked')));
});
