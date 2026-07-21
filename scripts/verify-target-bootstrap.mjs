import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalJson,
  analyzeFunctionDependencyStatement,
  classifyStatement,
  findHeldFunctionReferences,
  generatedInertArtifactContractV1,
  generateTargetBootstrap,
  gitBlobSha1,
  parseCreatorDefaultAclStatement,
  parseFunctionDefinition,
  parseFunctionPrivilegeEffect,
  root,
  sha256,
  splitSqlStatements,
  verifyFitnessFunctionSearchPaths
} from './generate-target-bootstrap.mjs';
import {
  createValidator,
  loadDocuments,
  validateAppDataReceiptSanitization,
  validateSchemaInstances,
  validateSemantics
} from './lib/contracts.mjs';
import { listWorkingTreeFiles } from './lib/repository.mjs';

const expectedGeneratedArtifactDirectory = 'bootstrap/artifacts/inert-sql';
const expectedGeneratedFiles = [
  '00000000000001_mazer_schema_inert.sql',
  '00000000000002_fitness_schema_inert.sql',
  '00000000000003_discordos_schema_inert.sql',
  '00000000000004_platform_security_overlay_inert.sql'
];
const expectedManifestFiles = [
  'collisions.v1.json',
  'data-effects.v1.json',
  'dispositions.v1.json',
  'dynamic-units.v1.json',
  'namespace-plan.v1.json',
  'source-migrations.v1.json',
  'source-objects.v1.json'
];
const exactGeneratedFunctionRoles = Object.freeze(['anon', 'authenticated', 'public', 'service_role']);
const exactCreatorDefaultAclRoles = Object.freeze(['postgres', 'supabase_admin']);
const exactCreatorDefaultAclSchemas = Object.freeze([
  'discordos', 'discordos_private', 'fitness', 'mazer', 'platform_private', 'platform_shared'
]);
const exactCreatorDefaultAclGrantees = Object.freeze(['PUBLIC', 'anon', 'authenticated', 'service_role']);
const exactCreatorDefaultAclObjectClasses = Object.freeze({
  TABLES: Object.freeze(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']),
  SEQUENCES: Object.freeze(['USAGE', 'SELECT', 'UPDATE']),
  FUNCTIONS: Object.freeze(['EXECUTE'])
});
export const creatorDefaultAclContractV1 = Object.freeze({
  version: '1.0.0',
  status: 'BLOCKED',
  apply_admitted: false,
  creator_roles: exactCreatorDefaultAclRoles,
  schemas: exactCreatorDefaultAclSchemas,
  object_classes: exactCreatorDefaultAclObjectClasses,
  grantees: exactCreatorDefaultAclGrantees,
  unit_count: 36,
  executable_unit_count: 12,
  signature_assertion_unit_count: 6,
  blocked_unit_count: 18,
  role_dispositions: Object.freeze({ postgres: 'REQUIRED', supabase_admin: 'BLOCKED' }),
  blocked_creator_role: 'supabase_admin',
  blocked_creator_disposition: 'NOT_EXECUTABLE',
  blocked_creator_class: 'BLOCKED_PROVIDER_ROLE',
  evidence_receipts: Object.freeze([
    Object.freeze({ id: 'FP-TGT-SECURITY-BASELINE-001', status: 'BLOCKED', sqlstate: '42501', transaction_rollback: 'CURRENT' }),
    Object.freeze({
      id: 'FP-TGT-PROVIDER-DEFAULT-ACL-001',
      status: 'CURRENT',
      automatic_exposure_control: 'unchecked_save_disabled',
      historical_supabase_admin_client_default_tuples: 36,
      management_api_reconciliation_field: 'NOT_APPLICABLE'
    })
  ]),
  placement: 'after_schema_prerequisites_before_first_governed_object_creation'
});
export const applicationCreatorBoundaryV1 = Object.freeze({
  version: '1.0.0',
  status: 'BLOCKED',
  blocker_class: 'BLOCKED_PROVIDER_SUPPORT_REQUIRED',
  residual_containment: 'CONTAINABLE_WITH_HARD_GATES',
  owner_role: 'postgres',
  schemas: exactCreatorDefaultAclSchemas,
  governed_object_classes: Object.freeze(['TABLES', 'SEQUENCES', 'FUNCTIONS']),
  create_revoked_from: Object.freeze(['supabase_admin']),
  public_objects_allowed: false,
  runtime_owner_assertion: 'REQUIRED',
  provider_role_isolation_proof: 'UNKNOWN'
});
export const publicObjectBoundaryV1 = Object.freeze({
  version: '1.0.0',
  status: 'BLOCKED',
  application_object_count: 0,
  forbidden_object_classes: Object.freeze(['TABLES', 'VIEWS', 'MATERIALIZED_VIEWS', 'SEQUENCES', 'TYPES', 'FUNCTIONS']),
  provider_helper_exception: Object.freeze({
    status: 'BLOCKED',
    evidence_receipt: 'FP-TGT-PUBLIC-RESIDUAL-CONTAINMENT-RO-001',
    identity: 'UNKNOWN',
    owner: 'UNKNOWN',
    search_path: 'UNKNOWN',
    execute_acl: 'UNKNOWN',
    disabled_trigger: 'UNKNOWN',
    admission: 'exact_manifest_required_before_readiness'
  })
});
export const dataApiGateV1 = Object.freeze({
  version: '1.1.0',
  status: 'BLOCKED',
  containment_classification: 'CONTAINABLE_WITH_HARD_GATES',
  observed_current_preimage: Object.freeze({
    status: 'CURRENT',
    action_time_expected_state_binding: Object.freeze({
      status: 'REQUIRED',
      identity_binding: 'ACTION_TIME_ONLY',
      source_artifact_contains_identity: false,
      fresh_project_identity_readback: 'REQUIRED',
      fresh_preimage_readback: 'REQUIRED',
      expected_state_guard: 'REQUIRED',
      owner_authority: 'REQUIRED'
    }),
    data_api_state: 'ENABLED',
    exposed_schemas: Object.freeze(['graphql_public', 'public']),
    extra_search_path: Object.freeze(['public', 'extensions']),
    automatic_exposure: 'OFF',
    tables: Object.freeze({ available: 0, exposed: 0 }),
    functions: Object.freeze({ available: 1, exposed: 0 }),
    views: Object.freeze({ available: 'UNKNOWN', exposed: 'UNKNOWN' }),
    evidence_receipts: Object.freeze([
      'FP-TGT-DATA-API-SELECTOR-PREIMAGE-RO-001',
      'FP-TGT-DATA-API-CONTAINMENT-METADATA-RO-002'
    ])
  }),
  desired_containment_postimage: Object.freeze({
    status: 'REQUIRED',
    data_api_state: 'DISABLED',
    exposed_schemas: Object.freeze([]),
    extra_search_path: Object.freeze(['extensions']),
    automatic_exposure: 'OFF',
    independent_readback: 'REQUIRED'
  }),
  attempted_execution: Object.freeze({
    status: 'BLOCKED',
    authorized_sequence: 'TWO_ORDERED_SAVES',
    overview_save_attempts: 2,
    overview_saves_persisted: 0,
    settings_save_attempts: 0,
    rollback_saves: 0,
    persisted_provider_mutations: 0,
    outcome: 'OVERVIEW_SAVE_DID_NOT_PERSIST',
    final_state_equals_observed_preimage: true,
    provider_defect_classification: 'UNKNOWN'
  }),
  support_evidence: Object.freeze({
    status: 'CURRENT',
    sanitized_title: 'Fawxzzy — Data API disable Save does not persist',
    original_title_sha256: 'af597f221fb16fbaedfead5cfda2317a0db700fad3d7303127ca81e51099b16f',
    body_sha256: 'bff2253b6d7f789897fc79b4fe7d51c27ea290917bd8b8590fd8c09e17b247fd',
    confirmation: 'Support request sent',
    confirmed_at: '2026-07-19T17:39:40.793Z',
    case_id: 'UNKNOWN',
    case_status: 'UNKNOWN',
    response: 'UNKNOWN',
    provider_defect_classification: 'UNKNOWN',
    dashboard_case_inbox_available: false
  }),
  retry_authority: Object.freeze({
    status: 'BLOCKED',
    prior_authority_consumed: true,
    third_save_authorized: false,
    decision_ready_prerequisites: Object.freeze([
      'changed_documented_support_evidence',
      'fresh_target_preimage',
      'new_bounded_owner_authority'
    ]),
    support_advice_grants_execution_authority: false
  }),
  bootstrap_admission: Object.freeze({
    status: 'BLOCKED',
    setting_mutation_admitted: false,
    bootstrap_apply_admitted: false,
    target_apply_admitted: false
  }),
  future_activation_gates: Object.freeze({
    maximum_exposed_schemas: Object.freeze(['platform_shared', 'discordos', 'mazer', 'fitness']),
    never_exposed_schemas: Object.freeze([
      'graphql_public', 'public', 'discordos_private', 'platform_private', 'extensions', 'auth', 'storage', 'realtime'
    ]),
    public_absent_before_activation: true,
    automatic_exposure: 'OFF',
    explicit_grants: 'REQUIRED',
    row_level_security: 'REQUIRED',
    negative_probes: Object.freeze({
      REST: 'UNKNOWN',
      GRAPHQL: 'UNKNOWN',
      RPC: 'UNKNOWN',
      required_outcome: 'NO_TARGET_DATA_SURFACE'
    }),
    rollback: Object.freeze({
      status: 'REQUIRED',
      preimage: 'observed_current_preimage',
      order: Object.freeze([
        'restore_settings_exposed_schemas_and_extra_search_path',
        'restore_data_api_enablement'
      ]),
      expected_state_guarded: true,
      exact_readback: 'REQUIRED'
    })
  })
});
export const targetPostgresqlContractV1 = Object.freeze({
  status: 'REQUIRED',
  major_version: 17,
  live_target_version: 'UNKNOWN',
  maintain_default_privilege: 'REQUIRED',
  official_reference: 'https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html'
});
export const generatedFunctionPrivilegeContractV1 = Object.freeze({
  version: '1.0.0',
  admitted_schemas: Object.freeze(['discordos', 'discordos_private', 'fitness', 'mazer', 'platform_private', 'platform_shared', 'public']),
  governed_roles: exactGeneratedFunctionRoles,
  default_privilege_creator_roles: Object.freeze(['postgres']),
  functions: Object.freeze({
    'discordos.set_updated_at()': Object.freeze({ source_file: '00000000000003_discordos_schema_inert.sql', definition_count: 1, allowed_execute_roles: Object.freeze([]) }),
    'fitness.claim_session_follow_up_jobs(uuid, uuid, timestamptz, timestamptz)': Object.freeze({ source_file: '00000000000002_fitness_schema_inert.sql', definition_count: 2, allowed_execute_roles: Object.freeze([]) }),
    'fitness.reorder_routine_day_exercises(uuid, uuid, uuid[])': Object.freeze({ source_file: '00000000000002_fitness_schema_inert.sql', definition_count: 2, allowed_execute_roles: Object.freeze([]) }),
    'fitness.reorder_routine_days(uuid, uuid, uuid[])': Object.freeze({ source_file: '00000000000002_fitness_schema_inert.sql', definition_count: 1, allowed_execute_roles: Object.freeze([]) }),
    'fitness.repack_routine_day_exercise_positions_after_delete()': Object.freeze({ source_file: '00000000000002_fitness_schema_inert.sql', definition_count: 3, allowed_execute_roles: Object.freeze([]) }),
    'fitness.repack_session_exercise_positions_after_delete()': Object.freeze({ source_file: '00000000000002_fitness_schema_inert.sql', definition_count: 3, allowed_execute_roles: Object.freeze([]) })
  })
});
export const generatedFitnessFunctionSearchPathContractV1 = Object.freeze({
  version: '1.0.0',
  source_file: '00000000000002_fitness_schema_inert.sql',
  effective_search_path: Object.freeze(['fitness', 'pg_temp']),
  functions: Object.freeze([
    'fitness.claim_session_follow_up_jobs(uuid, uuid, timestamptz, timestamptz)',
    'fitness.reorder_routine_day_exercises(uuid, uuid, uuid[])',
    'fitness.reorder_routine_days(uuid, uuid, uuid[])',
    'fitness.repack_routine_day_exercise_positions_after_delete()',
    'fitness.repack_session_exercise_positions_after_delete()'
  ])
});
const exactExpected = {
  migrations: 122,
  tables: 41,
  functions: 30,
  policies: 74,
  fitness_policies: 63,
  triggers: 10,
  index_identities: 134,
  constraint_units: 281,
  extension_dependencies: 3,
  held_data_effects: 358,
  dynamic_templates: 11,
  held_cron_units: 1
};
const frozenSourceAcceptance = Object.freeze({
  combined_manifest_sha256: '67109b789d0d83af7fc4739aee9ab0617285175114c5785e6acd893647c32bd9',
  sources: Object.freeze({
    discordos: Object.freeze({
      app_label: 'DiscordOS',
      commit: 'bd12f6713518b3f3af3761618e3d3e5f6979f167',
      tree: 'f9b01b18d1ba9ad544c582d0dc88ee2ac285bbe8',
      migration_count: 17,
      chain_manifest_sha256: '6a6e9fa29651331d2addb0259bc61bc7c2f0795bd71b2a04971c96ff146a822e'
    }),
    fitness: Object.freeze({
      app_label: 'Fitness',
      commit: 'bab188a51819a6fb2f8aeabe73627d4ed63dcaa4',
      tree: 'b2ed1cdee0f67d751c3f6cd030a1f7d7622aaba1',
      migration_count: 101,
      chain_manifest_sha256: 'f4e62d004d8c0cd243ca2fa1798c13549844cf538e8f8c8fa15866870af92775'
    }),
    mazer: Object.freeze({
      app_label: 'Mazer',
      commit: '3e96125da699aab21eb47c6635558b337ce0cf41',
      tree: 'f0ff7cb74841b32fe423147a26ca58a860e6aa56',
      migration_count: 4,
      chain_manifest_sha256: 'ded23731083cd97f1f50f700ccd8f1843a43e1b8bfef10727cca6ae851ed7fb6'
    })
  })
});
const fitnessPr108ReplayGatePath = 'contracts/v1/gates/fitness-pr108-replay-gate.json';
const frozenFitnessPr108ReplayGate = Object.freeze({
  version: '1.1.0',
  fitness_head: '4ff406c92c1d9b9e7ab23a4ebdaa01820b9b5c01',
  fitness_tree: 'e8314980790dd9c711f63f4b38ad61e59ec6f409',
  accepted_chain_sha256: '236ded2d260b2787838219f6e54fa63cbed80a8581930f165ca6025bca91db3a',
  candidate_chain_sha256: '711445d03b3d98466c278c4dfcbaa7cda326f188427b6dbcd55065fae1a2bbb5',
  candidate_path: 'supabase/migrations/20260718015422_retire_human_member_number_compaction.sql',
  candidate_blob: '007eca9503dfd10a6910a27b02a46def30583d18',
  candidate_byte_count: 15431,
  candidate_sha256: 'ca502e3bcef4532ce4de336d33334c5620efaf3863286db51f6440bb9224662d',
  adapter_base: '82cbd3b195dd5a07c3b437946f4404041f749508',
  adapter_head: '475967d9dcf4a859f53d535e95e3f77a5396bd21',
  adapter_tree: '4a6f258c4f6a600327518bf63458217f11511150',
  adapter_branch: 'codex/fitness-pr108-full-chain-replay-source',
  adapter_review_request: 5031568065,
  adapter_terminal_clean_comment: 5031595633,
  adapter_review_threads: 7,
  adapter_merge: 'e513d2b241d34b8fac838b65c6444e34a4b5ce7a',
  workflow_path: '.github/workflows/fitness-full-chain-replay.yml',
  workflow_blob: '07e784ad91cf2cfb62ea9c6e0b8d407fe5b652c4',
  workflow_byte_count: 1904,
  workflow_sha256: 'f43ba4498c0d9755b1fd23082b5da21d8f937b2ebf7373aec63d78562a35b062',
  runner_label: 'fp-hosted-replay-jit-v1',
  deterministic_package_sha256: '80482b9bbfaf70b5980dd290b78def12d0af898cc10ee12f402b46d378fdbf83',
  blocked_dependency_reason: 'Fitness exact-head terminal review, workflow dispatch, JIT runner proof, replay execution, Fitness merge, and target apply remain blocked; merged replay provenance is source-only.'
});

function requiredString(value, label, pattern) {
  if (typeof value !== 'string' || !pattern.test(value)) throw new Error(`${label}: missing or invalid binding`);
  return value;
}

export function computeSourceChainSha256(records) {
  if (!Array.isArray(records) || records.length === 0) throw new Error('source chain: missing migration bindings');
  const ordered = [...records].sort((left, right) => left.order - right.order);
  const lines = ordered.map((record, index) => {
    if (record.order !== index + 1) throw new Error(`source chain: non-contiguous order at ${index + 1}`);
    const sourcePath = requiredString(record.path, `source chain ${index + 1} path`, /^supabase\/migrations\/[A-Za-z0-9_.-]+\.sql$/);
    const version = /^([0-9]+)_/.exec(path.posix.basename(sourcePath))?.[1];
    requiredString(version, `source chain ${sourcePath} version`, /^[0-9]+$/);
    const blob = requiredString(record.blob, `source chain ${sourcePath} blob`, /^[0-9a-f]{40}$/);
    const rawSha256 = requiredString(record.raw_sha256, `source chain ${sourcePath} raw digest`, /^[0-9a-f]{64}$/);
    if (!Number.isSafeInteger(record.byte_count) || record.byte_count < 0) throw new Error(`source chain ${sourcePath}: missing or invalid byte count`);
    return `${version}|${sourcePath}|${blob}|${rawSha256}|${record.byte_count}\n`;
  });
  return sha256(lines.join(''));
}

export function computeCombinedSourceSha256(records) {
  if (!Array.isArray(records) || records.length === 0) throw new Error('combined source chain: missing source bindings');
  const ordered = [...records].sort((left, right) => left.app_label.localeCompare(right.app_label));
  const labels = new Set();
  const lines = ordered.map((record, index) => {
    const label = requiredString(record.app_label, `combined source ${index + 1} app`, /^[A-Za-z][A-Za-z0-9]*$/);
    if (labels.has(label)) throw new Error(`combined source ${label}: duplicate app binding`);
    labels.add(label);
    const commit = requiredString(record.commit, `combined source ${label} commit`, /^[0-9a-f]{40}$/);
    const tree = requiredString(record.tree, `combined source ${label} tree`, /^[0-9a-f]{40}$/);
    const chainSha256 = requiredString(record.chain_manifest_sha256, `combined source ${label} chain digest`, /^[0-9a-f]{64}$/);
    return `${label}|${commit}|${tree}|${chainSha256}\n`;
  });
  return sha256(lines.join(''));
}

export function verifyFrozenSourceAcceptance({
  sourceRowsByApp,
  sourceIdentities,
  acceptedChains,
  configuredCombinedSha256,
  acceptedCombinedSha256
}) {
  const expectedApps = Object.keys(frozenSourceAcceptance.sources).sort();
  const identityApps = sourceIdentities.map((source) => source.app).sort();
  const rowApps = Object.keys(sourceRowsByApp ?? {}).sort();
  const acceptedApps = Object.keys(acceptedChains ?? {}).sort();
  if (canonicalJson(identityApps) !== canonicalJson(expectedApps)) throw new Error('frozen source acceptance: source identity denominator mismatch');
  if (canonicalJson(rowApps) !== canonicalJson(expectedApps)) throw new Error('frozen source acceptance: source-row denominator mismatch');
  if (canonicalJson(acceptedApps) !== canonicalJson(expectedApps)) throw new Error('frozen source acceptance: accepted-chain denominator mismatch');

  const actualChains = {};
  const combinedRecords = [];
  for (const source of sourceIdentities) {
    const frozen = frozenSourceAcceptance.sources[source.app];
    for (const field of ['commit', 'tree', 'migration_count', 'chain_manifest_sha256']) {
      if (source[field] !== frozen[field]) throw new Error(`frozen source acceptance: ${source.app} ${field} mismatch`);
    }
    if (sourceRowsByApp[source.app].length !== frozen.migration_count) throw new Error(`frozen source acceptance: ${source.app} migration count mismatch`);
    const actualChainSha256 = computeSourceChainSha256(sourceRowsByApp[source.app]);
    if (actualChainSha256 !== frozen.chain_manifest_sha256) throw new Error(`frozen source acceptance: ${source.app} copied-byte chain digest mismatch`);
    if (acceptedChains[source.app] !== frozen.chain_manifest_sha256) throw new Error(`frozen source acceptance: ${source.app} accepted chain digest mismatch`);
    actualChains[source.app] = actualChainSha256;
    combinedRecords.push({
      app_label: frozen.app_label,
      commit: source.commit,
      tree: source.tree,
      chain_manifest_sha256: actualChainSha256
    });
  }

  const actualCombinedSha256 = computeCombinedSourceSha256(combinedRecords);
  if (configuredCombinedSha256 !== frozenSourceAcceptance.combined_manifest_sha256) throw new Error('frozen source acceptance: configured combined digest mismatch');
  if (acceptedCombinedSha256 !== frozenSourceAcceptance.combined_manifest_sha256) throw new Error('frozen source acceptance: accepted combined digest mismatch');
  if (actualCombinedSha256 !== frozenSourceAcceptance.combined_manifest_sha256) throw new Error('frozen source acceptance: recomputed combined digest mismatch');
  return { actualChains, actualCombinedSha256 };
}

function readJson(relativePath) {
  const text = fs.readFileSync(path.join(root, ...relativePath.split('/')), 'utf8');
  const value = JSON.parse(text);
  if (text !== canonicalJson(value)) throw new Error(`${relativePath}: non-canonical JSON`);
  return value;
}

function digestPackageOutputs() {
  const paths = [
    ...expectedManifestFiles.map((name) => `bootstrap/manifests/${name}`),
    ...expectedGeneratedFiles.map((name) => `${expectedGeneratedArtifactDirectory}/${name}`)
  ];
  const records = paths.map((relativePath) => ({
    path: relativePath,
    sha256: sha256(fs.readFileSync(path.join(root, ...relativePath.split('/'))))
  }));
  return { records, digest: sha256(canonicalJson(records)) };
}

function fail(failures, condition, message) {
  if (!condition) failures.push(message);
}

export function verifyFitnessPr108ReplayGate({ config, gate, sourceManifest, deterministicPackageSha256 }) {
  const failures = [];
  const dependency = config.blocked_dependencies?.find((candidate) => candidate.id === 'fitness-pr108-replay-provenance');
  fail(failures, Boolean(dependency), 'Fitness PR 108 blocked dependency missing');
  fail(failures, dependency?.decision === 'BLOCKED', 'Fitness PR 108 blocked dependency must remain BLOCKED');
  fail(failures, dependency?.contract_path === fitnessPr108ReplayGatePath, 'Fitness PR 108 blocked dependency contract path drift');
  fail(failures, dependency?.contract_version === frozenFitnessPr108ReplayGate.version, 'Fitness PR 108 blocked dependency contract version drift');
  fail(failures, dependency?.source_candidate_head === frozenFitnessPr108ReplayGate.fitness_head, 'Fitness PR 108 blocked dependency head drift');
  fail(failures, dependency?.reason === frozenFitnessPr108ReplayGate.blocked_dependency_reason, 'Fitness PR 108 blocked dependency reason drift');

  fail(failures, gate.version === frozenFitnessPr108ReplayGate.version && gate.gate_id === 'fitness-pr108-replay-gate', 'Fitness PR 108 gate identity drift');
  fail(failures, gate.status === 'BLOCKED' && gate.apply_admitted === false && gate.provenance_only === true, 'Fitness PR 108 gate must remain BLOCKED provenance-only evidence');
  const fitness = gate.fitness_candidate ?? {};
  fail(failures, fitness.head_commit === frozenFitnessPr108ReplayGate.fitness_head && fitness.head_tree === frozenFitnessPr108ReplayGate.fitness_tree, 'Fitness PR 108 immutable head/tree drift');
  fail(failures, fitness.accepted_migration_count === 101 && fitness.candidate_migration_count === 102, 'Fitness PR 108 migration denominator drift');
  fail(failures, fitness.accepted_chain_sha256 === frozenFitnessPr108ReplayGate.accepted_chain_sha256, 'Fitness PR 108 accepted chain digest drift');
  fail(failures, fitness.candidate_chain_sha256 === frozenFitnessPr108ReplayGate.candidate_chain_sha256, 'Fitness PR 108 candidate chain digest drift');
  fail(failures, fitness.candidate_migration?.path === frozenFitnessPr108ReplayGate.candidate_path, 'Fitness PR 108 candidate migration path drift');
  fail(failures, fitness.candidate_migration?.blob === frozenFitnessPr108ReplayGate.candidate_blob, 'Fitness PR 108 candidate migration blob drift');
  fail(failures, fitness.candidate_migration?.byte_count === frozenFitnessPr108ReplayGate.candidate_byte_count, 'Fitness PR 108 candidate migration byte count drift');
  fail(failures, fitness.candidate_migration?.raw_sha256 === frozenFitnessPr108ReplayGate.candidate_sha256, 'Fitness PR 108 candidate migration digest drift');
  fail(failures, fitness.review?.exact_head_terminal_review === 'BLOCKED', 'Fitness PR 108 exact-head terminal review must remain BLOCKED');

  const adapter = gate.hosted_replay_adapter ?? {};
  const adapterReview = adapter.source_review ?? {};
  const adapterMerge = adapter.merge ?? {};
  const workflow = adapter.default_branch_workflow ?? {};
  fail(failures, adapter.repository === 'fawxzzy/hosted-replay-harness' && adapter.pull_request === 2 && adapter.changed_path_count === 12, 'hosted replay adapter repository denominator drift');
  fail(failures, adapterReview.base_commit === frozenFitnessPr108ReplayGate.adapter_base && adapterReview.head_commit === frozenFitnessPr108ReplayGate.adapter_head && adapterReview.head_tree === frozenFitnessPr108ReplayGate.adapter_tree, 'hosted replay reviewed source identity drift');
  fail(failures, adapterReview.source_branch === frozenFitnessPr108ReplayGate.adapter_branch && adapterReview.source_branch_preserved === true, 'hosted replay source branch preservation drift');
  fail(failures, adapterReview.request_comment === frozenFitnessPr108ReplayGate.adapter_review_request && adapterReview.terminal_clean_comment === frozenFitnessPr108ReplayGate.adapter_terminal_clean_comment && adapterReview.thread_count === frozenFitnessPr108ReplayGate.adapter_review_threads && adapterReview.unresolved_thread_count === 0 && adapterReview.status === 'CURRENT', 'hosted replay exact-head review evidence drift');
  fail(failures, adapterMerge.commit === frozenFitnessPr108ReplayGate.adapter_merge && adapterMerge.tree === frozenFitnessPr108ReplayGate.adapter_tree && adapterMerge.reviewed_head_ancestor === true && adapterMerge.reviewed_tree_byte_identical === true && adapterMerge.status === 'CURRENT', 'hosted replay merged provenance drift');
  fail(failures, workflow.path === frozenFitnessPr108ReplayGate.workflow_path && workflow.blob === frozenFitnessPr108ReplayGate.workflow_blob && workflow.byte_count === frozenFitnessPr108ReplayGate.workflow_byte_count && workflow.raw_sha256 === frozenFitnessPr108ReplayGate.workflow_sha256 && workflow.trigger === 'workflow_dispatch' && workflow.source_status === 'CURRENT', 'hosted replay default-branch workflow identity drift');
  fail(failures, workflow.dispatch_run_count === 0 && workflow.execution === 'BLOCKED' && adapter.replay_execution === 'BLOCKED', 'hosted replay workflow dispatch and replay execution must remain zero and BLOCKED');
  fail(failures, workflow.runner_label === frozenFitnessPr108ReplayGate.runner_label && workflow.runner_availability === 'UNKNOWN' && workflow.runner_use === 'BLOCKED', 'hosted replay JIT runner must remain exact-label UNKNOWN and held');

  const lifecycle = gate.lifecycle ?? {};
  fail(failures, lifecycle.candidate_source_review === 'BLOCKED', 'candidate_source_review must remain BLOCKED');
  fail(failures, lifecycle.adapter_source_review === 'CURRENT', 'adapter_source_review must remain CURRENT');
  fail(failures, lifecycle.adapter_merge === 'CURRENT', 'adapter_merge must remain CURRENT');
  fail(failures, lifecycle.workflow_dispatch === 'BLOCKED', 'workflow_dispatch must remain BLOCKED');
  fail(failures, lifecycle.runner_readiness === 'UNKNOWN', 'runner_readiness must remain UNKNOWN');
  for (const unit of ['replay_execution', 'fitness_merge', 'target_apply']) {
    fail(failures, lifecycle[unit] === 'BLOCKED', `${unit} must remain BLOCKED`);
  }

  const accepted = gate.accepted_bootstrap ?? {};
  const sourceCounts = Object.fromEntries((config.sources ?? []).map((source) => [source.app, source.migration_count]));
  fail(failures, accepted.apply_admitted === false && accepted.candidate_migration_present === false, 'accepted bootstrap must remain non-executable without the Fitness candidate');
  fail(failures, accepted.migration_count === 122 && accepted.discordos_migration_count === 17 && accepted.fitness_migration_count === 101 && accepted.mazer_migration_count === 4, 'Fitness PR 108 accepted bootstrap denominator drift');
  fail(failures, accepted.deterministic_package_sha256 === frozenFitnessPr108ReplayGate.deterministic_package_sha256, 'Fitness PR 108 accepted package digest drift');
  if (deterministicPackageSha256 !== undefined) {
    fail(failures, deterministicPackageSha256 === frozenFitnessPr108ReplayGate.deterministic_package_sha256, 'actual deterministic package digest drift');
  }
  fail(failures, sourceCounts.discordos === 17 && sourceCounts.fitness === 101 && sourceCounts.mazer === 4, 'generator source denominator must remain 17/101/4');
  fail(failures, sourceManifest.migrations?.length === 122, 'accepted source manifest must remain 122 migrations');
  const candidate = fitness.candidate_migration ?? {};
  fail(failures, sourceManifest.migrations?.filter((migration) => migration.app === 'fitness').length === 101, 'accepted source manifest must remain 101 Fitness migrations');
  fail(failures, sourceManifest.migrations?.every((migration) => migration.path !== candidate.path), 'Fitness PR 108 candidate path leaked into accepted source manifest');
  fail(failures, sourceManifest.migrations?.every((migration) => migration.blob !== candidate.blob), 'Fitness PR 108 candidate blob leaked into accepted source manifest');
  fail(failures, sourceManifest.migrations?.every((migration) => migration.raw_sha256 !== candidate.raw_sha256), 'Fitness PR 108 candidate digest leaked into accepted source manifest');
  fail(failures, sourceManifest.migrations?.every((migration) => migration.commit !== fitness.head_commit), 'Fitness PR 108 candidate head leaked into accepted source manifest');
  return failures.sort((left, right) => left.localeCompare(right));
}

export function verifyProviderCanonicalProvenance({ gate, sourceManifest, deterministicPackageSha256 }) {
  const failures = [];
  const provenance = gate?.provider_canonical_provenance ?? {};
  const accepted = provenance.accepted_package ?? {};
  const mappings = Array.isArray(provenance.effect_mappings) ? provenance.effect_mappings : [];
  const expectedSources = [
    ['discordos', 'nwexsktuuenfdegzrbut', 17, 11, 'd5c5cea4195d6c3f7ec4445bb389534f9b97df3fccfcbf28aab64d90d0372cf7'],
    ['mazer', 'geknvnrmktchljnyddwp', 4, 3, '7eae1b6d58f2eee065b9ba2030684e7171ae02eb2aaa520d191c9d78cee79436']
  ];
  fail(failures, gate?.status === 'BLOCKED' && gate?.version === '1.4.0', 'provider-canonical migration gate must remain BLOCKED at version 1.4.0');
  fail(failures, provenance.status === 'CURRENT' && provenance.apply_admitted === false, 'provider-canonical provenance must remain CURRENT and non-executable');
  fail(failures, provenance.combined_provenance_sha256 === '25a79bc6674f022159d08bf592566a141d869542195003932d6c220ef25c8684', 'provider-canonical combined provenance digest drift');
  fail(failures, accepted.migration_count === 122 && accepted.source_counts?.discordos === 17 && accepted.source_counts?.fitness === 101 && accepted.source_counts?.mazer === 4, 'provider-canonical accepted package denominator drift');
  fail(failures, accepted.apply_admitted === false && accepted.historical_path_rewrite_forbidden === true && accepted.current_source_substitution_forbidden === true, 'provider-canonical package protections drift');
  fail(failures, accepted.deterministic_package_sha256 === deterministicPackageSha256, 'provider-canonical deterministic package digest drift');
  fail(failures, Array.isArray(provenance.sources) && provenance.sources.length === 2, 'provider-canonical source evidence denominator drift');
  for (const [app, projectRef, acceptedCount, currentCount, catalogSha256] of expectedSources) {
    const source = provenance.sources?.find((candidate) => candidate?.app === app);
    fail(failures, source?.project_ref === projectRef && source?.provider_ledger_migration_count === acceptedCount && source?.current_git_migration_count === currentCount && source?.current_git_canonicality === 'not_provider_canonical' && source?.complete_catalog_sha256 === catalogSha256, `${app}: provider-canonical source evidence drift`);
  }
  fail(failures, mappings.length === 21, 'provider-canonical effect mapping denominator must contain 21 units');
  fail(failures, sha256(canonicalJson(mappings)) === provenance.effect_mappings_sha256, 'provider-canonical effect mapping digest drift');
  const manifestRows = Array.isArray(sourceManifest?.migrations) ? sourceManifest.migrations.filter((migration) => migration.app === 'discordos' || migration.app === 'mazer') : [];
  fail(failures, manifestRows.length === 21, 'accepted DiscordOS/Mazer manifest denominator must contain 21 units');
  const mappingKeys = new Set();
  for (const mapping of mappings) {
    const key = `${mapping?.app}:${mapping?.ledger_version}`;
    fail(failures, !mappingKeys.has(key), `${key}: duplicate provider-canonical effect mapping`);
    mappingKeys.add(key);
    const matching = manifestRows.filter((migration) => migration.app === mapping?.app && migration.path === mapping?.accepted_path);
    fail(failures, matching.length === 1, `${key}: mapping must bind exactly one accepted source path`);
    const migration = matching[0];
    if (!migration) continue;
    const basename = path.posix.basename(migration.path);
    const parsed = /^([0-9]{14})_([a-z0-9_]+)\.sql$/.exec(basename);
    fail(failures, parsed?.[1] === mapping.ledger_version && parsed?.[2] === mapping.ledger_name, `${key}: provider-ledger identity drift`);
    fail(failures, migration.commit === mapping.source_commit && migration.blob === mapping.blob && migration.raw_sha256 === mapping.raw_sha256 && migration.byte_count === mapping.byte_count, `${key}: accepted historical bytes/path binding drift`);
  }
  fail(failures, mappings.filter((mapping) => mapping.app === 'discordos').length === 17 && mappings.filter((mapping) => mapping.app === 'mazer').length === 4, 'provider-canonical effect mapping source counts drift');
  return failures.sort((left, right) => left.localeCompare(right));
}

export function verifySharedAuthImportRehearsal({ contract, gate }) {
  const failures = [];
  const expectedAnchors = [
    ['platform', 'bef5f17f4b82c36daeada9cb8cefa4d845158382'],
    ['web', 'b6118a24aca9a6b7686c8c9622137bdb5d5e894f'],
    ['fitness', '317568f9dcbc7d6c9dcf2ad30ef1cd80022ce8b3'],
    ['mazer', '3bd13233dc33fc721f8ccf105d2cc51f1a8dd8d4'],
    ['discordos', 'aef01f277e006e3cb46550e507ebd8e4a1be9d21']
  ];
  const importGate = gate?.shared_auth_import_reauth_rehearsal ?? {};
  fail(failures, contract?.status === 'CURRENT' && contract?.lifecycle?.source_contract === 'SOURCE_READY' && contract?.lifecycle?.execution === 'EXECUTION_BLOCKED' && contract?.apply_admitted === false, 'shared Auth import rehearsal must remain source-ready, execution-blocked, and non-executable');
  fail(failures, contract?.research_denominator_sha256 === 'e102c0c65897642735daf6555aa1111432bfeb74e484fbe16e483b1366581820', 'shared Auth import research denominator drift');
  fail(failures, canonicalJson(contract?.source_anchors?.map((anchor) => [anchor.app, anchor.commit])) === canonicalJson(expectedAnchors), 'shared Auth import source anchors drift');
  fail(failures, canonicalJson(contract?.preview_order) === canonicalJson(['FawxzzyWeb_account_shell', 'Mazer', 'Fitness', 'DiscordOS']), 'shared Auth import Preview order drift');
  fail(failures, contract?.snapshot_and_idempotency?.timestamps_alone_sufficient === false && canonicalJson(contract?.snapshot_and_idempotency?.diff_requires) === canonicalJson(['additions', 'changes', 'tombstones']), 'shared Auth import snapshot diff boundary drift');
  fail(failures, canonicalJson(contract?.snapshot_and_idempotency?.idempotency_key) === canonicalJson(['source_project', 'relation', 'source_key_digest', 'row_digest', 'transform_version']), 'shared Auth import idempotency key binding drift');
  fail(failures, contract?.totp?.portability === 'UNKNOWN' && contract?.totp?.default === 'REENROLL', 'shared Auth import TOTP portability must remain unknown with reenrollment default');
  fail(failures, importGate.status === 'CURRENT' && importGate.source_contract_lifecycle === 'SOURCE_READY' && importGate.execution_lifecycle === 'EXECUTION_BLOCKED' && importGate.apply_admitted === false, 'shared Auth import gate drift');
  return failures.sort((left, right) => left.localeCompare(right));
}

export function verifyAppDataTransportContracts({ contract, receipt, journal, gate }) {
  const failures = [];
  const receiptValidator = createValidator().getSchema('urn:fawxzzy:platform:schemas:v1:app-data-receipt');
  if (!receiptValidator(receipt)) {
    failures.push(...(receiptValidator.errors ?? []).map((error) =>
      `app data receipt schema ${error.instancePath || '$'}: ${error.keyword}`));
  }
  failures.push(...validateAppDataReceiptSanitization(receipt).map((failure) =>
    `app data receipt sanitization: ${failure}`));
  const transportGate = gate?.app_data_transport ?? {};
  const expectedLifecycle = [
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
  ];
  fail(failures, contract?.status === 'CURRENT' && contract?.lifecycle?.source_contract === 'SOURCE_READY' && contract?.lifecycle?.execution === 'EXECUTION_BLOCKED' && contract?.apply_admitted === false, 'app data transport must remain source-ready, execution-blocked, and non-executable');
  fail(failures, contract?.research_evidence?.research_denominator_sha256 === 'ae397c89afaf23231c2911d571d9799fabbb7a21196044f6679763e7515cf087' && contract?.research_evidence?.design_path_sha256 === 'f7554683cf3d9add36634afb6e6b543983d9968a600e05cf3ee885cc0a6f53ac', 'app data transport research binding drift');
  fail(failures, canonicalJson(contract?.transport_lifecycle) === canonicalJson(expectedLifecycle), 'app data transport lifecycle order drift');
  fail(failures, contract?.snapshot_protocol?.complete_primary_key_set_comparison === true && contract?.snapshot_protocol?.canonical_row_digest_comparison === true && contract?.snapshot_protocol?.accelerators_replace_complete_comparison === false && contract?.snapshot_protocol?.S2_final_diff_required_after_write_barrier === true, 'app data transport complete snapshot proof drift');
  fail(failures, contract?.mutation_model?.deletes_require_explicit_tombstones === true && contract?.mutation_model?.implicit_resurrection_as_update_forbidden === true && contract?.mutation_model?.matching_applied_mutation === 'IDEMPOTENT_REUSE', 'app data transport tombstone or idempotent-reuse semantics drift');
  fail(failures, canonicalJson(contract?.compare_and_swap?.accepted_expected_target) === canonicalJson(['ABSENT', 'EXACT_DIGEST']) && contract?.compare_and_swap?.unexpected_target_digest === 'QUARANTINE' && contract?.compare_and_swap?.unexpected_target_overwrite_forbidden === true, 'app data transport CAS boundary drift');
  fail(failures, contract?.dependency_ordering?.inserts_and_updates === 'PARENT_FIRST' && contract?.dependency_ordering?.deletes === 'CHILD_FIRST' && contract?.dependency_ordering?.foreign_key_cycles?.declared_staging_plan_required === true && contract?.dependency_ordering?.foreign_key_cycles?.synthetic_proof_required === true, 'app data transport dependency ordering drift');
  fail(failures, contract?.derived_and_external_effects?.derived_cache_rebuild_after_authoritative_parity === true && contract?.derived_and_external_effects?.external_effects_during_rehearsal_and_rollback === 'QUARANTINED', 'app data transport cache or external-effect boundary drift');
  fail(failures, journal?.status === 'CURRENT' && journal?.lifecycle?.source_contract === 'SOURCE_READY' && journal?.lifecycle?.execution === 'EXECUTION_BLOCKED' && journal?.apply_admitted === false && journal?.append_only === true, 'app data mutation journal lifecycle drift');
  fail(failures, journal?.completeness?.every_committed_mutation_recorded === true && journal?.completeness?.every_idempotent_reuse_recorded === true && journal?.completeness?.every_conflict_quarantine_recorded === true && journal?.rollback?.reverse_dependency_order === true && journal?.rollback?.reverse_catch_up_to_source === 'SEPARATE_EXPLICIT_AUTHORITY', 'app data mutation journal completeness or rollback drift');
  fail(failures, receipt?.status === 'BLOCKED' && receipt?.execution_lifecycle === 'EXECUTION_BLOCKED' && receipt?.apply_admitted === false && receipt?.synthetic_fixture === true && receipt?.source_pause_authorized === false, 'app data receipt must remain synthetic, blocked, and non-executable');
  fail(failures, receipt?.snapshot_completeness?.S0_complete === true && receipt?.snapshot_completeness?.S1_complete_key_and_row_diff === true && receipt?.snapshot_completeness?.S2_complete_key_and_row_diff === true && receipt?.snapshot_completeness?.explicit_tombstones_complete === true, 'app data receipt snapshot completeness drift');
  fail(failures, receipt?.cas_counts?.unexpected_overwrite === 0 && receipt?.cas_counts?.conflict_quarantine > 0, 'app data receipt CAS conflict proof drift');
  fail(failures, transportGate.status === 'CURRENT' && transportGate.source_contract_lifecycle === 'SOURCE_READY' && transportGate.execution_lifecycle === 'EXECUTION_BLOCKED' && transportGate.apply_admitted === false && transportGate.dependency_status === 'BLOCKED', 'app data transport migration gate drift');
  fail(failures, transportGate.contract_path === 'contracts/v1/transport/app-data-transport-contract.json' && transportGate.receipt_path === 'contracts/v1/transport/app-data-receipt.example.json' && transportGate.mutation_journal_contract_path === 'contracts/v1/transport/app-data-mutation-journal-contract.json', 'app data transport path binding drift');
  return failures.sort((left, right) => left.localeCompare(right));
}

export function verifyMazerAppDataAdapter({ adapter, gate }) {
  const failures = [];
  const documents = loadDocuments();
  documents['contracts/v1/transport/mazer-app-data-adapter-contract.json'] = adapter;
  documents['contracts/v1/gates/migration-gate-state.json'] = gate;
  const schemaFailures = validateSchemaInstances(documents, createValidator());
  failures.push(...schemaFailures.map((failure) => `Mazer app data schema validation: ${failure}`));
  if (schemaFailures.length === 0) {
    try {
      failures.push(...validateSemantics(documents).map((failure) => `Mazer app data semantic validation: ${failure}`));
    } catch {
      failures.push('Mazer app data semantic validation failed closed');
    }
  }
  const adapterGate = gate?.app_data_adapters ?? {};
  const provenance = gate?.provider_canonical_provenance ?? {};
  const mazerSource = (provenance.sources ?? []).find((source) => source.app === 'mazer');
  const mazerMappings = (provenance.effect_mappings ?? []).filter((mapping) => mapping.app === 'mazer');
  const expectedRelations = [
    ['public.mazer_profiles', 'mazer.mazer_profiles', 'AUTHORITATIVE_ACTIVATION_SEED', ['user_id'], 'PRIVATE_SEED_THEN_ATOMIC_ACTIVATION'],
    ['public.mazer_progression_states', 'mazer.mazer_progression_states', 'AUTHORITATIVE_STATE', ['user_id'], 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP'],
    ['public.mazer_ai_progression_states', 'mazer.mazer_ai_progression_states', 'AUTHORITATIVE_PER_RUNNER_STATE', ['user_id', 'runner_key'], 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP'],
    ['public.mazer_cycle_receipts', 'mazer.mazer_cycle_receipts', 'AUTHORITATIVE_APPEND_ONLY_HISTORY', ['id'], 'PRESERVE_IDENTITY_APPEND_ONLY']
  ];
  const actualRelations = (Array.isArray(adapter?.relations) ? adapter.relations : []).map((relation) => [relation.source_relation, relation.target_relation, relation.classification, relation.primary_key, relation.transport_mode]);
  fail(failures, adapter?.status === 'CURRENT' && adapter?.lifecycle?.source_contract === 'SOURCE_READY' && adapter?.lifecycle?.execution === 'EXECUTION_BLOCKED' && adapter?.apply_admitted === false, 'Mazer app data adapter lifecycle drift');
  fail(failures, canonicalJson(actualRelations) === canonicalJson(expectedRelations), 'Mazer app data adapter relation denominator drift');
  const profileSeed = adapter?.identity_and_activation?.profile_seed ?? {};
  const absentProfilePolicy = profileSeed.source_profile_absent_policy ?? {};
  fail(failures, adapter?.identity_and_activation?.activation_subject_source === 'auth.uid()' && adapter?.identity_and_activation?.caller_supplied_user_id_allowed === false && profileSeed.direct_pre_activation_insert_allowed === false && profileSeed.consumption === 'ATOMIC_WITH_ACTIVATION' && profileSeed.source_profile_present_exact_parity_required === true, 'Mazer app data activation-seed boundary drift');
  fail(failures, absentProfilePolicy.detection === 'COMPLETE_S0_S1_S2_PROFILE_KEY_ABSENCE' && canonicalJson(absentProfilePolicy.trigger_relations) === canonicalJson(['public.mazer_progression_states', 'public.mazer_ai_progression_states', 'public.mazer_cycle_receipts']) && absentProfilePolicy.seed_version === 'mazer-profile-default-v1' && absentProfilePolicy.seed_origin === 'SERVER_OWNED_SCHEMA_DEFAULT' && canonicalJson(absentProfilePolicy.default_columns) === canonicalJson({ display_name: null, selected_control_mode: 'stick', settings: {} }) && canonicalJson(absentProfilePolicy.server_timestamp_columns) === canonicalJson(['created_at', 'updated_at']) && absentProfilePolicy.caller_values_allowed === false && absentProfilePolicy.direct_pre_activation_insert_allowed === false && absentProfilePolicy.activation === 'ATOMIC_WITH_PENDING_MEMBERSHIP' && absentProfilePolicy.source_rows_transport_outcome === 'PRESERVE_AFTER_ACTIVATION' && absentProfilePolicy.unproven_absence_outcome === 'QUARANTINE_PENDING_MEMBERSHIP' && absentProfilePolicy.silent_drop_allowed === false, 'Mazer absent-source-profile activation boundary drift');
  fail(failures, adapter?.relations?.[1]?.accelerators_replace_complete_comparison === false && canonicalJson(adapter?.relations?.[1]?.accelerators) === canonicalJson(['revision']), 'Mazer app data revision accelerator drift');
  fail(failures, adapter?.relations?.[2]?.all_source_columns_authoritative === true && adapter?.relations?.[2]?.independent_runner_keys_preserved === true && canonicalJson(adapter?.relations?.[2]?.authoritative_payload_columns) === canonicalJson(['state', 'summary']) && adapter?.relations?.[2]?.complete_runner_key_set_parity_required === true && adapter?.relations?.[2]?.rebuild_from_human_progression_allowed === false && adapter?.relations?.[2]?.target_default_runner_key_allowed === false && canonicalJson(adapter?.relations?.[2]?.allowed_operations) === canonicalJson(['INSERT', 'UPDATE', 'IDEMPOTENT_REUSE', 'EXPLICIT_TOMBSTONE']), 'Mazer AI runner authoritative state boundary drift');
  fail(failures, canonicalJson(adapter?.dependency_ordering?.insert_update_order) === canonicalJson(['auth_mapping', 'pending_membership', 'atomic_profile_seed_activation', 'progression', 'ai_runner_progression', 'cycle_receipts']) && canonicalJson(adapter?.dependency_ordering?.delete_order) === canonicalJson(['cycle_receipt_tombstones', 'ai_runner_progression_tombstones', 'progression_tombstones', 'profile_preserve']), 'Mazer app data dependency ordering drift');
  fail(failures, adapter?.relations?.[3]?.target_default_identity_generation_allowed === false && canonicalJson(adapter?.relations?.[3]?.allowed_operations) === canonicalJson(['INSERT', 'IDEMPOTENT_REUSE', 'EXPLICIT_TOMBSTONE']), 'Mazer cycle receipt identity regeneration drift');
  fail(failures, canonicalJson(adapter?.snapshot_and_cas?.required_snapshots) === canonicalJson(['S0', 'S1', 'S2']) && adapter?.snapshot_and_cas?.complete_primary_key_set_comparison === true && adapter?.snapshot_and_cas?.complete_canonical_row_digest_comparison === true && adapter?.snapshot_and_cas?.revision_or_timestamp_only_proof_allowed === false, 'Mazer app data complete snapshot proof drift');
  fail(failures, canonicalJson(adapter?.snapshot_and_cas?.accepted_expected_target) === canonicalJson(['ABSENT', 'EXACT_DIGEST']) && adapter?.snapshot_and_cas?.unexpected_target_digest === 'QUARANTINE' && adapter?.snapshot_and_cas?.unexpected_target_overwrite_allowed === false, 'Mazer app data CAS overwrite drift');
  fail(failures, adapter?.deletion_and_rollback?.explicit_tombstones_required === true && adapter?.deletion_and_rollback?.implicit_cascade_authority === false && adapter?.deletion_and_rollback?.profile_delete_action === 'SUSPEND_AND_PRESERVE', 'Mazer app data deletion boundary drift');
  const forbiddenReceiptClasses = ['raw_rows', 'primary_keys', 'names', 'emails', 'usernames', 'user_numbers_or_ranges', 'uuids_or_ranges', 'secrets', 'project_refs', 'sql', 'payloads', 'provider_responses', 'machine_paths'];
  fail(failures, canonicalJson(adapter?.public_receipt_policy?.forbidden_classes) === canonicalJson(forbiddenReceiptClasses) && adapter?.canonicalization?.raw_values_in_public_receipts === false, 'Mazer app data receipt redaction drift');
  fail(failures, adapter?.dependency_gates?.data_api_containment === 'BLOCKED' && adapter?.dependency_gates?.accepted_recovery_and_quarantined_restore === 'BLOCKED' && adapter?.dependency_gates?.faithful_contained_replay === 'BLOCKED' && adapter?.dependency_gates?.target_bootstrap === 'BLOCKED' && adapter?.dependency_gates?.shared_auth_identity_mapping === 'BLOCKED' && adapter?.dependency_gates?.service_membership_readiness === 'BLOCKED' && adapter?.dependency_gates?.fitness_adapter === 'BLOCKED' && adapter?.dependency_gates?.discordos_adapter === 'BLOCKED' && adapter?.dependency_gates?.target_apply === 'BLOCKED', 'Mazer app data dependency gate promotion');
  fail(failures, canonicalJson(adapterGate.required_order) === canonicalJson(['mazer', 'fitness', 'discordos']) && canonicalJson(adapterGate.source_ready) === canonicalJson(['mazer', 'fitness', 'discordos']) && canonicalJson(adapterGate.blocked) === canonicalJson([]), 'Mazer app data adapter readiness gate drift');
  fail(failures, adapterGate.mazer_contract_path === 'contracts/v1/transport/mazer-app-data-adapter-contract.json' && adapterGate.mazer_relation_count === 4 && adapterGate.fitness_contract_path === 'contracts/v1/transport/fitness-app-data-adapter-contract.json' && adapterGate.fitness_relation_count === 27 && adapterGate.discordos_contract_path === 'contracts/v1/transport/discordos-app-data-adapter-contract.json' && adapterGate.discordos_relation_count === 10 && adapterGate.all_adapters_ready === true && adapterGate.execution_lifecycle === 'EXECUTION_BLOCKED' && adapterGate.apply_admitted === false, 'Mazer app data adapter execution gate drift');
  fail(failures, adapter?.provider_canonical?.provider_ledger_migration_count === mazerSource?.provider_ledger_migration_count && adapter?.provider_canonical?.complete_catalog_sha256 === mazerSource?.complete_catalog_sha256, 'Mazer app data provider catalog binding drift');
  fail(failures, adapter?.provider_canonical?.current_git_head === '3bd13233dc33fc721f8ccf105d2cc51f1a8dd8d4' && adapter?.provider_canonical?.current_git_migration_count === mazerSource?.current_git_migration_count && adapter?.provider_canonical?.current_git_canonicality === 'not_provider_canonical' && adapter?.provider_canonical?.current_git_substitution_forbidden === true, 'Mazer app data Git substitution boundary drift');
  fail(failures, adapter?.provider_canonical?.accepted_package_sha256 === provenance?.accepted_package?.deterministic_package_sha256 && adapter?.provider_canonical?.effect_mapping_count === 4 && adapter?.provider_canonical?.effect_mappings_sha256 === sha256(canonicalJson(mazerMappings)), 'Mazer app data provider mapping binding drift');
  fail(failures, mazerMappings.length === 4 && mazerMappings.every((mapping) => mapping.source_commit === adapter?.provider_canonical?.accepted_source_commit), 'Mazer app data provider source commit drift');
  return failures.sort((left, right) => left.localeCompare(right));
}

export function verifyFitnessAppDataAdapter({ adapter, gate }) {
  const failures = [];
  const documents = loadDocuments();
  documents['contracts/v1/transport/fitness-app-data-adapter-contract.json'] = adapter;
  documents['contracts/v1/gates/migration-gate-state.json'] = gate;
  const schemaFailures = validateSchemaInstances(documents, createValidator());
  failures.push(...schemaFailures.map((failure) => `Fitness app data schema validation: ${failure}`));
  if (schemaFailures.length === 0) {
    try {
      failures.push(...validateSemantics(documents).map((failure) => `Fitness app data semantic validation: ${failure}`));
    } catch {
      failures.push('Fitness app data semantic validation failed closed');
    }
  }
  const source = adapter?.source_evidence ?? {};
  const candidate = source.held_candidate ?? {};
  const identity = adapter?.identity_and_activation ?? {};
  const profileSeed = identity.profile_seed ?? {};
  const absentProfile = profileSeed.source_profile_absent_policy ?? {};
  const discordMemberLinkOwnerRekey = identity.discord_member_link_owner_rekeying ?? {};
  const memberNumbers = adapter?.member_number_policy ?? {};
  const adapterGate = gate?.app_data_adapters ?? {};
  const acceptedPackage = gate?.provider_canonical_provenance?.accepted_package ?? {};
  const expectedRelationCore = [
    ['public.profiles', 'fitness.profiles', 'AUTHORITATIVE_ACTIVATION_SEED', 'PRIVATE_SEED_THEN_ATOMIC_ACTIVATION'],
    ['public.exercises', 'fitness.exercises', 'AUTHORITATIVE_STATE', 'GLOBAL_THEN_OWNED_CAS'],
    ['public.routines', 'fitness.routines', 'AUTHORITATIVE_STATE', 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP'],
    ['public.routine_days', 'fitness.routine_days', 'AUTHORITATIVE_STATE', 'NULLABLE_CYCLE_STAGE_THEN_CAS_PATCH'],
    ['public.routine_day_exercises', 'fitness.routine_day_exercises', 'AUTHORITATIVE_STATE', 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP'],
    ['public.sessions', 'fitness.sessions', 'AUTHORITATIVE_STATE', 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP'],
    ['public.session_exercises', 'fitness.session_exercises', 'AUTHORITATIVE_STATE', 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP'],
    ['public.sets', 'fitness.sets', 'AUTHORITATIVE_STATE', 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP'],
    ['public.workout_plan_templates', 'fitness.workout_plan_templates', 'AUTHORITATIVE_STATE', 'NULLABLE_CYCLE_STAGE_THEN_CAS_PATCH'],
    ['public.workout_plan_template_exercises', 'fitness.workout_plan_template_exercises', 'AUTHORITATIVE_STATE', 'CAS_APPLY_AFTER_ACTIVE_MEMBERSHIP'],
    ['public.progression_events', 'fitness.progression_events', 'AUTHORITATIVE_APPEND_ONLY_HISTORY', 'PRESERVE_IDENTITY_APPEND_ONLY'],
    ['public.exercise_stats', 'fitness.exercise_stats', 'DERIVED_REBUILDABLE', 'EXCLUDE_AND_REBUILD_AFTER_AUTHORITATIVE_PARITY'],
    ['public.user_entitlements', 'fitness.user_entitlements', 'ENTITLEMENT_HELD', 'HOLD_PENDING_VERIFIED_BILLING_EVIDENCE'],
    ['public.billing_customers', 'fitness.billing_customers', 'UNKNOWN_BILLING', 'HOLD_PENDING_CLOSED_BILLING_ADAPTER'],
    ['public.billing_purchases', 'fitness.billing_purchases', 'UNKNOWN_BILLING', 'HOLD_PENDING_CLOSED_BILLING_ADAPTER'],
    ['public.session_follow_up_jobs', 'fitness.session_follow_up_jobs', 'UNKNOWN_OPERATIONAL_EXTERNAL_EFFECT', 'HOLD_PENDING_EXTERNAL_EFFECT_ADAPTER'],
    ['public.discord_bug_reports', 'fitness.discord_bug_reports', 'EXCLUDED_SUPERSEDED_RELATION', 'EXCLUDE_SUPERSEDED_BY_DISCORD_FEEDBACK_REPORTS'],
    ['public.discord_feedback_reports', 'fitness.discord_feedback_reports', 'UNKNOWN_DISCORD_EXTERNAL', 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION'],
    ['public.discord_member_links', 'fitness.discord_member_links', 'UNKNOWN_DISCORD_EXTERNAL', 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION'],
    ['public.discord_message_command_claims', 'fitness.discord_message_command_claims', 'UNKNOWN_DISCORD_EXTERNAL', 'HOLD_PENDING_EXTERNAL_EFFECT_ADAPTER'],
    ['public.discord_moderation_cases', 'fitness.discord_moderation_cases', 'UNKNOWN_DISCORD_EXTERNAL', 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION'],
    ['public.discord_spotify_connections', 'fitness.discord_spotify_connections', 'UNKNOWN_DISCORD_EXTERNAL', 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION'],
    ['public.discord_spotify_lobbies', 'fitness.discord_spotify_lobbies', 'UNKNOWN_DISCORD_EXTERNAL', 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION'],
    ['public.discord_spotify_queue_items', 'fitness.discord_spotify_queue_items', 'UNKNOWN_DISCORD_EXTERNAL', 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION'],
    ['public.discord_spotify_room_members', 'fitness.discord_spotify_room_members', 'UNKNOWN_DISCORD_EXTERNAL', 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION'],
    ['public.discord_update_drafts', 'fitness.discord_update_drafts', 'UNKNOWN_DISCORD_EXTERNAL', 'HOLD_PENDING_EXTERNAL_EFFECT_ADAPTER'],
    ['public.discord_verification_tokens', 'fitness.discord_verification_tokens', 'UNKNOWN_DISCORD_EXTERNAL', 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION']
  ];
  const fitnessRelations = Array.isArray(adapter?.relations) ? adapter.relations : [];
  const actualRelationCore = fitnessRelations.map((relation) => [relation.source_relation, relation.target_relation, relation.classification, relation.transport_mode]);
  const discordMemberLinkRelations = fitnessRelations.filter((relation) => relation?.source_relation === 'public.discord_member_links');
  fail(failures, adapter?.status === 'CURRENT' && adapter?.lifecycle?.source_contract === 'SOURCE_READY' && adapter?.lifecycle?.execution === 'EXECUTION_BLOCKED' && adapter?.apply_admitted === false, 'Fitness app data adapter lifecycle drift');
  fail(failures, source.accepted_source_commit === 'bab188a51819a6fb2f8aeabe73627d4ed63dcaa4' && source.accepted_source_tree === 'b2ed1cdee0f67d751c3f6cd030a1f7d7622aaba1' && source.current_git_head === '317568f9dcbc7d6c9dcf2ad30ef1cd80022ce8b3' && source.current_git_tree === 'bd4b2809a2a613a4bc67a4cc8166bee56d64a30f' && source.current_git_exact_accepted === true, 'Fitness accepted source identity drift');
  fail(failures, source.accepted_migration_count === 101 && source.current_git_migration_count === 101 && source.accepted_chain_sha256 === 'f4e62d004d8c0cd243ca2fa1798c13549844cf538e8f8c8fa15866870af92775' && source.path_blob_bytes_sha256 === '2f00f193811ab07997956a16b05364828120ea2721e8a2826a0364adf8df10b5', 'Fitness accepted migration denominator drift');
  fail(failures, source.relation_count === 27 && source.relation_manifest_sha256 === '3896e695cfecad5b0e7e9eeb873386774a9c1c75c367e768245638b71673c183' && canonicalJson(actualRelationCore) === canonicalJson(expectedRelationCore), 'Fitness 27-relation denominator drift');
  fail(failures, candidate.fitness_pr108_head === '4ff406c92c1d9b9e7ab23a4ebdaa01820b9b5c01' && candidate.candidate_migration_count === 102 && candidate.candidate_bytes_admitted === false && candidate.replay_execution === 'BLOCKED', 'Fitness candidate or replay hold drift');
  fail(failures, identity.canonical_human_key === 'auth.users.id' && identity.activation_subject_source === 'auth.uid()' && identity.caller_supplied_user_id_allowed === false && identity.discord_ids_as_identity_evidence === false && identity.member_numbers_as_identity_evidence === false, 'Fitness identity or activation subject boundary drift');
  fail(failures, profileSeed.source_relation === 'public.profiles' && profileSeed.target_relation === 'fitness.profiles' && profileSeed.source_primary_key === 'id' && profileSeed.consumption === 'ATOMIC_WITH_ACTIVATION' && profileSeed.direct_pre_activation_insert_allowed === false && profileSeed.source_profile_present_exact_parity_required === true, 'Fitness profile activation-seed drift');
  fail(failures, absentProfile.detection === 'COMPLETE_S0_S1_S2_PROFILE_KEY_ABSENCE' && absentProfile.default_seed_allowed === false && absentProfile.source_rows_transport_outcome === 'QUARANTINE_PENDING_MEMBERSHIP' && absentProfile.unproven_absence_outcome === 'QUARANTINE_PENDING_MEMBERSHIP' && absentProfile.caller_values_allowed === false && absentProfile.silent_drop_allowed === false, 'Fitness absent-source-profile policy drift');
  fail(failures, discordMemberLinkRelations.length === 1 && discordMemberLinkRelations[0]?.owner_key === 'fitness_user_id' && discordMemberLinkRelations[0]?.classification === 'UNKNOWN_DISCORD_EXTERNAL' && discordMemberLinkRelations[0]?.transport_mode === 'HOLD_PENDING_DISCORD_IDENTITY_ADJUDICATION' && canonicalJson(discordMemberLinkRelations[0]?.dependency_parents) === canonicalJson(['auth.users']) && discordMemberLinkRelations[0]?.hold_reason === 'DISCORD_IDENTITY_AND_EFFECTS_UNRESOLVED', 'Fitness Discord member-link owner relation drift');
  fail(failures, discordMemberLinkOwnerRekey.source_relation === 'public.discord_member_links' && discordMemberLinkOwnerRekey.source_owner_key === 'fitness_user_id' && discordMemberLinkOwnerRekey.source_owner_not_null === true && discordMemberLinkOwnerRekey.source_owner_unique === true && discordMemberLinkOwnerRekey.source_owner_foreign_key === 'auth.users.id' && discordMemberLinkOwnerRekey.source_identity_ledger === 'platform_private.source_identity_ledger' && discordMemberLinkOwnerRekey.controlled_auth_mapping_contract === 'contracts/v1/auth/import-rehearsal-contract.json', 'Fitness Discord member-link owner rekey boundary drift');
  fail(failures, discordMemberLinkOwnerRekey.accepted_mapping_cardinality === 'EXACTLY_ONE' && discordMemberLinkOwnerRekey.accepted_mapping_outcome === 'REKEY_TO_LEDGER_TARGET' && discordMemberLinkOwnerRekey.missing_mapping_outcome === 'QUARANTINE_PENDING_VERIFIED_EVIDENCE' && discordMemberLinkOwnerRekey.contradictory_mapping_outcome === 'QUARANTINE_PENDING_VERIFIED_EVIDENCE' && discordMemberLinkOwnerRekey.duplicate_mapping_outcome === 'QUARANTINE_PENDING_VERIFIED_EVIDENCE' && discordMemberLinkOwnerRekey.caller_supplied_identity_allowed === false && discordMemberLinkOwnerRekey.automatic_identity_merge_allowed === false && discordMemberLinkOwnerRekey.discord_identifiers_as_identity_evidence === false, 'Fitness Discord member-link fail-closed mapping drift');
  fail(failures, memberNumbers.existing_values_action === 'COPY_UNCHANGED' && memberNumbers.high_water_action === 'PRESERVE' && memberNumbers.gaps_action === 'PRESERVE' && memberNumbers.reuse_allowed === false && memberNumbers.gap_fill_allowed === false && memberNumbers.renumber_allowed === false && memberNumbers.compaction_allowed === false && memberNumbers.caller_supplied_member_number_allowed === false, 'Fitness member-number preservation drift');
  fail(failures, memberNumbers.post_migration_allocation === 'BLOCKED' && memberNumbers.accepted_chain_contains_compaction_behavior === true && memberNumbers.held_retirement_migration_path === candidate.candidate_migration_path && memberNumbers.held_candidate_review === 'BLOCKED' && memberNumbers.faithful_replay === 'BLOCKED', 'Fitness member-number retirement gate drift');
  const cycle = adapter?.dependency_ordering?.foreign_key_cycles?.[0] ?? {};
  fail(failures, adapter?.dependency_ordering?.foreign_key_cycles?.length === 1 && canonicalJson(cycle.relations) === canonicalJson(['public.routine_days', 'public.workout_plan_templates']) && canonicalJson(cycle.nullable_reference_columns) === canonicalJson(['public.routine_days.workout_plan_template_id', 'public.workout_plan_templates.source_routine_day_id', 'public.routine_days.duplicate_source_routine_day_id']) && cycle.staging_plan === 'INSERT_NULL_REFERENCES_THEN_CAS_PATCH' && cycle.synthetic_proof_required === true, 'Fitness foreign-key cycle staging drift');
  fail(failures, canonicalJson(adapter?.snapshot_and_cas?.required_snapshots) === canonicalJson(['S0', 'S1', 'S2']) && adapter?.snapshot_and_cas?.complete_primary_key_set_comparison === true && adapter?.snapshot_and_cas?.complete_canonical_row_digest_comparison === true && adapter?.snapshot_and_cas?.timestamp_revision_or_high_water_only_proof_allowed === false, 'Fitness S0-S1-S2 completeness drift');
  fail(failures, canonicalJson(adapter?.snapshot_and_cas?.accepted_expected_target) === canonicalJson(['ABSENT', 'EXACT_DIGEST']) && adapter?.snapshot_and_cas?.unexpected_target_digest === 'QUARANTINE' && adapter?.snapshot_and_cas?.unexpected_target_overwrite_allowed === false, 'Fitness CAS overwrite boundary drift');
  fail(failures, adapter?.deletion_and_rollback?.explicit_tombstones_required === true && adapter?.deletion_and_rollback?.implicit_cascade_authority === false && canonicalJson(adapter?.deletion_and_rollback?.reappearing_key_requires) === canonicalJson(['EXPLICIT_RESURRECTION', 'NEW_GENERATION']) && adapter?.deletion_and_rollback?.profile_delete_action === 'SUSPEND_AND_PRESERVE', 'Fitness tombstone, resurrection, or rollback boundary drift');
  const forbiddenReceiptClasses = ['raw_rows', 'primary_keys', 'names', 'emails', 'usernames', 'user_numbers_or_ranges', 'uuids_or_ranges', 'secrets', 'project_refs', 'sql', 'payloads', 'provider_responses', 'machine_paths'];
  fail(failures, canonicalJson(adapter?.public_receipt_policy?.forbidden_classes) === canonicalJson(forbiddenReceiptClasses) && adapter?.canonicalization?.raw_values_in_public_receipts === false, 'Fitness public receipt redaction drift');
  const expectedDependencyGates = {
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
  fail(failures, canonicalJson(adapter?.dependency_gates) === canonicalJson(expectedDependencyGates), 'Fitness dependency gate promotion or status-vocabulary drift');
  fail(failures, canonicalJson(adapterGate.required_order) === canonicalJson(['mazer', 'fitness', 'discordos']) && canonicalJson(adapterGate.source_ready) === canonicalJson(['mazer', 'fitness', 'discordos']) && canonicalJson(adapterGate.blocked) === canonicalJson([]), 'Fitness app data adapter readiness gate drift');
  fail(failures, adapterGate.fitness_contract_path === 'contracts/v1/transport/fitness-app-data-adapter-contract.json' && adapterGate.fitness_relation_count === 27 && adapterGate.discordos_contract_path === 'contracts/v1/transport/discordos-app-data-adapter-contract.json' && adapterGate.discordos_relation_count === 10 && adapterGate.all_adapters_ready === true && adapterGate.execution_lifecycle === 'EXECUTION_BLOCKED' && adapterGate.apply_admitted === false, 'Fitness app data adapter execution gate drift');
  fail(failures, source.accepted_package_migration_count === 122 && source.accepted_package_sha256 === '80482b9bbfaf70b5980dd290b78def12d0af898cc10ee12f402b46d378fdbf83' && source.accepted_package_migration_count === acceptedPackage.migration_count && source.accepted_package_sha256 === acceptedPackage.deterministic_package_sha256 && acceptedPackage.source_counts?.fitness === 101 && acceptedPackage.apply_admitted === false, 'Fitness accepted package binding drift');
  return failures.sort((left, right) => left.localeCompare(right));
}

export function verifyDiscordosAppDataAdapter({ adapter, gate }) {
  const failures = [];
  const documents = loadDocuments();
  documents['contracts/v1/transport/discordos-app-data-adapter-contract.json'] = adapter;
  documents['contracts/v1/gates/migration-gate-state.json'] = gate;
  const schemaFailures = validateSchemaInstances(documents, createValidator());
  failures.push(...schemaFailures.map((failure) => `DiscordOS app data schema validation: ${failure}`));
  if (schemaFailures.length === 0) {
    try {
      failures.push(...validateSemantics(documents).map((failure) => `DiscordOS app data semantic validation: ${failure}`));
    } catch {
      failures.push('DiscordOS app data semantic validation failed closed');
    }
  }
  const source = adapter?.source_evidence ?? {};
  const inert = adapter?.inert_boundary ?? {};
  const identity = adapter?.identity_boundary ?? {};
  const quarantine = adapter?.external_effect_quarantine ?? {};
  const adapterGate = gate?.app_data_adapters ?? {};
  const acceptedPackage = gate?.provider_canonical_provenance?.accepted_package ?? {};
  const discordosMappings = (gate?.provider_canonical_provenance?.effect_mappings ?? []).filter((mapping) => mapping?.app === 'discordos');
  const expectedRelationCore = [
    ['discordos.discord_feedback_reports', 'discordos.discord_feedback_reports', 'AUTHORITATIVE_STATE', ['report_id'], 'CAS_AFTER_IDENTITY_AND_OVERLAP_QUARANTINE'],
    ['discordos.discord_feedback_audit_events', 'discordos.discord_feedback_audit_events', 'AUTHORITATIVE_APPEND_ONLY_HISTORY', ['id'], 'PRESERVE_IDENTITY_APPEND_ONLY'],
    ['discordos.discord_feedback_completion_reviews', 'discordos.discord_feedback_completion_reviews', 'AUTHORITATIVE_APPEND_ONLY_HISTORY', ['id'], 'PRESERVE_IDENTITY_APPEND_ONLY'],
    ['discordos.runtime_health_cron_runs', 'discordos.runtime_health_cron_runs', 'AUTHORITATIVE_APPEND_ONLY_HISTORY', ['id'], 'PRESERVE_IDENTITY_APPEND_ONLY_WITH_SCHEDULER_HELD'],
    ['discordos.discordos_board_cards', 'discordos.discordos_board_cards', 'AUTHORITATIVE_STATE', ['card_id'], 'CAS_WITH_EXTERNAL_EFFECTS_QUARANTINED'],
    ['discordos.discordos_moderation_audit_log', 'discordos.discordos_moderation_audit_log', 'AUTHORITATIVE_APPEND_ONLY_HISTORY', ['case_id'], 'PRESERVE_IDENTITY_APPEND_ONLY_WITH_EFFECTS_QUARANTINED'],
    ['discordos.discordos_music_sesh_sessions', 'discordos.discordos_music_sesh_sessions', 'AUTHORITATIVE_STATE', ['session_id'], 'CAS_WITH_EXTERNAL_EFFECTS_QUARANTINED'],
    ['discordos.discordos_music_sesh_queue_items', 'discordos.discordos_music_sesh_queue_items', 'AUTHORITATIVE_STATE', ['queue_item_id'], 'CAS_WITH_EXTERNAL_EFFECTS_QUARANTINED'],
    ['discordos.discordos_music_sesh_votes', 'discordos.discordos_music_sesh_votes', 'AUTHORITATIVE_STATE', ['vote_id'], 'CAS_WITH_EXTERNAL_EFFECTS_QUARANTINED'],
    ['discordos.discord_update_drafts', 'discordos.discord_update_drafts', 'HELD_OPERATIONAL_EXTERNAL_EFFECT', ['id'], 'HOLD_NO_TRANSPORT']
  ];
  const actualRelationCore = (Array.isArray(adapter?.relations) ? adapter.relations : []).map((relation) => [relation.source_relation, relation.target_relation, relation.classification, relation.primary_key, relation.transport_mode]);
  fail(failures, adapter?.status === 'CURRENT' && adapter?.lifecycle?.source_contract === 'SOURCE_READY' && adapter?.lifecycle?.execution === 'EXECUTION_BLOCKED' && adapter?.apply_admitted === false, 'DiscordOS app data adapter lifecycle drift');
  fail(failures, canonicalJson(actualRelationCore) === canonicalJson(expectedRelationCore) && adapter?.relations?.every((relation) => relation.owner_key === null), 'DiscordOS app data adapter relation denominator drift');
  fail(failures, source.provider_canonical_commit === 'bd12f6713518b3f3af3761618e3d3e5f6979f167' && source.provider_canonical_tree === 'f9b01b18d1ba9ad544c582d0dc88ee2ac285bbe8' && source.provider_canonical_migration_count === 17, 'DiscordOS provider-canonical source identity drift');
  fail(failures, source.current_git_head === 'aef01f277e006e3cb46550e507ebd8e4a1be9d21' && source.current_git_tree === '9e6afb159565b1b749ae7f90373aad904fff81da' && source.current_git_migration_count === 11 && source.current_git_canonicality === 'NOT_PROVIDER_CANONICAL' && source.current_git_substitution_forbidden === true, 'DiscordOS current Git substitution boundary drift');
  fail(failures, source.accepted_source_chain_sha256 === '6a6e9fa29651331d2addb0259bc61bc7c2f0795bd71b2a04971c96ff146a822e' && source.accepted_path_sha256 === '633ed3101d22dee2c93e1cd5135e5c9cfc1511690b06375c219c3d2d50119613' && source.provider_catalog_sha256 === 'd5c5cea4195d6c3f7ec4445bb389534f9b97df3fccfcbf28aab64d90d0372cf7', 'DiscordOS source chain, path, or catalog digest drift');
  fail(failures, source.provider_effect_mapping_count === 17 && source.provider_effect_mappings_sha256 === sha256(canonicalJson(discordosMappings)) && source.relation_count === 10 && source.relation_manifest_sha256 === '222e9e3f225a29b867d808282f5110ff08b68400af267858ee5c79059d1a0598' && source.external_effect_manifest_sha256 === '90d87487ac322fc69f26cdc98cf8c2652082cb0a1967fb7fefccfed0ea132eeb', 'DiscordOS mapping, relation, or external-effect digest drift');
  fail(failures, source.source_statement_count === 186 && source.final_function_identity_count === 18 && source.function_definition_count === 20 && source.trigger_count === 6 && source.index_count === 26 && source.constraint_unit_count === 49 && source.rls_enabled_relation_count === 10 && source.policy_count === 0 && source.held_function_unit_count === 19 && source.held_statement_count === 89, 'DiscordOS source object denominator drift');
  fail(failures, inert.declared_relation_count === 10 && inert.emitted_relation_count === 9 && inert.held_relation_count === 1 && inert.held_relation === 'discordos.discord_update_drafts' && inert.emitted_function_count === 1 && inert.emitted_function === 'discordos.set_updated_at' && inert.emitted_trigger_count === 5 && inert.emitted_index_count === 22, 'DiscordOS inert object denominator drift');
  fail(failures, inert.emitted_extension_count === 0 && inert.emitted_data_effect_count === 0 && inert.emitted_cron_effect_count === 0 && inert.emitted_network_effect_count === 0 && inert.generated_artifact_changes_admitted === false, 'DiscordOS inert external-effect or generated-artifact boundary drift');
  fail(failures, identity.service_mode === 'OPERATIONAL_ONLY' && identity.human_activation === 'NOT_APPLICABLE' && identity.human_profile_relation === null && identity.human_entitlement_relation === null && identity.membership_creation_allowed === false, 'DiscordOS operational-only service boundary drift');
  fail(failures, identity.canonical_human_key === 'auth.users.id' && identity.source_identity_ledger === 'platform_private.source_identity_ledger' && identity.rekey_authority === 'ACCEPTED_IDENTITY_LEDGER_MAPPING_ONLY' && identity.accepted_mapping_cardinality === 'EXACTLY_ONE', 'DiscordOS identity-ledger mapping boundary drift');
  fail(failures, identity.missing_mapping_outcome === 'QUARANTINE_PENDING_VERIFIED_EVIDENCE' && identity.contradictory_mapping_outcome === 'QUARANTINE_PENDING_VERIFIED_EVIDENCE' && identity.duplicate_mapping_outcome === 'QUARANTINE_PENDING_VERIFIED_EVIDENCE' && identity.membership_if_present_without_mapping === 'PRESERVE_PENDING', 'DiscordOS fail-closed identity mapping outcome drift');
  fail(failures, identity.caller_supplied_identity_allowed === false && identity.automatic_identity_merge_allowed === false && identity.discord_ids_as_identity_evidence === false && identity.fingerprints_as_identity_evidence === false && identity.usernames_as_identity_evidence === false && identity.labels_as_identity_evidence === false && identity.snapshots_as_identity_evidence === false, 'DiscordOS external identifier authority drift');
  fail(failures, identity.synthetic_rows_action === 'EXCLUDE' && identity.fitness_semantic_overlap_action === 'QUARANTINE', 'DiscordOS synthetic or Fitness-overlap quarantine drift');
  fail(failures, canonicalJson(adapter?.classification_counts) === canonicalJson({ authoritative_state: 5, authoritative_append_only_history: 4, held_operational_external_effect: 1, transported: 9, held: 1, total: 10 }), 'DiscordOS relation classification count drift');
  fail(failures, canonicalJson(adapter?.dependency_ordering?.insert_update_order) === canonicalJson(['discordos.discord_feedback_reports', 'discordos.discord_feedback_audit_events', 'discordos.discord_feedback_completion_reviews', 'discordos.runtime_health_cron_runs', 'discordos.discordos_board_cards', 'discordos.discordos_moderation_audit_log', 'discordos.discordos_music_sesh_sessions', 'discordos.discordos_music_sesh_queue_items', 'discordos.discordos_music_sesh_votes']), 'DiscordOS insert/update dependency order drift');
  fail(failures, canonicalJson(adapter?.dependency_ordering?.delete_order) === canonicalJson(['discordos.discordos_music_sesh_votes', 'discordos.discordos_music_sesh_queue_items', 'discordos.discordos_music_sesh_sessions', 'discordos.discord_feedback_completion_reviews', 'discordos.discord_feedback_audit_events', 'discordos.discord_feedback_reports', 'discordos.discordos_moderation_audit_log', 'discordos.discordos_board_cards', 'discordos.runtime_health_cron_runs']) && canonicalJson(adapter?.dependency_ordering?.held_relations_excluded_from_order) === canonicalJson(['discordos.discord_update_drafts']) && adapter?.dependency_ordering?.foreign_key_cycles === 'NONE' && adapter?.dependency_ordering?.external_effects === 'QUARANTINED', 'DiscordOS delete order, held relation, or cycle boundary drift');
  const blockedEffectStatuses = ['public_rpc_status', 'scheduler_status', 'network_status', 'edge_status', 'credential_status', 'alias_status', 'provider_link_status', 'webhook_status', 'moderation_action_status', 'discord_api_write_status'];
  fail(failures, blockedEffectStatuses.every((field) => quarantine[field] === 'BLOCKED') && quarantine.held_function_unit_count === 19 && quarantine.held_statement_count === 89, 'DiscordOS external-effect hold denominator drift');
  fail(failures, canonicalJson(quarantine.scheduler_extension_identities) === canonicalJson(['pg_cron', 'pg_net']) && quarantine.scheduler_job_identity === 'discordos_message_commands_poll' && quarantine.network_helper_identity === 'discordos_private.trigger_message_command_poll' && quarantine.target_egress === 'DENIED' && quarantine.source_remains_active === true && quarantine.quarantine_release_requires_separate_authority === true, 'DiscordOS scheduler, network, egress, or source-lifecycle boundary drift');
  fail(failures, canonicalJson(adapter?.snapshot_and_cas?.required_snapshots) === canonicalJson(['S0', 'S1', 'S2']) && adapter?.snapshot_and_cas?.complete_primary_key_set_comparison === true && adapter?.snapshot_and_cas?.complete_canonical_row_digest_comparison === true && adapter?.snapshot_and_cas?.timestamp_or_high_water_only_proof_allowed === false, 'DiscordOS complete snapshot proof drift');
  fail(failures, canonicalJson(adapter?.snapshot_and_cas?.accepted_expected_target) === canonicalJson(['ABSENT', 'EXACT_DIGEST']) && adapter?.snapshot_and_cas?.unexpected_target_digest === 'QUARANTINE' && adapter?.snapshot_and_cas?.unexpected_target_overwrite_allowed === false && adapter?.snapshot_and_cas?.matching_mutation === 'IDEMPOTENT_REUSE', 'DiscordOS CAS overwrite boundary drift');
  fail(failures, adapter?.deletion_and_rollback?.explicit_tombstones_required === true && adapter?.deletion_and_rollback?.implicit_cascade_authority === false && canonicalJson(adapter?.deletion_and_rollback?.reappearing_key_requires) === canonicalJson(['EXPLICIT_RESURRECTION', 'NEW_GENERATION']) && adapter?.deletion_and_rollback?.held_relation_delete_action === 'PRESERVE_AND_QUARANTINE' && adapter?.deletion_and_rollback?.rollback_order === 'REVERSE_DEPENDENCY_ORDER' && adapter?.deletion_and_rollback?.append_only_mutation_journal_required === true && adapter?.deletion_and_rollback?.reverse_catch_up_to_source === 'SEPARATE_EXPLICIT_AUTHORITY', 'DiscordOS tombstone, resurrection, or rollback boundary drift');
  const forbiddenReceiptClasses = ['raw_rows', 'primary_keys', 'names', 'emails', 'usernames', 'user_numbers_or_ranges', 'uuids_or_ranges', 'secrets', 'project_refs', 'sql', 'payloads', 'provider_responses', 'machine_paths'];
  fail(failures, canonicalJson(adapter?.public_receipt_policy?.forbidden_classes) === canonicalJson(forbiddenReceiptClasses) && adapter?.canonicalization?.raw_values_in_public_receipts === false, 'DiscordOS public receipt redaction drift');
  const expectedDependencyGates = {
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
  fail(failures, canonicalJson(adapter?.dependency_gates) === canonicalJson(expectedDependencyGates), 'DiscordOS dependency gate promotion or status-vocabulary drift');
  fail(failures, canonicalJson(adapterGate.required_order) === canonicalJson(['mazer', 'fitness', 'discordos']) && canonicalJson(adapterGate.source_ready) === canonicalJson(['mazer', 'fitness', 'discordos']) && canonicalJson(adapterGate.blocked) === canonicalJson([]), 'DiscordOS app data adapter readiness gate drift');
  fail(failures, adapterGate.discordos_contract_path === 'contracts/v1/transport/discordos-app-data-adapter-contract.json' && adapterGate.discordos_relation_count === 10 && adapterGate.all_adapters_ready === true && adapterGate.execution_lifecycle === 'EXECUTION_BLOCKED' && adapterGate.apply_admitted === false, 'DiscordOS app data adapter execution gate drift');
  fail(failures, source.accepted_package_migration_count === 122 && source.accepted_package_sha256 === '80482b9bbfaf70b5980dd290b78def12d0af898cc10ee12f402b46d378fdbf83' && source.accepted_package_migration_count === acceptedPackage.migration_count && source.accepted_package_sha256 === acceptedPackage.deterministic_package_sha256 && acceptedPackage.source_counts?.discordos === 17 && acceptedPackage.apply_admitted === false, 'DiscordOS accepted package binding drift');
  return failures.sort((left, right) => left.localeCompare(right));
}

function verifySourceManifest(config, manifest, failures) {
  fail(failures, manifest.apply_admitted === false, 'source manifest must set apply_admitted=false');
  fail(failures, manifest.migrations.length === exactExpected.migrations, 'source migration denominator must be 122');
  fail(failures, manifest.evidence_artifact.artifact_sha256 === config.evidence.artifact_sha256, 'evidence artifact digest drift');
  fail(failures, manifest.evidence_artifact.accepted_combined_manifest_sha256 === config.evidence.accepted_combined_manifest_sha256, 'accepted combined manifest digest drift');
  const sourceByApp = new Map(config.sources.map((source) => [source.app, source]));
  const sourceRowsByApp = Object.fromEntries(config.sources.map((source) => [source.app, []]));
  const seen = new Set();
  for (const migration of manifest.migrations) {
    const source = sourceByApp.get(migration.app);
    fail(failures, Boolean(source), `${migration.copied_path}: undeclared source app`);
    if (!source) continue;
    fail(failures, migration.commit === source.commit, `${migration.copied_path}: source commit drift`);
    fail(failures, migration.tree === source.tree, `${migration.copied_path}: source tree drift`);
    fail(failures, migration.path === `supabase/migrations/${path.posix.basename(migration.copied_path)}`, `${migration.copied_path}: source path mismatch`);
    fail(failures, migration.copied_path === `bootstrap/sources/${source.app}/${migration.path}`, `${migration.copied_path}: copied source boundary mismatch`);
    const absolutePath = path.join(root, ...migration.copied_path.split('/'));
    const bytes = fs.readFileSync(absolutePath);
    fail(failures, bytes.length === migration.byte_count, `${migration.copied_path}: byte count drift`);
    fail(failures, sha256(bytes) === migration.raw_sha256, `${migration.copied_path}: raw digest drift`);
    fail(failures, gitBlobSha1(bytes) === migration.blob, `${migration.copied_path}: Git blob drift`);
    fail(failures, !bytes.includes(13), `${migration.copied_path}: CR byte detected`);
    sourceRowsByApp[source.app].push({
      order: migration.order,
      path: migration.path,
      blob: gitBlobSha1(bytes),
      raw_sha256: sha256(bytes),
      byte_count: bytes.length
    });
    seen.add(migration.copied_path);
  }
  for (const source of config.sources) {
    const migrations = manifest.migrations.filter((migration) => migration.app === source.app);
    fail(failures, migrations.length === source.migration_count, `${source.app}: migration count drift`);
    fail(failures, migrations.every((migration, index) => migration.order === index + 1), `${source.app}: source order drift`);
    fail(failures, manifest.accepted_source_chain_sha256[source.app] === source.chain_manifest_sha256, `${source.app}: accepted chain digest drift`);
  }
  fail(failures, seen.size === exactExpected.migrations, 'source copied-path denominator is not unique');
  const packageRecords = manifest.migrations;
  fail(failures, sha256(canonicalJson(packageRecords)) === manifest.package_manifest_sha256, 'package manifest digest mismatch');
  try {
    verifyFrozenSourceAcceptance({
      sourceRowsByApp,
      sourceIdentities: config.sources,
      acceptedChains: manifest.accepted_source_chain_sha256,
      configuredCombinedSha256: config.evidence.accepted_combined_manifest_sha256,
      acceptedCombinedSha256: manifest.evidence_artifact.accepted_combined_manifest_sha256
    });
  } catch (error) {
    failures.push(error.message);
  }
}

function verifyObjects(objects, config, failures) {
  fail(failures, objects.apply_admitted === false, 'source objects must set apply_admitted=false');
  for (const key of ['tables', 'functions', 'policies', 'triggers', 'index_identities', 'extension_dependencies']) {
    fail(failures, objects[key].length === exactExpected[key], `${key}: expected ${exactExpected[key]}, found ${objects[key].length}`);
    for (const unit of objects[key]) {
      for (const field of ['source_app', 'source_commit', 'source_path', 'source_blob', 'source_raw_sha256', 'statement_ordinal', 'transformation_id']) {
        fail(failures, unit[field] !== undefined && unit[field] !== null, `${key}/${unit.identity}: missing ${field}`);
      }
    }
  }
  fail(failures, objects.policies.filter((policy) => policy.source_app === 'fitness').length === exactExpected.fitness_policies, 'Fitness policy denominator must be 63');
  fail(failures, objects.policies.filter((policy) => policy.source_app === 'mazer').length === 11, 'Mazer policy denominator must be 11');
  fail(failures, objects.constraint_units.expected_count === exactExpected.constraint_units, 'constraint denominator must be 281');
  fail(failures, objects.constraint_units.accepted_named_catalog_count === 158, 'named constraint denominator must be 158');
  fail(failures, objects.constraint_units.accepted_unnamed_catalog_count === 123, 'unnamed constraint denominator must be 123');
  fail(failures, objects.constraint_units.accepted_unnamed_source_units.length === 123, 'unnamed source-unit provenance denominator must be 123');
  fail(failures, objects.constraint_units.status === 'BLOCKED', 'constraint replay readback must remain BLOCKED');
  fail(failures, config.expected.constraint_units === objects.constraint_units.expected_count, 'config constraint denominator drift');
  const extensions = objects.extension_dependencies.map((unit) => unit.identity).sort();
  fail(failures, canonicalJson(extensions) === canonicalJson(['pg_cron', 'pg_net', 'pgcrypto']), 'extension dependency identities drift');
}

function verifyHeldUnits(config, dynamic, dataEffects, dispositions, sourceManifest, failures) {
  fail(failures, dynamic.apply_admitted === false && dynamic.status === 'BLOCKED', 'dynamic units must remain fail-closed');
  fail(failures, dynamic.unresolved_count === exactExpected.dynamic_templates && dynamic.units.length === exactExpected.dynamic_templates, 'dynamic template denominator must be 11');
  fail(failures, dynamic.resolved_fitness_deny_policy_count === 10, 'resolved Fitness deny policy expansion must be 10');
  fail(failures, dynamic.units.every((unit) => unit.status === 'BLOCKED'), 'every dynamic template must remain BLOCKED');
  fail(failures, dataEffects.apply_admitted === false && dataEffects.status === 'BLOCKED', 'data effects must remain fail-closed');
  fail(failures, dataEffects.held_count === exactExpected.held_data_effects && dataEffects.effects.length === exactExpected.held_data_effects, 'held data-effect denominator must be 358');
  const effectCounts = dataEffects.effects.reduce((result, effect) => {
    const key = `${effect.source_app}:${effect.operation}`;
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
  fail(failures, effectCounts['discordos:UPDATE'] === 1, 'DiscordOS held data effects must be one UPDATE');
  fail(failures, effectCounts['fitness:UPDATE'] === 351 && effectCounts['fitness:INSERT'] === 5 && effectCounts['fitness:DELETE'] === 1, 'Fitness held data-effect operation counts drift');
  fail(failures, dispositions.apply_admitted === false && dispositions.status === 'REQUIRED', 'dispositions must remain inert and REQUIRED');
  fail(failures, dispositions.scheduler === 'blocked_activation', 'scheduler activation must remain blocked');
  fail(failures, dispositions.fitness_number_transform === 'blocked_unmerged_dependency_and_replay', 'Fitness number transformation must remain blocked');
  fail(failures, config.blocked_dependencies.length === 2 && config.blocked_dependencies.every((dependency) => dependency.decision === 'BLOCKED'), 'blocked Fitness dependency drift');

  const dispositionCounts = dispositions.derived_counts;
  fail(failures, dispositionCounts.source_statement_count === dispositionCounts.executable_statement_count + dispositionCounts.held_statement_count, 'source statement disposition counts do not close');
  fail(failures, dispositionCounts.held_statement_count === dispositions.held_statements.length, 'held statement count drift');
  fail(failures, dispositionCounts.held_function_definition_statement_count === dispositions.held_functions.length, 'held function definition statement count drift');
  const heldFunctionIdentities = new Set(dispositions.held_functions.map((unit) => `${unit.source_app}:${unit.source_identity}`));
  fail(failures, dispositionCounts.held_function_identity_count === heldFunctionIdentities.size, 'held function identity count drift');
  fail(failures, dispositionCounts.held_dependency_statement_count === dispositions.held_statements.filter((unit) => unit.blocker_class === 'held_function_dependency').length, 'held dependency statement count drift');
  const publicRpcDefinitions = dispositions.held_statements.filter((unit) => unit.defined_function?.source_identity.match(/^public\.discordos_[a-z0-9_$]+$/));
  fail(failures, publicRpcDefinitions.length >= 12, 'all DiscordOS public RPC definitions must be held');
  fail(failures, dispositionCounts.held_discordos_public_rpc_definition_count === publicRpcDefinitions.length, 'DiscordOS public RPC definition count drift');
  fail(failures, dispositionCounts.held_discordos_public_rpc_control_plane_definition_count === publicRpcDefinitions.filter((unit) => unit.blocker_class === 'discordos_public_rpc_control_plane').length, 'DiscordOS public RPC boundary count drift');
  fail(failures, dispositions.held_statements.filter((unit) => unit.blocker_class === 'held_function_dependency').every((unit) => unit.referenced_held_functions.length > 0), 'held dependency evidence must identify its absent function');

  const migrations = new Map(sourceManifest.migrations.map((migration) => [`${migration.app}:${migration.path}`, migration]));
  const statementCache = new Map();
  const seen = new Set();
  for (const unit of dispositions.held_statements) {
    const identity = `${unit.source_app}:${unit.source_path}:${unit.statement_ordinal}`;
    fail(failures, !seen.has(identity), `${identity}: duplicate held disposition`);
    seen.add(identity);
    const migration = migrations.get(`${unit.source_app}:${unit.source_path}`);
    fail(failures, Boolean(migration), `${identity}: held source migration missing`);
    if (!migration) continue;
    const cacheKey = migration.copied_path;
    if (!statementCache.has(cacheKey)) {
      statementCache.set(cacheKey, splitSqlStatements(fs.readFileSync(path.join(root, ...cacheKey.split('/')), 'utf8')));
    }
    const statement = statementCache.get(cacheKey)[unit.statement_ordinal - 1];
    fail(failures, Boolean(statement), `${identity}: held source statement missing`);
    if (!statement) continue;
    fail(failures, sha256(Buffer.from(statement, 'utf8')) === unit.statement_sha256, `${identity}: held statement digest drift`);
    fail(failures, Buffer.byteLength(statement, 'utf8') === unit.statement_byte_count, `${identity}: held statement byte count drift`);
    fail(failures, unit.source_commit === migration.commit && unit.source_blob === migration.blob && unit.source_raw_sha256 === migration.raw_sha256, `${identity}: held provenance drift`);
    const fallbackSchema = unit.source_app === 'discordos' ? 'discordos' : 'public';
    const definition = parseFunctionDefinition(statement, fallbackSchema);
    fail(failures, (definition?.identity ?? null) === (unit.defined_function?.source_identity ?? null), `${identity}: held function identity drift`);
  }
}

export function verifySchemaCreationOrder(files) {
  const failures = [];
  const created = new Set(['public', 'auth', 'storage', 'extensions', 'realtime']);
  for (const [filename, text] of files) {
    for (const statement of splitSqlStatements(text)) {
      const clean = statement.replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/, '').trim();
      const create = /^create\s+schema\s+(?:if\s+not\s+exists\s+)?("?[A-Za-z_][A-Za-z0-9_$]*"?)/i.exec(clean);
      if (create) created.add(create[1].replaceAll('"', '').toLowerCase());
      for (const schema of ['mazer', 'fitness']) {
        if (new RegExp(`\\b${schema}\\s*\\.`, 'i').test(clean) && !created.has(schema)) {
          failures.push(`${filename}: ${schema} schema is referenced before creation`);
        }
      }
    }
  }
  return failures.sort();
}

function applyPrivilegeAction(roles, action, targets) {
  for (const role of targets) {
    if (action === 'grant') roles.add(role);
    else roles.delete(role);
  }
}

function functionSchema(signature) {
  return signature.slice(0, signature.indexOf('.'));
}

function fallbackSchemaForFile(filename) {
  if (filename.includes('_fitness_')) return 'fitness';
  if (filename.includes('_mazer_')) return 'mazer';
  if (filename.includes('_discordos_')) return 'discordos';
  return 'public';
}

export function verifyGeneratedFunctionPrivileges(files, contract = generatedFunctionPrivilegeContractV1) {
  const failures = [];
  const admittedSchemas = new Set(contract.admitted_schemas);
  const governedRoles = new Set(contract.governed_roles);
  const creatorRoles = new Set(contract.default_privilege_creator_roles ?? []);
  const defaultRoles = new Map(contract.admitted_schemas.map((schema) => [schema, new Set(['public'])]));
  const functions = new Map();
  for (const [filename, text] of files) {
    const fallbackSchema = fallbackSchemaForFile(filename);
    for (const statement of splitSqlStatements(text)) {
      let definition = null;
      try {
        definition = parseFunctionDefinition(statement, fallbackSchema);
      } catch (error) {
        failures.push(`${filename}: malformed or ambiguous function definition (${error.message})`);
      }
      if (definition) {
        const schema = functionSchema(definition.signature);
        if (!admittedSchemas.has(schema)) failures.push(`${filename}: function schema is outside the admitted denominator: ${definition.signature}`);
        const existing = functions.get(definition.signature);
        if (existing && !definition.or_replace) failures.push(`${filename}: duplicate CREATE FUNCTION for ${definition.signature}`);
        if (existing) {
          existing.definition_count += 1;
          existing.definition_files.add(filename);
        } else {
          functions.set(definition.signature, {
            definition_count: 1,
            definition_files: new Set([filename]),
            effective_roles: new Set(defaultRoles.get(schema) ?? ['public'])
          });
        }
      }

      const privilege = parseFunctionPrivilegeEffect(statement, fallbackSchema);
      if (!privilege) continue;
      if (privilege.malformed) {
        failures.push(`${filename}: malformed or unsupported function privilege statement (${privilege.reason ?? 'unknown'})`);
        continue;
      }
      const unknownRoles = privilege.roles.filter((role) => !governedRoles.has(role));
      if (unknownRoles.length > 0) {
        failures.push(`${filename}: function privilege contains undeclared roles: ${unknownRoles.join(', ')}`);
        continue;
      }
      if (privilege.creator_role && !creatorRoles.has(privilege.creator_role)) {
        failures.push(`${filename}: function default privilege contains undeclared creator role: ${privilege.creator_role}`);
        continue;
      }
      if (privilege.scope === 'function') {
        const state = functions.get(privilege.signature);
        if (!state) {
          failures.push(`${filename}: function privilege target is absent or appears before creation: ${privilege.signature}`);
          continue;
        }
        applyPrivilegeAction(state.effective_roles, privilege.action, privilege.roles);
        continue;
      }

      const schemas = privilege.schemas ?? contract.admitted_schemas;
      const unknownSchemas = schemas.filter((schema) => !admittedSchemas.has(schema));
      if (unknownSchemas.length > 0) {
        failures.push(`${filename}: function privilege contains undeclared schemas: ${unknownSchemas.join(', ')}`);
        continue;
      }
      if (privilege.scope === 'schema_all') {
        for (const [signature, state] of functions) {
          if (schemas.includes(functionSchema(signature))) applyPrivilegeAction(state.effective_roles, privilege.action, privilege.roles);
        }
      } else if (privilege.scope === 'schema_default') {
        // Creator-specific defaults are verified independently against the closed 36-unit contract.
        // Exact per-function revokes remain authoritative because PostgreSQL per-schema defaults
        // cannot subtract a privilege granted by a global creator default.
        if (!privilege.creator_role) {
          for (const schema of schemas) applyPrivilegeAction(defaultRoles.get(schema), privilege.action, privilege.roles);
        }
      } else {
        failures.push(`${filename}: unknown function privilege scope`);
      }
    }
  }

  const actualSignatures = [...functions.keys()].sort();
  const expected = Object.keys(contract.functions).sort();
  fail(failures, canonicalJson(actualSignatures) === canonicalJson(expected), 'generated function signature denominator drift');
  for (const signature of expected) {
    const state = functions.get(signature);
    if (!state) continue;
    const expectedState = contract.functions[signature];
    fail(failures, state.definition_count === expectedState.definition_count, `${signature}: definition count drift`);
    fail(failures, canonicalJson([...state.definition_files].sort()) === canonicalJson([expectedState.source_file]), `${signature}: definition file drift`);
    const actualRoles = [...state.effective_roles].filter((role) => governedRoles.has(role)).sort();
    fail(failures, canonicalJson(actualRoles) === canonicalJson([...expectedState.allowed_execute_roles].sort()), `${signature}: effective EXECUTE role settlement drift`);
  }
  return failures.sort();
}

export function verifyEffectiveFunctionAcls(filename, text, expectedSignatures = [], expectedDefinitionCounts = {}, options = {}) {
  const functions = Object.fromEntries(expectedSignatures.map((signature) => [signature, Object.freeze({
    source_file: filename,
    definition_count: expectedDefinitionCounts[signature] ?? 1,
    allowed_execute_roles: Object.freeze([...(options.allowed_execute_roles?.[signature] ?? [])].sort())
  })]));
  const admittedSchemas = options.admitted_schemas ?? [...new Set([
    fallbackSchemaForFile(filename),
    ...expectedSignatures.map(functionSchema)
  ])].sort();
  return verifyGeneratedFunctionPrivileges([[filename, text]], {
    version: 'test-v1',
    admitted_schemas: admittedSchemas,
    governed_roles: options.governed_roles ?? exactGeneratedFunctionRoles,
    functions
  });
}

export function verifyGeneratedFitnessFunctionSearchPaths(filename, text, contract = generatedFitnessFunctionSearchPathContractV1) {
  const failures = [];
  fail(failures, filename === contract.source_file, `${filename}: Fitness function search_path file binding drift`);
  fail(
    failures,
    canonicalJson(contract.effective_search_path) === canonicalJson(['fitness', 'pg_temp']),
    `${filename}: Fitness function search_path contract value drift`
  );
  failures.push(...verifyFitnessFunctionSearchPaths(splitSqlStatements(text), contract.functions)
    .map((message) => `${filename}: ${message}`));
  return failures.sort();
}

export function inspectInertSql(filename, text, heldFunctionTargets = [], expectedFunctionSignatures = [], expectedFunctionDefinitionCounts = {}) {
  const failures = [];
  fail(failures, text.startsWith('-- APPLY_ADMITTED=false\n'), `${filename}: missing inert marker`);
  fail(failures, !text.includes('\r'), `${filename}: CR byte detected`);
  fail(failures, !/\bcreate\s+(?:or\s+replace\s+)?(?:table|schema|function|trigger|policy|index|sequence|type|view)\s+(?:if\s+not\s+exists\s+)?(?:auth|storage|extensions|realtime)\s*\./i.test(text), `${filename}: provider-managed object recreation detected`);
  fail(failures, !/\bcreate\s+(?:or\s+replace\s+)?(?:table|materialized\s+view|view|function|sequence|type)\s+(?:if\s+not\s+exists\s+)?public\s*\./i.test(text), `${filename}: public application object creation detected`);
  fail(failures, !/\bcreate\s+extension\b/i.test(text), `${filename}: extension activation detected`);
  fail(failures, !/\bcron\.schedule\s*\(|\bnet\.http_(?:get|post|delete)\s*\(/i.test(text), `${filename}: Cron or network effect detected`);
  fail(failures, !/https?:\/\//i.test(text), `${filename}: network hook detected`);
  fail(failures, !/\b(?:supabase\s+(?:link|login|db\s+push|migration\s+up|reset)|npm\s+(?:install|publish)|vercel\s+(?:deploy|link|env))\b/i.test(text), `${filename}: executable provider/runtime command detected`);
  fail(failures, !/\bgrant\s+[^;]*\bon\s+schema\s+(?:platform_private|discordos_private)\s+to\s+(?:PUBLIC|anon|authenticated)\b/i.test(text), `${filename}: private schema exposure detected`);
  failures.push(...verifyEffectiveFunctionAcls(filename, text, expectedFunctionSignatures, expectedFunctionDefinitionCounts));
  for (const statement of splitSqlStatements(text)) {
    const classification = classifyStatement(statement);
    const fallbackSchema = filename.includes('_fitness_') ? 'fitness' : filename.includes('_mazer_') ? 'mazer' : filename.includes('_discordos_') ? 'discordos' : 'public';
    const definition = parseFunctionDefinition(statement, fallbackSchema);
    const dependency = analyzeFunctionDependencyStatement(statement, fallbackSchema);
    fail(failures, !classification.dataEffect, `${filename}: top-level data effect entered generated output`);
    fail(failures, !classification.cronActivation && !classification.networkEffect, `${filename}: runtime effect entered generated output`);
    fail(failures, !definition?.identity.match(/^public\.discordos_[a-z0-9_$]+$/), `${filename}: public DiscordOS RPC definition entered generated output`);
    fail(failures, !dependency.malformed, `${filename}: malformed or unknown function dependency entered generated output`);
    const heldReferences = findHeldFunctionReferences(statement, heldFunctionTargets, fallbackSchema);
    fail(failures, heldReferences.length === 0, `${filename}: statement references held function ${heldReferences.join(', ')}`);
  }
  return failures.sort();
}

export function verifyCreatorDefaultAcls(
  files,
  contract = creatorDefaultAclContractV1,
  targetPostgresql = targetPostgresqlContractV1,
  manifestContract = contract,
  manifestPostgresql = targetPostgresql
) {
  const failures = [];
  fail(failures, canonicalJson(contract) === canonicalJson(creatorDefaultAclContractV1), 'creator default ACL config contract drift');
  const { units: manifestUnits = [], ...manifestBase } = manifestContract ?? {};
  fail(failures, canonicalJson(manifestBase) === canonicalJson(creatorDefaultAclContractV1), 'creator default ACL manifest contract drift');
  fail(failures, canonicalJson(targetPostgresql) === canonicalJson(targetPostgresqlContractV1), 'target PostgreSQL config contract drift');
  fail(failures, canonicalJson(manifestPostgresql) === canonicalJson(targetPostgresqlContractV1), 'target PostgreSQL manifest contract drift');

  const expectedDispositions = [];
  for (const creatorRole of exactCreatorDefaultAclRoles) {
    for (const schema of exactCreatorDefaultAclSchemas) {
      for (const [objectClass, privileges] of Object.entries(exactCreatorDefaultAclObjectClasses)) {
        const executable = creatorRole === 'postgres' && objectClass !== 'FUNCTIONS';
        const signatureAssertion = creatorRole === 'postgres' && objectClass === 'FUNCTIONS';
        expectedDispositions.push({
          creator_role: creatorRole,
          schema,
          object_class: objectClass,
          privileges: [...privileges],
          grantees: [...exactCreatorDefaultAclGrantees],
          status: creatorRole === 'postgres' ? 'REQUIRED' : 'BLOCKED',
          execution_disposition: executable
            ? 'EXECUTABLE_INERT_SOURCE'
            : signatureAssertion ? 'ASSERT_SIGNATURE_SPECIFIC_REVOKE' : 'NOT_EXECUTABLE',
          ...(creatorRole === 'supabase_admin' ? { blocker_class: 'BLOCKED_PROVIDER_ROLE' } : {}),
          effect_sha256: sha256(canonicalJson({
            creator_role: creatorRole,
            schema,
            object_class: objectClass,
            privileges,
            grantees: exactCreatorDefaultAclGrantees
          }))
        });
      }
    }
  }
  fail(failures, canonicalJson(manifestUnits) === canonicalJson(expectedDispositions), 'creator default ACL 36-unit disposition matrix drift');
  fail(failures, manifestUnits.filter((unit) => unit.status === 'BLOCKED' && unit.execution_disposition === 'NOT_EXECUTABLE').length === 18, 'supabase_admin held default ACL denominator must be 18');
  fail(failures, manifestUnits.filter((unit) => unit.execution_disposition === 'ASSERT_SIGNATURE_SPECIFIC_REVOKE').length === 6, 'postgres signature-specific function ACL assertion denominator must be 6');

  const actual = [];
  const createdSchemas = new Set(['public', 'auth', 'storage', 'extensions', 'realtime']);
  let ordinal = 0;
  let firstGovernedObjectOrdinal = Number.POSITIVE_INFINITY;
  for (const [filename, text] of files) {
    for (const statement of splitSqlStatements(text)) {
      ordinal += 1;
      const clean = statement.replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/, '').trim();
      const schemaCreate = /^create\s+schema\s+(?:if\s+not\s+exists\s+)?("?[A-Za-z_][A-Za-z0-9_$]*"?)/i.exec(clean);
      if (schemaCreate) createdSchemas.add(schemaCreate[1].replaceAll('"', '').toLowerCase());
      if (/^create\s+(?:or\s+replace\s+)?(?:table|sequence|function)\b/i.test(clean)) {
        firstGovernedObjectOrdinal = Math.min(firstGovernedObjectOrdinal, ordinal);
      }
      if (!/^alter\s+default\s+privileges\b/i.test(clean)) continue;
      const unit = parseCreatorDefaultAclStatement(statement);
      if (!unit || unit.malformed) {
        failures.push(`${filename}: malformed or unsupported creator default ACL (${unit?.reason ?? 'unknown'})`);
        continue;
      }
      if (unit.creator_role === 'supabase_admin') {
        failures.push(`${filename}: blocked supabase_admin creator default ACL entered executable SQL`);
      }
      if (!createdSchemas.has(unit.schema)) {
        failures.push(`${filename}: creator default ACL schema prerequisite is absent: ${unit.schema}`);
      }
      if (ordinal >= firstGovernedObjectOrdinal) {
        failures.push(`${filename}: creator default ACL appears after governed object creation`);
      }
      actual.push({
        creator_role: unit.creator_role,
        schema: unit.schema,
        object_class: unit.object_class,
        privileges: unit.privileges,
        grantees: unit.grantees
      });
    }
  }

  const identities = actual.map((unit) => `${unit.creator_role}:${unit.schema}:${unit.object_class}`);
  const expectedExecutable = expectedDispositions
    .filter((unit) => unit.execution_disposition === 'EXECUTABLE_INERT_SOURCE')
    .map(({ status, execution_disposition, effect_sha256, ...unit }) => ({
      ...unit,
      grantees: unit.grantees.map((role) => role.toLowerCase())
    }));
  fail(failures, actual.length === creatorDefaultAclContractV1.executable_unit_count, `executable creator default ACL unit count must be 12, found ${actual.length}`);
  fail(failures, new Set(identities).size === identities.length, 'creator default ACL unit identity denominator contains a duplicate');
  fail(failures, canonicalJson(actual) === canonicalJson(expectedExecutable), 'executable postgres creator default ACL matrix drift');
  return failures.sort();
}

export function verifyApplicationCreatorBoundary(files, contract = applicationCreatorBoundaryV1, manifestContract = contract) {
  const failures = [];
  fail(failures, canonicalJson(contract) === canonicalJson(applicationCreatorBoundaryV1), 'application creator config contract drift');
  fail(failures, canonicalJson(manifestContract) === canonicalJson(applicationCreatorBoundaryV1), 'application creator manifest contract drift');
  const schemas = new Set(exactCreatorDefaultAclSchemas);
  const schemaOwnerAssertions = new Map(exactCreatorDefaultAclSchemas.map((schema) => [schema, 0]));
  const schemaCreateRevokes = new Map(exactCreatorDefaultAclSchemas.map((schema) => [schema, 0]));
  const authorizedSchemaCreates = new Map(exactCreatorDefaultAclSchemas.map((schema) => [schema, 0]));

  let currentRole = null;
  let setRoleCount = 0;
  let currentUserGuardCount = 0;
  for (const [filename, text] of files) {
    for (const statement of splitSqlStatements(text)) {
      const clean = statement.replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/, '').trim();
      const setRole = /^set\s+(?:local\s+)?role\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)\s*;?$/i.exec(clean);
      if (/^(?:set\s+(?:local\s+)?role\b|reset\s+role\b|set\s+session\s+authorization\b|reset\s+session\s+authorization\b)/i.test(clean) && !setRole) {
        failures.push(`${filename}: unsupported execution-role control statement`);
        currentRole = null;
      }
      if (setRole) {
        setRoleCount += 1;
        currentRole = setRole[1].replaceAll('"', '').toLowerCase();
        if (currentRole !== 'postgres') failures.push(`${filename}: generated execution role drift: ${currentRole}`);
      }
      if (/^do\s+\$current_user_guard\$[\s\S]*\bcurrent_user\s*<>\s*'postgres'[\s\S]*\$current_user_guard\$\s*;?$/i.test(clean)) {
        currentUserGuardCount += 1;
        if (currentRole !== 'postgres') failures.push(`${filename}: current_user guard is not preceded by SET ROLE postgres`);
      }

      const schemaCreate = /^create\s+schema\s+(?:if\s+not\s+exists\s+)?("?[A-Za-z_][A-Za-z0-9_$]*"?)\s+authorization\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)\s*;?$/i.exec(clean);
      if (schemaCreate) {
        const schema = schemaCreate[1].replaceAll('"', '').toLowerCase();
        const owner = schemaCreate[2].replaceAll('"', '').toLowerCase();
        if (schemas.has(schema)) {
          if (owner !== 'postgres') failures.push(`${filename}: application schema authorization owner drift: ${schema} -> ${owner}`);
          authorizedSchemaCreates.set(schema, authorizedSchemaCreates.get(schema) + 1);
        }
      }

      const ownerChange = /^alter\s+schema\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)\s+owner\s+to\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)\s*;?$/i.exec(clean);
      if (ownerChange) {
        const schema = ownerChange[1].replaceAll('"', '').toLowerCase();
        const owner = ownerChange[2].replaceAll('"', '').toLowerCase();
        if (schemas.has(schema)) {
          if (owner !== 'postgres') failures.push(`${filename}: application schema owner drift: ${schema} -> ${owner}`);
          schemaOwnerAssertions.set(schema, schemaOwnerAssertions.get(schema) + 1);
        }
      }

      const createRevoke = /^revoke\s+create\s+on\s+schema\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)\s+from\s+supabase_admin\s*;?$/i.exec(clean);
      if (createRevoke) {
        const schema = createRevoke[1].replaceAll('"', '').toLowerCase();
        if (schemas.has(schema)) schemaCreateRevokes.set(schema, schemaCreateRevokes.get(schema) + 1);
      }
      if (/^grant\s+[^;]*\bcreate\b[^;]*\bon\s+schema\s+[^;]*\bto\s+[^;]*\bsupabase_admin\b/i.test(clean)) {
        failures.push(`${filename}: supabase_admin CREATE entered generated SQL`);
      }

      const governedCreate = /^create\s+(?:or\s+replace\s+)?(?:table|sequence|function)\s+(?:if\s+not\s+exists\s+)?("?[A-Za-z_][A-Za-z0-9_$]*"?)\s*\./i.exec(clean);
      if (governedCreate && schemas.has(governedCreate[1].replaceAll('"', '').toLowerCase())) {
        if (currentRole !== 'postgres') failures.push(`${filename}: governed application object is not created under postgres role`);
        if (currentUserGuardCount !== 1) failures.push(`${filename}: governed application object precedes the exact current_user guard`);
      }
      const objectOwner = /^alter\s+(?:table|sequence|function)\b[\s\S]*\bowner\s+to\s+("?[A-Za-z_][A-Za-z0-9_$]*"?)\s*;?$/i.exec(clean);
      if (objectOwner && objectOwner[1].replaceAll('"', '').toLowerCase() !== 'postgres') {
        failures.push(`${filename}: application object owner drift: ${objectOwner[1]}`);
      }
    }
  }

  for (const schema of exactCreatorDefaultAclSchemas) {
    fail(failures, authorizedSchemaCreates.get(schema) >= 1, `${schema}: missing postgres schema authorization`);
    fail(failures, schemaOwnerAssertions.get(schema) === 1, `${schema}: postgres schema owner assertion count drift`);
    fail(failures, schemaCreateRevokes.get(schema) === 1, `${schema}: supabase_admin CREATE revocation count drift`);
  }
  fail(failures, setRoleCount === 1, `SET ROLE postgres assertion count must be 1, found ${setRoleCount}`);
  fail(failures, currentUserGuardCount === 1, `current_user assertion count must be 1, found ${currentUserGuardCount}`);
  return failures.sort();
}

export function verifyHeldControlPlaneContracts(config, namespacePlan) {
  const failures = [];
  fail(failures, canonicalJson(config.public_object_boundary) === canonicalJson(publicObjectBoundaryV1), 'public object boundary config drift');
  fail(failures, canonicalJson(namespacePlan.public_object_boundary) === canonicalJson(publicObjectBoundaryV1), 'public object boundary manifest drift');
  fail(failures, canonicalJson(config.data_api_gate) === canonicalJson(dataApiGateV1), 'Data API gate config drift');
  fail(failures, canonicalJson(namespacePlan.data_api_gate) === canonicalJson(dataApiGateV1), 'Data API gate manifest drift');
  fail(failures, canonicalJson(config.schemas.application) === canonicalJson(exactCreatorDefaultAclSchemas), 'application schema vocabulary drift');
  fail(failures, !config.schemas.application.includes('public'), 'public must not be an application schema');
  const dataApiGate = config.data_api_gate ?? {};
  const observedPreimage = dataApiGate.observed_current_preimage ?? {};
  const actionTimeBinding = observedPreimage.action_time_expected_state_binding ?? {};
  const desiredPostimage = dataApiGate.desired_containment_postimage ?? {};
  const attemptedExecution = dataApiGate.attempted_execution ?? {};
  const retryAuthority = dataApiGate.retry_authority ?? {};
  const bootstrapAdmission = dataApiGate.bootstrap_admission ?? {};
  const activationGates = dataApiGate.future_activation_gates ?? {};
  const negativeProbes = activationGates.negative_probes ?? {};
  fail(failures, dataApiGate.version === '1.1.0', 'Data API evidence gate version drift');
  fail(failures, actionTimeBinding.status === 'REQUIRED', 'action-time target binding must remain REQUIRED');
  fail(failures, actionTimeBinding.identity_binding === 'ACTION_TIME_ONLY', 'target identity must remain action-time only');
  fail(failures, actionTimeBinding.source_artifact_contains_identity === false, 'portable source must not contain a target identity');
  fail(failures, actionTimeBinding.fresh_project_identity_readback === 'REQUIRED', 'fresh project identity readback must remain required');
  fail(failures, actionTimeBinding.fresh_preimage_readback === 'REQUIRED', 'fresh target preimage readback must remain required');
  fail(failures, actionTimeBinding.expected_state_guard === 'REQUIRED', 'expected-state guard must remain required');
  fail(failures, actionTimeBinding.owner_authority === 'REQUIRED', 'bounded owner authority must remain required');
  fail(failures, observedPreimage.data_api_state === 'ENABLED', 'observed Data API preimage must remain ENABLED');
  fail(failures, canonicalJson(observedPreimage.exposed_schemas) === canonicalJson(['graphql_public', 'public']), 'observed exposed-schema order drift');
  fail(failures, canonicalJson(observedPreimage.extra_search_path) === canonicalJson(['public', 'extensions']), 'observed extra search path order drift');
  fail(failures, observedPreimage.views?.available === 'UNKNOWN' && observedPreimage.views?.exposed === 'UNKNOWN', 'view evidence must remain UNKNOWN');
  fail(failures, desiredPostimage.data_api_state === 'DISABLED', 'desired Data API containment must remain DISABLED');
  fail(failures, Array.isArray(desiredPostimage.exposed_schemas) && desiredPostimage.exposed_schemas.length === 0, 'desired exposed-schema set must remain empty');
  fail(failures, attemptedExecution.persisted_provider_mutations === 0, 'persisted provider mutation count must remain zero');
  fail(failures, retryAuthority.third_save_authorized === false, 'third Data API Save must remain unauthorized');
  fail(failures, bootstrapAdmission.setting_mutation_admitted === false, 'Data API setting mutation must remain blocked');
  fail(failures, bootstrapAdmission.bootstrap_apply_admitted === false, 'bootstrap apply must remain blocked');
  fail(failures, bootstrapAdmission.target_apply_admitted === false, 'target apply must remain blocked');
  fail(failures, Array.isArray(activationGates.maximum_exposed_schemas) && !activationGates.maximum_exposed_schemas.includes('public'), 'public entered the maximum exposed schema allowlist');
  fail(failures, Array.isArray(activationGates.never_exposed_schemas) && activationGates.never_exposed_schemas.includes('public'), 'public missing from never-exposed schemas');
  fail(failures, Array.isArray(activationGates.never_exposed_schemas) && activationGates.never_exposed_schemas.includes('graphql_public'), 'graphql_public missing from never-exposed schemas');
  fail(failures, Object.entries(negativeProbes).filter(([name]) => name !== 'required_outcome').every(([, status]) => status === 'UNKNOWN'), 'Data API negative probes must remain UNKNOWN until execution');
  return failures.sort();
}

export function verifyGeneratedArtifactPathBoundary(relativeSqlPaths, contract = generatedInertArtifactContractV1) {
  const failures = [];
  const normalized = relativeSqlPaths.map((relativePath) => relativePath.replaceAll('\\', '/'));
  const sorted = [...normalized].sort((left, right) => left.localeCompare(right));
  const expectedPaths = expectedGeneratedFiles.map((filename) => `${expectedGeneratedArtifactDirectory}/${filename}`);
  const inertArtifactPaths = sorted.filter((relativePath) => relativePath.startsWith(`${expectedGeneratedArtifactDirectory}/`));
  const expectedFilenameOccurrences = sorted.filter((relativePath) => expectedGeneratedFiles.includes(path.posix.basename(relativePath)));
  const standardMigrationPaths = sorted.filter((relativePath) => /^supabase\/migrations(?:\/|$)/.test(relativePath));

  fail(failures, contract.version === '1.0.0', 'generated inert artifact contract version drift');
  fail(failures, contract.directory === expectedGeneratedArtifactDirectory, 'generated inert artifact directory drift');
  fail(failures, canonicalJson(contract.filenames) === canonicalJson(expectedGeneratedFiles), 'generated inert artifact filename contract drift');
  fail(failures, new Set(normalized).size === normalized.length, 'generated inert artifact path denominator contains a duplicate');
  fail(failures, standardMigrationPaths.length === 0, `standard Supabase migration discovery must contain zero SQL files, found ${standardMigrationPaths.join(', ')}`);
  fail(failures, canonicalJson(inertArtifactPaths) === canonicalJson(expectedPaths), 'generated inert artifact path denominator drift');
  fail(failures, canonicalJson(expectedFilenameOccurrences) === canonicalJson(expectedPaths), 'generated inert artifact exists outside its admitted non-executable namespace');
  return failures.sort((left, right) => left.localeCompare(right));
}

function verifyGeneratedSql(config, namespacePlan, dispositions, failures) {
  const repositorySqlPaths = listWorkingTreeFiles(root).filter((relativePath) => relativePath.endsWith('.sql'));
  failures.push(...verifyGeneratedArtifactPathBoundary(repositorySqlPaths));
  const directory = path.join(root, ...expectedGeneratedArtifactDirectory.split('/'));
  const actualFiles = fs.readdirSync(directory).filter((name) => name.endsWith('.sql')).sort();
  fail(failures, canonicalJson(actualFiles) === canonicalJson(expectedGeneratedFiles), 'generated SQL path denominator drift');
  let resolvedDenyPolicyCount = 0;
  const orderedFiles = [];
  const heldFunctionTargets = [...new Set(dispositions.held_functions.map((unit) => unit.target_identity))].sort();
  for (const filename of actualFiles) {
    const text = fs.readFileSync(path.join(directory, filename), 'utf8');
    orderedFiles.push([filename, text]);
    const expectedFunctions = Object.entries(generatedFunctionPrivilegeContractV1.functions)
      .filter(([, contract]) => contract.source_file === filename);
    failures.push(...inspectInertSql(
      filename,
      text,
      heldFunctionTargets,
      expectedFunctions.map(([signature]) => signature),
      Object.fromEntries(expectedFunctions.map(([signature, contract]) => [signature, contract.definition_count]))
    ));
    if (filename === generatedFitnessFunctionSearchPathContractV1.source_file) {
      failures.push(...verifyGeneratedFitnessFunctionSearchPaths(filename, text));
    }
    fail(failures, !text.includes(config.fitness_provenance.provider_canonical_043_blob), `${filename}: provider-canonical 043 blob leaked into output`);
    fail(failures, !text.includes(config.fitness_provenance.provider_canonical_043_sha256), `${filename}: provider-canonical 043 digest leaked into output`);
    resolvedDenyPolicyCount += [...text.matchAll(/create\s+policy\s+[A-Za-z0-9_]+_deny_public_api_access\b/gi)].length;
  }
  failures.push(...verifyGeneratedFunctionPrivileges(orderedFiles, generatedFunctionPrivilegeContractV1));
  failures.push(...verifyCreatorDefaultAcls(
    orderedFiles,
    config.creator_default_acl,
    config.target_postgresql,
    namespacePlan.creator_default_acl,
    namespacePlan.target_postgresql
  ));
  failures.push(...verifyApplicationCreatorBoundary(
    orderedFiles,
    config.application_creator_boundary,
    namespacePlan.application_creator_boundary
  ));
  failures.push(...verifySchemaCreationOrder(orderedFiles));
  fail(failures, resolvedDenyPolicyCount === 10, `resolved deny policy output must be 10, found ${resolvedDenyPolicyCount}`);
}

const supabaseProjectEndpointPattern = /https:\/\/[a-z0-9]{20}\.supabase\.(?:co|net)\b/;
const supabaseProjectRefValuePattern = /(?:^|[^a-z0-9])[a-z0-9]{20}(?:$|[^a-z0-9])/;
const boundProjectIdentityPattern = /["']?(?:project[_-]?ref|supabase[_-]?url)["']?\s*[=:]\s*["']?[a-z0-9]{20}\b/i;

function isForbiddenPortableIdentityKey(key) {
  const normalized = key.toLowerCase().replaceAll('_', '').replaceAll('-', '');
  return normalized === 'projectref' || normalized === 'supabaseurl';
}

export function inspectPortableBootstrapIdentity(relativePath, text) {
  const normalizedPath = typeof relativePath === 'string' && relativePath.length > 0 ? relativePath.replaceAll('\\', '/') : 'UNKNOWN';
  const failures = [];
  if (typeof text !== 'string') {
    return [`${normalizedPath}: portable identity input must be UTF-8 text`];
  }

  if (normalizedPath.toLowerCase().endsWith('.json')) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return [`${normalizedPath}: malformed JSON cannot prove portable identity safety`];
    }

    const visit = (value, pointer) => {
      if (typeof value === 'string') {
        if (supabaseProjectEndpointPattern.test(value) || supabaseProjectRefValuePattern.test(value)) {
          failures.push(`${normalizedPath}:${pointer}: Supabase project-ref-shaped value detected`);
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((entry, index) => visit(entry, `${pointer}[${index}]`));
        return;
      }
      if (value === null || typeof value !== 'object') return;
      for (const [key, entry] of Object.entries(value)) {
        const childPointer = `${pointer}.${key}`;
        if (isForbiddenPortableIdentityKey(key)) {
          failures.push(`${normalizedPath}:${childPointer}: project-bound identity key detected`);
        }
        visit(entry, childPointer);
      }
    };
    visit(parsed, '$');
  } else if (supabaseProjectEndpointPattern.test(text) || boundProjectIdentityPattern.test(text)) {
    failures.push(`${normalizedPath}: project endpoint or bound project reference detected`);
  }

  return [...new Set(failures)].sort((left, right) => left.localeCompare(right));
}

function verifyNoForbiddenIdentities(config, failures) {
  const sourceManifest = readJson('bootstrap/manifests/source-migrations.v1.json');
  const replaySafe = sourceManifest.migrations.find((migration) => migration.app === 'fitness' && migration.path.endsWith('/043_hide_standalone_stretch_catalog_rows.sql'));
  fail(failures, replaySafe?.blob === config.fitness_provenance.replay_safe_043_blob, 'replay-safe 043 blob drift');
  fail(failures, replaySafe?.raw_sha256 === config.fitness_provenance.replay_safe_043_sha256, 'replay-safe 043 raw digest drift');
  fail(failures, sourceManifest.migrations.every((migration) => migration.blob !== config.fitness_provenance.provider_canonical_043_blob), 'provider-canonical 043 entered executable inputs');
  fail(failures, sourceManifest.migrations.every((migration) => migration.raw_sha256 !== config.fitness_provenance.provider_canonical_043_sha256), 'provider-canonical 043 digest entered executable inputs');
  const newPackagePaths = [
    'bootstrap/generator/config.v1.json',
    ...expectedManifestFiles.map((name) => `bootstrap/manifests/${name}`),
    ...expectedGeneratedFiles.map((name) => `${expectedGeneratedArtifactDirectory}/${name}`),
    'scripts/generate-target-bootstrap.mjs',
    'scripts/verify-target-bootstrap.mjs',
    'test/ddl-parser.test.mjs',
    'test/source-manifest.test.mjs',
    'test/bootstrap-generator.test.mjs',
    'test/bootstrap-replay.test.mjs',
    'test/bootstrap-security.test.mjs',
    'docs/adr/0002-target-bootstrap-namespace.md',
    'docs/runbooks/target-bootstrap.md'
  ];
  for (const relativePath of newPackagePaths.filter((candidate) => fs.existsSync(path.join(root, ...candidate.split('/'))))) {
    const text = fs.readFileSync(path.join(root, ...relativePath.split('/')), 'utf8');
    failures.push(...inspectPortableBootstrapIdentity(relativePath, text));
  }
}

export function verifyTargetBootstrap({ checkDeterminism = true } = {}) {
  const failures = [];
  const config = readJson('bootstrap/generator/config.v1.json');
  fail(failures, config.apply_admitted === false, 'config must set apply_admitted=false');
  fail(failures, canonicalJson(config.expected) === canonicalJson(exactExpected), 'exact expectation denominator drift');
  const manifestNames = fs.readdirSync(path.join(root, 'bootstrap', 'manifests')).filter((name) => name.endsWith('.json')).sort();
  fail(failures, canonicalJson(manifestNames) === canonicalJson(expectedManifestFiles), 'manifest path denominator drift');
  const sourceManifest = readJson('bootstrap/manifests/source-migrations.v1.json');
  const migrationGate = readJson('contracts/v1/gates/migration-gate-state.json');
  const importRehearsal = readJson('contracts/v1/auth/import-rehearsal-contract.json');
  const appDataTransport = readJson('contracts/v1/transport/app-data-transport-contract.json');
  const mazerAppDataAdapter = readJson('contracts/v1/transport/mazer-app-data-adapter-contract.json');
  const fitnessAppDataAdapter = readJson('contracts/v1/transport/fitness-app-data-adapter-contract.json');
  const discordosAppDataAdapter = readJson('contracts/v1/transport/discordos-app-data-adapter-contract.json');
  const appDataReceipt = readJson('contracts/v1/transport/app-data-receipt.example.json');
  const appDataJournal = readJson('contracts/v1/transport/app-data-mutation-journal-contract.json');
  const fitnessPr108ReplayGate = readJson(fitnessPr108ReplayGatePath);
  const objects = readJson('bootstrap/manifests/source-objects.v1.json');
  const dynamic = readJson('bootstrap/manifests/dynamic-units.v1.json');
  const dataEffects = readJson('bootstrap/manifests/data-effects.v1.json');
  const dispositions = readJson('bootstrap/manifests/dispositions.v1.json');
  const namespacePlan = readJson('bootstrap/manifests/namespace-plan.v1.json');
  verifySourceManifest(config, sourceManifest, failures);
  failures.push(...verifyProviderCanonicalProvenance({ gate: migrationGate, sourceManifest, deterministicPackageSha256: digestPackageOutputs().digest }));
  failures.push(...verifySharedAuthImportRehearsal({ contract: importRehearsal, gate: migrationGate }));
  failures.push(...verifyAppDataTransportContracts({ contract: appDataTransport, receipt: appDataReceipt, journal: appDataJournal, gate: migrationGate }));
  failures.push(...verifyMazerAppDataAdapter({ adapter: mazerAppDataAdapter, gate: migrationGate }));
  failures.push(...verifyFitnessAppDataAdapter({ adapter: fitnessAppDataAdapter, gate: migrationGate }));
  failures.push(...verifyDiscordosAppDataAdapter({ adapter: discordosAppDataAdapter, gate: migrationGate }));
  failures.push(...verifyFitnessPr108ReplayGate({
    config,
    gate: fitnessPr108ReplayGate,
    sourceManifest,
    deterministicPackageSha256: digestPackageOutputs().digest
  }));
  verifyObjects(objects, config, failures);
  verifyHeldUnits(config, dynamic, dataEffects, dispositions, sourceManifest, failures);
  failures.push(...verifyHeldControlPlaneContracts(config, namespacePlan));
  verifyGeneratedSql(config, namespacePlan, dispositions, failures);
  verifyNoForbiddenIdentities(config, failures);

  let deterministicDigest = digestPackageOutputs().digest;
  if (checkDeterminism) {
    const before = digestPackageOutputs();
    generateTargetBootstrap();
    const first = digestPackageOutputs();
    generateTargetBootstrap();
    const second = digestPackageOutputs();
    fail(failures, canonicalJson(before.records) === canonicalJson(first.records), 'first clean generator run changed committed package bytes');
    fail(failures, canonicalJson(first.records) === canonicalJson(second.records), 'two generator runs were not byte-identical');
    deterministicDigest = second.digest;
  }

  return {
    ok: failures.length === 0,
    apply_admitted: false,
    checks: [
      'immutable_source_identity', 'frozen_chain_recomputation', 'combined_manifest_binding', 'source_object_denominators',
      'dynamic_fail_closed', 'data_effect_hold', 'cron_hold', 'namespace_boundary',
      'path_level_inertness',
      'fitness_pr108_replay_provenance_gate',
      'provider_canonical_historical_provenance_gate',
      'shared_auth_import_reauth_rehearsal_gate',
      'app_data_transport_contract_gate',
      'mazer_app_data_adapter_contract_gate',
      'fitness_app_data_adapter_contract_gate',
      'discordos_app_data_adapter_contract_gate',
      'schema_creation_order', 'creator_default_acl_disposition', 'application_creator_boundary',
      'public_object_boundary', 'data_api_gate',
      'discordos_public_rpc_hold', 'held_function_dependency_closure',
      'provider_managed_skip', 'private_schema_exposure', 'effective_function_acl', 'effective_function_search_path', 'no_network_hooks',
      'no_provider_commands', 'no_project_refs', 'deterministic_generation'
    ],
    counts: {
      migrations: sourceManifest.migrations.length,
      tables: objects.tables.length,
      functions: objects.functions.length,
      policies: objects.policies.length,
      triggers: objects.triggers.length,
      index_identities: objects.index_identities.length,
      constraint_units: objects.constraint_units.expected_count,
      extension_dependencies: objects.extension_dependencies.length,
      held_data_effects: dataEffects.effects.length,
      dynamic_templates: dynamic.units.length,
      held_cron_units: 1
    },
    creator_default_acl_counts: {
      units: namespacePlan.creator_default_acl.units.length,
      executable: namespacePlan.creator_default_acl.units.filter((unit) => unit.execution_disposition === 'EXECUTABLE_INERT_SOURCE').length,
      signature_assertions: namespacePlan.creator_default_acl.units.filter((unit) => unit.execution_disposition === 'ASSERT_SIGNATURE_SPECIFIC_REVOKE').length,
      blocked: namespacePlan.creator_default_acl.units.filter((unit) => unit.execution_disposition === 'NOT_EXECUTABLE').length
    },
    derived_counts: dispositions.derived_counts,
    deterministic_digest: deterministicDigest,
    failures: failures.sort()
  };
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const report = verifyTargetBootstrap();
  process.stdout.write(canonicalJson(report));
  if (!report.ok) process.exitCode = 1;
}
