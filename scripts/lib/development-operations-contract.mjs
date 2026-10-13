import fs from 'node:fs';
import { types } from 'node:util';
import Ajv2020 from 'ajv/dist/2020.js';

export const operationsContractPath = 'contracts/v1/operations/development-operations-contract.json';
export const operationsExamplesPath = 'contracts/v1/operations/development-operations-examples.json';
export const operationsSchemaId = 'urn:fawxzzy:platform:schemas:v1:development-operations-contract';
const schema = JSON.parse(fs.readFileSync(new URL('../../contracts/v1/schemas/development-operations-contract.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(schema);

// These are inert synthetic policy vectors, not an Auth or production gate.
// The access result and prior-redaction result are hypotheses, never verified here.
export function evaluateSyntheticOperationsFixture(input) {
  if (input.access_result !== 'operator_verified') {
    return { render_state: 'denied', payload: 'none', current_truth: false, visible_marker: false, watermark_required: false, actions_enabled: false };
  }
  let health = input.health;
  let projection = input.accepted_redacted_projection;
  if (health === 'UNKNOWN') { health = 'reconciling'; projection = false; }
  if (!input.identity_validated && !['unavailable', 'incompatible'].includes(health)) health = 'reconciling';
  if (health === 'healthy' && !projection) health = 'unavailable';
  const payload = health === 'healthy' ? 'current' : ['stale', 'reconciling'].includes(health) && projection ? 'last_accepted' : 'none';
  return { render_state: health, payload, current_truth: payload === 'current', visible_marker: health !== 'healthy', watermark_required: payload !== 'none', actions_enabled: false };
}

function plainJson(value, seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value) && !Object.is(value, -0);
  if (typeof value !== 'object' || types.isProxy(value) || seen.has(value)) return false;
  seen.add(value);
  const array = Array.isArray(value);
  if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== 'string')) return false;
  if (array && (keys.length !== value.length + 1 || keys.some((key) => key !== 'length' && !/^(0|[1-9][0-9]*)$/.test(key)))) return false;
  for (const key of keys) {
    if (array && key === 'length') continue;
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value') || !plainJson(descriptor.value, seen)) return false;
  }
  return true;
}

export function validateDevelopmentOperationsDocuments(documents) {
  const failures = [];
  try {
    // Check each exact input before inspecting fields; do not invoke getters/toJSON.
    if (!documents || types.isProxy(documents) || Object.getPrototypeOf(documents) !== Object.prototype) return ['private operations: non-plain document map'];
    for (const [relativePath, definition] of [[operationsContractPath, 'contract'], [operationsExamplesPath, 'examples']]) {
      const descriptor = Object.getOwnPropertyDescriptor(documents, relativePath);
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || !plainJson(descriptor.value)) {
        failures.push(`${relativePath}: non-plain JSON document`);
        continue;
      }
      const validate = ajv.getSchema(`${operationsSchemaId}#/$defs/${definition}`);
      if (!validate(descriptor.value)) failures.push(`${relativePath}: ${ajv.errorsText(validate.errors, { separator: '; ' })}`);
    }
    if (failures.length) return failures.sort();
    const examples = documents[operationsExamplesPath];
    const identities = new Set();
    const combinations = new Set();
    for (const fixture of examples.cases) {
      if (identities.has(fixture.id)) failures.push(`${fixture.id}: duplicate fixture ID`);
      identities.add(fixture.id);
      const input = fixture.input;
      const combination = [input.access_result, input.health, input.accepted_redacted_projection, input.identity_validated].join(':');
      if (combinations.has(combination)) failures.push(`${fixture.id}: duplicate fixture combination`);
      combinations.add(combination);
      const expected = evaluateSyntheticOperationsFixture(input);
      for (const [key, value] of Object.entries(expected)) {
        if (fixture.expected[key] !== value) failures.push(`${fixture.id}: expected ${key} contradicts proposed fail-closed policy`);
      }
    }
    if (combinations.size !== 72) failures.push('private operations: require all72 synthetic policy combinations');
  } catch {
    failures.push('private operations: malformed proposal input');
  }
  return failures.sort();
}
