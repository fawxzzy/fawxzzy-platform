import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { types } from 'node:util';
import Ajv2020 from 'ajv/dist/2020.js';
import { validateRecoveryDocuments } from './recovery.mjs';
import { independentBackupContractPath, validateIndependentBackupContract } from './independent-backup-contract.mjs';
import {
  buildExecutableBundleManifest,
  canonicalCompactSha256,
  executableBundleArtifacts
} from '../generate-executable-bundle.mjs';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(moduleDirectory, '..', '..');

const executableBundlePinnedContractBindings = Object.freeze([
  Object.freeze({
    role: 'DISPOSABLE_TARGET_BOOTSTRAP',
    path: 'contracts/v1/bootstrap/disposable-target-bootstrap-contract.json',
    sha256: 'd217f31885f995e939d8e37c07ef5201bef43934227564a9083b662b2054c869'
  }),
  Object.freeze({
    role: 'AUTH_APP_DATA_REHEARSAL',
    path: 'contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json',
    sha256: '47db976f08e98e8d7821e1007e942355f912af86a3ef6c229b3b7772e91b6402'
  }),
  Object.freeze({
    role: 'STORAGE_EDGE_REALTIME_EXECUTION_DENOMINATOR',
    path: 'contracts/v1/rehearsal/storage-edge-realtime-execution-denominator-contract.json',
    sha256: '6b49d8b06f80b7bd28f2ee446c73119e72ab78360e4346008b725cb561e67f97'
  }),
  Object.freeze({
    role: 'INDEPENDENT_BACKUP',
    path: 'contracts/v1/recovery/independent-backup-contract.json',
    sha256: 'a627535f8f48d0c14b81a6bb611bf4f36935af96a66beb1d6a23096df4c2fd10'
  }),
  Object.freeze({
    role: 'RLS_GRANT_FUNCTION_MATRIX',
    path: 'contracts/v1/security/rls-grant-function-matrix.json',
    sha256: 'c309ab9e1c4c5313e4817f8b6eccaaeb186886141cb3d65da9b8a5dc4740856e'
  })
]);

const executableBundlePinnedEvidenceBindings = Object.freeze([
  Object.freeze({
    role: 'EXPECTED_DATA_EFFECTS',
    path: 'bootstrap/manifests/data-effects.v1.json',
    sha256: '1d28080e416eb59f639c9db4514d9c9e4e978d8650c2137f0a170440eba25d85'
  }),
  Object.freeze({
    role: 'STATEMENT_DISPOSITIONS',
    path: 'bootstrap/manifests/dispositions.v1.json',
    sha256: '129ff967d9333c38c5356a1c5309361c368c6ee0552bfc9f2c84624defbc396c'
  }),
  Object.freeze({
    role: 'EXPECTED_SOURCE_OBJECTS',
    path: 'bootstrap/manifests/source-objects.v1.json',
    sha256: '1e26a2c50f5415ced0a5100556d85c5f0f66e12baede0b705771e570906d369e'
  })
]);

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
  ['contracts/v1/bootstrap/disposable-target-bootstrap-contract.json', 'urn:fawxzzy:platform:schemas:v1:disposable-target-bootstrap-contract'],
  ['contracts/v1/rehearsal/storage-edge-realtime-execution-denominator-contract.json', 'urn:fawxzzy:platform:schemas:v1:storage-edge-realtime-execution-denominator-contract'],
  ['contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json', 'urn:fawxzzy:platform:schemas:v1:auth-app-data-rehearsal-contract'],
  ['contracts/v1/execution/executable-bundle-manifest.json', 'urn:fawxzzy:platform:schemas:v1:executable-bundle-manifest'],
  ['contracts/v1/gates/migration-gate-state.json', 'urn:fawxzzy:platform:schemas:v1:migration-gate-state'],
  ['contracts/v1/gates/cutover-retirement-gate-state.json', 'urn:fawxzzy:platform:schemas:v1:cutover-retirement-gate-state'],
  ['contracts/v1/gates/fitness-pr108-replay-gate.json', 'urn:fawxzzy:platform:schemas:v1:fitness-pr108-replay-gate'],
  ['contracts/v1/security/rls-grant-function-matrix.json', 'urn:fawxzzy:platform:schemas:v1:security-matrix'],
  ['contracts/v1/auth/domain-session-contract.json', 'urn:fawxzzy:platform:schemas:v1:domain-session-contract'],
  ['contracts/v1/recovery/micro-recovery-contract.json', 'urn:fawxzzy:platform:schemas:v1:micro-recovery-contract'],
  ['contracts/v1/recovery/backup-manifest.example.json', 'urn:fawxzzy:platform:schemas:v1:backup-manifest'],
  ['contracts/v1/recovery/external-effects-disable-manifest.example.json', 'urn:fawxzzy:platform:schemas:v1:external-effects-disable-manifest'],
  ['contracts/v1/recovery/restore-rehearsal-receipt.example.json', 'urn:fawxzzy:platform:schemas:v1:restore-rehearsal-receipt'],
  ['contracts/v1/recovery/independent-backup-contract.json', 'urn:fawxzzy:platform:schemas:v1:independent-backup-contract'],
  [
    'contracts/v1/convergence/platform-data-convergence-contract.json',
    'urn:fawxzzy:platform:schemas:v1:platform-data-convergence-contract'
  ],
  [
    'contracts/v1/convergence/table-classification-manifest.json',
    'urn:fawxzzy:platform:schemas:v1:table-classification-manifest'
  ],
  [
    'contracts/v1/convergence/source-to-target-transformation-manifest.json',
    'urn:fawxzzy:platform:schemas:v1:source-to-target-transformation-manifest'
  ]
]);

const convergenceDocumentPaths = Object.freeze([
  'contracts/v1/convergence/platform-data-convergence-contract.json',
  'contracts/v1/convergence/table-classification-manifest.json',
  'contracts/v1/convergence/source-to-target-transformation-manifest.json'
]);

const convergenceClassificationVocabulary = Object.freeze(['KEEP', 'TRANSFORM', 'DERIVE', 'ARCHIVE', 'OMIT']);

const convergenceWorkEntities = Object.freeze(['projects', 'cards', 'events', 'dependencies', 'external_refs']);

const convergenceForbiddenIdentityProofs = Object.freeze([
  'EMAIL_EQUALITY',
  'USERNAME_EQUALITY',
  'UUID_EQUALITY',
  'PASSWORD_HASH_EQUALITY'
]);

const convergenceMappingIds = Object.freeze([
  'discord_board_to_work_projects_cards',
  'discord_feedback_to_work_events',
  'discord_identifiers_to_optional_external_refs',
  'work_relationships_to_dependencies',
  'source_identities_to_shared_identity',
  'fitness_stats_rebuild',
  'fitness_pending_jobs_regeneration',
  'fitness_alias_canonicalization',
  'mazer_progression_convergence'
]);

const convergenceClassificationRecordDigests = Object.freeze([
  ['shared_auth_identity', '25afceb40d0da65b5dacdc9042a05fdc9684790bde45c870e82f4a627795f940'],
  ['shared_profile_membership_external_identity', 'aa83804cdf1573863d3e160a13276d4b4befacaf47d4d1a877f79e85414f94dc'],
  ['discord_feedback_and_board_records', '0c0aee8f7464d9118660c72f367289c5729e4363ac5bb9e5fc771c6692aeadc7'],
  ['fitness_authoritative_facts', 'e31a3be6f65632c114498f1d73e7081da47a09968bbc6c987dc54895499ca853'],
  ['fitness_derived_stats', '1f0c6bd967e9f82a8244d638b156872f5091f35ca9f0395c2f1960642cf69b07'],
  ['fitness_pending_jobs', 'db0152ab5fb3eb1b43b883962d0bd8ce42427b66397bf3fbbf3fb007c53c8acf'],
  ['fitness_exercise_aliases', '64c9680a1ef2c054f9bc27a603e04e1ba565d56bda3c3a3f1d0cbf62be6a1e13'],
  ['fitness_billing_and_entitlements', 'aae4b698d146f95b37ce1c2c1e04d3ad3eb69bc51f704fc9edd4e8df2781b307'],
  ['mazer_progression_representations', 'c107dd401f8eb0f9b7b90d97ec0290751414137c0da145cede7671f0939592e1'],
  ['music_sesh_domain', '70f5b8b22610e7555b85a5c66ad9a9fc624c19b711cbc394dcd5f762527f1528'],
  ['legacy_operational_residue', '499b862ed4242365fdfe60ad7969b3b0f369ef6af9ca48be4467e92b2544f2b0'],
  ['expired_tokens_claims_and_transient_residue', 'd871569e5cac90724f56bd0002e8806876851f69d2fca2db5fef1c53353e1d27']
]);

const convergenceMappingRecordDigests = Object.freeze([
  ['discord_board_to_work_projects_cards', 'bdcd230827f034b96e8329686ec6794eb476d0aea3443c85c96e88bac10f16b0'],
  ['discord_feedback_to_work_events', 'c1753b0965409f074cf9c624ed07937765d5b7bdec6df497a296727f3a6fbe06'],
  ['discord_identifiers_to_optional_external_refs', 'a8248e96fa2092ac2b22ce2d0aadb1d0162d270fab4ec3db6976a8ff32a07e7b'],
  ['work_relationships_to_dependencies', 'c455691908ccc67c875ad3f839cb5a8a4c014132af0ed4a2e9601fec09bd3f81'],
  ['source_identities_to_shared_identity', '69c7dbdb688285004d5951b78b524fe6f8211517022b960893b441d5044ec267'],
  ['fitness_stats_rebuild', 'a367cf10dc857a2639738f0c9439619e746604e753daedc79a2008c4cc61e4a9'],
  ['fitness_pending_jobs_regeneration', 'ebcd69637b9c6cca783130716244bc724d7d417296f61aadeb52238346b63c13'],
  ['fitness_alias_canonicalization', 'ee84b7f9bd7cf12192722ea8f77fb82822805eec1f6f837586a2d6403c23167c'],
  ['mazer_progression_convergence', 'f941c4556b8e6ad93bb6b55d6d7b1c8c020040d9a3d5f8939a09c435e2b800e5']
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

const targetBootstrapActionOrder = Object.freeze([
  'CAPTURE_ACTION_TIME_IDENTITIES',
  'PROVE_DISPOSABLE_NOT_PROTECTED',
  'CAPTURE_FRESH_PREIMAGE',
  'DENY_EXTERNAL_EGRESS',
  'WITHHOLD_APPLICATION_CREDENTIALS',
  'DISABLE_DATA_API',
  'READ_EXTENSION_DEFAULTS',
  'VERIFY_REVIEWED_EXECUTABLE_BUNDLE',
  'APPLY_ONLY_UNDER_SEPARATE_AUTHORITY',
  'CATALOG_READ_A',
  'CATALOG_READ_B',
  'VERIFY_SECURITY_PARITY',
  'VERIFY_ZERO_EXTERNAL_EFFECTS',
  'RUN_NEGATIVE_PROBES',
  'PROVE_ROLLBACK_CAPABILITY',
  'FREEZE_QUARANTINED_TARGET'
]);

const targetBootstrapFutureExposedSchemas = Object.freeze([
  'platform_shared',
  'discordos',
  'mazer',
  'fitness'
]);

const targetBootstrapNeverExposedSchemas = Object.freeze([
  'graphql_public',
  'public',
  'private',
  'extensions',
  'auth',
  'storage',
  'realtime'
]);

const targetBootstrapRequiredExtensions = Object.freeze([
  'pgcrypto',
  'pg_cron',
  'pg_net'
]);

const targetBootstrapNegativeProbes = Object.freeze([
  'REST_PUBLIC_DENIED',
  'GRAPHQL_PUBLIC_DENIED',
  'RPC_PUBLIC_DENIED',
  'WRONG_OWNER_DENIED',
  'ANON_WRITE_DENIED',
  'EXTERNAL_EGRESS_DENIED'
]);

const targetBootstrapCatalogCounts = Object.freeze({
  tables: 41,
  functions: 30,
  policies: 74,
  triggers: 10,
  indexes: 134,
  constraints: 281,
  extension_dependencies: 3
});

const targetBootstrapZeroEffectFields = Object.freeze([
  'outbound_network_requests',
  'cron_jobs_enabled',
  'edge_functions_deployed',
  'webhooks_enabled',
  'realtime_publications_enabled',
  'storage_objects_written',
  'auth_messages_sent'
]);

const storageEdgeRealtimeContractPath = 'contracts/v1/rehearsal/storage-edge-realtime-execution-denominator-contract.json';

const storageEdgeRealtimeActionOrder = Object.freeze([
  'BIND_ACTION_TIME_SUBJECT_RUN_AND_PACKAGE',
  'VERIFY_REVIEWED_PROMOTED_BYTE_MANIFEST',
  'CAPTURE_COMPLETE_STORAGE_DENOMINATOR',
  'CAPTURE_STORAGE_BODY_READ_A',
  'CAPTURE_STORAGE_BODY_READ_B',
  'CAPTURE_COMPLETE_EDGE_DENOMINATOR',
  'CAPTURE_COMPLETE_REALTIME_DENOMINATOR',
  'CAPTURE_COMPLETE_OUTBOUND_DENOMINATOR',
  'CAPTURE_DATA_API_PREIMAGE_GET',
  'DENY_EXTERNAL_EFFECTS',
  'APPLY_ONLY_UNDER_SEPARATE_AUTHORITY',
  'CAPTURE_COMPLETE_READ_A',
  'WAIT_OBSERVATION_WINDOW',
  'CAPTURE_COMPLETE_READ_B',
  'VERIFY_ZERO_GROWTH_AND_EFFECTS',
  'PROVE_ROLLBACK_INVERSE_ORDER',
  'PROVE_DISPOSAL_ABSENCE_AND_CREDENTIAL_REVOCATION',
  'FREEZE_QUARANTINED_TARGET'
]);

const storageEdgeRealtimeOutboundSurfaces = Object.freeze([
  'vault',
  'cron',
  'pg_net',
  'database_webhooks',
  'wrappers',
  'foreign_servers',
  'subscriptions',
  'other_outbound_units'
]);

const storageEdgeRealtimeRollbackOrder = Object.freeze([
  'DATA_API_CONFIGURATION',
  'DATABASE_WEBHOOKS',
  'PG_NET',
  'CRON',
  'EDGE_FUNCTIONS',
  'REALTIME_CONFIGURATION',
  'STORAGE_OBJECT_BODIES',
  'STORAGE_OBJECT_METADATA',
  'STORAGE_BUCKETS',
  'CREDENTIALS',
  'DISPOSABLE_TARGET'
]);

const storageEdgeRealtimeZeroEffectFields = Object.freeze([
  'outbound_network_requests',
  'storage_object_writes',
  'edge_function_invocations',
  'realtime_broadcasts',
  'realtime_connected_clients',
  'cron_history_growth',
  'pg_net_history_growth',
  'webhook_invocations'
]);

const storageEdgeRealtimeForwardEvidenceClasses = Object.freeze([
  'BUNDLE_REVIEW',
  'DATA_API_PREIMAGE',
  'DATA_API_POSTIMAGE',
  'COMPLETE_READ_A',
  'COMPLETE_READ_B',
  'ZERO_EFFECT'
]);

const storageEdgeRealtimeContractSha256 = '6b49d8b06f80b7bd28f2ee446c73119e72ab78360e4346008b725cb561e67f97';

const authAppDataBindingDocuments = Object.freeze([
  Object.freeze({ path: 'contracts/v1/auth/import-rehearsal-contract.json', version: '1.0.0', sha256: '57a1c2d0e68ce9dd948a6d595908aeeda376bfb86efe82a8a68520177a040b09' }),
  Object.freeze({ path: 'contracts/v1/auth/domain-session-contract.json', version: '1.1.0', sha256: '516337d43048199875b3f3b283a3f48b0cba64a720fa5796ca0064a41ac24f16' }),
  Object.freeze({ path: 'contracts/v1/transport/app-data-transport-contract.json', version: '1.0.0', sha256: 'db12ccd31fd627f7b184692f88d2078d162b2f43f06f02826255cbcd3df76c63' }),
  Object.freeze({ path: 'contracts/v1/transport/app-data-mutation-journal-contract.json', version: '1.0.0', sha256: '4e4208dc28fb5f7b2614cbd27f446d1ccab1996a15734cd666e86d1fae63b0ea' }),
  Object.freeze({ path: 'contracts/v1/transport/app-data-receipt.example.json', version: '1.0.0', sha256: '14526455a7cbb11600a9922acba2702004586b543b001d6f937ccc9dfa97da23' }),
  Object.freeze({ path: 'contracts/v1/transport/mazer-app-data-adapter-contract.json', version: '1.2.0', sha256: 'ac451c8fefdd6d33543c013476e3b1bcd6c850143fb4614125db7c928b3a64a7' }),
  Object.freeze({ path: 'contracts/v1/transport/fitness-app-data-adapter-contract.json', version: '1.1.0', sha256: 'ffc44ec109b243a9e9a1c28236ef55b0ae00e13fdaadf155f28c1561709e3ee6' }),
  Object.freeze({ path: 'contracts/v1/transport/discordos-app-data-adapter-contract.json', version: '1.1.0', sha256: '4d9a3e7409f39b126e2e631855d8016cca9585dbf9a505786808aa6007120068' }),
  Object.freeze({ path: 'contracts/v1/identity/identity-map.json', version: '1.0.0', sha256: '1212e3457552e85d65f262ecb63a3a2a452b3c133e42da15c32ce221d20f3fb9' }),
  Object.freeze({ path: 'contracts/v1/membership/membership-lifecycle.json', version: '1.1.0', sha256: '8dbeb551521ba94fb4d1a807e4c92cbc3d31dd8df1a9a0e18b9486044d434e78' }),
  Object.freeze({ path: 'contracts/v1/bootstrap/disposable-target-bootstrap-contract.json', version: '1.0.0', sha256: 'd217f31885f995e939d8e37c07ef5201bef43934227564a9083b662b2054c869' }),
  Object.freeze({ path: storageEdgeRealtimeContractPath, version: '1.0.0', sha256: storageEdgeRealtimeContractSha256 }),
  Object.freeze({ path: 'contracts/v1/recovery/independent-backup-contract.json', version: '2.2.0', sha256: 'a627535f8f48d0c14b81a6bb611bf4f36935af96a66beb1d6a23096df4c2fd10' }),
  Object.freeze({ path: 'contracts/v1/recovery/micro-recovery-contract.json', version: '1.0.0', sha256: 'c8add3e5836b4153b74ee9f6e0918df6aed220918ab7e71e6943cc535553edd4' })
]);

const authAppDataBindingSetSha256 = '9e70e28742e8614b4c6bac7f40791312fbeb62df6de3f80d0cca05cb547c551a';

const authAppDataAuthSurfaces = Object.freeze([
  'users',
  'identities',
  'password_hashes',
  'verification_states',
  'anonymous_users',
  'mfa_factors_challenges_aal',
  'sso_connections_and_configuration',
  'invites',
  'recovery_tokens',
  'email_change_tokens',
  'phone_change_tokens',
  'source_sessions_access_refresh_tokens_cookies',
  'auth_audit_log_database',
  'auth_audit_log_external_storage',
  'signing_keys_and_jwt_configuration',
  'provider_auth_settings_and_credentials',
  'oauth_server_enablement_and_authorization_path',
  'oauth_registered_clients_redirect_uris_and_secret_rotation',
  'oauth_authorizations_consents_and_codes',
  'oauth_oidc_issued_access_refresh_and_id_tokens'
]);

const authAppDataAuthDispositions = Object.freeze([
  'TRANSPORT_AGGREGATE_PROOF_REQUIRED',
  'TRANSPORT_AGGREGATE_PROOF_REQUIRED',
  'OPAQUE_PROVIDER_COMPATIBLE_NEVER_SERIALIZED',
  'TRANSPORT_AGGREGATE_PROOF_REQUIRED',
  'AGGREGATE_INVENTORY_AND_EXPLICIT_DISPOSITION_REQUIRED',
  'REENROLL_AND_AAL1_UNTIL_ACCEPTED_FACTOR_PROOF',
  'AGGREGATE_INVENTORY_AND_EXPLICIT_DISPOSITION_REQUIRED',
  'AGGREGATE_INVENTORY_AND_EXPLICIT_DISPOSITION_REQUIRED',
  'SOURCE_TOKEN_REJECTED_NEW_TARGET_FLOW',
  'SOURCE_TOKEN_REJECTED_NEW_TARGET_FLOW',
  'SOURCE_TOKEN_REJECTED_NEW_TARGET_FLOW',
  'REJECT_AND_ISSUE_NEW_TARGET_SESSIONS',
  'AGGREGATE_INVENTORY_AND_RETENTION_PROOF_REQUIRED',
  'AGGREGATE_INVENTORY_AND_EXPLICIT_DISPOSITION_REQUIRED',
  'SEPARATELY_CONFIGURED_NO_SECRET_TRANSPORT',
  'SEPARATELY_CONFIGURED_NO_SECRET_TRANSPORT',
  'AGGREGATE_ENABLEMENT_AND_ENDPOINT_PROOF_REQUIRED',
  'AGGREGATE_INVENTORY_NO_SECRET_SERIALIZATION',
  'AGGREGATE_INVENTORY_AND_EXPLICIT_DISPOSITION_REQUIRED',
  'SOURCE_TOKEN_REJECTED_NEW_TARGET_FLOW'
]);

const authAppDataNonrowSurfaces = Object.freeze([
  'sequences_and_ownership',
  'large_objects',
  'storage_bucket_metadata',
  'storage_object_metadata',
  'storage_object_bodies',
  'realtime_publications',
  'replica_identity',
  'grants',
  'rls_and_policies',
  'functions_and_acls',
  'triggers',
  'extensions'
]);

const authAppDataNonrowDispositions = Object.freeze([
  'AGGREGATE_PARITY_PROOF_REQUIRED',
  'AGGREGATE_PARITY_PROOF_REQUIRED',
  'AGGREGATE_PARITY_PROOF_REQUIRED',
  'AGGREGATE_PARITY_PROOF_REQUIRED',
  'SEPARATE_TRANSFER_EGRESS_AND_BODY_PARITY_AUTHORITY_BLOCKED',
  'AGGREGATE_PARITY_PROOF_REQUIRED',
  'AGGREGATE_PARITY_PROOF_REQUIRED',
  'SECURITY_PARITY_AND_NEGATIVE_PROBE_REQUIRED',
  'SECURITY_PARITY_AND_NEGATIVE_PROBE_REQUIRED',
  'SECURITY_PARITY_AND_NEGATIVE_PROBE_REQUIRED',
  'AGGREGATE_PARITY_PROOF_REQUIRED',
  'OBSERVED_DEFAULT_INSTALLED_AND_COMPATIBILITY_PROOF_REQUIRED'
]);

const authAppDataAdapterCounts = Object.freeze([
  Object.freeze({ app: 'mazer', relation_count: 4, contract_path: 'contracts/v1/transport/mazer-app-data-adapter-contract.json' }),
  Object.freeze({ app: 'fitness', relation_count: 27, contract_path: 'contracts/v1/transport/fitness-app-data-adapter-contract.json' }),
  Object.freeze({ app: 'discordos', relation_count: 10, contract_path: 'contracts/v1/transport/discordos-app-data-adapter-contract.json' })
]);

const authAppDataActionOrder = Object.freeze([
  'BIND_ACTION_TIME_SUBJECT_AND_RUN',
  'VERIFY_DISPOSABLE_TARGET_BOOTSTRAP_CURRENT',
  'VERIFY_BACKUP_AND_RESTORE_PREREQUISITES',
  'CAPTURE_AUTH_AND_DATA_S0',
  'DENY_EXTERNAL_EGRESS',
  'WITHHOLD_APPLICATION_CREDENTIALS',
  'CREATE_AUTH_SHELLS',
  'LOAD_MAZER_DATA',
  'LOAD_FITNESS_DATA',
  'LOAD_DISCORDOS_DATA',
  'CAPTURE_AUTH_AND_DATA_S1',
  'AUTHORIZE_AND_ENTER_WRITE_BARRIER',
  'APPLY_S1_DIFF_AND_TOMBSTONES',
  'CAPTURE_FINAL_S2',
  'POSTIMPORT_READ_A',
  'WAIT_OBSERVATION_WINDOW',
  'POSTIMPORT_READ_B',
  'RUN_SECURITY_AUTH_AND_EGRESS_NEGATIVE_PROBES',
  'ACTIVATE_PENDING_MEMBERSHIPS',
  'FREEZE_QUARANTINED_TARGET'
]);

const authAppDataExpectedStateModel = Object.freeze({
  version: 'AUTH_APP_DATA_EXPECTED_STATE_V1',
  digest_model: 'CANONICAL_JSON_BYTES_SHA256_V1',
  components: Object.freeze([
    'subject_sha256',
    'run_correlation_sha256',
    'contract_binding_set_sha256',
    'package',
    'auth_surfaces',
    'application_data',
    'identity_ledger',
    'final_s2'
  ])
});

const authAppDataExpectedStateQueryModelSha256 = 'c4edb31be26650b35ad2bd9d4572077d92269aeda649a6ff1577411da342405f';

const authAppDataNegativeProbes = Object.freeze([
  'SOURCE_ACCESS_TOKEN_REJECTED',
  'SOURCE_REFRESH_TOKEN_REJECTED',
  'SOURCE_COOKIE_REJECTED',
  'QUARANTINED_IDENTITY_INACTIVE',
  'SUSPENDED_USER_DENIED',
  'AAL2_WITHOUT_ACCEPTED_FACTOR_PROOF_DENIED',
  'RECOVERY_TOKEN_REPLAY_DENIED',
  'INVITE_TOKEN_REPLAY_DENIED',
  'NORMALIZED_IDENTITY_COLLISION_QUARANTINED',
  'WRONG_OWNER_ROW_DENIED',
  'DIRECT_ID_ACCESS_DENIED',
  'CAS_CONFLICT_QUARANTINED',
  'UNAUTHORIZED_STORAGE_ACCESS_DENIED',
  'EXTERNAL_EGRESS_DENIED'
]);

const authAppDataPrerequisites = Object.freeze([
  'DISPOSABLE_TARGET_BOOTSTRAP',
  'INDEPENDENT_BACKUP',
  'MICRO_RECOVERY_CAPABILITY'
]);

const authAppDataZeroEffectFields = Object.freeze([
  'outbound_network_requests',
  'auth_messages_sent',
  'storage_object_writes',
  'realtime_broadcasts',
  'edge_function_invocations',
  'cron_jobs_enabled',
  'webhooks_enabled'
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
  data_api_gate_version: '1.6.0',
  decision_id: 'FP-MAN-047',
  question_event_id: 'onv1_ed934a7382f5e52e6ceea9ea73011f9ff70a46d31bd6061a3dc7645946cad0df',
  question_payload_sha256: 'ed934a7382f5e52e6ceea9ea73011f9ff70a46d31bd6061a3dc7645946cad0df',
  answer_event_id: 'onv1_2a47e6b7bfb21d11ffe4cf87a7091f8aafb2d75ffebf25b3914dd6c03d8bb570',
  answer_payload_sha256: '2a47e6b7bfb21d11ffe4cf87a7091f8aafb2d75ffebf25b3914dd6c03d8bb570',
  answer_text_sha256: '3cf34735fbf4b2f83c811377d0a43903875e583a3409d4a4e75ca986d942e7b7',
  decision: 'APPROVE_ONE_GUARDED_REPRODUCTION_AFTER_SOURCE_ID_CORRECTION',
  policy_only: true,
  successor_decision_id: 'FP-MAN-048',
  successor_question_event_id: 'onv1_2580303e3f1ebdd0a580df1821b57dc0263c46bfabdd4b1dcf328d9c0c53ca49',
  successor_question_payload_sha256: '2580303e3f1ebdd0a580df1821b57dc0263c46bfabdd4b1dcf328d9c0c53ca49',
  successor_answer_event_id: 'onv1_049d86e0094c7cbd6aadbb7bbb235fa857d404809428d427cf2c6657ca4d2cd8',
  successor_answer_payload_sha256: '049d86e0094c7cbd6aadbb7bbb235fa857d404809428d427cf2c6657ca4d2cd8',
  successor_decision: 'APPROVE_FP_DATA_API_CONTAINMENT_RETRY_20260722_001_PHASE_1',
  successor_attempt_id: 'FP-DATA-API-CONTAINMENT-RETRY-20260722-001',
  successor_attempt_limit: 1,
  successor_attempts_executed: 1,
  successor_consumed: true,
  successor_phase_1_read_only_preflight_authorized: true,
  successor_phase_1_read_only_preflight_event_id: 'onv1_91bc84da2b5f35266806a86254324c909c2304d091ee7e1c1115e0be7b6a8a95',
  successor_wave_0_executor_proof_event_id: 'onv1_9f8145b6028efce6263294084eb0efe12348a83ad1e3f8a0ec6d8ab1f304de8c',
  successor_action_time_authorization_event_id: 'onv1_132038502d473bd0a6ff6f8715bb4df297044c22f5d4820c2d5e9e43cb4f71c0',
  successor_provider_execution_authorized: true,
  successor_action_time_confirmation_required: true,
  successor_provider_terminal_event_id: 'onv1_a5e6091818d5278c2c99e22f0fa0a72547972ab2fcdf0512510ff85cbe6e1892',
  successor_ops_settlement_event_id: 'onv1_7276afe9f3c4caf8ea8ddea9f8f3f839b0974ea9371647f3073a5816e8fe1f44',
  successor_terminal_result: 'TERMINAL_EXACT_DATA_API_CONTAINMENT_SUCCESS',
  successor_dashboard_save_attempts: 1,
  successor_settings_patch_status: 204,
  successor_data_api_state: 'DISABLED',
  successor_exposed_schemas: Object.freeze([]),
  successor_extra_search_path: Object.freeze(['extensions']),
  successor_automatic_exposure: 'OFF',
  current_governance_manifest_sha256: 'c5b77a350fbe49a13e46bf2d8452364a9f0bc1ab3d116c7e9b4432d5542d5c0f',
  support_evidence_event_id: 'onv1_55591cb81248118dcfeda1db7e9fde7f713373eb6c059f8aada78789e1f5e4fa',
  support_evidence_payload_sha256: '55591cb81248118dcfeda1db7e9fde7f713373eb6c059f8aada78789e1f5e4fa',
  management_api_contract_status: 'BLOCKED',
  management_api_requests_authorized: false,
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
  governance_manifest_sha256: '82e7ecad9a68addff14c43c3bc237c54af2dd5d48cda454c0e1c121a3e4536ec',
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

export function storageEdgeRealtimeComponentDigest(component, omittedKeys = ['aggregate_sha256']) {
  const omitted = new Set(omittedKeys);
  return canonicalDigest(Object.fromEntries(
    Object.entries(component ?? {}).filter(([key]) => !omitted.has(key))
  ));
}

export function storageEdgeRealtimeDataApiProjectionDigest(projection) {
  return canonicalDigest({
    status: projection?.status,
    observed_at: projection?.observed_at,
    observer_identity_sha256: projection?.observer_identity_sha256,
    evidence_receipt_sha256: projection?.evidence_receipt_sha256,
    enabled: projection?.enabled,
    exposed_schemas: projection?.exposed_schemas,
    extra_search_path: projection?.extra_search_path,
    automatic_public_exposure: projection?.automatic_public_exposure
  });
}

export function storageEdgeRealtimeOutboundReadDigest(units, read) {
  return canonicalDigest({
    model: 'STORAGE_EDGE_REALTIME_OUTBOUND_READ_V1',
    units,
    inventory_count: read?.inventory_count,
    history_count: read?.history_count,
    external_effect_count: read?.external_effect_count
  });
}

export function storageEdgeRealtimeZeroEffectDigest(receipt) {
  return canonicalDigest({
    model: 'STORAGE_EDGE_REALTIME_ZERO_EFFECT_EVIDENCE_V1',
    subject_sha256: receipt?.zero_effects?.subject_sha256,
    run_correlation_sha256: receipt?.zero_effects?.run_correlation_sha256,
    observed_at: receipt?.zero_effects?.observed_at,
    observer_identity_sha256: receipt?.zero_effects?.observer_identity_sha256,
    execution_identity_sha256: receipt?.zero_effects?.execution_identity_sha256,
    complete_denominator: receipt?.zero_effects?.complete_denominator,
    counts: Object.fromEntries(storageEdgeRealtimeZeroEffectFields.map((field) => [field, receipt?.zero_effects?.[field]]))
  });
}

export function storageEdgeRealtimeExpectedStateDigest(receipt) {
  return canonicalDigest({
    model: 'STORAGE_EDGE_REALTIME_EXPECTED_STATE_V1',
    subject_sha256: receipt?.subject_sha256,
    run_correlation_sha256: receipt?.run_correlation_sha256,
    package: receipt?.package,
    bundle_evidence: {
      manifest_sha256: receipt?.bundle_evidence?.manifest_sha256,
      reviewer_receipt_sha256: receipt?.bundle_evidence?.reviewer_receipt_sha256,
      reviewed_expected_state_receipt_sha256: receipt?.bundle_evidence?.reviewed_expected_state_receipt_sha256
    },
    storage_aggregate_sha256: receipt?.storage?.aggregate_sha256,
    edge_aggregate_sha256: receipt?.edge?.aggregate_sha256,
    realtime_aggregate_sha256: receipt?.realtime?.aggregate_sha256,
    outbound_aggregate_sha256: receipt?.outbound?.aggregate_sha256,
    data_api_postimage_sha256: receipt?.data_api?.postimage?.projection_sha256
  });
}

export function storageEdgeRealtimeTerminalReceiptDigest(receipt) {
  const { terminal_receipt_sha256: _ignored, ...subject } = receipt ?? {};
  return canonicalDigest({
    model: 'STORAGE_EDGE_REALTIME_TERMINAL_RECEIPT_V1',
    receipt: subject
  });
}

export function storageEdgeRealtimePerSurfaceReceiptSetDigest(receipt) {
  return canonicalDigest({
    model: 'STORAGE_EDGE_REALTIME_PER_SURFACE_ROLLBACK_SET_V1',
    subject_sha256: receipt?.rollback?.subject_sha256,
    run_correlation_sha256: receipt?.rollback?.run_correlation_sha256,
    edge_undeploy_receipt_sha256: receipt?.edge?.undeploy?.receipt_sha256,
    edge_credential_revocation_receipt_sha256: receipt?.edge?.credential_revocation?.receipt_sha256,
    realtime_rollback_receipt_sha256: receipt?.realtime?.rollback?.receipt_sha256
  });
}

export function storageEdgeRealtimeForwardEvidenceAuthenticationSubject(receipt) {
  const bundle = receipt?.bundle_evidence ?? {};
  const preimage = receipt?.data_api?.preimage ?? {};
  const postimage = receipt?.data_api?.postimage ?? {};
  const completeReads = receipt?.complete_reads ?? {};
  const zeroEffects = receipt?.zero_effects ?? {};
  return {
    model: 'STORAGE_EDGE_REALTIME_FORWARD_EVIDENCE_LEDGER_V1',
    evidence_classes: storageEdgeRealtimeForwardEvidenceClasses,
    contract_id: receipt?.contract_id,
    contract_version: receipt?.version,
    subject_sha256: receipt?.subject_sha256,
    run_correlation_sha256: receipt?.run_correlation_sha256,
    trusted_action_time: receipt?.validated_at,
    package: receipt?.package,
    bundle_review: {
      reviewed_at: bundle.reviewed_at,
      manifest_sha256: bundle.manifest_sha256,
      reviewer_receipt_sha256: bundle.reviewer_receipt_sha256,
      reviewed_expected_state_receipt_sha256: bundle.reviewed_expected_state_receipt_sha256
    },
    data_api_preimage: {
      observed_at: preimage.observed_at,
      observer_identity_sha256: preimage.observer_identity_sha256,
      evidence_receipt_sha256: preimage.evidence_receipt_sha256,
      projection_sha256: preimage.projection_sha256
    },
    data_api_postimage: {
      observed_at: postimage.observed_at,
      observer_identity_sha256: postimage.observer_identity_sha256,
      evidence_receipt_sha256: postimage.evidence_receipt_sha256,
      projection_sha256: postimage.projection_sha256
    },
    complete_reads: {
      expected_state_sha256: completeReads.expected_state_sha256,
      read_a: completeReads.read_a,
      read_b: completeReads.read_b
    },
    zero_effect: {
      observed_at: zeroEffects.observed_at,
      observer_identity_sha256: zeroEffects.observer_identity_sha256,
      execution_identity_sha256: zeroEffects.execution_identity_sha256,
      complete_denominator: zeroEffects.complete_denominator,
      counts: Object.fromEntries(storageEdgeRealtimeZeroEffectFields.map((field) => [field, zeroEffects[field]])),
      evidence_receipt_sha256: zeroEffects.evidence_receipt_sha256
    }
  };
}

export function storageEdgeRealtimeRollbackAuthenticationSubject(receipt, evidenceClass) {
  const rollback = receipt?.rollback ?? {};
  const evidenceField = {
    PER_SURFACE_ROLLBACK: 'per_surface_receipt_set_sha256',
    DISPOSAL_ABSENCE: 'disposal_absence_receipt_sha256',
    CREDENTIAL_REVOCATION: 'credential_revocation_receipt_sha256'
  }[evidenceClass];
  return {
    model: 'STORAGE_EDGE_REALTIME_ROLLBACK_AUTHENTICATION_V1',
    evidence_class: evidenceClass,
    subject_sha256: rollback.subject_sha256,
    run_correlation_sha256: rollback.run_correlation_sha256,
    completed_at: rollback.completed_at,
    inverse_order: rollback.inverse_order,
    preimage_restored: rollback.preimage_restored,
    evidence_receipt_sha256: rollback[evidenceField],
    broad_drop_used: rollback.broad_drop_used,
    execution_authorized_by_source_contract: rollback.execution_authorized_by_source_contract
  };
}

function authAppDataPrerequisiteSetSha256(receipt) {
  return canonicalDigest(receipt?.prerequisites ?? []);
}

function authAppDataAuthorityReceiptSubject(receipt, authority) {
  return {
    model: 'AUTH_APP_DATA_EXECUTION_AUTHORITY_V1',
    status: authority?.status,
    authorized_operation: authority?.authorized_operation,
    subject_sha256: authority?.subject_sha256,
    run_correlation_sha256: authority?.run_correlation_sha256,
    contract_binding_set_sha256: authority?.contract_binding_set_sha256,
    migration_package_sha256: authority?.migration_package_sha256,
    governance_manifest_sha256: authority?.governance_manifest_sha256,
    prerequisite_set_sha256: authority?.prerequisite_set_sha256,
    authority_identity_sha256: authority?.authority_identity_sha256,
    executor_identity_sha256: authority?.executor_identity_sha256,
    executor_capability_sha256: authority?.executor_capability_sha256
  };
}

function authAppDataExecutorReceiptSubject(receipt, authority) {
  return {
    model: 'AUTH_APP_DATA_EXECUTOR_BINDING_V1',
    authorized_operation: authority?.authorized_operation,
    subject_sha256: receipt?.subject_sha256,
    run_correlation_sha256: receipt?.run_correlation_sha256,
    contract_binding_set_sha256: receipt?.contract_binding_set_sha256,
    package: receipt?.package,
    prerequisite_set_sha256: authAppDataPrerequisiteSetSha256(receipt),
    authority_identity_sha256: authority?.authority_identity_sha256,
    executor_identity_sha256: authority?.executor_identity_sha256,
    executor_capability_sha256: authority?.executor_capability_sha256
  };
}

function targetBootstrapAuthorityReceiptSubject(contract, receipt) {
  return {
    model: 'DISPOSABLE_TARGET_BOOTSTRAP_APPLY_AUTHORITY_V1',
    contract_version: receipt?.authority_contract_version,
    status: receipt?.status,
    authorized_operation: receipt?.authorized_operation,
    subject_sha256: receipt?.identity?.disposable_project_identity_sha256,
    run_correlation_sha256: receipt?.run_correlation_sha256,
    migration_count: receipt?.package?.migration_count,
    migration_package_sha256: receipt?.package?.migration_package_sha256,
    governance_manifest_sha256: receipt?.package?.governance_manifest_sha256,
    executable_bundle_sha256: receipt?.package?.executable_bundle_sha256,
    expected_state_binding_sha256: receipt?.package?.expected_state_binding_sha256,
    authority_identity_sha256: receipt?.authority_identity_sha256,
    authority_event_id: receipt?.authority_event_id,
    authority_event_payload_sha256: receipt?.authority_event_payload_sha256,
    authority_issued_at: receipt?.authority_issued_at,
    authority_authorized_at: receipt?.authority_authorized_at,
    authority_observed_at: receipt?.authority_observed_at,
    authority_expires_at: receipt?.authority_expires_at,
    authority_maximum_age_seconds: receipt?.authority_maximum_age_seconds,
    source_contract_id: contract?.contract_id
  };
}

function targetBootstrapZeroEffectReceiptSubject(receipt) {
  const externalEffects = receipt?.external_effects ?? {};
  return {
    model: 'SUBJECT_RUN_ZERO_EFFECT_OBSERVATION_V1',
    subject_sha256: externalEffects.subject_sha256,
    run_correlation_sha256: externalEffects.run_correlation_sha256,
    observed_at: externalEffects.observed_at,
    observer_identity_sha256: externalEffects.observer_identity_sha256,
    execution_identity_sha256: externalEffects.execution_identity_sha256,
    complete_denominator: externalEffects.complete_denominator,
    counts: Object.fromEntries(targetBootstrapZeroEffectFields.map((field) => [field, externalEffects[field]]))
  };
}

function authAppDataWriteBarrierAuthoritySubject(receipt) {
  const barrier = receipt?.write_barrier ?? {};
  return {
    model: 'AUTH_APP_DATA_WRITE_BARRIER_AUTHORITY_V1',
    status: barrier.status,
    authorized_operation: barrier.authorized_operation,
    contract_version: barrier.contract_version,
    subject_sha256: barrier.subject_sha256,
    run_correlation_sha256: barrier.run_correlation_sha256,
    contract_binding_set_sha256: barrier.contract_binding_set_sha256,
    migration_package_sha256: barrier.migration_package_sha256,
    governance_manifest_sha256: barrier.governance_manifest_sha256,
    prerequisite_set_sha256: barrier.prerequisite_set_sha256,
    source_scope_sha256: barrier.source_scope_sha256,
    authority_identity_sha256: barrier.authority_identity_sha256,
    authority_event_id: barrier.authority_event_id,
    authority_event_payload_sha256: barrier.authority_event_payload_sha256,
    authority_issued_at: barrier.authority_issued_at,
    authority_authorized_at: barrier.authority_authorized_at,
    authority_observed_at: barrier.authority_observed_at,
    authority_expires_at: barrier.authority_expires_at,
    authority_maximum_age_seconds: barrier.authority_maximum_age_seconds,
    entered_at: barrier.entered_at,
    released_at: barrier.released_at
  };
}

function authorityEventConsumptionSubject(model, validationContext) {
  const evidence = validationContext?.consumption_evidence ?? {};
  return {
    model,
    trusted_action_time: validationContext?.trusted_action_time,
    subject_sha256: evidence.subject_sha256,
    run_correlation_sha256: evidence.run_correlation_sha256,
    authority_event_id: evidence.authority_event_id,
    authority_event_payload_sha256: evidence.authority_event_payload_sha256,
    authority_receipt_sha256: evidence.authority_receipt_sha256,
    observer_identity_sha256: evidence.observer_identity_sha256,
    consumed_at: evidence.consumed_at,
    ledger_observed_at: evidence.ledger_observed_at,
    ledger_sequence: evidence.ledger_sequence,
    prior_consumption_count: evidence.prior_consumption_count,
    current_consumption_count: evidence.current_consumption_count,
    transition: evidence.transition,
    ledger_preimage_sha256: evidence.ledger_preimage_sha256,
    ledger_postimage_sha256: evidence.ledger_postimage_sha256
  };
}

function authAppDataExpectedStateSubject(receipt) {
  const finalS2 = (receipt?.snapshots ?? []).find((snapshot) => snapshot?.name === 'S2') ?? null;
  return {
    version: authAppDataExpectedStateModel.version,
    subject_sha256: receipt?.subject_sha256,
    run_correlation_sha256: receipt?.run_correlation_sha256,
    contract_binding_set_sha256: receipt?.contract_binding_set_sha256,
    package: receipt?.package,
    auth_surfaces: receipt?.auth_surfaces,
    application_data: receipt?.application_data,
    identity_ledger: receipt?.identity_ledger,
    final_s2: finalS2
  };
}

function authAppDataSignedBytes(signatureDomain, subject) {
  return Buffer.from(`${signatureDomain}\n${JSON.stringify(subject, null, 2)}\n`, 'utf8');
}

function authAppDataNonzeroCommitment(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value) && value !== '0'.repeat(64);
}

function authAppDataVerifyAuthentication(subject, authentication, policy) {
  const trustAnchor = policy?.trust_anchor ?? {};
  if (trustAnchor.status !== 'CURRENT'
    || trustAnchor.algorithm !== 'Ed25519'
    || typeof trustAnchor.key_id !== 'string'
    || trustAnchor.key_id === 'UNKNOWN'
    || typeof trustAnchor.public_key_spki_base64 !== 'string'
    || !authAppDataNonzeroCommitment(trustAnchor.public_key_spki_sha256)
    || authentication?.algorithm !== 'Ed25519'
    || authentication?.key_id !== trustAnchor.key_id
    || authentication?.public_key_spki_sha256 !== trustAnchor.public_key_spki_sha256
    || authentication?.signed_payload_sha256 !== canonicalDigest(subject)
    || typeof authentication?.signature_base64 !== 'string') {
    return false;
  }
  try {
    const publicKeyBytes = Buffer.from(trustAnchor.public_key_spki_base64, 'base64');
    const signatureBytes = Buffer.from(authentication.signature_base64, 'base64');
    if (publicKeyBytes.toString('base64') !== trustAnchor.public_key_spki_base64
      || signatureBytes.toString('base64') !== authentication.signature_base64
      || signatureBytes.length !== 64
      || crypto.createHash('sha256').update(publicKeyBytes).digest('hex') !== trustAnchor.public_key_spki_sha256) {
      return false;
    }
    const publicKey = crypto.createPublicKey({ key: publicKeyBytes, format: 'der', type: 'spki' });
    return publicKey.asymmetricKeyType === 'ed25519'
      && crypto.verify(null, authAppDataSignedBytes(policy.signature_domain, subject), publicKey, signatureBytes);
  } catch {
    return false;
  }
}

function collectStatusValues(value, pointer = '$', output = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      collectStatusValues(entry, `${pointer}[${index}]`, output);
    });
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
      value.forEach((entry) => {
        inspect(entry);
      });
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

function isSha256(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function isNonzeroSha256(value) {
  return isSha256(value) && !/^0{64}$/.test(value);
}

function isFreshObservation(observedAt, validatedAt, maximumAgeSeconds) {
  const observed = Date.parse(observedAt);
  const validated = Date.parse(validatedAt);
  return Number.isFinite(observed)
    && Number.isFinite(validated)
    && observed <= validated
    && validated - observed <= maximumAgeSeconds * 1000;
}

function validateTargetBootstrapReceiptSanitization(receipt) {
  const failures = [];
  const forbiddenKeyPatterns = [
    [/^project_?refs?$/i, 'FORBIDDEN_FIELD_PROJECT_REFS'],
    [/(?:^|_)secrets?$/i, 'FORBIDDEN_FIELD_SECRETS'],
    [/(?:^|_)(?:credentials?|api_?keys?|passwords?|tokens?)$/i, 'FORBIDDEN_FIELD_CREDENTIALS'],
    [/^(?:raw_?)?(?:sql|catalog_?rows?|identity_?values?)$/i, 'FORBIDDEN_FIELD_RAW_EVIDENCE'],
    [/^provider_?responses?$/i, 'FORBIDDEN_FIELD_PROVIDER_RESPONSES'],
    [/^(?:urls?|emails?|usernames?|uuids?|pii|machine_?paths?)$/i, 'FORBIDDEN_FIELD_SENSITIVE_VALUES']
  ];
  const classifyString = (value) => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'EMAIL';
    if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) return 'UUID';
    if (/^[a-z]{20}$/.test(value)) return 'PROJECT_REF';
    if (/^(?:[A-Za-z]:\\|\/(?:home|Users|tmp|var|workspace)\/)/.test(value)) return 'MACHINE_PATH';
    if (/^https?:\/\//i.test(value)) return 'URL';
    if (/\b(?:select\s+.+\s+from|insert\s+into|update\s+.+\s+set|delete\s+from|create\s+(?:table|function|schema)|alter\s+(?:table|function|schema)|drop\s+(?:table|function|schema))\b/i.test(value)) return 'SQL';
    if (/^(?:gh[pousr]_[A-Za-z0-9]{20,}|(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{16,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})$/.test(value)) return 'CREDENTIAL';
    return null;
  };
  const inspect = (value) => {
    if (Array.isArray(value)) {
      value.forEach(inspect);
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, entry] of Object.entries(value)) {
        for (const [pattern, code] of forbiddenKeyPatterns) {
          if (pattern.test(key)) failures.push(code);
        }
        inspect(entry);
      }
      return;
    }
    if (typeof value === 'string') {
      const classification = classifyString(value);
      if (classification) failures.push(`FORBIDDEN_VALUE_${classification}`);
    }
  };
  inspect(receipt);
  return failures.sort((left, right) => left.localeCompare(right));
}

export function validateDisposableTargetBootstrapReceipt(contract, receipt, validationContext = null) {
  const failures = [];
  const requireReceipt = (condition, message) => {
    if (!condition) failures.push(`target bootstrap receipt: ${message}`);
  };
  const bindings = contract?.immutable_bindings ?? {};
  const identity = receipt?.identity ?? {};
  const preimage = receipt?.preimage ?? {};
  const dataApi = receipt?.data_api ?? {};
  const extensions = receipt?.extensions ?? {};
  const catalogReads = receipt?.catalog_reads ?? {};
  const security = receipt?.security ?? {};
  const externalEffects = receipt?.external_effects ?? {};
  const negativeProbes = receipt?.negative_probes ?? {};
  const rollback = receipt?.rollback ?? {};
  const packageBinding = receipt?.package ?? {};
  const subjectSha256 = identity.disposable_project_identity_sha256;
  const runCorrelationSha256 = receipt?.run_correlation_sha256;
  const zeroSha256 = /^0{64}$/;
  const expectedStateBinding = canonicalDigest({
    model: 'PACKAGE_BUNDLE_CATALOG_SECURITY_V1',
    run_correlation_sha256: runCorrelationSha256,
    subject_sha256: subjectSha256,
    migration_count: packageBinding.migration_count,
    migration_package_sha256: packageBinding.migration_package_sha256,
    governance_manifest_sha256: packageBinding.governance_manifest_sha256,
    executable_bundle_sha256: packageBinding.executable_bundle_sha256,
    reviewed_expected_state_receipt_sha256: packageBinding.reviewed_expected_state_receipt_sha256,
    expected_catalog_sha256: packageBinding.expected_catalog_sha256,
    expected_security_sha256: packageBinding.expected_security_sha256
  });
  const authorityBinding = canonicalDigest({
    model: 'SUBJECT_RUN_BOOTSTRAP_APPLY_AUTHORITY_V1',
    authorized_operation: receipt?.authorized_operation,
    authority_receipt_sha256: receipt?.authority_receipt_sha256,
    subject_sha256: subjectSha256,
    run_correlation_sha256: runCorrelationSha256,
    migration_count: packageBinding.migration_count,
    migration_package_sha256: packageBinding.migration_package_sha256,
    governance_manifest_sha256: packageBinding.governance_manifest_sha256,
    executable_bundle_sha256: packageBinding.executable_bundle_sha256,
    expected_state_binding_sha256: packageBinding.expected_state_binding_sha256
  });
  const protectedInventoryBinding = canonicalDigest({
    model: 'CANONICAL_PROVIDER_INVENTORY_V1',
    subject_sha256: subjectSha256,
    run_correlation_sha256: runCorrelationSha256,
    observed_at: identity.observed_at,
    provider_inventory_snapshot_sha256: identity.provider_inventory_snapshot_sha256,
    provider_inventory_completeness_receipt_sha256: identity.provider_inventory_completeness_receipt_sha256,
    pagination_page_count: identity.pagination_page_count,
    pagination_item_count: identity.pagination_item_count,
    pagination_exhausted: identity.pagination_exhausted,
    protected_project_identity_sha256s: identity.protected_project_identity_sha256s
  });
  const rollbackCapabilityBinding = canonicalDigest({
    model: 'SUBJECT_RUN_ROLLBACK_CAPABILITY_V1',
    subject_sha256: rollback.subject_sha256,
    run_correlation_sha256: rollback.run_correlation_sha256,
    preimage_sha256: rollback.preimage_sha256,
    plan_sha256: rollback.plan_sha256,
    authority_receipt_sha256: rollback.authority_receipt_sha256,
    credential_revocation_plan_sha256: rollback.credential_revocation_plan_sha256
  });
  const terminalProofBinding = canonicalDigest({
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

  requireReceipt(receipt?.schema_version === '1.0.0', 'schema version drift');
  requireReceipt(['CURRENT', 'BLOCKED'].includes(receipt?.status), 'status must be CURRENT or BLOCKED');
  requireReceipt(receipt?.execution_lifecycle === 'EXECUTION_BLOCKED', 'execution lifecycle promotion is forbidden');
  requireReceipt(receipt?.apply_admitted === false, 'apply promotion is forbidden');
  requireReceipt(receipt?.source_contract_grants_provider_authority === false, 'source contract cannot grant provider authority');
  requireReceipt(receipt?.source_contract_grants_apply === false, 'source contract cannot grant apply authority');
  requireReceipt(receipt?.authorized_operation === 'GUARDED_DISPOSABLE_TARGET_BOOTSTRAP_APPLY', 'authorized operation must be the guarded disposable target bootstrap apply');
  requireReceipt(packageBinding.migration_count === bindings.migration_count, 'migration count binding drift');
  requireReceipt(packageBinding.migration_package_sha256 === bindings.migration_package_sha256, 'migration package digest mismatch');
  requireReceipt(packageBinding.governance_manifest_sha256 === bindings.governance_manifest_sha256, 'governance manifest digest mismatch');
  requireReceipt(packageBinding.standard_migration_sql_count === 0, 'standard migration SQL must remain absent');
  requireReceipt(Array.isArray(identity.protected_project_identity_sha256s) && identity.protected_project_identity_sha256s.length >= 4, 'complete protected-project digest set is required');
  requireReceipt((identity.protected_project_identity_sha256s ?? []).every(isSha256), 'protected-project identities must be SHA-256 digests');
  requireReceipt(new Set(identity.protected_project_identity_sha256s ?? []).size === (identity.protected_project_identity_sha256s ?? []).length, 'protected-project identity digests must be unique');
  requireReceipt(identity.protected_project_count === (identity.protected_project_identity_sha256s ?? []).length, 'protected-project count must match the complete digest set');
  requireReceipt(isSha256(identity.disposable_project_identity_sha256), 'disposable identity must be a SHA-256 digest');
  requireReceipt(!(identity.protected_project_identity_sha256s ?? []).includes(identity.disposable_project_identity_sha256), 'protected-project reuse is forbidden');
  requireReceipt(identity.disposable_not_protected === true, 'disposable identity must be proven outside the protected set');
  requireReceipt(rollback.source_projects_active === true && rollback.source_mutation_count === 0, 'source projects must remain active and unmodified');
  requireReceipt(rollback.broad_drop_used === false, 'broad drop is not rollback');
  failures.push(...validateTargetBootstrapReceiptSanitization(receipt).map((failure) => `target bootstrap receipt: ${failure}`));

  if (receipt?.status === 'BLOCKED') {
    requireReceipt(canonicalDigest(receipt) === canonicalDigest(contract?.receipt_example), 'BLOCKED receipt must equal the complete canonical checked-in projection');
    requireReceipt(receipt.evidence_complete === false, 'BLOCKED evidence cannot claim completeness');
    requireReceipt(receipt?.validated_at === null, 'BLOCKED evidence cannot claim validation time');
    requireReceipt(receipt?.authority_identity_sha256 === '0'.repeat(64)
      && receipt?.authority_event_id === null
      && receipt?.authority_event_payload_sha256 === '0'.repeat(64)
      && receipt?.authority_issued_at === null
      && receipt?.authority_authorized_at === null
      && receipt?.authority_observed_at === null
      && receipt?.authority_expires_at === null
      && receipt?.authority_receipt_sha256 === '0'.repeat(64)
      && receipt?.authority_binding_sha256 === '0'.repeat(64)
      && receipt?.authority_authentication?.key_id === 'UNKNOWN'
      && receipt?.authority_authentication?.public_key_spki_sha256 === null
      && receipt?.authority_authentication?.signed_payload_sha256 === '0'.repeat(64)
      && receipt?.authority_authentication?.signature_base64 === 'AA==', 'checked-in BLOCKED receipt cannot claim authenticated apply authority');
    requireReceipt(preimage.status === 'UNKNOWN'
      && dataApi.status === 'BLOCKED'
      && extensions.status === 'UNKNOWN'
      && catalogReads.status === 'BLOCKED'
      && security.status === 'BLOCKED'
      && externalEffects.status === 'BLOCKED'
      && negativeProbes.status === 'BLOCKED'
      && rollback.status === 'BLOCKED', 'BLOCKED evidence cannot contain nested CURRENT execution claims');
    requireReceipt(exactOrderedValues(receipt?.completed_actions, []), 'BLOCKED evidence cannot claim completed actions');
    requireReceipt(externalEffects.observed_at === null
      && externalEffects.observer_identity_sha256 === '0'.repeat(64)
      && externalEffects.execution_identity_sha256 === '0'.repeat(64)
      && externalEffects.complete_denominator === false
      && externalEffects.evidence_receipt_sha256 === '0'.repeat(64), 'BLOCKED evidence cannot claim zero-effect observation evidence');
    return failures.sort((left, right) => left.localeCompare(right));
  }

  requireReceipt(receipt.evidence_complete === true, 'CURRENT evidence must be complete');
  requireReceipt(isNonzeroSha256(runCorrelationSha256), 'CURRENT evidence requires one nonzero run-correlation digest');
  const authoritySubject = targetBootstrapAuthorityReceiptSubject(contract, receipt);
  requireReceipt(receipt.authority_contract_version === contract?.version, 'apply authority contract-version binding mismatch');
  requireReceipt(isNonzeroSha256(receipt.authority_identity_sha256), 'CURRENT evidence requires a nonzero authority identity');
  requireReceipt(receipt.authority_maximum_age_seconds === contract?.execution_authentication?.authority?.freshness_seconds_maximum, 'apply authority maximum-age policy mismatch');
  requireReceipt(/^onv1_[0-9a-f]{64}$/.test(receipt.authority_event_id ?? '')
    && receipt.authority_event_id === `onv1_${receipt.authority_event_payload_sha256}`
    && isNonzeroSha256(receipt.authority_event_payload_sha256), 'apply authority event identity does not match its payload digest');
  const authorityIssuedAt = Date.parse(receipt.authority_issued_at);
  const authorityAuthorizedAt = Date.parse(receipt.authority_authorized_at);
  const authorityObservedAt = Date.parse(receipt.authority_observed_at);
  const authorityExpiresAt = Date.parse(receipt.authority_expires_at);
  const authorityValidatedAt = Date.parse(receipt.validated_at);
  const trustedActionTime = Date.parse(validationContext?.trusted_action_time);
  requireReceipt([authorityIssuedAt, authorityAuthorizedAt, authorityObservedAt, authorityExpiresAt, authorityValidatedAt, trustedActionTime].every(Number.isFinite), 'apply authority freshness or trusted action-time timestamp is invalid');
  requireReceipt(authorityIssuedAt <= authorityAuthorizedAt
    && authorityAuthorizedAt <= authorityObservedAt
    && authorityObservedAt <= authorityValidatedAt
    && authorityValidatedAt <= trustedActionTime
    && trustedActionTime <= authorityExpiresAt, 'apply authority issuance, authorization, observation, receipt validation, trusted action time, and expiry chronology is invalid');
  requireReceipt(trustedActionTime - authorityAuthorizedAt <= receipt.authority_maximum_age_seconds * 1000
    && authorityExpiresAt - authorityAuthorizedAt <= receipt.authority_maximum_age_seconds * 1000, 'apply authority is stale, expired, or exceeds the contract maximum age');
  requireReceipt(isNonzeroSha256(receipt.authority_receipt_sha256), 'CURRENT evidence requires a nonzero authority receipt digest');
  requireReceipt(receipt.authority_receipt_sha256 === canonicalDigest(authoritySubject), 'apply authority receipt does not bind the exact contract, operation, subject, run, package, reviewed bundle, and authority identity');
  requireReceipt(receipt.authority_binding_sha256 === authorityBinding, 'apply authority must bind the guarded operation, subject, run, package, and reviewed bundle');
  requireReceipt(authAppDataVerifyAuthentication(authoritySubject, receipt.authority_authentication, contract?.execution_authentication?.authority), 'apply authority authentication does not verify against the pinned source-authorized trust anchor');
  requireReceipt(contract?.execution_authentication?.authority?.trust_anchor?.key_id !== contract?.execution_authentication?.consumption?.trust_anchor?.key_id
    && contract?.execution_authentication?.authority?.trust_anchor?.public_key_spki_sha256 !== contract?.execution_authentication?.consumption?.trust_anchor?.public_key_spki_sha256, 'apply authority and one-time consumption trust anchors must be distinct');
  const consumptionEvidence = validationContext?.consumption_evidence ?? {};
  const consumptionSubject = authorityEventConsumptionSubject('DISPOSABLE_TARGET_BOOTSTRAP_APPLY_AUTHORITY_CONSUMPTION_V1', validationContext);
  requireReceipt(consumptionEvidence.subject_sha256 === identity.disposable_project_identity_sha256
    && consumptionEvidence.run_correlation_sha256 === runCorrelationSha256
    && consumptionEvidence.authority_event_id === receipt.authority_event_id
    && consumptionEvidence.authority_event_payload_sha256 === receipt.authority_event_payload_sha256
    && consumptionEvidence.authority_receipt_sha256 === receipt.authority_receipt_sha256, 'apply authority consumption evidence must bind the exact subject, run, event, payload, and authority receipt');
  requireReceipt(consumptionEvidence.consumed_at === validationContext?.trusted_action_time
    && consumptionEvidence.ledger_observed_at === validationContext?.trusted_action_time, 'apply authority consumption evidence must be observed and consumed at the injected trusted action time');
  requireReceipt(consumptionEvidence.prior_consumption_count === 0
    && consumptionEvidence.current_consumption_count === 1
    && consumptionEvidence.transition === 'UNCONSUMED_TO_CONSUMED', 'apply authority event was already consumed or lacks an exact one-time transition');
  requireReceipt(Number.isInteger(consumptionEvidence.ledger_sequence) && consumptionEvidence.ledger_sequence >= 1, 'apply authority consumption evidence requires a positive external ledger sequence');
  requireReceipt(isNonzeroSha256(consumptionEvidence.observer_identity_sha256)
    && consumptionEvidence.observer_identity_sha256 !== receipt.authority_identity_sha256, 'apply authority consumption observer must be nonzero and distinct from the authority');
  requireReceipt(isNonzeroSha256(consumptionEvidence.ledger_preimage_sha256)
    && isNonzeroSha256(consumptionEvidence.ledger_postimage_sha256)
    && consumptionEvidence.ledger_preimage_sha256 !== consumptionEvidence.ledger_postimage_sha256, 'apply authority consumption requires distinct nonzero external ledger preimage and postimage commitments');
  requireReceipt(consumptionEvidence.evidence_receipt_sha256 === canonicalDigest(consumptionSubject), 'apply authority consumption receipt does not bind the trusted action-time ledger transition');
  requireReceipt(authAppDataVerifyAuthentication(consumptionSubject, consumptionEvidence.authentication, contract?.execution_authentication?.consumption), 'apply authority consumption evidence does not verify against the distinct pinned consumption trust anchor');
  requireReceipt(isNonzeroSha256(packageBinding.executable_bundle_sha256), 'CURRENT evidence requires an exact reviewed executable bundle digest');
  requireReceipt(isNonzeroSha256(packageBinding.reviewed_expected_state_receipt_sha256), 'CURRENT evidence requires a reviewed expected-state receipt digest');
  requireReceipt(isNonzeroSha256(packageBinding.expected_catalog_sha256), 'CURRENT evidence requires a reviewed expected catalog digest');
  requireReceipt(isNonzeroSha256(packageBinding.expected_security_sha256), 'CURRENT evidence requires a reviewed expected security digest');
  requireReceipt(packageBinding.expected_state_binding_sha256 === expectedStateBinding, 'reviewed package/bundle/catalog/security expected-state binding mismatch');
  requireReceipt(isNonzeroSha256(receipt.terminal_receipt_sha256), 'CURRENT evidence requires a terminal receipt digest');
  requireReceipt(identity.inventory_complete === true && isNonzeroSha256(identity.protected_inventory_sha256), 'CURRENT evidence requires a complete protected-project inventory digest');
  requireReceipt(identity.subject_sha256 === subjectSha256 && identity.run_correlation_sha256 === runCorrelationSha256, 'identity observation must bind the disposable subject and run');
  requireReceipt(
    (identity.protected_project_identity_sha256s ?? []).every((value, index, values) => index === 0 || values[index - 1].localeCompare(value) < 0),
    'protected-project identity digests must use strict canonical order'
  );
  requireReceipt(isNonzeroSha256(identity.provider_inventory_snapshot_sha256), 'CURRENT evidence requires a provider inventory snapshot digest');
  requireReceipt(isNonzeroSha256(identity.provider_inventory_completeness_receipt_sha256), 'CURRENT evidence requires provider inventory completeness evidence');
  requireReceipt(
    new Set([
      identity.provider_inventory_snapshot_sha256,
      identity.provider_inventory_completeness_receipt_sha256,
      identity.protected_inventory_sha256
    ]).size === 3,
    'provider inventory snapshot, completeness receipt, and canonical inventory digests must be distinct'
  );
  requireReceipt(Number.isInteger(identity.pagination_page_count) && identity.pagination_page_count >= 1, 'provider inventory pagination must include at least one page');
  requireReceipt(identity.pagination_page_count <= identity.pagination_item_count, 'provider inventory page count cannot exceed its item denominator');
  requireReceipt(identity.pagination_item_count === identity.protected_project_count, 'provider inventory pagination item count must match the protected-project denominator');
  requireReceipt(identity.pagination_exhausted === true, 'provider inventory pagination must be exhausted');
  requireReceipt(identity.protected_inventory_sha256 === protectedInventoryBinding, 'protected-project inventory digest must match the canonical complete provider inventory');

  for (const [label, observation] of [
    ['preimage', preimage],
    ['Data API', dataApi],
    ['extensions', extensions],
    ['catalog reads', catalogReads],
    ['catalog read A', catalogReads.read_a],
    ['catalog read B', catalogReads.read_b],
    ['security', security],
    ['external effects', externalEffects],
    ['negative probes', negativeProbes],
    ['rollback', rollback]
  ]) {
    requireReceipt(
      observation?.subject_sha256 === subjectSha256 && observation?.run_correlation_sha256 === runCorrelationSha256,
      `${label} observation must bind the disposable subject and run`
    );
  }

  for (const [label, observedAt] of [
    ['identity', identity.observed_at],
    ['preimage', preimage.observed_at],
    ['catalog read A', catalogReads.read_a?.observed_at],
    ['catalog read B', catalogReads.read_b?.observed_at]
  ]) {
    requireReceipt(isFreshObservation(observedAt, receipt.validated_at, contract.preimage_gate.freshness_seconds_maximum), `${label} is missing, future, or stale`);
  }

  requireReceipt(preimage.status === 'CURRENT', 'fresh preimage must be CURRENT');
  requireReceipt(isNonzeroSha256(preimage.inventory_sha256), 'fresh preimage inventory digest is required');
  const expectedPreimage = {
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
  for (const [field, expected] of Object.entries(expectedPreimage)) {
    requireReceipt(preimage[field] === expected, `fresh preimage ${field} must equal ${expected}`);
  }

  requireReceipt(exactOrderedValues(receipt.completed_actions, targetBootstrapActionOrder), 'fixed action order is incomplete or reordered');
  requireReceipt(dataApi.status === 'CURRENT', 'Data API containment must be CURRENT');
  requireReceipt(isNonzeroSha256(dataApi.control_plane_preimage_sha256) && isNonzeroSha256(dataApi.control_plane_postimage_sha256), 'Data API control-plane preimage and postimage digests are required');
  requireReceipt(dataApi.enabled === false, 'Data API must be disabled during bootstrap');
  requireReceipt(exactOrderedValues(dataApi.exposed_schemas, []), 'bootstrap exposed schemas must be empty');
  requireReceipt(exactOrderedValues(dataApi.extra_search_path, ['extensions']), 'bootstrap extra search path must contain only extensions');
  requireReceipt(dataApi.automatic_public_exposure === false, 'automatic public exposure is forbidden');

  requireReceipt(extensions.status === 'CURRENT', 'extension evidence must be CURRENT');
  requireReceipt(exactOrderedValues((extensions.units ?? []).map((unit) => unit.name), targetBootstrapRequiredExtensions), 'extension denominator or order drift');
  for (const unit of extensions.units ?? []) {
    requireReceipt(typeof unit.default_version === 'string' && unit.default_version.length > 0, `${unit.name}: observed default version is required`);
    requireReceipt(typeof unit.installed_version === 'string' && unit.installed_version.length > 0, `${unit.name}: observed installed version is required`);
    requireReceipt(unit.compatibility === 'PASS', `${unit.name}: compatibility must PASS`);
    requireReceipt(unit.explicit_version_pin_claimed === false, `${unit.name}: explicit version pins are not proof`);
  }

  requireReceipt(catalogReads.status === 'CURRENT', 'catalog parity must be CURRENT');
  requireReceipt(catalogReads.identical === true, 'catalog reads must be explicitly identical');
  requireReceipt(isNonzeroSha256(catalogReads.read_a?.catalog_sha256) && catalogReads.read_a?.catalog_sha256 === catalogReads.read_b?.catalog_sha256, 'catalog read digests must be identical and nonzero');
  requireReceipt(catalogReads.read_a?.catalog_sha256 === packageBinding.expected_catalog_sha256, 'observed catalog digest must match the reviewed expected catalog');
  requireReceipt(canonicalDigest(catalogReads.read_a?.counts ?? {}) === canonicalDigest(targetBootstrapCatalogCounts), 'catalog read A denominator mismatch');
  requireReceipt(canonicalDigest(catalogReads.read_b?.counts ?? {}) === canonicalDigest(targetBootstrapCatalogCounts), 'catalog read B denominator mismatch');
  requireReceipt(Date.parse(catalogReads.read_a?.observed_at) < Date.parse(catalogReads.read_b?.observed_at), 'catalog read B must follow read A');
  for (const [label, read] of [['A', catalogReads.read_a], ['B', catalogReads.read_b]]) {
    requireReceipt(isNonzeroSha256(read?.evidence_receipt_sha256), `catalog read ${label} requires an evidence receipt digest`);
    requireReceipt(isNonzeroSha256(read?.reader_identity_sha256), `catalog read ${label} requires an independent reader identity`);
    requireReceipt(isNonzeroSha256(read?.execution_identity_sha256), `catalog read ${label} requires an independent execution identity`);
    requireReceipt(isNonzeroSha256(read?.query_model_sha256), `catalog read ${label} requires a query-model digest`);
    requireReceipt(
      read?.read_binding_sha256 === canonicalDigest({
        model: 'SUBJECT_RUN_CATALOG_READ_EVIDENCE_V1',
        subject_sha256: read?.subject_sha256,
        run_correlation_sha256: read?.run_correlation_sha256,
        observed_at: read?.observed_at,
        evidence_receipt_sha256: read?.evidence_receipt_sha256,
        reader_identity_sha256: read?.reader_identity_sha256,
        execution_identity_sha256: read?.execution_identity_sha256,
        query_model_sha256: read?.query_model_sha256,
        catalog_sha256: read?.catalog_sha256,
        counts: read?.counts
      }),
      `catalog read ${label} evidence binding mismatch`
    );
  }
  requireReceipt(catalogReads.read_a?.evidence_receipt_sha256 !== catalogReads.read_b?.evidence_receipt_sha256, 'catalog reads require distinct evidence receipt identities');
  requireReceipt(catalogReads.read_a?.reader_identity_sha256 !== catalogReads.read_b?.reader_identity_sha256, 'catalog reads require distinct reader identities');
  requireReceipt(catalogReads.read_a?.execution_identity_sha256 !== catalogReads.read_b?.execution_identity_sha256, 'catalog reads require distinct execution identities');
  requireReceipt(catalogReads.read_a?.query_model_sha256 === catalogReads.read_b?.query_model_sha256, 'catalog reads must bind the same reviewed query model');

  requireReceipt(security.status === 'CURRENT', 'security parity must be CURRENT');
  requireReceipt(security.security_sha256 === packageBinding.expected_security_sha256, 'observed security digest must match the reviewed expected security');
  for (const field of [
    'relation_grants_complete',
    'rls_enabled_and_forced_complete',
    'policy_denominator_complete',
    'function_acl_complete',
    'function_search_path_complete',
    'creator_default_acl_complete'
  ]) {
    requireReceipt(security[field] === true, `security gate ${field} must be complete`);
  }
  requireReceipt(security.public_product_object_count === 0, 'public product objects are forbidden');
  requireReceipt(security.provider_role_isolation === 'PASS', 'provider-role isolation must PASS and cannot remain UNKNOWN');

  requireReceipt(externalEffects.status === 'CURRENT', 'external-effect proof must be CURRENT');
  requireReceipt(externalEffects.complete_denominator === true, 'external-effect proof requires the complete zero-effect denominator');
  requireReceipt(isFreshObservation(externalEffects.observed_at, receipt.validated_at, contract.preimage_gate.freshness_seconds_maximum), 'external-effect observation is missing, future, or stale');
  requireReceipt(isNonzeroSha256(externalEffects.observer_identity_sha256) && isNonzeroSha256(externalEffects.execution_identity_sha256), 'external-effect observer and execution identities must be nonzero');
  requireReceipt(externalEffects.observer_identity_sha256 !== externalEffects.execution_identity_sha256, 'external-effect observer and execution identities must be distinct');
  for (const field of targetBootstrapZeroEffectFields) {
    requireReceipt(externalEffects[field] === 0, `external effect ${field} must equal zero`);
  }
  requireReceipt(externalEffects.evidence_receipt_sha256 === canonicalDigest(targetBootstrapZeroEffectReceiptSubject(receipt)), 'external-effect evidence receipt must content-address the exact subject, run, observation, identities, complete denominator, and zero counts');

  requireReceipt(negativeProbes.status === 'CURRENT', 'negative probes must be CURRENT');
  requireReceipt(exactOrderedValues((negativeProbes.results ?? []).map((result) => result.name), targetBootstrapNegativeProbes), 'negative-probe denominator or order drift');
  for (const result of negativeProbes.results ?? []) {
    requireReceipt(result.passed === true && isNonzeroSha256(result.evidence_sha256), `${result.name}: negative probe must PASS with a digest`);
  }

  requireReceipt(rollback.status === 'CURRENT', 'rollback capability must be CURRENT');
  for (const field of ['preimage_sha256', 'plan_sha256', 'authority_receipt_sha256', 'credential_revocation_plan_sha256']) {
    requireReceipt(isNonzeroSha256(rollback[field]), `rollback ${field} is required`);
  }
  requireReceipt(rollback.preimage_sha256 === preimage.inventory_sha256, 'rollback preimage must equal the captured target preimage');
  requireReceipt(rollback.capability_binding_sha256 === rollbackCapabilityBinding, 'rollback capability must bind the subject, run, preimage, plan, and authorities');
  requireReceipt(contract.rollback_and_disposal.accepted_terminal_dispositions.includes(rollback.terminal_disposition), 'unsafe terminal disposition');
  requireReceipt(rollback.terminal_proof_binding_sha256 === terminalProofBinding, 'terminal disposition proof binding mismatch');
  if (rollback.terminal_disposition === 'QUARANTINED_RETAINED') {
    requireReceipt(rollback.completion_observed_at === null, 'QUARANTINED_RETAINED cannot claim completion time');
    requireReceipt(rollback.disposal_completion_observed_at === null && rollback.target_absence_observed_at === null && rollback.credential_revocation_observed_at === null, 'QUARANTINED_RETAINED cannot claim disposal proof observation times');
    for (const field of [
      'completion_receipt_sha256',
      'restored_postimage_sha256',
      'disposal_authority_receipt_sha256',
      'disposal_completion_receipt_sha256',
      'target_absence_evidence_sha256',
      'credential_revocation_evidence_sha256'
    ]) {
      requireReceipt(zeroSha256.test(rollback[field] ?? ''), `QUARANTINED_RETAINED cannot claim ${field}`);
    }
    requireReceipt(rollback.target_absent_after_disposal === false && rollback.credentials_revoked_after_disposal === false, 'QUARANTINED_RETAINED cannot claim disposal or credential-revocation completion');
  } else if (rollback.terminal_disposition === 'ROLLED_BACK') {
    requireReceipt(
      isFreshObservation(rollback.completion_observed_at, receipt.validated_at, contract.preimage_gate.freshness_seconds_maximum) &&
        Date.parse(rollback.completion_observed_at) >= Date.parse(catalogReads.read_b?.observed_at),
      'ROLLED_BACK requires fresh completion evidence after catalog read B'
    );
    requireReceipt(isNonzeroSha256(rollback.completion_receipt_sha256), 'ROLLED_BACK requires completion evidence');
    requireReceipt(rollback.restored_postimage_sha256 === preimage.inventory_sha256, 'ROLLED_BACK postimage must equal the captured preimage');
    requireReceipt(rollback.disposal_completion_observed_at === null && rollback.target_absence_observed_at === null && rollback.credential_revocation_observed_at === null, 'ROLLED_BACK cannot claim disposal proof observation times');
    for (const field of [
      'disposal_authority_receipt_sha256',
      'disposal_completion_receipt_sha256',
      'target_absence_evidence_sha256',
      'credential_revocation_evidence_sha256'
    ]) {
      requireReceipt(zeroSha256.test(rollback[field] ?? ''), `ROLLED_BACK cannot claim ${field}`);
    }
    requireReceipt(rollback.target_absent_after_disposal === false && rollback.credentials_revoked_after_disposal === false, 'ROLLED_BACK cannot claim disposal or credential-revocation completion');
  } else if (rollback.terminal_disposition === 'DISPOSED') {
    requireReceipt(
      isFreshObservation(rollback.completion_observed_at, receipt.validated_at, contract.preimage_gate.freshness_seconds_maximum) &&
        Date.parse(rollback.completion_observed_at) >= Date.parse(rollback.target_absence_observed_at) &&
        Date.parse(rollback.completion_observed_at) >= Date.parse(rollback.credential_revocation_observed_at),
      'DISPOSED requires fresh terminal completion after absence and credential-revocation observations'
    );
    requireReceipt(isNonzeroSha256(rollback.completion_receipt_sha256), 'DISPOSED requires terminal completion evidence');
    requireReceipt(isNonzeroSha256(rollback.disposal_authority_receipt_sha256), 'DISPOSED requires disposal authority evidence');
    requireReceipt(isNonzeroSha256(rollback.disposal_completion_receipt_sha256), 'DISPOSED requires disposal completion evidence');
    requireReceipt(zeroSha256.test(rollback.restored_postimage_sha256 ?? ''), 'DISPOSED cannot claim a restored rollback postimage');
    requireReceipt(isNonzeroSha256(rollback.target_absence_evidence_sha256), 'DISPOSED requires subject-bound target-absence evidence');
    requireReceipt(isNonzeroSha256(rollback.credential_revocation_evidence_sha256), 'DISPOSED requires subject-bound credential-revocation evidence');
    for (const [label, observedAt] of [
      ['disposal completion', rollback.disposal_completion_observed_at],
      ['target absence', rollback.target_absence_observed_at],
      ['credential revocation', rollback.credential_revocation_observed_at]
    ]) {
      requireReceipt(isFreshObservation(observedAt, receipt.validated_at, contract.preimage_gate.freshness_seconds_maximum), `DISPOSED requires fresh ${label} observation`);
    }
    requireReceipt(Date.parse(rollback.disposal_completion_observed_at) >= Date.parse(catalogReads.read_b?.observed_at), 'DISPOSED completion must follow catalog read B');
    requireReceipt(Date.parse(rollback.target_absence_observed_at) >= Date.parse(rollback.disposal_completion_observed_at), 'target-absence observation must follow disposal completion');
    requireReceipt(Date.parse(rollback.credential_revocation_observed_at) >= Date.parse(rollback.disposal_completion_observed_at), 'credential-revocation observation must follow disposal completion');
    requireReceipt(
      new Set([
        rollback.completion_receipt_sha256,
        rollback.disposal_authority_receipt_sha256,
        rollback.disposal_completion_receipt_sha256,
        rollback.target_absence_evidence_sha256,
        rollback.credential_revocation_evidence_sha256
      ]).size === 5,
      'DISPOSED requires distinct terminal, authority, disposal, absence, and credential-revocation proof identities'
    );
    requireReceipt(rollback.target_absent_after_disposal === true, 'DISPOSED requires target-absence proof');
    requireReceipt(rollback.credentials_revoked_after_disposal === true, 'DISPOSED requires credential-revocation proof');
  }

  return failures.sort((left, right) => left.localeCompare(right));
}

export function validateDisposableTargetBootstrapContract(contract) {
  const failures = [];
  const requireContract = (condition, message) => {
    if (!condition) failures.push(`target bootstrap contract: ${message}`);
  };
  requireContract(contract?.version === '1.0.0' && contract?.contract_id === 'disposable-target-bootstrap', 'identity drift');
  requireContract(contract?.status === 'CURRENT', 'source contract must remain CURRENT');
  requireContract(contract?.lifecycle?.source_contract === 'SOURCE_READY' && contract?.lifecycle?.execution === 'EXECUTION_BLOCKED' && contract?.lifecycle?.apply_admitted === false, 'lifecycle must remain source-ready, execution-blocked, and apply=false');
  requireContract(contract?.scope?.offline_contract_only === true, 'scope must remain offline only');
  for (const field of [
    'provider_connectivity_included',
    'provider_mutation_authorized',
    'project_creation_authorized',
    'migration_apply_authorized',
    'rollback_or_disposal_authorized',
    'credential_revocation_authorized',
    'executable_migration_representation_included'
  ]) {
    requireContract(contract?.scope?.[field] === false, `${field} must remain false`);
  }
  requireContract(contract?.immutable_bindings?.digest_model === 'SEPARATE_MIGRATION_AND_GOVERNANCE_V1', 'digest model drift');
  requireContract(contract?.immutable_bindings?.migration_count === 122 && contract?.immutable_bindings?.standard_migration_sql_count === 0 && contract?.immutable_bindings?.legacy_combined_digest_admitted === false, 'migration denominator or executable-placement boundary drift');
  requireContract(contract?.identity_boundary?.identity_representation === 'SHA256_DIGEST_ONLY' && contract?.identity_boundary?.protected_project_identity_count_minimum === 4 && contract?.identity_boundary?.protected_inventory_digest_required === true && contract?.identity_boundary?.protected_inventory_count_must_match === true && contract?.identity_boundary?.protected_inventory_digest_model === 'CANONICAL_PROVIDER_INVENTORY_V1' && contract?.identity_boundary?.protected_identity_digests_canonical_order_required === true && contract?.identity_boundary?.pagination_and_completeness_evidence_required === true && contract?.identity_boundary?.disposable_identity_must_be_unique === true && contract?.identity_boundary?.disposable_identity_must_not_be_protected === true && contract?.identity_boundary?.project_refs_in_receipts_forbidden === true && contract?.identity_boundary?.production_or_source_reuse_forbidden === true, 'protected/disposable identity boundary drift');
  requireContract(contract?.authority_gate?.binding_model === 'SUBJECT_RUN_BOOTSTRAP_APPLY_AUTHORITY_V1' && contract?.authority_gate?.authorized_operation === 'GUARDED_DISPOSABLE_TARGET_BOOTSTRAP_APPLY' && contract?.authority_gate?.subject_run_package_bundle_binding_required === true && contract?.authority_gate?.contract_version_binding_required === true && contract?.authority_gate?.authority_identity_binding_required === true && contract?.authority_gate?.authority_event_identity_required === true && contract?.authority_gate?.signed_freshness_required === true && contract?.authority_gate?.trusted_action_time_injected_required === true && contract?.authority_gate?.receipt_validated_at_is_trusted_action_time === false && contract?.authority_gate?.authenticated_one_time_consumption_required === true && contract?.authority_gate?.external_consumption_ledger_required === true && contract?.authority_gate?.source_persists_consumption_ledger === false && contract?.authority_gate?.pinned_signature_required === true && contract?.authority_gate?.source_contract_is_authority === false, 'apply-authority binding boundary drift');
  const bootstrapAuthorityPolicy = contract?.execution_authentication?.authority ?? {};
  const bootstrapConsumptionPolicy = contract?.execution_authentication?.consumption ?? {};
  requireContract(bootstrapAuthorityPolicy.verification_boundary === 'pinned_ed25519_signature'
    && bootstrapAuthorityPolicy.signature_domain === 'fawxzzy.platform.disposable-target-bootstrap.apply-authority.v1'
    && bootstrapAuthorityPolicy.freshness_seconds_maximum === 900
    && bootstrapAuthorityPolicy.trust_anchor?.status === 'BLOCKED'
    && bootstrapAuthorityPolicy.trust_anchor?.algorithm === 'Ed25519'
    && bootstrapAuthorityPolicy.trust_anchor?.key_id === 'UNKNOWN'
    && bootstrapAuthorityPolicy.trust_anchor?.verifier_reference === 'disposable-target-bootstrap-authority-verifier-v1'
    && bootstrapAuthorityPolicy.trust_anchor?.public_key_spki_base64 === null
    && bootstrapAuthorityPolicy.trust_anchor?.public_key_spki_sha256 === null
    && bootstrapConsumptionPolicy.verification_boundary === 'distinct_pinned_ed25519_one_time_consumption_signature'
    && bootstrapConsumptionPolicy.signature_domain === 'fawxzzy.platform.disposable-target-bootstrap.authority-consumption.v1'
    && bootstrapConsumptionPolicy.evidence_model === 'DISPOSABLE_TARGET_BOOTSTRAP_APPLY_AUTHORITY_CONSUMPTION_V1'
    && bootstrapConsumptionPolicy.required_transition === 'UNCONSUMED_TO_CONSUMED'
    && bootstrapConsumptionPolicy.trust_anchor?.status === 'BLOCKED'
    && bootstrapConsumptionPolicy.trust_anchor?.algorithm === 'Ed25519'
    && bootstrapConsumptionPolicy.trust_anchor?.key_id === 'UNKNOWN'
    && bootstrapConsumptionPolicy.trust_anchor?.verifier_reference === 'disposable-target-bootstrap-authority-consumption-verifier-v1'
    && bootstrapConsumptionPolicy.trust_anchor?.public_key_spki_base64 === null
    && bootstrapConsumptionPolicy.trust_anchor?.public_key_spki_sha256 === null
    && contract?.execution_authentication?.caller_supplied_trust_material_allowed === false
    && contract?.execution_authentication?.current_receipt_allowed_while_anchor_blocked === false, 'checked-in bootstrap apply-authority trust anchor must remain explicitly BLOCKED and uninstalled');
  requireContract(contract?.preimage_gate?.freshness_seconds_maximum === 7200 && contract?.preimage_gate?.postgres_major === 17 && contract?.preimage_gate?.complete_inventory_required === true && contract?.preimage_gate?.unknown_promotable_to_current === false, 'fresh-preimage policy drift');
  requireContract(exactOrderedValues(contract?.action_order, targetBootstrapActionOrder), 'fixed action order drift');
  requireContract(contract?.data_api_gate?.bootstrap_enabled === false && exactOrderedValues(contract?.data_api_gate?.bootstrap_exposed_schemas, []) && exactOrderedValues(contract?.data_api_gate?.bootstrap_extra_search_path, ['extensions']) && contract?.data_api_gate?.automatic_public_exposure === false, 'bootstrap Data API containment drift');
  requireContract(exactOrderedValues(contract?.data_api_gate?.maximum_future_exposed_schemas, targetBootstrapFutureExposedSchemas), 'maximum future Data API allowlist drift');
  requireContract(exactOrderedValues(contract?.data_api_gate?.never_exposed_schemas, targetBootstrapNeverExposedSchemas), 'never-exposed schema set drift');
  requireContract(contract?.data_api_gate?.explicit_grants_and_rls_required === true && contract?.data_api_gate?.management_api_preimage_required === true, 'Data API control-plane, grants, or RLS requirement drift');
  requireContract(contract?.catalog_parity?.read_count === 2 && contract?.catalog_parity?.reads_must_be_independent === true && contract?.catalog_parity?.reads_must_be_byte_identical === true && contract?.catalog_parity?.expected_state_binding_model === 'PACKAGE_BUNDLE_CATALOG_SECURITY_V1' && contract?.catalog_parity?.observed_catalog_must_match_reviewed_expected_digest === true && contract?.catalog_parity?.observed_security_must_match_reviewed_expected_digest === true && contract?.catalog_parity?.read_evidence_binding_model === 'SUBJECT_RUN_CATALOG_READ_EVIDENCE_V1' && contract?.catalog_parity?.distinct_read_evidence_receipts_required === true && contract?.catalog_parity?.distinct_reader_identities_required === true && contract?.catalog_parity?.distinct_execution_identities_required === true && contract?.catalog_parity?.query_model_binding_required === true && canonicalDigest(contract?.catalog_parity?.expected_counts ?? {}) === canonicalDigest(targetBootstrapCatalogCounts) && contract?.catalog_parity?.timestamp_or_high_water_only_proof_allowed === false, 'two-read catalog parity drift');
  requireContract(exactOrderedValues(contract?.extension_gate?.required_extensions, targetBootstrapRequiredExtensions) && contract?.extension_gate?.observed_default_version_required === true && contract?.extension_gate?.observed_installed_version_required === true && contract?.extension_gate?.compatibility_result_required === 'PASS' && contract?.extension_gate?.explicit_version_pin_is_proof === false && contract?.extension_gate?.unknown_version_promotable === false, 'extension evidence boundary drift');
  requireContract(contract?.external_effect_gate?.evidence_binding_model === 'SUBJECT_RUN_ZERO_EFFECT_OBSERVATION_V1' && exactOrderedValues(contract?.external_effect_gate?.required_zero_counts, targetBootstrapZeroEffectFields) && contract?.external_effect_gate?.subject_run_binding_required === true && contract?.external_effect_gate?.complete_denominator_required === true && contract?.external_effect_gate?.distinct_observer_and_execution_identities_required === true && contract?.external_effect_gate?.fresh_observation_required === true && contract?.external_effect_gate?.content_addressed_evidence_receipt_required === true && contract?.external_effect_gate?.egress_denied_before_apply === true && contract?.external_effect_gate?.credentials_withheld_before_apply === true && contract?.external_effect_gate?.zero_effect_receipt_required === true, 'external-effect boundary drift');
  requireContract(exactOrderedValues(contract?.negative_probe_gate?.required_probes, targetBootstrapNegativeProbes) && contract?.negative_probe_gate?.all_must_pass === true, 'negative-probe denominator drift');
  requireContract(contract?.rollback_and_disposal?.source_projects_remain_active === true && contract?.rollback_and_disposal?.source_mutation_forbidden === true && contract?.rollback_and_disposal?.disposal_requires_separate_authority === true && contract?.rollback_and_disposal?.disposed_target_absence_proof_required === true && contract?.rollback_and_disposal?.disposed_credential_revocation_proof_required === true && contract?.rollback_and_disposal?.common_target_and_run_binding_required === true && contract?.rollback_and_disposal?.rollback_postimage_must_equal_preimage === true && contract?.rollback_and_disposal?.terminal_proof_binding_model === 'SUBJECT_RUN_DISPOSITION_EVIDENCE_V1' && contract?.rollback_and_disposal?.disposal_proofs_must_be_distinct === true && contract?.rollback_and_disposal?.disposal_proofs_individually_fresh === true && contract?.rollback_and_disposal?.disposal_proof_order === 'DISPOSAL_COMPLETION_THEN_ABSENCE_AND_REVOCATION_THEN_TERMINAL_COMPLETION' && contract?.rollback_and_disposal?.broad_drop_is_rollback === false, 'rollback/disposal boundary drift');
  requireContract(contract?.receipt_example?.status === 'BLOCKED', 'checked-in receipt example must remain BLOCKED');
  failures.push(...validateDisposableTargetBootstrapReceipt(contract, contract?.receipt_example));
  return failures.sort((left, right) => left.localeCompare(right));
}

function validateStorageEdgeRealtimeReceiptSanitization(receipt) {
  const failures = [];
  const forbiddenKey = /^(?:raw_?provider_?response|project_?ref(?:erence)?|provider_?url|object_?key|object_?body|secret_?value|credential|sql_?bytes|machine_?path|pii|email|uuid)$/i;
  const inspect = (value, location = 'receipt') => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        inspect(entry, `${location}[${index}]`);
      });
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (forbiddenKey.test(key)) failures.push(`${location}.${key}: forbidden evidence field`);
        inspect(child, `${location}.${key}`);
      }
      return;
    }
    if (typeof value !== 'string') return;
    if (/https?:\/\//i.test(value)) failures.push(`${location}: provider URL is forbidden`);
    if (/\b[a-z0-9]{20}\b/.test(value) && !/^[0-9a-f]{64}$/.test(value)) failures.push(`${location}: project reference is forbidden`);
    if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(value)) failures.push(`${location}: PII is forbidden`);
    if (/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(value)) failures.push(`${location}: UUID is forbidden`);
    if (/^(?:[A-Za-z]:[\\/]|\/(?:Users|home|tmp)\b)/i.test(value)) failures.push(`${location}: machine path is forbidden`);
  };
  inspect(receipt);
  return failures;
}

export function validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, receipt, validationContext = null) {
  const failures = [];
  const requireReceipt = (condition, message) => {
    if (!condition) failures.push(`Storage/Edge/Realtime receipt: ${message}`);
  };
  const zero = /^0{64}$/;
  const trustedActionTime = validationContext?.trusted_action_time;
  const subject = receipt?.subject_sha256;
  const run = receipt?.run_correlation_sha256;
  const maximumAge = contract?.receipt_policy?.maximum_evidence_age_seconds ?? 900;
  const fresh = (value) => typeof trustedActionTime === 'string' && isFreshObservation(value, trustedActionTime, maximumAge);
  const bind = (component) => component?.subject_sha256 === subject && component?.run_correlation_sha256 === run;

  requireReceipt(receipt?.version === '1.0.0' && receipt?.contract_id === 'storage-edge-realtime-execution-denominator', 'identity drift');
  if (receipt?.status === 'BLOCKED') {
    requireReceipt(canonicalDigest(receipt) === canonicalDigest(contract?.receipt_example), 'BLOCKED receipt must equal the complete canonical blocked projection');
    return failures.sort((left, right) => left.localeCompare(right));
  }
  requireReceipt(receipt?.status === 'CURRENT', 'status must be BLOCKED or CURRENT');
  requireReceipt(typeof trustedActionTime === 'string' && !Number.isNaN(Date.parse(trustedActionTime)), 'CURRENT validation requires an injected trusted action time');
  requireReceipt(receipt?.validated_at === trustedActionTime, 'validated_at must equal the injected trusted action time');
  requireReceipt(isNonzeroSha256(subject) && isNonzeroSha256(run) && subject !== run, 'subject and run commitments must be distinct and nonzero');
  requireReceipt(exactOrderedValues(receipt?.completed_actions, storageEdgeRealtimeActionOrder), 'fixed action order is incomplete, duplicated, or reordered');

  const bindings = contract?.immutable_bindings ?? {};
  const bundle = receipt?.bundle_evidence ?? {};
  requireReceipt(receipt?.package?.migration_count === 122 && receipt?.package?.standard_migration_sql_count === 0, 'migration denominator or executable placement drift');
  requireReceipt(receipt?.package?.migration_package_sha256 === bindings.migration_package_sha256 && receipt?.package?.governance_manifest_sha256 === bindings.governance_manifest_sha256, 'migration or governance package drift');
  requireReceipt(receipt?.package?.bundle_manifest_sha256 === bindings.promoted_bundle?.manifest_sha256 && receipt?.package?.query_model_sha256 === bindings.expected_state_model?.query_model_sha256, 'bundle or query-model binding drift');
  requireReceipt(bundle.status === 'CURRENT' && bind(bundle) && fresh(bundle.reviewed_at), 'bundle evidence must be CURRENT, fresh, and subject/run-bound');
  requireReceipt(bundle.manifest_sha256 === bindings.promoted_bundle?.manifest_sha256, 'reviewed byte-manifest substitution');
  requireReceipt(isNonzeroSha256(bundle.reviewer_receipt_sha256) && isNonzeroSha256(bundle.reviewed_expected_state_receipt_sha256) && bundle.reviewer_receipt_sha256 !== bundle.reviewed_expected_state_receipt_sha256, 'bundle review and expected-state receipts must be distinct and nonzero');
  requireReceipt(bundle.source_artifacts_unchanged === true && bundle.sql_bytes_serialized === false && bundle.executor_included === false, 'bundle evidence cannot serialize SQL, include an executor, or admit byte drift');

  const storage = receipt?.storage ?? {};
  requireReceipt(storage.status === 'CURRENT' && bind(storage), 'Storage denominator must be CURRENT and subject/run-bound');
  requireReceipt(storage.pagination_complete === true && storage.page_exhausted === true && Number.isInteger(storage.page_count) && storage.page_count >= 1 && isNonzeroSha256(storage.pagination_sha256), 'Storage pagination must be complete and exhausted');
  for (const field of ['bucket_count', 'object_count', 'multipart_upload_count', 'total_bytes']) requireReceipt(Number.isInteger(storage[field]) && storage[field] >= 0, `Storage ${field} must be a nonnegative integer`);
  requireReceipt(storage.body_state === (storage.object_count === 0 ? 'ZERO_COMPLETE' : 'NONZERO_COMPLETE'), 'Storage body denominator must be zero-complete or complete-nonzero');
  requireReceipt(storage.object_count > 0 || storage.total_bytes === 0, 'zero-object Storage denominator cannot claim bytes');
  for (const field of ['bucket_settings_sha256', 'object_metadata_sha256', 'body_inventory_sha256']) requireReceipt(isNonzeroSha256(storage[field]), `Storage ${field} must be content-addressed`);
  requireReceipt(storage.mutation_method === 'STORAGE_API_ONLY' && storage.direct_sql_mutation === false && storage.object_keys_serialized === false && storage.object_bodies_serialized === false, 'Storage mutation and redaction boundary drift');
  for (const [label, read] of [['A', storage.body_read_a], ['B', storage.body_read_b]]) {
    requireReceipt(read?.status === 'CURRENT' && fresh(read?.observed_at), `Storage body read ${label} must be CURRENT and fresh`);
    requireReceipt(isNonzeroSha256(read?.reader_identity_sha256) && isNonzeroSha256(read?.execution_identity_sha256) && isNonzeroSha256(read?.evidence_receipt_sha256), `Storage body read ${label} requires independent evidence identities`);
    requireReceipt(read?.object_count === storage.object_count && read?.total_bytes === storage.total_bytes && read?.body_inventory_sha256 === storage.body_inventory_sha256, `Storage body read ${label} denominator mismatch`);
  }
  const storageReadSeparation = (Date.parse(storage.body_read_b?.observed_at) - Date.parse(storage.body_read_a?.observed_at)) / 1000;
  requireReceipt(
    storageReadSeparation >= contract?.receipt_policy?.minimum_read_separation_seconds
      && storageReadSeparation <= contract?.receipt_policy?.maximum_read_separation_seconds,
    'Storage body reads must use the required observation window'
  );
  requireReceipt(new Set([
    storage.body_read_a?.reader_identity_sha256,
    storage.body_read_b?.reader_identity_sha256,
    storage.body_read_a?.execution_identity_sha256,
    storage.body_read_b?.execution_identity_sha256,
    storage.body_read_a?.evidence_receipt_sha256,
    storage.body_read_b?.evidence_receipt_sha256
  ]).size === 6, 'Storage body reads require distinct reader, execution, and evidence identities');
  requireReceipt(storage.aggregate_sha256 === storageEdgeRealtimeComponentDigest(storage), 'Storage aggregate digest mismatch');

  const edge = receipt?.edge ?? {};
  requireReceipt(edge.status === 'CURRENT' && bind(edge), 'Edge denominator must be CURRENT and subject/run-bound');
  requireReceipt(edge.pagination_complete === true && edge.page_exhausted === true && Number.isInteger(edge.page_count) && edge.page_count >= 1 && isNonzeroSha256(edge.pagination_sha256), 'Edge pagination must be complete and exhausted');
  for (const field of ['function_count', 'route_count', 'schedule_count', 'hook_count', 'secret_name_count', 'invocation_count', 'outbound_network_request_count']) requireReceipt(Number.isInteger(edge[field]) && edge[field] >= 0, `Edge ${field} must be a nonnegative integer`);
  for (const field of ['function_manifest_sha256', 'route_manifest_sha256', 'schedule_manifest_sha256', 'hook_manifest_sha256', 'secret_name_set_sha256']) requireReceipt(isNonzeroSha256(edge[field]), `Edge ${field} must be content-addressed`);
  requireReceipt(edge.invocation_count === 0 && edge.outbound_network_request_count === 0 && edge.secret_values_serialized === false, 'Edge rehearsal requires zero invocation/egress and no secret values');
  for (const inverse of [edge.undeploy, edge.credential_revocation]) requireReceipt(inverse?.status === 'CURRENT' && isNonzeroSha256(inverse?.receipt_sha256) && inverse?.independently_authenticated === true, 'Edge inverse evidence must be CURRENT, authenticated, and content-addressed');
  requireReceipt(edge.undeploy?.receipt_sha256 !== edge.credential_revocation?.receipt_sha256, 'Edge undeploy and credential-revocation evidence must be distinct');
  requireReceipt(edge.aggregate_sha256 === storageEdgeRealtimeComponentDigest(edge), 'Edge aggregate digest mismatch');

  const realtime = receipt?.realtime ?? {};
  requireReceipt(realtime.status === 'CURRENT' && bind(realtime), 'Realtime denominator must be CURRENT and subject/run-bound');
  requireReceipt(realtime.pagination_complete === true && realtime.page_exhausted === true && Number.isInteger(realtime.page_count) && realtime.page_count >= 1 && isNonzeroSha256(realtime.pagination_sha256), 'Realtime pagination must be complete and exhausted');
  requireReceipt(realtime.broadcast_path_count === 6 && realtime.presence_disposition === 'EPHEMERAL_NOT_MIGRATED' && realtime.presence_persisted_count === 0, 'Realtime Broadcast or Presence denominator drift');
  for (const field of ['service_settings_sha256', 'service_limits_sha256', 'publication_membership_sha256', 'replica_identity_sha256', 'private_schema_security_sha256', 'broadcast_path_manifest_sha256', 'message_replay_disposition_sha256']) requireReceipt(isNonzeroSha256(realtime[field]), `Realtime ${field} must be content-addressed`);
  requireReceipt(realtime.replica_identity_count === realtime.published_table_count, 'Realtime replica-identity denominator must cover every published table');
  requireReceipt(realtime.connected_client_count === 0 && realtime.broadcast_event_count === 0 && realtime.postgres_change_event_count === 0, 'Realtime rehearsal must have zero connected clients and events');
  requireReceipt(realtime.rollback?.status === 'CURRENT' && isNonzeroSha256(realtime.rollback?.receipt_sha256) && realtime.rollback?.independently_authenticated === true, 'Realtime rollback evidence must be CURRENT and independently authenticated');
  requireReceipt(realtime.aggregate_sha256 === storageEdgeRealtimeComponentDigest(realtime), 'Realtime aggregate digest mismatch');

  const outbound = receipt?.outbound ?? {};
  requireReceipt(outbound.status === 'CURRENT' && bind(outbound), 'outbound denominator must be CURRENT and subject/run-bound');
  requireReceipt(outbound.pagination_complete === true && outbound.page_exhausted === true && Number.isInteger(outbound.page_count) && outbound.page_count >= 1 && isNonzeroSha256(outbound.pagination_sha256), 'outbound pagination must be complete and exhausted');
  requireReceipt(exactOrderedValues((outbound.units ?? []).map((unit) => unit.surface), storageEdgeRealtimeOutboundSurfaces), 'outbound surface denominator or order drift');
  requireReceipt(new Set((outbound.units ?? []).map((unit) => unit.surface)).size === storageEdgeRealtimeOutboundSurfaces.length, 'outbound surfaces must be unique');
  const dispositions = contract?.outbound_contract?.dispositions ?? {};
  for (const unit of outbound.units ?? []) {
    requireReceipt(unit.status === 'CURRENT' && unit.disposition === dispositions[unit.surface], `${unit.surface}: disposition or status drift`);
    requireReceipt(Number.isInteger(unit.inventory_count) && unit.inventory_count >= 0 && Number.isInteger(unit.history_count) && unit.history_count >= 0, `${unit.surface}: invalid count`);
    requireReceipt(isNonzeroSha256(unit.manifest_sha256) && unit.urls_redacted === true && unit.secret_material_serialized === false, `${unit.surface}: manifest/redaction boundary drift`);
  }
  const inventoryTotal = (outbound.units ?? []).reduce((sum, unit) => sum + unit.inventory_count, 0);
  const historyTotal = (outbound.units ?? []).reduce((sum, unit) => sum + unit.history_count, 0);
  for (const [label, read] of [['A', outbound.read_a], ['B', outbound.read_b]]) {
    requireReceipt(read?.status === 'CURRENT' && fresh(read?.observed_at), `outbound read ${label} must be CURRENT and fresh`);
    requireReceipt(read?.inventory_count === inventoryTotal && read?.history_count === historyTotal && read?.external_effect_count === 0, `outbound read ${label} denominator mismatch`);
    requireReceipt(isNonzeroSha256(read?.reader_identity_sha256) && isNonzeroSha256(read?.execution_identity_sha256) && isNonzeroSha256(read?.evidence_receipt_sha256), `outbound read ${label} evidence identities are incomplete`);
  }
  requireReceipt(outbound.read_a?.aggregate_sha256 === storageEdgeRealtimeOutboundReadDigest(outbound.units, outbound.read_a), 'outbound read A aggregate mismatch');
  requireReceipt(outbound.read_b?.aggregate_sha256 === storageEdgeRealtimeOutboundReadDigest(outbound.units, outbound.read_b), 'outbound read B aggregate mismatch');
  requireReceipt(outbound.read_a?.aggregate_sha256 === outbound.read_b?.aggregate_sha256 && isNonzeroSha256(outbound.read_a?.aggregate_sha256), 'outbound complete reads must match');
  const outboundReadSeparation = (Date.parse(outbound.read_b?.observed_at) - Date.parse(outbound.read_a?.observed_at)) / 1000;
  requireReceipt(
    outboundReadSeparation >= contract?.receipt_policy?.minimum_read_separation_seconds
      && outboundReadSeparation <= contract?.receipt_policy?.maximum_read_separation_seconds,
    'outbound reads must use the required observation window'
  );
  requireReceipt(outbound.history_growth === 0 && outbound.external_effect_growth === 0, 'outbound history and external-effect growth must remain zero');
  requireReceipt(outbound.aggregate_sha256 === storageEdgeRealtimeComponentDigest(outbound), 'outbound aggregate digest mismatch');

  const dataApi = receipt?.data_api ?? {};
  requireReceipt(dataApi.status === 'CURRENT' && bind(dataApi), 'Data API evidence must be CURRENT and subject/run-bound');
  requireReceipt(dataApi.oauth_scope === 'rest:read' && dataApi.permission === 'data_api_config_read', 'Data API scope or permission drift');
  requireReceipt(dataApi.jwt_secret_redacted === true && dataApi.raw_response_persisted === false && dataApi.request_headers_persisted === false, 'Data API raw evidence must remain redacted and unpersisted');
  const expectedPreimage = { enabled: true, exposed_schemas: ['graphql_public', 'public'], extra_search_path: ['public', 'extensions'], automatic_public_exposure: false };
  const expectedPostimage = contract?.data_api_contract?.required_postimage ?? {};
  for (const [label, projection, expected] of [['preimage', dataApi.preimage, expectedPreimage], ['postimage', dataApi.postimage, expectedPostimage], ['rollback', dataApi.rollback, expectedPreimage]]) {
    requireReceipt(projection?.status === 'CURRENT' && fresh(projection?.observed_at), `Data API ${label} must be CURRENT and fresh`);
    requireReceipt(isNonzeroSha256(projection?.observer_identity_sha256) && isNonzeroSha256(projection?.evidence_receipt_sha256), `Data API ${label} requires observer and evidence identities`);
    requireReceipt(canonicalDigest({ enabled: projection?.enabled, exposed_schemas: projection?.exposed_schemas, extra_search_path: projection?.extra_search_path, automatic_public_exposure: projection?.automatic_public_exposure }) === canonicalDigest(expected), `Data API ${label} projection mismatch`);
    requireReceipt(projection?.projection_sha256 === storageEdgeRealtimeDataApiProjectionDigest(projection), `Data API ${label} digest mismatch`);
  }
  requireReceipt(new Set([dataApi.preimage?.observer_identity_sha256, dataApi.postimage?.observer_identity_sha256, dataApi.rollback?.observer_identity_sha256]).size === 3, 'Data API readbacks require distinct observers');
  requireReceipt(new Set([dataApi.preimage?.evidence_receipt_sha256, dataApi.postimage?.evidence_receipt_sha256, dataApi.rollback?.evidence_receipt_sha256]).size === 3, 'Data API readbacks require distinct evidence receipts');
  requireReceipt(Date.parse(dataApi.preimage?.observed_at) < Date.parse(dataApi.postimage?.observed_at) && Date.parse(dataApi.postimage?.observed_at) < Date.parse(dataApi.rollback?.observed_at), 'Data API preimage, postimage, and rollback chronology is invalid');
  requireReceipt(Date.parse(bundle.reviewed_at) < Date.parse(dataApi.preimage?.observed_at), 'bundle review must strictly precede the Data API execution preimage');

  const completeReads = receipt?.complete_reads ?? {};
  const expectedState = storageEdgeRealtimeExpectedStateDigest(receipt);
  requireReceipt(completeReads.status === 'CURRENT' && completeReads.expected_state_sha256 === expectedState, 'complete-read expected state binding mismatch');
  for (const [label, read] of [['A', completeReads.read_a], ['B', completeReads.read_b]]) {
    requireReceipt(read?.status === 'CURRENT' && read?.complete === true && fresh(read?.observed_at), `complete read ${label} must be CURRENT, complete, and fresh`);
    requireReceipt(read?.query_model_sha256 === bindings.expected_state_model?.query_model_sha256 && read?.aggregate_sha256 === expectedState, `complete read ${label} query or aggregate mismatch`);
    requireReceipt(isNonzeroSha256(read?.reader_identity_sha256) && isNonzeroSha256(read?.execution_identity_sha256) && isNonzeroSha256(read?.evidence_receipt_sha256), `complete read ${label} evidence identities are incomplete`);
  }
  const readSeparation = (Date.parse(completeReads.read_b?.observed_at) - Date.parse(completeReads.read_a?.observed_at)) / 1000;
  requireReceipt(readSeparation >= 1 && readSeparation <= 900, 'complete reads must use the required observation window');
  requireReceipt(new Set([
    completeReads.read_a?.reader_identity_sha256,
    completeReads.read_b?.reader_identity_sha256,
    completeReads.read_a?.execution_identity_sha256,
    completeReads.read_b?.execution_identity_sha256,
    completeReads.read_a?.evidence_receipt_sha256,
    completeReads.read_b?.evidence_receipt_sha256
  ]).size === 6, 'complete reads require distinct reader, execution, and evidence identities');
  requireReceipt(Date.parse(dataApi.postimage?.observed_at) < Date.parse(completeReads.read_a?.observed_at), 'Data API postimage must strictly precede complete read A');

  const zeroEffects = receipt?.zero_effects ?? {};
  requireReceipt(zeroEffects.status === 'CURRENT' && bind(zeroEffects) && fresh(zeroEffects.observed_at) && zeroEffects.complete_denominator === true, 'zero-effect evidence must be CURRENT, complete, fresh, and subject/run-bound');
  requireReceipt(isNonzeroSha256(zeroEffects.observer_identity_sha256) && isNonzeroSha256(zeroEffects.execution_identity_sha256) && zeroEffects.observer_identity_sha256 !== zeroEffects.execution_identity_sha256, 'zero-effect observer and execution identities must be distinct and nonzero');
  for (const field of storageEdgeRealtimeZeroEffectFields) requireReceipt(zeroEffects[field] === 0, `external effect ${field} must equal zero`);
  requireReceipt(zeroEffects.evidence_receipt_sha256 === storageEdgeRealtimeZeroEffectDigest(receipt), 'zero-effect evidence receipt must content-address the exact subject, run, action-time observation, identities, complete denominator, and zero counts');
  requireReceipt(Date.parse(completeReads.read_b?.observed_at) < Date.parse(zeroEffects.observed_at), 'complete read B must strictly precede the zero-effect observation');

  const forwardPolicy = contract?.forward_evidence_authentication ?? {};
  const evidenceAnchors = [
    forwardPolicy.trust_anchor,
    contract?.rollback_authentication?.per_surface?.trust_anchor,
    contract?.rollback_authentication?.disposal_absence?.trust_anchor,
    contract?.rollback_authentication?.credential_revocation?.trust_anchor
  ];
  requireReceipt(
    evidenceAnchors.every((anchor) => anchor?.status === 'CURRENT')
      && new Set(evidenceAnchors.map((anchor) => anchor?.key_id)).size === evidenceAnchors.length
      && new Set(evidenceAnchors.map((anchor) => anchor?.public_key_spki_sha256)).size === evidenceAnchors.length,
    'forward and rollback evidence require four distinct installed trust anchors'
  );
  requireReceipt(
    sameValues(Object.keys(receipt?.forward_evidence_authentication ?? {}), [
      'algorithm',
      'key_id',
      'public_key_spki_sha256',
      'signed_payload_sha256',
      'signature_base64'
    ]),
    'forward evidence receipt cannot carry caller-supplied trust material'
  );
  requireReceipt(
    authAppDataVerifyAuthentication(
      storageEdgeRealtimeForwardEvidenceAuthenticationSubject(receipt),
      receipt?.forward_evidence_authentication,
      forwardPolicy
    ),
    'forward bundle-review, complete-read, and zero-effect evidence requires a valid signature from its pinned distinct trust domain'
  );

  const rollback = receipt?.rollback ?? {};
  requireReceipt(rollback.status === 'CURRENT' && bind(rollback) && fresh(rollback.completed_at) && exactOrderedValues(rollback.inverse_order, storageEdgeRealtimeRollbackOrder), 'rollback must be CURRENT, fresh, subject/run-bound, and use the exact inverse order');
  requireReceipt(
    Date.parse(rollback.completed_at) >= Date.parse(dataApi.rollback?.observed_at)
      && Date.parse(rollback.completed_at) >= Date.parse(completeReads.read_b?.observed_at)
      && Date.parse(rollback.completed_at) > Date.parse(zeroEffects.observed_at),
    'rollback completion must follow the terminal readbacks and zero-effect observation'
  );
  requireReceipt(rollback.preimage_restored === true && rollback.independently_authenticated === true && rollback.broad_drop_used === false && rollback.execution_authorized_by_source_contract === false, 'rollback proof or authority boundary drift');
  for (const field of ['per_surface_receipt_set_sha256', 'disposal_absence_receipt_sha256', 'credential_revocation_receipt_sha256']) requireReceipt(isNonzeroSha256(rollback[field]), `rollback ${field} is required`);
  requireReceipt(rollback.per_surface_receipt_set_sha256 === storageEdgeRealtimePerSurfaceReceiptSetDigest(receipt), 'per-surface rollback receipt set must bind the accepted Edge and Realtime inverse evidence');
  requireReceipt(new Set([rollback.per_surface_receipt_set_sha256, rollback.disposal_absence_receipt_sha256, rollback.credential_revocation_receipt_sha256]).size === 3, 'rollback, disposal, and credential-revocation evidence must be distinct');
  for (const [evidenceClass, authenticationField, policyField] of [
    ['PER_SURFACE_ROLLBACK', 'per_surface_authentication', 'per_surface'],
    ['DISPOSAL_ABSENCE', 'disposal_absence_authentication', 'disposal_absence'],
    ['CREDENTIAL_REVOCATION', 'credential_revocation_authentication', 'credential_revocation']
  ]) {
    requireReceipt(
      authAppDataVerifyAuthentication(
        storageEdgeRealtimeRollbackAuthenticationSubject(receipt, evidenceClass),
        rollback[authenticationField],
        contract?.rollback_authentication?.[policyField]
      ),
      `${evidenceClass} requires a valid signature from its pinned distinct trust domain`
    );
  }

  requireReceipt(receipt?.terminal_receipt_sha256 === storageEdgeRealtimeTerminalReceiptDigest(receipt), 'terminal receipt digest mismatch');
  requireReceipt(!JSON.stringify(receipt).includes('UNKNOWN'), 'CURRENT receipt cannot promote UNKNOWN evidence');
  failures.push(...validateStorageEdgeRealtimeReceiptSanitization(receipt).map((failure) => `Storage/Edge/Realtime receipt: ${failure}`));
  return failures.sort((left, right) => left.localeCompare(right));
}

export function validateStorageEdgeRealtimeExecutionDenominatorContract(contract) {
  const failures = [];
  const requireContract = (condition, message) => {
    if (!condition) failures.push(`Storage/Edge/Realtime contract: ${message}`);
  };
  requireContract(contract?.version === '1.0.0' && contract?.contract_id === 'storage-edge-realtime-execution-denominator' && contract?.status === 'CURRENT', 'identity drift');
  requireContract(contract?.lifecycle?.source_contract === 'SOURCE_READY' && contract?.lifecycle?.execution === 'EXECUTION_BLOCKED' && contract?.lifecycle?.apply_admitted === false, 'lifecycle must remain source-ready, execution-blocked, and apply=false');
  requireContract(contract?.scope?.offline_contract_only === true, 'scope must remain offline only');
  for (const field of ['provider_connectivity_included', 'provider_runner_included', 'credential_material_included', 'sql_bytes_included', 'executable_bundle_included', 'storage_transfer_authorized', 'edge_deploy_authorized', 'realtime_mutation_authorized', 'data_api_mutation_authorized', 'rollback_disposal_or_revocation_authorized']) {
    requireContract(contract?.scope?.[field] === false, `${field} must remain false`);
  }
  requireContract(contract?.immutable_bindings?.migration_count === 122 && contract?.immutable_bindings?.standard_migration_sql_count === 0, 'migration denominator drift');
  requireContract(contract?.immutable_bindings?.migration_package_sha256 === 'b65d1c0b73607218cc37826d9bb77c25704ea18f957abba7b5667a79d0a2c8db' && contract?.immutable_bindings?.governance_manifest_sha256 === '82e7ecad9a68addff14c43c3bc237c54af2dd5d48cda454c0e1c121a3e4536ec', 'package identities drift');
  requireContract(contract?.immutable_bindings?.promoted_bundle?.manifest_sha256 === 'ce85de2e32fca8497d7bb6380e51e3bc9d5717f1a07b25151414da5552075849' && contract?.immutable_bindings?.promoted_bundle?.artifact_count === 4 && contract?.immutable_bindings?.promoted_bundle?.executable_statement_count === 721, 'reviewed promoted-byte manifest drift');
  for (const artifact of contract?.immutable_bindings?.promoted_bundle?.artifacts ?? []) {
    const absolute = path.join(repositoryRoot, artifact.path);
    requireContract(fs.existsSync(absolute), `${artifact.path} missing`);
    if (fs.existsSync(absolute)) {
      const bytes = fs.readFileSync(absolute);
      requireContract(bytes.length === artifact.bytes && crypto.createHash('sha256').update(bytes).digest('hex') === artifact.sha256, `${artifact.path} byte identity drift`);
    }
  }
  requireContract(contract?.immutable_bindings?.expected_state_model?.query_model_sha256 === 'fc34c2bd4a84cc04f632ab42fc15d5c1b767ce839ce6d014f4d116ed4473308c', 'expected-state query model drift');
  requireContract(exactOrderedValues(contract?.action_order, storageEdgeRealtimeActionOrder), 'action order drift');
  requireContract(contract?.storage_contract?.body_read_count === 2 && contract?.storage_contract?.body_reads_must_be_independent === true && contract?.storage_contract?.mutation_method === 'STORAGE_API_ONLY' && contract?.storage_contract?.direct_sql_storage_mutation_forbidden === true, 'Storage evidence boundary drift');
  requireContract(exactOrderedValues(contract?.realtime_contract?.broadcast_paths, ['CLIENT_JSON', 'CLIENT_BINARY', 'REST_JSON', 'REST_BINARY', 'DATABASE_JSON', 'DATABASE_BINARY']) && contract?.realtime_contract?.presence_disposition === 'EPHEMERAL_NOT_MIGRATED', 'Realtime denominator drift');
  requireContract(exactOrderedValues(contract?.outbound_contract?.surface_order, storageEdgeRealtimeOutboundSurfaces), 'outbound surface order drift');
  requireContract(contract?.data_api_contract?.oauth_scope === 'rest:read' && contract?.data_api_contract?.permission === 'data_api_config_read' && contract?.data_api_contract?.jwt_secret_redacted_required === true && contract?.data_api_contract?.raw_response_persistence_forbidden === true, 'Data API readback boundary drift');
  requireContract(exactOrderedValues(contract?.rollback_contract?.inverse_order, storageEdgeRealtimeRollbackOrder) && contract?.rollback_contract?.broad_drop_is_rollback === false && contract?.rollback_contract?.execution_requires_separate_authority === true, 'rollback boundary drift');
  const rollbackAuthentication = contract?.rollback_authentication ?? {};
  const forwardAuthentication = contract?.forward_evidence_authentication ?? {};
  requireContract(
    forwardAuthentication.verification_boundary === 'distinct_pinned_ed25519_signature'
      && forwardAuthentication.signature_domain === 'fawxzzy.platform.storage-edge-realtime.forward-evidence-ledger.v1'
      && exactOrderedValues(forwardAuthentication.evidence_classes, storageEdgeRealtimeForwardEvidenceClasses)
      && forwardAuthentication.caller_supplied_trust_material_allowed === false
      && forwardAuthentication.current_receipt_allowed_while_anchor_blocked === false
      && forwardAuthentication.must_be_distinct_from_rollback_anchors === true,
    'forward evidence authentication policy drift'
  );
  requireContract(
    rollbackAuthentication.per_surface?.signature_domain === 'fawxzzy.platform.storage-edge-realtime.per-surface-rollback.v1'
      && rollbackAuthentication.disposal_absence?.signature_domain === 'fawxzzy.platform.storage-edge-realtime.disposal-absence.v1'
      && rollbackAuthentication.credential_revocation?.signature_domain === 'fawxzzy.platform.storage-edge-realtime.credential-revocation.v1'
      && rollbackAuthentication.all_trust_anchors_must_be_distinct === true
      && rollbackAuthentication.caller_supplied_trust_material_allowed === false
      && rollbackAuthentication.current_receipt_allowed_while_anchor_blocked === false,
    'rollback authentication policy drift'
  );
  const rollbackAnchors = [
    rollbackAuthentication.per_surface?.trust_anchor,
    rollbackAuthentication.disposal_absence?.trust_anchor,
    rollbackAuthentication.credential_revocation?.trust_anchor
  ];
  requireContract(
    rollbackAnchors.every((anchor) => anchor?.status === 'BLOCKED'
      && anchor?.algorithm === 'Ed25519'
      && anchor?.key_id === 'UNKNOWN'
      && anchor?.public_key_spki_base64 === null
      && anchor?.public_key_spki_sha256 === null)
      && new Set(rollbackAnchors.map((anchor) => anchor?.verifier_reference)).size === 3,
    'checked-in rollback trust anchors must remain distinct, BLOCKED, and uninstalled'
  );
  const forwardAnchor = forwardAuthentication.trust_anchor;
  requireContract(
    forwardAnchor?.status === 'BLOCKED'
      && forwardAnchor?.algorithm === 'Ed25519'
      && forwardAnchor?.key_id === 'UNKNOWN'
      && forwardAnchor?.verifier_reference === 'storage-edge-realtime-forward-evidence-verifier-v1'
      && forwardAnchor?.public_key_spki_base64 === null
      && forwardAnchor?.public_key_spki_sha256 === null
      && !rollbackAnchors.some((anchor) => anchor?.verifier_reference === forwardAnchor?.verifier_reference),
    'checked-in forward evidence trust anchor must remain distinct, BLOCKED, and uninstalled'
  );
  requireContract(contract?.receipt_policy?.canonical_blocked_projection_required === true && contract?.receipt_policy?.trusted_action_time_must_be_injected === true && contract?.receipt_policy?.receipt_validated_at_is_trusted === false && contract?.receipt_policy?.unknown_may_be_promoted_to_current === false && contract?.receipt_policy?.aggregate_only === true, 'receipt trust/redaction boundary drift');
  requireContract(contract?.receipt_example?.status === 'BLOCKED', 'checked-in receipt must remain BLOCKED');
  failures.push(...validateStorageEdgeRealtimeExecutionDenominatorReceipt(contract, contract?.receipt_example));
  return failures.sort((left, right) => left.localeCompare(right));
}

export function validateAuthAppDataRehearsalReceipt(contract, receipt, validationContext = null) {
  const failures = [];
  const requireReceipt = (condition, message) => {
    if (!condition) failures.push(`auth/app-data rehearsal receipt: ${message}`);
  };
  const zero = '0'.repeat(64);
  const isCommitment = (value) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
  const isNonzeroCommitment = (value) => isCommitment(value) && value !== zero;
  const parseTime = (value) => typeof value === 'string' ? Date.parse(value) : Number.NaN;
  const forbiddenReceiptKeys = /^(?:raw_?rows?|primary_?keys?|uuids?|emails?|credentials?|tokens?|cookies?|password_?hashes?|provider_?responses?|project_?refs?|sql|machine_?paths?|storage_?object_?bodies)$/i;
  const scanReceipt = (value) => {
    if (Array.isArray(value)) {
      value.forEach(scanReceipt);
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, entry] of Object.entries(value)) {
      if (forbiddenReceiptKeys.test(key)) failures.push(`auth/app-data rehearsal receipt sanitization failure: FORBIDDEN_FIELD_${key.toUpperCase()}`);
      scanReceipt(entry);
    }
  };
  scanReceipt(receipt);
  requireReceipt(receipt?.version === '1.0.0', 'version drift');
  requireReceipt(receipt?.execution_lifecycle === 'EXECUTION_BLOCKED', 'execution lifecycle must remain blocked');
  requireReceipt(receipt?.apply_admitted === false, 'apply must remain false');
  requireReceipt(receipt?.source_contract_grants_provider_execution === false, 'source contract must not grant provider execution');
  requireReceipt(receipt?.contract_binding_set_sha256 === contract?.contract_bindings?.binding_set_sha256, 'contract binding-set digest mismatch');
  requireReceipt(receipt?.package?.migration_count === 122 && receipt?.package?.standard_migration_sql_count === 0 && receipt?.package?.migration_package_sha256 === 'b65d1c0b73607218cc37826d9bb77c25704ea18f957abba7b5667a79d0a2c8db' && receipt?.package?.governance_manifest_sha256 === '82e7ecad9a68addff14c43c3bc237c54af2dd5d48cda454c0e1c121a3e4536ec', 'immutable migration package or governance binding mismatch');
  requireReceipt(receipt?.rollback?.source_projects_active === true && receipt?.rollback?.source_mutation_count === 0, 'source systems must remain active and unmodified');
  requireReceipt(receipt?.rollback?.target_disposal_authorized === false && receipt?.rollback?.credential_revocation_authorized === false, 'disposal and credential revocation require separate authority');
  requireReceipt(receipt?.rollback?.terminal_disposition === 'QUARANTINED_RETAINED', 'terminal target disposition drift');
  for (const field of authAppDataZeroEffectFields) {
    requireReceipt(receipt?.external_effects?.[field] === 0, `${field} must be zero`);
  }

  if (receipt?.status === 'BLOCKED') {
    requireReceipt(canonicalDigest(receipt) === canonicalDigest(contract?.receipt_example), 'checked-in BLOCKED receipt must equal the complete canonical projection');
    requireReceipt(receipt?.evidence_complete === false, 'checked-in BLOCKED receipt cannot claim complete evidence');
    requireReceipt(receipt?.validated_at === null, 'checked-in BLOCKED receipt cannot claim validation time');
    requireReceipt(receipt?.execution_authority?.status === 'BLOCKED', 'checked-in BLOCKED receipt cannot claim execution authority');
    requireReceipt(receipt?.execution_authority?.authority_authentication?.key_id === 'UNKNOWN'
      && receipt?.execution_authority?.authority_authentication?.public_key_spki_sha256 === null
      && receipt?.execution_authority?.authority_authentication?.signature_base64 === 'AA=='
      && receipt?.execution_authority?.executor_authentication?.key_id === 'UNKNOWN'
      && receipt?.execution_authority?.executor_authentication?.public_key_spki_sha256 === null
      && receipt?.execution_authority?.executor_authentication?.signature_base64 === 'AA==', 'checked-in BLOCKED receipt cannot claim authenticated authority or executor');
    requireReceipt(receipt?.write_barrier?.authority_authentication?.key_id === 'UNKNOWN'
      && receipt?.write_barrier?.authority_authentication?.public_key_spki_sha256 === null
      && receipt?.write_barrier?.authority_authentication?.signed_payload_sha256 === zero
      && receipt?.write_barrier?.authority_authentication?.signature_base64 === 'AA==', 'checked-in BLOCKED receipt cannot claim authenticated write-barrier authority');
    requireReceipt(receipt?.subject_sha256 === zero && receipt?.run_correlation_sha256 === zero, 'checked-in BLOCKED receipt cannot claim subject or run execution identity');
    requireReceipt(receipt?.execution_authority?.authority_identity_sha256 === zero
      && receipt?.execution_authority?.executor_identity_sha256 === zero
      && receipt?.execution_authority?.executor_capability_sha256 === zero
      && receipt?.execution_authority?.prerequisite_set_sha256 === zero
      && receipt?.execution_authority?.authority_receipt_sha256 === zero
      && receipt?.execution_authority?.executor_receipt_sha256 === zero, 'checked-in BLOCKED receipt cannot claim execution authority or executor evidence');
    requireReceipt(receipt?.write_barrier?.status === 'BLOCKED'
      && receipt?.write_barrier?.subject_sha256 === zero
      && receipt?.write_barrier?.run_correlation_sha256 === zero
      && receipt?.write_barrier?.prerequisite_set_sha256 === zero
      && receipt?.write_barrier?.source_scope_sha256 === zero
      && receipt?.write_barrier?.authority_identity_sha256 === zero
      && receipt?.write_barrier?.authority_event_id === null
      && receipt?.write_barrier?.authority_event_payload_sha256 === zero
      && receipt?.write_barrier?.authority_issued_at === null
      && receipt?.write_barrier?.authority_authorized_at === null
      && receipt?.write_barrier?.authority_observed_at === null
      && receipt?.write_barrier?.authority_expires_at === null
      && receipt?.write_barrier?.authority_receipt_sha256 === zero
      && receipt?.write_barrier?.entered_at === null
      && receipt?.write_barrier?.released_at === null, 'checked-in BLOCKED receipt cannot claim write-barrier authority, freshness, or chronology');
    requireReceipt(receipt?.identity_ledger?.status === 'BLOCKED'
      && receipt?.external_effects?.status === 'BLOCKED'
      && receipt?.rollback?.status === 'BLOCKED', 'checked-in BLOCKED receipt cannot contain nested CURRENT execution evidence');
    requireReceipt(exactOrderedValues((receipt?.prerequisites ?? []).map((prerequisite) => prerequisite.name), authAppDataPrerequisites) && receipt.prerequisites.every((prerequisite) => prerequisite.status === 'BLOCKED'), 'checked-in prerequisites must remain complete and BLOCKED');
    requireReceipt(exactOrderedValues(receipt?.completed_actions, []), 'checked-in BLOCKED receipt cannot claim completed actions');
    requireReceipt(exactOrderedValues(receipt?.auth_surfaces, []), 'checked-in BLOCKED receipt cannot claim Auth evidence');
    requireReceipt(exactOrderedValues(receipt?.application_data?.nonrow_surfaces, []), 'checked-in BLOCKED receipt cannot claim non-row evidence');
    requireReceipt(exactOrderedValues(receipt?.snapshots, []), 'checked-in BLOCKED receipt cannot claim snapshots');
    requireReceipt(receipt?.postimport_reads?.read_a === null && receipt?.postimport_reads?.read_b === null, 'checked-in BLOCKED receipt cannot claim parity reads');
    requireReceipt(receipt?.postimport_reads?.observation_window_seconds === 0 && receipt?.postimport_reads?.identical === false, 'checked-in BLOCKED receipt cannot claim read agreement');
    requireReceipt(receipt?.postimport_reads?.query_model_sha256 === authAppDataExpectedStateQueryModelSha256, 'checked-in query model binding drift');
    requireReceipt(receipt?.negative_probes?.completed_at === null && exactOrderedValues(receipt?.negative_probes?.results, []), 'checked-in BLOCKED receipt cannot claim negative probes');
    requireReceipt(receipt?.membership_activation?.status === 'BLOCKED' && receipt?.membership_activation?.activated_at === null && receipt?.membership_activation?.activated_mapping_count === 0 && receipt?.membership_activation?.remaining_pending_count === 0, 'checked-in BLOCKED receipt cannot claim membership activation');
    return failures.sort((left, right) => left.localeCompare(right));
  }

  requireReceipt(receipt?.status === 'CURRENT', 'terminal receipt must be CURRENT or BLOCKED');
  requireReceipt(receipt?.evidence_complete === true, 'CURRENT receipt requires complete evidence');
  requireReceipt(Number.isFinite(parseTime(receipt?.validated_at)), 'CURRENT receipt requires a valid validation time');
  requireReceipt(isNonzeroCommitment(receipt?.subject_sha256) && isNonzeroCommitment(receipt?.run_correlation_sha256), 'subject and run commitments must be nonzero');
  requireReceipt(receipt?.subject_sha256 !== receipt?.run_correlation_sha256, 'subject and run commitments must be distinct');
  const authority = receipt?.execution_authority ?? {};
  requireReceipt(authority.status === 'CURRENT' && authority.authorized_operation === 'AUTH_APP_DATA_REHEARSAL', 'CURRENT receipt requires separately admitted execution authority');
  requireReceipt(authority.subject_sha256 === receipt?.subject_sha256 && authority.run_correlation_sha256 === receipt?.run_correlation_sha256, 'execution authority subject/run binding mismatch');
  const prerequisites = receipt?.prerequisites ?? [];
  requireReceipt(exactOrderedValues(prerequisites.map((prerequisite) => prerequisite.name), authAppDataPrerequisites), 'prerequisite denominator or order drift');
  requireReceipt(new Set(prerequisites.map((prerequisite) => prerequisite.evidence_receipt_sha256)).size === authAppDataPrerequisites.length, 'prerequisite evidence receipts must be distinct');
  for (const prerequisite of prerequisites) {
    requireReceipt(prerequisite?.status === 'CURRENT', `${String(prerequisite?.name)} prerequisite must be CURRENT`);
    requireReceipt(prerequisite?.subject_sha256 === receipt?.subject_sha256 && prerequisite?.run_correlation_sha256 === receipt?.run_correlation_sha256, `${String(prerequisite?.name)} prerequisite subject/run binding mismatch`);
    requireReceipt(isNonzeroCommitment(prerequisite?.evidence_receipt_sha256), `${String(prerequisite?.name)} prerequisite evidence must be nonzero`);
  }
  const prerequisiteSetSha256 = authAppDataPrerequisiteSetSha256(receipt);
  requireReceipt(authority.contract_binding_set_sha256 === receipt?.contract_binding_set_sha256, 'execution authority contract binding-set mismatch');
  requireReceipt(authority.migration_package_sha256 === receipt?.package?.migration_package_sha256 && authority.governance_manifest_sha256 === receipt?.package?.governance_manifest_sha256, 'execution authority package binding mismatch');
  requireReceipt(authority.prerequisite_set_sha256 === prerequisiteSetSha256, 'execution authority prerequisite-set binding mismatch');
  requireReceipt(isNonzeroCommitment(authority.authority_identity_sha256) && isNonzeroCommitment(authority.executor_identity_sha256) && isNonzeroCommitment(authority.executor_capability_sha256), 'authority and executor identities/capability must be nonzero');
  requireReceipt(new Set([authority.authority_identity_sha256, authority.executor_identity_sha256, authority.executor_capability_sha256]).size === 3, 'authority and executor identities/capability must be distinct');
  const expectedAuthorityReceiptSha256 = canonicalDigest(authAppDataAuthorityReceiptSubject(receipt, authority));
  const expectedExecutorReceiptSha256 = canonicalDigest(authAppDataExecutorReceiptSubject(receipt, authority));
  requireReceipt(authority.authority_receipt_sha256 === expectedAuthorityReceiptSha256, 'execution authority receipt does not bind the exact package, contracts, prerequisites, authority, and executor');
  requireReceipt(authority.executor_receipt_sha256 === expectedExecutorReceiptSha256, 'executor receipt does not bind the exact package, contracts, prerequisites, and executor');
  requireReceipt(authority.authority_receipt_sha256 !== authority.executor_receipt_sha256, 'authority and executor receipts must be distinct');
  const authorityAuthenticationPolicy = contract?.execution_authentication?.authority;
  const executorAuthenticationPolicy = contract?.execution_authentication?.executor;
  requireReceipt(authorityAuthenticationPolicy?.trust_anchor?.key_id !== executorAuthenticationPolicy?.trust_anchor?.key_id
    && authorityAuthenticationPolicy?.trust_anchor?.public_key_spki_sha256 !== executorAuthenticationPolicy?.trust_anchor?.public_key_spki_sha256, 'authority and executor trust anchors must be distinct');
  requireReceipt(authAppDataVerifyAuthentication(authAppDataAuthorityReceiptSubject(receipt, authority), authority.authority_authentication, authorityAuthenticationPolicy), 'execution authority authentication does not verify against the pinned source-authorized trust anchor');
  requireReceipt(authAppDataVerifyAuthentication(authAppDataExecutorReceiptSubject(receipt, authority), authority.executor_authentication, executorAuthenticationPolicy), 'executor capability authentication does not verify against the distinct pinned source-authorized trust anchor');
  requireReceipt(exactOrderedValues(receipt?.completed_actions, authAppDataActionOrder), 'fixed action order is incomplete or reordered');

  const expectedAuthDispositions = contract?.auth_surface_dispositions ?? [];
  const actualAuthSurfaces = receipt?.auth_surfaces ?? [];
  requireReceipt(exactOrderedValues(actualAuthSurfaces.map((surface) => surface.surface), authAppDataAuthSurfaces), 'Auth surface denominator or order drift');
  requireReceipt(new Set(actualAuthSurfaces.map((surface) => surface.surface)).size === authAppDataAuthSurfaces.length, 'Auth surfaces must be unique');
  for (const [index, surface] of actualAuthSurfaces.entries()) {
    requireReceipt(surface?.disposition === expectedAuthDispositions[index]?.disposition, `${String(surface?.surface)} disposition mismatch`);
    requireReceipt(surface?.status === 'CURRENT', `${String(surface?.surface)} must be CURRENT`);
    requireReceipt(Number.isInteger(surface?.count) && surface.count >= 0, `${String(surface?.surface)} count is invalid`);
    requireReceipt(isNonzeroCommitment(surface?.aggregate_sha256), `${String(surface?.surface)} aggregate commitment must be nonzero`);
  }

  requireReceipt(receipt?.application_data?.relation_total === 41, 'application relation denominator must remain 41');
  requireReceipt(canonicalDigest((receipt?.application_data?.adapter_counts ?? []).map(({ app, relation_count }) => ({ app, relation_count }))) === canonicalDigest(authAppDataAdapterCounts.map(({ app, relation_count }) => ({ app, relation_count }))), 'adapter relation counts or order drift');
  for (const adapter of receipt?.application_data?.adapter_counts ?? []) {
    requireReceipt(isNonzeroCommitment(adapter?.aggregate_sha256), `${String(adapter?.app)} aggregate commitment must be nonzero`);
  }
  const expectedNonrowDispositions = contract?.application_data_denominator?.nonrow_surfaces ?? [];
  const actualNonrowSurfaces = receipt?.application_data?.nonrow_surfaces ?? [];
  requireReceipt(exactOrderedValues(actualNonrowSurfaces.map((surface) => surface.surface), authAppDataNonrowSurfaces), 'non-row surface denominator or order drift');
  requireReceipt(new Set(actualNonrowSurfaces.map((surface) => surface.surface)).size === authAppDataNonrowSurfaces.length, 'non-row surfaces must be unique');
  for (const [index, surface] of actualNonrowSurfaces.entries()) {
    requireReceipt(surface?.disposition === expectedNonrowDispositions[index]?.disposition, `${String(surface?.surface)} disposition mismatch`);
    requireReceipt(surface?.status === 'CURRENT', `${String(surface?.surface)} must be CURRENT`);
    requireReceipt(Number.isInteger(surface?.count) && surface.count >= 0, `${String(surface?.surface)} count is invalid`);
    requireReceipt(isNonzeroCommitment(surface?.aggregate_sha256), `${String(surface?.surface)} aggregate commitment must be nonzero`);
  }

  requireReceipt(receipt?.identity_ledger?.status === 'CURRENT' && receipt?.identity_ledger?.complete_owner_fk_coverage === true, 'identity ledger must close every owner FK');
  requireReceipt(isNonzeroCommitment(receipt?.identity_ledger?.aggregate_sha256), 'identity ledger aggregate commitment must be nonzero');
  requireReceipt(Number.isInteger(receipt?.identity_ledger?.accepted_mapping_count) && Number.isInteger(receipt?.identity_ledger?.quarantined_mapping_count), 'identity mapping counts must be integers');
  requireReceipt(Number.isInteger(receipt?.identity_ledger?.pending_membership_count) && Number.isInteger(receipt?.identity_ledger?.suspended_membership_count), 'membership counts must be integers');

  const snapshots = receipt?.snapshots ?? [];
  requireReceipt(exactOrderedValues(snapshots.map((snapshot) => snapshot.name), ['S0', 'S1', 'S2']), 'snapshot denominator or order drift');
  requireReceipt(new Set(snapshots.map((snapshot) => snapshot.evidence_receipt_sha256)).size === 3, 'snapshot evidence receipts must be distinct');
  for (const snapshot of snapshots) {
    requireReceipt(snapshot?.status === 'CURRENT' && snapshot?.complete_denominator === true, `${String(snapshot?.name)} must have a complete CURRENT denominator`);
    requireReceipt(snapshot?.subject_sha256 === receipt?.subject_sha256 && snapshot?.run_correlation_sha256 === receipt?.run_correlation_sha256, `${String(snapshot?.name)} subject/run binding mismatch`);
    requireReceipt(isNonzeroCommitment(snapshot?.aggregate_sha256) && isNonzeroCommitment(snapshot?.evidence_receipt_sha256), `${String(snapshot?.name)} commitments must be nonzero`);
    requireReceipt(Number.isFinite(parseTime(snapshot?.observed_at)), `${String(snapshot?.name)} observation time is invalid`);
  }
  const [s0, s1, s2] = snapshots.map((snapshot) => parseTime(snapshot?.observed_at));
  const enteredAt = parseTime(receipt?.write_barrier?.entered_at);
  const releasedAt = parseTime(receipt?.write_barrier?.released_at);
  requireReceipt(s0 < s1 && s1 <= enteredAt && enteredAt < s2 && s2 <= releasedAt, 'S0/S1/barrier/S2 chronology is invalid');
  const writeBarrier = receipt?.write_barrier ?? {};
  const writeBarrierSubject = authAppDataWriteBarrierAuthoritySubject(receipt);
  requireReceipt(writeBarrier.status === 'CURRENT' && writeBarrier.authorized_operation === 'SOURCE_WRITE_BARRIER', 'write barrier requires separately admitted authority for the exact operation');
  requireReceipt(writeBarrier.contract_version === contract?.version, 'write-barrier authority contract-version binding mismatch');
  requireReceipt(writeBarrier.subject_sha256 === receipt?.subject_sha256 && writeBarrier.run_correlation_sha256 === receipt?.run_correlation_sha256, 'write-barrier authority subject/run binding mismatch');
  requireReceipt(writeBarrier.contract_binding_set_sha256 === receipt?.contract_binding_set_sha256
    && writeBarrier.migration_package_sha256 === receipt?.package?.migration_package_sha256
    && writeBarrier.governance_manifest_sha256 === receipt?.package?.governance_manifest_sha256
    && writeBarrier.prerequisite_set_sha256 === prerequisiteSetSha256, 'write-barrier authority package, contract, or prerequisite binding mismatch');
  requireReceipt(isNonzeroCommitment(writeBarrier.source_scope_sha256) && isNonzeroCommitment(writeBarrier.authority_identity_sha256), 'write-barrier source scope and authority identity must be nonzero');
  requireReceipt(![authority.authority_identity_sha256, authority.executor_identity_sha256, authority.executor_capability_sha256].includes(writeBarrier.authority_identity_sha256), 'write-barrier authority identity must be distinct from rehearsal authority and executor identities');
  requireReceipt(writeBarrier.authority_maximum_age_seconds === contract?.execution_authentication?.write_barrier?.freshness_seconds_maximum, 'write-barrier authority maximum-age policy mismatch');
  requireReceipt(/^onv1_[0-9a-f]{64}$/.test(writeBarrier.authority_event_id ?? '')
    && writeBarrier.authority_event_id === `onv1_${writeBarrier.authority_event_payload_sha256}`
    && isNonzeroCommitment(writeBarrier.authority_event_payload_sha256), 'write-barrier authority event identity does not match its payload digest');
  const barrierIssuedAt = parseTime(writeBarrier.authority_issued_at);
  const barrierAuthorizedAt = parseTime(writeBarrier.authority_authorized_at);
  const barrierObservedAt = parseTime(writeBarrier.authority_observed_at);
  const barrierExpiresAt = parseTime(writeBarrier.authority_expires_at);
  const barrierValidatedAt = parseTime(receipt?.validated_at);
  const trustedActionTime = parseTime(validationContext?.trusted_action_time);
  requireReceipt([barrierIssuedAt, barrierAuthorizedAt, barrierObservedAt, barrierExpiresAt, barrierValidatedAt, trustedActionTime].every(Number.isFinite), 'write-barrier authority freshness or trusted action-time timestamp is invalid');
  requireReceipt(barrierIssuedAt <= barrierAuthorizedAt
    && barrierAuthorizedAt <= barrierObservedAt
    && barrierObservedAt <= barrierValidatedAt
    && barrierValidatedAt <= trustedActionTime
    && trustedActionTime <= barrierExpiresAt, 'write-barrier authority issuance, authorization, observation, receipt validation, trusted action time, and expiry chronology is invalid');
  requireReceipt(trustedActionTime - barrierAuthorizedAt <= writeBarrier.authority_maximum_age_seconds * 1000
    && barrierExpiresAt - barrierAuthorizedAt <= writeBarrier.authority_maximum_age_seconds * 1000, 'write-barrier authority is stale, expired, or exceeds the contract maximum age');
  requireReceipt(writeBarrier.authority_receipt_sha256 === canonicalDigest(writeBarrierSubject), 'write-barrier authority receipt does not bind the exact contract, source scope, subject, run, package, prerequisites, and chronology');
  requireReceipt(authAppDataVerifyAuthentication(writeBarrierSubject, writeBarrier.authority_authentication, contract?.execution_authentication?.write_barrier), 'write-barrier authority authentication does not verify against its distinct pinned source-authorized trust anchor');
  const consumptionTrustAnchor = contract?.execution_authentication?.write_barrier_consumption?.trust_anchor ?? {};
  requireReceipt([
    authorityAuthenticationPolicy?.trust_anchor,
    executorAuthenticationPolicy?.trust_anchor,
    contract?.execution_authentication?.write_barrier?.trust_anchor
  ].every((anchor) => anchor?.key_id !== consumptionTrustAnchor.key_id
    && anchor?.public_key_spki_sha256 !== consumptionTrustAnchor.public_key_spki_sha256), 'write-barrier consumption trust anchor must be distinct from every authority and executor trust anchor');
  const consumptionEvidence = validationContext?.consumption_evidence ?? {};
  const consumptionSubject = authorityEventConsumptionSubject('AUTH_APP_DATA_WRITE_BARRIER_AUTHORITY_CONSUMPTION_V1', validationContext);
  requireReceipt(consumptionEvidence.subject_sha256 === receipt?.subject_sha256
    && consumptionEvidence.run_correlation_sha256 === receipt?.run_correlation_sha256
    && consumptionEvidence.authority_event_id === writeBarrier.authority_event_id
    && consumptionEvidence.authority_event_payload_sha256 === writeBarrier.authority_event_payload_sha256
    && consumptionEvidence.authority_receipt_sha256 === writeBarrier.authority_receipt_sha256, 'write-barrier consumption evidence must bind the exact subject, run, event, payload, and authority receipt');
  requireReceipt(consumptionEvidence.consumed_at === validationContext?.trusted_action_time
    && consumptionEvidence.ledger_observed_at === validationContext?.trusted_action_time, 'write-barrier consumption evidence must be observed and consumed at the injected trusted action time');
  requireReceipt(consumptionEvidence.prior_consumption_count === 0
    && consumptionEvidence.current_consumption_count === 1
    && consumptionEvidence.transition === 'UNCONSUMED_TO_CONSUMED', 'write-barrier authority event was already consumed or lacks an exact one-time transition');
  requireReceipt(Number.isInteger(consumptionEvidence.ledger_sequence) && consumptionEvidence.ledger_sequence >= 1, 'write-barrier consumption evidence requires a positive external ledger sequence');
  requireReceipt(isNonzeroCommitment(consumptionEvidence.observer_identity_sha256)
    && consumptionEvidence.observer_identity_sha256 !== writeBarrier.authority_identity_sha256, 'write-barrier consumption observer must be nonzero and distinct from the authority');
  requireReceipt(isNonzeroCommitment(consumptionEvidence.ledger_preimage_sha256)
    && isNonzeroCommitment(consumptionEvidence.ledger_postimage_sha256)
    && consumptionEvidence.ledger_preimage_sha256 !== consumptionEvidence.ledger_postimage_sha256, 'write-barrier consumption requires distinct nonzero external ledger preimage and postimage commitments');
  requireReceipt(consumptionEvidence.evidence_receipt_sha256 === canonicalDigest(consumptionSubject), 'write-barrier consumption receipt does not bind the trusted action-time ledger transition');
  requireReceipt(authAppDataVerifyAuthentication(consumptionSubject, consumptionEvidence.authentication, contract?.execution_authentication?.write_barrier_consumption), 'write-barrier consumption evidence does not verify against the distinct pinned consumption trust anchor');

  const reads = receipt?.postimport_reads ?? {};
  const readA = reads.read_a ?? {};
  const readB = reads.read_b ?? {};
  const readATime = parseTime(readA.observed_at);
  const readBTime = parseTime(readB.observed_at);
  requireReceipt(reads.status === 'CURRENT' && reads.identical === true, 'post-import reads must be CURRENT and identical');
  requireReceipt(readA.subject_sha256 === receipt?.subject_sha256 && readB.subject_sha256 === receipt?.subject_sha256 && readA.run_correlation_sha256 === receipt?.run_correlation_sha256 && readB.run_correlation_sha256 === receipt?.run_correlation_sha256, 'post-import read subject/run binding mismatch');
  requireReceipt(readA.complete_denominator === true && readB.complete_denominator === true, 'both post-import reads require complete denominators');
  const expectedStateSha256 = canonicalDigest(authAppDataExpectedStateSubject(receipt));
  requireReceipt(reads.query_model_sha256 === authAppDataExpectedStateQueryModelSha256 && readA.query_model_sha256 === reads.query_model_sha256 && readB.query_model_sha256 === reads.query_model_sha256, 'post-import query model is not the canonical expected-state model');
  requireReceipt(reads.expected_aggregate_sha256 === expectedStateSha256 && readA.aggregate_sha256 === expectedStateSha256 && readB.aggregate_sha256 === expectedStateSha256, 'post-import aggregate commitments do not bind complete S2 and per-surface expected state');
  requireReceipt(isNonzeroCommitment(readA.evidence_receipt_sha256) && isNonzeroCommitment(readB.evidence_receipt_sha256) && readA.evidence_receipt_sha256 !== readB.evidence_receipt_sha256, 'post-import evidence receipts must be nonzero and distinct');
  requireReceipt(isNonzeroCommitment(readA.reader_identity_sha256) && isNonzeroCommitment(readB.reader_identity_sha256) && readA.reader_identity_sha256 !== readB.reader_identity_sha256, 'post-import reader identities must be nonzero and distinct');
  requireReceipt(isNonzeroCommitment(readA.execution_identity_sha256) && isNonzeroCommitment(readB.execution_identity_sha256) && readA.execution_identity_sha256 !== readB.execution_identity_sha256, 'post-import execution identities must be nonzero and distinct');
  const observationWindowSeconds = (readBTime - readATime) / 1000;
  requireReceipt(readATime >= releasedAt && readATime < readBTime, 'post-import read chronology is invalid');
  requireReceipt(observationWindowSeconds === reads.observation_window_seconds, 'declared observation window does not match read timestamps');
  requireReceipt(observationWindowSeconds >= contract?.postimport_parity?.minimum_observation_window_seconds && observationWindowSeconds <= contract?.postimport_parity?.maximum_observation_window_seconds, 'observation window is outside the admitted range');

  const probes = receipt?.negative_probes?.results ?? [];
  const probesCompletedAt = parseTime(receipt?.negative_probes?.completed_at);
  requireReceipt(receipt?.negative_probes?.status === 'CURRENT', 'negative probes must be CURRENT');
  requireReceipt(exactOrderedValues(probes.map((probe) => probe.name), authAppDataNegativeProbes), 'negative-probe denominator or order drift');
  requireReceipt(probes.every((probe) => probe.passed === true && isNonzeroCommitment(probe.evidence_sha256)), 'every negative probe must pass with nonzero evidence');
  requireReceipt(Number.isFinite(probesCompletedAt) && probesCompletedAt >= readBTime, 'negative probes must complete after read B');
  const membershipActivation = receipt?.membership_activation ?? {};
  const membershipActivatedAt = parseTime(membershipActivation.activated_at);
  requireReceipt(membershipActivation.status === 'CURRENT' && isNonzeroCommitment(membershipActivation.evidence_sha256), 'membership activation requires CURRENT nonzero evidence');
  requireReceipt(membershipActivation.activated_mapping_count === receipt?.identity_ledger?.pending_membership_count && membershipActivation.remaining_pending_count === 0, 'membership activation count must close the accepted pending denominator');
  requireReceipt(receipt?.identity_ledger?.accepted_mapping_count >= membershipActivation.activated_mapping_count, 'membership activation cannot exceed accepted identity mappings');
  requireReceipt(Number.isFinite(membershipActivatedAt) && membershipActivatedAt >= probesCompletedAt, 'membership activation must follow read parity and all negative probes');
  requireReceipt(receipt?.external_effects?.status === 'CURRENT', 'external-effect evidence must be CURRENT');
  requireReceipt(receipt?.rollback?.status === 'CURRENT' && receipt?.rollback?.reverse_evidence_complete === true, 'reverse rollback evidence must be complete and CURRENT');
  requireReceipt(receipt?.rollback?.external_effect_count === 0 && isNonzeroCommitment(receipt?.rollback?.evidence_sha256), 'rollback must prove zero external effects with nonzero evidence');

  const terminalBinding = canonicalDigest({ ...receipt, terminal_receipt_sha256: zero });
  requireReceipt(receipt?.terminal_receipt_sha256 === terminalBinding, 'terminal receipt digest does not bind the aggregate receipt');
  requireReceipt(parseTime(receipt?.validated_at) >= membershipActivatedAt, 'validation must occur after gated membership activation');
  return failures.sort((left, right) => left.localeCompare(right));
}

export function validateAuthAppDataRehearsalContract(contract, documents = loadDocuments()) {
  const failures = [];
  const requireContract = (condition, message) => {
    if (!condition) failures.push(`auth/app-data rehearsal contract: ${message}`);
  };
  requireContract(contract?.version === '1.0.0' && contract?.contract_id === 'auth-app-data-rehearsal', 'identity drift');
  requireContract(contract?.status === 'CURRENT', 'source contract must remain CURRENT');
  requireContract(contract?.lifecycle?.source_contract === 'SOURCE_READY' && contract?.lifecycle?.execution === 'EXECUTION_BLOCKED' && contract?.lifecycle?.apply_admitted === false, 'lifecycle must remain source-ready, execution-blocked, and apply=false');
  requireContract(contract?.scope?.offline_contract_only === true, 'scope must remain offline only');
  for (const field of [
    'provider_connectivity_included',
    'provider_runner_included',
    'credential_material_included',
    'sql_executor_included',
    'executable_bundle_included',
    'auth_or_data_mutation_authorized',
    'storage_edge_realtime_mutation_authorized',
    'rollback_or_disposal_authorized',
    'source_retirement_or_deletion_authorized'
  ]) {
    requireContract(contract?.scope?.[field] === false, `${field} must remain false`);
  }
  requireContract(contract?.contract_bindings?.digest_model === 'CANONICAL_JSON_BYTES_SHA256_V1', 'binding digest model drift');
  requireContract(contract?.contract_bindings?.binding_set_sha256 === authAppDataBindingSetSha256, 'binding-set digest drift');
  requireContract(canonicalDigest(contract?.contract_bindings?.documents ?? []) === authAppDataBindingSetSha256, 'binding-set content does not match its digest');
  requireContract(canonicalDigest(contract?.contract_bindings?.documents ?? []) === canonicalDigest(authAppDataBindingDocuments), 'contract binding path/version/digest denominator drift');
  for (const binding of authAppDataBindingDocuments) {
    const document = documents?.[binding.path];
    if (binding.path === 'contracts/v1/transport/discordos-app-data-adapter-contract.json') {
      requireContract(document?.version === '1.2.0' && canonicalDigest(document) === '9545be65b9a0144b5381610dcf473871f896554128e64ee7d137c64774976cb0', `${binding.path} corrected current-contract digest drift`);
      requireContract(document?.inert_boundary?.music_sesh_artifact_status === 'INCOMPATIBLE_UNADMITTED' && document?.inert_boundary?.music_sesh_artifact_regeneration === 'REQUIRED_SEPARATE_AUTHORITY' && document?.inert_boundary?.generated_artifact_changes_admitted === false, `${binding.path} historical rehearsal-artifact hold drift`);
      continue;
    }
    requireContract(document?.version === binding.version, `${binding.path} version drift`);
    requireContract(document !== undefined && canonicalDigest(document) === binding.sha256, `${binding.path} canonical digest drift`);
  }
  const executionDenominator = contract?.execution_denominator ?? {};
  requireContract(
    executionDenominator.status === 'CURRENT'
      && executionDenominator.contract_path === storageEdgeRealtimeContractPath
      && executionDenominator.contract_version === '1.0.0'
      && executionDenominator.contract_sha256 === storageEdgeRealtimeContractSha256
      && executionDenominator.source_contract === 'SOURCE_READY'
      && executionDenominator.execution === 'EXECUTION_BLOCKED'
      && executionDenominator.apply_admitted === false
      && executionDenominator.provider_mutation_authorized === false,
    'Storage/Edge/Realtime execution-denominator binding or lifecycle drift'
  );
  const executionAuthentication = contract?.execution_authentication ?? {};
  const authorityPolicy = executionAuthentication.authority ?? {};
  const executorPolicy = executionAuthentication.executor ?? {};
  const writeBarrierPolicy = executionAuthentication.write_barrier ?? {};
  const writeBarrierConsumptionPolicy = executionAuthentication.write_barrier_consumption ?? {};
  requireContract(authorityPolicy.verification_boundary === 'pinned_ed25519_signature'
    && authorityPolicy.signature_domain === 'fawxzzy.platform.auth-app-data.execution-authority.v1'
    && authorityPolicy.trust_anchor?.status === 'BLOCKED'
    && authorityPolicy.trust_anchor?.algorithm === 'Ed25519'
    && authorityPolicy.trust_anchor?.key_id === 'UNKNOWN'
    && authorityPolicy.trust_anchor?.verifier_reference === 'auth-app-data-authority-verifier-v1'
    && authorityPolicy.trust_anchor?.public_key_spki_base64 === null
    && authorityPolicy.trust_anchor?.public_key_spki_sha256 === null, 'checked-in execution-authority trust anchor must remain explicitly BLOCKED and uninstalled');
  requireContract(executorPolicy.verification_boundary === 'distinct_pinned_ed25519_executor_signature'
    && executorPolicy.signature_domain === 'fawxzzy.platform.auth-app-data.executor-capability.v1'
    && executorPolicy.trust_anchor?.status === 'BLOCKED'
    && executorPolicy.trust_anchor?.algorithm === 'Ed25519'
    && executorPolicy.trust_anchor?.key_id === 'UNKNOWN'
    && executorPolicy.trust_anchor?.verifier_reference === 'auth-app-data-executor-verifier-v1'
    && executorPolicy.trust_anchor?.public_key_spki_base64 === null
    && executorPolicy.trust_anchor?.public_key_spki_sha256 === null, 'checked-in executor trust anchor must remain explicitly BLOCKED and uninstalled');
  requireContract(writeBarrierPolicy.verification_boundary === 'distinct_pinned_ed25519_write_barrier_authority_signature'
    && writeBarrierPolicy.signature_domain === 'fawxzzy.platform.auth-app-data.write-barrier-authority.v1'
    && writeBarrierPolicy.freshness_seconds_maximum === 900
    && writeBarrierPolicy.trust_anchor?.status === 'BLOCKED'
    && writeBarrierPolicy.trust_anchor?.algorithm === 'Ed25519'
    && writeBarrierPolicy.trust_anchor?.key_id === 'UNKNOWN'
    && writeBarrierPolicy.trust_anchor?.verifier_reference === 'auth-app-data-write-barrier-authority-verifier-v1'
    && writeBarrierPolicy.trust_anchor?.public_key_spki_base64 === null
    && writeBarrierPolicy.trust_anchor?.public_key_spki_sha256 === null, 'checked-in write-barrier trust anchor must remain explicitly BLOCKED and uninstalled');
  requireContract(writeBarrierConsumptionPolicy.verification_boundary === 'distinct_pinned_ed25519_one_time_consumption_signature'
    && writeBarrierConsumptionPolicy.signature_domain === 'fawxzzy.platform.auth-app-data.write-barrier-consumption.v1'
    && writeBarrierConsumptionPolicy.evidence_model === 'AUTH_APP_DATA_WRITE_BARRIER_AUTHORITY_CONSUMPTION_V1'
    && writeBarrierConsumptionPolicy.required_transition === 'UNCONSUMED_TO_CONSUMED'
    && writeBarrierConsumptionPolicy.trusted_action_time_injected_required === true
    && writeBarrierConsumptionPolicy.receipt_validated_at_is_trusted_action_time === false
    && writeBarrierConsumptionPolicy.external_consumption_ledger_required === true
    && writeBarrierConsumptionPolicy.source_persists_consumption_ledger === false
    && writeBarrierConsumptionPolicy.trust_anchor?.status === 'BLOCKED'
    && writeBarrierConsumptionPolicy.trust_anchor?.algorithm === 'Ed25519'
    && writeBarrierConsumptionPolicy.trust_anchor?.key_id === 'UNKNOWN'
    && writeBarrierConsumptionPolicy.trust_anchor?.verifier_reference === 'auth-app-data-write-barrier-consumption-verifier-v1'
    && writeBarrierConsumptionPolicy.trust_anchor?.public_key_spki_base64 === null
    && writeBarrierConsumptionPolicy.trust_anchor?.public_key_spki_sha256 === null, 'checked-in write-barrier consumption trust anchor must remain explicitly BLOCKED and external');
  requireContract(executionAuthentication.all_trust_anchors_must_be_distinct === true
    && executionAuthentication.caller_supplied_trust_material_allowed === false
    && executionAuthentication.current_receipt_allowed_while_anchor_blocked === false, 'execution authentication trust policy drift');
  requireContract(exactOrderedValues((contract?.auth_surface_dispositions ?? []).map((surface) => surface.surface), authAppDataAuthSurfaces), 'Auth surface denominator or order drift');
  requireContract(exactOrderedValues((contract?.auth_surface_dispositions ?? []).map((surface) => surface.disposition), authAppDataAuthDispositions), 'Auth disposition policy drift');
  requireContract(new Set((contract?.auth_surface_dispositions ?? []).map((surface) => surface.surface)).size === authAppDataAuthSurfaces.length, 'Auth surfaces must be unique');
  requireContract((contract?.auth_surface_dispositions ?? []).every((surface) => typeof surface.disposition === 'string' && surface.disposition.length > 0), 'every Auth surface requires one closed disposition');
  requireContract(contract?.application_data_denominator?.relation_total === 41 && contract?.application_data_denominator?.transported_authoritative_or_history === 24 && contract?.application_data_denominator?.derived_rebuildable === 1 && contract?.application_data_denominator?.held_unknown_or_excluded === 16, 'application data classification denominator drift');
  requireContract(canonicalDigest(contract?.application_data_denominator?.adapters ?? []) === canonicalDigest(authAppDataAdapterCounts), 'adapter relation denominator or order drift');
  requireContract(exactOrderedValues((contract?.application_data_denominator?.nonrow_surfaces ?? []).map((surface) => surface.surface), authAppDataNonrowSurfaces), 'non-row surface denominator or order drift');
  requireContract(exactOrderedValues((contract?.application_data_denominator?.nonrow_surfaces ?? []).map((surface) => surface.disposition), authAppDataNonrowDispositions), 'non-row disposition policy drift');
  requireContract(new Set((contract?.application_data_denominator?.nonrow_surfaces ?? []).map((surface) => surface.surface)).size === authAppDataNonrowSurfaces.length, 'non-row surfaces must be unique');
  requireContract((contract?.application_data_denominator?.nonrow_surfaces ?? []).every((surface) => typeof surface.disposition === 'string' && surface.disposition.length > 0), 'every non-row surface requires one closed disposition');
  const identity = contract?.identity_and_membership ?? {};
  requireContract(identity.canonical_human_key === 'auth.users.id' && identity.private_identity_ledger === 'platform_private.source_identity_ledger' && identity.ledger_must_be_immutable === true && identity.accepted_mapping_required_for_every_owner_fk === true && identity.caller_selected_identity_forbidden === true && identity.raw_identity_in_receipt_forbidden === true, 'identity-ledger boundary drift');
  requireContract(identity.initial_membership_state === 'pending' && identity.activation_requires_accepted_identity_and_final_parity === true && identity.suspended_membership_preserved === true, 'membership activation boundary drift');
  requireContract(exactOrderedValues(contract?.action_order, authAppDataActionOrder), 'fixed action order drift');
  requireContract(contract?.action_order?.indexOf('RUN_SECURITY_AUTH_AND_EGRESS_NEGATIVE_PROBES') < contract?.action_order?.indexOf('ACTIVATE_PENDING_MEMBERSHIPS'), 'membership activation must follow final parity and negative probes');
  requireContract(exactOrderedValues(contract?.snapshot_protocol?.required_snapshots, ['S0', 'S1', 'S2']) && contract?.snapshot_protocol?.complete_primary_key_and_canonical_row_denominator_required === true && contract?.snapshot_protocol?.timestamp_or_high_water_only_proof_allowed === false && contract?.snapshot_protocol?.write_barrier_requires_separate_authority === true && contract?.snapshot_protocol?.final_s2_required_after_barrier === true && contract?.snapshot_protocol?.delete_requires_tombstone === true && contract?.snapshot_protocol?.resurrection_requires_explicit_generation === true, 'S0/S1/barrier/S2 protocol drift');
  requireContract(exactOrderedValues(contract?.cas_and_quarantine?.accepted_expected_target, ['ABSENT', 'EXACT_DIGEST']) && contract?.cas_and_quarantine?.unexpected_target_digest === 'QUARANTINE' && contract?.cas_and_quarantine?.unexpected_target_overwrite_forbidden === true && contract?.cas_and_quarantine?.outbound_effects_during_rehearsal === 'QUARANTINED' && contract?.cas_and_quarantine?.credentials_withheld_until_terminal_acceptance === true, 'CAS or quarantine boundary drift');
  const parity = contract?.postimport_parity ?? {};
  requireContract(parity.read_count === 2 && parity.reads_must_be_independent === true && parity.distinct_evidence_receipts_required === true && parity.distinct_reader_identities_required === true && parity.distinct_execution_identities_required === true && parity.query_model_binding_required === true && parity.aggregate_commitments_must_match_each_other === true && parity.aggregate_commitments_must_match_expected === true && parity.minimum_observation_window_seconds === 60 && parity.maximum_observation_window_seconds === 7200 && parity.complete_auth_row_and_nonrow_denominators_required === true, 'two-read parity boundary drift');
  requireContract(canonicalDigest({
    version: parity?.expected_state_model?.version,
    digest_model: parity?.expected_state_model?.digest_model,
    components: parity?.expected_state_model?.components
  }) === authAppDataExpectedStateQueryModelSha256 && parity?.expected_state_model?.query_model_sha256 === authAppDataExpectedStateQueryModelSha256, 'canonical expected-state query model drift');
  requireContract(exactOrderedValues(contract?.negative_probe_gate?.required_probes, authAppDataNegativeProbes) && contract?.negative_probe_gate?.all_must_pass === true && contract?.negative_probe_gate?.evidence_must_be_aggregate_only === true, 'negative-probe denominator drift');
  requireContract(contract?.receipt_policy?.unknown_may_be_promoted_to_current === false, 'UNKNOWN must not be promotable to CURRENT');
  const rollback = contract?.rollback_and_disposal ?? {};
  requireContract(rollback.rollback_order === 'REVERSE_DEPENDENCY_AND_JOURNAL_ORDER' && rollback.complete_reverse_evidence_required === true && rollback.sources_remain_active === true && rollback.source_mutation_forbidden === true && rollback.external_egress_must_remain_zero === true && rollback.target_disposal_requires_separate_authority === true && rollback.credential_revocation_requires_separate_authority === true && rollback.broad_drop_is_rollback === false && rollback.terminal_source_contract_disposition === 'QUARANTINED_RETAINED', 'rollback/disposal boundary drift');
  requireContract(contract?.receipt_example?.status === 'BLOCKED', 'checked-in receipt example must remain BLOCKED');
  failures.push(...validateAuthAppDataRehearsalReceipt(contract, contract?.receipt_example));
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

export function validateExecutableBundleManifest(contract) {
  const failures = [];
  const requireBundle = (condition, message) => {
    if (!condition) failures.push(message);
  };
  const validatePinnedBindings = (candidateBindings, pinnedBindings, label) => {
    requireBundle(
      canonicalCompactSha256(
        (candidateBindings ?? []).map(({ role, path: relativePath, sha256 }) => ({
          role,
          path: relativePath,
          sha256
        }))
      ) === canonicalCompactSha256(pinnedBindings),
      `executable bundle ${label} ordered pinned denominator drift`
    );
    for (const binding of pinnedBindings) {
      const candidate = candidateBindings?.find((entry) => entry.role === binding.role);
      requireBundle(
        candidate?.path === binding.path
          && candidate?.sha256 === binding.sha256
          && candidate?.observed_sha256 === binding.sha256,
        `${binding.path}: executable bundle ${label} expected and observed digest drift`
      );
      let observedSha256 = null;
      try {
        const bytes = fs.readFileSync(path.join(repositoryRoot, ...binding.path.split('/')));
        observedSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      } catch {
        // The equality check below supplies the stable semantic failure.
      }
      requireBundle(
        observedSha256 === binding.sha256,
        `${binding.path}: executable bundle ${label} source prerequisite digest drift`
      );
    }
  };
  validatePinnedBindings(
    contract?.contract_bindings,
    executableBundlePinnedContractBindings,
    'contract binding'
  );
  validatePinnedBindings(
    contract?.expected_effects_and_rollback_bindings,
    executableBundlePinnedEvidenceBindings,
    'expected-effects and rollback binding'
  );
  let expected = null;
  try {
    expected = buildExecutableBundleManifest(repositoryRoot);
  } catch (error) {
    failures.push(`executable bundle source evidence unavailable: ${error.message}`);
  }
  if (expected !== null) {
    requireBundle(
      canonicalCompactSha256(contract) === canonicalCompactSha256(expected),
      'executable bundle manifest exact content or coherent digest binding drift'
    );
  }
  requireBundle(contract?.version === '1.0.0' && contract?.status === 'CURRENT', 'executable bundle contract identity drift');
  requireBundle(contract?.bundle_model === 'REVIEWED_INERT_SQL_PROMOTED_BYTE_SET_V1', 'executable bundle model drift');
  requireBundle(contract?.promotion_rule === 'BYTE_FOR_BYTE_COPY_ONLY_NO_SQL_SEMANTIC_EDIT', 'executable bundle promotion rule drift');
  requireBundle(
    contract?.lifecycle?.source_contract === 'SOURCE_READY'
      && contract?.lifecycle?.execution === 'EXECUTION_BLOCKED'
      && contract?.lifecycle?.review === 'SOURCE_REVIEW_REQUIRED'
      && contract?.lifecycle?.apply_admitted === false,
    'executable bundle lifecycle must remain source-ready, review-required, execution-blocked, and non-executable'
  );
  requireBundle(
    contract?.authority_boundary?.executor_state === 'BLOCKED_NOT_INCLUDED'
      && contract?.authority_boundary?.provider_connectivity_included === false
      && contract?.authority_boundary?.credentials_included === false
      && contract?.authority_boundary?.sql_execution_authorized === false
      && contract?.authority_boundary?.deployment_authorized === false
      && contract?.authority_boundary?.production_authorized === false,
    'executable bundle authority boundary drift'
  );
  requireBundle(
    contract?.immutable_package?.migration_count === 122
      && contract?.immutable_package?.source_counts?.discordos === 17
      && contract?.immutable_package?.source_counts?.fitness === 101
      && contract?.immutable_package?.source_counts?.mazer === 4
      && contract?.immutable_package?.migration_package_sha256 === 'b65d1c0b73607218cc37826d9bb77c25704ea18f957abba7b5667a79d0a2c8db'
      && contract?.immutable_package?.governance_manifest_sha256 === '82e7ecad9a68addff14c43c3bc237c54af2dd5d48cda454c0e1c121a3e4536ec'
      && contract?.immutable_package?.standard_migration_sql_count === 0,
    'executable bundle immutable package or governance binding drift'
  );
  requireBundle(
    contract?.statement_denominator?.source_statement_count === 1253
      && contract?.statement_denominator?.executable_statement_count === 721
      && contract?.statement_denominator?.held_statement_count === 532
      && contract?.statement_denominator?.promoted_statement_count === 721,
    'executable bundle statement denominator drift'
  );
  requireBundle(
    exactOrderedValues(
      contract?.artifacts?.map((artifact) => artifact.source_path),
      executableBundleArtifacts.map((artifact) => artifact.source_path)
    ),
    'executable bundle source artifact order or path drift'
  );
  requireBundle(
    exactOrderedValues(
      contract?.artifacts?.map((artifact) => artifact.promoted_path),
      executableBundleArtifacts.map((artifact) => artifact.promoted_path)
    ),
    'executable bundle promoted artifact order or path drift'
  );
  requireBundle(
    Array.isArray(contract?.artifacts)
      && contract.artifacts.length === 4
      && new Set(contract.artifacts.map((artifact) => artifact.promoted_path)).size === 4
      && contract.artifacts.every((artifact) => artifact.byte_identical === true && artifact.source_sha256 === artifact.promoted_sha256),
    'executable bundle artifact byte-equivalence or uniqueness drift'
  );
  requireBundle(
    contract?.action_time_placeholders?.target_project_ref === 'REQUIRED_AT_ACTION_TIME_NOT_SERIALIZED'
      && contract?.action_time_placeholders?.execution_run_id === 'REQUIRED_AT_ACTION_TIME_NOT_SERIALIZED'
      && contract?.action_time_placeholders?.authority_event_id === 'REQUIRED_AT_ACTION_TIME_NOT_SERIALIZED'
      && contract?.action_time_placeholders?.values_present === false,
    'executable bundle target/run placeholders must remain unpopulated'
  );
  requireBundle(
    contract?.redaction?.aggregate_and_digest_only === true
      && contract?.redaction?.sql_bytes_in_receipts_forbidden === true
      && contract?.redaction?.raw_provider_payloads_forbidden === true
      && contract?.redaction?.credentials_and_secrets_forbidden === true
      && contract?.redaction?.machine_paths_forbidden === true,
    'executable bundle redaction boundary drift'
  );
  return failures.sort((left, right) => left.localeCompare(right));
}

function validateCanonicalJsonRepresentation(value, pointer = '$', seen = new WeakSet()) {
  const failures = [];
  const fail = (message) => failures.push(`${pointer}: ${message}`);

  try {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return failures;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) fail('non-finite numbers are not canonical JSON');
      return failures;
    }
    if (typeof value !== 'object') {
      fail('value is not canonical JSON data');
      return failures;
    }
    if (types.isProxy(value)) {
      fail('proxy values are forbidden');
      return failures;
    }
    if (seen.has(value)) {
      fail('cyclic references are forbidden');
      return failures;
    }
    seen.add(value);

    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        fail('array prototype is not canonical');
        return failures;
      }
      const expectedKeys = [...Array.from({ length: value.length }, (_, index) => String(index)), 'length'];
      const actualKeys = Reflect.ownKeys(value);
      if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
        fail('array own-key representation is not canonical');
        return failures;
      }
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (
          !descriptor ||
          !('value' in descriptor) ||
          descriptor.enumerable !== true ||
          descriptor.writable !== true ||
          descriptor.configurable !== true
        ) {
          failures.push(`${pointer}[${index}]: array element descriptor is not canonical`);
          continue;
        }
        failures.push(...validateCanonicalJsonRepresentation(descriptor.value, `${pointer}[${index}]`, seen));
      }
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
      if (
        !lengthDescriptor ||
        !('value' in lengthDescriptor) ||
        lengthDescriptor.enumerable !== false ||
        lengthDescriptor.writable !== true ||
        lengthDescriptor.configurable !== false
      ) {
        fail('array length descriptor is not canonical');
      }
      return failures;
    }

    if (Object.getPrototypeOf(value) !== Object.prototype) {
      fail('object prototype is not canonical');
      return failures;
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') {
        fail('symbol keys are forbidden');
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor ||
        !('value' in descriptor) ||
        descriptor.enumerable !== true ||
        descriptor.writable !== true ||
        descriptor.configurable !== true
      ) {
        failures.push(`${pointer}.${key}: object property descriptor is not canonical`);
        continue;
      }
      failures.push(...validateCanonicalJsonRepresentation(descriptor.value, `${pointer}.${key}`, seen));
    }
    return failures;
  } catch {
    fail('representation inspection failed closed');
    return failures;
  }
}

export function validatePlatformDataConvergenceContracts(documents) {
  const failures = [];
  const requireCondition = (condition, message) => {
    if (!condition) failures.push(message);
  };

  try {
    if (
      !documents ||
      typeof documents !== 'object' ||
      types.isProxy(documents) ||
      Object.getPrototypeOf(documents) !== Object.prototype
    ) {
      return ['platform convergence document collection representation is not canonical'];
    }
    const convergenceDocuments = {};
    for (const relativePath of convergenceDocumentPaths) {
      const descriptor = Object.getOwnPropertyDescriptor(documents, relativePath);
      if (
        !descriptor ||
        !('value' in descriptor) ||
        descriptor.enumerable !== true ||
        descriptor.writable !== true ||
        descriptor.configurable !== true
      ) {
        failures.push(`${relativePath}: document must be a canonical own data property`);
        continue;
      }
      const representationFailures = validateCanonicalJsonRepresentation(descriptor.value, relativePath);
      failures.push(...representationFailures);
      convergenceDocuments[relativePath] = descriptor.value;
    }
    if (failures.length > 0) return failures.sort((left, right) => left.localeCompare(right));

    const contract = convergenceDocuments[convergenceDocumentPaths[0]];
    const classifications = convergenceDocuments[convergenceDocumentPaths[1]];
    const transformations = convergenceDocuments[convergenceDocumentPaths[2]];

    requireCondition(
      contract.decision_binding?.decision_id === 'decision-platform-data-convergence-music-sesh-independent-2026-07-30',
      'platform convergence decision binding drift'
    );
    requireCondition(
      contract.decision_binding?.decision_sha256 === 'ed145bbd30480a07e41bd5a139a8847daf00740b9e87460dd2aaf5b5891af397',
      'platform convergence decision digest drift'
    );
    requireCondition(
      contract.lifecycle?.source === 'SOURCE_READY' &&
        contract.lifecycle?.execution === 'EXECUTION_BLOCKED' &&
        contract.lifecycle?.apply_admitted === false &&
        contract.lifecycle?.live_facts === 'UNKNOWN',
      'platform convergence lifecycle must remain source-ready, execution-blocked, apply-not-admitted, and live-unknown'
    );
    requireCondition(
      exactOrderedValues(contract.classification_vocabulary, convergenceClassificationVocabulary),
      'platform convergence classification vocabulary drift'
    );
    requireCondition(
      exactOrderedValues(contract.canonical_work?.entities, convergenceWorkEntities) &&
        contract.canonical_work?.provider_neutral === true &&
        contract.canonical_work?.physical_namespace === 'UNKNOWN',
      'provider-neutral work domain or physical-namespace boundary drift'
    );
    requireCondition(
      contract.canonical_work?.discord_identifiers === 'OPTIONAL_EXTERNAL_REFS_ONLY' &&
        contract.canonical_work?.discord_identifiers_are_ownership === false,
      'Discord identifiers must remain optional non-ownership external references'
    );
    requireCondition(
      contract.shared_identity?.logical_owner === 'platform_shared' &&
        contract.shared_identity?.minimal === true &&
        contract.shared_identity?.billing_and_entitlements === 'APP_OWNED_SEPARATE',
      'minimal shared identity or app-owned billing boundary drift'
    );
    requireCondition(
      contract.shared_identity?.identity_evidence_required === true &&
        contract.shared_identity?.automatic_merge_forbidden === true &&
        contract.shared_identity?.conflict_disposition === 'QUARANTINE',
      'explicit identity evidence and conflict quarantine must remain required'
    );
    requireCondition(
      exactOrderedValues(contract.shared_identity?.forbidden_identity_proofs, convergenceForbiddenIdentityProofs),
      'forbidden identity equality proof set drift'
    );
    requireCondition(
      exactOrderedValues(
        contract.app_owned_domains?.map((domain) => [domain.app, domain.ownership, domain.boundary]),
        [
          ['fitness', 'APP_OWNED', 'AUTHORITATIVE_FACTS_AND_BILLING_REMAIN_FITNESS_OWNED'],
          ['mazer', 'APP_OWNED', 'SELECT_ONE_AUTHORITATIVE_PROGRESSION_REPRESENTATION']
        ]
      ),
      'Fitness and Mazer must remain app-owned domains'
    );
    requireCondition(
      contract.independent_domains?.length === 1 &&
        contract.independent_domains[0]?.app === 'music_sesh' &&
        contract.independent_domains[0]?.ownership === 'INDEPENDENT_PRODUCT_AND_DATABASE_DOMAIN' &&
        exactOrderedValues(contract.independent_domains[0]?.fold_into, []),
      'Music Sesh must remain an independent product and database domain'
    );
    const liveBoundary = contract.planning_boundaries ?? {};
    requireCondition(
      [
        'live_aggregate_inventory',
        'provider_configuration',
        'target_state',
        'credentials',
        'data_api',
        'auth_and_application_data',
        'action_time_proof'
      ].every((key) => liveBoundary[key] === 'UNKNOWN'),
      'live provider, target, credential, Data API, Auth/data, and action-time facts must remain UNKNOWN'
    );
    requireCondition(
      liveBoundary.executable_sql_included === false && liveBoundary.migration_generation_included === false,
      'platform convergence source packet must not include executable SQL or migration generation'
    );
    requireCondition(
      Object.values(contract.gates ?? {}).every((value) => value === true),
      'platform convergence evidence, rehearsal, retention, rollback, and deletion gates must remain required'
    );

    requireCondition(
      exactOrderedValues(classifications.classification_vocabulary, convergenceClassificationVocabulary),
      'table classification vocabulary drift'
    );
    requireCondition(
      classifications.inventory?.live_aggregate_inventory === 'UNKNOWN' &&
        classifications.inventory?.entries_are_static_source_categories === true &&
        classifications.inventory?.final_relation_dispositions_admitted === false,
      'table classification inventory must remain static-source-only and live-unknown'
    );
    requireCondition(
      Array.isArray(classifications.entries) &&
        classifications.entries.length === 12 &&
        new Set(classifications.entries.map((entry) => entry.id)).size === 12,
      'table classification entry denominator drift'
    );
    requireCondition(
      exactOrderedValues(
        classifications.entries?.map((entry) => [entry.id, canonicalDigest(entry)]),
        convergenceClassificationRecordDigests
      ),
      'table classification canonical record binding drift'
    );
    requireCondition(
      classifications.entries?.every(
        (entry) =>
          convergenceClassificationVocabulary.includes(entry.classification) && entry.destructive_action === false
      ),
      'table classifications must use the closed vocabulary and admit no destructive action'
    );
    const musicClassification = classifications.entries?.find((entry) => entry.id === 'music_sesh_domain');
    requireCondition(
      musicClassification?.classification === 'KEEP' &&
        musicClassification?.source_domain === 'music_sesh' &&
        musicClassification?.target_domain === 'music_sesh',
      'Music Sesh classification must preserve its independent domain'
    );
    const omitEntries = classifications.entries?.filter((entry) => entry.classification === 'OMIT') ?? [];
    requireCondition(
      omitEntries.length === 1 &&
        omitEntries.every((entry) => entry.candidate_only === true && entry.destructive_action === false),
      'OMIT must remain a non-destructive candidate classification'
    );
    const omissionGate = classifications.omission_gate ?? {};
    requireCondition(
      omissionGate.status === 'BLOCKED' &&
        omissionGate.live_inventory_required === true &&
        omissionGate.rehearsal_required === true &&
        omissionGate.retention_proof_required === true &&
        omissionGate.rollback_proof_required === true &&
        omissionGate.separate_action_time_deletion_authority_required === true &&
        omissionGate.source_deletion_admitted === false,
      'destructive omission promotion must remain blocked behind complete action-time proof'
    );
    requireCondition(
      classifications.lifecycle?.execution === 'EXECUTION_BLOCKED' &&
        classifications.lifecycle?.apply_admitted === false,
      'table classification execution must remain blocked and apply-not-admitted'
    );

    requireCondition(transformations.live_inventory === 'UNKNOWN', 'transformation live inventory must remain UNKNOWN');
    requireCondition(
      exactOrderedValues(
        transformations.mappings?.map((mapping) => mapping.id),
        convergenceMappingIds
      ),
      'source-to-target mapping denominator or order drift'
    );
    requireCondition(
      exactOrderedValues(
        transformations.mappings?.map((mapping) => [mapping.id, canonicalDigest(mapping)]),
        convergenceMappingRecordDigests
      ),
      'source-to-target canonical mapping record binding drift'
    );
    requireCondition(
      transformations.mappings?.every(
        (mapping) =>
          mapping.provenance_required === true &&
          mapping.rehearsal_required === true &&
          mapping.rollback_required === true &&
          mapping.executable_sql === false
      ),
      'every transformation must require provenance, rehearsal, rollback, and zero executable SQL'
    );
    requireCondition(
      transformations.mappings?.every(
        (mapping) => mapping.source_domain !== 'music_sesh' && mapping.target_domain !== 'music_sesh'
      ),
      'Music Sesh must not appear in the convergence mapping graph'
    );
    const discordExternalRefs = transformations.mappings?.find(
      (mapping) => mapping.id === 'discord_identifiers_to_optional_external_refs'
    );
    requireCondition(
      discordExternalRefs?.target_domain === 'work' &&
        exactOrderedValues(discordExternalRefs?.target_entities, ['external_refs']) &&
        discordExternalRefs?.identity_binding === 'OPTIONAL_EXTERNAL_REFERENCE_NEVER_OWNERSHIP',
      'Discord identifier external-reference mapping drift'
    );
    const identityRules = transformations.identity_rules ?? {};
    requireCondition(
      identityRules.explicit_source_to_target_mapping === true &&
        identityRules.conflict_quarantine === true &&
        identityRules.email_equality_sufficient === false &&
        identityRules.username_equality_sufficient === false &&
        identityRules.uuid_equality_sufficient === false &&
        identityRules.password_hash_equality_sufficient === false,
      'identity mapping must require evidence and reject silent equality merges'
    );
    requireCondition(
      transformations.domain_rules?.music_sesh_mappings === 0 &&
        transformations.domain_rules?.music_sesh_independent === true &&
        transformations.domain_rules?.fitness_and_mazer_app_owned === true &&
        transformations.domain_rules?.billing_and_entitlements_shared === false,
      'transformation domain ownership boundary drift'
    );
    requireCondition(
      transformations.execution?.status === 'BLOCKED' &&
        transformations.execution?.apply_admitted === false &&
        transformations.execution?.migration_sql_generated === false &&
        transformations.execution?.provider_access === false &&
        transformations.execution?.live_data_access === false,
      'transformation execution, provider, live-data, and apply boundaries must remain blocked'
    );
  } catch {
    failures.push('platform convergence semantic validation failed closed');
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

  failures.push(...validatePlatformDataConvergenceContracts(documents));

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
  const executableBundleManifest = documents['contracts/v1/execution/executable-bundle-manifest.json'] ?? {};
  failures.push(...validateExecutableBundleManifest(executableBundleManifest));
  const executableBundleGate = migrationGate.executable_bundle ?? {};
  requireCondition(
    executableBundleGate.status === 'CURRENT'
      && executableBundleGate.source_contract_lifecycle === 'SOURCE_READY'
      && executableBundleGate.execution_lifecycle === 'EXECUTION_BLOCKED'
      && executableBundleGate.review_state === 'SOURCE_REVIEW_REQUIRED'
      && executableBundleGate.apply_admitted === false,
    'migration gate executable bundle must remain source-ready, review-required, execution-blocked, and non-executable'
  );
  requireCondition(
    executableBundleGate.contract_path === 'contracts/v1/execution/executable-bundle-manifest.json'
      && executableBundleGate.bundle_model === 'REVIEWED_INERT_SQL_PROMOTED_BYTE_SET_V1'
      && executableBundleGate.artifact_count === 4
      && executableBundleGate.executable_statement_count === 721
      && executableBundleGate.standard_migration_sql_count === 0
      && executableBundleGate.executor_included === false
      && executableBundleGate.provider_connectivity_included === false,
    'migration gate executable bundle identity or authority boundary drift'
  );
  requireCondition(
    migrationGate.required_evidence?.some((evidence) => evidence.name === 'executable bundle source contract: contracts/v1/execution/executable-bundle-manifest.json' && evidence.status === 'CURRENT') === true,
    'migration gate executable bundle source-contract evidence binding must remain CURRENT'
  );
  const targetBootstrapContract = documents['contracts/v1/bootstrap/disposable-target-bootstrap-contract.json'] ?? {};
  failures.push(...validateDisposableTargetBootstrapContract(targetBootstrapContract));
  requireCondition(targetBootstrapContract.immutable_bindings?.migration_package_sha256 === providerCanonicalProvenance.migration_package_sha256 && targetBootstrapContract.immutable_bindings?.governance_manifest_sha256 === providerCanonicalProvenance.governance_manifest_sha256, 'target bootstrap immutable package/governance binding drift');
  requireCondition(migrationGate.required_evidence?.some((evidence) => evidence.name === 'disposable target bootstrap source contract: contracts/v1/bootstrap/disposable-target-bootstrap-contract.json' && evidence.status === 'CURRENT') === true, 'migration gate target_bootstrap source-contract binding must remain CURRENT');
  const storageEdgeRealtimeContract = documents[storageEdgeRealtimeContractPath] ?? {};
  failures.push(...validateStorageEdgeRealtimeExecutionDenominatorContract(storageEdgeRealtimeContract));
  requireCondition(migrationGate.required_evidence?.some((evidence) => evidence.name === `Storage/Edge/Realtime execution denominator source contract: ${storageEdgeRealtimeContractPath}` && evidence.status === 'CURRENT') === true, 'migration gate Storage/Edge/Realtime execution-denominator binding must remain CURRENT');
  const authAppDataRehearsalContract = documents['contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json'] ?? {};
  failures.push(...validateAuthAppDataRehearsalContract(authAppDataRehearsalContract, documents));
  requireCondition(migrationGate.required_evidence?.some((evidence) => evidence.name === 'Auth/application-data rehearsal source contract: contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json' && evidence.status === 'CURRENT') === true, 'migration gate Auth/application-data rehearsal source-contract binding must remain CURRENT');
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
  requireCondition(appDataAdaptersGate.mazer_contract_path === 'contracts/v1/transport/mazer-app-data-adapter-contract.json' && appDataAdaptersGate.mazer_relation_count === 4 && appDataAdaptersGate.fitness_contract_path === 'contracts/v1/transport/fitness-app-data-adapter-contract.json' && appDataAdaptersGate.fitness_relation_count === 27 && appDataAdaptersGate.discordos_contract_path === 'contracts/v1/transport/discordos-app-data-adapter-contract.json' && appDataAdaptersGate.discordos_relation_count === 10 && appDataAdaptersGate.discordos_transport_ready === false && appDataAdaptersGate.discordos_block_reason === 'MUSIC_SESH_INDEPENDENT_DOMAIN_REQUIRES_SEPARATE_TARGET_AND_REGENERATED_ARTIFACT' && appDataAdaptersGate.all_adapters_ready === true && appDataAdaptersGate.execution_lifecycle === 'EXECUTION_BLOCKED' && appDataAdaptersGate.apply_admitted === false, 'application-data adapter migration gate drift');
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
  requireCondition(discordosInert.emitted_extension_count === 0 && discordosInert.emitted_data_effect_count === 0 && discordosInert.emitted_cron_effect_count === 0 && discordosInert.emitted_network_effect_count === 0 && discordosInert.music_sesh_relation_count === 3 && discordosInert.music_sesh_artifact_status === 'INCOMPATIBLE_UNADMITTED' && discordosInert.music_sesh_artifact_regeneration === 'REQUIRED_SEPARATE_AUTHORITY' && discordosInert.generated_artifact_changes_admitted === false, 'DiscordOS inert external-effect or generated-artifact boundary drift');
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
    ['discordos.discordos_music_sesh_sessions', null, 'HELD_INDEPENDENT_DOMAIN', ['session_id'], 'HOLD_INDEPENDENT_DOMAIN', [], false, 'EXCLUDE', 'NOT_APPLICABLE', 'MUSIC_SESH_INDEPENDENT_PRODUCT_DATABASE_REQUIRES_SEPARATE_TARGET_AND_REGENERATED_ARTIFACT'],
    ['discordos.discordos_music_sesh_queue_items', null, 'HELD_INDEPENDENT_DOMAIN', ['queue_item_id'], 'HOLD_INDEPENDENT_DOMAIN', [], false, 'EXCLUDE', 'NOT_APPLICABLE', 'MUSIC_SESH_INDEPENDENT_PRODUCT_DATABASE_REQUIRES_SEPARATE_TARGET_AND_REGENERATED_ARTIFACT'],
    ['discordos.discordos_music_sesh_votes', null, 'HELD_INDEPENDENT_DOMAIN', ['vote_id'], 'HOLD_INDEPENDENT_DOMAIN', [], false, 'EXCLUDE', 'NOT_APPLICABLE', 'MUSIC_SESH_INDEPENDENT_PRODUCT_DATABASE_REQUIRES_SEPARATE_TARGET_AND_REGENERATED_ARTIFACT'],
    ['discordos.discord_update_drafts', 'discordos.discord_update_drafts', 'HELD_OPERATIONAL_EXTERNAL_EFFECT', ['id'], 'HOLD_NO_TRANSPORT', [], true, 'EXCLUDE', 'QUARANTINE', 'DEPLOYMENT_AND_DISCORD_PUBLICATION_EFFECTS_UNRESOLVED']
  ];
  const actualDiscordosRelations = (Array.isArray(discordosAppDataAdapter.relations) ? discordosAppDataAdapter.relations : []).map((relation) => [relation.source_relation, relation.target_relation, relation.classification, relation.primary_key, relation.transport_mode, relation.dependency_parents, relation.external_effects, relation.synthetic_rows_action, relation.fitness_semantic_overlap_action, relation.hold_reason]);
  requireCondition(canonicalDigest(actualDiscordosRelations) === canonicalDigest(expectedDiscordosRelations) && discordosAppDataAdapter.relations?.every((relation) => relation.owner_key === null), 'DiscordOS 10-relation transport denominator drift');
  requireCondition(canonicalDigest(discordosAppDataAdapter.classification_counts) === canonicalDigest({ authoritative_state: 2, authoritative_append_only_history: 4, held_operational_external_effect: 1, held_independent_domain: 3, transported: 6, held: 4, total: 10 }), 'DiscordOS relation classification counts drift');
  requireCondition(exactOrderedValues(discordosAppDataAdapter.dependency_ordering?.insert_update_order, ['discordos.discord_feedback_reports', 'discordos.discord_feedback_audit_events', 'discordos.discord_feedback_completion_reviews', 'discordos.runtime_health_cron_runs', 'discordos.discordos_board_cards', 'discordos.discordos_moderation_audit_log']), 'DiscordOS insert/update dependency order drift');
  requireCondition(exactOrderedValues(discordosAppDataAdapter.dependency_ordering?.delete_order, ['discordos.discord_feedback_completion_reviews', 'discordos.discord_feedback_audit_events', 'discordos.discord_feedback_reports', 'discordos.discordos_moderation_audit_log', 'discordos.discordos_board_cards', 'discordos.runtime_health_cron_runs']) && discordosAppDataAdapter.dependency_ordering?.foreign_key_cycles === 'NONE' && exactOrderedValues(discordosAppDataAdapter.dependency_ordering?.held_relations_excluded_from_order, ['discordos.discordos_music_sesh_sessions', 'discordos.discordos_music_sesh_queue_items', 'discordos.discordos_music_sesh_votes', 'discordos.discord_update_drafts']) && discordosAppDataAdapter.dependency_ordering?.external_effects === 'QUARANTINED', 'DiscordOS delete order, held relation, or cycle boundary drift');
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
    music_sesh_independent_domain: 'BLOCKED',
    generated_artifact_regeneration: 'BLOCKED',
    discordos_external_effect_quarantine: 'BLOCKED',
    target_apply: 'BLOCKED'
  };
  requireCondition(canonicalDigest(discordosAppDataAdapter.dependency_gates) === canonicalDigest(expectedDiscordosDependencyGates), 'DiscordOS dependency gate promotion or status-vocabulary drift');
  const provenance = migrationGate.provider_canonical_provenance;
  requireCondition(migrationGate.version === '1.6.0', 'migration gate version must remain 1.6.0');
  requireCondition(migrationGate.status === 'BLOCKED' && migrationGate.sql_generation === 'deterministic_promoted_byte_set_current_execution_blocked', 'migration gate must remain BLOCKED after deterministic byte-set generation');
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
  requireCondition(schemaMap.public?.data_api === 'not_exposed', 'public must remain unexposed during bootstrap');
  requireCondition(schemaMap.platform_private?.data_api === 'not_exposed', 'platform_private must remain outside the Data API');
  requireCondition(exactOrderedValues(security.schemas.filter((schema) => schema.data_api === 'exposed').map((schema) => schema.name), targetBootstrapFutureExposedSchemas), 'security matrix future exposure allowlist drift');
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
    // Preserve the executable-bundle validation denominator. Additive,
    // source-only planning contracts report their coverage separately so
    // existing bundle receipts remain byte- and meaning-stable.
    schema_count: 28,
    document_count: 27,
    semantic_check_groups: 27,
    source_planning_schema_count: convergenceDocumentPaths.length,
    source_planning_document_count: convergenceDocumentPaths.length,
    source_planning_semantic_check_groups: 1,
    validated_schema_count: schemaPaths().length,
    validated_document_count: documentSpecs.length,
    validated_semantic_check_groups: 28,
    failures
  };
}
