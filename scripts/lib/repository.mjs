import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { repositoryRoot } from './contracts.mjs';

const rootLocalExcludedDirectories = new Set(['.git', 'node_modules', 'outputs', 'work']);
const allowedRootFiles = new Set([
  '.gitattributes',
  '.gitignore',
  'AGENTS.md',
  'LICENSE',
  'README.md',
  'package-lock.json',
  'package.json'
]);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

export function listWorkingTreeFiles(directory = repositoryRoot, prefix = '') {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
    if (prefix === '' && rootLocalExcludedDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listWorkingTreeFiles(absolutePath, relativePath));
    } else if (entry.isFile()) {
      files.push(toPosix(relativePath));
    }
  }
  return files;
}

export function listTrackedFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    windowsHide: true
  });
  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${(result.stderr || 'unknown error').trim()}`);
  }
  return result.stdout.split('\0').filter(Boolean).map(toPosix).sort((left, right) => left.localeCompare(right));
}

export function listRepositoryFiles() {
  return [...new Set([...listTrackedFiles(), ...listWorkingTreeFiles()])].sort((left, right) => left.localeCompare(right));
}

function allowedPath(relativePath) {
  if (/(^|\/)(?:work|outputs)(?:\/|$)/.test(relativePath)) return false;
  return allowedRootFiles.has(relativePath)
    || /^\.github\/workflows\/[a-z0-9-]+\.yml$/.test(relativePath)
    || /^bootstrap\/(?:generator\/config\.v1\.json|manifests\/[a-z0-9-]+\.v1\.json)$/.test(relativePath)
    || /^bootstrap\/sources\/(?:discordos|fitness|mazer)\/supabase\/migrations\/[A-Za-z0-9_.-]+\.sql$/.test(relativePath)
    || /^contracts\/v1\/[a-z0-9_./-]+\.json$/.test(relativePath)
    || /^docs\/(adr|runbooks)\/[a-z0-9-]+\.md$/.test(relativePath)
    || /^scripts\/[a-z0-9_./-]+\.mjs$/.test(relativePath)
    || /^supabase\/migrations\/0000000000000[1-4]_[a-z0-9_]+\.sql$/.test(relativePath)
    || /^test\/[a-z0-9_./-]+\.test\.mjs$/.test(relativePath);
}

const secretPatterns = [
  ['Supabase secret key', new RegExp(`sb_${'secret'}_[A-Za-z0-9_-]{12,}`)],
  ['GitHub token', new RegExp(`gh${'[pousr]'}_[A-Za-z0-9]{20,}`)],
  ['AWS access key', new RegExp(`AK${'IA'}[A-Z0-9]{16}`)],
  ['private key', new RegExp(`-----BEGIN ${'PRIVATE'} KEY-----`)],
  ['database connection string', /(?:postgres|postgresql):\/\/[^\s"']+/i],
  ['JWT-shaped credential', new RegExp(`eyJ[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{10,}`)]
];

const machinePathPatterns = [
  /\b[A-Za-z]:(?:\\{1,2}|\/)(?:Users|ATLAS)\b/,
  /\/(?:Users|home)\/[A-Za-z0-9._-]+\//
];

export function inspectContent(relativePath, content) {
  const failures = [];
  if (content.includes('\r')) failures.push(`${relativePath}: CR or CRLF line ending detected`);
  for (const [name, pattern] of secretPatterns) {
    if (pattern.test(content)) failures.push(`${relativePath}: ${name} detected`);
  }
  for (const pattern of machinePathPatterns) {
    if (pattern.test(content)) failures.push(`${relativePath}: machine-specific absolute path detected`);
  }
  return failures;
}

export function validateRepositoryEntries(entries) {
  const failures = [];

  for (const { relativePath, content } of entries) {
    if (!allowedPath(relativePath)) failures.push(`${relativePath}: path is outside the repository allowlist`);
    if (relativePath.endsWith('.sql')
      && !/^bootstrap\/sources\/(?:discordos|fitness|mazer)\/supabase\/migrations\/[A-Za-z0-9_.-]+\.sql$/.test(relativePath)
      && !/^supabase\/migrations\/0000000000000[1-4]_[a-z0-9_]+\.sql$/.test(relativePath)) {
      failures.push(`${relativePath}: SQL is outside the inert bootstrap boundary`);
    }
    if (/(^|\/)\.env(?:\.|$)/.test(relativePath)) failures.push(`${relativePath}: environment files are forbidden`);

    failures.push(...inspectContent(relativePath, content));

    if (relativePath.endsWith('.json')) {
      try {
        const parsed = JSON.parse(content);
        const canonical = `${JSON.stringify(parsed, null, 2)}\n`;
        if (content !== canonical) failures.push(`${relativePath}: JSON is not canonical two-space formatting with one final newline`);
      } catch (error) {
        failures.push(`${relativePath}: invalid JSON (${error.message})`);
      }
    }
  }

  return failures.sort((left, right) => left.localeCompare(right));
}

export function validateRepository() {
  const files = listRepositoryFiles();
  const failures = [];
  const entries = [];

  for (const relativePath of files) {
    const absolutePath = path.join(repositoryRoot, ...relativePath.split('/'));
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      failures.push(`${relativePath}: tracked file is missing from the working tree`);
      continue;
    }
    entries.push({ relativePath, content: fs.readFileSync(absolutePath, 'utf8') });
  }

  failures.push(...validateRepositoryEntries(entries));

  return {
    ok: failures.length === 0,
    file_count: files.length,
    checks: ['path_allowlist', 'lf', 'json', 'secret_scan', 'machine_path_scan', 'sql_path_boundary'],
    failures: failures.sort((left, right) => left.localeCompare(right))
  };
}
