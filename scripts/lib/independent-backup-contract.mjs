import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { validateSanitizedReceipt } from './recovery.mjs';

export const independentBackupContractPath = 'contracts/v1/recovery/independent-backup-contract.json';

export const lifecycleStates = Object.freeze([
  'PLANNED',
  'SOURCE_READY',
  'EXECUTION_BLOCKED',
  'BACKUP_CURRENT',
  'RESTORE_REHEARSED',
  'DRIFTED'
]);

export const coverageUnits = Object.freeze([
  'application_schemas_and_catalog',
  'roles_memberships_grants_and_default_acls',
  'migration_ledger',
  'application_data',
  'auth_identity_data_and_password_hashes',
  'auth_control_plane_metadata',
  'storage_metadata',
  'storage_object_bodies'
]);

export const externalEffectUnits = Object.freeze([
  'app_environment',
  'auth_delivery_and_hooks',
  'database_webhooks',
  'dns_and_aliases',
  'edge_schedules',
  'pg_cron',
  'pg_net',
  'queues',
  'realtime',
  'storage_events',
  'subscriptions',
  'wrappers'
]);

const parityUnits = Object.freeze(['auth', 'catalog', 'data', 'security']);
const monthlyReportingUnits = Object.freeze(['backup_freshness', 'projected_cost', 'runner_usage', 'storage_growth']);
const receiptRequiredFields = Object.freeze([
  'aggregate_counts', 'ciphertext_bytes', 'ciphertext_sha256', 'completed_at', 'cost', 'coverage',
  'destination_version', 'export_id', 'freshness', 'key_recipient_ids', 'manifest_sha256', 'migration_ledger_sha256',
  'monthly_selection', 'object_lock', 'owner_decision', 'plaintext_sha256', 'postgres_version', 'project', 'receipt_id', 'retention_until',
  'snapshot_at', 'source_commit', 'source_state_sha256', 'tool_versions', 'watchdog'
]);
const forbiddenClasses = Object.freeze([
  'connection_values', 'credentials', 'private_keys', 'provider_payloads', 'raw_rows', 'raw_sql',
  'row_identifiers', 'user_identifiers'
]);
const hexSha256 = /^[0-9a-f]{64}$/;
const commitSha = /^[0-9a-f]{40}$/;
const stableId = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/;
const safeReference = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const safeProjectName = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,127}$/;
const projectRef = /^[a-z0-9]{20}$/;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const authenticationSignatureDomain = 'fawxzzy-platform:accepted-exports-authentication:v1';
const executionGateSignatureDomain = 'fawxzzy-platform:execution-gate-admission:v1';
const storageInventorySignatureDomain = 'fawxzzy-platform:storage-inventory-attestation:v1';
const objectLockSignatureDomain = 'fawxzzy-platform:object-lock-provider-attestation:v1';
const canonicalBase64 = /^[A-Za-z0-9+/]+={0,2}$/;
const schemaPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'contracts', 'v1', 'schemas', 'independent-backup-contract.schema.json');
const commonSchemaPath = path.resolve(path.dirname(schemaPath), 'common.schema.json');
const sourceSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const commonSchema = JSON.parse(fs.readFileSync(commonSchemaPath, 'utf8'));
const receiptSchema = {
  $schema: sourceSchema.$schema,
  $id: 'urn:fawxzzy:platform:schemas:v1:independent-backup-receipt',
  $ref: '#/$defs/receipt',
  $defs: sourceSchema.$defs
};
const acceptedExportsManifestSchema = {
  $schema: sourceSchema.$schema,
  $id: 'urn:fawxzzy:platform:schemas:v1:independent-backup-accepted-exports-manifest',
  $ref: '#/$defs/accepted_exports_manifest',
  $defs: sourceSchema.$defs
};
const acceptedExportsEvidenceSchema = {
  $schema: sourceSchema.$schema,
  $id: 'urn:fawxzzy:platform:schemas:v1:independent-backup-accepted-exports-evidence',
  $ref: '#/$defs/accepted_exports_evidence',
  $defs: sourceSchema.$defs
};
const acceptedExportsAuthenticationResultSchema = {
  $schema: sourceSchema.$schema,
  $id: 'urn:fawxzzy:platform:schemas:v1:independent-backup-accepted-exports-authentication-result',
  $ref: '#/$defs/accepted_exports_authentication_result',
  $defs: sourceSchema.$defs
};
const objectLockReadbackSchema = {
  $schema: sourceSchema.$schema,
  $id: 'urn:fawxzzy:platform:schemas:v1:independent-backup-object-lock-readback',
  $ref: '#/$defs/object_lock_readback',
  $defs: sourceSchema.$defs
};
const executionGateAdmissionSchema = {
  $schema: sourceSchema.$schema,
  $id: 'urn:fawxzzy:platform:schemas:v1:independent-backup-execution-gate-admission',
  $ref: '#/$defs/execution_gate_admission',
  $defs: sourceSchema.$defs
};
const executionGateAuthenticationResultSchema = {
  $schema: sourceSchema.$schema,
  $id: 'urn:fawxzzy:platform:schemas:v1:independent-backup-execution-gate-authentication-result',
  $ref: '#/$defs/execution_gate_authentication_result',
  $defs: sourceSchema.$defs
};
const objectLockProviderAttestationSchema = {
  $schema: sourceSchema.$schema,
  $id: 'urn:fawxzzy:platform:schemas:v1:independent-backup-object-lock-provider-attestation',
  $ref: '#/$defs/object_lock_provider_attestation',
  $defs: sourceSchema.$defs
};
const objectLockAuthenticationResultSchema = {
  $schema: sourceSchema.$schema,
  $id: 'urn:fawxzzy:platform:schemas:v1:independent-backup-object-lock-authentication-result',
  $ref: '#/$defs/object_lock_authentication_result',
  $defs: sourceSchema.$defs
};
const storageBodyRecoveryReceiptSchema = {
  $schema: sourceSchema.$schema,
  $id: 'urn:fawxzzy:platform:schemas:v1:independent-backup-storage-body-recovery-receipt',
  $ref: '#/$defs/storage_body_recovery_receipt',
  $defs: sourceSchema.$defs
};
const storageBodyRecoveryEvidenceSchema = {
  $schema: sourceSchema.$schema,
  $id: 'urn:fawxzzy:platform:schemas:v1:independent-backup-storage-body-recovery-evidence',
  $ref: '#/$defs/storage_body_recovery_evidence',
  $defs: sourceSchema.$defs
};
const storageInventoryEvidenceSchema = {
  $schema: sourceSchema.$schema,
  $id: 'urn:fawxzzy:platform:schemas:v1:independent-backup-storage-inventory-evidence',
  $ref: '#/$defs/storage_inventory_evidence',
  $defs: sourceSchema.$defs
};
const storageInventoryAuthenticationResultSchema = {
  $schema: sourceSchema.$schema,
  $id: 'urn:fawxzzy:platform:schemas:v1:independent-backup-storage-inventory-authentication-result',
  $ref: '#/$defs/storage_inventory_authentication_result',
  $defs: sourceSchema.$defs
};
const contractAjv = new Ajv2020({ allErrors: true, strict: true });
contractAjv.addSchema(commonSchema);
const contractShapeValidator = contractAjv.compile(sourceSchema);
const receiptShapeValidator = new Ajv2020({ allErrors: true, strict: true }).compile(receiptSchema);
const acceptedExportsManifestShapeValidator = new Ajv2020({ allErrors: true, strict: true }).compile(acceptedExportsManifestSchema);
const acceptedExportsEvidenceShapeValidator = new Ajv2020({ allErrors: true, strict: true }).compile(acceptedExportsEvidenceSchema);
const acceptedExportsAuthenticationResultShapeValidator = new Ajv2020({ allErrors: true, strict: true }).compile(acceptedExportsAuthenticationResultSchema);
const objectLockReadbackShapeValidator = new Ajv2020({ allErrors: true, strict: true }).compile(objectLockReadbackSchema);
const executionGateAdmissionShapeValidator = new Ajv2020({ allErrors: true, strict: true }).compile(executionGateAdmissionSchema);
const executionGateAuthenticationResultShapeValidator = new Ajv2020({ allErrors: true, strict: true }).compile(executionGateAuthenticationResultSchema);
const objectLockProviderAttestationShapeValidator = new Ajv2020({ allErrors: true, strict: true }).compile(objectLockProviderAttestationSchema);
const objectLockAuthenticationResultShapeValidator = new Ajv2020({ allErrors: true, strict: true }).compile(objectLockAuthenticationResultSchema);
const storageBodyRecoveryReceiptShapeValidator = new Ajv2020({ allErrors: true, strict: true }).compile(storageBodyRecoveryReceiptSchema);
const storageBodyRecoveryEvidenceShapeValidator = new Ajv2020({ allErrors: true, strict: true }).compile(storageBodyRecoveryEvidenceSchema);
const storageInventoryEvidenceShapeValidator = new Ajv2020({ allErrors: true, strict: true }).compile(storageInventoryEvidenceSchema);
const storageInventoryAuthenticationResultShapeValidator = new Ajv2020({ allErrors: true, strict: true }).compile(storageInventoryAuthenticationResultSchema);

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}

export function canonicalSerialize(value) {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

export function sha256Hex(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : canonicalSerialize(value), 'utf8').digest('hex');
}

export function storageInventoryManifestDigest(evidence) {
  return sha256Hex({
    denominator: {
      bucket_count: evidence?.denominator?.bucket_count ?? null,
      object_count: evidence?.denominator?.object_count ?? null,
      total_bytes: evidence?.denominator?.total_bytes ?? null
    },
    export_identity: evidence?.export_identity ?? null,
    evidence_id: evidence?.evidence_id ?? null,
    observed_at: evidence?.observed_at ?? null,
    project: evidence?.project ?? null,
    provider_snapshot_identity: evidence?.provider_snapshot_identity ?? null,
    snapshot_at: evidence?.snapshot_at ?? null
  });
}

export function independentBackupSourceStateDigest(receipt) {
  return sha256Hex({
    migration_ledger_sha256: receipt?.migration_ledger_sha256 ?? null,
    postgres_version: receipt?.postgres_version ?? null,
    source_commit: receipt?.source_commit ?? null,
    tool_versions: receipt?.tool_versions ?? null
  });
}

export function independentBackupReceiptIdentityDigest(receipt) {
  return sha256Hex({
    export_id: receipt?.export_id ?? null,
    project: receipt?.project ?? null,
    receipt_id: receipt?.receipt_id ?? null,
    source_state_sha256: receipt?.source_state_sha256 ?? null
  });
}

export function storageBodyRecoveryEvidenceDigest(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return null;
  return sha256Hex(evidence);
}

export function acceptedExportHistoryEntryDigest(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const copy = { ...entry };
  delete copy.entry_sha256;
  return sha256Hex(copy);
}

export function acceptedExportsAuthenticationSubjectDigest(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return null;
  const copy = structuredClone(evidence);
  if (copy.authentication && typeof copy.authentication === 'object' && !Array.isArray(copy.authentication)) {
    delete copy.authentication.verification_result_sha256;
  }
  return sha256Hex(copy);
}

export function acceptedExportsAuthenticationResultDigest(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  const copy = { ...result };
  delete copy.result_sha256;
  return sha256Hex(copy);
}

export function acceptedExportsAuthenticationSignedBytes(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  const payload = structuredClone(result);
  delete payload.result_sha256;
  delete payload.signature_base64;
  delete payload.signed_payload_sha256;
  return Buffer.from(`${authenticationSignatureDomain}\0${canonicalSerialize(payload)}`, 'utf8');
}

export function acceptedExportsAuthenticationSignedPayloadDigest(result) {
  const signedBytes = acceptedExportsAuthenticationSignedBytes(result);
  return signedBytes === null ? null : crypto.createHash('sha256').update(signedBytes).digest('hex');
}

export function trustedAttestationSubjectDigest(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return null;
  const copy = structuredClone(evidence);
  if (copy.authentication && typeof copy.authentication === 'object' && !Array.isArray(copy.authentication)) {
    delete copy.authentication.verification_result_sha256;
  }
  return sha256Hex(copy);
}

export function trustedAttestationResultDigest(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  const copy = { ...result };
  delete copy.result_sha256;
  return sha256Hex(copy);
}

export function trustedAttestationSignedBytes(result, signatureDomain) {
  if (!result || typeof result !== 'object' || Array.isArray(result) || !safeReference.test(signatureDomain ?? '')) return null;
  const payload = structuredClone(result);
  delete payload.result_sha256;
  delete payload.signature_base64;
  delete payload.signed_payload_sha256;
  return Buffer.from(`${signatureDomain}\0${canonicalSerialize(payload)}`, 'utf8');
}

export function trustedAttestationSignedPayloadDigest(result, signatureDomain) {
  const signedBytes = trustedAttestationSignedBytes(result, signatureDomain);
  return signedBytes === null ? null : crypto.createHash('sha256').update(signedBytes).digest('hex');
}

function decodeCanonicalBase64(value, expectedByteLength = null) {
  if (typeof value !== 'string' || value.length === 0 || value.length % 4 !== 0 || !canonicalBase64.test(value)) return null;
  const decoded = Buffer.from(value, 'base64');
  if (decoded.toString('base64') !== value || (expectedByteLength !== null && decoded.length !== expectedByteLength)) return null;
  return decoded;
}

function verifyAcceptedExportsAuthenticationSignature(trustAnchor, result) {
  const failures = [];
  requireCondition(trustAnchor?.status === 'CURRENT', 'accepted exports authentication trust anchor is not CURRENT', failures);
  requireCondition(trustAnchor?.algorithm === 'Ed25519'
    && safeReference.test(trustAnchor?.key_id ?? '')
    && trustAnchor?.key_id !== 'UNKNOWN'
    && safeReference.test(trustAnchor?.verifier_reference ?? '')
    && trustAnchor?.verifier_reference !== 'UNKNOWN', 'accepted exports authentication trust anchor identity is invalid', failures);
  const publicKeyBytes = decodeCanonicalBase64(trustAnchor?.public_key_spki_base64);
  const publicKeyDigest = publicKeyBytes === null ? null : crypto.createHash('sha256').update(publicKeyBytes).digest('hex');
  requireCondition(publicKeyBytes !== null
    && hexSha256.test(trustAnchor?.public_key_spki_sha256 ?? '')
    && publicKeyDigest === trustAnchor?.public_key_spki_sha256, 'accepted exports authentication trust anchor key is malformed or unpinned', failures);
  requireCondition(result?.key_id === trustAnchor?.key_id
    && result?.verifier_reference === trustAnchor?.verifier_reference
    && result?.signature_algorithm === trustAnchor?.algorithm
    && result?.signature_domain === authenticationSignatureDomain, 'accepted exports authentication signer does not match the pinned trust anchor', failures);
  const signedBytes = acceptedExportsAuthenticationSignedBytes(result);
  const signedPayloadDigest = signedBytes === null ? null : crypto.createHash('sha256').update(signedBytes).digest('hex');
  requireCondition(signedPayloadDigest !== null && result?.signed_payload_sha256 === signedPayloadDigest, 'accepted exports authentication signed payload digest mismatch', failures);
  const signatureBytes = decodeCanonicalBase64(result?.signature_base64, 64);
  requireCondition(signatureBytes !== null, 'accepted exports authentication signature is malformed', failures);
  if (publicKeyBytes !== null && signatureBytes !== null && signedBytes !== null) {
    try {
      const publicKey = crypto.createPublicKey({ key: publicKeyBytes, format: 'der', type: 'spki' });
      requireCondition(publicKey.asymmetricKeyType === 'ed25519', 'accepted exports authentication trust anchor is not an Ed25519 key', failures);
      requireCondition(publicKey.asymmetricKeyType === 'ed25519'
        && crypto.verify(null, signedBytes, publicKey, signatureBytes), 'accepted exports authentication signature verification failed', failures);
    } catch {
      failures.push('accepted exports authentication trust anchor key cannot be verified');
    }
  }
  return failures;
}

function verifyTrustedAttestationSignature(trustAnchor, result, signatureDomain, label) {
  const failures = [];
  requireCondition(trustAnchor?.status === 'CURRENT', `${label} trust anchor is not CURRENT`, failures);
  requireCondition(trustAnchor?.algorithm === 'Ed25519'
    && safeReference.test(trustAnchor?.key_id ?? '')
    && trustAnchor?.key_id !== 'UNKNOWN'
    && safeReference.test(trustAnchor?.verifier_reference ?? '')
    && trustAnchor?.verifier_reference !== 'UNKNOWN', `${label} trust anchor identity is invalid`, failures);
  const publicKeyBytes = decodeCanonicalBase64(trustAnchor?.public_key_spki_base64);
  const publicKeyDigest = publicKeyBytes === null ? null : crypto.createHash('sha256').update(publicKeyBytes).digest('hex');
  requireCondition(publicKeyBytes !== null
    && hexSha256.test(trustAnchor?.public_key_spki_sha256 ?? '')
    && publicKeyDigest === trustAnchor?.public_key_spki_sha256, `${label} trust anchor key is malformed or unpinned`, failures);
  requireCondition(result?.key_id === trustAnchor?.key_id
    && result?.verifier_reference === trustAnchor?.verifier_reference
    && result?.signature_algorithm === trustAnchor?.algorithm
    && result?.signature_domain === signatureDomain, `${label} signer does not match the pinned trust anchor`, failures);
  const signedBytes = trustedAttestationSignedBytes(result, signatureDomain);
  const signedPayloadDigest = signedBytes === null ? null : crypto.createHash('sha256').update(signedBytes).digest('hex');
  requireCondition(signedPayloadDigest !== null && result?.signed_payload_sha256 === signedPayloadDigest, `${label} signed payload digest mismatch`, failures);
  const signatureBytes = decodeCanonicalBase64(result?.signature_base64, 64);
  requireCondition(signatureBytes !== null, `${label} signature is malformed`, failures);
  if (publicKeyBytes !== null && signatureBytes !== null && signedBytes !== null) {
    try {
      const publicKey = crypto.createPublicKey({ key: publicKeyBytes, format: 'der', type: 'spki' });
      requireCondition(publicKey.asymmetricKeyType === 'ed25519', `${label} trust anchor is not an Ed25519 key`, failures);
      requireCondition(publicKey.asymmetricKeyType === 'ed25519'
        && crypto.verify(null, signedBytes, publicKey, signatureBytes), `${label} signature verification failed`, failures);
    } catch {
      failures.push(`${label} trust anchor key cannot be verified`);
    }
  }
  return failures;
}

function storageInventorySelfCorrelationDigest(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return null;
  const copy = { ...evidence };
  delete copy.source_evidence_sha256;
  return sha256Hex(copy);
}

function storageBodyRecoverySelfCorrelationDigest(receipt) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return null;
  const copy = { ...receipt };
  delete copy.source_evidence_sha256;
  return sha256Hex(copy);
}

export function independentBackupManifestDigest(receipt) {
  const copy = structuredClone(receipt);
  delete copy.manifest_sha256;
  return sha256Hex(copy);
}

function sameSet(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
}

function parseTimestamp(value, label, failures) {
  if (typeof value !== 'string' || !timestamp.test(value)) {
    failures.push(`${label}: invalid UTC timestamp`);
    return null;
  }
  const parsed = Date.parse(value);
  const canonical = Number.isFinite(parsed) ? new Date(parsed).toISOString().replace('.000Z', 'Z') : null;
  if (!Number.isFinite(parsed) || canonical !== value) {
    failures.push(`${label}: invalid UTC timestamp`);
    return null;
  }
  return parsed;
}

function validateReceiptShape(receipt) {
  if (receiptShapeValidator(receipt)) return [];
  return (receiptShapeValidator.errors ?? []).map((error) => `receipt schema ${error.instancePath || '/'}: ${error.message}`);
}

function validateAcceptedExportsManifestShape(manifest) {
  if (acceptedExportsManifestShapeValidator(manifest)) return [];
  return (acceptedExportsManifestShapeValidator.errors ?? []).map((error) => `accepted exports manifest schema ${error.instancePath || '/'}: ${error.message}`);
}

function shapeFailures(validator, value, label) {
  if (validator(value)) return [];
  return (validator.errors ?? []).map((error) => `${label} schema ${error.instancePath || '/'}: ${error.message}`);
}

function requireCondition(condition, message, failures) {
  if (!condition) failures.push(message);
}

function guardedUnitEntries(value, label, failures) {
  if (!Array.isArray(value)) {
    failures.push(`${label}: evidence array is malformed`);
    return [];
  }
  const entries = [];
  for (const [index, entry] of value.entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.unit !== 'string') {
      failures.push(`${label}[${index}]: evidence entry is malformed`);
      continue;
    }
    entries.push(entry);
  }
  return entries;
}

export function validateIndependentBackupContract(contract) {
  const failures = [];
  if (!contract) return { ok: false, failures: ['independent backup contract is missing'] };
  const contractShapeFailures = shapeFailures(contractShapeValidator, contract, 'independent backup contract');
  failures.push(...contractShapeFailures);
  failures.push(...validateSanitizedReceipt(contract, 'independent backup contract'));
  if (contractShapeFailures.length > 0) {
    return { ok: false, failures: failures.sort((left, right) => left.localeCompare(right)) };
  }
  requireCondition(contract.decision_id === 'FP-MAN-015', 'contract must remain bound to FP-MAN-015', failures);
  requireCondition(contract.status === 'BLOCKED', 'source contract must remain BLOCKED', failures);
  requireCondition(contract.lifecycle?.current_state === 'SOURCE_READY', 'source lifecycle must be SOURCE_READY', failures);
  requireCondition(contract.lifecycle?.execution_status === 'BLOCKED', 'source lifecycle must not admit execution', failures);
  requireCondition(sameSet(contract.lifecycle?.allowed_states, lifecycleStates), 'lifecycle denominator changed', failures);
  requireCondition(contract.project?.ref === 'bxtcuhkotumitoqtrcej', 'project ref changed', failures);
  requireCondition(contract.project?.plan === 'Pro' && contract.project?.compute === 'Micro', 'approved Pro/Micro posture changed', failures);
  requireCondition(contract.policy?.destination?.provider === 'Backblaze B2' && contract.policy?.destination?.region === 'Canada East', 'destination class changed', failures);
  requireCondition(contract.policy?.destination?.bucket_visibility === 'private', 'destination bucket must be private', failures);
  requireCondition(contract.policy?.destination?.object_lock_required === true && contract.policy?.destination?.retention_mode === 'COMPLIANCE', 'Object Lock compliance retention changed', failures);
  requireCondition(contract.policy?.automation?.scheduler === 'private_github_actions' && contract.policy?.automation?.independent_watchdog_required === true, 'automation posture changed', failures);
  requireCondition(contract.policy?.automation?.workflow_publication_status === 'BLOCKED', 'workflow publication must remain BLOCKED', failures);
  requireCondition(contract.policy?.encryption?.tool_class === 'age' && contract.policy?.encryption?.streaming_before_upload === true, 'streaming age boundary changed', failures);
  requireCondition(contract.policy?.encryption?.persistent_plaintext_allowed === false && contract.policy?.encryption?.automation_material === 'public_recipients_only', 'private recovery material boundary changed', failures);
  requireCondition(contract.policy?.encryption?.offline_private_identity_count === 2 && contract.policy?.encryption?.offsite_identity_count === 1, 'offline recovery identity custody changed', failures);
  requireCondition(contract.policy?.schedule?.full_export_interval_hours === 6 && contract.policy?.schedule?.freshness_limit_hours === 8, 'cadence or freshness objective changed', failures);
  requireCondition(contract.policy?.retention?.standard_days === 35 && contract.policy?.retention?.first_accepted_monthly_days === 400, 'retention policy changed', failures);
  requireCondition(contract.policy?.objectives?.rpo_seconds === 28800 && contract.policy?.objectives?.quarantined_restore_data_plane_rto_seconds === 43200, 'approved RPO/RTO objectives changed', failures);
  requireCondition(contract.policy?.objectives?.production_service_rto_status === 'UNKNOWN' && contract.policy?.objectives?.production_service_rto_seconds === null, 'production RTO must remain UNMEASURED', failures);
  requireCondition(contract.policy?.cost?.warning_usd_monthly === 5 && contract.policy?.cost?.manual_approval_ceiling_usd_monthly === 15, 'cost thresholds changed', failures);
  requireCondition(contract.policy?.cost?.budget_stop_control_required === true, 'budget stop control must remain required', failures);
  requireCondition(sameSet(contract.policy?.cost?.monthly_reporting_units, monthlyReportingUnits), 'monthly reporting denominator changed', failures);
  requireCondition(contract.policy?.provider_physical_backup_complement?.required === true && contract.policy?.provider_physical_backup_complement?.retention_days === 7, 'provider Physical backup complement changed', failures);
  requireCondition(contract.policy?.provider_physical_backup_complement?.storage_object_bodies_included === false, 'provider backups must not claim Storage body coverage', failures);
  requireCondition(sameSet(contract.coverage_units, coverageUnits), 'backup coverage denominator changed', failures);
  requireCondition(sameSet(contract.restore_quarantine?.external_effect_units, externalEffectUnits), 'external-effect denominator changed', failures);
  requireCondition(sameSet(contract.restore_quarantine?.parity_units, parityUnits), 'restore parity denominator changed', failures);
  requireCondition(contract.restore_quarantine?.application_traffic_allowed === false && contract.restore_quarantine?.synthetic_canaries_only === true, 'restore clone quarantine changed', failures);
  requireCondition(sameSet(contract.receipt_contract?.required_fields, receiptRequiredFields), 'receipt field denominator changed', failures);
  requireCondition(sameSet(contract.receipt_contract?.forbidden_classes, forbiddenClasses), 'forbidden receipt classes changed', failures);
  requireCondition(contract.receipt_contract?.accepted_exports_authentication?.required === true
    && contract.receipt_contract?.accepted_exports_authentication?.verification_boundary === 'pinned_ed25519_signature'
    && contract.receipt_contract?.accepted_exports_authentication?.subject_digest === 'accepted_exports_evidence_without_verification_result'
    && contract.receipt_contract?.accepted_exports_authentication?.required_result_status === 'VERIFIED'
    && contract.receipt_contract?.accepted_exports_authentication?.signature_domain === authenticationSignatureDomain, 'accepted exports authentication boundary changed', failures);
  const gateAuthentication = contract.receipt_contract?.execution_gate_authentication;
  requireCondition(gateAuthentication?.required === true
    && gateAuthentication?.verification_boundary === 'pinned_ed25519_signature'
    && gateAuthentication?.trust_anchor_source === 'receipt_contract.accepted_exports_authentication.trust_anchor'
    && gateAuthentication?.required_result_status === 'VERIFIED'
    && gateAuthentication?.signature_domain === executionGateSignatureDomain
    && gateAuthentication?.maximum_age_seconds === 28800
    && gateAuthentication?.binding_class === 'predeclared_receipt_export_source_state'
    && gateAuthentication?.strictly_before_execution_boundary === true
    && canonicalSerialize(gateAuthentication?.admission_policy) === canonicalSerialize({
      version: '1.0.0',
      backup_current: [{ gate_id: 'backup_generation_or_upload', gate_version: '1.0.0', scope: 'backup_receipt' }],
      restore_rehearsed: [
        { gate_id: 'backup_generation_or_upload', gate_version: '1.0.0', scope: 'backup_receipt' },
        { gate_id: 'restore_rehearsal', gate_version: '1.0.0', scope: 'restore_receipt' }
      ]
    }), 'execution gate authentication boundary changed', failures);
  const storageInventoryAuthentication = contract.receipt_contract?.storage_inventory_authentication;
  requireCondition(storageInventoryAuthentication?.required === true
    && storageInventoryAuthentication?.verification_boundary === 'pinned_ed25519_signature'
    && storageInventoryAuthentication?.trust_anchor_source === 'receipt_contract.accepted_exports_authentication.trust_anchor'
    && storageInventoryAuthentication?.required_result_status === 'VERIFIED'
    && storageInventoryAuthentication?.signature_domain === storageInventorySignatureDomain
    && storageInventoryAuthentication?.maximum_age_seconds === 28800
    && storageInventoryAuthentication?.provider_class === 'Supabase Storage metadata', 'Storage inventory authentication boundary changed', failures);
  const objectLockAuthentication = contract.receipt_contract?.object_lock_authentication;
  requireCondition(objectLockAuthentication?.required === true
    && objectLockAuthentication?.verification_boundary === 'pinned_ed25519_signature'
    && objectLockAuthentication?.trust_anchor_source === 'receipt_contract.accepted_exports_authentication.trust_anchor'
    && objectLockAuthentication?.required_result_status === 'VERIFIED'
    && objectLockAuthentication?.signature_domain === objectLockSignatureDomain
    && objectLockAuthentication?.maximum_age_seconds === 28800
    && objectLockAuthentication?.provider_class === contract.policy?.destination?.provider
    && objectLockAuthentication?.retention_mode === contract.policy?.destination?.retention_mode, 'Object Lock authentication boundary changed', failures);
  const trustAnchor = contract.receipt_contract?.accepted_exports_authentication?.trust_anchor;
  const blockedTrustAnchor = trustAnchor?.status === 'BLOCKED'
    && trustAnchor?.algorithm === 'Ed25519'
    && trustAnchor?.key_id === 'UNKNOWN'
    && trustAnchor?.verifier_reference === 'UNKNOWN'
    && trustAnchor?.public_key_spki_base64 === null
    && trustAnchor?.public_key_spki_sha256 === null;
  const currentTrustAnchorBytes = decodeCanonicalBase64(trustAnchor?.public_key_spki_base64);
  let currentTrustAnchorKeyValid = false;
  if (currentTrustAnchorBytes !== null) {
    try {
      const currentTrustAnchorKey = crypto.createPublicKey({ key: currentTrustAnchorBytes, format: 'der', type: 'spki' });
      currentTrustAnchorKeyValid = currentTrustAnchorKey.asymmetricKeyType === 'ed25519'
        && crypto.createHash('sha256').update(currentTrustAnchorBytes).digest('hex') === trustAnchor?.public_key_spki_sha256;
    } catch {
      currentTrustAnchorKeyValid = false;
    }
  }
  const currentTrustAnchor = trustAnchor?.status === 'CURRENT'
    && trustAnchor?.algorithm === 'Ed25519'
    && safeReference.test(trustAnchor?.key_id ?? '')
    && trustAnchor?.key_id !== 'UNKNOWN'
    && safeReference.test(trustAnchor?.verifier_reference ?? '')
    && trustAnchor?.verifier_reference !== 'UNKNOWN'
    && hexSha256.test(trustAnchor?.public_key_spki_sha256 ?? '')
    && currentTrustAnchorKeyValid;
  requireCondition(blockedTrustAnchor || currentTrustAnchor, 'accepted exports authentication trust anchor is malformed', failures);
  requireCondition(Object.values(contract.execution_gates ?? {}).every((value) => value === 'BLOCKED'), 'every execution gate must remain BLOCKED in source', failures);
  return { ok: failures.length === 0, failures: failures.sort((left, right) => left.localeCompare(right)) };
}

export function validateIndependentBackupReceipt(contract, receipt, options = {}) {
  const contractValidation = validateIndependentBackupContract(contract);
  const failures = [...contractValidation.failures];
  if (!receipt) return { ok: false, failures: [...failures, 'backup receipt is missing'].sort() };
  failures.push(...validateReceiptShape(receipt));
  failures.push(...validateSanitizedReceipt(receipt, 'independent backup receipt'));
  if (!contractValidation.ok) {
    return { ok: false, failures: failures.sort((left, right) => left.localeCompare(right)) };
  }
  const now = parseTimestamp(options.now, 'validation clock', failures);
  const snapshotAt = parseTimestamp(receipt.snapshot_at, 'snapshot_at', failures);
  const completedAt = parseTimestamp(receipt.completed_at, 'completed_at', failures);
  const retentionUntil = parseTimestamp(receipt.retention_until, 'retention_until', failures);
  const maximumEvidenceAgeMs = contract.policy.schedule.freshness_limit_hours * 3600000;
  requireCondition(receipt.lifecycle_state === 'BACKUP_CURRENT' || receipt.lifecycle_state === 'RESTORE_REHEARSED', 'accepted receipt lifecycle must be BACKUP_CURRENT or RESTORE_REHEARSED', failures);
  requireCondition(receipt.lifecycle_state !== 'BACKUP_CURRENT' || receipt.restore === null, 'BACKUP_CURRENT must not include restore evidence', failures);
  requireCondition(receipt.project?.name === contract.project.name && receipt.project?.ref === contract.project.ref, 'receipt project identity mismatch', failures);
  requireCondition(safeReference.test(receipt.receipt_id ?? '') && safeReference.test(receipt.export_id ?? ''), 'receipt and export identities are missing or unsafe', failures);
  requireCondition(commitSha.test(receipt.source_commit ?? ''), 'source commit must be a lowercase 40-character digest', failures);
  requireCondition(typeof receipt.postgres_version === 'string' && safeReference.test(receipt.postgres_version), 'Postgres version is missing or unsafe', failures);
  requireCondition(receipt.tool_versions && Object.keys(receipt.tool_versions).length > 0 && Object.values(receipt.tool_versions).every((value) => safeReference.test(value)), 'tool versions are missing or unsafe', failures);
  requireCondition(receipt.source_state_sha256 === independentBackupSourceStateDigest(receipt), 'receipt source-state digest mismatch', failures);
  requireCondition(snapshotAt !== null && completedAt !== null && snapshotAt <= completedAt, 'backup completion cannot precede snapshot', failures);
  requireCondition(now !== null && completedAt !== null && completedAt <= now, 'backup completion cannot be future-dated', failures);
  requireCondition(now !== null && snapshotAt !== null && now - snapshotAt <= maximumEvidenceAgeMs, 'backup recovery point is stale', failures);
  requireCondition(receipt.freshness?.status === 'CURRENT' && receipt.freshness?.maximum_age_seconds === 28800, 'freshness evidence must be CURRENT at the approved threshold', failures);
  requireCondition(hexSha256.test(receipt.plaintext_sha256 ?? '') && hexSha256.test(receipt.ciphertext_sha256 ?? '') && hexSha256.test(receipt.migration_ledger_sha256 ?? ''), 'required backup digests are malformed', failures);
  requireCondition(Number.isInteger(receipt.ciphertext_bytes) && receipt.ciphertext_bytes > 0, 'ciphertext byte count must be positive', failures);
  requireCondition(receipt.encryption?.status === 'CURRENT' && receipt.encryption?.streaming_before_upload === true && receipt.encryption?.persistent_plaintext === false, 'streaming encryption evidence is incomplete', failures);
  requireCondition(receipt.encryption?.tool_class === 'age' && receipt.encryption?.automation_material === 'public_recipients_only', 'encryption mechanism or key boundary changed', failures);
  requireCondition(Array.isArray(receipt.key_recipient_ids) && receipt.key_recipient_ids.length >= 2 && new Set(receipt.key_recipient_ids).size === receipt.key_recipient_ids.length && receipt.key_recipient_ids.every((value) => safeReference.test(value)), 'at least two distinct safe recipient IDs are required', failures);
  requireCondition(safeReference.test(receipt.destination_version ?? ''), 'immutable destination version is missing or unsafe', failures);
  const gateAdmissions = Array.isArray(options.executionGateAdmissions) ? options.executionGateAdmissions : [];
  const gateAuthenticationResults = Array.isArray(options.executionGateAuthenticationResults) ? options.executionGateAuthenticationResults : [];
  const expectedGatePolicy = receipt.lifecycle_state === 'RESTORE_REHEARSED'
    ? contract.receipt_contract.execution_gate_authentication.admission_policy.restore_rehearsed
    : contract.receipt_contract.execution_gate_authentication.admission_policy.backup_current;
  requireCondition(gateAdmissions.length === expectedGatePolicy.length, 'execution gate admission denominator mismatch', failures);
  requireCondition(gateAuthenticationResults.length === expectedGatePolicy.length, 'execution gate authentication result denominator mismatch', failures);
  requireCondition(new Set(gateAdmissions.map((entry) => entry?.evidence_id)).size === gateAdmissions.length, 'execution gate admission identities are duplicate or ambiguous', failures);
  requireCondition(new Set(gateAuthenticationResults.map((entry) => entry?.result_id)).size === gateAuthenticationResults.length, 'execution gate authentication result identities are duplicate or ambiguous', failures);
  const contractArtifactDigest = sha256Hex(contract);
  const gatePolicyArtifactDigest = sha256Hex(contract.receipt_contract.execution_gate_authentication.admission_policy);
  const receiptIdentityDigest = independentBackupReceiptIdentityDigest(receipt);
  for (const [index, gatePolicy] of expectedGatePolicy.entries()) {
    const admission = gateAdmissions[index];
    const authenticationResult = gateAuthenticationResults[index];
    failures.push(...shapeFailures(executionGateAdmissionShapeValidator, admission, `execution gate admission[${index}]`));
    failures.push(...validateSanitizedReceipt(admission, `execution gate admission[${index}]`));
    failures.push(...shapeFailures(executionGateAuthenticationResultShapeValidator, authenticationResult, `execution gate authentication result[${index}]`));
    failures.push(...validateSanitizedReceipt(authenticationResult, `execution gate authentication result[${index}]`));
    const issuedAt = parseTimestamp(admission?.issued_at, `execution_gate_admission[${index}].issued_at`, failures);
    const expiresAt = parseTimestamp(admission?.expires_at, `execution_gate_admission[${index}].expires_at`, failures);
    const verifiedAt = parseTimestamp(authenticationResult?.verified_at, `execution_gate_authentication_result[${index}].verified_at`, failures);
    const executionBoundary = gatePolicy.gate_id === 'restore_rehearsal'
      ? parseTimestamp(receipt.restore?.restore_started_at, 'restore.restore_started_at for gate admission', failures)
      : snapshotAt;
    requireCondition(admission?.status === 'CURRENT'
      && admission?.gate_id === gatePolicy.gate_id
      && admission?.gate_version === gatePolicy.gate_version
      && admission?.scope === gatePolicy.scope, `execution gate admission[${index}] does not match the source-owned gate policy`, failures);
    requireCondition(admission?.contract_artifact_sha256 === contractArtifactDigest, `execution gate admission[${index}] contract artifact mismatch`, failures);
    requireCondition(admission?.policy_artifact_sha256 === gatePolicyArtifactDigest, `execution gate admission[${index}] source policy artifact mismatch`, failures);
    requireCondition(admission?.source_state_sha256 === receipt.source_state_sha256, `execution gate admission[${index}] source-state mismatch`, failures);
    requireCondition(admission?.project?.name === receipt.project?.name && admission?.project?.ref === receipt.project?.ref, `execution gate admission[${index}] project mismatch`, failures);
    requireCondition(admission?.receipt_identity?.receipt_id === receipt.receipt_id
      && admission?.receipt_identity?.receipt_identity_sha256 === receiptIdentityDigest, `execution gate admission[${index}] receipt identity mismatch`, failures);
    requireCondition(admission?.export_identity?.export_id === receipt.export_id, `execution gate admission[${index}] export identity mismatch`, failures);
    const expectedRestoreIdentity = gatePolicy.gate_id === 'restore_rehearsal'
      ? { target_project_ref: receipt.restore?.target_project?.ref, restore_receipt_sha256: sha256Hex(receipt.restore) }
      : null;
    requireCondition(canonicalSerialize(admission?.restore_identity) === canonicalSerialize(expectedRestoreIdentity), `execution gate admission[${index}] restore correlation mismatch`, failures);
    requireCondition(issuedAt !== null && expiresAt !== null && issuedAt < expiresAt, `execution gate admission[${index}] validity interval is malformed`, failures);
    requireCondition(issuedAt !== null && executionBoundary !== null && issuedAt < executionBoundary, `execution gate admission[${index}] was not issued strictly before execution`, failures);
    requireCondition(issuedAt !== null && now !== null && issuedAt <= now, `execution gate admission[${index}] cannot be future-dated`, failures);
    requireCondition(expiresAt !== null && now !== null && expiresAt >= now, `execution gate admission[${index}] is expired`, failures);
    requireCondition(issuedAt !== null && now !== null && now - issuedAt <= contract.receipt_contract.execution_gate_authentication.maximum_age_seconds * 1000, `execution gate admission[${index}] is stale`, failures);
    const subjectDigest = trustedAttestationSubjectDigest(admission);
    const resultDigest = trustedAttestationResultDigest(authenticationResult);
    requireCondition(admission?.authentication?.status === 'CURRENT'
      && admission?.authentication?.method === 'pinned_ed25519_signature_result'
      && admission?.authentication?.verification_result_sha256 === resultDigest, `execution gate admission[${index}] authentication result correlation mismatch`, failures);
    requireCondition(authenticationResult?.status === 'VERIFIED'
      && authenticationResult?.project?.name === receipt.project?.name
      && authenticationResult?.project?.ref === receipt.project?.ref
      && authenticationResult?.evidence_id === admission?.evidence_id
      && authenticationResult?.subject_sha256 === subjectDigest, `execution gate authentication result[${index}] subject mismatch`, failures);
    requireCondition(verifiedAt !== null && issuedAt !== null && verifiedAt >= issuedAt, `execution gate authentication result[${index}] predates admission`, failures);
    requireCondition(verifiedAt !== null && executionBoundary !== null && verifiedAt < executionBoundary, `execution gate authentication result[${index}] was not completed strictly before execution`, failures);
    requireCondition(verifiedAt !== null && now !== null && verifiedAt <= now, `execution gate authentication result[${index}] cannot be future-dated`, failures);
    requireCondition(hexSha256.test(authenticationResult?.external_receipt_sha256 ?? '')
      && !new Set([
        subjectDigest,
        resultDigest,
        contractArtifactDigest,
        receiptIdentityDigest,
        admission?.policy_artifact_sha256,
        admission?.source_state_sha256,
        receipt.manifest_sha256,
        receipt.plaintext_sha256,
        receipt.ciphertext_sha256
      ]).has(authenticationResult?.external_receipt_sha256), `execution gate authentication result[${index}] external receipt is self-correlated`, failures);
    requireCondition(authenticationResult?.result_sha256 === resultDigest, `execution gate authentication result[${index}] digest mismatch`, failures);
    failures.push(...verifyTrustedAttestationSignature(
      contract.receipt_contract.accepted_exports_authentication.trust_anchor,
      authenticationResult,
      executionGateSignatureDomain,
      `execution gate authentication result[${index}]`
    ));
  }
  requireCondition(receipt.object_lock?.status === 'CURRENT' && receipt.object_lock?.mode === 'COMPLIANCE', 'Object Lock compliance evidence is required', failures);
  requireCondition(safeReference.test(receipt.object_lock?.destination_reference ?? ''), 'Object Lock destination reference is missing or unsafe', failures);
  requireCondition(hexSha256.test(receipt.object_lock?.readback_manifest_sha256 ?? ''), 'Object Lock readback manifest digest is malformed', failures);
  requireCondition(retentionUntil !== null && completedAt !== null && retentionUntil >= completedAt + contract.policy.retention.standard_days * 86400000, 'retention does not cover the 35-day standard', failures);
  const objectLockReadback = options.objectLockReadback;
  failures.push(...shapeFailures(objectLockReadbackShapeValidator, objectLockReadback, 'Object Lock readback'));
  failures.push(...validateSanitizedReceipt(objectLockReadback, 'Object Lock readback'));
  requireCondition(objectLockReadback && receipt.object_lock?.readback_manifest_sha256 === sha256Hex(objectLockReadback), 'Object Lock readback manifest digest mismatch', failures);
  const objectLockObservedAt = parseTimestamp(objectLockReadback?.observed_at, 'object_lock_readback.observed_at', failures);
  const objectLockRetentionUntil = parseTimestamp(objectLockReadback?.object?.retention_until, 'object_lock_readback.object.retention_until', failures);
  requireCondition(objectLockReadback?.status === 'CURRENT', 'Object Lock readback must be CURRENT', failures);
  requireCondition(objectLockObservedAt !== null && completedAt !== null && objectLockObservedAt >= completedAt, 'Object Lock readback cannot predate backup completion', failures);
  requireCondition(objectLockObservedAt !== null && now !== null && objectLockObservedAt <= now, 'Object Lock readback cannot be future-dated', failures);
  requireCondition(objectLockObservedAt !== null && now !== null && now - objectLockObservedAt <= contract.policy.schedule.freshness_limit_hours * 3600000, 'Object Lock readback is stale', failures);
  requireCondition(objectLockReadback?.destination?.provider === contract.policy.destination.provider && objectLockReadback?.destination?.region === contract.policy.destination.region && objectLockReadback?.destination?.reference === receipt.object_lock?.destination_reference, 'Object Lock readback destination mismatch', failures);
  requireCondition(objectLockReadback?.object?.destination_version === receipt.destination_version && objectLockReadback?.object?.ciphertext_sha256 === receipt.ciphertext_sha256, 'Object Lock readback object identity mismatch', failures);
  requireCondition(objectLockReadback?.object?.locked === true && objectLockReadback?.object?.mutable === false && objectLockReadback?.object?.retention_mode === 'COMPLIANCE', 'Object Lock readback does not prove immutable compliance retention', failures);
  requireCondition(objectLockRetentionUntil !== null && retentionUntil !== null && objectLockRetentionUntil >= retentionUntil, 'Object Lock readback retention is shorter than the export retention', failures);
  requireCondition(hexSha256.test(objectLockReadback?.source_evidence_sha256 ?? ''), 'Object Lock readback source evidence is malformed', failures);
  const objectLockAttestation = options.objectLockProviderAttestation;
  const objectLockAuthenticationResult = options.objectLockAuthenticationResult;
  failures.push(...shapeFailures(objectLockProviderAttestationShapeValidator, objectLockAttestation, 'Object Lock provider attestation'));
  failures.push(...validateSanitizedReceipt(objectLockAttestation, 'Object Lock provider attestation'));
  failures.push(...shapeFailures(objectLockAuthenticationResultShapeValidator, objectLockAuthenticationResult, 'Object Lock authentication result'));
  failures.push(...validateSanitizedReceipt(objectLockAuthenticationResult, 'Object Lock authentication result'));
  const objectLockAttestationObservedAt = parseTimestamp(objectLockAttestation?.observed_at, 'object_lock_provider_attestation.observed_at', failures);
  const objectLockAuthenticationVerifiedAt = parseTimestamp(objectLockAuthenticationResult?.verified_at, 'object_lock_authentication_result.verified_at', failures);
  const objectLockSubjectDigest = trustedAttestationSubjectDigest(objectLockAttestation);
  const objectLockResultDigest = trustedAttestationResultDigest(objectLockAuthenticationResult);
  const expectedBucketIdentityDigest = sha256Hex(objectLockReadback?.destination ?? null);
  const expectedObjectIdentityDigest = sha256Hex({
    destination_version: receipt.destination_version,
    plaintext_sha256: receipt.plaintext_sha256,
    ciphertext_sha256: receipt.ciphertext_sha256
  });
  requireCondition(objectLockAttestation?.status === 'CURRENT'
    && objectLockAttestation?.project?.name === receipt.project?.name
    && objectLockAttestation?.project?.ref === receipt.project?.ref, 'Object Lock provider attestation project mismatch', failures);
  requireCondition(objectLockAttestation?.provider_class === contract.receipt_contract.object_lock_authentication.provider_class
    && objectLockAttestation?.bucket_identity_sha256 === expectedBucketIdentityDigest
    && objectLockAttestation?.object_identity_sha256 === expectedObjectIdentityDigest, 'Object Lock provider attestation provider/object identity mismatch', failures);
  requireCondition(objectLockAttestation?.receipt_manifest_sha256 === receipt.manifest_sha256
    && objectLockAttestation?.readback_manifest_sha256 === receipt.object_lock?.readback_manifest_sha256, 'Object Lock provider attestation receipt/readback correlation mismatch', failures);
  requireCondition(objectLockAttestation?.object?.destination_version === receipt.destination_version
    && objectLockAttestation?.object?.plaintext_sha256 === receipt.plaintext_sha256
    && objectLockAttestation?.object?.ciphertext_sha256 === receipt.ciphertext_sha256
    && objectLockAttestation?.object?.lock_mode === contract.policy.destination.retention_mode
    && objectLockAttestation?.object?.retention_until === objectLockReadback?.object?.retention_until, 'Object Lock provider attestation export/retention mismatch', failures);
  requireCondition(objectLockAttestationObservedAt !== null && objectLockObservedAt !== null && objectLockAttestationObservedAt === objectLockObservedAt, 'Object Lock provider attestation observation mismatch', failures);
  requireCondition(objectLockAttestationObservedAt !== null && now !== null && objectLockAttestationObservedAt <= now, 'Object Lock provider attestation cannot be future-dated', failures);
  requireCondition(objectLockAttestationObservedAt !== null && now !== null
    && now - objectLockAttestationObservedAt <= contract.receipt_contract.object_lock_authentication.maximum_age_seconds * 1000, 'Object Lock provider attestation is stale', failures);
  requireCondition(objectLockAttestation?.authentication?.status === 'CURRENT'
    && objectLockAttestation?.authentication?.method === 'pinned_ed25519_signature_result'
    && objectLockAttestation?.authentication?.verification_result_sha256 === objectLockResultDigest, 'Object Lock provider attestation authentication result correlation mismatch', failures);
  requireCondition(objectLockAuthenticationResult?.status === 'VERIFIED'
    && objectLockAuthenticationResult?.project?.name === receipt.project?.name
    && objectLockAuthenticationResult?.project?.ref === receipt.project?.ref
    && objectLockAuthenticationResult?.evidence_id === objectLockAttestation?.evidence_id
    && objectLockAuthenticationResult?.subject_sha256 === objectLockSubjectDigest, 'Object Lock authentication result subject mismatch', failures);
  requireCondition(objectLockAuthenticationVerifiedAt !== null && objectLockAttestationObservedAt !== null
    && objectLockAuthenticationVerifiedAt >= objectLockAttestationObservedAt
    && now !== null && objectLockAuthenticationVerifiedAt <= now, 'Object Lock authentication result verification time is invalid', failures);
  requireCondition(hexSha256.test(objectLockAuthenticationResult?.external_receipt_sha256 ?? '')
    && !new Set([
      objectLockSubjectDigest,
      objectLockResultDigest,
      receipt.manifest_sha256,
      receipt.object_lock?.readback_manifest_sha256,
      objectLockReadback?.source_evidence_sha256
    ]).has(objectLockAuthenticationResult?.external_receipt_sha256), 'Object Lock authentication result external receipt is self-correlated', failures);
  requireCondition(objectLockAuthenticationResult?.result_sha256 === objectLockResultDigest, 'Object Lock authentication result digest mismatch', failures);
  failures.push(...verifyTrustedAttestationSignature(
    contract.receipt_contract.accepted_exports_authentication.trust_anchor,
    objectLockAuthenticationResult,
    objectLockSignatureDomain,
    'Object Lock authentication result'
  ));
  const monthlySelection = receipt.monthly_selection;
  const acceptedExportsManifest = options.acceptedExportsManifest;
  failures.push(...validateAcceptedExportsManifestShape(acceptedExportsManifest));
  const expectedMonth = completedAt === null ? null : new Date(completedAt).toISOString().slice(0, 7);
  requireCondition(monthlySelection?.status === 'CURRENT' && monthlySelection?.month_utc === expectedMonth, 'monthly selection must correlate to the backup completion month', failures);
  requireCondition(hexSha256.test(monthlySelection?.accepted_exports_manifest_sha256 ?? ''), 'monthly selection requires an independently verifiable accepted-exports manifest', failures);
  requireCondition(acceptedExportsManifest && monthlySelection?.accepted_exports_manifest_sha256 === sha256Hex(acceptedExportsManifest), 'monthly selection manifest digest mismatch', failures);
  const acceptedManifestObservedAt = parseTimestamp(acceptedExportsManifest?.observed_at, 'accepted_exports_manifest.observed_at', failures);
  requireCondition(acceptedExportsManifest?.status === 'CURRENT' && acceptedExportsManifest?.month_utc === expectedMonth, 'accepted exports manifest must be current for the backup completion month', failures);
  requireCondition(hexSha256.test(acceptedExportsManifest?.source_evidence_sha256 ?? ''), 'accepted exports manifest source evidence is malformed', failures);
  requireCondition(acceptedManifestObservedAt !== null && completedAt !== null && acceptedManifestObservedAt >= completedAt, 'accepted exports manifest cannot predate backup completion', failures);
  requireCondition(acceptedManifestObservedAt !== null && now !== null && acceptedManifestObservedAt <= now, 'accepted exports manifest cannot be future-dated', failures);
  const acceptedExports = Array.isArray(acceptedExportsManifest?.entries) ? acceptedExportsManifest.entries : [];
  const acceptedExportTimes = acceptedExports.map((entry) => parseTimestamp(entry?.completed_at, 'accepted_exports_manifest.entries.completed_at', failures));
  requireCondition(acceptedExports.every((entry, index) => acceptedExportTimes[index] !== null && new Date(acceptedExportTimes[index]).toISOString().slice(0, 7) === expectedMonth), 'accepted exports manifest contains an entry outside the completion month', failures);
  requireCondition(acceptedExportTimes.every((value, index) => index === 0 || acceptedExportTimes[index - 1] < value), 'accepted exports manifest entries must be strictly ordered by completion time', failures);
  requireCondition(new Set(acceptedExports.map((entry) => entry?.destination_version)).size === acceptedExports.length && new Set(acceptedExports.map((entry) => entry?.ciphertext_sha256)).size === acceptedExports.length, 'accepted exports manifest entries must have distinct immutable identities', failures);
  const currentExportMatches = acceptedExports.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry?.completed_at === receipt.completed_at && entry?.destination_version === receipt.destination_version && entry?.ciphertext_sha256 === receipt.ciphertext_sha256);
  requireCondition(currentExportMatches.length === 1, 'accepted exports manifest must contain the current export exactly once', failures);
  requireCondition(currentExportMatches.length === 1 && currentExportMatches[0].index === acceptedExports.length - 1, 'accepted exports manifest current export must be the latest accepted entry', failures);
  const acceptedExportsEvidence = options.acceptedExportsEvidence;
  failures.push(...shapeFailures(acceptedExportsEvidenceShapeValidator, acceptedExportsEvidence, 'accepted exports evidence'));
  failures.push(...validateSanitizedReceipt(acceptedExportsEvidence, 'accepted exports evidence'));
  const acceptedEvidenceObservedAt = parseTimestamp(acceptedExportsEvidence?.observed_at, 'accepted_exports_evidence.observed_at', failures);
  const acceptedHistoryStartedAt = parseTimestamp(acceptedExportsEvidence?.history?.window_started_at, 'accepted_exports_evidence.history.window_started_at', failures);
  const acceptedHistoryEndedAt = parseTimestamp(acceptedExportsEvidence?.history?.window_ended_at, 'accepted_exports_evidence.history.window_ended_at', failures);
  const acceptedEvidenceEntries = Array.isArray(acceptedExportsEvidence?.entries) ? acceptedExportsEvidence.entries : [];
  const acceptedEvidenceDigest = acceptedExportsEvidence && typeof acceptedExportsEvidence === 'object' && !Array.isArray(acceptedExportsEvidence)
    ? sha256Hex(acceptedExportsEvidence)
    : null;
  const acceptedEvidenceEntriesDigest = sha256Hex(acceptedEvidenceEntries);
  const expectedHistoryStart = expectedMonth === null ? null : `${expectedMonth}-01T00:00:00Z`;
  requireCondition(acceptedExportsEvidence?.status === 'CURRENT' && acceptedExportsEvidence?.evidence_class === 'authenticated_accepted_exports_readback', 'accepted exports evidence must be an authenticated CURRENT readback', failures);
  requireCondition(safeReference.test(acceptedExportsEvidence?.evidence_id ?? ''), 'accepted exports evidence identity is missing or unsafe', failures);
  requireCondition(acceptedExportsEvidence?.project?.name === receipt.project?.name && acceptedExportsEvidence?.project?.ref === receipt.project?.ref, 'accepted exports evidence project mismatch', failures);
  requireCondition(acceptedExportsEvidence?.month_utc === expectedMonth, 'accepted exports evidence month mismatch', failures);
  requireCondition(acceptedExportsEvidence?.policy?.full_export_interval_hours === contract.policy.schedule.full_export_interval_hours
    && acceptedExportsEvidence?.policy?.standard_retention_days === contract.policy.retention.standard_days
    && acceptedExportsEvidence?.policy?.first_accepted_monthly_days === contract.policy.retention.first_accepted_monthly_days, 'accepted exports evidence policy denominator mismatch', failures);
  requireCondition(acceptedEvidenceObservedAt !== null && acceptedManifestObservedAt !== null && acceptedEvidenceObservedAt === acceptedManifestObservedAt, 'accepted exports evidence observation mismatch', failures);
  requireCondition(acceptedEvidenceObservedAt !== null && completedAt !== null && acceptedEvidenceObservedAt >= completedAt, 'accepted exports evidence cannot predate backup completion', failures);
  requireCondition(acceptedEvidenceObservedAt !== null && now !== null && acceptedEvidenceObservedAt <= now, 'accepted exports evidence cannot be future-dated', failures);
  requireCondition(acceptedEvidenceObservedAt !== null && now !== null && now - acceptedEvidenceObservedAt <= maximumEvidenceAgeMs, 'accepted exports evidence is stale', failures);
  requireCondition(acceptedExportsEvidence?.history?.complete === true, 'accepted exports evidence history is incomplete', failures);
  requireCondition(acceptedHistoryStartedAt !== null && acceptedExportsEvidence?.history?.window_started_at === expectedHistoryStart, 'accepted exports evidence history does not begin at the UTC month boundary', failures);
  requireCondition(acceptedHistoryEndedAt !== null && acceptedEvidenceObservedAt !== null && acceptedHistoryEndedAt === acceptedEvidenceObservedAt, 'accepted exports evidence history window does not end at observation', failures);
  requireCondition(acceptedExportsEvidence?.history?.entry_count === acceptedEvidenceEntries.length && acceptedEvidenceEntries.length === acceptedExports.length, 'accepted exports evidence history denominator mismatch', failures);
  requireCondition(acceptedExportsEvidence?.history?.entries_manifest_sha256 === acceptedEvidenceEntriesDigest, 'accepted exports evidence history manifest digest mismatch', failures);
  requireCondition(acceptedExportsEvidence?.history?.latest_entry_sha256 === acceptedEvidenceEntries.at(-1)?.entry_sha256, 'accepted exports evidence latest-entry correlation mismatch', failures);
  requireCondition(acceptedEvidenceEntries.length === acceptedExports.length && acceptedEvidenceEntries.every((entry, index) => entry?.completed_at === acceptedExports[index]?.completed_at
    && entry?.destination_version === acceptedExports[index]?.destination_version
    && entry?.ciphertext_sha256 === acceptedExports[index]?.ciphertext_sha256), 'accepted exports evidence entries do not match the accepted manifest', failures);
  const acceptedEvidenceEntryDigests = acceptedEvidenceEntries.map((entry) => acceptedExportHistoryEntryDigest(entry));
  const acceptedEvidenceAcceptedTimes = acceptedEvidenceEntries.map((entry) => parseTimestamp(entry?.accepted_at, 'accepted_exports_evidence.entries.accepted_at', failures));
  const acceptedEvidenceRetentionTimes = acceptedEvidenceEntries.map((entry) => parseTimestamp(entry?.retention_until, 'accepted_exports_evidence.entries.retention_until', failures));
  const finiteAcceptedTimes = acceptedEvidenceAcceptedTimes.filter((value) => value !== null);
  const acceptedTimesDistinct = finiteAcceptedTimes.length === acceptedEvidenceAcceptedTimes.length
    && new Set(finiteAcceptedTimes).size === acceptedEvidenceAcceptedTimes.length;
  requireCondition(acceptedTimesDistinct, 'accepted exports evidence acceptance chronology is duplicate or ambiguous', failures);
  const firstAcceptedIndex = acceptedTimesDistinct
    ? acceptedEvidenceAcceptedTimes.reduce((earliest, value, index) => value < acceptedEvidenceAcceptedTimes[earliest] ? index : earliest, 0)
    : null;
  const orderedAcceptedTimes = acceptedTimesDistinct ? [...acceptedEvidenceAcceptedTimes].sort((left, right) => left - right) : [];
  const cadenceIntervalMs = contract.policy.schedule.full_export_interval_hours * 3600000;
  const monthStartAt = expectedHistoryStart === null ? null : Date.parse(expectedHistoryStart);
  const finiteCompletionTimes = acceptedExportTimes.filter((value) => value !== null);
  const completionTimesDistinct = finiteCompletionTimes.length === acceptedExportTimes.length
    && new Set(finiteCompletionTimes).size === acceptedExportTimes.length;
  requireCondition(completionTimesDistinct, 'accepted exports evidence completion chronology is duplicate or ambiguous', failures);
  const completionCadenceComplete = completionTimesDistinct
    && acceptedExportTimes.length > 0
    && monthStartAt !== null
    && acceptedExportTimes[0] >= monthStartAt
    && acceptedExportTimes[0] - monthStartAt <= cadenceIntervalMs
    && acceptedExportTimes.every((value, index) => index === 0 || (value > acceptedExportTimes[index - 1] && value - acceptedExportTimes[index - 1] <= cadenceIntervalMs))
    && acceptedEvidenceObservedAt !== null
    && acceptedEvidenceObservedAt >= acceptedExportTimes.at(-1)
    && acceptedEvidenceObservedAt - acceptedExportTimes.at(-1) <= cadenceIntervalMs
    && acceptedExportTimes.every((value) => new Date(value).toISOString().slice(0, 7) === expectedMonth);
  requireCondition(completionCadenceComplete, 'accepted exports evidence completion cadence exceeds full_export_interval_hours', failures);
  const acceptedCadenceComplete = orderedAcceptedTimes.length > 0
    && monthStartAt !== null
    && orderedAcceptedTimes[0] >= monthStartAt
    && orderedAcceptedTimes[0] - monthStartAt <= cadenceIntervalMs
    && orderedAcceptedTimes.every((value, index) => index === 0 || value - orderedAcceptedTimes[index - 1] <= cadenceIntervalMs)
    && acceptedEvidenceObservedAt !== null
    && acceptedEvidenceObservedAt >= orderedAcceptedTimes.at(-1)
    && acceptedEvidenceObservedAt - orderedAcceptedTimes.at(-1) <= cadenceIntervalMs
    && orderedAcceptedTimes.every((value) => new Date(value).toISOString().slice(0, 7) === expectedMonth);
  requireCondition(acceptedCadenceComplete, 'accepted exports evidence cadence exceeds full_export_interval_hours', failures);
  requireCondition(acceptedEvidenceEntries.every((entry, index) => entry?.sequence === index), 'accepted exports evidence sequence contains a gap or ambiguity', failures);
  requireCondition(acceptedEvidenceEntries.every((entry, index) => entry?.entry_sha256 === acceptedEvidenceEntryDigests[index]), 'accepted exports evidence entry digest mismatch', failures);
  requireCondition(acceptedEvidenceEntries.every((entry, index) => entry?.previous_entry_sha256 === (index === 0 ? null : acceptedEvidenceEntries[index - 1]?.entry_sha256)), 'accepted exports evidence predecessor chain is unverifiable', failures);
  requireCondition(new Set(acceptedEvidenceEntries.map((entry) => entry?.entry_sha256)).size === acceptedEvidenceEntries.length
    && new Set(acceptedEvidenceEntries.map((entry) => entry?.immutable_readback_sha256)).size === acceptedEvidenceEntries.length, 'accepted exports evidence entries are duplicate or ambiguous', failures);
  requireCondition(acceptedEvidenceEntries.every((entry, index) => acceptedExportTimes[index] !== null
    && acceptedEvidenceAcceptedTimes[index] !== null
    && acceptedEvidenceAcceptedTimes[index] >= acceptedExportTimes[index]
    && acceptedEvidenceObservedAt !== null
    && acceptedEvidenceAcceptedTimes[index] <= acceptedEvidenceObservedAt), 'accepted exports evidence acceptance chronology is invalid', failures);
  requireCondition(acceptedEvidenceEntries.every((entry, index) => acceptedExportTimes[index] !== null
    && acceptedEvidenceRetentionTimes[index] !== null
    && acceptedEvidenceRetentionTimes[index] >= acceptedExportTimes[index] + (index === firstAcceptedIndex ? contract.policy.retention.first_accepted_monthly_days : contract.policy.retention.standard_days) * 86400000), 'accepted exports evidence retention history violates policy', failures);
  requireCondition(acceptedEvidenceEntries.every((entry) => hexSha256.test(entry?.immutable_readback_sha256 ?? '') && entry.immutable_readback_sha256 !== entry.ciphertext_sha256), 'accepted exports evidence immutable readback is missing or self-correlated', failures);
  const acceptedManifestSourceDigest = acceptedExportsManifest?.source_evidence_sha256;
  requireCondition(hexSha256.test(acceptedManifestSourceDigest ?? '') && acceptedEvidenceDigest !== null && acceptedManifestSourceDigest === acceptedEvidenceDigest, 'accepted exports evidence digest mismatch', failures);
  const acceptedAuthenticationResult = options.acceptedExportsAuthenticationResult;
  failures.push(...shapeFailures(acceptedExportsAuthenticationResultShapeValidator, acceptedAuthenticationResult, 'accepted exports authentication result'));
  failures.push(...validateSanitizedReceipt(acceptedAuthenticationResult, 'accepted exports authentication result'));
  const acceptedAuthenticationVerifiedAt = parseTimestamp(acceptedAuthenticationResult?.verified_at, 'accepted_exports_authentication_result.verified_at', failures);
  const acceptedAuthenticationSubjectDigest = acceptedExportsAuthenticationSubjectDigest(acceptedExportsEvidence);
  const acceptedAuthenticationResultDigest = acceptedExportsAuthenticationResultDigest(acceptedAuthenticationResult);
  const acceptedAuthenticationDigest = acceptedExportsEvidence?.authentication?.verification_result_sha256;
  const acceptedAuthenticationDigestValid = hexSha256.test(acceptedAuthenticationDigest ?? '');
  const acceptedExternalReceiptDigest = acceptedAuthenticationResult?.external_receipt_sha256;
  requireCondition(acceptedExportsEvidence?.authentication?.status === 'CURRENT'
    && acceptedExportsEvidence?.authentication?.method === 'pinned_ed25519_signature_result'
    && acceptedAuthenticationDigestValid, 'accepted exports evidence authentication is incomplete', failures);
  requireCondition(acceptedAuthenticationResult?.status === 'VERIFIED'
    && acceptedAuthenticationResult?.result_class === 'trusted_external_authentication_verification'
    && acceptedAuthenticationResult?.verification_method === 'external_signature_verification', 'accepted exports authentication result is not VERIFIED', failures);
  failures.push(...verifyAcceptedExportsAuthenticationSignature(contract.receipt_contract?.accepted_exports_authentication?.trust_anchor, acceptedAuthenticationResult));
  requireCondition(acceptedAuthenticationResultDigest !== null
    && acceptedAuthenticationResult?.result_sha256 === acceptedAuthenticationResultDigest
    && acceptedAuthenticationDigest === acceptedAuthenticationResultDigest, 'accepted exports authentication result digest mismatch', failures);
  requireCondition(acceptedAuthenticationResult?.project?.name === receipt.project?.name
    && acceptedAuthenticationResult?.project?.ref === receipt.project?.ref
    && acceptedAuthenticationResult?.month_utc === expectedMonth
    && acceptedAuthenticationResult?.evidence_id === acceptedExportsEvidence?.evidence_id, 'accepted exports authentication result correlation mismatch', failures);
  requireCondition(acceptedAuthenticationSubjectDigest !== null
    && acceptedAuthenticationResult?.subject_sha256 === acceptedAuthenticationSubjectDigest, 'accepted exports authentication subject mismatch', failures);
  requireCondition(acceptedAuthenticationVerifiedAt !== null
    && acceptedEvidenceObservedAt !== null
    && acceptedAuthenticationVerifiedAt >= acceptedEvidenceObservedAt
    && now !== null
    && acceptedAuthenticationVerifiedAt <= now, 'accepted exports authentication result chronology is invalid', failures);
  requireCondition(acceptedAuthenticationVerifiedAt !== null
    && now !== null
    && now - acceptedAuthenticationVerifiedAt <= maximumEvidenceAgeMs, 'accepted exports authentication result is stale', failures);
  requireCondition(safeReference.test(acceptedAuthenticationResult?.verifier_reference ?? '')
    && hexSha256.test(acceptedExternalReceiptDigest ?? ''), 'accepted exports authentication result lacks external verification evidence', failures);
  if (acceptedAuthenticationDigestValid) {
    const circularDigests = [
      acceptedEvidenceDigest,
      acceptedAuthenticationSubjectDigest,
      acceptedEvidenceEntriesDigest,
      sha256Hex(acceptedExportsManifest),
      receipt.manifest_sha256,
      receipt.plaintext_sha256,
      receipt.ciphertext_sha256,
      ...acceptedEvidenceEntries.map((entry) => entry?.entry_sha256),
      ...acceptedEvidenceEntries.map((entry) => entry?.ciphertext_sha256),
      ...acceptedEvidenceEntries.map((entry) => entry?.immutable_readback_sha256)
    ].filter(Boolean);
    requireCondition(!circularDigests.includes(acceptedAuthenticationDigest), 'accepted exports evidence authentication is circular or self-reported', failures);
    requireCondition(![...circularDigests, acceptedAuthenticationDigest].includes(acceptedExternalReceiptDigest), 'accepted exports authentication external receipt is circular or self-reported', failures);
  }
  const sourceCircularDigests = [sha256Hex(acceptedExportsManifest), receipt.manifest_sha256, acceptedEvidenceEntriesDigest, acceptedAuthenticationDigest].filter(Boolean);
  requireCondition(!sourceCircularDigests.includes(acceptedManifestSourceDigest), 'accepted exports manifest source evidence is circular or self-reported', failures);
  if (currentExportMatches.length === 1 && currentExportMatches[0].index === firstAcceptedIndex) requireCondition(retentionUntil !== null && completedAt !== null && retentionUntil >= completedAt + contract.policy.retention.first_accepted_monthly_days * 86400000, 'first accepted monthly export retention does not cover 400 days', failures);
  const receiptCoverage = Array.isArray(receipt.coverage) ? receipt.coverage : [];
  requireCondition(sameSet(receiptCoverage.map((entry) => entry?.unit), coverageUnits), 'receipt coverage denominator changed', failures);
  const storageBodiesEntry = receiptCoverage.find((entry) => entry?.unit === 'storage_object_bodies');
  for (const [index, entry] of receiptCoverage.entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.unit !== 'string') {
      failures.push(`coverage[${index}]: coverage entry is malformed`);
      continue;
    }
    const isStorageBodies = entry.unit === 'storage_object_bodies';
    if (isStorageBodies) {
      const emptyStorageBodies = entry.status === 'NOT_APPLICABLE'
        && entry.aggregate_count === 0
        && entry.private_digest === null
        && entry.body_recovery_receipt_status === 'NOT_APPLICABLE'
        && entry.body_recovery_receipt_sha256 === null;
      const currentStorageBodies = entry.status === 'CURRENT'
        && Number.isInteger(entry.aggregate_count)
        && entry.aggregate_count > 0
        && hexSha256.test(entry.private_digest ?? '')
        && entry.body_recovery_receipt_status === 'CURRENT'
        && hexSha256.test(entry.body_recovery_receipt_sha256 ?? '');
      requireCondition(emptyStorageBodies || currentStorageBodies, 'Storage body coverage state contradicts its authoritative denominator', failures);
    } else {
      const current = entry.status === 'CURRENT' && Number.isInteger(entry.aggregate_count) && entry.aggregate_count >= 0 && hexSha256.test(entry.private_digest ?? '');
      requireCondition(current, `${entry.unit}: coverage is incomplete`, failures);
    }
  }
  const storageInventoryEvidence = options.storageInventoryEvidence;
  failures.push(...shapeFailures(storageInventoryEvidenceShapeValidator, storageInventoryEvidence, 'Storage inventory evidence'));
  failures.push(...validateSanitizedReceipt(storageInventoryEvidence, 'Storage inventory evidence'));
  const storageInventoryObservedAt = parseTimestamp(storageInventoryEvidence?.observed_at, 'storage_inventory_evidence.observed_at', failures);
  const storageInventoryBucketCount = storageInventoryEvidence?.denominator?.bucket_count;
  const storageInventoryObjectCount = storageInventoryEvidence?.denominator?.object_count;
  const storageInventoryTotalBytes = storageInventoryEvidence?.denominator?.total_bytes;
  const storageInventorySourceDigest = storageInventoryEvidence?.source_evidence_sha256;
  requireCondition(storageInventoryEvidence?.status === 'CURRENT', 'Storage inventory evidence must be CURRENT', failures);
  requireCondition(storageInventoryEvidence?.project?.name === receipt.project?.name && storageInventoryEvidence?.project?.ref === receipt.project?.ref, 'Storage inventory evidence project mismatch', failures);
  requireCondition(storageInventoryEvidence?.provider_snapshot_identity?.provider_class === contract.receipt_contract.storage_inventory_authentication.provider_class
    && storageInventoryEvidence?.provider_snapshot_identity?.source_snapshot_sha256 === receipt.source_state_sha256, 'Storage inventory evidence provider snapshot mismatch', failures);
  requireCondition(storageInventoryEvidence?.snapshot_at === receipt.snapshot_at, 'Storage inventory evidence snapshot mismatch', failures);
  requireCondition(storageInventoryEvidence?.export_identity?.export_id === receipt.export_id
    && storageInventoryEvidence?.export_identity?.destination_version === receipt.destination_version
    && storageInventoryEvidence?.export_identity?.ciphertext_sha256 === receipt.ciphertext_sha256, 'Storage inventory evidence export identity mismatch', failures);
  requireCondition(storageInventoryObservedAt !== null && completedAt !== null && storageInventoryObservedAt >= completedAt, 'Storage inventory evidence cannot predate backup completion', failures);
  requireCondition(storageInventoryObservedAt !== null && now !== null && storageInventoryObservedAt <= now, 'Storage inventory evidence cannot be future-dated', failures);
  requireCondition(storageInventoryObservedAt !== null && now !== null && now - storageInventoryObservedAt <= maximumEvidenceAgeMs, 'Storage inventory evidence is stale', failures);
  requireCondition(storageInventoryEvidence?.denominator?.inventory_manifest_sha256 === storageInventoryManifestDigest(storageInventoryEvidence), 'Storage inventory manifest digest mismatch', failures);
  requireCondition(Number.isInteger(storageInventoryBucketCount) && storageInventoryBucketCount >= 0 && Number.isInteger(storageInventoryObjectCount) && storageInventoryObjectCount >= 0 && Number.isInteger(storageInventoryTotalBytes) && storageInventoryTotalBytes >= 0, 'Storage inventory aggregate denominator is malformed', failures);
  requireCondition(storageInventoryObjectCount === storageBodiesEntry?.aggregate_count, 'Storage inventory does not match the Storage object denominator', failures);
  requireCondition(storageInventoryObjectCount === 0
    ? storageInventoryBucketCount === 0 && storageInventoryTotalBytes === 0
    : storageInventoryBucketCount > 0, 'Storage inventory zero/positive state is contradictory', failures);
  const storageInventorySourceDigestValid = hexSha256.test(storageInventorySourceDigest ?? '');
  requireCondition(storageInventorySourceDigestValid, 'Storage inventory source evidence is malformed', failures);
  if (storageInventorySourceDigestValid) {
    const selfCorrelationDigests = [
      storageInventoryEvidence?.denominator?.inventory_manifest_sha256,
      storageInventorySelfCorrelationDigest(storageInventoryEvidence),
      receipt.manifest_sha256,
      receipt.plaintext_sha256,
      receipt.ciphertext_sha256
    ];
    requireCondition(!selfCorrelationDigests.includes(storageInventorySourceDigest), 'Storage inventory source evidence is self-correlated', failures);
    const independentEvidenceDigests = [objectLockReadback?.source_evidence_sha256, acceptedExportsManifest?.source_evidence_sha256].filter(Boolean);
    requireCondition(!independentEvidenceDigests.includes(storageInventorySourceDigest), 'Storage inventory source evidence must be distinct from other evidence', failures);
  }
  const storageInventoryAuthenticationResult = options.storageInventoryAuthenticationResult;
  failures.push(...shapeFailures(storageInventoryAuthenticationResultShapeValidator, storageInventoryAuthenticationResult, 'Storage inventory authentication result'));
  failures.push(...validateSanitizedReceipt(storageInventoryAuthenticationResult, 'Storage inventory authentication result'));
  const storageInventoryVerifiedAt = parseTimestamp(storageInventoryAuthenticationResult?.verified_at, 'storage_inventory_authentication_result.verified_at', failures);
  const storageInventorySubjectDigest = trustedAttestationSubjectDigest(storageInventoryEvidence);
  const storageInventoryResultDigest = trustedAttestationResultDigest(storageInventoryAuthenticationResult);
  requireCondition(storageInventoryEvidence?.authentication?.status === 'CURRENT'
    && storageInventoryEvidence?.authentication?.method === 'pinned_ed25519_signature_result'
    && storageInventoryEvidence?.authentication?.verification_result_sha256 === storageInventoryResultDigest, 'Storage inventory authentication result correlation mismatch', failures);
  requireCondition(storageInventoryAuthenticationResult?.status === 'VERIFIED'
    && storageInventoryAuthenticationResult?.project?.name === receipt.project?.name
    && storageInventoryAuthenticationResult?.project?.ref === receipt.project?.ref
    && storageInventoryAuthenticationResult?.evidence_id === storageInventoryEvidence?.evidence_id
    && storageInventoryAuthenticationResult?.subject_sha256 === storageInventorySubjectDigest, 'Storage inventory authentication result subject mismatch', failures);
  requireCondition(storageInventoryVerifiedAt !== null && storageInventoryObservedAt !== null && storageInventoryVerifiedAt >= storageInventoryObservedAt, 'Storage inventory authentication result predates observation', failures);
  requireCondition(storageInventoryVerifiedAt !== null && now !== null && storageInventoryVerifiedAt <= now, 'Storage inventory authentication result cannot be future-dated', failures);
  requireCondition(storageInventoryVerifiedAt !== null && now !== null
    && now - storageInventoryVerifiedAt <= contract.receipt_contract.storage_inventory_authentication.maximum_age_seconds * 1000, 'Storage inventory authentication result is stale', failures);
  requireCondition(storageInventoryAuthenticationResult?.external_receipt_sha256 === storageInventorySourceDigest
    && !new Set([
      storageInventorySubjectDigest,
      storageInventoryResultDigest,
      storageInventoryEvidence?.denominator?.inventory_manifest_sha256,
      receipt.manifest_sha256,
      receipt.plaintext_sha256,
      receipt.ciphertext_sha256
    ]).has(storageInventoryAuthenticationResult?.external_receipt_sha256), 'Storage inventory authentication external receipt is circular or mismatched', failures);
  requireCondition(storageInventoryAuthenticationResult?.result_sha256 === storageInventoryResultDigest, 'Storage inventory authentication result digest mismatch', failures);
  failures.push(...verifyTrustedAttestationSignature(
    contract.receipt_contract.accepted_exports_authentication.trust_anchor,
    storageInventoryAuthenticationResult,
    storageInventorySignatureDomain,
    'Storage inventory authentication result'
  ));
  const storageBodiesClaimed = storageBodiesEntry?.status === 'CURRENT'
    || (storageBodiesEntry?.aggregate_count ?? 0) > 0
    || storageBodiesEntry?.body_recovery_receipt_status === 'CURRENT'
    || (storageBodiesEntry?.body_recovery_receipt_sha256 !== null && storageBodiesEntry?.body_recovery_receipt_sha256 !== undefined);
  if (storageBodiesClaimed) {
    const storageBodyRecoveryReceipt = options.storageBodyRecoveryReceipt;
    failures.push(...shapeFailures(storageBodyRecoveryReceiptShapeValidator, storageBodyRecoveryReceipt, 'Storage body recovery receipt'));
    failures.push(...validateSanitizedReceipt(storageBodyRecoveryReceipt, 'Storage body recovery receipt'));
    requireCondition(storageBodyRecoveryReceipt && storageBodiesEntry?.body_recovery_receipt_sha256 === sha256Hex(storageBodyRecoveryReceipt), 'Storage body recovery receipt digest mismatch', failures);
    const storageObservedAt = parseTimestamp(storageBodyRecoveryReceipt?.observed_at, 'storage_body_recovery_receipt.observed_at', failures);
    const storageRetentionUntil = parseTimestamp(storageBodyRecoveryReceipt?.retention_until, 'storage_body_recovery_receipt.retention_until', failures);
    const storageRestoreVerifiedAt = parseTimestamp(storageBodyRecoveryReceipt?.restore_proof?.verified_at, 'storage_body_recovery_receipt.restore_proof.verified_at', failures);
    requireCondition(storageBodyRecoveryReceipt?.status === 'CURRENT', 'Storage body recovery receipt must be CURRENT', failures);
    requireCondition(storageBodyRecoveryReceipt?.project?.name === receipt.project?.name && storageBodyRecoveryReceipt?.project?.ref === receipt.project?.ref, 'Storage body recovery receipt project mismatch', failures);
    requireCondition(storageBodyRecoveryReceipt?.snapshot_at === receipt.snapshot_at, 'Storage body recovery receipt snapshot mismatch', failures);
    requireCondition(storageObservedAt !== null && completedAt !== null && storageObservedAt >= completedAt, 'Storage body recovery receipt cannot predate backup completion', failures);
    requireCondition(storageObservedAt !== null && now !== null && storageObservedAt <= now, 'Storage body recovery receipt cannot be future-dated', failures);
    requireCondition(storageObservedAt !== null && now !== null && now - storageObservedAt <= contract.policy.schedule.freshness_limit_hours * 3600000, 'Storage body recovery receipt is stale', failures);
    requireCondition(storageRetentionUntil !== null && retentionUntil !== null && storageRetentionUntil >= retentionUntil, 'Storage body recovery retention is shorter than the export retention', failures);
    requireCondition(storageBodyRecoveryReceipt?.restore_proof?.status === 'CURRENT' && hexSha256.test(storageBodyRecoveryReceipt?.restore_proof?.receipt_sha256 ?? ''), 'Storage body recovery restore proof is incomplete', failures);
    requireCondition(storageRestoreVerifiedAt !== null && completedAt !== null && storageRestoreVerifiedAt >= completedAt && storageObservedAt !== null && storageRestoreVerifiedAt <= storageObservedAt, 'Storage body recovery restore proof chronology is invalid', failures);
    const storageBuckets = Array.isArray(storageBodyRecoveryReceipt?.denominator?.buckets) ? storageBodyRecoveryReceipt.denominator.buckets : [];
    const expectedBucketsDigest = sha256Hex(storageBuckets);
    requireCondition(storageBodyRecoveryReceipt?.denominator?.buckets_manifest_sha256 === expectedBucketsDigest, 'Storage body recovery bucket manifest digest mismatch', failures);
    requireCondition(storageBodyRecoveryReceipt?.denominator?.bucket_count === storageBuckets.length, 'Storage body recovery bucket denominator mismatch', failures);
    requireCondition(new Set(storageBuckets.map((bucket) => bucket?.bucket_reference)).size === storageBuckets.length, 'Storage body recovery bucket references must be distinct', failures);
    requireCondition(new Set(storageBuckets.map((bucket) => bucket?.object_manifest_sha256)).size === storageBuckets.length && new Set(storageBuckets.map((bucket) => bucket?.body_content_sha256)).size === storageBuckets.length, 'Storage body recovery bucket evidence must be distinct', failures);
    requireCondition(storageBuckets.every((bucket) => Number.isInteger(bucket?.object_count) && Number.isInteger(bucket?.body_count) && bucket.object_count === bucket.body_count && bucket.object_count >= 0 && Number.isInteger(bucket?.total_bytes) && bucket.total_bytes >= 0), 'Storage body recovery bucket coverage is partial or malformed', failures);
    const storageObjectCount = storageBuckets.reduce((sum, bucket) => sum + (Number.isInteger(bucket?.object_count) ? bucket.object_count : 0), 0);
    const storageBodyCount = storageBuckets.reduce((sum, bucket) => sum + (Number.isInteger(bucket?.body_count) ? bucket.body_count : 0), 0);
    const storageByteCount = storageBuckets.reduce((sum, bucket) => sum + (Number.isInteger(bucket?.total_bytes) ? bucket.total_bytes : 0), 0);
    requireCondition(storageBodyRecoveryReceipt?.denominator?.object_count === storageObjectCount && storageBodyRecoveryReceipt?.denominator?.body_count === storageBodyCount && storageBodyRecoveryReceipt?.denominator?.total_bytes === storageByteCount, 'Storage body recovery aggregate denominator mismatch', failures);
    requireCondition(storageObjectCount === storageBodiesEntry?.aggregate_count && storageBodyCount === storageBodiesEntry?.aggregate_count, 'Storage body recovery does not cover the exact Storage object denominator', failures);
    requireCondition(storageInventoryBucketCount === storageBodyRecoveryReceipt?.denominator?.bucket_count && storageInventoryObjectCount === storageObjectCount && storageInventoryTotalBytes === storageByteCount, 'Storage inventory does not match the body recovery denominator', failures);
    requireCondition(storageBodiesEntry?.private_digest === storageBodyRecoveryReceipt?.denominator?.buckets_manifest_sha256, 'Storage body coverage digest does not match the recovery manifest', failures);
    const storageBodyRecoveryEvidence = options.storageBodyRecoveryEvidence;
    failures.push(...shapeFailures(storageBodyRecoveryEvidenceShapeValidator, storageBodyRecoveryEvidence, 'Storage body recovery evidence'));
    failures.push(...validateSanitizedReceipt(storageBodyRecoveryEvidence, 'Storage body recovery evidence'));
    const recoveryEvidenceObservedAt = parseTimestamp(storageBodyRecoveryEvidence?.observed_at, 'storage_body_recovery_evidence.observed_at', failures);
    const recoveryEvidenceVerifiedAt = parseTimestamp(storageBodyRecoveryEvidence?.restore_identity?.verified_at, 'storage_body_recovery_evidence.restore_identity.verified_at', failures);
    requireCondition(storageBodyRecoveryEvidence?.status === 'CURRENT', 'Storage body recovery evidence must be CURRENT', failures);
    requireCondition(storageBodyRecoveryEvidence?.project?.name === receipt.project?.name && storageBodyRecoveryEvidence?.project?.ref === receipt.project?.ref, 'Storage body recovery evidence project mismatch', failures);
    requireCondition(storageBodyRecoveryEvidence?.snapshot_at === receipt.snapshot_at, 'Storage body recovery evidence snapshot mismatch', failures);
    requireCondition(storageBodyRecoveryEvidence?.export_identity?.destination_version === receipt.destination_version && storageBodyRecoveryEvidence?.export_identity?.ciphertext_sha256 === receipt.ciphertext_sha256, 'Storage body recovery evidence export identity mismatch', failures);
    requireCondition(storageBodyRecoveryEvidence?.restore_identity?.receipt_sha256 === storageBodyRecoveryReceipt?.restore_proof?.receipt_sha256 && storageBodyRecoveryEvidence?.restore_identity?.verified_at === storageBodyRecoveryReceipt?.restore_proof?.verified_at, 'Storage body recovery evidence restore identity mismatch', failures);
    requireCondition(recoveryEvidenceObservedAt !== null && storageObservedAt !== null && recoveryEvidenceObservedAt >= storageObservedAt && recoveryEvidenceVerifiedAt !== null && recoveryEvidenceVerifiedAt <= recoveryEvidenceObservedAt, 'Storage body recovery evidence chronology is invalid', failures);
    requireCondition(recoveryEvidenceObservedAt !== null && now !== null && recoveryEvidenceObservedAt <= now, 'Storage body recovery evidence cannot be future-dated', failures);
    requireCondition(recoveryEvidenceObservedAt !== null && now !== null && now - recoveryEvidenceObservedAt <= maximumEvidenceAgeMs, 'Storage body recovery evidence is stale', failures);
    requireCondition(storageBodyRecoveryEvidence?.denominator?.bucket_count === storageBodyRecoveryReceipt?.denominator?.bucket_count
      && storageBodyRecoveryEvidence?.denominator?.object_count === storageObjectCount
      && storageBodyRecoveryEvidence?.denominator?.body_count === storageBodyCount
      && storageBodyRecoveryEvidence?.denominator?.total_bytes === storageByteCount
      && storageBodyRecoveryEvidence?.denominator?.buckets_manifest_sha256 === storageBodyRecoveryReceipt?.denominator?.buckets_manifest_sha256, 'Storage body recovery evidence denominator mismatch', failures);
    const recoverySourceDigest = storageBodyRecoveryReceipt?.source_evidence_sha256;
    const recoveryEvidenceDigest = storageBodyRecoveryEvidenceDigest(storageBodyRecoveryEvidence);
    const recoverySourceDigestValid = hexSha256.test(recoverySourceDigest ?? '');
    requireCondition(recoverySourceDigestValid, 'Storage body recovery source evidence is malformed', failures);
    requireCondition(recoverySourceDigestValid && recoveryEvidenceDigest !== null && recoverySourceDigest === recoveryEvidenceDigest, 'Storage body recovery source evidence digest mismatch', failures);
    if (recoverySourceDigestValid) {
      const selfCorrelationDigests = [
        storageBodyRecoveryReceipt?.denominator?.buckets_manifest_sha256,
        storageBodyRecoverySelfCorrelationDigest(storageBodyRecoveryReceipt),
        storageBodyRecoveryReceipt && typeof storageBodyRecoveryReceipt === 'object' && !Array.isArray(storageBodyRecoveryReceipt) ? sha256Hex(storageBodyRecoveryReceipt) : null,
        storageBodiesEntry?.private_digest,
        storageBodiesEntry?.body_recovery_receipt_sha256,
        receipt.manifest_sha256,
        independentBackupManifestDigest(receipt),
        receipt.plaintext_sha256,
        receipt.ciphertext_sha256,
        receipt.migration_ledger_sha256,
        storageInventoryEvidence?.denominator?.inventory_manifest_sha256,
        storageInventorySelfCorrelationDigest(storageInventoryEvidence)
      ].filter(Boolean);
      requireCondition(!selfCorrelationDigests.includes(recoverySourceDigest), 'Storage body recovery source evidence is self-correlated', failures);
      const otherEvidenceDigests = [
        storageInventorySourceDigest,
        objectLockReadback?.source_evidence_sha256,
        acceptedExportsManifest?.source_evidence_sha256,
        receipt.watchdog?.evidence_sha256,
        receipt.provider_physical_backup?.evidence_sha256
      ].filter(Boolean);
      requireCondition(!otherEvidenceDigests.includes(recoverySourceDigest), 'Storage body recovery source evidence must be distinct from other evidence', failures);
    }
  }
  requireCondition(receipt.aggregate_counts && Object.keys(receipt.aggregate_counts).length > 0 && Object.values(receipt.aggregate_counts).every((value) => Number.isInteger(value) && value >= 0), 'aggregate counts are incomplete', failures);
  const decision = receipt.owner_decision;
  requireCondition(decision?.decision_id === contract.decision_id && stableId.test(decision?.decision_id ?? ''), 'owner decision ID mismatch', failures);
  requireCondition(hexSha256.test(decision?.receipt_sha256 ?? ''), 'owner decision digest is malformed', failures);
  const decisionAt = parseTimestamp(decision?.accepted_at, 'owner_decision.accepted_at', failures);
  requireCondition(decisionAt !== null && completedAt !== null && decisionAt <= completedAt, 'owner decision must predate backup completion', failures);
  const watchdogObservedAt = parseTimestamp(receipt.watchdog?.observed_at, 'watchdog.observed_at', failures);
  const physicalBackupObservedAt = parseTimestamp(receipt.provider_physical_backup?.observed_at, 'provider_physical_backup.observed_at', failures);
  requireCondition(receipt.watchdog?.status === 'CURRENT' && receipt.watchdog?.independent_from_scheduler === true && hexSha256.test(receipt.watchdog?.evidence_sha256 ?? ''), 'independent watchdog evidence is incomplete', failures);
  requireCondition(receipt.watchdog?.project?.name === receipt.project?.name && receipt.watchdog?.project?.ref === receipt.project?.ref, 'independent watchdog project correlation mismatch', failures);
  requireCondition(watchdogObservedAt !== null && completedAt !== null && watchdogObservedAt >= completedAt, 'independent watchdog evidence predates backup completion', failures);
  requireCondition(watchdogObservedAt !== null && now !== null && watchdogObservedAt <= now, 'independent watchdog evidence cannot be future-dated', failures);
  requireCondition(watchdogObservedAt !== null && now !== null && now - watchdogObservedAt <= maximumEvidenceAgeMs, 'independent watchdog evidence is stale', failures);
  requireCondition(receipt.provider_physical_backup?.status === 'CURRENT' && receipt.provider_physical_backup?.retention_days === 7 && hexSha256.test(receipt.provider_physical_backup?.evidence_sha256 ?? ''), 'provider Physical backup complement is unproved', failures);
  requireCondition(receipt.provider_physical_backup?.project?.name === receipt.project?.name && receipt.provider_physical_backup?.project?.ref === receipt.project?.ref, 'provider Physical backup project correlation mismatch', failures);
  requireCondition(physicalBackupObservedAt !== null && completedAt !== null && physicalBackupObservedAt >= completedAt, 'provider Physical backup evidence predates backup completion', failures);
  requireCondition(physicalBackupObservedAt !== null && now !== null && physicalBackupObservedAt <= now, 'provider Physical backup evidence cannot be future-dated', failures);
  requireCondition(physicalBackupObservedAt !== null && now !== null && now - physicalBackupObservedAt <= maximumEvidenceAgeMs, 'provider Physical backup evidence is stale', failures);
  requireCondition(receipt.cost?.budget_stop_control_status === 'CURRENT', 'provider budget stop control is unavailable or unproved', failures);
  requireCondition(Number.isFinite(receipt.cost?.projected_usd_monthly) && receipt.cost.projected_usd_monthly >= 0, 'projected monthly cost is invalid', failures);
  requireCondition(receipt.cost?.projected_usd_monthly <= contract.policy.cost.manual_approval_ceiling_usd_monthly, 'projected monthly cost exceeds the manual-approval ceiling', failures);
  requireCondition(receipt.cost?.monthly_report_status === 'CURRENT' && sameSet(receipt.cost?.reported_units, monthlyReportingUnits), 'monthly cost and usage reporting is incomplete', failures);
  requireCondition(receipt.manifest_sha256 === independentBackupManifestDigest(receipt), 'backup manifest digest mismatch', failures);
  requireCondition(receipt.production_service_rto?.status === 'UNKNOWN' && receipt.production_service_rto?.seconds === null, 'production-service RTO cannot be claimed before measurement', failures);

  if (receipt.lifecycle_state === 'RESTORE_REHEARSED') {
    requireCondition(receipt.restore?.status === 'CURRENT', 'RESTORE_REHEARSED requires a current restore receipt', failures);
    const restoreTarget = receipt.restore?.target_project;
    requireCondition(safeProjectName.test(restoreTarget?.name ?? '') && projectRef.test(restoreTarget?.ref ?? ''), 'restore target project identity is missing or malformed', failures);
    requireCondition(restoreTarget?.ref !== receipt.project?.ref, 'restore target project must be distinct from the source project', failures);
    requireCondition(restoreTarget?.source_project_sha256 === sha256Hex(receipt.project), 'restore target source-project correlation mismatch', failures);
    requireCondition(receipt.restore?.traffic_released === false && receipt.restore?.synthetic_canary_status === 'CURRENT', 'restore clone must remain quarantined with synthetic-only canaries', failures);
    const externalEffects = guardedUnitEntries(receipt.restore?.external_effects, 'restore.external_effects', failures);
    requireCondition(Array.isArray(receipt.restore?.external_effects) && externalEffects.length === receipt.restore.external_effects.length && sameSet(externalEffects.map((entry) => entry.unit), externalEffectUnits), 'restore external-effect denominator changed', failures);
    const effectDigests = externalEffects.map((entry) => entry.evidence_sha256);
    requireCondition(externalEffects.length === externalEffectUnits.length && externalEffects.every((entry) => entry.status === 'CURRENT' && entry.disabled === true && hexSha256.test(entry.evidence_sha256 ?? '')), 'every restore external effect requires disabled evidence', failures);
    requireCondition(new Set(effectDigests).size === externalEffectUnits.length, 'restore external-effect evidence digests must be distinct', failures);
    const parityEvidence = guardedUnitEntries(receipt.restore?.parity, 'restore.parity', failures);
    requireCondition(Array.isArray(receipt.restore?.parity) && parityEvidence.length === receipt.restore.parity.length && sameSet(parityEvidence.map((entry) => entry.unit), parityUnits), 'restore parity denominator changed', failures);
    requireCondition(parityEvidence.length === parityUnits.length && parityEvidence.every((entry) => entry.status === 'CURRENT' && Number.isInteger(entry.aggregate_count) && entry.aggregate_count >= 0 && hexSha256.test(entry.private_digest ?? '')), 'restore parity evidence is incomplete', failures);
    const failureDeclaredAt = parseTimestamp(receipt.restore?.failure_declared_at, 'restore.failure_declared_at', failures);
    const restoreStartedAt = parseTimestamp(receipt.restore?.restore_started_at, 'restore.restore_started_at', failures);
    const dataPlaneReadyAt = parseTimestamp(receipt.restore?.data_plane_ready_at, 'restore.data_plane_ready_at', failures);
    requireCondition(completedAt !== null && failureDeclaredAt !== null && completedAt <= failureDeclaredAt, 'restore failure declaration cannot predate backup completion', failures);
    requireCondition(failureDeclaredAt !== null && restoreStartedAt !== null && failureDeclaredAt <= restoreStartedAt, 'restore start cannot predate failure declaration', failures);
    requireCondition(restoreStartedAt !== null && dataPlaneReadyAt !== null && restoreStartedAt <= dataPlaneReadyAt, 'restore data-plane readiness cannot predate restore start', failures);
    requireCondition(dataPlaneReadyAt !== null && now !== null && dataPlaneReadyAt <= now, 'restore data-plane readiness cannot be future-dated', failures);
    const derivedRpoSeconds = snapshotAt !== null && failureDeclaredAt !== null ? (failureDeclaredAt - snapshotAt) / 1000 : null;
    const derivedDataPlaneRtoSeconds = failureDeclaredAt !== null && dataPlaneReadyAt !== null ? (dataPlaneReadyAt - failureDeclaredAt) / 1000 : null;
    requireCondition(Number.isInteger(receipt.restore?.measured_rpo_seconds) && receipt.restore.measured_rpo_seconds === derivedRpoSeconds && receipt.restore.measured_rpo_seconds <= contract.policy.objectives.rpo_seconds, 'restore rehearsal has an invalid, uncorrelated, or over-objective RPO measurement', failures);
    requireCondition(Number.isInteger(receipt.restore?.measured_data_plane_rto_seconds) && receipt.restore.measured_data_plane_rto_seconds === derivedDataPlaneRtoSeconds && receipt.restore.measured_data_plane_rto_seconds <= contract.policy.objectives.quarantined_restore_data_plane_rto_seconds, 'restore rehearsal has an invalid, uncorrelated, or over-objective quarantined data-plane RTO measurement', failures);
    requireCondition(receipt.restore?.failed_clone_deletion_authority_status === 'BLOCKED', 'failed clone deletion requires separate authority', failures);
  }

  return { ok: failures.length === 0, failures: failures.sort((left, right) => left.localeCompare(right)) };
}
