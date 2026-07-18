# ADR 0002: inert target-bootstrap namespace package

- Status: CURRENT
- Decision date: 2026-07-17
- Apply admitted: false

## Context

The consolidated platform needs a reproducible schema source before any target project can be changed. The accepted source boundary is 122 immutable migrations: 17 DiscordOS migrations, 101 Fitness migrations, and 4 Mazer migrations. They are evidence inputs, not an instruction to replay historical side effects.

The three histories contain product objects that were originally created in different namespace conventions, 358 top-level data effects, 11 catalog-dependent dynamic templates, three extension declarations, and one Cron activation. Fitness also has a forward global-number dependency that remains blocked on an unmerged source candidate and contained replay acceptance.

## Decision

The repository stores the exact raw migration bytes under `bootstrap/sources`. Each byte stream is bound to its source app, commit, tree, path, Git blob, raw digest, byte count, and order in `source-migrations.v1.json`. The accepted combined-manifest digest and each source-chain digest are frozen separately from the repository package digest.

The target namespace is closed:

- `public` contains no product tables. A public RPC requires a later control-plane and security proof.
- `platform_shared` is limited to reviewed shared identity and service contracts.
- `discordos`, `fitness`, and `mazer` own product objects.
- `platform_private` and `discordos_private` are unexposed helper schemas.
- `auth`, `storage`, `extensions`, `realtime`, and other provider schemas are managed prerequisites and are never recreated from application history.

Generation is fail-closed. Fitness and Mazer `public` product identities are rewritten to their owning product schema. The ten Fitness deny policies are expanded into exact static identities. Top-level data effects, all catalog-dependent dynamic identities, extension activation, the DiscordOS scheduler boundary, network-capable helpers, SECURITY DEFINER source functions, and Fitness number transformation are omitted or held. The DiscordOS generated database slice stops before the scheduler boundary.

The generated files begin with `APPLY_ADMITTED=false`. They are reviewable derived inputs for later contained replay work. They do not establish target readiness or apply authority.

## Security boundary

The merged identity contract remains authoritative for target-only relation, grant, policy, and function expectations. This package emits schema and closed expectation overlays but does not invent missing table columns or function bodies. In particular:

- no product object is created in `public`;
- private schemas receive no browser-role grants;
- PUBLIC function execution is not admitted;
- extension and provider-managed object creation is absent;
- no top-level data effect, Cron activation, network hook, project binding, provider command, or credential value is emitted;
- membership remains distinct from billing entitlement;
- the global-number transformation remains `BLOCKED`.

Supabase now treats table grants as an explicit concern separate from RLS policy design, so the target direction is explicit grants with deny-by-default schema posture. SECURITY DEFINER helpers must stay private or be narrowly allowlisted with fixed search paths and caller checks. These are source expectations only; Data API exposed-schema settings remain a later control-plane gate.

## Constraint identities

The accepted constraint denominator is 281 units: 158 named catalog identities and 123 unnamed source units. Static source parsing retains candidate identities and exact provenance, but final provider-generated names and the remaining catalog-dependent delta stay `BLOCKED` until two contained replay catalogs are byte-identical. The generator never guesses those identities to make a package appear executable.

## Consequences

This package can be reviewed and reproduced without a Supabase session or runtime installation. It cannot be applied safely. A later packet must close contained replay, provider prerequisites, target security, Data API/Auth control-plane, identity/data load, Edge/Cron activation, application cutover, and retirement gates in order.

## Primary references checked

- [Supabase local migrations](https://supabase.com/docs/guides/local-development/overview#database-migrations)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Supabase function security](https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker)
- [Supabase explicit table grants change](https://github.com/orgs/supabase/discussions/35654)
