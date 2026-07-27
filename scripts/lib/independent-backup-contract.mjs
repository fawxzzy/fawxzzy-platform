import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

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
export const forbiddenClasses = Object.freeze([
  'connection_values',
  'credentials',
  'private_keys',
  'provider_payloads',
  'raw_rows',
  'raw_sql',
  'row_identifiers',
  'user_identifiers'
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
export const receiptRequiredFields = Object.freeze([
  'aggregate_counts',
  'ciphertext_bytes',
  'ciphertext_sha256',
  'completed_at',
  'cost',
  'coverage',
  'destination_version',
  'export_id',
  'freshness',
  'github_release_attestation',
  'key_recipient_ids',
  'manifest_sha256',
  'migration_ledger_sha256',
  'monthly_selection',
  'postgres_version',
  'project',
  'receipt_id',
  'release_assets',
  'release_tag',
  'restore_quarantine',
  'retention_until',
  'snapshot_at',
  'source_commit',
  'source_state_sha256',
  'storage_body_state',
  'tool_versions',
  'watchdog'
]);
export const receiptFieldDenominator = Object.freeze([
  'schema_version',
  'status',
  ...receiptRequiredFields
].sort((a, b) => a.localeCompare(b)));

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(moduleDirectory, '..', '..', 'contracts', 'v1', 'schemas', 'independent-backup-contract.schema.json');
const sourceSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(sourceSchema);
const contractValidator = ajv.getSchema(sourceSchema.$id);
const receiptValidator = ajv.compile({ $ref: `${sourceSchema.$id}#/$defs/independent_backup_receipt` });
const hexSha256 = /^[0-9a-f]{64}$/;
const eventId = /^onv1_[0-9a-f]{64}$/;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

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
  const bytes = typeof value === 'string' || Buffer.isBuffer(value) ? value : canonicalSerialize(value);
  return sha256(bytes);
}

function without(receipt, fields) {
  const copy = structuredClone(receipt ?? null);
  if (copy && typeof copy === 'object') {
    for (const field of fields) delete copy[field];
  }
  return copy;
}

export function independentBackupSourceStateDigest(receipt) {
  return sha256Hex({
    aggregate_counts: receipt?.aggregate_counts,
    coverage: receipt?.coverage,
    migration_ledger_sha256: receipt?.migration_ledger_sha256,
    postgres_version: receipt?.postgres_version,
    project: receipt?.project,
    snapshot_at: receipt?.snapshot_at,
    source_commit: receipt?.source_commit,
    storage_body_state: receipt?.storage_body_state,
    tool_versions: receipt?.tool_versions
  });
}

export function independentBackupManifestDigest(receipt) {
  return sha256Hex(without(receipt, [
    'github_release_attestation',
    'manifest_sha256',
    'receipt_id',
    'source_state_sha256'
  ]));
}

export function independentBackupReceiptIdentityDigest(receipt) {
  return sha256Hex(without(receipt, ['github_release_attestation', 'receipt_id']));
}

export function independentBackupAssetsManifestDigest(chunks) {
  return sha256Hex({ chunks });
}

export function independentBackupReadbackEvidenceDigest(readback) {
  return sha256Hex(without(readback, ['evidence_sha256']));
}

export function independentBackupReadbackSubject(readback) {
  const signer = readback?.signer ?? {};
  return {
    domain: 'fawxzzy-platform:github-release-independent-readback:v1',
    assets_manifest_sha256: readback?.assets_manifest_sha256,
    immutable_release: readback?.immutable_release,
    native_receipt_sha256: readback?.native_receipt_sha256,
    observation_method: readback?.observation_method,
    observed_at: readback?.observed_at,
    observed_receipt_id: readback?.observed_receipt_id,
    reader_class: readback?.reader_class,
    reader_identity: readback?.reader_identity,
    release_tag: readback?.release_tag,
    repository_reference: readback?.repository_reference,
    schema_version: readback?.schema_version,
    signer_algorithm: signer.algorithm,
    signer_key_id: signer.key_id,
    signer_public_key_spki_sha256: signer.public_key_spki_sha256,
    status: readback?.status,
    tag_reused: readback?.tag_reused
  };
}

export function independentBackupReadbackSubjectDigest(readback) {
  return sha256Hex(independentBackupReadbackSubject(readback));
}

export function independentBackupAttestationSubject(receipt) {
  const attestation = receipt?.github_release_attestation ?? {};
  const signer = attestation.signer ?? {};
  return {
    domain: 'fawxzzy-platform:github-release-attestation:v1',
    assets_manifest_sha256: attestation.release_assets_manifest_sha256,
    ciphertext_sha256: attestation.ciphertext_sha256,
    immutable_release: attestation.immutable_release,
    manifest_sha256: attestation.manifest_sha256,
    observed_at: attestation.observed_at,
    readback_evidence_sha256: attestation.independent_readback?.evidence_sha256,
    receipt_id: receipt?.receipt_id,
    release_tag: attestation.release_tag,
    repository_reference: attestation.repository_reference,
    schema_version: attestation.schema_version,
    signer_algorithm: signer.algorithm,
    signer_key_id: signer.key_id,
    signer_public_key_spki_sha256: signer.public_key_spki_sha256,
    status: attestation.status,
    tag_reused: attestation.tag_reused
  };
}

export function independentBackupAttestationSubjectDigest(receipt) {
  return sha256Hex(independentBackupAttestationSubject(receipt));
}

export function independentBackupPublicPayloadDigest(receipt) {
  return sha256Hex(receipt);
}

function validatorFailures(validator, value, label) {
  if (validator(value)) return [];
  return (validator.errors ?? []).map((error) => `${label} ${error.instancePath || '/'} ${error.message}`);
}

function requireCondition(condition, message, failures) {
  if (!condition) failures.push(message);
}

function sameOrdered(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function exactObjectKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && sameOrdered(Object.keys(value).sort((a, b) => a.localeCompare(b)), [...expected].sort((a, b) => a.localeCompare(b)));
}

function utcMilliseconds(value) {
  if (typeof value !== 'string') return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value ? parsed : Number.NaN;
}

function verifyEd25519Subject(subject, signatureBase64, trustAnchor) {
  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(trustAnchor.public_key_spki_base64, 'base64'),
      format: 'der',
      type: 'spki'
    });
    return crypto.verify(
      null,
      Buffer.from(canonicalSerialize(subject)),
      publicKey,
      Buffer.from(signatureBase64, 'base64')
    );
  } catch {
    return false;
  }
}

function verifyReleaseAttestation(receipt, trustAnchor) {
  return verifyEd25519Subject(
    independentBackupAttestationSubject(receipt),
    receipt.github_release_attestation?.signer?.signature_base64,
    trustAnchor
  );
}

function verifyIndependentReadback(readback, trustAnchor) {
  return verifyEd25519Subject(
    independentBackupReadbackSubject(readback),
    readback?.signer?.signature_base64,
    trustAnchor
  );
}

export function validateIndependentBackupContract(contract) {
  const failures = validatorFailures(contractValidator, contract, 'independent backup contract schema');
  if (failures.length > 0) return { ok: false, failures: failures.sort((a, b) => a.localeCompare(b)) };

  requireCondition(contract.version === '2.0.0', 'independent backup contract must be version 2.0.0', failures);
  requireCondition(contract.status === 'BLOCKED' && contract.apply_admitted === false, 'independent backup execution must remain blocked', failures);
  requireCondition(contract.decision_id === 'FP-MAN-015', 'independent backup contract must preserve FP-MAN-015', failures);
  requireCondition(contract.governance.operator_direction_event_id === 'onv1_706060909f09a341088af11beac48acd10e8d6d7c4ef02b6985df5170df76fa6', 'operator direction event binding changed', failures);
  requireCondition(contract.governance.operator_direction_payload_sha256 === '706060909f09a341088af11beac48acd10e8d6d7c4ef02b6985df5170df76fa6', 'operator direction payload binding changed', failures);
  requireCondition(
    JSON.stringify(contract.governance.decision_history[0]) === JSON.stringify({
      decision_id: 'FP-MAN-015',
      status: 'CURRENT',
      authority: 'SOURCE_GOVERNANCE_ONLY'
    }),
    'FP-MAN-015 history scope changed',
    failures
  );
  requireCondition(
    JSON.stringify(contract.governance.decision_history[1]) === JSON.stringify({
      decision_id: 'FP-MAN-051',
      status: 'BLOCKED',
      disposition: 'SUPERSEDED',
      superseded_reason: 'ZERO_BACKBLAZE_OR_CLOUDFLARE_AUTHORITY',
      provider_authority: 'NONE'
    }),
    'FP-MAN-051 supersession scope changed',
    failures
  );
  requireCondition(contract.policy.destination.provider === 'GitHub' && contract.policy.destination.repository_class === 'DEDICATED_PRIVATE_RECOVERY_VAULT', 'recovery destination must be the dedicated private GitHub vault', failures);
  requireCondition(contract.policy.destination.legal_or_compliance_worm === 'NOT_CLAIMED', 'legal or compliance WORM semantics must not be claimed', failures);
  requireCondition(contract.policy.encryption.tool_class === 'age' && contract.policy.encryption.streaming_before_upload === true && contract.policy.encryption.persistent_plaintext_allowed === false, 'age streaming and plaintext boundary changed', failures);
  requireCondition(contract.policy.encryption.public_recipients_only === true && contract.policy.encryption.minimum_age_recipient_count === 2 && contract.policy.encryption.private_key_access === 'BLOCKED', 'age recipient and private-key boundary changed', failures);
  requireCondition(contract.policy.export.default_supabase_db_dump_only === 'REJECT_AS_INCOMPLETE', 'default Supabase dump-only export must remain incomplete', failures);
  requireCondition(contract.policy.release.chunk_max_bytes === 1900000000 && contract.policy.release.asset_max_count === 1000, 'release size ceilings changed', failures);
  requireCondition(contract.policy.release.lifecycle === 'DRAFT_UPLOAD PUBLISH_ONCE IMMUTABLE_VERIFY NO_TAG_REUSE' && contract.policy.release.tag_reuse === 'FORBIDDEN', 'release immutability lifecycle changed', failures);
  requireCondition(contract.policy.release.manifest === 'SIGNED_SANITIZED' && contract.policy.release.github_release_attestation === 'REQUIRED', 'release manifest attestation boundary changed', failures);
  requireCondition(contract.policy.retention.standard_days === 35 && contract.policy.retention.first_accepted_monthly_days === 400, 'operational retention windows changed', failures);
  requireCondition(contract.policy.retention.model === 'OPERATIONAL_RETENTION_NOT_WORM' && contract.policy.retention.deletion === 'WHOLE_RELEASE_ONLY_UNDER_SEPARATE_DESTRUCTIVE_AUTHORITY', 'retention deletion boundary changed', failures);
  requireCondition(contract.policy.cost.maximum_usd === 0 && contract.policy.cost.expected_increment_usd_monthly === 0 && contract.policy.cost.paid_capability === 'BLOCKED', 'zero-dollar cost boundary changed', failures);
  requireCondition(sameOrdered(contract.coverage_units, coverageUnits), 'backup coverage denominator changed', failures);
  requireCondition(sameOrdered(contract.receipt_contract.required_fields, receiptRequiredFields), 'receipt required-field denominator changed', failures);
  requireCondition(sameOrdered(contract.receipt_contract.forbidden_classes, forbiddenClasses), 'receipt forbidden-class denominator changed', failures);
  requireCondition(sameOrdered(contract.restore_quarantine.external_effect_units, externalEffectUnits), 'restore-quarantine external-effect denominator changed', failures);
  requireCondition(contract.receipt_contract.aggregate_only === true && contract.receipt_contract.source_identity_required === true, 'receipt aggregate/source identity boundary changed', failures);
  requireCondition(contract.receipt_contract.receipt_identity_preimage === 'all_required_receipt_fields_except_receipt_id_and_github_release_attestation', 'receipt identity preimage changed', failures);
  requireCondition(contract.receipt_contract.public_binding === 'event_id_equals_onv1_plus_exact_payload_sha256', 'public content binding changed', failures);
  requireCondition(contract.receipt_contract.github_release_attestation.verification_boundary === 'pinned_ed25519_signature', 'attestation verification boundary changed', failures);
  requireCondition(contract.receipt_contract.github_release_attestation.signature_domain === 'fawxzzy-platform:github-release-attestation:v1', 'attestation signature domain changed', failures);
  requireCondition(contract.receipt_contract.github_release_attestation.maximum_age_seconds === 28800, 'attestation freshness boundary changed', failures);
  requireCondition(contract.receipt_contract.github_release_attestation.independent_readback.verification_boundary === 'distinct_pinned_ed25519_reader_signature', 'independent readback verification boundary changed', failures);
  requireCondition(contract.receipt_contract.github_release_attestation.independent_readback.signature_domain === 'fawxzzy-platform:github-release-independent-readback:v1', 'independent readback signature domain changed', failures);
  requireCondition(contract.receipt_contract.github_release_attestation.independent_readback.actor_separation_required === true, 'independent readback actor separation changed', failures);
  requireCondition(Object.values(contract.execution_gates).every((value) => value === 'BLOCKED'), 'all execution gates must remain blocked', failures);
  const destination = contract.policy.destination;
  const releaseIdentity = contract.receipt_contract.release_identity;
  const trustAnchor = contract.receipt_contract.github_release_attestation.trust_anchor;
  const readbackTrustAnchor = contract.receipt_contract.github_release_attestation.independent_readback.trust_anchor;
  if (destination.capability_status === 'UNKNOWN') {
    requireCondition(destination.repository_reference === 'UNKNOWN' && releaseIdentity.repository_reference === 'UNKNOWN', 'unknown capability must retain unknown repository identity', failures);
    requireCondition(trustAnchor.status === 'BLOCKED' && trustAnchor.key_id === 'UNKNOWN' && trustAnchor.public_key_spki_base64 === null && trustAnchor.public_key_spki_sha256 === null, 'unknown capability must retain blocked trust anchor', failures);
    requireCondition(readbackTrustAnchor.status === 'BLOCKED' && readbackTrustAnchor.key_id === 'UNKNOWN' && readbackTrustAnchor.public_key_spki_base64 === null && readbackTrustAnchor.public_key_spki_sha256 === null, 'unknown capability must retain blocked readback trust anchor', failures);
  } else {
    requireCondition(destination.repository_reference !== 'UNKNOWN' && releaseIdentity.repository_reference === destination.repository_reference, 'current capability repository identity mismatch', failures);
    requireCondition(trustAnchor.status === 'CURRENT' && trustAnchor.key_id !== 'UNKNOWN' && typeof trustAnchor.public_key_spki_base64 === 'string', 'current capability requires pinned trust anchor', failures);
    requireCondition(trustAnchor.public_key_spki_sha256 === sha256Hex(Buffer.from(trustAnchor.public_key_spki_base64, 'base64')), 'trust-anchor public-key digest mismatch', failures);
    requireCondition(readbackTrustAnchor.status === 'CURRENT' && readbackTrustAnchor.key_id !== 'UNKNOWN' && typeof readbackTrustAnchor.public_key_spki_base64 === 'string', 'current capability requires pinned readback trust anchor', failures);
    requireCondition(readbackTrustAnchor.public_key_spki_sha256 === sha256Hex(Buffer.from(readbackTrustAnchor.public_key_spki_base64, 'base64')), 'readback trust-anchor public-key digest mismatch', failures);
    requireCondition(readbackTrustAnchor.key_id !== trustAnchor.key_id && readbackTrustAnchor.public_key_spki_sha256 !== trustAnchor.public_key_spki_sha256, 'release and readback trust anchors must be distinct', failures);
  }
  const activeContract = structuredClone(contract);
  delete activeContract.governance.decision_history[1].superseded_reason;
  requireCondition(!JSON.stringify(activeContract).toLowerCase().includes('cloudflare'), 'Cloudflare authority must not appear in the active contract', failures);
  return { ok: failures.length === 0, failures: failures.sort((a, b) => a.localeCompare(b)) };
}

export function validateIndependentBackupReceipt(contract, receipt) {
  const contractResult = validateIndependentBackupContract(contract);
  if (!contractResult.ok) return contractResult;
  const failures = [];
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    failures.push('independent backup receipt is malformed');
    return { ok: false, failures: failures.sort((a, b) => a.localeCompare(b)) };
  }
  const receiptSchemaFailures = validatorFailures(receiptValidator, receipt, 'independent backup receipt schema');
  if (receiptSchemaFailures.length > 0) {
    return { ok: false, failures: receiptSchemaFailures.sort((a, b) => a.localeCompare(b)) };
  }
  requireCondition(exactObjectKeys(receipt, receiptFieldDenominator), 'independent backup receipt field denominator mismatch', failures);
  requireCondition(receipt.schema_version === contract.receipt_contract.schema_version, 'independent backup receipt schema version mismatch', failures);
  requireCondition(receipt.project?.ref === contract.project.ref && receipt.project?.name === contract.project.name, 'independent backup receipt project mismatch', failures);
  requireCondition(sameOrdered(receipt.coverage, coverageUnits), 'independent backup receipt coverage mismatch', failures);
  requireCondition(exactObjectKeys(receipt.aggregate_counts, coverageUnits), 'independent backup aggregate-count denominator mismatch', failures);
  requireCondition(sameOrdered(receipt.restore_quarantine?.external_effect_units, externalEffectUnits), 'receipt restore-quarantine denominator mismatch', failures);
  requireCondition(receipt.restore_quarantine?.all_disabled_before_readback === true && receipt.restore_quarantine?.application_traffic_allowed === false && receipt.restore_quarantine?.synthetic_canaries_only === true, 'restore-quarantine safety state is invalid', failures);
  requireCondition(sameOrdered(receipt.restore_quarantine?.parity_units, ['auth', 'catalog', 'data', 'security']), 'restore-quarantine parity denominator mismatch', failures);
  requireCondition(receipt.source_state_sha256 === independentBackupSourceStateDigest(receipt), 'backup source state digest mismatch', failures);
  requireCondition(receipt.manifest_sha256 === independentBackupManifestDigest(receipt), 'backup manifest digest mismatch', failures);
  requireCondition(receipt.receipt_id === independentBackupReceiptIdentityDigest(receipt), 'backup receipt identity digest mismatch', failures);
  requireCondition(receipt.release_assets?.assets_manifest_sha256 === independentBackupAssetsManifestDigest(receipt.release_assets?.chunks), 'release assets manifest digest mismatch', failures);
  requireCondition(receipt.release_assets?.asset_count === receipt.release_assets?.chunks?.length, 'release asset count mismatch', failures);
  requireCondition(receipt.release_assets?.chunks?.length <= contract.policy.release.asset_max_count, 'release asset count exceeds contract maximum', failures);
  requireCondition(receipt.release_assets?.chunks?.every((chunk) => chunk.bytes <= contract.policy.release.chunk_max_bytes), 'release chunk exceeds contract maximum', failures);
  requireCondition(receipt.release_assets?.chunks?.reduce((sum, chunk) => sum + chunk.bytes, 0) === receipt.ciphertext_bytes, 'ciphertext byte total mismatch', failures);
  requireCondition(new Set(receipt.release_assets?.chunks?.map((chunk) => chunk.name)).size === receipt.release_assets?.chunks?.length, 'release asset names must be unique', failures);
  requireCondition(new Set(receipt.key_recipient_ids ?? []).size === receipt.key_recipient_ids?.length && receipt.key_recipient_ids?.length >= contract.policy.encryption.minimum_age_recipient_count, 'at least two unique public age recipient fingerprints are required', failures);
  requireCondition(receipt.cost?.maximum_usd === 0 && receipt.cost?.observed_usd === 0, 'receipt cost must be exactly zero', failures);
  requireCondition(receipt.github_release_attestation?.independent_readback?.evidence_sha256 === independentBackupReadbackEvidenceDigest(receipt.github_release_attestation?.independent_readback), 'independent readback evidence digest mismatch', failures);

  const snapshotAt = utcMilliseconds(receipt.snapshot_at);
  const completedAt = utcMilliseconds(receipt.completed_at);
  const observedAt = utcMilliseconds(receipt.freshness?.observed_at);
  const retentionUntil = utcMilliseconds(receipt.retention_until);
  const requiredRetentionDays = receipt.monthly_selection?.is_first_accepted_utc_month
    ? contract.policy.retention.first_accepted_monthly_days
    : contract.policy.retention.standard_days;
  requireCondition(Number.isFinite(snapshotAt) && Number.isFinite(completedAt) && completedAt >= snapshotAt, 'backup completion timestamp is invalid', failures);
  requireCondition(Number.isFinite(observedAt) && observedAt >= completedAt, 'backup freshness observation timestamp is invalid', failures);
  requireCondition(receipt.freshness?.age_seconds === Math.floor((observedAt - snapshotAt) / 1000), 'backup freshness age does not match timestamps', failures);
  requireCondition(receipt.freshness?.maximum_age_seconds === contract.policy.objectives.rpo_seconds, 'backup freshness maximum changed', failures);
  requireCondition(Number.isFinite(retentionUntil) && retentionUntil >= completedAt + requiredRetentionDays * 86400000, 'backup retention window is too short', failures);
  requireCondition(receipt.monthly_selection?.utc_month === receipt.snapshot_at?.slice(0, 7), 'backup monthly-selection period mismatch', failures);
  requireCondition(receipt.monthly_selection?.retention_class === (receipt.monthly_selection?.is_first_accepted_utc_month ? 'FIRST_MONTHLY_400_DAY' : 'STANDARD_35_DAY'), 'backup retention class mismatch', failures);

  if (receipt.status === 'CURRENT') {
    const destination = contract.policy.destination;
    const releaseIdentity = contract.receipt_contract.release_identity;
    const policy = contract.receipt_contract.github_release_attestation;
    const trustAnchor = policy.trust_anchor;
    const readbackPolicy = policy.independent_readback;
    const readbackTrustAnchor = readbackPolicy.trust_anchor;
    const attestation = receipt.github_release_attestation;
    const readback = attestation?.independent_readback;
    requireCondition(destination.capability_status === 'CURRENT', 'current receipt requires current provider capability evidence', failures);
    requireCondition(destination.repository_reference === attestation?.repository_reference && releaseIdentity.repository_reference === attestation?.repository_reference, 'attested repository identity mismatch', failures);
    requireCondition(receipt.freshness?.status === 'CURRENT' && receipt.freshness?.age_seconds <= receipt.freshness?.maximum_age_seconds, 'current receipt is stale', failures);
    requireCondition(receipt.watchdog?.status === 'CURRENT', 'current receipt requires current independent watchdog evidence', failures);
    requireCondition(receipt.storage_body_state?.status === (receipt.storage_body_state?.object_count === 0 ? 'NOT_APPLICABLE' : 'CURRENT'), 'storage-body receipt state mismatch', failures);
    requireCondition(attestation?.status === 'VERIFIED' && attestation?.immutable_release === true && attestation?.tag_reused === false, 'current receipt requires immutable non-reused release attestation', failures);
    requireCondition(attestation?.release_tag === receipt.release_tag && attestation?.release_assets_manifest_sha256 === receipt.release_assets?.assets_manifest_sha256 && attestation?.manifest_sha256 === receipt.manifest_sha256 && attestation?.ciphertext_sha256 === receipt.ciphertext_sha256, 'release attestation content binding mismatch', failures);
    requireCondition(readback?.status === 'VERIFIED' && readback?.reader_class === 'INDEPENDENT_READ_ONLY' && readback?.observation_method === 'SIGNED_NATIVE_GITHUB_READBACK', 'current receipt requires independently signed native readback', failures);
    requireCondition(readback?.repository_reference === attestation?.repository_reference && readback?.release_tag === receipt.release_tag && readback?.immutable_release === true && readback?.tag_reused === false && readback?.assets_manifest_sha256 === receipt.release_assets?.assets_manifest_sha256 && readback?.observed_receipt_id === receipt.receipt_id, 'independent readback content binding mismatch', failures);
    requireCondition(readback?.reader_identity === readback?.signer?.key_id && readback?.reader_identity !== attestation?.signer?.key_id, 'independent readback actor separation failed', failures);
    const attestationObservedAt = utcMilliseconds(attestation?.observed_at);
    const readbackObservedAt = utcMilliseconds(readback?.observed_at);
    requireCondition(Number.isFinite(attestationObservedAt) && observedAt - attestationObservedAt >= 0 && observedAt - attestationObservedAt <= policy.maximum_age_seconds * 1000, 'release attestation is stale', failures);
    requireCondition(Number.isFinite(readbackObservedAt) && observedAt - readbackObservedAt >= 0 && observedAt - readbackObservedAt <= policy.maximum_age_seconds * 1000, 'independent readback is stale', failures);
    requireCondition(trustAnchor.status === 'CURRENT' && attestation?.signer?.algorithm === 'Ed25519' && attestation?.signer?.key_id === trustAnchor.key_id && attestation?.signer?.public_key_spki_sha256 === trustAnchor.public_key_spki_sha256, 'release signer does not match pinned trust anchor', failures);
    requireCondition(readbackTrustAnchor.status === 'CURRENT' && readback?.signer?.algorithm === 'Ed25519' && readback?.signer?.key_id === readbackTrustAnchor.key_id && readback?.signer?.public_key_spki_sha256 === readbackTrustAnchor.public_key_spki_sha256, 'readback signer does not match pinned independent trust anchor', failures);
    requireCondition(readbackTrustAnchor.key_id !== trustAnchor.key_id && readbackTrustAnchor.public_key_spki_sha256 !== trustAnchor.public_key_spki_sha256, 'release and readback signer identities must be distinct', failures);
    requireCondition(readback?.signer?.signed_payload_sha256 === independentBackupReadbackSubjectDigest(readback), 'independent readback signed-payload digest mismatch', failures);
    requireCondition(verifyIndependentReadback(readback, readbackTrustAnchor), 'independent readback signature verification failed', failures);
    requireCondition(attestation?.signer?.signed_payload_sha256 === independentBackupAttestationSubjectDigest(receipt), 'release attestation signed-payload digest mismatch', failures);
    requireCondition(verifyReleaseAttestation(receipt, trustAnchor), 'release attestation signature verification failed', failures);
  } else {
    const attestation = receipt.github_release_attestation;
    const readback = attestation?.independent_readback;
    requireCondition(receipt.freshness?.status === 'BLOCKED', 'blocked receipt must retain blocked freshness evidence', failures);
    requireCondition(receipt.watchdog?.status === 'BLOCKED', 'blocked receipt must retain blocked watchdog evidence', failures);
    requireCondition(receipt.storage_body_state?.status === 'BLOCKED', 'blocked receipt must retain blocked storage-body evidence', failures);
    requireCondition(attestation?.status === 'BLOCKED' && attestation?.repository_reference === 'UNKNOWN' && attestation?.immutable_release === false && attestation?.tag_reused === false, 'blocked receipt must retain one blocked release-attestation state', failures);
    requireCondition(attestation?.release_tag === receipt.release_tag && attestation?.release_assets_manifest_sha256 === receipt.release_assets?.assets_manifest_sha256 && attestation?.manifest_sha256 === receipt.manifest_sha256 && attestation?.ciphertext_sha256 === receipt.ciphertext_sha256, 'blocked release-attestation content binding mismatch', failures);
    requireCondition(attestation?.signer?.algorithm === 'Ed25519' && attestation?.signer?.key_id === 'UNKNOWN' && attestation?.signer?.signature_base64 === 'AA==' && attestation?.signer?.signed_payload_sha256 === independentBackupAttestationSubjectDigest(receipt), 'blocked release signer state is invalid', failures);
    requireCondition(readback?.status === 'BLOCKED' && readback?.reader_class === 'BLOCKED' && readback?.reader_identity === 'UNKNOWN' && readback?.observation_method === 'BLOCKED', 'blocked receipt must retain one blocked independent-readback state', failures);
    requireCondition(readback?.repository_reference === 'UNKNOWN' && readback?.release_tag === receipt.release_tag && readback?.immutable_release === false && readback?.tag_reused === false && readback?.assets_manifest_sha256 === receipt.release_assets?.assets_manifest_sha256 && readback?.observed_receipt_id === receipt.receipt_id, 'blocked independent-readback content binding mismatch', failures);
    requireCondition(readback?.signer?.algorithm === 'Ed25519' && readback?.signer?.key_id === 'UNKNOWN' && readback?.signer?.signature_base64 === 'AA==' && readback?.signer?.signed_payload_sha256 === independentBackupReadbackSubjectDigest(readback), 'blocked independent-readback signer state is invalid', failures);
  }
  return { ok: failures.length === 0, failures: failures.sort((a, b) => a.localeCompare(b)) };
}

export function validatePublicBinding({ eventId: candidateEventId, payloadSha256, receipt } = {}) {
  const failures = [];
  requireCondition(eventId.test(candidateEventId ?? ''), 'event id is malformed', failures);
  requireCondition(hexSha256.test(payloadSha256 ?? ''), 'payload digest is malformed', failures);
  requireCondition(candidateEventId === `onv1_${payloadSha256}`, 'event id does not bind the payload digest', failures);
  if (receipt !== undefined) {
    requireCondition(payloadSha256 === independentBackupPublicPayloadDigest(receipt), 'public payload digest does not match receipt bytes', failures);
    requireCondition(receipt?.receipt_id === independentBackupReceiptIdentityDigest(receipt), 'public receipt identity does not match its preimage', failures);
  }
  return { ok: failures.length === 0, failures: failures.sort((a, b) => a.localeCompare(b)) };
}
