import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  createValidator,
  loadDocuments,
  validateSchemaInstances
} from '../scripts/lib/contracts.mjs';
import {
  backupManifestDigest,
  canonicalSerialize,
  discordExternalEffectAuthorizedEvidencePolicy,
  evaluateFreshness,
  externalEffectAuthenticationManifestIdentityDigest,
  externalEffectAuthenticationResultDigest,
  externalEffectAuthenticationSignedBytes,
  externalEffectAuthenticationSignedPayloadDigest,
  externalEffectAuthenticationSubjectDigest,
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
  validateSanitizedReceipt,
  verifyExternalEffectAuthenticationAgainstAuthorizedPolicy
} from '../scripts/lib/recovery.mjs';

const observedAt = '2026-07-18T17:00:00Z';
const externalEffectSignatureDomain = 'fawxzzy-platform:discordos-external-effect-authentication:v1';

// RFC 8032 test vector 1. This public test identity exists only in deterministic
// test memory; it is not a production credential or admitted operational anchor.
const testEd25519PublicSpki = Buffer.from(`302a300506032b6570032100${'d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'}`, 'hex');
const testEd25519PrivatePkcs8 = Buffer.from(`302e020100300506032b657004220420${'9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60'}`, 'hex');
const testEd25519PrivateKey = crypto.createPrivateKey({ key: testEd25519PrivatePkcs8, format: 'der', type: 'pkcs8' });
const testExternalEffectTrustAnchor = Object.freeze({
  status: 'CURRENT',
  algorithm: 'Ed25519',
  key_id: 'discordos-effect-test-ed25519-v1',
  verifier_reference: 'discordos-effect-test-verifier-v1',
  public_key_spki_base64: testEd25519PublicSpki.toString('base64'),
  public_key_spki_sha256: crypto.createHash('sha256').update(testEd25519PublicSpki).digest('hex')
});
const testExternalEffectAuthorizedPolicy = Object.freeze({
  version: '1.0.0',
  status: 'CURRENT',
  maximum_age_seconds: 7200,
  signature_domain: externalEffectSignatureDomain,
  trust_anchor: testExternalEffectTrustAnchor
});
const operationalAuthenticatorBlocker = 'DiscordOS immutable contract-authorized authenticator policy remains BLOCKED';

function isObjectRecordForTest(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function signExternalEffectAuthenticationResult(result, privateKey = testEd25519PrivateKey) {
  result.signed_payload_sha256 = externalEffectAuthenticationSignedPayloadDigest(result);
  result.signature_base64 = crypto.sign(null, externalEffectAuthenticationSignedBytes(result), privateKey).toString('base64');
  result.result_sha256 = externalEffectAuthenticationResultDigest(result);
}

function bindExternalEffectAuthenticationForEvidence(manifest, evidence, suffix, privateKey = testEd25519PrivateKey) {
  const result = {
    version: '1.0.0',
    status: 'CURRENT',
    verification: {
      outcome: 'PASS'
    },
    canonical_serialization: 'lexicographic_object_keys_array_order_preserved_two_space_json_lf',
    result_class: 'trusted_external_effect_authentication',
    result_id: `FP-DOS-EFFECT-AUTH-RESULT-${suffix}`,
    verified_at: evidence.verified_at,
    verifier_reference: testExternalEffectTrustAnchor.verifier_reference,
    verification_method: 'external_signature_verification',
    key_id: testExternalEffectTrustAnchor.key_id,
    signature_algorithm: 'Ed25519',
    signature_domain: externalEffectSignatureDomain,
    manifest_identity_sha256: externalEffectAuthenticationManifestIdentityDigest(manifest),
    unit: evidence.unit,
    evidence_id: evidence.evidence_id,
    subject_sha256: externalEffectAuthenticationSubjectDigest(evidence),
    external_receipt_sha256: evidence.independent_receipt_sha256 ?? evidence.verification_receipt_sha256,
    signed_payload_sha256: null,
    signature_base64: null,
    result_sha256: null
  };
  signExternalEffectAuthenticationResult(result, privateKey);
  evidence.authentication_result = result;
  return result;
}

function bindExternalEffectAuthentication(manifest, effect, privateKey = testEd25519PrivateKey) {
  const evidence = effect.evidence;
  const suffix = effect.unit.replaceAll('_', '-').toUpperCase();
  bindExternalEffectAuthenticationForEvidence(manifest, evidence, suffix, privateKey);
  effect.evidence_digest = sha256Hex(evidence);
}

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
  const zeroGrowthRunId = 'FP-DOS-QUARANTINE-RUN-001';
  const makeReadback = (suffix, observed_at) => {
    const counts = {
      cron_count: 1,
      queue_count: 0,
      response_count: 0,
      sink_effect_count: 0,
      edge_invocation_count: 0
    };
    const readback = {
      observation_id: `FP-DOS-ZERO-GROWTH-OBSERVATION-${suffix}`,
      observed_at,
      counts,
      counts_sha256: sha256Hex(counts),
      readback_sha256: null
    };
    readback.readback_sha256 = sha256Hex({
      counts: readback.counts,
      counts_sha256: readback.counts_sha256,
      observation_id: readback.observation_id,
      observed_at: readback.observed_at
    });
    return readback;
  };
  const firstReadback = makeReadback('001', '2026-07-18T15:50:00Z');
  const secondReadback = makeReadback('002', '2026-07-18T15:53:00Z');
  const zeroGrowthEvidence = {
    evidence_id: 'FP-DOS-EFFECT-EVIDENCE-ZERO-GROWTH-001',
    unit: 'quarantine_zero_growth',
    source_project_ref: 'nwexsktuuenfdegzrbut',
    target_project_ref: 'bxtcuhkotumitoqtrcej',
    restore_project_ref: effects.restore_project_ref,
    snapshot_id: rehearsalSnapshotId,
    run_id: zeroGrowthRunId,
    maximum_age_seconds: 7200,
    first_readback: firstReadback,
    second_readback: secondReadback,
    independent_receipt_id: 'FP-DOS-ZERO-GROWTH-READBACK-001',
    independent_receipt_sha256: sha256Hex({ receipt_id: 'FP-DOS-ZERO-GROWTH-READBACK-001', run_id: zeroGrowthRunId }),
    verified_at: '2026-07-18T15:54:00Z'
  };
  bindExternalEffectAuthenticationForEvidence(effects, zeroGrowthEvidence, 'ZERO-GROWTH-001');
  discordos.quarantine.observation = {
    status: 'CURRENT',
    minimum_interval_seconds: 121,
    maximum_age_seconds: 7200,
    first_observed_at: '2026-07-18T15:50:00Z',
    second_observed_at: '2026-07-18T15:53:00Z',
    first_evidence_sha256: firstReadback.readback_sha256,
    second_evidence_sha256: secondReadback.readback_sha256,
    cron_growth: 0,
    queue_growth: 0,
    response_growth: 0,
    sink_effect_count: 0,
    edge_invocation_growth: 0,
    authenticated_readback_evidence: zeroGrowthEvidence
  };
  discordos.rollback.status = 'CURRENT';
  const pgNetRunId = 'FP-DOS-PG-NET-RUN-001';
  const pgNetTestManifestId = 'FP-DOS-PG-NET-TEST-MANIFEST-001';
  const pgNetTestManifestSha256 = sha256Hex({
    run_id: pgNetRunId,
    test_manifest_id: pgNetTestManifestId,
    tests: expectedPgNetBehavioralTests
  });
  const pgNetBehavioralEvidence = {
    evidence_id: 'FP-DOS-EFFECT-EVIDENCE-PG-NET-001',
    unit: 'pg_net_behavioral_compatibility',
    source_project_ref: 'nwexsktuuenfdegzrbut',
    target_project_ref: 'bxtcuhkotumitoqtrcej',
    restore_project_ref: effects.restore_project_ref,
    snapshot_id: rehearsalSnapshotId,
    run_id: pgNetRunId,
    extension_name: 'pg_net',
    source_version: '0.20.0',
    target_version: '0.20.4',
    test_manifest_id: pgNetTestManifestId,
    test_manifest_sha256: pgNetTestManifestSha256,
    observed_at: '2026-07-18T15:55:00Z',
    maximum_age_seconds: 7200,
    test_cases: expectedPgNetBehavioralTests.map((name) => ({
      name,
      expected_outcome_class: 'PASS',
      actual_outcome_class: 'PASS',
      outcome_sha256: sha256Hex({
        actual_outcome_class: 'PASS',
        expected_outcome_class: 'PASS',
        name,
        run_id: pgNetRunId,
        test_manifest_sha256: pgNetTestManifestSha256
      })
    })),
    independent_receipt_id: 'FP-DOS-PG-NET-BEHAVIORAL-RECEIPT-001',
    independent_receipt_sha256: sha256Hex({ receipt_id: 'FP-DOS-PG-NET-BEHAVIORAL-RECEIPT-001', run_id: pgNetRunId }),
    verified_at: '2026-07-18T15:56:00Z'
  };
  bindExternalEffectAuthenticationForEvidence(effects, pgNetBehavioralEvidence, 'PG-NET-001');
  discordos.pg_net_compatibility.behavioral_status = 'CURRENT';
  discordos.pg_net_compatibility.behavioral_evidence = pgNetBehavioralEvidence;
  discordos.pg_net_compatibility.behavioral_evidence_sha256 = sha256Hex(pgNetBehavioralEvidence);
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
      authenticator_class: 'pinned_ed25519_signature_result',
      verification_status: 'CURRENT',
      verification_receipt_id: `FP-DOS-EFFECT-VERIFY-${suffix}`,
      verification_receipt_sha256: sha256Hex({ receipt_id: `FP-DOS-EFFECT-VERIFY-${suffix}`, unit: effect.unit }),
      verified_at: '2026-07-18T15:51:00Z'
    };
    bindExternalEffectAuthentication(effects, effect);
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

test('fully correlated action-time receipts remain held by the immutable operational authenticator anchor', () => {
  const documents = buildActionDocuments();

  assert.deepEqual(validateSchemaInstances(documents, createValidator()), []);
  const report = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt });
  assert.deepEqual(report.failures, [operationalAuthenticatorBlocker]);
  assert.equal(report.ok, false);
  assert.equal(documents[recoveryDocumentPaths.contract].status, 'BLOCKED');
  assert.deepEqual(documents[recoveryDocumentPaths.effects].discordos.evidence_policy, discordExternalEffectAuthorizedEvidencePolicy);
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

test('malformed DiscordOS Edge inventory entries fail closed without throwing', () => {
  const scenarios = [
    {
      name: 'null entry',
      mutate: (entries) => { entries[0] = null; },
      expected: 'Edge inventory entries must be objects'
    },
    {
      name: 'non-object entry',
      mutate: (entries) => { entries[0] = 'not-an-edge-function'; },
      expected: 'Edge inventory entries must be objects'
    },
    {
      name: 'missing required identity',
      mutate: (entries) => { delete entries[0].slug; },
      expected: 'six-function source/deployment identity denominator changed'
    },
    {
      name: 'structurally malformed digest',
      mutate: (entries) => { entries[0].provider_raw_source_sha256 = null; },
      expected: 'six-function source/deployment identity denominator changed'
    }
  ];

  for (const scenario of scenarios) {
    const documents = buildActionDocuments();
    scenario.mutate(documents[recoveryDocumentPaths.effects].discordos.inventory.edge_functions);
    refreshActionDigests(documents);
    let report;
    assert.doesNotThrow(() => {
      report = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt });
    }, scenario.name);
    assert.equal(report.ok, false, scenario.name);
    assert.ok(report.failures.some((failure) => failure.includes(scenario.expected)), scenario.name);
    assert.notDeepEqual(validateSchemaInstances(documents, createValidator()), [], scenario.name);
  }
});

test('malformed DiscordOS extension inventory entries fail closed without throwing', () => {
  const scenarios = [
    {
      name: 'null entry',
      mutate: (entries) => { entries[0] = null; },
      expected: 'extension inventory entries must be objects'
    },
    {
      name: 'non-object entry',
      mutate: (entries) => { entries[0] = 'not-an-extension'; },
      expected: 'extension inventory entries must be objects'
    },
    {
      name: 'missing name',
      mutate: (entries) => { delete entries[0].name; },
      expected: 'extension source/target denominator changed'
    },
    {
      name: 'missing version',
      mutate: (entries) => { delete entries[0].source_installed_version; },
      expected: 'extension source/target denominator changed'
    },
    {
      name: 'wrong installed type',
      mutate: (entries) => { entries[0].target_installed = 'false'; },
      expected: 'extension source/target denominator changed'
    },
    {
      name: 'duplicate entry',
      mutate: (entries) => { entries[0] = structuredClone(entries[1]); },
      expected: 'extension source/target denominator changed',
      schemaFailure: false
    },
    {
      name: 'mixed valid and invalid entries',
      mutate: (entries) => { entries.push(null); },
      expected: 'extension inventory entries must be objects'
    }
  ];

  for (const scenario of scenarios) {
    const documents = buildActionDocuments();
    scenario.mutate(documents[recoveryDocumentPaths.effects].discordos.inventory.extensions);
    refreshActionDigests(documents);
    let report;
    assert.doesNotThrow(() => {
      report = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt });
    }, scenario.name);
    assert.equal(report.ok, false, scenario.name);
    assert.ok(report.failures.some((failure) => failure.includes(scenario.expected)), scenario.name);
    assert.deepEqual(report, validateRecoveryDocuments(documents, { mode: 'action', now: observedAt }), scenario.name);
    if (scenario.schemaFailure !== false) {
      assert.notDeepEqual(validateSchemaInstances(documents, createValidator()), [], scenario.name);
    }
  }

  const reordered = buildActionDocuments();
  reordered[recoveryDocumentPaths.effects].discordos.inventory.extensions.reverse();
  refreshActionDigests(reordered);
  assert.deepEqual(
    validateRecoveryDocuments(reordered, { mode: 'action', now: observedAt }).failures,
    [operationalAuthenticatorBlocker]
  );
});

test('DiscordOS restore identity is distinct from every complete protected-project identity', () => {
  const setRestoreProject = (documents, projectRef) => {
    const effects = documents[recoveryDocumentPaths.effects];
    effects.restore_project_ref = projectRef;
    effects.discordos.rehearsal.restore_project_ref = projectRef;
    for (const effect of effects.effects) {
      effect.evidence.restore_project_ref = projectRef;
      effect.evidence_digest = sha256Hex(effect.evidence);
    }
    documents[recoveryDocumentPaths.restore].clone.project_ref = projectRef;
  };
  const scenarios = [
    {
      name: 'shared target equality',
      mutate: (documents) => {
        const protectedProjects = documents[recoveryDocumentPaths.effects].protected_projects;
        setRestoreProject(documents, protectedProjects.find((entry) => entry.identity_class === 'shared_target').project_ref);
      },
      expected: 'distinct from every protected source or production project'
    },
    {
      name: 'DiscordOS source equality',
      mutate: (documents) => {
        const protectedProjects = documents[recoveryDocumentPaths.effects].protected_projects;
        setRestoreProject(documents, protectedProjects.find((entry) => entry.identity_class === 'discordos_source').project_ref);
      },
      expected: 'distinct from every protected source or production project'
    },
    {
      name: 'additional protected identity equality',
      mutate: (documents) => {
        const effects = documents[recoveryDocumentPaths.effects];
        const additionalRef = 'qrstuvwxyzabcdefghij';
        effects.protected_projects.push({ identity_class: 'additional_protected_source_or_production', project_ref: additionalRef });
        setRestoreProject(documents, additionalRef);
      },
      expected: 'distinct from every protected source or production project'
    },
    {
      name: 'duplicate protected identity',
      mutate: (documents) => {
        const protectedProjects = documents[recoveryDocumentPaths.effects].protected_projects;
        protectedProjects[1].project_ref = protectedProjects[0].project_ref;
      },
      expected: 'protected-project identities must be unique'
    },
    {
      name: 'missing protected source',
      mutate: (documents) => { documents[recoveryDocumentPaths.effects].protected_projects.pop(); },
      expected: 'protected-project denominator is incomplete',
      schemaFailure: true
    },
    {
      name: 'protected identity substitution',
      mutate: (documents) => {
        const protectedProjects = documents[recoveryDocumentPaths.effects].protected_projects;
        protectedProjects.find((entry) => entry.identity_class === 'shared_target').project_ref = 'zyxwvutsrqponmlkjihg';
      },
      expected: 'protected shared-target identity must correlate'
    },
    {
      name: 'malformed protected identity',
      mutate: (documents) => { documents[recoveryDocumentPaths.effects].protected_projects[0].project_ref = 'INVALID'; },
      expected: 'protected-project identity is malformed',
      schemaFailure: true
    }
  ];

  for (const scenario of scenarios) {
    const documents = buildActionDocuments();
    scenario.mutate(documents);
    refreshActionDigests(documents);
    const report = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt });
    assert.ok(report.failures.some((failure) => failure.includes(scenario.expected)), scenario.name);
    if (scenario.schemaFailure) assert.notDeepEqual(validateSchemaInstances(documents, createValidator()), [], scenario.name);
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
      expected: 'cannot reuse a manifest, inventory, compatibility, observation, test-manifest, or source-receipt digest'
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

test('DiscordOS per-effect freshness is fixed by the versioned contract policy', () => {
  const exactBoundary = buildActionDocuments();
  const exactEffect = exactBoundary[recoveryDocumentPaths.effects].effects[0];
  exactEffect.evidence.observed_at = '2026-07-18T15:00:00Z';
  exactEffect.evidence.verified_at = '2026-07-18T15:00:00Z';
  bindExternalEffectAuthentication(exactBoundary[recoveryDocumentPaths.effects], exactEffect);
  refreshActionDigests(exactBoundary);
  assert.deepEqual(validateSchemaInstances(exactBoundary, createValidator()), []);
  assert.deepEqual(validateRecoveryDocuments(exactBoundary, { mode: 'action', now: observedAt }).failures, [operationalAuthenticatorBlocker]);

  const scenarios = [
    {
      name: 'caller maximum inflation',
      mutate: (manifest, effect) => { effect.evidence.maximum_age_seconds = 86400; bindExternalEffectAuthentication(manifest, effect); },
      expected: 'freshness policy does not match the contract-owned maximum',
      schemaFailure: true
    },
    {
      name: 'missing contract policy',
      mutate: (manifest) => { delete manifest.discordos.evidence_policy; },
      expected: 'quarantine contract is incomplete',
      schemaFailure: true
    },
    {
      name: 'mismatched contract policy',
      mutate: (manifest) => { manifest.discordos.evidence_policy.maximum_age_seconds = 7201; },
      expected: 'external-effect evidence policy does not exactly match the immutable contract-authorized policy',
      schemaFailure: true
    },
    {
      name: 'boundary plus one second',
      mutate: (manifest, effect) => {
        effect.evidence.observed_at = '2026-07-18T14:59:59Z';
        effect.evidence.verified_at = '2026-07-18T15:00:00Z';
        bindExternalEffectAuthentication(manifest, effect);
      },
      expected: 'evidence freshness failed: backup is stale'
    },
    {
      name: 'future evidence',
      mutate: (manifest, effect) => {
        effect.evidence.observed_at = '2026-07-18T17:00:01Z';
        effect.evidence.verified_at = '2026-07-18T17:00:01Z';
        bindExternalEffectAuthentication(manifest, effect);
      },
      expected: 'evidence freshness failed: completion time is in the future'
    }
  ];

  for (const scenario of scenarios) {
    const documents = buildActionDocuments();
    const manifest = documents[recoveryDocumentPaths.effects];
    scenario.mutate(manifest, manifest.effects[0]);
    refreshActionDigests(documents);
    const report = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt });
    assert.ok(report.failures.some((failure) => failure.includes(scenario.expected)), scenario.name);
    if (scenario.schemaFailure) assert.notDeepEqual(validateSchemaInstances(documents, createValidator()), [], scenario.name);
  }
});

test('DiscordOS external-effect evidence requires the immutable source-authorized Ed25519 trust anchor', () => {
  const valid = buildActionDocuments();
  assert.deepEqual(validateSchemaInstances(valid, createValidator()), []);
  assert.deepEqual(validateRecoveryDocuments(valid, { mode: 'action', now: observedAt }).failures, [operationalAuthenticatorBlocker]);

  const substitutedActionPolicy = buildActionDocuments();
  substitutedActionPolicy[recoveryDocumentPaths.effects].discordos.evidence_policy = structuredClone(testExternalEffectAuthorizedPolicy);
  refreshActionDigests(substitutedActionPolicy);
  assert.ok(validateRecoveryDocuments(substitutedActionPolicy, { mode: 'action', now: observedAt }).failures.some(
    (failure) => failure.includes('does not exactly match the immutable contract-authorized policy')
  ));

  const validResult = valid[recoveryDocumentPaths.effects].effects[0].evidence.authentication_result;
  assert.deepEqual(
    verifyExternalEffectAuthenticationAgainstAuthorizedPolicy(
      testExternalEffectAuthorizedPolicy,
      testExternalEffectAuthorizedPolicy,
      validResult
    ),
    []
  );

  const alternatePublicKey = Buffer.from(`302a300506032b6570032100${'3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c'}`, 'hex');
  const policySubstitutions = [
    ['attacker key substitution', (policy) => {
      policy.trust_anchor.key_id = 'attacker-effect-key-v1';
      policy.trust_anchor.public_key_spki_base64 = alternatePublicKey.toString('base64');
      policy.trust_anchor.public_key_spki_sha256 = crypto.createHash('sha256').update(alternatePublicKey).digest('hex');
    }],
    ['same key different identity', (policy) => { policy.trust_anchor.key_id = 'substituted-effect-key-v1'; }],
    ['same identity different key', (policy) => {
      policy.trust_anchor.public_key_spki_base64 = alternatePublicKey.toString('base64');
      policy.trust_anchor.public_key_spki_sha256 = crypto.createHash('sha256').update(alternatePublicKey).digest('hex');
    }],
    ['verifier substitution', (policy) => { policy.trust_anchor.verifier_reference = 'substituted-effect-verifier-v1'; }],
    ['algorithm substitution', (policy) => { policy.trust_anchor.algorithm = 'RSA-PSS'; }],
    ['signature-domain substitution', (policy) => { policy.signature_domain = 'substituted:domain:v1'; }],
    ['policy-version substitution', (policy) => { policy.version = '2.0.0'; }],
    ['policy-status substitution', (policy) => { policy.status = 'BLOCKED'; }],
    ['anchor-status substitution', (policy) => { policy.trust_anchor.status = 'BLOCKED'; }]
  ];
  for (const [name, mutate] of policySubstitutions) {
    const presentedPolicy = structuredClone(testExternalEffectAuthorizedPolicy);
    mutate(presentedPolicy);
    const failures = verifyExternalEffectAuthenticationAgainstAuthorizedPolicy(
      testExternalEffectAuthorizedPolicy,
      presentedPolicy,
      validResult
    );
    assert.deepEqual(failures, ['DiscordOS external-effect authentication policy does not exactly match the immutable contract-authorized policy'], name);
  }

  const malformedPolicy = structuredClone(testExternalEffectAuthorizedPolicy);
  malformedPolicy.trust_anchor.public_key_spki_base64 = 'AQIDBA==';
  malformedPolicy.trust_anchor.public_key_spki_sha256 = crypto.createHash('sha256').update(Buffer.from([1, 2, 3, 4])).digest('hex');
  assert.ok(verifyExternalEffectAuthenticationAgainstAuthorizedPolicy(
    malformedPolicy,
    structuredClone(malformedPolicy),
    validResult
  ).some((failure) => failure.includes('trust-anchor key cannot be verified')));

  const authenticationResultScenarios = [
    ['status and verification conflation', (result) => { result.status = 'PASS'; signExternalEffectAuthenticationResult(result); }, 'result lifecycle is not CURRENT', true],
    ['unknown lifecycle alias', (result) => { result.status = 'VERIFIED'; signExternalEffectAuthenticationResult(result); }, 'result lifecycle is not CURRENT', true],
    ['lifecycle case variant', (result) => { result.status = 'current'; signExternalEffectAuthenticationResult(result); }, 'result lifecycle is not CURRENT', true],
    ['omitted verification result', (result) => { delete result.verification; signExternalEffectAuthenticationResult(result); }, 'verification outcome is not PASS', true],
    ['unknown verification alias', (result) => { result.verification.outcome = 'VERIFIED'; signExternalEffectAuthenticationResult(result); }, 'verification outcome is not PASS', true],
    ['verification case variant', (result) => { result.verification.outcome = 'pass'; signExternalEffectAuthenticationResult(result); }, 'verification outcome is not PASS', true],
    ['verified signature with non-CURRENT lifecycle', (result) => { result.status = 'BLOCKED'; signExternalEffectAuthenticationResult(result); }, 'result lifecycle is not CURRENT'],
    ['PASS without a valid signature', (result) => { result.signature_base64 = null; result.result_sha256 = externalEffectAuthenticationResultDigest(result); }, 'signature is malformed'],
    ['unknown key identity', (result) => { result.key_id = 'unknown-effect-key'; signExternalEffectAuthenticationResult(result); }, 'signer does not match the pinned trust anchor'],
    ['unknown verifier identity', (result) => { result.verifier_reference = 'unknown-effect-verifier'; signExternalEffectAuthenticationResult(result); }, 'signer does not match the pinned trust anchor'],
    ['wrong algorithm', (result) => { result.signature_algorithm = 'RSA-PSS'; signExternalEffectAuthenticationResult(result); }, 'signer does not match the pinned trust anchor'],
    ['wrong signature domain', (result) => { result.signature_domain = 'substituted:domain:v1'; signExternalEffectAuthenticationResult(result); }, 'signer does not match the pinned trust anchor'],
    ['malformed signature', (result) => { result.signature_base64 = 'not-a-signature'; result.result_sha256 = externalEffectAuthenticationResultDigest(result); }, 'signature is malformed'],
    ['bad signature', (result) => {
      const bytes = Buffer.from(result.signature_base64, 'base64');
      bytes[0] ^= 1;
      result.signature_base64 = bytes.toString('base64');
      result.result_sha256 = externalEffectAuthenticationResultDigest(result);
    }, 'signature verification failed'],
    ['result metadata substitution', (result) => {
      result.result_id = 'FP-DOS-EFFECT-AUTH-RESULT-SUBSTITUTED';
      result.result_sha256 = externalEffectAuthenticationResultDigest(result);
    }, 'signed payload digest mismatch'],
    ['self-asserted verification', (result) => { result.signature_base64 = null; result.result_sha256 = externalEffectAuthenticationResultDigest(result); }, 'signature is malformed']
  ];
  for (const [name, mutate, expected, schemaFailure = false] of authenticationResultScenarios) {
    const result = structuredClone(validResult);
    mutate(result);
    const failures = verifyExternalEffectAuthenticationAgainstAuthorizedPolicy(
      testExternalEffectAuthorizedPolicy,
      testExternalEffectAuthorizedPolicy,
      result
    );
    assert.ok(failures.some((failure) => failure.includes(expected)), name);
    if (schemaFailure) {
      const documents = buildActionDocuments();
      documents[recoveryDocumentPaths.effects].effects[0].evidence.authentication_result = result;
      documents[recoveryDocumentPaths.effects].effects[0].evidence_digest = sha256Hex(documents[recoveryDocumentPaths.effects].effects[0].evidence);
      refreshActionDigests(documents);
      assert.notDeepEqual(validateSchemaInstances(documents, createValidator()), [], name);
    }
  }

  const scenarios = [
    {
      name: 'manifest substitution',
      mutate: (manifest) => { manifest.backup_id = 'FP-RECOVERY-BACKUP-SUBSTITUTED'; },
      expected: 'manifest identity mismatch'
    },
    {
      name: 'effect substitution',
      mutate: (manifest, effect) => { effect.evidence.evidence_id = 'FP-DOS-EFFECT-EVIDENCE-SUBSTITUTED'; },
      expected: 'authentication result effect identity mismatch'
    },
    {
      name: 'observation substitution',
      mutate: (manifest, effect) => { effect.evidence.observed_at = '2026-07-18T15:50:01Z'; },
      expected: 'authentication result evidence subject mismatch'
    },
    {
      name: 'external receipt substitution',
      mutate: (manifest, effect) => { effect.evidence.verification_receipt_sha256 = sha256Hex({ substituted: 'external-receipt' }); },
      expected: 'authentication result external receipt mismatch'
    },
    {
      name: 'cross-effect replay',
      mutate: (manifest, effect) => { effect.evidence.authentication_result = structuredClone(manifest.effects[1].evidence.authentication_result); },
      expected: 'authentication result effect identity mismatch'
    }
  ];

  for (const scenario of scenarios) {
    const documents = buildActionDocuments();
    const manifest = documents[recoveryDocumentPaths.effects];
    const effect = manifest.effects[0];
    scenario.mutate(manifest, effect, effect.evidence.authentication_result);
    effect.evidence_digest = sha256Hex(effect.evidence);
    refreshActionDigests(documents);
    const report = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt });
    assert.ok(report.failures.some((failure) => failure.includes(scenario.expected)), scenario.name);
    if (scenario.schemaFailure) assert.notDeepEqual(validateSchemaInstances(documents, createValidator()), [], scenario.name);
  }
});

test('DiscordOS supplemental readback and pg_net evidence carry independently verifiable signatures', () => {
  const documents = buildActionDocuments();
  const discordos = documents[recoveryDocumentPaths.effects].discordos;
  const supplementalEvidence = [
    discordos.quarantine.observation.authenticated_readback_evidence,
    discordos.pg_net_compatibility.behavioral_evidence
  ];

  for (const evidence of supplementalEvidence) {
    assert.deepEqual(
      verifyExternalEffectAuthenticationAgainstAuthorizedPolicy(
        testExternalEffectAuthorizedPolicy,
        testExternalEffectAuthorizedPolicy,
        evidence.authentication_result
      ),
      []
    );
    assert.equal(evidence.authentication_result.subject_sha256, externalEffectAuthenticationSubjectDigest(evidence));
    assert.equal(evidence.authentication_result.external_receipt_sha256, evidence.independent_receipt_sha256);

    const wrongKey = structuredClone(evidence.authentication_result);
    wrongKey.key_id = 'untrusted-supplemental-key-v1';
    signExternalEffectAuthenticationResult(wrongKey);
    assert.ok(verifyExternalEffectAuthenticationAgainstAuthorizedPolicy(
      testExternalEffectAuthorizedPolicy,
      testExternalEffectAuthorizedPolicy,
      wrongKey
    ).some((failure) => failure.includes('signer does not match the pinned trust anchor')));

    const badSignature = structuredClone(evidence.authentication_result);
    const signatureBytes = Buffer.from(badSignature.signature_base64, 'base64');
    signatureBytes[0] ^= 1;
    badSignature.signature_base64 = signatureBytes.toString('base64');
    badSignature.result_sha256 = externalEffectAuthenticationResultDigest(badSignature);
    assert.ok(verifyExternalEffectAuthenticationAgainstAuthorizedPolicy(
      testExternalEffectAuthorizedPolicy,
      testExternalEffectAuthorizedPolicy,
      badSignature
    ).some((failure) => failure.includes('signature verification failed')));
  }
});

test('DiscordOS zero-growth readbacks reject unauthenticated malformed stale and substituted evidence', () => {
  const scenarios = [
    {
      name: 'missing authenticated evidence',
      mutate: (observation) => { observation.authenticated_readback_evidence = null; },
      expected: 'requires authenticated structured readback evidence',
      schemaFailure: false
    },
    {
      name: 'null first readback',
      mutate: (observation) => { observation.authenticated_readback_evidence.first_readback = null; },
      expected: 'requires two structured readbacks',
      schemaFailure: true
    },
    {
      name: 'count tamper',
      mutate: (observation) => { observation.authenticated_readback_evidence.second_readback.counts.queue_count = 1; },
      expected: 'second zero-growth counts digest mismatch'
    },
    {
      name: 'readback digest tamper',
      mutate: (observation) => { observation.authenticated_readback_evidence.first_readback.readback_sha256 = 'f'.repeat(64); },
      expected: 'first zero-growth readback digest mismatch'
    },
    {
      name: 'cross-project evidence',
      mutate: (observation) => { observation.authenticated_readback_evidence.source_project_ref = 'abcdefghijklmnopqrst'; },
      expected: 'project correlation mismatch',
      schemaFailure: true
    },
    {
      name: 'cross-snapshot evidence',
      mutate: (observation) => { observation.authenticated_readback_evidence.snapshot_id = 'FP-DOS-REHEARSAL-SNAPSHOT-SUBSTITUTED'; },
      expected: 'snapshot mismatch'
    },
    {
      name: 'cross-run substitution',
      mutate: (observation) => { observation.authenticated_readback_evidence.run_id = 'FP-DOS-QUARANTINE-RUN-SUBSTITUTED'; },
      expected: 'authentication result subject mismatch'
    },
    {
      name: 'swapped observations',
      mutate: (observation) => {
        [observation.authenticated_readback_evidence.first_readback, observation.authenticated_readback_evidence.second_readback] = [
          observation.authenticated_readback_evidence.second_readback,
          observation.authenticated_readback_evidence.first_readback
        ];
      },
      expected: 'readback timestamps do not correlate'
    },
    {
      name: 'future verification',
      mutate: (observation) => { observation.authenticated_readback_evidence.verified_at = '2026-07-18T17:00:01Z'; },
      expected: 'verification is in the future'
    },
    {
      name: 'self-correlated receipt',
      mutate: (observation) => {
        const evidence = observation.authenticated_readback_evidence;
        evidence.independent_receipt_sha256 = evidence.authentication_result.result_sha256;
      },
      expected: 'independent receipt cannot self-correlate'
    },
    {
      name: 'cross-proof authentication replay',
      mutate: (observation, discordos) => {
        observation.authenticated_readback_evidence.authentication_result = structuredClone(discordos.pg_net_compatibility.behavioral_evidence.authentication_result);
      },
      expected: 'authentication result evidence identity mismatch'
    }
  ];

  for (const scenario of scenarios) {
    const documents = buildActionDocuments();
    const discordos = documents[recoveryDocumentPaths.effects].discordos;
    scenario.mutate(discordos.quarantine.observation, discordos);
    refreshActionDigests(documents);
    let report;
    assert.doesNotThrow(() => { report = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt }); }, scenario.name);
    assert.ok(report.failures.some((failure) => failure.includes(scenario.expected)), scenario.name);
    if (scenario.schemaFailure) assert.notDeepEqual(validateSchemaInstances(documents, createValidator()), [], scenario.name);
  }
});

test('DiscordOS pg_net behavioral evidence rejects partial failing stale replayed and substituted proofs', () => {
  const scenarios = [
    {
      name: 'missing structured evidence',
      mutate: (compatibility) => { compatibility.behavioral_evidence = null; compatibility.behavioral_evidence_sha256 = null; },
      expected: 'requires authenticated structured pg_net behavioral evidence'
    },
    {
      name: 'null mixed test case',
      mutate: (compatibility) => { compatibility.behavioral_evidence.test_cases[1] = null; },
      expected: 'test-case denominator changed',
      schemaFailure: true
    },
    {
      name: 'missing required case',
      mutate: (compatibility) => { compatibility.behavioral_evidence.test_cases.pop(); },
      expected: 'test-case denominator changed',
      schemaFailure: true
    },
    {
      name: 'unexpected case',
      mutate: (compatibility) => { compatibility.behavioral_evidence.test_cases[0].name = 'unexpected_case'; },
      expected: 'test-case denominator changed',
      schemaFailure: true
    },
    {
      name: 'failing outcome',
      mutate: (compatibility) => { compatibility.behavioral_evidence.test_cases[0].actual_outcome_class = 'FAIL'; },
      expected: 'did not pass its expected outcome',
      schemaFailure: true
    },
    {
      name: 'outcome digest mismatch',
      mutate: (compatibility) => { compatibility.behavioral_evidence.test_cases[0].outcome_sha256 = 'f'.repeat(64); },
      expected: 'outcome digest mismatch'
    },
    {
      name: 'cross-project proof',
      mutate: (compatibility) => { compatibility.behavioral_evidence.restore_project_ref = 'zyxwvutsrqponmlkjihg'; },
      expected: 'project correlation mismatch'
    },
    {
      name: 'cross-version proof',
      mutate: (compatibility) => { compatibility.behavioral_evidence.target_version = '0.20.0'; },
      expected: 'extension-version mismatch',
      schemaFailure: true
    },
    {
      name: 'cross-run proof',
      mutate: (compatibility) => { compatibility.behavioral_evidence.run_id = 'FP-DOS-PG-NET-RUN-SUBSTITUTED'; },
      expected: 'outcome digest mismatch'
    },
    {
      name: 'future evidence',
      mutate: (compatibility) => { compatibility.behavioral_evidence.observed_at = '2026-07-18T17:00:01Z'; },
      expected: 'freshness failed: completion time is in the future'
    },
    {
      name: 'stale evidence',
      mutate: (compatibility) => { compatibility.behavioral_evidence.observed_at = '2026-07-18T14:59:59Z'; },
      expected: 'freshness failed: backup is stale'
    },
    {
      name: 'self-correlated receipt',
      mutate: (compatibility) => {
        const evidence = compatibility.behavioral_evidence;
        evidence.independent_receipt_sha256 = evidence.authentication_result.result_sha256;
      },
      expected: 'independent receipt cannot self-correlate'
    },
    {
      name: 'cross-proof authentication replay',
      mutate: (compatibility, discordos) => {
        compatibility.behavioral_evidence.authentication_result = structuredClone(discordos.quarantine.observation.authenticated_readback_evidence.authentication_result);
      },
      expected: 'authentication result evidence identity mismatch'
    }
  ];

  for (const scenario of scenarios) {
    const documents = buildActionDocuments();
    const discordos = documents[recoveryDocumentPaths.effects].discordos;
    scenario.mutate(discordos.pg_net_compatibility, discordos);
    discordos.pg_net_compatibility.behavioral_evidence_sha256 = isObjectRecordForTest(discordos.pg_net_compatibility.behavioral_evidence)
      ? sha256Hex(discordos.pg_net_compatibility.behavioral_evidence)
      : null;
    refreshActionDigests(documents);
    let report;
    assert.doesNotThrow(() => { report = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt }); }, scenario.name);
    assert.ok(report.failures.some((failure) => failure.includes(scenario.expected)), scenario.name);
    if (scenario.schemaFailure) assert.notDeepEqual(validateSchemaInstances(documents, createValidator()), [], scenario.name);
  }
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
      expected: 'requires authenticated structured pg_net behavioral evidence'
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

test('DiscordOS zero-growth observations enforce the closed freshness and chronology policy', () => {
  const scenarios = [
    {
      name: 'stale first observation',
      mutate: (observation) => {
        observation.first_observed_at = '2026-07-18T14:59:59Z';
        observation.second_observed_at = '2026-07-18T15:02:00Z';
      },
      expected: 'first zero-growth observation freshness failed'
    },
    {
      name: 'future second observation',
      mutate: (observation) => {
        observation.first_observed_at = '2026-07-18T16:57:59Z';
        observation.second_observed_at = '2026-07-18T17:00:01Z';
      },
      expected: 'second zero-growth observation freshness failed'
    },
    {
      name: 'missing first timestamp',
      mutate: (observation) => { observation.first_observed_at = null; },
      expected: 'first_observed_at: timestamp must use exact UTC seconds'
    },
    {
      name: 'malformed second timestamp',
      mutate: (observation) => { observation.second_observed_at = 'not-a-timestamp'; },
      expected: 'second_observed_at: timestamp must use exact UTC seconds',
      schemaFailure: true
    },
    {
      name: 'missing freshness policy',
      mutate: (observation) => { delete observation.maximum_age_seconds; },
      expected: 'freshness-policy denominator changed',
      schemaFailure: true
    },
    {
      name: 'non-monotonic observations',
      mutate: (observation) => {
        observation.first_observed_at = '2026-07-18T15:54:00Z';
        observation.second_observed_at = '2026-07-18T15:53:00Z';
      },
      expected: 'observation chronology is non-monotonic'
    }
  ];

  for (const scenario of scenarios) {
    const documents = buildActionDocuments();
    scenario.mutate(documents[recoveryDocumentPaths.effects].discordos.quarantine.observation);
    refreshActionDigests(documents);
    const report = validateRecoveryDocuments(documents, { mode: 'action', now: observedAt });
    assert.ok(report.failures.some((failure) => failure.includes(scenario.expected)), scenario.name);
    if (scenario.schemaFailure) assert.notDeepEqual(validateSchemaInstances(documents, createValidator()), [], scenario.name);
  }

  const exactBoundary = buildActionDocuments();
  const observation = exactBoundary[recoveryDocumentPaths.effects].discordos.quarantine.observation;
  observation.first_observed_at = '2026-07-18T15:00:00Z';
  observation.second_observed_at = '2026-07-18T15:03:00Z';
  const readbackEvidence = observation.authenticated_readback_evidence;
  readbackEvidence.first_readback.observed_at = observation.first_observed_at;
  readbackEvidence.second_readback.observed_at = observation.second_observed_at;
  for (const readback of [readbackEvidence.first_readback, readbackEvidence.second_readback]) {
    readback.readback_sha256 = sha256Hex({
      counts: readback.counts,
      counts_sha256: readback.counts_sha256,
      observation_id: readback.observation_id,
      observed_at: readback.observed_at
    });
  }
  observation.first_evidence_sha256 = readbackEvidence.first_readback.readback_sha256;
  observation.second_evidence_sha256 = readbackEvidence.second_readback.readback_sha256;
  bindExternalEffectAuthenticationForEvidence(exactBoundary[recoveryDocumentPaths.effects], readbackEvidence, 'ZERO-GROWTH-001');
  refreshActionDigests(exactBoundary);
  assert.deepEqual(validateSchemaInstances(exactBoundary, createValidator()), []);
  assert.deepEqual(validateRecoveryDocuments(exactBoundary, { mode: 'action', now: observedAt }).failures, [operationalAuthenticatorBlocker]);
});

test('CURRENT retention covers completion rehearsal acceptance and the injected validation clock', () => {
  const equality = buildActionDocuments();
  equality[recoveryDocumentPaths.backup].retention.expires_at = '2026-07-18T16:10:00Z';
  refreshActionDigests(equality);
  assert.deepEqual(validateRecoveryDocuments(equality, { mode: 'action', now: '2026-07-18T16:10:00Z' }).failures, [operationalAuthenticatorBlocker]);

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
