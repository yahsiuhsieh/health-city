# HealthCity

HealthCity turns Google Health records into an explorable 3D daily life record.
The accepted architecture uses a browser-rendered React/R3F application and a Cloudflare Worker with Static Assets and D1.
The frontend and data pipeline are not implemented yet.

## Backend

The Worker is deployed at [healthcity.yahsiu.workers.dev](https://healthcity.yahsiu.workers.dev).
The Cloudflare dashboard listed the Workers Free plan on November 9, 2026.

| Route | Current behavior |
| --- | --- |
| `GET /health` | Reports backend availability |
| `GET /` or `GET /auth/status` | Displays sign-in or current session status |
| `POST /auth/google/start` | Starts Google authorization with state, PKCE, and an OpenID Connect nonce |
| `GET /auth/google/callback` | Consumes the pending flow, checks Google identity, saves authorization, and creates a session |
| `GET /api/session` | Checks session validity without extending its lifetime |
| `POST /api/session/activity` | Records an explicit user interaction for the idle deadline |
| `POST /auth/logout` | Deletes the current HealthCity session and preserves Google authorization |
| `GET /settings/disconnect` | Displays the owner-only clearing confirmation page |
| `POST /auth/disconnect` | Revokes Google authorization, then clears all app-held connection data |
| `GET /checks/health` | Displays the owner-only date and time-zone form without calling Google |
| `POST /checks/health/run` | Checks the eight accepted core health streams in one manual run |

The original RHR-only check was deployed on November 14, 2026.
The combined check replaced that workflow on November 14, 2026.
Online checks passed for session requirements, origin restrictions, HTTP method restrictions, and script and stylesheet delivery.
The user reported a successful live run of the combined workflow on the same date.
The November 4 browser result displayed seven complete stream reads and a heart-rate read limited to 3,000 samples.
Full-day heart-rate retrieval remains incomplete. App comparison is an optional diagnostic, not a manual acceptance prerequisite.
On November 14, 2026, the user reported a successful live RHR check and agreement with the source app.
This single-date check exercised token refresh, account linkage, and retrieval of one `WITH_SLEEP` record.
Other dates, missing-data cases, and calculation-method differences remain unverified.

The callback address for the Google Web application client is:

```text
https://healthcity.yahsiu.workers.dev/auth/google/callback
```

Google Cloud project `healthcity-514202` has this exact address registered for its `HealthCity` Web application client.
The saved redirect URI was checked in the Console on November 9, 2026, after the user created the client.
JavaScript origins are not necessary for this backend callback.
Client creation, token exchange, and a successful account connection are separate operations.
Do not store credentials in this repository or paste them into chat.

The user authorized OAuth activation and a live sign-in check on November 13, 2026.
The Worker now uses `AUTH_ENABLED=true`. The deployed page displays the Google sign-in button.
Chrome form submission and redirection to Google's page for account selection passed.
Live Google sign-in, callback handling, and token exchange passed on November 13, 2026.
The browser session endpoint returned `authenticated: true` after sign-in.
The logout check deleted the HealthCity session and preserved the Google connection, as checked through aggregate D1 counts.
The user-reported manual RHR check subsequently established Google Health access for one source date.
Authentication routes fail closed when required configuration is absent. `/health` remains available.
The manual health check uses health-data API requests only after an explicit submission.
Automatic synchronization is not implemented.

## Authentication and storage

The Worker requests `openid`, `email`, and three Google Health read-only scopes: activity/fitness, health metrics/measurements, and sleep.
OpenID Connect checks the owner's identity. Sign-in alone does not read health records.
Older connections with only the metrics scope require renewed consent and a new refresh token.
The Worker checks Google's ID-token signature, issuer, audience, expiry, nonce, and verified owner email.
It pins the first accepted Google subject and rejects a different subject on subsequent sign-ins.

The dedicated `healthcity` D1 database contains OAuth flows, sessions, and one encrypted Google connection.
See [the field inventory](docs/data-sources.md#authentication-storage) before changing persisted data.
`migrations/0001_auth.sql` defines the schema. Apply later schema changes through new migrations.
Testing uses the existing Cloudflare Free account and D1 Free. No paid upgrade occurred.

OAuth flows have ten-minute validity and atomic single-use consumption.
The browser holds a separate random Secure HttpOnly flow cookie. D1 stores its hash and the state hash.
Google refresh tokens use AES-256-GCM encryption with a separate Cloudflare secret.
Access tokens and ID tokens remain in request memory. The browser never receives Google tokens.
Worker observability is disabled. The handler does not log requests, callback parameters, or provider errors.
HTML pages use a same-origin referrer policy so browser forms retain their Origin header.
Their form policy permits only this origin and Google Accounts, including the OAuth redirect after form submission.
Callback redirects retain `no-referrer` to suppress callback URLs in subsequent requests.
Failed sign-ins display a generic message. They never reflect Google's raw response or token values.

HealthCity session cookies contain random identifiers. D1 stores only their hashes.
The Worker enforces thirty-minute idle expiry and seven-day absolute expiry.
Only explicit activity requests extend the idle deadline. Status requests do not extend either deadline.
Same-origin checks protect state-changing requests. Each successful sign-in issues a fresh random session identifier.
Logout preserves the Google connection.

The Settings link opens `Clear HealthCity Data and Disconnect` for a signed-in owner.
Opening this confirmation page does not clear data. Its explicit same-origin POST submits the clearing request.
The Worker decrypts the refresh token in memory and sends it to Google's revocation endpoint in the POST body.
HTTP 200 or an explicit `invalid_token` response permits one transaction to clear flows, sessions, and the connection.
Other revocation failures preserve local state for a manual retry. The Worker does not retry automatically.
An in-flight callback can save a session only while its claimed flow still exists. Clearing cancels these flows.
There are no health-history tables or synchronization jobs yet. New persisted features must extend this clearing transaction.
Google Health source records, application secrets, and the database schema remain unchanged.
Cloudflare recovery history can retain earlier encrypted records for seven days on the Free plan.
Google revocation can affect other OAuth clients in this same Google Cloud project.
See the [storage inventory](docs/data-sources.md#authentication-storage) for scope and failure behavior.

`0002_claimed_oauth_flows.sql` adds one callback-lifecycle flag without deleting existing data.
The user applied this migration on November 14, 2026. A remote migration check found no pending migrations.
The clearing workflow deployment passed on the same date.
HTTP checks passed for backend availability, session requirements for both clearing routes, and rejection of GET requests to the clearing action.
The user reported that the clearing workflow works. Independent checks of live revocation and D1 clearing remain pending.

## Combined read-only health check

For an authorized live check:

1. Sign in to HealthCity.
2. Select `Check health data`.
3. Select one source date and its IANA time zone.
4. Renew Google authorization if the connection lacks any of the three required read-only scopes.
5. Select `Run all read-only checks`.
6. Inspect the stream statuses, dates, units, methods, and session times.

The form uses the browser's time zone as an editable initial value. The Worker checks the selected date and zone.
`@js-temporal/polyfill` derives calendar-day boundaries, including 23-hour and 25-hour days. It does not change the global runtime.
RHR and HRV keep their source civil date. Intraday queries use UTC instants derived from the selected zone.
Exercise filters use source civil dates. The result displays UTC session boundaries for comparison with the selected zone.

The Worker refreshes access once and checks `users/me/identity` once before the eight stream checks.
The initial inspection reads up to three pages per stream. Partial streams can continue in explicit batches. Daily summaries and sessions use 25 records per page. Other streams use 1,000.
A run makes at most 26 Google requests, with no automatic retries or redirect following.
Each request has a ten-second timeout. The stream sequence has a 45-second limit after refresh and account linkage.
Quota, network, authorization-expiry, or sequence-timeout failures stop remaining requests. Other stream failures remain separate.
The summary distinguishes complete reads, partial reads, failures, and skipped requests. Empty results do not establish missing source data.

| Stream | Read method | Inspection output |
| --- | --- | --- |
| Daily RHR | `reconcile` | Source date, bpm, and separate calculation methods |
| Daily HRV | `reconcile` | Source date and optional average HRV in milliseconds |
| Total calories | Five-minute `rollUp` | Total kcal, including basal metabolism, with zero distinct from unavailable values |
| Steps | `reconcile` | Complete source intervals and step counts |
| Heart rate | `reconcile` | Five-minute sample means, counts, and first/last sample times |
| Sleep | `reconcile` | Complete intersecting sessions, stage chronology, and separate short awakenings |
| Exercise | `reconcile` | Complete intersecting sessions, completion time, active seconds, pause events, and optional vigorous/peak seconds |
| Heart rate zones | `reconcile` | Zone intervals without an inferred intensity or saturation score |

Filters use snake case, such as `daily_resting_heart_rate.date`. JSON fields use camel case, such as `dailyRestingHeartRate`.
The calories endpoint uses POST for a read-only aggregation. This request does not create or change source records.
Sleep queries include sessions ending on the selected or following date. Exercise queries include starts on the previous or selected date.
The adapter keeps whole sessions that intersect the selected day. Unusually long sessions can extend beyond these bounded query windows.
This first inspection does not establish exhaustive session history, source reconciliation correctness, or complete sensor coverage.
A finished page sequence establishes only that pagination finished for that bounded query.
Google Health API responses are the authoritative product data. App and Takeout comparisons are optional diagnostics.
The initial three-page heart-rate limit can interrupt a five-minute bucket. Partial sample means must not become complete replay inputs.
The continuation workflow adds `Continue incomplete streams` for partial results across all eight streams. Deployment passed on November 14, 2026. Live continuation verification remains pending.
Each click reads up to ten additional pages. Each page uses a separate protected Worker request and at most two Google requests.
The Worker refreshes access and reads one page per request, using the original stream-specific page size and filters.
It returns normalized data and an opaque pagination cursor.
For heart rate, the browser combines integer sample sums and counts, rather than averaging page means. Overlapping sample spans stop the batch.
Other streams append normalized records, retain separate daily methods, and renumber sleep and exercise sessions across pages.
Only an empty next-page cursor permits a complete status. Failures preserve earlier aggregates in the current page for an explicit retry.
Reloading the page does not preserve continuation progress. No health records or continuation state enter D1.
Google pagination cursors remain in browser memory. They are not OAuth access or refresh tokens and cannot authorize a Google request.

Raw responses, health records, identity responses, and tokens remain in request memory. They do not enter D1 or application logs.
The browser receives normalized inspection fields, fixed messages, and continuation cursors for partial streams. Response headers prohibit caching.
The Worker checks session validity before each stream and before returning results. Disconnecting prevents a successful result.
The browser script displays progress and prevents duplicate submissions. Explicit continuation clicks start bounded requests to the same-origin Worker.
Only the initial request in each clicked batch records user activity. Later requests do not extend the idle deadline.

Session cookies authorize HealthCity requests. Google refresh tokens authorize backend access to Google.
Refresh never creates a HealthCity session. Session expiry requires sign-in again.
Use `Google authorization` on the check page to renew consent after access expires or permissions change.

References: [refreshing access](https://developers.google.com/identity/protocols/oauth2/web-server#offline),
[account linkage](https://developers.google.com/health/reference/rest/v4/users/getIdentity),
[reconciliation](https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints/reconcile),
[rollups](https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints/rollUp),
and [filter naming and daily dates](https://developers.google.com/health/filters).

## Required configuration

`wrangler.jsonc` records the non-secret origin, public Google client ID, and OAuth activation flag.
These values are separate from Cloudflare secrets:

| Secret | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_SECRET` | Authenticates the server's token exchange with Google |
| `OWNER_EMAIL` | Restricts sign-in to the owner selected by the user |
| `TOKEN_ENCRYPTION_KEY` | Encrypts refresh tokens, using 32 random bytes encoded as base64url |

The owner and encryption-key secrets are configured without storing their values in this repository.
Do not replace the encryption key while encrypted connection data exists without a key-migration plan.
Set the Google client secret through the hidden terminal prompt:

```sh
npm run secret:google
```

Do not paste the secret into chat or command-line arguments.
While the Google client is in Testing mode, add the owner account to the project's Test users list.
Project ownership alone does not replace this requirement. See [Google setup](https://developers.google.com/health/setup).
The current deployment has live-connection authorization and uses `AUTH_ENABLED=true`.
Set this flag to `false` and deploy when sign-in needs to be disabled.
Starting sign-in then contacts Google. It does not read health records or establish Google Health account linkage.
Testing-mode Google refresh tokens can expire after seven days. Handle a later refresh failure without deleting retained history.
See [Google OAuth](https://developers.google.com/identity/protocols/oauth2/web-server) and [OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).

## Development

Use the Node version in `.nvmrc` and the existing npm workflow.
Install the locked project dependencies with `npm ci` when dependencies are absent.

```sh
npm run typecheck
npm test
npm run test:runtime
npm run build
```

TypeScript checks types without emitting files. Vitest checks routing, real signed ID tokens, and authentication against in-memory SQLite.
Tests apply the real SQL migration and replace Google HTTP responses. They do not call Google or the live D1 database.
The runtime tests bundle the production Google modules and execute them in local workerd, with all external responses mocked.
They use temporary loopback sockets and close the runtime after each test.
The token request uses `redirect: "manual"` and rejects redirect responses. Workers does not support `redirect: "error"`.
These checks do not establish a successful browser login or measured Free-tier runtime performance.
The build command uses Wrangler's `--dry-run` and writes a local bundle to `dist/worker`. It does not deploy.
There is no configured lint command yet.

Run `npm run dev` only when a local server is needed and startup has authorization.
Run `npm run deploy` only when a deployment has authorization.
Wrangler uses the existing Cloudflare login. The project commands disable telemetry and keep logs in `.wrangler/logs`.

## Source map

- `src/worker/index.ts` handles backend HTTP requests.
- `src/worker/auth.ts` handles sign-in, callback validation, sessions, activity, and logout.
- `src/worker/google.ts` constructs Google requests and checks signed ID tokens with `jose`.
- `src/worker/google-health.ts` checks account linkage and bounds API pagination for eight core streams.
- `src/worker/health-data.ts` derives time-zone boundaries and converts source records into inspection tables.
- `src/worker/heart-pages.ts` combines heart-rate aggregates without retaining original samples.
- `src/worker/inspection-pages.ts` combines normalized continuation results for all eight streams.
- `src/worker/health-check.ts` renders the combined form and results, and supplies its browser script and stylesheet.
- `src/worker/store.ts` contains D1 authentication queries and session deadlines.
- `src/worker/security.ts` handles random values, hashes, cookies, and token encryption.
- `src/worker/*.test.ts` checks routes, identity verification, persistence, and authorization boundaries.
- `src/worker/google.runtime.test.ts` checks exchange, refresh, revocation, health reads, and redirect rejection in the Workers runtime.
- `migrations/` defines the authentication schema and additive callback-lifecycle changes.
- `wrangler.jsonc` selects the Worker entry point, Cloudflare account, URL settings, and runtime compatibility date.
- `tsconfig.json` checks backend source with web API types. `tsconfig.test.json` also checks Node-based tests. Both exclude the standalone OAuth exercise.
- `package.json` declares tools and commands. `package-lock.json` records resolved dependency versions.
- `learning/oauth-callback/` preserves the earlier isolated OAuth concept exercise. Production code does not import it.
- `docs/product-spec.md`, `docs/data-sources.md`, and `docs/adr/` contain accepted behavior and architecture decisions.
