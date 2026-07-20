# Target-bootstrap source runbook

Status: `CURRENT`
Apply admitted: `false`
Bootstrap gate: `BLOCKED_PROVIDER_SUPPORT_REQUIRED`
Residual containment: `CONTAINABLE_WITH_HARD_GATES`

## Purpose

This runbook verifies the inert source package only. It does not link to a project, start a database, install a runtime, apply a migration, or change a provider.

## Fixed inputs

The generator reads only committed repository files:

- `bootstrap/generator/config.v1.json` for accepted evidence identities, source anchors, denominators, namespace rules, and blocked dependencies;
- 122 byte-exact migration inputs under `bootstrap/sources`;
- the merged `contracts/v1/security/rls-grant-function-matrix.json` for target-only security expectations.

Fitness PR #108 is dependency evidence only. Its candidate head is not an executable source commit and no file from its worktree belongs in this package.

DiscordOS and Mazer current default-branch migration discovery is not a package-refresh input. The migration gate carries a closed provider-ledger canonical provenance map for their 21 accepted historical units. Verification binds every map entry to the committed path, commit, blob, raw digest, byte count, ledger identity, and effect-class denominator. Any current-source substitution, ambiguous rename, historical path rewrite, missing mapping, package digest drift, or `apply_admitted=true` claim fails closed.

The generic application-data transport contract is also source-ready but execution-blocked. It adds no migration input, generated manifest, inert SQL, provider command, or product relation map. The verifier requires the fixed S0/S1/S2 lifecycle, complete key-and-row comparisons, explicit tombstones, CAS conflict quarantine, dependency-safe ordering, append-only rollback evidence, aggregate-only receipts, and blocked application state. Data API containment, recovery and quarantined restore, faithful contained replay, bootstrap, shared identity mapping, service membership, and the three product adapters remain independent prerequisites.

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

Generation requires the serialized local-writer contract. Tooling first builds the complete seven-manifest/four-SQL publication plan in memory, then validates the repository root, immutable inputs, standard migration discovery, both destination directories, every existing ancestor, every declared file, and the complete directory/discovery contents before creating a directory or writing a manifest or SQL file. One realpath/device/inode model rejects symbolic links, junctions/reparse points, multiply-linked files, case-fold aliases, unsupported entries, physical escapes, and observable aliases. On Linux, the normalized governing mount root plus each repository-relative path defines the repository and planned source-coordinate denominator. Another mount on that device is rejected when its source root can re-present the repository or intersects a planned input, discovery, or publication source path, including when `/` governs the repository; unrelated sibling roots, unrelated mounted `node_modules`, unrelated stacked mounts, and unrelated devices do not block. The complete identity model is revalidated immediately before publication, and post-validation drift fails before a publication write. This remains serialized source publication, not a claim of safety against a concurrent hostile filesystem mutation after a file descriptor is opened.

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
| Creator default-ACL assertion/disposition units | 36 |
| Executable inert `postgres` TABLES/SEQUENCES units | 12 |
| Signature-specific `postgres` FUNCTIONS assertions | 6 |
| Held `supabase_admin` units | 18 |

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
- the Fitness PR #108 candidate path, blob, digest, commit, or 102-migration denominator in accepted bootstrap inputs or outputs;
- an executable `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` statement or a claim that all 36 matrix units are executable;
- a schema-scoped function default revoke presented as a substitute for signature-specific function EXECUTE revocation;
- a missing, relabeled, or non-`BLOCKED_PROVIDER_ROLE` `supabase_admin` disposition;
- schema `CREATE` for `supabase_admin`, a non-`postgres` application schema owner, a missing `current_user=postgres` assertion, or a governed object created outside the `postgres` role;
- any application table, view, materialized view, sequence, type, or function in `public`;
- Data API current/required/attempted/Support/authority/admission state conflation; any invented Support result; any third Save or apply authority; public in the required Exposed schemas or Extra search path; an exposure outside the ordered four-schema maximum allowlist; automatic exposure enabled; or missing negative-probe/rollback proof.

PostgreSQL major version 17 is the required source contract; the live target version remains `UNKNOWN`. The 36-unit matrix closes as 12 executable `postgres` TABLES/SEQUENCES revokes, six `postgres` FUNCTIONS assertions satisfied only by exact per-function closure, and 18 held `supabase_admin` requirements. The current sanitized evidence cannot execute the provider-role commands (SQLSTATE `42501`) and does not prove provider-role isolation, so readiness remains `BLOCKED_PROVIDER_SUPPORT_REQUIRED`. The terminal residual classification is `CONTAINABLE_WITH_HARD_GATES`, not ready-to-apply authority.

The Data API containment postimage is required but not current. Contract v1.1.0 records the exact current preimage as enabled, Exposed schemas `[graphql_public, public]`, Extra search path `[public, extensions]`, automatic exposure off, tables 0/0, functions 1/0, and views `UNKNOWN/UNKNOWN`. The required postimage is disabled, `[]`, `[extensions]`, and off. Two authorized Overview Save attempts did not persist; Settings Save attempts, rollback Saves, and persisted provider mutations are all zero. The final state equals the preimage. The sanitized Support request is confirmed submitted, but case identity/status/response and provider-defect classification remain `UNKNOWN`; no Dashboard case inbox exists.

Prior action authority is consumed. Do not attempt a third Save. Retry requires changed documented Support evidence, a fresh target preimage, and new bounded owner authority. Before any future activation, prove `public` absent, enforce the ordered maximum allowlist `platform_shared`, `discordos`, `mazer`, `fitness`, keep `graphql_public`, `public`, private, extension, and provider schemas never exposed, and require explicit grants, RLS, independent readback, negative REST/GraphQL/RPC probes, and exact reverse-order rollback. Setting mutation, bootstrap apply, and target apply remain blocked.

Raw historical migrations may contain effects or legacy grants because they are immutable provenance. Every omitted source statement is bound by source app, commit, path, blob, raw digest, statement ordinal, statement digest, transformation, blocker class, and reason. Those statements must not enter generated output.

## Review procedure

1. Verify the raw migration manifest identities and the accepted combined-manifest binding.
   - Recompute every source-chain digest from actual copied bytes using the canonical version, source path, Git blob, raw SHA-256, and byte-count line.
   - Recompute the combined digest from the frozen app label, immutable commit, immutable root tree, and recomputed source-chain digest.
   - Reject substituted bytes or identities, stale acceptance values, missing bindings, and any copied source outside its exact app migration root.
   - Verify `contracts/v1/gates/fitness-pr108-replay-gate.json` binds the exact Fitness and hosted-replay heads, retains 101 accepted Fitness migrations, and leaves exact-head review, both merges, replay execution, and target apply blocked.
2. Confirm the seven manifest paths and four `bootstrap/artifacts/inert-sql` review-artifact paths are the complete denominators, and confirm standard Supabase migration discovery returns zero SQL files.
3. Review all blocker manifests. `apply_admitted` must remain false everywhere. Confirm all 18 public DiscordOS RPC definitions and every dependent statement are held.
4. Confirm the generated function ACL closure covers exactly six signatures: five Fitness identities across eleven definition statements and the DiscordOS `set_updated_at()` trigger helper. No application-role regrant is admitted.
5. Confirm the 36 default-ACL entries close as 12 executable, 6 signature-specific assertions, and 18 provider-role holds; confirm all six owner/CREATE/current-user invariants precede governed object creation.
6. Confirm Data API gate v1.1.0 preserves the exact current preimage, required postimage, failed-attempt accounting, submitted Support evidence, blocked retry authority, blocked apply admission, and `UNKNOWN` view/probe/Support-result fields without conflation or promotion. The terminal containment class remains `CONTAINABLE_WITH_HARD_GATES`.
7. Confirm the application-data gate remains `SOURCE_READY` / `EXECUTION_BLOCKED` with `apply_admitted=false`, all seven dependency gates blocked, the public receipt redacted, and the accepted 122-migration package unchanged.
8. Run focused parser, manifest, generator, replay, and security tests.
9. Run full repository verification twice and compare complete output bytes.
10. Publish only the source branch as a draft pull request. Do not merge or apply it in this packet.

Repository-wide validation must enumerate same-named root files even when `node_modules`, `outputs`, or `work` directories are excluded. It may omit an exact excluded root link only after proving its target is a directory and without traversing it; unknown, nested, broken, or file-target links and unsupported entry types must fail closed.

## Later execution gates

All of the following remain `BLOCKED`: target apply; contained replay acceptance; provider extension/version reconciliation; Data API and Auth control-plane settings; identity, Auth, and product data load; Storage body reread; Edge or Cron activation; application/Vercel cutover; source pause; deactivation; deletion; and retirement.

Before shared Auth or application data load, FP-MAN-013 additionally requires a current encrypted independent backup manifest, retention receipt, quarantined restore-to-new-project rehearsal, aggregate catalog/security/data/Auth parity, and accepted measured RPO/RTO. Database recovery cannot satisfy Storage object-body recovery; a non-zero Storage denominator activates the separate body-recovery gate. See `docs/runbooks/micro-recovery.md`.

A future apply packet must re-read the target and source preimages, use disposable no-egress rehearsals, close every dynamic identity through two identical catalog readbacks, prove rollback, and obtain explicit action-time authority. Only then may it promote or copy digest-verified reviewed artifact bytes into a separate execution-only migration bundle. This source packet grants none of that authority and must not create that bundle, migration-path indirection, or a duplicate executable representation.

## DiscordOS external-effect quarantine contract

The DiscordOS source snapshot is closed in `contracts/v1/recovery/external-effects-disable-manifest.example.json`. It binds the six recovered Edge identities, the one-minute `discordos_message_commands_poll` job, its network helper, the source and target extension versions, trigger and webhook counts, transient `pg_net` queue/history aggregates, Realtime, Vault, Storage, Auth, wrappers, foreign objects, and logical subscriptions to the accepted source and package digests. The source snapshot is evidence, not rehearsal admission: the live source Cron job remains active and the target example remains `BLOCKED`.

Every action-time external-effect unit requires structured, independently authenticated evidence. A digest without its correlated evidence object is insufficient. The evidence must bind the source, target, named rehearsal project, snapshot, unit, exact zero enabled denominator, inventory manifest, verification receipt identity, and verification receipt digest. Freshness is not caller policy: the versioned manifest contract fixes the maximum at 7,200 seconds, and each evidence object must repeat that exact value without raising or substituting it. Evidence identities, coverage digests, structured-evidence digests, authentication-result identities and digests, and verification-receipt digests must be unique. Reuse of a source receipt, inventory, observation, compatibility, or enclosing manifest digest is circular proof and fails closed. Raw bodies, headers, payloads, URLs, secrets, identities, and machine paths are forbidden.

Authentication uses deterministic, domain-separated Ed25519 verification against a public trust anchor pinned by the versioned source contract. Before cryptographic verification, the action document's complete policy, including policy version and status, key identity, public-key material and digest, verifier reference, algorithm, signature domain, and anchor status, must exactly equal the immutable source-authorized policy. Caller-supplied policy or key substitution is never an override path. Signed bytes bind the manifest identity, effect unit and evidence identity, complete observation subject, external receipt digest, verifier and key identity, verification timestamp, and result metadata. Authentication results keep lifecycle and cryptographic proof separate: `status` uses the closed platform vocabulary and must be `CURRENT`, while `verification.outcome` is the closed result `PASS`; neither field substitutes for successful signature verification. A `VERIFIED` label, recomputable digest, or caller-selected verifier is not authentication. Unknown aliases or case variants, omitted verification, `PASS` without a valid signature, a valid signature with a non-`CURRENT` lifecycle, unknown keys or verifiers, a wrong algorithm, malformed or mismatched public key, malformed or invalid signature, cross-effect replay, and any manifest/effect/observation/receipt/result substitution fail closed. The checked-in example intentionally leaves the operational anchor `BLOCKED` with no public key because this packet does not authorize production key installation. Deterministic RFC key material is confined to the direct verifier tests and cannot replace the action-time source policy.

The same trust boundary applies to the two-read zero-growth proof and the `pg_net` behavioral denominator. Zero growth is accepted only from a signed independent receipt that binds the protected source, target and disposable restore identities, rehearsal snapshot and run, two unique readback identities and UTC timestamps, canonical aggregate counts and readback digests, contract-owned freshness, independent receipt, and verification result. The signed counts must derive the claimed zero growth exactly; caller-authored hashes are not proof. `pg_net` behavioral acceptance likewise requires a signed disposable-run receipt binding extension identity, source and target versions, test-manifest identity and digest, all nine ordered named cases, expected and actual `PASS` outcome classes, per-case digests, observation time, and independent receipt. Missing, stale, future, malformed, cross-project, cross-run, cross-version, swapped, replayed, circular, unsigned, wrong-key, incomplete, unexpected, or failing evidence blocks rehearsal.

The manifest carries a closed protected-project identity set. It must contain exactly one identity correlated to the shared target and exactly one correlated to the DiscordOS source; a later action packet may add other explicitly protected source or production projects. Every reference must be a valid project identity and unique. The disposable rehearsal project must be valid, must correlate across the manifest, per-effect evidence, and restore receipt, and must not equal any protected identity. The protected-set comparison is data-driven from the manifest and does not add action-time provider identities as reusable-validator constants.

The action order is fixed:

1. Deny outbound network access.
2. Disable the Data API.
3. Withhold application credentials.
4. Withhold all Edge deployments.
5. Withhold scheduler activation.
6. Replay inert schema objects only.
7. Prove the complete external-effect denominator is zero.
8. Run only the separately admitted synthetic-sink compatibility tests.
9. Take two independently authenticated zero-growth readbacks more than two one-minute Cron intervals apart. Both observations must be within the closed 7,200-second freshness window at validation time; their signed aggregate counts and canonical readback digests must derive the exact zero-growth claim. Malformed, missing, future, stale, duplicate, non-monotonic, unsigned, self-correlated, or mismatched evidence fails closed. The exact freshness boundary is inclusive.

`apply_admitted` remains false. Scheduler activation, Edge deployment, secrets, aliases, provider writes, source pause, and production routing remain held. A `CURRENT` quarantine requires a disposable project outside the protected-project set, denied or synthetic-sink-only egress, zero Cron/queue/response/sink/Edge growth, fresh independent readbacks, current rollback evidence, and current behavioral evidence for `pg_net`.

The source uses `pg_net` 0.20.0 while the target currently offers 0.20.4. The intervening extension upgrade scripts declare no SQL-level changes, so static compatibility is `CURRENT`; behavioral compatibility remains `BLOCKED` in source. A disposable rehearsal must prove the function signature and return type, commit-triggered dispatch, single queue consumption, sink-only egress, timeout/DNS/invalid-scheme handling, HTTP failure capture, worker-restart deduplication, inactive-Cron zero growth, and that transient response history is not treated as durable evidence.

Rollback keeps egress denied, deactivates the scheduler first, removes credentials and routing, disables Edge routing, preserves queue/history and evidence, restores only a captured preimage or discards the named rehearsal, and leaves the DiscordOS source active. Broad drops, history deletion, source mutation, and inferred grants are not rollback mechanisms.
