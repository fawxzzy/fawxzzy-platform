import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import {
  createValidator,
  loadDocuments,
  repositoryRoot,
  validateDisposableTargetBootstrapContract,
  validateDisposableTargetBootstrapReceipt,
  validateSchemaInstances,
  validateSemantics
} from '../scripts/lib/contracts.mjs';

const contractPath = `${repositoryRoot}/contracts/v1/bootstrap/disposable-target-bootstrap-contract.json`;
const schemaId = 'urn:fawxzzy:platform:schemas:v1:disposable-target-bootstrap-contract';
const sha = (character) => character.repeat(64);
const clone = (value) => structuredClone(value);
const canonicalDigest = (value) => crypto.createHash('sha256').update(`${JSON.stringify(value, null, 2)}\n`).digest('hex');

function bindExpectedState(receipt) {
  receipt.package.expected_state_binding_sha256 = canonicalDigest({
    model: 'PACKAGE_BUNDLE_CATALOG_SECURITY_V1',
    run_correlation_sha256: receipt.run_correlation_sha256,
    subject_sha256: receipt.identity.disposable_project_identity_sha256,
    migration_count: receipt.package.migration_count,
    migration_package_sha256: receipt.package.migration_package_sha256,
    governance_manifest_sha256: receipt.package.governance_manifest_sha256,
    executable_bundle_sha256: receipt.package.executable_bundle_sha256,
    reviewed_expected_state_receipt_sha256: receipt.package.reviewed_expected_state_receipt_sha256,
    expected_catalog_sha256: receipt.package.expected_catalog_sha256,
    expected_security_sha256: receipt.package.expected_security_sha256
  });
}

function bindAuthority(receipt) {
  receipt.authority_binding_sha256 = canonicalDigest({
    model: 'SUBJECT_RUN_BOOTSTRAP_APPLY_AUTHORITY_V1',
    authorized_operation: receipt.authorized_operation,
    authority_receipt_sha256: receipt.authority_receipt_sha256,
    subject_sha256: receipt.identity.disposable_project_identity_sha256,
    run_correlation_sha256: receipt.run_correlation_sha256,
    migration_count: receipt.package.migration_count,
    migration_package_sha256: receipt.package.migration_package_sha256,
    governance_manifest_sha256: receipt.package.governance_manifest_sha256,
    executable_bundle_sha256: receipt.package.executable_bundle_sha256,
    expected_state_binding_sha256: receipt.package.expected_state_binding_sha256
  });
}

function bindCatalogRead(read) {
  read.read_binding_sha256 = canonicalDigest({
    model: 'SUBJECT_RUN_CATALOG_READ_EVIDENCE_V1',
    subject_sha256: read.subject_sha256,
    run_correlation_sha256: read.run_correlation_sha256,
    observed_at: read.observed_at,
    evidence_receipt_sha256: read.evidence_receipt_sha256,
    reader_identity_sha256: read.reader_identity_sha256,
    execution_identity_sha256: read.execution_identity_sha256,
    query_model_sha256: read.query_model_sha256,
    catalog_sha256: read.catalog_sha256,
    counts: read.counts
  });
}

function bindProtectedInventory(receipt) {
  const identity = receipt.identity;
  identity.protected_inventory_sha256 = canonicalDigest({
    model: 'CANONICAL_PROVIDER_INVENTORY_V1',
    subject_sha256: identity.subject_sha256,
    run_correlation_sha256: identity.run_correlation_sha256,
    observed_at: identity.observed_at,
    provider_inventory_snapshot_sha256: identity.provider_inventory_snapshot_sha256,
    provider_inventory_completeness_receipt_sha256: identity.provider_inventory_completeness_receipt_sha256,
    pagination_page_count: identity.pagination_page_count,
    pagination_item_count: identity.pagination_item_count,
    pagination_exhausted: identity.pagination_exhausted,
    protected_project_identity_sha256s: identity.protected_project_identity_sha256s
  });
}

function bindTerminalProof(receipt) {
  const rollback = receipt.rollback;
  rollback.capability_binding_sha256 = canonicalDigest({
    model: 'SUBJECT_RUN_ROLLBACK_CAPABILITY_V1',
    subject_sha256: rollback.subject_sha256,
    run_correlation_sha256: rollback.run_correlation_sha256,
    preimage_sha256: rollback.preimage_sha256,
    plan_sha256: rollback.plan_sha256,
    authority_receipt_sha256: rollback.authority_receipt_sha256,
    credential_revocation_plan_sha256: rollback.credential_revocation_plan_sha256
  });
  rollback.terminal_proof_binding_sha256 = canonicalDigest({
    model: 'SUBJECT_RUN_DISPOSITION_EVIDENCE_V1',
    subject_sha256: rollback.subject_sha256,
    run_correlation_sha256: rollback.run_correlation_sha256,
    terminal_disposition: rollback.terminal_disposition,
    capability_binding_sha256: rollback.capability_binding_sha256,
    completion_observed_at: rollback.completion_observed_at,
    completion_receipt_sha256: rollback.completion_receipt_sha256,
    restored_postimage_sha256: rollback.restored_postimage_sha256,
    disposal_authority_receipt_sha256: rollback.disposal_authority_receipt_sha256,
    disposal_completion_observed_at: rollback.disposal_completion_observed_at,
    disposal_completion_receipt_sha256: rollback.disposal_completion_receipt_sha256,
    target_absence_observed_at: rollback.target_absence_observed_at,
    target_absence_evidence_sha256: rollback.target_absence_evidence_sha256,
    credential_revocation_observed_at: rollback.credential_revocation_observed_at,
    credential_revocation_evidence_sha256: rollback.credential_revocation_evidence_sha256,
    target_absent_after_disposal: rollback.target_absent_after_disposal,
    credentials_revoked_after_disposal: rollback.credentials_revoked_after_disposal
  });
}

function loadContract() {
  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}

function currentReceipt(contract = loadContract()) {
  const receipt = clone(contract.receipt_example);
  receipt.status = 'CURRENT';
  receipt.validated_at = '2026-07-28T12:10:00.000Z';
  receipt.run_correlation_sha256 = sha('a');
  receipt.evidence_complete = true;
  receipt.authorized_operation = 'GUARDED_DISPOSABLE_TARGET_BOOTSTRAP_APPLY';
  receipt.authority_receipt_sha256 = sha('a');
  receipt.package.executable_bundle_sha256 = sha('b');
  receipt.package.reviewed_expected_state_receipt_sha256 = sha('c');
  receipt.package.expected_catalog_sha256 = sha('f');
  receipt.package.expected_security_sha256 = sha('e');
  receipt.identity.observed_at = '2026-07-28T12:00:00.000Z';
  receipt.identity.subject_sha256 = receipt.identity.disposable_project_identity_sha256;
  receipt.identity.run_correlation_sha256 = receipt.run_correlation_sha256;
  receipt.identity.provider_inventory_snapshot_sha256 = sha('6');
  receipt.identity.provider_inventory_completeness_receipt_sha256 = sha('7');
  receipt.identity.pagination_page_count = 1;
  receipt.identity.pagination_item_count = receipt.identity.protected_project_count;
  receipt.identity.pagination_exhausted = true;
  receipt.identity.inventory_complete = true;
  receipt.preimage = {
    status: 'CURRENT',
    observed_at: '2026-07-28T12:01:00.000Z',
    subject_sha256: receipt.identity.disposable_project_identity_sha256,
    run_correlation_sha256: receipt.run_correlation_sha256,
    inventory_sha256: sha('6'),
    postgres_major: 17,
    provider_migrations: 0,
    application_schemas: 0,
    public_base_tables: 0,
    auth_users: 0,
    storage_buckets: 0,
    storage_objects: 0,
    realtime_publication_tables: 0,
    edge_functions: 0,
    security_advisor_errors: 0
  };
  receipt.completed_actions = [...contract.action_order];
  receipt.data_api = {
    status: 'CURRENT',
    subject_sha256: receipt.identity.disposable_project_identity_sha256,
    run_correlation_sha256: receipt.run_correlation_sha256,
    control_plane_preimage_sha256: sha('d'),
    control_plane_postimage_sha256: sha('e'),
    enabled: false,
    exposed_schemas: [],
    extra_search_path: ['extensions'],
    automatic_public_exposure: false
  };
  receipt.extensions = {
    status: 'CURRENT',
    subject_sha256: receipt.identity.disposable_project_identity_sha256,
    run_correlation_sha256: receipt.run_correlation_sha256,
    units: [
      { name: 'pgcrypto', default_version: '1.3', installed_version: '1.3', compatibility: 'PASS', explicit_version_pin_claimed: false },
      { name: 'pg_cron', default_version: '1.6.4', installed_version: '1.6.4', compatibility: 'PASS', explicit_version_pin_claimed: false },
      { name: 'pg_net', default_version: '0.20.4', installed_version: '0.20.4', compatibility: 'PASS', explicit_version_pin_claimed: false }
    ]
  };
  const counts = clone(contract.catalog_parity.expected_counts);
  receipt.catalog_reads = {
    status: 'CURRENT',
    subject_sha256: receipt.identity.disposable_project_identity_sha256,
    run_correlation_sha256: receipt.run_correlation_sha256,
    read_a: {
      observed_at: '2026-07-28T12:02:00.000Z',
      subject_sha256: receipt.identity.disposable_project_identity_sha256,
      run_correlation_sha256: receipt.run_correlation_sha256,
      evidence_receipt_sha256: sha('1'),
      reader_identity_sha256: sha('3'),
      execution_identity_sha256: sha('7'),
      query_model_sha256: sha('d'),
      read_binding_sha256: sha('0'),
      catalog_sha256: sha('f'),
      counts
    },
    read_b: {
      observed_at: '2026-07-28T12:03:00.000Z',
      subject_sha256: receipt.identity.disposable_project_identity_sha256,
      run_correlation_sha256: receipt.run_correlation_sha256,
      evidence_receipt_sha256: sha('2'),
      reader_identity_sha256: sha('4'),
      execution_identity_sha256: sha('8'),
      query_model_sha256: sha('d'),
      read_binding_sha256: sha('0'),
      catalog_sha256: sha('f'),
      counts: clone(counts)
    },
    identical: true
  };
  receipt.security = {
    status: 'CURRENT',
    subject_sha256: receipt.identity.disposable_project_identity_sha256,
    run_correlation_sha256: receipt.run_correlation_sha256,
    security_sha256: sha('e'),
    relation_grants_complete: true,
    rls_enabled_and_forced_complete: true,
    policy_denominator_complete: true,
    function_acl_complete: true,
    function_search_path_complete: true,
    creator_default_acl_complete: true,
    public_product_object_count: 0,
    provider_role_isolation: 'PASS'
  };
  receipt.external_effects.status = 'CURRENT';
  receipt.external_effects.subject_sha256 = receipt.identity.disposable_project_identity_sha256;
  receipt.external_effects.run_correlation_sha256 = receipt.run_correlation_sha256;
  receipt.negative_probes = {
    status: 'CURRENT',
    subject_sha256: receipt.identity.disposable_project_identity_sha256,
    run_correlation_sha256: receipt.run_correlation_sha256,
    results: contract.negative_probe_gate.required_probes.map((name, index) => ({
      name,
      passed: true,
      evidence_sha256: String(index + 1).repeat(64)
    }))
  };
  receipt.rollback = {
    status: 'CURRENT',
    subject_sha256: receipt.identity.disposable_project_identity_sha256,
    run_correlation_sha256: receipt.run_correlation_sha256,
    preimage_sha256: receipt.preimage.inventory_sha256,
    plan_sha256: sha('7'),
    authority_receipt_sha256: sha('8'),
    credential_revocation_plan_sha256: sha('9'),
    capability_binding_sha256: sha('0'),
    completion_observed_at: null,
    completion_receipt_sha256: sha('0'),
    restored_postimage_sha256: sha('0'),
    disposal_authority_receipt_sha256: sha('0'),
    disposal_completion_observed_at: null,
    disposal_completion_receipt_sha256: sha('0'),
    target_absence_observed_at: null,
    target_absence_evidence_sha256: sha('0'),
    credential_revocation_observed_at: null,
    credential_revocation_evidence_sha256: sha('0'),
    terminal_proof_binding_sha256: sha('0'),
    terminal_disposition: 'QUARANTINED_RETAINED',
    target_absent_after_disposal: false,
    credentials_revoked_after_disposal: false,
    source_projects_active: true,
    source_mutation_count: 0,
    broad_drop_used: false
  };
  bindExpectedState(receipt);
  bindAuthority(receipt);
  bindProtectedInventory(receipt);
  bindCatalogRead(receipt.catalog_reads.read_a);
  bindCatalogRead(receipt.catalog_reads.read_b);
  bindTerminalProof(receipt);
  receipt.terminal_receipt_sha256 = sha('a');
  return receipt;
}

test('disposable target bootstrap contract satisfies its schema and closed semantics', () => {
  const contract = loadContract();
  const validator = createValidator().getSchema(schemaId);
  assert.ok(validator);
  assert.equal(validator(contract), true, JSON.stringify(validator.errors));
  assert.deepEqual(validateDisposableTargetBootstrapContract(contract), []);

  const documents = loadDocuments();
  assert.deepEqual(validateSchemaInstances(documents), []);
  assert.deepEqual(validateSemantics(documents), []);
});

test('aggregate-only CURRENT receipt closes the complete target-bootstrap denominator', () => {
  const contract = loadContract();
  const receipt = currentReceipt(contract);
  const receiptValidator = createValidator().getSchema(`${schemaId}#/$defs/receipt`);
  assert.ok(receiptValidator);
  assert.equal(receiptValidator(receipt), true, JSON.stringify(receiptValidator.errors));
  assert.deepEqual(validateDisposableTargetBootstrapReceipt(contract, receipt), []);
});

test('DISPOSED receipt requires separate authority, completion, target-absence, and credential-revocation evidence', () => {
  const contract = loadContract();
  const disposed = currentReceipt(contract);
  disposed.rollback.terminal_disposition = 'DISPOSED';
  bindTerminalProof(disposed);
  assert.ok(validateDisposableTargetBootstrapReceipt(contract, disposed).some((failure) => failure.includes('DISPOSED requires disposal authority evidence')));

  disposed.rollback.disposal_completion_observed_at = '2026-07-28T12:04:00.000Z';
  disposed.rollback.target_absence_observed_at = '2026-07-28T12:05:00.000Z';
  disposed.rollback.credential_revocation_observed_at = '2026-07-28T12:05:00.000Z';
  disposed.rollback.completion_observed_at = '2026-07-28T12:06:00.000Z';
  disposed.rollback.completion_receipt_sha256 = sha('c');
  disposed.rollback.disposal_authority_receipt_sha256 = sha('a');
  disposed.rollback.disposal_completion_receipt_sha256 = sha('b');
  disposed.rollback.target_absence_evidence_sha256 = sha('d');
  disposed.rollback.credential_revocation_evidence_sha256 = sha('e');
  disposed.rollback.target_absent_after_disposal = true;
  disposed.rollback.credentials_revoked_after_disposal = true;
  bindTerminalProof(disposed);
  assert.deepEqual(validateDisposableTargetBootstrapReceipt(contract, disposed), []);
});

test('ROLLED_BACK receipt requires fresh completion and exact preimage restoration', () => {
  const contract = loadContract();
  const rolledBack = currentReceipt(contract);
  rolledBack.rollback.terminal_disposition = 'ROLLED_BACK';
  bindTerminalProof(rolledBack);
  assert.ok(validateDisposableTargetBootstrapReceipt(contract, rolledBack).some((failure) => failure.includes('ROLLED_BACK requires fresh completion evidence')));

  rolledBack.rollback.completion_observed_at = '2026-07-28T12:04:00.000Z';
  rolledBack.rollback.completion_receipt_sha256 = sha('b');
  rolledBack.rollback.restored_postimage_sha256 = rolledBack.preimage.inventory_sha256;
  bindTerminalProof(rolledBack);
  assert.deepEqual(validateDisposableTargetBootstrapReceipt(contract, rolledBack), []);

  rolledBack.rollback.restored_postimage_sha256 = sha('d');
  bindTerminalProof(rolledBack);
  assert.ok(validateDisposableTargetBootstrapReceipt(contract, rolledBack).some((failure) => failure.includes('postimage must equal')));
});

test('CURRENT receipt binds every observation and expected-state digest to one disposable subject and run', () => {
  const contract = loadContract();
  {
    const receipt = currentReceipt(contract);
    receipt.catalog_reads.read_b.subject_sha256 = sha('9');
    assert.ok(validateDisposableTargetBootstrapReceipt(contract, receipt).some((failure) => failure.includes('catalog read B observation must bind')));
  }
  {
    const receipt = currentReceipt(contract);
    receipt.package.executable_bundle_sha256 = sha('9');
    assert.ok(validateDisposableTargetBootstrapReceipt(contract, receipt).some((failure) => failure.includes('expected-state binding mismatch')));
  }
  {
    const receipt = currentReceipt(contract);
    receipt.catalog_reads.read_a.catalog_sha256 = sha('9');
    receipt.catalog_reads.read_b.catalog_sha256 = sha('9');
    assert.ok(validateDisposableTargetBootstrapReceipt(contract, receipt).some((failure) => failure.includes('reviewed expected catalog')));
  }
  {
    const receipt = currentReceipt(contract);
    receipt.security.security_sha256 = sha('9');
    assert.ok(validateDisposableTargetBootstrapReceipt(contract, receipt).some((failure) => failure.includes('reviewed expected security')));
  }
});

test('protected-project denominator requires canonical complete provider inventory evidence', () => {
  const contract = loadContract();
  {
    const receipt = currentReceipt(contract);
    receipt.identity.protected_project_identity_sha256s.reverse();
    bindProtectedInventory(receipt);
    assert.ok(validateDisposableTargetBootstrapReceipt(contract, receipt).some((failure) => failure.includes('strict canonical order')));
  }
  {
    const receipt = currentReceipt(contract);
    receipt.identity.protected_project_identity_sha256s[0] = sha('6');
    assert.ok(validateDisposableTargetBootstrapReceipt(contract, receipt).some((failure) => failure.includes('canonical complete provider inventory')));
  }
  {
    const receipt = currentReceipt(contract);
    receipt.identity.pagination_exhausted = false;
    bindProtectedInventory(receipt);
    assert.ok(validateDisposableTargetBootstrapReceipt(contract, receipt).some((failure) => failure.includes('pagination must be exhausted')));
  }
  {
    const receipt = currentReceipt(contract);
    receipt.identity.pagination_item_count = 5;
    bindProtectedInventory(receipt);
    assert.ok(validateDisposableTargetBootstrapReceipt(contract, receipt).some((failure) => failure.includes('item count must match')));
  }
});

test('terminal disposition evidence cannot be asserted without its exact subject-run proof binding', () => {
  const contract = loadContract();
  const disposed = currentReceipt(contract);
  disposed.rollback.terminal_disposition = 'DISPOSED';
  disposed.rollback.disposal_completion_observed_at = '2026-07-28T12:04:00.000Z';
  disposed.rollback.target_absence_observed_at = '2026-07-28T12:05:00.000Z';
  disposed.rollback.credential_revocation_observed_at = '2026-07-28T12:05:00.000Z';
  disposed.rollback.completion_observed_at = '2026-07-28T12:06:00.000Z';
  disposed.rollback.completion_receipt_sha256 = sha('c');
  disposed.rollback.disposal_authority_receipt_sha256 = sha('a');
  disposed.rollback.disposal_completion_receipt_sha256 = sha('b');
  disposed.rollback.target_absence_evidence_sha256 = sha('d');
  disposed.rollback.credential_revocation_evidence_sha256 = sha('e');
  disposed.rollback.target_absent_after_disposal = true;
  disposed.rollback.credentials_revoked_after_disposal = true;
  assert.ok(validateDisposableTargetBootstrapReceipt(contract, disposed).some((failure) => failure.includes('terminal disposition proof binding mismatch')));
});

test('apply authority binds the exact guarded operation, subject, run, package, and reviewed bundle', () => {
  const contract = loadContract();
  {
    const receipt = currentReceipt(contract);
    receipt.authority_receipt_sha256 = sha('9');
    assert.ok(validateDisposableTargetBootstrapReceipt(contract, receipt).some((failure) => failure.includes('apply authority must bind')));
  }
  {
    const receipt = currentReceipt(contract);
    receipt.authorized_operation = 'UNSCOPED_APPLY';
    bindAuthority(receipt);
    assert.ok(validateDisposableTargetBootstrapReceipt(contract, receipt).some((failure) => failure.includes('guarded disposable target bootstrap apply')));
  }
});

test('catalog parity requires two distinctly identified subject-run-bound reads', () => {
  const contract = loadContract();
  {
    const receipt = currentReceipt(contract);
    receipt.catalog_reads.read_b = clone(receipt.catalog_reads.read_a);
    receipt.catalog_reads.read_b.observed_at = '2026-07-28T12:03:00.000Z';
    bindCatalogRead(receipt.catalog_reads.read_b);
    const failures = validateDisposableTargetBootstrapReceipt(contract, receipt);
    assert.ok(failures.some((failure) => failure.includes('distinct evidence receipt identities')), failures.join('\n'));
    assert.ok(failures.some((failure) => failure.includes('distinct reader identities')), failures.join('\n'));
    assert.ok(failures.some((failure) => failure.includes('distinct execution identities')), failures.join('\n'));
  }
  {
    const receipt = currentReceipt(contract);
    receipt.catalog_reads.read_b.query_model_sha256 = sha('9');
    bindCatalogRead(receipt.catalog_reads.read_b);
    assert.ok(validateDisposableTargetBootstrapReceipt(contract, receipt).some((failure) => failure.includes('same reviewed query model')));
  }
});

test('DISPOSED requires distinct, individually fresh proofs ordered after disposal completion', () => {
  const contract = loadContract();
  const disposed = currentReceipt(contract);
  disposed.rollback.terminal_disposition = 'DISPOSED';
  disposed.rollback.disposal_completion_observed_at = '2026-07-28T12:04:00.000Z';
  disposed.rollback.target_absence_observed_at = '2026-07-28T12:05:00.000Z';
  disposed.rollback.credential_revocation_observed_at = '2026-07-28T12:05:00.000Z';
  disposed.rollback.completion_observed_at = '2026-07-28T12:06:00.000Z';
  disposed.rollback.completion_receipt_sha256 = sha('c');
  disposed.rollback.disposal_authority_receipt_sha256 = sha('a');
  disposed.rollback.disposal_completion_receipt_sha256 = sha('b');
  disposed.rollback.target_absence_evidence_sha256 = sha('d');
  disposed.rollback.credential_revocation_evidence_sha256 = sha('e');
  disposed.rollback.target_absent_after_disposal = true;
  disposed.rollback.credentials_revoked_after_disposal = true;
  bindTerminalProof(disposed);
  assert.deepEqual(validateDisposableTargetBootstrapReceipt(contract, disposed), []);

  disposed.rollback.target_absence_evidence_sha256 = disposed.rollback.disposal_completion_receipt_sha256;
  bindTerminalProof(disposed);
  assert.ok(validateDisposableTargetBootstrapReceipt(contract, disposed).some((failure) => failure.includes('distinct terminal, authority, disposal, absence')));

  disposed.rollback.target_absence_evidence_sha256 = sha('d');
  disposed.rollback.target_absence_observed_at = '2026-07-28T12:03:00.000Z';
  bindTerminalProof(disposed);
  assert.ok(validateDisposableTargetBootstrapReceipt(contract, disposed).some((failure) => failure.includes('target-absence observation must follow disposal completion')));
});

test('CURRENT receipt rejects lifecycle, identity, preimage, Data API, extension, parity, security, external-effect, rollback, and redaction drift', () => {
  const contract = loadContract();
  const cases = [
    ['apply promotion', (receipt) => { receipt.apply_admitted = true; }, 'apply promotion'],
    ['provider authority promotion', (receipt) => { receipt.source_contract_grants_provider_authority = true; }, 'cannot grant provider authority'],
    ['protected target reuse', (receipt) => { receipt.identity.disposable_project_identity_sha256 = receipt.identity.protected_project_identity_sha256s[0]; }, 'protected-project reuse'],
    ['duplicate protected identity', (receipt) => { receipt.identity.protected_project_identity_sha256s[1] = receipt.identity.protected_project_identity_sha256s[0]; }, 'must be unique'],
    ['protected inventory count mismatch', (receipt) => { receipt.identity.protected_project_count = 3; }, 'count must match'],
    ['incomplete protected inventory', (receipt) => { receipt.identity.inventory_complete = false; }, 'complete protected-project inventory digest'],
    ['stale identity', (receipt) => { receipt.identity.observed_at = '2026-07-28T09:00:00.000Z'; }, 'identity is missing, future, or stale'],
    ['future preimage', (receipt) => { receipt.preimage.observed_at = '2026-07-28T12:11:00.000Z'; }, 'preimage is missing, future, or stale'],
    ['UNKNOWN preimage promoted', (receipt) => { receipt.preimage.status = 'UNKNOWN'; }, 'fresh preimage must be CURRENT'],
    ['non-pristine provider ledger', (receipt) => { receipt.preimage.provider_migrations = 1; }, 'provider_migrations must equal 0'],
    ['package digest drift', (receipt) => { receipt.package.migration_package_sha256 = sha('0'); }, 'migration package digest mismatch'],
    ['governance digest drift', (receipt) => { receipt.package.governance_manifest_sha256 = sha('0'); }, 'governance manifest digest mismatch'],
    ['missing executable bundle', (receipt) => { receipt.package.executable_bundle_sha256 = sha('0'); }, 'reviewed executable bundle digest'],
    ['action reordering', (receipt) => { receipt.completed_actions.reverse(); }, 'fixed action order'],
    ['public exposure', (receipt) => { receipt.data_api.exposed_schemas = ['public']; }, 'exposed schemas must be empty'],
    ['missing Data API preimage', (receipt) => { receipt.data_api.control_plane_preimage_sha256 = sha('0'); }, 'control-plane preimage and postimage'],
    ['extension pin claim', (receipt) => { receipt.extensions.units[0].explicit_version_pin_claimed = true; }, 'explicit version pins are not proof'],
    ['missing extension default', (receipt) => { receipt.extensions.units[1].default_version = ''; }, 'observed default version'],
    ['UNKNOWN extension compatibility', (receipt) => { receipt.extensions.units[2].compatibility = 'UNKNOWN'; }, 'compatibility must PASS'],
    ['catalog digest mismatch', (receipt) => { receipt.catalog_reads.read_b.catalog_sha256 = sha('1'); }, 'catalog read digests must be identical'],
    ['catalog count mismatch', (receipt) => { receipt.catalog_reads.read_b.counts.constraints = 280; }, 'catalog read B denominator mismatch'],
    ['catalog reads not sequential', (receipt) => { receipt.catalog_reads.read_b.observed_at = receipt.catalog_reads.read_a.observed_at; }, 'read B must follow read A'],
    ['incomplete security parity', (receipt) => { receipt.security.function_acl_complete = false; }, 'function_acl_complete must be complete'],
    ['UNKNOWN provider role isolation', (receipt) => { receipt.security.provider_role_isolation = 'UNKNOWN'; }, 'provider-role isolation must PASS'],
    ['external network effect', (receipt) => { receipt.external_effects.outbound_network_requests = 1; }, 'outbound_network_requests must equal zero'],
    ['missing negative probe', (receipt) => { receipt.negative_probes.results.pop(); }, 'negative-probe denominator'],
    ['failed negative probe', (receipt) => { receipt.negative_probes.results[0].passed = false; }, 'negative probe must PASS'],
    ['missing rollback authority', (receipt) => { receipt.rollback.authority_receipt_sha256 = sha('0'); }, 'rollback authority_receipt_sha256 is required'],
    ['unproved disposal', (receipt) => { receipt.rollback.terminal_disposition = 'DISPOSED'; }, 'DISPOSED requires disposal authority evidence'],
    ['unsafe terminal disposition', (receipt) => { receipt.rollback.terminal_disposition = 'DROP_ALL'; }, 'unsafe terminal disposition'],
    ['source mutation', (receipt) => { receipt.rollback.source_mutation_count = 1; }, 'source projects must remain active and unmodified'],
    ['broad drop rollback', (receipt) => { receipt.rollback.broad_drop_used = true; }, 'broad drop is not rollback'],
    ['raw project reference', (receipt) => { receipt.project_refs = ['forbidden']; }, 'FORBIDDEN_FIELD_PROJECT_REFS']
  ];

  for (const [name, mutate, expected] of cases) {
    const receipt = currentReceipt(contract);
    mutate(receipt);
    const failures = validateDisposableTargetBootstrapReceipt(contract, receipt);
    assert.ok(failures.some((failure) => failure.includes(expected)), `${name}: ${failures.join('\n')}`);
  }
});

test('contract semantics reject provider/apply promotion and phase ambiguity', () => {
  const mutations = [
    ['provider authority', (contract) => { contract.scope.provider_mutation_authorized = true; }, 'provider_mutation_authorized must remain false'],
    ['apply lifecycle', (contract) => { contract.lifecycle.apply_admitted = true; }, 'lifecycle must remain source-ready'],
    ['bootstrap public exposure', (contract) => { contract.data_api_gate.bootstrap_exposed_schemas = ['public']; }, 'bootstrap Data API containment drift'],
    ['future allowlist expansion', (contract) => { contract.data_api_gate.maximum_future_exposed_schemas.push('public'); }, 'maximum future Data API allowlist drift'],
    ['version pin promotion', (contract) => { contract.extension_gate.explicit_version_pin_is_proof = true; }, 'extension evidence boundary drift'],
    ['unscoped authority operation', (contract) => { contract.authority_gate.authorized_operation = 'UNSCOPED_APPLY'; }, 'apply-authority binding boundary drift'],
    ['catalog independence disabled', (contract) => { contract.catalog_parity.distinct_execution_identities_required = false; }, 'two-read catalog parity drift'],
    ['disposal proof reuse allowed', (contract) => { contract.rollback_and_disposal.disposal_proofs_must_be_distinct = false; }, 'rollback/disposal boundary drift']
  ];
  for (const [name, mutate, expected] of mutations) {
    const contract = loadContract();
    mutate(contract);
    assert.ok(validateDisposableTargetBootstrapContract(contract).some((failure) => failure.includes(expected)), name);
  }
});

test('repository semantics bind migration gate and security exposure phases to the bootstrap contract', () => {
  {
    const documents = loadDocuments();
    documents['contracts/v1/gates/migration-gate-state.json'].required_evidence =
      documents['contracts/v1/gates/migration-gate-state.json'].required_evidence
        .filter((evidence) => !evidence.name.startsWith('disposable target bootstrap source contract:'));
    assert.ok(validateSemantics(documents).some((failure) => failure.includes('target_bootstrap source-contract binding')));
  }
  {
    const documents = loadDocuments();
    documents['contracts/v1/security/rls-grant-function-matrix.json'].schemas
      .find((schema) => schema.name === 'public').data_api = 'exposed';
    assert.ok(validateSemantics(documents).some((failure) => failure.includes('public must remain unexposed during bootstrap')));
  }
});
