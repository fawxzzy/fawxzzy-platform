import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  generatedInertArtifactContractV1,
  generatedManifestContractV1,
  buildCreatorDefaultAclUnits,
  generateTargetBootstrap,
  namespaceRewrite,
  parseLinuxMountInfo,
  parseCreatorDefaultAclStatement,
  parseFunctionDefinition,
  parseFunctionPrivilegeStatement,
  parseFunctionSearchPath,
  readLinuxMountInfo,
  resolveGeneratedInertArtifactPath,
  root,
  splitSqlStatements,
  validateGeneratedInertArtifactLayout,
  validateImmutableSourceTree,
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

function fixtureManifestFiles(sourceMigrations = null) {
  const manifests = new Map(generatedManifestContractV1.filenames.map((filename) => [filename, { filename, fixture: true }]));
  if (sourceMigrations) manifests.set('source-migrations.v1.json', { migrations: sourceMigrations });
  return manifests;
}

function writeFixtureArtifacts(files, repositoryRoot, options = {}, sourceMigrations = null) {
  return writeTargetBootstrapArtifacts(fixtureManifestFiles(sourceMigrations), files, repositoryRoot, options);
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

function assertOutsideRepository(repositoryRoot) {
  const logicalRelative = path.relative(root, repositoryRoot);
  assert.ok(logicalRelative === '..' || logicalRelative.startsWith(`..${path.sep}`) || path.isAbsolute(logicalRelative));
  const physicalRelative = path.relative(fs.realpathSync.native(root), fs.realpathSync.native(repositoryRoot));
  assert.ok(physicalRelative === '..' || physicalRelative.startsWith(`..${path.sep}`) || path.isAbsolute(physicalRelative));
}

function createImmutableSourceFixture(repositoryRoot, content = 'select 1;\n') {
  const relativePath = 'bootstrap/sources/fixture/supabase/migrations/001_fixture.sql';
  const absolutePath = path.join(repositoryRoot, ...relativePath.split('/'));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
  const bytes = Buffer.from(content, 'utf8');
  return {
    absolutePath,
    migration: {
      copied_path: relativePath,
      byte_count: bytes.length,
      raw_sha256: crypto.createHash('sha256').update(bytes).digest('hex')
    }
  };
}

function assertImmutableSourceFailureBeforeWrite(repositoryRoot, sourceMigrations, pattern) {
  const originalWrite = fs.writeFileSync;
  let writeCount = 0;
  fs.writeFileSync = (...args) => {
    writeCount += 1;
    return originalWrite(...args);
  };
  try {
    assert.throws(
      () => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot, {}, sourceMigrations),
      pattern
    );
  } finally {
    fs.writeFileSync = originalWrite;
  }
  assert.equal(writeCount, 0);
  assert.equal(fs.existsSync(path.join(repositoryRoot, 'bootstrap', 'manifests')), false);
  assert.equal(fs.existsSync(outputPath(repositoryRoot)), false);
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

test('creator default ACL generation holds the provider role and emits only postgres units', () => {
  const config = JSON.parse(fs.readFileSync(`${root}/bootstrap/generator/config.v1.json`, 'utf8'));
  const units = buildCreatorDefaultAclUnits(config);
  assert.equal(units.length, 36);
  assert.equal(units.filter((unit) => unit.sql).length, 12);
  assert.equal(units.filter((unit) => unit.execution_disposition === 'ASSERT_SIGNATURE_SPECIFIC_REVOKE').length, 6);
  assert.equal(units.filter((unit) => unit.status === 'BLOCKED').length, 18);
  assert.ok(units.filter((unit) => unit.status === 'BLOCKED').every((unit) => unit.creator_role === 'supabase_admin'
    && unit.status === 'BLOCKED'
    && unit.execution_disposition === 'NOT_EXECUTABLE'
    && unit.blocker_class === 'BLOCKED_PROVIDER_ROLE'));
  for (const unit of units.filter((candidate) => candidate.sql)) {
    const parsed = parseCreatorDefaultAclStatement(unit.sql);
    assert.equal(parsed.malformed, false);
    assert.equal(parsed.creator_role, 'postgres');
  }
  const generatedSql = fs.readdirSync(inertArtifactDirectory)
    .map((filename) => fs.readFileSync(`${inertArtifactDirectory}/${filename}`, 'utf8'))
    .join('\n');
  assert.doesNotMatch(generatedSql, /alter\s+default\s+privileges\s+for\s+role\s+supabase_admin/i);
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

test('regular immutable source directories and files remain physically contained and match the source manifest', () => {
  withTemporaryDirectory((repositoryRoot) => {
    fs.mkdirSync(path.join(repositoryRoot, 'supabase', 'migrations'), { recursive: true });
    const fixture = createImmutableSourceFixture(repositoryRoot);
    const sourceTree = validateImmutableSourceTree(repositoryRoot);
    assert.deepEqual(sourceTree.files, [fixture.migration]);
    assert.doesNotThrow(() => writeFixtureArtifacts(
      fixtureGeneratedFiles(),
      repositoryRoot,
      {},
      [fixture.migration]
    ));
  });
});

test('immutable source file links and containment escapes fail before any publication write', (context) => {
  withTemporaryDirectory((repositoryRoot) => {
    fs.mkdirSync(path.join(repositoryRoot, 'supabase', 'migrations'), { recursive: true });
    const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fawxzzy-platform-source-outside-'));
    try {
      const outsideFile = path.join(outsideDirectory, 'outside.sql');
      fs.writeFileSync(outsideFile, 'select 1;\n', 'utf8');
      const migrationPath = path.join(repositoryRoot, 'bootstrap', 'sources', 'fixture', 'supabase', 'migrations', '001_fixture.sql');
      fs.mkdirSync(path.dirname(migrationPath), { recursive: true });
      try {
        fs.symlinkSync(outsideFile, migrationPath, 'file');
      } catch (error) {
        if (process.platform === 'win32' && ['EPERM', 'EACCES', 'UNKNOWN'].includes(error?.code)) {
          context.skip('Windows file-link creation is unavailable on this host');
          return;
        }
        throw error;
      }
      assertImmutableSourceFailureBeforeWrite(repositoryRoot, [], /link-like|physical containment mismatch/);
    } finally {
      fs.rmSync(outsideDirectory, { recursive: true, force: true });
    }
  });
});

test('immutable source directory junctions and reparse paths fail before any publication write', () => {
  withTemporaryDirectory((repositoryRoot) => {
    fs.mkdirSync(path.join(repositoryRoot, 'supabase', 'migrations'), { recursive: true });
    const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fawxzzy-platform-source-junction-'));
    try {
      const sourceParent = path.join(repositoryRoot, 'bootstrap', 'sources', 'fixture', 'supabase');
      fs.mkdirSync(sourceParent, { recursive: true });
      fs.writeFileSync(path.join(outsideDirectory, '001_fixture.sql'), 'select 1;\n', 'utf8');
      createDirectoryLink(outsideDirectory, path.join(sourceParent, 'migrations'));
      assertImmutableSourceFailureBeforeWrite(repositoryRoot, [], /link-like|physical containment mismatch/);
    } finally {
      fs.rmSync(outsideDirectory, { recursive: true, force: true });
    }
  });
});

test('multiply-linked immutable source files fail before any publication write', () => {
  withTemporaryDirectory((repositoryRoot) => {
    fs.mkdirSync(path.join(repositoryRoot, 'supabase', 'migrations'), { recursive: true });
    const fixture = createImmutableSourceFixture(repositoryRoot);
    fs.linkSync(fixture.absolutePath, path.join(repositoryRoot, 'source-alias.sql'));
    assertImmutableSourceFailureBeforeWrite(repositoryRoot, [fixture.migration], /unexpected link count|multiply-linked/);
  });
});

test('immutable source byte drift from the generated manifest fails before any publication write', () => {
  withTemporaryDirectory((repositoryRoot) => {
    fs.mkdirSync(path.join(repositoryRoot, 'supabase', 'migrations'), { recursive: true });
    const fixture = createImmutableSourceFixture(repositoryRoot);
    const staleMigration = { ...fixture.migration, raw_sha256: '0'.repeat(64) };
    assertImmutableSourceFailureBeforeWrite(repositoryRoot, [staleMigration], /do not match the generated source migration manifest/);
  });
});

test('a missing immutable source root with accepted migrations fails before any publication write', () => {
  withTemporaryDirectory((repositoryRoot) => {
    fs.mkdirSync(path.join(repositoryRoot, 'supabase', 'migrations'), { recursive: true });
    const acceptedMigration = {
      copied_path: 'bootstrap/sources/fixture/supabase/migrations/001_fixture.sql',
      byte_count: 10,
      raw_sha256: '0'.repeat(64)
    };
    assert.equal(validateImmutableSourceTree(repositoryRoot).root_present, false);
    assertImmutableSourceFailureBeforeWrite(
      repositoryRoot,
      [acceptedMigration],
      /immutable source root is missing for the accepted source migration manifest/
    );
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

test('physical identity comparison preserves distinct 64-bit filesystem identifiers', () => {
  withTemporaryDirectory((repositoryRoot) => {
    assertOutsideRepository(repositoryRoot);
    const manifests = path.join(repositoryRoot, ...generatedManifestContractV1.directory.split('/'));
    const manifest = path.join(manifests, generatedManifestContractV1.filenames[0]);
    fs.mkdirSync(manifests, { recursive: true });
    fs.writeFileSync(manifest, 'sentinel\n', 'utf8');
    assert.notEqual(fs.realpathSync.native(manifests), fs.realpathSync.native(manifest));

    const originalStat = fs.statSync;
    const simulatedDevice = 9223372036854775807n;
    const simulatedInodes = new Map([
      [path.resolve(manifests), 9007199254740992n],
      [path.resolve(manifest), 9007199254740993n]
    ]);
    assert.equal(Number(simulatedInodes.get(path.resolve(manifests))), Number(simulatedInodes.get(path.resolve(manifest))));
    fs.statSync = (candidate, options, ...args) => {
      const stats = originalStat(candidate, options, ...args);
      const simulatedInode = simulatedInodes.get(path.resolve(candidate));
      if (simulatedInode === undefined) return stats;
      const bigint = options?.bigint === true;
      return new Proxy(stats, {
        get(target, property) {
          if (property === 'dev') return bigint ? simulatedDevice : Number(simulatedDevice);
          if (property === 'ino') return bigint ? simulatedInode : Number(simulatedInode);
          const value = Reflect.get(target, property, target);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
    };
    try {
      assert.doesNotThrow(() => validateGeneratedInertArtifactLayout(repositoryRoot));
    } finally {
      fs.statSync = originalStat;
    }
  });
});

test('direct inert-output identity comparison preserves exact device and inode values', () => {
  const cases = [
    {
      name: 'adjacent large inodes that collide as Number',
      output: { device: 9223372036854775807n, inode: 9007199254740992n },
      migrations: { device: 9223372036854775807n, inode: 9007199254740993n },
      aliases: false,
      numberCollision: true
    },
    {
      name: 'equal large device and inode',
      output: { device: 9223372036854775807n, inode: 9007199254740993n },
      migrations: { device: 9223372036854775807n, inode: 9007199254740993n },
      aliases: true
    },
    {
      name: 'same large device and different inode',
      output: { device: 9223372036854775807n, inode: 9007199254740993n },
      migrations: { device: 9223372036854775807n, inode: 9007199254740995n },
      aliases: false
    },
    {
      name: 'different large device and same inode',
      output: { device: 9223372036854775806n, inode: 9007199254740993n },
      migrations: { device: 9223372036854775807n, inode: 9007199254740993n },
      aliases: false
    },
    {
      name: 'normal small distinct identities',
      output: { device: 7n, inode: 11n },
      migrations: { device: 7n, inode: 12n },
      aliases: false
    },
    {
      name: 'normal small equal identities',
      output: { device: 7n, inode: 11n },
      migrations: { device: 7n, inode: 11n },
      aliases: true
    }
  ];

  for (const fixture of cases) {
    withTemporaryDirectory((repositoryRoot) => {
      assertOutsideRepository(repositoryRoot);
      const output = outputPath(repositoryRoot);
      const standardMigrations = path.join(repositoryRoot, 'supabase', 'migrations');
      fs.mkdirSync(output, { recursive: true });
      fs.mkdirSync(standardMigrations, { recursive: true });

      const simulated = new Map([
        [path.resolve(output), fixture.output],
        [path.resolve(standardMigrations), fixture.migrations]
      ]);
      if (fixture.numberCollision) {
        assert.equal(Number(fixture.output.inode), Number(fixture.migrations.inode));
        assert.notEqual(fixture.output.inode, fixture.migrations.inode);
      }

      const originalStat = fs.statSync;
      const observed = [];
      fs.statSync = (candidate, options, ...args) => {
        const stats = originalStat(candidate, options, ...args);
        const identity = simulated.get(path.resolve(candidate));
        if (!identity) return stats;
        observed.push({ path: path.resolve(candidate), options });
        const bigint = options?.bigint === true;
        return new Proxy(stats, {
          get(target, property) {
            if (property === 'dev') return bigint ? identity.device : Number(identity.device);
            if (property === 'ino') return bigint ? identity.inode : Number(identity.inode);
            const value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
          }
        });
      };
      try {
        const validate = () => validateGeneratedInertArtifactLayout(repositoryRoot);
        if (fixture.aliases) {
          assert.throws(validate, /physically alias standard Supabase migration discovery/, fixture.name);
        } else {
          assert.doesNotThrow(validate, fixture.name);
        }
        assert.ok(observed.some((entry) => entry.path === path.resolve(output)), `${fixture.name}: output identity was not read`);
        assert.ok(observed.some((entry) => entry.path === path.resolve(standardMigrations)), `${fixture.name}: migrations identity was not read`);
        assert.ok(observed.every((entry) => entry.options?.bigint === true), `${fixture.name}: identity read did not request bigint stats`);
      } finally {
        fs.statSync = originalStat;
      }
    });
  }
});

test('complete discovery rejects a late undeclared output before rewriting manifests', () => {
  withTemporaryDirectory((repositoryRoot) => {
    assertOutsideRepository(repositoryRoot);
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
      '/workspace/repository/bootstrap/manifests',
      '/workspace/repository/bootstrap/artifacts/inert-sql',
      '/workspace/repository/supabase/migrations'
    ], normalMountInfo),
    { repositoryMountId: '24', plannedPathCount: 3 }
  );
});

test('Linux mountinfo fails closed on escaped binds, relevant nested mounts, aliases, and path escapes', () => {
  const escapedBind = `${normalMountInfo.trimEnd()}\n25 24 8:1 /source/repository /workspace/repository rw - ext4 /dev/root rw\n`;
  const nestedMount = `${normalMountInfo.trimEnd()}\n25 24 8:2 / /workspace/repository/bootstrap rw - tmpfs tmpfs rw\n`;
  const aliasMount = `${normalMountInfo.trimEnd()}\n25 24 8:2 / /workspace/repository rw - ext4 /dev/repository rw\n26 24 8:2 / /alias rw - ext4 /dev/repository rw\n`;
  const rootGovernanceAlias = `${normalMountInfo.trimEnd()}\n25 24 8:1 / /elsewhere rw - ext4 /dev/root rw\n`;
  assert.throws(() => validateLinuxMountLayout('/workspace/repository', ['/workspace/repository/bootstrap'], escapedBind), /bind\/subtree mount alias/);
  assert.throws(() => validateLinuxMountLayout('/workspace/repository', ['/workspace/repository/bootstrap'], nestedMount), /intersects a nested mount point/);
  assert.throws(() => validateLinuxMountLayout('/workspace/repository', ['/workspace/repository/bootstrap'], aliasMount), /alias of the repository mount/);
  assert.throws(() => validateLinuxMountLayout('/workspace/repository', ['/workspace/repository/bootstrap'], rootGovernanceAlias), /alias of the repository mount/);
  assert.throws(() => validateLinuxMountLayout('/workspace/repository', ['/workspace/outside'], normalMountInfo), /escaped the Linux repository mount/);
});

test('Linux root-governed source aliases fail closed without rejecting unrelated same-device roots', () => {
  const planned = [
    '/workspace/repository/bootstrap/sources',
    '/workspace/repository/bootstrap/manifests',
    '/workspace/repository/bootstrap/artifacts/inert-sql'
  ];
  const exactRepositoryBind = `${normalMountInfo.trimEnd()}\n25 24 8:1 /workspace/repository /alias rw - ext4 /dev/root rw\n`;
  const ancestorRepositoryBind = `${normalMountInfo.trimEnd()}\n25 24 8:1 /workspace /alias-workspace rw - ext4 /dev/root rw\n`;
  const plannedSubtreeBind = `${normalMountInfo.trimEnd()}\n25 24 8:1 /workspace/repository/bootstrap/sources/fitness /alias-fitness rw - ext4 /dev/root rw\n`;
  const encodedRepositoryBind = `${normalMountInfo.trimEnd()}\n25 24 8:1 \\057workspace\\057repository /encoded-alias rw - ext4 /dev/root rw\n`;
  const unrelatedSibling = `${normalMountInfo.trimEnd()}\n25 24 8:1 /workspace/other /alias-other rw - ext4 /dev/root rw\n`;
  const unrelatedNodeModules = `${normalMountInfo.trimEnd()}\n25 24 8:1 /workspace/repository/node_modules /alias-node-modules rw - ext4 /dev/root rw\n`;
  const differentDeviceRepositoryBind = `${normalMountInfo.trimEnd()}\n25 24 8:2 /workspace/repository /different-device-alias rw - ext4 /dev/other rw\n`;

  for (const mountInfo of [exactRepositoryBind, ancestorRepositoryBind, plannedSubtreeBind, encodedRepositoryBind]) {
    assert.throws(() => validateLinuxMountLayout('/workspace/repository', planned, mountInfo), /alias of the repository mount source/);
  }
  for (const mountInfo of [unrelatedSibling, unrelatedNodeModules, differentDeviceRepositoryBind]) {
    assert.equal(validateLinuxMountLayout('/workspace/repository', planned, mountInfo).repositoryMountId, '24');
  }
});

test('Linux nested and stacked mounts block only when they intersect planned paths', () => {
  const unrelatedNodeModules = `${normalMountInfo.trimEnd()}\n25 24 8:2 / /workspace/repository/node_modules rw - tmpfs tmpfs rw\n`;
  const unrelatedStack = `${unrelatedNodeModules.trimEnd()}\n26 24 8:3 / /workspace/repository/node_modules rw - tmpfs tmpfs rw\n`;
  const relevantChild = `${normalMountInfo.trimEnd()}\n25 24 8:2 / /workspace/repository/bootstrap/sources/fitness rw - tmpfs tmpfs rw\n`;
  const planned = [
    '/workspace/repository/bootstrap/sources',
    '/workspace/repository/bootstrap/manifests',
    '/workspace/repository/bootstrap/artifacts/inert-sql'
  ];
  assert.equal(validateLinuxMountLayout('/workspace/repository', planned, unrelatedNodeModules).repositoryMountId, '24');
  assert.equal(validateLinuxMountLayout('/workspace/repository', planned, unrelatedStack).repositoryMountId, '24');
  assert.throws(() => validateLinuxMountLayout('/workspace/repository', planned, relevantChild), /intersects a nested mount point/);
});

test('Linux mountinfo fails closed on malformed, duplicate, conflicting, or unreadable input', () => {
  assert.throws(() => parseLinuxMountInfo('malformed\n'), /malformed|invalid/);
  assert.throws(
    () => parseLinuxMountInfo(`${normalMountInfo.trimEnd()}\n25 24 8:1 /workspace/../workspace/repository /alias rw - ext4 /dev/root rw\n`),
    /ambiguous/
  );
  assert.throws(
    () => validateLinuxMountLayout('/workspace//repository', ['/workspace/repository/bootstrap'], normalMountInfo),
    /ambiguous/
  );
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

test('Linux mount drift after validation fails before publication writes', { skip: process.platform !== 'linux' }, () => {
  withTemporaryDirectory((repositoryRoot) => {
    const driftedMountInfo = `${normalMountInfo.trimEnd()}\n25 24 8:1 ${repositoryRoot} /alias rw - ext4 /dev/root rw\n`;
    const originalWrite = fs.writeFileSync;
    let mountInfoReads = 0;
    let writeCount = 0;
    fs.writeFileSync = (...args) => {
      writeCount += 1;
      return originalWrite(...args);
    };
    try {
      assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot, {
        platform: 'linux',
        mountInfoReader() {
          mountInfoReads += 1;
          return mountInfoReads < 3 ? normalMountInfo : driftedMountInfo;
        }
      }), /alias of the repository mount source/);
    } finally {
      fs.writeFileSync = originalWrite;
    }
    assert.equal(mountInfoReads, 3);
    assert.equal(writeCount, 0);
    assertDirectoryEmpty(path.join(repositoryRoot, ...generatedManifestContractV1.directory.split('/')));
    assertDirectoryEmpty(outputPath(repositoryRoot));
  });
});

test('case-folded repository aliases and post-validation path drift fail closed', { skip: process.platform !== 'win32' }, () => {
  withTemporaryDirectory((repositoryRoot) => {
    const caseAlias = repositoryRoot.toUpperCase();
    assert.notEqual(caseAlias, repositoryRoot);
    assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), caseAlias), /physical alias or link-like ancestor/);
  });

  withTemporaryDirectory((repositoryRoot) => {
    const movedOutput = path.join(repositoryRoot, 'moved-output');
    assert.throws(() => writeFixtureArtifacts(fixtureGeneratedFiles(), repositoryRoot, {
      beforePublication(layout) {
        fs.renameSync(layout.output, movedOutput);
        createDirectoryLink(movedOutput, layout.output);
      }
    }), /link-like|identity drifted/);
    assertDirectoryEmpty(movedOutput);
  });
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
    '00000000000001_mazer_schema_inert.sql': 'fbea0ff8306f0a0f2f577fa0c259649329a183644673ab1a3bc282e081755313',
    '00000000000003_discordos_schema_inert.sql': '5b2783d8f6a78a2a9898c94559b31c168dcb1b5deebc1546365c1c8f09ade79f',
    '00000000000004_platform_security_overlay_inert.sql': 'f3cf571b37a6aa756c72ec398fa0f24f26b3d93bff2a768a318ceb87aa9ece64'
  };
  for (const [filename, digest] of Object.entries(expected)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(`${inertArtifactDirectory}/${filename}`)).digest('hex');
    assert.equal(actual, digest, filename);
  }
});

test('platform security overlay consumes the closed v1.1.0 human-service relation denominator', () => {
  const overlay = fs.readFileSync(`${inertArtifactDirectory}/00000000000004_platform_security_overlay_inert.sql`, 'utf8');
  for (const relation of [
    'platform_shared.global_profiles',
    'platform_shared.user_service_memberships',
    'fitness.profiles',
    'fitness.user_entitlements',
    'mazer.mazer_profiles'
  ]) {
    assert.match(overlay, new RegExp(`^-- ${relation.replace('.', '\\.') } RLS=true FORCE_RLS=true`, 'm'));
  }
  for (const forbiddenRelation of ['discordos.user_profiles', 'discordos.entitlements', 'mazer.entitlements', 'fitness.user_profiles']) {
    assert.doesNotMatch(overlay, new RegExp(`^-- ${forbiddenRelation.replace('.', '\\.') } RLS=true`, 'm'));
  }
  assert.match(overlay, /^-- APPLY_ADMITTED=false$/m);
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
