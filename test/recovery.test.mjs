import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createValidator,
  loadDocuments,
  validateSchemaInstances
} from '../scripts/lib/contracts.mjs';
import {
  backupManifestDigest,
  canonicalSerialize,
  evaluateFreshness,
  externalEffectsManifestDigest,
  expectedCoverageUnits,
  expectedDiscordEdgeFunctions,
  expectedDiscordQuarantineSteps,
  expectedDiscordRollbackSteps,
  expectedExecutionGates,
  expectedExternalEffectUnits,
  expectedOwnerDecisionFields,
  expectedParityUnits,
  expectedPgNetBehavioralTests,
  measureRecovery,
  recoveryDocumentPaths,
  restoreReceiptDigest,
  sha256Hex,
  validateRecoveryDocuments,
  validateSanitizedReceipt
} from '../scripts/lib/recovery.mjs';

const observedAt = '2026-07-18T17:00:00Z';

function refreshActionDigests(documents) {
  const backup = documents[recoveryDocumentPaths.backup];
  const effects = documents[recoveryDocumentPaths.effects];
  const restore = documents[recoveryDocumentPaths.restore];
  backup.manifest_sha256 = backupManifestDigest(backup);
  effects.manifest_sha256 = externalEffectsManifestDigest(effects);
  restore.backup_manifest_sha256 = backup.manifest_sha256;
  restore.external_effects_manifest_sha256 = effects.manifest_sha256;
  restore.receipt_sha256 = restoreReceiptDigest(restore);
  return documents;
}

function buildActionDocuments() {
  const documents = structuredClone(loadDocuments());
  const backup = documents[recoveryDocumentPaths.backup];
  backup.status = 'CURRENT';
  backup.execution = {
    status: 'CURRENT',
    started_at: '2026-07-18T14:00:00Z',
    completed_at: '2026-07-18T14:10:00Z'
  };
  for (const coverage of backup.coverage) {
    coverage.status = coverage.unit === 'storage_object_bodies' ? 'NOT_APPLICABLE' : 'CURRENT';
    coverage.aggregate_count = coverage.unit === 'storage_object_bodies' ? 0 : 1;
    coverage.private_digest = coverage.unit === 'storage_object_bodies' ? null : 'a'.repeat(64);
  }
  backup.encryption = {
    status: 'CURRENT',
    boundary: 'client_side_streaming_before_destination',
    destination_receives_ciphertext_only: true,
    persistent_plaintext: false,
    algorithm_class: 'reviewed_envelope_cipher',
    key_reference: 'recovery-key-v1',
    key_custody_status: 'CURRENT'
  };
  backup.destination = {
    status: 'CURRENT',
    class: 'versioned_object_storage',
    provider_reference: 'independent-archive',
    object_version: 'version-0001',
    immutability_status: 'CURRENT'
  };
  backup.ciphertext = { bytes: 1, sha256: 'b'.repeat(64) };
  backup.retention = {
    status: 'CURRENT',
    retention_days: 30,
    expires_at: '2026-08-17T14:10:00Z',
    never_delete_before_restore_acceptance: true
  };
  backup.freshness = { status: 'CURRENT', maximum_age_seconds: 10800 };
  backup.storage = {
    object_count: 0,
    body_recovery_status: 'NOT_APPLICABLE',
    body_recovery_receipt_sha256: null
  };

  const effects = documents[recoveryDocumentPaths.effects];
  effects.status = 'CURRENT';
  effects.restore_project_ref = 'abcdefghijklmnopqrst';
  effects.quarantine.network_egress_status = 'CURRENT';
  effects.quarantine.network_egress_denied = true;
  effects.quarantine.data_api_status = 'CURRENT';
  effects.quarantine.data_api_disabled = true;
  const discordos = effects.discordos;
  const rehearsalSnapshotId = 'FP-DOS-REHEARSAL-SNAPSHOT-001';
  const rehearsalObservedAt = '2026-07-18T15:50:00Z';
  const rehearsalInventoryEvidence = sha256Hex({
    restore_project_ref: effects.restore_project_ref,
    snapshot_id: rehearsalSnapshotId,
    source_snapshot_id: discordos.source.snapshot_id
  });
  discordos.status = 'CURRENT';
  discordos.rehearsal = {
    status: 'CURRENT',
    target_project_ref: 'bxtcuhkotumitoqtrcej',
    restore_project_ref: effects.restore_project_ref,
    snapshot_id: rehearsalSnapshotId,
    observed_at: rehearsalObservedAt,
    maximum_age_seconds: 7200,
    inventory_evidence_sha256: rehearsalInventoryEvidence
  };
  discordos.quarantine.status = 'CURRENT';
  discordos.quarantine.sink_mode = 'SYNTHETIC_SINK_ONLY';
  discordos.quarantine.observation = {
    status: 'CURRENT',
    minimum_interval_seconds: 121,
    first_observed_at: '2026-07-18T15:50:00Z',
    second_observed_at: '2026-07-18T15:53:00Z',
    first_evidence_sha256: sha256Hex({ read: 1, snapshot_id: rehearsalSnapshotId }),
    second_evidence_sha256: sha256Hex({ read: 2, snapshot_id: rehearsalSnapshotId }),
    cron_growth: 0,
    queue_growth: 0,
    response_growth: 0,
    sink_effect_count: 0,
    edge_invocation_growth: 0
  };
  discordos.rollback.status = 'CURRENT';
  discordos.pg_net_compatibility.behavioral_status = 'CURRENT';
  discordos.pg_net_compatibility.behavioral_evidence_sha256 = sha256Hex({
    source_version: '0.20.0',
    target_version: '0.20.4',
    test_denominator: expectedPgNetBehavioralTests
  });
  for (const effect of effects.effects) {
    effect.status = 'CURRENT';
    effect.disabled = true;
    const suffix = effect.unit.replaceAll('_', '-').toUpperCase();
    effect.evidence = {
      evidence_id: `FP-DOS-EFFECT-EVIDENCE-${suffix}`,
      unit: effect.unit,
      source_project_ref: 'nwexsktuuenfdegzrbut',
      target_project_ref: 'bxtcuhkotumitoqtrcej',
      restore_project_ref: effects.restore_project_ref,
      snapshot_id: rehearsalSnapshotId,
      observed_at: rehearsalObservedAt,
      maximum_age_seconds: 7200,
      disabled: true,
      coverage_count: 0,
      coverage_sha256: sha256Hex({ coverage_count: 0, snapshot_id: rehearsalSnapshotId, unit: effect.unit }),
      inventory_manifest_sha256: rehearsalInventoryEvidence,
      authenticator_class: 'detached_signed_metadata_receipt',
      verification_status: 'CURRENT',
      verification_receipt_id: `FP-DOS-EFFECT-VERIFY-${suffix}`,
      verification_receipt_sha256: sha256Hex({ receipt_id: `FP-DOS-EFFECT-VERIFY-${suffix}`, unit: effect.unit }),
      verified_at: '2026-07-18T15:51:00Z'
    };
    effect.evidence_digest = sha256Hex(effect.evidence);
  }

  const restore = documents[recoveryDocumentPaths.restore];
  restore.status = 'CURRENT';
  restore.clone.project_ref = effects.restore_project_ref;
  restore.clone.quarantine_status = 'CURRENT';
  for (const parity of restore.parity) {
    parity.status = 'CURRENT';
    parity.expected_count = 1;
    parity.actual_count = 1;
    parity.expected_private_digest = 'd'.repeat(64);
    parity.actual_private_digest = 'd'.repeat(64);
  }
  restore.timeline = {
    recovery_point_at: '2026-07-18T15:00:00Z',
    failure_declared_at: '2026-07-18T15:30:00Z',
    restore_started_at: '2026-07-18T15:35:00Z',
    restore_completed_at: '2026-07-18T16:05:00Z',
    accepted_at: '2026-07-18T16:10:00Z'
  };
  const ownerDecision = {
    decision_id: 'FP-RPO-RTO-DECISION-001',
    accepted_at: '2026-07-18T16:08:00Z',
    objective_rpo_seconds: 3600,
    objective_rto_seconds: 3600
  };
  restore.rpo_rto = {
    status: 'CURRENT',
    measured_rpo_seconds: 1800,
    measured_rto_seconds: 1800,
    objective_rpo_seconds: ownerDecision.objective_rpo_seconds,
    objective_rto_seconds: ownerDecision.objective_rto_seconds,
    owner_decision: {
      ...ownerDecision,
      receipt_sha256: sha256Hex(ownerDecision)
    }
  };
  restore.storage = {
    object_count: 0,
    body_recovery_status: 'NOT_APPLICABLE',
    body_recovery_receipt_sha256: null
  };
  restore.observation = { status: 'CURRENT', duration_seconds: 900, failure_count: 0 };
  restore.rollback.status = 'CURRENT';
  return refreshActionDigests(documents);
}

test('recovery source documents satisfy their schemas and deterministic semantic checks', () => {
  const documents = loadDocuments();
  assert.deepEqual(validateSchemaInstances(documents, createValidator()), []);
  const first = validateRecoveryDocuments(documents, { now: observedAt });
  const second = validateRecoveryDocuments(documents, { now: observedAt });
  assert.deepEqual(first, second);
  assert.deepEqual(first.failures, []);
  assert.equal(first.ok, true);
  assert.equal(canonicalSerialize(first), canonicalSerialize(second));
});

test('canonical serialization and digest ignore object insertion order', () => {
  const left = { z: [3, { b: 2, a: 1 }], a: true };
  const right = { a: true, z: [3, { a: 1, b: 2 }] };
  assert.equal(canonicalSerialize(left), canonicalSerialize(right));
  assert.equal(sha256Hex(left), sha256Hex(right));
  assert.match(sha256Hex(left), /^[0-9a-f]{64}$/);
});

test('backup digest changes on sanitized manifest tampering', () => {
  const documents = loadDocuments();
  const manifest = documents[recoveryDocumentPaths.backup];
  const before = backupManifestDigest(manifest);
  const tampered = structuredClone(manifest);
  tampered.backup_id = 'FP-RECOVERY-BACKUP-EXAMPLE-TAMPERED';
  assert.notEqual(backupManifestDigest(tampered), before);
});

test('closed recovery denominators reject missing and duplicate units', () => {
  const documents = structuredClone(loadDocuments());
  documents[recoveryDocumentPaths.contract].coverage.pop();
  documents[recoveryDocumentPaths.backup].coverage[0].unit = documents[recoveryDocumentPaths.backup].coverage[1].unit;
  documents[recoveryDocumentPaths.effects].effects[0].unit = documents[recoveryDocumentPaths.effects].effects[1].unit;
  documents[recoveryDocumentPaths.restore].parity[0].unit = documents[recoveryDocumentPaths.restore].parity[1].unit;
  const failures = validateRecoveryDocuments(documents, { now: observedAt }).failures;
  assert.ok(failures.some((failure) => failure.includes('recovery coverage denominator changed')));
  assert.ok(failures.some((failure) => failure.includes('backup manifest coverage denominator changed')));
  assert.ok(failures.some((failure) => failure.includes('external-effects denominator changed')));
  assert.ok(failures.some((failure) => failure.includes('restore parity denominator changed')));
  assert.deepEqual([...expectedCoverageUnits].sort(), [...new Set(expectedCoverageUnits)].sort());
  assert.deepEqual([...expectedExternalEffectUnits].sort(), [...new Set(expectedExternalEffectUnits)].sort());
  assert.deepEqual([...expectedExecutionGates].sort(), [...new Set(expectedExecutionGates)].sort());
  assert.deepEqual([...expectedOwnerDecisionFields].sort(), [...new Set(expectedOwnerDecisionFields)].sort());
  assert.deepEqual([...expectedParityUnits].sort(), [...new Set(expectedParityUnits)].sort());
});

test('accepted recovery units cannot retain UNKNOWN evidence', () => {
  const documents = structuredClone(loadDocuments());
  documents[recoveryDocumentPaths.restore].status = 'CURRENT';
  const failures = validateRecoveryDocuments(documents, { now: observedAt }).failures;
  assert.ok(failures.some((failure) => failure.includes('accepted restore cannot contain UNKNOWN parity')));
});

test('fully correlated action-time receipts can pass without weakening the blocked source contract', () => {
  const documents = buildActionDocuments();

  assert.deepEqual(validateSchemaInstances(documents, createValidator()), []);
  const report = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt });
  assert.deepEqual(report.failures, []);
  assert.equal(report.ok, true);
  assert.equal(documents[recoveryDocumentPaths.contract].status, 'BLOCKED');
});

test('non-empty Storage fails closed without a current body-recovery receipt', () => {
  const documents = structuredClone(loadDocuments());
  documents[recoveryDocumentPaths.backup].storage.object_count = 1;
  const failures = validateRecoveryDocuments(documents, { now: observedAt }).failures;
  assert.ok(failures.some((failure) => failure.includes('non-empty Storage requires CURRENT body recovery')));
  assert.ok(failures.some((failure) => failure.includes('non-empty Storage requires an accepted body-recovery receipt digest')));
});

test('external-effects acceptance fails when any effect remains enabled', () => {
  const documents = structuredClone(loadDocuments());
  const manifest = documents[recoveryDocumentPaths.effects];
  manifest.status = 'CURRENT';
  for (const effect of manifest.effects) {
    effect.status = 'CURRENT';
    effect.disabled = true;
  }
  manifest.effects[0].disabled = false;
  const failures = validateRecoveryDocuments(documents, { now: observedAt }).failures;
  assert.ok(failures.some((failure) => failure.includes('every external effect disabled')));
});

test('external-effects action acceptance requires canonical distinct per-unit evidence digests', () => {
  const scenarios = [
    {
      name: 'null',
      mutate: (manifest) => { manifest.effects[0].evidence_digest = null; },
      expected: 'canonical evidence digest for every external effect'
    },
    {
      name: 'malformed',
      mutate: (manifest) => { manifest.effects[0].evidence_digest = 'A'.repeat(64); },
      expected: 'canonical evidence digest for every external effect'
    },
    {
      name: 'duplicate',
      mutate: (manifest) => { manifest.effects[1].evidence_digest = manifest.effects[0].evidence_digest; },
      expected: 'distinct evidence digest for every external effect'
    },
    {
      name: 'missing',
      mutate: (manifest) => { delete manifest.effects[0].evidence_digest; },
      expected: 'canonical evidence digest for every external effect',
      schemaFailure: true
    }
  ];

  for (const scenario of scenarios) {
    const documents = buildActionDocuments();
    scenario.mutate(documents[recoveryDocumentPaths.effects]);
    refreshActionDigests(documents);
    const failures = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt }).failures;
    assert.ok(failures.some((failure) => failure.includes(scenario.expected)), scenario.name);
    if (scenario.schemaFailure) assert.notDeepEqual(validateSchemaInstances(documents, createValidator()), [], scenario.name);
  }
});

test('DiscordOS inventory freezes the exact Edge Cron helper extension and aggregate denominator', () => {
  assert.equal(expectedDiscordEdgeFunctions.length, 6);
  assert.equal(new Set(expectedDiscordEdgeFunctions.map((entry) => entry.slug)).size, 6);
  assert.equal(expectedDiscordQuarantineSteps.length, 9);
  assert.equal(expectedDiscordRollbackSteps.length, 7);
  assert.equal(expectedPgNetBehavioralTests.length, 9);

  const scenarios = [
    {
      name: 'missing Edge identity',
      mutate: (discordos) => { discordos.inventory.edge_functions.pop(); },
      expected: 'six-function source/deployment identity denominator changed'
    },
    {
      name: 'duplicate Edge identity',
      mutate: (discordos) => { discordos.inventory.edge_functions[0] = structuredClone(discordos.inventory.edge_functions[1]); },
      expected: 'six-function source/deployment identity denominator changed'
    },
    {
      name: 'provider bundle digest drift',
      mutate: (discordos) => { discordos.inventory.edge_functions[0].provider_bundle_sha256 = 'f'.repeat(64); },
      expected: 'six-function source/deployment identity denominator changed'
    },
    {
      name: 'Cron schedule drift',
      mutate: (discordos) => { discordos.inventory.cron.schedule = '*/2 * * * *'; },
      expected: 'Cron source snapshot changed'
    },
    {
      name: 'helper search path drift',
      mutate: (discordos) => { discordos.inventory.helper.search_path = 'pg_catalog'; },
      expected: 'network helper source snapshot changed'
    },
    {
      name: 'extension version drift',
      mutate: (discordos) => { discordos.inventory.extensions[1].target_available_version = '0.20.5'; },
      expected: 'extension source/target denominator changed'
    },
    {
      name: 'aggregate drift',
      mutate: (discordos) => { discordos.inventory.aggregates.webhook_count = 1; },
      expected: 'aggregate external-effect denominator changed'
    },
    {
      name: 'source receipt drift',
      mutate: (discordos) => { discordos.source.evidence_receipt_sha256 = 'f'.repeat(64); },
      expected: 'source evidence receipt digest changed'
    }
  ];

  for (const scenario of scenarios) {
    const documents = buildActionDocuments();
    scenario.mutate(documents[recoveryDocumentPaths.effects].discordos);
    refreshActionDigests(documents);
    const report = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt });
    assert.ok(report.failures.some((failure) => failure.includes(scenario.expected)), scenario.name);
  }
});

test('DiscordOS action evidence rejects digest-only self-reported circular stale mismatched and unsafe proof', () => {
  const scenarios = [
    {
      name: 'digest-only evidence',
      mutate: (effect) => { effect.evidence = null; },
      expected: 'structured evidence; digest-only proof is forbidden'
    },
    {
      name: 'generic self report',
      mutate: (effect) => { effect.evidence.authenticator_class = 'self_report'; },
      expected: 'evidence authenticator is unsupported'
    },
    {
      name: 'source-receipt circular digest',
      mutate: (effect, manifest) => { effect.evidence.verification_receipt_sha256 = manifest.discordos.source.evidence_receipt_sha256; },
      expected: 'cannot reuse a manifest, inventory, compatibility, observation, or source-receipt digest'
    },
    {
      name: 'missing verification identity',
      mutate: (effect) => { delete effect.evidence.verification_receipt_id; },
      expected: 'evidence identities are missing'
    },
    {
      name: 'malformed verification digest',
      mutate: (effect) => { effect.evidence.verification_receipt_sha256 = 'A'.repeat(64); },
      expected: 'verification receipt digest is malformed'
    },
    {
      name: 'stale observation',
      mutate: (effect) => { effect.evidence.observed_at = '2026-07-18T14:00:00Z'; effect.evidence.verified_at = '2026-07-18T14:01:00Z'; },
      expected: 'evidence freshness failed'
    },
    {
      name: 'future observation',
      mutate: (effect) => { effect.evidence.observed_at = '2026-07-18T17:00:01Z'; effect.evidence.verified_at = '2026-07-18T17:00:02Z'; },
      expected: 'evidence freshness failed'
    },
    {
      name: 'source project mismatch',
      mutate: (effect) => { effect.evidence.source_project_ref = 'abcdefghijklmnopqrst'; },
      expected: 'evidence project mismatch'
    },
    {
      name: 'snapshot mismatch',
      mutate: (effect) => { effect.evidence.snapshot_id = 'FP-DOS-REHEARSAL-SNAPSHOT-OTHER'; },
      expected: 'evidence snapshot mismatch'
    },
    {
      name: 'positive enabled denominator',
      mutate: (effect) => { effect.evidence.coverage_count = 1; },
      expected: 'must prove an exact zero enabled denominator'
    },
    {
      name: 'missing coverage digest',
      mutate: (effect) => { delete effect.evidence.coverage_sha256; },
      expected: 'coverage digest is malformed'
    },
    {
      name: 'raw body field',
      mutate: (effect) => { effect.evidence.raw_body = 'opaque'; },
      expected: 'forbidden value-bearing field'
    },
    {
      name: 'secret field',
      mutate: (effect) => { effect.evidence.secret = 'opaque'; },
      expected: 'forbidden value-bearing field'
    }
  ];

  for (const scenario of scenarios) {
    const documents = buildActionDocuments();
    const manifest = documents[recoveryDocumentPaths.effects];
    const effect = manifest.effects[0];
    scenario.mutate(effect, manifest);
    if (effect.evidence !== null) effect.evidence_digest = sha256Hex(effect.evidence);
    refreshActionDigests(documents);
    const first = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt });
    const second = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt });
    assert.deepEqual(first, second, scenario.name);
    assert.ok(first.failures.some((failure) => failure.includes(scenario.expected)), scenario.name);
  }

  const duplicate = buildActionDocuments();
  const manifest = duplicate[recoveryDocumentPaths.effects];
  manifest.effects[1].evidence.evidence_id = manifest.effects[0].evidence.evidence_id;
  manifest.effects[1].evidence.verification_receipt_id = manifest.effects[0].evidence.verification_receipt_id;
  manifest.effects[1].evidence.coverage_sha256 = manifest.effects[0].evidence.coverage_sha256;
  manifest.effects[1].evidence.verification_receipt_sha256 = manifest.effects[0].evidence.verification_receipt_sha256;
  manifest.effects[1].evidence_digest = sha256Hex(manifest.effects[1].evidence);
  refreshActionDigests(duplicate);
  const duplicateFailures = validateRecoveryDocuments(duplicate, { mode: 'action', now: observedAt }).failures;
  assert.ok(duplicateFailures.some((failure) => failure.includes('evidence identities must be unique')));
  assert.ok(duplicateFailures.some((failure) => failure.includes('verification receipt identities must be unique')));
  assert.ok(duplicateFailures.some((failure) => failure.includes('coverage digests must be unique')));
});

test('DiscordOS quarantine replay rollback observation and pg_net behavior gates remain fail closed', () => {
  const scenarios = [
    {
      name: 'quarantine order',
      mutate: (discordos) => { [discordos.quarantine.steps[0], discordos.quarantine.steps[1]] = [discordos.quarantine.steps[1], discordos.quarantine.steps[0]]; },
      expected: 'fail-closed quarantine order changed'
    },
    {
      name: 'rollback order',
      mutate: (discordos) => { [discordos.rollback.steps[0], discordos.rollback.steps[1]] = [discordos.rollback.steps[1], discordos.rollback.steps[0]]; },
      expected: 'rollback order changed'
    },
    {
      name: 'unknown sink',
      mutate: (discordos) => { discordos.quarantine.sink_mode = 'UNKNOWN'; },
      expected: 'requires denied or sink-only egress'
    },
    {
      name: 'short observation interval',
      mutate: (discordos) => { discordos.quarantine.observation.second_observed_at = '2026-07-18T15:51:00Z'; },
      expected: 'observation interval is too short'
    },
    {
      name: 'queue growth',
      mutate: (discordos) => { discordos.quarantine.observation.queue_growth = 1; },
      expected: 'requires zero external-effect growth'
    },
    {
      name: 'reused observation digest',
      mutate: (discordos) => { discordos.quarantine.observation.second_evidence_sha256 = discordos.quarantine.observation.first_evidence_sha256; },
      expected: 'requires independent evidence digests'
    },
    {
      name: 'behavioral replay blocked',
      mutate: (discordos) => { discordos.pg_net_compatibility.behavioral_status = 'BLOCKED'; discordos.pg_net_compatibility.behavioral_evidence_sha256 = null; },
      expected: 'requires pg_net behavioral evidence'
    },
    {
      name: 'behavioral denominator missing',
      mutate: (discordos) => { discordos.pg_net_compatibility.tests.pop(); },
      expected: 'pg_net behavioral acceptance denominator changed'
    },
    {
      name: 'static compatibility drift',
      mutate: (discordos) => { discordos.pg_net_compatibility.sql_upgrade_changes = 1; },
      expected: 'static compatibility contract changed'
    },
    {
      name: 'apply admission widened',
      mutate: (discordos) => { discordos.quarantine.apply_admitted = true; },
      expected: 'held execution boundary changed'
    }
  ];

  for (const scenario of scenarios) {
    const documents = buildActionDocuments();
    scenario.mutate(documents[recoveryDocumentPaths.effects].discordos);
    refreshActionDigests(documents);
    const report = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt });
    assert.ok(report.failures.some((failure) => failure.includes(scenario.expected)), scenario.name);
  }

  const withoutClock = buildActionDocuments();
  const report = validateRecoveryDocuments(withoutClock, { mode: 'action' });
  assert.ok(report.failures.some((failure) => failure.includes('requires an injected validation clock')));
});

test('CURRENT retention covers completion rehearsal acceptance and the injected validation clock', () => {
  const equality = buildActionDocuments();
  equality[recoveryDocumentPaths.backup].retention.expires_at = '2026-07-18T16:10:00Z';
  refreshActionDigests(equality);
  assert.deepEqual(validateRecoveryDocuments(equality, { mode: 'action', now: '2026-07-18T16:10:00Z' }).failures, []);

  const beforeCompletion = buildActionDocuments();
  beforeCompletion[recoveryDocumentPaths.backup].retention.expires_at = '2026-07-18T14:09:59Z';
  refreshActionDigests(beforeCompletion);
  assert.ok(validateRecoveryDocuments(beforeCompletion, { mode: 'action', now: observedAt }).failures.some((failure) => failure.includes('cannot precede backup completion')));

  const beforeAcceptance = buildActionDocuments();
  beforeAcceptance[recoveryDocumentPaths.backup].retention.expires_at = '2026-07-18T16:09:59Z';
  refreshActionDigests(beforeAcceptance);
  assert.ok(validateRecoveryDocuments(beforeAcceptance, { mode: 'action', now: observedAt }).failures.some((failure) => failure.includes('cannot precede restore acceptance')));

  const beforeValidation = buildActionDocuments();
  beforeValidation[recoveryDocumentPaths.backup].retention.expires_at = '2026-07-18T16:59:59Z';
  refreshActionDigests(beforeValidation);
  assert.ok(validateRecoveryDocuments(beforeValidation, { mode: 'action', now: observedAt }).failures.some((failure) => failure.includes('cannot precede validation time')));

  const withoutClock = buildActionDocuments();
  assert.ok(validateRecoveryDocuments(withoutClock, { mode: 'action' }).failures.some((failure) => failure.includes('requires an injected validation clock')));
});

test('CURRENT RPO and RTO objectives require an exact sanitized owner-decision reference', () => {
  const missingReference = buildActionDocuments();
  missingReference[recoveryDocumentPaths.restore].rpo_rto.owner_decision = null;
  refreshActionDigests(missingReference);
  assert.ok(validateRecoveryDocuments(missingReference, { mode: 'action', now: observedAt }).failures.some((failure) => failure.includes('owner-decision receipt reference')));

  const missingField = buildActionDocuments();
  delete missingField[recoveryDocumentPaths.restore].rpo_rto.owner_decision.accepted_at;
  refreshActionDigests(missingField);
  assert.notDeepEqual(validateSchemaInstances(missingField, createValidator()), []);
  assert.ok(validateRecoveryDocuments(missingField, { mode: 'action', now: observedAt }).failures.some((failure) => failure.includes('acceptance timestamp')));

  const malformedIdentity = buildActionDocuments();
  malformedIdentity[recoveryDocumentPaths.restore].rpo_rto.owner_decision.decision_id = 'owner decision';
  malformedIdentity[recoveryDocumentPaths.restore].rpo_rto.owner_decision.receipt_sha256 = 'A'.repeat(64);
  refreshActionDigests(malformedIdentity);
  const malformedFailures = validateRecoveryDocuments(malformedIdentity, { mode: 'action', now: observedAt }).failures;
  assert.ok(malformedFailures.some((failure) => failure.includes('canonical stable owner-decision ID')));
  assert.ok(malformedFailures.some((failure) => failure.includes('canonical owner-decision receipt digest')));

  const beforeMeasurement = buildActionDocuments();
  beforeMeasurement[recoveryDocumentPaths.restore].rpo_rto.owner_decision.accepted_at = '2026-07-18T16:04:59Z';
  refreshActionDigests(beforeMeasurement);
  assert.ok(validateRecoveryDocuments(beforeMeasurement, { mode: 'action', now: observedAt }).failures.some((failure) => failure.includes('cannot precede restore completion')));

  const afterAcceptance = buildActionDocuments();
  afterAcceptance[recoveryDocumentPaths.restore].rpo_rto.owner_decision.accepted_at = '2026-07-18T16:10:01Z';
  refreshActionDigests(afterAcceptance);
  assert.ok(validateRecoveryDocuments(afterAcceptance, { mode: 'action', now: observedAt }).failures.some((failure) => failure.includes('cannot follow restore acceptance')));

  const substitutedObjective = buildActionDocuments();
  substitutedObjective[recoveryDocumentPaths.restore].rpo_rto.objective_rpo_seconds = 7200;
  refreshActionDigests(substitutedObjective);
  assert.ok(validateRecoveryDocuments(substitutedObjective, { mode: 'action', now: observedAt }).failures.some((failure) => failure.includes('must exactly match the owner-decision receipt reference')));
});

test('BLOCKED restore cannot bypass CURRENT or numerical RPO RTO owner-decision correlation', () => {
  const scenarios = [
    {
      name: 'CURRENT status without owner decision',
      mutate: (rpoRto) => { rpoRto.owner_decision = null; },
      expected: 'require a canonical owner-decision receipt reference'
    },
    {
      name: 'numerical objectives without CURRENT status',
      mutate: (rpoRto) => {
        rpoRto.status = 'BLOCKED';
        rpoRto.measured_rpo_seconds = null;
        rpoRto.measured_rto_seconds = null;
        rpoRto.owner_decision = null;
      },
      expected: 'require a canonical owner-decision receipt reference'
    },
    {
      name: 'malformed decision digest',
      mutate: (rpoRto) => { rpoRto.owner_decision.receipt_sha256 = 'A'.repeat(64); },
      expected: 'require a canonical owner-decision receipt digest'
    },
    {
      name: 'substituted decision objective',
      mutate: (rpoRto) => { rpoRto.owner_decision.objective_rpo_seconds = 7200; },
      expected: 'must exactly match the owner-decision receipt reference'
    },
    {
      name: 'decision after rehearsal acceptance',
      mutate: (rpoRto) => { rpoRto.owner_decision.accepted_at = '2026-07-18T16:10:01Z'; },
      expected: 'cannot follow restore acceptance'
    }
  ];

  for (const scenario of scenarios) {
    const documents = buildActionDocuments();
    const restore = documents[recoveryDocumentPaths.restore];
    restore.status = 'BLOCKED';
    scenario.mutate(restore.rpo_rto);
    refreshActionDigests(documents);
    const first = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt });
    const second = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt });
    assert.deepEqual(first, second, scenario.name);
    assert.ok(first.failures.some((failure) => failure.includes(scenario.expected)), scenario.name);
  }
});

test('freshness uses an explicit clock and classifies current stale future and unknown', () => {
  assert.deepEqual(evaluateFreshness({
    completedAt: '2026-07-18T16:30:00Z',
    maxAgeSeconds: 3600,
    now: observedAt
  }), {
    status: 'CURRENT',
    age_seconds: 1800,
    reason: 'backup is within the admitted freshness threshold'
  });
  assert.equal(evaluateFreshness({
    completedAt: '2026-07-18T15:00:00Z',
    maxAgeSeconds: 3600,
    now: observedAt
  }).status, 'BLOCKED');
  assert.equal(evaluateFreshness({
    completedAt: '2026-07-18T17:00:01Z',
    maxAgeSeconds: 3600,
    now: observedAt
  }).reason, 'completion time is in the future');
  assert.equal(evaluateFreshness({
    completedAt: null,
    maxAgeSeconds: null,
    now: observedAt
  }).status, 'UNKNOWN');
});

test('RPO and RTO measurements require a complete monotonic timeline', () => {
  assert.deepEqual(measureRecovery({
    recoveryPointAt: '2026-07-18T15:00:00Z',
    failureDeclaredAt: '2026-07-18T15:30:00Z',
    restoreStartedAt: '2026-07-18T15:35:00Z',
    restoreCompletedAt: '2026-07-18T16:05:00Z'
  }), {
    measured_rpo_seconds: 1800,
    measured_rto_seconds: 1800
  });
  assert.throws(() => measureRecovery({
    recoveryPointAt: '2026-07-18T15:31:00Z',
    failureDeclaredAt: '2026-07-18T15:30:00Z',
    restoreStartedAt: '2026-07-18T15:35:00Z',
    restoreCompletedAt: '2026-07-18T16:05:00Z'
  }), /recovery point cannot follow failure declaration/);
  assert.throws(() => measureRecovery({
    recoveryPointAt: '2026-07-18T15:00:00Z',
    failureDeclaredAt: '2026-07-18T15:30:00Z',
    restoreStartedAt: '2026-07-18T16:05:00Z',
    restoreCompletedAt: '2026-07-18T15:35:00Z'
  }), /restore completion cannot precede restore start/);
});

test('numerical RPO or RTO claims without a measured timeline fail closed', () => {
  const documents = structuredClone(loadDocuments());
  documents[recoveryDocumentPaths.restore].rpo_rto.measured_rpo_seconds = 1;
  const failures = validateRecoveryDocuments(documents, { now: observedAt }).failures;
  assert.ok(failures.some((failure) => failure.includes('measurements require CURRENT status')));
  assert.ok(failures.some((failure) => failure.includes('measurements require a complete timeline')));
});

test('sanitized receipt validation rejects secrets PII raw SQL provider URLs and machine paths', () => {
  const unsafe = {
    email: 'operator@example.test',
    provider_url: 'https://example.test/project',
    raw_sql: 'select value from private_table',
    machine_path: ['C:', 'Users', 'operator', 'export'].join('\\'),
    user_identifier: '00000000-0000-4000-8000-000000000001',
    token: `eyJ${'a'.repeat(24)}.${'b'.repeat(24)}.${'c'.repeat(12)}`
  };
  const failures = validateSanitizedReceipt(unsafe);
  assert.ok(failures.some((failure) => failure.includes('forbidden value-bearing field')));
  assert.ok(failures.some((failure) => failure.includes('email or identity value is forbidden')));
  assert.ok(failures.some((failure) => failure.includes('provider or connection URL is forbidden')));
  assert.ok(failures.some((failure) => failure.includes('raw SQL is forbidden')));
  assert.ok(failures.some((failure) => failure.includes('machine path is forbidden')));
  assert.ok(failures.some((failure) => failure.includes('opaque UUID value is forbidden')));
  assert.ok(failures.some((failure) => failure.includes('credential-shaped value is forbidden')));
});

test('migration and cutover gates bind backup restore retention and RPO RTO receipts', () => {
  const documents = loadDocuments();
  const migration = documents['contracts/v1/gates/migration-gate-state.json'];
  const cutover = documents['contracts/v1/gates/cutover-retirement-gate-state.json'];
  const migrationNames = migration.required_evidence.map((entry) => entry.name);
  assert.ok(migrationNames.includes('current encrypted independent backup manifest and retention receipt'));
  assert.ok(migrationNames.includes('quarantined restore-to-new-project rehearsal receipt'));
  assert.ok(migrationNames.includes('accepted measured RPO and RTO'));
  assert.ok(migrationNames.includes('Storage object-body recovery receipt when nonempty'));
  assert.ok(cutover.cutover_gates.some((gate) => gate.name.includes('encrypted independent backup')));
  assert.ok(cutover.cutover_gates.some((gate) => gate.name.includes('restore-to-new-project')));
  assert.ok(cutover.retirement_gates.some((gate) => gate.name.includes('Storage body recovery')));
  assert.ok([...migration.operation_gates, ...cutover.operation_gates].every((gate) => gate.status === 'BLOCKED'));
});
