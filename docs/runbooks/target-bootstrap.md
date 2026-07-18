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

Two consecutive generator runs must leave every file under `bootstrap/manifests` and `supabase/migrations` byte-identical. Verification reports one deterministic package digest and these exact counts:

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
- a project endpoint/reference, credential value, provider command, deployment hook, or runtime-install command;
- the provider-canonical Fitness 043 provenance blob or digest;
- the unmerged Fitness global-number candidate as an executable input.

Raw historical migrations may contain effects or legacy grants because they are immutable provenance. Every omitted source statement is bound by source app, commit, path, blob, raw digest, statement ordinal, statement digest, transformation, blocker class, and reason. Those statements must not enter generated output.

## Review procedure

1. Verify the raw migration manifest identities and the accepted combined-manifest binding.
2. Confirm the seven manifest paths and four generated migration paths are the complete denominators.
3. Review all blocker manifests. `apply_admitted` must remain false everywhere. Confirm all 18 public DiscordOS RPC definitions and every dependent statement are held.
4. Run focused parser, manifest, generator, replay, and security tests.
5. Run full repository verification twice and compare complete output bytes.
6. Publish only the source branch as a draft pull request. Do not merge or apply it in this packet.

## Later execution gates

All of the following remain `BLOCKED`: target apply; contained replay acceptance; provider extension/version reconciliation; Data API and Auth control-plane settings; identity, Auth, and product data load; Storage body reread; Edge or Cron activation; application/Vercel cutover; source pause; deactivation; deletion; and retirement.

A future apply packet must re-read the target and source preimages, use disposable no-egress rehearsals, close every dynamic identity through two identical catalog readbacks, prove rollback, and obtain explicit action-time authority. This source packet grants none of that authority.
