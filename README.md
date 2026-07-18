# Fawxzzy Platform

Durable, public, secret-free contracts for consolidating DiscordOS, Fitness, and Mazer onto one target Supabase platform while preserving product isolation and source provenance.

## Frozen platform boundary

- Target project ref: `bxtcuhkotumitoqtrcej`
- Source refs: DiscordOS `nwexsktuuenfdegzrbut`, Fitness `lpswxoyfniocuhljgzbc`, Mazer `geknvnrmktchljnyddwp`
- Shared objects: `platform_shared`
- Privileged, non-exposed objects: `platform_private`
- Product objects: `discordos`, `fitness`, and `mazer`
- `public`: no product tables

The project refs are identifiers, not credentials. This repository contains no keys, passwords, tokens, connection strings, user records, provider link state, or executable target migrations.

## Identity and activation

One person maps to one target `auth.users` identity and one global profile. Service membership uses the idempotent states `pending`, `active`, and `suspended`. A global signup may create pending memberships for discoverable services. The first authenticated Fitness or Mazer visit atomically activates or reuses the membership and creates or reuses its product profile.

Human accounts use one globally unique canonical username and one immutable global `user_number`. Fitness is the initial canonical source for matched human profile fields and existing accepted Fitness numbers are preserved exactly. Username matching is never identity evidence by itself. All username/number backfill writes remain blocked pending the separately verified migration gate.

Membership is not billing entitlement. Product-owned entitlement contracts remain in their product schemas, and authorization never trusts editable user metadata.

## Domains and sessions

- `fawxzzy.com`: hub
- `www.fawxzzy.com`: redirect to the hub
- `account.fawxzzy.com`: neutral shared account origin
- `fitness.fawxzzy.com`: Fitness origin
- `mazer.fawxzzy.com`: Mazer origin

Phase 1 shares Auth identity and database contracts but keeps browser sessions per origin. Cross-origin SSO is deferred and `BLOCKED`. Production redirect and recovery destinations are exact contract values; this repository does not change provider configuration.

Email/password is the phase-one method: verification off, leaked-password protection required, and minimum length 10. Account surfaces must support at least 64 characters, preferably 128 or more, without truncation or a restrictive application cap. The neutral account origin owns shared sign-in, sign-out, account updates, and recovery.

## Contract layout

- `contracts/v1/schemas`: JSON Schema 2020-12 definitions
- `contracts/v1`: versioned registries, lifecycle contracts, examples, security matrix, and gates
- `contracts/v1/recovery`: blocked, sanitized backup and restore contracts for the approved Micro posture
- `docs/adr`: durable architecture decisions
- `docs/runbooks`: migration, cutover, rollback, and retirement program
- `scripts` and `test`: deterministic schema, semantic, repository, and negative validation

## Recovery boundary

FP-MAN-013 keeps the shared target on Pro/Micro with provider daily Physical backups retained for seven days. Before shared Auth or application data is loaded, the platform requires an independently governed encrypted export and a quarantined restore-to-new-project rehearsal.

Recovery receipts are aggregate-only and secret-free. Client-side streaming encryption must occur before destination delivery; persistent plaintext is forbidden. Database recovery does not imply Storage object-body recovery, Auth control-plane parity, Edge/Realtime configuration, or safe external effects. Those units stay separate and fail closed.

Exact cadence, retention, destination, key installation, alert channel, export/Auth mechanism, numerical RPO/RTO, provider readback, and restore cost remain `UNKNOWN` execution gates. This repository contains no backup scheduler, provider command, restore automation, or credentials.

## Verification

Requires Node.js 22 or newer.

```text
npm ci
npm run validate
npm test
npm run verify
```

Validation covers schemas, cross-contract semantics, deterministic output, LF and canonical JSON, the path allowlist, and secret/machine-path scans.

## Lifecycle truth

`target_writes`, `data_import`, `auth_import`, `vercel_env_cutover`, `production_deploy`, `source_pause`, and `source_deletion` are all `BLOCKED`. Source and target projects remain active. Recovery execution and migration SQL generation are separately authorized packets, not part of this repository bootstrap.

Status values are closed to `CURRENT`, `REQUIRED`, `OWNER_DECISION`, `BLOCKED`, `UNKNOWN`, and `NOT_APPLICABLE`.
