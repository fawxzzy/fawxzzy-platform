import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { validateRecoveryDocuments } from './recovery.mjs';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(moduleDirectory, '..', '..');

export const documentSpecs = Object.freeze([
  ['contracts/v1/registry/project-registry.json', 'urn:fawxzzy:platform:schemas:v1:project-registry'],
  ['contracts/v1/catalog/service-catalog.json', 'urn:fawxzzy:platform:schemas:v1:service-catalog'],
  ['contracts/v1/identity/identity-map.json', 'urn:fawxzzy:platform:schemas:v1:identity-map'],
  ['contracts/v1/membership/membership-lifecycle.json', 'urn:fawxzzy:platform:schemas:v1:membership-lifecycle'],
  ['contracts/v1/activation/activation-request.example.json', 'urn:fawxzzy:platform:schemas:v1:activation-request'],
  ['contracts/v1/activation/activation-receipt.example.json', 'urn:fawxzzy:platform:schemas:v1:activation-receipt'],
  ['contracts/v1/gates/migration-gate-state.json', 'urn:fawxzzy:platform:schemas:v1:migration-gate-state'],
  ['contracts/v1/gates/cutover-retirement-gate-state.json', 'urn:fawxzzy:platform:schemas:v1:cutover-retirement-gate-state'],
  ['contracts/v1/security/rls-grant-function-matrix.json', 'urn:fawxzzy:platform:schemas:v1:security-matrix'],
  ['contracts/v1/auth/domain-session-contract.json', 'urn:fawxzzy:platform:schemas:v1:domain-session-contract'],
  ['contracts/v1/recovery/micro-recovery-contract.json', 'urn:fawxzzy:platform:schemas:v1:micro-recovery-contract'],
  ['contracts/v1/recovery/backup-manifest.example.json', 'urn:fawxzzy:platform:schemas:v1:backup-manifest'],
  ['contracts/v1/recovery/external-effects-disable-manifest.example.json', 'urn:fawxzzy:platform:schemas:v1:external-effects-disable-manifest'],
  ['contracts/v1/recovery/restore-rehearsal-receipt.example.json', 'urn:fawxzzy:platform:schemas:v1:restore-rehearsal-receipt']
]);

const expectedStatuses = Object.freeze([
  'CURRENT',
  'REQUIRED',
  'OWNER_DECISION',
  'BLOCKED',
  'UNKNOWN',
  'NOT_APPLICABLE'
]);

const expectedOperations = Object.freeze([
  'target_writes',
  'data_import',
  'auth_import',
  'vercel_env_cutover',
  'production_deploy',
  'source_pause',
  'source_deletion'
]);

const expectedServiceBindings = Object.freeze({
  discordos: Object.freeze({
    schema: 'discordos',
    product_profile: 'discordos.user_profiles',
    entitlement_contract: 'discordos.entitlements'
  }),
  fitness: Object.freeze({
    schema: 'fitness',
    product_profile: 'fitness.user_profiles',
    entitlement_contract: 'fitness.entitlements'
  }),
  mazer: Object.freeze({
    schema: 'mazer',
    product_profile: 'mazer.user_profiles',
    entitlement_contract: 'mazer.entitlements'
  })
});

const expectedMembershipTransitions = Object.freeze([
  Object.freeze({
    from: null,
    event: 'global_signup_discovery',
    to: 'pending',
    result: 'CREATED_PENDING',
    profile_effect: 'NONE',
    authorization: 'system_account_creation'
  }),
  Object.freeze({
    from: null,
    event: 'authenticated_first_visit',
    to: 'active',
    result: 'ACTIVATED',
    profile_effect: 'CREATE_ATOMICALLY',
    authorization: 'authenticated_self'
  }),
  Object.freeze({
    from: 'pending',
    event: 'authenticated_first_visit',
    to: 'active',
    result: 'ACTIVATED',
    profile_effect: 'CREATE_ATOMICALLY',
    authorization: 'authenticated_self'
  }),
  Object.freeze({
    from: 'active',
    event: 'authenticated_first_visit',
    to: 'active',
    result: 'REUSED',
    profile_effect: 'REUSE',
    authorization: 'authenticated_self'
  }),
  Object.freeze({
    from: 'active',
    event: 'suspend',
    to: 'suspended',
    result: 'SUSPENDED',
    profile_effect: 'PRESERVE',
    authorization: 'privileged_service_control'
  }),
  Object.freeze({
    from: 'suspended',
    event: 'authenticated_first_visit',
    to: 'suspended',
    result: 'REJECTED_SUSPENDED',
    profile_effect: 'PRESERVE',
    authorization: 'authenticated_self'
  }),
  Object.freeze({
    from: 'suspended',
    event: 'controlled_reinstate',
    to: 'active',
    result: 'REINSTATED',
    profile_effect: 'REUSE',
    authorization: 'privileged_service_control'
  })
]);

const expectedRelationDigests = Object.freeze({
  'platform_shared.global_profiles': 'edcaff331c9fde92d3d72905f5ee0b08d65aa1e9882b93bb05d12d70f649e074',
  'platform_shared.services': '6355c701c16b03370ed099858f4c1458293c608a5f704366b5589caa64528638',
  'platform_shared.user_service_memberships': '32f05fcaac5a8499927c40f27a81a009bce482a8aad08420059147a3c2e5524f',
  'platform_shared.service_activation_receipts': '792af06db4ceb095a9f6cbdec0c63c8640af217287fa2125371e946e4608310c',
  'platform_private.source_identity_ledger': '9b08ad8a5420b29dc5426491453a01b078cdd4496f8b7183dcfab1e87e56dcb1',
  'platform_private.identity_collision_adjudications': '84df17b7ea9813742fee571d3b0930dfc9be2a798286669e99a5818d054adc95',
  'discordos.user_profiles': 'dbcc716ce3c9ddc03877c2b9167702aeb8f332e799eb7a1f8a00fd37ef13a57e',
  'fitness.user_profiles': 'be24823d5ed6b70412313ea0578b15e019668c7673e36cc2fdae4f34cbce3bd8',
  'mazer.user_profiles': '2bebe35c5874b26bccce99b7fde74a8a1d1e774235b69c26d70a4da9b8be8ac5',
  'discordos.entitlements': '2a69394bed6d40d07eb51797ad03219918f77bfb2f19af71baf27897cdd736ef',
  'fitness.entitlements': '876c5927822c902d4dee312b628042ff490283f4ac3454993e72fe3d7d897ff4',
  'mazer.entitlements': '2cd0330ff0e0dd80616a8e2c5d487297f96f35d6c88f43e4297293b665221804'
});

const expectedFunctionDigests = Object.freeze({
  'platform_shared.activate_service': '010456c0f327205c54aa5339de85dcc76bba34b48fea4dbf8dafa790bd96abfe',
  'platform_private.on_auth_user_created': '644cc3631feb2e19b651e1d1ce8ec215b5e376c275f5a60ede97bafb3849aa51'
});

const protectedGlobalProfileColumns = Object.freeze([
  'user_number',
  'canonical_username',
  'normalized_username_key',
  'source_identity_provenance',
  'lifecycle_state',
  'created_at',
  'updated_at'
]);

const productProfileServices = Object.freeze({
  'discordos.user_profiles': 'discordos',
  'fitness.user_profiles': 'fitness',
  'mazer.user_profiles': 'mazer'
});

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8'));
}

function schemaPaths() {
  const directory = path.join(repositoryRoot, 'contracts', 'v1', 'schemas');
  return fs.readdirSync(directory)
    .filter((name) => name.endsWith('.schema.json'))
    .sort()
    .map((name) => path.join(directory, name));
}

export function createValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  for (const schemaPath of schemaPaths()) {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    if (!ajv.validateSchema(schema)) {
      throw new Error(`Invalid JSON Schema ${path.basename(schemaPath)}: ${ajv.errorsText(ajv.errors)}`);
    }
    ajv.addSchema(schema);
  }
  return ajv;
}

export function loadDocuments() {
  return Object.fromEntries([
    ...documentSpecs.map(([relativePath]) => [relativePath, readJson(relativePath)]),
    ['contracts/v1/status-vocabulary.json', readJson('contracts/v1/status-vocabulary.json')]
  ]);
}

export function validateSchemaInstances(documents, ajv = createValidator()) {
  const failures = [];
  for (const [relativePath, schemaId] of documentSpecs) {
    const validate = ajv.getSchema(schemaId);
    if (!validate) {
      failures.push(`${relativePath}: schema ${schemaId} was not registered`);
      continue;
    }
    if (!validate(documents[relativePath])) {
      failures.push(`${relativePath}: ${ajv.errorsText(validate.errors, { separator: '; ' })}`);
    }
  }
  return failures;
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sameValues(actual, expected) {
  return JSON.stringify(sorted(actual)) === JSON.stringify(sorted(expected));
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function collectStatusValues(value, pointer = '$', output = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectStatusValues(entry, `${pointer}[${index}]`, output));
    return output;
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'status') {
        output.push([`${pointer}.${key}`, entry]);
      }
      collectStatusValues(entry, `${pointer}.${key}`, output);
    }
  }
  return output;
}

export function validateSemantics(documents) {
  const failures = [];
  const requireCondition = (condition, message) => {
    if (!condition) failures.push(message);
  };

  const vocabulary = documents['contracts/v1/status-vocabulary.json'];
  requireCondition(vocabulary.closed_world === true, 'status vocabulary must be closed-world');
  requireCondition(sameValues(vocabulary.values, expectedStatuses), 'status vocabulary differs from the frozen values');

  for (const [relativePath, document] of Object.entries(documents)) {
    for (const [pointer, status] of collectStatusValues(document)) {
      requireCondition(expectedStatuses.includes(status), `${relativePath}${pointer}: unknown status ${String(status)}`);
    }
  }

  const registry = documents['contracts/v1/registry/project-registry.json'];
  requireCondition(registry.target.name === 'fawxzzy-platform', 'target project identity changed');
  requireCondition(registry.target.role === 'target', 'project registry target position must retain role target');
  requireCondition(registry.target.ref === 'bxtcuhkotumitoqtrcej', 'target project ref changed');
  requireCondition(sameValues(registry.sources.map((source) => source.name), ['DiscordOS', 'Fitness', 'Mazer']), 'source project identities changed');
  requireCondition(registry.sources.every((source) => source.role === 'source'), 'project registry source positions must retain role source');
  const sourceRefs = Object.fromEntries(registry.sources.map((source) => [source.name, source.ref]));
  requireCondition(sourceRefs.DiscordOS === 'nwexsktuuenfdegzrbut', 'DiscordOS source ref changed');
  requireCondition(sourceRefs.Fitness === 'lpswxoyfniocuhljgzbc', 'Fitness source ref changed');
  requireCondition(sourceRefs.Mazer === 'geknvnrmktchljnyddwp', 'Mazer source ref changed');

  for (const relativePath of [
    'contracts/v1/registry/project-registry.json',
    'contracts/v1/gates/migration-gate-state.json',
    'contracts/v1/gates/cutover-retirement-gate-state.json'
  ]) {
    const gates = documents[relativePath].operation_gates;
    requireCondition(sameValues(gates.map((gate) => gate.operation), expectedOperations), `${relativePath}: operation gate set changed`);
    requireCondition(gates.every((gate) => gate.status === 'BLOCKED'), `${relativePath}: every operation must remain BLOCKED`);
  }

  const catalog = documents['contracts/v1/catalog/service-catalog.json'];
  requireCondition(catalog.membership_is_billing_entitlement === false, 'membership must not become a billing entitlement');
  requireCondition(sameValues(catalog.services.map((service) => service.id), ['discordos', 'fitness', 'mazer']), 'service catalog membership changed');
  for (const [id, expectedBinding] of Object.entries(expectedServiceBindings)) {
    const matchingServices = catalog.services.filter((service) => service.id === id);
    requireCondition(matchingServices.length === 1, `${id} must have exactly one service catalog entry`);
    const service = matchingServices[0];
    requireCondition(service?.schema === expectedBinding.schema, `${id} service schema must remain ${expectedBinding.schema}`);
    requireCondition(service?.product_profile === expectedBinding.product_profile, `${id} product profile relation must remain ${expectedBinding.product_profile}`);
    requireCondition(service?.entitlement_contract === expectedBinding.entitlement_contract, `${id} entitlement relation must remain ${expectedBinding.entitlement_contract}`);
  }
  for (const id of ['fitness', 'mazer']) {
    const service = catalog.services.find((candidate) => candidate.id === id);
    requireCondition(service?.discoverable === true, `${id} must remain discoverable`);
    requireCondition(service?.global_signup_may_create_pending === true, `${id} must allow pending discovery membership`);
    requireCondition(service?.activation_mode === 'authenticated_first_visit', `${id} must activate on first authenticated visit`);
  }

  const identity = documents['contracts/v1/identity/identity-map.json'];
  requireCondition(identity.entries.length === 0, 'repository identity map must contain no user records');
  requireCondition(identity.collision_summary.count === 1, 'normalized-email collision count must remain one');
  requireCondition(identity.collision_summary.pii_included === false, 'collision summary must contain no PII');
  requireCondition(identity.ledger.append_only === true, 'source identity ledger must remain append-only');
  requireCondition(identity.ledger.semantic_cross_product_merge_forbidden === true, 'semantic cross-product merges must remain forbidden');
  requireCondition(identity.username_contract.status === 'CURRENT', 'FP-MAN-006 username decision must remain approved');
  requireCondition(identity.username_contract.namespace === 'one_global_canonical_username', 'username namespace must remain globally canonical');
  requireCondition(identity.username_contract.database_unique_boundary === true, 'normalized username key must retain a database UNIQUE boundary');
  requireCondition(identity.username_contract.identity_matching.decision_id === 'FP-MAN-007', 'verified identity matching must remain bound to FP-MAN-007');
  requireCondition(identity.username_contract.identity_matching.status === 'CURRENT', 'FP-MAN-007 identity matching decision must remain approved');
  requireCondition(identity.username_contract.identity_matching.username_alone_forbidden === true, 'username-only identity matching must remain forbidden');
  requireCondition(identity.username_contract.backfill_status === 'BLOCKED', 'username backfill writes must remain BLOCKED');
  requireCondition(identity.user_number_contract.field === 'platform_shared.global_profiles.user_number', 'global user_number field changed');
  requireCondition(identity.user_number_contract.decision_id === 'FP-MAN-009', 'legacy user_number allocation and ordering must remain bound to FP-MAN-009');
  requireCondition(identity.user_number_contract.fitness_existing_member_rank_numbers_preserved_exactly === true, 'Fitness user numbers must be preserved exactly');
  requireCondition(identity.user_number_contract.monotonic && identity.user_number_contract.never_reused && identity.user_number_contract.never_renumbered, 'global user_number must remain monotonic, never reused, and never renumbered');
  requireCondition(identity.user_number_contract.non_fitness_backfill.decision_status === 'CURRENT', 'FP-MAN-009 numbering decision must remain approved');
  requireCondition(identity.user_number_contract.non_fitness_backfill.status === 'BLOCKED', 'legacy user_number backfill writes must remain BLOCKED');
  requireCondition(identity.cleanup_contract.decision_status === 'CURRENT', 'FP-MAN-010 cleanup decision must remain approved');
  requireCondition(identity.cleanup_contract.destructive_cleanup_status === 'BLOCKED', 'destructive cleanup must remain BLOCKED');
  requireCondition(identity.cleanup_contract.separate_action_time_approval_required === true, 'destructive cleanup must require separate action-time approval');
  requireCondition(identity.auth_migration_contract.status === 'BLOCKED', 'Auth migration must remain BLOCKED');
  requireCondition(identity.auth_migration_contract.target_signing_identity_preserved === true, 'target signing identity must remain target-owned');
  requireCondition(identity.auth_migration_contract.source_jwt_secret_reuse_forbidden === true, 'source JWT secret reuse must remain forbidden');
  requireCondition(identity.auth_migration_contract.source_service_role_secret_copy_forbidden === true, 'source service-role secret copying must remain forbidden');
  requireCondition(identity.auth_migration_contract.existing_source_sessions_invalidated === true, 'source sessions must be invalidated at cutover');
  requireCondition(identity.auth_migration_contract.controlled_reauthentication_required === true, 'controlled reauthentication must remain required');
  requireCondition(identity.auth_migration_contract.three_auth_schema_wholesale_merge_forbidden === true, 'wholesale three-source Auth merge must remain forbidden');
  requireCondition(identity.auth_migration_contract.storage_object_bodies.action_time_status === 'UNKNOWN', 'Storage object body denominator must be re-read at action time');

  const lifecycle = documents['contracts/v1/membership/membership-lifecycle.json'];
  const transitionSignature = (transition) => JSON.stringify([
    transition.from,
    transition.event,
    transition.to,
    transition.result,
    transition.profile_effect,
    transition.authorization
  ]);
  const transitionSignatures = lifecycle.transitions.map(transitionSignature);
  const expectedTransitionSignatures = expectedMembershipTransitions.map(transitionSignature);
  requireCondition(
    lifecycle.transitions.length === expectedMembershipTransitions.length && sameValues(transitionSignatures, expectedTransitionSignatures),
    'membership lifecycle exact transition set changed'
  );
  requireCondition(new Set(transitionSignatures).size === transitionSignatures.length, 'membership lifecycle transitions must be unique');
  requireCondition(
    !lifecycle.transitions.some((transition) => transition.from === 'suspended' && transition.event === 'authenticated_first_visit' && transition.to === 'active'),
    'suspended membership must never self-activate'
  );

  const request = documents['contracts/v1/activation/activation-request.example.json'];
  requireCondition(!Object.hasOwn(request, 'user_id'), 'activation request must not accept user_id');
  requireCondition(!Object.hasOwn(request, 'subject_user_id'), 'activation request must not accept subject_user_id');
  const receipt = documents['contracts/v1/activation/activation-receipt.example.json'];
  requireCondition(receipt.subject_source === 'auth.uid()', 'activation subject must derive from auth.uid()');
  const receiptCombination = [receipt.outcome, receipt.membership_state, receipt.product_profile_action].join('|');
  const admittedReceiptCombinations = new Set([
    'ACTIVATED|active|CREATED',
    'REUSED|active|REUSED',
    'REJECTED_SUSPENDED|suspended|PRESERVED'
  ]);
  requireCondition(admittedReceiptCombinations.has(receiptCombination), `activation receipt combination is not admitted: ${receiptCombination}`);

  const domain = documents['contracts/v1/auth/domain-session-contract.json'];
  const origins = Object.fromEntries(domain.origins.map((origin) => [origin.role, origin.origin]));
  requireCondition(origins.hub === 'https://fawxzzy.com', 'hub origin changed');
  requireCondition(origins.account === 'https://account.fawxzzy.com', 'account origin changed');
  requireCondition(origins.fitness === 'https://fitness.fawxzzy.com', 'Fitness origin changed');
  requireCondition(origins.mazer === 'https://mazer.fawxzzy.com', 'Mazer origin changed');
  requireCondition(domain.domain_routing.www_redirect.source === 'https://www.fawxzzy.com' && domain.domain_routing.www_redirect.destination === 'https://fawxzzy.com', 'www redirect contract changed');
  requireCondition(domain.domain_routing.fitness_compatibility_redirect.retirement_status === 'BLOCKED', 'Fitness compatibility redirect retirement must remain BLOCKED');
  requireCondition(domain.session_model.browser_sessions === 'per_origin', 'phase-1 browser sessions must remain per-origin');
  requireCondition(domain.session_model.cross_origin_sso.status === 'BLOCKED', 'cross-origin SSO must remain deferred and BLOCKED');
  requireCondition(sameValues(domain.session_model.cross_origin_sso.forbidden_mechanisms, ['shared_refresh_cookies', 'url_tokens']), 'unsafe cross-origin SSO mechanisms must remain forbidden');
  const configuredUrls = [...domain.auth_configuration.exact_redirect_urls, domain.auth_configuration.exact_recovery_url];
  requireCondition(configuredUrls.every((url) => !url.includes('*')), 'production redirect and recovery URLs must be exact');
  requireCondition(domain.auth_configuration.exact_recovery_url === 'https://account.fawxzzy.com/auth/recovery', 'recovery must remain centralized on the account origin');
  requireCondition(domain.auth_configuration.preview_redirects.urls.length === 0, 'preview redirects must remain empty in this packet');
  requireCondition(domain.auth_policy.phase_one_method === 'email_password', 'phase-1 Auth method must remain email/password');
  requireCondition(domain.auth_policy.email_verification === false, 'phase-1 email verification must remain off');
  requireCondition(domain.auth_policy.leaked_password_protection.enabled === true, 'leaked-password protection must remain enabled');
  requireCondition(domain.auth_policy.password_length.minimum.value === 10, 'password minimum must remain 10');
  const passwordCapacity = domain.auth_policy.password_length.capacity;
  requireCondition(passwordCapacity.restrictive_app_cap_allowed === false, 'restrictive application password caps are forbidden');
  requireCondition(passwordCapacity.minimum_supported_characters >= 64, 'password surfaces must support at least 64 characters');
  requireCondition(passwordCapacity.preferred_supported_characters_minimum >= 128, 'password surfaces should preserve at least 128-character capacity');
  requireCondition(passwordCapacity.never_truncate === true, 'password truncation is forbidden');
  requireCondition(passwordCapacity.provider_maximum_setting === 'NOT_APPLICABLE', 'provider maximum-password setting must remain NOT_APPLICABLE');
  requireCondition(domain.account_surfaces.owner_origin === 'https://account.fawxzzy.com', 'neutral account flow owner changed');
  requireCondition(domain.smtp.sender_address === 'no-reply@account.fawxzzy.com', 'SMTP sender contract changed');
  requireCondition(domain.smtp.credentials_present === false && domain.smtp.live_configuration_allowed === false, 'repository must not contain SMTP credentials or live configuration authority');

  const security = documents['contracts/v1/security/rls-grant-function-matrix.json'];
  const schemaMap = Object.fromEntries(security.schemas.map((schema) => [schema.name, schema]));
  requireCondition(schemaMap.public?.product_tables_allowed === false, 'product tables must remain forbidden in public');
  requireCondition(schemaMap.platform_private?.data_api === 'not_exposed', 'platform_private must remain outside the Data API');
  requireCondition(security.relations.every((relation) => !relation.name.startsWith('public.')), 'security matrix must contain no public relations');
  requireCondition(security.relations.every((relation) => relation.rls_enabled && relation.rls_forced), 'every contracted relation must enable and force RLS');
  requireCondition(new Set(security.relations.map((relation) => relation.name)).size === security.relations.length, 'security matrix relation names must be unique');

  const expectedRelations = [
    'platform_shared.global_profiles',
    'platform_shared.services',
    'platform_shared.user_service_memberships',
    'platform_shared.service_activation_receipts',
    'platform_private.source_identity_ledger',
    'platform_private.identity_collision_adjudications',
    'discordos.user_profiles',
    'fitness.user_profiles',
    'mazer.user_profiles',
    'discordos.entitlements',
    'fitness.entitlements',
    'mazer.entitlements'
  ];
  requireCondition(sameValues(security.relations.map((relation) => relation.name), expectedRelations), 'security matrix relation set changed');

  for (const relation of security.relations) {
    requireCondition(digest(relation) === expectedRelationDigests[relation.name], `${relation.name}: exact grants and complete admitted policy set changed`);
    requireCondition(relation.grants.PUBLIC.length === 0, `${relation.name}: PUBLIC table grants are forbidden`);
    requireCondition(relation.grants.anon.every((operation) => operation === 'SELECT'), `${relation.name}: anon may only receive SELECT`);
    for (const policy of relation.policies) {
      const expression = `${policy.using ?? ''} ${policy.with_check ?? ''}`;
      requireCondition(!expression.includes('user_metadata') && !expression.includes('raw_user_meta_data'), `${relation.name}/${policy.name}: editable metadata authorization is forbidden`);
      requireCondition(!/\bhas_[a-z_]+\(/.test(expression), `${relation.name}/${policy.name}: undeclared authorization helper is forbidden`);
      if (policy.command === 'UPDATE') {
        requireCondition(Boolean(policy.using) && Boolean(policy.with_check), `${relation.name}/${policy.name}: UPDATE requires USING and WITH CHECK`);
      }
      const serviceId = productProfileServices[relation.name];
      if (serviceId) {
        requireCondition(expression.includes(`m.service_id = '${serviceId}'`), `${relation.name}/${policy.name}: product-profile access must require its service membership`);
        requireCondition(expression.includes('m.user_id = (select auth.uid())'), `${relation.name}/${policy.name}: membership row must bind directly to auth.uid()`);
        requireCondition(!/\bm\.user_id\s*=\s*user_id\b/.test(expression), `${relation.name}/${policy.name}: unqualified membership user predicate is tautological and forbidden`);
        requireCondition(expression.includes("m.state = 'active'") && !expression.includes("'suspended'"), `${relation.name}/${policy.name}: product-profile access must require active membership only`);
      }
    }
  }

  const globalProfile = security.relations.find((relation) => relation.name === 'platform_shared.global_profiles');
  requireCondition(!globalProfile?.grants.authenticated.includes('UPDATE'), 'platform_shared.global_profiles: relation-wide authenticated UPDATE is forbidden');
  requireCondition(Array.isArray(globalProfile?.authenticated_update_columns) && globalProfile.authenticated_update_columns.length === 0, 'platform_shared.global_profiles: direct authenticated update columns must remain empty until explicitly declared');
  requireCondition(sameValues(globalProfile?.server_owned_columns ?? [], protectedGlobalProfileColumns), 'platform_shared.global_profiles: server-owned column set changed');
  requireCondition((globalProfile?.authenticated_update_columns ?? []).every((column) => !protectedGlobalProfileColumns.includes(column)), 'platform_shared.global_profiles: immutable or server-owned columns cannot receive authenticated UPDATE');
  requireCondition(globalProfile?.policies.every((policy) => policy.command !== 'UPDATE'), 'platform_shared.global_profiles: direct authenticated UPDATE policy is forbidden without declared mutable columns');

  requireCondition(sameValues(security.functions.map((databaseFunction) => databaseFunction.name), Object.keys(expectedFunctionDigests)), 'security matrix function set changed');
  requireCondition(security.functions.length === Object.keys(expectedFunctionDigests).length, 'security matrix function count changed');

  for (const databaseFunction of security.functions) {
    requireCondition(digest(databaseFunction) === expectedFunctionDigests[databaseFunction.name], `${databaseFunction.name}: exact function contract changed`);
    requireCondition(databaseFunction.user_id_argument_allowed === false, `${databaseFunction.name}: user ID arguments are forbidden`);
    requireCondition(databaseFunction.execute_revoked_from.includes('PUBLIC'), `${databaseFunction.name}: PUBLIC execute must be revoked`);
    if (databaseFunction.security === 'DEFINER') {
      requireCondition(databaseFunction.name.startsWith('platform_private.') || databaseFunction.exposure === 'allowlisted_rpc', `${databaseFunction.name}: definer must be private or explicitly allowlisted`);
      requireCondition(databaseFunction.fixed_search_path === '', `${databaseFunction.name}: definer search_path must be fixed to empty`);
      requireCondition(!databaseFunction.execute_grants.includes('PUBLIC') && !databaseFunction.execute_grants.includes('anon'), `${databaseFunction.name}: unsafe execute grant`);
    }
  }

  const activationFunction = security.functions.find((databaseFunction) => databaseFunction.name === 'platform_shared.activate_service');
  requireCondition(activationFunction?.exposure === 'allowlisted_rpc', 'activation function must remain the only allowlisted RPC');
  requireCondition(activationFunction?.auth_uid_check === true && activationFunction?.subject_source === 'auth.uid()', 'caller-accessible activation RPC must derive and check auth.uid()');
  const authTrigger = security.functions.find((databaseFunction) => databaseFunction.name === 'platform_private.on_auth_user_created');
  requireCondition(authTrigger?.exposure === 'trigger_only', 'Auth user creation function must remain trigger-only');
  requireCondition(authTrigger?.auth_uid_check === false && authTrigger?.subject_source === 'NEW.id', 'Auth insert trigger must derive its subject from NEW.id without auth.uid()');

  failures.push(...validateRecoveryDocuments(documents).failures);

  return failures.sort((left, right) => left.localeCompare(right));
}

export function validateContracts() {
  const documents = loadDocuments();
  const schemaFailures = validateSchemaInstances(documents);
  const semanticFailures = validateSemantics(documents);
  const failures = [...schemaFailures, ...semanticFailures].sort((left, right) => left.localeCompare(right));
  return {
    ok: failures.length === 0,
    schema_count: schemaPaths().length,
    document_count: documentSpecs.length,
    semantic_check_groups: 20,
    failures
  };
}
