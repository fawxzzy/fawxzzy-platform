import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export const executableBundleContractBindings = Object.freeze([
  {
    role: 'DISPOSABLE_TARGET_BOOTSTRAP',
    path: 'contracts/v1/bootstrap/disposable-target-bootstrap-contract.json',
    sha256: 'd217f31885f995e939d8e37c07ef5201bef43934227564a9083b662b2054c869'
  },
  {
    role: 'AUTH_APP_DATA_REHEARSAL',
    path: 'contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json',
    sha256: '47db976f08e98e8d7821e1007e942355f912af86a3ef6c229b3b7772e91b6402'
  },
  {
    role: 'STORAGE_EDGE_REALTIME_EXECUTION_DENOMINATOR',
    path: 'contracts/v1/rehearsal/storage-edge-realtime-execution-denominator-contract.json',
    sha256: '6b49d8b06f80b7bd28f2ee446c73119e72ab78360e4346008b725cb561e67f97'
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

export function buildExecutableBundleManifest(repositoryRoot = defaultRepositoryRoot) {
  const artifacts = executableBundleArtifacts.map((artifact) => {
    const sourceBytes = readBytes(repositoryRoot, artifact.source_path);
    const promotedFile = path.join(repositoryRoot, ...artifact.promoted_path.split('/'));
    const promotedBytes = fs.existsSync(promotedFile) ? fs.readFileSync(promotedFile) : sourceBytes;
    return {
      ordinal: artifact.ordinal,
      source_path: artifact.source_path,
      promoted_path: artifact.promoted_path,
      bytes: sourceBytes.length,
      source_sha256: sha256Bytes(sourceBytes),
      promoted_sha256: sha256Bytes(promotedBytes),
      byte_identical: sourceBytes.equals(promotedBytes)
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
    sha256: artifact.source_sha256
  }));
  const contractAggregateSubject = contracts.map(({ role, path: relativePath, sha256 }) => ({ role, path: relativePath, sha256 }));
  const evidenceAggregateSubject = evidence.map(({ role, path: relativePath, sha256 }) => ({ role, path: relativePath, sha256 }));
  const toolchainAggregateSubject = toolchain.map(({ role, path: relativePath, sha256 }) => ({ role, path: relativePath, sha256 }));
  return {
    version: '1.0.0',
    status: 'CURRENT',
    bundle_model: 'REVIEWED_INERT_SQL_PROMOTED_BYTE_SET_V1',
    promotion_rule: 'BYTE_FOR_BYTE_COPY_ONLY_NO_SQL_SEMANTIC_EDIT',
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
      executable_statement_count: statementDisposition.derived_counts.executable_statement_count,
      held_statement_count: statementDisposition.derived_counts.held_statement_count,
      promoted_statement_count: statementDisposition.derived_counts.executable_statement_count
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
    const source = readBytes(repositoryRoot, artifact.source_path);
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
