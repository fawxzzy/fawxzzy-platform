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
  expectedCoverageUnits,
  expectedExecutionGates,
  expectedExternalEffectUnits,
  expectedParityUnits,
  measureRecovery,
  recoveryDocumentPaths,
  sha256Hex,
  validateRecoveryDocuments,
  validateSanitizedReceipt
} from '../scripts/lib/recovery.mjs';

const observedAt = '2026-07-18T17:00:00Z';

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
  assert.deepEqual([...expectedParityUnits].sort(), [...new Set(expectedParityUnits)].sort());
});

test('accepted recovery units cannot retain UNKNOWN evidence', () => {
  const documents = structuredClone(loadDocuments());
  documents[recoveryDocumentPaths.restore].status = 'CURRENT';
  const failures = validateRecoveryDocuments(documents, { now: observedAt }).failures;
  assert.ok(failures.some((failure) => failure.includes('accepted restore cannot contain UNKNOWN parity')));
});

test('fully correlated action-time receipts can pass without weakening the blocked source contract', () => {
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
  backup.manifest_sha256 = backupManifestDigest(backup);

  const effects = documents[recoveryDocumentPaths.effects];
  effects.status = 'CURRENT';
  effects.restore_project_ref = 'abcdefghijklmnopqrst';
  effects.quarantine.network_egress_status = 'CURRENT';
  effects.quarantine.network_egress_denied = true;
  effects.quarantine.data_api_status = 'CURRENT';
  effects.quarantine.data_api_disabled = true;
  for (const effect of effects.effects) {
    effect.status = 'CURRENT';
    effect.disabled = true;
    effect.evidence_digest = 'c'.repeat(64);
  }
  effects.manifest_sha256 = sha256Hex(Object.fromEntries(Object.entries(effects).filter(([key]) => key !== 'manifest_sha256')));

  const restore = documents[recoveryDocumentPaths.restore];
  restore.status = 'CURRENT';
  restore.clone.project_ref = effects.restore_project_ref;
  restore.clone.quarantine_status = 'CURRENT';
  restore.backup_manifest_sha256 = backup.manifest_sha256;
  restore.external_effects_manifest_sha256 = effects.manifest_sha256;
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
  restore.rpo_rto = {
    status: 'CURRENT',
    measured_rpo_seconds: 1800,
    measured_rto_seconds: 1800,
    objective_rpo_seconds: 3600,
    objective_rto_seconds: 3600
  };
  restore.storage = {
    object_count: 0,
    body_recovery_status: 'NOT_APPLICABLE',
    body_recovery_receipt_sha256: null
  };
  restore.observation = { status: 'CURRENT', duration_seconds: 900, failure_count: 0 };
  restore.rollback.status = 'CURRENT';
  restore.receipt_sha256 = sha256Hex(Object.fromEntries(Object.entries(restore).filter(([key]) => key !== 'receipt_sha256')));

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
