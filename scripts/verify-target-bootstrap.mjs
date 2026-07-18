import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalJson,
  analyzeFunctionDependencyStatement,
  classifyStatement,
  findHeldFunctionReferences,
  generateTargetBootstrap,
  gitBlobSha1,
  parseFunctionDefinition,
  root,
  sha256,
  splitSqlStatements
} from './generate-target-bootstrap.mjs';

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

function readJson(relativePath) {
  const text = fs.readFileSync(path.join(root, ...relativePath.split('/')), 'utf8');
  const value = JSON.parse(text);
  if (text !== canonicalJson(value)) throw new Error(`${relativePath}: non-canonical JSON`);
  return value;
}

function digestPackageOutputs() {
  const paths = [
    ...expectedManifestFiles.map((name) => `bootstrap/manifests/${name}`),
    ...expectedGeneratedFiles.map((name) => `supabase/migrations/${name}`)
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

function verifySourceManifest(config, manifest, failures) {
  fail(failures, manifest.apply_admitted === false, 'source manifest must set apply_admitted=false');
  fail(failures, manifest.migrations.length === exactExpected.migrations, 'source migration denominator must be 122');
  fail(failures, manifest.evidence_artifact.artifact_sha256 === config.evidence.artifact_sha256, 'evidence artifact digest drift');
  fail(failures, manifest.evidence_artifact.accepted_combined_manifest_sha256 === config.evidence.accepted_combined_manifest_sha256, 'accepted combined manifest digest drift');
  const sourceByApp = new Map(config.sources.map((source) => [source.app, source]));
  const seen = new Set();
  for (const migration of manifest.migrations) {
    const source = sourceByApp.get(migration.app);
    fail(failures, Boolean(source), `${migration.copied_path}: undeclared source app`);
    if (!source) continue;
    fail(failures, migration.commit === source.commit, `${migration.copied_path}: source commit drift`);
    fail(failures, migration.tree === source.tree, `${migration.copied_path}: source tree drift`);
    fail(failures, migration.path === `supabase/migrations/${path.posix.basename(migration.copied_path)}`, `${migration.copied_path}: source path mismatch`);
    const absolutePath = path.join(root, ...migration.copied_path.split('/'));
    const bytes = fs.readFileSync(absolutePath);
    fail(failures, bytes.length === migration.byte_count, `${migration.copied_path}: byte count drift`);
    fail(failures, sha256(bytes) === migration.raw_sha256, `${migration.copied_path}: raw digest drift`);
    fail(failures, gitBlobSha1(bytes) === migration.blob, `${migration.copied_path}: Git blob drift`);
    fail(failures, !bytes.includes(13), `${migration.copied_path}: CR byte detected`);
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
  fail(failures, config.blocked_dependencies.length === 1 && config.blocked_dependencies[0].decision === 'BLOCKED', 'blocked Fitness dependency drift');

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

export function inspectInertSql(filename, text, heldFunctionTargets = []) {
  const failures = [];
  fail(failures, text.startsWith('-- APPLY_ADMITTED=false\n'), `${filename}: missing inert marker`);
  fail(failures, !text.includes('\r'), `${filename}: CR byte detected`);
  fail(failures, !/\bcreate\s+(?:or\s+replace\s+)?(?:table|schema|function|trigger|policy|index|sequence|type|view)\s+(?:if\s+not\s+exists\s+)?(?:auth|storage|extensions|realtime)\s*\./i.test(text), `${filename}: provider-managed object recreation detected`);
  fail(failures, !/\bcreate\s+(?:or\s+replace\s+)?(?:table|schema|function|trigger|policy|index|sequence|type|view)\s+(?:if\s+not\s+exists\s+)?public\s*\./i.test(text), `${filename}: public product object creation detected`);
  fail(failures, !/\bcreate\s+extension\b/i.test(text), `${filename}: extension activation detected`);
  fail(failures, !/\bcron\.schedule\s*\(|\bnet\.http_(?:get|post|delete)\s*\(/i.test(text), `${filename}: Cron or network effect detected`);
  fail(failures, !/https?:\/\//i.test(text), `${filename}: network hook detected`);
  fail(failures, !/\b(?:supabase\s+(?:link|login|db\s+push|migration\s+up|reset)|npm\s+(?:install|publish)|vercel\s+(?:deploy|link|env))\b/i.test(text), `${filename}: executable provider/runtime command detected`);
  fail(failures, !/\bgrant\s+[^;]*\bon\s+schema\s+(?:platform_private|discordos_private)\s+to\s+(?:PUBLIC|anon|authenticated)\b/i.test(text), `${filename}: private schema exposure detected`);
  fail(failures, !/\bgrant\s+execute\s+on\s+function\s+[^;]+\s+to\s+PUBLIC\b/i.test(text), `${filename}: PUBLIC function execute detected`);
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

function verifyGeneratedSql(config, dispositions, failures) {
  const directory = path.join(root, 'supabase', 'migrations');
  const actualFiles = fs.readdirSync(directory).filter((name) => name.endsWith('.sql')).sort();
  fail(failures, canonicalJson(actualFiles) === canonicalJson(expectedGeneratedFiles), 'generated SQL path denominator drift');
  let resolvedDenyPolicyCount = 0;
  const orderedFiles = [];
  const heldFunctionTargets = [...new Set(dispositions.held_functions.map((unit) => unit.target_identity))].sort();
  for (const filename of actualFiles) {
    const text = fs.readFileSync(path.join(directory, filename), 'utf8');
    orderedFiles.push([filename, text]);
    failures.push(...inspectInertSql(filename, text, heldFunctionTargets));
    fail(failures, !text.includes(config.fitness_provenance.provider_canonical_043_blob), `${filename}: provider-canonical 043 blob leaked into output`);
    fail(failures, !text.includes(config.fitness_provenance.provider_canonical_043_sha256), `${filename}: provider-canonical 043 digest leaked into output`);
    resolvedDenyPolicyCount += [...text.matchAll(/create\s+policy\s+[A-Za-z0-9_]+_deny_public_api_access\b/gi)].length;
  }
  failures.push(...verifySchemaCreationOrder(orderedFiles));
  fail(failures, resolvedDenyPolicyCount === 10, `resolved deny policy output must be 10, found ${resolvedDenyPolicyCount}`);
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
    ...expectedGeneratedFiles.map((name) => `supabase/migrations/${name}`),
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
    fail(failures, !/https:\/\/[a-z]{20}\.supabase\.(?:co|net)\b|\b(?:project[_-]?ref|supabase[_-]?url)\s*[=:]\s*["']?[a-z]{20}\b/i.test(text), `${relativePath}: project endpoint or bound project reference detected`);
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
  const objects = readJson('bootstrap/manifests/source-objects.v1.json');
  const dynamic = readJson('bootstrap/manifests/dynamic-units.v1.json');
  const dataEffects = readJson('bootstrap/manifests/data-effects.v1.json');
  const dispositions = readJson('bootstrap/manifests/dispositions.v1.json');
  verifySourceManifest(config, sourceManifest, failures);
  verifyObjects(objects, config, failures);
  verifyHeldUnits(config, dynamic, dataEffects, dispositions, sourceManifest, failures);
  verifyGeneratedSql(config, dispositions, failures);
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
      'immutable_source_identity', 'combined_manifest_binding', 'source_object_denominators',
      'dynamic_fail_closed', 'data_effect_hold', 'cron_hold', 'namespace_boundary',
      'schema_creation_order', 'discordos_public_rpc_hold', 'held_function_dependency_closure',
      'provider_managed_skip', 'private_schema_exposure', 'no_network_hooks',
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
