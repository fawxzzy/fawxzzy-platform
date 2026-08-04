import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildExecutableBundleManifest,
  buildExecutableArtifactBytes,
  canonicalCompactSha256,
  executableBundleArtifacts,
  executableBundleContractBindings,
  executableBundleEvidenceBindings,
  generateExecutableBundle,
  musicSeshExecutableExclusion
} from '../scripts/generate-executable-bundle.mjs';
import {
  loadDocuments,
  repositoryRoot,
  validateContracts,
  validateExecutableBundleManifest
} from '../scripts/lib/contracts.mjs';
import { validateRepositoryEntries } from '../scripts/lib/repository.mjs';
import {
  validateExecutableBundleFileSet,
  verifyExecutableBundle
} from '../scripts/verify-executable-bundle.mjs';

const manifestPath = 'contracts/v1/execution/executable-bundle-manifest.json';
const documents = loadDocuments();
const validManifest = documents[manifestPath];
const clone = (value) => structuredClone(value);
const prerequisiteBindings = [
  ...executableBundleContractBindings,
  ...executableBundleEvidenceBindings
];
const exclusionPrerequisites = [
  'contracts/v1/transport/discordos-app-data-adapter-contract.json',
  'contracts/v1/gates/migration-gate-state.json',
  musicSeshExecutableExclusion.repository_source_path
];

function copyFileToFixture(fixtureRoot, relativePath) {
  const destination = path.join(fixtureRoot, ...relativePath.split('/'));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(repositoryRoot, ...relativePath.split('/')), destination);
}

function createBundleFixture() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fawxzzy-executable-bundle-'));
  for (const artifact of executableBundleArtifacts) {
    copyFileToFixture(fixtureRoot, artifact.source_path);
    copyFileToFixture(fixtureRoot, artifact.promoted_path);
  }
  for (const binding of prerequisiteBindings) copyFileToFixture(fixtureRoot, binding.path);
  for (const relativePath of exclusionPrerequisites) copyFileToFixture(fixtureRoot, relativePath);
  copyFileToFixture(fixtureRoot, 'scripts/generate-executable-bundle.mjs');
  copyFileToFixture(fixtureRoot, 'scripts/verify-executable-bundle.mjs');
  return fixtureRoot;
}

function expectRejected(mutate, pattern = /executable bundle/i) {
  const candidate = clone(validManifest);
  mutate(candidate);
  const failures = validateExecutableBundleManifest(candidate);
  assert.ok(failures.some((failure) => pattern.test(failure)), failures.join('\n'));
}

test('checked-in executable bundle is deterministic, exact, and source-only', () => {
  const result = verifyExecutableBundle();
  assert.equal(result.ok, true, result.failures.join('\n'));
  assert.deepEqual(validManifest, buildExecutableBundleManifest());
  assert.deepEqual(generateExecutableBundle().changed, []);
  assert.deepEqual(generateExecutableBundle().changed, []);
  assert.equal(validManifest.lifecycle.source_contract, 'SOURCE_READY');
  assert.equal(validManifest.lifecycle.execution, 'EXECUTION_BLOCKED');
  assert.equal(validManifest.lifecycle.apply_admitted, false);
  assert.equal(validManifest.authority_boundary.executor_state, 'BLOCKED_NOT_INCLUDED');
});

test('four promoted artifacts are the exact ordered governed execution projection', () => {
  assert.equal(validManifest.artifacts.length, 4);
  for (const artifact of executableBundleArtifacts) {
    const source = fs.readFileSync(path.join(repositoryRoot, ...artifact.source_path.split('/')));
    const promoted = fs.readFileSync(path.join(repositoryRoot, ...artifact.promoted_path.split('/')));
    const expected = buildExecutableArtifactBytes(repositoryRoot, artifact);
    assert.equal(expected.equals(promoted), true, artifact.promoted_path);
    assert.equal(source.equals(promoted), artifact.ordinal !== musicSeshExecutableExclusion.artifact_ordinal, artifact.promoted_path);
  }
  assert.equal(validManifest.statement_denominator.historical_executable_statement_count, 721);
  assert.equal(validManifest.statement_denominator.historical_held_statement_count, 532);
  assert.equal(validManifest.statement_denominator.execution_exclusion_statement_count, 28);
  assert.equal(validManifest.statement_denominator.executable_statement_count, 693);
  assert.equal(validManifest.statement_denominator.held_statement_count, 560);
  assert.equal(validManifest.statement_denominator.promoted_statement_count, 693);
  assert.equal(validManifest.immutable_package.standard_migration_sql_count, 0);
});

test('schema and cross-document semantics accept the exact manifest', () => {
  const result = validateContracts();
  assert.equal(result.ok, true, result.failures.join('\n'));
  assert.equal(result.schema_count, 28);
  assert.equal(result.document_count, 27);
  assert.equal(result.semantic_check_groups, 27);
});

test('source or promoted byte substitution fails even after coherent digest rebinding', () => {
  expectRejected((candidate) => {
    candidate.artifacts[0].source_sha256 = '8'.repeat(64);
    candidate.artifacts[0].promoted_sha256 = '8'.repeat(64);
    candidate.ordered_artifact_set_sha256 = canonicalCompactSha256(candidate.artifacts.map((artifact) => ({
      ordinal: artifact.ordinal,
      source_path: artifact.source_path,
      promoted_path: artifact.promoted_path,
      bytes: artifact.bytes,
      sha256: artifact.expected_promoted_sha256
    })));
  });
});

test('Music Sesh independent-domain exclusion fails closed on adapter, gate, or source drift', () => {
  const mutations = [
    (root) => {
      const file = path.join(root, 'contracts/v1/transport/discordos-app-data-adapter-contract.json');
      const adapter = JSON.parse(fs.readFileSync(file, 'utf8'));
      adapter.relations.find((relation) => relation.source_relation === musicSeshExecutableExclusion.relation_names[0]).target_relation = 'discordos.discordos_music_sesh_sessions';
      fs.writeFileSync(file, `${JSON.stringify(adapter, null, 2)}\n`);
    },
    (root) => {
      const file = path.join(root, 'contracts/v1/gates/migration-gate-state.json');
      const gate = JSON.parse(fs.readFileSync(file, 'utf8'));
      gate.app_data_adapters.discordos_block_reason = 'REBOUND_BUT_UNSAFE';
      fs.writeFileSync(file, `${JSON.stringify(gate, null, 2)}\n`);
    },
    (root) => fs.appendFileSync(path.join(root, ...musicSeshExecutableExclusion.repository_source_path.split('/')), '\n')
  ];
  for (const mutate of mutations) {
    const fixtureRoot = createBundleFixture();
    try {
      mutate(fixtureRoot);
      assert.throws(() => buildExecutableBundleManifest(fixtureRoot), /Music Sesh/);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }
});

test('Music Sesh executable projection contains none of the held relations or source statements', () => {
  const artifact = executableBundleArtifacts.find((candidate) => candidate.ordinal === musicSeshExecutableExclusion.artifact_ordinal);
  const promoted = fs.readFileSync(path.join(repositoryRoot, ...artifact.promoted_path.split('/')));
  assert.equal(promoted.length, musicSeshExecutableExclusion.executable_bytes);
  assert.equal(promoted.includes(Buffer.from('music_sesh', 'utf8')), false);
  for (const relation of musicSeshExecutableExclusion.relation_names) {
    assert.equal(promoted.includes(Buffer.from(relation, 'utf8')), false, relation);
  }
});

test('missing, extra, reordered, renamed, and duplicated artifact sets fail closed', () => {
  const mutations = [
    (candidate) => candidate.artifacts.pop(),
    (candidate) => candidate.artifacts.push(clone(candidate.artifacts[0])),
    (candidate) => candidate.artifacts.reverse(),
    (candidate) => { candidate.artifacts[0].promoted_path = 'bootstrap/artifacts/executable-sql/renamed.sql'; },
    (candidate) => { candidate.artifacts[1].promoted_path = candidate.artifacts[0].promoted_path; }
  ];
  for (const mutate of mutations) expectRejected(mutate);
});

test('fifth promoted file and alternate executable placement are rejected', () => {
  const exactPaths = executableBundleArtifacts.map((artifact) => artifact.promoted_path);
  assert.deepEqual(validateExecutableBundleFileSet(exactPaths), []);
  assert.match(
    validateExecutableBundleFileSet([...exactPaths, 'bootstrap/artifacts/executable-sql/00000000000005_extra.sql']).join('\n'),
    /path denominator drift/
  );
  const failures = validateRepositoryEntries([
    { relativePath: 'bootstrap/artifacts/executable-sql/00000000000005_extra.sql', content: 'select 1;\n' },
    { relativePath: 'supabase/migrations/20260729000000_bundle.sql', content: 'select 1;\n' }
  ]);
  assert.ok(failures.some((failure) => failure.includes('00000000000005_extra.sql')));
  assert.ok(failures.some((failure) => failure.includes('supabase/migrations')));
});

test('exact four promoted paths are admitted by repository policy', () => {
  const entries = executableBundleArtifacts.map((artifact) => ({
    relativePath: artifact.promoted_path,
    content: fs.readFileSync(path.join(repositoryRoot, ...artifact.promoted_path.split('/')), 'utf8')
  }));
  assert.deepEqual(validateRepositoryEntries(entries), []);
});

test('stale package and governance identities fail closed', () => {
  expectRejected((candidate) => { candidate.immutable_package.migration_package_sha256 = '8'.repeat(64); });
  expectRejected((candidate) => { candidate.immutable_package.governance_manifest_sha256 = '8'.repeat(64); });
  expectRejected((candidate) => { candidate.immutable_package.migration_count = 121; });
});

test('stale contract and toolchain identities fail after coherent set-digest rebinding', () => {
  expectRejected((candidate) => {
    candidate.contract_bindings[0].sha256 = '8'.repeat(64);
    candidate.contract_bindings[0].observed_sha256 = '8'.repeat(64);
    candidate.contract_binding_set_sha256 = canonicalCompactSha256(candidate.contract_bindings.map(({ role, path: relativePath, sha256 }) => ({
      role,
      path: relativePath,
      sha256
    })));
  });
  expectRejected((candidate) => {
    candidate.toolchain[0].sha256 = '8'.repeat(64);
    candidate.toolchain[0].observed_sha256 = '8'.repeat(64);
    candidate.toolchain_set_sha256 = canonicalCompactSha256(candidate.toolchain.map(({ role, path: relativePath, sha256 }) => ({
      role,
      path: relativePath,
      sha256
    })));
  });
});

test('expected-effect and rollback identity substitution fails closed', () => {
  expectRejected((candidate) => {
    candidate.expected_effects_and_rollback_bindings[0].sha256 = '8'.repeat(64);
    candidate.expected_effects_and_rollback_bindings[0].observed_sha256 = '8'.repeat(64);
    candidate.expected_effects_and_rollback_set_sha256 = canonicalCompactSha256(
      candidate.expected_effects_and_rollback_bindings.map(({ role, path: relativePath, sha256 }) => ({
        role,
        path: relativePath,
        sha256
      }))
    );
  });
});

for (const binding of prerequisiteBindings) {
  test(`regeneration rejects prerequisite byte drift for ${binding.role}`, () => {
    const fixtureRoot = createBundleFixture();
    try {
      const file = path.join(fixtureRoot, ...binding.path.split('/'));
      fs.appendFileSync(file, '\n', 'utf8');
      assert.throws(
        () => buildExecutableBundleManifest(fixtureRoot),
        new RegExp(`${binding.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: executable bundle prerequisite digest drift`)
      );
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
}

test('target, run, provider, executor, and apply promotion fail closed', () => {
  expectRejected((candidate) => {
    candidate.action_time_placeholders.target_project_ref = 'exampleprojectref0000';
    candidate.action_time_placeholders.values_present = true;
  });
  expectRejected((candidate) => { candidate.authority_boundary.executor_state = 'CURRENT'; });
  expectRejected((candidate) => { candidate.authority_boundary.provider_connectivity_included = true; });
  expectRejected((candidate) => { candidate.lifecycle.apply_admitted = true; });
  expectRejected((candidate) => { candidate.lifecycle.execution = 'CURRENT'; });
});

test('raw secret/provider payload and weakened redaction claims fail closed', () => {
  expectRejected((candidate) => {
    candidate.action_time_placeholders.authority_event_id = 'raw-provider-response';
    candidate.redaction.raw_provider_payloads_forbidden = false;
  });
  expectRejected((candidate) => { candidate.redaction.credentials_and_secrets_forbidden = false; });
  expectRejected((candidate) => { candidate.redaction.sql_bytes_in_receipts_forbidden = false; });
});

test('generator output is canonical JSON with LF and no standard migration discovery', () => {
  const manifestText = fs.readFileSync(path.join(repositoryRoot, ...manifestPath.split('/')), 'utf8');
  assert.equal(manifestText, `${JSON.stringify(JSON.parse(manifestText), null, 2)}\n`);
  assert.equal(manifestText.includes('\r'), false);
  assert.equal(fs.existsSync(path.join(repositoryRoot, 'supabase', 'migrations')), false);
});
