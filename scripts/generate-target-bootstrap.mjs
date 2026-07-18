import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(scriptDirectory, '..');
const configPath = path.join(root, 'bootstrap', 'generator', 'config.v1.json');
const manifestsDirectory = path.join(root, 'bootstrap', 'manifests');
const outputDirectory = path.join(root, 'supabase', 'migrations');

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function gitBlobSha1(bytes) {
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

export function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function dollarTagAt(sql, index) {
  const match = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(index));
  return match?.[0] ?? null;
}

export function splitSqlStatements(sql) {
  const statements = [];
  let start = 0;
  let state = 'plain';
  let blockDepth = 0;
  let dollarTag = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];
    if (state === 'single') {
      if (char === "'" && next === "'") index += 1;
      else if (char === "'") state = 'plain';
      continue;
    }
    if (state === 'double') {
      if (char === '"' && next === '"') index += 1;
      else if (char === '"') state = 'plain';
      continue;
    }
    if (state === 'line-comment') {
      if (char === '\n') state = 'plain';
      continue;
    }
    if (state === 'block-comment') {
      if (char === '/' && next === '*') {
        blockDepth += 1;
        index += 1;
      } else if (char === '*' && next === '/') {
        blockDepth -= 1;
        index += 1;
        if (blockDepth === 0) state = 'plain';
      }
      continue;
    }
    if (state === 'dollar') {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        state = 'plain';
        dollarTag = null;
      }
      continue;
    }
    if (char === "'") state = 'single';
    else if (char === '"') state = 'double';
    else if (char === '-' && next === '-') {
      state = 'line-comment';
      index += 1;
    } else if (char === '/' && next === '*') {
      state = 'block-comment';
      blockDepth = 1;
      index += 1;
    } else if (char === '$') {
      const tag = dollarTagAt(sql, index);
      if (tag) {
        state = 'dollar';
        dollarTag = tag;
        index += tag.length - 1;
      }
    } else if (char === ';') {
      const text = sql.slice(start, index + 1).trim();
      if (text) statements.push(text);
      start = index + 1;
    }
  }

  const tail = sql.slice(start).trim();
  if (tail) statements.push(tail);
  if (state === 'single' || state === 'double' || state === 'block-comment' || state === 'dollar') {
    throw new Error(`unterminated SQL lexical state: ${state}`);
  }
  return statements;
}

function withoutLeadingComments(statement) {
  return statement.replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/, '').trim();
}

function maskSqlStringsAndComments(sql) {
  let output = '';
  let state = 'plain';
  let blockDepth = 0;
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];
    if (state === 'single') {
      if (char === "'" && next === "'") {
        output += '  ';
        index += 1;
      } else if (char === "'") {
        output += ' ';
        state = 'plain';
      } else output += char === '\n' ? '\n' : ' ';
      continue;
    }
    if (state === 'line-comment') {
      if (char === '\n') {
        output += '\n';
        state = 'plain';
      } else output += ' ';
      continue;
    }
    if (state === 'block-comment') {
      if (char === '/' && next === '*') {
        output += '  ';
        blockDepth += 1;
        index += 1;
      } else if (char === '*' && next === '/') {
        output += '  ';
        blockDepth -= 1;
        index += 1;
        if (blockDepth === 0) state = 'plain';
      } else output += char === '\n' ? '\n' : ' ';
      continue;
    }
    if (char === "'") {
      output += ' ';
      state = 'single';
    } else if (char === '-' && next === '-') {
      output += '  ';
      state = 'line-comment';
      index += 1;
    } else if (char === '/' && next === '*') {
      output += '  ';
      state = 'block-comment';
      blockDepth = 1;
      index += 1;
    } else output += char;
  }
  return output;
}

export function classifyStatement(statement) {
  const clean = withoutLeadingComments(statement);
  const lower = clean.toLowerCase();
  const dataEffect = /^(?:insert|update|delete|merge|truncate|copy)\b/.test(lower)
    || (/^with\b/.test(lower) && /\b(?:insert\s+into|update|delete\s+from|merge\s+into)\b/.test(lower));
  const dynamicIdentity = /^(?:do\b|create(?:\s+or\s+replace)?\s+function\b)/.test(lower)
    && /\bexecute\s+(?:format\s*\(|['"])/.test(lower);
  const extensionDependency = /^create\s+extension\b/.test(lower);
  const cronActivation = /\bcron\.schedule\s*\(/.test(lower);
  const networkEffect = /\bnet\.http_(?:get|post|delete)\s*\(/.test(lower);
  const securityDefiner = /\bsecurity\s+definer\b/.test(lower);
  return { clean, dataEffect, dynamicIdentity, extensionDependency, cronActivation, networkEffect, securityDefiner };
}

export function simulateCatalog(statements) {
  const catalog = {
    tables: new Set(),
    functions: new Set(),
    policies: new Set(),
    triggers: new Set(),
    indexes: new Set()
  };
  const name = '(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)';
  const qualified = `${name}(?:\\.${name})?`;
  const normalize = (value) => value.replaceAll('"', '').toLowerCase();
  for (const statement of statements) {
    const sql = maskSqlStringsAndComments(statement);
    let match;
    if ((match = new RegExp(`\\bcreate\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(${qualified})`, 'i').exec(sql))) catalog.tables.add(normalize(match[1]));
    if ((match = new RegExp(`\\bdrop\\s+table\\s+(?:if\\s+exists\\s+)?(${qualified})`, 'i').exec(sql))) catalog.tables.delete(normalize(match[1]));
    if ((match = new RegExp(`\\bcreate\\s+(?:or\\s+replace\\s+)?function\\s+(${qualified})`, 'i').exec(sql))) catalog.functions.add(normalize(match[1]));
    if ((match = new RegExp(`\\bdrop\\s+function\\s+(?:if\\s+exists\\s+)?(${qualified})`, 'i').exec(sql))) catalog.functions.delete(normalize(match[1]));
    if ((match = new RegExp(`\\bcreate\\s+(?:unique\\s+)?index\\s+(?:if\\s+not\\s+exists\\s+)?(${qualified})`, 'i').exec(sql))) catalog.indexes.add(normalize(match[1]));
    if ((match = new RegExp(`\\bdrop\\s+index\\s+(?:if\\s+exists\\s+)?(${qualified})`, 'i').exec(sql))) catalog.indexes.delete(normalize(match[1]));
    if ((match = new RegExp(`\\bcreate\\s+policy\\s+(${name})\\s+on\\s+(${qualified})`, 'i').exec(sql))) catalog.policies.add(`${normalize(match[2])}::${normalize(match[1])}`);
    if ((match = new RegExp(`\\bdrop\\s+policy\\s+(?:if\\s+exists\\s+)?(${name})\\s+on\\s+(${qualified})`, 'i').exec(sql))) catalog.policies.delete(`${normalize(match[2])}::${normalize(match[1])}`);
    if ((match = new RegExp(`\\bcreate\\s+trigger\\s+(${name})[\\s\\S]*?\\bon\\s+(${qualified})`, 'i').exec(sql))) catalog.triggers.add(`${normalize(match[2])}::${normalize(match[1])}`);
    if ((match = new RegExp(`\\bdrop\\s+trigger\\s+(?:if\\s+exists\\s+)?(${name})\\s+on\\s+(${qualified})`, 'i').exec(sql))) catalog.triggers.delete(`${normalize(match[2])}::${normalize(match[1])}`);
  }
  return Object.fromEntries(Object.entries(catalog).map(([key, values]) => [key, [...values].sort()]));
}

function normalizeQualifiedName(value, fallbackSchema = 'public') {
  const pieces = value.split('.').map((piece) => quotedName(piece.trim()).toLowerCase());
  return pieces.length === 1 ? `${fallbackSchema}.${pieces[0]}` : `${pieces[0]}.${pieces[1]}`;
}

function findClosingParenthesis(text, openIndex) {
  const masked = maskSqlStringsAndComments(text);
  let depth = 0;
  for (let index = openIndex; index < masked.length; index += 1) {
    if (masked[index] === '(') depth += 1;
    else if (masked[index] === ')') {
      depth -= 1;
      if (depth === 0) return index;
      if (depth < 0) break;
    }
  }
  throw new Error('function signature: unmatched argument parenthesis');
}

function splitTopLevelArguments(text) {
  if (text.trim() === '') return [];
  const masked = maskSqlStringsAndComments(text);
  const values = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < masked.length; index += 1) {
    if (masked[index] === '(' || masked[index] === '[') depth += 1;
    else if (masked[index] === ')' || masked[index] === ']') depth -= 1;
    else if (masked[index] === ',' && depth === 0) {
      values.push(text.slice(start, index).trim());
      start = index + 1;
    }
    if (depth < 0) throw new Error('function signature: unmatched argument delimiter');
  }
  if (depth !== 0) throw new Error('function signature: unmatched argument delimiter');
  values.push(text.slice(start).trim());
  if (values.some((value) => value === '')) throw new Error('function signature: empty argument');
  return values;
}

function stripArgumentDefault(argument) {
  const masked = maskSqlStringsAndComments(argument);
  let depth = 0;
  for (let index = 0; index < masked.length; index += 1) {
    if (masked[index] === '(' || masked[index] === '[') depth += 1;
    else if (masked[index] === ')' || masked[index] === ']') depth -= 1;
    if (depth !== 0) continue;
    if (masked[index] === '=') return argument.slice(0, index).trim();
    if (/^default\b/i.test(masked.slice(index)) && (index === 0 || /\s/.test(masked[index - 1]))) {
      return argument.slice(0, index).trim();
    }
  }
  return argument.trim();
}

function canonicalFunctionArgumentType(argument) {
  let declaration = stripArgumentDefault(argument);
  if (/^(?:out|inout|variadic)\b/i.test(declaration)) {
    throw new Error(`function signature: unsupported argument mode in ${declaration}`);
  }
  declaration = declaration.replace(/^in\s+/i, '').trim();
  const name = namePattern();
  const qualified = `${name}(?:\\s*\\.\\s*${name})?`;
  const multiword = '(?:double\\s+precision|character\\s+varying|bit\\s+varying|timestamp\\s+(?:with|without)\\s+time\\s+zone|time\\s+(?:with|without)\\s+time\\s+zone)';
  const type = `(?:${multiword}|${qualified})(?:\\s*\\(\\s*\\d+(?:\\s*,\\s*\\d+)?\\s*\\))?(?:\\s*\\[\\s*\\])*`;
  const direct = new RegExp(`^(${type})$`, 'i').exec(declaration);
  const named = new RegExp(`^${name}\\s+(${type})$`, 'i').exec(declaration);
  const matched = direct ?? named;
  if (!matched) throw new Error(`function signature: ambiguous argument ${declaration}`);
  return matched[1]
    .replaceAll('"', '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\.\s*/g, '.')
    .replace(/\s*\[\s*\]/g, '[]')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*\)/g, ')');
}

function parseFunctionArguments(text, openIndex) {
  const closeIndex = findClosingParenthesis(text, openIndex);
  const argumentTypes = splitTopLevelArguments(text.slice(openIndex + 1, closeIndex))
    .map(canonicalFunctionArgumentType);
  return { argumentTypes, closeIndex };
}

export function parseFunctionDefinition(statement, fallbackSchema = 'public') {
  const name = namePattern();
  const qualified = `${name}(?:\\s*\\.\\s*${name})?`;
  const clean = withoutLeadingComments(statement);
  const match = new RegExp(`^create\\s+(?:or\\s+replace\\s+)?function\\s+(${qualified})\\s*\\(`, 'i').exec(clean);
  if (!match) return null;
  const identity = normalizeQualifiedName(match[1], fallbackSchema);
  const { argumentTypes } = parseFunctionArguments(clean, match[0].lastIndexOf('('));
  return {
    identity,
    signature: `${identity}(${argumentTypes.join(', ')})`,
    argument_types: argumentTypes,
    or_replace: /^create\s+or\s+replace\s+function\b/i.test(clean)
  };
}

export function parseFunctionPrivilegeStatement(statement, fallbackSchema = 'public') {
  const clean = withoutLeadingComments(statement).trim().replace(/;\s*$/, '');
  if (!/^(?:grant|revoke)\s+execute\s+on\s+function\b/i.test(clean)) return null;
  const name = namePattern();
  const qualified = `${name}(?:\\s*\\.\\s*${name})?`;
  const match = new RegExp(`^(grant|revoke)\\s+execute\\s+on\\s+function\\s+(${qualified})\\s*\\(`, 'i').exec(clean);
  if (!match) return { malformed: true };
  try {
    const identity = normalizeQualifiedName(match[2], fallbackSchema);
    const { argumentTypes, closeIndex } = parseFunctionArguments(clean, match[0].lastIndexOf('('));
    const action = match[1].toLowerCase();
    const keyword = action === 'grant' ? 'to' : 'from';
    const roleMatch = new RegExp(`^${keyword}\\s+(.+)$`, 'i').exec(clean.slice(closeIndex + 1).trim());
    if (!roleMatch) return { malformed: true };
    const role = namePattern();
    const roles = roleMatch[1].split(',').map((value) => value.trim());
    if (roles.length === 0 || roles.some((value) => !new RegExp(`^${role}$`).test(value))) return { malformed: true };
    const normalizedRoles = roles.map((value) => quotedName(value).toLowerCase()).sort();
    return {
      malformed: false,
      action,
      identity,
      signature: `${identity}(${argumentTypes.join(', ')})`,
      argument_types: argumentTypes,
      roles: normalizedRoles
    };
  } catch {
    return { malformed: true };
  }
}

export function analyzeFunctionDependencyStatement(statement, fallbackSchema = 'public') {
  const name = namePattern();
  const qualified = `${name}(?:\\s*\\.\\s*${name})?`;
  const masked = maskSqlStringsAndComments(statement);
  const references = new Set();
  const expression = new RegExp(`\\b(?:on\\s+function|execute\\s+(?:function|procedure)|alter\\s+function|drop\\s+function)\\s+(?:if\\s+exists\\s+)?(${qualified})\\s*\\(`, 'gi');
  for (const match of masked.matchAll(expression)) references.add(normalizeQualifiedName(match[1], fallbackSchema));
  const hasDependencySyntax = /\b(?:on\s+function|execute\s+(?:function|procedure)|alter\s+function|drop\s+function)\b/i.test(masked);
  return {
    references: [...references].sort(),
    malformed: hasDependencySyntax && references.size === 0
  };
}

function functionIdentityForTarget(identity, app) {
  if (app === 'fitness' && identity.startsWith('public.')) return `fitness.${identity.slice('public.'.length)}`;
  if (app === 'mazer' && identity.startsWith('public.')) return `mazer.${identity.slice('public.'.length)}`;
  return identity;
}

function referencePattern(identity) {
  const [schema, name] = identity.split('.');
  const escapedSchema = schema.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:"?${escapedSchema}"?\\s*\\.\\s*"?${escapedName}"?|(?<![A-Za-z0-9_$".])"?${escapedName}"?)\\s*\\(`, 'i');
}

export function findHeldFunctionReferences(statement, heldFunctions, fallbackSchema = 'public') {
  const masked = maskSqlStringsAndComments(statement);
  const definition = parseFunctionDefinition(statement, fallbackSchema);
  return heldFunctions.filter((identity) => {
    if (definition?.identity === identity) return true;
    return referencePattern(identity).test(masked);
  }).sort();
}

function relativeSourcePath(app, filename) {
  return `bootstrap/sources/${app}/supabase/migrations/${filename}`;
}

function readSourceRecords(config) {
  const records = [];
  for (const source of config.sources) {
    const directory = path.join(root, 'bootstrap', 'sources', source.app, 'supabase', 'migrations');
    const filenames = fs.readdirSync(directory).filter((name) => name.endsWith('.sql')).sort();
    if (filenames.length !== source.migration_count) {
      throw new Error(`${source.app}: expected ${source.migration_count} migrations, found ${filenames.length}`);
    }
    filenames.forEach((filename, index) => {
      const absolutePath = path.join(directory, filename);
      const bytes = fs.readFileSync(absolutePath);
      const text = bytes.toString('utf8');
      if (Buffer.from(text, 'utf8').compare(bytes) !== 0) throw new Error(`${filename}: invalid UTF-8`);
      records.push({
        app: source.app,
        commit: source.commit,
        tree: source.tree,
        order: index + 1,
        path: `supabase/migrations/${filename}`,
        copied_path: relativeSourcePath(source.app, filename),
        blob: gitBlobSha1(bytes),
        raw_sha256: sha256(bytes),
        byte_count: bytes.length,
        filename,
        text,
        statements: splitSqlStatements(text)
      });
    });
  }
  return records;
}

function provenance(record, statementOrdinal, transformationId, extra = {}) {
  return {
    source_app: record.app,
    source_commit: record.commit,
    source_path: record.path,
    source_blob: record.blob,
    source_raw_sha256: record.raw_sha256,
    statement_ordinal: statementOrdinal,
    transformation_id: transformationId,
    ...extra
  };
}

function quotedName(value) {
  return value.replace(/^"|"$/g, '').replace(/""/g, '"');
}

function namePattern() {
  return '(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)';
}

function canonicalRelation(value, fallbackSchema) {
  const pieces = value.split('.').map(quotedName);
  return pieces.length === 1 ? `${fallbackSchema}.${pieces[0]}` : `${pieces[0]}.${pieces[1]}`;
}

function extractObjects(records, config) {
  const tableSet = new Map();
  const functionSet = new Map();
  const policySet = new Map();
  const triggerSet = new Map();
  const indexSet = new Map();
  const extensionSet = new Map();
  const name = namePattern();
  const qualified = `${name}(?:\\.${name})?`;

  for (const record of records) {
    const fallbackSchema = record.app === 'discordos' ? 'discordos' : 'public';
    record.statements.forEach((statement, statementIndex) => {
      const ordinal = statementIndex + 1;
      const transformationId = `${record.app}:${record.filename}:${String(ordinal).padStart(4, '0')}`;
      const base = provenance(record, ordinal, transformationId);
      const tableMatches = statement.matchAll(new RegExp(`\\bcreate\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(${qualified})`, 'gi'));
      for (const match of tableMatches) {
        const identity = canonicalRelation(match[1], fallbackSchema);
        if (!tableSet.has(identity)) tableSet.set(identity, { identity, ...base });
      }
      const functionMatches = statement.matchAll(new RegExp(`\\bcreate\\s+(?:or\\s+replace\\s+)?function\\s+(${qualified})\\s*\\(`, 'gi'));
      for (const match of functionMatches) {
        const identity = canonicalRelation(match[1], fallbackSchema);
        functionSet.set(identity, { identity, ...base });
      }
      const dropFunctionMatches = statement.matchAll(new RegExp(`\\bdrop\\s+function\\s+(?:if\\s+exists\\s+)?(${qualified})`, 'gi'));
      for (const match of dropFunctionMatches) functionSet.delete(canonicalRelation(match[1], fallbackSchema));

      const dropPolicyMatches = statement.matchAll(new RegExp(`\\bdrop\\s+policy\\s+(?:if\\s+exists\\s+)?(${name})\\s+on\\s+(${qualified})`, 'gi'));
      for (const match of dropPolicyMatches) policySet.delete(`${canonicalRelation(match[2], fallbackSchema)}::${quotedName(match[1])}`);
      const policyMatches = statement.matchAll(new RegExp(`\\bcreate\\s+policy\\s+(${name})\\s+on\\s+(${qualified})`, 'gi'));
      for (const match of policyMatches) {
        const identity = `${canonicalRelation(match[2], fallbackSchema)}::${quotedName(match[1])}`;
        policySet.set(identity, { identity, ...base });
      }

      const dropTriggerMatches = statement.matchAll(new RegExp(`\\bdrop\\s+trigger\\s+(?:if\\s+exists\\s+)?(${name})\\s+on\\s+(${qualified})`, 'gi'));
      for (const match of dropTriggerMatches) triggerSet.delete(`${canonicalRelation(match[2], fallbackSchema)}::${quotedName(match[1])}`);
      const triggerMatches = statement.matchAll(new RegExp(`\\bcreate\\s+trigger\\s+(${name})[\\s\\S]*?\\bon\\s+(${qualified})`, 'gi'));
      for (const match of triggerMatches) {
        const identity = `${canonicalRelation(match[2], fallbackSchema)}::${quotedName(match[1])}`;
        triggerSet.set(identity, { identity, ...base });
      }

      const indexMatches = statement.matchAll(new RegExp(`\\bcreate\\s+(?:unique\\s+)?index\\s+(?:concurrently\\s+)?(?:if\\s+not\\s+exists\\s+)?(${qualified})\\s+on\\s+(${qualified})`, 'gi'));
      for (const match of indexMatches) {
        const relation = canonicalRelation(match[2], fallbackSchema);
        const indexName = canonicalRelation(match[1], relation.split('.')[0]);
        if (!indexSet.has(indexName)) indexSet.set(indexName, { identity: indexName, relation, ...base });
      }

      const extensionMatches = statement.matchAll(new RegExp(`\\bcreate\\s+extension\\s+(?:if\\s+not\\s+exists\\s+)?(${name})`, 'gi'));
      for (const match of extensionMatches) {
        const identity = quotedName(match[1]);
        if (!extensionSet.has(identity)) extensionSet.set(identity, { identity, ...base });
      }

    });
  }

  const denyTables = [
    'discord_feedback_reports',
    'discord_member_links',
    'discord_message_command_claims',
    'discord_moderation_cases',
    'discord_spotify_connections',
    'discord_spotify_lobbies',
    'discord_spotify_queue_items',
    'discord_spotify_room_members',
    'discord_update_drafts',
    'discord_verification_tokens'
  ];
  const policyRecord = records.find((record) => record.app === 'fitness' && record.filename === config.resolved_dynamic_policy_source.path);
  if (!policyRecord) throw new Error('resolved Fitness policy source missing');
  denyTables.forEach((table, index) => {
    const identity = `public.${table}::${table}_deny_public_api_access`;
    policySet.set(identity, {
      identity,
      ...provenance(policyRecord, 1, `fitness:resolved-deny-policy:${String(index + 1).padStart(2, '0')}`),
      resolved_dynamic_identity: true,
      predicate: 'using (false) with check (false)',
      roles: ['anon', 'authenticated']
    });
  });

  const constraintUnits = extractConstraintUnits(records);
  return {
    tables: [...tableSet.values()].sort(byIdentity),
    functions: [...functionSet.values()].sort(byIdentity),
    policies: [...policySet.values()].sort(byIdentity),
    triggers: [...triggerSet.values()].sort(byIdentity),
    index_identities: [...indexSet.values()].sort(byIdentity),
    constraint_units: constraintUnits,
    extension_dependencies: [...extensionSet.values()].sort(byIdentity)
  };
}

function extractConstraintUnits(records) {
  const named = new Map();
  const unnamed = [];
  const unnamedAlterCandidates = new Map([['discordos', []], ['fitness', []], ['mazer', []]]);
  const expectedNamed = { discordos: 12, fitness: 146, mazer: 0 };
  const expectedUnnamed = { discordos: 37, fitness: 55, mazer: 31 };
  const name = namePattern();
  const qualified = `${name}(?:\\.${name})?`;

  for (const record of records) {
    const fallbackSchema = record.app === 'discordos' ? 'discordos' : 'public';
    record.statements.forEach((statement, statementIndex) => {
      const ordinal = statementIndex + 1;
      const transformationId = `${record.app}:${record.filename}:${String(ordinal).padStart(4, '0')}`;
      const base = provenance(record, ordinal, transformationId);
      const masked = maskSqlStringsAndComments(statement);
      const clean = withoutLeadingComments(masked);
      const createMatch = new RegExp(`^create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(${qualified})`, 'i').exec(clean);
      if (createMatch) {
        const relation = canonicalRelation(createMatch[1], fallbackSchema);
        const namedPositions = [];
        for (const match of clean.matchAll(new RegExp(`\\bconstraint\\s+(${name})`, 'gi'))) {
          const identity = `${relation}::${quotedName(match[1])}`;
          named.set(identity, { identity, kind: 'named', declared_name: quotedName(match[1]), ...base });
          namedPositions.push(match.index);
        }
        const semantic = [...clean.matchAll(/\b(primary\s+key|references\s+(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)(?:\.(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*))?\s*\(|check\s*\(|unique\s*\()/gi)]
          .map((match) => ({ index: match.index, kind: match[1].toLowerCase().startsWith('primary') ? 'primary_key' : match[1].toLowerCase().startsWith('references') ? 'inline_reference' : match[1].toLowerCase().startsWith('check') ? 'check' : 'unique' }));
        const consumed = new Set();
        for (const position of namedPositions) {
          const candidate = semantic.findIndex((unit, index) => !consumed.has(index) && unit.index > position);
          if (candidate >= 0) consumed.add(candidate);
        }
        semantic.forEach((unit, index) => {
          if (consumed.has(index)) return;
          unnamed.push({
            identity: `${transformationId}:unnamed:${String(index + 1).padStart(3, '0')}`,
            kind: unit.kind,
            declared_name: null,
            identity_certainty: 'source_unit_until_replay_catalog_readback',
            ...base
          });
        });
      }

      const alterMatches = [...clean.matchAll(new RegExp(`\\balter\\s+table\\s+(?:if\\s+exists\\s+)?(${qualified})`, 'gi'))];
      alterMatches.forEach((alterMatch, alterIndex) => {
        const relation = canonicalRelation(alterMatch[1], fallbackSchema);
        const end = alterMatches[alterIndex + 1]?.index ?? clean.length;
        const segment = clean.slice(alterMatch.index + alterMatch[0].length, end);
        for (const constraintMatch of segment.matchAll(new RegExp(`\\b(add|drop)\\s+constraint\\s+(?:if\\s+exists\\s+)?(${name})`, 'gi'))) {
          const identity = `${relation}::${quotedName(constraintMatch[2])}`;
          if (constraintMatch[1].toLowerCase() === 'drop') named.delete(identity);
          else named.set(identity, { identity, kind: 'named', declared_name: quotedName(constraintMatch[2]), ...base });
        }
        if (!/\badd\s+constraint\b/i.test(segment)) {
          const candidates = [...segment.matchAll(/\b(primary\s+key|references\s+(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)(?:\.(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*))?\s*\(|check\s*\(|unique\s*\()/gi)];
          if (candidates.length > 0) unnamedAlterCandidates.get(record.app).push({ relation, base, candidates });
        }
      });

      if (record.app === 'fitness' && record.filename === '20260515150000_059_discord_feedback_reports.sql') {
        const listMatch = /conname\s+in\s*\(([\s\S]*?)\)/i.exec(statement);
        if (listMatch) {
          for (const match of listMatch[1].matchAll(/'([^']+)'/g)) {
            named.delete(`public.discord_feedback_reports::${match[1]}`);
            named.delete(`public.discord_bug_reports::${match[1]}`);
          }
        }
      }
    });
  }

  for (const app of ['discordos', 'fitness', 'mazer']) {
    const namedCount = [...named.values()].filter((unit) => unit.source_app === app).length;
    const appUnnamed = unnamed.filter((unit) => unit.source_app === app);
    const needed = expectedUnnamed[app] - appUnnamed.length;
    if (needed < 0) throw new Error(`${app}: unnamed constraint inventory exceeded accepted denominator`);
    const candidates = unnamedAlterCandidates.get(app);
    if (candidates.length < needed) throw new Error(`${app}: insufficient reconciled unnamed constraint provenance`);
    for (let index = 0; index < needed; index += 1) {
      const candidate = candidates[index];
      unnamed.push({
        identity: `${candidate.base.transformation_id}:unnamed-reconciled:${String(index + 1).padStart(3, '0')}`,
        kind: 'replay_catalog_constraint',
        declared_name: null,
        relation: candidate.relation,
        identity_certainty: 'accepted_denominator_replay_readback_required',
        ...candidate.base
      });
    }
  }

  const acceptedNamedCount = Object.values(expectedNamed).reduce((sum, count) => sum + count, 0);
  const acceptedUnnamedCount = Object.values(expectedUnnamed).reduce((sum, count) => sum + count, 0);
  return {
    status: 'BLOCKED',
    expected_count: acceptedNamedCount + acceptedUnnamedCount,
    accepted_named_catalog_count: acceptedNamedCount,
    accepted_unnamed_catalog_count: acceptedUnnamedCount,
    static_named_candidate_count: named.size,
    unresolved_named_candidate_delta: named.size - acceptedNamedCount,
    reason: 'Final individual constraint identities require the two contained replay catalog readbacks; the accepted denominator is frozen without guessing provider-generated identities.',
    static_named_candidates: [...named.values()].sort(byIdentity),
    accepted_unnamed_source_units: unnamed.sort(byIdentity)
  };
}

function byIdentity(left, right) {
  return left.identity.localeCompare(right.identity);
}

function buildDynamicUnits(records, config) {
  const units = [];
  for (const allowed of config.dynamic_allowlist) {
    const record = records.find((candidate) => candidate.app === allowed.app && candidate.filename === allowed.path);
    if (!record) throw new Error(`dynamic source missing: ${allowed.path}`);
    const candidates = record.statements
      .map((statement, index) => ({ statement, ordinal: index + 1 }))
      .filter(({ statement }) => classifyStatement(statement).dynamicIdentity);
    if (candidates.length !== allowed.templates) {
      throw new Error(`${allowed.path}: expected ${allowed.templates} dynamic templates, found ${candidates.length}`);
    }
    candidates.forEach(({ ordinal }, index) => units.push({
      id: `${allowed.app}:${allowed.path}:dynamic:${String(index + 1).padStart(2, '0')}`,
      status: 'BLOCKED',
      reason: 'Runtime-selected catalog identity requires two identical contained replay readbacks.',
      ...provenance(record, ordinal, `${allowed.app}:hold-dynamic-identity-v1`)
    }));
  }
  return units;
}

function buildDataEffects(records) {
  const effects = [];
  for (const record of records) {
    record.statements.forEach((statement, index) => {
      const classification = classifyStatement(statement);
      if (!classification.dataEffect) return;
      const operation = /^\s*(with\b[\s\S]*?\b)?(insert|update|delete|merge|truncate|copy)\b/i.exec(classification.clean)?.[2]?.toUpperCase()
        ?? (/\binsert\s+into\b/i.test(classification.clean) ? 'INSERT'
          : /\bdelete\s+from\b/i.test(classification.clean) ? 'DELETE' : 'UPDATE');
      effects.push({
        id: `${record.app}:${record.filename}:data:${String(index + 1).padStart(4, '0')}`,
        status: 'BLOCKED',
        operation,
        reason: 'Top-level data effect is excluded from schema generation and requires a later data reconciliation wave.',
        ...provenance(record, index + 1, `${record.app}:hold-data-effect-v1`)
      });
    });
  }
  return effects;
}

function namespaceRewrite(sql, app) {
  if (app === 'fitness') return sql.replace(/\bpublic\./gi, 'fitness.');
  if (app === 'mazer') return sql.replace(/\bpublic\./gi, 'mazer.');
  return sql;
}

function initialStatementDisposition(record, statement, config, classification, definition, dependency) {
  const dynamicPaths = new Set(config.dynamic_allowlist.map((entry) => `${entry.app}/${entry.path}`));
  const heldNumberPaths = new Set(config.held_sources.fitness_number_migrations);
  if (record.app === 'discordos' && record.filename >= config.held_sources.discordos_scheduler_activation) {
    return ['discordos_scheduler_boundary', 'DiscordOS scheduler and later runtime/control-plane units require a contained replay and activation packet.'];
  }
  if (record.app === 'fitness' && heldNumberPaths.has(record.filename)) {
    return ['fitness_global_number_transform', 'Fitness number transformation is blocked on the source dependency and contained replay acceptance.'];
  }
  if (record.app === 'fitness' && record.filename === config.resolved_dynamic_policy_source.path) {
    return ['resolved_dynamic_policy_expansion', 'The source dynamic policy unit is replaced by the exact ten-identity static expansion.'];
  }
  if (record.app === 'discordos' && definition?.identity.match(/^public\.discordos_[a-z0-9_$]+$/)) {
    return ['discordos_public_rpc_control_plane', 'Public DiscordOS RPC creation is held pending explicit control-plane and security proof.'];
  }
  if (dependency.malformed) {
    return ['malformed_function_dependency', 'Function dependency syntax could not be resolved deterministically.'];
  }
  if (classification.dataEffect) return ['data_effect', 'Top-level data effect requires a later data reconciliation wave.'];
  if (classification.extensionDependency) return ['extension_activation', 'Extension creation is a provider/runtime dependency, not an admitted generated effect.'];
  if (classification.cronActivation) return ['cron_activation', 'Cron activation requires a later runtime activation packet.'];
  if (classification.networkEffect) return ['network_effect', 'Network effects are prohibited in the inert source package.'];
  if (classification.securityDefiner) return ['security_definer', 'SECURITY DEFINER creation requires explicit target security proof.'];
  if (dynamicPaths.has(`${record.app}/${record.filename}`) && classification.dynamicIdentity) {
    return ['allowlisted_dynamic_identity', 'Allowlisted dynamic identity remains blocked pending two identical contained replay readbacks.'];
  }
  if (classification.dynamicIdentity) return ['unallowlisted_dynamic_identity', 'Dynamic identity is not admitted to executable output.'];
  if (/^do\b/i.test(classification.clean)) return ['anonymous_code_block', 'Anonymous code blocks remain held until contained replay proves their complete effects.'];
  return null;
}

export function buildGenerationPlan(records, config) {
  const units = records.flatMap((record) => record.statements.map((statement, index) => {
    const fallbackSchema = record.app === 'discordos' ? 'discordos' : 'public';
    const classification = classifyStatement(statement);
    const definition = parseFunctionDefinition(statement, fallbackSchema);
    const dependency = analyzeFunctionDependencyStatement(statement, fallbackSchema);
    const initialDisposition = initialStatementDisposition(record, statement, config, classification, definition, dependency);
    return {
      record,
      statement,
      statement_ordinal: index + 1,
      fallback_schema: fallbackSchema,
      classification,
      definition,
      dependency,
      blocker_class: initialDisposition?.[0] ?? null,
      reason: initialDisposition?.[1] ?? null,
      referenced_held_functions: []
    };
  }));

  const heldFunctionsByApp = new Map();
  for (const unit of units.filter((candidate) => candidate.blocker_class && candidate.definition)) {
    if (!heldFunctionsByApp.has(unit.record.app)) heldFunctionsByApp.set(unit.record.app, new Set());
    heldFunctionsByApp.get(unit.record.app).add(unit.definition.identity);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const unit of units) {
      if (unit.blocker_class) continue;
      const heldFunctions = heldFunctionsByApp.get(unit.record.app) ?? new Set();
      const identities = [...heldFunctions].sort();
      const references = findHeldFunctionReferences(unit.statement, identities, unit.fallback_schema);
      if (references.length === 0) continue;
      unit.blocker_class = 'held_function_dependency';
      unit.reason = 'Statement resolves or references a held function and cannot remain executable without its dependency.';
      unit.referenced_held_functions = references;
      if (unit.definition && !heldFunctions.has(unit.definition.identity)) {
        heldFunctions.add(unit.definition.identity);
        heldFunctionsByApp.set(unit.record.app, heldFunctions);
        changed = true;
      }
    }
  }

  for (const unit of units.filter((candidate) => candidate.blocker_class)) {
    if (unit.referenced_held_functions.length === 0) {
      const heldFunctions = heldFunctionsByApp.get(unit.record.app) ?? new Set();
      unit.referenced_held_functions = findHeldFunctionReferences(unit.statement, [...heldFunctions].sort(), unit.fallback_schema)
        .filter((identity) => identity !== unit.definition?.identity);
    }
  }
  return {
    units,
    held_functions: [...heldFunctionsByApp.entries()]
      .flatMap(([app, identities]) => [...identities].map((identity) => `${app}:${identity}`))
      .sort()
  };
}

function heldStatementEvidence(plan) {
  const heldStatements = plan.units.filter((unit) => unit.blocker_class).map((unit) => ({
    id: `${unit.record.app}:${unit.record.filename}:held:${String(unit.statement_ordinal).padStart(4, '0')}`,
    status: 'BLOCKED',
    blocker_class: unit.blocker_class,
    reason: unit.reason,
    statement_sha256: sha256(Buffer.from(unit.statement, 'utf8')),
    statement_byte_count: Buffer.byteLength(unit.statement, 'utf8'),
    defined_function: unit.definition ? {
      source_identity: unit.definition.identity,
      target_identity: functionIdentityForTarget(unit.definition.identity, unit.record.app)
    } : null,
    referenced_held_functions: unit.referenced_held_functions.map((identity) => ({
      source_identity: identity,
      target_identity: functionIdentityForTarget(identity, unit.record.app)
    })),
    ...provenance(unit.record, unit.statement_ordinal, `${unit.record.app}:hold-${unit.blocker_class.replaceAll('_', '-')}-v1`)
  }));
  const heldFunctions = plan.units.filter((unit) => unit.blocker_class && unit.definition).map((unit) => ({
    source_identity: unit.definition.identity,
    target_identity: functionIdentityForTarget(unit.definition.identity, unit.record.app),
    blocker_class: unit.blocker_class,
    ...provenance(unit.record, unit.statement_ordinal, `${unit.record.app}:hold-function-v1`)
  })).sort((left, right) => `${left.source_app}:${left.source_identity}`.localeCompare(`${right.source_app}:${right.source_identity}`));
  return { heldStatements, heldFunctions };
}

function buildGeneratedSql(records, config, securityMatrix, plan) {
  const files = new Map();
  const prefix = '-- APPLY_ADMITTED=false\n-- INERT SOURCE PACKAGE: review and contained replay are required before any apply.\n';
  for (const app of ['mazer', 'fitness', 'discordos']) {
    const chunks = app === 'mazer' || app === 'fitness' ? [`create schema if not exists ${app};`] : [];
    const functionSignatures = new Set();
    for (const record of records.filter((candidate) => candidate.app === app)) {
      const statements = plan.units
        .filter((unit) => unit.record === record && !unit.blocker_class)
        .map((unit) => namespaceRewrite(unit.statement, record.app));
      if (statements.length === 0) continue;
      const fallbackSchema = app === 'fitness' || app === 'mazer' ? app : 'discordos';
      for (const statement of statements) {
        const definition = parseFunctionDefinition(statement, fallbackSchema);
        if (definition) functionSignatures.add(definition.signature);
      }
      chunks.push(`-- source ${record.path} blob ${record.blob} raw_sha256 ${record.raw_sha256}\n${statements.join('\n\n')}`);
    }
    if (functionSignatures.size > 0) {
      chunks.push(`-- Effective function ACL closure: no application role is authorized in this inert package.\n${[...functionSignatures]
        .sort()
        .map((signature) => `revoke execute on function ${signature} from PUBLIC, anon, authenticated, service_role;`)
        .join('\n')}`);
    }
    if (app === 'fitness') {
      const denyTables = [
        'discord_feedback_reports', 'discord_member_links', 'discord_message_command_claims',
        'discord_moderation_cases', 'discord_spotify_connections', 'discord_spotify_lobbies',
        'discord_spotify_queue_items', 'discord_spotify_room_members', 'discord_update_drafts',
        'discord_verification_tokens'
      ];
      chunks.push(`-- resolved dynamic policy expansion: exactly ${denyTables.length} identities\n${denyTables.map((table) => [
        `revoke all privileges on table fitness.${table} from PUBLIC, anon, authenticated;`,
        `grant all privileges on table fitness.${table} to service_role;`,
        `create policy ${table}_deny_public_api_access on fitness.${table} for all to anon, authenticated using (false) with check (false);`
      ].join('\n')).join('\n\n')}`);
    }
    files.set(`0000000000000${files.size + 1}_${app}_schema_inert.sql`, `${prefix}\n${chunks.join('\n\n')}\n`);
  }

  const overlayLines = [
    prefix.trimEnd(),
    '-- Target-only namespace and security expectation overlay.',
    ...config.schemas.application.filter((schema) => schema !== 'public').map((schema) => `create schema if not exists ${schema};`),
    ...config.schemas.private.map((schema) => `create schema if not exists ${schema};`),
    '',
    ...[...config.schemas.application, ...config.schemas.private].map((schema) => `revoke all on schema ${schema} from PUBLIC, anon, authenticated;`),
    '',
    '-- Closed contract relation expectations; definitions remain blocked until generated from reviewed schemas.',
    ...securityMatrix.relations.map((relation) => `-- ${relation.name} RLS=${relation.rls_enabled} FORCE_RLS=${relation.rls_forced} GRANTS=${sha256(canonicalJson(relation.grants))}`),
    '-- Closed contract function expectations; no function body is generated in this packet.',
    ...securityMatrix.functions.map((fn) => `-- ${fn.name} EXPOSURE=${fn.exposure} EXECUTE=${fn.execute_grants.join(',') || 'none'} REVOKED=${fn.execute_revoked_from.join(',')}`),
    ''
  ];
  files.set('00000000000004_platform_security_overlay_inert.sql', overlayLines.join('\n'));
  return files;
}

function writeGenerated(files) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  for (const existing of fs.readdirSync(outputDirectory)) {
    if (existing.endsWith('.sql') && !files.has(existing)) throw new Error(`undeclared generated SQL exists: ${existing}`);
  }
  for (const [filename, content] of files) fs.writeFileSync(path.join(outputDirectory, filename), content, 'utf8');
}

function writeManifest(name, value) {
  fs.mkdirSync(manifestsDirectory, { recursive: true });
  fs.writeFileSync(path.join(manifestsDirectory, name), canonicalJson(value), 'utf8');
}

function sourceManifest(records, config) {
  const migrations = records.map(({ text, statements, filename, ...record }) => record);
  const packageManifestSha256 = sha256(canonicalJson(migrations));
  return {
    version: '1.0.0',
    status: 'CURRENT',
    apply_admitted: false,
    evidence_artifact: config.evidence,
    accepted_source_chain_sha256: Object.fromEntries(config.sources.map((source) => [source.app, source.chain_manifest_sha256])),
    package_manifest_sha256: packageManifestSha256,
    migrations
  };
}

export function generateTargetBootstrap() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const securityMatrix = JSON.parse(fs.readFileSync(path.join(root, 'contracts', 'v1', 'security', 'rls-grant-function-matrix.json'), 'utf8'));
  const records = readSourceRecords(config);
  const objects = extractObjects(records, config);
  const dynamicUnits = buildDynamicUnits(records, config);
  const dataEffects = buildDataEffects(records);
  const generationPlan = buildGenerationPlan(records, config);
  const heldEvidence = heldStatementEvidence(generationPlan);
  const generatedSql = buildGeneratedSql(records, config, securityMatrix, generationPlan);

  writeManifest('source-migrations.v1.json', sourceManifest(records, config));
  writeManifest('source-objects.v1.json', {
    version: '1.0.0', status: 'CURRENT', apply_admitted: false, expected_counts: config.expected, ...objects
  });
  writeManifest('dynamic-units.v1.json', {
    version: '1.0.0', status: 'BLOCKED', apply_admitted: false,
    unresolved_count: dynamicUnits.length,
    resolved_fitness_deny_policy_count: config.resolved_dynamic_policy_source.expanded_policy_count,
    units: dynamicUnits
  });
  writeManifest('data-effects.v1.json', {
    version: '1.0.0', status: 'BLOCKED', apply_admitted: false,
    held_count: dataEffects.length,
    effects: dataEffects
  });
  writeManifest('collisions.v1.json', {
    version: '1.0.0', status: 'REQUIRED', apply_admitted: false,
    exact_cross_source_name_collisions: 0,
    groups: [
      { id: 'discord-feedback-product-contracts', classification: 'semantic_conflict', disposition: 'quarantine' },
      { id: 'discord-update-drafts-product-contracts', classification: 'semantic_conflict', disposition: 'quarantine' },
      { id: 'fitness-local-versus-global-user-number', classification: 'semantic_conflict', disposition: 'forward_transform', status: 'BLOCKED' },
      { id: 'fitness-global-profile-split', classification: 'ownership_auth_conflict', disposition: 'forward_transform', status: 'BLOCKED' },
      { id: 'mazer-global-profile-split', classification: 'ownership_auth_conflict', disposition: 'forward_transform', status: 'BLOCKED' },
      { id: 'fitness-entitlement-ownership', classification: 'ownership_auth_conflict', disposition: 'forward_transform', status: 'BLOCKED' }
    ]
  });
  writeManifest('dispositions.v1.json', {
    version: '1.0.0', status: 'REQUIRED', apply_admitted: false,
    source_raw_bytes: 'provenance_input_only',
    namespace_rewrites: { fitness: 'fitness', mazer: 'mazer', discordos: 'discordos' },
    provider_managed: 'skip_recreation',
    data_effects: 'blocked_data_reconciliation',
    dynamic_templates: 'blocked_contained_replay',
    scheduler: 'blocked_activation',
    fitness_number_transform: 'blocked_unmerged_dependency_and_replay',
    runtime_and_control_plane: 'blocked',
    derived_counts: {
      source_statement_count: generationPlan.units.length,
      executable_statement_count: generationPlan.units.filter((unit) => !unit.blocker_class).length,
      held_statement_count: heldEvidence.heldStatements.length,
      held_function_definition_statement_count: heldEvidence.heldFunctions.length,
      held_function_identity_count: generationPlan.held_functions.length,
      held_dependency_statement_count: heldEvidence.heldStatements.filter((unit) => unit.blocker_class === 'held_function_dependency').length,
      held_discordos_public_rpc_definition_count: heldEvidence.heldStatements.filter((unit) => unit.defined_function?.source_identity.match(/^public\.discordos_[a-z0-9_$]+$/)).length,
      held_discordos_public_rpc_control_plane_definition_count: heldEvidence.heldStatements.filter((unit) => unit.blocker_class === 'discordos_public_rpc_control_plane' && unit.defined_function).length
    },
    held_functions: heldEvidence.heldFunctions,
    held_statements: heldEvidence.heldStatements
  });
  writeManifest('namespace-plan.v1.json', {
    version: '1.0.0', status: 'REQUIRED', apply_admitted: false,
    public: { product_tables_allowed: false, rpc: 'blocked_pending_control_plane_and_security_proof' },
    platform_shared: { exposure: 'intended_application_schema', contents: 'explicit_shared_identity_service_contracts_only' },
    platform_private: { exposure: 'unexposed', contents: 'privileged_platform_helpers' },
    discordos: { exposure: 'intended_application_schema', contents: 'discordos_product_objects' },
    discordos_private: { exposure: 'unexposed', contents: 'discordos_internal_helpers' },
    fitness: { exposure: 'intended_application_schema', contents: 'fitness_product_objects' },
    mazer: { exposure: 'intended_application_schema', contents: 'mazer_product_objects' },
    provider_managed: config.schemas.provider_managed
  });
  writeGenerated(generatedSql);

  const report = {
    ok: true,
    apply_admitted: false,
    migrations: records.length,
    source_objects: Object.fromEntries(Object.entries(objects).map(([key, value]) => [key, key === 'constraint_units' ? value.expected_count : value.length])),
    dynamic_templates: dynamicUnits.length,
    held_data_effects: dataEffects.length,
    executable_statements: generationPlan.units.filter((unit) => !unit.blocker_class).length,
    held_statements: heldEvidence.heldStatements.length,
    held_function_definition_statements: heldEvidence.heldFunctions.length,
    held_function_identities: generationPlan.held_functions.length,
    held_function_dependencies: heldEvidence.heldStatements.filter((unit) => unit.blocker_class === 'held_function_dependency').length,
    generated_files: [...generatedSql.keys()].sort()
  };
  return report;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  process.stdout.write(canonicalJson(generateTargetBootstrap()));
}
