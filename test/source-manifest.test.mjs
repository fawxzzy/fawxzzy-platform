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
  verifyDiscordosAppDataAdapter,
  verifyFitnessAppDataAdapter,
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
  assert.equal(report.migration_package_digest, 'b65d1c0b73607218cc37826d9bb77c25704ea18f957abba7b5667a79d0a2c8db');
  assert.equal(report.governance_manifest_digest, '9b2b0474aa462ec63e9ba364d29d6508afd04e0069ba759de87d46ce1ba5e11a');
  assert.deepEqual(report.counts, {
    migrations: 122, tables: 41, functions: 30, policies: 74, triggers: 10,
    index_identities: 134, constraint_units: 281, extension_dependencies: 3,
    held_data_effects: 358, dynamic_templates: 11, held_cron_units: 1
  });
});

test('migration package and governance manifest identities are separate and fail closed', () => {
  const baseline = JSON.parse(fs.readFileSync(`${root}/contracts/v1/gates/migration-gate-state.json`, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  const report = verifyTargetBootstrap({ checkDeterminism: false });
  const accepted = baseline.provider_canonical_provenance.accepted_package;
  assert.equal(accepted.digest_model, 'SEPARATE_MIGRATION_AND_GOVERNANCE_V1');
  assert.ok(!accepted.migration_package_paths.includes('bootstrap/manifests/namespace-plan.v1.json'));
  assert.deepEqual(accepted.governance_manifest_paths, ['bootstrap/manifests/namespace-plan.v1.json']);
  assert.equal(accepted.legacy_combined_package_recomputation_admitted, false);

  const cases = [
    ['digest model', (gate) => { gate.provider_canonical_provenance.accepted_package.digest_model = 'COMBINED'; }],
    ['migration package path denominator', (gate) => { gate.provider_canonical_provenance.accepted_package.migration_package_paths.push('bootstrap/manifests/namespace-plan.v1.json'); }],
    ['governance manifest path denominator', (gate) => { gate.provider_canonical_provenance.accepted_package.governance_manifest_paths = ['bootstrap/manifests/source-migrations.v1.json']; }],
    ['migration package digest', (gate) => { gate.provider_canonical_provenance.accepted_package.migration_package_sha256 = report.governance_manifest_digest; }],
    ['governance manifest digest', (gate) => { gate.provider_canonical_provenance.accepted_package.governance_manifest_sha256 = report.migration_package_digest; }],
    ['legacy combined digest boundary', (gate) => { gate.provider_canonical_provenance.accepted_package.legacy_combined_package_recomputation_admitted = true; }]
  ];
  for (const [label, mutate] of cases) {
    const gate = structuredClone(baseline);
    mutate(gate);
    const failures = verifyProviderCanonicalProvenance({
      gate,
      sourceManifest: manifest,
      migrationPackageSha256: report.migration_package_digest,
      governanceManifestSha256: report.governance_manifest_digest
    });
    assert.deepEqual(failures, [...failures].sort((left, right) => left.localeCompare(right)), `${label} ordering`);
    assert.ok(failures.some((failure) => failure.includes(label)), label);
  }
});

test('governance manifest binds the corrected Data API decision and rejected collision', () => {
  const gate = JSON.parse(fs.readFileSync(`${root}/contracts/v1/gates/migration-gate-state.json`, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  const report = verifyTargetBootstrap({ checkDeterminism: false });
  const binding = gate.data_api_decision_binding;
  assert.equal(binding.data_api_gate_version, '1.4.0');
  assert.equal(binding.decision_id, 'FP-MAN-047');
  assert.equal(binding.question_event_id, 'onv1_ed934a7382f5e52e6ceea9ea73011f9ff70a46d31bd6061a3dc7645946cad0df');
  assert.equal(binding.question_payload_sha256, 'ed934a7382f5e52e6ceea9ea73011f9ff70a46d31bd6061a3dc7645946cad0df');
  assert.equal(binding.answer_event_id, 'onv1_2a47e6b7bfb21d11ffe4cf87a7091f8aafb2d75ffebf25b3914dd6c03d8bb570');
  assert.equal(binding.answer_payload_sha256, '2a47e6b7bfb21d11ffe4cf87a7091f8aafb2d75ffebf25b3914dd6c03d8bb570');
  assert.equal(binding.answer_text_sha256, '3cf34735fbf4b2f83c811377d0a43903875e583a3409d4a4e75ca986d942e7b7');
  assert.equal(binding.rejected_collision_decision_id, 'FP-MAN-037');
  assert.equal(binding.rejected_collision_data_api_authority_granted, false);
  assert.equal(binding.guarded_reproduction_attempt_limit, 1);
  assert.equal(binding.guarded_reproduction_attempts_executed, 1);
  assert.equal(binding.attempt_consumption_event_id, 'onv1_6258aed05023737d6403a35dcf0867e873ab64513578d25713c9584c830e3836');
  assert.equal(binding.terminal_receipt_event_id, 'onv1_6515ddefc604a92dcf4849395a0dfd19a191b1139891a233318636f5a81e683b');
  assert.equal(binding.terminal_outcome_classification, 'PREINTERACTION_LEDGER_VALIDATION_FAILURE');
  assert.equal(binding.terminal_result, 'NO_SAVE_CONFIRMED');
  assert.equal(binding.retry_permitted, false);
  assert.equal(binding.dashboard_save_attempts, 0);
  assert.equal(binding.post_attempt_readbacks, 0);
  assert.equal(binding.rollback_save_attempts, 0);
  assert.equal(binding.persisted_provider_mutations, 0);
  assert.equal(binding.provider_execution_status, 'BLOCKED');
  assert.equal(binding.apply_admitted, false);

  for (const mutate of [
    (value) => { value.decision_id = 'FP-MAN-037'; },
    (value) => { value.question_event_id = 'onv1_9cce7f3612508739dc826bc5e292de7ec329bbf64d71dfb31ff22619dc80e6f3'; },
    (value) => { value.question_payload_sha256 = value.answer_payload_sha256; },
    (value) => { value.answer_event_id = 'onv1_' + '0'.repeat(64); },
    (value) => { value.answer_payload_sha256 = '0'.repeat(64); },
    (value) => { value.answer_text_sha256 = '0'.repeat(64); },
    (value) => { value.unexpected_envelope_field = true; },
    (value) => { value.rejected_collision_data_api_authority_granted = true; },
    (value) => { value.guarded_reproduction_attempts_executed = 0; },
    (value) => { value.attempt_consumption_event_id = 'onv1_' + '0'.repeat(64); },
    (value) => { value.terminal_receipt_event_id = 'onv1_' + '0'.repeat(64); },
    (value) => { value.terminal_outcome_classification = 'SAVE_ATTEMPTED'; },
    (value) => { value.terminal_result = 'PERSISTED'; },
    (value) => { value.retry_permitted = true; },
    (value) => { value.dashboard_save_attempts = 1; },
    (value) => { value.post_attempt_readbacks = 1; },
    (value) => { value.rollback_save_attempts = 1; },
    (value) => { value.persisted_provider_mutations = 1; },
    (value) => { value.provider_execution_status = 'CURRENT'; },
    (value) => { value.apply_admitted = true; }
  ]) {
    const drifted = structuredClone(gate);
    mutate(drifted.data_api_decision_binding);
    assert.ok(verifyProviderCanonicalProvenance({
      gate: drifted,
      sourceManifest: manifest,
      migrationPackageSha256: report.migration_package_digest,
      governanceManifestSha256: report.governance_manifest_digest
    }).some((failure) => failure.includes('Data API manual decision binding drift')));
  }
});

test('provider-canonical historical provenance binds the accepted DiscordOS and Mazer package', () => {
  const gate = JSON.parse(fs.readFileSync(`${root}/contracts/v1/gates/migration-gate-state.json`, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  const report = verifyTargetBootstrap({ checkDeterminism: false });
  assert.deepEqual(verifyProviderCanonicalProvenance({
    gate,
    sourceManifest: manifest,
    migrationPackageSha256: report.migration_package_digest,
    governanceManifestSha256: report.governance_manifest_digest
  }), []);

  const substituted = structuredClone(gate);
  substituted.provider_canonical_provenance.effect_mappings[0].accepted_path = substituted.provider_canonical_provenance.effect_mappings[1].accepted_path;
  assert.ok(verifyProviderCanonicalProvenance({
    gate: substituted,
    sourceManifest: manifest,
    migrationPackageSha256: report.migration_package_digest,
    governanceManifestSha256: report.governance_manifest_digest
  }).some((failure) => failure.includes('effect mapping digest drift')));

  const promoted = structuredClone(gate);
  promoted.provider_canonical_provenance.apply_admitted = true;
  assert.ok(verifyProviderCanonicalProvenance({
    gate: promoted,
    sourceManifest: manifest,
    migrationPackageSha256: report.migration_package_digest,
    governanceManifestSha256: report.governance_manifest_digest
  }).some((failure) => failure.includes('non-executable')));
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
  assert.equal(gate.provider_canonical_provenance.accepted_package.migration_package_sha256, 'b65d1c0b73607218cc37826d9bb77c25704ea18f957abba7b5667a79d0a2c8db');
  assert.equal(gate.provider_canonical_provenance.accepted_package.governance_manifest_sha256, '9b2b0474aa462ec63e9ba364d29d6508afd04e0069ba759de87d46ce1ba5e11a');
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
  assert.equal(gate.provider_canonical_provenance.accepted_package.migration_package_sha256, 'b65d1c0b73607218cc37826d9bb77c25704ea18f957abba7b5667a79d0a2c8db');
  assert.equal(adapter.apply_admitted, false);
  assert.equal(gate.app_data_adapters.apply_admitted, false);
  assert.equal(gate.app_data_adapters.all_adapters_ready, true);
});

test('Fitness app data adapter binds the accepted 101-unit source and leaves the 122-unit package inert', () => {
  const gate = JSON.parse(fs.readFileSync(`${root}/contracts/v1/gates/migration-gate-state.json`, 'utf8'));
  const adapter = JSON.parse(fs.readFileSync(`${root}/contracts/v1/transport/fitness-app-data-adapter-contract.json`, 'utf8'));
  const sourceManifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  assert.deepEqual(verifyFitnessAppDataAdapter({ adapter, gate }), []);
  assert.equal(sourceManifest.migrations.length, 122);
  assert.equal(sourceManifest.migrations.filter((migration) => migration.app === 'fitness').length, 101);
  assert.equal(adapter.source_evidence.accepted_migration_count, 101);
  assert.equal(adapter.source_evidence.current_git_migration_count, 101);
  assert.equal(adapter.source_evidence.held_candidate.candidate_migration_count, 102);
  assert.equal(adapter.source_evidence.held_candidate.candidate_bytes_admitted, false);
  assert.equal(adapter.source_evidence.accepted_migration_package_sha256, 'b65d1c0b73607218cc37826d9bb77c25704ea18f957abba7b5667a79d0a2c8db');
  assert.equal(adapter.apply_admitted, false);
  assert.equal(gate.app_data_adapters.apply_admitted, false);
  assert.equal(gate.app_data_adapters.all_adapters_ready, true);
});

test('DiscordOS app data adapter binds the provider-canonical 17-unit source and leaves the 122-unit package inert', () => {
  const gate = JSON.parse(fs.readFileSync(`${root}/contracts/v1/gates/migration-gate-state.json`, 'utf8'));
  const adapter = JSON.parse(fs.readFileSync(`${root}/contracts/v1/transport/discordos-app-data-adapter-contract.json`, 'utf8'));
  const sourceManifest = JSON.parse(fs.readFileSync(`${root}/bootstrap/manifests/source-migrations.v1.json`, 'utf8'));
  assert.deepEqual(verifyDiscordosAppDataAdapter({ adapter, gate }), []);
  assert.equal(sourceManifest.migrations.length, 122);
  assert.equal(sourceManifest.migrations.filter((migration) => migration.app === 'discordos').length, 17);
  assert.equal(adapter.source_evidence.provider_canonical_migration_count, 17);
  assert.equal(adapter.source_evidence.current_git_migration_count, 11);
  assert.equal(adapter.source_evidence.current_git_substitution_forbidden, true);
  assert.equal(adapter.source_evidence.accepted_migration_package_sha256, 'b65d1c0b73607218cc37826d9bb77c25704ea18f957abba7b5667a79d0a2c8db');
  assert.equal(adapter.inert_boundary.declared_relation_count, 10);
  assert.equal(adapter.inert_boundary.emitted_relation_count, 9);
  assert.equal(adapter.inert_boundary.held_relation, 'discordos.discord_update_drafts');
  assert.equal(adapter.apply_admitted, false);
  assert.equal(gate.app_data_adapters.all_adapters_ready, true);
  assert.equal(gate.app_data_adapters.execution_lifecycle, 'EXECUTION_BLOCKED');
  assert.equal(gate.app_data_adapters.apply_admitted, false);
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
