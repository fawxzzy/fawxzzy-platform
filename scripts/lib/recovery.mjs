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

export const expectedDiscordEdgeFunctions = Object.freeze([
  Object.freeze({ slug: 'discordos-feedback-persist', live_version: 6, provider_raw_source_sha256: '9e38a0612da6c8b6978ee53b9c81c6a7f6fdbbccdc75974db82552c9e9ca8ecd', canonical_source_sha256: '9e38a0612da6c8b6978ee53b9c81c6a7f6fdbbccdc75974db82552c9e9ca8ecd', provider_bundle_sha256: '4104192cdfb221aff0b7e032285981734703fd6f6bf005c2876dabce19c8f4ee' }),
  Object.freeze({ slug: 'discordos-live-transfer-status', live_version: 2, provider_raw_source_sha256: '98c51dc5f2042a82318a2970d5c75564f86a98bd678f5b8540a021e95d138ded', canonical_source_sha256: '98c51dc5f2042a82318a2970d5c75564f86a98bd678f5b8540a021e95d138ded', provider_bundle_sha256: 'f33c8eb977af62537aee1af9d6293297b15beaabd837611849b94a580d9a4fcf' }),
  Object.freeze({ slug: 'discordos-product-workflow-rpc', live_version: 2, provider_raw_source_sha256: 'efd8c739d962a35411ab2e8cea0e67ac9c5792b5e93c48e3a622b5f09545dc89', canonical_source_sha256: 'efd8c739d962a35411ab2e8cea0e67ac9c5792b5e93c48e3a622b5f09545dc89', provider_bundle_sha256: '394d0a7d8e69a62accd684a02083e84c18812081f3b64fe916fd9a2f2b1a82d4' }),
  Object.freeze({ slug: 'discordos-readiness', live_version: 5, provider_raw_source_sha256: '13658c79d0a0e4480a0044f48dfc1026775785c40c1d776786b4c0a5b2d98061', canonical_source_sha256: '13658c79d0a0e4480a0044f48dfc1026775785c40c1d776786b4c0a5b2d98061', provider_bundle_sha256: 'cfee6853e6757690885c23c647a07851f8a01f90478fe42f61680b83949423a9' }),
  Object.freeze({ slug: 'discordos-runtime-health-cron-audit', live_version: 1, provider_raw_source_sha256: '856ca64d40e2be80fe4862968ccbcb292559d9dd382411175d7b2855efb22ae7', canonical_source_sha256: '55742003f392e2184f7357bd70f0250362e613e13b2a71665e8f884c20f0a304', provider_bundle_sha256: 'dc1617fbc45d8d5ce6e14bdf564d3614bd1413d4b929d7e4a98a181c77982931' }),
  Object.freeze({ slug: 'discordos-update-drafts', live_version: 5, provider_raw_source_sha256: 'b0658e5a52534a34cb14abec5776cdaab8969c0fa04f7c3b64b4652c83272050', canonical_source_sha256: 'b0658e5a52534a34cb14abec5776cdaab8969c0fa04f7c3b64b4652c83272050', provider_bundle_sha256: 'fc366e5b614f9a776ff15f291a41d8dc3173375a6fa5dcd86e5e5b65eec229fa' })
]);

export const expectedDiscordQuarantineSteps = Object.freeze([
  'deny_network_egress',
  'disable_data_api',
  'withhold_application_credentials',
  'withhold_edge_deployments',
  'withhold_scheduler_activation',
  'replay_inert_schema_only',
  'prove_zero_external_effects',
  'run_sink_only_compatibility_tests',
  'observe_zero_growth'
]);

export const expectedDiscordRollbackSteps = Object.freeze([
  'keep_network_egress_denied',
  'deactivate_scheduler_first',
  'remove_credentials_and_routing',
  'disable_edge_routing',
  'preserve_queue_history_and_evidence',
  'restore_captured_preimage_or_discard_rehearsal',
  'retain_source_project_active'
]);

export const expectedPgNetBehavioralTests = Object.freeze([
  'sql_signature_and_return_type',
  'transaction_commit_dispatch',
  'single_queue_consume',
  'sink_only_egress',
  'timeout_dns_invalid_scheme',
  'http_failure_capture',
  'worker_restart_no_duplicate',
  'inactive_cron_zero_growth',
  'transient_response_not_durable_evidence'
]);

export const discordExternalEffectAuthorizedEvidencePolicy = Object.freeze({
  version: '1.0.0',
  status: 'BLOCKED',
  maximum_age_seconds: 7200,
  signature_domain: 'fawxzzy-platform:discordos-external-effect-authentication:v1',
  trust_anchor: Object.freeze({
    status: 'BLOCKED',
    algorithm: 'Ed25519',
    key_id: 'UNKNOWN',
    verifier_reference: 'UNKNOWN',
    public_key_spki_base64: null,
    public_key_spki_sha256: null
  })
});

export const discordExternalEffectEvidencePolicy = Object.freeze({
  version: discordExternalEffectAuthorizedEvidencePolicy.version,
  maximum_age_seconds: discordExternalEffectAuthorizedEvidencePolicy.maximum_age_seconds,
  signature_domain: discordExternalEffectAuthorizedEvidencePolicy.signature_domain
});

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
const projectRef = /^[a-z]{20}$/;
const stableDecisionId = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/;
const safeReference = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const canonicalBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
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
  'raw_body',
  'raw_row',
  'raw_rows',
  'raw_sql',
  'request_body',
  'response_body',
  'secret',
  'headers',
  'payload',
  'token',
  'url',
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

export function externalEffectAuthenticationManifestIdentityDigest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return null;
  const discordos = manifest.discordos;
  if (!discordos || typeof discordos !== 'object' || Array.isArray(discordos)) return null;
  return sha256Hex({
    backup_id: manifest.backup_id,
    rehearsal_snapshot_id: discordos.rehearsal?.snapshot_id,
    restore_project_ref: manifest.restore_project_ref,
    source_project_ref: discordos.source?.project_ref,
    source_snapshot_id: discordos.source?.snapshot_id,
    target_project_ref: discordos.rehearsal?.target_project_ref,
    version: manifest.version
  });
}

export function externalEffectAuthenticationSubjectDigest(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return null;
  const subject = structuredClone(evidence);
  delete subject.authentication_result;
  return sha256Hex(subject);
}

export function externalEffectAuthenticationResultDigest(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  const copy = { ...result };
  delete copy.result_sha256;
  return sha256Hex(copy);
}

export function externalEffectAuthenticationSignedBytes(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  const payload = structuredClone(result);
  delete payload.result_sha256;
  delete payload.signature_base64;
  delete payload.signed_payload_sha256;
  return Buffer.from(`${discordExternalEffectEvidencePolicy.signature_domain}\0${canonicalSerialize(payload)}`, 'utf8');
}

export function externalEffectAuthenticationSignedPayloadDigest(result) {
  const signedBytes = externalEffectAuthenticationSignedBytes(result);
  return signedBytes === null ? null : crypto.createHash('sha256').update(signedBytes).digest('hex');
}

function decodeCanonicalBase64(value, expectedByteLength = null) {
  if (typeof value !== 'string' || value.length === 0 || value.length % 4 !== 0 || !canonicalBase64.test(value)) return null;
  const decoded = Buffer.from(value, 'base64');
  if (decoded.toString('base64') !== value || (expectedByteLength !== null && decoded.length !== expectedByteLength)) return null;
  return decoded;
}

function verifyExternalEffectAuthenticationSignature(trustAnchor, signatureDomain, result) {
  const failures = [];
  const requireCondition = (condition, failure) => { if (!condition) failures.push(failure); };
  requireCondition(result?.status === 'CURRENT', 'DiscordOS external-effect authentication result lifecycle is not CURRENT');
  requireCondition(isRecord(result?.verification) && result.verification.outcome === 'PASS', 'DiscordOS external-effect authentication verification outcome is not PASS');
  requireCondition(trustAnchor?.status === 'CURRENT', 'DiscordOS external-effect authentication trust anchor is not CURRENT');
  requireCondition(trustAnchor?.algorithm === 'Ed25519'
    && safeReference.test(trustAnchor?.key_id ?? '')
    && trustAnchor?.key_id !== 'UNKNOWN'
    && safeReference.test(trustAnchor?.verifier_reference ?? '')
    && trustAnchor?.verifier_reference !== 'UNKNOWN', 'DiscordOS external-effect authentication trust-anchor identity is invalid');
  const publicKeyBytes = decodeCanonicalBase64(trustAnchor?.public_key_spki_base64);
  const publicKeyDigest = publicKeyBytes === null ? null : crypto.createHash('sha256').update(publicKeyBytes).digest('hex');
  requireCondition(publicKeyBytes !== null
    && hexSha256.test(trustAnchor?.public_key_spki_sha256 ?? '')
    && publicKeyDigest === trustAnchor?.public_key_spki_sha256, 'DiscordOS external-effect authentication trust anchor is malformed or unpinned');
  requireCondition(result?.key_id === trustAnchor?.key_id
    && result?.verifier_reference === trustAnchor?.verifier_reference
    && result?.signature_algorithm === trustAnchor?.algorithm
    && result?.signature_domain === signatureDomain, 'DiscordOS external-effect authentication signer does not match the pinned trust anchor');
  const signedBytes = externalEffectAuthenticationSignedBytes(result);
  const signedPayloadDigest = signedBytes === null ? null : crypto.createHash('sha256').update(signedBytes).digest('hex');
  requireCondition(signedPayloadDigest !== null && result?.signed_payload_sha256 === signedPayloadDigest, 'DiscordOS external-effect authentication signed payload digest mismatch');
  const signatureBytes = decodeCanonicalBase64(result?.signature_base64, 64);
  requireCondition(signatureBytes !== null, 'DiscordOS external-effect authentication signature is malformed');
  if (publicKeyBytes !== null && signatureBytes !== null && signedBytes !== null) {
    try {
      const publicKey = crypto.createPublicKey({ key: publicKeyBytes, format: 'der', type: 'spki' });
      requireCondition(publicKey.asymmetricKeyType === 'ed25519', 'DiscordOS external-effect authentication trust anchor is not an Ed25519 key');
      requireCondition(publicKey.asymmetricKeyType === 'ed25519'
        && crypto.verify(null, signedBytes, publicKey, signatureBytes), 'DiscordOS external-effect authentication signature verification failed');
    } catch {
      failures.push('DiscordOS external-effect authentication trust-anchor key cannot be verified');
    }
  }
  return failures;
}

export function verifyExternalEffectAuthenticationAgainstAuthorizedPolicy(authorizedPolicy, presentedPolicy, result) {
  const failures = [];
  const requireCondition = (condition, failure) => { if (!condition) failures.push(failure); };
  let exactPolicyMatch = false;
  try {
    exactPolicyMatch = canonicalSerialize(presentedPolicy) === canonicalSerialize(authorizedPolicy);
  } catch {
    exactPolicyMatch = false;
  }
  requireCondition(exactPolicyMatch, 'DiscordOS external-effect authentication policy does not exactly match the immutable contract-authorized policy');
  if (!exactPolicyMatch) return failures;
  requireCondition(authorizedPolicy?.version === '1.0.0'
    && authorizedPolicy?.maximum_age_seconds === 7200
    && authorizedPolicy?.signature_domain === discordExternalEffectEvidencePolicy.signature_domain,
  'DiscordOS immutable contract-authorized authenticator policy identity is invalid');
  requireCondition(authorizedPolicy?.status === 'CURRENT', 'DiscordOS immutable contract-authorized authenticator policy remains BLOCKED');
  if (authorizedPolicy?.status !== 'CURRENT') return failures;
  failures.push(...verifyExternalEffectAuthenticationSignature(
    authorizedPolicy.trust_anchor,
    authorizedPolicy.signature_domain,
    result
  ));
  return failures;
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

function sameOrderedValues(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateDiscordQuarantine(effects, { sourceExamples, now, requireCondition, failures }) {
  const discordos = effects.discordos;
  if (!isRecord(discordos)) {
    failures.push('DiscordOS external-effect inventory is missing');
    return;
  }

  const source = discordos.source;
  const evidencePolicy = discordos.evidence_policy;
  const inventory = discordos.inventory;
  const rehearsal = discordos.rehearsal;
  const quarantine = discordos.quarantine;
  const rollback = discordos.rollback;
  const compatibility = discordos.pg_net_compatibility;
  if (![source, evidencePolicy, inventory, rehearsal, quarantine, rollback, compatibility].every(isRecord)) {
    failures.push('DiscordOS quarantine contract is incomplete');
    return;
  }

  requireCondition(source.project_ref === 'nwexsktuuenfdegzrbut', 'DiscordOS source project identity changed');
  requireCondition(source.snapshot_id === 'FP-DOS-EFFECT-SNAPSHOT-20260719T125729Z', 'DiscordOS source snapshot identity changed');
  requireCondition(source.observed_at === '2026-07-19T12:57:29Z', 'DiscordOS source observation timestamp changed');
  requireCondition(source.evidence_receipt_id === 'FP-TGT-DISCORD-EXTERNAL-EFFECT-QUARANTINE-PREP-RO-001', 'DiscordOS source evidence receipt identity changed');
  requireCondition(source.evidence_receipt_sha256 === '357787f8613fa868e4cc8081f5d82c765453153c724773d3190dc8d9c6ceb72a', 'DiscordOS source evidence receipt digest changed');
  requireCondition(source.discordos_main_commit === 'aef01f277e006e3cb46550e507ebd8e4a1be9d21', 'DiscordOS main commit correlation changed');
  requireCondition(source.discordos_recovery_commit === 'bd12f6713518b3f3af3761618e3d3e5f6979f167', 'DiscordOS recovery commit correlation changed');
  requireCondition(source.platform_main_commit === 'a86a43e5a0b6c33385e6dbdf73c6d1ca32f57f5a', 'Platform package commit correlation changed');
  requireCondition(source.live_migration_count === 17, 'DiscordOS live migration denominator changed');
  requireCondition(source.migration_comparison_sha256 === '5757ac4d49c6f187b1f29522ec6b85580dd8b5ef42dee4cfab6cc3e552a5dd14', 'DiscordOS migration comparison digest changed');
  requireCondition(source.source_chain_sha256 === '6a6e9fa29651331d2addb0259bc61bc7c2f0795bd71b2a04971c96ff146a822e', 'DiscordOS source-chain digest changed');
  requireCondition(source.platform_package_sha256 === '5a75496361a1bb4ba5917739ceb57f2dd1125778ec1d003025e23835c87053c9', 'Platform package digest changed');
  requireCondition(source.edge_identity_manifest_sha256 === 'c8d304fb21e541cee86fd594b33aacb9441d82e17d53b657231d9b7aa14912f1', 'DiscordOS Edge identity manifest digest changed');

  const edgeFunctions = Array.isArray(inventory.edge_functions) ? inventory.edge_functions : [];
  const edgeEntriesAreRecords = edgeFunctions.every(isRecord);
  requireCondition(edgeEntriesAreRecords, 'DiscordOS Edge inventory entries must be objects');
  const normalizedEdges = edgeFunctions
    .filter(isRecord)
    .map((entry) => ({
      slug: entry.slug,
      live_version: entry.live_version,
      provider_raw_source_sha256: entry.provider_raw_source_sha256,
      canonical_source_sha256: entry.canonical_source_sha256,
      provider_bundle_sha256: entry.provider_bundle_sha256
    }))
    .sort((left, right) => String(left.slug).localeCompare(String(right.slug)));
  requireCondition(canonicalSerialize(normalizedEdges) === canonicalSerialize(expectedDiscordEdgeFunctions), 'DiscordOS six-function source/deployment identity denominator changed');
  requireCondition(edgeFunctions.length === 6 && edgeFunctions.every((entry) => isRecord(entry) && entry.verify_jwt === true), 'DiscordOS Edge JWT-verification denominator changed');

  const cron = inventory.cron ?? {};
  requireCondition(
    cron.job_count === 1
      && cron.active_count === 1
      && cron.stable_name === 'discordos_message_commands_poll'
      && cron.schedule === '* * * * *'
      && cron.command_class === 'SQL_SELECT_FUNCTION'
      && cron.helper_identity === 'discordos_private.trigger_message_command_poll(text,text)'
      && cron.command_sha256 === '734b62309d3cf535c1dc91f603e4338d1f4039a656f75dace6d986dade938dc3'
      && cron.run_count === 31227
      && cron.succeeded_count === 31227
      && cron.failed_count === 0,
    'DiscordOS Cron source snapshot changed'
  );
  const helper = inventory.helper ?? {};
  requireCondition(
    helper.signature === 'discordos_private.trigger_message_command_poll(text,text)'
      && helper.owner === 'postgres'
      && helper.security === 'INVOKER'
      && helper.search_path === 'UNSET'
      && helper.return_type === 'bigint'
      && helper.direct_pg_net_call === true
      && helper.definition_sha256 === '63649b9d774a6524e93167473705d2ff9af0d468f04ba8c68e16263e279f9847',
    'DiscordOS network helper source snapshot changed'
  );
  const expectedExtensions = [
    { name: 'pg_cron', source_installed_version: '1.6.4', target_available_version: '1.6.4', target_installed: false },
    { name: 'pg_net', source_installed_version: '0.20.0', target_available_version: '0.20.4', target_installed: false }
  ];
  const extensionEntries = Array.isArray(inventory.extensions) ? inventory.extensions : [];
  const extensionEntriesAreRecords = extensionEntries.every(isRecord);
  requireCondition(extensionEntriesAreRecords, 'DiscordOS extension inventory entries must be objects');
  const normalizedExtensions = extensionEntries
    .filter(isRecord)
    .map((entry) => ({
      name: entry.name,
      source_installed_version: entry.source_installed_version,
      target_available_version: entry.target_available_version,
      target_installed: entry.target_installed
    }))
    .sort((left, right) => String(left.name).localeCompare(String(right.name)));
  requireCondition(canonicalSerialize(normalizedExtensions) === canonicalSerialize(expectedExtensions), 'DiscordOS extension source/target denominator changed');
  const expectedAggregates = {
    application_event_trigger_count: 0,
    auth_identity_count: 0,
    auth_user_count: 0,
    external_effect_trigger_count: 0,
    foreign_server_count: 0,
    foreign_table_count: 0,
    logical_subscription_count: 0,
    ordinary_trigger_count: 6,
    pg_net_queue_count: 0,
    pg_net_response_history_count: 360,
    pgmq_installed: false,
    provider_event_trigger_count: 6,
    realtime_publication_count: 1,
    realtime_published_table_count: 0,
    storage_bucket_count: 0,
    storage_object_count: 0,
    vault_secret_count: 0,
    webhook_count: 0,
    wrapper_count: 0
  };
  requireCondition(canonicalSerialize(inventory.aggregates) === canonicalSerialize(expectedAggregates), 'DiscordOS aggregate external-effect denominator changed');

  const protectedProjects = Array.isArray(effects.protected_projects) ? effects.protected_projects : [];
  const protectedProjectRefs = protectedProjects
    .filter(isRecord)
    .map((entry) => entry.project_ref);
  const targetProtections = protectedProjects.filter((entry) => isRecord(entry) && entry.identity_class === 'shared_target');
  const sourceProtections = protectedProjects.filter((entry) => isRecord(entry) && entry.identity_class === 'discordos_source');
  requireCondition(protectedProjects.length >= 2, 'DiscordOS protected-project denominator is incomplete');
  requireCondition(
    protectedProjects.every((entry) => isRecord(entry) && projectRef.test(entry.project_ref ?? '')),
    'DiscordOS protected-project identity is malformed'
  );
  requireCondition(new Set(protectedProjectRefs).size === protectedProjects.length, 'DiscordOS protected-project identities must be unique');
  requireCondition(
    targetProtections.length === 1 && targetProtections[0].project_ref === rehearsal.target_project_ref,
    'DiscordOS protected shared-target identity must correlate to the rehearsal target'
  );
  requireCondition(
    sourceProtections.length === 1 && sourceProtections[0].project_ref === source.project_ref,
    'DiscordOS protected source identity must correlate to the source project'
  );

  requireCondition(rehearsal.target_project_ref === 'bxtcuhkotumitoqtrcej', 'DiscordOS target rehearsal identity changed');
  requireCondition(sameOrderedValues(quarantine.steps, expectedDiscordQuarantineSteps), 'DiscordOS fail-closed quarantine order changed');
  requireCondition(sameOrderedValues(rollback.steps, expectedDiscordRollbackSteps), 'DiscordOS rollback order changed');
  requireCondition(sameOrderedValues(compatibility.tests, expectedPgNetBehavioralTests), 'pg_net behavioral acceptance denominator changed');
  requireCondition(
    quarantine.scheduler_activation_held === true
      && quarantine.edge_deployment_held === true
      && quarantine.secrets_held === true
      && quarantine.aliases_held === true
      && quarantine.provider_writes_held === true
      && quarantine.apply_admitted === false,
    'DiscordOS held execution boundary changed'
  );
  requireCondition(
    compatibility.source_version === '0.20.0'
      && compatibility.target_version === '0.20.4'
      && compatibility.static_status === 'CURRENT'
      && compatibility.sql_upgrade_changes === 0,
    'pg_net 0.20.0 to 0.20.4 static compatibility contract changed'
  );

  if (sourceExamples) {
    requireCondition(discordos.status === 'BLOCKED', 'DiscordOS source quarantine must remain BLOCKED');
    requireCondition(
      protectedProjects.length === 2 && targetProtections.length === 1 && sourceProtections.length === 1,
      'DiscordOS source example must contain only the shared-target and source protected identities'
    );
    requireCondition(rehearsal.status === 'BLOCKED' && rehearsal.restore_project_ref === null && rehearsal.snapshot_id === null && rehearsal.observed_at === null && rehearsal.maximum_age_seconds === null && rehearsal.inventory_evidence_sha256 === null, 'DiscordOS source example must not invent rehearsal evidence');
    requireCondition(quarantine.status === 'BLOCKED' && quarantine.sink_mode === 'UNKNOWN', 'DiscordOS source example must not claim active quarantine');
    requireCondition(quarantine.observation?.status === 'BLOCKED' && quarantine.observation?.maximum_age_seconds === 7200, 'DiscordOS source example must retain the blocked observation freshness policy without claiming proof');
    requireCondition(rollback.status === 'BLOCKED', 'DiscordOS source example must not claim rollback proof');
    requireCondition(compatibility.behavioral_status === 'BLOCKED' && compatibility.behavioral_evidence_sha256 === null, 'DiscordOS source example must not claim pg_net behavioral compatibility');
    requireCondition(effects.effects.every((entry) => entry.evidence === null), 'DiscordOS source example must not invent authenticated per-effect evidence');
    requireCondition(
      canonicalSerialize(evidencePolicy) === canonicalSerialize(discordExternalEffectAuthorizedEvidencePolicy),
      'DiscordOS source example must retain the blocked contract-owned evidence policy without inventing an operational trust anchor'
    );
    return;
  }

  const exactAuthorizedPolicy = canonicalSerialize(evidencePolicy) === canonicalSerialize(discordExternalEffectAuthorizedEvidencePolicy);
  requireCondition(exactAuthorizedPolicy, 'DiscordOS external-effect evidence policy does not exactly match the immutable contract-authorized policy');
  requireCondition(discordExternalEffectAuthorizedEvidencePolicy.status === 'CURRENT', 'DiscordOS immutable contract-authorized authenticator policy remains BLOCKED');
  requireCondition(discordos.status === 'CURRENT', 'accepted DiscordOS quarantine requires CURRENT status');
  requireCondition(rehearsal.status === 'CURRENT', 'accepted DiscordOS quarantine requires a CURRENT rehearsal inventory');
  requireCondition(rehearsal.restore_project_ref === effects.restore_project_ref, 'DiscordOS rehearsal project must correlate to the external-effects manifest');
  requireCondition(projectRef.test(rehearsal.restore_project_ref ?? ''), 'accepted DiscordOS quarantine requires a valid disposable rehearsal-project identity');
  requireCondition(!protectedProjectRefs.includes(rehearsal.restore_project_ref), 'DiscordOS rehearsal project must be distinct from every protected source or production project');
  requireCondition(typeof rehearsal.snapshot_id === 'string', 'accepted DiscordOS quarantine requires a rehearsal snapshot identity');
  requireCondition(typeof rehearsal.observed_at === 'string' && timestamp.test(rehearsal.observed_at), 'accepted DiscordOS quarantine requires a rehearsal observation timestamp');
  requireCondition(Number.isInteger(rehearsal.maximum_age_seconds) && rehearsal.maximum_age_seconds > 0, 'accepted DiscordOS quarantine requires a positive freshness window');
  requireCondition(hexSha256.test(rehearsal.inventory_evidence_sha256 ?? ''), 'accepted DiscordOS quarantine requires independent inventory evidence');
  requireCondition(now !== undefined, 'accepted DiscordOS quarantine requires an injected validation clock');
  if (typeof rehearsal.observed_at === 'string' && Number.isInteger(rehearsal.maximum_age_seconds) && now !== undefined) {
    try {
      const freshness = evaluateFreshness({ completedAt: rehearsal.observed_at, maxAgeSeconds: rehearsal.maximum_age_seconds, now });
      requireCondition(freshness.status === 'CURRENT', `DiscordOS rehearsal inventory freshness failed: ${freshness.reason}`);
    } catch (error) {
      failures.push(error.message);
    }
  }

  requireCondition(quarantine.status === 'CURRENT' && ['DENIED_EGRESS', 'SYNTHETIC_SINK_ONLY'].includes(quarantine.sink_mode), 'accepted DiscordOS quarantine requires denied or sink-only egress');
  requireCondition(rollback.status === 'CURRENT', 'accepted DiscordOS quarantine requires CURRENT rollback proof');
  requireCondition(compatibility.behavioral_status === 'CURRENT' && hexSha256.test(compatibility.behavioral_evidence_sha256 ?? ''), 'accepted DiscordOS quarantine requires pg_net behavioral evidence');

  const observation = quarantine.observation;
  requireCondition(isRecord(observation) && observation.status === 'CURRENT', 'accepted DiscordOS quarantine requires CURRENT two-read observation');
  if (isRecord(observation)) {
    requireCondition(observation.minimum_interval_seconds === 121, 'DiscordOS two-read interval denominator changed');
    requireCondition(observation.maximum_age_seconds === 7200, 'DiscordOS two-read freshness-policy denominator changed');
    requireCondition(hexSha256.test(observation.first_evidence_sha256 ?? '') && hexSha256.test(observation.second_evidence_sha256 ?? ''), 'DiscordOS two-read observation requires canonical evidence digests');
    requireCondition(observation.first_evidence_sha256 !== observation.second_evidence_sha256, 'DiscordOS two-read observation requires independent evidence digests');
    requireCondition(
      observation.cron_growth === 0
        && observation.queue_growth === 0
        && observation.response_growth === 0
        && observation.sink_effect_count === 0
        && observation.edge_invocation_growth === 0,
      'DiscordOS two-read observation requires zero external-effect growth'
    );
    try {
      const first = parseTimestamp(observation.first_observed_at, 'discordos.quarantine.observation.first_observed_at');
      const second = parseTimestamp(observation.second_observed_at, 'discordos.quarantine.observation.second_observed_at');
      requireCondition(second >= first, 'DiscordOS two-read observation chronology is non-monotonic');
      requireCondition(second - first >= observation.minimum_interval_seconds * 1000, 'DiscordOS two-read observation interval is too short');
      if (now !== undefined && Number.isInteger(observation.maximum_age_seconds)) {
        for (const [label, observedAt] of [['first', observation.first_observed_at], ['second', observation.second_observed_at]]) {
          const freshness = evaluateFreshness({ completedAt: observedAt, maxAgeSeconds: observation.maximum_age_seconds, now });
          requireCondition(freshness.status === 'CURRENT', `DiscordOS ${label} zero-growth observation freshness failed: ${freshness.reason}`);
        }
      }
    } catch (error) {
      failures.push(error.message);
    }
  }

  const evidenceIds = [];
  const verificationIds = [];
  const evidenceDigests = [];
  const verificationDigests = [];
  const coverageDigests = [];
  const authenticationResultIds = [];
  const authenticationResultDigests = [];
  for (const entry of effects.effects) {
    const evidence = entry.evidence;
    requireCondition(isRecord(evidence), `DiscordOS ${entry.unit} requires authenticated structured evidence; digest-only proof is forbidden`);
    if (!isRecord(evidence)) continue;
    requireCondition(entry.evidence_digest === sha256Hex(evidence), `DiscordOS ${entry.unit} evidence digest does not authenticate its structured evidence`);
    requireCondition(evidence.unit === entry.unit, `DiscordOS ${entry.unit} evidence unit mismatch`);
    requireCondition(evidence.source_project_ref === source.project_ref && evidence.target_project_ref === rehearsal.target_project_ref, `DiscordOS ${entry.unit} evidence project mismatch`);
    requireCondition(evidence.restore_project_ref === rehearsal.restore_project_ref, `DiscordOS ${entry.unit} evidence rehearsal-project mismatch`);
    requireCondition(evidence.snapshot_id === rehearsal.snapshot_id, `DiscordOS ${entry.unit} evidence snapshot mismatch`);
    requireCondition(evidence.inventory_manifest_sha256 === rehearsal.inventory_evidence_sha256, `DiscordOS ${entry.unit} evidence inventory correlation mismatch`);
    requireCondition(evidence.disabled === true && evidence.coverage_count === 0, `DiscordOS ${entry.unit} evidence must prove an exact zero enabled denominator`);
    requireCondition(hexSha256.test(evidence.coverage_sha256 ?? ''), `DiscordOS ${entry.unit} coverage digest is malformed`);
    requireCondition(evidence.maximum_age_seconds === evidencePolicy.maximum_age_seconds
      && evidence.maximum_age_seconds === discordExternalEffectEvidencePolicy.maximum_age_seconds, `DiscordOS ${entry.unit} evidence freshness policy does not match the contract-owned maximum`);
    requireCondition(evidence.authenticator_class === 'pinned_ed25519_signature_result', `DiscordOS ${entry.unit} evidence authenticator is unsupported`);
    requireCondition(evidence.verification_status === 'CURRENT', `DiscordOS ${entry.unit} evidence is not independently verified`);
    requireCondition(hexSha256.test(evidence.verification_receipt_sha256 ?? ''), `DiscordOS ${entry.unit} verification receipt digest is malformed`);
    requireCondition(typeof evidence.evidence_id === 'string' && typeof evidence.verification_receipt_id === 'string', `DiscordOS ${entry.unit} evidence identities are missing`);
    try {
      const freshness = evaluateFreshness({ completedAt: evidence.observed_at, maxAgeSeconds: evidence.maximum_age_seconds, now });
      requireCondition(freshness.status === 'CURRENT', `DiscordOS ${entry.unit} evidence freshness failed: ${freshness.reason}`);
      const observed = parseTimestamp(evidence.observed_at, `discordos.${entry.unit}.observed_at`);
      const verified = parseTimestamp(evidence.verified_at, `discordos.${entry.unit}.verified_at`);
      requireCondition(verified >= observed, `DiscordOS ${entry.unit} verification precedes observation`);
      requireCondition(verified <= parseTimestamp(now, 'now'), `DiscordOS ${entry.unit} verification is in the future`);
    } catch (error) {
      failures.push(error.message);
    }
    const authenticationResult = evidence.authentication_result;
    requireCondition(isRecord(authenticationResult), `DiscordOS ${entry.unit} requires a structured cryptographic authentication result`);
    if (isRecord(authenticationResult)) {
      const subjectDigest = externalEffectAuthenticationSubjectDigest(evidence);
      const resultDigest = externalEffectAuthenticationResultDigest(authenticationResult);
      const manifestIdentityDigest = externalEffectAuthenticationManifestIdentityDigest(effects);
      requireCondition(authenticationResult.version === '1.0.0'
        && authenticationResult.status === 'CURRENT'
        && isRecord(authenticationResult.verification)
        && authenticationResult.verification.outcome === 'PASS'
        && authenticationResult.canonical_serialization === 'lexicographic_object_keys_array_order_preserved_two_space_json_lf'
        && authenticationResult.result_class === 'trusted_external_effect_authentication'
        && authenticationResult.verification_method === 'external_signature_verification', `DiscordOS ${entry.unit} authentication result must separate CURRENT lifecycle from PASS cryptographic verification`);
      requireCondition(authenticationResult.unit === entry.unit
        && authenticationResult.evidence_id === evidence.evidence_id, `DiscordOS ${entry.unit} authentication result effect identity mismatch`);
      requireCondition(authenticationResult.manifest_identity_sha256 === manifestIdentityDigest, `DiscordOS ${entry.unit} authentication result manifest identity mismatch`);
      requireCondition(authenticationResult.subject_sha256 === subjectDigest, `DiscordOS ${entry.unit} authentication result evidence subject mismatch`);
      requireCondition(authenticationResult.external_receipt_sha256 === evidence.verification_receipt_sha256, `DiscordOS ${entry.unit} authentication result external receipt mismatch`);
      requireCondition(authenticationResult.verified_at === evidence.verified_at, `DiscordOS ${entry.unit} authentication result verification timestamp mismatch`);
      requireCondition(resultDigest !== null && authenticationResult.result_sha256 === resultDigest, `DiscordOS ${entry.unit} authentication result digest mismatch`);
      if (exactAuthorizedPolicy && discordExternalEffectAuthorizedEvidencePolicy.status === 'CURRENT') {
        failures.push(...verifyExternalEffectAuthenticationAgainstAuthorizedPolicy(
          discordExternalEffectAuthorizedEvidencePolicy,
          evidencePolicy,
          authenticationResult
        ));
      }
      authenticationResultIds.push(authenticationResult.result_id);
      authenticationResultDigests.push(authenticationResult.result_sha256);
    }
    evidenceIds.push(evidence.evidence_id);
    verificationIds.push(evidence.verification_receipt_id);
    evidenceDigests.push(entry.evidence_digest);
    verificationDigests.push(evidence.verification_receipt_sha256);
    coverageDigests.push(evidence.coverage_sha256);
  }
  requireCondition(new Set(evidenceIds).size === expectedExternalEffectUnits.length, 'DiscordOS per-effect evidence identities must be unique and complete');
  requireCondition(new Set(verificationIds).size === expectedExternalEffectUnits.length, 'DiscordOS verification receipt identities must be unique and complete');
  requireCondition(new Set(evidenceDigests).size === expectedExternalEffectUnits.length, 'DiscordOS structured evidence digests must be unique and complete');
  requireCondition(new Set(verificationDigests).size === expectedExternalEffectUnits.length, 'DiscordOS verification receipt digests must be unique and complete');
  requireCondition(new Set(coverageDigests).size === expectedExternalEffectUnits.length, 'DiscordOS coverage digests must be unique and complete');
  requireCondition(new Set(authenticationResultIds).size === expectedExternalEffectUnits.length, 'DiscordOS authentication result identities must be unique and complete');
  requireCondition(new Set(authenticationResultDigests).size === expectedExternalEffectUnits.length, 'DiscordOS authentication result digests must be unique and complete');
  const circularDigests = new Set([
    effects.manifest_sha256,
    source.evidence_receipt_sha256,
    source.edge_identity_manifest_sha256,
    rehearsal.inventory_evidence_sha256,
    compatibility.behavioral_evidence_sha256,
    observation?.first_evidence_sha256,
    observation?.second_evidence_sha256
  ].filter(Boolean));
  const allPerEffectDigests = [...evidenceDigests, ...verificationDigests, ...coverageDigests, ...authenticationResultDigests];
  requireCondition(new Set(allPerEffectDigests).size === allPerEffectDigests.length, 'DiscordOS evidence contains reused or circular per-effect digests');
  requireCondition(allPerEffectDigests.every((digest) => !circularDigests.has(digest)), 'DiscordOS evidence cannot reuse a manifest, inventory, compatibility, observation, or source-receipt digest');
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
    'discordos_external_effect_inventory',
    'authenticated_external_effect_evidence',
    'quarantine_order_and_observation',
    'pg_net_compatibility',
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
  validateDiscordQuarantine(effects, { sourceExamples, now: options.now, requireCondition, failures });

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
