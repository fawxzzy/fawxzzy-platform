import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import {
  canonicalSerialize,
  coverageUnits,
  externalEffectUnits,
  forbiddenClasses,
  independentBackupAssetsManifestDigest,
  independentBackupAttestationSubject,
  independentBackupAttestationSubjectDigest,
  independentBackupContractPath,
  independentBackupManifestDigest,
  independentBackupPublicPayloadDigest,
  independentBackupReadbackEvidenceDigest,
  independentBackupReadbackSubject,
  independentBackupReadbackSubjectDigest,
  independentBackupReceiptIdentityDigest,
  independentBackupSourceStateDigest,
  receiptRequiredFields,
  sha256Hex,
  validateIndependentBackupContract,
  validateIndependentBackupReceipt,
  validatePublicBinding
} from '../scripts/lib/independent-backup-contract.mjs';

const contract = () => JSON.parse(fs.readFileSync(independentBackupContractPath, 'utf8'));
const hash = (label) => sha256Hex(label);

function bindReceipt(receipt) {
  receipt.source_state_sha256 = independentBackupSourceStateDigest(receipt);
  receipt.manifest_sha256 = independentBackupManifestDigest(receipt);
  receipt.receipt_id = independentBackupReceiptIdentityDigest(receipt);
  receipt.github_release_attestation.release_assets_manifest_sha256 = receipt.release_assets.assets_manifest_sha256;
  receipt.github_release_attestation.manifest_sha256 = receipt.manifest_sha256;
  receipt.github_release_attestation.ciphertext_sha256 = receipt.ciphertext_sha256;
  receipt.github_release_attestation.independent_readback.observed_receipt_id = receipt.receipt_id;
  receipt.github_release_attestation.independent_readback.assets_manifest_sha256 = receipt.release_assets.assets_manifest_sha256;
  receipt.github_release_attestation.independent_readback.signer.signed_payload_sha256 = independentBackupReadbackSubjectDigest(receipt.github_release_attestation.independent_readback);
  receipt.github_release_attestation.independent_readback.evidence_sha256 = independentBackupReadbackEvidenceDigest(receipt.github_release_attestation.independent_readback);
  receipt.github_release_attestation.signer.signed_payload_sha256 = independentBackupAttestationSubjectDigest(receipt);
  return receipt;
}

function buildReceipt(overrides = {}) {
  const chunks = [
    { name: 'backup.age.part-001', bytes: 1024, sha256: hash('chunk-1') },
    { name: 'backup.age.part-002', bytes: 2048, sha256: hash('chunk-2') }
  ];
  const receipt = {
    schema_version: '2.0.0',
    status: 'BLOCKED',
    aggregate_counts: Object.fromEntries(coverageUnits.map((unit, index) => [unit, index + 1])),
    ciphertext_bytes: 3072,
    ciphertext_sha256: hash('ciphertext'),
    completed_at: '2026-07-27T00:30:00.000Z',
    cost: { maximum_usd: 0, observed_usd: 0 },
    coverage: [...coverageUnits],
    destination_version: 'recovery-vault-release-20260727-0001',
    export_id: 'export-20260727-0001',
    freshness: {
      status: 'BLOCKED',
      age_seconds: 3600,
      maximum_age_seconds: 28800,
      observed_at: '2026-07-27T01:00:00.000Z'
    },
    github_release_attestation: {
      schema_version: '1.0.0',
      status: 'BLOCKED',
      repository_reference: 'UNKNOWN',
      release_tag: 'backup-20260727T000000Z',
      immutable_release: false,
      tag_reused: false,
      release_assets_manifest_sha256: hash('pending-assets'),
      manifest_sha256: hash('pending-manifest'),
      ciphertext_sha256: hash('ciphertext'),
      observed_at: '2026-07-27T01:00:00.000Z',
      signer: {
        algorithm: 'Ed25519',
        key_id: 'UNKNOWN',
        public_key_spki_sha256: hash('unknown-public-key'),
        signed_payload_sha256: hash('blocked-subject'),
        signature_base64: 'AA=='
      },
      independent_readback: {
        schema_version: '1.0.0',
        status: 'BLOCKED',
        reader_class: 'BLOCKED',
        reader_identity: 'UNKNOWN',
        observation_method: 'BLOCKED',
        observed_at: '2026-07-27T01:00:00.000Z',
        repository_reference: 'UNKNOWN',
        release_tag: 'backup-20260727T000000Z',
        immutable_release: false,
        tag_reused: false,
        assets_manifest_sha256: hash('pending-assets'),
        observed_receipt_id: hash('pending-receipt'),
        native_receipt_sha256: hash('pending-native-readback'),
        signer: {
          algorithm: 'Ed25519',
          key_id: 'UNKNOWN',
          public_key_spki_sha256: hash('unknown-readback-public-key'),
          signed_payload_sha256: hash('blocked-readback-subject'),
          signature_base64: 'AA=='
        },
        evidence_sha256: hash('pending-readback')
      }
    },
    key_recipient_ids: ['age-recipient-fingerprint-1', 'age-recipient-fingerprint-2'],
    manifest_sha256: hash('pending-manifest'),
    migration_ledger_sha256: hash('migration-ledger'),
    monthly_selection: {
      utc_month: '2026-07',
      is_first_accepted_utc_month: false,
      retention_class: 'STANDARD_35_DAY'
    },
    postgres_version: '17.4',
    project: { name: 'Fawxzzy shared Supabase project', ref: 'bxtcuhkotumitoqtrcej' },
    receipt_id: hash('pending-receipt'),
    release_assets: {
      asset_count: chunks.length,
      assets_manifest_sha256: independentBackupAssetsManifestDigest(chunks),
      chunks
    },
    release_tag: 'backup-20260727T000000Z',
    restore_quarantine: {
      external_effect_units: [...externalEffectUnits],
      all_disabled_before_readback: true,
      application_traffic_allowed: false,
      synthetic_canaries_only: true,
      parity_units: ['auth', 'catalog', 'data', 'security'],
      failed_clone_deletion_requires_separate_authority: true
    },
    retention_until: '2026-08-31T00:30:00.000Z',
    snapshot_at: '2026-07-27T00:00:00.000Z',
    source_commit: '002c47cd4dd567748fdb98767491c530396104a2',
    source_state_sha256: hash('pending-source'),
    storage_body_state: {
      status: 'BLOCKED',
      object_count: 8,
      receipt_sha256: hash('storage-body-receipt')
    },
    tool_versions: {
      pg_dump: '17.4',
      age: '1.2.1',
      github_cli: '2.75.0'
    },
    watchdog: {
      status: 'BLOCKED',
      observed_at: '2026-07-27T01:00:00.000Z',
      evidence_sha256: hash('watchdog-evidence')
    },
    ...overrides
  };
  return bindReceipt(receipt);
}

function buildCurrentFixture() {
  const value = contract();
  const { publicKey: releasePublicKey, privateKey: releasePrivateKey } = crypto.generateKeyPairSync('ed25519');
  const { publicKey: readbackPublicKey, privateKey: readbackPrivateKey } = crypto.generateKeyPairSync('ed25519');
  const releaseSpki = releasePublicKey.export({ format: 'der', type: 'spki' });
  const readbackSpki = readbackPublicKey.export({ format: 'der', type: 'spki' });
  const repository = 'fawxzzy/fawxzzy-recovery-vault';
  value.policy.destination.repository_reference = repository;
  value.policy.destination.capability_status = 'CURRENT';
  value.receipt_contract.release_identity.repository_reference = repository;
  value.receipt_contract.github_release_attestation.trust_anchor = {
    status: 'CURRENT',
    algorithm: 'Ed25519',
    key_id: 'recovery-vault-signing-key-1',
    public_key_spki_base64: releaseSpki.toString('base64'),
    public_key_spki_sha256: sha256Hex(releaseSpki)
  };
  value.receipt_contract.github_release_attestation.independent_readback.trust_anchor = {
    status: 'CURRENT',
    algorithm: 'Ed25519',
    key_id: 'recovery-vault-readback-key-1',
    public_key_spki_base64: readbackSpki.toString('base64'),
    public_key_spki_sha256: sha256Hex(readbackSpki)
  };
  const receipt = buildReceipt({
    status: 'CURRENT',
    freshness: {
      status: 'CURRENT',
      age_seconds: 3600,
      maximum_age_seconds: 28800,
      observed_at: '2026-07-27T01:00:00.000Z'
    },
    storage_body_state: {
      status: 'CURRENT',
      object_count: 8,
      receipt_sha256: hash('storage-body-receipt')
    },
    watchdog: {
      status: 'CURRENT',
      observed_at: '2026-07-27T01:00:00.000Z',
      evidence_sha256: hash('watchdog-evidence')
    }
  });
  receipt.github_release_attestation = {
    schema_version: '1.0.0',
    status: 'VERIFIED',
    repository_reference: repository,
    release_tag: receipt.release_tag,
    immutable_release: true,
    tag_reused: false,
    release_assets_manifest_sha256: receipt.release_assets.assets_manifest_sha256,
    manifest_sha256: receipt.manifest_sha256,
    ciphertext_sha256: receipt.ciphertext_sha256,
    observed_at: '2026-07-27T01:00:00.000Z',
    signer: {
      algorithm: 'Ed25519',
      key_id: value.receipt_contract.github_release_attestation.trust_anchor.key_id,
      public_key_spki_sha256: sha256Hex(releaseSpki),
      signed_payload_sha256: hash('pending-subject'),
      signature_base64: 'AA=='
    },
    independent_readback: {
      schema_version: '1.0.0',
      status: 'VERIFIED',
      reader_class: 'INDEPENDENT_READ_ONLY',
      reader_identity: value.receipt_contract.github_release_attestation.independent_readback.trust_anchor.key_id,
      observation_method: 'SIGNED_NATIVE_GITHUB_READBACK',
      observed_at: '2026-07-27T01:00:00.000Z',
      repository_reference: repository,
      release_tag: receipt.release_tag,
      immutable_release: true,
      tag_reused: false,
      assets_manifest_sha256: receipt.release_assets.assets_manifest_sha256,
      observed_receipt_id: receipt.receipt_id,
      native_receipt_sha256: hash('github-native-readback-receipt'),
      signer: {
        algorithm: 'Ed25519',
        key_id: value.receipt_contract.github_release_attestation.independent_readback.trust_anchor.key_id,
        public_key_spki_sha256: sha256Hex(readbackSpki),
        signed_payload_sha256: hash('pending-readback-subject'),
        signature_base64: 'AA=='
      },
      evidence_sha256: hash('pending-readback')
    }
  };
  receipt.github_release_attestation.independent_readback.signer.signed_payload_sha256 = independentBackupReadbackSubjectDigest(receipt.github_release_attestation.independent_readback);
  receipt.github_release_attestation.independent_readback.signer.signature_base64 = crypto.sign(
    null,
    Buffer.from(canonicalSerialize(independentBackupReadbackSubject(receipt.github_release_attestation.independent_readback))),
    readbackPrivateKey
  ).toString('base64');
  receipt.github_release_attestation.independent_readback.evidence_sha256 = independentBackupReadbackEvidenceDigest(receipt.github_release_attestation.independent_readback);
  receipt.github_release_attestation.signer.signed_payload_sha256 = independentBackupAttestationSubjectDigest(receipt);
  receipt.github_release_attestation.signer.signature_base64 = crypto.sign(
    null,
    Buffer.from(canonicalSerialize(independentBackupAttestationSubject(receipt))),
    releasePrivateKey
  ).toString('base64');
  return { value, receipt, releasePrivateKey, readbackPrivateKey, releaseSpki, readbackSpki };
}

function signReadback(receipt, privateKey) {
  const readback = receipt.github_release_attestation.independent_readback;
  readback.signer.signed_payload_sha256 = independentBackupReadbackSubjectDigest(readback);
  readback.signer.signature_base64 = crypto.sign(
    null,
    Buffer.from(canonicalSerialize(independentBackupReadbackSubject(readback))),
    privateKey
  ).toString('base64');
  readback.evidence_sha256 = independentBackupReadbackEvidenceDigest(readback);
}

function signReleaseAttestation(receipt, privateKey) {
  const signer = receipt.github_release_attestation.signer;
  signer.signed_payload_sha256 = independentBackupAttestationSubjectDigest(receipt);
  signer.signature_base64 = crypto.sign(
    null,
    Buffer.from(canonicalSerialize(independentBackupAttestationSubject(receipt))),
    privateKey
  ).toString('base64');
}

function assertRejected(mutator, expectedFragment) {
  const receipt = buildReceipt();
  mutator(receipt);
  const result = validateIndependentBackupReceipt(contract(), receipt);
  assert.equal(result.ok, false);
  if (expectedFragment) assert.ok(result.failures.some((failure) => failure.includes(expectedFragment)), result.failures.join('\n'));
}

test('source contract is canonical, closed, and valid', () => {
  const value = contract();
  assert.deepEqual(validateIndependentBackupContract(value), { ok: true, failures: [] });
  assert.deepEqual(value.coverage_units, coverageUnits);
  assert.deepEqual(value.receipt_contract.required_fields, receiptRequiredFields);
  assert.deepEqual(value.receipt_contract.forbidden_classes, forbiddenClasses);
  assert.deepEqual(value.restore_quarantine.external_effect_units, externalEffectUnits);
  assert.equal(value.apply_admitted, false);
});

test('canonical serialization is deterministic and LF terminated', () => {
  const serialized = canonicalSerialize(contract());
  assert.equal(serialized.endsWith('\n'), true);
  assert.equal(serialized.includes('\r'), false);
  assert.equal(serialized, canonicalSerialize(structuredClone(contract())));
});

test('F005 freezes FP-MAN-015, FP-MAN-051, and FP-MAN-052 authority scope', () => {
  for (const mutate of [
    (value) => { delete value.governance.decision_history[0].authority; },
    (value) => { value.governance.decision_history[0].authority = 'PROVIDER_EXECUTION'; },
    (value) => { delete value.governance.decision_history[1].superseded_reason; },
    (value) => { value.governance.decision_history[1].superseded_reason = 'ACCOUNT_REQUIRED'; },
    (value) => { delete value.governance.decision_history[1].provider_authority; },
    (value) => { value.governance.decision_history[1].provider_authority = 'CURRENT'; },
    (value) => { delete value.governance.decision_history[2].authority; },
    (value) => { value.governance.decision_history[2].provider_scope = 'BACKUP_EXPORT'; },
    (value) => { value.governance.decision_history[2].backup_authority = 'CURRENT'; }
  ]) {
    const value = contract();
    mutate(value);
    assert.equal(validateIndependentBackupContract(value).ok, false);
  }
});

test('F004 freezes all safety denominators as exact ordered sets', () => {
  for (const mutate of [
    (value) => { value.coverage_units[0] = 'substituted'; },
    (value) => { value.receipt_contract.required_fields[0] = 'substituted'; },
    (value) => { value.receipt_contract.required_fields.reverse(); },
    (value) => { value.receipt_contract.forbidden_classes[0] = 'substituted'; },
    (value) => { value.restore_quarantine.external_effect_units[0] = 'substituted'; }
  ]) {
    const value = contract();
    mutate(value);
    assert.equal(validateIndependentBackupContract(value).ok, false);
  }
});

test('Phase 1 provider capability is current while cryptographic and backup gates remain blocked', () => {
  const value = contract();
  assert.equal(value.policy.destination.capability_status, 'CURRENT');
  assert.equal(value.policy.destination.provisioning_status, 'CURRENT');
  assert.equal(value.policy.destination.repository_reference, 'fawxzzy/fawxzzy-recovery-vault');
  assert.equal(value.provider_capability_evidence.repository.visibility, 'PRIVATE');
  assert.equal(value.provider_capability_evidence.repository.empty, true);
  assert.equal(value.provider_capability_evidence.repository.immutable_releases_enabled, true);
  assert.equal(value.receipt_contract.github_release_attestation.trust_anchor.status, 'BLOCKED');
  assert.equal(value.receipt_contract.github_release_attestation.independent_readback.trust_anchor.status, 'BLOCKED');
  assert.deepEqual(
    Object.fromEntries(Object.entries(value.execution_gates).filter(([, status]) => status === 'CURRENT').map(([gate]) => [gate, 'CURRENT'])),
    {
      provider_setup: 'CURRENT',
      github_recovery_vault_provisioning: 'CURRENT',
      immutable_release_enablement: 'CURRENT'
    }
  );
  assert.ok(Object.entries(value.execution_gates)
    .filter(([gate]) => !['provider_setup', 'github_recovery_vault_provisioning', 'immutable_release_enablement'].includes(gate))
    .every(([, status]) => status === 'BLOCKED'));
});

test('FP-MAN-052 capability evidence is closed, content-addressed, empty, private, immutable, and zero-cost', () => {
  for (const mutate of [
    (value) => { value.provider_capability_evidence.operator_authority.payload_sha256 = hash('different-operator-authority'); },
    (value) => { value.provider_capability_evidence.provider_authority.event_id = `onv1_${hash('different-provider-authority')}`; },
    (value) => { value.provider_capability_evidence.terminal_result.payload_sha256 = hash('different-terminal-result'); },
    (value) => { value.provider_capability_evidence.repository.reference = 'fawxzzy:other-vault'; },
    (value) => { value.provider_capability_evidence.repository.visibility = 'PUBLIC'; },
    (value) => { value.provider_capability_evidence.repository.empty = false; },
    (value) => { value.provider_capability_evidence.repository.immutable_releases_enabled = false; },
    (value) => { value.provider_capability_evidence.sanitized_counts.releases = 1; },
    (value) => { value.provider_capability_evidence.cost.actual_incremental_usd = 1; },
    (value) => { value.provider_capability_evidence.unreviewed = true; }
  ]) {
    const value = contract();
    mutate(value);
    assert.equal(validateIndependentBackupContract(value).ok, false);
  }
});

test('F001 closed receipt accepts the complete blocked evidence shape', () => {
  assert.deepEqual(validateIndependentBackupReceipt(contract(), buildReceipt()), { ok: true, failures: [] });
});

test('F001 rejects missing, extra, oversized, incomplete, stale, unsafe, and nonzero-cost evidence', () => {
  assertRejected((receipt) => { delete receipt.watchdog; }, 'required property');
  assertRejected((receipt) => { receipt.unreviewed = true; }, 'additional properties');
  assertRejected((receipt) => { receipt.release_assets.chunks[0].bytes = 1900000001; }, 'must be <= 1900000000');
  assertRejected((receipt) => { receipt.coverage = receipt.coverage.slice(1); }, 'coverage');
  assertRejected((receipt) => { receipt.retention_until = '2026-07-28T00:30:00.000Z'; }, 'retention window');
  assertRejected((receipt) => { receipt.restore_quarantine.application_traffic_allowed = true; }, 'must be equal to constant');
  assertRejected((receipt) => { receipt.cost.maximum_usd = 1; }, 'must be equal to constant');
  assertRejected((receipt) => { receipt.release_assets.asset_count = 1001; }, 'must be <= 1000');
});

test('F001 exact field denominator rejects omitted and caller-invented evidence', () => {
  assertRejected((receipt) => { delete receipt.source_commit; }, 'required property');
  assertRejected((receipt) => { receipt.provider_assertion = 'CURRENT'; }, 'additional properties');
});

test('F001 CURRENT evidence enforces freshness, watchdog, storage, retention, and quarantine', () => {
  const { value, receipt } = buildCurrentFixture();
  assert.deepEqual(validateIndependentBackupReceipt(value, receipt), { ok: true, failures: [] });
  for (const mutate of [
    (copy) => { copy.freshness.age_seconds = 28801; },
    (copy) => { copy.watchdog.status = 'BLOCKED'; },
    (copy) => { copy.storage_body_state.status = 'BLOCKED'; },
    (copy) => { copy.restore_quarantine.application_traffic_allowed = true; },
    (copy) => { copy.monthly_selection.utc_month = '2026-06'; },
    (copy) => { copy.monthly_selection.retention_class = 'FIRST_MONTHLY_400_DAY'; }
  ]) {
    const candidate = structuredClone(receipt);
    mutate(candidate);
    assert.equal(validateIndependentBackupReceipt(value, candidate).ok, false);
  }
});

test('RR-F001 BLOCKED receipt rejects contradictory CURRENT and VERIFIED subevidence', () => {
  const mutations = [
    (receipt) => { receipt.freshness.status = 'CURRENT'; },
    (receipt) => { receipt.watchdog.status = 'CURRENT'; },
    (receipt) => { receipt.storage_body_state.status = 'CURRENT'; },
    (receipt) => { receipt.github_release_attestation.status = 'VERIFIED'; },
    (receipt) => { receipt.github_release_attestation.immutable_release = true; },
    (receipt) => { receipt.github_release_attestation.tag_reused = true; },
    (receipt) => {
      receipt.github_release_attestation.independent_readback.status = 'VERIFIED';
      receipt.github_release_attestation.independent_readback.reader_class = 'INDEPENDENT_READ_ONLY';
      receipt.github_release_attestation.independent_readback.reader_identity = 'fabricated-reader';
      receipt.github_release_attestation.independent_readback.observation_method = 'SIGNED_NATIVE_GITHUB_READBACK';
      receipt.github_release_attestation.independent_readback.immutable_release = true;
    }
  ];
  for (const mutate of mutations) {
    const receipt = buildReceipt();
    mutate(receipt);
    bindReceipt(receipt);
    assert.equal(validateIndependentBackupReceipt(contract(), receipt).ok, false);
  }
});

test('F002 verifies a content-bound Ed25519 release attestation and independent readback', () => {
  const { value, receipt } = buildCurrentFixture();
  assert.equal(validateIndependentBackupReceipt(value, receipt).ok, true);
  assert.equal(receipt.github_release_attestation.signer.signed_payload_sha256, independentBackupAttestationSubjectDigest(receipt));
  assert.equal(receipt.github_release_attestation.independent_readback.signer.signed_payload_sha256, independentBackupReadbackSubjectDigest(receipt.github_release_attestation.independent_readback));
});

test('F002 rejects relabeled repository, tag, assets, receipt, trust anchor, stale readback, and forged signature', () => {
  const cases = [
    (receipt) => { receipt.github_release_attestation.repository_reference = 'fawxzzy:other-vault'; },
    (receipt) => { receipt.github_release_attestation.release_tag = 'backup-relabel'; },
    (receipt) => { receipt.github_release_attestation.release_assets_manifest_sha256 = hash('other-assets'); },
    (receipt) => { receipt.github_release_attestation.independent_readback.observed_receipt_id = hash('other-receipt'); },
    (receipt) => { receipt.github_release_attestation.independent_readback.observed_at = '2026-07-26T00:00:00.000Z'; },
    (receipt) => { receipt.github_release_attestation.signer.signature_base64 = 'AA=='; }
  ];
  for (const mutate of cases) {
    const { value, receipt } = buildCurrentFixture();
    mutate(receipt);
    assert.equal(validateIndependentBackupReceipt(value, receipt).ok, false);
  }
  const { value, receipt } = buildCurrentFixture();
  value.receipt_contract.github_release_attestation.trust_anchor.key_id = 'different-key';
  assert.equal(validateIndependentBackupReceipt(value, receipt).ok, false);
});

test('RR-F003 tag reuse cannot be flipped after signing', () => {
  const { value, receipt, releasePrivateKey } = buildCurrentFixture();
  receipt.github_release_attestation.tag_reused = true;
  signReleaseAttestation(receipt, releasePrivateKey);
  assert.equal(validateIndependentBackupReceipt(value, receipt).ok, false);

  receipt.github_release_attestation.tag_reused = false;
  const result = validateIndependentBackupReceipt(value, receipt);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes('signed-payload digest mismatch') || failure.includes('signature verification failed')));
});

test('RR-F004 publisher cannot fabricate its own independent readback', () => {
  const { value, receipt, releasePrivateKey, releaseSpki } = buildCurrentFixture();
  const readback = receipt.github_release_attestation.independent_readback;
  readback.reader_identity = receipt.github_release_attestation.signer.key_id;
  readback.signer.key_id = receipt.github_release_attestation.signer.key_id;
  readback.signer.public_key_spki_sha256 = sha256Hex(releaseSpki);
  signReadback(receipt, releasePrivateKey);
  signReleaseAttestation(receipt, releasePrivateKey);

  const result = validateIndependentBackupReceipt(value, receipt);
  assert.equal(result.ok, false);
  assert.ok(result.failures.includes('independent readback actor separation failed'));
});

test('F003 binds receipt_id to the complete acyclic receipt preimage', () => {
  const receipt = buildReceipt();
  assert.equal(receipt.receipt_id, independentBackupReceiptIdentityDigest(receipt));
  receipt.destination_version = 'relabelled-release';
  assert.ok(validateIndependentBackupReceipt(contract(), receipt).failures.includes('backup receipt identity digest mismatch'));
});

test('F003 binds public event identity exactly to recomputed payload bytes', () => {
  const receipt = buildReceipt();
  const payloadSha256 = independentBackupPublicPayloadDigest(receipt);
  assert.deepEqual(validatePublicBinding({ eventId: `onv1_${payloadSha256}`, payloadSha256, receipt }), { ok: true, failures: [] });
  assert.equal(validatePublicBinding({ eventId: `onv1_${'a'.repeat(64)}`, payloadSha256: 'b'.repeat(64), receipt }).ok, false);
  assert.equal(validatePublicBinding({ eventId: `onv1_${payloadSha256}`, payloadSha256, receipt: { ...receipt, release_tag: 'replay' } }).ok, false);
});

test('release limits, retention, encryption, and zero-dollar boundaries remain frozen', () => {
  for (const mutate of [
    (value) => { value.policy.release.chunk_max_bytes = 1900000001; },
    (value) => { value.policy.release.asset_max_count = 1001; },
    (value) => { value.policy.retention.standard_days = 34; },
    (value) => { value.policy.retention.first_accepted_monthly_days = 399; },
    (value) => { value.policy.encryption.persistent_plaintext_allowed = true; },
    (value) => { value.policy.encryption.minimum_age_recipient_count = 1; },
    (value) => { value.policy.cost.maximum_usd = 1; }
  ]) {
    const value = contract();
    mutate(value);
    assert.equal(validateIndependentBackupContract(value).ok, false);
  }
});

test('Backblaze, Cloudflare, mutable releases, backup execution, and Phase 1 rollback remain rejected', () => {
  for (const mutate of [
    (value) => { value.policy.destination.provider = 'Backblaze B2'; },
    (value) => { value.policy.destination.repository_reference = 'cloudflare-dns'; },
    (value) => { value.policy.release.lifecycle = 'MUTABLE'; },
    (value) => { value.policy.release.tag_reuse = 'ALLOWED'; },
    (value) => { value.execution_gates.provider_setup = 'BLOCKED'; },
    (value) => { value.execution_gates.backup_generation_or_upload = 'CURRENT'; },
    (value) => { value.execution_gates.backup_export = 'CURRENT'; }
  ]) {
    const value = contract();
    mutate(value);
    assert.equal(validateIndependentBackupContract(value).ok, false);
  }
});

test('malformed receipts and bindings fail closed without throwing', () => {
  for (const value of [null, [], 'receipt', 7, {}]) {
    assert.doesNotThrow(() => validateIndependentBackupReceipt(contract(), value));
    assert.equal(validateIndependentBackupReceipt(contract(), value).ok, false);
  }
  assert.equal(validatePublicBinding().ok, false);
});

test('RR-F002 nested schema-invalid receipt values fail closed without throwing', () => {
  const mutations = [
    (receipt) => { receipt.release_assets.chunks = 'not-an-array'; },
    (receipt) => { receipt.release_assets.chunks = null; },
    (receipt) => { receipt.release_assets.chunks = {}; },
    (receipt) => { receipt.github_release_attestation.independent_readback = []; },
    (receipt) => { receipt.restore_quarantine = 'not-an-object'; },
    (receipt) => { receipt.key_recipient_ids = {}; }
  ];
  for (const mutate of mutations) {
    const receipt = buildReceipt();
    mutate(receipt);
    assert.doesNotThrow(() => validateIndependentBackupReceipt(contract(), receipt));
    assert.equal(validateIndependentBackupReceipt(contract(), receipt).ok, false);
  }
});
