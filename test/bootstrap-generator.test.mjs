import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  generatedInertArtifactContractV1,
  generatedManifestContractV1,
  generateTargetBootstrap,
  namespaceRewrite,
  parseLinuxMountInfo,
  parseFunctionDefinition,
  parseFunctionPrivilegeStatement,
  parseFunctionSearchPath,
  readLinuxMountInfo,
  resolveGeneratedInertArtifactPath,
  root,
  splitSqlStatements,
  validateLinuxMountLayout,
  verifyFitnessFunctionSearchPaths,
  writeTargetBootstrapArtifacts
} from '../scripts/generate-target-bootstrap.mjs';

const inertArtifactDirectory = `${root}/${generatedInertArtifactContractV1.directory}`;

function listSqlFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = `${directory}/${entry.name}`;
    return entry.isDirectory() ? listSqlFiles(entryPath) : entry.isFile() && entry.name.endsWith('.sql') ? [entryPath] : [];
  }).sort();
}

function digestOutputs() {
  const paths = [
    ...fs.readdirSync(`${root}/bootstrap/manifests`).sort().map((name) => `bootstrap/manifests/${name}`),
    ...fs.readdirSync(inertArtifactDirectory).sort().map((name) => `${generatedInertArtifactContractV1.directory}/${name}`)
  ];
  const hash = crypto.createHash('sha256');
  for (const relativePath of paths) hash.update(relativePath).update('\0').update(fs.readFileSync(`${root}/${relativePath}`));
  return hash.digest('hex');
}

function withTemporaryDirectory(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fawxzzy-platform-generator-'));
  try {
    return run(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function fixtureGeneratedFiles() {
  return new Map(generatedInertArtifactContractV1.filenames.map((filename) => [filename, `-- ${filename}\n`]));
}

function fixtureManifestFiles() {
  return new Map(generatedManifestContractV1.filenames.map((filename) => [filename, { filename, fixture: true }]));
}

function writeFixtureArtifacts(files, repositoryRoot, options = {}) {
  return writeTargetBootstrapArtifacts(fixtureManifestFiles(), files, repositoryRoot, options);
}

function createDirectoryLink(target, link) {
  fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
}

function outputPath(repositoryRoot) {
  return path.join(repositoryRoot, ...generatedInertArtifactContractV1.directory.split('/'));
}

function assertDirectoryEmpty(directory) {
  assert.deepEqual(fs.existsSync(directory) ? fs.readdirSync(directory) : [], []);
}

test('two generator runs are byte-identical', () => {
  const before = digestOutputs();
  const firstReport = generateTargetBootstrap();
  const first = digestOutputs();
  const secondReport = generateTargetBootstrap();
  const second = digestOutputs();
  assert.equal(firstReport.ok, true);
  assert.deepEqual(firstReport, secondReport);
  assert.equal(before, first);
  assert.equal(first, second);
});

test('every generated SQL artifact carries the non-apply marker', () => {
  for (const filename of fs.readdirSync(inertArtifactDirectory)) {
    assert.match(fs.readFileSync(`${inertArtifactDirectory}/${filename}`, 'utf8'), /^-- APPLY_ADMITTED=false\n/);
  }
});

test('generated SQL is path-level inert and closed to the exact artifact namespace', () => {
  assert.deepEqual(listSqlFiles(`${root}/supabase/migrations`), []);
  assert.deepEqual(fs.readdirSync(inertArtifactDirectory).sort(), generatedInertArtifactContractV1.filenames);
  for (const filename of generatedInertArtifactContractV1.filenames) {
    assert.equal(resolveGeneratedInertArtifactPath(filename), path.join(inertArtifactDirectory, filename));
  }
  assert.throws(() => resolveGeneratedInertArtifactPath('../escape.sql'), /undeclared generated inert artifact/);
  assert.throws(() => resolveGeneratedInertArtifactPath('copy.sql'), /undeclared generated inert artifact/);
});

test('non-link inert artifact creation and idempotent regeneration preserve exact outputs', () => {
  withTemporaryDirectory((repositoryRoot) => {
    const standardMigrations = path.join(repositoryRoot, 'supabase', 'migrations');
    fs.mkdirSync(standardMigrations, { recursive: true });
    const files = fixtureGeneratedFiles();
    writeFixtureArtifacts(files, repositoryRoot);
    const first = new Map(generatedInertArtifactContractV1.filenames.map((filename) => [
      filename,
      fs.readFileSync(path.join(outputPath(repositoryRoot), filename), 'utf8')
    ]));
    writeFixtureArtifacts(files, repositoryRoot);
    const second = new Map(generatedInertArtifactContractV1.filenames.map((filename) => [
      filename,
      fs.readFileSync(path.join(outputPath(repositoryRoot), filename), 'utf8')
    ]));
    assert.deepEqual(first, files);
    assert.deepEqual(second, files);
    assert.deepEqual(listSqlFiles(standardMigrations), []);
  });
});

test('linked inert artifact directories fail before any write', () => {
  withTemporaryDirectory((repositoryRoot) => {
    const linkedTarget = path.join(repositoryRoot, 'linked-output');
    fs.mkdirSync(path.dirname(outputPath(repositoryRoot)), { recursive: true });
    fs.mkdirSync(linkedTarget);
    createDirectoryLink(linkedTarget, outputPath(repositoryRoot));
    assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot), /link-like/);
    assertDirectoryEmpty(linkedTarget);
  });
});

test('an inert artifact directory linked to standard migration discovery writes nothing', () => {
  withTemporaryDirectory((repositoryRoot) => {
    const standardMigrations = path.join(repositoryRoot, 'supabase', 'migrations');
    fs.mkdirSync(standardMigrations, { recursive: true });
    fs.mkdirSync(path.dirname(outputPath(repositoryRoot)), { recursive: true });
    createDirectoryLink(standardMigrations, outputPath(repositoryRoot));
    assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot), /link-like|physically alias/);
    assertDirectoryEmpty(standardMigrations);
  });
});

test('an inert artifact directory linked outside the repository writes nothing', () => {
  withTemporaryDirectory((temporaryRoot) => {
    const repositoryRoot = path.join(temporaryRoot, 'repository');
    const outside = path.join(temporaryRoot, 'outside');
    fs.mkdirSync(path.dirname(outputPath(repositoryRoot)), { recursive: true });
    fs.mkdirSync(outside);
    createDirectoryLink(outside, outputPath(repositoryRoot));
    assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot), /link-like|physical path escape/);
    assertDirectoryEmpty(outside);
  });
});

test('linked declared artifact files fail before any artifact write', () => {
  withTemporaryDirectory((repositoryRoot) => {
    fs.mkdirSync(outputPath(repositoryRoot), { recursive: true });
    const outsideFile = path.join(repositoryRoot, 'outside.sql');
    const linkedFile = path.join(outputPath(repositoryRoot), generatedInertArtifactContractV1.filenames[0]);
    fs.writeFileSync(outsideFile, 'sentinel\n', 'utf8');
    fs.linkSync(outsideFile, linkedFile);
    assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot), /multiply-linked/);
    assert.equal(fs.readFileSync(outsideFile, 'utf8'), 'sentinel\n');
    assert.equal(fs.readdirSync(outputPath(repositoryRoot)).length, 1);
  });
});

test('broken declared artifact links fail before any write without host link privileges', () => {
  withTemporaryDirectory((repositoryRoot) => {
    fs.mkdirSync(outputPath(repositoryRoot), { recursive: true });
    const brokenLink = path.join(outputPath(repositoryRoot), generatedInertArtifactContractV1.filenames[0]);
    const originalLstat = fs.lstatSync;
    const originalWrite = fs.writeFileSync;
    let writeCount = 0;
    fs.lstatSync = (candidate, ...args) => path.resolve(candidate) === path.resolve(brokenLink)
      ? { isSymbolicLink: () => true, isDirectory: () => false, isFile: () => false }
      : originalLstat(candidate, ...args);
    fs.writeFileSync = (...args) => {
      writeCount += 1;
      return originalWrite(...args);
    };
    try {
      assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot), /link-like/);
    } finally {
      fs.lstatSync = originalLstat;
      fs.writeFileSync = originalWrite;
    }
    assert.equal(writeCount, 0);
    assertDirectoryEmpty(outputPath(repositoryRoot));
  });
});

test('linked standard migration discovery fails before creating inert output', () => {
  withTemporaryDirectory((repositoryRoot) => {
    const standardParent = path.join(repositoryRoot, 'supabase');
    const linkTarget = path.join(repositoryRoot, 'linked-standard-migrations');
    fs.mkdirSync(standardParent, { recursive: true });
    fs.mkdirSync(linkTarget);
    createDirectoryLink(linkTarget, path.join(standardParent, 'migrations'));
    assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot), /link-like/);
    assert.equal(fs.existsSync(outputPath(repositoryRoot)), false);
    assertDirectoryEmpty(linkTarget);
  });
});

test('link-like repository roots fail before any write', () => {
  withTemporaryDirectory((temporaryRoot) => {
    const physicalRepository = path.join(temporaryRoot, 'physical-repository');
    const linkedRepository = path.join(temporaryRoot, 'linked-repository');
    fs.mkdirSync(physicalRepository);
    createDirectoryLink(physicalRepository, linkedRepository);
    assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), linkedRepository), /repository root is link-like/);
    assertDirectoryEmpty(physicalRepository);
  });
});

test('repository roots reached through a link-like ancestor fail before any write', () => {
  withTemporaryDirectory((temporaryRoot) => {
    const physicalParent = path.join(temporaryRoot, 'physical-parent');
    const physicalRepository = path.join(physicalParent, 'repository');
    const linkedParent = path.join(temporaryRoot, 'linked-parent');
    fs.mkdirSync(physicalRepository, { recursive: true });
    createDirectoryLink(physicalParent, linkedParent);
    assert.throws(
      () => writeFixtureArtifacts(fixtureGeneratedFiles(), path.join(linkedParent, 'repository')),
      /physical alias or link-like ancestor/
    );
    assertDirectoryEmpty(physicalRepository);
  });
});

test('unsupported declared artifact entry types fail before any write', () => {
  withTemporaryDirectory((repositoryRoot) => {
    fs.mkdirSync(outputPath(repositoryRoot), { recursive: true });
    const unsupportedEntry = path.join(outputPath(repositoryRoot), generatedInertArtifactContractV1.filenames[0]);
    const originalLstat = fs.lstatSync;
    const originalWrite = fs.writeFileSync;
    let writeCount = 0;
    fs.lstatSync = (candidate, ...args) => path.resolve(candidate) === path.resolve(unsupportedEntry)
      ? { isSymbolicLink: () => false, isDirectory: () => false, isFile: () => false }
      : originalLstat(candidate, ...args);
    fs.writeFileSync = (...args) => {
      writeCount += 1;
      return originalWrite(...args);
    };
    try {
      assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot), /unsupported filesystem entry type/);
    } finally {
      fs.lstatSync = originalLstat;
      fs.writeFileSync = originalWrite;
    }
    assert.equal(writeCount, 0);
    assertDirectoryEmpty(outputPath(repositoryRoot));
  });
});

test('linked manifest directories fail before any manifest or SQL write', () => {
  withTemporaryDirectory((repositoryRoot) => {
    const linkedTarget = path.join(repositoryRoot, 'linked-manifests');
    const manifests = path.join(repositoryRoot, ...generatedManifestContractV1.directory.split('/'));
    fs.mkdirSync(path.dirname(manifests), { recursive: true });
    fs.mkdirSync(linkedTarget);
    createDirectoryLink(linkedTarget, manifests);
    assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot), /link-like/);
    assertDirectoryEmpty(linkedTarget);
    assert.equal(fs.existsSync(outputPath(repositoryRoot)), false);
  });
});

test('an unsafe last-declared manifest destination produces zero publication writes', () => {
  withTemporaryDirectory((repositoryRoot) => {
    const manifests = path.join(repositoryRoot, ...generatedManifestContractV1.directory.split('/'));
    const lastManifest = generatedManifestContractV1.filenames.at(-1);
    const outsideFile = path.join(repositoryRoot, 'outside.json');
    fs.mkdirSync(manifests, { recursive: true });
    fs.writeFileSync(outsideFile, 'sentinel\n', 'utf8');
    fs.linkSync(outsideFile, path.join(manifests, lastManifest));
    const originalWrite = fs.writeFileSync;
    let writeCount = 0;
    fs.writeFileSync = (...args) => {
      writeCount += 1;
      return originalWrite(...args);
    };
    try {
      assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot), /multiply-linked/);
    } finally {
      fs.writeFileSync = originalWrite;
    }
    assert.equal(writeCount, 0);
    assert.equal(fs.readFileSync(outsideFile, 'utf8'), 'sentinel\n');
    assert.equal(fs.existsSync(outputPath(repositoryRoot)), false);
  });
});

test('an unsafe final SQL destination produces zero manifest or SQL writes', () => {
  withTemporaryDirectory((repositoryRoot) => {
    const lastSql = generatedInertArtifactContractV1.filenames.at(-1);
    const outsideFile = path.join(repositoryRoot, 'outside.sql');
    fs.mkdirSync(outputPath(repositoryRoot), { recursive: true });
    fs.writeFileSync(outsideFile, 'sentinel\n', 'utf8');
    fs.linkSync(outsideFile, path.join(outputPath(repositoryRoot), lastSql));
    const originalWrite = fs.writeFileSync;
    let writeCount = 0;
    fs.writeFileSync = (...args) => {
      writeCount += 1;
      return originalWrite(...args);
    };
    try {
      assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot), /multiply-linked/);
    } finally {
      fs.writeFileSync = originalWrite;
    }
    assert.equal(writeCount, 0);
    assert.equal(fs.readFileSync(outsideFile, 'utf8'), 'sentinel\n');
    assert.equal(fs.existsSync(path.join(repositoryRoot, ...generatedManifestContractV1.directory.split('/'))), false);
  });
});

test('complete discovery rejects a late undeclared output before rewriting manifests', () => {
  withTemporaryDirectory((repositoryRoot) => {
    const manifests = path.join(repositoryRoot, ...generatedManifestContractV1.directory.split('/'));
    fs.mkdirSync(manifests, { recursive: true });
    for (const filename of generatedManifestContractV1.filenames) {
      fs.writeFileSync(path.join(manifests, filename), 'sentinel\n', 'utf8');
    }
    fs.mkdirSync(outputPath(repositoryRoot), { recursive: true });
    fs.mkdirSync(path.join(outputPath(repositoryRoot), 'late-unsafe-entry'));
    assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot), /unsupported filesystem entry type/);
    for (const filename of generatedManifestContractV1.filenames) {
      assert.equal(fs.readFileSync(path.join(manifests, filename), 'utf8'), 'sentinel\n');
    }
  });
});

test('nested standard-migration links fail before creating publication directories', () => {
  withTemporaryDirectory((repositoryRoot) => {
    const standardMigrations = path.join(repositoryRoot, 'supabase', 'migrations');
    const outside = path.join(repositoryRoot, 'outside-standard');
    fs.mkdirSync(standardMigrations, { recursive: true });
    fs.mkdirSync(outside);
    createDirectoryLink(outside, path.join(standardMigrations, 'nested-link'));
    assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot), /link-like/);
    assert.equal(fs.existsSync(path.join(repositoryRoot, 'bootstrap')), false);
    assertDirectoryEmpty(outside);
  });
});

test('non-SQL standard-migration residue fails before creating publication directories', () => {
  withTemporaryDirectory((repositoryRoot) => {
    const standardMigrations = path.join(repositoryRoot, 'supabase', 'migrations');
    fs.mkdirSync(standardMigrations, { recursive: true });
    fs.writeFileSync(path.join(standardMigrations, 'README.txt'), 'residue\n', 'utf8');
    assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot), /is not empty/);
    assert.equal(fs.existsSync(path.join(repositoryRoot, 'bootstrap')), false);
  });
});

const normalMountInfo = '24 1 8:1 / / rw,relatime - ext4 /dev/root rw\n';

test('Linux mountinfo parser and classifier accept one unaliased repository mount', () => {
  assert.equal(parseLinuxMountInfo(normalMountInfo).length, 1);
  assert.deepEqual(
    validateLinuxMountLayout('/workspace/repository', [
      '/workspace/repository',
      '/workspace/repository/bootstrap/manifests',
      '/workspace/repository/bootstrap/artifacts/inert-sql',
      '/workspace/repository/supabase/migrations'
    ], normalMountInfo),
    { repositoryMountId: '24', plannedPathCount: 4 }
  );
});

test('Linux mountinfo fails closed on escaped binds, nested mounts, aliases, and path escapes', () => {
  const escapedBind = `${normalMountInfo.trimEnd()}\n25 24 8:1 /source/repository /workspace/repository rw - ext4 /dev/root rw\n`;
  const nestedMount = `${normalMountInfo.trimEnd()}\n25 24 8:2 / /workspace/repository/bootstrap rw - tmpfs tmpfs rw\n`;
  const aliasMount = `${normalMountInfo.trimEnd()}\n25 24 8:2 / /workspace/repository rw - ext4 /dev/repository rw\n26 24 8:2 / /alias rw - ext4 /dev/repository rw\n`;
  assert.throws(() => validateLinuxMountLayout('/workspace/repository', ['/workspace/repository/bootstrap'], escapedBind), /bind\/subtree mount alias/);
  assert.throws(() => validateLinuxMountLayout('/workspace/repository', ['/workspace/repository/bootstrap'], nestedMount), /nested mount point/);
  assert.throws(() => validateLinuxMountLayout('/workspace/repository', ['/workspace/repository/bootstrap'], aliasMount), /alias of the repository mount/);
  assert.throws(() => validateLinuxMountLayout('/workspace/repository', ['/workspace/outside'], normalMountInfo), /escaped the Linux repository mount/);
});

test('Linux mountinfo fails closed on malformed, duplicate, conflicting, or unreadable input', () => {
  assert.throws(() => parseLinuxMountInfo('malformed\n'), /malformed|invalid/);
  assert.throws(() => parseLinuxMountInfo(`${normalMountInfo.trimEnd()}\n24 1 8:1 / /other rw - ext4 /dev/root rw\n`), /duplicate mount id/);
  assert.throws(
    () => validateLinuxMountLayout('/workspace/repository', ['/workspace/repository/bootstrap'], `${normalMountInfo.trimEnd()}\n25 24 8:2 / / rw - tmpfs tmpfs rw\n`),
    /duplicate or conflicting repository mount point/
  );
  assert.throws(() => readLinuxMountInfo(() => { throw new Error('denied'); }), /unreadable/);
});

test('Linux mountinfo ignores duplicate host mount points outside the repository', () => {
  const hostStack = `${normalMountInfo.trimEnd()}\n25 24 0:8 / /proc/sys/fs/binfmt_misc rw - proc proc rw\n26 24 0:9 / /proc/sys/fs/binfmt_misc rw - binfmt_misc binfmt_misc rw\n`;
  assert.equal(
    validateLinuxMountLayout('/workspace/repository', ['/workspace/repository/bootstrap'], hostStack).repositoryMountId,
    '24'
  );
});

test('Fitness namespace rewriting canonicalizes only the function-header search_path clause', () => {
  const source = `
    CrEaTe OR
      RePlAcE FuNcTiOn public.example(target_id uuid)
    returns text
    LaNgUaGe sql
    SET search_path = PUBLIC , PG_TEMP
    AS $body$
      select 'set search_path = public, pg_temp';
      -- set search_path = public, pg_temp
    $body$;
  `;
  const rewritten = namespaceRewrite(source, 'fitness');
  const parsed = parseFunctionSearchPath(rewritten, 'fitness');
  assert.equal(parsed.malformed, false);
  assert.equal(parsed.present, true);
  assert.deepEqual(parsed.schemas, ['fitness', 'pg_temp']);
  assert.match(rewritten, /FuNcTiOn fitness\.example/i);
  assert.match(rewritten, /set search_path = fitness, pg_temp/);
  assert.match(rewritten, /select 'set search_path = public, pg_temp'/);
  assert.match(rewritten, /-- set search_path = public, pg_temp/);

  const plainCreate = namespaceRewrite(`
    CREATE FUNCTION public.plain() returns void
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
    AS $$ begin null; end; $$;
  `, 'fitness');
  assert.deepEqual(parseFunctionSearchPath(plainCreate, 'fitness').schemas, ['fitness', 'pg_temp']);
});

test('Fitness namespace rewriting and final-state validation fail closed on unsafe search paths', () => {
  const definition = (clause) => `
    create or replace function public.example() returns void
    language plpgsql
    ${clause}
    as $$ begin null; end; $$;
  `;
  for (const clause of [
    'set search_path to public, pg_temp',
    'set search_path = public, pg_temp, extensions',
    'set search_path = public, extensions',
    'set search_path = public, pg_temp set search_path = public, pg_temp'
  ]) {
    assert.throws(() => namespaceRewrite(definition(clause), 'fitness'), /search_path/);
  }

  const missing = namespaceRewrite(definition(''), 'fitness');
  assert.match(verifyFitnessFunctionSearchPaths([missing])[0], /missing search_path/);

  const initialMissing = namespaceRewrite(definition(''), 'fitness');
  const finalConfigured = namespaceRewrite(definition('set search_path = public, pg_temp'), 'fitness');
  assert.deepEqual(verifyFitnessFunctionSearchPaths([initialMissing, finalConfigured]), []);
});

test('Fitness search_path regeneration preserves every non-Fitness generated SQL identity', () => {
  const expected = {
    '00000000000001_mazer_schema_inert.sql': '1f8eeee06bab1878b51e85cfdda09d766e17765d66366de69e406d8f58bd72ac',
    '00000000000003_discordos_schema_inert.sql': '5b2783d8f6a78a2a9898c94559b31c168dcb1b5deebc1546365c1c8f09ade79f',
    '00000000000004_platform_security_overlay_inert.sql': '591673cf965aaa19c2cf5dcdfc3458fae43173bfa435dc03b0c0c49589709541'
  };
  for (const [filename, digest] of Object.entries(expected)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(`${inertArtifactDirectory}/${filename}`)).digest('hex');
    assert.equal(actual, digest, filename);
  }
});

test('generated function ACL closure is exact, unique, and follows the final definition', () => {
  const expected = new Map([
    ['00000000000002_fitness_schema_inert.sql', new Map([
      ['fitness.claim_session_follow_up_jobs(uuid, uuid, timestamptz, timestamptz)', 2],
      ['fitness.reorder_routine_day_exercises(uuid, uuid, uuid[])', 2],
      ['fitness.reorder_routine_days(uuid, uuid, uuid[])', 1],
      ['fitness.repack_routine_day_exercise_positions_after_delete()', 3],
      ['fitness.repack_session_exercise_positions_after_delete()', 3]
    ])],
    ['00000000000003_discordos_schema_inert.sql', new Map([['discordos.set_updated_at()', 1]])]
  ]);
  for (const [filename, signatureCounts] of expected) {
    const signatures = [...signatureCounts.keys()].sort();
    const fallback = filename.includes('_fitness_') ? 'fitness' : 'discordos';
    const statements = splitSqlStatements(fs.readFileSync(`${inertArtifactDirectory}/${filename}`, 'utf8'));
    const definitions = new Map();
    const privileges = new Map();
    statements.forEach((statement, index) => {
      const definition = parseFunctionDefinition(statement, fallback);
      if (definition) {
        const state = definitions.get(definition.signature) ?? { count: 0, finalIndex: -1 };
        state.count += 1;
        state.finalIndex = index;
        definitions.set(definition.signature, state);
      }
      const privilege = parseFunctionPrivilegeStatement(statement, fallback);
      if (privilege && !privilege.malformed) {
        assert.equal(privileges.has(privilege.signature), false, privilege.signature);
        privileges.set(privilege.signature, { index, privilege });
      }
    });
    assert.deepEqual([...definitions.keys()].sort(), signatures);
    assert.deepEqual([...privileges.keys()].sort(), signatures);
    for (const signature of signatures) {
      const { index, privilege } = privileges.get(signature);
      assert.equal(definitions.get(signature).count, signatureCounts.get(signature), signature);
      assert.ok(index > definitions.get(signature).finalIndex, signature);
      assert.equal(privilege.action, 'revoke');
      assert.deepEqual(privilege.roles, ['anon', 'authenticated', 'public', 'service_role']);
    }
  }
});
