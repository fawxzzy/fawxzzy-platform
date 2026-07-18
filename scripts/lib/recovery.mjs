import crypto from 'node:crypto';

export const recoveryDocumentPaths = Object.freeze({
  contract: 'contracts/v1/recovery/micro-recovery-contract.json',
  backup: 'contracts/v1/recovery/backup-manifest.example.json',
  effects: 'contracts/v1/recovery/external-effects-disable-manifest.example.json',
  restore: 'contracts/v1/recovery/restore-rehearsal-receipt.example.json'
});

export const expectedCoverageUnits = Object.freeze([
  'application_data',
  'application_schemas_and_catalog',
  'auth_control_plane_configuration',
  'auth_identity_data',
  'roles_memberships_grants_and_default_acls',
  'storage_metadata',
  'storage_object_bodies'
]);

export const expectedExternalEffectUnits = Object.freeze([
  'application_traffic',
  'auth_delivery_and_hooks',
  'cron',
  'database_network_calls',
  'dns',
  'edge_schedules',
  'environment_routing',
  'host_aliases',
  'queues',
  'realtime',
  'storage_events',
  'webhooks'
]);

export const expectedParityUnits = Object.freeze([
  'application_data',
  'auth_control_plane_configuration',
  'auth_identity_data',
  'catalog',
  'security'
]);

export const expectedExecutionGates = Object.freeze([
  'alert_channel',
  'backup_cadence',
  'backup_retention',
  'destination_provider',
  'key_installation_and_rotation',
  'logical_export_and_auth_mechanism',
  'numerical_rpo_rto',
  'provider_backup_readback',
  'restore_project_cost_and_capacity'
]);

export const expectedOwnerDecisionFields = Object.freeze([
  'accepted_at',
  'decision_id',
  'objective_rpo_seconds',
  'objective_rto_seconds',
  'receipt_sha256'
]);

const hexSha256 = /^[0-9a-f]{64}$/;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const stableDecisionId = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/;
const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const uuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const providerUrl = /https?:\/\//i;
const databaseUrl = /(?:postgres|postgresql):\/\//i;
const jwt = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/;
const machinePath = /(?:\b[A-Za-z]:(?:\\|\/)(?:Users|ATLAS)\b|\/(?:Users|home)\/[A-Za-z0-9._-]+\/)/;
const rawSql = /\b(?:select|insert|update|delete|merge|copy|truncate|create|alter|drop|grant|revoke)\s+(?:into\s+|from\s+|table\s+|schema\s+|function\s+|role\s+|on\s+)?[A-Za-z_][A-Za-z0-9_.]*/i;
const forbiddenKeys = new Set([
  'connection_string',
  'email',
  'environment_value',
  'identity_id',
  'key_material',
  'password',
  'provider_url',
  'raw_row',
  'raw_rows',
  'raw_sql',
  'secret',
  'token',
  'user_id'
]);

function sortValue(value) {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('canonical serialization rejects non-finite numbers');
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, sortValue(value[key])])
    );
  }
  return value;
}

export function canonicalSerialize(value) {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

export function sha256Hex(value) {
  const content = typeof value === 'string' ? value : canonicalSerialize(value);
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function withoutDigest(document) {
  const copy = structuredClone(document);
  delete copy.manifest_sha256;
  delete copy.receipt_sha256;
  return copy;
}

export function backupManifestDigest(manifest) {
  return sha256Hex(withoutDigest(manifest));
}

export function externalEffectsManifestDigest(manifest) {
  return sha256Hex(withoutDigest(manifest));
}

export function restoreReceiptDigest(receipt) {
  return sha256Hex(withoutDigest(receipt));
}

function parseTimestamp(value, label) {
  if (typeof value !== 'string' || !timestamp.test(value)) throw new Error(`${label}: timestamp must use exact UTC seconds`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(`${label}: timestamp is invalid`);
  return milliseconds;
}

export function evaluateFreshness({ completedAt, maxAgeSeconds, now }) {
  if (completedAt === null || maxAgeSeconds === null) {
    return { status: 'UNKNOWN', age_seconds: null, reason: 'completion time or freshness threshold is UNKNOWN' };
  }
  if (!Number.isInteger(maxAgeSeconds) || maxAgeSeconds < 0) throw new Error('maxAgeSeconds must be a non-negative integer');
  const completed = parseTimestamp(completedAt, 'completedAt');
  const observed = parseTimestamp(now, 'now');
  if (completed > observed) return { status: 'BLOCKED', age_seconds: null, reason: 'completion time is in the future' };
  const ageSeconds = Math.floor((observed - completed) / 1000);
  return ageSeconds <= maxAgeSeconds
    ? { status: 'CURRENT', age_seconds: ageSeconds, reason: 'backup is within the admitted freshness threshold' }
    : { status: 'BLOCKED', age_seconds: ageSeconds, reason: 'backup is stale' };
}

export function measureRecovery({ recoveryPointAt, failureDeclaredAt, restoreStartedAt, restoreCompletedAt }) {
  const recoveryPoint = parseTimestamp(recoveryPointAt, 'recoveryPointAt');
  const failureDeclared = parseTimestamp(failureDeclaredAt, 'failureDeclaredAt');
  const restoreStarted = parseTimestamp(restoreStartedAt, 'restoreStartedAt');
  const restoreCompleted = parseTimestamp(restoreCompletedAt, 'restoreCompletedAt');
  if (recoveryPoint > failureDeclared) throw new Error('recovery point cannot follow failure declaration');
  if (restoreStarted < failureDeclared) throw new Error('restore cannot start before failure declaration');
  if (restoreCompleted < restoreStarted) throw new Error('restore completion cannot precede restore start');
  return {
    measured_rpo_seconds: Math.floor((failureDeclared - recoveryPoint) / 1000),
    measured_rto_seconds: Math.floor((restoreCompleted - restoreStarted) / 1000)
  };
}

function sameSet(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

function walk(value, pointer, visit) {
  visit(value, pointer);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, `${pointer}[${index}]`, visit));
  } else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) walk(entry, `${pointer}.${key}`, visit);
  }
}

export function validateSanitizedReceipt(value, label = 'receipt') {
  const failures = [];
  walk(value, '$', (entry, pointer) => {
    const key = pointer.split('.').at(-1)?.replace(/\[\d+\]$/, '');
    if (key && forbiddenKeys.has(key)) failures.push(`${label}${pointer}: forbidden value-bearing field`);
    if (typeof entry !== 'string') return;
    if (email.test(entry)) failures.push(`${label}${pointer}: email or identity value is forbidden`);
    if (uuid.test(entry)) failures.push(`${label}${pointer}: user or opaque UUID value is forbidden`);
    if (providerUrl.test(entry) || databaseUrl.test(entry)) failures.push(`${label}${pointer}: provider or connection URL is forbidden`);
    if (jwt.test(entry)) failures.push(`${label}${pointer}: credential-shaped value is forbidden`);
    if (machinePath.test(entry)) failures.push(`${label}${pointer}: machine path is forbidden`);
    if (rawSql.test(entry)) failures.push(`${label}${pointer}: raw SQL is forbidden`);
  });
  return failures.sort((left, right) => left.localeCompare(right));
}

function requireHexOrNull(value, label, failures) {
  if (value !== null && (typeof value !== 'string' || !hexSha256.test(value))) failures.push(`${label}: must be null or lowercase SHA-256`);
}

function requireTimestampOrder(entries, now, failures) {
  const observed = now === undefined ? null : parseTimestamp(now, 'now');
  for (const [label, value] of entries) {
    if (value === null) continue;
    try {
      const parsed = parseTimestamp(value, label);
      if (observed !== null && parsed > observed) failures.push(`${label}: timestamp is in the future`);
    } catch (error) {
      failures.push(error.message);
    }
  }
}

function requireTimestampAtOrAfter({ value, boundary, valueLabel, boundaryLabel, message }, failures) {
  if (value === null || value === undefined || boundary === null || boundary === undefined) return;
  try {
    if (parseTimestamp(value, valueLabel) < parseTimestamp(boundary, boundaryLabel)) failures.push(message);
  } catch (error) {
    failures.push(error.message);
  }
}

export function validateRecoveryDocuments(documents, options = {}) {
  const failures = [];
  const sourceExamples = options.mode !== 'action';
  const checks = Object.freeze([
    'acceptance_completeness',
    'approved_posture',
    'coverage_denominator',
    'digest_format_and_correlation',
    'encryption_boundary',
    'execution_gate_denominator',
    'external_effects_denominator',
    'manifest_correlation',
    'parity_denominator',
    'policy_binding',
    'project_identity',
    'rpo_rto_measurement',
    'sanitized_receipts',
    'storage_body_gate',
    'timestamp_order_and_freshness'
  ]);
  const contract = documents[recoveryDocumentPaths.contract];
  const backup = documents[recoveryDocumentPaths.backup];
  const effects = documents[recoveryDocumentPaths.effects];
  const restore = documents[recoveryDocumentPaths.restore];
  const requireCondition = (condition, message) => {
    if (!condition) failures.push(message);
  };

  for (const [label, document] of Object.entries({ contract, backup, effects, restore })) {
    if (!document) {
      failures.push(`${label}: recovery document is missing`);
      continue;
    }
    failures.push(...validateSanitizedReceipt(document, label));
  }
  if (!contract || !backup || !effects || !restore) {
    return { ok: false, checks, failures: failures.sort((left, right) => left.localeCompare(right)) };
  }

  requireCondition(contract.decision_id === 'FP-MAN-013', 'recovery contract must remain bound to FP-MAN-013');
  requireCondition(contract.status === 'BLOCKED', 'source recovery contract must not admit execution');
  requireCondition(contract.project.name === 'Fawxzzy shared Supabase project', 'recovery project display name changed');
  requireCondition(contract.project.ref === 'bxtcuhkotumitoqtrcej', 'recovery project ref changed');
  requireCondition(contract.project.compute === 'Micro', 'approved Micro compute posture changed');
  requireCondition(contract.posture.pitr.status === 'BLOCKED' && contract.posture.pitr.enabled === false, 'PITR must remain deferred and unauthorized');
  requireCondition(contract.posture.daily_physical_backups.retention_days === 7, 'daily Physical backup retention must remain seven days');
  requireCondition(contract.posture.daily_physical_backups.storage_object_bodies_included === false, 'database backups must not claim Storage body coverage');
  requireCondition(contract.independent_export.client_side_streaming_encryption_before_destination === true, 'independent export must require client-side streaming encryption');
  requireCondition(contract.independent_export.destination_receives_ciphertext_only === true, 'destination must receive ciphertext only');
  requireCondition(contract.independent_export.persistent_plaintext_allowed === false, 'persistent plaintext exports are forbidden');
  requireCondition(contract.independent_export.key_reference_metadata_only === true, 'only key-reference metadata may enter receipts');
  requireCondition(contract.independent_export.canonical_serialization === 'lexicographic_object_keys_array_order_preserved_two_space_json_lf', 'canonical recovery serialization changed');
  requireCondition(contract.independent_export.digest_algorithm === 'SHA-256', 'recovery digest algorithm changed');
  requireCondition(sameSet(contract.coverage.map((entry) => entry.unit), expectedCoverageUnits), 'recovery coverage denominator changed');
  requireCondition(sameSet(contract.execution_gates.map((entry) => entry.gate), expectedExecutionGates), 'recovery execution-gate denominator changed');
  requireCondition(contract.execution_gates.every((entry) => entry.status === 'UNKNOWN'), 'execution gates must remain UNKNOWN in source');
  requireCondition(contract.rpo_rto.objective_status === 'UNKNOWN', 'numerical RPO/RTO objective must remain UNKNOWN');
  requireCondition(contract.rpo_rto.rpo_seconds === null && contract.rpo_rto.rto_seconds === null, 'source contract must not invent numerical RPO/RTO');
  const ownerDecisionPolicy = contract.rpo_rto.owner_decision_reference;
  requireCondition(ownerDecisionPolicy?.required === true, 'accepted RPO/RTO objectives must require an owner-decision receipt reference');
  requireCondition(sameSet(ownerDecisionPolicy?.required_fields ?? [], expectedOwnerDecisionFields), 'owner-decision receipt-reference field denominator changed');
  requireCondition(ownerDecisionPolicy?.decision_id_format === 'uppercase_hyphenated_stable_id', 'owner-decision stable ID format changed');
  requireCondition(ownerDecisionPolicy?.receipt_digest_algorithm === 'SHA-256', 'owner-decision receipt digest algorithm changed');
  requireCondition(ownerDecisionPolicy?.objective_values_must_match === true, 'owner-decision objectives must correlate exactly');
  requireCondition(ownerDecisionPolicy?.accepted_at_not_after_rehearsal_acceptance === true, 'owner-decision timestamp boundary changed');
  requireCondition(ownerDecisionPolicy?.included_in_restore_receipt_digest === true, 'owner-decision reference must remain bound into the restore receipt digest');

  requireCondition(backup.project.ref === contract.project.ref, 'backup manifest project correlation changed');
  requireCondition(effects.project.ref === contract.project.ref, 'external-effects manifest project correlation changed');
  requireCondition(restore.source_project.ref === contract.project.ref, 'restore receipt source-project correlation changed');
  requireCondition(backup.backup_id === effects.backup_id && backup.backup_id === restore.backup_id, 'backup identity must correlate across all receipts');
  if (sourceExamples) {
    requireCondition(backup.status === 'BLOCKED' && backup.execution.status === 'BLOCKED', 'example backup must remain unexecuted');
    requireCondition(backup.execution.started_at === null && backup.execution.completed_at === null, 'example backup timestamps must remain unset');
  }
  requireCondition(sameSet(restore.parity.map((entry) => entry.unit), expectedParityUnits), 'restore parity denominator changed');
  requireCondition(sameSet(backup.coverage.map((entry) => entry.unit), expectedCoverageUnits), 'backup manifest coverage denominator changed');
  if (sourceExamples) {
    requireCondition(backup.coverage.every((entry) => entry.status === 'UNKNOWN'), 'example backup coverage must remain UNKNOWN');
    requireCondition(backup.encryption.status === 'UNKNOWN' && backup.destination.status === 'UNKNOWN', 'example encryption and destination must remain UNKNOWN');
    requireCondition(backup.retention.status === 'UNKNOWN', 'example retention must remain UNKNOWN');
  }
  requireHexOrNull(backup.ciphertext.sha256, 'backup ciphertext digest', failures);
  requireHexOrNull(backup.manifest_sha256, 'backup manifest digest', failures);

  if (sourceExamples) {
    requireCondition(effects.status === 'BLOCKED', 'external-effects example must remain BLOCKED');
    requireCondition(effects.quarantine.network_egress_denied === null && effects.quarantine.data_api_disabled === null, 'source quarantine controls must remain unproved');
  }
  requireCondition(sameSet(effects.effects.map((entry) => entry.unit), expectedExternalEffectUnits), 'external-effects denominator changed');
  if (sourceExamples) requireCondition(effects.effects.every((entry) => entry.status === 'UNKNOWN' && entry.disabled === null), 'external effects must remain unproved in source');
  requireHexOrNull(effects.manifest_sha256, 'external-effects manifest digest', failures);

  if (sourceExamples) {
    requireCondition(restore.status === 'BLOCKED', 'restore example must remain BLOCKED');
    requireCondition(restore.clone.project_ref === null && restore.clone.traffic_released === false, 'restore clone must remain unnamed and quarantined');
    requireCondition(restore.parity.every((entry) => entry.status === 'UNKNOWN'), 'restore parity must remain UNKNOWN');
    requireCondition(restore.rpo_rto.status === 'UNKNOWN', 'restore RPO/RTO measurement must remain UNKNOWN');
    requireCondition(restore.rpo_rto.measured_rpo_seconds === null && restore.rpo_rto.measured_rto_seconds === null, 'restore example must not invent RPO/RTO measurements');
    requireCondition(restore.rpo_rto.objective_rpo_seconds === null && restore.rpo_rto.objective_rto_seconds === null, 'restore example must not invent RPO/RTO objectives');
    requireCondition(restore.rpo_rto.owner_decision === null, 'restore example must not invent an owner decision');
  }
  requireHexOrNull(restore.backup_manifest_sha256, 'restore backup-manifest digest', failures);
  requireHexOrNull(restore.external_effects_manifest_sha256, 'restore external-effects digest', failures);
  requireHexOrNull(restore.receipt_sha256, 'restore receipt digest', failures);

  const objectCount = backup.storage.object_count;
  if (Number.isInteger(objectCount) && objectCount > 0) {
    requireCondition(backup.storage.body_recovery_status === 'CURRENT', 'non-empty Storage requires CURRENT body recovery');
    requireCondition(hexSha256.test(backup.storage.body_recovery_receipt_sha256 ?? ''), 'non-empty Storage requires an accepted body-recovery receipt digest');
  }

  if (backup.status === 'CURRENT') {
    requireCondition(backup.execution.status === 'CURRENT', 'accepted backup requires CURRENT execution');
    requireCondition(backup.execution.started_at !== null && backup.execution.completed_at !== null, 'accepted backup requires start and completion timestamps');
    requireCondition(backup.coverage.every((entry) => entry.unit === 'storage_object_bodies' || entry.status === 'CURRENT'), 'accepted backup requires CURRENT non-Storage coverage');
    const storageBodyCoverage = backup.coverage.find((entry) => entry.unit === 'storage_object_bodies');
    requireCondition(storageBodyCoverage?.status === 'CURRENT' || (storageBodyCoverage?.status === 'NOT_APPLICABLE' && backup.storage.object_count === 0), 'Storage body coverage is NOT_APPLICABLE only for an empty denominator');
    requireCondition(backup.coverage.every((entry) => {
      if (entry.status === 'NOT_APPLICABLE') return entry.unit === 'storage_object_bodies' && entry.aggregate_count === 0 && entry.private_digest === null;
      return entry.status === 'CURRENT' && entry.aggregate_count !== null && hexSha256.test(entry.private_digest ?? '');
    }), 'accepted backup requires aggregate counts and private digests for every applicable coverage unit');
    requireCondition(backup.encryption.status === 'CURRENT' && backup.destination.status === 'CURRENT' && backup.retention.status === 'CURRENT', 'accepted backup requires proved encryption, destination, and retention');
    requireCondition(backup.encryption.algorithm_class !== null && backup.encryption.key_reference !== null && backup.encryption.key_custody_status === 'CURRENT', 'accepted backup requires encryption algorithm and current metadata-only key custody');
    requireCondition(backup.destination.class !== null && backup.destination.provider_reference !== null && backup.destination.object_version !== null && backup.destination.immutability_status === 'CURRENT', 'accepted backup requires a versioned immutable destination receipt');
    requireCondition(hexSha256.test(backup.ciphertext.sha256 ?? ''), 'accepted backup requires a ciphertext digest');
    requireCondition(backup.ciphertext.bytes !== null && backup.ciphertext.bytes > 0, 'accepted backup requires non-empty ciphertext bytes');
    requireCondition(backup.retention.retention_days !== null && backup.retention.retention_days > 0 && backup.retention.expires_at !== null, 'accepted backup requires positive retention and expiry');
    requireCondition(backup.freshness.status === 'CURRENT' && backup.freshness.maximum_age_seconds !== null, 'accepted backup requires a current freshness threshold');
    requireCondition(options.now !== undefined, 'accepted backup retention requires an injected validation clock');
    if (backup.execution.completed_at !== null && backup.freshness.maximum_age_seconds !== null && options.now !== undefined) {
      const freshness = evaluateFreshness({
        completedAt: backup.execution.completed_at,
        maxAgeSeconds: backup.freshness.maximum_age_seconds,
        now: options.now
      });
      requireCondition(freshness.status === 'CURRENT', `accepted backup freshness failed: ${freshness.reason}`);
    }
    requireCondition(backup.manifest_sha256 === backupManifestDigest(backup), 'accepted backup manifest digest mismatch');
  }
  if (effects.status === 'CURRENT') {
    requireCondition(effects.effects.every((entry) => entry.status === 'CURRENT' && entry.disabled === true), 'accepted restore quarantine requires every external effect disabled');
    const evidenceDigests = effects.effects.map((entry) => entry.evidence_digest);
    requireCondition(evidenceDigests.every((digest) => typeof digest === 'string' && hexSha256.test(digest)), 'accepted restore quarantine requires a canonical evidence digest for every external effect');
    requireCondition(new Set(evidenceDigests).size === evidenceDigests.length, 'accepted restore quarantine requires a distinct evidence digest for every external effect');
    requireCondition(effects.restore_project_ref !== null, 'accepted restore quarantine requires a named restore project');
    requireCondition(effects.quarantine.network_egress_status === 'CURRENT' && effects.quarantine.network_egress_denied === true, 'accepted restore quarantine requires denied network egress');
    requireCondition(effects.quarantine.data_api_status === 'CURRENT' && effects.quarantine.data_api_disabled === true, 'accepted restore quarantine requires a disabled Data API');
    requireCondition(effects.quarantine.application_credentials_installed === false && effects.quarantine.traffic_released === false, 'accepted restore quarantine cannot install credentials or release traffic');
    requireCondition(effects.manifest_sha256 === externalEffectsManifestDigest(effects), 'accepted external-effects manifest digest mismatch');
  }

  const restoredObjectCount = restore.storage.object_count;
  if (Number.isInteger(restoredObjectCount) && restoredObjectCount > 0) {
    requireCondition(restore.storage.body_recovery_status === 'CURRENT', 'non-empty restored Storage requires CURRENT body recovery');
    requireCondition(hexSha256.test(restore.storage.body_recovery_receipt_sha256 ?? ''), 'non-empty restored Storage requires a body-recovery receipt digest');
  }

  const hasRpoRtoObjectives = restore.rpo_rto.objective_rpo_seconds !== null
    || restore.rpo_rto.objective_rto_seconds !== null;
  const requiresOwnerDecision = restore.rpo_rto.status === 'CURRENT' || hasRpoRtoObjectives;
  if (requiresOwnerDecision) {
    const ownerDecision = restore.rpo_rto.owner_decision;
    const hasOwnerDecision = ownerDecision !== null && typeof ownerDecision === 'object' && !Array.isArray(ownerDecision);
    requireCondition(hasOwnerDecision, 'CURRENT or numerical RPO/RTO objectives require a canonical owner-decision receipt reference');
    if (hasOwnerDecision) {
      requireCondition(stableDecisionId.test(ownerDecision.decision_id ?? ''), 'CURRENT or numerical RPO/RTO objectives require a canonical stable owner-decision ID');
      requireCondition(hexSha256.test(ownerDecision.receipt_sha256 ?? ''), 'CURRENT or numerical RPO/RTO objectives require a canonical owner-decision receipt digest');
      requireCondition(typeof ownerDecision.accepted_at === 'string' && timestamp.test(ownerDecision.accepted_at), 'CURRENT or numerical RPO/RTO objectives require an owner-decision acceptance timestamp');
      requireCondition(
        Number.isInteger(ownerDecision.objective_rpo_seconds)
          && Number.isInteger(ownerDecision.objective_rto_seconds)
          && ownerDecision.objective_rpo_seconds === restore.rpo_rto.objective_rpo_seconds
          && ownerDecision.objective_rto_seconds === restore.rpo_rto.objective_rto_seconds,
        'CURRENT or numerical RPO/RTO objectives must exactly match the owner-decision receipt reference'
      );
    }
  }

  if (restore.status === 'CURRENT') {
    requireCondition(backup.status === 'CURRENT' && effects.status === 'CURRENT', 'accepted restore requires current backup and quarantine manifests');
    requireCondition(restore.parity.every((entry) => entry.status === 'CURRENT'), 'accepted restore cannot contain UNKNOWN parity');
    requireCondition(restore.parity.every((entry) => entry.expected_count !== null && entry.actual_count === entry.expected_count), 'accepted restore requires exact aggregate count parity');
    requireCondition(restore.parity.every((entry) => hexSha256.test(entry.expected_private_digest ?? '') && entry.actual_private_digest === entry.expected_private_digest), 'accepted restore requires exact private digest parity');
    requireCondition(restore.clone.project_ref === effects.restore_project_ref && restore.clone.quarantine_status === 'CURRENT' && restore.clone.traffic_released === false, 'accepted restore clone must correlate to the quarantined project without traffic');
    requireCondition(restore.rpo_rto.status === 'CURRENT' && restore.rpo_rto.objective_rpo_seconds !== null && restore.rpo_rto.objective_rto_seconds !== null, 'accepted restore requires measured and accepted RPO/RTO objectives');
    requireCondition(restore.rpo_rto.measured_rpo_seconds <= restore.rpo_rto.objective_rpo_seconds && restore.rpo_rto.measured_rto_seconds <= restore.rpo_rto.objective_rto_seconds, 'accepted restore must satisfy RPO/RTO objectives');
    requireCondition(restore.observation.status === 'CURRENT' && restore.observation.duration_seconds !== null && restore.observation.failure_count === 0, 'accepted restore requires a failure-free observation');
    requireCondition(restore.rollback.status === 'CURRENT', 'accepted restore requires current rollback evidence');
    requireCondition(restore.backup_manifest_sha256 === backupManifestDigest(backup), 'restore backup-manifest correlation mismatch');
    requireCondition(restore.external_effects_manifest_sha256 === externalEffectsManifestDigest(effects), 'restore external-effects correlation mismatch');
    requireCondition(restore.receipt_sha256 === restoreReceiptDigest(restore), 'restore receipt digest mismatch');
  }

  const timestampEntries = [
    ['backup.execution.started_at', backup.execution.started_at],
    ['backup.execution.completed_at', backup.execution.completed_at],
    ['restore.timeline.recovery_point_at', restore.timeline.recovery_point_at],
    ['restore.timeline.failure_declared_at', restore.timeline.failure_declared_at],
    ['restore.timeline.restore_started_at', restore.timeline.restore_started_at],
    ['restore.timeline.restore_completed_at', restore.timeline.restore_completed_at],
    ['restore.timeline.accepted_at', restore.timeline.accepted_at],
    ['restore.rpo_rto.owner_decision.accepted_at', restore.rpo_rto.owner_decision?.accepted_at ?? null]
  ];
  requireTimestampOrder(timestampEntries, options.now, failures);
  if (backup.execution.started_at !== null && backup.execution.completed_at !== null) {
    try {
      requireCondition(
        parseTimestamp(backup.execution.started_at, 'backup.execution.started_at') <= parseTimestamp(backup.execution.completed_at, 'backup.execution.completed_at'),
        'backup completion cannot precede backup start'
      );
    } catch (error) {
      failures.push(error.message);
    }
  }
  if (backup.status === 'CURRENT') {
    requireTimestampAtOrAfter({
      value: backup.retention.expires_at,
      boundary: backup.execution.completed_at,
      valueLabel: 'backup.retention.expires_at',
      boundaryLabel: 'backup.execution.completed_at',
      message: 'backup retention expiry cannot precede backup completion'
    }, failures);
    requireTimestampAtOrAfter({
      value: backup.retention.expires_at,
      boundary: restore.timeline.accepted_at,
      valueLabel: 'backup.retention.expires_at',
      boundaryLabel: 'restore.timeline.accepted_at',
      message: 'backup retention expiry cannot precede restore acceptance'
    }, failures);
    requireTimestampAtOrAfter({
      value: backup.retention.expires_at,
      boundary: options.now,
      valueLabel: 'backup.retention.expires_at',
      boundaryLabel: 'now',
      message: 'backup retention expiry cannot precede validation time'
    }, failures);
  }
  if (restore.timeline.accepted_at !== null && restore.timeline.restore_completed_at !== null) {
    try {
      requireCondition(
        parseTimestamp(restore.timeline.accepted_at, 'restore.timeline.accepted_at') >= parseTimestamp(restore.timeline.restore_completed_at, 'restore.timeline.restore_completed_at'),
        'restore acceptance cannot precede restore completion'
      );
    } catch (error) {
      failures.push(error.message);
    }
  }
  requireTimestampAtOrAfter({
    value: restore.rpo_rto.owner_decision?.accepted_at ?? null,
    boundary: restore.timeline.restore_completed_at,
    valueLabel: 'restore.rpo_rto.owner_decision.accepted_at',
    boundaryLabel: 'restore.timeline.restore_completed_at',
    message: 'owner-decision acceptance cannot precede restore completion'
  }, failures);
  requireTimestampAtOrAfter({
    value: restore.timeline.accepted_at,
    boundary: restore.rpo_rto.owner_decision?.accepted_at ?? null,
    valueLabel: 'restore.timeline.accepted_at',
    boundaryLabel: 'restore.rpo_rto.owner_decision.accepted_at',
    message: 'owner-decision acceptance cannot follow restore acceptance'
  }, failures);

  const timeline = restore.timeline;
  const hasMeasurement = restore.rpo_rto.measured_rpo_seconds !== null || restore.rpo_rto.measured_rto_seconds !== null;
  if (hasMeasurement) {
    requireCondition(restore.rpo_rto.status === 'CURRENT', 'numerical RPO/RTO measurements require CURRENT status');
    requireCondition(Object.values(timeline).every((value) => value !== null), 'numerical RPO/RTO measurements require a complete timeline');
    if (Object.values(timeline).every((value) => value !== null)) {
      try {
        const measured = measureRecovery({
          recoveryPointAt: timeline.recovery_point_at,
          failureDeclaredAt: timeline.failure_declared_at,
          restoreStartedAt: timeline.restore_started_at,
          restoreCompletedAt: timeline.restore_completed_at
        });
        requireCondition(measured.measured_rpo_seconds === restore.rpo_rto.measured_rpo_seconds, 'measured RPO does not match timeline');
        requireCondition(measured.measured_rto_seconds === restore.rpo_rto.measured_rto_seconds, 'measured RTO does not match timeline');
      } catch (error) {
        failures.push(error.message);
      }
    }
  }

  return {
    ok: failures.length === 0,
    checks,
    failures: failures.sort((left, right) => left.localeCompare(right))
  };
}
