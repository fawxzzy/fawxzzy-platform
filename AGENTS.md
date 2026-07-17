# Repository operating contract

## Scope

This repository is the public, secret-free source of truth for the consolidated Fawxzzy platform contracts. It is contract-first and repository-only.

## Safety boundaries

- Never connect, link, query, or mutate a Supabase project from repository tooling.
- Never deploy or alter Vercel, production, source projects, or owner repositories.
- Store Supabase project references only. Never store keys, tokens, passwords, connection strings, environment files, user data, or remote link state.
- Keep product data in `discordos`, `fitness`, or `mazer`; keep explicitly shared identity contracts in `platform_shared`; keep privileged helpers in `platform_private`; create no product tables in `public`.
- Treat membership as service activation, never as billing entitlement.
- Never authorize from user-editable metadata.
- Keep migration, cutover, source pause, and deletion operations blocked until their versioned gates explicitly admit a later packet.

## Change discipline

- Make the smallest coherent contract change.
- Update schemas, examples, semantic validation, negative tests, ADRs, and runbooks together when behavior changes.
- Preserve deterministic JSON formatting and LF line endings.
- Use only these status values: `CURRENT`, `REQUIRED`, `OWNER_DECISION`, `BLOCKED`, `UNKNOWN`, `NOT_APPLICABLE`.
- Generate executable migration SQL only in a separately authorized and verifiable packet.

## Verification

Run the repository's focused contract validation and full verification commands before committing. A change is incomplete if schema, semantic, deterministic-output, path-allowlist, LF/JSON, secret, or machine-path checks fail.
