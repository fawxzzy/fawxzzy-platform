import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { loadDocuments } from '../scripts/lib/contracts.mjs';
import {
  acceptedExportHistoryEntryDigest,
  acceptedExportsAuthenticationResultDigest,
  acceptedExportsAuthenticationSignedBytes,
  acceptedExportsAuthenticationSignedPayloadDigest,
  acceptedExportsAuthenticationSubjectDigest,
  canonicalSerialize,
  coverageUnits,
  externalEffectUnits,
  independentBackupContractPath,
  independentBackupManifestDigest,
  independentBackupReceiptIdentityDigest,
  independentBackupRestoreOutcomeSubjectDigest,
  independentBackupRestorePlanDigest,
  independentBackupSourceStateDigest,
  sha256Hex,
  storageBodyRecoveryEvidenceDigest,
  storageInventoryManifestDigest,
  trustedAttestationResultDigest,
  trustedAttestationSignedBytes,
  trustedAttestationSignedPayloadDigest,
  trustedAttestationSubjectDigest,
  validateIndependentBackupContract,
  validateIndependentBackupReceipt
} from '../scripts/lib/independent-backup-contract.mjs';

const now = '2026-07-18T18:00:00Z';
const digest = (label) => sha256Hex({ label });
const authenticationSignatureDomain = 'fawxzzy-platform:accepted-exports-authentication:v1';
const executionGateSignatureDomain = 'fawxzzy-platform:execution-gate-admission:v1';
const restoreOutcomeSignatureDomain = 'fawxzzy-platform:restore-outcome-attestation:v1';
const storageInventorySignatureDomain = 'fawxzzy-platform:storage-inventory-attestation:v1';
const objectLockSignatureDomain = 'fawxzzy-platform:object-lock-provider-attestation:v1';

// RFC 8032 test vector 1. This public test identity is used only in memory by
// deterministic tests; it is not a production credential or admitted anchor.
const testEd25519PublicSpki = Buffer.from(`302a300506032b6570032100${'d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'}`, 'hex');
const testEd25519PrivatePkcs8 = Buffer.from(`302e020100300506032b657004220420${'9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60'}`, 'hex');
const testEd25519PrivateKey = crypto.createPrivateKey({ key: testEd25519PrivatePkcs8, format: 'der', type: 'pkcs8' });
const testTrustAnchor = Object.freeze({
  status: 'CURRENT',
  algorithm: 'Ed25519',
  key_id: 'accepted-exports-test-ed25519-v1',
  verifier_reference: 'accepted-exports-test-verifier-v1',
  public_key_spki_base64: testEd25519PublicSpki.toString('base64'),
  public_key_spki_sha256: crypto.createHash('sha256').update(testEd25519PublicSpki).digest('hex')
});

function sourceContract() {
  return structuredClone(loadDocuments()[independentBackupContractPath]);
}

function contract() {
  const value = sourceContract();
  value.receipt_contract.accepted_exports_authentication.trust_anchor = structuredClone(testTrustAnchor);
  return value;
}

function buildAcceptedExportsManifest(receipt, { first = false } = {}) {
  const current = {
    completed_at: receipt.completed_at,
    destination_version: receipt.destination_version,
    ciphertext_sha256: receipt.ciphertext_sha256
  };
  const monthStart = Date.parse(`${receipt.completed_at.slice(0, 7)}-01T00:00:00Z`);
  const currentAcceptedAt = Date.parse(receipt.completed_at) + 300000;
  const entries = [];
  if (!first) {
    for (let acceptedAt = monthStart + 6 * 3600000, index = 0; acceptedAt < currentAcceptedAt; acceptedAt += 6 * 3600000, index += 1) {
      const completedAt = acceptedAt - 300000;
      if (completedAt >= Date.parse(receipt.completed_at)) break;
      entries.push({
        completed_at: new Date(completedAt).toISOString().replace('.000Z', 'Z'),
        destination_version: `backup-version-history-${String(index).padStart(4, '0')}`,
        ciphertext_sha256: digest(`prior-ciphertext-${index}`)
      });
    }
  }
  entries.push(current);
  const manifest = {
    version: '1.0.0',
    status: 'CURRENT',
    month_utc: receipt.completed_at.slice(0, 7),
    observed_at: '2026-07-18T17:45:00Z',
    source_evidence_sha256: null,
    entries
  };
  manifest.source_evidence_sha256 = sha256Hex(buildAcceptedExportsEvidence(receipt, manifest));
  return manifest;
}

function buildAcceptedExportsEvidence(receipt, manifest) {
  const entries = [];
  for (const [index, accepted] of manifest.entries.entries()) {
    const completedAt = Date.parse(accepted.completed_at);
    const current = accepted.completed_at === receipt.completed_at
      && accepted.destination_version === receipt.destination_version
      && accepted.ciphertext_sha256 === receipt.ciphertext_sha256;
    const retentionDays = index === 0 ? 400 : 35;
    const entry = {
      sequence: index,
      completed_at: accepted.completed_at,
      accepted_at: new Date(completedAt + 300000).toISOString().replace('.000Z', 'Z'),
      retention_until: current
        ? receipt.retention_until
        : new Date(completedAt + retentionDays * 86400000).toISOString().replace('.000Z', 'Z'),
      destination_version: accepted.destination_version,
      ciphertext_sha256: accepted.ciphertext_sha256,
      immutable_readback_sha256: digest(`accepted-export-readback-${accepted.destination_version}`),
      previous_entry_sha256: index === 0 ? null : entries[index - 1].entry_sha256,
      entry_sha256: null
    };
    entry.entry_sha256 = acceptedExportHistoryEntryDigest(entry);
    entries.push(entry);
  }
  const evidence = {
    version: '1.0.0',
    status: 'CURRENT',
    canonical_serialization: 'lexicographic_object_keys_array_order_preserved_two_space_json_lf',
    evidence_class: 'authenticated_accepted_exports_readback',
    evidence_id: 'accepted-exports-readback-0001',
    observed_at: manifest.observed_at,
    project: structuredClone(receipt.project),
    month_utc: manifest.month_utc,
    policy: {
      full_export_interval_hours: 6,
      standard_retention_days: 35,
      first_accepted_monthly_days: 400
    },
    history: {
      complete: true,
      window_started_at: `${manifest.month_utc}-01T00:00:00Z`,
      window_ended_at: manifest.observed_at,
      entry_count: entries.length,
      entries_manifest_sha256: sha256Hex(entries),
      latest_entry_sha256: entries.at(-1).entry_sha256
    },
    authentication: {
      status: 'CURRENT',
      method: 'pinned_ed25519_signature_result',
      verification_result_sha256: '0'.repeat(64)
    },
    entries
  };
  evidence.authentication.verification_result_sha256 = buildAcceptedExportsAuthenticationResult(evidence).result_sha256;
  return evidence;
}

function buildAcceptedExportsAuthenticationResult(evidence) {
  const result = {
    version: '1.0.0',
    status: 'VERIFIED',
    canonical_serialization: 'lexicographic_object_keys_array_order_preserved_two_space_json_lf',
    result_class: 'trusted_external_authentication_verification',
    result_id: 'accepted-exports-auth-verification-0001',
    verified_at: '2026-07-18T17:46:00Z',
    verifier_reference: testTrustAnchor.verifier_reference,
    verification_method: 'external_signature_verification',
    key_id: testTrustAnchor.key_id,
    signature_algorithm: 'Ed25519',
    signature_domain: authenticationSignatureDomain,
    project: structuredClone(evidence.project),
    month_utc: evidence.month_utc,
    evidence_id: evidence.evidence_id,
    subject_sha256: acceptedExportsAuthenticationSubjectDigest(evidence),
    external_receipt_sha256: digest('external-accepted-exports-authentication-receipt'),
    signed_payload_sha256: null,
    signature_base64: null,
    result_sha256: null
  };
  signAcceptedExportsAuthenticationResult(result);
  return result;
}

function signAcceptedExportsAuthenticationResult(result, privateKey = testEd25519PrivateKey) {
  result.signed_payload_sha256 = acceptedExportsAuthenticationSignedPayloadDigest(result);
  result.signature_base64 = crypto.sign(null, acceptedExportsAuthenticationSignedBytes(result), privateKey).toString('base64');
  result.result_sha256 = acceptedExportsAuthenticationResultDigest(result);
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

function signTrustedAttestationResult(result, signatureDomain, privateKey = testEd25519PrivateKey) {
  result.signed_payload_sha256 = trustedAttestationSignedPayloadDigest(result, signatureDomain);
  result.signature_base64 = crypto.sign(null, trustedAttestationSignedBytes(result, signatureDomain), privateKey).toString('base64');
  result.result_sha256 = trustedAttestationResultDigest(result);
}

function buildTrustedAttestationResult(evidence, signatureDomain, resultClass, resultId) {
  const result = {
    version: '1.0.0',
    status: 'VERIFIED',
    canonical_serialization: 'lexicographic_object_keys_array_order_preserved_two_space_json_lf',
    result_class: resultClass,
    result_id: resultId,
    verified_at: signatureDomain === objectLockSignatureDomain
      ? '2026-07-18T17:46:00Z'
      : signatureDomain === storageInventorySignatureDomain
        ? '2026-07-18T17:50:00Z'
        : signatureDomain === restoreOutcomeSignatureDomain
          ? '2026-07-18T17:59:30Z'
          : '2026-07-18T17:21:00Z',
    verifier_reference: testTrustAnchor.verifier_reference,
    verification_method: 'external_signature_verification',
    key_id: testTrustAnchor.key_id,
    signature_algorithm: 'Ed25519',
    signature_domain: signatureDomain,
    project: structuredClone(evidence.project),
    evidence_id: evidence.evidence_id,
    subject_sha256: trustedAttestationSubjectDigest(evidence),
    external_receipt_sha256: digest(`${resultClass}-external-receipt`),
    signed_payload_sha256: null,
    signature_base64: null,
    result_sha256: null
  };
  signTrustedAttestationResult(result, signatureDomain);
  return result;
}

function buildExecutionGateEvidence(receipt, validationContract = contract()) {
  const policies = receipt.lifecycle_state === 'RESTORE_REHEARSED'
    ? validationContract.receipt_contract.execution_gate_authentication.admission_policy.restore_rehearsed
    : validationContract.receipt_contract.execution_gate_authentication.admission_policy.backup_current;
  const admissions = policies.map((policy, index) => ({
    version: '1.0.0',
    status: 'CURRENT',
    canonical_serialization: 'lexicographic_object_keys_array_order_preserved_two_space_json_lf',
    evidence_class: 'authenticated_execution_gate_admission',
    evidence_id: `execution-gate-admission-${String(index + 1).padStart(4, '0')}`,
    issued_at: '2026-07-18T17:20:00Z',
    expires_at: '2026-07-18T18:20:00Z',
    project: structuredClone(receipt.project),
    gate_id: policy.gate_id,
    gate_version: policy.gate_version,
    scope: policy.scope,
    contract_artifact_sha256: sha256Hex(validationContract),
    policy_artifact_sha256: sha256Hex(validationContract.receipt_contract.execution_gate_authentication.admission_policy),
    source_state_sha256: receipt.source_state_sha256,
    receipt_identity: {
      receipt_id: receipt.receipt_id,
      receipt_identity_sha256: independentBackupReceiptIdentityDigest(receipt)
    },
    export_identity: {
      export_id: receipt.export_id
    },
    restore_identity: policy.gate_id === 'restore_rehearsal' ? {
      plan_id: receipt.restore?.plan_identity?.plan_id ?? 'invalid',
      plan_sha256: independentBackupRestorePlanDigest(validationContract, receipt)
    } : null,
    authentication: {
      status: 'CURRENT',
      method: 'pinned_ed25519_signature_result',
      verification_result_sha256: '0'.repeat(64)
    }
  }));
  const results = admissions.map((admission, index) => buildTrustedAttestationResult(
    admission,
    executionGateSignatureDomain,
    'trusted_execution_gate_admission_verification',
    `execution-gate-verification-${String(index + 1).padStart(4, '0')}`
  ));
  admissions.forEach((admission, index) => {
    admission.authentication.verification_result_sha256 = results[index].result_sha256;
  });
  return { admissions, results };
}

function buildRestoreOutcomeAuthenticationResult(receipt) {
  if (receipt.lifecycle_state !== 'RESTORE_REHEARSED') return undefined;
  const result = {
    version: '1.0.0',
    status: 'VERIFIED',
    canonical_serialization: 'lexicographic_object_keys_array_order_preserved_two_space_json_lf',
    result_class: 'trusted_restore_outcome_verification',
    result_id: 'restore-outcome-verification-0001',
    verified_at: '2026-07-18T17:59:30Z',
    verifier_reference: testTrustAnchor.verifier_reference,
    verification_method: 'external_signature_verification',
    key_id: testTrustAnchor.key_id,
    signature_algorithm: 'Ed25519',
    signature_domain: restoreOutcomeSignatureDomain,
    project: structuredClone(receipt.project),
    evidence_id: receipt.restore.plan_identity.plan_id,
    subject_sha256: independentBackupRestoreOutcomeSubjectDigest(receipt),
    external_receipt_sha256: digest('external-restore-outcome-readback'),
    signed_payload_sha256: null,
    signature_base64: null,
    result_sha256: null
  };
  signTrustedAttestationResult(result, restoreOutcomeSignatureDomain);
  return result;
}

function buildObjectLockProviderEvidence(receipt, readback) {
  if (!readback || typeof readback !== 'object' || Array.isArray(readback)
    || !readback.destination || typeof readback.destination !== 'object'
    || !readback.object || typeof readback.object !== 'object') {
    return { attestation: undefined, result: undefined };
  }
  const attestation = {
    version: '1.0.0',
    status: 'CURRENT',
    canonical_serialization: 'lexicographic_object_keys_array_order_preserved_two_space_json_lf',
    evidence_class: 'provider_bound_object_lock_attestation',
    evidence_id: 'object-lock-provider-attestation-0001',
    observed_at: readback.observed_at,
    project: structuredClone(receipt.project),
    provider_class: readback.destination.provider,
    bucket_identity_sha256: sha256Hex(readback.destination),
    object_identity_sha256: sha256Hex({
      destination_version: receipt.destination_version,
      plaintext_sha256: receipt.plaintext_sha256,
      ciphertext_sha256: receipt.ciphertext_sha256
    }),
    receipt_manifest_sha256: receipt.manifest_sha256,
    readback_manifest_sha256: receipt.object_lock.readback_manifest_sha256,
    object: {
      destination_version: receipt.destination_version,
      plaintext_sha256: receipt.plaintext_sha256,
      ciphertext_sha256: receipt.ciphertext_sha256,
      lock_mode: readback.object.retention_mode,
      retention_until: readback.object.retention_until
    },
    authentication: {
      status: 'CURRENT',
      method: 'pinned_ed25519_signature_result',
      verification_result_sha256: '0'.repeat(64)
    }
  };
  const result = buildTrustedAttestationResult(
    attestation,
    objectLockSignatureDomain,
    'trusted_object_lock_provider_verification',
    'object-lock-provider-verification-0001'
  );
  attestation.authentication.verification_result_sha256 = result.result_sha256;
  return { attestation, result };
}

function buildStorageInventoryEvidence(receipt) {
  const storage = receipt.coverage?.find((entry) => entry?.unit === 'storage_object_bodies');
  const objectCount = Number.isInteger(storage?.aggregate_count) ? storage.aggregate_count : 0;
  const evidence = {
    version: '1.0.0',
    status: 'CURRENT',
    canonical_serialization: 'lexicographic_object_keys_array_order_preserved_two_space_json_lf',
    evidence_class: 'authenticated_storage_inventory_readback',
    evidence_id: 'storage-inventory-readback-0001',
    observed_at: '2026-07-18T17:49:00Z',
    source_evidence_sha256: digest('storage-inventory-source-readback'),
    project: structuredClone(receipt.project),
    provider_snapshot_identity: {
      provider_class: 'Supabase Storage metadata',
      storage_snapshot_id: 'storage-snapshot-0001',
      source_snapshot_sha256: receipt.source_state_sha256
    },
    snapshot_at: receipt.snapshot_at,
    export_identity: {
      export_id: receipt.export_id,
      destination_version: receipt.destination_version,
      ciphertext_sha256: receipt.ciphertext_sha256
    },
    denominator: {
      bucket_count: objectCount === 0 ? 0 : 1,
      object_count: objectCount,
      total_bytes: objectCount * 1024,
      inventory_manifest_sha256: null
    },
    authentication: {
      status: 'CURRENT',
      method: 'pinned_ed25519_signature_result',
      verification_result_sha256: '0'.repeat(64)
    }
  };
  evidence.denominator.inventory_manifest_sha256 = storageInventoryManifestDigest(evidence);
  evidence.authentication.verification_result_sha256 = buildStorageInventoryAuthenticationResult(evidence).result_sha256;
  return evidence;
}

function buildStorageInventoryAuthenticationResult(evidence) {
  const result = buildTrustedAttestationResult(
    evidence,
    storageInventorySignatureDomain,
    'trusted_storage_inventory_verification',
    'storage-inventory-verification-0001'
  );
  result.external_receipt_sha256 = evidence.source_evidence_sha256;
  signTrustedAttestationResult(result, storageInventorySignatureDomain);
  return result;
}

function buildStorageBodyRecoveryEvidence(receipt, recoveryReceipt) {
  return {
    version: '1.0.0',
    status: 'CURRENT',
    canonical_serialization: 'lexicographic_object_keys_array_order_preserved_two_space_json_lf',
    evidence_class: 'independent_storage_body_recovery_readback',
    evidence_id: 'storage-recovery-readback-0001',
    observed_at: '2026-07-18T17:49:00Z',
    project: structuredClone(receipt.project),
    snapshot_at: receipt.snapshot_at,
    export_identity: {
      destination_version: receipt.destination_version,
      ciphertext_sha256: receipt.ciphertext_sha256
    },
    restore_identity: {
      receipt_sha256: recoveryReceipt.restore_proof.receipt_sha256,
      verified_at: recoveryReceipt.restore_proof.verified_at
    },
    denominator: {
      bucket_count: recoveryReceipt.denominator.bucket_count,
      object_count: recoveryReceipt.denominator.object_count,
      body_count: recoveryReceipt.denominator.body_count,
      total_bytes: recoveryReceipt.denominator.total_bytes,
      buckets_manifest_sha256: recoveryReceipt.denominator.buckets_manifest_sha256
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
  const recoveryReceipt = {
    version: '1.0.0',
    status: 'CURRENT',
    canonical_serialization: 'lexicographic_object_keys_array_order_preserved_two_space_json_lf',
    observed_at: '2026-07-18T17:48:00Z',
    source_evidence_sha256: null,
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
  recoveryReceipt.source_evidence_sha256 = storageBodyRecoveryEvidenceDigest(buildStorageBodyRecoveryEvidence(receipt, recoveryReceipt));
  return recoveryReceipt;
}

function buildReceipt({ restore = false, storageObjectCount = 0 } = {}) {
  const receipt = {
    receipt_id: 'backup-receipt-0001',
    export_id: 'backup-export-0001',
    lifecycle_state: restore ? 'RESTORE_REHEARSED' : 'BACKUP_CURRENT',
    project: { name: 'Fawxzzy shared Supabase project', ref: 'bxtcuhkotumitoqtrcej' },
    source_commit: 'a'.repeat(40),
    source_state_sha256: null,
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
    watchdog: {
      status: 'CURRENT',
      independent_from_scheduler: true,
      project: { name: 'Fawxzzy shared Supabase project', ref: 'bxtcuhkotumitoqtrcej' },
      observed_at: '2026-07-18T17:45:00Z',
      evidence_sha256: digest('watchdog')
    },
    provider_physical_backup: {
      status: 'CURRENT',
      retention_days: 7,
      project: { name: 'Fawxzzy shared Supabase project', ref: 'bxtcuhkotumitoqtrcej' },
      observed_at: '2026-07-18T17:46:00Z',
      evidence_sha256: digest('physical-backup')
    },
    cost: {
      budget_stop_control_status: 'CURRENT',
      projected_usd_monthly: 0,
      monthly_report_status: 'CURRENT',
      reported_units: ['backup_freshness', 'projected_cost', 'runner_usage', 'storage_growth']
    },
    production_service_rto: { status: 'UNKNOWN', seconds: null },
    restore: null
  };
  receipt.source_state_sha256 = independentBackupSourceStateDigest(receipt);
  if (restore) {
    receipt.restore = {
      status: 'CURRENT',
      plan_identity: {
        plan_id: 'restore-plan-0001',
        plan_sha256: '0'.repeat(64)
      },
      target_project: {
        name: 'Fawxzzy restore rehearsal',
        ref: 'restoretarget0000000',
        source_project_sha256: sha256Hex(receipt.project)
      },
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
      outcome_authentication: {
        status: 'CURRENT',
        method: 'pinned_ed25519_signature_result',
        verification_result_sha256: '0'.repeat(64)
      },
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
  if (restore) {
    receipt.restore.plan_identity.plan_sha256 = independentBackupRestorePlanDigest(contract(), receipt);
    receipt.restore.outcome_authentication.verification_result_sha256 = buildRestoreOutcomeAuthenticationResult(receipt).result_sha256;
  }
  receipt.monthly_selection.accepted_exports_manifest_sha256 = sha256Hex(buildAcceptedExportsManifest(receipt));
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  return receipt;
}

function validate(receipt, validationNow = now, acceptedExportsManifest = buildAcceptedExportsManifest(receipt), evidence = {}) {
  const validationContract = Object.hasOwn(evidence, 'contract') ? evidence.contract : contract();
  const storage = receipt.coverage?.find((entry) => entry?.unit === 'storage_object_bodies');
  const storageClaimed = storage?.status === 'CURRENT' || (storage?.aggregate_count ?? 0) > 0;
  const objectLockReadback = Object.hasOwn(evidence, 'objectLockReadback')
    ? evidence.objectLockReadback
    : buildObjectLockReadback(receipt);
  const storageBodyRecoveryReceipt = Object.hasOwn(evidence, 'storageBodyRecoveryReceipt')
    ? evidence.storageBodyRecoveryReceipt
    : (storageClaimed ? buildStorageBodyRecoveryReceipt(receipt) : undefined);
  const storageBodyRecoveryEvidence = Object.hasOwn(evidence, 'storageBodyRecoveryEvidence')
    ? evidence.storageBodyRecoveryEvidence
    : (storageClaimed
        && storageBodyRecoveryReceipt?.restore_proof?.receipt_sha256
        && storageBodyRecoveryReceipt?.denominator
      ? buildStorageBodyRecoveryEvidence(receipt, storageBodyRecoveryReceipt)
      : undefined);
  const storageInventoryEvidence = Object.hasOwn(evidence, 'storageInventoryEvidence')
    ? evidence.storageInventoryEvidence
    : buildStorageInventoryEvidence(receipt);
  const storageInventoryAuthenticationResult = Object.hasOwn(evidence, 'storageInventoryAuthenticationResult')
    ? evidence.storageInventoryAuthenticationResult
    : (storageInventoryEvidence ? buildStorageInventoryAuthenticationResult(storageInventoryEvidence) : undefined);
  const acceptedExportsEvidence = Object.hasOwn(evidence, 'acceptedExportsEvidence')
    ? evidence.acceptedExportsEvidence
    : (Array.isArray(acceptedExportsManifest?.entries)
        && acceptedExportsManifest.entries.every((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
      ? buildAcceptedExportsEvidence(receipt, acceptedExportsManifest)
      : undefined);
  const acceptedExportsAuthenticationResult = Object.hasOwn(evidence, 'acceptedExportsAuthenticationResult')
    ? evidence.acceptedExportsAuthenticationResult
    : (acceptedExportsEvidence ? buildAcceptedExportsAuthenticationResult(acceptedExportsEvidence) : undefined);
  const executionGateEvidence = buildExecutionGateEvidence(receipt, validationContract);
  const executionGateAdmissions = Object.hasOwn(evidence, 'executionGateAdmissions')
    ? evidence.executionGateAdmissions
    : executionGateEvidence.admissions;
  const executionGateAuthenticationResults = Object.hasOwn(evidence, 'executionGateAuthenticationResults')
    ? evidence.executionGateAuthenticationResults
    : executionGateEvidence.results;
  const objectLockProviderEvidence = buildObjectLockProviderEvidence(receipt, objectLockReadback);
  const objectLockProviderAttestation = Object.hasOwn(evidence, 'objectLockProviderAttestation')
    ? evidence.objectLockProviderAttestation
    : objectLockProviderEvidence.attestation;
  const objectLockAuthenticationResult = Object.hasOwn(evidence, 'objectLockAuthenticationResult')
    ? evidence.objectLockAuthenticationResult
    : objectLockProviderEvidence.result;
  const restoreOutcomeAuthenticationResult = Object.hasOwn(evidence, 'restoreOutcomeAuthenticationResult')
    ? evidence.restoreOutcomeAuthenticationResult
    : buildRestoreOutcomeAuthenticationResult(receipt);
  return validateIndependentBackupReceipt(validationContract, receipt, {
    now: validationNow,
    acceptedExportsManifest,
    acceptedExportsEvidence,
    acceptedExportsAuthenticationResult,
    executionGateAdmissions,
    executionGateAuthenticationResults,
    objectLockReadback,
    objectLockProviderAttestation,
    objectLockAuthenticationResult,
    restoreOutcomeAuthenticationResult,
    storageInventoryEvidence,
    storageInventoryAuthenticationResult,
    storageBodyRecoveryReceipt,
    storageBodyRecoveryEvidence
  });
}

function bindObjectLockReadback(receipt, readback) {
  receipt.object_lock.readback_manifest_sha256 = sha256Hex(readback);
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
}

function bindAcceptedExportsEvidence(receipt, manifest, evidence, { refreshAuthentication = true } = {}) {
  if (refreshAuthentication && evidence?.authentication && typeof evidence.authentication === 'object' && !Array.isArray(evidence.authentication)) {
    evidence.authentication.verification_result_sha256 = buildAcceptedExportsAuthenticationResult(evidence).result_sha256;
  }
  manifest.source_evidence_sha256 = sha256Hex(evidence);
  receipt.monthly_selection.accepted_exports_manifest_sha256 = sha256Hex(manifest);
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
}

function bindAcceptedExportsAuthenticationResult(receipt, manifest, evidence, result) {
  signAcceptedExportsAuthenticationResult(result);
  evidence.authentication.verification_result_sha256 = result.result_sha256;
  bindAcceptedExportsEvidence(receipt, manifest, evidence, { refreshAuthentication: false });
}

function bindAcceptedExportsAuthenticationResultWithoutSigning(receipt, manifest, evidence, result) {
  result.result_sha256 = acceptedExportsAuthenticationResultDigest(result);
  evidence.authentication.verification_result_sha256 = result.result_sha256;
  bindAcceptedExportsEvidence(receipt, manifest, evidence, { refreshAuthentication: false });
}

function rebindTrustedAttestation(evidence, result, signatureDomain, { sign = true } = {}) {
  result.subject_sha256 = trustedAttestationSubjectDigest(evidence);
  if (sign) signTrustedAttestationResult(result, signatureDomain);
  else result.result_sha256 = trustedAttestationResultDigest(result);
  evidence.authentication.verification_result_sha256 = result.result_sha256;
}

function bindRestoreOutcomeAuthenticationResult(receipt, result, { sign = true } = {}) {
  result.subject_sha256 = independentBackupRestoreOutcomeSubjectDigest(receipt);
  if (sign) signTrustedAttestationResult(result, restoreOutcomeSignatureDomain);
  else result.result_sha256 = trustedAttestationResultDigest(result);
  receipt.restore.outcome_authentication.verification_result_sha256 = result.result_sha256;
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
}

function refreshAcceptedExportsEvidence(receipt, manifest, evidence) {
  for (const [index, entry] of evidence.entries.entries()) {
    entry.sequence = index;
    entry.previous_entry_sha256 = index === 0 ? null : evidence.entries[index - 1].entry_sha256;
    entry.entry_sha256 = acceptedExportHistoryEntryDigest(entry);
  }
  evidence.history.entry_count = evidence.entries.length;
  evidence.history.entries_manifest_sha256 = sha256Hex(evidence.entries);
  evidence.history.latest_entry_sha256 = evidence.entries.at(-1).entry_sha256;
  bindAcceptedExportsEvidence(receipt, manifest, evidence);
}

function buildAcceptedOrderInversion(receipt) {
  const manifest = buildAcceptedExportsManifest(receipt);
  manifest.entries.splice(1, 0, {
    completed_at: '2026-07-01T05:59:00Z',
    destination_version: 'backup-version-history-order-inversion',
    ciphertext_sha256: digest('prior-ciphertext-order-inversion')
  });
  const evidence = buildAcceptedExportsEvidence(receipt, manifest);
  evidence.entries[0].accepted_at = '2026-07-01T06:04:00Z';
  evidence.entries[0].retention_until = new Date(Date.parse(evidence.entries[0].completed_at) + 35 * 86400000).toISOString().replace('.000Z', 'Z');
  evidence.entries[1].accepted_at = '2026-07-01T06:00:00Z';
  evidence.entries[1].retention_until = new Date(Date.parse(evidence.entries[1].completed_at) + 400 * 86400000).toISOString().replace('.000Z', 'Z');
  refreshAcceptedExportsEvidence(receipt, manifest, evidence);
  return { manifest, evidence };
}

function bindStorageBodyRecoveryReceipt(receipt, storageReceipt) {
  const storage = receipt.coverage.find((entry) => entry.unit === 'storage_object_bodies');
  storage.private_digest = storageReceipt.denominator.buckets_manifest_sha256;
  storage.body_recovery_receipt_status = 'CURRENT';
  storage.body_recovery_receipt_sha256 = sha256Hex(storageReceipt);
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
}

function bindStorageBodyRecoveryEvidence(receipt, storageReceipt, recoveryEvidence) {
  storageReceipt.source_evidence_sha256 = storageBodyRecoveryEvidenceDigest(recoveryEvidence);
  bindStorageBodyRecoveryReceipt(receipt, storageReceipt);
}

test('source contract is closed, sanitized, and execution-blocked', () => {
  assert.deepEqual(validateIndependentBackupContract(sourceContract()), { ok: true, failures: [] });
  assert.equal(sourceContract().receipt_contract.accepted_exports_authentication.trust_anchor.status, 'BLOCKED');
  assert(validateIndependentBackupReceipt(sourceContract(), buildReceipt(), { now }).failures.includes('accepted exports authentication trust anchor is not CURRENT'));
  assert.deepEqual(validateIndependentBackupContract(contract()), { ok: true, failures: [] });
});

test('malformed contracts fail closed before receipt policy access without throwing', () => {
  const malformedTopLevels = [undefined, null, 'malformed', 7, true, [], {}];
  for (const [index, malformedContract] of malformedTopLevels.entries()) {
    let result;
    assert.doesNotThrow(() => {
      result = validateIndependentBackupReceipt(malformedContract, buildReceipt(), { now });
    }, `malformed top-level contract ${index} must not throw`);
    assert.equal(result.ok, false);
    assert(result.failures.some((failure) => failure === 'independent backup contract is missing' || failure.startsWith('independent backup contract schema')));
    assert.deepEqual(result, validateIndependentBackupReceipt(malformedContract, buildReceipt(), { now }));
  }

  const nestedMutations = [
    (value) => { delete value.policy; },
    (value) => { value.policy = null; },
    (value) => { value.policy = 'malformed'; },
    (value) => { value.policy = []; },
    (value) => { delete value.policy.schedule; },
    (value) => { value.policy.schedule = null; },
    (value) => { value.policy.schedule = 'malformed'; },
    (value) => { value.policy.schedule = []; },
    (value) => { value.policy.schedule = {}; },
    (value) => { delete value.policy.schedule.freshness_limit_hours; },
    (value) => { value.policy.schedule.freshness_limit_hours = null; },
    (value) => { value.policy.schedule.freshness_limit_hours = 'eight'; }
  ];
  for (const [index, mutate] of nestedMutations.entries()) {
    const malformedContract = contract();
    mutate(malformedContract);
    let result;
    assert.doesNotThrow(() => {
      result = validateIndependentBackupReceipt(malformedContract, buildReceipt(), { now });
    }, `malformed nested contract ${index} must not throw`);
    assert.equal(result.ok, false);
    assert(result.failures.some((failure) => failure.startsWith('independent backup contract schema')));
  }
});

test('malformed contract and receipt evidence returns combined deterministic failures', () => {
  const malformedContract = contract();
  malformedContract.policy.schedule = null;
  for (const [index, malformedReceipt] of [null, 'malformed', 7, true, [], {}].entries()) {
    let result;
    assert.doesNotThrow(() => {
      result = validateIndependentBackupReceipt(malformedContract, malformedReceipt, { now });
    }, `mixed malformed evidence ${index} must not throw`);
    assert.equal(result.ok, false);
    assert(result.failures.some((failure) => failure.startsWith('independent backup contract schema')));
    if (malformedReceipt === null) assert(result.failures.includes('backup receipt is missing'));
    else assert(result.failures.some((failure) => failure.startsWith('receipt schema')));
  }
});

test('canonical serialization and digest are byte-identical', () => {
  const receipt = buildReceipt();
  assert.equal(canonicalSerialize(receipt), canonicalSerialize(structuredClone(receipt)));
  assert.equal(independentBackupManifestDigest(receipt), independentBackupManifestDigest(structuredClone(receipt)));
});

test('complete current backup receipt validates', () => {
  assert.deepEqual(validate(buildReceipt()), { ok: true, failures: [] });
});

test('BACKUP_CURRENT rejects every non-null restore claim', () => {
  const cases = [
    ['valid', () => structuredClone(buildReceipt({ restore: true }).restore)],
    ['malformed', () => 'malformed'],
    ['partial', () => ({ status: 'CURRENT' })],
    ['mismatched', () => {
      const restore = structuredClone(buildReceipt({ restore: true }).restore);
      restore.target_project.source_project_sha256 = digest('different-source-project');
      return restore;
    }]
  ];

  for (const [label, buildRestore] of cases) {
    const receipt = buildReceipt();
    receipt.restore = buildRestore();
    receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
    let result;
    assert.doesNotThrow(() => { result = validate(receipt); }, `${label} BACKUP_CURRENT restore claim must not throw`);
    assert.equal(result.ok, false);
    assert(result.failures.includes('BACKUP_CURRENT must not include restore evidence'));
  }
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

test('receipt acceptance requires source-bound independently authenticated execution gates', () => {
  const missing = buildReceipt();
  const missingResult = validate(missing, now, buildAcceptedExportsManifest(missing), {
    executionGateAdmissions: [],
    executionGateAuthenticationResults: []
  });
  assert(missingResult.failures.includes('execution gate admission denominator mismatch'));
  assert(missingResult.failures.includes('execution gate authentication result denominator mismatch'));

  const preSnapshot = buildReceipt();
  const preSnapshotGate = buildExecutionGateEvidence(preSnapshot);
  assert(Date.parse(preSnapshotGate.admissions[0].issued_at) < Date.parse(preSnapshot.snapshot_at));
  assert(Date.parse(preSnapshotGate.results[0].verified_at) < Date.parse(preSnapshot.snapshot_at));
  assert.deepEqual(validate(preSnapshot, now, buildAcceptedExportsManifest(preSnapshot), {
    executionGateAdmissions: preSnapshotGate.admissions,
    executionGateAuthenticationResults: preSnapshotGate.results
  }), { ok: true, failures: [] });

  for (const [label, mutate, expected] of [
    ['wrong gate', (admission) => { admission.gate_id = 'restore_rehearsal'; admission.scope = 'restore_receipt'; }, 'does not match the source-owned gate policy'],
    ['wrong contract artifact', (admission) => { admission.contract_artifact_sha256 = digest('substituted-contract'); }, 'contract artifact mismatch'],
    ['wrong policy artifact', (admission) => { admission.policy_artifact_sha256 = digest('substituted-policy'); }, 'source policy artifact mismatch'],
    ['wrong source state', (admission) => { admission.source_state_sha256 = digest('substituted-source-state'); }, 'source-state mismatch'],
    ['wrong receipt ID', (admission) => { admission.receipt_identity.receipt_id = 'backup-receipt-other'; }, 'receipt identity mismatch'],
    ['wrong receipt digest', (admission) => { admission.receipt_identity.receipt_identity_sha256 = digest('other-receipt'); }, 'receipt identity mismatch'],
    ['wrong export', (admission) => { admission.export_identity.export_id = 'backup-export-other'; }, 'export identity mismatch'],
    ['cross-project replay', (admission) => { admission.project.ref = 'otherproject00000000'; }, 'project mismatch'],
    ['stale admission', (admission, result) => { admission.issued_at = '2026-07-18T09:59:59Z'; admission.expires_at = '2026-07-18T18:20:00Z'; result.verified_at = '2026-07-18T10:00:00Z'; }, 'is stale'],
    ['equal snapshot admission', (admission, result, receipt) => { admission.issued_at = receipt.snapshot_at; result.verified_at = receipt.snapshot_at; }, 'was not issued strictly before execution'],
    ['post-hoc admission', (admission, result) => { admission.issued_at = '2026-07-18T17:39:00Z'; result.verified_at = '2026-07-18T17:39:01Z'; }, 'was not issued strictly before execution'],
    ['future admission', (admission, result) => { admission.issued_at = '2026-07-18T18:01:00Z'; admission.expires_at = '2026-07-18T19:00:00Z'; result.verified_at = '2026-07-18T18:02:00Z'; }, 'cannot be future-dated'],
    ['self-correlated receipt', (_admission, result, receipt) => { result.external_receipt_sha256 = receipt.manifest_sha256; }, 'external receipt is self-correlated'],
    ['untrusted verifier', (_admission, result) => { result.verifier_reference = 'attacker-verifier'; }, 'signer does not match the pinned trust anchor']
  ]) {
    const receipt = buildReceipt();
    const gate = buildExecutionGateEvidence(receipt);
    mutate(gate.admissions[0], gate.results[0], receipt);
    rebindTrustedAttestation(gate.admissions[0], gate.results[0], executionGateSignatureDomain);
    const result = validate(receipt, now, buildAcceptedExportsManifest(receipt), {
      executionGateAdmissions: gate.admissions,
      executionGateAuthenticationResults: gate.results
    });
    assert(result.failures.some((failure) => failure.includes(expected)), `${label}: ${result.failures.join('; ')}`);
  }

  const malformed = buildReceipt();
  const malformedGate = buildExecutionGateEvidence(malformed);
  malformedGate.results[0].signature_base64 = 'not-a-signature';
  malformedGate.results[0].result_sha256 = trustedAttestationResultDigest(malformedGate.results[0]);
  malformedGate.admissions[0].authentication.verification_result_sha256 = malformedGate.results[0].result_sha256;
  const malformedResult = validate(malformed, now, buildAcceptedExportsManifest(malformed), {
    executionGateAdmissions: malformedGate.admissions,
    executionGateAuthenticationResults: malformedGate.results
  });
  assert(malformedResult.failures.some((failure) => failure.includes('signature is malformed')));

  const restore = buildReceipt({ restore: true });
  const restoreGate = buildExecutionGateEvidence(restore);
  assert.equal(restoreGate.admissions.length, 2);
  assert.deepEqual(validate(restore, now, buildAcceptedExportsManifest(restore), {
    executionGateAdmissions: restoreGate.admissions,
    executionGateAuthenticationResults: restoreGate.results
  }), { ok: true, failures: [] });
});

test('pre-restore admission binds an immutable plan and final outcome is authenticated separately', () => {
  const accepted = buildReceipt({ restore: true });
  const acceptedGate = buildExecutionGateEvidence(accepted);
  const acceptedOutcome = buildRestoreOutcomeAuthenticationResult(accepted);
  assert.deepEqual(validate(accepted, now, buildAcceptedExportsManifest(accepted), {
    executionGateAdmissions: acceptedGate.admissions,
    executionGateAuthenticationResults: acceptedGate.results,
    restoreOutcomeAuthenticationResult: acceptedOutcome
  }), { ok: true, failures: [] });

  const missingOutcome = buildReceipt({ restore: true });
  const missingOutcomeResult = validate(missingOutcome, now, buildAcceptedExportsManifest(missingOutcome), {
    restoreOutcomeAuthenticationResult: undefined
  });
  assert(missingOutcomeResult.failures.some((failure) => failure.startsWith('restore outcome authentication result schema')));

  const planTamper = buildReceipt({ restore: true });
  planTamper.restore.plan_identity.plan_sha256 = digest('substituted-restore-plan');
  planTamper.manifest_sha256 = independentBackupManifestDigest(planTamper);
  assert(validate(planTamper).failures.includes('restore outcome does not correlate to the admitted immutable plan'));

  const targetSwap = buildReceipt({ restore: true });
  const targetSwapGate = buildExecutionGateEvidence(targetSwap);
  const targetSwapOutcome = buildRestoreOutcomeAuthenticationResult(targetSwap);
  targetSwap.restore.target_project.ref = 'othertarget000000000';
  targetSwap.restore.plan_identity.plan_sha256 = independentBackupRestorePlanDigest(contract(), targetSwap);
  targetSwap.manifest_sha256 = independentBackupManifestDigest(targetSwap);
  const targetSwapResult = validate(targetSwap, now, buildAcceptedExportsManifest(targetSwap), {
    executionGateAdmissions: targetSwapGate.admissions,
    executionGateAuthenticationResults: targetSwapGate.results,
    restoreOutcomeAuthenticationResult: targetSwapOutcome
  });
  assert(targetSwapResult.failures.some((failure) => failure.includes('restore correlation mismatch')));
  assert(targetSwapResult.failures.includes('restore outcome authentication result subject mismatch'));

  const finalOutcomeTamper = buildReceipt({ restore: true });
  const admittedGate = buildExecutionGateEvidence(finalOutcomeTamper);
  const authenticatedBeforeTamper = buildRestoreOutcomeAuthenticationResult(finalOutcomeTamper);
  finalOutcomeTamper.restore.data_plane_ready_at = '2026-07-18T17:58:59Z';
  finalOutcomeTamper.restore.measured_data_plane_rto_seconds = 539;
  finalOutcomeTamper.manifest_sha256 = independentBackupManifestDigest(finalOutcomeTamper);
  const finalOutcomeResult = validate(finalOutcomeTamper, now, buildAcceptedExportsManifest(finalOutcomeTamper), {
    executionGateAdmissions: admittedGate.admissions,
    executionGateAuthenticationResults: admittedGate.results,
    restoreOutcomeAuthenticationResult: authenticatedBeforeTamper
  });
  assert(finalOutcomeResult.failures.includes('restore outcome authentication result subject mismatch'));

  const postHoc = buildReceipt({ restore: true });
  const postHocGate = buildExecutionGateEvidence(postHoc);
  const restoreAdmissionIndex = postHocGate.admissions.findIndex((entry) => entry.gate_id === 'restore_rehearsal');
  postHocGate.admissions[restoreAdmissionIndex].issued_at = postHoc.restore.restore_started_at;
  postHocGate.results[restoreAdmissionIndex].verified_at = postHoc.restore.restore_started_at;
  rebindTrustedAttestation(
    postHocGate.admissions[restoreAdmissionIndex],
    postHocGate.results[restoreAdmissionIndex],
    executionGateSignatureDomain
  );
  const postHocResult = validate(postHoc, now, buildAcceptedExportsManifest(postHoc), {
    executionGateAdmissions: postHocGate.admissions,
    executionGateAuthenticationResults: postHocGate.results
  });
  assert(postHocResult.failures.some((failure) => failure.includes('was not issued strictly before execution')));

  for (const [label, mutate, expected] of [
    ['untrusted signer', (result) => { result.key_id = 'attacker-key'; }, 'signer does not match the pinned trust anchor'],
    ['stale result', (result) => { result.verified_at = '2026-07-18T09:59:59Z'; }, 'is stale'],
    ['future result', (result) => { result.verified_at = '2026-07-18T18:00:01Z'; }, 'cannot be future-dated'],
    ['wrong plan identity', (result) => { result.evidence_id = 'restore-plan-other'; }, 'subject mismatch'],
    ['self-correlated result', (result, receipt) => { result.external_receipt_sha256 = receipt.restore.plan_identity.plan_sha256; }, 'external receipt is self-correlated']
  ]) {
    const receipt = buildReceipt({ restore: true });
    const result = buildRestoreOutcomeAuthenticationResult(receipt);
    mutate(result, receipt);
    bindRestoreOutcomeAuthenticationResult(receipt, result);
    const validation = validate(receipt, now, buildAcceptedExportsManifest(receipt), {
      restoreOutcomeAuthenticationResult: result
    });
    assert(validation.failures.some((failure) => failure.includes(expected)), `${label}: ${validation.failures.join('; ')}`);
  }

  const malformed = buildReceipt({ restore: true });
  const malformedResult = buildRestoreOutcomeAuthenticationResult(malformed);
  malformedResult.signature_base64 = 'not-a-signature';
  bindRestoreOutcomeAuthenticationResult(malformed, malformedResult, { sign: false });
  const malformedValidation = validate(malformed, now, buildAcceptedExportsManifest(malformed), {
    restoreOutcomeAuthenticationResult: malformedResult
  });
  assert(malformedValidation.failures.some((failure) => failure.includes('signature is malformed')));
});

test('Object Lock requires a provider-bound trusted attestation over exact immutable object state', () => {
  const missing = buildReceipt();
  const missingResult = validate(missing, now, buildAcceptedExportsManifest(missing), {
    objectLockProviderAttestation: undefined,
    objectLockAuthenticationResult: undefined
  });
  assert(missingResult.failures.some((failure) => failure.startsWith('Object Lock provider attestation schema')));
  assert(missingResult.failures.some((failure) => failure.startsWith('Object Lock authentication result schema')));

  for (const [label, mutate, expected] of [
    ['provider substitution', (attestation) => { attestation.provider_class = 'Other Provider'; }, 'provider/object identity mismatch'],
    ['bucket substitution', (attestation) => { attestation.bucket_identity_sha256 = digest('other-bucket'); }, 'provider/object identity mismatch'],
    ['object substitution', (attestation) => { attestation.object_identity_sha256 = digest('other-object'); }, 'provider/object identity mismatch'],
    ['version substitution', (attestation) => { attestation.object.destination_version = 'backup-version-other'; }, 'export/retention mismatch'],
    ['content substitution', (attestation) => { attestation.object.plaintext_sha256 = digest('other-plaintext'); }, 'export/retention mismatch'],
    ['ciphertext substitution', (attestation) => { attestation.object.ciphertext_sha256 = digest('other-ciphertext'); }, 'export/retention mismatch'],
    ['shortened retention', (attestation) => { attestation.object.retention_until = '2026-08-22T17:39:59Z'; }, 'export/retention mismatch'],
    ['stale evidence', (attestation, result) => { attestation.observed_at = '2026-07-18T09:59:59Z'; result.verified_at = '2026-07-18T10:00:00Z'; }, 'is stale'],
    ['future evidence', (attestation, result) => { attestation.observed_at = '2026-07-18T18:00:01Z'; result.verified_at = '2026-07-18T18:00:02Z'; }, 'cannot be future-dated'],
    ['wrong receipt', (attestation) => { attestation.receipt_manifest_sha256 = digest('other-receipt'); }, 'receipt/readback correlation mismatch'],
    ['replayed readback', (attestation) => { attestation.readback_manifest_sha256 = digest('other-readback'); }, 'receipt/readback correlation mismatch'],
    ['self-correlated receipt', (attestation, result, receipt) => { result.external_receipt_sha256 = receipt.object_lock.readback_manifest_sha256; }, 'external receipt is self-correlated'],
    ['untrusted key', (_attestation, result) => { result.key_id = 'attacker-key'; }, 'signer does not match the pinned trust anchor']
  ]) {
    const receipt = buildReceipt();
    const readback = buildObjectLockReadback(receipt);
    const provider = buildObjectLockProviderEvidence(receipt, readback);
    mutate(provider.attestation, provider.result, receipt);
    rebindTrustedAttestation(provider.attestation, provider.result, objectLockSignatureDomain);
    const result = validate(receipt, now, buildAcceptedExportsManifest(receipt), {
      objectLockReadback: readback,
      objectLockProviderAttestation: provider.attestation,
      objectLockAuthenticationResult: provider.result
    });
    assert(result.failures.some((failure) => failure.includes(expected)), `${label}: ${result.failures.join('; ')}`);
  }

  const malformed = buildReceipt();
  const readback = buildObjectLockReadback(malformed);
  const provider = buildObjectLockProviderEvidence(malformed, readback);
  provider.result.signature_base64 = 'not-a-signature';
  provider.result.result_sha256 = trustedAttestationResultDigest(provider.result);
  provider.attestation.authentication.verification_result_sha256 = provider.result.result_sha256;
  const malformedResult = validate(malformed, now, buildAcceptedExportsManifest(malformed), {
    objectLockReadback: readback,
    objectLockProviderAttestation: provider.attestation,
    objectLockAuthenticationResult: provider.result
  });
  assert(malformedResult.failures.some((failure) => failure.includes('signature is malformed')));
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

  const fabricatedPredecessor = buildReceipt();
  const fabricatedManifest = buildAcceptedExportsManifest(fabricatedPredecessor);
  fabricatedManifest.source_evidence_sha256 = digest('fabricated-predecessor-self-report');
  fabricatedPredecessor.monthly_selection.accepted_exports_manifest_sha256 = sha256Hex(fabricatedManifest);
  fabricatedPredecessor.manifest_sha256 = independentBackupManifestDigest(fabricatedPredecessor);
  const fabricatedResult = validate(fabricatedPredecessor, now, fabricatedManifest, { acceptedExportsEvidence: undefined });
  assert.equal(fabricatedResult.ok, false);
  assert(fabricatedResult.failures.some((failure) => failure.startsWith('accepted exports evidence schema')));
});

test('preceding monthly exports require authenticated complete chained evidence', () => {
  const makeCase = () => {
    const receipt = buildReceipt();
    const manifest = buildAcceptedExportsManifest(receipt);
    const evidence = buildAcceptedExportsEvidence(receipt, manifest);
    bindAcceptedExportsEvidence(receipt, manifest, evidence);
    return { receipt, manifest, evidence };
  };
  const valid = makeCase();
  assert.deepEqual(validate(valid.receipt, now, valid.manifest, { acceptedExportsEvidence: valid.evidence }), { ok: true, failures: [] });

  for (const malformed of [undefined, null, 'self-report', 7, true, [], {}]) {
    const candidate = makeCase();
    let result;
    assert.doesNotThrow(() => {
      result = validate(candidate.receipt, now, candidate.manifest, { acceptedExportsEvidence: malformed });
    });
    assert.equal(result.ok, false);
    assert(result.failures.some((failure) => failure.startsWith('accepted exports evidence schema')));
  }

  const projectMismatch = makeCase();
  projectMismatch.evidence.project.name = 'Different project';
  bindAcceptedExportsEvidence(projectMismatch.receipt, projectMismatch.manifest, projectMismatch.evidence);
  assert(validate(projectMismatch.receipt, now, projectMismatch.manifest, { acceptedExportsEvidence: projectMismatch.evidence }).failures.includes('accepted exports evidence project mismatch'));

  const policyMismatch = makeCase();
  policyMismatch.evidence.policy.full_export_interval_hours = 12;
  bindAcceptedExportsEvidence(policyMismatch.receipt, policyMismatch.manifest, policyMismatch.evidence);
  assert(validate(policyMismatch.receipt, now, policyMismatch.manifest, { acceptedExportsEvidence: policyMismatch.evidence }).failures.includes('accepted exports evidence policy denominator mismatch'));

  const incomplete = makeCase();
  incomplete.evidence.history.complete = false;
  bindAcceptedExportsEvidence(incomplete.receipt, incomplete.manifest, incomplete.evidence);
  assert(validate(incomplete.receipt, now, incomplete.manifest, { acceptedExportsEvidence: incomplete.evidence }).failures.includes('accepted exports evidence history is incomplete'));

  const countMismatch = makeCase();
  countMismatch.evidence.history.entry_count += 1;
  bindAcceptedExportsEvidence(countMismatch.receipt, countMismatch.manifest, countMismatch.evidence);
  assert(validate(countMismatch.receipt, now, countMismatch.manifest, { acceptedExportsEvidence: countMismatch.evidence }).failures.includes('accepted exports evidence history denominator mismatch'));

  const manifestDigestMismatch = makeCase();
  manifestDigestMismatch.evidence.history.entries_manifest_sha256 = digest('wrong-accepted-history');
  bindAcceptedExportsEvidence(manifestDigestMismatch.receipt, manifestDigestMismatch.manifest, manifestDigestMismatch.evidence);
  assert(validate(manifestDigestMismatch.receipt, now, manifestDigestMismatch.manifest, { acceptedExportsEvidence: manifestDigestMismatch.evidence }).failures.includes('accepted exports evidence history manifest digest mismatch'));

  const sequenceGap = makeCase();
  sequenceGap.evidence.entries[1].sequence = 3;
  bindAcceptedExportsEvidence(sequenceGap.receipt, sequenceGap.manifest, sequenceGap.evidence);
  assert(validate(sequenceGap.receipt, now, sequenceGap.manifest, { acceptedExportsEvidence: sequenceGap.evidence }).failures.includes('accepted exports evidence sequence contains a gap or ambiguity'));

  const brokenChain = makeCase();
  brokenChain.evidence.entries[1].previous_entry_sha256 = digest('unverifiable-predecessor');
  brokenChain.evidence.entries[1].entry_sha256 = acceptedExportHistoryEntryDigest(brokenChain.evidence.entries[1]);
  brokenChain.evidence.history.entries_manifest_sha256 = sha256Hex(brokenChain.evidence.entries);
  brokenChain.evidence.history.latest_entry_sha256 = brokenChain.evidence.entries.at(-1).entry_sha256;
  bindAcceptedExportsEvidence(brokenChain.receipt, brokenChain.manifest, brokenChain.evidence);
  assert(validate(brokenChain.receipt, now, brokenChain.manifest, { acceptedExportsEvidence: brokenChain.evidence }).failures.includes('accepted exports evidence predecessor chain is unverifiable'));

  const duplicate = makeCase();
  duplicate.evidence.entries[1].immutable_readback_sha256 = duplicate.evidence.entries[0].immutable_readback_sha256;
  refreshAcceptedExportsEvidence(duplicate.receipt, duplicate.manifest, duplicate.evidence);
  assert(validate(duplicate.receipt, now, duplicate.manifest, { acceptedExportsEvidence: duplicate.evidence }).failures.includes('accepted exports evidence entries are duplicate or ambiguous'));

  const mismatchedIdentity = makeCase();
  mismatchedIdentity.evidence.entries[0].destination_version = 'unlisted-export-version';
  refreshAcceptedExportsEvidence(mismatchedIdentity.receipt, mismatchedIdentity.manifest, mismatchedIdentity.evidence);
  assert(validate(mismatchedIdentity.receipt, now, mismatchedIdentity.manifest, { acceptedExportsEvidence: mismatchedIdentity.evidence }).failures.includes('accepted exports evidence entries do not match the accepted manifest'));

  const shortenedFirstRetention = makeCase();
  shortenedFirstRetention.evidence.entries[0].retention_until = new Date(Date.parse(shortenedFirstRetention.evidence.entries[0].completed_at) + 35 * 86400000).toISOString().replace('.000Z', 'Z');
  refreshAcceptedExportsEvidence(shortenedFirstRetention.receipt, shortenedFirstRetention.manifest, shortenedFirstRetention.evidence);
  assert(validate(shortenedFirstRetention.receipt, now, shortenedFirstRetention.manifest, { acceptedExportsEvidence: shortenedFirstRetention.evidence }).failures.includes('accepted exports evidence retention history violates policy'));

  const stale = makeCase();
  stale.manifest.observed_at = '2026-07-18T09:00:00Z';
  stale.evidence.observed_at = stale.manifest.observed_at;
  stale.evidence.history.window_ended_at = stale.manifest.observed_at;
  bindAcceptedExportsEvidence(stale.receipt, stale.manifest, stale.evidence);
  assert(validate(stale.receipt, now, stale.manifest, { acceptedExportsEvidence: stale.evidence }).failures.includes('accepted exports evidence is stale'));

  const future = makeCase();
  future.manifest.observed_at = '2026-07-18T18:00:01Z';
  future.evidence.observed_at = future.manifest.observed_at;
  future.evidence.history.window_ended_at = future.manifest.observed_at;
  bindAcceptedExportsEvidence(future.receipt, future.manifest, future.evidence);
  assert(validate(future.receipt, now, future.manifest, { acceptedExportsEvidence: future.evidence }).failures.includes('accepted exports evidence cannot be future-dated'));

  const tamperedEntry = makeCase();
  tamperedEntry.evidence.entries[0].entry_sha256 = digest('tampered-entry');
  tamperedEntry.evidence.history.entries_manifest_sha256 = sha256Hex(tamperedEntry.evidence.entries);
  bindAcceptedExportsEvidence(tamperedEntry.receipt, tamperedEntry.manifest, tamperedEntry.evidence);
  assert(validate(tamperedEntry.receipt, now, tamperedEntry.manifest, { acceptedExportsEvidence: tamperedEntry.evidence }).failures.includes('accepted exports evidence entry digest mismatch'));

  const circularAuthentication = makeCase();
  circularAuthentication.evidence.authentication.verification_result_sha256 = circularAuthentication.evidence.history.entries_manifest_sha256;
  bindAcceptedExportsEvidence(circularAuthentication.receipt, circularAuthentication.manifest, circularAuthentication.evidence, { refreshAuthentication: false });
  assert(validate(circularAuthentication.receipt, now, circularAuthentication.manifest, { acceptedExportsEvidence: circularAuthentication.evidence }).failures.includes('accepted exports evidence authentication is circular or self-reported'));

  const malformedAuthentication = makeCase();
  malformedAuthentication.evidence.authentication.verification_result_sha256 = 'not-a-digest';
  bindAcceptedExportsEvidence(malformedAuthentication.receipt, malformedAuthentication.manifest, malformedAuthentication.evidence, { refreshAuthentication: false });
  assert(validate(malformedAuthentication.receipt, now, malformedAuthentication.manifest, { acceptedExportsEvidence: malformedAuthentication.evidence }).failures.includes('accepted exports evidence authentication is incomplete'));
});

test('accepted export authentication requires a separately verified bound result', () => {
  const makeCase = () => {
    const receipt = buildReceipt();
    const manifest = buildAcceptedExportsManifest(receipt);
    const evidence = buildAcceptedExportsEvidence(receipt, manifest);
    const result = buildAcceptedExportsAuthenticationResult(evidence);
    bindAcceptedExportsAuthenticationResult(receipt, manifest, evidence, result);
    return { receipt, manifest, evidence, result };
  };

  const valid = makeCase();
  assert.deepEqual(validate(valid.receipt, now, valid.manifest, {
    acceptedExportsEvidence: valid.evidence,
    acceptedExportsAuthenticationResult: valid.result
  }), { ok: true, failures: [] });

  const missing = makeCase();
  const missingResult = validate(missing.receipt, now, missing.manifest, {
    acceptedExportsEvidence: missing.evidence,
    acceptedExportsAuthenticationResult: undefined
  });
  assert.equal(missingResult.ok, false);
  assert(missingResult.failures.some((failure) => failure.startsWith('accepted exports authentication result schema')));

  for (const malformed of [null, 'self-report', 7, true, [], {}, { status: 'VERIFIED' }]) {
    const candidate = makeCase();
    let result;
    assert.doesNotThrow(() => {
      result = validate(candidate.receipt, now, candidate.manifest, {
        acceptedExportsEvidence: candidate.evidence,
        acceptedExportsAuthenticationResult: malformed
      });
    });
    assert.equal(result.ok, false);
    assert(result.failures.some((failure) => failure.startsWith('accepted exports authentication result schema')));
  }

  const subjectMismatch = makeCase();
  subjectMismatch.result.subject_sha256 = digest('wrong-authentication-subject');
  bindAcceptedExportsAuthenticationResult(subjectMismatch.receipt, subjectMismatch.manifest, subjectMismatch.evidence, subjectMismatch.result);
  assert(validate(subjectMismatch.receipt, now, subjectMismatch.manifest, {
    acceptedExportsEvidence: subjectMismatch.evidence,
    acceptedExportsAuthenticationResult: subjectMismatch.result
  }).failures.includes('accepted exports authentication subject mismatch'));

  const projectMismatch = makeCase();
  projectMismatch.result.project.name = 'Different project';
  bindAcceptedExportsAuthenticationResult(projectMismatch.receipt, projectMismatch.manifest, projectMismatch.evidence, projectMismatch.result);
  assert(validate(projectMismatch.receipt, now, projectMismatch.manifest, {
    acceptedExportsEvidence: projectMismatch.evidence,
    acceptedExportsAuthenticationResult: projectMismatch.result
  }).failures.includes('accepted exports authentication result correlation mismatch'));

  const stale = makeCase();
  stale.result.verified_at = '2026-07-18T09:00:00Z';
  bindAcceptedExportsAuthenticationResult(stale.receipt, stale.manifest, stale.evidence, stale.result);
  assert(validate(stale.receipt, now, stale.manifest, {
    acceptedExportsEvidence: stale.evidence,
    acceptedExportsAuthenticationResult: stale.result
  }).failures.includes('accepted exports authentication result is stale'));

  const future = makeCase();
  future.result.verified_at = '2026-07-18T18:00:01Z';
  bindAcceptedExportsAuthenticationResult(future.receipt, future.manifest, future.evidence, future.result);
  assert(validate(future.receipt, now, future.manifest, {
    acceptedExportsEvidence: future.evidence,
    acceptedExportsAuthenticationResult: future.result
  }).failures.includes('accepted exports authentication result chronology is invalid'));

  const circularExternalReceipt = makeCase();
  circularExternalReceipt.result.external_receipt_sha256 = circularExternalReceipt.evidence.history.entries_manifest_sha256;
  bindAcceptedExportsAuthenticationResult(circularExternalReceipt.receipt, circularExternalReceipt.manifest, circularExternalReceipt.evidence, circularExternalReceipt.result);
  assert(validate(circularExternalReceipt.receipt, now, circularExternalReceipt.manifest, {
    acceptedExportsEvidence: circularExternalReceipt.evidence,
    acceptedExportsAuthenticationResult: circularExternalReceipt.result
  }).failures.includes('accepted exports authentication external receipt is circular or self-reported'));

  const tamperedResultDigest = makeCase();
  tamperedResultDigest.result.result_sha256 = digest('tampered-authentication-result');
  assert(validate(tamperedResultDigest.receipt, now, tamperedResultDigest.manifest, {
    acceptedExportsEvidence: tamperedResultDigest.evidence,
    acceptedExportsAuthenticationResult: tamperedResultDigest.result
  }).failures.includes('accepted exports authentication result digest mismatch'));
});

test('accepted export authentication is cryptographically bound to the pinned trust anchor', () => {
  const makeCase = () => {
    const receipt = buildReceipt();
    const manifest = buildAcceptedExportsManifest(receipt);
    const evidence = buildAcceptedExportsEvidence(receipt, manifest);
    const result = buildAcceptedExportsAuthenticationResult(evidence);
    bindAcceptedExportsAuthenticationResult(receipt, manifest, evidence, result);
    return { receipt, manifest, evidence, result };
  };

  const valid = makeCase();
  assert.deepEqual(validate(valid.receipt, now, valid.manifest, {
    acceptedExportsEvidence: valid.evidence,
    acceptedExportsAuthenticationResult: valid.result
  }), { ok: true, failures: [] });

  const untrustedVerifier = makeCase();
  untrustedVerifier.result.verifier_reference = 'untrusted-verifier';
  signAcceptedExportsAuthenticationResult(untrustedVerifier.result);
  bindAcceptedExportsAuthenticationResultWithoutSigning(untrustedVerifier.receipt, untrustedVerifier.manifest, untrustedVerifier.evidence, untrustedVerifier.result);
  assert(validate(untrustedVerifier.receipt, now, untrustedVerifier.manifest, {
    acceptedExportsEvidence: untrustedVerifier.evidence,
    acceptedExportsAuthenticationResult: untrustedVerifier.result
  }).failures.includes('accepted exports authentication signer does not match the pinned trust anchor'));

  const untrustedKey = makeCase();
  untrustedKey.result.key_id = 'untrusted-key';
  signAcceptedExportsAuthenticationResult(untrustedKey.result);
  bindAcceptedExportsAuthenticationResultWithoutSigning(untrustedKey.receipt, untrustedKey.manifest, untrustedKey.evidence, untrustedKey.result);
  assert(validate(untrustedKey.receipt, now, untrustedKey.manifest, {
    acceptedExportsEvidence: untrustedKey.evidence,
    acceptedExportsAuthenticationResult: untrustedKey.result
  }).failures.includes('accepted exports authentication signer does not match the pinned trust anchor'));

  const wrongAlgorithm = makeCase();
  wrongAlgorithm.result.signature_algorithm = 'RSA-PSS';
  bindAcceptedExportsAuthenticationResultWithoutSigning(wrongAlgorithm.receipt, wrongAlgorithm.manifest, wrongAlgorithm.evidence, wrongAlgorithm.result);
  assert(validate(wrongAlgorithm.receipt, now, wrongAlgorithm.manifest, {
    acceptedExportsEvidence: wrongAlgorithm.evidence,
    acceptedExportsAuthenticationResult: wrongAlgorithm.result
  }).failures.some((failure) => failure.includes('accepted exports authentication result schema /signature_algorithm')));

  const malformedKey = makeCase();
  const malformedKeyContract = contract();
  const malformedKeyBytes = Buffer.from([1, 2, 3, 4]);
  malformedKeyContract.receipt_contract.accepted_exports_authentication.trust_anchor.public_key_spki_base64 = malformedKeyBytes.toString('base64');
  malformedKeyContract.receipt_contract.accepted_exports_authentication.trust_anchor.public_key_spki_sha256 = crypto.createHash('sha256').update(malformedKeyBytes).digest('hex');
  assert(validate(malformedKey.receipt, now, malformedKey.manifest, {
    contract: malformedKeyContract,
    acceptedExportsEvidence: malformedKey.evidence,
    acceptedExportsAuthenticationResult: malformedKey.result
  }).failures.includes('accepted exports authentication trust anchor is malformed'));

  const mismatchedKeyDigest = makeCase();
  const mismatchedKeyContract = contract();
  mismatchedKeyContract.receipt_contract.accepted_exports_authentication.trust_anchor.public_key_spki_sha256 = digest('wrong-trust-anchor-key');
  assert(validate(mismatchedKeyDigest.receipt, now, mismatchedKeyDigest.manifest, {
    contract: mismatchedKeyContract,
    acceptedExportsEvidence: mismatchedKeyDigest.evidence,
    acceptedExportsAuthenticationResult: mismatchedKeyDigest.result
  }).failures.includes('accepted exports authentication trust anchor is malformed'));

  const alternatePublicKey = Buffer.from(`302a300506032b6570032100${'3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c'}`, 'hex');
  const untrustedPublicKey = makeCase();
  const untrustedPublicKeyContract = contract();
  untrustedPublicKeyContract.receipt_contract.accepted_exports_authentication.trust_anchor.public_key_spki_base64 = alternatePublicKey.toString('base64');
  untrustedPublicKeyContract.receipt_contract.accepted_exports_authentication.trust_anchor.public_key_spki_sha256 = crypto.createHash('sha256').update(alternatePublicKey).digest('hex');
  assert(validate(untrustedPublicKey.receipt, now, untrustedPublicKey.manifest, {
    contract: untrustedPublicKeyContract,
    acceptedExportsEvidence: untrustedPublicKey.evidence,
    acceptedExportsAuthenticationResult: untrustedPublicKey.result
  }).failures.includes('accepted exports authentication signature verification failed'));

  const malformedSignature = makeCase();
  malformedSignature.result.signature_base64 = 'not-a-signature';
  bindAcceptedExportsAuthenticationResultWithoutSigning(malformedSignature.receipt, malformedSignature.manifest, malformedSignature.evidence, malformedSignature.result);
  assert(validate(malformedSignature.receipt, now, malformedSignature.manifest, {
    acceptedExportsEvidence: malformedSignature.evidence,
    acceptedExportsAuthenticationResult: malformedSignature.result
  }).failures.includes('accepted exports authentication signature is malformed'));

  const badSignature = makeCase();
  const badSignatureBytes = Buffer.from(badSignature.result.signature_base64, 'base64');
  badSignatureBytes[0] ^= 1;
  badSignature.result.signature_base64 = badSignatureBytes.toString('base64');
  bindAcceptedExportsAuthenticationResultWithoutSigning(badSignature.receipt, badSignature.manifest, badSignature.evidence, badSignature.result);
  assert(validate(badSignature.receipt, now, badSignature.manifest, {
    acceptedExportsEvidence: badSignature.evidence,
    acceptedExportsAuthenticationResult: badSignature.result
  }).failures.includes('accepted exports authentication signature verification failed'));

  for (const [label, mutate] of [
    ['metadata', (candidate) => { candidate.result.result_id = 'substituted-result'; }],
    ['external receipt', (candidate) => { candidate.result.external_receipt_sha256 = digest('substituted-external-receipt'); }],
    ['evidence subject', (candidate) => { candidate.result.subject_sha256 = digest('substituted-evidence-subject'); }]
  ]) {
    const substituted = makeCase();
    mutate(substituted);
    bindAcceptedExportsAuthenticationResultWithoutSigning(substituted.receipt, substituted.manifest, substituted.evidence, substituted.result);
    const result = validate(substituted.receipt, now, substituted.manifest, {
      acceptedExportsEvidence: substituted.evidence,
      acceptedExportsAuthenticationResult: substituted.result
    });
    assert.equal(result.ok, false, `${label} substitution must fail`);
    assert(result.failures.includes('accepted exports authentication signed payload digest mismatch')
      || result.failures.includes('accepted exports authentication signature verification failed')
      || result.failures.includes('accepted exports authentication subject mismatch'));
  }

  const selfAsserted = makeCase();
  selfAsserted.result.signature_base64 = null;
  bindAcceptedExportsAuthenticationResultWithoutSigning(selfAsserted.receipt, selfAsserted.manifest, selfAsserted.evidence, selfAsserted.result);
  assert(validate(selfAsserted.receipt, now, selfAsserted.manifest, {
    acceptedExportsEvidence: selfAsserted.evidence,
    acceptedExportsAuthenticationResult: selfAsserted.result
  }).failures.includes('accepted exports authentication signature is malformed'));
});

test('accepted export cadence covers UTC month boundaries and every six-hour interval', () => {
  const makeCase = () => {
    const receipt = buildReceipt();
    const manifest = buildAcceptedExportsManifest(receipt);
    const evidence = buildAcceptedExportsEvidence(receipt, manifest);
    refreshAcceptedExportsEvidence(receipt, manifest, evidence);
    return { receipt, manifest, evidence };
  };

  const exactBoundary = makeCase();
  assert.equal(Date.parse(exactBoundary.evidence.entries[0].accepted_at) - Date.parse(exactBoundary.evidence.history.window_started_at), 6 * 3600000);
  assert.deepEqual(validate(exactBoundary.receipt, now, exactBoundary.manifest, { acceptedExportsEvidence: exactBoundary.evidence }), { ok: true, failures: [] });

  const lateFirst = makeCase();
  lateFirst.evidence.entries[0].accepted_at = '2026-07-01T06:00:01Z';
  refreshAcceptedExportsEvidence(lateFirst.receipt, lateFirst.manifest, lateFirst.evidence);
  assert(validate(lateFirst.receipt, now, lateFirst.manifest, { acceptedExportsEvidence: lateFirst.evidence }).failures.includes('accepted exports evidence cadence exceeds full_export_interval_hours'));

  const adjacentGap = makeCase();
  adjacentGap.evidence.entries[10].accepted_at = new Date(Date.parse(adjacentGap.evidence.entries[10].accepted_at) + 1000).toISOString().replace('.000Z', 'Z');
  refreshAcceptedExportsEvidence(adjacentGap.receipt, adjacentGap.manifest, adjacentGap.evidence);
  assert(validate(adjacentGap.receipt, now, adjacentGap.manifest, { acceptedExportsEvidence: adjacentGap.evidence }).failures.includes('accepted exports evidence cadence exceeds full_export_interval_hours'));

  const callerOrder = makeCase();
  const callerOrderInversion = buildAcceptedOrderInversion(callerOrder.receipt);
  assert.deepEqual(validate(callerOrder.receipt, now, callerOrderInversion.manifest, { acceptedExportsEvidence: callerOrderInversion.evidence }), { ok: true, failures: [] });

  const duplicate = makeCase();
  duplicate.evidence.entries[10].accepted_at = duplicate.evidence.entries[9].accepted_at;
  refreshAcceptedExportsEvidence(duplicate.receipt, duplicate.manifest, duplicate.evidence);
  assert(validate(duplicate.receipt, now, duplicate.manifest, { acceptedExportsEvidence: duplicate.evidence }).failures.includes('accepted exports evidence acceptance chronology is duplicate or ambiguous'));

  const monthRollover = makeCase();
  monthRollover.evidence.entries.at(-1).accepted_at = '2026-08-01T00:00:00Z';
  refreshAcceptedExportsEvidence(monthRollover.receipt, monthRollover.manifest, monthRollover.evidence);
  assert(validate(monthRollover.receipt, '2026-08-01T00:05:00Z', monthRollover.manifest, { acceptedExportsEvidence: monthRollover.evidence }).failures.includes('accepted exports evidence cadence exceeds full_export_interval_hours'));

  const empty = makeCase();
  empty.evidence.entries = [];
  empty.evidence.history.entry_count = 0;
  empty.evidence.history.entries_manifest_sha256 = sha256Hex([]);
  empty.evidence.history.latest_entry_sha256 = null;
  bindAcceptedExportsEvidence(empty.receipt, empty.manifest, empty.evidence);
  let emptyResult;
  assert.doesNotThrow(() => {
    emptyResult = validate(empty.receipt, now, empty.manifest, { acceptedExportsEvidence: empty.evidence });
  });
  assert.equal(emptyResult.ok, false);
  assert(emptyResult.failures.some((failure) => failure.startsWith('accepted exports evidence schema /entries')));

  const nonArray = makeCase();
  nonArray.evidence.entries = null;
  assert.doesNotThrow(() => validate(nonArray.receipt, now, nonArray.manifest, { acceptedExportsEvidence: nonArray.evidence }));
});

test('accepted export completion cadence independently covers month adjacent and observation boundaries', () => {
  const makeCase = () => {
    const receipt = buildReceipt();
    const manifest = buildAcceptedExportsManifest(receipt);
    const evidence = buildAcceptedExportsEvidence(receipt, manifest);
    refreshAcceptedExportsEvidence(receipt, manifest, evidence);
    return { receipt, manifest, evidence };
  };
  const setCompletion = (candidate, index, completedAt, retentionDays = index === 0 ? 400 : 35) => {
    candidate.manifest.entries[index].completed_at = completedAt;
    candidate.evidence.entries[index].completed_at = completedAt;
    const parsed = Date.parse(completedAt);
    if (Number.isFinite(parsed)) candidate.evidence.entries[index].retention_until = new Date(parsed + retentionDays * 86400000).toISOString().replace('.000Z', 'Z');
    refreshAcceptedExportsEvidence(candidate.receipt, candidate.manifest, candidate.evidence);
  };
  const completionFailures = (candidate, validationNow = now) => validate(candidate.receipt, validationNow, candidate.manifest, {
    acceptedExportsEvidence: candidate.evidence
  }).failures;

  const exactBoundary = makeCase();
  setCompletion(exactBoundary, 0, '2026-07-01T06:00:00Z');
  assert.equal(Date.parse(exactBoundary.evidence.entries[0].completed_at) - Date.parse(exactBoundary.evidence.history.window_started_at), 6 * 3600000);
  assert.deepEqual(completionFailures(exactBoundary), []);

  const boundaryPlusOne = makeCase();
  const boundaryIndex = 10;
  setCompletion(boundaryPlusOne, boundaryIndex, new Date(Date.parse(boundaryPlusOne.evidence.entries[boundaryIndex].completed_at) + 1000).toISOString().replace('.000Z', 'Z'));
  const boundaryFailures = completionFailures(boundaryPlusOne);
  assert(boundaryFailures.includes('accepted exports evidence completion cadence exceeds full_export_interval_hours'));
  assert(!boundaryFailures.includes('accepted exports evidence cadence exceeds full_export_interval_hours'));

  const delayedAcceptanceSubstitution = makeCase();
  const priorCompletion = Date.parse(delayedAcceptanceSubstitution.evidence.entries[boundaryIndex - 1].completed_at);
  setCompletion(delayedAcceptanceSubstitution, boundaryIndex, new Date(priorCompletion + 60000).toISOString().replace('.000Z', 'Z'));
  const delayedFailures = completionFailures(delayedAcceptanceSubstitution);
  assert(delayedFailures.includes('accepted exports evidence completion cadence exceeds full_export_interval_hours'));
  assert(!delayedFailures.includes('accepted exports evidence cadence exceeds full_export_interval_hours'));

  const malformed = makeCase();
  setCompletion(malformed, boundaryIndex, 'not-a-timestamp');
  const malformedFailures = completionFailures(malformed);
  assert(malformedFailures.some((failure) => failure.includes('accepted_exports_manifest.entries.completed_at') && failure.includes('invalid UTC timestamp')));
  assert(malformedFailures.includes('accepted exports evidence completion cadence exceeds full_export_interval_hours'));

  const nonMonotonic = makeCase();
  setCompletion(nonMonotonic, boundaryIndex, new Date(Date.parse(nonMonotonic.evidence.entries[boundaryIndex - 1].completed_at) - 1000).toISOString().replace('.000Z', 'Z'));
  assert(completionFailures(nonMonotonic).includes('accepted exports evidence completion cadence exceeds full_export_interval_hours'));

  const duplicate = makeCase();
  setCompletion(duplicate, boundaryIndex, duplicate.evidence.entries[boundaryIndex - 1].completed_at);
  const duplicateFailures = completionFailures(duplicate);
  assert(duplicateFailures.includes('accepted exports evidence completion chronology is duplicate or ambiguous'));
  assert(duplicateFailures.includes('accepted exports evidence completion cadence exceeds full_export_interval_hours'));

  const monthRollover = makeCase();
  setCompletion(monthRollover, 0, '2026-06-30T23:59:59Z');
  assert(completionFailures(monthRollover).includes('accepted exports evidence completion cadence exceeds full_export_interval_hours'));

  const observationTail = buildReceipt();
  observationTail.snapshot_at = '2026-07-18T11:34:00Z';
  observationTail.completed_at = '2026-07-18T11:44:00Z';
  observationTail.object_lock.readback_manifest_sha256 = sha256Hex(buildObjectLockReadback(observationTail));
  const tailManifest = buildAcceptedExportsManifest(observationTail);
  const tailEvidence = buildAcceptedExportsEvidence(observationTail, tailManifest);
  refreshAcceptedExportsEvidence(observationTail, tailManifest, tailEvidence);
  const tailFailures = validate(observationTail, now, tailManifest, { acceptedExportsEvidence: tailEvidence }).failures;
  assert(tailFailures.includes('accepted exports evidence completion cadence exceeds full_export_interval_hours'));
  assert(!tailFailures.includes('accepted exports evidence cadence exceeds full_export_interval_hours'));
});

test('first monthly retention follows accepted_at rather than completion or caller order', () => {
  const reordered = buildReceipt();
  const reorderedHistory = buildAcceptedOrderInversion(reordered);
  assert.deepEqual(validate(reordered, now, reorderedHistory.manifest, { acceptedExportsEvidence: reorderedHistory.evidence }), { ok: true, failures: [] });

  const shortenedAcceptedFirst = buildReceipt();
  const shortenedHistory = buildAcceptedOrderInversion(shortenedAcceptedFirst);
  shortenedHistory.evidence.entries[1].retention_until = new Date(Date.parse(shortenedHistory.evidence.entries[1].completed_at) + 35 * 86400000).toISOString().replace('.000Z', 'Z');
  refreshAcceptedExportsEvidence(shortenedAcceptedFirst, shortenedHistory.manifest, shortenedHistory.evidence);
  const shortenedResult = validate(shortenedAcceptedFirst, now, shortenedHistory.manifest, { acceptedExportsEvidence: shortenedHistory.evidence });
  assert(shortenedResult.failures.includes('accepted exports evidence retention history violates policy'));

  const duplicateAcceptance = buildReceipt();
  const duplicateManifest = buildAcceptedExportsManifest(duplicateAcceptance);
  const duplicateEvidence = buildAcceptedExportsEvidence(duplicateAcceptance, duplicateManifest);
  duplicateEvidence.entries[0].accepted_at = '2026-07-18T17:41:00Z';
  duplicateEvidence.entries[1].accepted_at = '2026-07-18T17:41:00Z';
  refreshAcceptedExportsEvidence(duplicateAcceptance, duplicateManifest, duplicateEvidence);
  assert(validate(duplicateAcceptance, now, duplicateManifest, { acceptedExportsEvidence: duplicateEvidence }).failures.includes('accepted exports evidence acceptance chronology is duplicate or ambiguous'));
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

test('watchdog and Physical backup evidence is project-bound and fresh at the validation clock', () => {
  const boundary = buildReceipt();
  boundary.watchdog.observed_at = boundary.completed_at;
  boundary.provider_physical_backup.observed_at = boundary.completed_at;
  boundary.manifest_sha256 = independentBackupManifestDigest(boundary);
  assert.deepEqual(validate(boundary), { ok: true, failures: [] });

  for (const field of ['watchdog', 'provider_physical_backup']) {
    const missing = buildReceipt();
    delete missing[field].observed_at;
    missing.manifest_sha256 = independentBackupManifestDigest(missing);
    const missingResult = validate(missing);
    assert.equal(missingResult.ok, false);
    assert(missingResult.failures.some((failure) => failure.includes(`${field}.observed_at`) && failure.includes('invalid UTC timestamp')));

    const malformed = buildReceipt();
    malformed[field].observed_at = 'not-a-timestamp';
    malformed.manifest_sha256 = independentBackupManifestDigest(malformed);
    assert(validate(malformed).failures.some((failure) => failure.includes(`${field}.observed_at`) && failure.includes('invalid UTC timestamp')));

    const future = buildReceipt();
    future[field].observed_at = '2026-07-18T18:00:01Z';
    future.manifest_sha256 = independentBackupManifestDigest(future);
    const futureMessage = field === 'watchdog'
      ? 'independent watchdog evidence cannot be future-dated'
      : 'provider Physical backup evidence cannot be future-dated';
    assert(validate(future).failures.includes(futureMessage));

    const stale = buildReceipt();
    stale[field].observed_at = '2026-07-18T09:59:59Z';
    stale.manifest_sha256 = independentBackupManifestDigest(stale);
    const staleMessage = field === 'watchdog'
      ? 'independent watchdog evidence is stale'
      : 'provider Physical backup evidence is stale';
    assert(validate(stale).failures.includes(staleMessage));

    const predatesCompletion = buildReceipt();
    predatesCompletion[field].observed_at = '2026-07-18T17:39:59Z';
    predatesCompletion.manifest_sha256 = independentBackupManifestDigest(predatesCompletion);
    const chronologyMessage = field === 'watchdog'
      ? 'independent watchdog evidence predates backup completion'
      : 'provider Physical backup evidence predates backup completion';
    assert(validate(predatesCompletion).failures.includes(chronologyMessage));

    const wrongProject = buildReceipt();
    wrongProject[field].project.ref = 'differentproject00001';
    wrongProject.manifest_sha256 = independentBackupManifestDigest(wrongProject);
    const correlationMessage = field === 'watchdog'
      ? 'independent watchdog project correlation mismatch'
      : 'provider Physical backup project correlation mismatch';
    assert(validate(wrongProject).failures.includes(correlationMessage));
  }
});

test('restore rehearsal requires a distinct sanitized target correlated to the source project', () => {
  assert.deepEqual(validate(buildReceipt({ restore: true })), { ok: true, failures: [] });

  const missing = buildReceipt({ restore: true });
  delete missing.restore.target_project;
  missing.manifest_sha256 = independentBackupManifestDigest(missing);
  assert(validate(missing).failures.includes('restore target project identity is missing or malformed'));

  for (const target of [
    { name: 'unsafe/project', ref: 'restoretarget0000000', source_project_sha256: digest('source-project') },
    { name: 'Fawxzzy restore rehearsal', ref: 'short', source_project_sha256: digest('source-project') },
    { name: 'Fawxzzy restore rehearsal', ref: 'restoretarget0000000', source_project_sha256: 'malformed' }
  ]) {
    const malformed = buildReceipt({ restore: true });
    malformed.restore.target_project = target;
    malformed.manifest_sha256 = independentBackupManifestDigest(malformed);
    assert.equal(validate(malformed).ok, false);
  }

  const sameTarget = buildReceipt({ restore: true });
  sameTarget.restore.target_project.name = sameTarget.project.name;
  sameTarget.restore.target_project.ref = sameTarget.project.ref;
  sameTarget.restore.target_project.source_project_sha256 = sha256Hex(sameTarget.project);
  sameTarget.manifest_sha256 = independentBackupManifestDigest(sameTarget);
  assert(validate(sameTarget).failures.includes('restore target project must be distinct from the source project'));

  const mismatchedCorrelation = buildReceipt({ restore: true });
  mismatchedCorrelation.restore.target_project.source_project_sha256 = digest('other-source-project');
  mismatchedCorrelation.manifest_sha256 = independentBackupManifestDigest(mismatchedCorrelation);
  assert(validate(mismatchedCorrelation).failures.includes('restore target source-project correlation mismatch'));
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

test('Storage body recovery receipt cannot authenticate itself', () => {
  const receipt = buildReceipt({ storageObjectCount: 2 });
  const recoveryReceipt = buildStorageBodyRecoveryReceipt(receipt);
  recoveryReceipt.source_evidence_sha256 = recoveryReceipt.denominator.buckets_manifest_sha256;
  bindStorageBodyRecoveryReceipt(receipt, recoveryReceipt);
  const result = validate(receipt, now, buildAcceptedExportsManifest(receipt), { storageBodyRecoveryReceipt: recoveryReceipt });
  assert(result.failures.includes('Storage body recovery source evidence is self-correlated'));
});

test('Storage body recovery requires independent current correlated evidence', () => {
  const accepted = buildReceipt({ storageObjectCount: 2 });
  const acceptedReceipt = buildStorageBodyRecoveryReceipt(accepted);
  const acceptedEvidence = buildStorageBodyRecoveryEvidence(accepted, acceptedReceipt);
  bindStorageBodyRecoveryEvidence(accepted, acceptedReceipt, acceptedEvidence);
  assert.deepEqual(validate(accepted, now, buildAcceptedExportsManifest(accepted), {
    storageBodyRecoveryReceipt: acceptedReceipt,
    storageBodyRecoveryEvidence: acceptedEvidence
  }), { ok: true, failures: [] });

  for (const [index, malformedEvidence] of [undefined, null, 'malformed', [], { denominator: null }].entries()) {
    const receipt = buildReceipt({ storageObjectCount: 2 });
    const recoveryReceipt = buildStorageBodyRecoveryReceipt(receipt);
    let result;
    assert.doesNotThrow(() => {
      result = validate(receipt, now, buildAcceptedExportsManifest(receipt), {
        storageBodyRecoveryReceipt: recoveryReceipt,
        storageBodyRecoveryEvidence: malformedEvidence
      });
    }, `malformed independent Storage recovery evidence ${index} must not throw`);
    assert.equal(result.ok, false);
    assert(result.failures.some((failure) => failure.startsWith('Storage body recovery evidence schema')));
    assert(result.failures.includes('Storage body recovery source evidence digest mismatch'));
  }

  const validateMutation = (mutate) => {
    const receipt = buildReceipt({ storageObjectCount: 2 });
    const recoveryReceipt = buildStorageBodyRecoveryReceipt(receipt);
    const recoveryEvidence = buildStorageBodyRecoveryEvidence(receipt, recoveryReceipt);
    mutate(recoveryEvidence, recoveryReceipt, receipt);
    bindStorageBodyRecoveryEvidence(receipt, recoveryReceipt, recoveryEvidence);
    return validate(receipt, now, buildAcceptedExportsManifest(receipt), {
      storageBodyRecoveryReceipt: recoveryReceipt,
      storageBodyRecoveryEvidence: recoveryEvidence
    });
  };

  assert(validateMutation((evidence) => { evidence.observed_at = '2026-07-18T09:59:59Z'; }).failures.includes('Storage body recovery evidence is stale'));
  assert(validateMutation((evidence) => { evidence.observed_at = '2026-07-18T18:00:01Z'; }).failures.includes('Storage body recovery evidence cannot be future-dated'));
  assert(validateMutation((evidence) => { evidence.project.name = 'Another project'; }).failures.includes('Storage body recovery evidence project mismatch'));
  assert(validateMutation((evidence) => { evidence.snapshot_at = '2026-07-18T17:29:59Z'; }).failures.includes('Storage body recovery evidence snapshot mismatch'));
  assert(validateMutation((evidence) => { evidence.export_identity.destination_version = 'backup-version-other'; }).failures.includes('Storage body recovery evidence export identity mismatch'));
  assert(validateMutation((evidence) => { evidence.restore_identity.receipt_sha256 = digest('other-restore-receipt'); }).failures.includes('Storage body recovery evidence restore identity mismatch'));
  assert(validateMutation((evidence) => { evidence.denominator.object_count = 1; }).failures.includes('Storage body recovery evidence denominator mismatch'));
  assert(validateMutation((evidence) => { evidence.ambiguous_claim = true; }).failures.some((failure) => failure.startsWith('Storage body recovery evidence schema') && failure.includes('must NOT have additional properties')));

  const digestOnly = buildReceipt({ storageObjectCount: 2 });
  const digestOnlyReceipt = buildStorageBodyRecoveryReceipt(digestOnly);
  digestOnlyReceipt.source_evidence_sha256 = digest('arbitrary-digest-only-claim');
  bindStorageBodyRecoveryReceipt(digestOnly, digestOnlyReceipt);
  const digestOnlyResult = validate(digestOnly, now, buildAcceptedExportsManifest(digestOnly), {
    storageBodyRecoveryReceipt: digestOnlyReceipt,
    storageBodyRecoveryEvidence: null
  });
  assert(digestOnlyResult.failures.some((failure) => failure.startsWith('Storage body recovery evidence schema')));
  assert(digestOnlyResult.failures.includes('Storage body recovery source evidence digest mismatch'));

  const circular = buildReceipt({ storageObjectCount: 2 });
  const circularReceipt = buildStorageBodyRecoveryReceipt(circular);
  const circularPayload = { ...circularReceipt };
  delete circularPayload.source_evidence_sha256;
  circularReceipt.source_evidence_sha256 = sha256Hex(circularPayload);
  bindStorageBodyRecoveryReceipt(circular, circularReceipt);
  const circularResult = validate(circular, now, buildAcceptedExportsManifest(circular), {
    storageBodyRecoveryReceipt: circularReceipt,
    storageBodyRecoveryEvidence: buildStorageBodyRecoveryEvidence(circular, circularReceipt)
  });
  assert(circularResult.failures.includes('Storage body recovery source evidence is self-correlated'));

  const manifestReuse = buildReceipt({ storageObjectCount: 2 });
  const manifestReuseReceipt = buildStorageBodyRecoveryReceipt(manifestReuse);
  manifestReuseReceipt.source_evidence_sha256 = manifestReuse.manifest_sha256;
  bindStorageBodyRecoveryReceipt(manifestReuse, manifestReuseReceipt);
  manifestReuse.manifest_sha256 = manifestReuseReceipt.source_evidence_sha256;
  const manifestReuseResult = validate(manifestReuse, now, buildAcceptedExportsManifest(manifestReuse), {
    storageBodyRecoveryReceipt: manifestReuseReceipt,
    storageBodyRecoveryEvidence: buildStorageBodyRecoveryEvidence(manifestReuse, manifestReuseReceipt)
  });
  assert(manifestReuseResult.failures.includes('Storage body recovery source evidence is self-correlated'));

  const duplicateClass = buildReceipt({ storageObjectCount: 2 });
  const duplicateClassReceipt = buildStorageBodyRecoveryReceipt(duplicateClass);
  duplicateClassReceipt.source_evidence_sha256 = buildStorageInventoryEvidence(duplicateClass).source_evidence_sha256;
  bindStorageBodyRecoveryReceipt(duplicateClass, duplicateClassReceipt);
  const duplicateClassResult = validate(duplicateClass, now, buildAcceptedExportsManifest(duplicateClass), {
    storageBodyRecoveryReceipt: duplicateClassReceipt,
    storageBodyRecoveryEvidence: buildStorageBodyRecoveryEvidence(duplicateClass, duplicateClassReceipt)
  });
  assert(duplicateClassResult.failures.includes('Storage body recovery source evidence must be distinct from other evidence'));
});

test('Storage body status, count, and digest are bound to the authoritative denominator', () => {
  assert.deepEqual(validate(buildReceipt()), { ok: true, failures: [] });

  const zeroCurrent = buildReceipt();
  const zeroCurrentStorage = zeroCurrent.coverage.find((entry) => entry.unit === 'storage_object_bodies');
  const zeroBucketReceipt = buildStorageBodyRecoveryReceipt(zeroCurrent);
  zeroCurrentStorage.status = 'CURRENT';
  bindStorageBodyRecoveryReceipt(zeroCurrent, zeroBucketReceipt);
  const zeroCurrentResult = validate(zeroCurrent, now, buildAcceptedExportsManifest(zeroCurrent), { storageBodyRecoveryReceipt: zeroBucketReceipt });
  assert.equal(zeroCurrentResult.ok, false);
  assert(zeroCurrentResult.failures.includes('Storage body coverage state contradicts its authoritative denominator'));

  const zeroContradictions = [
    { status: 'NOT_APPLICABLE', aggregate_count: 0, private_digest: digest('empty-storage'), body_recovery_receipt_status: 'NOT_APPLICABLE', body_recovery_receipt_sha256: null },
    { status: null, aggregate_count: 0, private_digest: null, body_recovery_receipt_status: 'NOT_APPLICABLE', body_recovery_receipt_sha256: null },
    { status: 'NOT_APPLICABLE', private_digest: null, body_recovery_receipt_status: 'NOT_APPLICABLE', body_recovery_receipt_sha256: null },
    { status: 'NOT_APPLICABLE', aggregate_count: 'zero', private_digest: null, body_recovery_receipt_status: 'NOT_APPLICABLE', body_recovery_receipt_sha256: null },
    { status: 'NOT_APPLICABLE', aggregate_count: 0, private_digest: 'malformed', body_recovery_receipt_status: 'NOT_APPLICABLE', body_recovery_receipt_sha256: null },
    { status: 'NOT_APPLICABLE', aggregate_count: 0, private_digest: null, body_recovery_receipt_status: 'CURRENT', body_recovery_receipt_sha256: digest('empty-claim') },
    { status: 'NOT_APPLICABLE', aggregate_count: 0, private_digest: null, body_recovery_receipt_status: 'NOT_APPLICABLE', body_recovery_receipt_sha256: digest('empty-claim') },
    { status: 'NOT_APPLICABLE', aggregate_count: 2, private_digest: digest('positive-not-applicable'), body_recovery_receipt_status: 'NOT_APPLICABLE', body_recovery_receipt_sha256: null }
  ];

  for (const [index, contradiction] of zeroContradictions.entries()) {
    const receipt = buildReceipt();
    const storage = receipt.coverage.find((entry) => entry.unit === 'storage_object_bodies');
    Object.keys(storage).forEach((key) => { delete storage[key]; });
    Object.assign(storage, { unit: 'storage_object_bodies' }, contradiction);
    receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
    let result;
    assert.doesNotThrow(() => { result = validate(receipt); }, `Storage contradiction ${index} must not throw`);
    assert.equal(result.ok, false);
    assert(result.failures.includes('Storage body coverage state contradicts its authoritative denominator'));
  }

  const positiveNotApplicable = buildReceipt({ storageObjectCount: 2 });
  const positiveStorage = positiveNotApplicable.coverage.find((entry) => entry.unit === 'storage_object_bodies');
  positiveStorage.status = 'NOT_APPLICABLE';
  positiveStorage.private_digest = null;
  positiveStorage.body_recovery_receipt_status = 'NOT_APPLICABLE';
  positiveStorage.body_recovery_receipt_sha256 = null;
  positiveNotApplicable.manifest_sha256 = independentBackupManifestDigest(positiveNotApplicable);
  assert(validate(positiveNotApplicable).failures.includes('Storage body coverage state contradicts its authoritative denominator'));

  assert.deepEqual(validate(buildReceipt({ storageObjectCount: 2 })), { ok: true, failures: [] });
});

test('every Storage denominator requires independent current inventory evidence', () => {
  const empty = buildReceipt();
  const emptyEvidence = buildStorageInventoryEvidence(empty);
  const emptyAuthenticationResult = buildStorageInventoryAuthenticationResult(emptyEvidence);
  assert.deepEqual(validate(empty, now, buildAcceptedExportsManifest(empty), {
    storageInventoryEvidence: emptyEvidence,
    storageInventoryAuthenticationResult: emptyAuthenticationResult
  }), { ok: true, failures: [] });
  assert.equal(emptyEvidence.denominator.inventory_manifest_sha256, storageInventoryManifestDigest(emptyEvidence));
  assert.equal(storageInventoryManifestDigest(emptyEvidence), storageInventoryManifestDigest(structuredClone(emptyEvidence)));

  const missingAuthentication = validate(empty, now, buildAcceptedExportsManifest(empty), {
    storageInventoryEvidence: emptyEvidence,
    storageInventoryAuthenticationResult: undefined
  });
  assert(missingAuthentication.failures.some((failure) => failure.startsWith('Storage inventory authentication result schema')));

  const unsignedAuthentication = buildStorageInventoryAuthenticationResult(emptyEvidence);
  unsignedAuthentication.signature_base64 = null;
  unsignedAuthentication.result_sha256 = trustedAttestationResultDigest(unsignedAuthentication);
  const unsignedEvidence = structuredClone(emptyEvidence);
  unsignedEvidence.authentication.verification_result_sha256 = unsignedAuthentication.result_sha256;
  assert(validate(empty, now, buildAcceptedExportsManifest(empty), {
    storageInventoryEvidence: unsignedEvidence,
    storageInventoryAuthenticationResult: unsignedAuthentication
  }).failures.some((failure) => failure.includes('Storage inventory authentication result signature is malformed')));

  const wrongKeyAuthentication = buildStorageInventoryAuthenticationResult(emptyEvidence);
  wrongKeyAuthentication.key_id = 'attacker-storage-inventory-key';
  signTrustedAttestationResult(wrongKeyAuthentication, storageInventorySignatureDomain);
  const wrongKeyEvidence = structuredClone(emptyEvidence);
  wrongKeyEvidence.authentication.verification_result_sha256 = wrongKeyAuthentication.result_sha256;
  assert(validate(empty, now, buildAcceptedExportsManifest(empty), {
    storageInventoryEvidence: wrongKeyEvidence,
    storageInventoryAuthenticationResult: wrongKeyAuthentication
  }).failures.includes('Storage inventory authentication result signer does not match the pinned trust anchor'));

  const positive = buildReceipt({ storageObjectCount: 2 });
  const positiveEvidence = buildStorageInventoryEvidence(positive);
  assert.deepEqual(validate(positive, now, buildAcceptedExportsManifest(positive), { storageInventoryEvidence: positiveEvidence }), { ok: true, failures: [] });

  for (const [index, malformedEvidence] of [undefined, null, 'malformed', [], { denominator: null }, { denominator: { object_count: 0 } }].entries()) {
    const receipt = buildReceipt();
    let result;
    assert.doesNotThrow(() => {
      result = validate(receipt, now, buildAcceptedExportsManifest(receipt), { storageInventoryEvidence: malformedEvidence });
    }, `malformed Storage inventory evidence ${index} must not throw`);
    assert.equal(result.ok, false);
    assert(result.failures.some((failure) => failure.startsWith('Storage inventory evidence schema')));
  }

  const stale = buildReceipt();
  const staleEvidence = buildStorageInventoryEvidence(stale);
  staleEvidence.observed_at = '2026-07-18T09:59:59Z';
  staleEvidence.denominator.inventory_manifest_sha256 = storageInventoryManifestDigest(staleEvidence);
  assert(validate(stale, now, buildAcceptedExportsManifest(stale), { storageInventoryEvidence: staleEvidence }).failures.includes('Storage inventory evidence is stale'));

  const future = buildReceipt();
  const futureEvidence = buildStorageInventoryEvidence(future);
  futureEvidence.observed_at = '2026-07-18T18:00:01Z';
  futureEvidence.denominator.inventory_manifest_sha256 = storageInventoryManifestDigest(futureEvidence);
  assert(validate(future, now, buildAcceptedExportsManifest(future), { storageInventoryEvidence: futureEvidence }).failures.includes('Storage inventory evidence cannot be future-dated'));

  const staleAuthenticationReceipt = buildReceipt();
  const staleAuthenticationEvidence = buildStorageInventoryEvidence(staleAuthenticationReceipt);
  const staleAuthenticationResult = buildStorageInventoryAuthenticationResult(staleAuthenticationEvidence);
  staleAuthenticationResult.verified_at = '2026-07-18T09:49:59Z';
  signTrustedAttestationResult(staleAuthenticationResult, storageInventorySignatureDomain);
  staleAuthenticationEvidence.authentication.verification_result_sha256 = staleAuthenticationResult.result_sha256;
  const staleAuthenticationFailures = validate(staleAuthenticationReceipt, now, buildAcceptedExportsManifest(staleAuthenticationReceipt), {
    storageInventoryEvidence: staleAuthenticationEvidence,
    storageInventoryAuthenticationResult: staleAuthenticationResult
  }).failures;
  assert(staleAuthenticationFailures.includes('Storage inventory authentication result is stale'));

  const futureAuthenticationReceipt = buildReceipt();
  const futureAuthenticationEvidence = buildStorageInventoryEvidence(futureAuthenticationReceipt);
  const futureAuthenticationResult = buildStorageInventoryAuthenticationResult(futureAuthenticationEvidence);
  futureAuthenticationResult.verified_at = '2026-07-18T18:00:01Z';
  signTrustedAttestationResult(futureAuthenticationResult, storageInventorySignatureDomain);
  futureAuthenticationEvidence.authentication.verification_result_sha256 = futureAuthenticationResult.result_sha256;
  assert(validate(futureAuthenticationReceipt, now, buildAcceptedExportsManifest(futureAuthenticationReceipt), {
    storageInventoryEvidence: futureAuthenticationEvidence,
    storageInventoryAuthenticationResult: futureAuthenticationResult
  }).failures.includes('Storage inventory authentication result cannot be future-dated'));

  const wrongProject = buildReceipt();
  const wrongProjectEvidence = buildStorageInventoryEvidence(wrongProject);
  wrongProjectEvidence.project.name = 'Another project';
  wrongProjectEvidence.denominator.inventory_manifest_sha256 = storageInventoryManifestDigest(wrongProjectEvidence);
  assert(validate(wrongProject, now, buildAcceptedExportsManifest(wrongProject), { storageInventoryEvidence: wrongProjectEvidence }).failures.includes('Storage inventory evidence project mismatch'));

  const wrongSnapshot = buildReceipt();
  const wrongSnapshotEvidence = buildStorageInventoryEvidence(wrongSnapshot);
  wrongSnapshotEvidence.snapshot_at = '2026-07-18T17:29:59Z';
  wrongSnapshotEvidence.denominator.inventory_manifest_sha256 = storageInventoryManifestDigest(wrongSnapshotEvidence);
  assert(validate(wrongSnapshot, now, buildAcceptedExportsManifest(wrongSnapshot), { storageInventoryEvidence: wrongSnapshotEvidence }).failures.includes('Storage inventory evidence snapshot mismatch'));

  const wrongExport = buildReceipt();
  const wrongExportEvidence = buildStorageInventoryEvidence(wrongExport);
  wrongExportEvidence.export_identity.export_id = 'backup-export-other';
  wrongExportEvidence.denominator.inventory_manifest_sha256 = storageInventoryManifestDigest(wrongExportEvidence);
  assert(validate(wrongExport, now, buildAcceptedExportsManifest(wrongExport), { storageInventoryEvidence: wrongExportEvidence }).failures.includes('Storage inventory evidence export identity mismatch'));

  const wrongProviderSnapshot = buildReceipt();
  const wrongProviderSnapshotEvidence = buildStorageInventoryEvidence(wrongProviderSnapshot);
  wrongProviderSnapshotEvidence.provider_snapshot_identity.source_snapshot_sha256 = digest('other-source-snapshot');
  wrongProviderSnapshotEvidence.denominator.inventory_manifest_sha256 = storageInventoryManifestDigest(wrongProviderSnapshotEvidence);
  assert(validate(wrongProviderSnapshot, now, buildAcceptedExportsManifest(wrongProviderSnapshot), { storageInventoryEvidence: wrongProviderSnapshotEvidence }).failures.includes('Storage inventory evidence provider snapshot mismatch'));

  const swapped = buildReceipt({ storageObjectCount: 2 });
  const swappedEvidence = buildStorageInventoryEvidence(swapped);
  const swappedResult = buildStorageInventoryAuthenticationResult(swappedEvidence);
  assert(validate(empty, now, buildAcceptedExportsManifest(empty), {
    storageInventoryEvidence: emptyEvidence,
    storageInventoryAuthenticationResult: swappedResult
  }).failures.includes('Storage inventory authentication result subject mismatch'));

  const contradictory = buildReceipt();
  const contradictoryEvidence = buildStorageInventoryEvidence(contradictory);
  contradictoryEvidence.denominator.bucket_count = 1;
  contradictoryEvidence.denominator.object_count = 1;
  contradictoryEvidence.denominator.total_bytes = 1024;
  contradictoryEvidence.denominator.inventory_manifest_sha256 = storageInventoryManifestDigest(contradictoryEvidence);
  const contradictoryFailures = validate(contradictory, now, buildAcceptedExportsManifest(contradictory), { storageInventoryEvidence: contradictoryEvidence }).failures;
  assert(contradictoryFailures.includes('Storage inventory does not match the Storage object denominator'));

  const structurallyContradictory = buildReceipt({ storageObjectCount: 2 });
  const structurallyContradictoryEvidence = buildStorageInventoryEvidence(structurallyContradictory);
  structurallyContradictoryEvidence.denominator.bucket_count = 0;
  structurallyContradictoryEvidence.denominator.inventory_manifest_sha256 = storageInventoryManifestDigest(structurallyContradictoryEvidence);
  assert(validate(structurallyContradictory, now, buildAcceptedExportsManifest(structurallyContradictory), { storageInventoryEvidence: structurallyContradictoryEvidence }).failures.includes('Storage inventory zero/positive state is contradictory'));

  const digestMismatch = buildReceipt();
  const digestMismatchEvidence = buildStorageInventoryEvidence(digestMismatch);
  digestMismatchEvidence.denominator.inventory_manifest_sha256 = digest('tampered-storage-inventory-manifest');
  assert(validate(digestMismatch, now, buildAcceptedExportsManifest(digestMismatch), { storageInventoryEvidence: digestMismatchEvidence }).failures.includes('Storage inventory manifest digest mismatch'));

  const selfCorrelated = buildReceipt();
  const selfCorrelatedEvidence = buildStorageInventoryEvidence(selfCorrelated);
  const selfCorrelationPayload = { ...selfCorrelatedEvidence };
  delete selfCorrelationPayload.source_evidence_sha256;
  selfCorrelatedEvidence.source_evidence_sha256 = sha256Hex(selfCorrelationPayload);
  assert(validate(selfCorrelated, now, buildAcceptedExportsManifest(selfCorrelated), { storageInventoryEvidence: selfCorrelatedEvidence }).failures.includes('Storage inventory source evidence is self-correlated'));

  const duplicate = buildReceipt();
  const duplicateEvidence = buildStorageInventoryEvidence(duplicate);
  duplicateEvidence.source_evidence_sha256 = buildObjectLockReadback(duplicate).source_evidence_sha256;
  assert(validate(duplicate, now, buildAcceptedExportsManifest(duplicate), { storageInventoryEvidence: duplicateEvidence }).failures.includes('Storage inventory source evidence must be distinct from other evidence'));

  const duplicateBody = buildReceipt({ storageObjectCount: 2 });
  const duplicateBodyEvidence = buildStorageInventoryEvidence(duplicateBody);
  duplicateBodyEvidence.source_evidence_sha256 = buildStorageBodyRecoveryReceipt(duplicateBody).source_evidence_sha256;
  assert(validate(duplicateBody, now, buildAcceptedExportsManifest(duplicateBody), { storageInventoryEvidence: duplicateBodyEvidence }).failures.includes('Storage body recovery source evidence must be distinct from other evidence'));

  const positiveMismatch = buildReceipt({ storageObjectCount: 2 });
  const positiveMismatchEvidence = buildStorageInventoryEvidence(positiveMismatch);
  positiveMismatchEvidence.denominator.total_bytes = 1024;
  positiveMismatchEvidence.denominator.inventory_manifest_sha256 = storageInventoryManifestDigest(positiveMismatchEvidence);
  assert(validate(positiveMismatch, now, buildAcceptedExportsManifest(positiveMismatch), { storageInventoryEvidence: positiveMismatchEvidence }).failures.includes('Storage inventory does not match the body recovery denominator'));
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

  for (const [index, malformedEvidence] of [null, 'malformed', [], { denominator: { buckets: [null] } }].entries()) {
    const malformed = buildReceipt({ storageObjectCount: 2 });
    let malformedResult;
    assert.doesNotThrow(() => {
      malformedResult = validate(malformed, now, buildAcceptedExportsManifest(malformed), { storageBodyRecoveryReceipt: malformedEvidence });
    }, `malformed Storage recovery evidence ${index} must not throw`);
    assert.equal(malformedResult.ok, false);
    assert(malformedResult.failures.some((failure) => failure.startsWith('Storage body recovery receipt schema')));
    assert(malformedResult.failures.includes('Storage body recovery receipt digest mismatch'));
  }
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
