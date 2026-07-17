import { validateContracts } from './lib/contracts.mjs';

const report = validateContracts();
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
