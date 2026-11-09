import { createHash } from 'node:crypto';
import { types } from 'node:util';

// Faithful JS model of PostgreSQL `jsonb::text` for the subset the private card
// store hashes. The pinned SQL computes every digest as
//   'sha256:' || encode(sha256(convert_to(<jsonb>::text, 'UTF8')), 'hex')
// so a JS digest only means anything if it hashes these exact bytes.
//
// Verified against PostgreSQL 16 and 17 by test/private-card-store-postgres.integration.test.mjs.
// Rules reproduced from jsonb output:
//   - ', ' between members and elements, ': ' between key and value, no other whitespace
//   - object keys ordered by UTF-8 byte length first, then bytewise (memcmp)
//   - strings escape only " \ \b \f \n \r \t and other C0 controls as \u00xx (lowercase hex)
//   - numbers are `numeric` output; this model accepts safe integers only, because a parsed JS
//     number cannot carry the scale PostgreSQL preserves (1.0 stays 1.0, JS prints 1)
//   - U+0000 cannot be stored in jsonb at all

export const jsonbLimits = Object.freeze({ depth: 64, nodes: 100000 });

function reject(code) {
  const error = new TypeError(`Candidate jsonb text rejected: ${code}`);
  error.code = `ERR_JSONB_${code}`;
  throw error;
}

function escapeString(value) {
  let out = '"';
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit === 0) reject('NUL');
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) reject('UNICODE');
      out += value[index] + value[index + 1];
      index += 1;
      continue;
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) reject('UNICODE');
    if (unit === 0x22) out += '\\"';
    else if (unit === 0x5c) out += '\\\\';
    else if (unit === 0x08) out += '\\b';
    else if (unit === 0x0c) out += '\\f';
    else if (unit === 0x0a) out += '\\n';
    else if (unit === 0x0d) out += '\\r';
    else if (unit === 0x09) out += '\\t';
    else if (unit < 0x20) out += `\\u${unit.toString(16).padStart(4, '0')}`;
    else out += value[index];
  }
  return `${out}"`;
}

/** PostgreSQL jsonb key order: shorter UTF-8 byte length first, then bytewise. */
export function compareJsonbKeys(left, right) {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length !== b.length ? a.length - b.length : Buffer.compare(a, b);
}

/** Bytewise (C collation) string order, which is what `ORDER BY stable_id` yields under datcollate=C. */
export function compareBytewise(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

/** Text PostgreSQL prints for the jsonb value parsed from this JSON-compatible JS value. */
export function jsonbText(value) {
  let nodes = 0;
  function visit(current, depth) {
    if (depth > jsonbLimits.depth) reject('DEPTH');
    if (++nodes > jsonbLimits.nodes) reject('NODES');
    if (current === null) return 'null';
    if (current === true) return 'true';
    if (current === false) return 'false';
    if (typeof current === 'string') return escapeString(current);
    if (typeof current === 'number') {
      if (!Number.isSafeInteger(current)) reject('NUMBER');
      return String(current === 0 ? 0 : current);
    }
    if (typeof current !== 'object' || types.isProxy(current)) reject('VALUE');
    if (Array.isArray(current)) {
      if (Object.getPrototypeOf(current) !== Array.prototype) reject('VALUE');
      const parts = [];
      for (let index = 0; index < current.length; index += 1) {
        if (!Object.hasOwn(current, index)) reject('VALUE');
        parts.push(visit(current[index], depth + 1));
      }
      return `[${parts.join(', ')}]`;
    }
    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) reject('VALUE');
    if (Object.getOwnPropertySymbols(current).length) reject('VALUE');
    const keys = Object.keys(current).sort(compareJsonbKeys);
    return `{${keys.map((key) => `${escapeString(key)}: ${visit(current[key], depth + 1)}`).join(', ')}}`;
  }
  return visit(value, 0);
}

/** sha256 over the UTF-8 bytes of jsonb text, in the SQL `sha256:<hex>` form. */
export function jsonbDigest(value) {
  return `sha256:${createHash('sha256').update(jsonbText(value), 'utf8').digest('hex')}`;
}

/** Cards in the order `jsonb_agg(body ORDER BY stable_id)` yields under the C collation. */
export function sortCardsByStableId(cards) {
  if (!Array.isArray(cards)) reject('VALUE');
  return [...cards].sort((left, right) => compareBytewise(left.stable_id, right.stable_id));
}

/**
 * Reject numeric tokens a JS parse cannot represent faithfully: anything with a fraction or
 * exponent (PostgreSQL keeps scale; JS loses it) and integers beyond the safe range. Call this on
 * the raw JSON text, before it is parsed into JS numbers. Tokens inside strings are skipped.
 */
export function assertJsonbSafeNumberTokens(rawJson) {
  const text = typeof rawJson === 'string' ? rawJson : new TextDecoder('utf-8', { ignoreBOM: true }).decode(rawJson);
  const token = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === '"') {
      index += 1;
      while (index < text.length && text[index] !== '"') index += text[index] === '\\' ? 2 : 1;
      index += 1;
    } else if (character === '-' || (character >= '0' && character <= '9')) {
      token.lastIndex = index;
      const match = token.exec(text);
      if (!match) reject('NUMBER');
      if (!/^-?\d+$/u.test(match[0]) || !Number.isSafeInteger(Number(match[0]))) reject('NUMBER');
      index = token.lastIndex;
    } else index += 1;
  }
}
