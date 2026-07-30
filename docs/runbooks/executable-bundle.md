# Executable bundle source contract

## State

The repository contains a deterministic, content-addressed promoted byte set for review. It remains `SOURCE_READY`, `EXECUTION_BLOCKED`, and `apply_admitted=false`.

The word executable describes the future input representation only. It does not grant an executor, a target, credentials, provider connectivity, SQL execution, deployment, or production authority.

## Deterministic promotion

`npm run executable-bundle:generate` copies exactly four merged inert SQL artifacts, in their frozen order, to `bootstrap/artifacts/executable-sql/`. Each output must be byte-for-byte identical to its source. The generator can write only those four outputs and the manifest.

The manifest binds:

- the exact 122-migration package and separate governance identity;
- every source and promoted path, byte count, SHA-256 digest, statement count, and ordered aggregate;
- current bootstrap, Auth/application-data, Storage/Edge/Realtime, backup, and security contracts;
- expected-effect, statement-disposition, and source-object evidence;
- the generator and verifier toolchain;
- aggregate-only redaction rules and action-time placeholders.

The promoted directory must contain exactly four files. No SQL may appear under `supabase/migrations` or another provider-discovered migration location.

## Verification

Run:

```text
npm run executable-bundle:verify
npm run validate
npm test
npm run bootstrap:verify
npm run verify
```

Verification fails closed on substitution, order or path drift, a fifth file, stale bindings, target/run serialization, executor or provider promotion, SQL discovery leakage, or any mismatch between inert and promoted bytes.

## Future execution boundary

A later execution packet must separately supply reviewed bundle evidence, target/run identity, authenticated authority, executor capability, fresh target preimage, rollback and inverse evidence, and the action-time security and external-effect gates. This source contract supplies none of those permissions. Receipts must remain aggregate- and digest-only.
