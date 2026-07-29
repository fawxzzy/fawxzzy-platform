import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import {
  createValidator,
  loadDocuments,
  repositoryRoot,
  storageEdgeRealtimeComponentDigest,
  storageEdgeRealtimeDataApiProjectionDigest,
  storageEdgeRealtimeExpectedStateDigest,
  storageEdgeRealtimeForwardEvidenceAuthenticationSubject,
  storageEdgeRealtimeOutboundReadDigest,
  storageEdgeRealtimePerSurfaceReceiptSetDigest,
  storageEdgeRealtimeRollbackAuthenticationSubject,
  storageEdgeRealtimeTerminalReceiptDigest,
  storageEdgeRealtimeZeroEffectDigest,
  validateSchemaInstances,
  validateSemantics,
  validateStorageEdgeRealtimeExecutionDenominatorContract,
  validateStorageEdgeRealtimeExecutionDenominatorReceipt
} from '../scripts/lib/contracts.mjs';

const contractPath = `${repositoryRoot}/contracts/v1/rehearsal/storage-edge-realtime-execution-denominator-contract.json`;
const schemaId = 'urn:fawxzzy:platform:schemas:v1:storage-edge-realtime-execution-denominator-contract';
const sha = (character) => character.repeat(64);
const clone = (value) => structuredClone(value);
const trustedContext = Object.freeze({ trusted_action_time: '2026-07-29T05:00:00.000Z' });
const canonicalDigest = (value) => crypto.createHash('sha256').update(`${JSON.stringify(value, null, 2)}\n`).digest('hex');
const signedBytes = (domain, subject) => Buffer.from(`${domain}\n${JSON.stringify(subject, null, 2)}\n`, 'utf8');
const rollbackSigners = Object.freeze([
  {
    policy: 'per_surface',
    authentication: 'per_surface_authentication',
    evidenceClass: 'PER_SURFACE_ROLLBACK',
    keyId: 'test-storage-edge-realtime-per-surface-ed25519-v1',
    privateKey: crypto.createPrivateKey({
      key: Buffer.from(`302e020100300506032b657004220420${'9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60'}`, 'hex'),
      format: 'der',
      type: 'pkcs8'
    })
  },
  {
    policy: 'disposal_absence',
    authentication: 'disposal_absence_authentication',
    evidenceClass: 'DISPOSAL_ABSENCE',
    keyId: 'test-storage-edge-realtime-disposal-absence-ed25519-v1',
    privateKey: crypto.createPrivateKey({
      key: Buffer.from(`302e020100300506032b657004220420${'4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb'}`, 'hex'),
      format: 'der',
      type: 'pkcs8'
    })
  },
  {
    policy: 'credential_revocation',
    authentication: 'credential_revocation_authentication',
    evidenceClass: 'CREDENTIAL_REVOCATION',
    keyId: 'test-storage-edge-realtime-credential-revocation-ed25519-v1',
    privateKey: crypto.createPrivateKey({
      key: Buffer.from(`302e020100300506032b657004220420${'c5aa8df43f9f837bedb7442f31dcb7b166d38535076f094b85ce3a2e0b4458f7'}`, 'hex'),
      format: 'der',
      type: 'pkcs8'
    })
  }
]);

const forwardEvidenceSigner = Object.freeze({
  keyId: 'test-storage-edge-realtime-forward-evidence-ed25519-v1',
  privateKey: crypto.createPrivateKey({
    key: Buffer.from(`302e020100300506032b657004220420${'000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'}`, 'hex'),
    format: 'der',
    type: 'pkcs8'
  })
});

function installTestTrustAnchors(contract) {
  for (const signer of rollbackSigners) {
    const publicKey = crypto.createPublicKey(signer.privateKey).export({ format: 'der', type: 'spki' });
    contract.rollback_authentication[signer.policy].trust_anchor = {
      status: 'CURRENT',
      algorithm: 'Ed25519',
      key_id: signer.keyId,
      verifier_reference: contract.rollback_authentication[signer.policy].trust_anchor.verifier_reference,
      public_key_spki_base64: publicKey.toString('base64'),
      public_key_spki_sha256: crypto.createHash('sha256').update(publicKey).digest('hex')
    };
  }
  const publicKey = crypto.createPublicKey(forwardEvidenceSigner.privateKey).export({ format: 'der', type: 'spki' });
  contract.forward_evidence_authentication.trust_anchor = {
    status: 'CURRENT',
    algorithm: 'Ed25519',
    key_id: forwardEvidenceSigner.keyId,
    verifier_reference: contract.forward_evidence_authentication.trust_anchor.verifier_reference,
    public_key_spki_base64: publicKey.toString('base64'),
    public_key_spki_sha256: crypto.createHash('sha256').update(publicKey).digest('hex')
  };
}

function signForwardEvidence(contract, receipt) {
  const subject = storageEdgeRealtimeForwardEvidenceAuthenticationSubject(receipt);
  const publicKey = crypto.createPublicKey(forwardEvidenceSigner.privateKey).export({ format: 'der', type: 'spki' });
  receipt.forward_evidence_authentication = {
    algorithm: 'Ed25519',
    key_id: forwardEvidenceSigner.keyId,
    public_key_spki_sha256: crypto.createHash('sha256').update(publicKey).digest('hex'),
    signed_payload_sha256: canonicalDigest(subject),
    signature_base64: crypto.sign(
      null,
      signedBytes(contract.forward_evidence_authentication.signature_domain, subject),
      forwardEvidenceSigner.privateKey
    ).toString('base64')
  };
}

function signRollbackEvidence(contract, receipt) {
  for (const signer of rollbackSigners) {
    const subject = storageEdgeRealtimeRollbackAuthenticationSubject(receipt, signer.evidenceClass);
    const publicKey = crypto.createPublicKey(signer.privateKey).export({ format: 'der', type: 'spki' });
    receipt.rollback[signer.authentication] = {
      algorithm: 'Ed25519',
      key_id: signer.keyId,
      public_key_spki_sha256: crypto.createHash('sha256').update(publicKey).digest('hex'),
      signed_payload_sha256: canonicalDigest(subject),
      signature_base64: crypto.sign(null, signedBytes(contract.rollback_authentication[signer.policy].signature_domain, subject), signer.privateKey).toString('base64')
    };
  }
}

function loadContract() {
  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}

function fillRead(read, character, observedAt, count = 0, bytes = 0, inventory = sha('a')) {
  const hexadecimal = '0123456789abcdef';
  const index = hexadecimal.indexOf(character);
  read.status = 'CURRENT';
  read.observed_at = observedAt;
  read.reader_identity_sha256 = sha(character);
  read.execution_identity_sha256 = sha(hexadecimal[(index + 1) % hexadecimal.length]);
  read.evidence_receipt_sha256 = sha(hexadecimal[(index + 2) % hexadecimal.length]);
  if ('object_count' in read) read.object_count = count;
  if ('total_bytes' in read) read.total_bytes = bytes;
  if ('body_inventory_sha256' in read) read.body_inventory_sha256 = inventory;
}

function rebindExpectedStateAndTerminal(receipt) {
  const expectedState = storageEdgeRealtimeExpectedStateDigest(receipt);
  receipt.complete_reads.expected_state_sha256 = expectedState;
  receipt.complete_reads.read_a.aggregate_sha256 = expectedState;
  receipt.complete_reads.read_b.aggregate_sha256 = expectedState;
  receipt.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(receipt);
}

function currentReceipt({ nonzeroStorage = false } = {}) {
  const contract = loadContract();
  const receipt = clone(contract.receipt_example);
  const subject = sha('1');
  const run = sha('2');
  receipt.status = 'CURRENT';
  receipt.validated_at = trustedContext.trusted_action_time;
  receipt.subject_sha256 = subject;
  receipt.run_correlation_sha256 = run;
  receipt.package.bundle_manifest_sha256 = contract.immutable_bindings.promoted_bundle.manifest_sha256;
  receipt.package.query_model_sha256 = contract.immutable_bindings.expected_state_model.query_model_sha256;
  receipt.completed_actions = clone(contract.action_order);

  Object.assign(receipt.bundle_evidence, {
    status: 'CURRENT',
    subject_sha256: subject,
    run_correlation_sha256: run,
    reviewed_at: '2026-07-29T04:57:00.000Z',
    manifest_sha256: contract.immutable_bindings.promoted_bundle.manifest_sha256,
    reviewer_receipt_sha256: sha('3'),
    reviewed_expected_state_receipt_sha256: sha('4'),
    source_artifacts_unchanged: true
  });

  const storage = receipt.storage;
  const objectCount = nonzeroStorage ? 2 : 0;
  const totalBytes = nonzeroStorage ? 4096 : 0;
  Object.assign(storage, {
    status: 'CURRENT',
    subject_sha256: subject,
    run_correlation_sha256: run,
    pagination_complete: true,
    page_count: 1,
    page_exhausted: true,
    pagination_sha256: sha('5'),
    bucket_count: nonzeroStorage ? 1 : 0,
    object_count: objectCount,
    multipart_upload_count: 0,
    total_bytes: totalBytes,
    body_state: nonzeroStorage ? 'NONZERO_COMPLETE' : 'ZERO_COMPLETE',
    bucket_settings_sha256: sha('6'),
    object_metadata_sha256: sha('7'),
    body_inventory_sha256: sha('8')
  });
  fillRead(storage.body_read_a, '9', '2026-07-29T04:58:00.000Z', objectCount, totalBytes, storage.body_inventory_sha256);
  fillRead(storage.body_read_b, 'c', '2026-07-29T04:58:30.000Z', objectCount, totalBytes, storage.body_inventory_sha256);
  storage.aggregate_sha256 = storageEdgeRealtimeComponentDigest(storage);

  const edge = receipt.edge;
  Object.assign(edge, {
    status: 'CURRENT',
    subject_sha256: subject,
    run_correlation_sha256: run,
    pagination_complete: true,
    page_count: 1,
    page_exhausted: true,
    pagination_sha256: sha('f'),
    function_manifest_sha256: sha('1'),
    route_manifest_sha256: sha('2'),
    schedule_manifest_sha256: sha('3'),
    hook_manifest_sha256: sha('4'),
    secret_name_set_sha256: sha('5')
  });
  Object.assign(edge.undeploy, { status: 'CURRENT', receipt_sha256: sha('6'), independently_authenticated: true });
  Object.assign(edge.credential_revocation, { status: 'CURRENT', receipt_sha256: sha('7'), independently_authenticated: true });
  edge.aggregate_sha256 = storageEdgeRealtimeComponentDigest(edge);

  const realtime = receipt.realtime;
  Object.assign(realtime, {
    status: 'CURRENT',
    subject_sha256: subject,
    run_correlation_sha256: run,
    pagination_complete: true,
    page_count: 1,
    page_exhausted: true,
    pagination_sha256: sha('8'),
    service_settings_sha256: sha('9'),
    service_limits_sha256: sha('a'),
    publication_membership_sha256: sha('b'),
    replica_identity_sha256: sha('c'),
    private_schema_security_sha256: sha('d'),
    broadcast_path_manifest_sha256: sha('e'),
    message_replay_disposition_sha256: sha('f')
  });
  Object.assign(realtime.rollback, { status: 'CURRENT', receipt_sha256: sha('1'), independently_authenticated: true });
  realtime.aggregate_sha256 = storageEdgeRealtimeComponentDigest(realtime);

  const outbound = receipt.outbound;
  Object.assign(outbound, {
    status: 'CURRENT',
    subject_sha256: subject,
    run_correlation_sha256: run,
    pagination_complete: true,
    page_count: 1,
    page_exhausted: true,
    pagination_sha256: sha('2')
  });
  outbound.units.forEach((unit, index) => {
    unit.status = 'CURRENT';
    unit.manifest_sha256 = sha((index + 1).toString(16));
  });
  fillRead(outbound.read_a, '3', '2026-07-29T04:58:00.000Z');
  fillRead(outbound.read_b, '6', '2026-07-29T04:58:30.000Z');
  Object.assign(outbound.read_a, { inventory_count: 0, history_count: 0, external_effect_count: 0 });
  Object.assign(outbound.read_b, { inventory_count: 0, history_count: 0, external_effect_count: 0 });
  outbound.read_a.aggregate_sha256 = storageEdgeRealtimeOutboundReadDigest(outbound.units, outbound.read_a);
  outbound.read_b.aggregate_sha256 = storageEdgeRealtimeOutboundReadDigest(outbound.units, outbound.read_b);
  outbound.aggregate_sha256 = storageEdgeRealtimeComponentDigest(outbound);

  const dataApi = receipt.data_api;
  Object.assign(dataApi, { status: 'CURRENT', subject_sha256: subject, run_correlation_sha256: run });
  for (const [projection, character, observedAt] of [
    [dataApi.preimage, 'a', '2026-07-29T04:57:30.000Z'],
    [dataApi.postimage, 'b', '2026-07-29T04:58:30.000Z'],
    [dataApi.rollback, 'c', '2026-07-29T04:59:30.000Z']
  ]) {
    projection.status = 'CURRENT';
    projection.observed_at = observedAt;
    projection.observer_identity_sha256 = sha(character);
    projection.evidence_receipt_sha256 = sha(String.fromCharCode(character.charCodeAt(0) + 3));
    projection.projection_sha256 = storageEdgeRealtimeDataApiProjectionDigest(projection);
  }

  receipt.complete_reads.status = 'CURRENT';
  const expectedState = storageEdgeRealtimeExpectedStateDigest(receipt);
  receipt.complete_reads.expected_state_sha256 = expectedState;
  fillRead(receipt.complete_reads.read_a, 'd', '2026-07-29T04:59:00.000Z');
  fillRead(receipt.complete_reads.read_b, '1', '2026-07-29T04:59:30.000Z');
  for (const read of [receipt.complete_reads.read_a, receipt.complete_reads.read_b]) {
    read.query_model_sha256 = contract.immutable_bindings.expected_state_model.query_model_sha256;
    read.aggregate_sha256 = expectedState;
    read.complete = true;
  }

  Object.assign(receipt.zero_effects, {
    status: 'CURRENT',
    subject_sha256: subject,
    run_correlation_sha256: run,
    observed_at: '2026-07-29T04:59:40.000Z',
    observer_identity_sha256: sha('4'),
    execution_identity_sha256: sha('5'),
    complete_denominator: true
  });
  receipt.zero_effects.evidence_receipt_sha256 = storageEdgeRealtimeZeroEffectDigest(receipt);
  Object.assign(receipt.rollback, {
    status: 'CURRENT',
    subject_sha256: subject,
    run_correlation_sha256: run,
    completed_at: '2026-07-29T04:59:50.000Z',
    preimage_restored: true,
    per_surface_receipt_set_sha256: null,
    disposal_absence_receipt_sha256: sha('6'),
    credential_revocation_receipt_sha256: sha('7'),
    independently_authenticated: true
  });
  receipt.rollback.per_surface_receipt_set_sha256 = storageEdgeRealtimePerSurfaceReceiptSetDigest(receipt);
  signForwardEvidence(contract, receipt);
  signRollbackEvidence(contract, receipt);
  receipt.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(receipt);
  return receipt;
}

test('Storage/Edge/Realtime contract validates as strict source-only evidence', () => {
  const contract = loadContract();
  assert.deepEqual(validateStorageEdgeRealtimeExecutionDenominatorContract(contract), []);
  assert.equal(contract.lifecycle.source_contract, 'SOURCE_READY');
  assert.equal(contract.lifecycle.execution, 'EXECUTION_BLOCKED');
  assert.equal(contract.lifecycle.apply_admitted, false);
  assert.equal(contract.immutable_bindings.migration_count, 122);
  assert.equal(contract.immutable_bindings.standard_migration_sql_count, 0);
});

test('contract and CURRENT aggregate-only receipt satisfy the schema', () => {
  const contract = loadContract();
  installTestTrustAnchors(contract);
  const validator = createValidator().getSchema(schemaId);
  assert.ok(validator);
  assert.equal(validator(contract), true, JSON.stringify(validator.errors));
  const receipt = currentReceipt();
  const receiptValidator = createValidator().getSchema(schemaId);
  const candidate = clone(contract);
  candidate.receipt_example = receipt;
  assert.equal(receiptValidator(candidate), true, JSON.stringify(receiptValidator.errors));
  assert.deepEqual(validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, receipt, trustedContext), []);
});

test('nonempty Storage body denominator is accepted only when both complete reads match', () => {
  const contract = loadContract();
  installTestTrustAnchors(contract);
  const receipt = currentReceipt({ nonzeroStorage: true });
  assert.deepEqual(validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, receipt, trustedContext), []);
  const missingBody = clone(receipt);
  missingBody.storage.body_read_b.object_count = 1;
  missingBody.storage.aggregate_sha256 = storageEdgeRealtimeComponentDigest(missingBody.storage);
  missingBody.complete_reads.expected_state_sha256 = storageEdgeRealtimeExpectedStateDigest(missingBody);
  missingBody.complete_reads.read_a.aggregate_sha256 = missingBody.complete_reads.expected_state_sha256;
  missingBody.complete_reads.read_b.aggregate_sha256 = missingBody.complete_reads.expected_state_sha256;
  missingBody.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(missingBody);
  assert.ok(validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, missingBody, trustedContext).length > 0);
});

test('rollback, disposal-absence, and credential-revocation evidence require three pinned signatures', () => {
  const receipt = currentReceipt();
  const blockedContract = loadContract();
  assert.ok(validateStorageEdgeRealtimeExecutionDenominatorReceipt(blockedContract, receipt, trustedContext).length >= 3);

  const contract = loadContract();
  installTestTrustAnchors(contract);
  assert.deepEqual(validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, receipt, trustedContext), []);

  const crossAnchor = clone(contract);
  const first = crossAnchor.rollback_authentication.per_surface.trust_anchor;
  crossAnchor.rollback_authentication.per_surface.trust_anchor = crossAnchor.rollback_authentication.disposal_absence.trust_anchor;
  crossAnchor.rollback_authentication.disposal_absence.trust_anchor = first;
  assert.ok(validateStorageEdgeRealtimeExecutionDenominatorReceipt(crossAnchor, receipt, trustedContext).length >= 2);

  const rebound = clone(receipt);
  rebound.rollback.credential_revocation_receipt_sha256 = sha('e');
  rebound.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(rebound);
  assert.ok(validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, rebound, trustedContext).some((failure) => failure.includes('CREDENTIAL_REVOCATION')));
});

test('per-surface rollback signature binds the accepted Edge and Realtime inverse receipts', () => {
  const contract = loadContract();
  installTestTrustAnchors(contract);
  for (const mutate of [
    (receipt) => { receipt.edge.undeploy.receipt_sha256 = sha('e'); },
    (receipt) => { receipt.edge.credential_revocation.receipt_sha256 = sha('e'); },
    (receipt) => { receipt.realtime.rollback.receipt_sha256 = sha('e'); }
  ]) {
    const receipt = currentReceipt();
    mutate(receipt);
    receipt.edge.aggregate_sha256 = storageEdgeRealtimeComponentDigest(receipt.edge);
    receipt.realtime.aggregate_sha256 = storageEdgeRealtimeComponentDigest(receipt.realtime);
    rebindExpectedStateAndTerminal(receipt);
    assert.ok(
      validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, receipt, trustedContext)
        .some((failure) => failure.includes('per-surface rollback receipt set'))
    );
  }
});

test('Storage body and outbound read pairs enforce the frozen 1..900 second window', () => {
  const contract = loadContract();
  installTestTrustAnchors(contract);

  for (const observedAt of ['2026-07-29T04:58:00.001Z', '2026-07-29T05:13:00.001Z']) {
    const storageReceipt = currentReceipt();
    storageReceipt.storage.body_read_b.observed_at = observedAt;
    storageReceipt.storage.aggregate_sha256 = storageEdgeRealtimeComponentDigest(storageReceipt.storage);
    rebindExpectedStateAndTerminal(storageReceipt);
    assert.ok(
      validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, storageReceipt, trustedContext)
        .some((failure) => failure.includes('Storage body reads must use'))
    );
  }

  for (const observedAt of ['2026-07-29T04:58:00.001Z', '2026-07-29T05:13:00.001Z']) {
    const outboundReceipt = currentReceipt();
    outboundReceipt.outbound.read_b.observed_at = observedAt;
    outboundReceipt.outbound.read_b.aggregate_sha256 = storageEdgeRealtimeOutboundReadDigest(
      outboundReceipt.outbound.units,
      outboundReceipt.outbound.read_b
    );
    outboundReceipt.outbound.aggregate_sha256 = storageEdgeRealtimeComponentDigest(outboundReceipt.outbound);
    rebindExpectedStateAndTerminal(outboundReceipt);
    assert.ok(
      validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, outboundReceipt, trustedContext)
        .some((failure) => failure.includes('outbound reads must use'))
    );
  }
});

test('rollback completion follows the zero-effect observation in the frozen action order', () => {
  const contract = loadContract();
  installTestTrustAnchors(contract);
  const receipt = currentReceipt();
  receipt.zero_effects.observed_at = '2026-07-29T04:59:55.000Z';
  receipt.zero_effects.evidence_receipt_sha256 = storageEdgeRealtimeZeroEffectDigest(receipt);
  signForwardEvidence(contract, receipt);
  signRollbackEvidence(contract, receipt);
  receipt.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(receipt);
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, receipt, trustedContext)
      .some((failure) => failure.includes('zero-effect observation'))
  );
});

test('authenticated evidence timestamps enforce the cross-phase action chronology', () => {
  const contract = loadContract();
  installTestTrustAnchors(contract);

  const prePostimageRead = currentReceipt();
  prePostimageRead.complete_reads.read_a.observed_at = '2026-07-29T04:58:00.000Z';
  prePostimageRead.complete_reads.read_b.observed_at = '2026-07-29T04:58:01.000Z';
  signForwardEvidence(contract, prePostimageRead);
  prePostimageRead.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(prePostimageRead);
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, prePostimageRead, trustedContext)
      .some((failure) => failure.includes('postimage must strictly precede complete read A'))
  );

  const zeroBeforeReadB = currentReceipt();
  zeroBeforeReadB.zero_effects.observed_at = '2026-07-29T04:59:10.000Z';
  zeroBeforeReadB.zero_effects.evidence_receipt_sha256 = storageEdgeRealtimeZeroEffectDigest(zeroBeforeReadB);
  signForwardEvidence(contract, zeroBeforeReadB);
  zeroBeforeReadB.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(zeroBeforeReadB);
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, zeroBeforeReadB, trustedContext)
      .some((failure) => failure.includes('complete read B must strictly precede'))
  );

  const staleBundleReview = currentReceipt();
  staleBundleReview.bundle_evidence.reviewed_at = '2026-07-29T04:44:59.999Z';
  signForwardEvidence(contract, staleBundleReview);
  staleBundleReview.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(staleBundleReview);
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, staleBundleReview, trustedContext)
      .some((failure) => failure.includes('bundle evidence must be CURRENT, fresh'))
  );
});

test('fully re-signed CURRENT receipts reject equality at every strict cross-phase boundary', () => {
  const contract = loadContract();
  installTestTrustAnchors(contract);

  const reviewEqualsPreimage = currentReceipt();
  reviewEqualsPreimage.bundle_evidence.reviewed_at = reviewEqualsPreimage.data_api.preimage.observed_at;
  signForwardEvidence(contract, reviewEqualsPreimage);
  reviewEqualsPreimage.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(reviewEqualsPreimage);
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, reviewEqualsPreimage, trustedContext)
      .some((failure) => failure.includes('bundle review must strictly precede'))
  );

  const postimageEqualsReadA = currentReceipt();
  postimageEqualsReadA.complete_reads.read_a.observed_at = postimageEqualsReadA.data_api.postimage.observed_at;
  postimageEqualsReadA.complete_reads.read_b.observed_at = '2026-07-29T04:58:31.000Z';
  signForwardEvidence(contract, postimageEqualsReadA);
  postimageEqualsReadA.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(postimageEqualsReadA);
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, postimageEqualsReadA, trustedContext)
      .some((failure) => failure.includes('postimage must strictly precede'))
  );

  const readBEqualsZeroEffect = currentReceipt();
  readBEqualsZeroEffect.zero_effects.observed_at = readBEqualsZeroEffect.complete_reads.read_b.observed_at;
  readBEqualsZeroEffect.zero_effects.evidence_receipt_sha256 = storageEdgeRealtimeZeroEffectDigest(readBEqualsZeroEffect);
  signForwardEvidence(contract, readBEqualsZeroEffect);
  readBEqualsZeroEffect.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(readBEqualsZeroEffect);
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, readBEqualsZeroEffect, trustedContext)
      .some((failure) => failure.includes('read B must strictly precede'))
  );

  const zeroEffectEqualsRollback = currentReceipt();
  zeroEffectEqualsRollback.rollback.completed_at = zeroEffectEqualsRollback.zero_effects.observed_at;
  signRollbackEvidence(contract, zeroEffectEqualsRollback);
  zeroEffectEqualsRollback.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(zeroEffectEqualsRollback);
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, zeroEffectEqualsRollback, trustedContext)
      .some((failure) => failure.includes('rollback completion must follow'))
  );

  assert.deepEqual(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, currentReceipt(), trustedContext),
    []
  );
});

test('pinned forward evidence signature rejects coherent bundle, read, and zero-effect substitution', () => {
  const contract = loadContract();
  installTestTrustAnchors(contract);

  const preimageSubstitution = currentReceipt();
  const originalForwardAuthentication = clone(preimageSubstitution.forward_evidence_authentication);
  preimageSubstitution.data_api.preimage.observed_at = '2026-07-29T04:58:00.000Z';
  preimageSubstitution.data_api.preimage.observer_identity_sha256 = sha('e');
  preimageSubstitution.data_api.preimage.evidence_receipt_sha256 = sha('f');
  preimageSubstitution.data_api.preimage.projection_sha256 = storageEdgeRealtimeDataApiProjectionDigest(
    preimageSubstitution.data_api.preimage
  );
  preimageSubstitution.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(preimageSubstitution);
  assert.deepEqual(preimageSubstitution.forward_evidence_authentication, originalForwardAuthentication);
  assert.notEqual(
    canonicalDigest(storageEdgeRealtimeForwardEvidenceAuthenticationSubject(preimageSubstitution)),
    originalForwardAuthentication.signed_payload_sha256
  );
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, preimageSubstitution, trustedContext)
      .some((failure) => failure.includes('forward bundle-review'))
  );

  const bundleSubstitution = currentReceipt();
  bundleSubstitution.bundle_evidence.reviewer_receipt_sha256 = sha('e');
  rebindExpectedStateAndTerminal(bundleSubstitution);
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, bundleSubstitution, trustedContext)
      .some((failure) => failure.includes('forward bundle-review'))
  );

  const readSubstitution = currentReceipt();
  readSubstitution.complete_reads.read_b.evidence_receipt_sha256 = sha('e');
  readSubstitution.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(readSubstitution);
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, readSubstitution, trustedContext)
      .some((failure) => failure.includes('forward bundle-review'))
  );

  const zeroSubstitution = currentReceipt();
  zeroSubstitution.zero_effects.observer_identity_sha256 = sha('e');
  zeroSubstitution.zero_effects.evidence_receipt_sha256 = storageEdgeRealtimeZeroEffectDigest(zeroSubstitution);
  zeroSubstitution.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(zeroSubstitution);
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, zeroSubstitution, trustedContext)
      .some((failure) => failure.includes('forward bundle-review'))
  );

  const reboundPayload = currentReceipt();
  reboundPayload.bundle_evidence.reviewer_receipt_sha256 = sha('e');
  rebindExpectedStateAndTerminal(reboundPayload);
  reboundPayload.forward_evidence_authentication.signed_payload_sha256 = canonicalDigest(
    storageEdgeRealtimeForwardEvidenceAuthenticationSubject(reboundPayload)
  );
  reboundPayload.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(reboundPayload);
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, reboundPayload, trustedContext)
      .some((failure) => failure.includes('forward bundle-review'))
  );
});

test('forward evidence trust domain rejects wrong signer, identity, and caller receipt material', () => {
  const contract = loadContract();
  installTestTrustAnchors(contract);

  const wrongDomain = currentReceipt();
  wrongDomain.forward_evidence_authentication = clone(wrongDomain.rollback.per_surface_authentication);
  wrongDomain.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(wrongDomain);
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, wrongDomain, trustedContext)
      .some((failure) => failure.includes('forward bundle-review'))
  );

  const wrongIdentity = currentReceipt();
  wrongIdentity.forward_evidence_authentication.key_id = 'caller-selected-forward-evidence-key';
  wrongIdentity.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(wrongIdentity);
  assert.ok(
    validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, wrongIdentity, trustedContext)
      .some((failure) => failure.includes('forward bundle-review'))
  );

  const callerMaterial = currentReceipt();
  callerMaterial.forward_evidence_authentication.public_key_spki_base64 = 'AA==';
  callerMaterial.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(callerMaterial);
  assert.ok(validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, callerMaterial, trustedContext).length > 0);
});

test('CURRENT receipt rejects lifecycle, completeness, parity, zero-effect, rollback, and redaction weakening', () => {
  const contract = loadContract();
  installTestTrustAnchors(contract);
  const mutations = [
    (receipt) => { receipt.completed_actions.pop(); },
    (receipt) => { receipt.completed_actions.reverse(); },
    (receipt) => { receipt.package.bundle_manifest_sha256 = sha('e'); },
    (receipt) => { receipt.storage.pagination_complete = false; },
    (receipt) => { receipt.storage.body_state = 'UNKNOWN'; },
    (receipt) => { receipt.storage.body_read_b.reader_identity_sha256 = receipt.storage.body_read_a.reader_identity_sha256; },
    (receipt) => { receipt.edge.invocation_count = 1; },
    (receipt) => { receipt.edge.secret_values_serialized = true; },
    (receipt) => { receipt.realtime.connected_client_count = 1; },
    (receipt) => { receipt.realtime.replica_identity_count = 1; },
    (receipt) => { receipt.outbound.units.splice(1, 1); },
    (receipt) => { receipt.outbound.units.reverse(); },
    (receipt) => { receipt.outbound.read_b.external_effect_count = 1; },
    (receipt) => { receipt.data_api.raw_response_persisted = true; },
    (receipt) => { receipt.data_api.postimage.exposed_schemas = ['public']; },
    (receipt) => { receipt.complete_reads.read_b.aggregate_sha256 = sha('e'); },
    (receipt) => { receipt.complete_reads.read_b.observed_at = '2026-07-29T04:30:00.000Z'; },
    (receipt) => { receipt.zero_effects.webhook_invocations = 1; },
    (receipt) => { receipt.rollback.preimage_restored = false; },
    (receipt) => { receipt.rollback.credential_revocation_receipt_sha256 = receipt.rollback.disposal_absence_receipt_sha256; },
    (receipt) => { receipt.provider_url = 'https://example.invalid'; },
    (receipt) => { receipt.object_body = 'opaque'; }
  ];
  for (const mutate of mutations) {
    const receipt = currentReceipt();
    mutate(receipt);
    receipt.terminal_receipt_sha256 = storageEdgeRealtimeTerminalReceiptDigest(receipt);
    assert.ok(validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, receipt, trustedContext).length > 0);
  }
  assert.ok(validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, currentReceipt(), null).length > 0);
});

test('canonical BLOCKED receipt rejects every mutated leaf and empty denominator', () => {
  const contract = loadContract();
  const baseline = contract.receipt_example;
  const locations = [];
  const enumerate = (value, path = []) => {
    if (Array.isArray(value)) {
      if (value.length === 0) locations.push(path);
      value.forEach((entry, index) => enumerate(entry, [...path, index]));
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, entry]) => enumerate(entry, [...path, key]));
    } else {
      locations.push(path);
    }
  };
  const mutateLeaf = (value) => {
    if (value === null) return sha('1');
    if (typeof value === 'boolean') return !value;
    if (typeof value === 'number') return value + 1;
    if (typeof value === 'string') return value === 'BLOCKED' ? 'CURRENT' : `${value}_MUTATED`;
    if (Array.isArray(value)) return ['MUTATED'];
    return 'MUTATED';
  };
  enumerate(baseline);
  assert.ok(locations.length > 100);
  for (const location of locations) {
    const receipt = clone(baseline);
    let target = receipt;
    for (const part of location.slice(0, -1)) target = target[part];
    const key = location.at(-1);
    target[key] = mutateLeaf(target[key]);
    assert.ok(validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, receipt).length > 0, location.join('.'));
  }
});

test('binding and migration-gate semantics reject denominator drift', () => {
  const baseline = loadDocuments();
  assert.deepEqual(validateSchemaInstances(baseline, createValidator()), []);
  assert.deepEqual(validateSemantics(baseline), []);
  for (const mutate of [
    (documents) => { documents['contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json'].execution_denominator.apply_admitted = true; },
    (documents) => { documents['contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json'].contract_bindings.documents.pop(); },
    (documents) => { documents['contracts/v1/gates/migration-gate-state.json'].required_evidence = documents['contracts/v1/gates/migration-gate-state.json'].required_evidence.filter((entry) => !entry.name.startsWith('Storage/Edge/Realtime')); },
    (documents) => { documents['contracts/v1/rehearsal/storage-edge-realtime-execution-denominator-contract.json'].scope.provider_connectivity_included = true; }
  ]) {
    const documents = clone(baseline);
    mutate(documents);
    assert.ok(validateSchemaInstances(documents, createValidator()).length > 0 || validateSemantics(documents).length > 0);
  }
});
