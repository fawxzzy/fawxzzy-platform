import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

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
  ['contracts/v1/auth/domain-session-contract.json', 'urn:fawxzzy:platform:schemas:v1:domain-session-contract']
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
  requireCondition(registry.target.ref === 'bxtcuhkotumitoqtrcej', 'target project ref changed');
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

  const lifecycle = documents['contracts/v1/membership/membership-lifecycle.json'];
  const transitions = new Set(lifecycle.transitions.map((transition) => [transition.from, transition.event, transition.to, transition.result, transition.profile_effect].join('|')));
  for (const requiredTransition of [
    '|authenticated_first_visit|active|ACTIVATED|CREATE_ATOMICALLY',
    'pending|authenticated_first_visit|active|ACTIVATED|CREATE_ATOMICALLY',
    'active|authenticated_first_visit|active|REUSED|REUSE',
    'suspended|authenticated_first_visit|suspended|REJECTED_SUSPENDED|PRESERVE'
  ]) {
    requireCondition(transitions.has(requiredTransition), `membership transition missing: ${requiredTransition}`);
  }

  const request = documents['contracts/v1/activation/activation-request.example.json'];
  requireCondition(!Object.hasOwn(request, 'user_id'), 'activation request must not accept user_id');
  requireCondition(!Object.hasOwn(request, 'subject_user_id'), 'activation request must not accept subject_user_id');
  const receipt = documents['contracts/v1/activation/activation-receipt.example.json'];
  requireCondition(receipt.subject_source === 'auth.uid()', 'activation subject must derive from auth.uid()');

  const domain = documents['contracts/v1/auth/domain-session-contract.json'];
  const origins = Object.fromEntries(domain.origins.map((origin) => [origin.role, origin.origin]));
  requireCondition(origins.hub === 'https://fawxzzy.com', 'hub origin changed');
  requireCondition(origins.account === 'https://account.fawxzzy.com', 'account origin changed');
  requireCondition(origins.fitness === 'https://fitness.fawxzzy.com', 'Fitness origin changed');
  requireCondition(origins.mazer === 'https://mazer.fawxzzy.com', 'Mazer origin changed');
  requireCondition(domain.session_model.browser_sessions === 'per_origin', 'phase-1 browser sessions must remain per-origin');
  requireCondition(domain.session_model.cross_origin_sso.status === 'BLOCKED', 'cross-origin SSO must remain deferred and BLOCKED');
  const configuredUrls = [...domain.auth_configuration.exact_redirect_urls, ...domain.auth_configuration.exact_recovery_urls];
  requireCondition(configuredUrls.every((url) => !url.includes('*')), 'production redirect and recovery URLs must be exact');
  requireCondition(domain.auth_configuration.preview_redirects.urls.length === 0, 'preview redirects must remain empty in this packet');

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
    requireCondition(relation.grants.PUBLIC.length === 0, `${relation.name}: PUBLIC table grants are forbidden`);
    requireCondition(relation.grants.anon.every((operation) => operation === 'SELECT'), `${relation.name}: anon may only receive SELECT`);
    for (const policy of relation.policies) {
      const expression = `${policy.using ?? ''} ${policy.with_check ?? ''}`;
      requireCondition(!expression.includes('user_metadata') && !expression.includes('raw_user_meta_data'), `${relation.name}/${policy.name}: editable metadata authorization is forbidden`);
      requireCondition(!/\bhas_[a-z_]+\(/.test(expression), `${relation.name}/${policy.name}: undeclared authorization helper is forbidden`);
      if (policy.command === 'UPDATE') {
        requireCondition(Boolean(policy.using) && Boolean(policy.with_check), `${relation.name}/${policy.name}: UPDATE requires USING and WITH CHECK`);
      }
    }
  }

  for (const databaseFunction of security.functions) {
    requireCondition(databaseFunction.user_id_argument_allowed === false, `${databaseFunction.name}: user ID arguments are forbidden`);
    requireCondition(databaseFunction.execute_revoked_from.includes('PUBLIC'), `${databaseFunction.name}: PUBLIC execute must be revoked`);
    if (databaseFunction.security === 'DEFINER') {
      requireCondition(databaseFunction.name.startsWith('platform_private.') || databaseFunction.exposure === 'allowlisted_rpc', `${databaseFunction.name}: definer must be private or explicitly allowlisted`);
      requireCondition(databaseFunction.fixed_search_path === '', `${databaseFunction.name}: definer search_path must be fixed to empty`);
      requireCondition(databaseFunction.auth_uid_check === true, `${databaseFunction.name}: definer must check auth.uid()`);
      requireCondition(!databaseFunction.execute_grants.includes('PUBLIC') && !databaseFunction.execute_grants.includes('anon'), `${databaseFunction.name}: unsafe execute grant`);
    }
  }

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
    semantic_check_groups: 10,
    failures
  };
}
