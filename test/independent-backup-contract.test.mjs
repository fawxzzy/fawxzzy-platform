import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDocuments } from '../scripts/lib/contracts.mjs';
import {
  canonicalSerialize,
  coverageUnits,
  externalEffectUnits,
  independentBackupContractPath,
  independentBackupManifestDigest,
  sha256Hex,
  validateIndependentBackupContract,
  validateIndependentBackupReceipt
} from '../scripts/lib/independent-backup-contract.mjs';

const now = '2026-07-18T18:00:00Z';
const digest = (label) => sha256Hex({ label });

function contract() {
  return structuredClone(loadDocuments()[independentBackupContractPath]);
}

function buildAcceptedExportsManifest(receipt, { first = false } = {}) {
  const current = {
    completed_at: receipt.completed_at,
    destination_version: receipt.destination_version,
    ciphertext_sha256: receipt.ciphertext_sha256
  };
  return {
    version: '1.0.0',
    status: 'CURRENT',
    month_utc: receipt.completed_at.slice(0, 7),
    observed_at: '2026-07-18T17:45:00Z',
    source_evidence_sha256: digest('accepted-exports-readback'),
    entries: first ? [current] : [
      {
        completed_at: '2026-07-18T11:40:00Z',
        destination_version: 'backup-version-0000',
        ciphertext_sha256: digest('prior-ciphertext')
      },
      current
    ]
  };
}

function buildReceipt({ restore = false } = {}) {
  const receipt = {
    lifecycle_state: restore ? 'RESTORE_REHEARSED' : 'BACKUP_CURRENT',
    project: { name: 'Fawxzzy shared Supabase project', ref: 'bxtcuhkotumitoqtrcej' },
    source_commit: 'a'.repeat(40),
    postgres_version: '17.6.1.147',
    tool_versions: { age: '1.2.1', supabase_cli: '2.45.5' },
    snapshot_at: '2026-07-18T17:30:00Z',
    completed_at: '2026-07-18T17:40:00Z',
    retention_until: '2026-08-22T17:40:00Z',
    monthly_selection: {
      status: 'CURRENT',
      month_utc: '2026-07',
      accepted_exports_manifest_sha256: null
    },
    plaintext_sha256: digest('plaintext'),
    ciphertext_sha256: digest('ciphertext'),
    migration_ledger_sha256: digest('migration-ledger'),
    manifest_sha256: null,
    ciphertext_bytes: 2048,
    destination_version: 'backup-version-0001',
    encryption: {
      status: 'CURRENT',
      tool_class: 'age',
      streaming_before_upload: true,
      persistent_plaintext: false,
      automation_material: 'public_recipients_only'
    },
    key_recipient_ids: ['age-recipient-primary', 'age-recipient-offsite'],
    object_lock: { status: 'CURRENT', mode: 'COMPLIANCE' },
    freshness: { status: 'CURRENT', maximum_age_seconds: 28800 },
    coverage: coverageUnits.map((unit) => ({
      unit,
      status: unit === 'storage_object_bodies' ? 'NOT_APPLICABLE' : 'CURRENT',
      aggregate_count: unit === 'storage_object_bodies' ? 0 : 1,
      private_digest: unit === 'storage_object_bodies' ? null : digest(`coverage-${unit}`),
      body_recovery_receipt_status: unit === 'storage_object_bodies' ? 'NOT_APPLICABLE' : null,
      body_recovery_receipt_sha256: null
    })),
    aggregate_counts: { catalog_objects: 1, data_rows: 0, identities: 0 },
    owner_decision: {
      decision_id: 'FP-MAN-015',
      receipt_sha256: digest('FP-MAN-015'),
      accepted_at: '2026-07-18T16:00:00Z'
    },
    watchdog: { status: 'CURRENT', independent_from_scheduler: true, evidence_sha256: digest('watchdog') },
    provider_physical_backup: { status: 'CURRENT', retention_days: 7, evidence_sha256: digest('physical-backup') },
    cost: {
      budget_stop_control_status: 'CURRENT',
      projected_usd_monthly: 0,
      monthly_report_status: 'CURRENT',
      reported_units: ['backup_freshness', 'projected_cost', 'runner_usage', 'storage_growth']
    },
    production_service_rto: { status: 'UNKNOWN', seconds: null },
    restore: null
  };
  if (restore) {
    receipt.restore = {
      status: 'CURRENT',
      traffic_released: false,
      synthetic_canary_status: 'CURRENT',
      external_effects: externalEffectUnits.map((unit) => ({
        unit,
        status: 'CURRENT',
        disabled: true,
        evidence_sha256: digest(`effect-${unit}`)
      })),
      parity: ['auth', 'catalog', 'data', 'security'].map((unit) => ({
        unit,
        status: 'CURRENT',
        aggregate_count: 0,
        private_digest: digest(`parity-${unit}`)
      })),
      failure_declared_at: '2026-07-18T17:50:00Z',
      restore_started_at: '2026-07-18T17:51:00Z',
      data_plane_ready_at: '2026-07-18T17:59:00Z',
      measured_rpo_seconds: 1200,
      measured_data_plane_rto_seconds: 540,
      failed_clone_deletion_authority_status: 'BLOCKED'
    };
  }
  receipt.monthly_selection.accepted_exports_manifest_sha256 = sha256Hex(buildAcceptedExportsManifest(receipt));
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  return receipt;
}

function validate(receipt, validationNow = now, acceptedExportsManifest = buildAcceptedExportsManifest(receipt)) {
  return validateIndependentBackupReceipt(contract(), receipt, { now: validationNow, acceptedExportsManifest });
}

test('source contract is closed, sanitized, and execution-blocked', () => {
  assert.deepEqual(validateIndependentBackupContract(contract()), { ok: true, failures: [] });
});

test('canonical serialization and digest are byte-identical', () => {
  const receipt = buildReceipt();
  assert.equal(canonicalSerialize(receipt), canonicalSerialize(structuredClone(receipt)));
  assert.equal(independentBackupManifestDigest(receipt), independentBackupManifestDigest(structuredClone(receipt)));
});

test('complete current backup receipt validates', () => {
  assert.deepEqual(validate(buildReceipt()), { ok: true, failures: [] });
});

test('complete quarantined restore rehearsal validates', () => {
  assert.deepEqual(validate(buildReceipt({ restore: true })), { ok: true, failures: [] });
});

test('stale and future-dated evidence fail closed', () => {
  const stale = validate(buildReceipt(), '2026-07-19T02:00:01Z');
  assert(stale.failures.includes('backup recovery point is stale'));
  const staleRecoveryPoint = buildReceipt();
  staleRecoveryPoint.snapshot_at = '2026-07-18T09:59:59Z';
  staleRecoveryPoint.completed_at = '2026-07-18T17:59:00Z';
  staleRecoveryPoint.monthly_selection.accepted_exports_manifest_sha256 = sha256Hex(buildAcceptedExportsManifest(staleRecoveryPoint));
  staleRecoveryPoint.manifest_sha256 = independentBackupManifestDigest(staleRecoveryPoint);
  assert(validate(staleRecoveryPoint).failures.includes('backup recovery point is stale'));
  const future = buildReceipt();
  future.completed_at = '2026-07-18T18:00:01Z';
  future.manifest_sha256 = independentBackupManifestDigest(future);
  assert(validate(future).failures.includes('backup completion cannot be future-dated'));
});

test('calendar-invalid timestamps fail closed instead of normalizing', () => {
  const receipt = buildReceipt();
  receipt.snapshot_at = '2026-02-30T17:30:00Z';
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  assert(validate(receipt).failures.includes('snapshot_at: invalid UTC timestamp'));
});

test('receipt and every nested evidence object are closed-world', () => {
  const root = buildReceipt();
  root.unclassified_evidence = { account: 'opaque-record' };
  root.manifest_sha256 = independentBackupManifestDigest(root);
  assert(root.unclassified_evidence);
  assert(validate(root).failures.some((failure) => failure.includes('receipt schema /: must NOT have additional properties')));

  const nested = buildReceipt();
  nested.encryption.unclassified_evidence = { account: 'opaque-record' };
  nested.manifest_sha256 = independentBackupManifestDigest(nested);
  assert(validate(nested).failures.some((failure) => failure.includes('receipt schema /encryption: must NOT have additional properties')));
});

test('missing streaming encryption evidence fails closed', () => {
  const receipt = buildReceipt();
  receipt.encryption.streaming_before_upload = false;
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  assert(validate(receipt).failures.includes('streaming encryption evidence is incomplete'));
});

test('non-compliance Object Lock fails closed', () => {
  const receipt = buildReceipt();
  receipt.object_lock.mode = 'GOVERNANCE';
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  assert(validate(receipt).failures.includes('Object Lock compliance evidence is required'));
});

test('retention and independently evidenced monthly classification fail closed', () => {
  const receipt = buildReceipt();
  receipt.retention_until = '2026-08-22T17:39:59Z';
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  assert(validate(receipt).failures.includes('retention does not cover the 35-day standard'));
  const monthly = buildReceipt();
  const firstAcceptedManifest = buildAcceptedExportsManifest(monthly, { first: true });
  monthly.monthly_selection.accepted_exports_manifest_sha256 = sha256Hex(firstAcceptedManifest);
  monthly.manifest_sha256 = independentBackupManifestDigest(monthly);
  assert(validate(monthly, now, firstAcceptedManifest).failures.includes('first accepted monthly export retention does not cover 400 days'));

  const wrongMonth = buildReceipt();
  wrongMonth.monthly_selection.month_utc = '2026-06';
  wrongMonth.manifest_sha256 = independentBackupManifestDigest(wrongMonth);
  assert(validate(wrongMonth).failures.includes('monthly selection must correlate to the backup completion month'));

  const missingEvidence = buildReceipt();
  missingEvidence.monthly_selection.accepted_exports_manifest_sha256 = null;
  missingEvidence.manifest_sha256 = independentBackupManifestDigest(missingEvidence);
  assert(validate(missingEvidence).failures.includes('monthly selection requires an independently verifiable accepted-exports manifest'));

  const missingManifest = buildReceipt();
  assert(validateIndependentBackupReceipt(contract(), missingManifest, { now }).failures.some((failure) => failure.startsWith('accepted exports manifest schema')));

  const malformedManifest = { entries: [null] };
  assert.doesNotThrow(() => validate(missingManifest, now, malformedManifest));
  assert(validate(missingManifest, now, malformedManifest).failures.some((failure) => failure.startsWith('accepted exports manifest schema')));

  const tamperedManifest = buildAcceptedExportsManifest(buildReceipt());
  tamperedManifest.entries.shift();
  const tamperedReceipt = buildReceipt();
  assert(validate(tamperedReceipt, now, tamperedManifest).failures.includes('monthly selection manifest digest mismatch'));

  const duplicateIdentity = buildReceipt();
  const duplicateManifest = buildAcceptedExportsManifest(duplicateIdentity);
  duplicateManifest.entries[0].destination_version = duplicateManifest.entries[1].destination_version;
  duplicateIdentity.monthly_selection.accepted_exports_manifest_sha256 = sha256Hex(duplicateManifest);
  duplicateIdentity.manifest_sha256 = independentBackupManifestDigest(duplicateIdentity);
  assert(validate(duplicateIdentity, now, duplicateManifest).failures.includes('accepted exports manifest entries must have distinct immutable identities'));
});

test('missing or over-ceiling cost controls fail closed', () => {
  const unavailable = buildReceipt();
  unavailable.cost.budget_stop_control_status = 'UNKNOWN';
  unavailable.manifest_sha256 = independentBackupManifestDigest(unavailable);
  assert(validate(unavailable).failures.includes('provider budget stop control is unavailable or unproved'));
  const expensive = buildReceipt();
  expensive.cost.projected_usd_monthly = 15.01;
  expensive.manifest_sha256 = independentBackupManifestDigest(expensive);
  assert(validate(expensive).failures.includes('projected monthly cost exceeds the manual-approval ceiling'));
});

test('missing owner-decision correlation fails closed', () => {
  const receipt = buildReceipt();
  receipt.owner_decision = null;
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  assert(validate(receipt).failures.includes('owner decision ID mismatch'));
});

test('incomplete export coverage fails closed', () => {
  const receipt = buildReceipt();
  receipt.coverage.pop();
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  assert(validate(receipt).failures.includes('receipt coverage denominator changed'));
});

test('missing provider Physical backup complement fails closed', () => {
  const receipt = buildReceipt();
  receipt.provider_physical_backup.status = 'UNKNOWN';
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  assert(validate(receipt).failures.includes('provider Physical backup complement is unproved'));
});

test('non-empty Storage bodies require a separate current receipt', () => {
  const receipt = buildReceipt();
  const storage = receipt.coverage.find((entry) => entry.unit === 'storage_object_bodies');
  storage.status = 'CURRENT';
  storage.aggregate_count = 1;
  storage.private_digest = digest('storage-bodies');
  storage.body_recovery_receipt_status = 'BLOCKED';
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  assert(validate(receipt).failures.includes('non-empty Storage bodies require a separate current recovery receipt'));
});

test('production-service RTO claims fail before measurement', () => {
  const receipt = buildReceipt({ restore: true });
  receipt.production_service_rto = { status: 'CURRENT', seconds: 3600 };
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  assert(validate(receipt).failures.includes('production-service RTO cannot be claimed before measurement'));
});

test('restore external-effect evidence must be complete and distinct', () => {
  const receipt = buildReceipt({ restore: true });
  receipt.restore.external_effects[0].evidence_sha256 = receipt.restore.external_effects[1].evidence_sha256;
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  assert(validate(receipt).failures.includes('restore external-effect evidence digests must be distinct'));
});

test('restore objective overruns and deletion overreach fail closed', () => {
  const receipt = buildReceipt({ restore: true });
  receipt.restore.measured_rpo_seconds = 28801;
  receipt.restore.measured_data_plane_rto_seconds = 43201;
  receipt.restore.failed_clone_deletion_authority_status = 'CURRENT';
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  const result = validate(receipt);
  assert(result.failures.includes('restore rehearsal has an invalid, uncorrelated, or over-objective RPO measurement'));
  assert(result.failures.includes('restore rehearsal has an invalid, uncorrelated, or over-objective quarantined data-plane RTO measurement'));
  assert(result.failures.includes('failed clone deletion requires separate authority'));
});

test('negative measured restore durations fail closed', () => {
  const receipt = buildReceipt({ restore: true });
  receipt.restore.measured_rpo_seconds = -1;
  receipt.restore.measured_data_plane_rto_seconds = -1;
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  const result = validate(receipt);
  assert(result.failures.includes('restore rehearsal has an invalid, uncorrelated, or over-objective RPO measurement'));
  assert(result.failures.includes('restore rehearsal has an invalid, uncorrelated, or over-objective quarantined data-plane RTO measurement'));
});

test('restore objectives are derived from a strict rehearsal timeline', () => {
  const forged = buildReceipt({ restore: true });
  forged.restore.measured_rpo_seconds = 0;
  forged.restore.measured_data_plane_rto_seconds = 0;
  forged.manifest_sha256 = independentBackupManifestDigest(forged);
  const forgedResult = validate(forged);
  assert(forgedResult.failures.includes('restore rehearsal has an invalid, uncorrelated, or over-objective RPO measurement'));
  assert(forgedResult.failures.includes('restore rehearsal has an invalid, uncorrelated, or over-objective quarantined data-plane RTO measurement'));

  const reversed = buildReceipt({ restore: true });
  reversed.restore.restore_started_at = '2026-07-18T17:49:59Z';
  reversed.manifest_sha256 = independentBackupManifestDigest(reversed);
  assert(validate(reversed).failures.includes('restore start cannot predate failure declaration'));
});

test('manifest tampering is detected', () => {
  const receipt = buildReceipt();
  receipt.ciphertext_bytes += 1;
  assert(validate(receipt).failures.includes('backup manifest digest mismatch'));
});
