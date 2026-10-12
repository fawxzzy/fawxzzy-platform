import crypto from 'node:crypto';

export const observedTopologyPath = 'contracts/v1/registry/observed-project-topology.json';
const historicalRegistryPath = 'contracts/v1/registry/project-registry.json';
const topologyDigest = '17ce9f3db741b5a38b144bfdecc0189e8b36f5f50ce5f4a6f26202ffb9a600b0';
const historicalRegistryDigest = '16a7b668f2a4c165b73ff62a9bf142337121c3b43415a2c32f52393d553ecab9';

// This is an immutable receipt-bound snapshot, not a provider inventory client.
function digest(value) {
  return crypto.createHash('sha256').update(`${JSON.stringify(value, null, 2)}\n`).digest('hex');
}

export function validateObservedProjectTopology(documents) {
  const failures = [];
  try {
    if (digest(documents?.[observedTopologyPath]) !== topologyDigest) {
      failures.push('observed topology: reviewed snapshot identity mismatch');
    }
    if (digest(documents?.[historicalRegistryPath]) !== historicalRegistryDigest) {
      failures.push('observed topology: historical registry preimage mismatch');
    }
  } catch {
    failures.push('observed topology: invalid document representation');
  }
  return failures;
}

export function summarizeObservedProjectTopology(documents) {
  const failures = validateObservedProjectTopology(documents);
  if (failures.length) return { ok: false, failures };
  const snapshot = documents[observedTopologyPath];
  return {
    ok: true,
    evidence_recorded_at: snapshot.evidence_recorded_at,
    observation_kind: snapshot.observation_kind,
    fresh_provider_observation: false,
    target: structuredClone(snapshot.target),
    retired_sources: structuredClone(snapshot.retired_sources),
    execution_authorized: false,
    replay_authorized: false,
    owner_adoption: snapshot.authority.owner_adoption
  };
}
