import crypto from 'node:crypto';
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
  'destination_version', 'freshness', 'key_recipient_ids', 'manifest_sha256', 'migration_ledger_sha256',
  'object_lock', 'owner_decision', 'plaintext_sha256', 'postgres_version', 'project', 'retention_until',
  'snapshot_at', 'source_commit', 'tool_versions', 'watchdog'
]);
const forbiddenClasses = Object.freeze([
  'connection_values', 'credentials', 'private_keys', 'provider_payloads', 'raw_rows', 'raw_sql',
  'row_identifiers', 'user_identifiers'
]);
const hexSha256 = /^[0-9a-f]{64}$/;
const commitSha = /^[0-9a-f]{40}$/;
const stableId = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/;
const safeReference = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

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
  if (!Number.isFinite(parsed)) {
    failures.push(`${label}: invalid UTC timestamp`);
    return null;
  }
  return parsed;
}

function requireCondition(condition, message, failures) {
  if (!condition) failures.push(message);
}

export function validateIndependentBackupContract(contract) {
  const failures = [];
  if (!contract) return { ok: false, failures: ['independent backup contract is missing'] };
  failures.push(...validateSanitizedReceipt(contract, 'independent backup contract'));
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
  requireCondition(Object.values(contract.execution_gates ?? {}).every((value) => value === 'BLOCKED'), 'every execution gate must remain BLOCKED in source', failures);
  return { ok: failures.length === 0, failures: failures.sort((left, right) => left.localeCompare(right)) };
}

export function validateIndependentBackupReceipt(contract, receipt, options = {}) {
  const failures = [...validateIndependentBackupContract(contract).failures];
  if (!receipt) return { ok: false, failures: [...failures, 'backup receipt is missing'].sort() };
  failures.push(...validateSanitizedReceipt(receipt, 'independent backup receipt'));
  const now = parseTimestamp(options.now, 'validation clock', failures);
  const snapshotAt = parseTimestamp(receipt.snapshot_at, 'snapshot_at', failures);
  const completedAt = parseTimestamp(receipt.completed_at, 'completed_at', failures);
  const retentionUntil = parseTimestamp(receipt.retention_until, 'retention_until', failures);
  requireCondition(receipt.lifecycle_state === 'BACKUP_CURRENT' || receipt.lifecycle_state === 'RESTORE_REHEARSED', 'accepted receipt lifecycle must be BACKUP_CURRENT or RESTORE_REHEARSED', failures);
  requireCondition(receipt.project?.name === contract.project.name && receipt.project?.ref === contract.project.ref, 'receipt project identity mismatch', failures);
  requireCondition(commitSha.test(receipt.source_commit ?? ''), 'source commit must be a lowercase 40-character digest', failures);
  requireCondition(typeof receipt.postgres_version === 'string' && safeReference.test(receipt.postgres_version), 'Postgres version is missing or unsafe', failures);
  requireCondition(receipt.tool_versions && Object.keys(receipt.tool_versions).length > 0 && Object.values(receipt.tool_versions).every((value) => safeReference.test(value)), 'tool versions are missing or unsafe', failures);
  requireCondition(snapshotAt !== null && completedAt !== null && snapshotAt <= completedAt, 'backup completion cannot precede snapshot', failures);
  requireCondition(now !== null && completedAt !== null && completedAt <= now, 'backup completion cannot be future-dated', failures);
  requireCondition(now !== null && completedAt !== null && now - completedAt <= contract.policy.schedule.freshness_limit_hours * 3600000, 'backup evidence is stale', failures);
  requireCondition(receipt.freshness?.status === 'CURRENT' && receipt.freshness?.maximum_age_seconds === 28800, 'freshness evidence must be CURRENT at the approved threshold', failures);
  requireCondition(hexSha256.test(receipt.plaintext_sha256 ?? '') && hexSha256.test(receipt.ciphertext_sha256 ?? '') && hexSha256.test(receipt.migration_ledger_sha256 ?? ''), 'required backup digests are malformed', failures);
  requireCondition(Number.isInteger(receipt.ciphertext_bytes) && receipt.ciphertext_bytes > 0, 'ciphertext byte count must be positive', failures);
  requireCondition(receipt.encryption?.status === 'CURRENT' && receipt.encryption?.streaming_before_upload === true && receipt.encryption?.persistent_plaintext === false, 'streaming encryption evidence is incomplete', failures);
  requireCondition(receipt.encryption?.tool_class === 'age' && receipt.encryption?.automation_material === 'public_recipients_only', 'encryption mechanism or key boundary changed', failures);
  requireCondition(Array.isArray(receipt.key_recipient_ids) && receipt.key_recipient_ids.length >= 2 && new Set(receipt.key_recipient_ids).size === receipt.key_recipient_ids.length && receipt.key_recipient_ids.every((value) => safeReference.test(value)), 'at least two distinct safe recipient IDs are required', failures);
  requireCondition(safeReference.test(receipt.destination_version ?? ''), 'immutable destination version is missing or unsafe', failures);
  requireCondition(receipt.object_lock?.status === 'CURRENT' && receipt.object_lock?.mode === 'COMPLIANCE', 'Object Lock compliance evidence is required', failures);
  requireCondition(retentionUntil !== null && completedAt !== null && retentionUntil >= completedAt + contract.policy.retention.standard_days * 86400000, 'retention does not cover the 35-day standard', failures);
  if (receipt.first_accepted_monthly === true) requireCondition(retentionUntil >= completedAt + contract.policy.retention.first_accepted_monthly_days * 86400000, 'monthly retention does not cover 400 days', failures);
  requireCondition(Array.isArray(receipt.coverage) && sameSet(receipt.coverage.map((entry) => entry.unit), coverageUnits), 'receipt coverage denominator changed', failures);
  for (const entry of receipt.coverage ?? []) {
    const isStorageBodies = entry.unit === 'storage_object_bodies';
    const emptyStorageBodies = isStorageBodies && entry.status === 'NOT_APPLICABLE' && entry.aggregate_count === 0 && entry.private_digest === null;
    const current = entry.status === 'CURRENT' && Number.isInteger(entry.aggregate_count) && entry.aggregate_count >= 0 && hexSha256.test(entry.private_digest ?? '');
    requireCondition(emptyStorageBodies || current, `${entry.unit}: coverage is incomplete`, failures);
    if (isStorageBodies && entry.aggregate_count > 0) requireCondition(entry.body_recovery_receipt_status === 'CURRENT' && hexSha256.test(entry.body_recovery_receipt_sha256 ?? ''), 'non-empty Storage bodies require a separate current recovery receipt', failures);
  }
  requireCondition(receipt.aggregate_counts && Object.keys(receipt.aggregate_counts).length > 0 && Object.values(receipt.aggregate_counts).every((value) => Number.isInteger(value) && value >= 0), 'aggregate counts are incomplete', failures);
  const decision = receipt.owner_decision;
  requireCondition(decision?.decision_id === contract.decision_id && stableId.test(decision?.decision_id ?? ''), 'owner decision ID mismatch', failures);
  requireCondition(hexSha256.test(decision?.receipt_sha256 ?? ''), 'owner decision digest is malformed', failures);
  const decisionAt = parseTimestamp(decision?.accepted_at, 'owner_decision.accepted_at', failures);
  requireCondition(decisionAt !== null && completedAt !== null && decisionAt <= completedAt, 'owner decision must predate backup completion', failures);
  requireCondition(receipt.watchdog?.status === 'CURRENT' && receipt.watchdog?.independent_from_scheduler === true && hexSha256.test(receipt.watchdog?.evidence_sha256 ?? ''), 'independent watchdog evidence is incomplete', failures);
  requireCondition(receipt.provider_physical_backup?.status === 'CURRENT' && receipt.provider_physical_backup?.retention_days === 7 && hexSha256.test(receipt.provider_physical_backup?.evidence_sha256 ?? ''), 'provider Physical backup complement is unproved', failures);
  requireCondition(receipt.cost?.budget_stop_control_status === 'CURRENT', 'provider budget stop control is unavailable or unproved', failures);
  requireCondition(Number.isFinite(receipt.cost?.projected_usd_monthly) && receipt.cost.projected_usd_monthly >= 0, 'projected monthly cost is invalid', failures);
  requireCondition(receipt.cost?.projected_usd_monthly <= contract.policy.cost.manual_approval_ceiling_usd_monthly, 'projected monthly cost exceeds the manual-approval ceiling', failures);
  requireCondition(receipt.cost?.monthly_report_status === 'CURRENT' && sameSet(receipt.cost?.reported_units, monthlyReportingUnits), 'monthly cost and usage reporting is incomplete', failures);
  requireCondition(receipt.manifest_sha256 === independentBackupManifestDigest(receipt), 'backup manifest digest mismatch', failures);
  requireCondition(receipt.production_service_rto?.status === 'UNKNOWN' && receipt.production_service_rto?.seconds === null, 'production-service RTO cannot be claimed before measurement', failures);

  if (receipt.lifecycle_state === 'RESTORE_REHEARSED') {
    requireCondition(receipt.restore?.status === 'CURRENT', 'RESTORE_REHEARSED requires a current restore receipt', failures);
    requireCondition(receipt.restore?.traffic_released === false && receipt.restore?.synthetic_canary_status === 'CURRENT', 'restore clone must remain quarantined with synthetic-only canaries', failures);
    requireCondition(Array.isArray(receipt.restore?.external_effects) && sameSet(receipt.restore.external_effects.map((entry) => entry.unit), externalEffectUnits), 'restore external-effect denominator changed', failures);
    const effectDigests = receipt.restore?.external_effects?.map((entry) => entry.evidence_sha256) ?? [];
    requireCondition(receipt.restore?.external_effects?.every((entry) => entry.status === 'CURRENT' && entry.disabled === true && hexSha256.test(entry.evidence_sha256 ?? '')), 'every restore external effect requires disabled evidence', failures);
    requireCondition(new Set(effectDigests).size === externalEffectUnits.length, 'restore external-effect evidence digests must be distinct', failures);
    requireCondition(Array.isArray(receipt.restore?.parity) && sameSet(receipt.restore.parity.map((entry) => entry.unit), parityUnits), 'restore parity denominator changed', failures);
    requireCondition(receipt.restore?.parity?.every((entry) => entry.status === 'CURRENT' && Number.isInteger(entry.aggregate_count) && entry.aggregate_count >= 0 && hexSha256.test(entry.private_digest ?? '')), 'restore parity evidence is incomplete', failures);
    requireCondition(Number.isInteger(receipt.restore?.measured_rpo_seconds) && receipt.restore.measured_rpo_seconds <= contract.policy.objectives.rpo_seconds, 'restore rehearsal exceeds the RPO objective', failures);
    requireCondition(Number.isInteger(receipt.restore?.measured_data_plane_rto_seconds) && receipt.restore.measured_data_plane_rto_seconds <= contract.policy.objectives.quarantined_restore_data_plane_rto_seconds, 'restore rehearsal exceeds the quarantined data-plane RTO objective', failures);
    requireCondition(receipt.restore?.failed_clone_deletion_authority_status === 'BLOCKED', 'failed clone deletion requires separate authority', failures);
  }

  return { ok: failures.length === 0, failures: failures.sort((left, right) => left.localeCompare(right)) };
}
