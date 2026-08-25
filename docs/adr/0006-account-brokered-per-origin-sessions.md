# ADR 0006: Account-brokered per-origin sessions

Status: source contract current; runtime, provider, Preview, and production activation blocked

## Context

FawxzzyWeb, Fitness, and Mazer need one account experience without maintaining three independent copies of credential, reset, username, messaging, and session behavior. Browser cookies and storage remain origin-scoped, so one shared identity does not create a usable session on every product origin.

The existing domain contract deliberately keeps cross-origin SSO blocked while allowing a future PKCE code exchange or one-time backend exchange. The target architecture requires `account.fawxzzy.com` to broker sign-in while each product receives its own scoped session. Access tokens, refresh tokens, and JWTs must never travel in a URL.

## Decision

Use one account template per surface at `account.fawxzzy.com`. The caller selects only a validated product context. Context may change product title, theme, return destination, and policy supplement links; it cannot change credential validation, username rules, reset behavior, session security, or the fixed user-message vocabulary.

Each product starts an account flow with:

- a registered client identifier;
- an exact allowlisted return path;
- a high-entropy state value;
- an S256 PKCE challenge;
- an admitted intent.

After the account origin verifies the user, it issues a high-entropy one-time authorization code. Only the SHA-256 code digest is retained. The record binds the verified Auth user and session, client, redirect URI, PKCE challenge, issue time, and expiry. Session material is ephemeral, encrypted server-side, never logged, never included in receipts, and returned only to the redeeming product backend after atomic code consumption and PKCE verification.

Each product then creates or updates only its own origin-scoped session. Products never share refresh cookies, never accept source-project tokens after target cutover, and never silently fall back to a legacy source project.

Username sign-in resolves email or the canonical global username server-side without disclosing whether an identifier exists. Signup requires email, username, and password. The shared username syntax is 2-15 ASCII letters, numbers, periods, underscores, or hyphens; availability checks are advisory and final creation or rename uses one atomic server-side claim.

Recovery remains centralized. Reset links use the verified account reset route `https://account.fawxzzy.com/reset-password?recovery=1`; the account origin owns the new-password surface, and validated server state restores product context. Recovery tokens are forbidden in application-generated URLs.

Sign-out is explicit. A product clears its own origin session. The account surface may revoke selected or all server sessions after confirmation, but it cannot silently delete cookies belonging to other origins.

## Security boundary

The broker relation belongs in `platform_private`, remains outside the Data API, enables and forces RLS as defense in depth, stores no plaintext code or session material, and exposes no function grants to `PUBLIC`, `anon`, or `authenticated`. This repository includes no executable migration, secret, credential, provider link, or runtime configuration.

Account context is presentation and navigation, never authorization. The verified Auth subject and server-owned membership state remain authoritative. Username, email, display name, member number, and product context are never sufficient identity or authorization evidence by themselves.

## Activation sequence

1. Complete and settle the shared-target Wave 4 postimage.
2. Review the account shell at one exact source head.
3. Review the private exchange relation and functions as a separate executable migration packet.
4. Capture the exact Auth URL/provider preimage.
5. Prove the broker with synthetic users in Preview, including all negative probes.
6. Prove source-token rejection and rollback.
7. Cut over FawxzzyWeb, Mazer, and Fitness serially, preserving independent deployment and rollback gates.
8. Obtain separate current production authority for each product deployment.

No step is activated by this ADR or its source contract.

## Consequences

- Account screen behavior has one implementation source instead of three drifting copies.
- Product branding remains contextual without becoming a security decision.
- Every product still owns a scoped browser session and can deploy or roll back independently.
- The broker adds a short-lived private exchange record and two privileged server operations that require separate schema, provider, Preview, and production proof.
- Existing product-local auth remains authoritative until each serial cutover is proven and admitted.

## References

- Supabase user sessions and refresh-token rotation guidance
- Supabase server-side PKCE guidance
- Supabase exact redirect URL guidance
- `contracts/v1/auth/domain-session-contract.json`
- `contracts/v1/auth/account-broker-contract.json`
