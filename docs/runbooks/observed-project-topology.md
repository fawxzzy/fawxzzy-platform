# Observed project topology

## Read the retained observation

Run `npm run topology:show`. It validates all versioned contracts and prints the
snapshot evidence time, retained master, three retired sources and explicit false
execution/replay flags. The command performs local file reads only.

`contracts/v1/registry/project-registry.json` remains the immutable historical
migration preimage. Its active-source declarations are not current availability.
`contracts/v1/registry/observed-project-topology.json` reports a settled historical
postimage. Neither is a replacement for fresh action-time provider evidence.

## Adopt or update

1. Review exact source and evidence hashes, including all three terminal receipts.
2. Preserve the old registry, executable artifacts and all BLOCKED operation gates.
3. Review snapshot/schema, loader, semantic pins, negative tests and reporting
   consumer together. No automatic source recreation or retired effect is allowed.
4. Run `npm run validate`, `npm test` and `npm run verify` in the owner repository
   before publication. Isolated-fixture results do not publish or adopt this patch.
5. Use the existing source-owner review and publication scope. Do not connect a
   provider, retrieve credentials, deploy, or claim runtime acceptance from this
   repository-only change.

## Rollback and failures

If validation fails, the reporting command exits nonzero without a success summary.
Revert the additive observation integration as one source change if necessary;
never recreate deleted projects or rewrite historical migration proof. An absent
external receipt or unresolved consumer leaves owner adoption pending.
