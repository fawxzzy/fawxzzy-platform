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
  independentBackupMonthlyLedgerEvidenceDigest,
  independentBackupMonthlyLedgerInventoryDigest,
  independentBackupMonthlyLedgerPaginationDigest,
  independentBackupMonthlyLedgerSubject,
  independentBackupMonthlyLedgerSubjectDigest,
  independentBackupPublicPayloadDigest,
  independentBackupReadbackEvidenceDigest,
  independentBackupReadbackSubject,
  independentBackupReadbackSubjectDigest,
  independentBackupReceiptIdentityDigest,
  independentBackupSourceStateDigest,
  monthlySelectionRule,
  receiptRequiredFields,
  sha256Hex,
  validateIndependentBackupContract,
  validateIndependentBackupReceipt,
  validatePublicBinding
} from '../scripts/lib/independent-backup-contract.mjs';

const contract = () => JSON.parse(fs.readFileSync(independentBackupContractPath, 'utf8'));
const microRecoveryContract = () => JSON.parse(
  fs.readFileSync('contracts/v1/recovery/micro-recovery-contract.json', 'utf8')
);
const hash = (label) => sha256Hex(label);

function bindReceipt(receipt) {
  const ledger = receipt.monthly_selection.ledger;
  ledger.pagination.snapshot_sha256 = independentBackupMonthlyLedgerPaginationDigest(ledger);
  ledger.inventory_sha256 = independentBackupMonthlyLedgerInventoryDigest(ledger);
  ledger.signer.signed_payload_sha256 = independentBackupMonthlyLedgerSubjectDigest(ledger);
  ledger.evidence_sha256 = independentBackupMonthlyLedgerEvidenceDigest(ledger);
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
    schema_version: '2.1.0',
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
      candidate_release_tag: 'backup-20260727T000000Z',
      selected_release_tag: 'UNKNOWN',
      retention_class: 'STANDARD_35_DAY',
      selection_rule: monthlySelectionRule,
      ledger: {
        schema_version: '1.1.0',
        status: 'BLOCKED',
        repository_reference: 'UNKNOWN',
        utc_month: '2026-07',
        inventory_source: 'BLOCKED',
        provider_api: 'GITHUB_REST_LIST_RELEASES',
        provider_api_version: '2022-11-28',
        provider_api_path: '/repos/{owner}/{repo}/releases',
        acceptance_definition: 'GITHUB_RELEASE_PUBLISHED_AT',
        acceptance_timestamp_field: 'published_at',
        inclusion_predicate: 'draft_false_prerelease_false_immutable_true_published_at_in_utc_month',
        stable_identity_fields: ['id', 'tag_name'],
        complete: false,
        concurrency_state: 'BLOCKED',
        observed_at: '2026-07-27T01:00:00.000Z',
        pagination: {
          per_page: 100,
          page_count: 0,
          terminal_page_item_count: 0,
          total_native_release_count: 0,
          page_exhausted: false,
          page_digests_sha256: [],
          first_page_etag_before_sha256: hash('blocked-etag'),
          first_page_etag_after_sha256: hash('blocked-etag'),
          snapshot_sha256: hash('pending-pagination')
        },
        accepted_release_count: 0,
        accepted_releases: [],
        inventory_sha256: hash('pending-monthly-inventory'),
        signer: {
          algorithm: 'Ed25519',
          key_id: 'UNKNOWN',
          public_key_spki_sha256: hash('unknown-readback-public-key'),
          signed_payload_sha256: hash('blocked-monthly-ledger-subject'),
          signature_base64: 'AA=='
        },
        evidence_sha256: hash('pending-monthly-ledger')
      }
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
    retention_until: '2027-09-01T00:30:00.000Z',
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
  receipt.monthly_selection = {
    utc_month: '2026-07',
    candidate_release_tag: receipt.release_tag,
    selected_release_tag: receipt.release_tag,
    retention_class: 'FIRST_MONTHLY_400_DAY',
    selection_rule: monthlySelectionRule,
    ledger: {
      schema_version: '1.1.0',
      status: 'VERIFIED',
      repository_reference: repository,
      utc_month: '2026-07',
      inventory_source: 'COMPLETE_PROVIDER_NATIVE_ACCEPTED_RELEASE_INVENTORY',
      provider_api: 'GITHUB_REST_LIST_RELEASES',
      provider_api_version: '2022-11-28',
      provider_api_path: '/repos/{owner}/{repo}/releases',
      acceptance_definition: 'GITHUB_RELEASE_PUBLISHED_AT',
      acceptance_timestamp_field: 'published_at',
      inclusion_predicate: 'draft_false_prerelease_false_immutable_true_published_at_in_utc_month',
      stable_identity_fields: ['id', 'tag_name'],
      complete: true,
      concurrency_state: 'CONSISTENT_SINGLE_HEAD',
      observed_at: '2026-07-27T01:00:00.000Z',
      pagination: {
        per_page: 100,
        page_count: 1,
        terminal_page_item_count: 1,
        total_native_release_count: 1,
        page_exhausted: true,
        page_digests_sha256: [hash('native-release-page-1')],
        first_page_etag_before_sha256: hash('native-release-etag'),
        first_page_etag_after_sha256: hash('native-release-etag'),
        snapshot_sha256: hash('pending-pagination')
      },
      accepted_release_count: 1,
      accepted_releases: [
        {
          id: 270001,
          tag_name: receipt.release_tag,
          draft: false,
          prerelease: false,
          immutable: true,
          created_at: '2026-07-27T00:30:30.000Z',
          published_at: '2026-07-27T00:31:00.000Z'
        }
      ],
      inventory_sha256: hash('pending-monthly-inventory'),
      signer: {
        algorithm: 'Ed25519',
        key_id: value.receipt_contract.github_release_attestation.independent_readback.trust_anchor.key_id,
        public_key_spki_sha256: sha256Hex(readbackSpki),
        signed_payload_sha256: hash('pending-monthly-ledger-subject'),
        signature_base64: 'AA=='
      },
      evidence_sha256: hash('pending-monthly-ledger')
    }
  };
  signMonthlyLedger(receipt, readbackPrivateKey);
  bindReceipt(receipt);
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

function signMonthlyLedger(receipt, privateKey) {
  const ledger = receipt.monthly_selection.ledger;
  ledger.pagination.snapshot_sha256 = independentBackupMonthlyLedgerPaginationDigest(ledger);
  ledger.inventory_sha256 = independentBackupMonthlyLedgerInventoryDigest(ledger);
  ledger.signer.signed_payload_sha256 = independentBackupMonthlyLedgerSubjectDigest(ledger);
  ledger.signer.signature_base64 = crypto.sign(
    null,
    Buffer.from(canonicalSerialize(independentBackupMonthlyLedgerSubject(ledger))),
    privateKey
  ).toString('base64');
  ledger.evidence_sha256 = independentBackupMonthlyLedgerEvidenceDigest(ledger);
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

function resignCurrentFixture(fixture) {
  signMonthlyLedger(fixture.receipt, fixture.readbackPrivateKey);
  bindReceipt(fixture.receipt);
  signReadback(fixture.receipt, fixture.readbackPrivateKey);
  signReleaseAttestation(fixture.receipt, fixture.releasePrivateKey);
}

function buildLaterAcceptedFixture() {
  const fixture = buildCurrentFixture();
  const { receipt } = fixture;
  receipt.monthly_selection.selected_release_tag = 'backup-20260701T000000Z';
  receipt.monthly_selection.retention_class = 'STANDARD_35_DAY';
  receipt.monthly_selection.ledger.accepted_release_count = 2;
  receipt.monthly_selection.ledger.accepted_releases = [
    {
      id: 270000,
      tag_name: 'backup-20260701T000000Z',
      draft: false,
      prerelease: false,
      immutable: true,
      created_at: '2026-07-01T00:30:30.000Z',
      published_at: '2026-07-01T00:31:00.000Z'
    },
    {
      id: 270001,
      tag_name: receipt.release_tag,
      draft: false,
      prerelease: false,
      immutable: true,
      created_at: '2026-07-27T00:30:30.000Z',
      published_at: '2026-07-27T00:31:00.000Z'
    }
  ];
  receipt.monthly_selection.ledger.pagination.terminal_page_item_count = 2;
  receipt.monthly_selection.ledger.pagination.total_native_release_count = 2;
  receipt.retention_until = '2026-08-31T00:31:00.000Z';
  resignCurrentFixture(fixture);
  return fixture;
}

function assertCurrentFixtureRejected(mutator, expectedFragment, { later = false } = {}) {
  const fixture = later ? buildLaterAcceptedFixture() : buildCurrentFixture();
  mutator(fixture.receipt);
  resignCurrentFixture(fixture);
  const result = validateIndependentBackupReceipt(fixture.value, fixture.receipt);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes(expectedFragment)), result.failures.join('\n'));
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

test('provider backups remain database-only and cannot substitute for the independent archive', () => {
  const source = microRecoveryContract();
  const value = contract();
  assert.deepEqual(source.posture.daily_physical_backups, {
    status: 'CURRENT',
    frequency: 'daily',
    retention_days: 7,
    database_only: true,
    storage_object_bodies_included: false
  });
  assert.deepEqual(source.posture.independent_encrypted_export, {
    status: 'REQUIRED',
    required_before: 'shared_auth_or_data_load',
    execution_status: 'BLOCKED'
  });
  assert.equal(value.policy.export.default_supabase_db_dump_only, 'REJECT_AS_INCOMPLETE');
  assert.ok(value.coverage_units.includes('storage_object_bodies'));
  assert.equal(value.storage_body_boundary.separate_recovery_contract_required_when_nonempty, true);
  assert.equal(value.execution_gates.restore_rehearsal, 'BLOCKED');
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
    (copy) => { copy.monthly_selection.retention_class = 'STANDARD_35_DAY'; }
  ]) {
    const candidate = structuredClone(receipt);
    mutate(candidate);
    assert.equal(validateIndependentBackupReceipt(value, candidate).ok, false);
  }
});

test('monthly ledger selects one first accepted release for 400 days and later releases for 35 days', () => {
  const first = buildCurrentFixture();
  assert.equal(first.receipt.monthly_selection.retention_class, 'FIRST_MONTHLY_400_DAY');
  assert.equal(first.receipt.monthly_selection.selected_release_tag, first.receipt.release_tag);
  assert.deepEqual(validateIndependentBackupReceipt(first.value, first.receipt), { ok: true, failures: [] });

  const later = buildLaterAcceptedFixture();
  assert.equal(later.receipt.monthly_selection.retention_class, 'STANDARD_35_DAY');
  assert.notEqual(later.receipt.monthly_selection.selected_release_tag, later.receipt.release_tag);
  assert.deepEqual(validateIndependentBackupReceipt(later.value, later.receipt), { ok: true, failures: [] });

  const tied = buildCurrentFixture();
  tied.receipt.monthly_selection.selected_release_tag = 'backup-20260727T000000A';
  tied.receipt.monthly_selection.retention_class = 'STANDARD_35_DAY';
  tied.receipt.monthly_selection.ledger.accepted_release_count = 2;
  tied.receipt.monthly_selection.ledger.accepted_releases = [
    {
      id: 270000,
      tag_name: 'backup-20260727T000000A',
      draft: false,
      prerelease: false,
      immutable: true,
      created_at: '2026-07-27T00:30:29.000Z',
      published_at: '2026-07-27T00:31:00.000Z'
    },
    {
      id: 270001,
      tag_name: tied.receipt.release_tag,
      draft: false,
      prerelease: false,
      immutable: true,
      created_at: '2026-07-27T00:30:30.000Z',
      published_at: '2026-07-27T00:31:00.000Z'
    }
  ];
  tied.receipt.monthly_selection.ledger.pagination.terminal_page_item_count = 2;
  tied.receipt.monthly_selection.ledger.pagination.total_native_release_count = 2;
  tied.receipt.retention_until = '2026-08-31T00:31:00.000Z';
  resignCurrentFixture(tied);
  assert.deepEqual(validateIndependentBackupReceipt(tied.value, tied.receipt), { ok: true, failures: [] });
});

test('monthly selection month and retention deadline derive from candidate GitHub published_at', () => {
  const crossMonth = buildCurrentFixture();
  crossMonth.receipt.snapshot_at = '2026-07-31T23:58:00.000Z';
  crossMonth.receipt.completed_at = '2026-07-31T23:59:00.000Z';
  crossMonth.receipt.freshness.observed_at = '2026-08-01T00:02:00.000Z';
  crossMonth.receipt.freshness.age_seconds = 240;
  crossMonth.receipt.github_release_attestation.observed_at = '2026-08-01T00:02:00.000Z';
  crossMonth.receipt.github_release_attestation.independent_readback.observed_at = '2026-08-01T00:02:00.000Z';
  crossMonth.receipt.monthly_selection.utc_month = '2026-08';
  crossMonth.receipt.monthly_selection.ledger.utc_month = '2026-08';
  crossMonth.receipt.monthly_selection.ledger.observed_at = '2026-08-01T00:02:00.000Z';
  crossMonth.receipt.monthly_selection.ledger.accepted_releases[0].created_at = '2026-07-31T23:59:30.000Z';
  crossMonth.receipt.monthly_selection.ledger.accepted_releases[0].published_at = '2026-08-01T00:01:00.000Z';
  crossMonth.receipt.retention_until = new Date(
    Date.parse('2026-08-01T00:01:00.000Z') + 400 * 86400000
  ).toISOString();
  resignCurrentFixture(crossMonth);
  assert.deepEqual(validateIndependentBackupReceipt(crossMonth.value, crossMonth.receipt), { ok: true, failures: [] });

  const oneMillisecondShort = structuredClone(crossMonth.receipt);
  oneMillisecondShort.retention_until = new Date(Date.parse(crossMonth.receipt.retention_until) - 1).toISOString();
  bindReceipt(oneMillisecondShort);
  assert.ok(
    validateIndependentBackupReceipt(crossMonth.value, oneMillisecondShort).failures
      .some((failure) => failure.includes('candidate GitHub published_at'))
  );
});

test('candidate GitHub publication follows backup completion and precedes attestation readback', () => {
  assertCurrentFixtureRejected(
    (receipt) => {
      receipt.monthly_selection.ledger.accepted_releases[0].created_at = '2026-07-27T00:28:00.000Z';
      receipt.monthly_selection.ledger.accepted_releases[0].published_at = '2026-07-27T00:29:59.999Z';
    },
    'must not precede backup completion'
  );
  assertCurrentFixtureRejected(
    (receipt) => {
      receipt.monthly_selection.ledger.accepted_releases[0].published_at = '2026-07-27T01:00:00.001Z';
      receipt.retention_until = '2027-09-01T01:00:00.001Z';
    },
    'must not follow attestation or readback observation'
  );
});

test('native GitHub release created_at does not follow published_at', () => {
  assertCurrentFixtureRejected(
    (receipt) => {
      receipt.monthly_selection.ledger.accepted_releases[0].created_at = '2026-07-27T00:59:00.000Z';
    },
    'ineligible or cross-month native release'
  );
});

test('monthly ledger rejects incomplete, ambiguous, duplicate, missing, reordered, cross-month, and relabeled inventories', () => {
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.ledger.complete = false; },
    'complete verified monthly ledger'
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.ledger.concurrency_state = 'AMBIGUOUS_OR_FORKED'; },
    'ambiguous or forked'
  );
  assertCurrentFixtureRejected(
    (receipt) => {
      receipt.monthly_selection.ledger.accepted_releases.push({
        id: 270002,
        tag_name: receipt.release_tag,
        draft: false,
        prerelease: false,
        immutable: true,
        created_at: '2026-07-27T00:31:30.000Z',
        published_at: '2026-07-27T00:32:00.000Z'
      });
      receipt.monthly_selection.ledger.accepted_release_count = 2;
      receipt.monthly_selection.ledger.pagination.terminal_page_item_count = 2;
      receipt.monthly_selection.ledger.pagination.total_native_release_count = 2;
    },
    'stable release identities'
  );
  assertCurrentFixtureRejected(
    (receipt) => {
      receipt.monthly_selection.ledger.accepted_releases[0].tag_name = 'backup-20260701T000000Z';
      receipt.monthly_selection.selected_release_tag = 'backup-20260701T000000Z';
    },
    'candidate must appear exactly once'
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.ledger.accepted_releases.reverse(); },
    'deterministically ordered',
    { later: true }
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.ledger.accepted_releases[0].published_at = '2026-06-30T23:59:00.000Z'; },
    'ineligible or cross-month'
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.candidate_release_tag = 'backup-relabelled'; },
    'candidate release tag mismatch'
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.selected_release_tag = 'backup-not-in-ledger'; },
    'unique deterministic earliest'
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.selection_rule = 'CALLER_SELECTED'; },
    'must be equal to constant'
  );
});

test('monthly ledger closes native GitHub release identity, eligibility, pagination, and concurrency evidence', () => {
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.ledger.accepted_releases[0].draft = true; },
    'must be equal to constant'
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.ledger.accepted_releases[0].prerelease = true; },
    'must be equal to constant'
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.ledger.accepted_releases[0].immutable = false; },
    'must be equal to constant'
  );
  assertCurrentFixtureRejected(
    (receipt) => {
      receipt.monthly_selection.ledger.accepted_releases[1].id =
        receipt.monthly_selection.ledger.accepted_releases[0].id;
    },
    'stable release identities',
    { later: true }
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.ledger.pagination.page_exhausted = false; },
    'pagination is incomplete'
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.ledger.pagination.page_digests_sha256 = []; },
    'pagination is incomplete'
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.ledger.pagination.total_native_release_count = 2; },
    'native pagination count mismatch'
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.ledger.pagination.first_page_etag_after_sha256 = hash('changed-etag'); },
    'changed during enumeration'
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.ledger.provider_api_version = 'latest'; },
    'must be equal to constant'
  );

  const paginationDigestDrift = buildCurrentFixture();
  paginationDigestDrift.receipt.monthly_selection.ledger.pagination.snapshot_sha256 = hash('forged-pagination');
  assert.ok(
    validateIndependentBackupReceipt(paginationDigestDrift.value, paginationDigestDrift.receipt).failures
      .includes('monthly ledger pagination snapshot digest mismatch')
  );
});

test('monthly ledger rejects wrong class, short deadline, stale evidence, forged signatures and digest drift', () => {
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.retention_class = 'STANDARD_35_DAY'; },
    'retention class mismatch'
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.retention_until = '2026-08-31T00:30:00.000Z'; },
    'retention window'
  );
  assertCurrentFixtureRejected(
    (receipt) => { receipt.monthly_selection.ledger.observed_at = '2026-07-26T00:00:00.000Z'; },
    'monthly ledger is stale'
  );

  const forged = buildCurrentFixture();
  forged.receipt.monthly_selection.ledger.signer.signature_base64 = 'AA==';
  forged.receipt.monthly_selection.ledger.evidence_sha256 = independentBackupMonthlyLedgerEvidenceDigest(forged.receipt.monthly_selection.ledger);
  bindReceipt(forged.receipt);
  signReadback(forged.receipt, forged.readbackPrivateKey);
  signReleaseAttestation(forged.receipt, forged.releasePrivateKey);
  assert.ok(validateIndependentBackupReceipt(forged.value, forged.receipt).failures.includes('monthly ledger signature verification failed'));

  const digestDrift = buildCurrentFixture();
  digestDrift.receipt.monthly_selection.ledger.inventory_sha256 = hash('forged-inventory');
  assert.ok(validateIndependentBackupReceipt(digestDrift.value, digestDrift.receipt).failures.includes('monthly ledger inventory digest mismatch'));
});

test('historical receipt v2.0.0 cannot be promoted to CURRENT', () => {
  const { value, receipt } = buildCurrentFixture();
  receipt.schema_version = '2.0.0';
  assert.equal(validateIndependentBackupReceipt(value, receipt).ok, false);
});

test('quarantined restore evidence rejects incomplete or promoted receipt boundaries', () => {
  const scenarios = [
    (receipt) => { receipt.restore_quarantine.external_effect_units.pop(); },
    (receipt) => { receipt.restore_quarantine.external_effect_units.reverse(); },
    (receipt) => { receipt.restore_quarantine.parity_units.pop(); },
    (receipt) => { receipt.restore_quarantine.parity_units.reverse(); },
    (receipt) => { receipt.restore_quarantine.application_traffic_allowed = true; },
    (receipt) => { receipt.restore_quarantine.failed_clone_deletion_requires_separate_authority = false; }
  ];
  for (const mutate of scenarios) {
    const receipt = buildReceipt();
    mutate(receipt);
    bindReceipt(receipt);
    assert.equal(validateIndependentBackupReceipt(contract(), receipt).ok, false);
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
    },
    (receipt) => {
      receipt.monthly_selection.ledger.status = 'VERIFIED';
      receipt.monthly_selection.ledger.complete = true;
      receipt.monthly_selection.ledger.concurrency_state = 'CONSISTENT_SINGLE_HEAD';
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
    (receipt) => { receipt.monthly_selection.ledger = []; },
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
