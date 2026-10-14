import { loadDocuments, validateContracts } from './lib/contracts.mjs';
import { summarizeObservedProjectTopology } from './lib/observed-topology.mjs';

// Validate all contracts, including unchanged execution denials, before reporting.
const validation = validateContracts();
const result = validation.ok
  ? summarizeObservedProjectTopology(loadDocuments())
  : { ok: false, failures: validation.failures };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exitCode = 1;
