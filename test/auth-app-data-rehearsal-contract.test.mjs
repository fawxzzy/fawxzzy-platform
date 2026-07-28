import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import {
  createValidator,
  loadDocuments,
  repositoryRoot,
  validateAuthAppDataRehearsalContract,
  validateAuthAppDataRehearsalReceipt,
  validateDisposableTargetBootstrapContract,
  validateSchemaInstances,
  validateSemantics
} from '../scripts/lib/contracts.mjs';

const contractPath = `${repositoryRoot}/contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json`;
const schemaId = 'urn:fawxzzy:platform:schemas:v1:auth-app-data-rehearsal-contract';
const sha = (character) => character.repeat(64);
const clone = (value) => structuredClone(value);
const canonicalDigest = (value) => crypto.createHash('sha256').update(`${JSON.stringify(value, null, 2)}\n`).digest('hex');
const expectedQueryModelSha256 = 'c4edb31be26650b35ad2bd9d4572077d92269aeda649a6ff1577411da342405f';
const authorityPublicSpki = Buffer.from(`302a300506032b6570032100${'d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'}`, 'hex');
const authorityPrivatePkcs8 = Buffer.from(`302e020100300506032b657004220420${'9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60'}`, 'hex');
const executorPublicSpki = Buffer.from(`302a300506032b6570032100${'3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c'}`, 'hex');
const executorPrivatePkcs8 = Buffer.from(`302e020100300506032b657004220420${'4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb'}`, 'hex');
const authorityPrivateKey = crypto.createPrivateKey({ key: authorityPrivatePkcs8, format: 'der', type: 'pkcs8' });
const executorPrivateKey = crypto.createPrivateKey({ key: executorPrivatePkcs8, format: 'der', type: 'pkcs8' });

function loadContract() {
  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}

function bindTerminalReceipt(receipt) {
  receipt.terminal_receipt_sha256 = sha('0');
  receipt.terminal_receipt_sha256 = canonicalDigest(receipt);
}

function signedBytes(domain, subject) {
  return Buffer.from(`${domain}\n${JSON.stringify(subject, null, 2)}\n`, 'utf8');
}

function installTestTrustAnchors(contract) {
  contract.execution_authentication.authority.trust_anchor = {
    status: 'CURRENT',
    algorithm: 'Ed25519',
    key_id: 'test-auth-app-data-authority-ed25519-v1',
    verifier_reference: 'auth-app-data-authority-verifier-v1',
    public_key_spki_base64: authorityPublicSpki.toString('base64'),
    public_key_spki_sha256: crypto.createHash('sha256').update(authorityPublicSpki).digest('hex')
  };
  contract.execution_authentication.executor.trust_anchor = {
    status: 'CURRENT',
    algorithm: 'Ed25519',
    key_id: 'test-auth-app-data-executor-ed25519-v1',
    verifier_reference: 'auth-app-data-executor-verifier-v1',
    public_key_spki_base64: executorPublicSpki.toString('base64'),
    public_key_spki_sha256: crypto.createHash('sha256').update(executorPublicSpki).digest('hex')
  };
}

function bindExecutionAuthority(receipt) {
  const authority = receipt.execution_authority;
  authority.prerequisite_set_sha256 = canonicalDigest(receipt.prerequisites);
  const authoritySubject = {
    model: 'AUTH_APP_DATA_EXECUTION_AUTHORITY_V1',
    status: authority.status,
    authorized_operation: authority.authorized_operation,
    subject_sha256: authority.subject_sha256,
    run_correlation_sha256: authority.run_correlation_sha256,
    contract_binding_set_sha256: authority.contract_binding_set_sha256,
    migration_package_sha256: authority.migration_package_sha256,
    governance_manifest_sha256: authority.governance_manifest_sha256,
    prerequisite_set_sha256: authority.prerequisite_set_sha256,
    authority_identity_sha256: authority.authority_identity_sha256,
    executor_identity_sha256: authority.executor_identity_sha256,
    executor_capability_sha256: authority.executor_capability_sha256
  };
  const executorSubject = {
    model: 'AUTH_APP_DATA_EXECUTOR_BINDING_V1',
    authorized_operation: authority.authorized_operation,
    subject_sha256: receipt.subject_sha256,
    run_correlation_sha256: receipt.run_correlation_sha256,
    contract_binding_set_sha256: receipt.contract_binding_set_sha256,
    package: receipt.package,
    prerequisite_set_sha256: authority.prerequisite_set_sha256,
    authority_identity_sha256: authority.authority_identity_sha256,
    executor_identity_sha256: authority.executor_identity_sha256,
    executor_capability_sha256: authority.executor_capability_sha256
  };
  authority.authority_receipt_sha256 = canonicalDigest(authoritySubject);
  authority.executor_receipt_sha256 = canonicalDigest(executorSubject);
  authority.authority_authentication = {
    algorithm: 'Ed25519',
    key_id: 'test-auth-app-data-authority-ed25519-v1',
    public_key_spki_sha256: crypto.createHash('sha256').update(authorityPublicSpki).digest('hex'),
    signed_payload_sha256: authority.authority_receipt_sha256,
    signature_base64: crypto.sign(null, signedBytes('fawxzzy.platform.auth-app-data.execution-authority.v1', authoritySubject), authorityPrivateKey).toString('base64')
  };
  authority.executor_authentication = {
    algorithm: 'Ed25519',
    key_id: 'test-auth-app-data-executor-ed25519-v1',
    public_key_spki_sha256: crypto.createHash('sha256').update(executorPublicSpki).digest('hex'),
    signed_payload_sha256: authority.executor_receipt_sha256,
    signature_base64: crypto.sign(null, signedBytes('fawxzzy.platform.auth-app-data.executor-capability.v1', executorSubject), executorPrivateKey).toString('base64')
  };
}

function rebindAuthorityHashesWithoutSigning(receipt) {
  const authority = receipt.execution_authority;
  const authoritySubject = {
    model: 'AUTH_APP_DATA_EXECUTION_AUTHORITY_V1',
    status: authority.status,
    authorized_operation: authority.authorized_operation,
    subject_sha256: authority.subject_sha256,
    run_correlation_sha256: authority.run_correlation_sha256,
    contract_binding_set_sha256: authority.contract_binding_set_sha256,
    migration_package_sha256: authority.migration_package_sha256,
    governance_manifest_sha256: authority.governance_manifest_sha256,
    prerequisite_set_sha256: authority.prerequisite_set_sha256,
    authority_identity_sha256: authority.authority_identity_sha256,
    executor_identity_sha256: authority.executor_identity_sha256,
    executor_capability_sha256: authority.executor_capability_sha256
  };
  const executorSubject = {
    model: 'AUTH_APP_DATA_EXECUTOR_BINDING_V1',
    authorized_operation: authority.authorized_operation,
    subject_sha256: receipt.subject_sha256,
    run_correlation_sha256: receipt.run_correlation_sha256,
    contract_binding_set_sha256: receipt.contract_binding_set_sha256,
    package: receipt.package,
    prerequisite_set_sha256: authority.prerequisite_set_sha256,
    authority_identity_sha256: authority.authority_identity_sha256,
    executor_identity_sha256: authority.executor_identity_sha256,
    executor_capability_sha256: authority.executor_capability_sha256
  };
  authority.authority_receipt_sha256 = canonicalDigest(authoritySubject);
  authority.executor_receipt_sha256 = canonicalDigest(executorSubject);
  authority.authority_authentication.signed_payload_sha256 = authority.authority_receipt_sha256;
  authority.executor_authentication.signed_payload_sha256 = authority.executor_receipt_sha256;
}

function bindExpectedState(receipt) {
  const finalS2 = receipt.snapshots.find((snapshot) => snapshot.name === 'S2');
  const expectedStateSha256 = canonicalDigest({
    version: 'AUTH_APP_DATA_EXPECTED_STATE_V1',
    subject_sha256: receipt.subject_sha256,
    run_correlation_sha256: receipt.run_correlation_sha256,
    contract_binding_set_sha256: receipt.contract_binding_set_sha256,
    package: receipt.package,
    auth_surfaces: receipt.auth_surfaces,
    application_data: receipt.application_data,
    identity_ledger: receipt.identity_ledger,
    final_s2: finalS2
  });
  receipt.postimport_reads.query_model_sha256 = expectedQueryModelSha256;
  receipt.postimport_reads.expected_aggregate_sha256 = expectedStateSha256;
  receipt.postimport_reads.read_a.query_model_sha256 = expectedQueryModelSha256;
  receipt.postimport_reads.read_b.query_model_sha256 = expectedQueryModelSha256;
  receipt.postimport_reads.read_a.aggregate_sha256 = expectedStateSha256;
  receipt.postimport_reads.read_b.aggregate_sha256 = expectedStateSha256;
}

function currentReceipt(contract = loadContract()) {
  installTestTrustAnchors(contract);
  const receipt = clone(contract.receipt_example);
  receipt.status = 'CURRENT';
  receipt.validated_at = '2026-07-28T12:16:00.000Z';
  receipt.evidence_complete = true;
  receipt.subject_sha256 = sha('a');
  receipt.run_correlation_sha256 = sha('b');
  receipt.prerequisites = receipt.prerequisites.map((prerequisite, index) => ({
    ...prerequisite,
    status: 'CURRENT',
    subject_sha256: receipt.subject_sha256,
    run_correlation_sha256: receipt.run_correlation_sha256,
    evidence_receipt_sha256: String(index + 1).repeat(64)
  }));
  receipt.execution_authority = {
    status: 'CURRENT',
    authorized_operation: 'AUTH_APP_DATA_REHEARSAL',
    subject_sha256: receipt.subject_sha256,
    run_correlation_sha256: receipt.run_correlation_sha256,
    contract_binding_set_sha256: receipt.contract_binding_set_sha256,
    migration_package_sha256: receipt.package.migration_package_sha256,
    governance_manifest_sha256: receipt.package.governance_manifest_sha256,
    prerequisite_set_sha256: sha('0'),
    authority_identity_sha256: sha('c'),
    executor_identity_sha256: sha('d'),
    executor_capability_sha256: sha('e'),
    authority_receipt_sha256: sha('0'),
    executor_receipt_sha256: sha('0'),
    authority_authentication: clone(receipt.execution_authority.authority_authentication),
    executor_authentication: clone(receipt.execution_authority.executor_authentication)
  };
  bindExecutionAuthority(receipt);
  receipt.completed_actions = [...contract.action_order];
  receipt.auth_surfaces = contract.auth_surface_dispositions.map((surface, index) => ({
    ...surface,
    status: 'CURRENT',
    count: index,
    aggregate_sha256: String((index % 9) + 1).repeat(64)
  }));
  receipt.application_data.adapter_counts = [
    { app: 'mazer', relation_count: 4, aggregate_sha256: sha('1') },
    { app: 'fitness', relation_count: 27, aggregate_sha256: sha('2') },
    { app: 'discordos', relation_count: 10, aggregate_sha256: sha('3') }
  ];
  receipt.application_data.nonrow_surfaces = contract.application_data_denominator.nonrow_surfaces.map((surface, index) => ({
    ...surface,
    status: 'CURRENT',
    count: index,
    aggregate_sha256: String(((index + 3) % 9) + 1).repeat(64)
  }));
  receipt.identity_ledger = {
    status: 'CURRENT',
    complete_owner_fk_coverage: true,
    accepted_mapping_count: 0,
    quarantined_mapping_count: 0,
    aggregate_sha256: sha('4'),
    pending_membership_count: 0,
    suspended_membership_count: 0
  };
  receipt.snapshots = [
    {
      name: 'S0',
      status: 'CURRENT',
      observed_at: '2026-07-28T12:00:00.000Z',
      subject_sha256: receipt.subject_sha256,
      run_correlation_sha256: receipt.run_correlation_sha256,
      complete_denominator: true,
      aggregate_sha256: sha('5'),
      evidence_receipt_sha256: sha('1')
    },
    {
      name: 'S1',
      status: 'CURRENT',
      observed_at: '2026-07-28T12:10:00.000Z',
      subject_sha256: receipt.subject_sha256,
      run_correlation_sha256: receipt.run_correlation_sha256,
      complete_denominator: true,
      aggregate_sha256: sha('6'),
      evidence_receipt_sha256: sha('2')
    },
    {
      name: 'S2',
      status: 'CURRENT',
      observed_at: '2026-07-28T12:12:00.000Z',
      subject_sha256: receipt.subject_sha256,
      run_correlation_sha256: receipt.run_correlation_sha256,
      complete_denominator: true,
      aggregate_sha256: sha('7'),
      evidence_receipt_sha256: sha('3')
    }
  ];
  receipt.write_barrier = {
    status: 'CURRENT',
    authority_receipt_sha256: sha('8'),
    entered_at: '2026-07-28T12:11:00.000Z',
    released_at: '2026-07-28T12:13:00.000Z'
  };
  receipt.postimport_reads = {
    status: 'CURRENT',
    query_model_sha256: expectedQueryModelSha256,
    expected_aggregate_sha256: sha('0'),
    read_a: {
      observed_at: '2026-07-28T12:14:00.000Z',
      subject_sha256: receipt.subject_sha256,
      run_correlation_sha256: receipt.run_correlation_sha256,
      reader_identity_sha256: sha('1'),
      execution_identity_sha256: sha('3'),
      query_model_sha256: expectedQueryModelSha256,
      evidence_receipt_sha256: sha('7'),
      aggregate_sha256: sha('0'),
      complete_denominator: true
    },
    read_b: {
      observed_at: '2026-07-28T12:15:00.000Z',
      subject_sha256: receipt.subject_sha256,
      run_correlation_sha256: receipt.run_correlation_sha256,
      reader_identity_sha256: sha('2'),
      execution_identity_sha256: sha('4'),
      query_model_sha256: expectedQueryModelSha256,
      evidence_receipt_sha256: sha('8'),
      aggregate_sha256: sha('0'),
      complete_denominator: true
    },
    observation_window_seconds: 60,
    identical: true
  };
  bindExpectedState(receipt);
  receipt.negative_probes = {
    status: 'CURRENT',
    completed_at: '2026-07-28T12:15:20.000Z',
    results: contract.negative_probe_gate.required_probes.map((name, index) => ({
      name,
      passed: true,
      evidence_sha256: String((index % 9) + 1).repeat(64)
    }))
  };
  receipt.membership_activation = {
    status: 'CURRENT',
    activated_at: '2026-07-28T12:15:30.000Z',
    activated_mapping_count: receipt.identity_ledger.pending_membership_count,
    remaining_pending_count: 0,
    evidence_sha256: sha('9')
  };
  receipt.external_effects.status = 'CURRENT';
  receipt.rollback = {
    status: 'CURRENT',
    terminal_disposition: 'QUARANTINED_RETAINED',
    reverse_evidence_complete: true,
    source_projects_active: true,
    source_mutation_count: 0,
    external_effect_count: 0,
    target_disposal_authorized: false,
    credential_revocation_authorized: false,
    evidence_sha256: sha('6')
  };
  bindTerminalReceipt(receipt);
  return receipt;
}

test('Auth/application-data rehearsal source contract is schema-valid, exact-bound, and non-executable', () => {
  const documents = loadDocuments();
  const contract = documents['contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json'];
  assert.deepEqual(validateSchemaInstances(documents, createValidator()), []);
  assert.deepEqual(validateAuthAppDataRehearsalContract(contract, documents), []);
  assert.deepEqual(validateSemantics(documents), []);
  assert.deepEqual(contract.lifecycle, {
    source_contract: 'SOURCE_READY',
    execution: 'EXECUTION_BLOCKED',
    apply_admitted: false
  });
  assert.equal(contract.scope.provider_connectivity_included, false);
  assert.equal(contract.scope.provider_runner_included, false);
  assert.equal(contract.scope.auth_or_data_mutation_authorized, false);
  assert.equal(contract.execution_authentication.authority.trust_anchor.status, 'BLOCKED');
  assert.equal(contract.execution_authentication.executor.trust_anchor.status, 'BLOCKED');
  assert.equal(contract.execution_authentication.current_receipt_allowed_while_anchor_blocked, false);
  assert.ok(contract.action_order.indexOf('RUN_SECURITY_AUTH_AND_EGRESS_NEGATIVE_PROBES') < contract.action_order.indexOf('ACTIVATE_PENDING_MEMBERSHIPS'));
  assert.equal(contract.auth_surface_dispositions.length, 20);
});

test('complete aggregate-only CURRENT rehearsal receipt satisfies schema and semantics', () => {
  const contract = loadContract();
  const receipt = currentReceipt(contract);
  const schemaFixture = clone(contract);
  schemaFixture.receipt_example = receipt;
  const validate = createValidator().getSchema(schemaId);
  assert.equal(validate(schemaFixture), true, JSON.stringify(validate.errors));
  assert.deepEqual(validateAuthAppDataRehearsalReceipt(contract, receipt), []);
});

test('contract rejects lifecycle, provider, digest, and UNKNOWN-promotion weakening', () => {
  const baseline = loadDocuments();
  for (const mutate of [
    (contract) => { contract.lifecycle.execution = 'CURRENT'; },
    (contract) => { contract.lifecycle.apply_admitted = true; },
    (contract) => { contract.scope.provider_runner_included = true; },
    (contract) => { contract.scope.auth_or_data_mutation_authorized = true; },
    (contract) => { contract.execution_authentication.authority.trust_anchor.status = 'CURRENT'; },
    (contract) => { contract.execution_authentication.caller_supplied_trust_material_allowed = true; },
    (contract) => { contract.contract_bindings.documents[0].sha256 = sha('f'); },
    (contract) => { contract.receipt_policy.unknown_may_be_promoted_to_current = true; }
  ]) {
    const documents = clone(baseline);
    const contract = documents['contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json'];
    mutate(contract);
    assert.ok(validateSchemaInstances(documents, createValidator()).length > 0 || validateAuthAppDataRehearsalContract(contract, documents).length > 0);
  }
});

test('CURRENT receipt binds exact package, separate execution authority, and three action-time prerequisites', () => {
  const contract = loadContract();
  for (const mutate of [
    (receipt) => { receipt.package.migration_count = 121; },
    (receipt) => { receipt.package.migration_package_sha256 = sha('f'); },
    (receipt) => { receipt.execution_authority.status = 'BLOCKED'; },
    (receipt) => { receipt.execution_authority.subject_sha256 = sha('e'); },
    (receipt) => { receipt.execution_authority.contract_binding_set_sha256 = sha('f'); },
    (receipt) => { receipt.execution_authority.migration_package_sha256 = sha('f'); },
    (receipt) => { receipt.execution_authority.prerequisite_set_sha256 = sha('f'); },
    (receipt) => { receipt.execution_authority.executor_identity_sha256 = sha('f'); },
    (receipt) => { receipt.execution_authority.authority_receipt_sha256 = sha('f'); },
    (receipt) => { receipt.execution_authority.executor_receipt_sha256 = receipt.execution_authority.authority_receipt_sha256; },
    (receipt) => { receipt.prerequisites.pop(); },
    (receipt) => { receipt.prerequisites.reverse(); },
    (receipt) => { receipt.prerequisites[0].status = 'BLOCKED'; },
    (receipt) => { receipt.prerequisites[1].run_correlation_sha256 = sha('e'); },
    (receipt) => { receipt.prerequisites[2].evidence_receipt_sha256 = receipt.prerequisites[1].evidence_receipt_sha256; }
  ]) {
    const receipt = currentReceipt(contract);
    mutate(receipt);
    bindTerminalReceipt(receipt);
    assert.ok(validateAuthAppDataRehearsalReceipt(contract, receipt).some((failure) => failure.includes('package') || failure.includes('authority') || failure.includes('prerequisite') || failure.includes('BOOTSTRAP') || failure.includes('BACKUP') || failure.includes('RECOVERY')));
  }
});

test('coherent authority, executor, and capability substitution fails without both pinned Ed25519 signatures', () => {
  const contract = loadContract();
  const receipt = currentReceipt(contract);
  receipt.execution_authority.authority_identity_sha256 = sha('f');
  receipt.execution_authority.executor_identity_sha256 = sha('8');
  receipt.execution_authority.executor_capability_sha256 = sha('9');
  rebindAuthorityHashesWithoutSigning(receipt);
  bindTerminalReceipt(receipt);
  const failures = validateAuthAppDataRehearsalReceipt(contract, receipt);
  assert.ok(failures.some((failure) => failure.includes('authentication') || failure.includes('pinned')));
});

test('CURRENT receipt rejects trust-anchor, signer, algorithm, key, payload, and signature substitution', () => {
  const cases = [
    (contract) => { contract.execution_authentication.authority.trust_anchor.public_key_spki_sha256 = sha('f'); },
    (_contract, receipt) => { receipt.execution_authority.authority_authentication.key_id = 'attacker-authority-key'; },
    (_contract, receipt) => { receipt.execution_authority.executor_authentication.public_key_spki_sha256 = sha('f'); },
    (_contract, receipt) => { receipt.execution_authority.authority_authentication.signed_payload_sha256 = sha('f'); },
    (_contract, receipt) => { receipt.execution_authority.executor_authentication.signature_base64 = 'AA=='; }
  ];
  for (const mutate of cases) {
    const contract = loadContract();
    const receipt = currentReceipt(contract);
    mutate(contract, receipt);
    bindTerminalReceipt(receipt);
    assert.ok(validateAuthAppDataRehearsalReceipt(contract, receipt).some((failure) => failure.includes('authentication') || failure.includes('trust anchor')));
  }
});

test('contract bindings reject drift in every bound source document', () => {
  const baseline = loadDocuments();
  for (const binding of baseline['contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json'].contract_bindings.documents) {
    const documents = clone(baseline);
    documents[binding.path].version = '99.0.0';
    const failures = validateAuthAppDataRehearsalContract(documents['contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json'], documents);
    assert.ok(failures.some((failure) => failure.includes(binding.path)), binding.path);
  }
});

test('CURRENT receipt closes exactly 20 Auth surfaces including OAuth 2.1/OIDC state and rejects omissions, duplicates, drift, and UNKNOWN', () => {
  const contract = loadContract();
  const cases = [
    (receipt) => { receipt.auth_surfaces.pop(); },
    (receipt) => { receipt.auth_surfaces[1] = clone(receipt.auth_surfaces[0]); },
    (receipt) => { receipt.auth_surfaces[0].disposition = 'UNKNOWN_BLOCKED'; },
    (receipt) => { receipt.auth_surfaces[0].status = 'UNKNOWN'; },
    (receipt) => { receipt.auth_surfaces[0].aggregate_sha256 = sha('0'); },
    (receipt) => { receipt.auth_surfaces.splice(16, 1); },
    (receipt) => { receipt.auth_surfaces[19].surface = 'oauth_server_enablement_and_authorization_path'; }
  ];
  for (const mutate of cases) {
    const receipt = currentReceipt(contract);
    mutate(receipt);
    bindTerminalReceipt(receipt);
    assert.ok(validateAuthAppDataRehearsalReceipt(contract, receipt).some((failure) => failure.includes('Auth') || failure.includes('users')));
  }
});

test('CURRENT receipt binds 41 relations, exact adapters, and all non-row surfaces', () => {
  const contract = loadContract();
  for (const mutate of [
    (receipt) => { receipt.application_data.relation_total = 40; },
    (receipt) => { receipt.application_data.adapter_counts.reverse(); },
    (receipt) => { receipt.application_data.nonrow_surfaces.pop(); },
    (receipt) => { receipt.application_data.nonrow_surfaces[0].status = 'UNKNOWN'; },
    (receipt) => { receipt.application_data.nonrow_surfaces[4].disposition = 'CURRENT'; }
  ]) {
    const receipt = currentReceipt(contract);
    mutate(receipt);
    bindTerminalReceipt(receipt);
    assert.ok(validateAuthAppDataRehearsalReceipt(contract, receipt).some((failure) => failure.includes('application') || failure.includes('adapter') || failure.includes('non-row') || failure.includes('sequences') || failure.includes('storage_object_bodies')));
  }
});

test('CURRENT receipt enforces S0, S1, separately authorized barrier, and final S2 chronology', () => {
  const contract = loadContract();
  for (const mutate of [
    (receipt) => { receipt.snapshots.reverse(); },
    (receipt) => { receipt.snapshots[2].observed_at = '2026-07-28T12:10:30.000Z'; },
    (receipt) => { receipt.write_barrier.authority_receipt_sha256 = sha('0'); },
    (receipt) => { receipt.snapshots[1].evidence_receipt_sha256 = receipt.snapshots[0].evidence_receipt_sha256; },
    (receipt) => { receipt.snapshots[0].complete_denominator = false; }
  ]) {
    const receipt = currentReceipt(contract);
    mutate(receipt);
    bindTerminalReceipt(receipt);
    assert.ok(validateAuthAppDataRehearsalReceipt(contract, receipt).some((failure) => failure.includes('snapshot') || failure.includes('chronology') || failure.includes('barrier') || failure.includes('S0')));
  }
});

test('CURRENT receipt requires immutable identity coverage before membership activation', () => {
  const contract = loadContract();
  for (const mutate of [
    (receipt) => { receipt.identity_ledger.status = 'BLOCKED'; },
    (receipt) => { receipt.identity_ledger.complete_owner_fk_coverage = false; },
    (receipt) => { receipt.identity_ledger.aggregate_sha256 = sha('0'); }
  ]) {
    const receipt = currentReceipt(contract);
    mutate(receipt);
    bindTerminalReceipt(receipt);
    assert.ok(validateAuthAppDataRehearsalReceipt(contract, receipt).some((failure) => failure.includes('identity ledger')));
  }
});

test('membership activation follows both independent reads and all negative probes', () => {
  const contract = loadContract();
  for (const mutate of [
    (receipt) => { receipt.negative_probes.completed_at = '2026-07-28T12:14:59.000Z'; },
    (receipt) => { receipt.membership_activation.status = 'BLOCKED'; },
    (receipt) => { receipt.membership_activation.activated_at = '2026-07-28T12:15:19.999Z'; },
    (receipt) => { receipt.membership_activation.remaining_pending_count = 1; },
    (receipt) => { receipt.membership_activation.activated_mapping_count = 1; },
    (receipt) => { receipt.membership_activation.evidence_sha256 = sha('0'); }
  ]) {
    const receipt = currentReceipt(contract);
    mutate(receipt);
    bindTerminalReceipt(receipt);
    assert.ok(validateAuthAppDataRehearsalReceipt(contract, receipt).some((failure) => failure.includes('negative probes') || failure.includes('membership activation')));
  }
});

test('post-import expected state is canonically derived from S2 and every Auth, adapter, non-row, and identity commitment', () => {
  const contract = loadContract();
  for (const mutate of [
    (receipt) => { receipt.snapshots[2].aggregate_sha256 = sha('f'); },
    (receipt) => { receipt.auth_surfaces[0].aggregate_sha256 = sha('f'); },
    (receipt) => { receipt.application_data.adapter_counts[0].aggregate_sha256 = sha('f'); },
    (receipt) => { receipt.application_data.nonrow_surfaces[0].aggregate_sha256 = sha('f'); },
    (receipt) => { receipt.identity_ledger.aggregate_sha256 = sha('f'); },
    (receipt) => { receipt.postimport_reads.query_model_sha256 = sha('f'); }
  ]) {
    const receipt = currentReceipt(contract);
    mutate(receipt);
    bindTerminalReceipt(receipt);
    assert.ok(validateAuthAppDataRehearsalReceipt(contract, receipt).some((failure) => failure.includes('expected state') || failure.includes('expected-state') || failure.includes('query model')));
  }
});

test('two post-import reads must be independent, complete, same-model, equal, and within the observation window', () => {
  const contract = loadContract();
  const cases = [
    (receipt) => { receipt.postimport_reads.read_b.reader_identity_sha256 = receipt.postimport_reads.read_a.reader_identity_sha256; },
    (receipt) => { receipt.postimport_reads.read_b.execution_identity_sha256 = receipt.postimport_reads.read_a.execution_identity_sha256; },
    (receipt) => { receipt.postimport_reads.read_b.evidence_receipt_sha256 = receipt.postimport_reads.read_a.evidence_receipt_sha256; },
    (receipt) => { receipt.postimport_reads.read_b.query_model_sha256 = sha('6'); },
    (receipt) => { receipt.postimport_reads.read_b.aggregate_sha256 = sha('8'); },
    (receipt) => { receipt.postimport_reads.read_b.complete_denominator = false; },
    (receipt) => { receipt.postimport_reads.observation_window_seconds = 59; },
    (receipt) => {
      receipt.postimport_reads.read_b.observed_at = '2026-07-28T14:15:01.000Z';
      receipt.postimport_reads.observation_window_seconds = 7261;
    }
  ];
  for (const mutate of cases) {
    const receipt = currentReceipt(contract);
    mutate(receipt);
    bindTerminalReceipt(receipt);
    assert.ok(validateAuthAppDataRehearsalReceipt(contract, receipt).some((failure) => failure.includes('post-import') || failure.includes('observation window')));
  }
});

test('negative probe denominator rejects source credentials, AAL, identity, owner, CAS, Storage, and egress gaps', () => {
  const contract = loadContract();
  for (const mutate of [
    (receipt) => { receipt.negative_probes.results.pop(); },
    (receipt) => { receipt.negative_probes.results.reverse(); },
    (receipt) => { receipt.negative_probes.results[0].passed = false; },
    (receipt) => { receipt.negative_probes.results[5].evidence_sha256 = sha('0'); }
  ]) {
    const receipt = currentReceipt(contract);
    mutate(receipt);
    bindTerminalReceipt(receipt);
    assert.ok(validateAuthAppDataRehearsalReceipt(contract, receipt).some((failure) => failure.includes('negative probe') || failure.includes('negative-probe')));
  }
});

test('aggregate receipt rejects raw identities, rows, credentials, provider responses, SQL, and machine paths', () => {
  const contract = loadContract();
  const forbidden = [
    ['raw_rows', [{ id: 1 }]],
    ['emails', ['person@example.invalid']],
    ['credentials', ['credential-value']],
    ['provider_responses', [{ ok: true }]],
    ['sql', 'select 1'],
    ['machine_paths', ['C:/local-only']]
  ];
  for (const [key, value] of forbidden) {
    const receipt = currentReceipt(contract);
    receipt[key] = value;
    bindTerminalReceipt(receipt);
    assert.ok(validateAuthAppDataRehearsalReceipt(contract, receipt).some((failure) => failure.includes('sanitization')), key);
  }
});

test('CURRENT receipt preserves sources, zero effects, reverse evidence, and separate disposal authority', () => {
  const contract = loadContract();
  for (const mutate of [
    (receipt) => { receipt.rollback.source_projects_active = false; },
    (receipt) => { receipt.rollback.source_mutation_count = 1; },
    (receipt) => { receipt.rollback.reverse_evidence_complete = false; },
    (receipt) => { receipt.rollback.target_disposal_authorized = true; },
    (receipt) => { receipt.external_effects.auth_messages_sent = 1; },
    (receipt) => { receipt.rollback.evidence_sha256 = sha('0'); }
  ]) {
    const receipt = currentReceipt(contract);
    mutate(receipt);
    bindTerminalReceipt(receipt);
    assert.ok(validateAuthAppDataRehearsalReceipt(contract, receipt).length > 0);
  }
});

test('terminal digest binds every CURRENT aggregate receipt field', () => {
  const contract = loadContract();
  const receipt = currentReceipt(contract);
  receipt.identity_ledger.pending_membership_count = 1;
  assert.ok(validateAuthAppDataRehearsalReceipt(contract, receipt).some((failure) => failure.includes('terminal receipt digest')));
});

test('migration gate binds the rehearsal contract without regressing target-bootstrap semantics', () => {
  const documents = loadDocuments();
  const gate = documents['contracts/v1/gates/migration-gate-state.json'];
  assert.equal(gate.version, '1.6.0');
  assert.equal(gate.required_evidence.some((evidence) => evidence.name === 'Auth/application-data rehearsal source contract: contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json' && evidence.status === 'CURRENT'), true);
  assert.deepEqual(validateDisposableTargetBootstrapContract(documents['contracts/v1/bootstrap/disposable-target-bootstrap-contract.json']), []);
  assert.deepEqual(validateSemantics(documents), []);
});
