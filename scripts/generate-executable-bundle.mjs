import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitSqlStatements } from './generate-target-bootstrap.mjs';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const defaultRepositoryRoot = path.resolve(moduleDirectory, '..');

export const executableBundleArtifacts = Object.freeze([
  {
    ordinal: 1,
    source_path: 'bootstrap/artifacts/inert-sql/00000000000001_mazer_schema_inert.sql',
    promoted_path: 'bootstrap/artifacts/executable-sql/00000000000001_mazer_schema.sql'
  },
  {
    ordinal: 2,
    source_path: 'bootstrap/artifacts/inert-sql/00000000000002_fitness_schema_inert.sql',
    promoted_path: 'bootstrap/artifacts/executable-sql/00000000000002_fitness_schema.sql'
  },
  {
    ordinal: 3,
    source_path: 'bootstrap/artifacts/inert-sql/00000000000003_discordos_schema_inert.sql',
    promoted_path: 'bootstrap/artifacts/executable-sql/00000000000003_discordos_schema.sql'
  },
  {
    ordinal: 4,
    source_path: 'bootstrap/artifacts/inert-sql/00000000000004_platform_security_overlay_inert.sql',
    promoted_path: 'bootstrap/artifacts/executable-sql/00000000000004_platform_security_overlay.sql'
  }
]);

export const executableBundleManifestPath = 'contracts/v1/execution/executable-bundle-manifest.json';

export const musicSeshExecutableExclusion = Object.freeze({
  artifact_ordinal: 3,
  source_migration_path: 'supabase/migrations/20260615034751_discordos_music_sesh_storage.sql',
  repository_source_path: 'bootstrap/sources/discordos/supabase/migrations/20260615034751_discordos_music_sesh_storage.sql',
  source_blob: '871cd8e76673828aae04f223f1e0049d69a629a2',
  source_bytes: 4664,
  source_sha256: 'b8f32e82f494c7b970b2b8afddb94f9525cd8d9da88344e6c14d235247738cbd',
  statement_count: 28,
  statement_set_sha256: 'a4ce7457186e84058645dc8366ce41e41a51641d8ae34b97c61b416692f0a482',
  executable_bytes: 15796,
  executable_sha256: '236656c35f51fae81eb33aa887fd88d710559c169a6a1a7c466586fab949caf6',
  relation_names: Object.freeze([
    'discordos.discordos_music_sesh_sessions',
    'discordos.discordos_music_sesh_queue_items',
    'discordos.discordos_music_sesh_votes'
  ]),
  gate_blocker: 'MUSIC_SESH_INDEPENDENT_DOMAIN_REQUIRES_SEPARATE_TARGET_AND_REGENERATED_ARTIFACT'
});

export const executableBundleContractBindings = Object.freeze([
  {
    role: 'DISPOSABLE_TARGET_BOOTSTRAP',
    path: 'contracts/v1/bootstrap/disposable-target-bootstrap-contract.json',
    sha256: 'd217f31885f995e939d8e37c07ef5201bef43934227564a9083b662b2054c869'
  },
  {
    role: 'AUTH_APP_DATA_REHEARSAL',
    path: 'contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json',
    sha256: 'a5fbad0463bd7f5d7813b3d559d661567308a457db54617bec866b6ff83d8aa5'
  },
  {
    role: 'STORAGE_EDGE_REALTIME_EXECUTION_DENOMINATOR',
    path: 'contracts/v1/rehearsal/storage-edge-realtime-execution-denominator-contract.json',
    sha256: '713e4911fcda8f222b35fa1746e8f46ea58247a273ac666bd5f10b7e0efbd65a'
  },
  {
    role: 'INDEPENDENT_BACKUP',
    path: 'contracts/v1/recovery/independent-backup-contract.json',
    sha256: 'a627535f8f48d0c14b81a6bb611bf4f36935af96a66beb1d6a23096df4c2fd10'
  },
  {
    role: 'RLS_GRANT_FUNCTION_MATRIX',
    path: 'contracts/v1/security/rls-grant-function-matrix.json',
    sha256: 'c309ab9e1c4c5313e4817f8b6eccaaeb186886141cb3d65da9b8a5dc4740856e'
  }
]);

export const executableBundleEvidenceBindings = Object.freeze([
  {
    role: 'EXPECTED_DATA_EFFECTS',
    path: 'bootstrap/manifests/data-effects.v1.json',
    sha256: '1d28080e416eb59f639c9db4514d9c9e4e978d8650c2137f0a170440eba25d85'
  },
  {
    role: 'STATEMENT_DISPOSITIONS',
    path: 'bootstrap/manifests/dispositions.v1.json',
    sha256: '129ff967d9333c38c5356a1c5309361c368c6ee0552bfc9f2c84624defbc396c'
  },
  {
    role: 'EXPECTED_SOURCE_OBJECTS',
    path: 'bootstrap/manifests/source-objects.v1.json',
    sha256: '1e26a2c50f5415ced0a5100556d85c5f0f66e12baede0b705771e570906d369e'
  }
]);

const toolchainPaths = Object.freeze([
  'scripts/generate-executable-bundle.mjs',
  'scripts/verify-executable-bundle.mjs'
]);

export function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function canonicalValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort((left, right) => left.localeCompare(right))
        .map((key) => [key, canonicalValue(value[key])])
    );
  }
  return value;
}

export function canonicalCompactSha256(value) {
  return sha256Bytes(Buffer.from(JSON.stringify(canonicalValue(value)), 'utf8'));
}

export function musicSeshStatementIdentity(sourceBytes) {
  const statements = splitSqlStatements(sourceBytes.toString('utf8'));
  return statements.map((statement, index) => ({
    ordinal: index + 1,
    sha256: sha256Bytes(Buffer.from(statement, 'utf8'))
  }));
}

function readBytes(repositoryRoot, relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, ...relativePath.split('/')));
}

function rawIdentity(repositoryRoot, binding) {
  const bytes = readBytes(repositoryRoot, binding.path);
  const observedSha256 = sha256Bytes(bytes);
  if (observedSha256 !== binding.sha256) {
    throw new Error(
      `${binding.path}: executable bundle prerequisite digest drift `
      + `(expected ${binding.sha256}, observed ${observedSha256})`
    );
  }
  return {
    ...binding,
    bytes: bytes.length,
    observed_sha256: observedSha256
  };
}

function assertMusicSeshExclusionContract(repositoryRoot) {
  const sourceBytes = readBytes(repositoryRoot, musicSeshExecutableExclusion.repository_source_path);
  if (sourceBytes.length !== musicSeshExecutableExclusion.source_bytes
      || sha256Bytes(sourceBytes) !== musicSeshExecutableExclusion.source_sha256) {
    throw new Error('Music Sesh exclusion source bytes or digest drift');
  }
  const statementIdentity = musicSeshStatementIdentity(sourceBytes);
  if (statementIdentity.length !== musicSeshExecutableExclusion.statement_count
      || canonicalCompactSha256(statementIdentity) !== musicSeshExecutableExclusion.statement_set_sha256) {
    throw new Error('Music Sesh exclusion statement identity drift');
  }
  const adapter = JSON.parse(readBytes(repositoryRoot, 'contracts/v1/transport/discordos-app-data-adapter-contract.json'));
  const gate = JSON.parse(readBytes(repositoryRoot, 'contracts/v1/gates/migration-gate-state.json'));
  const exclusion = adapter.executable_bundle_exclusion ?? {};
  const relations = (adapter.relations ?? []).filter((relation) => musicSeshExecutableExclusion.relation_names.includes(relation.source_relation));
  if (exclusion.source_migration_path !== musicSeshExecutableExclusion.source_migration_path
      || exclusion.repository_source_path !== musicSeshExecutableExclusion.repository_source_path
      || exclusion.source_blob !== musicSeshExecutableExclusion.source_blob
      || exclusion.source_bytes !== musicSeshExecutableExclusion.source_bytes
      || exclusion.source_sha256 !== musicSeshExecutableExclusion.source_sha256
      || exclusion.statement_count !== musicSeshExecutableExclusion.statement_count
      || exclusion.statement_set_sha256 !== musicSeshExecutableExclusion.statement_set_sha256
      || exclusion.projection_rule !== 'EXCLUDE_COMPLETE_IMMUTABLE_SOURCE_BLOCK'
      || exclusion.historical_dispositions_mutated !== false
      || relations.length !== 3
      || relations.some((relation) => relation.classification !== 'HELD_INDEPENDENT_DOMAIN' || relation.target_relation !== null)
      || gate.app_data_adapters?.discordos_block_reason !== musicSeshExecutableExclusion.gate_blocker) {
    throw new Error('Music Sesh adapter, gate, or exclusion contract drift');
  }
  return sourceBytes;
}

export function buildExecutableArtifactBytes(repositoryRoot, artifact) {
  const sourceBytes = readBytes(repositoryRoot, artifact.source_path);
  if (artifact.ordinal !== musicSeshExecutableExclusion.artifact_ordinal) return sourceBytes;
  assertMusicSeshExclusionContract(repositoryRoot);
  const header = Buffer.from(
    `-- source ${musicSeshExecutableExclusion.source_migration_path} blob ${musicSeshExecutableExclusion.source_blob} raw_sha256 ${musicSeshExecutableExclusion.source_sha256}\n`,
    'utf8'
  );
  const start = sourceBytes.indexOf(header);
  const next = start < 0 ? -1 : sourceBytes.indexOf(Buffer.from('-- source ', 'utf8'), start + header.length);
  if (start < 0 || next < 0 || sourceBytes.indexOf(header, start + header.length) >= 0) {
    throw new Error('Music Sesh exclusion source block boundary drift');
  }
  const projected = Buffer.concat([sourceBytes.subarray(0, start), sourceBytes.subarray(next)]);
  if (projected.length !== musicSeshExecutableExclusion.executable_bytes
      || sha256Bytes(projected) !== musicSeshExecutableExclusion.executable_sha256
      || musicSeshExecutableExclusion.relation_names.some((relation) => projected.includes(Buffer.from(relation, 'utf8')))) {
    throw new Error('Music Sesh executable projection drift or leakage');
  }
  return projected;
}

export function buildExecutableBundleManifest(repositoryRoot = defaultRepositoryRoot) {
  const artifacts = executableBundleArtifacts.map((artifact) => {
    const sourceBytes = readBytes(repositoryRoot, artifact.source_path);
    const expectedPromotedBytes = buildExecutableArtifactBytes(repositoryRoot, artifact);
    const promotedFile = path.join(repositoryRoot, ...artifact.promoted_path.split('/'));
    const promotedBytes = fs.existsSync(promotedFile) ? fs.readFileSync(promotedFile) : expectedPromotedBytes;
    return {
      ordinal: artifact.ordinal,
      source_path: artifact.source_path,
      promoted_path: artifact.promoted_path,
      source_bytes: sourceBytes.length,
      bytes: expectedPromotedBytes.length,
      source_sha256: sha256Bytes(sourceBytes),
      promoted_sha256: sha256Bytes(promotedBytes),
      expected_promoted_sha256: sha256Bytes(expectedPromotedBytes),
      byte_identical: sourceBytes.equals(promotedBytes),
      projection: artifact.ordinal === musicSeshExecutableExclusion.artifact_ordinal
        ? {
            mode: 'EXACT_SOURCE_BLOCK_EXCLUSION',
            source_migration_path: musicSeshExecutableExclusion.source_migration_path,
            excluded_statement_count: musicSeshExecutableExclusion.statement_count,
            excluded_statement_set_sha256: musicSeshExecutableExclusion.statement_set_sha256
          }
        : { mode: 'BYTE_COPY' }
    };
  });
  const contracts = executableBundleContractBindings.map((binding) => rawIdentity(repositoryRoot, binding));
  const evidence = executableBundleEvidenceBindings.map((binding) => rawIdentity(repositoryRoot, binding));
  const toolchain = toolchainPaths.map((relativePath) => rawIdentity(repositoryRoot, {
    role: relativePath.includes('generate-') ? 'GENERATOR' : 'VERIFIER',
    path: relativePath,
    sha256: sha256Bytes(readBytes(repositoryRoot, relativePath))
  }));
  const statementDisposition = JSON.parse(readBytes(repositoryRoot, 'bootstrap/manifests/dispositions.v1.json').toString('utf8'));
  const artifactAggregateSubject = artifacts.map((artifact) => ({
    ordinal: artifact.ordinal,
    source_path: artifact.source_path,
    promoted_path: artifact.promoted_path,
    bytes: artifact.bytes,
    sha256: artifact.expected_promoted_sha256
  }));
  const contractAggregateSubject = contracts.map(({ role, path: relativePath, sha256 }) => ({ role, path: relativePath, sha256 }));
  const evidenceAggregateSubject = evidence.map(({ role, path: relativePath, sha256 }) => ({ role, path: relativePath, sha256 }));
  const toolchainAggregateSubject = toolchain.map(({ role, path: relativePath, sha256 }) => ({ role, path: relativePath, sha256 }));
  return {
    version: '2.0.0',
    status: 'CURRENT',
    bundle_model: 'REVIEWED_EXECUTION_PROJECTION_WITH_INDEPENDENT_DOMAIN_EXCLUSION_V2',
    promotion_rule: 'BYTE_COPY_EXCEPT_EXACT_CROSS_CONTRACT_HELD_SOURCE_BLOCK_EXCLUSION',
    lifecycle: {
      source_contract: 'SOURCE_READY',
      execution: 'EXECUTION_BLOCKED',
      review: 'SOURCE_REVIEW_REQUIRED',
      apply_admitted: false
    },
    authority_boundary: {
      executor_state: 'BLOCKED_NOT_INCLUDED',
      provider_connectivity_included: false,
      credentials_included: false,
      sql_execution_authorized: false,
      deployment_authorized: false,
      production_authorized: false
    },
    immutable_package: {
      migration_count: 122,
      source_counts: { discordos: 17, fitness: 101, mazer: 4 },
      migration_package_sha256: 'b65d1c0b73607218cc37826d9bb77c25704ea18f957abba7b5667a79d0a2c8db',
      governance_manifest_sha256: '82e7ecad9a68addff14c43c3bc237c54af2dd5d48cda454c0e1c121a3e4536ec',
      standard_migration_sql_count: 0
    },
    statement_denominator: {
      source_statement_count: statementDisposition.derived_counts.source_statement_count,
      historical_executable_statement_count: statementDisposition.derived_counts.executable_statement_count,
      historical_held_statement_count: statementDisposition.derived_counts.held_statement_count,
      execution_exclusion_statement_count: musicSeshExecutableExclusion.statement_count,
      executable_statement_count: statementDisposition.derived_counts.executable_statement_count - musicSeshExecutableExclusion.statement_count,
      held_statement_count: statementDisposition.derived_counts.held_statement_count + musicSeshExecutableExclusion.statement_count,
      promoted_statement_count: statementDisposition.derived_counts.executable_statement_count - musicSeshExecutableExclusion.statement_count
    },
    artifacts,
    ordered_artifact_set_sha256: canonicalCompactSha256(artifactAggregateSubject),
    contract_bindings: contracts,
    contract_binding_set_sha256: canonicalCompactSha256(contractAggregateSubject),
    expected_effects_and_rollback_bindings: evidence,
    expected_effects_and_rollback_set_sha256: canonicalCompactSha256(evidenceAggregateSubject),
    toolchain,
    toolchain_set_sha256: canonicalCompactSha256(toolchainAggregateSubject),
    upstream_reviewed_inert_manifest_sha256: 'ce85de2e32fca8497d7bb6380e51e3bc9d5717f1a07b25151414da5552075849',
    redaction: {
      aggregate_and_digest_only: true,
      sql_bytes_in_receipts_forbidden: true,
      raw_provider_payloads_forbidden: true,
      credentials_and_secrets_forbidden: true,
      machine_paths_forbidden: true
    },
    action_time_placeholders: {
      target_project_ref: 'REQUIRED_AT_ACTION_TIME_NOT_SERIALIZED',
      execution_run_id: 'REQUIRED_AT_ACTION_TIME_NOT_SERIALIZED',
      authority_event_id: 'REQUIRED_AT_ACTION_TIME_NOT_SERIALIZED',
      values_present: false
    }
  };
}

function writeIfChanged(filePath, bytes) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath).equals(bytes)) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, bytes);
  return true;
}

export function generateExecutableBundle(repositoryRoot = defaultRepositoryRoot) {
  const changed = [];
  for (const artifact of executableBundleArtifacts) {
    const source = buildExecutableArtifactBytes(repositoryRoot, artifact);
    const output = path.join(repositoryRoot, ...artifact.promoted_path.split('/'));
    if (writeIfChanged(output, source)) changed.push(artifact.promoted_path);
  }
  const manifest = buildExecutableBundleManifest(repositoryRoot);
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const manifestFile = path.join(repositoryRoot, ...executableBundleManifestPath.split('/'));
  if (writeIfChanged(manifestFile, manifestBytes)) changed.push(executableBundleManifestPath);
  return { changed, manifest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = generateExecutableBundle();
  process.stdout.write(`${JSON.stringify({
    status: 'OK',
    changed_paths: result.changed,
    artifact_count: result.manifest.artifacts.length,
    ordered_artifact_set_sha256: result.manifest.ordered_artifact_set_sha256,
    apply_admitted: result.manifest.lifecycle.apply_admitted
  }, null, 2)}\n`);
}
