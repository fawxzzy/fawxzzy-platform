import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { validateRecoveryDocuments } from './recovery.mjs';
import { independentBackupContractPath, validateIndependentBackupContract } from './independent-backup-contract.mjs';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(moduleDirectory, '..', '..');

export const documentSpecs = Object.freeze([
  ['contracts/v1/registry/project-registry.json', 'urn:fawxzzy:platform:schemas:v1:project-registry'],
  ['contracts/v1/catalog/service-catalog.json', 'urn:fawxzzy:platform:schemas:v1:service-catalog'],
  ['contracts/v1/identity/identity-map.json', 'urn:fawxzzy:platform:schemas:v1:identity-map'],
  ['contracts/v1/auth/import-rehearsal-contract.json', 'urn:fawxzzy:platform:schemas:v1:import-rehearsal-contract'],
  ['contracts/v1/transport/app-data-transport-contract.json', 'urn:fawxzzy:platform:schemas:v1:app-data-transport-contract'],
  ['contracts/v1/transport/mazer-app-data-adapter-contract.json', 'urn:fawxzzy:platform:schemas:v1:mazer-app-data-adapter-contract'],
  ['contracts/v1/transport/fitness-app-data-adapter-contract.json', 'urn:fawxzzy:platform:schemas:v1:fitness-app-data-adapter-contract'],
  ['contracts/v1/transport/discordos-app-data-adapter-contract.json', 'urn:fawxzzy:platform:schemas:v1:discordos-app-data-adapter-contract'],
  ['contracts/v1/transport/app-data-receipt.example.json', 'urn:fawxzzy:platform:schemas:v1:app-data-receipt'],
  ['contracts/v1/transport/app-data-mutation-journal-contract.json', 'urn:fawxzzy:platform:schemas:v1:app-data-mutation-journal-contract'],
  ['contracts/v1/membership/membership-lifecycle.json', 'urn:fawxzzy:platform:schemas:v1:membership-lifecycle'],
  ['contracts/v1/activation/activation-request.example.json', 'urn:fawxzzy:platform:schemas:v1:activation-request'],
  ['contracts/v1/activation/activation-receipt.example.json', 'urn:fawxzzy:platform:schemas:v1:activation-receipt'],
  ['contracts/v1/gates/migration-gate-state.json', 'urn:fawxzzy:platform:schemas:v1:migration-gate-state'],
  ['contracts/v1/gates/cutover-retirement-gate-state.json', 'urn:fawxzzy:platform:schemas:v1:cutover-retirement-gate-state'],
  ['contracts/v1/gates/fitness-pr108-replay-gate.json', 'urn:fawxzzy:platform:schemas:v1:fitness-pr108-replay-gate'],
  ['contracts/v1/security/rls-grant-function-matrix.json', 'urn:fawxzzy:platform:schemas:v1:security-matrix'],
  ['contracts/v1/auth/domain-session-contract.json', 'urn:fawxzzy:platform:schemas:v1:domain-session-contract'],
  ['contracts/v1/recovery/micro-recovery-contract.json', 'urn:fawxzzy:platform:schemas:v1:micro-recovery-contract'],
  ['contracts/v1/recovery/backup-manifest.example.json', 'urn:fawxzzy:platform:schemas:v1:backup-manifest'],
  ['contracts/v1/recovery/external-effects-disable-manifest.example.json', 'urn:fawxzzy:platform:schemas:v1:external-effects-disable-manifest'],
  ['contracts/v1/recovery/restore-rehearsal-receipt.example.json', 'urn:fawxzzy:platform:schemas:v1:restore-rehearsal-receipt'],
  ['contracts/v1/recovery/independent-backup-contract.json', 'urn:fawxzzy:platform:schemas:v1:independent-backup-contract']
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
    product_profile: null,
    entitlement_contract: null
  }),
  fitness: Object.freeze({
    schema: 'fitness',
    product_profile: 'fitness.profiles',
    entitlement_contract: 'fitness.user_entitlements'
  }),
  mazer: Object.freeze({
    schema: 'mazer',
    product_profile: 'mazer.mazer_profiles',
    entitlement_contract: null
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
  'platform_shared.global_profiles': '6b1045570f892d3a43c025671abde390f05e65c8168d398b51ddb4029d3c1a3d',
  'platform_shared.services': '6355c701c16b03370ed099858f4c1458293c608a5f704366b5589caa64528638',
  'platform_shared.user_service_memberships': '8c2b419a75dfe9dd5391f48b31a98f3c8e1ee24443346cd4f5112147419bd5b9',
  'platform_shared.service_activation_receipts': '792af06db4ceb095a9f6cbdec0c63c8640af217287fa2125371e946e4608310c',
  'platform_private.source_identity_ledger': '9b08ad8a5420b29dc5426491453a01b078cdd4496f8b7183dcfab1e87e56dcb1',
  'platform_private.identity_collision_adjudications': '84df17b7ea9813742fee571d3b0930dfc9be2a798286669e99a5818d054adc95',
  'fitness.profiles': 'd1e6f4b1e62cd3d30f3664c453bb54ba2cd1272d1a03a3c7fa2f2ee8611bb04a',
  'mazer.mazer_profiles': '323b12075b0653d30d58ae2b7bc2ece79cf89d7e24017e2a251e27c2be5edbca',
  'fitness.user_entitlements': '0bbe4fcc3689edca3f2a97a42cc517aa90ffabcaab93491305a58285e82b06de'
});

const expectedFunctionDigests = Object.freeze({
  'platform_shared.activate_service': '37eb1247251921a3afc20f1da434655d6e72f20284b1bb078817f7d870cc9994',
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
  'fitness.profiles': 'fitness',
  'mazer.mazer_profiles': 'mazer'
});

const productProfileOwnerPredicates = Object.freeze({
  'fitness.profiles': '(select auth.uid()) = id',
  'mazer.mazer_profiles': '(select auth.uid()) = user_id'
});

const dataApiDecisionBindingV1 = Object.freeze({
  status: 'CURRENT',
  data_api_gate_version: '1.4.0',
  decision_id: 'FP-MAN-047',
  question_event_id: 'onv1_ed934a7382f5e52e6ceea9ea73011f9ff70a46d31bd6061a3dc7645946cad0df',
  question_payload_sha256: 'ed934a7382f5e52e6ceea9ea73011f9ff70a46d31bd6061a3dc7645946cad0df',
  answer_event_id: 'onv1_2a47e6b7bfb21d11ffe4cf87a7091f8aafb2d75ffebf25b3914dd6c03d8bb570',
  answer_payload_sha256: '2a47e6b7bfb21d11ffe4cf87a7091f8aafb2d75ffebf25b3914dd6c03d8bb570',
  answer_text_sha256: '3cf34735fbf4b2f83c811377d0a43903875e583a3409d4a4e75ca986d942e7b7',
  decision: 'APPROVE_ONE_GUARDED_REPRODUCTION_AFTER_SOURCE_ID_CORRECTION',
  policy_only: true,
  rejected_collision_decision_id: 'FP-MAN-037',
  rejected_collision_data_api_authority_granted: false,
  guarded_reproduction_attempt_limit: 1,
  guarded_reproduction_attempts_executed: 1,
  attempt_consumption_event_id: 'onv1_6258aed05023737d6403a35dcf0867e873ab64513578d25713c9584c830e3836',
  terminal_receipt_event_id: 'onv1_6515ddefc604a92dcf4849395a0dfd19a191b1139891a233318636f5a81e683b',
  terminal_outcome_classification: 'PREINTERACTION_LEDGER_VALIDATION_FAILURE',
  terminal_result: 'NO_SAVE_CONFIRMED',
  retry_permitted: false,
  dashboard_save_attempts: 0,
  post_attempt_readbacks: 0,
  rollback_save_attempts: 0,
  persisted_provider_mutations: 0,
  provider_execution_status: 'BLOCKED',
  apply_admitted: false
});

const providerCanonicalProvenance = Object.freeze({
  combined_provenance_sha256: '25a79bc6674f022159d08bf592566a141d869542195003932d6c220ef25c8684',
  digest_model: 'SEPARATE_MIGRATION_AND_GOVERNANCE_V1',
  migration_package_paths: Object.freeze([
    'bootstrap/manifests/collisions.v1.json',
    'bootstrap/manifests/data-effects.v1.json',
    'bootstrap/manifests/dispositions.v1.json',
    'bootstrap/manifests/dynamic-units.v1.json',
    'bootstrap/manifests/source-migrations.v1.json',
    'bootstrap/manifests/source-objects.v1.json',
    'bootstrap/artifacts/inert-sql/00000000000001_mazer_schema_inert.sql',
    'bootstrap/artifacts/inert-sql/00000000000002_fitness_schema_inert.sql',
    'bootstrap/artifacts/inert-sql/00000000000003_discordos_schema_inert.sql',
    'bootstrap/artifacts/inert-sql/00000000000004_platform_security_overlay_inert.sql'
  ]),
  migration_package_sha256: 'b65d1c0b73607218cc37826d9bb77c25704ea18f957abba7b5667a79d0a2c8db',
  governance_manifest_paths: Object.freeze(['bootstrap/manifests/namespace-plan.v1.json']),
  governance_manifest_sha256: '9b2b0474aa462ec63e9ba364d29d6508afd04e0069ba759de87d46ce1ba5e11a',
  legacy_combined_package_sha256: '80482b9bbfaf70b5980dd290b78def12d0af898cc10ee12f402b46d378fdbf83',
  effect_mappings_sha256: 'b5273c803e8e747e4486defdc6331c00e08b7f9938aea3ae9a8775bf47dfd491',
  sources: Object.freeze([
    Object.freeze({ app: 'discordos', project_ref: 'nwexsktuuenfdegzrbut', provider_ledger_migration_count: 17, current_git_migration_count: 11, complete_catalog_sha256: 'd5c5cea4195d6c3f7ec4445bb389534f9b97df3fccfcbf28aab64d90d0372cf7' }),
    Object.freeze({ app: 'mazer', project_ref: 'geknvnrmktchljnyddwp', provider_ledger_migration_count: 4, current_git_migration_count: 3, complete_catalog_sha256: '7eae1b6d58f2eee065b9ba2030684e7171ae02eb2aaa520d191c9d78cee79436' })
  ])
});

const appDataTransportLifecycle = Object.freeze([
  'S0_COMPLETE_SNAPSHOT',
  'SOURCE_WRITES_CONTINUE',
  'S1_COMPLETE_KEY_AND_ROW_DIFF',
  'EXPLICIT_TOMBSTONES',
  'AUTHORIZED_WRITE_BARRIER',
  'S2_FINAL_DIFF',
  'CAS_APPLY',
  'PARITY',
  'OBSERVATION',
  'SEPARATELY_APPROVED_SOURCE_PAUSE'
]);

const appDataIdempotencyComponents = Object.freeze([
  'contract_id',
  'contract_version',
  'source_anchor',
  'snapshot_commitment',
  'relation',
  'private_key_commitment',
  'operation',
  'source_row_digest',
  'transform_version'
]);

const appDataDependencyGates = Object.freeze([
  'DATA_API_CONTAINMENT',
  'ACCEPTED_RECOVERY_AND_QUARANTINED_RESTORE',
  'FAITHFUL_CONTAINED_REPLAY',
  'TARGET_BOOTSTRAP',
  'SHARED_AUTH_IDENTITY_MAPPING',
  'SERVICE_MEMBERSHIP_READINESS',
  'THREE_APP_ADAPTERS'
]);

const appDataReceiptForbiddenClasses = Object.freeze([
  'raw_rows',
  'primary_keys',
  'names',
  'emails',
  'usernames',
  'user_numbers_or_ranges',
  'uuids_or_ranges',
  'secrets',
  'project_refs',
  'sql',
  'payloads',
  'provider_responses',
  'machine_paths'
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

function exactOrderedValues(actual, expected) {
  return Array.isArray(actual) && JSON.stringify(actual) === JSON.stringify(expected);
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function canonicalDigest(value) {
  return crypto.createHash('sha256').update(`${JSON.stringify(value, null, 2)}\n`).digest('hex');
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

export function validateAppDataReceiptSanitization(receipt) {
  const failures = [];
  const forbiddenKeyPatterns = [
    [/^raw_?rows?$/i, 'FORBIDDEN_FIELD_RAW_ROWS'],
    [/^primary_?keys?$/i, 'FORBIDDEN_FIELD_PRIMARY_KEYS'],
    [/^(?:full_?)?names?$/i, 'FORBIDDEN_FIELD_NAMES'],
    [/^emails?$/i, 'FORBIDDEN_FIELD_EMAILS'],
    [/^usernames?$/i, 'FORBIDDEN_FIELD_USERNAMES'],
    [/^user_?numbers?(?:_ranges?)?$/i, 'FORBIDDEN_FIELD_USER_NUMBERS'],
    [/^uuids?(?:_ranges?)?$/i, 'FORBIDDEN_FIELD_UUIDS'],
    [/(?:^|_)secrets?$/i, 'FORBIDDEN_FIELD_SECRETS'],
    [/^project_?refs?$/i, 'FORBIDDEN_FIELD_PROJECT_REFS'],
    [/^(?:raw_?)?sql$/i, 'FORBIDDEN_FIELD_SQL'],
    [/^payloads?$/i, 'FORBIDDEN_FIELD_PAYLOADS'],
    [/^provider_?responses?$/i, 'FORBIDDEN_FIELD_PROVIDER_RESPONSES'],
    [/^machine_?paths?$/i, 'FORBIDDEN_FIELD_MACHINE_PATHS'],
    [/(?:^|_)(?:tokens?|credentials?|api_?keys?|passwords?)$/i, 'FORBIDDEN_FIELD_CREDENTIALS']
  ];
  let failureOrdinal = 0;
  const emit = (code) => {
    failureOrdinal += 1;
    failures.push(`receipt sanitization failure ${String(failureOrdinal).padStart(6, '0')}: ${code}`);
  };
  const classifyString = (value) => {
    const classes = [];
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) classes.push('EMAIL');
    if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) classes.push('UUID');
    if (/^[a-z]{20}$/.test(value)) classes.push('PROJECT_REF');
    if (/^(?:[A-Za-z]:\\|\/(?:home|Users|tmp|var|workspace)\/)/.test(value)) classes.push('MACHINE_PATH');
    if (/\b(?:select\s+.+\s+from|insert\s+into|update\s+.+\s+set|delete\s+from|create\s+(?:table|function|schema)|alter\s+(?:table|function|schema)|drop\s+(?:table|function|schema))\b/i.test(value)) classes.push('SQL');
    if (/^(?:gh[pousr]_[A-Za-z0-9]{20,}|(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{16,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})$/.test(value)) classes.push('CREDENTIAL');
    return classes;
  };
  const inspect = (value) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => inspect(entry));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, entry] of Object.entries(value)) {
        for (const [pattern, code] of forbiddenKeyPatterns) {
          if (pattern.test(key)) emit(code);
        }
        for (const classification of classifyString(key)) emit(`FORBIDDEN_PROPERTY_NAME_${classification}`);
        inspect(entry);
      }
      return;
    }
    if (typeof value !== 'string') return;
    for (const classification of classifyString(value)) emit(`FORBIDDEN_VALUE_${classification}`);
  };
  inspect(receipt);
  return failures.sort((left, right) => left.localeCompare(right));
}

export function validateFitnessDiscordMemberLinkOwnerRekeyEvidence(policy, evidence) {
  const failures = [];
  const mappings = Array.isArray(evidence?.accepted_mappings) ? evidence.accepted_mappings : [];
  const isCommitment = (value) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
  if (evidence?.caller_supplied_identity !== false) {
    failures.push('Fitness Discord owner rekey evidence forbids caller-selected identity');
  }
  if (evidence?.discord_identifier_as_identity_evidence !== false) {
    failures.push('Fitness Discord owner rekey evidence forbids Discord identifier authority');
  }
  if (mappings.length === 0) {
    failures.push('Fitness Discord owner rekey evidence requires one accepted mapping');
  } else if (mappings.length > 1) {
    failures.push('Fitness Discord owner rekey evidence rejects duplicate accepted mappings');
  } else {
    const mapping = mappings[0] ?? {};
    const exactMapping = isCommitment(evidence?.source_owner_commitment)
      && mapping.source_relation === policy?.source_relation
      && mapping.source_owner_key === policy?.source_owner_key
      && mapping.source_owner_commitment === evidence.source_owner_commitment
      && isCommitment(mapping.target_user_commitment)
      && mapping.source_identity_ledger === policy?.source_identity_ledger
      && mapping.controlled_auth_mapping_contract === policy?.controlled_auth_mapping_contract
      && mapping.accepted === true;
    if (!exactMapping) {
      failures.push('Fitness Discord owner rekey evidence rejects contradictory mapping');
    }
  }
  return failures.sort((left, right) => left.localeCompare(right));
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

  const fitnessReplayGate = documents['contracts/v1/gates/fitness-pr108-replay-gate.json'];
  const fitnessReplayCandidate = fitnessReplayGate.fitness_candidate ?? {};
  const fitnessReplayCandidateMigration = fitnessReplayCandidate.candidate_migration ?? {};
  const hostedReplayAdapter = fitnessReplayGate.hosted_replay_adapter ?? {};
  const hostedReplaySourceReview = hostedReplayAdapter.source_review ?? {};
  const hostedReplayMerge = hostedReplayAdapter.merge ?? {};
  const hostedReplayWorkflow = hostedReplayAdapter.default_branch_workflow ?? {};
  const fitnessReplayAcceptedBootstrap = fitnessReplayGate.accepted_bootstrap ?? {};
  const fitnessReplayLifecycle = fitnessReplayGate.lifecycle ?? {};
  requireCondition(fitnessReplayGate.version === '1.2.0' && fitnessReplayGate.gate_id === 'fitness-pr108-replay-gate', 'Fitness PR 108 replay gate v1.2.0 identity drift');
  requireCondition(fitnessReplayGate.status === 'BLOCKED' && fitnessReplayGate.apply_admitted === false, 'Fitness PR 108 replay gate must remain non-executable and BLOCKED');
  requireCondition(fitnessReplayGate.provenance_only === true, 'Fitness PR 108 and hosted replay evidence must remain provenance-only');
  requireCondition(fitnessReplayCandidate.head_commit === '4ff406c92c1d9b9e7ab23a4ebdaa01820b9b5c01' && fitnessReplayCandidate.head_tree === 'e8314980790dd9c711f63f4b38ad61e59ec6f409', 'Fitness PR 108 candidate head/tree drift');
  requireCondition(fitnessReplayCandidate.accepted_migration_count === 101 && fitnessReplayCandidate.candidate_migration_count === 102 && fitnessReplayCandidate.accepted_chain_sha256 === '236ded2d260b2787838219f6e54fa63cbed80a8581930f165ca6025bca91db3a' && fitnessReplayCandidate.candidate_chain_sha256 === '711445d03b3d98466c278c4dfcbaa7cda326f188427b6dbcd55065fae1a2bbb5', 'Fitness PR 108 migration denominator or chain digest drift');
  requireCondition(fitnessReplayCandidateMigration.path === 'supabase/migrations/20260718015422_retire_human_member_number_compaction.sql' && fitnessReplayCandidateMigration.blob === '007eca9503dfd10a6910a27b02a46def30583d18' && fitnessReplayCandidateMigration.byte_count === 15431 && fitnessReplayCandidateMigration.raw_sha256 === 'ca502e3bcef4532ce4de336d33334c5620efaf3863286db51f6440bb9224662d', 'Fitness PR 108 candidate migration identity drift');
  requireCondition(fitnessReplayCandidate.review?.exact_head_terminal_review === 'BLOCKED', 'Fitness PR 108 exact-head terminal review must remain BLOCKED');
  requireCondition(hostedReplayAdapter.repository === 'fawxzzy/hosted-replay-harness' && hostedReplayAdapter.pull_request === 2 && hostedReplayAdapter.changed_path_count === 12, 'hosted replay adapter repository denominator drift');
  requireCondition(hostedReplaySourceReview.base_commit === '82cbd3b195dd5a07c3b437946f4404041f749508' && hostedReplaySourceReview.head_commit === '475967d9dcf4a859f53d535e95e3f77a5396bd21' && hostedReplaySourceReview.head_tree === '4a6f258c4f6a600327518bf63458217f11511150', 'hosted replay reviewed source identity drift');
  requireCondition(hostedReplaySourceReview.source_branch === 'codex/fitness-pr108-full-chain-replay-source' && hostedReplaySourceReview.source_branch_preserved === true && hostedReplaySourceReview.request_comment === 5031568065 && hostedReplaySourceReview.terminal_clean_comment === 5031595633 && hostedReplaySourceReview.thread_count === 7 && hostedReplaySourceReview.unresolved_thread_count === 0 && hostedReplaySourceReview.status === 'CURRENT', 'hosted replay source review evidence drift');
  requireCondition(hostedReplayMerge.commit === 'e513d2b241d34b8fac838b65c6444e34a4b5ce7a' && hostedReplayMerge.tree === '4a6f258c4f6a600327518bf63458217f11511150' && hostedReplayMerge.reviewed_head_ancestor === true && hostedReplayMerge.reviewed_tree_byte_identical === true && hostedReplayMerge.status === 'CURRENT', 'hosted replay merged provenance drift');
  requireCondition(hostedReplayWorkflow.path === '.github/workflows/fitness-full-chain-replay.yml' && hostedReplayWorkflow.blob === '07e784ad91cf2cfb62ea9c6e0b8d407fe5b652c4' && hostedReplayWorkflow.byte_count === 1904 && hostedReplayWorkflow.raw_sha256 === 'f43ba4498c0d9755b1fd23082b5da21d8f937b2ebf7373aec63d78562a35b062' && hostedReplayWorkflow.trigger === 'workflow_dispatch' && hostedReplayWorkflow.source_status === 'CURRENT', 'hosted replay default-branch workflow identity drift');
  requireCondition(hostedReplayWorkflow.dispatch_run_count === 0 && hostedReplayWorkflow.execution === 'BLOCKED' && hostedReplayAdapter.replay_execution === 'BLOCKED', 'hosted replay workflow dispatch and replay execution must remain zero and BLOCKED');
  requireCondition(hostedReplayWorkflow.runner_label === 'fp-hosted-replay-jit-v1' && hostedReplayWorkflow.runner_availability === 'UNKNOWN' && hostedReplayWorkflow.runner_use === 'BLOCKED', 'hosted replay JIT runner must remain exact-label UNKNOWN and held');
  requireCondition(fitnessReplayAcceptedBootstrap.migration_count === 122 && fitnessReplayAcceptedBootstrap.discordos_migration_count === 17 && fitnessReplayAcceptedBootstrap.fitness_migration_count === 101 && fitnessReplayAcceptedBootstrap.mazer_migration_count === 4, 'accepted bootstrap migration denominator drift');
  requireCondition(fitnessReplayAcceptedBootstrap.migration_package_sha256 === providerCanonicalProvenance.migration_package_sha256 && fitnessReplayAcceptedBootstrap.apply_admitted === false && fitnessReplayAcceptedBootstrap.candidate_migration_present === false, 'accepted bootstrap migration package must remain byte-identical and exclude the Fitness candidate');
  requireCondition(fitnessReplayLifecycle.candidate_source_review === 'BLOCKED', 'candidate_source_review must remain BLOCKED');
  requireCondition(fitnessReplayLifecycle.adapter_source_review === 'CURRENT' && fitnessReplayLifecycle.adapter_merge === 'CURRENT', 'accepted hosted replay source review and merge must remain CURRENT');
  requireCondition(fitnessReplayLifecycle.workflow_dispatch === 'BLOCKED' && fitnessReplayLifecycle.runner_readiness === 'UNKNOWN', 'workflow dispatch must remain BLOCKED and runner readiness UNKNOWN');
  for (const lifecycleUnit of ['replay_execution', 'fitness_merge', 'target_apply']) {
    requireCondition(fitnessReplayLifecycle[lifecycleUnit] === 'BLOCKED', `${lifecycleUnit} must remain BLOCKED`);
  }

  const migrationGate = documents['contracts/v1/gates/migration-gate-state.json'];
  requireCondition(canonicalDigest(migrationGate.data_api_decision_binding ?? {}) === canonicalDigest(dataApiDecisionBindingV1), 'Data API manual decision binding drift');
  const sharedAuthImportGate = migrationGate.shared_auth_import_reauth_rehearsal ?? {};
  requireCondition(sharedAuthImportGate.status === 'CURRENT' && sharedAuthImportGate.source_contract_lifecycle === 'SOURCE_READY' && sharedAuthImportGate.execution_lifecycle === 'EXECUTION_BLOCKED' && sharedAuthImportGate.apply_admitted === false, 'shared Auth import migration gate must remain source-ready, execution-blocked, and non-executable');
  requireCondition(sharedAuthImportGate.contract_path === 'contracts/v1/auth/import-rehearsal-contract.json' && sharedAuthImportGate.research_denominator_sha256 === 'e102c0c65897642735daf6555aa1111432bfeb74e484fbe16e483b1366581820', 'shared Auth import migration gate binding drift');
  const appDataTransport = documents['contracts/v1/transport/app-data-transport-contract.json'] ?? {};
  const mazerAppDataAdapter = documents['contracts/v1/transport/mazer-app-data-adapter-contract.json'] ?? {};
  const fitnessAppDataAdapter = documents['contracts/v1/transport/fitness-app-data-adapter-contract.json'] ?? {};
  const discordosAppDataAdapter = documents['contracts/v1/transport/discordos-app-data-adapter-contract.json'] ?? {};
  const appDataReceipt = documents['contracts/v1/transport/app-data-receipt.example.json'] ?? {};
  const appDataJournal = documents['contracts/v1/transport/app-data-mutation-journal-contract.json'] ?? {};
  const appDataGate = migrationGate.app_data_transport ?? {};
  const appDataAdaptersGate = migrationGate.app_data_adapters ?? {};
  requireCondition(appDataTransport.status === 'CURRENT' && appDataTransport.lifecycle?.source_contract === 'SOURCE_READY' && appDataTransport.lifecycle?.execution === 'EXECUTION_BLOCKED' && appDataTransport.apply_admitted === false, 'app data transport must remain source-ready, execution-blocked, and non-executable');
  requireCondition(appDataTransport.research_evidence?.research_denominator_sha256 === 'ae397c89afaf23231c2911d571d9799fabbb7a21196044f6679763e7515cf087' && appDataTransport.research_evidence?.design_path_sha256 === 'f7554683cf3d9add36634afb6e6b543983d9968a600e05cf3ee885cc0a6f53ac', 'app data transport research bindings drift');
  requireCondition(appDataTransport.scope?.app_agnostic === true && appDataTransport.scope?.app_adapter_count_required === 3 && appDataTransport.scope?.app_relation_mappings_included === false && appDataTransport.scope?.auth_state_included === false && appDataTransport.scope?.provider_execution_included === false, 'app data transport must remain generic and provider-free');
  requireCondition(exactOrderedValues(appDataTransport.transport_lifecycle, appDataTransportLifecycle), 'app data transport lifecycle order drift');
  requireCondition(exactOrderedValues(appDataTransport.snapshot_protocol?.required_snapshots, ['S0', 'S1', 'S2']) && appDataTransport.snapshot_protocol?.complete_primary_key_set_comparison === true && appDataTransport.snapshot_protocol?.canonical_row_digest_comparison === true && appDataTransport.snapshot_protocol?.accelerators_replace_complete_comparison === false && appDataTransport.snapshot_protocol?.S2_final_diff_required_after_write_barrier === true, 'app data snapshot denominator must remain complete at S0, S1, and S2');
  requireCondition(exactOrderedValues(appDataTransport.snapshot_protocol?.S1_diff_classes, ['INSERT', 'UPDATE', 'DELETE', 'RESURRECTION']), 'app data diff classes must include explicit insert, update, delete, and resurrection');
  requireCondition(appDataTransport.dependency_ordering?.inserts_and_updates === 'PARENT_FIRST' && appDataTransport.dependency_ordering?.deletes === 'CHILD_FIRST' && appDataTransport.dependency_ordering?.foreign_key_cycles?.declared_staging_plan_required === true && appDataTransport.dependency_ordering?.foreign_key_cycles?.synthetic_proof_required === true, 'app data dependency and cycle ordering drift');
  requireCondition(appDataTransport.mutation_model?.deletes_require_explicit_tombstones === true && exactOrderedValues(appDataTransport.mutation_model?.reappearing_key_requires, ['EXPLICIT_RESURRECTION', 'NEW_GENERATION']) && appDataTransport.mutation_model?.implicit_resurrection_as_update_forbidden === true, 'app data tombstone and resurrection semantics drift');
  requireCondition(exactOrderedValues(appDataTransport.mutation_model?.idempotency_key_components, appDataIdempotencyComponents) && appDataTransport.mutation_model?.matching_applied_mutation === 'IDEMPOTENT_REUSE', 'app data idempotency-key binding drift');
  requireCondition(exactOrderedValues(appDataTransport.compare_and_swap?.accepted_expected_target, ['ABSENT', 'EXACT_DIGEST']) && appDataTransport.compare_and_swap?.unexpected_target_digest === 'QUARANTINE' && appDataTransport.compare_and_swap?.unexpected_target_overwrite_forbidden === true, 'app data CAS conflict handling must remain fail-closed');
  requireCondition(appDataTransport.derived_and_external_effects?.derived_cache_rebuild_after_authoritative_parity === true && appDataTransport.derived_and_external_effects?.external_effects_during_rehearsal_and_rollback === 'QUARANTINED', 'app data cache or external-effect boundary drift');
  requireCondition(appDataTransport.journal_and_rollback?.append_only === true && appDataTransport.journal_and_rollback?.complete_reverse_evidence_required === true && appDataTransport.journal_and_rollback?.rollback_order === 'REVERSE_DEPENDENCY_ORDER' && appDataTransport.journal_and_rollback?.reverse_catch_up_to_source === 'SEPARATE_EXPLICIT_AUTHORITY', 'app data rollback contract drift');
  requireCondition(exactOrderedValues(appDataTransport.dependency_gates, appDataDependencyGates), 'app data dependency-gate denominator drift');
  requireCondition(exactOrderedValues(appDataTransport.public_receipt_policy?.forbidden_classes, appDataReceiptForbiddenClasses), 'app data public receipt forbidden-class denominator drift');
  requireCondition(appDataJournal.status === 'CURRENT' && appDataJournal.lifecycle?.source_contract === 'SOURCE_READY' && appDataJournal.lifecycle?.execution === 'EXECUTION_BLOCKED' && appDataJournal.apply_admitted === false && appDataJournal.append_only === true, 'app data mutation journal must remain source-ready, execution-blocked, append-only, and non-executable');
  requireCondition(appDataJournal.completeness?.every_committed_mutation_recorded === true && appDataJournal.completeness?.every_idempotent_reuse_recorded === true && appDataJournal.completeness?.every_conflict_quarantine_recorded === true && appDataJournal.completeness?.sequence_contiguous === true && appDataJournal.completeness?.digest_chain_required === true, 'app data mutation journal completeness drift');
  requireCondition(appDataJournal.rollback?.reverse_dependency_order === true && appDataJournal.rollback?.reverse_commit_sequence === true && appDataJournal.rollback?.preimage_digest_required === true && appDataJournal.rollback?.post_rollback_digest_required === true && appDataJournal.rollback?.reverse_catch_up_to_source === 'SEPARATE_EXPLICIT_AUTHORITY', 'app data mutation journal rollback evidence drift');
  requireCondition(appDataReceipt.status === 'BLOCKED' && appDataReceipt.execution_lifecycle === 'EXECUTION_BLOCKED' && appDataReceipt.apply_admitted === false && appDataReceipt.synthetic_fixture === true && appDataReceipt.source_pause_authorized === false, 'app data public receipt must remain synthetic, blocked, and non-executable');
  requireCondition(appDataReceipt.snapshot_completeness?.S0_complete === true && appDataReceipt.snapshot_completeness?.S1_complete_key_and_row_diff === true && appDataReceipt.snapshot_completeness?.S2_complete_key_and_row_diff === true && appDataReceipt.snapshot_completeness?.explicit_tombstones_complete === true, 'app data public receipt snapshot denominator drift');
  requireCondition(appDataReceipt.cas_counts?.unexpected_overwrite === 0 && appDataReceipt.cas_counts?.conflict_quarantine > 0, 'app data public receipt must quarantine CAS conflicts without overwriting');
  requireCondition(appDataReceipt.journal_and_rollback?.append_only === true && appDataReceipt.journal_and_rollback?.complete === true && appDataReceipt.journal_and_rollback?.reverse_dependency_order_proven === true, 'app data public receipt journal proof drift');
  failures.push(...validateAppDataReceiptSanitization(appDataReceipt));
  requireCondition(appDataGate.status === 'CURRENT' && appDataGate.source_contract_lifecycle === 'SOURCE_READY' && appDataGate.execution_lifecycle === 'EXECUTION_BLOCKED' && appDataGate.apply_admitted === false && appDataGate.dependency_status === 'BLOCKED', 'app data migration gate must remain source-ready, execution-blocked, dependency-blocked, and non-executable');
  requireCondition(appDataGate.contract_path === 'contracts/v1/transport/app-data-transport-contract.json' && appDataGate.receipt_path === 'contracts/v1/transport/app-data-receipt.example.json' && appDataGate.mutation_journal_contract_path === 'contracts/v1/transport/app-data-mutation-journal-contract.json' && appDataGate.research_denominator_sha256 === appDataTransport.research_evidence?.research_denominator_sha256 && appDataGate.design_path_sha256 === appDataTransport.research_evidence?.design_path_sha256, 'app data migration gate binding drift');
  requireCondition(mazerAppDataAdapter.status === 'CURRENT' && mazerAppDataAdapter.lifecycle?.source_contract === 'SOURCE_READY' && mazerAppDataAdapter.lifecycle?.execution === 'EXECUTION_BLOCKED' && mazerAppDataAdapter.apply_admitted === false, 'Mazer app data adapter must remain source-ready, execution-blocked, and non-executable');
  requireCondition(mazerAppDataAdapter.generic_contract_path === 'contracts/v1/transport/app-data-transport-contract.json', 'Mazer app data adapter generic contract binding drift');
  requireCondition(mazerAppDataAdapter.identity_and_activation?.canonical_human_key === 'auth.users.id' && mazerAppDataAdapter.identity_and_activation?.source_identity_ledger === 'platform_private.source_identity_ledger' && mazerAppDataAdapter.identity_and_activation?.identity_rekey_required === true, 'Mazer app data adapter identity rekey boundary drift');
  requireCondition(mazerAppDataAdapter.identity_and_activation?.activation_subject_source === 'auth.uid()' && mazerAppDataAdapter.identity_and_activation?.caller_supplied_user_id_allowed === false && mazerAppDataAdapter.identity_and_activation?.presentation_values_as_identity_evidence === false, 'Mazer app data adapter activation subject boundary drift');
  const mazerProfileSeed = mazerAppDataAdapter.identity_and_activation?.profile_seed ?? {};
  const mazerAbsentProfilePolicy = mazerProfileSeed.source_profile_absent_policy ?? {};
  requireCondition(mazerProfileSeed.storage === 'PRIVATE_COMMITMENT' && mazerProfileSeed.lookup === 'SERVER_SIDE_IDENTITY_MAPPING' && mazerProfileSeed.consumption === 'ATOMIC_WITH_ACTIVATION' && mazerProfileSeed.direct_pre_activation_insert_allowed === false && mazerProfileSeed.source_profile_present_exact_parity_required === true, 'Mazer profile activation-seed boundary drift');
  requireCondition(mazerAbsentProfilePolicy.detection === 'COMPLETE_S0_S1_S2_PROFILE_KEY_ABSENCE' && exactOrderedValues(mazerAbsentProfilePolicy.trigger_relations, ['public.mazer_progression_states', 'public.mazer_ai_progression_states', 'public.mazer_cycle_receipts']) && mazerAbsentProfilePolicy.seed_version === 'mazer-profile-default-v1' && mazerAbsentProfilePolicy.seed_origin === 'SERVER_OWNED_SCHEMA_DEFAULT' && canonicalDigest(mazerAbsentProfilePolicy.default_columns) === canonicalDigest({ display_name: null, selected_control_mode: 'stick', settings: {} }) && exactOrderedValues(mazerAbsentProfilePolicy.server_timestamp_columns, ['created_at', 'updated_at']) && mazerAbsentProfilePolicy.caller_values_allowed === false && mazerAbsentProfilePolicy.direct_pre_activation_insert_allowed === false && mazerAbsentProfilePolicy.activation === 'ATOMIC_WITH_PENDING_MEMBERSHIP' && mazerAbsentProfilePolicy.source_rows_transport_outcome === 'PRESERVE_AFTER_ACTIVATION' && mazerAbsentProfilePolicy.unproven_absence_outcome === 'QUARANTINE_PENDING_MEMBERSHIP' && mazerAbsentProfilePolicy.silent_drop_allowed === false, 'Mazer absent-source-profile activation boundary drift');
  const expectedMazerRelations = [
    ['public.mazer_profiles', 'mazer.mazer_profiles', 'AUTHORITATIVE_ACTIVATION_SEED', ['user_id'], 'PRIVATE_SEED_THEN_ATOMIC_ACTIVATION'],
    ['public.mazer_progression_states', 'mazer.mazer_progression_states', 'AUTHORITATIVE_STATE', ['user_id'], 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP'],
    ['public.mazer_ai_progression_states', 'mazer.mazer_ai_progression_states', 'AUTHORITATIVE_PER_RUNNER_STATE', ['user_id', 'runner_key'], 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP'],
    ['public.mazer_cycle_receipts', 'mazer.mazer_cycle_receipts', 'AUTHORITATIVE_APPEND_ONLY_HISTORY', ['id'], 'PRESERVE_IDENTITY_APPEND_ONLY']
  ];
  const actualMazerRelations = (mazerAppDataAdapter.relations ?? []).map((relation) => [relation.source_relation, relation.target_relation, relation.classification, relation.primary_key, relation.transport_mode]);
  requireCondition(canonicalDigest(actualMazerRelations) === canonicalDigest(expectedMazerRelations), 'Mazer app data relation denominator drift');
  requireCondition(mazerAppDataAdapter.relations?.[1]?.accelerators_replace_complete_comparison === false && exactOrderedValues(mazerAppDataAdapter.relations?.[1]?.accelerators, ['revision']), 'Mazer progression revision must remain an accelerator only');
  requireCondition(mazerAppDataAdapter.relations?.[2]?.all_source_columns_authoritative === true && mazerAppDataAdapter.relations?.[2]?.independent_runner_keys_preserved === true && exactOrderedValues(mazerAppDataAdapter.relations?.[2]?.authoritative_payload_columns, ['state', 'summary']) && mazerAppDataAdapter.relations?.[2]?.complete_runner_key_set_parity_required === true && mazerAppDataAdapter.relations?.[2]?.rebuild_from_human_progression_allowed === false && mazerAppDataAdapter.relations?.[2]?.target_default_runner_key_allowed === false && exactOrderedValues(mazerAppDataAdapter.relations?.[2]?.allowed_operations, ['INSERT', 'UPDATE', 'IDEMPOTENT_REUSE', 'EXPLICIT_TOMBSTONE']), 'Mazer AI runner authoritative state boundary drift');
  requireCondition(mazerAppDataAdapter.relations?.[3]?.target_default_identity_generation_allowed === false && exactOrderedValues(mazerAppDataAdapter.relations?.[3]?.allowed_operations, ['INSERT', 'IDEMPOTENT_REUSE', 'EXPLICIT_TOMBSTONE']), 'Mazer cycle receipt identity and append-only boundary drift');
  requireCondition(exactOrderedValues(mazerAppDataAdapter.dependency_ordering?.insert_update_order, ['auth_mapping', 'pending_membership', 'atomic_profile_seed_activation', 'progression', 'ai_runner_progression', 'cycle_receipts']) && exactOrderedValues(mazerAppDataAdapter.dependency_ordering?.delete_order, ['cycle_receipt_tombstones', 'ai_runner_progression_tombstones', 'progression_tombstones', 'profile_preserve']) && mazerAppDataAdapter.dependency_ordering?.foreign_key_cycles === 'NONE' && mazerAppDataAdapter.dependency_ordering?.external_effects === 'QUARANTINED', 'Mazer app data dependency ordering drift');
  requireCondition(exactOrderedValues(mazerAppDataAdapter.snapshot_and_cas?.required_snapshots, ['S0', 'S1', 'S2']) && mazerAppDataAdapter.snapshot_and_cas?.complete_primary_key_set_comparison === true && mazerAppDataAdapter.snapshot_and_cas?.complete_canonical_row_digest_comparison === true && mazerAppDataAdapter.snapshot_and_cas?.revision_or_timestamp_only_proof_allowed === false, 'Mazer app data snapshot denominator must remain complete');
  requireCondition(exactOrderedValues(mazerAppDataAdapter.snapshot_and_cas?.accepted_expected_target, ['ABSENT', 'EXACT_DIGEST']) && mazerAppDataAdapter.snapshot_and_cas?.unexpected_target_digest === 'QUARANTINE' && mazerAppDataAdapter.snapshot_and_cas?.unexpected_target_overwrite_allowed === false, 'Mazer app data CAS overwrite boundary drift');
  requireCondition(mazerAppDataAdapter.deletion_and_rollback?.explicit_tombstones_required === true && mazerAppDataAdapter.deletion_and_rollback?.implicit_cascade_authority === false && mazerAppDataAdapter.deletion_and_rollback?.profile_delete_action === 'SUSPEND_AND_PRESERVE' && mazerAppDataAdapter.deletion_and_rollback?.membership_hard_delete === 'FORBIDDEN', 'Mazer app data deletion preservation boundary drift');
  requireCondition(exactOrderedValues(mazerAppDataAdapter.public_receipt_policy?.forbidden_classes, appDataReceiptForbiddenClasses) && mazerAppDataAdapter.canonicalization?.raw_values_in_public_receipts === false, 'Mazer app data public receipt redaction boundary drift');
  requireCondition(mazerAppDataAdapter.dependency_gates?.data_api_containment === 'BLOCKED' && mazerAppDataAdapter.dependency_gates?.fitness_adapter === 'BLOCKED' && mazerAppDataAdapter.dependency_gates?.discordos_adapter === 'BLOCKED' && mazerAppDataAdapter.dependency_gates?.target_apply === 'BLOCKED', 'Mazer app data dependency gates must remain blocked');
  requireCondition(exactOrderedValues(appDataAdaptersGate.required_order, ['mazer', 'fitness', 'discordos']) && exactOrderedValues(appDataAdaptersGate.source_ready, ['mazer', 'fitness', 'discordos']) && exactOrderedValues(appDataAdaptersGate.blocked, []), 'app data adapter readiness denominator drift');
  requireCondition(appDataAdaptersGate.mazer_contract_path === 'contracts/v1/transport/mazer-app-data-adapter-contract.json' && appDataAdaptersGate.mazer_relation_count === 4 && appDataAdaptersGate.fitness_contract_path === 'contracts/v1/transport/fitness-app-data-adapter-contract.json' && appDataAdaptersGate.fitness_relation_count === 27 && appDataAdaptersGate.discordos_contract_path === 'contracts/v1/transport/discordos-app-data-adapter-contract.json' && appDataAdaptersGate.discordos_relation_count === 10 && appDataAdaptersGate.all_adapters_ready === true && appDataAdaptersGate.execution_lifecycle === 'EXECUTION_BLOCKED' && appDataAdaptersGate.apply_admitted === false, 'application-data adapter migration gate drift');
  requireCondition(fitnessAppDataAdapter.status === 'CURRENT' && fitnessAppDataAdapter.lifecycle?.source_contract === 'SOURCE_READY' && fitnessAppDataAdapter.lifecycle?.execution === 'EXECUTION_BLOCKED' && fitnessAppDataAdapter.apply_admitted === false, 'Fitness app data adapter must remain source-ready, execution-blocked, and non-executable');
  requireCondition(fitnessAppDataAdapter.generic_contract_path === 'contracts/v1/transport/app-data-transport-contract.json', 'Fitness app data adapter generic contract binding drift');
  const fitnessSource = fitnessAppDataAdapter.source_evidence ?? {};
  const fitnessCandidate = fitnessSource.held_candidate ?? {};
  requireCondition(fitnessSource.accepted_source_commit === 'bab188a51819a6fb2f8aeabe73627d4ed63dcaa4' && fitnessSource.accepted_source_tree === 'b2ed1cdee0f67d751c3f6cd030a1f7d7622aaba1' && fitnessSource.current_git_head === '317568f9dcbc7d6c9dcf2ad30ef1cd80022ce8b3' && fitnessSource.current_git_tree === 'bd4b2809a2a613a4bc67a4cc8166bee56d64a30f' && fitnessSource.current_git_exact_accepted === true, 'Fitness accepted/current source identity drift');
  requireCondition(fitnessSource.accepted_migration_count === 101 && fitnessSource.current_git_migration_count === 101 && fitnessSource.accepted_chain_sha256 === 'f4e62d004d8c0cd243ca2fa1798c13549844cf538e8f8c8fa15866870af92775' && fitnessSource.path_blob_bytes_sha256 === '2f00f193811ab07997956a16b05364828120ea2721e8a2826a0364adf8df10b5', 'Fitness accepted migration denominator drift');
  requireCondition(fitnessSource.relation_count === 27 && fitnessSource.relation_manifest_sha256 === '3896e695cfecad5b0e7e9eeb873386774a9c1c75c367e768245638b71673c183', 'Fitness relation manifest denominator drift');
  requireCondition(fitnessSource.accepted_package_migration_count === 122 && fitnessSource.accepted_migration_package_sha256 === providerCanonicalProvenance.migration_package_sha256, 'Fitness accepted migration package binding drift');
  requireCondition(fitnessCandidate.fitness_pr108_head === '4ff406c92c1d9b9e7ab23a4ebdaa01820b9b5c01' && fitnessCandidate.candidate_migration_count === 102 && fitnessCandidate.candidate_migration_path === 'supabase/migrations/20260718015422_retire_human_member_number_compaction.sql' && fitnessCandidate.candidate_bytes_admitted === false && fitnessCandidate.hosted_replay_pr2_head === 'fce1c595a55a5d25271c799f0ccafecc4389181b' && fitnessCandidate.replay_execution === 'BLOCKED', 'Fitness PR 108 or replay hold drift');
  const fitnessIdentity = fitnessAppDataAdapter.identity_and_activation ?? {};
  const fitnessProfileSeed = fitnessIdentity.profile_seed ?? {};
  const fitnessAbsentProfile = fitnessProfileSeed.source_profile_absent_policy ?? {};
  const fitnessDiscordMemberLinkOwnerRekey = fitnessIdentity.discord_member_link_owner_rekeying ?? {};
  requireCondition(fitnessIdentity.canonical_human_key === 'auth.users.id' && fitnessIdentity.source_identity_ledger === 'platform_private.source_identity_ledger' && fitnessIdentity.source_owner_key === 'id' && fitnessIdentity.identity_rekey_required === true, 'Fitness identity rekey boundary drift');
  requireCondition(fitnessIdentity.membership_relation === 'platform_shared.user_service_memberships' && fitnessIdentity.membership_initial_state === 'pending' && fitnessIdentity.activation_subject_source === 'auth.uid()' && fitnessIdentity.caller_supplied_user_id_allowed === false, 'Fitness activation subject boundary drift');
  requireCondition(fitnessProfileSeed.source_relation === 'public.profiles' && fitnessProfileSeed.target_relation === 'fitness.profiles' && fitnessProfileSeed.source_primary_key === 'id' && fitnessProfileSeed.storage === 'PRIVATE_COMMITMENT' && fitnessProfileSeed.lookup === 'SERVER_SIDE_IDENTITY_MAPPING' && fitnessProfileSeed.consumption === 'ATOMIC_WITH_ACTIVATION' && fitnessProfileSeed.direct_pre_activation_insert_allowed === false && fitnessProfileSeed.source_profile_present_exact_parity_required === true, 'Fitness profile activation-seed boundary drift');
  requireCondition(fitnessAbsentProfile.detection === 'COMPLETE_S0_S1_S2_PROFILE_KEY_ABSENCE' && fitnessAbsentProfile.default_seed_allowed === false && fitnessAbsentProfile.source_rows_transport_outcome === 'QUARANTINE_PENDING_MEMBERSHIP' && fitnessAbsentProfile.unproven_absence_outcome === 'QUARANTINE_PENDING_MEMBERSHIP' && fitnessAbsentProfile.caller_values_allowed === false && fitnessAbsentProfile.silent_drop_allowed === false, 'Fitness absent-source-profile boundary drift');
  requireCondition(fitnessDiscordMemberLinkOwnerRekey.source_relation === 'public.discord_member_links' && fitnessDiscordMemberLinkOwnerRekey.source_owner_key === 'fitness_user_id' && fitnessDiscordMemberLinkOwnerRekey.source_owner_not_null === true && fitnessDiscordMemberLinkOwnerRekey.source_owner_unique === true && fitnessDiscordMemberLinkOwnerRekey.source_owner_foreign_key === 'auth.users.id', 'Fitness Discord member-link source owner boundary drift');
  requireCondition(fitnessDiscordMemberLinkOwnerRekey.source_identity_ledger === 'platform_private.source_identity_ledger' && fitnessDiscordMemberLinkOwnerRekey.controlled_auth_mapping_contract === 'contracts/v1/auth/import-rehearsal-contract.json' && fitnessDiscordMemberLinkOwnerRekey.accepted_mapping_cardinality === 'EXACTLY_ONE' && fitnessDiscordMemberLinkOwnerRekey.accepted_mapping_outcome === 'REKEY_TO_LEDGER_TARGET', 'Fitness Discord member-link accepted mapping boundary drift');
  requireCondition(fitnessDiscordMemberLinkOwnerRekey.missing_mapping_outcome === 'QUARANTINE_PENDING_VERIFIED_EVIDENCE' && fitnessDiscordMemberLinkOwnerRekey.contradictory_mapping_outcome === 'QUARANTINE_PENDING_VERIFIED_EVIDENCE' && fitnessDiscordMemberLinkOwnerRekey.duplicate_mapping_outcome === 'QUARANTINE_PENDING_VERIFIED_EVIDENCE' && fitnessDiscordMemberLinkOwnerRekey.caller_supplied_identity_allowed === false && fitnessDiscordMemberLinkOwnerRekey.automatic_identity_merge_allowed === false && fitnessDiscordMemberLinkOwnerRekey.discord_identifiers_as_identity_evidence === false, 'Fitness Discord member-link fail-closed mapping boundary drift');
  requireCondition(fitnessIdentity.presentation_values_as_identity_evidence === false && fitnessIdentity.discord_ids_as_identity_evidence === false && fitnessIdentity.member_numbers_as_identity_evidence === false, 'Fitness presentation or external identifier authority drift');
  const fitnessNumbers = fitnessAppDataAdapter.member_number_policy ?? {};
  requireCondition(fitnessNumbers.source_column === 'public.profiles.user_number' && fitnessNumbers.target_column === 'fitness.profiles.user_number' && fitnessNumbers.existing_values_action === 'COPY_UNCHANGED' && fitnessNumbers.high_water_action === 'PRESERVE' && fitnessNumbers.gaps_action === 'PRESERVE', 'Fitness member-number preservation drift');
  requireCondition(fitnessNumbers.reuse_allowed === false && fitnessNumbers.gap_fill_allowed === false && fitnessNumbers.renumber_allowed === false && fitnessNumbers.compaction_allowed === false && fitnessNumbers.caller_supplied_member_number_allowed === false && fitnessNumbers.post_migration_allocation === 'BLOCKED', 'Fitness member-number immutability boundary drift');
  requireCondition(fitnessNumbers.accepted_chain_contains_compaction_behavior === true && fitnessNumbers.held_retirement_migration_path === fitnessCandidate.candidate_migration_path && fitnessNumbers.held_candidate_review === 'BLOCKED' && fitnessNumbers.faithful_replay === 'BLOCKED', 'Fitness member-number retirement dependency drift');
  const expectedFitnessRelations = [
    ['public.profiles', 'fitness.profiles', 'AUTHORITATIVE_ACTIVATION_SEED', ['id'], 'id', 'PRIVATE_SEED_THEN_ATOMIC_ACTIVATION', ['auth.users'], false, null],
    ['public.exercises', 'fitness.exercises', 'AUTHORITATIVE_STATE', ['id'], 'user_id', 'GLOBAL_THEN_OWNED_CAS', [], false, null],
    ['public.routines', 'fitness.routines', 'AUTHORITATIVE_STATE', ['id'], 'user_id', 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP', ['public.profiles'], false, null],
    ['public.routine_days', 'fitness.routine_days', 'AUTHORITATIVE_STATE', ['id'], 'user_id', 'NULLABLE_CYCLE_STAGE_THEN_CAS_PATCH', ['public.routines', 'public.workout_plan_templates'], false, null],
    ['public.routine_day_exercises', 'fitness.routine_day_exercises', 'AUTHORITATIVE_STATE', ['id'], 'user_id', 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP', ['public.routine_days', 'public.exercises', 'public.workout_plan_template_exercises'], false, null],
    ['public.sessions', 'fitness.sessions', 'AUTHORITATIVE_STATE', ['id'], 'user_id', 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP', ['public.profiles'], false, null],
    ['public.session_exercises', 'fitness.session_exercises', 'AUTHORITATIVE_STATE', ['id'], 'user_id', 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP', ['public.sessions', 'public.exercises'], false, null],
    ['public.sets', 'fitness.sets', 'AUTHORITATIVE_STATE', ['id'], 'user_id', 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP', ['public.session_exercises'], false, null],
    ['public.workout_plan_templates', 'fitness.workout_plan_templates', 'AUTHORITATIVE_STATE', ['id'], 'user_id', 'NULLABLE_CYCLE_STAGE_THEN_CAS_PATCH', ['public.routine_days'], false, null],
    ['public.workout_plan_template_exercises', 'fitness.workout_plan_template_exercises', 'AUTHORITATIVE_STATE', ['id'], 'user_id', 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP', ['public.workout_plan_templates', 'public.exercises'], false, null],
    ['public.progression_events', 'fitness.progression_events', 'AUTHORITATIVE_APPEND_ONLY_HISTORY', ['id'], 'user_id', 'PRESERVE_IDENTITY_APPEND_ONLY', ['public.routines', 'public.routine_day_exercises', 'public.exercises', 'public.sessions'], false, null],
    ['public.exercise_stats', 'fitness.exercise_stats', 'DERIVED_REBUILDABLE', ['user_id', 'exercise_id'], 'user_id', 'EXCLUDE_AND_REBUILD_AFTER_AUTHORITATIVE_PARITY', ['public.sessions', 'public.session_exercises', 'public.sets', 'public.exercises'], false, null],
    ['public.user_entitlements', 'fitness.user_entitlements', 'ENTITLEMENT_HELD', ['id'], 'user_id', 'HOLD_PENDING_VERIFIED_BILLING_EVIDENCE', ['public.billing_purchases'], false, 'BILLING_PROVENANCE_UNRESOLVED'],
    ['public.billing_customers', 'fitness.billing_customers', 'UNKNOWN_BILLING', ['id'], 'user_id', 'HOLD_PENDING_CLOSED_BILLING_ADAPTER', ['public.profiles'], true, 'BILLING_PROVENANCE_UNRESOLVED'],
    ['public.billing_purchases', 'fitness.billing_purchases', 'UNKNOWN_BILLING', ['id'], 'user_id', 'HOLD_PENDING_CLOSED_BILLING_ADAPTER', ['public.billing_customers'], true, 'BILLING_PROVENANCE_UNRESOLVED'],
    ['public.session_follow_up_jobs', 'fitness.session_follow_up_jobs', 'UNKNOWN_OPERATIONAL_EXTERNAL_EFFECT', ['id'], 'user_id', 'HOLD_PENDING_EXTERNAL_EFFECT_ADAPTER', ['public.sessions'], true, 'FOLLOW_UP_JOB_SIDE_EFFECTS_UNRESOLVED'],
    ['public.discord_bug_reports', 'fitness.discord_bug_reports', 'EXCLUDED_SUPERSEDED_RELATION', ['id'], null, 'EXCLUDE_SUPERSEDED_BY_DISCORD_FEEDBACK_REPORTS', [], true, 'HISTORICAL_RELATION_SUPERSEDED'],
    ['public.discord_feedback_reports', 'fitness.discord_feedback_reports', 'UNKNOWN_DISCORD_EXTERNAL', ['id'], null, 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION', [], true, 'REPORTING_AND_DISCORD_EFFECTS_UNRESOLVED'],
    ['public.discord_member_links', 'fitness.discord_member_links', 'UNKNOWN_DISCORD_EXTERNAL', ['id'], 'fitness_user_id', 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION', ['auth.users'], true, 'DISCORD_IDENTITY_AND_EFFECTS_UNRESOLVED'],
    ['public.discord_message_command_claims', 'fitness.discord_message_command_claims', 'UNKNOWN_DISCORD_EXTERNAL', ['channel_id', 'message_id'], null, 'HOLD_PENDING_EXTERNAL_EFFECT_ADAPTER', [], true, 'DISCORD_COMMAND_EFFECTS_UNRESOLVED'],
    ['public.discord_moderation_cases', 'fitness.discord_moderation_cases', 'UNKNOWN_DISCORD_EXTERNAL', ['id'], null, 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION', [], true, 'DISCORD_IDENTITY_AND_EFFECTS_UNRESOLVED'],
    ['public.discord_spotify_connections', 'fitness.discord_spotify_connections', 'UNKNOWN_DISCORD_EXTERNAL', ['id'], null, 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION', [], true, 'SECRET_BEARING_PROVIDER_STATE'],
    ['public.discord_spotify_lobbies', 'fitness.discord_spotify_lobbies', 'UNKNOWN_DISCORD_EXTERNAL', ['id'], null, 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION', ['public.discord_spotify_connections'], true, 'DISCORD_IDENTITY_AND_EFFECTS_UNRESOLVED'],
    ['public.discord_spotify_queue_items', 'fitness.discord_spotify_queue_items', 'UNKNOWN_DISCORD_EXTERNAL', ['id'], null, 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION', ['public.discord_spotify_lobbies'], true, 'DISCORD_IDENTITY_AND_EFFECTS_UNRESOLVED'],
    ['public.discord_spotify_room_members', 'fitness.discord_spotify_room_members', 'UNKNOWN_DISCORD_EXTERNAL', ['id'], null, 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION', ['public.discord_spotify_lobbies'], true, 'DISCORD_IDENTITY_AND_EFFECTS_UNRESOLVED'],
    ['public.discord_update_drafts', 'fitness.discord_update_drafts', 'UNKNOWN_DISCORD_EXTERNAL', ['id'], null, 'HOLD_PENDING_EXTERNAL_EFFECT_ADAPTER', [], true, 'DISCORD_UPDATE_EFFECTS_UNRESOLVED'],
    ['public.discord_verification_tokens', 'fitness.discord_verification_tokens', 'UNKNOWN_DISCORD_EXTERNAL', ['id'], 'user_id', 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION', ['auth.users'], true, 'SECURITY_TOKEN_STATE_UNRESOLVED']
  ];
  const actualFitnessRelations = (Array.isArray(fitnessAppDataAdapter.relations) ? fitnessAppDataAdapter.relations : []).map((relation) => [relation.source_relation, relation.target_relation, relation.classification, relation.primary_key, relation.owner_key, relation.transport_mode, relation.dependency_parents, relation.external_effects, relation.hold_reason]);
  requireCondition(canonicalDigest(actualFitnessRelations) === canonicalDigest(expectedFitnessRelations), 'Fitness app data relation denominator drift');
  requireCondition(canonicalDigest(fitnessAppDataAdapter.classification_counts) === canonicalDigest({ authoritative: 11, derived_rebuildable: 1, entitlement_held: 1, billing_unknown: 2, operational_external_unknown: 1, discord_external_unknown: 10, excluded: 1, total: 27 }), 'Fitness relation classification counts drift');
  requireCondition(exactOrderedValues(fitnessAppDataAdapter.dependency_ordering?.insert_update_order, ['auth_mapping', 'pending_membership', 'atomic_profile_seed_activation', 'global_exercises', 'owned_exercises', 'routines', 'routine_days_cycle_stage', 'workout_plan_templates_cycle_stage', 'workout_plan_template_exercises', 'routine_day_exercises', 'cycle_reference_cas_patch', 'sessions', 'session_exercises', 'sets', 'progression_events', 'exercise_stats_rebuild_after_parity', 'held_relations_no_transport']), 'Fitness insert/update dependency ordering drift');
  requireCondition(exactOrderedValues(fitnessAppDataAdapter.dependency_ordering?.delete_order, ['held_relations_no_delete', 'progression_event_tombstones', 'sets_tombstones', 'session_exercise_tombstones', 'session_tombstones', 'routine_day_exercise_tombstones', 'workout_plan_template_exercise_tombstones', 'cycle_reference_unlink', 'routine_day_tombstones', 'workout_plan_template_tombstones', 'routine_tombstones', 'owned_exercise_tombstones', 'profile_preserve']), 'Fitness delete dependency ordering drift');
  const fitnessCycle = fitnessAppDataAdapter.dependency_ordering?.foreign_key_cycles?.[0] ?? {};
  requireCondition(fitnessAppDataAdapter.dependency_ordering?.foreign_key_cycles?.length === 1 && exactOrderedValues(fitnessCycle.relations, ['public.routine_days', 'public.workout_plan_templates']) && exactOrderedValues(fitnessCycle.nullable_reference_columns, ['public.routine_days.workout_plan_template_id', 'public.workout_plan_templates.source_routine_day_id', 'public.routine_days.duplicate_source_routine_day_id']) && fitnessCycle.staging_plan === 'INSERT_NULL_REFERENCES_THEN_CAS_PATCH' && fitnessCycle.synthetic_proof_required === true && fitnessAppDataAdapter.dependency_ordering?.external_effects === 'QUARANTINED', 'Fitness foreign-key cycle staging drift');
  requireCondition(exactOrderedValues(fitnessAppDataAdapter.snapshot_and_cas?.required_snapshots, ['S0', 'S1', 'S2']) && fitnessAppDataAdapter.snapshot_and_cas?.complete_primary_key_set_comparison === true && fitnessAppDataAdapter.snapshot_and_cas?.complete_canonical_row_digest_comparison === true && fitnessAppDataAdapter.snapshot_and_cas?.timestamp_revision_or_high_water_only_proof_allowed === false, 'Fitness snapshot denominator must remain complete');
  requireCondition(exactOrderedValues(fitnessAppDataAdapter.snapshot_and_cas?.accepted_expected_target, ['ABSENT', 'EXACT_DIGEST']) && fitnessAppDataAdapter.snapshot_and_cas?.unexpected_target_digest === 'QUARANTINE' && fitnessAppDataAdapter.snapshot_and_cas?.unexpected_target_overwrite_allowed === false && fitnessAppDataAdapter.snapshot_and_cas?.matching_mutation === 'IDEMPOTENT_REUSE', 'Fitness CAS conflict boundary drift');
  requireCondition(fitnessAppDataAdapter.deletion_and_rollback?.explicit_tombstones_required === true && fitnessAppDataAdapter.deletion_and_rollback?.implicit_cascade_authority === false && exactOrderedValues(fitnessAppDataAdapter.deletion_and_rollback?.reappearing_key_requires, ['EXPLICIT_RESURRECTION', 'NEW_GENERATION']) && fitnessAppDataAdapter.deletion_and_rollback?.profile_delete_action === 'SUSPEND_AND_PRESERVE' && fitnessAppDataAdapter.deletion_and_rollback?.membership_hard_delete === 'FORBIDDEN', 'Fitness deletion, resurrection, or preservation boundary drift');
  requireCondition(exactOrderedValues(fitnessAppDataAdapter.public_receipt_policy?.forbidden_classes, appDataReceiptForbiddenClasses) && fitnessAppDataAdapter.canonicalization?.raw_values_in_public_receipts === false, 'Fitness public receipt redaction boundary drift');
  requireCondition(fitnessAppDataAdapter.dependency_gates?.data_api_containment === 'BLOCKED' && fitnessAppDataAdapter.dependency_gates?.accepted_recovery_and_quarantined_restore === 'BLOCKED' && fitnessAppDataAdapter.dependency_gates?.faithful_contained_replay === 'BLOCKED' && fitnessAppDataAdapter.dependency_gates?.target_bootstrap === 'BLOCKED' && fitnessAppDataAdapter.dependency_gates?.shared_auth_identity_mapping === 'BLOCKED' && fitnessAppDataAdapter.dependency_gates?.service_membership_readiness === 'BLOCKED' && fitnessAppDataAdapter.dependency_gates?.mazer_adapter_source_contract === 'CURRENT' && fitnessAppDataAdapter.dependency_gates?.fitness_pr108_retirement === 'BLOCKED' && fitnessAppDataAdapter.dependency_gates?.discordos_adapter === 'BLOCKED' && fitnessAppDataAdapter.dependency_gates?.target_apply === 'BLOCKED', 'Fitness dependency gate promotion or status-vocabulary drift');
  const discordosSource = discordosAppDataAdapter.source_evidence ?? {};
  const discordosInert = discordosAppDataAdapter.inert_boundary ?? {};
  const discordosIdentity = discordosAppDataAdapter.identity_boundary ?? {};
  const discordosQuarantine = discordosAppDataAdapter.external_effect_quarantine ?? {};
  requireCondition(discordosAppDataAdapter.status === 'CURRENT' && discordosAppDataAdapter.lifecycle?.source_contract === 'SOURCE_READY' && discordosAppDataAdapter.lifecycle?.execution === 'EXECUTION_BLOCKED' && discordosAppDataAdapter.apply_admitted === false, 'DiscordOS app data adapter must remain source-ready, execution-blocked, and non-executable');
  requireCondition(discordosAppDataAdapter.generic_contract_path === 'contracts/v1/transport/app-data-transport-contract.json', 'DiscordOS app data generic contract binding drift');
  requireCondition(discordosSource.provider_canonical_commit === 'bd12f6713518b3f3af3761618e3d3e5f6979f167' && discordosSource.provider_canonical_tree === 'f9b01b18d1ba9ad544c582d0dc88ee2ac285bbe8' && discordosSource.provider_canonical_migration_count === 17, 'DiscordOS provider-canonical source identity drift');
  requireCondition(discordosSource.current_git_head === 'aef01f277e006e3cb46550e507ebd8e4a1be9d21' && discordosSource.current_git_tree === '9e6afb159565b1b749ae7f90373aad904fff81da' && discordosSource.current_git_migration_count === 11 && discordosSource.current_git_canonicality === 'NOT_PROVIDER_CANONICAL' && discordosSource.current_git_substitution_forbidden === true, 'DiscordOS current Git substitution boundary drift');
  requireCondition(discordosSource.accepted_source_chain_sha256 === '6a6e9fa29651331d2addb0259bc61bc7c2f0795bd71b2a04971c96ff146a822e' && discordosSource.accepted_path_sha256 === '633ed3101d22dee2c93e1cd5135e5c9cfc1511690b06375c219c3d2d50119613' && discordosSource.provider_catalog_sha256 === 'd5c5cea4195d6c3f7ec4445bb389534f9b97df3fccfcbf28aab64d90d0372cf7', 'DiscordOS accepted path, chain, or provider catalog digest drift');
  requireCondition(discordosSource.provider_effect_mapping_count === 17 && discordosSource.provider_effect_mappings_sha256 === 'b107c77cd61c7c1d3d1df13ac2051dde5c03dd398a85bb56fa54b3e404bbadd4' && discordosSource.relation_count === 10 && discordosSource.relation_manifest_sha256 === '222e9e3f225a29b867d808282f5110ff08b68400af267858ee5c79059d1a0598' && discordosSource.external_effect_manifest_sha256 === '90d87487ac322fc69f26cdc98cf8c2652082cb0a1967fb7fefccfed0ea132eeb', 'DiscordOS relation or external-effect denominator digest drift');
  requireCondition(discordosSource.source_statement_count === 186 && discordosSource.final_function_identity_count === 18 && discordosSource.function_definition_count === 20 && discordosSource.trigger_count === 6 && discordosSource.index_count === 26 && discordosSource.constraint_unit_count === 49 && discordosSource.rls_enabled_relation_count === 10 && discordosSource.policy_count === 0 && discordosSource.held_function_unit_count === 19 && discordosSource.held_statement_count === 89, 'DiscordOS source object denominator drift');
  requireCondition(discordosInert.declared_relation_count === 10 && discordosInert.emitted_relation_count === 9 && discordosInert.held_relation_count === 1 && discordosInert.held_relation === 'discordos.discord_update_drafts', 'DiscordOS inert relation denominator drift');
  requireCondition(discordosInert.emitted_function_count === 1 && discordosInert.emitted_function === 'discordos.set_updated_at' && discordosInert.emitted_trigger_count === 5 && discordosInert.emitted_index_count === 22, 'DiscordOS inert function, trigger, or index denominator drift');
  requireCondition(discordosInert.emitted_extension_count === 0 && discordosInert.emitted_data_effect_count === 0 && discordosInert.emitted_cron_effect_count === 0 && discordosInert.emitted_network_effect_count === 0 && discordosInert.generated_artifact_changes_admitted === false, 'DiscordOS inert external-effect or generated-artifact boundary drift');
  requireCondition(discordosIdentity.service_mode === 'OPERATIONAL_ONLY' && discordosIdentity.human_activation === 'NOT_APPLICABLE' && discordosIdentity.human_profile_relation === null && discordosIdentity.human_entitlement_relation === null && discordosIdentity.membership_creation_allowed === false, 'DiscordOS operational-only service boundary drift');
  requireCondition(discordosIdentity.canonical_human_key === 'auth.users.id' && discordosIdentity.source_identity_ledger === 'platform_private.source_identity_ledger' && discordosIdentity.rekey_authority === 'ACCEPTED_IDENTITY_LEDGER_MAPPING_ONLY' && discordosIdentity.accepted_mapping_cardinality === 'EXACTLY_ONE', 'DiscordOS accepted identity-ledger mapping boundary drift');
  requireCondition(discordosIdentity.missing_mapping_outcome === 'QUARANTINE_PENDING_VERIFIED_EVIDENCE' && discordosIdentity.contradictory_mapping_outcome === 'QUARANTINE_PENDING_VERIFIED_EVIDENCE' && discordosIdentity.duplicate_mapping_outcome === 'QUARANTINE_PENDING_VERIFIED_EVIDENCE' && discordosIdentity.membership_if_present_without_mapping === 'PRESERVE_PENDING', 'DiscordOS fail-closed identity mapping outcome drift');
  requireCondition(discordosIdentity.caller_supplied_identity_allowed === false && discordosIdentity.automatic_identity_merge_allowed === false && discordosIdentity.discord_ids_as_identity_evidence === false && discordosIdentity.fingerprints_as_identity_evidence === false && discordosIdentity.usernames_as_identity_evidence === false && discordosIdentity.labels_as_identity_evidence === false && discordosIdentity.snapshots_as_identity_evidence === false, 'DiscordOS external identifier authority drift');
  requireCondition(discordosIdentity.synthetic_rows_action === 'EXCLUDE' && discordosIdentity.fitness_semantic_overlap_action === 'QUARANTINE', 'DiscordOS synthetic or Fitness-overlap quarantine drift');
  const expectedDiscordosRelations = [
    ['discordos.discord_feedback_reports', 'discordos.discord_feedback_reports', 'AUTHORITATIVE_STATE', ['report_id'], 'CAS_AFTER_IDENTITY_AND_OVERLAP_QUARANTINE', [], false, 'EXCLUDE', 'QUARANTINE', null],
    ['discordos.discord_feedback_audit_events', 'discordos.discord_feedback_audit_events', 'AUTHORITATIVE_APPEND_ONLY_HISTORY', ['id'], 'PRESERVE_IDENTITY_APPEND_ONLY', ['discordos.discord_feedback_reports'], false, 'EXCLUDE', 'QUARANTINE', null],
    ['discordos.discord_feedback_completion_reviews', 'discordos.discord_feedback_completion_reviews', 'AUTHORITATIVE_APPEND_ONLY_HISTORY', ['id'], 'PRESERVE_IDENTITY_APPEND_ONLY', ['discordos.discord_feedback_reports'], false, 'EXCLUDE', 'QUARANTINE', null],
    ['discordos.runtime_health_cron_runs', 'discordos.runtime_health_cron_runs', 'AUTHORITATIVE_APPEND_ONLY_HISTORY', ['id'], 'PRESERVE_IDENTITY_APPEND_ONLY_WITH_SCHEDULER_HELD', [], false, 'EXCLUDE', 'NOT_APPLICABLE', null],
    ['discordos.discordos_board_cards', 'discordos.discordos_board_cards', 'AUTHORITATIVE_STATE', ['card_id'], 'CAS_WITH_EXTERNAL_EFFECTS_QUARANTINED', [], false, 'EXCLUDE', 'NOT_APPLICABLE', null],
    ['discordos.discordos_moderation_audit_log', 'discordos.discordos_moderation_audit_log', 'AUTHORITATIVE_APPEND_ONLY_HISTORY', ['case_id'], 'PRESERVE_IDENTITY_APPEND_ONLY_WITH_EFFECTS_QUARANTINED', [], false, 'EXCLUDE', 'NOT_APPLICABLE', null],
    ['discordos.discordos_music_sesh_sessions', 'discordos.discordos_music_sesh_sessions', 'AUTHORITATIVE_STATE', ['session_id'], 'CAS_WITH_EXTERNAL_EFFECTS_QUARANTINED', [], false, 'EXCLUDE', 'NOT_APPLICABLE', null],
    ['discordos.discordos_music_sesh_queue_items', 'discordos.discordos_music_sesh_queue_items', 'AUTHORITATIVE_STATE', ['queue_item_id'], 'CAS_WITH_EXTERNAL_EFFECTS_QUARANTINED', ['discordos.discordos_music_sesh_sessions'], false, 'EXCLUDE', 'NOT_APPLICABLE', null],
    ['discordos.discordos_music_sesh_votes', 'discordos.discordos_music_sesh_votes', 'AUTHORITATIVE_STATE', ['vote_id'], 'CAS_WITH_EXTERNAL_EFFECTS_QUARANTINED', ['discordos.discordos_music_sesh_sessions', 'discordos.discordos_music_sesh_queue_items'], false, 'EXCLUDE', 'NOT_APPLICABLE', null],
    ['discordos.discord_update_drafts', 'discordos.discord_update_drafts', 'HELD_OPERATIONAL_EXTERNAL_EFFECT', ['id'], 'HOLD_NO_TRANSPORT', [], true, 'EXCLUDE', 'QUARANTINE', 'DEPLOYMENT_AND_DISCORD_PUBLICATION_EFFECTS_UNRESOLVED']
  ];
  const actualDiscordosRelations = (Array.isArray(discordosAppDataAdapter.relations) ? discordosAppDataAdapter.relations : []).map((relation) => [relation.source_relation, relation.target_relation, relation.classification, relation.primary_key, relation.transport_mode, relation.dependency_parents, relation.external_effects, relation.synthetic_rows_action, relation.fitness_semantic_overlap_action, relation.hold_reason]);
  requireCondition(canonicalDigest(actualDiscordosRelations) === canonicalDigest(expectedDiscordosRelations) && discordosAppDataAdapter.relations?.every((relation) => relation.owner_key === null), 'DiscordOS 10-relation transport denominator drift');
  requireCondition(canonicalDigest(discordosAppDataAdapter.classification_counts) === canonicalDigest({ authoritative_state: 5, authoritative_append_only_history: 4, held_operational_external_effect: 1, transported: 9, held: 1, total: 10 }), 'DiscordOS relation classification counts drift');
  requireCondition(exactOrderedValues(discordosAppDataAdapter.dependency_ordering?.insert_update_order, ['discordos.discord_feedback_reports', 'discordos.discord_feedback_audit_events', 'discordos.discord_feedback_completion_reviews', 'discordos.runtime_health_cron_runs', 'discordos.discordos_board_cards', 'discordos.discordos_moderation_audit_log', 'discordos.discordos_music_sesh_sessions', 'discordos.discordos_music_sesh_queue_items', 'discordos.discordos_music_sesh_votes']), 'DiscordOS insert/update dependency order drift');
  requireCondition(exactOrderedValues(discordosAppDataAdapter.dependency_ordering?.delete_order, ['discordos.discordos_music_sesh_votes', 'discordos.discordos_music_sesh_queue_items', 'discordos.discordos_music_sesh_sessions', 'discordos.discord_feedback_completion_reviews', 'discordos.discord_feedback_audit_events', 'discordos.discord_feedback_reports', 'discordos.discordos_moderation_audit_log', 'discordos.discordos_board_cards', 'discordos.runtime_health_cron_runs']) && discordosAppDataAdapter.dependency_ordering?.foreign_key_cycles === 'NONE' && exactOrderedValues(discordosAppDataAdapter.dependency_ordering?.held_relations_excluded_from_order, ['discordos.discord_update_drafts']) && discordosAppDataAdapter.dependency_ordering?.external_effects === 'QUARANTINED', 'DiscordOS delete order, held relation, or cycle boundary drift');
  const blockedDiscordosEffectStatuses = ['public_rpc_status', 'scheduler_status', 'network_status', 'edge_status', 'credential_status', 'alias_status', 'provider_link_status', 'webhook_status', 'moderation_action_status', 'discord_api_write_status'];
  requireCondition(blockedDiscordosEffectStatuses.every((field) => discordosQuarantine[field] === 'BLOCKED') && discordosQuarantine.held_function_unit_count === 19 && discordosQuarantine.held_statement_count === 89, 'DiscordOS external-effect hold denominator drift');
  requireCondition(exactOrderedValues(discordosQuarantine.scheduler_extension_identities, ['pg_cron', 'pg_net']) && discordosQuarantine.scheduler_job_identity === 'discordos_message_commands_poll' && discordosQuarantine.network_helper_identity === 'discordos_private.trigger_message_command_poll' && discordosQuarantine.target_egress === 'DENIED' && discordosQuarantine.source_remains_active === true && discordosQuarantine.quarantine_release_requires_separate_authority === true, 'DiscordOS scheduler, network, egress, or source-lifecycle boundary drift');
  requireCondition(exactOrderedValues(discordosAppDataAdapter.snapshot_and_cas?.required_snapshots, ['S0', 'S1', 'S2']) && discordosAppDataAdapter.snapshot_and_cas?.complete_primary_key_set_comparison === true && discordosAppDataAdapter.snapshot_and_cas?.complete_canonical_row_digest_comparison === true && discordosAppDataAdapter.snapshot_and_cas?.timestamp_or_high_water_only_proof_allowed === false, 'DiscordOS snapshot denominator must remain complete');
  requireCondition(exactOrderedValues(discordosAppDataAdapter.snapshot_and_cas?.accepted_expected_target, ['ABSENT', 'EXACT_DIGEST']) && discordosAppDataAdapter.snapshot_and_cas?.unexpected_target_digest === 'QUARANTINE' && discordosAppDataAdapter.snapshot_and_cas?.unexpected_target_overwrite_allowed === false && discordosAppDataAdapter.snapshot_and_cas?.matching_mutation === 'IDEMPOTENT_REUSE', 'DiscordOS CAS conflict boundary drift');
  requireCondition(discordosAppDataAdapter.deletion_and_rollback?.explicit_tombstones_required === true && discordosAppDataAdapter.deletion_and_rollback?.implicit_cascade_authority === false && exactOrderedValues(discordosAppDataAdapter.deletion_and_rollback?.reappearing_key_requires, ['EXPLICIT_RESURRECTION', 'NEW_GENERATION']) && discordosAppDataAdapter.deletion_and_rollback?.held_relation_delete_action === 'PRESERVE_AND_QUARANTINE' && discordosAppDataAdapter.deletion_and_rollback?.rollback_order === 'REVERSE_DEPENDENCY_ORDER' && discordosAppDataAdapter.deletion_and_rollback?.append_only_mutation_journal_required === true && discordosAppDataAdapter.deletion_and_rollback?.reverse_catch_up_to_source === 'SEPARATE_EXPLICIT_AUTHORITY', 'DiscordOS tombstone, resurrection, or rollback boundary drift');
  requireCondition(exactOrderedValues(discordosAppDataAdapter.public_receipt_policy?.forbidden_classes, appDataReceiptForbiddenClasses) && discordosAppDataAdapter.canonicalization?.raw_values_in_public_receipts === false, 'DiscordOS public receipt redaction boundary drift');
  const expectedDiscordosDependencyGates = {
    data_api_containment: 'BLOCKED',
    accepted_recovery_and_quarantined_restore: 'BLOCKED',
    faithful_contained_replay: 'BLOCKED',
    target_bootstrap: 'BLOCKED',
    shared_auth_identity_mapping: 'BLOCKED',
    service_membership_readiness: 'NOT_APPLICABLE',
    mazer_adapter_source_contract: 'CURRENT',
    fitness_adapter_source_contract: 'CURRENT',
    discordos_external_effect_quarantine: 'BLOCKED',
    target_apply: 'BLOCKED'
  };
  requireCondition(canonicalDigest(discordosAppDataAdapter.dependency_gates) === canonicalDigest(expectedDiscordosDependencyGates), 'DiscordOS dependency gate promotion or status-vocabulary drift');
  const provenance = migrationGate.provider_canonical_provenance;
  requireCondition(migrationGate.version === '1.6.0', 'migration gate version must remain 1.6.0');
  requireCondition(fitnessSource.accepted_package_migration_count === provenance?.accepted_package?.migration_count && fitnessSource.accepted_migration_package_sha256 === provenance?.accepted_package?.migration_package_sha256 && provenance?.accepted_package?.source_counts?.fitness === 101 && provenance?.accepted_package?.apply_admitted === false, 'Fitness accepted migration package provenance binding drift');
  requireCondition(provenance?.status === 'CURRENT' && provenance?.apply_admitted === false, 'provider-canonical provenance must remain CURRENT and non-executable');
  requireCondition(provenance?.combined_provenance_sha256 === providerCanonicalProvenance.combined_provenance_sha256, 'provider-canonical combined provenance digest drift');
  requireCondition(provenance?.accepted_package?.migration_count === 122, 'provider-canonical accepted migration count must remain 122');
  requireCondition(provenance?.accepted_package?.source_counts?.discordos === 17 && provenance?.accepted_package?.source_counts?.fitness === 101 && provenance?.accepted_package?.source_counts?.mazer === 4, 'provider-canonical source migration counts drift');
  requireCondition(provenance?.accepted_package?.digest_model === providerCanonicalProvenance.digest_model, 'provider-canonical digest model drift');
  requireCondition(exactOrderedValues(provenance?.accepted_package?.migration_package_paths, providerCanonicalProvenance.migration_package_paths), 'provider-canonical migration package path denominator drift');
  requireCondition(provenance?.accepted_package?.migration_package_sha256 === providerCanonicalProvenance.migration_package_sha256, 'provider-canonical migration package digest drift');
  requireCondition(exactOrderedValues(provenance?.accepted_package?.governance_manifest_paths, providerCanonicalProvenance.governance_manifest_paths), 'provider-canonical governance manifest path denominator drift');
  requireCondition(provenance?.accepted_package?.governance_manifest_sha256 === providerCanonicalProvenance.governance_manifest_sha256, 'provider-canonical governance manifest digest drift');
  requireCondition(provenance?.accepted_package?.legacy_combined_package_sha256 === providerCanonicalProvenance.legacy_combined_package_sha256 && provenance?.accepted_package?.legacy_combined_package_recomputation_admitted === false, 'provider-canonical legacy combined digest boundary drift');
  requireCondition(provenance?.accepted_package?.apply_admitted === false && provenance?.accepted_package?.historical_path_rewrite_forbidden === true && provenance?.accepted_package?.current_source_substitution_forbidden === true, 'provider-canonical package protections must remain fail-closed');
  requireCondition(exactOrderedValues(provenance?.sources?.map((source) => source.app), ['discordos', 'mazer']), 'provider-canonical source denominator order drift');
  for (const expected of providerCanonicalProvenance.sources) {
    const actual = provenance?.sources?.find((source) => source.app === expected.app);
    requireCondition(actual?.project_ref === expected.project_ref && actual?.provider_ledger_migration_count === expected.provider_ledger_migration_count && actual?.current_git_migration_count === expected.current_git_migration_count && actual?.current_git_canonicality === 'not_provider_canonical' && actual?.complete_catalog_sha256 === expected.complete_catalog_sha256, `${expected.app}: provider-canonical source evidence drift`);
  }
  requireCondition(Array.isArray(provenance?.effect_mappings) && provenance.effect_mappings.length === 21, 'provider-canonical effect mapping denominator must contain 21 units');
  requireCondition(new Set((provenance?.effect_mappings ?? []).map((mapping) => `${mapping.app}:${mapping.ledger_version}`)).size === 21, 'provider-canonical effect mappings must be unique by source and ledger version');
  requireCondition((provenance?.effect_mappings ?? []).filter((mapping) => mapping.app === 'discordos').length === 17 && (provenance?.effect_mappings ?? []).filter((mapping) => mapping.app === 'mazer').length === 4, 'provider-canonical effect mapping source counts drift');
  requireCondition(provenance?.effect_mappings_sha256 === providerCanonicalProvenance.effect_mappings_sha256 && canonicalDigest(provenance?.effect_mappings) === providerCanonicalProvenance.effect_mappings_sha256, 'provider-canonical effect mapping digest drift');
  const mazerSourceEvidence = provenance?.sources?.find((source) => source.app === 'mazer');
  const mazerEffectMappings = (provenance?.effect_mappings ?? []).filter((mapping) => mapping.app === 'mazer');
  requireCondition(mazerAppDataAdapter.provider_canonical?.provider_ledger_migration_count === mazerSourceEvidence?.provider_ledger_migration_count && mazerAppDataAdapter.provider_canonical?.complete_catalog_sha256 === mazerSourceEvidence?.complete_catalog_sha256, 'Mazer adapter provider catalog binding drift');
  requireCondition(mazerAppDataAdapter.provider_canonical?.current_git_head === '3bd13233dc33fc721f8ccf105d2cc51f1a8dd8d4' && mazerAppDataAdapter.provider_canonical?.current_git_migration_count === mazerSourceEvidence?.current_git_migration_count && mazerAppDataAdapter.provider_canonical?.current_git_canonicality === 'not_provider_canonical' && mazerAppDataAdapter.provider_canonical?.current_git_substitution_forbidden === true, 'Mazer adapter Git substitution boundary drift');
  requireCondition(mazerAppDataAdapter.provider_canonical?.accepted_migration_package_sha256 === provenance?.accepted_package?.migration_package_sha256 && mazerAppDataAdapter.provider_canonical?.effect_mapping_count === mazerEffectMappings.length && mazerAppDataAdapter.provider_canonical?.effect_mappings_sha256 === canonicalDigest(mazerEffectMappings), 'Mazer adapter provider effect mapping binding drift');
  requireCondition(mazerEffectMappings.every((mapping) => mapping.source_commit === mazerAppDataAdapter.provider_canonical?.accepted_source_commit), 'Mazer adapter accepted source commit binding drift');
  const discordosSourceEvidence = provenance?.sources?.find((source) => source.app === 'discordos');
  const discordosEffectMappings = (provenance?.effect_mappings ?? []).filter((mapping) => mapping.app === 'discordos');
  requireCondition(discordosSource.provider_canonical_migration_count === discordosSourceEvidence?.provider_ledger_migration_count && discordosSource.provider_catalog_sha256 === discordosSourceEvidence?.complete_catalog_sha256, 'DiscordOS adapter provider catalog binding drift');
  requireCondition(discordosSource.provider_effect_mapping_count === discordosEffectMappings.length && discordosSource.provider_effect_mappings_sha256 === canonicalDigest(discordosEffectMappings) && discordosEffectMappings.every((mapping) => mapping.source_commit === discordosSource.provider_canonical_commit), 'DiscordOS adapter provider effect mapping binding drift');
  requireCondition(discordosSource.accepted_package_migration_count === provenance?.accepted_package?.migration_count && discordosSource.accepted_migration_package_sha256 === provenance?.accepted_package?.migration_package_sha256 && provenance?.accepted_package?.source_counts?.discordos === 17 && provenance?.accepted_package?.apply_admitted === false, 'DiscordOS accepted migration package provenance binding drift');
  requireCondition(migrationGate.required_evidence?.some((evidence) => evidence.name === 'provider-ledger canonical historical package' && evidence.status === 'CURRENT') === true, 'provider-ledger canonical historical package evidence must remain CURRENT');

  const catalog = documents['contracts/v1/catalog/service-catalog.json'];
  requireCondition(catalog.version === '1.1.0', 'service catalog version must remain 1.1.0');
  requireCondition(catalog.membership_is_billing_entitlement === false, 'membership must not become a billing entitlement');
  requireCondition(catalog.canonical_human_key === 'auth.users.id', 'auth.users.id must remain the sole canonical human key');
  requireCondition(catalog.global_profile_relation === 'platform_shared.global_profiles', 'global profile relation changed');
  requireCondition(catalog.source_identity_ledger_relation === 'platform_private.source_identity_ledger', 'source identity ledger relation changed');
  requireCondition(catalog.global_username?.unique === true && catalog.global_username?.mutation_authority === 'server_only' && catalog.global_username?.presentation_or_linking_evidence === false, 'global username must remain unique, server-mutated, and non-authorizing');
  requireCondition(catalog.account_portal_membership_read_model === 'sanitized_authoritative', 'account portal membership read model must remain sanitized and authoritative');
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
  const discordos = catalog.services.find((service) => service.id === 'discordos');
  requireCondition(discordos?.discoverable === false && discordos?.global_signup_may_create_pending === false && discordos?.activation_mode === 'operational_only', 'DiscordOS human activation must remain unapproved');
  requireCondition(discordos?.product_profile === null && discordos?.entitlement_contract === null, 'DiscordOS must not declare a human profile or entitlement contract');
  const fitness = catalog.services.find((service) => service.id === 'fitness');
  requireCondition(fitness?.member_number_contract?.existing_human_numbers_copy_unchanged === true && fitness?.member_number_contract?.high_water_preserved === true && fitness?.member_number_contract?.never_reused === true && fitness?.member_number_contract?.gaps_never_filled === true && fitness?.member_number_contract?.never_renumbered === true, 'Fitness member numbers must remain preserved without reuse, gap fill, or renumbering');
  const mazer = catalog.services.find((service) => service.id === 'mazer');
  requireCondition(mazer?.entitlement_contract === null, 'Mazer generic entitlement contract must remain undefined');

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
  const importBinding = identity.import_rehearsal_binding ?? {};
  requireCondition(importBinding.status === 'CURRENT' && importBinding.apply_admitted === false, 'identity import rehearsal binding must remain source-only');
  requireCondition(importBinding.mapping_receipts === 'DIGEST_ONLY_NO_RAW_IDENTITIES' && importBinding.quarantine_default === 'QUARANTINE_PENDING_VERIFIED_EVIDENCE', 'identity import rehearsal receipts and quarantine default drift');
  requireCondition(importBinding.password_hash_equality === 'NEVER_SUFFICIENT' && importBinding.metadata_authorization_or_linking === false, 'identity import rehearsal must reject hash equality and metadata authorization');

  const importRehearsal = documents['contracts/v1/auth/import-rehearsal-contract.json'] ?? {};
  const expectedImportAnchors = [
    ['platform', 'bef5f17f4b82c36daeada9cb8cefa4d845158382'],
    ['web', 'b6118a24aca9a6b7686c8c9622137bdb5d5e894f'],
    ['fitness', '317568f9dcbc7d6c9dcf2ad30ef1cd80022ce8b3'],
    ['mazer', '3bd13233dc33fc721f8ccf105d2cc51f1a8dd8d4'],
    ['discordos', 'aef01f277e006e3cb46550e507ebd8e4a1be9d21']
  ];
  requireCondition(importRehearsal.version === '1.0.0' && importRehearsal.status === 'CURRENT' && importRehearsal.apply_admitted === false, 'shared Auth import rehearsal must remain current and non-executable');
  requireCondition(importRehearsal.lifecycle?.source_contract === 'SOURCE_READY' && importRehearsal.lifecycle?.execution === 'EXECUTION_BLOCKED', 'shared Auth import rehearsal lifecycle must remain source-ready and execution-blocked');
  requireCondition(importRehearsal.research_denominator_sha256 === 'e102c0c65897642735daf6555aa1111432bfeb74e484fbe16e483b1366581820', 'shared Auth import research denominator drift');
  requireCondition(exactOrderedValues(importRehearsal.source_anchors?.map((anchor) => [anchor.app, anchor.commit]), expectedImportAnchors), 'shared Auth import source anchors drift');
  requireCondition(importRehearsal.import_boundary?.adjudicated_canonical_humans_only === true && importRehearsal.import_boundary?.provider_identities_require_accepted_source_mapping === true, 'shared Auth import must require adjudicated canonical humans and mapped provider identities');
  requireCondition(importRehearsal.import_boundary?.password_hashes === 'opaque_provider_compatible_never_serialized' && importRehearsal.import_boundary?.mutable_user_metadata === 'presentation_only_never_authorization_or_linking', 'shared Auth import password-hash and metadata boundary drift');
  requireCondition(exactOrderedValues(importRehearsal.import_boundary?.excluded, ['source_sessions', 'refresh_tokens', 'access_tokens', 'cookies', 'signing_secrets', 'api_keys', 'smtp_secrets', 'captcha_secrets', 'raw_provider_settings']), 'shared Auth import exclusion denominator drift');
  requireCondition(exactOrderedValues(importRehearsal.collision_matrix?.map((entry) => [entry.case, entry.outcome]), [
    ['identical_source_identity_identical_payload_digest', 'IDEMPOTENT_RETRY'], ['accepted_deterministic_cross_source_evidence', 'ONE_TARGET_MAPPING'], ['normalized_email_collision', 'QUARANTINE_PENDING_VERIFIED_EVIDENCE'], ['username_or_display_name_collision', 'NEVER_MERGE'], ['cross_project_uuid_or_password_hash_equality', 'NEVER_SUFFICIENT'], ['service_or_automation', 'EXCLUDE_HUMAN_IMPORT'], ['missing_or_contradictory_evidence', 'QUARANTINE_PENDING_VERIFIED_EVIDENCE'], ['quarantine_not_isolatable', 'FAIL_ENTIRE_BATCH']
  ]), 'shared Auth import collision matrix drift');
  requireCondition(exactOrderedValues(importRehearsal.synthetic_cohorts, ['fitness_legacy_hash', 'mazer_hash', 'verified_cross_source_human', 'normalized_email_collision', 'username_display_collision', 'cross_project_uuid_collision', 'service_identity', 'missing_evidence', 'optional_synthetic_totp']), 'shared Auth import synthetic cohort denominator drift');
  requireCondition(exactOrderedValues(importRehearsal.proofs, ['deterministic_export_transform_import_replay', 'legacy_hash_sign_in', 'source_token_rejection', 'per_origin_target_sessions', 'centralized_pkce_recovery', 'no_url_token_leakage', 'non_enumeration', 'local_sign_out_truth', 'atomic_idempotent_activation', 'suspended_rejection', 'zero_outbound_effects', 'disposable_rollback_sources_active']), 'shared Auth import proof denominator drift');
  requireCondition(exactOrderedValues(importRehearsal.preview_order, ['FawxzzyWeb_account_shell', 'Mazer', 'Fitness', 'DiscordOS']), 'shared Auth import Preview order drift');

  const lifecycle = documents['contracts/v1/membership/membership-lifecycle.json'];
  requireCondition(lifecycle.version === '1.1.0', 'membership lifecycle version must remain 1.1.0');
  requireCondition(lifecycle.membership_relation === 'platform_shared.user_service_memberships', 'membership relation changed');
  requireCondition(exactOrderedValues(lifecycle.immutable_key, ['user_id', 'service_id']), 'membership key must remain immutable user_id/service_id');
  requireCondition(lifecycle.revision?.monotonic === true && lifecycle.revision?.transition_audited === true, 'membership revisions must remain monotonic and transition-audited');
  requireCondition(lifecycle.client_writes === 'DENIED', 'client membership writes must remain denied');
  requireCondition(lifecycle.activation?.subject_source === 'auth.uid()' && lifecycle.activation?.caller_supplied_user_id_allowed === false && lifecycle.activation?.atomic_profile_creation === true && lifecycle.activation?.idempotent === true, 'activation must remain auth.uid-bound, atomic, and idempotent without caller-selected user IDs');
  requireCondition(lifecycle.hard_delete === 'FORBIDDEN' && lifecycle.retirement_tombstone === 'BLOCKED', 'hard delete must remain forbidden and retirement/tombstone must remain unapproved');
  requireCondition(lifecycle.import_staging?.initial_state === 'pending' && lifecycle.import_staging?.requires_auth_uid_derived_subject === true && lifecycle.import_staging?.requires_new_target_session_on_origin === true && lifecycle.import_staging?.requires_exact_product_profile_parity === true && lifecycle.import_staging?.suspended_preserved === true, 'import membership staging must remain pending, auth.uid-bound, profile-parity-gated, and suspension-preserving');
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

  const domain = documents['contracts/v1/auth/domain-session-contract.json'] ?? {};
  const origins = Object.fromEntries((Array.isArray(domain.origins) ? domain.origins : [])
    .filter((origin) => origin && typeof origin === 'object')
    .map((origin) => [origin.role, origin.origin]));
  const domainRouting = domain.domain_routing ?? {};
  const authConfiguration = domain.auth_configuration ?? {};
  const authPolicy = domain.auth_policy ?? {};
  const accountChangeSecurity = authPolicy.account_change_security ?? {};
  const captcha = authPolicy.captcha ?? {};
  const passwordlessEmail = authPolicy.passwordless_email ?? {};
  const mfa = authPolicy.mfa ?? {};
  const totp = mfa.totp ?? {};
  const identityLinking = authPolicy.identity_linking ?? {};
  const privilegedLinking = identityLinking.privileged_reconciliation ?? {};
  const jwt = authPolicy.jwt ?? {};
  const sessionModel = domain.session_model ?? {};
  const refreshTokens = sessionModel.refresh_tokens ?? {};
  const crossOriginSso = sessionModel.cross_origin_sso ?? {};
  const providerApplicationGate = domain.provider_application_gate ?? {};
  const smtp = domain.smtp ?? {};
  const expectedRedirectUrls = [
    'https://account.fawxzzy.com/auth/callback',
    'https://account.fawxzzy.com/reset-password?recovery=1',
    'https://fitness.fawxzzy.com/auth/callback',
    'https://mazer.fawxzzy.com/auth/callback'
  ];
  const configuredUrls = [
    ...(Array.isArray(authConfiguration.exact_redirect_urls) ? authConfiguration.exact_redirect_urls : []),
    authConfiguration.exact_recovery_url
  ].filter((url) => typeof url === 'string');

  requireCondition(domain.version === '1.1.0', 'domain/session contract version must remain 1.1.0');
  requireCondition(domain.security_session_decision_id === 'FP-MAN-012', 'security/session policy must remain bound to FP-MAN-012');
  requireCondition(origins.hub === 'https://fawxzzy.com', 'hub origin changed');
  requireCondition(origins.account === 'https://account.fawxzzy.com', 'account origin changed');
  requireCondition(origins.fitness === 'https://fitness.fawxzzy.com', 'Fitness origin changed');
  requireCondition(origins.mazer === 'https://mazer.fawxzzy.com', 'Mazer origin changed');
  requireCondition(domainRouting.www_redirect?.source === 'https://www.fawxzzy.com' && domainRouting.www_redirect?.destination === 'https://fawxzzy.com', 'www redirect contract changed');
  requireCondition(domainRouting.fitness_compatibility_redirect?.retirement_status === 'BLOCKED', 'Fitness compatibility redirect retirement must remain BLOCKED');
  requireCondition(sessionModel.browser_sessions === 'per_origin', 'phase-1 browser sessions must remain per-origin');
  requireCondition(crossOriginSso.status === 'BLOCKED', 'cross-origin SSO must remain deferred and BLOCKED');
  requireCondition(exactOrderedValues(crossOriginSso.forbidden_mechanisms, ['shared_refresh_cookies', 'url_tokens']), 'unsafe cross-origin SSO mechanisms must remain forbidden');
  requireCondition(configuredUrls.every((url) => !url.includes('*')), 'production redirect and recovery URLs must be exact');
  requireCondition(configuredUrls.every((url) => !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::|\/|$)/i.test(url)), 'localhost production Auth URLs are forbidden');
  requireCondition(authConfiguration.site_url === 'https://account.fawxzzy.com', 'Auth site URL must remain on the account origin');
  requireCondition(exactOrderedValues(authConfiguration.exact_redirect_urls, expectedRedirectUrls), 'exact ordered Auth redirect allowlist changed');
  requireCondition(authConfiguration.exact_recovery_url === 'https://account.fawxzzy.com/reset-password?recovery=1', 'recovery must remain on the verified account reset route');
  requireCondition(Array.isArray(authConfiguration.preview_redirects?.urls) && authConfiguration.preview_redirects.urls.length === 0, 'preview redirects must remain empty in this packet');
  requireCondition(authPolicy.phase_one_method === 'email_password', 'phase-1 Auth method must remain email/password');
  requireCondition(exactOrderedValues(authPolicy.product_visible_sign_in_methods, ['email_password']), 'product-visible sign-in methods must remain email/password only');
  requireCondition(authPolicy.email_verification === false, 'phase-1 email verification must remain off');
  requireCondition(authPolicy.leaked_password_protection?.enabled === true, 'leaked-password protection must remain enabled');
  requireCondition(authPolicy.password_length?.minimum?.value === 10, 'password minimum must remain 10');
  const passwordCapacity = authPolicy.password_length?.capacity ?? {};
  requireCondition(passwordCapacity.restrictive_app_cap_allowed === false, 'restrictive application password caps are forbidden');
  requireCondition(passwordCapacity.minimum_supported_characters >= 64, 'password surfaces must support at least 64 characters');
  requireCondition(passwordCapacity.preferred_supported_characters_minimum >= 128, 'password surfaces should preserve at least 128-character capacity');
  requireCondition(passwordCapacity.never_truncate === true, 'password truncation is forbidden');
  requireCondition(passwordCapacity.provider_maximum_setting === 'NOT_APPLICABLE', 'provider maximum-password setting must remain NOT_APPLICABLE');
  requireCondition(exactOrderedValues(authPolicy.deferred_methods, ['social', 'phone', 'anonymous', 'magic_link_only', 'enforced_mfa']), 'deferred Auth methods changed');
  requireCondition(accountChangeSecurity.recent_authentication_for_password_changes === 'REQUIRED', 'recent authentication must remain required for password changes');
  requireCondition(accountChangeSecurity.current_password_for_signed_in_password_changes === 'REQUIRED', 'current password must remain required for signed-in password changes');
  requireCondition(accountChangeSecurity.current_password_for_signed_in_email_changes === 'REQUIRED', 'current password must remain required for signed-in email changes');
  requireCondition(accountChangeSecurity.secure_email_change === 'REQUIRED', 'secure email change must remain required');
  requireCondition(accountChangeSecurity.native_hosted_current_password_for_email_change === 'UNKNOWN', 'native hosted email-change current-password capability must remain UNKNOWN');
  requireCondition(accountChangeSecurity.application_server_email_change_enforcement === 'REQUIRED', 'application/server email-change enforcement must remain required until native capability is proven');
  requireCondition(captcha.status === 'REQUIRED' && exactOrderedValues(captcha.surfaces, ['public_signup', 'password_reset']), 'CAPTCHA must remain required for public signup and password reset');
  requireCondition(captcha.provider_class === 'UNKNOWN', 'CAPTCHA provider class must remain UNKNOWN');
  requireCondition(captcha.credential_installation === 'BLOCKED' && captcha.live_configuration === 'BLOCKED', 'CAPTCHA installation and live configuration must remain BLOCKED');
  requireCondition(Array.isArray(captcha.bypass_allowlist) && captcha.bypass_allowlist.length === 0, 'CAPTCHA bypass allowlist must remain empty');
  requireCondition(passwordlessEmail.provider_toggle === 'UNKNOWN' && passwordlessEmail.product_ui_exposure === 'BLOCKED', 'passwordless email provider capability must remain UNKNOWN and hidden from product UI');
  requireCondition(totp.available === true && totp.enrollment === 'optional' && totp.enforced === false, 'TOTP must remain available, optional, and unenforced');
  requireCondition(mfa.sms?.status === 'BLOCKED' && mfa.passkeys?.status === 'BLOCKED', 'SMS MFA and passkeys must remain BLOCKED');
  requireCondition(mfa.aal1_maximum_age_seconds === 900, 'AAL1 maximum age must remain 900 seconds');
  requireCondition(sessionModel.multiple_devices_allowed === true && sessionModel.single_session_enforcement === false, 'multiple devices must remain allowed with single-session enforcement off');
  requireCondition(sessionModel.absolute_lifetime_seconds === 2592000, 'absolute session lifetime must remain 2592000 seconds');
  requireCondition(sessionModel.inactivity_timeout_seconds === 604800, 'session inactivity timeout must remain 604800 seconds');
  requireCondition(refreshTokens.compromise_detection === true && refreshTokens.rotation === true && refreshTokens.reuse_interval_seconds === 10, 'refresh compromise detection, rotation, and 10-second reuse interval must remain enabled');
  requireCondition(identityLinking.manual_client_linking === false, 'manual client identity linking must remain disabled');
  requireCondition(privilegedLinking.status === 'REQUIRED' && privilegedLinking.verified_deterministic_identity_evidence === true, 'privileged reconciliation linking requires verified deterministic identity evidence');
  requireCondition(privilegedLinking.username_only_matching_forbidden === true, 'privileged reconciliation must forbid username-only matching');
  requireCondition(jwt.expiry_seconds === 'UNKNOWN' && jwt.signing_key_class === 'UNKNOWN', 'JWT expiry and signing-key class must remain UNKNOWN');
  requireCondition(jwt.secret_material_allowed === false && Object.keys(jwt).every((key) => ['expiry_seconds', 'signing_key_class', 'secret_material_allowed'].includes(key)), 'secret-bearing JWT material is structurally prohibited');
  requireCondition(providerApplicationGate.status === 'BLOCKED' && providerApplicationGate.apply_admitted === false, 'provider application gate must remain BLOCKED and non-executable');
  const importReauth = domain.import_reauth_rehearsal ?? {};
  requireCondition(importReauth.status === 'CURRENT' && importReauth.apply_admitted === false && importReauth.target_signing_identity === 'RETAIN', 'domain import reauthentication must preserve target signing identity without provider authority');
  requireCondition(importReauth.source_sessions_tokens_cookies === 'EXCLUDE_AND_REJECT' && importReauth.new_sessions === 'PER_ORIGIN_CONTROLLED_REAUTH' && importReauth.pkce_recovery === 'CENTRALIZED_REQUIRED' && importReauth.url_tokens === 'FORBIDDEN', 'domain import reauthentication boundary drift');
  requireCondition(exactOrderedValues(providerApplicationGate.requirements, ['fresh_target_preimage', 'expected_state_mutation_authority', 'exact_readback', 'exact_rollback']), 'provider application evidence and rollback requirements changed');
  requireCondition(domain.account_surfaces?.owner_origin === 'https://account.fawxzzy.com', 'neutral account flow owner changed');
  requireCondition(smtp.decision_id === 'FP-MAN-003' && smtp.production_custom_smtp === 'REQUIRED', 'SMTP policy decision or production requirement changed');
  requireCondition(smtp.sender_address === 'no-reply@account.fawxzzy.com', 'SMTP sender contract changed');
  requireCondition(smtp.credentials_present === false && smtp.live_configuration_allowed === false, 'repository must not contain SMTP credentials or live configuration authority');

  const security = documents['contracts/v1/security/rls-grant-function-matrix.json'];
  requireCondition(security.version === '1.1.0', 'security matrix version must remain 1.1.0');
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
    'fitness.profiles',
    'mazer.mazer_profiles',
    'fitness.user_entitlements'
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
        requireCondition(expression.includes(productProfileOwnerPredicates[relation.name]), `${relation.name}/${policy.name}: owner predicate must remain ${productProfileOwnerPredicates[relation.name]}`);
        requireCondition(expression.includes(`m.service_id = '${serviceId}'`), `${relation.name}/${policy.name}: product-profile access must require its service membership`);
        requireCondition(expression.includes('m.user_id = (select auth.uid())'), `${relation.name}/${policy.name}: membership row must bind directly to auth.uid()`);
        requireCondition(!/\bm\.user_id\s*=\s*user_id\b/.test(expression), `${relation.name}/${policy.name}: unqualified membership user predicate is tautological and forbidden`);
        requireCondition(expression.includes("m.state = 'active'") && !expression.includes("'suspended'"), `${relation.name}/${policy.name}: product-profile access must require active membership only`);
      }
    }
  }

  const globalProfile = security.relations.find((relation) => relation.name === 'platform_shared.global_profiles');
  requireCondition(globalProfile?.canonical_user_key === 'auth.users.id' && globalProfile?.one_to_one_with_auth_users === true, 'global profile must remain one-to-one with auth.users.id');
  requireCondition(!globalProfile?.grants.authenticated.includes('UPDATE'), 'platform_shared.global_profiles: relation-wide authenticated UPDATE is forbidden');
  requireCondition(Array.isArray(globalProfile?.authenticated_update_columns) && globalProfile.authenticated_update_columns.length === 0, 'platform_shared.global_profiles: direct authenticated update columns must remain empty until explicitly declared');
  requireCondition(sameValues(globalProfile?.server_owned_columns ?? [], protectedGlobalProfileColumns), 'platform_shared.global_profiles: server-owned column set changed');
  requireCondition((globalProfile?.authenticated_update_columns ?? []).every((column) => !protectedGlobalProfileColumns.includes(column)), 'platform_shared.global_profiles: immutable or server-owned columns cannot receive authenticated UPDATE');
  requireCondition(globalProfile?.policies.every((policy) => policy.command !== 'UPDATE'), 'platform_shared.global_profiles: direct authenticated UPDATE policy is forbidden without declared mutable columns');

  const memberships = security.relations.find((relation) => relation.name === 'platform_shared.user_service_memberships');
  requireCondition(exactOrderedValues(memberships?.immutable_key, ['user_id', 'service_id']) && memberships?.client_writes === 'DENIED' && memberships?.revision === 'MONOTONIC', 'membership identity must remain immutable, client-write denied, and monotonic');
  requireCondition(!memberships?.grants.authenticated.some((operation) => ['INSERT', 'UPDATE', 'DELETE'].includes(operation)), 'memberships must not grant client writes');
  requireCondition(!security.relations.some((relation) => relation.name.startsWith('discordos.') && ['product_profile', 'product_entitlement'].includes(relation.kind)), 'DiscordOS human profile and entitlement surfaces remain unapproved');
  requireCondition(!security.relations.some((relation) => relation.name.startsWith('mazer.') && relation.kind === 'product_entitlement'), 'Mazer generic entitlement surface remains undefined');
  requireCondition(security.invariants.membership_client_writes_forbidden === true && security.invariants.profile_access_requires_owner_and_active_same_service_membership === true && security.invariants.presentation_and_external_identifiers_authorization_forbidden === true && security.invariants.account_portal_membership_read_model === 'sanitized_authoritative', 'membership security separation and account-portal read model changed');

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
  requireCondition(exactOrderedValues(activationFunction?.atomic_relations, ['platform_shared.user_service_memberships', 'platform_shared.service_activation_receipts', 'fitness.profiles', 'mazer.mazer_profiles']), 'activation must atomically create only approved human-service profiles');
  const authTrigger = security.functions.find((databaseFunction) => databaseFunction.name === 'platform_private.on_auth_user_created');
  requireCondition(authTrigger?.exposure === 'trigger_only', 'Auth user creation function must remain trigger-only');
  requireCondition(authTrigger?.auth_uid_check === false && authTrigger?.subject_source === 'NEW.id', 'Auth insert trigger must derive its subject from NEW.id without auth.uid()');

  failures.push(...validateRecoveryDocuments(documents).failures);
  failures.push(...validateIndependentBackupContract(documents[independentBackupContractPath]).failures);

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
    semantic_check_groups: 24,
    failures
  };
}
