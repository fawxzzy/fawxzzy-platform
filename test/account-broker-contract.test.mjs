import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createValidator } from '../scripts/lib/contracts.mjs';
import { accountBrokerContractPath, validateAccountBrokerContract } from '../scripts/lib/account-broker.mjs';

const schemaId = 'urn:fawxzzy:platform:schemas:v1:account-broker-contract';

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8'));
}

function validateSchema(contract) {
  const validator = createValidator().getSchema(schemaId);
  assert.ok(validator, 'account broker schema must be registered');
  return validator(contract) ? [] : validator.errors;
}

test('account broker source contract satisfies schema and semantic validation', () => {
  const contract = loadJson(accountBrokerContractPath);
  assert.deepEqual(validateSchema(contract), []);
  assert.deepEqual(validateAccountBrokerContract(contract), []);
});

test('account broker rejects activation, shared-cookie, fallback, redirect, token, and plaintext regressions', () => {
  const cases = [
    ['provider activation', (contract) => { contract.lifecycle.provider_application = 'CURRENT'; }],
    ['apply admitted', (contract) => { contract.lifecycle.apply_admitted = true; }],
    ['shared refresh cookie', (contract) => { contract.architecture.shared_refresh_cookies = true; }],
    ['source fallback', (contract) => { contract.architecture.source_project_fallback = true; }],
    ['unlisted callback', (contract) => { contract.clients[2].callback_path = '/callback-anywhere'; }],
    ['arbitrary return', (contract) => { contract.start_request.arbitrary_return_urls_allowed = true; }],
    ['weak state', (contract) => { contract.start_request.state_entropy_bits_minimum = 64; }],
    ['weak code', (contract) => { contract.exchange.authorization_code_entropy_bits_minimum = 128; }],
    ['long-lived code', (contract) => { contract.exchange.authorization_code_ttl_seconds = 300; }],
    ['URL session material', (contract) => { contract.exchange.url_session_material_allowed = true; }],
    ['non-atomic consume', (contract) => { contract.exchange.consume = 'best_effort'; }],
    ['pending exchange survives revoked session', (contract) => { contract.exchange.revoked_session_effect = 'preserve_pending_exchange'; }],
    ['missing wrong redirect proof', (contract) => { contract.verification.required_negative_probes[7] = 'SOURCE_TOKEN_REJECTED'; }],
    ['plaintext code', (contract) => { contract.database_contract.relation.plaintext_code_stored = true; }],
    ['Data API exposure', (contract) => { contract.database_contract.relation.data_api_exposed = true; }],
    ['RLS not forced', (contract) => { contract.database_contract.relation.rls_forced = false; }],
    ['recovery redirect drift', (contract) => { contract.recovery.redirect_path = '/auth/callback'; }],
    ['client function grant', (contract) => { contract.database_contract.required_functions[0].execute_grants[0] = 'authenticated'; }],
    ['missing broker function revoke', (contract) => { contract.database_contract.required_functions[0].execute_revoked_from.pop(); }],
    ['custom SMTP gate removed', (contract) => { contract.activation_gates = contract.activation_gates.filter((gate) => gate.gate !== 'custom_smtp_configuration_readback_and_synthetic_delivery_proof'); }],
    ['recovery URL token', (contract) => { contract.recovery.url_tokens_allowed = true; }],
    ['provider error echo', (contract) => { contract.privacy_and_errors.provider_error_text_echoed = true; }]
  ];

  for (const [name, mutate] of cases) {
    const contract = loadJson(accountBrokerContractPath);
    mutate(contract);
    assert.ok(validateSchema(contract).length > 0 || validateAccountBrokerContract(contract).length > 0, name);
  }
});

test('account broker locks platform-wide username and single-template behavior', () => {
  const cases = [
    ['username maximum', (contract) => { contract.identifier_policy.username.maximum_characters = 16; }],
    ['username pattern', (contract) => { contract.identifier_policy.username.ascii_pattern = '^.{2,15}$'; }],
    ['advisory availability promoted', (contract) => { contract.identifier_policy.username.availability_is_advisory = false; }],
    ['username identity matching', (contract) => { contract.identifier_policy.username.username_only_identity_matching_forbidden = false; }],
    ['context becomes authorization', (contract) => { contract.account_template.context_is_authorization = true; }],
    ['duplicate screen family', (contract) => { contract.account_template.single_template_per_surface = false; }],
    ['missing new-password screen', (contract) => { contract.account_template.surfaces.pop(); }]
  ];

  for (const [name, mutate] of cases) {
    const contract = loadJson(accountBrokerContractPath);
    mutate(contract);
    assert.ok(validateSchema(contract).length > 0 || validateAccountBrokerContract(contract).length > 0, name);
  }
});

test('account broker rejects exact-denominator and pair-substitution regressions in both validators', () => {
  const cases = [
    ['duplicate issue function removes consume', (contract) => {
      contract.database_contract.required_functions[1] = structuredClone(contract.database_contract.required_functions[0]);
    }],
    ['function subjects swapped', (contract) => {
      const issueSubject = contract.database_contract.required_functions[0].subject_source;
      contract.database_contract.required_functions[0].subject_source = contract.database_contract.required_functions[1].subject_source;
      contract.database_contract.required_functions[1].subject_source = issueSubject;
    }],
    ['surface paths swapped', (contract) => {
      const signInPath = contract.account_template.surfaces[0].path;
      contract.account_template.surfaces[0].path = contract.account_template.surfaces[1].path;
      contract.account_template.surfaces[1].path = signInPath;
    }],
    ['return-path allowlist widened', (contract) => { contract.clients[0].allowed_return_paths.push('/settings'); }],
    ['context-change denominator truncated', (contract) => { contract.account_template.context_changes.pop(); }],
    ['context invariant denominator truncated', (contract) => { contract.account_template.context_must_not_change.pop(); }],
    ['positive probe substituted', (contract) => { contract.verification.required_positive_probes[0] = 'ARBITRARY_POSITIVE_PROBE'; }],
    ['identity resolution proof omitted', (contract) => { contract.verification.required_positive_probes[3] = 'ARBITRARY_POSITIVE_PROBE'; }],
    ['atomic username claim proof omitted', (contract) => { contract.verification.required_positive_probes[4] = 'ARBITRARY_POSITIVE_PROBE'; }],
    ['global profile and user number allocation proof omitted', (contract) => { contract.verification.required_positive_probes[5] = 'ARBITRARY_POSITIVE_PROBE'; }],
    ['selected-session revocation proof omitted', (contract) => { contract.verification.required_positive_probes[contract.verification.required_positive_probes.indexOf('SELECTED_SESSION_REVOCATION')] = 'ARBITRARY_POSITIVE_PROBE'; }],
    ['PKCE method downgrade proof omitted', (contract) => { contract.verification.required_negative_probes[contract.verification.required_negative_probes.indexOf('PKCE_METHOD_DOWNGRADE_REJECTED')] = 'ARBITRARY_NEGATIVE_PROBE'; }],
    ['identifier non-enumeration proof omitted', (contract) => { contract.verification.required_negative_probes[contract.verification.required_negative_probes.indexOf('IDENTIFIER_NON_ENUMERATION_REJECTED')] = 'ARBITRARY_NEGATIVE_PROBE'; }],
    ['missing or unlisted intent proof omitted', (contract) => { contract.verification.required_negative_probes[contract.verification.required_negative_probes.indexOf('MISSING_OR_UNLISTED_INTENT_REJECTED')] = 'ARBITRARY_NEGATIVE_PROBE'; }],
    ['pending exchange revocation proof omitted', (contract) => { contract.verification.required_negative_probes[contract.verification.required_negative_probes.indexOf('PENDING_EXCHANGE_AFTER_REVOKED_SESSION_REJECTED')] = 'ARBITRARY_NEGATIVE_PROBE'; }],
    ['session material log-sink proof omitted', (contract) => { contract.verification.required_negative_probes[contract.verification.required_negative_probes.indexOf('SESSION_MATERIAL_LOG_SINK_NON_ECHOING')] = 'ARBITRARY_NEGATIVE_PROBE'; }],
    ['short password proof omitted', (contract) => { contract.verification.required_negative_probes[contract.verification.required_negative_probes.indexOf('PASSWORD_SHORT_REJECTED')] = 'ARBITRARY_NEGATIVE_PROBE'; }],
    ['password capacity proof omitted', (contract) => { contract.verification.required_negative_probes[contract.verification.required_negative_probes.indexOf('PASSWORD_CAPACITY_TRUNCATION_REJECTED')] = 'ARBITRARY_NEGATIVE_PROBE'; }],
    ['leaked password proof omitted', (contract) => { contract.verification.required_negative_probes[contract.verification.required_negative_probes.indexOf('LEAKED_PASSWORD_REJECTED')] = 'ARBITRARY_NEGATIVE_PROBE'; }],
    ['signed-in password change proof omitted', (contract) => { contract.verification.required_positive_probes[contract.verification.required_positive_probes.indexOf('SIGNED_IN_PASSWORD_CHANGE_RECENT_AUTH_CURRENT_PASSWORD')] = 'ARBITRARY_POSITIVE_PROBE'; }],
    ['signed-in email change proof omitted', (contract) => { contract.verification.required_positive_probes[contract.verification.required_positive_probes.indexOf('SIGNED_IN_EMAIL_CHANGE_CURRENT_PASSWORD_SECURE_SERVER_ENFORCED')] = 'ARBITRARY_POSITIVE_PROBE'; }],
    ['64-character password acceptance proof omitted', (contract) => { contract.verification.required_positive_probes[contract.verification.required_positive_probes.indexOf('PASSWORD_64_CHARACTER_EXACT_VALUE_ACCEPTED')] = 'ARBITRARY_POSITIVE_PROBE'; }],
    ['failed redemption preservation proof omitted', (contract) => { contract.verification.required_positive_probes[contract.verification.required_positive_probes.indexOf('FAILED_REDEMPTION_PRESERVES_EXCHANGE')] = 'ARBITRARY_POSITIVE_PROBE'; }]
  ];

  for (const [name, mutate] of cases) {
    const contract = loadJson(accountBrokerContractPath);
    mutate(contract);
    assert.ok(validateSchema(contract).length > 0, `${name}: schema must reject`);
    assert.ok(validateAccountBrokerContract(contract).length > 0, `${name}: semantics must reject`);
  }
});

test('account broker validation is deterministic and non-echoing for hostile representations', () => {
  const baseline = loadJson(accountBrokerContractPath);
  assert.deepEqual(validateAccountBrokerContract(baseline), validateAccountBrokerContract(baseline));

  const proxy = new Proxy(baseline, {
    ownKeys() {
      throw new Error('credential-shaped-marker');
    }
  });
  const failures = validateAccountBrokerContract(proxy);
  assert.notEqual(failures.length, 0);
  assert.equal(failures.join('\n').includes('credential-shaped-marker'), false);
});
