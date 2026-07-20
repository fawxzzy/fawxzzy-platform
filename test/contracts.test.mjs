import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createValidator,
  loadDocuments,
  validateContracts,
  validateSchemaInstances,
  validateSemantics
} from '../scripts/lib/contracts.mjs';

test('all versioned contract instances satisfy their schemas and semantics', () => {
  const report = validateContracts();
  assert.deepEqual(report.failures, []);
  assert.equal(report.ok, true);
});

test('contract validation output is deterministic', () => {
  assert.deepEqual(validateContracts(), validateContracts());
  assert.equal(JSON.stringify(validateContracts()), JSON.stringify(validateContracts()));
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
  relation.policies[0].using = '(select auth.uid()) = user_id';
  const failures = validateSemantics(documents);
  assert.ok(failures.some((failure) => failure.includes('product-profile access must require its service membership')));
  assert.ok(failures.some((failure) => failure.includes('membership row must bind directly to auth.uid()')));
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
