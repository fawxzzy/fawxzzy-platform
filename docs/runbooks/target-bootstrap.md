# Target-bootstrap source runbook

Status: `CURRENT`
Apply admitted: `false`

## Purpose

This runbook verifies the inert source package only. It does not link to a project, start a database, install a runtime, apply a migration, or change a provider.

## Fixed inputs

The generator reads only committed repository files:

- `bootstrap/generator/config.v1.json` for accepted evidence identities, source anchors, denominators, namespace rules, and blocked dependencies;
- 122 byte-exact migration inputs under `bootstrap/sources`;
- the merged `contracts/v1/security/rls-grant-function-matrix.json` for target-only security expectations.

Fitness PR #108 is dependency evidence only. Its candidate head is not an executable source commit and no file from its worktree belongs in this package.

## Generate and verify

From the repository root:

```text
npm run bootstrap:generate
npm run bootstrap:verify
npm test
npm run verify
```

The commands use Node.js standard library plus the repository's existing test dependencies. They make no network request and invoke no provider command.

Two consecutive generator runs must leave every file under `bootstrap/manifests` and `bootstrap/artifacts/inert-sql` byte-identical. The latter directory is the only admitted home for the four generated SQL review artifacts. `supabase/migrations` must contain zero SQL files; `APPLY_ADMITTED=false` remains package metadata and is not treated as an execution guard. Verification reports one deterministic package digest and these exact counts:

| Class | Count |
|---|---:|
| Raw migrations | 122 |
| Source-created tables | 41 |
| Source functions | 30 |
| Source policies | 74 |
| Source triggers | 10 |
| Source-created index identities | 134 |
| Constraint units | 281 |
| Extension dependencies | 3 |
| Held top-level data effects | 358 |
| Unresolved dynamic templates | 11 |
| Held Cron units | 1 |
| Source statements | 1253 |
| Executable schema statements | 721 |
| Held source statements | 532 |
| Held function definition statements | 28 |
| Unique held function identities | 24 |
| Held function-dependent statements | 67 |
| Held DiscordOS public RPC definitions | 18 |

Fitness must contribute exactly 63 policies after deterministic expansion of the ten deny policies. Mazer contributes 11.

## Mandatory holds

The verifier fails if any generated target file admits or contains:

- placement under `supabase/migrations`, an alternate executable migration directory, or any path outside the exact `bootstrap/artifacts/inert-sql` denominator;
- a missing, duplicate, renamed, copied, or path-drifted generated artifact;
- a top-level insert, update, deletion, merge, copy, or truncate effect;
- Cron scheduling or a network-capable database call;
- extension activation or provider-managed object recreation;
- a product object in `public`;
- a `public.discordos_*` function in either `CREATE FUNCTION` or `CREATE OR REPLACE FUNCTION` form;
- a Mazer or Fitness qualified object before the corresponding idempotent schema creation;
- a grant, revoke, comment, trigger, policy, function, or other executable statement that resolves or references an absent held function;
- malformed or unknown function dependency syntax;
- private-schema grants to PUBLIC, `anon`, or `authenticated`;
- PUBLIC execution on a function;
- an emitted function without exactly one signature-specific revocation from `PUBLIC`, `anon`, `authenticated`, and `service_role`; the verifier starts from PostgreSQL's implicit PUBLIC EXECUTE default, preserves ACLs across `CREATE OR REPLACE`, and rejects missing, duplicate, unmatched, extra, or unauthorized privilege statements;
- a project endpoint/reference, credential value, provider command, deployment hook, or runtime-install command;
- the provider-canonical Fitness 043 provenance blob or digest;
- the unmerged Fitness global-number candidate as an executable input.

Raw historical migrations may contain effects or legacy grants because they are immutable provenance. Every omitted source statement is bound by source app, commit, path, blob, raw digest, statement ordinal, statement digest, transformation, blocker class, and reason. Those statements must not enter generated output.

## Review procedure

1. Verify the raw migration manifest identities and the accepted combined-manifest binding.
   - Recompute every source-chain digest from actual copied bytes using the canonical version, source path, Git blob, raw SHA-256, and byte-count line.
   - Recompute the combined digest from the frozen app label, immutable commit, immutable root tree, and recomputed source-chain digest.
   - Reject substituted bytes or identities, stale acceptance values, missing bindings, and any copied source outside its exact app migration root.
2. Confirm the seven manifest paths and four `bootstrap/artifacts/inert-sql` review-artifact paths are the complete denominators, and confirm standard Supabase migration discovery returns zero SQL files.
3. Review all blocker manifests. `apply_admitted` must remain false everywhere. Confirm all 18 public DiscordOS RPC definitions and every dependent statement are held.
4. Confirm the generated function ACL closure covers exactly six signatures: five Fitness identities across eleven definition statements and the DiscordOS `set_updated_at()` trigger helper. No application-role regrant is admitted.
5. Run focused parser, manifest, generator, replay, and security tests.
6. Run full repository verification twice and compare complete output bytes.
7. Publish only the source branch as a draft pull request. Do not merge or apply it in this packet.

Repository-wide validation must enumerate same-named root files even when `node_modules`, `outputs`, or `work` directories are excluded. It may omit an exact excluded root link only after proving its target is a directory and without traversing it; unknown, nested, broken, or file-target links and unsupported entry types must fail closed.

## Later execution gates

All of the following remain `BLOCKED`: target apply; contained replay acceptance; provider extension/version reconciliation; Data API and Auth control-plane settings; identity, Auth, and product data load; Storage body reread; Edge or Cron activation; application/Vercel cutover; source pause; deactivation; deletion; and retirement.

A future apply packet must re-read the target and source preimages, use disposable no-egress rehearsals, close every dynamic identity through two identical catalog readbacks, prove rollback, and obtain explicit action-time authority. Only then may it promote or copy digest-verified reviewed artifact bytes into a separate execution-only migration bundle. This source packet grants none of that authority and must not create that bundle, migration-path indirection, or a duplicate executable representation.
