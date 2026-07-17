import fs from 'node:fs';
import path from 'node:path';
import { repositoryRoot } from './contracts.mjs';

const excludedDirectories = new Set(['.git', 'node_modules', 'outputs', 'work']);
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

export function listRepositoryFiles(directory = repositoryRoot, prefix = '') {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listRepositoryFiles(absolutePath, relativePath));
    } else if (entry.isFile()) {
      files.push(toPosix(relativePath));
    }
  }
  return files;
}

function allowedPath(relativePath) {
  return allowedRootFiles.has(relativePath)
    || /^\.github\/workflows\/[a-z0-9-]+\.yml$/.test(relativePath)
    || /^contracts\/v1\/[a-z0-9_./-]+\.json$/.test(relativePath)
    || /^docs\/(adr|runbooks)\/[a-z0-9-]+\.md$/.test(relativePath)
    || /^scripts\/[a-z0-9_./-]+\.mjs$/.test(relativePath)
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
  /\b[A-Za-z]:[\\/](?:Users|ATLAS)\b/,
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

export function validateRepository() {
  const files = listRepositoryFiles();
  const failures = [];

  for (const relativePath of files) {
    if (!allowedPath(relativePath)) failures.push(`${relativePath}: path is outside the repository allowlist`);
    if (relativePath.endsWith('.sql')) failures.push(`${relativePath}: executable SQL is forbidden in this packet`);
    if (/(^|\/)\.env(?:\.|$)/.test(relativePath)) failures.push(`${relativePath}: environment files are forbidden`);

    const absolutePath = path.join(repositoryRoot, ...relativePath.split('/'));
    const content = fs.readFileSync(absolutePath, 'utf8');
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

  return {
    ok: failures.length === 0,
    file_count: files.length,
    checks: ['path_allowlist', 'lf', 'json', 'secret_scan', 'machine_path_scan', 'no_sql'],
    failures: failures.sort((left, right) => left.localeCompare(right))
  };
}
