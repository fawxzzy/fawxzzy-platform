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

function buildObjectLockReadback(receipt) {
  return {
    version: '1.0.0',
    status: 'CURRENT',
    canonical_serialization: 'lexicographic_object_keys_array_order_preserved_two_space_json_lf',
    observed_at: '2026-07-18T17:45:00Z',
    source_evidence_sha256: digest('object-lock-readback'),
    destination: {
      provider: 'Backblaze B2',
      region: 'Canada East',
      reference: receipt.object_lock.destination_reference
    },
    object: {
      destination_version: receipt.destination_version,
      ciphertext_sha256: receipt.ciphertext_sha256,
      locked: true,
      mutable: false,
      retention_mode: 'COMPLIANCE',
      retention_until: receipt.retention_until
    }
  };
}

function buildStorageBodyRecoveryReceipt(receipt) {
  const storage = receipt.coverage.find((entry) => entry.unit === 'storage_object_bodies');
  const buckets = storage.aggregate_count === 0 ? [] : [{
    bucket_reference: 'storage-bucket-primary',
    object_count: storage.aggregate_count,
    body_count: storage.aggregate_count,
    total_bytes: storage.aggregate_count * 1024,
    object_manifest_sha256: digest('storage-object-manifest'),
    body_content_sha256: digest('storage-body-content')
  }];
  return {
    version: '1.0.0',
    status: 'CURRENT',
    canonical_serialization: 'lexicographic_object_keys_array_order_preserved_two_space_json_lf',
    observed_at: '2026-07-18T17:48:00Z',
    source_evidence_sha256: digest('storage-body-source-readback'),
    project: structuredClone(receipt.project),
    snapshot_at: receipt.snapshot_at,
    retention_until: receipt.retention_until,
    denominator: {
      bucket_count: buckets.length,
      object_count: storage.aggregate_count,
      body_count: storage.aggregate_count,
      total_bytes: buckets.reduce((sum, bucket) => sum + bucket.total_bytes, 0),
      buckets_manifest_sha256: sha256Hex(buckets),
      buckets
    },
    restore_proof: {
      status: 'CURRENT',
      verified_at: '2026-07-18T17:47:00Z',
      receipt_sha256: digest('storage-restore-proof')
    }
  };
}

function buildReceipt({ restore = false, storageObjectCount = 0 } = {}) {
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
    object_lock: {
      status: 'CURRENT',
      mode: 'COMPLIANCE',
      destination_reference: 'backup-bucket-primary',
      readback_manifest_sha256: null
    },
    freshness: { status: 'CURRENT', maximum_age_seconds: 28800 },
    coverage: coverageUnits.map((unit) => ({
      unit,
      status: unit === 'storage_object_bodies' ? (storageObjectCount > 0 ? 'CURRENT' : 'NOT_APPLICABLE') : 'CURRENT',
      aggregate_count: unit === 'storage_object_bodies' ? storageObjectCount : 1,
      private_digest: unit === 'storage_object_bodies' ? null : digest(`coverage-${unit}`),
      body_recovery_receipt_status: unit === 'storage_object_bodies' ? (storageObjectCount > 0 ? 'CURRENT' : 'NOT_APPLICABLE') : null,
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
  receipt.object_lock.readback_manifest_sha256 = sha256Hex(buildObjectLockReadback(receipt));
  if (storageObjectCount > 0) {
    const storage = receipt.coverage.find((entry) => entry.unit === 'storage_object_bodies');
    const storageBodyRecoveryReceipt = buildStorageBodyRecoveryReceipt(receipt);
    storage.private_digest = storageBodyRecoveryReceipt.denominator.buckets_manifest_sha256;
    storage.body_recovery_receipt_sha256 = sha256Hex(storageBodyRecoveryReceipt);
  }
  receipt.monthly_selection.accepted_exports_manifest_sha256 = sha256Hex(buildAcceptedExportsManifest(receipt));
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  return receipt;
}

function validate(receipt, validationNow = now, acceptedExportsManifest = buildAcceptedExportsManifest(receipt), evidence = {}) {
  const storage = receipt.coverage?.find((entry) => entry?.unit === 'storage_object_bodies');
  const storageClaimed = storage?.status === 'CURRENT' || (storage?.aggregate_count ?? 0) > 0;
  const objectLockReadback = Object.hasOwn(evidence, 'objectLockReadback')
    ? evidence.objectLockReadback
    : buildObjectLockReadback(receipt);
  const storageBodyRecoveryReceipt = Object.hasOwn(evidence, 'storageBodyRecoveryReceipt')
    ? evidence.storageBodyRecoveryReceipt
    : (storageClaimed ? buildStorageBodyRecoveryReceipt(receipt) : undefined);
  return validateIndependentBackupReceipt(contract(), receipt, {
    now: validationNow,
    acceptedExportsManifest,
    objectLockReadback,
    storageBodyRecoveryReceipt
  });
}

function bindObjectLockReadback(receipt, readback) {
  receipt.object_lock.readback_manifest_sha256 = sha256Hex(readback);
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
}

function bindStorageBodyRecoveryReceipt(receipt, storageReceipt) {
  const storage = receipt.coverage.find((entry) => entry.unit === 'storage_object_bodies');
  storage.private_digest = storageReceipt.denominator.buckets_manifest_sha256;
  storage.body_recovery_receipt_status = 'CURRENT';
  storage.body_recovery_receipt_sha256 = sha256Hex(storageReceipt);
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
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

test('Object Lock acceptance requires exact current object-version readback', () => {
  const missing = buildReceipt();
  const missingResult = validate(missing, now, buildAcceptedExportsManifest(missing), { objectLockReadback: null });
  assert(missingResult.failures.some((failure) => failure.startsWith('Object Lock readback schema')));
  assert(missingResult.failures.includes('Object Lock readback manifest digest mismatch'));

  const stale = buildReceipt();
  const staleReadback = buildObjectLockReadback(stale);
  staleReadback.observed_at = '2026-07-18T09:59:59Z';
  bindObjectLockReadback(stale, staleReadback);
  assert(validate(stale, now, buildAcceptedExportsManifest(stale), { objectLockReadback: staleReadback }).failures.includes('Object Lock readback is stale'));

  const future = buildReceipt();
  const futureReadback = buildObjectLockReadback(future);
  futureReadback.observed_at = '2026-07-18T18:00:01Z';
  bindObjectLockReadback(future, futureReadback);
  assert(validate(future, now, buildAcceptedExportsManifest(future), { objectLockReadback: futureReadback }).failures.includes('Object Lock readback cannot be future-dated'));

  const wrongObject = buildReceipt();
  const wrongObjectReadback = buildObjectLockReadback(wrongObject);
  wrongObjectReadback.object.destination_version = 'backup-version-other';
  bindObjectLockReadback(wrongObject, wrongObjectReadback);
  assert(validate(wrongObject, now, buildAcceptedExportsManifest(wrongObject), { objectLockReadback: wrongObjectReadback }).failures.includes('Object Lock readback object identity mismatch'));

  const wrongDestination = buildReceipt();
  const wrongDestinationReadback = buildObjectLockReadback(wrongDestination);
  wrongDestinationReadback.destination.reference = 'backup-bucket-other';
  bindObjectLockReadback(wrongDestination, wrongDestinationReadback);
  assert(validate(wrongDestination, now, buildAcceptedExportsManifest(wrongDestination), { objectLockReadback: wrongDestinationReadback }).failures.includes('Object Lock readback destination mismatch'));

  const shortened = buildReceipt();
  const shortenedReadback = buildObjectLockReadback(shortened);
  shortenedReadback.object.retention_until = '2026-08-22T17:39:59Z';
  bindObjectLockReadback(shortened, shortenedReadback);
  assert(validate(shortened, now, buildAcceptedExportsManifest(shortened), { objectLockReadback: shortenedReadback }).failures.includes('Object Lock readback retention is shorter than the export retention'));

  const unlocked = buildReceipt();
  const unlockedReadback = buildObjectLockReadback(unlocked);
  unlockedReadback.object.locked = false;
  unlockedReadback.object.mutable = true;
  bindObjectLockReadback(unlocked, unlockedReadback);
  assert(validate(unlocked, now, buildAcceptedExportsManifest(unlocked), { objectLockReadback: unlockedReadback }).failures.includes('Object Lock readback does not prove immutable compliance retention'));

  const ambiguous = buildReceipt();
  const ambiguousReadback = buildObjectLockReadback(ambiguous);
  ambiguousReadback.objects = [structuredClone(ambiguousReadback.object), structuredClone(ambiguousReadback.object)];
  bindObjectLockReadback(ambiguous, ambiguousReadback);
  assert(validate(ambiguous, now, buildAcceptedExportsManifest(ambiguous), { objectLockReadback: ambiguousReadback }).failures.some((failure) => failure.includes('Object Lock readback schema /: must NOT have additional properties')));

  const nonCanonical = buildReceipt();
  const nonCanonicalReadback = buildObjectLockReadback(nonCanonical);
  nonCanonicalReadback.canonical_serialization = 'unordered_json';
  bindObjectLockReadback(nonCanonical, nonCanonicalReadback);
  assert(validate(nonCanonical, now, buildAcceptedExportsManifest(nonCanonical), { objectLockReadback: nonCanonicalReadback }).failures.some((failure) => failure.includes('Object Lock readback schema /canonical_serialization: must be equal to constant')));

  assert.doesNotThrow(() => validate(buildReceipt(), now, buildAcceptedExportsManifest(buildReceipt()), { objectLockReadback: {} }));
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

test('malformed coverage entries return deterministic fail-closed issues without throwing', () => {
  const malformedEntries = [
    null,
    'application_data',
    7,
    true,
    [],
    {},
    { unit: 7, status: 'CURRENT', aggregate_count: 1, private_digest: digest('malformed-unit') },
    { unit: 'application_schemas_and_catalog', status: 7, aggregate_count: 'one', private_digest: false }
  ];

  for (const [index, malformedEntry] of malformedEntries.entries()) {
    const receipt = buildReceipt();
    receipt.coverage[0] = malformedEntry;
    receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
    let result;
    assert.doesNotThrow(() => { result = validate(receipt); }, `malformed coverage case ${index} must not throw`);
    assert.equal(result.ok, false);
    assert(result.failures.some((failure) => failure.startsWith('receipt schema /coverage/0')));
    if (index < 7) assert(result.failures.includes('coverage[0]: coverage entry is malformed'));
    else assert(result.failures.includes('application_schemas_and_catalog: coverage is incomplete'));
  }

  const mixed = buildReceipt();
  mixed.coverage[0] = null;
  mixed.manifest_sha256 = independentBackupManifestDigest(mixed);
  const mixedResult = validate(mixed);
  assert.equal(mixedResult.ok, false);
  assert(mixedResult.failures.includes('coverage[0]: coverage entry is malformed'));
  assert(mixedResult.failures.includes('receipt coverage denominator changed'));

  const duplicate = buildReceipt();
  duplicate.coverage[0] = structuredClone(duplicate.coverage[1]);
  duplicate.manifest_sha256 = independentBackupManifestDigest(duplicate);
  const duplicateResult = validate(duplicate);
  assert.equal(duplicateResult.ok, false);
  assert(duplicateResult.failures.includes('receipt coverage denominator changed'));
});

test('missing provider Physical backup complement fails closed', () => {
  const receipt = buildReceipt();
  receipt.provider_physical_backup.status = 'UNKNOWN';
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  assert(validate(receipt).failures.includes('provider Physical backup complement is unproved'));
});

test('non-empty Storage bodies validate only with a correlated recovery receipt', () => {
  const receipt = buildReceipt({ storageObjectCount: 2 });
  assert.deepEqual(validate(receipt), { ok: true, failures: [] });

  const missing = buildReceipt({ storageObjectCount: 2 });
  const missingResult = validate(missing, now, buildAcceptedExportsManifest(missing), { storageBodyRecoveryReceipt: null });
  assert(missingResult.failures.some((failure) => failure.startsWith('Storage body recovery receipt schema')));
  assert(missingResult.failures.includes('Storage body recovery receipt digest mismatch'));

  const selfReported = buildReceipt();
  const selfReportedStorage = selfReported.coverage.find((entry) => entry.unit === 'storage_object_bodies');
  selfReportedStorage.status = 'CURRENT';
  selfReportedStorage.aggregate_count = 1;
  selfReportedStorage.private_digest = digest('storage-bodies');
  selfReportedStorage.body_recovery_receipt_status = 'CURRENT';
  selfReportedStorage.body_recovery_receipt_sha256 = digest('self-reported-receipt');
  selfReported.manifest_sha256 = independentBackupManifestDigest(selfReported);
  assert(validate(selfReported, now, buildAcceptedExportsManifest(selfReported), { storageBodyRecoveryReceipt: null }).failures.includes('Storage body recovery receipt digest mismatch'));
});

test('Storage body recovery evidence rejects stale, mismatched, partial, duplicate, and unproved coverage', () => {
  const stale = buildReceipt({ storageObjectCount: 2 });
  const staleEvidence = buildStorageBodyRecoveryReceipt(stale);
  staleEvidence.observed_at = '2026-07-18T09:59:59Z';
  bindStorageBodyRecoveryReceipt(stale, staleEvidence);
  assert(validate(stale, now, buildAcceptedExportsManifest(stale), { storageBodyRecoveryReceipt: staleEvidence }).failures.includes('Storage body recovery receipt is stale'));

  const future = buildReceipt({ storageObjectCount: 2 });
  const futureEvidence = buildStorageBodyRecoveryReceipt(future);
  futureEvidence.observed_at = '2026-07-18T18:00:01Z';
  bindStorageBodyRecoveryReceipt(future, futureEvidence);
  assert(validate(future, now, buildAcceptedExportsManifest(future), { storageBodyRecoveryReceipt: futureEvidence }).failures.includes('Storage body recovery receipt cannot be future-dated'));

  const wrongProject = buildReceipt({ storageObjectCount: 2 });
  const wrongProjectEvidence = buildStorageBodyRecoveryReceipt(wrongProject);
  wrongProjectEvidence.project.name = 'Another project';
  bindStorageBodyRecoveryReceipt(wrongProject, wrongProjectEvidence);
  assert(validate(wrongProject, now, buildAcceptedExportsManifest(wrongProject), { storageBodyRecoveryReceipt: wrongProjectEvidence }).failures.includes('Storage body recovery receipt project mismatch'));

  const wrongSnapshot = buildReceipt({ storageObjectCount: 2 });
  const wrongSnapshotEvidence = buildStorageBodyRecoveryReceipt(wrongSnapshot);
  wrongSnapshotEvidence.snapshot_at = '2026-07-18T17:29:59Z';
  bindStorageBodyRecoveryReceipt(wrongSnapshot, wrongSnapshotEvidence);
  assert(validate(wrongSnapshot, now, buildAcceptedExportsManifest(wrongSnapshot), { storageBodyRecoveryReceipt: wrongSnapshotEvidence }).failures.includes('Storage body recovery receipt snapshot mismatch'));

  const partial = buildReceipt({ storageObjectCount: 2 });
  const partialEvidence = buildStorageBodyRecoveryReceipt(partial);
  partialEvidence.denominator.buckets[0].body_count = 1;
  partialEvidence.denominator.body_count = 1;
  partialEvidence.denominator.buckets_manifest_sha256 = sha256Hex(partialEvidence.denominator.buckets);
  bindStorageBodyRecoveryReceipt(partial, partialEvidence);
  const partialResult = validate(partial, now, buildAcceptedExportsManifest(partial), { storageBodyRecoveryReceipt: partialEvidence });
  assert(partialResult.failures.includes('Storage body recovery bucket coverage is partial or malformed'));
  assert(partialResult.failures.includes('Storage body recovery does not cover the exact Storage object denominator'));

  const duplicate = buildReceipt({ storageObjectCount: 2 });
  const duplicateEvidence = buildStorageBodyRecoveryReceipt(duplicate);
  duplicateEvidence.denominator.buckets.push(structuredClone(duplicateEvidence.denominator.buckets[0]));
  duplicateEvidence.denominator.bucket_count = 2;
  duplicateEvidence.denominator.object_count = 4;
  duplicateEvidence.denominator.body_count = 4;
  duplicateEvidence.denominator.total_bytes = 4096;
  duplicateEvidence.denominator.buckets_manifest_sha256 = sha256Hex(duplicateEvidence.denominator.buckets);
  bindStorageBodyRecoveryReceipt(duplicate, duplicateEvidence);
  const duplicateResult = validate(duplicate, now, buildAcceptedExportsManifest(duplicate), { storageBodyRecoveryReceipt: duplicateEvidence });
  assert(duplicateResult.failures.includes('Storage body recovery bucket references must be distinct'));
  assert(duplicateResult.failures.includes('Storage body recovery bucket evidence must be distinct'));

  const shortened = buildReceipt({ storageObjectCount: 2 });
  const shortenedEvidence = buildStorageBodyRecoveryReceipt(shortened);
  shortenedEvidence.retention_until = '2026-08-22T17:39:59Z';
  bindStorageBodyRecoveryReceipt(shortened, shortenedEvidence);
  assert(validate(shortened, now, buildAcceptedExportsManifest(shortened), { storageBodyRecoveryReceipt: shortenedEvidence }).failures.includes('Storage body recovery retention is shorter than the export retention'));

  const unproved = buildReceipt({ storageObjectCount: 2 });
  const unprovedEvidence = buildStorageBodyRecoveryReceipt(unproved);
  unprovedEvidence.restore_proof.status = 'BLOCKED';
  bindStorageBodyRecoveryReceipt(unproved, unprovedEvidence);
  assert(validate(unproved, now, buildAcceptedExportsManifest(unproved), { storageBodyRecoveryReceipt: unprovedEvidence }).failures.includes('Storage body recovery restore proof is incomplete'));

  const nonCanonical = buildReceipt({ storageObjectCount: 2 });
  const nonCanonicalEvidence = buildStorageBodyRecoveryReceipt(nonCanonical);
  nonCanonicalEvidence.canonical_serialization = 'unordered_json';
  bindStorageBodyRecoveryReceipt(nonCanonical, nonCanonicalEvidence);
  assert(validate(nonCanonical, now, buildAcceptedExportsManifest(nonCanonical), { storageBodyRecoveryReceipt: nonCanonicalEvidence }).failures.some((failure) => failure.includes('Storage body recovery receipt schema /canonical_serialization: must be equal to constant')));

  const digestMismatch = buildReceipt({ storageObjectCount: 2 });
  const digestMismatchEvidence = buildStorageBodyRecoveryReceipt(digestMismatch);
  digestMismatchEvidence.source_evidence_sha256 = digest('tampered-storage-readback');
  assert(validate(digestMismatch, now, buildAcceptedExportsManifest(digestMismatch), { storageBodyRecoveryReceipt: digestMismatchEvidence }).failures.includes('Storage body recovery receipt digest mismatch'));

  const malformed = buildReceipt({ storageObjectCount: 2 });
  assert.doesNotThrow(() => validate(malformed, now, buildAcceptedExportsManifest(malformed), { storageBodyRecoveryReceipt: { denominator: { buckets: [null] } } }));
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

test('malformed restore external-effect and parity evidence fails closed without throwing', () => {
  const malformedExternalEffects = [
    null,
    'pg_net',
    7,
    true,
    [],
    {},
    { unit: 7, status: 'CURRENT', disabled: true, evidence_sha256: digest('malformed-effect-unit') },
    { unit: 'app_environment', status: 7, disabled: 'yes', evidence_sha256: false }
  ];
  const malformedParity = [
    null,
    'auth',
    7,
    true,
    [],
    {},
    { unit: 7, status: 'CURRENT', aggregate_count: 0, private_digest: digest('malformed-parity-unit') },
    { unit: 'auth', status: 7, aggregate_count: 'zero', private_digest: false }
  ];

  for (const [index, malformedEntry] of malformedExternalEffects.entries()) {
    const receipt = buildReceipt({ restore: true });
    receipt.restore.external_effects[0] = malformedEntry;
    receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
    let result;
    assert.doesNotThrow(() => { result = validate(receipt); }, `malformed external-effect case ${index} must not throw`);
    assert.equal(result.ok, false);
    assert(result.failures.some((failure) => failure.startsWith('receipt schema /restore/external_effects/0')));
    if (index < 7) {
      assert(result.failures.includes('restore.external_effects[0]: evidence entry is malformed'));
      assert(result.failures.includes('restore external-effect denominator changed'));
    } else {
      assert(result.failures.includes('every restore external effect requires disabled evidence'));
    }
  }

  for (const [index, malformedEntry] of malformedParity.entries()) {
    const receipt = buildReceipt({ restore: true });
    receipt.restore.parity[0] = malformedEntry;
    receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
    let result;
    assert.doesNotThrow(() => { result = validate(receipt); }, `malformed parity case ${index} must not throw`);
    assert.equal(result.ok, false);
    assert(result.failures.some((failure) => failure.startsWith('receipt schema /restore/parity/0')));
    if (index < 7) {
      assert(result.failures.includes('restore.parity[0]: evidence entry is malformed'));
      assert(result.failures.includes('restore parity denominator changed'));
    } else {
      assert(result.failures.includes('restore parity evidence is incomplete'));
    }
  }

  for (const field of ['external_effects', 'parity']) {
    for (const malformedContainer of [null, 'malformed', { unit: 'malformed' }]) {
      const receipt = buildReceipt({ restore: true });
      receipt.restore[field] = malformedContainer;
      receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
      let result;
      assert.doesNotThrow(() => { result = validate(receipt); }, `malformed ${field} container must not throw`);
      assert.equal(result.ok, false);
      assert(result.failures.includes(`restore.${field}: evidence array is malformed`));
    }
  }

  const mixed = buildReceipt({ restore: true });
  mixed.restore.external_effects[0] = null;
  mixed.restore.parity[0] = [];
  mixed.manifest_sha256 = independentBackupManifestDigest(mixed);
  const mixedResult = validate(mixed);
  assert.equal(mixedResult.ok, false);
  assert(mixedResult.failures.includes('restore.external_effects[0]: evidence entry is malformed'));
  assert(mixedResult.failures.includes('restore.parity[0]: evidence entry is malformed'));

  const duplicateEffects = buildReceipt({ restore: true });
  duplicateEffects.restore.external_effects[0] = structuredClone(duplicateEffects.restore.external_effects[1]);
  duplicateEffects.manifest_sha256 = independentBackupManifestDigest(duplicateEffects);
  assert(validate(duplicateEffects).failures.includes('restore external-effect denominator changed'));

  const duplicateParity = buildReceipt({ restore: true });
  duplicateParity.restore.parity[0] = structuredClone(duplicateParity.restore.parity[1]);
  duplicateParity.manifest_sha256 = independentBackupManifestDigest(duplicateParity);
  assert(validate(duplicateParity).failures.includes('restore parity denominator changed'));
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
