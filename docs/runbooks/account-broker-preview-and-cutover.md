# Account broker Preview and cutover runbook

Status: source-only and blocked

This runbook prepares the serial account-broker rollout. It does not apply a database migration, configure Supabase, install credentials, deploy Vercel, change DNS, touch user data, or activate production.

## Prerequisites

- Shared-target Wave 4 has a complete, settled postimage.
- The account shell, broker schema packet, and each product adapter have clean exact-head reviews.
- One immutable provider preimage records Auth Site URL, exact redirect allowlist, session policy, target project selection, and rollback values without secret material.
- Managed CAPTCHA is installed and read back for public signup and password reset; synthetic proof covers both flows without exposing configuration or credentials.
- The account origin and each product origin have reproducible Preview builds.
- Synthetic test identities and isolated product memberships are prepared; no live user is used.
- Provider effects, email delivery, publication, analytics collection, and unrelated product writes are quarantined.

## Browser flow

1. The product creates a random state value and PKCE verifier, stores them in a secure short-lived same-origin transaction cookie, and sends only the state and S256 challenge to the account start route.
2. The account start route resolves the client from the fixed registry and rejects any unlisted return destination before rendering a surface.
3. The account origin authenticates or creates the canonical user, atomically creates the required global profile and immutable user number with the username claim when required, and verifies the requested service context without using that context as authorization.
4. The broker creates one encrypted, expiring server-side exchange record and redirects with only the opaque one-time code plus state.
5. The product callback compares state, redeems the code server-to-server with the PKCE verifier, and rejects any mismatch, expiry, replay, wrong audience, wrong redirect, or source-project token.
6. The product writes only its own origin-scoped session, removes callback parameters from browser history, and navigates to the exact validated return path.

## Required negative proof

- unknown client;
- unlisted or absolute return URL;
- state mismatch;
- PKCE mismatch;
- omitted or downgraded PKCE method;
- expired exchange;
- replayed exchange;
- wrong client or redirect;
- identifier responses that enumerate a known versus unknown email or username;
- a pending exchange redeemed after account-wide revocation;
- source-project token;
- access, refresh, JWT, or recovery token in the URL;
- provider exception containing credential-, URL-, control-, or instruction-shaped text.

Every case must fail before product session creation. Browser output and receipts remain categorical and non-echoing.

## Required positive proof

- one account session establishes a FawxzzyWeb session;
- one account session establishes a Fitness session;
- one account session establishes a Mazer session;
- username and email sign-in resolve the same canonical identity without identifier disclosure;
- signup atomically claims one canonical username and creates no duplicate identity;
- signup atomically creates the required `platform_shared.global_profiles` row and immutable user number with the username claim;
- a failed redemption leaves the exchange available for the one legitimate redemption with correct bindings;
- reset request, callback, new password, and validated return context complete centrally;
- product sign-out clears only that origin;
- confirmed account-wide revocation invalidates selected or all server sessions and rejects every pending exchange bound to a revoked account session.

## Serial Preview order

1. FawxzzyWeb account shell and broker.
2. Mazer adapter.
3. Fitness adapter.

At each stage, capture the exact source identity, deployment identity, environment binding, browser console/network privacy proof, membership/RLS reachability, session ownership, callback scrubbing, and rollback result. A failure stops the sequence without changing the remaining products.

## Activation hold

Production remains blocked until all activation gates in `contracts/v1/auth/account-broker-contract.json` pass and the operator grants current, per-project production authority. A source contract, Preview proof, or one product cutover never authorizes another product or a later deployment.

## Rollback

Restore the exact product environment preimage and prior product-local account entry behavior. Revoke synthetic broker sessions and delete only synthetic exchange residue under separately admitted provider authority. Preserve the account broker source and evidence for diagnosis. Do not re-enable source fallback inside a target-mode product.
