import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildExecutableBundleManifest,
  canonicalCompactSha256,
  defaultRepositoryRoot,
  executableBundleArtifacts,
  executableBundleManifestPath
} from './generate-executable-bundle.mjs';

function fail(failures, condition, message) {
  if (!condition) failures.push(message);
}

export function validateExecutableBundleFileSet(relativePaths) {
  const expected = executableBundleArtifacts.map((artifact) => artifact.promoted_path);
  return JSON.stringify(relativePaths) === JSON.stringify(expected)
    ? []
    : ['executable bundle promoted path denominator drift'];
}

function listFilesRecursively(root, relativeDirectory) {
  const directory = path.join(root, ...relativeDirectory.split('/'));
  if (!fs.existsSync(directory)) return [];
  const result = [];
  const visit = (absoluteDirectory) => {
    for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
      const absolutePath = path.join(absoluteDirectory, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      else result.push(path.relative(root, absolutePath).split(path.sep).join('/'));
    }
  };
  visit(directory);
  return result.sort((left, right) => left.localeCompare(right));
}

export function verifyExecutableBundle(repositoryRoot = defaultRepositoryRoot) {
  const failures = [];
  const manifestFile = path.join(repositoryRoot, ...executableBundleManifestPath.split('/'));
  fail(failures, fs.existsSync(manifestFile), 'executable bundle manifest is missing');
  if (!fs.existsSync(manifestFile)) return { ok: false, failures };
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const expectedManifest = buildExecutableBundleManifest(repositoryRoot);
  fail(
    failures,
    canonicalCompactSha256(manifest) === canonicalCompactSha256(expectedManifest),
    'executable bundle manifest content drift'
  );
  const actualFiles = listFilesRecursively(repositoryRoot, 'bootstrap/artifacts/executable-sql');
  failures.push(...validateExecutableBundleFileSet(actualFiles));
  for (const artifact of executableBundleArtifacts) {
    const source = fs.readFileSync(path.join(repositoryRoot, ...artifact.source_path.split('/')));
    const promotedFile = path.join(repositoryRoot, ...artifact.promoted_path.split('/'));
    fail(failures, fs.existsSync(promotedFile), `${artifact.promoted_path}: promoted artifact is missing`);
    if (fs.existsSync(promotedFile)) {
      fail(failures, source.equals(fs.readFileSync(promotedFile)), `${artifact.promoted_path}: promoted bytes differ from inert source`);
    }
  }
  const standardMigrationDirectory = path.join(repositoryRoot, 'supabase', 'migrations');
  const standardSql = fs.existsSync(standardMigrationDirectory)
    ? listFilesRecursively(repositoryRoot, 'supabase/migrations').filter((relativePath) => relativePath.endsWith('.sql'))
    : [];
  fail(failures, standardSql.length === 0, 'standard Supabase migration SQL must remain absent');
  fail(failures, manifest.lifecycle?.source_contract === 'SOURCE_READY', 'executable bundle source lifecycle drift');
  fail(failures, manifest.lifecycle?.execution === 'EXECUTION_BLOCKED', 'executable bundle execution must remain BLOCKED');
  fail(failures, manifest.lifecycle?.apply_admitted === false, 'executable bundle apply must remain not admitted');
  fail(failures, manifest.authority_boundary?.executor_state === 'BLOCKED_NOT_INCLUDED', 'executor must remain absent and blocked');
  fail(failures, manifest.action_time_placeholders?.values_present === false, 'action-time target or run values must not be serialized');
  return { ok: failures.length === 0, failures: failures.sort((left, right) => left.localeCompare(right)), manifest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = verifyExecutableBundle();
  process.stdout.write(`${JSON.stringify({
    status: result.ok ? 'OK' : 'FAILED',
    artifact_count: result.manifest?.artifacts?.length ?? 0,
    ordered_artifact_set_sha256: result.manifest?.ordered_artifact_set_sha256 ?? null,
    apply_admitted: result.manifest?.lifecycle?.apply_admitted ?? null,
    failures: result.failures
  }, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}
