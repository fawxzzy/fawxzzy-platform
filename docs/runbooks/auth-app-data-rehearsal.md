# Auth and application-data rehearsal

## Purpose

`contracts/v1/rehearsal/auth-app-data-rehearsal-contract.json` is the offline handoff contract for a future disposable-target Auth and application-data rehearsal. It closes the action-time evidence denominator across the existing Auth import, domain/session, application-data transport, mutation journal, product adapters, identity, membership, target-bootstrap, backup, and recovery contracts.

The source contract is `SOURCE_READY`. Execution remains `EXECUTION_BLOCKED`, `apply_admitted=false`, and provider authority remains false. The contract is not a provider runner, SQL executor, migration bundle, credential carrier, apply instruction, rollback authority, or disposal authority.

## Immutable source bindings

The contract binds 13 current source documents by path, version, and canonical JSON byte digest. Any path, version, content, ordering, or binding-set digest drift fails closed. The binding includes:

- shared Auth import and domain/session policy;
- generic application-data transport, mutation journal, and aggregate receipt;
- Mazer, Fitness, and DiscordOS adapter contracts;
- private identity-map and membership lifecycle contracts;
- disposable-target bootstrap, independent-backup, and micro-recovery contracts.

The gate binding in `contracts/v1/gates/migration-gate-state.json` marks only this source contract `CURRENT`. It does not promote execution, provider access, target apply, backup, recovery, or disposal.

Every CURRENT action receipt additionally binds the exact 122-migration package and governance identities, the complete contract-binding set, a separately admitted Auth/application-data rehearsal authority identity, an exact executor identity and capability, a distinct executor receipt, and three subject/run-bound prerequisite receipts: disposable-target bootstrap, independent backup, and micro-recovery capability. The canonical authority and executor subjects bind those values together. Each subject must also carry a domain-separated Ed25519 signature verified against a different public trust anchor pinned by the source contract. Recomputable hashes or caller-selected authority, executor, capability, key, verifier, or signature claims are not authentication.

The checked-in source contract intentionally keeps all four public trust anchors `BLOCKED` and uninstalled: rehearsal authority, executor capability, source write-barrier authority, and external write-barrier consumption evidence. A `CURRENT` rehearsal receipt is therefore impossible until a separately reviewed source packet installs four distinct public anchors; private signing material never belongs in this repository. This source contract remains explicitly unable to grant provider execution.

## Closed rehearsal denominator

### Auth

Every receipt must cover exactly one disposition for each of 20 Auth surfaces: users, identities, opaque password hashes, verification state, anonymous users, MFA factors/challenges/AAL, SSO, invites, recovery and change tokens, source sessions/tokens/cookies, both audit-log storage surfaces, signing/JWT configuration, provider Auth settings/credentials, OAuth server enablement and authorization path, OAuth registered clients/redirect URIs/secret rotation, OAuth authorizations/consents/codes, and OAuth/OIDC-issued token state.

`UNKNOWN` remains blocked. Source access tokens, refresh tokens, cookies, recovery tokens, invite tokens, and change tokens are not portable authorization. A target session is new, and AAL2 is unavailable without accepted factor proof. Raw password hashes, identities, settings, credentials, and provider responses are never serialized in the receipt.

### Application data

The relational denominator is exactly 41 declared relations:

- Mazer: 4;
- Fitness: 27;
- DiscordOS: 10.

The source classification remains 24 transported authoritative/history relations, one derived-rebuildable relation, and 16 held, unknown, or excluded relations. The receipt must also close one disposition for sequences/ownership, large objects, Storage metadata and object bodies, Realtime publications and replica identity, grants, RLS/policies, functions/ACLs, triggers, and extensions.

Storage object bodies require a separate authorized transfer and body-parity proof. Realtime publication membership, grants, RLS, function ACLs, trigger state, and extension defaults/installed versions are explicit evidence; they are not inferred from database row parity.

## Fixed action order

The contract fixes the following causal sequence:

1. bind the action-time subject, run, and exact source contracts;
2. require accepted disposable-target bootstrap plus backup/recovery prerequisites;
3. capture complete Auth and data `S0`;
4. deny external egress and withhold application credentials;
5. create Auth shells;
6. load Mazer, Fitness, then DiscordOS data;
7. capture complete `S1`;
8. enter a separately authorized write barrier whose contract version, target/run, complete contract and package identities, prerequisite set, source scope, authority identity, matching `onv1_` event/payload identity, fixed 900-second issue/authorization/observation/expiry window, and enter/release chronology are independently Ed25519-signed by the third pinned trust anchor; evaluate freshness against an injected trusted action-time value rather than receipt-owned validation time; and require the fourth trust domain to authenticate the exact `0 -> 1` external-ledger consumption of that event;
9. apply the `S1` diff and explicit tombstones;
10. capture final `S2`;
11. perform independent aggregate read A;
12. wait the declared observation window;
13. perform independent aggregate read B;
14. run every security, Auth, ownership, CAS, Storage, and egress negative probe;
15. activate accepted pending memberships only after both reads and every probe pass;
16. freeze the quarantined target.

Timestamps or high-water marks cannot replace complete primary-key and canonical-row denominators. Delete and resurrection are explicit. An unexpected target digest is quarantined and never overwritten.

## Identity and membership

`auth.users.id` remains the canonical human key. Every owner foreign key requires an accepted immutable mapping in `platform_private.source_identity_ledger`. Caller-selected identity, username/display equality, cross-project UUID equality, and raw identity data are not authority.

Imported membership begins pending. Activation requires accepted identity coverage, both independent parity reads, and the complete negative-probe gate. The receipt binds the activation timestamp, accepted pending denominator, remaining pending count, and aggregate evidence; activation before either final gate fails closed. Suspended membership remains suspended.

## Two-read parity and probes

Read A and read B must:

- bind the same action-time subject and run;
- use the same canonical expected-state query model;
- have distinct evidence receipts, reader identities, and execution identities;
- independently close every Auth, relational, and non-row denominator;
- be separated by 60 to 7,200 seconds;
- match each other and the expected aggregate commitment.

The expected aggregate is not caller-selected. It is deterministically derived from the action subject/run, exact contract and package identities, all 20 Auth surface commitments, all three adapter and 12 non-row commitments, the immutable identity ledger, and the complete final `S2` record. Changing any denominator without recomputing and reproducing the exact target state invalidates both reads.

The exact negative-probe set rejects source tokens/cookies, inactive quarantined identities, suspended users, unsupported AAL2, recovery/invite replay, ambiguous normalized identities, wrong-owner and direct-ID access, CAS conflicts, unauthorized Storage access, and external egress.

## Receipt and rollback boundary

The terminal receipt contains only counts, booleans, bounded ranges, timestamps, closed cohort labels, and one-way SHA-256 commitments. It forbids raw identities, rows, primary keys, UUIDs, emails, project references, credentials, tokens, cookies, password hashes, SQL, provider responses, Storage object bodies, and machine paths. Its terminal digest binds the complete aggregate receipt.

Rollback is reverse dependency and journal order with complete reverse evidence, zero source mutation, zero egress, and all source systems still active. The target remains `QUARANTINED_RETAINED`. Target disposal and credential revocation are separate provider authorities; broad dropping is not rollback.

## Verification

Run:

```text
node scripts/validate-contracts.mjs
node --test --test-concurrency=1 test/auth-app-data-rehearsal-contract.test.mjs test/contracts.test.mjs
npm test
npm run verify
```

The focused suite includes positive CURRENT receipt validation under deterministic test-only trust anchors and negative mutations for lifecycle/apply promotion, binding drift, coherent authority/executor/capability substitution, coherent write-barrier authority/scope substitution, stale/future/expired or relabeled authority events, wrong-role/subject/run signatures, trusted-clock substitution, unchanged replay after trusted expiry, authenticated replay after prior consumption, consumption-signature substitution, missing or duplicated Auth/non-row denominators, `UNKNOWN` promotion, snapshot/barrier order, identity coverage, independent read parity, security/Auth/egress probes, raw evidence leakage, rollback, disposal authority, and terminal digest drift.

Freshness and replay closure are external-input contracts. `receipt.validated_at` remains receipt data and is never the trusted clock. `AUTH_APP_DATA_WRITE_BARRIER_AUTHORITY_CONSUMPTION_V1` binds the injected trusted action time, subject/run/event/payload/authority receipt, a distinct observer, a positive external-ledger sequence, distinct ledger preimage/postimage commitments, and exactly one `UNCONSUMED_TO_CONSUMED` transition. Its observation and consumption timestamps equal the trusted action time, and its domain-separated Ed25519 signature is verified against the fourth pinned trust anchor. The source validator does not persist a ledger or perform provider work; the external authorized executor must supply fresh trusted time and authenticated ledger evidence.

The checked-in `BLOCKED` receipt is one canonical complete projection. The validator compares the entire receipt to it, while an exhaustive generated test mutates every leaf and empty denominator and requires rejection. No nested authority/executor signature payload, event, timestamp, scope, catalog/security/rollback evidence, or other placeholder can become nonzero or `CURRENT` under a `BLOCKED` outer receipt. Test-only private keys never enter the source contract or receipt example.

## Provider facts remain external evidence

Supabase Auth users can carry multiple identities, MFA has factor and assurance-level state, Auth audit events can exist in the Auth database and external log storage, and Auth can act as an OAuth 2.1/OIDC provider with registered clients, authorization/consent state, and issued tokens. Database backups do not carry Storage object bodies. Realtime Postgres Changes depends on publication membership. Those surfaces therefore remain explicit action-time denominators rather than assumptions.

Current provider documentation:

- <https://supabase.com/docs/guides/auth/identities>
- <https://supabase.com/docs/guides/auth/auth-mfa>
- <https://supabase.com/docs/guides/auth/audit-logs>
- <https://supabase.com/docs/guides/auth/oauth-server>
- <https://supabase.com/docs/guides/auth/oauth-server/getting-started>
- <https://supabase.com/docs/guides/platform/backups>
- <https://supabase.com/docs/guides/realtime/postgres-changes>
- <https://supabase.com/changelog>
