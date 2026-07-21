import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createValidator,
  loadDocuments,
  validateAppDataReceiptSanitization,
  validateContracts,
  validateSchemaInstances,
  validateSemantics
} from '../scripts/lib/contracts.mjs';
import { verifyAppDataTransportContracts, verifyFitnessAppDataAdapter, verifyMazerAppDataAdapter } from '../scripts/verify-target-bootstrap.mjs';

test('all versioned contract instances satisfy their schemas and semantics', () => {
  const report = validateContracts();
  assert.deepEqual(report.failures, []);
  assert.equal(report.ok, true);
});

test('contract validation output is deterministic', () => {
  assert.deepEqual(validateContracts(), validateContracts());
  assert.equal(JSON.stringify(validateContracts()), JSON.stringify(validateContracts()));
});

test('shared Auth import rehearsal rejects lifecycle promotion, collision weakening, and raw identity leakage', () => {
  const baseline = loadDocuments();
  for (const mutate of [
    (documents) => { documents['contracts/v1/auth/import-rehearsal-contract.json'].lifecycle.execution = 'CURRENT'; },
    (documents) => { documents['contracts/v1/auth/import-rehearsal-contract.json'].collision_matrix[2].outcome = 'ONE_TARGET_MAPPING'; },
    (documents) => { documents['contracts/v1/auth/import-rehearsal-contract.json'].receipt_boundary.push('raw_identity'); },
    (documents) => { documents['contracts/v1/membership/membership-lifecycle.json'].import_staging.requires_auth_uid_derived_subject = false; }
  ]) {
    const documents = structuredClone(baseline);
    mutate(documents);
    assert.ok(validateSchemaInstances(documents, createValidator()).length > 0 || validateSemantics(documents).length > 0);
  }
});

test('activation request schema rejects a caller-selected subject', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/activation/activation-request.example.json'].user_id = '00000000-0000-4000-8000-000000000003';
  const failures = validateSchemaInstances(documents, createValidator());
  assert.ok(failures.some((failure) => failure.includes('activation-request.example.json')));
});

test('activation receipt accepts exactly the three coherent combinations', () => {
  const baseline = loadDocuments();
  const admitted = [
    ['ACTIVATED', 'active', 'CREATED'],
    ['REUSED', 'active', 'REUSED'],
    ['REJECTED_SUSPENDED', 'suspended', 'PRESERVED']
  ];
  for (const [outcome, membershipState, productProfileAction] of admitted) {
    const documents = structuredClone(baseline);
    const receipt = documents['contracts/v1/activation/activation-receipt.example.json'];
    receipt.outcome = outcome;
    receipt.membership_state = membershipState;
    receipt.product_profile_action = productProfileAction;
    assert.deepEqual(validateSchemaInstances(documents, createValidator()), [], `${outcome} schema`);
    assert.deepEqual(validateSemantics(documents), [], `${outcome} semantics`);
  }
});

test('activation receipt rejects every contradictory combination', () => {
  const baseline = loadDocuments();
  const outcomes = ['ACTIVATED', 'REUSED', 'REJECTED_SUSPENDED'];
  const membershipStates = ['active', 'suspended'];
  const productProfileActions = ['CREATED', 'REUSED', 'PRESERVED'];
  const admitted = new Set([
    'ACTIVATED|active|CREATED',
    'REUSED|active|REUSED',
    'REJECTED_SUSPENDED|suspended|PRESERVED'
  ]);
  let rejectedActiveCreatedObserved = false;

  for (const outcome of outcomes) {
    for (const membershipState of membershipStates) {
      for (const productProfileAction of productProfileActions) {
        const combination = [outcome, membershipState, productProfileAction].join('|');
        if (admitted.has(combination)) continue;
        const documents = structuredClone(baseline);
        const receipt = documents['contracts/v1/activation/activation-receipt.example.json'];
        receipt.outcome = outcome;
        receipt.membership_state = membershipState;
        receipt.product_profile_action = productProfileAction;
        const schemaFailures = validateSchemaInstances(documents, createValidator());
        const semanticFailures = validateSemantics(documents);
        assert.ok(schemaFailures.some((failure) => failure.includes('activation-receipt.example.json')), `${combination} schema`);
        assert.ok(semanticFailures.some((failure) => failure.includes(`activation receipt combination is not admitted: ${combination}`)), `${combination} semantics`);
        if (combination === 'REJECTED_SUSPENDED|active|CREATED') rejectedActiveCreatedObserved = true;
      }
    }
  }

  assert.equal(rejectedActiveCreatedObserved, true);
});

test('membership lifecycle admits the exact seven-transition set', () => {
  const documents = loadDocuments();
  const lifecycle = documents['contracts/v1/membership/membership-lifecycle.json'];
  assert.equal(lifecycle.transitions.length, 7);
  assert.equal(new Set(lifecycle.transitions.map((transition) => JSON.stringify(transition))).size, 7);
  assert.deepEqual(validateSchemaInstances(documents, createValidator()), []);
  assert.deepEqual(validateSemantics(documents), []);
});

test('membership lifecycle rejects removal of suspend or controlled reinstatement', () => {
  const baseline = loadDocuments();
  for (const event of ['suspend', 'controlled_reinstate']) {
    const documents = structuredClone(baseline);
    const lifecycle = documents['contracts/v1/membership/membership-lifecycle.json'];
    lifecycle.transitions = lifecycle.transitions.filter((transition) => transition.event !== event);
    assert.ok(validateSchemaInstances(documents, createValidator()).some((failure) => failure.includes('membership-lifecycle.json')), `${event} schema`);
    assert.ok(validateSemantics(documents).some((failure) => failure.includes('membership lifecycle exact transition set changed')), `${event} semantics`);
  }
});

test('membership lifecycle rejects contradictory suspended self-activation', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/membership/membership-lifecycle.json'].transitions.push({
    from: 'suspended',
    event: 'authenticated_first_visit',
    to: 'active',
    result: 'ACTIVATED',
    profile_effect: 'REUSE',
    authorization: 'authenticated_self'
  });
  assert.ok(validateSchemaInstances(documents, createValidator()).some((failure) => failure.includes('membership-lifecycle.json')));
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('membership lifecycle exact transition set changed')));
  assert.ok(failures.some((failure) => failure.includes('suspended membership must never self-activate')));
});

test('membership lifecycle rejects duplicate transitions', () => {
  const documents = structuredClone(loadDocuments());
  const lifecycle = documents['contracts/v1/membership/membership-lifecycle.json'];
  lifecycle.transitions.pop();
  lifecycle.transitions.push(structuredClone(lifecycle.transitions[0]));
  assert.ok(validateSchemaInstances(documents, createValidator()).some((failure) => failure.includes('membership-lifecycle.json')));
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('membership lifecycle exact transition set changed')));
  assert.ok(failures.some((failure) => failure.includes('membership lifecycle transitions must be unique')));
});

test('service-membership v1.1.0 rejects closed identity, lifecycle, service, number, and RLS drift', () => {
  const baseline = loadDocuments();
  const cases = [
    ['wrong Fitness profile relation', (documents) => {
      documents['contracts/v1/catalog/service-catalog.json'].services.find((service) => service.id === 'fitness').product_profile = 'fitness.user_profiles';
    }],
    ['DiscordOS human activation', (documents) => {
      const discordos = documents['contracts/v1/catalog/service-catalog.json'].services.find((service) => service.id === 'discordos');
      discordos.activation_mode = 'authenticated_first_visit';
      discordos.product_profile = 'discordos.user_profiles';
    }],
    ['Mazer generic entitlement', (documents) => {
      documents['contracts/v1/catalog/service-catalog.json'].services.find((service) => service.id === 'mazer').entitlement_contract = 'mazer.entitlements';
    }],
    ['mutable membership key', (documents) => {
      documents['contracts/v1/membership/membership-lifecycle.json'].immutable_key = ['service_id', 'user_id'];
    }],
    ['caller supplied activation subject', (documents) => {
      documents['contracts/v1/membership/membership-lifecycle.json'].activation.caller_supplied_user_id_allowed = true;
    }],
    ['Fitness number reallocation', (documents) => {
      documents['contracts/v1/catalog/service-catalog.json'].services.find((service) => service.id === 'fitness').member_number_contract.never_reused = false;
    }],
    ['hard delete', (documents) => {
      documents['contracts/v1/membership/membership-lifecycle.json'].hard_delete = 'ALLOWED';
    }],
    ['grant without forced RLS', (documents) => {
      documents['contracts/v1/security/rls-grant-function-matrix.json'].relations.find((relation) => relation.name === 'fitness.profiles').rls_forced = false;
    }]
  ];

  for (const [name, mutate] of cases) {
    const documents = structuredClone(baseline);
    mutate(documents);
    assert.ok(validateSchemaInstances(documents, createValidator()).length > 0 || validateSemantics(documents).length > 0, name);
  }
});

test('service-membership v1.1.0 rejects username-only linking and direct membership writes', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/identity/identity-map.json'].username_contract.identity_matching.username_alone_forbidden = false;
  documents['contracts/v1/security/rls-grant-function-matrix.json'].relations.find((relation) => relation.name === 'platform_shared.user_service_memberships').grants.authenticated.push('INSERT');
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('username-only identity matching must remain forbidden')));
  assert.ok(failures.some((failure) => failure.includes('memberships must not grant client writes')));
});

test('service catalog rejects cross-product profile and entitlement swaps', () => {
  const baseline = loadDocuments();
  for (const [field, semanticMessage] of [
    ['product_profile', 'fitness product profile relation must remain fitness.profiles'],
    ['entitlement_contract', 'fitness entitlement relation must remain fitness.user_entitlements']
  ]) {
    const documents = structuredClone(baseline);
    const fitness = documents['contracts/v1/catalog/service-catalog.json'].services.find((service) => service.id === 'fitness');
    fitness[field] = field === 'product_profile' ? 'mazer.mazer_profiles' : 'mazer.user_entitlements';
    assert.ok(validateSchemaInstances(documents, createValidator()).some((failure) => failure.includes('service-catalog.json')), `${field} schema`);
    assert.ok(validateSemantics(documents).some((failure) => failure.includes(semanticMessage)), `${field} semantics`);
  }
});

test('service catalog rejects undeclared owning-schema relations', () => {
  const documents = structuredClone(loadDocuments());
  const fitness = documents['contracts/v1/catalog/service-catalog.json'].services.find((service) => service.id === 'fitness');
  fitness.product_profile = 'fitness.alternate_profiles';
  fitness.entitlement_contract = 'fitness.alternate_entitlements';
  assert.ok(validateSchemaInstances(documents, createValidator()).some((failure) => failure.includes('service-catalog.json')));
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('fitness product profile relation must remain fitness.profiles')));
  assert.ok(failures.some((failure) => failure.includes('fitness entitlement relation must remain fitness.user_entitlements')));
});

test('project registry rejects target and source role reversal', () => {
  const documents = structuredClone(loadDocuments());
  const registry = documents['contracts/v1/registry/project-registry.json'];
  registry.target.role = 'source';
  for (const source of registry.sources) source.role = 'target';
  assert.ok(validateSchemaInstances(documents, createValidator()).some((failure) => failure.includes('project-registry.json')));
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('target position must retain role target')));
  assert.ok(failures.some((failure) => failure.includes('source positions must retain role source')));
});

test('semantic checks reject an unblocked migration operation', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/gates/migration-gate-state.json'].operation_gates[0].status = 'CURRENT';
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('every operation must remain BLOCKED')));
});

test('Fitness PR 108 gate rejects identity substitution and lifecycle promotion', () => {
  const documents = structuredClone(loadDocuments());
  const gate = documents['contracts/v1/gates/fitness-pr108-replay-gate.json'];
  gate.fitness_candidate.head_commit = '0'.repeat(40);
  gate.lifecycle.candidate_source_review = 'CURRENT';
  gate.lifecycle.target_apply = 'CURRENT';
  const schemaFailures = validateSchemaInstances(documents, createValidator());
  assert.ok(schemaFailures.some((failure) => failure.includes('fitness-pr108-replay-gate.json')));
  const semanticFailures = validateSemantics(documents);
  assert.ok(semanticFailures.some((failure) => failure.includes('candidate_source_review must remain BLOCKED')));
  assert.ok(semanticFailures.some((failure) => failure.includes('target_apply must remain BLOCKED')));
});

test('Fitness PR 108 gate rejects missing immutable candidate evidence', () => {
  const documents = structuredClone(loadDocuments());
  delete documents['contracts/v1/gates/fitness-pr108-replay-gate.json'].fitness_candidate.candidate_migration.blob;
  assert.ok(validateSchemaInstances(documents, createValidator()).some((failure) => failure.includes('fitness-pr108-replay-gate.json')));
});

test('semantic checks reject unsafe definer functions', () => {
  const documents = structuredClone(loadDocuments());
  const databaseFunction = documents['contracts/v1/security/rls-grant-function-matrix.json'].functions[0];
  databaseFunction.auth_uid_check = false;
  databaseFunction.fixed_search_path = 'public';
  databaseFunction.execute_revoked_from = [];
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('must derive and check auth.uid()')));
  assert.ok(failures.some((failure) => failure.includes('search_path must be fixed to empty')));
  assert.ok(failures.some((failure) => failure.includes('PUBLIC execute must be revoked')));
  assert.ok(failures.some((failure) => failure.includes('exact function contract changed')));
});

test('Auth insert trigger derives its subject from NEW.id without auth.uid()', () => {
  const documents = structuredClone(loadDocuments());
  const authTrigger = documents['contracts/v1/security/rls-grant-function-matrix.json'].functions[1];
  authTrigger.auth_uid_check = true;
  authTrigger.subject_source = 'auth.uid()';
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('NEW.id without auth.uid()')));
  assert.ok(failures.some((failure) => failure.includes('exact function contract changed')));
});

test('closed-world relation validation rejects an extra permissive policy', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/security/rls-grant-function-matrix.json'].relations[0].policies.push({
    name: 'unsafe read all authenticated profiles',
    command: 'SELECT',
    role: 'authenticated',
    using: 'true',
    with_check: null
  });
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('exact grants and complete admitted policy set changed')));
});

test('product-profile policies reject tautological membership predicates', () => {
  const documents = structuredClone(loadDocuments());
  const relation = documents['contracts/v1/security/rls-grant-function-matrix.json'].relations.find((candidate) => candidate.name === 'fitness.profiles');
  relation.policies[0].using = relation.policies[0].using.replace('m.user_id = (select auth.uid())', 'm.user_id = user_id');
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('membership row must bind directly to auth.uid()')));
  assert.ok(failures.some((failure) => failure.includes('unqualified membership user predicate is tautological and forbidden')));
});

test('product-profile policies reject access without membership', () => {
  const documents = structuredClone(loadDocuments());
  const relation = documents['contracts/v1/security/rls-grant-function-matrix.json'].relations.find((candidate) => candidate.name === 'fitness.profiles');
  relation.policies[0].using = '(select auth.uid()) = id';
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('product-profile access must require its service membership')));
  assert.ok(failures.some((failure) => failure.includes('membership row must bind directly to auth.uid()')));
});

test('product-profile policies preserve each source relation owner key', () => {
  const baseline = loadDocuments();
  for (const [relationName, admittedOwnerPredicate, rejectedOwnerPredicate] of [
    ['fitness.profiles', '(select auth.uid()) = id', '(select auth.uid()) = user_id'],
    ['mazer.mazer_profiles', '(select auth.uid()) = user_id', '(select auth.uid()) = id']
  ]) {
    const documents = structuredClone(baseline);
    const relation = documents['contracts/v1/security/rls-grant-function-matrix.json'].relations.find((candidate) => candidate.name === relationName);
    for (const policy of relation.policies) {
      if (policy.using) policy.using = policy.using.replace(admittedOwnerPredicate, rejectedOwnerPredicate);
      if (policy.with_check) policy.with_check = policy.with_check.replace(admittedOwnerPredicate, rejectedOwnerPredicate);
    }
    const failures = validateSemantics(documents);
    assert.ok(failures.some((failure) => failure.includes(`owner predicate must remain ${admittedOwnerPredicate}`)), relationName);
    assert.ok(failures.some((failure) => failure.includes('exact grants and complete admitted policy set changed')), relationName);
  }
});

test('product-profile policies reject suspended membership access', () => {
  const documents = structuredClone(loadDocuments());
  const relation = documents['contracts/v1/security/rls-grant-function-matrix.json'].relations.find((candidate) => candidate.name === 'mazer.mazer_profiles');
  relation.policies[1].using = relation.policies[1].using.replace("m.state = 'active'", "m.state = 'suspended'");
  relation.policies[1].with_check = relation.policies[1].with_check.replace("m.state = 'active'", "m.state = 'suspended'");
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('product-profile access must require active membership only')));
});

test('global profile rejects relation-wide authenticated UPDATE', () => {
  const documents = structuredClone(loadDocuments());
  const relation = documents['contracts/v1/security/rls-grant-function-matrix.json'].relations.find((candidate) => candidate.name === 'platform_shared.global_profiles');
  relation.grants.authenticated.push('UPDATE');
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('relation-wide authenticated UPDATE is forbidden')));
});

test('global profile rejects column grants for every immutable or server-owned field', () => {
  const baseline = loadDocuments();
  const protectedColumns = baseline['contracts/v1/security/rls-grant-function-matrix.json'].relations.find((candidate) => candidate.name === 'platform_shared.global_profiles').server_owned_columns;
  for (const protectedColumn of protectedColumns) {
    const documents = structuredClone(baseline);
    const relation = documents['contracts/v1/security/rls-grant-function-matrix.json'].relations.find((candidate) => candidate.name === 'platform_shared.global_profiles');
    relation.authenticated_update_columns.push(protectedColumn);
    const failures = validateSemantics(documents);
    assert.ok(failures.some((failure) => failure.includes('immutable or server-owned columns cannot receive authenticated UPDATE')), protectedColumn);
  }
});

test('closed-world function validation rejects a third privileged function', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/security/rls-grant-function-matrix.json'].functions.push({
    name: 'platform_private.on_auth_user_created',
    security: 'DEFINER',
    exposure: 'trigger_only',
    fixed_search_path: '',
    auth_uid_check: false,
    subject_source: 'NEW.id',
    user_id_argument_allowed: false,
    execute_grants: [],
    execute_revoked_from: ['PUBLIC', 'anon', 'authenticated', 'service_role'],
    atomic_relations: ['platform_shared.global_profiles']
  });
  const semanticFailures = validateSemantics(documents);
  assert.ok(semanticFailures.some((failure) => failure.includes('function count changed')));
  const schemaFailures = validateSchemaInstances(documents, createValidator());
  assert.ok(schemaFailures.some((failure) => failure.includes('rls-grant-function-matrix.json')));
});

test('semantic checks reject editable metadata authorization', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/security/rls-grant-function-matrix.json'].relations[0].policies[0].using = "auth.jwt() -> 'user_metadata' ->> 'admin' = 'true'";
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('editable metadata authorization is forbidden')));
});

test('semantic checks reject product relations in public', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/security/rls-grant-function-matrix.json'].relations[0].name = 'public.user_profiles';
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('no public relations')));
});

test('semantic checks reject undeclared authorization helpers', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/security/rls-grant-function-matrix.json'].relations[0].policies[0].using = 'has_admin_access((select auth.uid()))';
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('undeclared authorization helper')));
});

test('semantic checks reject production redirect wildcards', () => {
  const documents = structuredClone(loadDocuments());
  documents['contracts/v1/auth/domain-session-contract.json'].auth_configuration.exact_redirect_urls[0] = 'https://*.fawxzzy.com/auth/callback';
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('must be exact')));
});

test('password policy rejects restrictive caps and truncation', () => {
  const documents = structuredClone(loadDocuments());
  const capacity = documents['contracts/v1/auth/domain-session-contract.json'].auth_policy.password_length.capacity;
  capacity.restrictive_app_cap_allowed = true;
  capacity.minimum_supported_characters = 20;
  capacity.never_truncate = false;
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('restrictive application password caps are forbidden')));
  assert.ok(failures.some((failure) => failure.includes('support at least 64 characters')));
  assert.ok(failures.some((failure) => failure.includes('password truncation is forbidden')));
});

test('domain session contract v1.1.0 rejects the exact 24 security session policy drifts through schema and semantics without throwing', () => {
  const contractPath = 'contracts/v1/auth/domain-session-contract.json';
  const cases = [
    ['01 obsolete recovery route', [
      (domain) => { domain.auth_configuration.exact_recovery_url = 'https://account.fawxzzy.com/auth/recovery'; }
    ]],
    ['02 recovery route absent or reordered in allowlist', [
      (domain) => { domain.auth_configuration.exact_redirect_urls = domain.auth_configuration.exact_redirect_urls.filter((url) => !url.includes('reset-password')); },
      (domain) => domain.auth_configuration.exact_redirect_urls.reverse()
    ]],
    ['03 wildcard or localhost production URL', [
      (domain) => { domain.auth_configuration.exact_redirect_urls[0] = 'https://*.fawxzzy.com/auth/callback'; },
      (domain) => { domain.auth_configuration.site_url = 'http://localhost:3000'; }
    ]],
    ['04 missing or substituted FP-MAN-012 decision', [
      (domain) => { delete domain.security_session_decision_id; },
      (domain) => { domain.security_session_decision_id = 'FP-MAN-002'; }
    ]],
    ['05 recent authentication disabled', [
      (domain) => { domain.auth_policy.account_change_security.recent_authentication_for_password_changes = 'BLOCKED'; }
    ]],
    ['06 current-password protection disabled', [
      (domain) => { domain.auth_policy.account_change_security.current_password_for_signed_in_password_changes = 'BLOCKED'; },
      (domain) => { domain.auth_policy.account_change_security.current_password_for_signed_in_email_changes = 'BLOCKED'; }
    ]],
    ['07 secure email change disabled or native capability promoted', [
      (domain) => { domain.auth_policy.account_change_security.secure_email_change = 'BLOCKED'; },
      (domain) => { domain.auth_policy.account_change_security.native_hosted_current_password_for_email_change = 'CURRENT'; }
    ]],
    ['08 CAPTCHA absent or disabled', [
      (domain) => { delete domain.auth_policy.captcha; },
      (domain) => { domain.auth_policy.captcha.status = 'BLOCKED'; }
    ]],
    ['09 CAPTCHA provider invented', [
      (domain) => { domain.auth_policy.captcha.provider_class = 'turnstile'; }
    ]],
    ['10 CAPTCHA bypass allowlist invented', [
      (domain) => domain.auth_policy.captcha.bypass_allowlist.push('migration')
    ]],
    ['11 product UI exposes a method beyond email password', [
      (domain) => domain.auth_policy.product_visible_sign_in_methods.push('magic_link')
    ]],
    ['12 magic-link or OTP provider capability promoted', [
      (domain) => { domain.auth_policy.passwordless_email.provider_toggle = 'CURRENT'; }
    ]],
    ['13 TOTP unavailable or enforced', [
      (domain) => { domain.auth_policy.mfa.totp.available = false; },
      (domain) => { domain.auth_policy.mfa.totp.enforced = true; }
    ]],
    ['14 SMS MFA or passkeys promoted', [
      (domain) => { domain.auth_policy.mfa.sms.status = 'CURRENT'; },
      (domain) => { domain.auth_policy.mfa.passkeys.status = 'CURRENT'; }
    ]],
    ['15 AAL1 maximum age changed', [
      (domain) => { domain.auth_policy.mfa.aal1_maximum_age_seconds = 901; }
    ]],
    ['16 absolute session lifetime changed', [
      (domain) => { domain.session_model.absolute_lifetime_seconds = 2591999; }
    ]],
    ['17 inactivity timeout changed', [
      (domain) => { domain.session_model.inactivity_timeout_seconds = 604799; }
    ]],
    ['18 multiple-device and single-session policy contradicted', [
      (domain) => { domain.session_model.multiple_devices_allowed = false; },
      (domain) => { domain.session_model.single_session_enforcement = true; }
    ]],
    ['19 refresh compromise detection rotation or reuse policy weakened', [
      (domain) => { domain.session_model.refresh_tokens.compromise_detection = false; },
      (domain) => { domain.session_model.refresh_tokens.rotation = false; },
      (domain) => { domain.session_model.refresh_tokens.reuse_interval_seconds = 11; }
    ]],
    ['20 manual client identity linking enabled', [
      (domain) => { domain.auth_policy.identity_linking.manual_client_linking = true; }
    ]],
    ['21 privileged linking lacks evidence or permits username-only matching', [
      (domain) => { domain.auth_policy.identity_linking.privileged_reconciliation.verified_deterministic_identity_evidence = false; },
      (domain) => { domain.auth_policy.identity_linking.privileged_reconciliation.username_only_matching_forbidden = false; }
    ]],
    ['22 JWT state promoted or secret material supplied', [
      (domain) => { domain.auth_policy.jwt.expiry_seconds = 3600; },
      (domain) => { domain.auth_policy.jwt.signing_key_class = 'asymmetric'; },
      (domain) => { domain.auth_policy.jwt.secret = 'not-a-real-secret'; }
    ]],
    ['23 provider application gate promoted or weakened', [
      (domain) => { domain.provider_application_gate.status = 'CURRENT'; },
      (domain) => { domain.provider_application_gate.apply_admitted = true; },
      (domain) => domain.provider_application_gate.requirements.pop()
    ]],
    ['24 preserved password verification SMTP session cookie or URL-token protections regressed', [
      (domain) => { domain.auth_policy.password_length.minimum.value = 6; },
      (domain) => { domain.auth_policy.password_length.capacity.restrictive_app_cap_allowed = true; },
      (domain) => { domain.auth_policy.email_verification = true; },
      (domain) => { domain.smtp.credentials_present = true; },
      (domain) => { domain.session_model.browser_sessions = 'shared_domain'; },
      (domain) => { domain.session_model.cross_origin_sso.forbidden_mechanisms = ['url_tokens']; }
    ]]
  ];

  assert.equal(cases.length, 24);
  for (const [name, variants] of cases) {
    for (const [variantIndex, mutate] of variants.entries()) {
      const documents = structuredClone(loadDocuments());
      mutate(documents[contractPath]);
      const schemaFailures = validateSchemaInstances(documents, createValidator());
      assert.ok(schemaFailures.some((failure) => failure.includes(contractPath)), `${name}, schema variant ${variantIndex + 1}`);
      let semanticFailures;
      assert.doesNotThrow(() => { semanticFailures = validateSemantics(documents); }, `${name}, semantic variant ${variantIndex + 1}`);
      assert.notEqual(semanticFailures.length, 0, `${name}, semantic variant ${variantIndex + 1}`);
    }
  }
});

test('identity policy rejects username-only matching and write-gate drift', () => {
  const documents = structuredClone(loadDocuments());
  const identity = documents['contracts/v1/identity/identity-map.json'];
  identity.username_contract.identity_matching.username_alone_forbidden = false;
  identity.username_contract.backfill_status = 'CURRENT';
  identity.user_number_contract.non_fitness_backfill.status = 'CURRENT';
  identity.cleanup_contract.destructive_cleanup_status = 'CURRENT';
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('username-only identity matching must remain forbidden')));
  assert.ok(failures.some((failure) => failure.includes('username backfill writes must remain BLOCKED')));
  assert.ok(failures.some((failure) => failure.includes('legacy user_number backfill writes must remain BLOCKED')));
  assert.ok(failures.some((failure) => failure.includes('destructive cleanup must remain BLOCKED')));
});

test('provider-canonical provenance rejects digest drift, path substitution, and executable promotion', () => {
  const digestDrift = structuredClone(loadDocuments());
  digestDrift['contracts/v1/gates/migration-gate-state.json'].provider_canonical_provenance.combined_provenance_sha256 = '0'.repeat(64);
  assert.ok(validateSemantics(digestDrift).some((failure) => failure.includes('combined provenance digest drift')));

  const substituted = structuredClone(loadDocuments());
  substituted['contracts/v1/gates/migration-gate-state.json'].provider_canonical_provenance.effect_mappings[0].accepted_path = 'supabase/migrations/20260709045557_progression_v1.sql';
  assert.ok(validateSemantics(substituted).some((failure) => failure.includes('effect mapping digest drift')));

  const promoted = structuredClone(loadDocuments());
  promoted['contracts/v1/gates/migration-gate-state.json'].provider_canonical_provenance.apply_admitted = true;
  assert.ok(validateSchemaInstances(promoted, createValidator()).some((failure) => failure.includes('migration-gate-state.json')));
  assert.ok(validateSemantics(promoted).some((failure) => failure.includes('non-executable')));
});

test('global user_number invariants reject reuse or renumbering', () => {
  const documents = structuredClone(loadDocuments());
  const numbering = documents['contracts/v1/identity/identity-map.json'].user_number_contract;
  numbering.monotonic = false;
  numbering.never_reused = false;
  numbering.never_renumbered = false;
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('monotonic, never reused, and never renumbered')));
});

test('manual decision bindings separate verified identity from legacy numbering', () => {
  const baseline = loadDocuments();
  const identity = baseline['contracts/v1/identity/identity-map.json'];
  assert.equal(identity.username_contract.identity_matching.decision_id, 'FP-MAN-007');
  assert.equal(identity.user_number_contract.decision_id, 'FP-MAN-009');
  assert.equal(identity.user_number_contract.non_fitness_backfill.decision_id, 'FP-MAN-009');

  const documents = structuredClone(baseline);
  documents['contracts/v1/identity/identity-map.json'].user_number_contract.decision_id = 'FP-MAN-007';
  assert.ok(validateSchemaInstances(documents, createValidator()).some((failure) => failure.includes('identity-map.json')));
  assert.ok(validateSemantics(documents).some((failure) => failure.includes('legacy user_number allocation and ordering must remain bound to FP-MAN-009')));

  const identityDrift = structuredClone(baseline);
  identityDrift['contracts/v1/identity/identity-map.json'].username_contract.identity_matching.decision_id = 'FP-MAN-009';
  assert.ok(validateSchemaInstances(identityDrift, createValidator()).some((failure) => failure.includes('identity-map.json')));
  assert.ok(validateSemantics(identityDrift).some((failure) => failure.includes('verified identity matching must remain bound to FP-MAN-007')));
});

test('app data transport contracts are closed, source-ready, and execution-blocked', () => {
  const documents = loadDocuments();
  assert.deepEqual(validateSchemaInstances(documents, createValidator()), []);
  assert.deepEqual(validateSemantics(documents), []);

  const unknown = structuredClone(documents);
  unknown['contracts/v1/transport/app-data-transport-contract.json'].undeclared_adapter = {};
  assert.ok(validateSchemaInstances(unknown, createValidator()).some((failure) => failure.includes('app-data-transport-contract.json')));

  const malformed = structuredClone(documents);
  malformed['contracts/v1/transport/app-data-receipt.example.json'].cache_and_effects.derived_cache_action = 'REBUILD_NOW';
  assert.ok(validateSchemaInstances(malformed, createValidator()).some((failure) => failure.includes('app-data-receipt.example.json')));
});

test('app data transport enforces complete S0/S1/S2 comparisons and explicit mutation classes', () => {
  const baseline = loadDocuments();
  const cases = [
    [(contract) => { contract.snapshot_protocol.required_snapshots = ['S0', 'S1']; }, 'snapshot denominator'],
    [(contract) => { contract.snapshot_protocol.complete_primary_key_set_comparison = false; }, 'snapshot denominator'],
    [(contract) => { contract.snapshot_protocol.canonical_row_digest_comparison = false; }, 'snapshot denominator'],
    [(contract) => { contract.snapshot_protocol.accelerators_replace_complete_comparison = true; }, 'snapshot denominator'],
    [(contract) => { contract.snapshot_protocol.S2_final_diff_required_after_write_barrier = false; }, 'snapshot denominator'],
    [(contract) => { contract.snapshot_protocol.S1_diff_classes = ['INSERT', 'UPDATE', 'DELETE']; }, 'diff classes'],
    [(contract) => { contract.mutation_model.deletes_require_explicit_tombstones = false; }, 'tombstone'],
    [(contract) => { contract.mutation_model.reappearing_key_requires = ['EXPLICIT_RESURRECTION']; }, 'tombstone'],
    [(contract) => { contract.mutation_model.matching_applied_mutation = 'OVERWRITE'; }, 'idempotency-key']
  ];
  for (const [mutate, message] of cases) {
    const documents = structuredClone(baseline);
    mutate(documents['contracts/v1/transport/app-data-transport-contract.json']);
    assert.ok(validateSchemaInstances(documents, createValidator()).length > 0);
    assert.ok(validateSemantics(documents).some((failure) => failure.includes(message)));
  }
});

test('app data transport rejects idempotency, CAS, dependency, cache, and journal weakening', () => {
  const baseline = loadDocuments();
  const cases = [
    [(documents) => { documents['contracts/v1/transport/app-data-transport-contract.json'].mutation_model.idempotency_key_components.reverse(); }, 'idempotency-key'],
    [(documents) => { documents['contracts/v1/transport/app-data-transport-contract.json'].compare_and_swap.accepted_expected_target = ['EXACT_DIGEST']; }, 'CAS conflict'],
    [(documents) => { documents['contracts/v1/transport/app-data-transport-contract.json'].compare_and_swap.unexpected_target_overwrite_forbidden = false; }, 'CAS conflict'],
    [(documents) => { documents['contracts/v1/transport/app-data-transport-contract.json'].dependency_ordering.inserts_and_updates = 'CHILD_FIRST'; }, 'dependency and cycle'],
    [(documents) => { documents['contracts/v1/transport/app-data-transport-contract.json'].dependency_ordering.foreign_key_cycles.synthetic_proof_required = false; }, 'dependency and cycle'],
    [(documents) => { documents['contracts/v1/transport/app-data-transport-contract.json'].derived_and_external_effects.derived_cache_rebuild_after_authoritative_parity = false; }, 'cache or external-effect'],
    [(documents) => { documents['contracts/v1/transport/app-data-transport-contract.json'].derived_and_external_effects.external_effects_during_rehearsal_and_rollback = 'CURRENT'; }, 'cache or external-effect'],
    [(documents) => { documents['contracts/v1/transport/app-data-mutation-journal-contract.json'].append_only = false; }, 'mutation journal'],
    [(documents) => { documents['contracts/v1/transport/app-data-mutation-journal-contract.json'].completeness.every_conflict_quarantine_recorded = false; }, 'journal completeness'],
    [(documents) => { documents['contracts/v1/transport/app-data-mutation-journal-contract.json'].rollback.reverse_dependency_order = false; }, 'rollback evidence']
  ];
  for (const [mutate, message] of cases) {
    const documents = structuredClone(baseline);
    mutate(documents);
    assert.ok(validateSchemaInstances(documents, createValidator()).length > 0);
    assert.ok(validateSemantics(documents).some((failure) => failure.includes(message)));
  }
});

test('app data public receipt redaction rejects every prohibited field and raw-value class', () => {
  const receipt = loadDocuments()['contracts/v1/transport/app-data-receipt.example.json'];
  assert.deepEqual(validateAppDataReceiptSanitization(receipt), []);
  for (const key of [
    'raw_rows', 'primary_keys', 'names', 'emails', 'usernames', 'user_numbers', 'uuid_ranges',
    'secrets', 'project_refs', 'sql', 'payloads', 'provider_responses', 'machine_paths'
  ]) {
    const leaked = structuredClone(receipt);
    leaked[key] = 'redacted-fixture';
    assert.notEqual(validateAppDataReceiptSanitization(leaked).length, 0, key);
  }
  const syntheticMachinePath = ['C:', 'Users', 'operator', 'receipt.json'].join('\\');
  for (const value of [
    'person@example.invalid',
    '018f8f64-47a2-7a31-8d4c-5501de0d0880',
    'bxtcuhkotumitoqtrcej',
    syntheticMachinePath,
    'select private_value from protected_relation'
  ]) {
    const leaked = structuredClone(receipt);
    leaked.quarantine_classes = [value];
    assert.notEqual(validateAppDataReceiptSanitization(leaked).length, 0, value);
  }
});

test('bootstrap verification applies schema and recursive receipt sanitization without exposing rejected values', () => {
  const documents = loadDocuments();
  const contract = documents['contracts/v1/transport/app-data-transport-contract.json'];
  const receipt = documents['contracts/v1/transport/app-data-receipt.example.json'];
  const journal = documents['contracts/v1/transport/app-data-mutation-journal-contract.json'];
  const gate = documents['contracts/v1/gates/migration-gate-state.json'];
  const verify = (candidate) => verifyAppDataTransportContracts({ contract, receipt: candidate, journal, gate });
  assert.deepEqual(verify(receipt), []);

  const syntheticMachinePath = ['C:', 'Users', 'operator', 'receipt.json'].join('\\');
  const cases = [
    ['email', 'emails', ['person@example.invalid'], 'FORBIDDEN_FIELD_EMAILS'],
    ['raw row/object payload', 'raw_rows', [{ synthetic: 'opaque' }], 'FORBIDDEN_FIELD_RAW_ROWS'],
    ['SQL text', 'sql', 'select private_value from protected_relation', 'FORBIDDEN_FIELD_SQL'],
    ['project reference', 'project_ref', 'abcdefghijklmnopqrst', 'FORBIDDEN_FIELD_PROJECT_REFS'],
    ['machine path', 'machine_path', syntheticMachinePath, 'FORBIDDEN_FIELD_MACHINE_PATHS']
  ];
  for (const [name, field, value, expectedFailure] of cases) {
    const leaked = structuredClone(receipt);
    leaked[field] = value;
    let first;
    assert.doesNotThrow(() => { first = verify(leaked); }, name);
    assert.deepEqual(first, verify(leaked), `${name} deterministic failure ordering`);
    assert.ok(first.some((failure) => failure.includes('app data receipt schema $: additionalProperties')), `${name} schema`);
    assert.ok(first.some((failure) => failure.includes(expectedFailure)), `${name} sanitization`);
    assert.ok(first.every((failure) => !failure.includes('person@example.invalid') && !failure.includes('private_value') && !failure.includes('abcdefghijklmnopqrst') && !failure.includes(syntheticMachinePath)), `${name} rejected value redaction`);
  }
});

test('receipt sanitizer redacts sensitive nested property names and values to fixed classes and ordinals', () => {
  const receipt = structuredClone(loadDocuments()['contracts/v1/transport/app-data-receipt.example.json']);
  const sensitiveEmail = 'nested.person@example.invalid';
  const sensitiveSql = 'select private_value from protected_relation';
  const sensitiveProjectRef = 'abcdefghijklmnopqrst';
  const sensitiveMachinePath = ['C:', 'Users', 'operator', 'receipt.json'].join('\\');
  const sensitiveCredential = ['ghp', 'A'.repeat(24)].join('_');
  const rejectedBytes = [sensitiveEmail, sensitiveSql, sensitiveProjectRef, sensitiveMachinePath, sensitiveCredential, 'private_value'];
  receipt.snapshot_commitments[sensitiveEmail] = {
    [sensitiveSql]: [
      {
        [sensitiveProjectRef]: {
          [sensitiveMachinePath]: {
            [sensitiveCredential]: {
              raw_rows: [{
                credential: sensitiveCredential,
                nested_values: [sensitiveEmail, sensitiveSql, sensitiveProjectRef, sensitiveMachinePath],
                [sensitiveEmail]: sensitiveSql
              }]
            }
          }
        }
      }
    ]
  };

  const first = validateAppDataReceiptSanitization(receipt);
  const second = validateAppDataReceiptSanitization(receipt);
  assert.deepEqual(first, second);
  assert.notEqual(first.length, 0);
  assert.ok(first.every((failure) => /^receipt sanitization failure [0-9]{6}: [A-Z_]+$/.test(failure)));
  for (const rejected of rejectedBytes) assert.ok(first.every((failure) => !failure.includes(rejected)), rejected);
  for (const code of [
    'FORBIDDEN_PROPERTY_NAME_EMAIL',
    'FORBIDDEN_PROPERTY_NAME_SQL',
    'FORBIDDEN_PROPERTY_NAME_PROJECT_REF',
    'FORBIDDEN_PROPERTY_NAME_MACHINE_PATH',
    'FORBIDDEN_PROPERTY_NAME_CREDENTIAL',
    'FORBIDDEN_FIELD_RAW_ROWS',
    'FORBIDDEN_FIELD_CREDENTIALS',
    'FORBIDDEN_VALUE_EMAIL',
    'FORBIDDEN_VALUE_SQL',
    'FORBIDDEN_VALUE_PROJECT_REF',
    'FORBIDDEN_VALUE_MACHINE_PATH',
    'FORBIDDEN_VALUE_CREDENTIAL'
  ]) assert.ok(first.some((failure) => failure.endsWith(code)), code);
});

test('app data migration gate cannot promote execution or package application', () => {
  const baseline = loadDocuments();
  const mutations = [
    (gate) => { gate.execution_lifecycle = 'CURRENT'; },
    (gate) => { gate.apply_admitted = true; },
    (gate) => { gate.dependency_status = 'CURRENT'; },
    (gate) => { gate.contract_path = 'contracts/v1/auth/import-rehearsal-contract.json'; }
  ];
  for (const mutate of mutations) {
    const documents = structuredClone(baseline);
    mutate(documents['contracts/v1/gates/migration-gate-state.json'].app_data_transport);
    assert.ok(validateSchemaInstances(documents, createValidator()).some((failure) => failure.includes('migration-gate-state.json')));
    assert.ok(validateSemantics(documents).some((failure) => failure.includes('app data migration gate')));
  }
  assert.equal(baseline['contracts/v1/gates/migration-gate-state.json'].provider_canonical_provenance.accepted_package.migration_count, 122);
  assert.equal(baseline['contracts/v1/gates/migration-gate-state.json'].provider_canonical_provenance.accepted_package.deterministic_package_sha256, '80482b9bbfaf70b5980dd290b78def12d0af898cc10ee12f402b46d378fdbf83');
});

test('Mazer app data adapter is closed, provider-canonical, and execution-blocked', () => {
  const documents = loadDocuments();
  const adapter = documents['contracts/v1/transport/mazer-app-data-adapter-contract.json'];
  const gate = documents['contracts/v1/gates/migration-gate-state.json'];
  assert.deepEqual(verifyMazerAppDataAdapter({ adapter, gate }), []);
  assert.equal(adapter.version, '1.1.0');
  assert.equal(adapter.relations.length, 4);
  assert.deepEqual(adapter.relations.map((relation) => relation.classification), [
    'AUTHORITATIVE_ACTIVATION_SEED',
    'AUTHORITATIVE_STATE',
    'AUTHORITATIVE_PER_RUNNER_STATE',
    'AUTHORITATIVE_APPEND_ONLY_HISTORY'
  ]);
  assert.deepEqual(adapter.relations[2].authoritative_payload_columns, ['state', 'summary']);
  assert.equal(adapter.relations[2].complete_runner_key_set_parity_required, true);
  assert.equal(adapter.relations[2].rebuild_from_human_progression_allowed, false);
  assert.equal(adapter.identity_and_activation.profile_seed.source_profile_absent_policy.activation, 'ATOMIC_WITH_PENDING_MEMBERSHIP');
  assert.equal(adapter.identity_and_activation.profile_seed.source_profile_absent_policy.silent_drop_allowed, false);
  assert.equal(gate.app_data_adapters.all_adapters_ready, false);
  assert.equal(gate.app_data_adapters.apply_admitted, false);
});

test('Mazer AI runner data remains authoritative in both validator surfaces', () => {
  const baseline = loadDocuments();
  const cases = [
    [(adapter) => { adapter.relations[2].classification = 'DERIVED_INDEXED_MIRROR'; }, 'relation denominator'],
    [(adapter) => { adapter.relations[2].transport_mode = 'EXCLUDE_AND_REBUILD'; }, 'relation denominator'],
    [(adapter) => { adapter.relations[2].independent_runner_keys_preserved = false; }, 'AI runner authoritative state'],
    [(adapter) => { adapter.relations[2].authoritative_payload_columns = ['state']; }, 'AI runner authoritative state'],
    [(adapter) => { adapter.relations[2].complete_runner_key_set_parity_required = false; }, 'AI runner authoritative state'],
    [(adapter) => { adapter.relations[2].rebuild_from_human_progression_allowed = true; }, 'AI runner authoritative state'],
    [(adapter) => { adapter.relations[2].target_default_runner_key_allowed = true; }, 'AI runner authoritative state']
  ];
  for (const [mutate, expected] of cases) {
    const documents = structuredClone(baseline);
    const adapter = documents['contracts/v1/transport/mazer-app-data-adapter-contract.json'];
    const gate = documents['contracts/v1/gates/migration-gate-state.json'];
    mutate(adapter);
    assert.ok(validateSchemaInstances(documents, createValidator()).some((failure) => failure.includes('mazer-app-data-adapter-contract.json')), expected);
    assert.ok(validateSemantics(documents).some((failure) => failure.includes(expected)), expected);
    assert.ok(verifyMazerAppDataAdapter({ adapter, gate }).some((failure) => failure.includes(expected)), expected);
  }
});

test('Mazer profile-less authoritative owners fail closed or activate from the server default seed', () => {
  const baseline = loadDocuments();
  const cases = [
    [(policy) => { policy.detection = 'TIMESTAMP_ONLY'; }],
    [(policy) => { policy.trigger_relations = ['public.mazer_progression_states']; }],
    [(policy) => { policy.default_columns.selected_control_mode = 'arrows'; }],
    [(policy) => { policy.caller_values_allowed = true; }],
    [(policy) => { policy.direct_pre_activation_insert_allowed = true; }],
    [(policy) => { policy.activation = 'PREINSERT_THEN_ACTIVATE'; }],
    [(policy) => { policy.source_rows_transport_outcome = 'DROP'; }],
    [(policy) => { policy.unproven_absence_outcome = 'ACTIVATE'; }],
    [(policy) => { policy.silent_drop_allowed = true; }]
  ];
  for (const [mutate] of cases) {
    const documents = structuredClone(baseline);
    const adapter = documents['contracts/v1/transport/mazer-app-data-adapter-contract.json'];
    const gate = documents['contracts/v1/gates/migration-gate-state.json'];
    mutate(adapter.identity_and_activation.profile_seed.source_profile_absent_policy);
    assert.ok(validateSchemaInstances(documents, createValidator()).some((failure) => failure.includes('mazer-app-data-adapter-contract.json')));
    assert.ok(validateSemantics(documents).some((failure) => failure.includes('absent-source-profile activation')));
    assert.ok(verifyMazerAppDataAdapter({ adapter, gate }).some((failure) => failure.includes('absent-source-profile activation')));
  }
});

test('Mazer app data adapter fails closed across every admitted drift class', () => {
  const baseline = loadDocuments();
  const cases = [
    [(adapter) => { adapter.relations[0].target_relation = 'public.mazer_profiles'; }, 'relation denominator'],
    [(adapter) => { adapter.provider_canonical.accepted_source_commit = '3bd13233dc33fc721f8ccf105d2cc51f1a8dd8d4'; }, 'source commit'],
    [(adapter) => { adapter.provider_canonical.current_git_head = '0'.repeat(40); }, 'Git substitution'],
    [(adapter) => { adapter.identity_and_activation.profile_seed.direct_pre_activation_insert_allowed = true; }, 'activation-seed'],
    [(adapter) => { adapter.identity_and_activation.caller_supplied_user_id_allowed = true; }, 'activation subject'],
    [(adapter) => { adapter.relations[2].transport_mode = 'AUTHORITATIVE_CAS'; }, 'relation denominator'],
    [(adapter) => { adapter.relations[3].target_default_identity_generation_allowed = true; }, 'receipt identity'],
    [(adapter) => { adapter.snapshot_and_cas.required_snapshots = ['S0', 'S1']; }, 'snapshot'],
    [(adapter) => { adapter.deletion_and_rollback.implicit_cascade_authority = true; }, 'deletion'],
    [(adapter) => { adapter.snapshot_and_cas.unexpected_target_overwrite_allowed = true; }, 'CAS overwrite'],
    [(adapter) => { adapter.public_receipt_policy.forbidden_classes = ['raw_rows']; }, 'receipt redaction'],
    [(adapter) => { adapter.apply_admitted = true; }, 'non-executable'],
    [(adapter) => { adapter.provider_canonical.accepted_package_sha256 = '0'.repeat(64); }, 'effect mapping binding']
  ];
  for (const [mutate, expected] of cases) {
    const documents = structuredClone(baseline);
    mutate(documents['contracts/v1/transport/mazer-app-data-adapter-contract.json']);
    assert.notEqual(validateSchemaInstances(documents, createValidator()).length, 0, expected);
    assert.ok(validateSemantics(documents).some((failure) => failure.includes(expected)), expected);
  }
});

test('Mazer app data adapter gate rejects readiness and target-apply promotion', () => {
  const baseline = loadDocuments();
  for (const mutate of [
    (gate) => { gate.source_ready = ['mazer']; },
    (gate) => { gate.blocked = ['fitness', 'discordos']; },
    (gate) => { gate.all_adapters_ready = true; },
    (gate) => { gate.execution_lifecycle = 'CURRENT'; },
    (gate) => { gate.apply_admitted = true; }
  ]) {
    const documents = structuredClone(baseline);
    mutate(documents['contracts/v1/gates/migration-gate-state.json'].app_data_adapters);
    assert.notEqual(validateSchemaInstances(documents, createValidator()).length, 0);
    assert.ok(validateSemantics(documents).some((failure) => failure.includes('adapter')));
  }
});

test('Mazer bootstrap verifier proves every closed dependency gate', () => {
  const baseline = loadDocuments();
  const expectedGates = {
    data_api_containment: 'BLOCKED',
    accepted_recovery_and_quarantined_restore: 'BLOCKED',
    faithful_contained_replay: 'BLOCKED',
    target_bootstrap: 'BLOCKED',
    shared_auth_identity_mapping: 'BLOCKED',
    service_membership_readiness: 'BLOCKED',
    fitness_adapter: 'BLOCKED',
    discordos_adapter: 'BLOCKED',
    target_apply: 'BLOCKED'
  };
  for (const [gateName, expectedValue] of Object.entries(expectedGates)) {
    for (const mutate of [
      (gates) => { delete gates[gateName]; },
      (gates) => { gates[gateName] = expectedValue === 'BLOCKED' ? 'CURRENT' : 'BLOCKED'; },
      (gates) => { gates[gateName] = 'UNKNOWN'; }
    ]) {
      const documents = structuredClone(baseline);
      const adapter = documents['contracts/v1/transport/mazer-app-data-adapter-contract.json'];
      const gate = documents['contracts/v1/gates/migration-gate-state.json'];
      mutate(adapter.dependency_gates);
      const failures = verifyMazerAppDataAdapter({ adapter, gate });
      assert.notEqual(failures.length, 0, gateName);
      assert.ok(failures.some((failure) => failure.includes('schema validation') || failure.includes('dependency gate')), gateName);
    }
  }
});

test('Mazer membership readiness uses the closed status vocabulary without lifecycle conflation', () => {
  const baseline = loadDocuments();
  const acceptedStatusVocabulary = ['CURRENT', 'REQUIRED', 'OWNER_DECISION', 'BLOCKED', 'UNKNOWN', 'NOT_APPLICABLE'];
  const adapter = baseline['contracts/v1/transport/mazer-app-data-adapter-contract.json'];
  assert.equal(adapter.dependency_gates.service_membership_readiness, 'BLOCKED');
  assert.deepEqual(adapter.lifecycle, {
    source_contract: 'SOURCE_READY',
    execution: 'EXECUTION_BLOCKED'
  });

  const rejectedValues = [
    ...acceptedStatusVocabulary.filter((value) => value !== 'BLOCKED'),
    'SOURCE_READY',
    'EXECUTION_BLOCKED',
    'SOURCE_READY_EXECUTION_BLOCKED',
    'READY',
    'blocked'
  ];
  for (const value of rejectedValues) {
    const documents = structuredClone(baseline);
    const mutatedAdapter = documents['contracts/v1/transport/mazer-app-data-adapter-contract.json'];
    const gate = documents['contracts/v1/gates/migration-gate-state.json'];
    mutatedAdapter.dependency_gates.service_membership_readiness = value;
    assert.ok(
      validateSchemaInstances(documents, createValidator()).some((failure) => failure.includes('mazer-app-data-adapter-contract.json')),
      value
    );
    assert.ok(
      verifyMazerAppDataAdapter({ adapter: mutatedAdapter, gate }).some((failure) => failure.includes('schema validation') || failure.includes('dependency gate')),
      value
    );
  }
});

test('Mazer bootstrap verifier fails closed before malformed semantics can throw', () => {
  const baseline = loadDocuments();
  for (const mutate of [
    (adapter) => { adapter.dependency_gates = null; },
    (adapter) => { adapter.relations = {}; },
    (adapter) => { adapter.unadmitted_gate = 'CURRENT'; }
  ]) {
    const documents = structuredClone(baseline);
    const adapter = documents['contracts/v1/transport/mazer-app-data-adapter-contract.json'];
    const gate = documents['contracts/v1/gates/migration-gate-state.json'];
    mutate(adapter);
    assert.doesNotThrow(() => verifyMazerAppDataAdapter({ adapter, gate }));
    assert.ok(verifyMazerAppDataAdapter({ adapter, gate }).some((failure) => failure.includes('schema validation')));
  }

  const documents = structuredClone(baseline);
  const adapter = documents['contracts/v1/transport/mazer-app-data-adapter-contract.json'];
  const gate = documents['contracts/v1/gates/migration-gate-state.json'];
  gate.required_evidence.find((evidence) => evidence.name === 'provider-ledger canonical historical package').status = 'REQUIRED';
  assert.deepEqual(validateSchemaInstances(documents, createValidator()), []);
  assert.ok(verifyMazerAppDataAdapter({ adapter, gate }).some((failure) => failure.includes('semantic validation')));
});

test('Fitness app data adapter freezes 27 accepted relations without admitting execution', () => {
  const documents = loadDocuments();
  const adapter = documents['contracts/v1/transport/fitness-app-data-adapter-contract.json'];
  const gate = documents['contracts/v1/gates/migration-gate-state.json'];
  assert.deepEqual(verifyFitnessAppDataAdapter({ adapter, gate }), []);
  assert.equal(adapter.version, '1.0.0');
  assert.equal(adapter.relations.length, 27);
  assert.deepEqual(adapter.classification_counts, {
    authoritative: 11,
    derived_rebuildable: 1,
    entitlement_held: 1,
    billing_unknown: 2,
    operational_external_unknown: 1,
    discord_external_unknown: 10,
    excluded: 1,
    total: 27
  });
  assert.deepEqual(gate.app_data_adapters.source_ready, ['mazer', 'fitness']);
  assert.deepEqual(gate.app_data_adapters.blocked, ['discordos']);
  assert.equal(gate.app_data_adapters.all_adapters_ready, false);
  assert.equal(gate.app_data_adapters.apply_admitted, false);
});

test('Fitness adapter rejects accepted-source, relation, held-candidate, and UNKNOWN substitution', () => {
  const baseline = loadDocuments();
  const cases = [
    [(adapter) => { adapter.source_evidence.current_git_head = '0'.repeat(40); }, 'source identity'],
    [(adapter) => { adapter.source_evidence.accepted_migration_count = 102; }, 'migration denominator'],
    [(adapter) => { adapter.source_evidence.relation_manifest_sha256 = '0'.repeat(64); }, 'relation manifest'],
    [(adapter) => { adapter.source_evidence.held_candidate.candidate_bytes_admitted = true; }, 'PR 108'],
    [(adapter) => { adapter.relations[0].target_relation = 'fitness.user_profiles'; }, 'relation denominator'],
    [(adapter) => { adapter.relations.splice(1, 1); }, 'relation denominator'],
    [(adapter) => { adapter.relations[11].transport_mode = 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP'; }, 'relation denominator'],
    [(adapter) => { adapter.relations[12].classification = 'AUTHORITATIVE_STATE'; }, 'relation denominator'],
    [(adapter) => { adapter.relations[13].transport_mode = 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP'; }, 'relation denominator'],
    [(adapter) => { adapter.relations[15].transport_mode = 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP'; }, 'relation denominator'],
    [(adapter) => { adapter.relations[17].hold_reason = null; }, 'relation denominator'],
    [(adapter) => { adapter.relations[19].owner_key = 'user_id'; }, 'relation denominator']
  ];
  for (const [mutate, expected] of cases) {
    const documents = structuredClone(baseline);
    const adapter = documents['contracts/v1/transport/fitness-app-data-adapter-contract.json'];
    const gate = documents['contracts/v1/gates/migration-gate-state.json'];
    mutate(adapter);
    assert.ok(validateSemantics(documents).some((failure) => failure.includes(expected)), expected);
    assert.ok(verifyFitnessAppDataAdapter({ adapter, gate }).some((failure) => failure.includes(expected) || failure.includes('schema validation')), expected);
  }
});

test('Fitness activation and member-number policy reject caller identity, compaction, reuse, or renumbering', () => {
  const baseline = loadDocuments();
  const cases = [
    [(adapter) => { adapter.identity_and_activation.caller_supplied_user_id_allowed = true; }, 'activation subject'],
    [(adapter) => { adapter.identity_and_activation.profile_seed.direct_pre_activation_insert_allowed = true; }, 'activation-seed'],
    [(adapter) => { adapter.identity_and_activation.profile_seed.source_primary_key = 'user_id'; }, 'activation-seed'],
    [(adapter) => { adapter.identity_and_activation.profile_seed.source_profile_absent_policy.default_seed_allowed = true; }, 'absent-source-profile'],
    [(adapter) => { adapter.identity_and_activation.profile_seed.source_profile_absent_policy.silent_drop_allowed = true; }, 'absent-source-profile'],
    [(adapter) => { adapter.member_number_policy.existing_values_action = 'REALLOCATE'; }, 'member-number preservation'],
    [(adapter) => { adapter.member_number_policy.high_water_action = 'RECOMPUTE'; }, 'member-number preservation'],
    [(adapter) => { adapter.member_number_policy.gap_fill_allowed = true; }, 'member-number immutability'],
    [(adapter) => { adapter.member_number_policy.reuse_allowed = true; }, 'member-number immutability'],
    [(adapter) => { adapter.member_number_policy.renumber_allowed = true; }, 'member-number immutability'],
    [(adapter) => { adapter.member_number_policy.compaction_allowed = true; }, 'member-number immutability'],
    [(adapter) => { adapter.member_number_policy.post_migration_allocation = 'CURRENT'; }, 'member-number immutability'],
    [(adapter) => { adapter.member_number_policy.held_candidate_review = 'CURRENT'; }, 'retirement dependency']
  ];
  for (const [mutate, expected] of cases) {
    const documents = structuredClone(baseline);
    const adapter = documents['contracts/v1/transport/fitness-app-data-adapter-contract.json'];
    const gate = documents['contracts/v1/gates/migration-gate-state.json'];
    mutate(adapter);
    assert.ok(validateSemantics(documents).some((failure) => failure.includes(expected)), expected);
    assert.ok(verifyFitnessAppDataAdapter({ adapter, gate }).some((failure) => failure.includes(expected) || failure.includes('schema validation')), expected);
  }
});

test('Fitness adapter fails closed on incomplete parity, FK-cycle, CAS, tombstone, receipt, or apply claims', () => {
  const baseline = loadDocuments();
  const cases = [
    [(adapter) => { adapter.snapshot_and_cas.required_snapshots = ['S0', 'S1']; }, 'snapshot'],
    [(adapter) => { adapter.snapshot_and_cas.timestamp_revision_or_high_water_only_proof_allowed = true; }, 'snapshot'],
    [(adapter) => { adapter.snapshot_and_cas.unexpected_target_overwrite_allowed = true; }, 'CAS'],
    [(adapter) => { adapter.dependency_ordering.foreign_key_cycles = []; }, 'cycle staging'],
    [(adapter) => { adapter.dependency_ordering.foreign_key_cycles[0].nullable_reference_columns.pop(); }, 'cycle staging'],
    [(adapter) => { adapter.dependency_ordering.foreign_key_cycles[0].synthetic_proof_required = false; }, 'cycle staging'],
    [(adapter) => { adapter.deletion_and_rollback.implicit_cascade_authority = true; }, 'deletion'],
    [(adapter) => { adapter.deletion_and_rollback.reappearing_key_requires = ['EXPLICIT_RESURRECTION']; }, 'deletion'],
    [(adapter) => { adapter.public_receipt_policy.forbidden_classes = ['raw_rows']; }, 'receipt redaction'],
    [(adapter) => { adapter.apply_admitted = true; }, 'non-executable'],
    [(adapter) => { adapter.source_evidence.accepted_package_sha256 = '0'.repeat(64); }, 'package binding']
  ];
  for (const [mutate, expected] of cases) {
    const documents = structuredClone(baseline);
    const adapter = documents['contracts/v1/transport/fitness-app-data-adapter-contract.json'];
    const gate = documents['contracts/v1/gates/migration-gate-state.json'];
    mutate(adapter);
    assert.ok(validateSemantics(documents).some((failure) => failure.toLowerCase().includes(expected.toLowerCase())), expected);
    assert.ok(verifyFitnessAppDataAdapter({ adapter, gate }).some((failure) => failure.toLowerCase().includes(expected.toLowerCase()) || failure.includes('schema validation')), expected);
  }
});

test('Fitness routine-day mutual self-references require null-first staging and exact CAS patch', () => {
  const baseline = loadDocuments();
  const adapter = baseline['contracts/v1/transport/fitness-app-data-adapter-contract.json'];
  const cycle = adapter.dependency_ordering.foreign_key_cycles[0];
  const selfReferenceColumn = 'public.routine_days.duplicate_source_routine_day_id';
  assert.deepEqual(cycle.nullable_reference_columns, [
    'public.routine_days.workout_plan_template_id',
    'public.workout_plan_templates.source_routine_day_id',
    selfReferenceColumn
  ]);

  const sourceRows = [
    { id: 'routine-day-a', duplicate_source_routine_day_id: 'routine-day-b' },
    { id: 'routine-day-b', duplicate_source_routine_day_id: 'routine-day-a' }
  ];
  const directInsertions = new Set();
  const waiting = new Map(sourceRows.map((row) => [row.id, row]));
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const [id, row] of waiting) {
      if (row.duplicate_source_routine_day_id === null || directInsertions.has(row.duplicate_source_routine_day_id)) {
        directInsertions.add(id);
        waiting.delete(id);
        progressed = true;
      }
    }
  }
  assert.equal(directInsertions.size, 0, 'rowwise parent-first insertion must stall on the mutual self-reference');
  assert.equal(waiting.size, 2);

  const stageAndPatch = () => {
    const staged = new Map(sourceRows.map((row) => [row.id, { ...row, duplicate_source_routine_day_id: null }]));
    for (const sourceRow of sourceRows) {
      const targetRow = staged.get(sourceRow.id);
      assert.equal(targetRow.duplicate_source_routine_day_id, null, 'CAS preimage must be the staged null reference');
      assert.equal(staged.has(sourceRow.duplicate_source_routine_day_id), true, 'CAS reference target must already be staged');
      targetRow.duplicate_source_routine_day_id = sourceRow.duplicate_source_routine_day_id;
    }
    return sourceRows.map((row) => staged.get(row.id));
  };
  assert.deepEqual(stageAndPatch(), sourceRows);
  assert.deepEqual(stageAndPatch(), sourceRows);

  const missingSelfReference = structuredClone(baseline);
  const invalidAdapter = missingSelfReference['contracts/v1/transport/fitness-app-data-adapter-contract.json'];
  const gate = missingSelfReference['contracts/v1/gates/migration-gate-state.json'];
  invalidAdapter.dependency_ordering.foreign_key_cycles[0].nullable_reference_columns.pop();
  assert.ok(validateSchemaInstances(missingSelfReference, createValidator()).some((failure) => failure.includes('fitness-app-data-adapter-contract.json')));
  assert.ok(validateSemantics(missingSelfReference).some((failure) => failure.includes('cycle staging')));
  assert.ok(verifyFitnessAppDataAdapter({ adapter: invalidAdapter, gate }).some((failure) => failure.includes('schema validation') || failure.includes('cycle staging')));
});

test('Fitness bootstrap verifier proves every dependency gate and closed lifecycle status', () => {
  const baseline = loadDocuments();
  const expectedGates = {
    data_api_containment: 'BLOCKED',
    accepted_recovery_and_quarantined_restore: 'BLOCKED',
    faithful_contained_replay: 'BLOCKED',
    target_bootstrap: 'BLOCKED',
    shared_auth_identity_mapping: 'BLOCKED',
    service_membership_readiness: 'BLOCKED',
    mazer_adapter_source_contract: 'CURRENT',
    fitness_pr108_retirement: 'BLOCKED',
    discordos_adapter: 'BLOCKED',
    target_apply: 'BLOCKED'
  };
  for (const [gateName, expectedValue] of Object.entries(expectedGates)) {
    for (const mutate of [
      (gates) => { delete gates[gateName]; },
      (gates) => { gates[gateName] = expectedValue === 'BLOCKED' ? 'CURRENT' : 'BLOCKED'; },
      (gates) => { gates[gateName] = 'SOURCE_READY_EXECUTION_BLOCKED'; }
    ]) {
      const documents = structuredClone(baseline);
      const adapter = documents['contracts/v1/transport/fitness-app-data-adapter-contract.json'];
      const gate = documents['contracts/v1/gates/migration-gate-state.json'];
      mutate(adapter.dependency_gates);
      assert.ok(verifyFitnessAppDataAdapter({ adapter, gate }).some((failure) => failure.includes('schema validation') || failure.includes('dependency gate')), gateName);
    }
  }
});

test('Fitness adapter gate rejects readiness or package-application promotion', () => {
  const baseline = loadDocuments();
  for (const mutate of [
    (gate) => { gate.source_ready = ['mazer']; },
    (gate) => { gate.blocked = ['fitness', 'discordos']; },
    (gate) => { gate.fitness_relation_count = 26; },
    (gate) => { gate.all_adapters_ready = true; },
    (gate) => { gate.execution_lifecycle = 'CURRENT'; },
    (gate) => { gate.apply_admitted = true; }
  ]) {
    const documents = structuredClone(baseline);
    const adapter = documents['contracts/v1/transport/fitness-app-data-adapter-contract.json'];
    const gate = documents['contracts/v1/gates/migration-gate-state.json'];
    mutate(gate.app_data_adapters);
    assert.notEqual(validateSchemaInstances(documents, createValidator()).length, 0);
    assert.ok(verifyFitnessAppDataAdapter({ adapter, gate }).some((failure) => failure.includes('schema validation') || failure.includes('adapter')));
  }
});

test('Fitness bootstrap verifier fails closed without throwing on malformed inputs', () => {
  const baseline = loadDocuments();
  for (const mutate of [
    (adapter) => { adapter.dependency_gates = null; },
    (adapter) => { adapter.relations = {}; },
    (adapter) => { adapter.identity_and_activation.profile_seed = null; },
    (adapter) => { adapter.unadmitted_gate = 'CURRENT'; }
  ]) {
    const documents = structuredClone(baseline);
    const adapter = documents['contracts/v1/transport/fitness-app-data-adapter-contract.json'];
    const gate = documents['contracts/v1/gates/migration-gate-state.json'];
    mutate(adapter);
    assert.doesNotThrow(() => verifyFitnessAppDataAdapter({ adapter, gate }));
    assert.ok(verifyFitnessAppDataAdapter({ adapter, gate }).some((failure) => failure.includes('schema validation')));
  }
});
