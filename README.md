# HealthCity

HealthCity turns Google Health records into an explorable 3D daily life record.
The accepted architecture uses a browser-rendered React/R3F application and a Cloudflare Worker with Static Assets and D1.
The frontend contains a harbor with pedestrians, road traffic, and an HRV skyline. The default scene uses synthetic data.
A manual day replay for HRV, steps, and total energy is available behind a Worker flag. Automatic synchronization and stored replay history are pending.

## Frontend foundation

The local homepage now uses React, React Three Fiber, Three.js, and Vite.
It loads one reusable working boat from `public/models/city-working-boat.glb`.
The 20 m working boat and the 58 m freighter share one harbor. The freighter uses the cargo berth with its crane, forklift, and flatbed truck.
A street graph connects Ridge Road, Market Avenue, the civic plaza, and the waterfront. Permanent mid-rise buildings share blocks with 30 fixed HRV plots.
The adjacent skyline uses five tower models: Glass spire, Deco crown, Concrete terraces, Ribbon tower, and Brick crown.
Use **Scene view** to open the skyline, harbor, Market crossing, Market Avenue, or an individual design. Drag to orbit. Right-drag to pan. Scroll to zoom.
Selecting an asset opens its inspection card and pauses replay. The scene's inspection button opens the corresponding card with the keyboard.
Playback becomes available after the scene models load.

Select one of five synthetic dates in `America/Chicago`. The default date is November 15, 2026.
Each date starts paused at midnight. The camera and replay speed carry across dates. The initial speed is 240×.
Boat, crane, water, pedestrian, and traffic motion use the same replay controller.
Seeking restores motion directly from the selected replay time.
Camera controls remain available while replay is paused.
Hidden pages pause replay. Returning to the page requires an explicit Play action.
Frame intervals above one second also pause replay without advancing through the interruption.
This threshold is provisional. Primary-desktop measurements must calibrate it.

Day and Night are explicit material-review controls. They do not represent historical daylight or weather.
The Account link opens the authentication status page. The default scene uses the Worker's public synthetic HRV response.
The user approved the original Sleep Voyage v3 synthetic session on November 23, 2026. [Original acceptance record](design/visual-studies/sleep-voyage-v3/checkpoint-c/README.md#final-acceptance)

The user approved Checkpoint F on November 24, 2026, completing the harbor, wildlife, and card revisions. [Review 1 delivery record](docs/plans/sleep-voyage-v3-review-1.md)

The synthetic sleep voyage runs from November 11 at 23:00 to November 12 at 06:30, Chicago time.
Select **Sleep voyage** to follow the boat. Choose **Inspect sleep voyage**, then **Open sleep voyage**. Clicking the working boat on either voyage date or the revealed island also opens the card.
The chart pauses the replay when it opens. Press **Play** to watch the track grow, or move the replay slider. Select a colored interval or an anchor to inspect its stage, times, and duration.
The Sleep voyage card follows replay across midnight. The timeline and stage totals show the part of the session that has elapsed. At arrival, the card shows 7 h 22 min asleep and a 10,608 m² island. [Desktop and phone review](design/visual-studies/sleep-voyage-v3/checkpoint-f/README.md)

Select **Sleep island** to inspect the coral cay, reef platform, and jetty. Click the awakening buoy at 03:04 to inspect the interruption.
The 911.14 m outbound route passes north of the outer reef. The boat reaches the south jetty heading west. At 06:40, it casts off and returns south of the reef. It reaches the working quay at 07:40. [Harbor and route review](design/visual-studies/sleep-voyage-v3/checkpoint-d/README.md)
The harbor review includes the berth, departure, and return under both lighting settings. [Checkpoint A](design/visual-studies/sleep-voyage-v3/checkpoint-a/README.md)
The island review shows six cay sizes at a common scale and the boat leaving the jetty. [Checkpoint B](design/visual-studies/sleep-voyage-v3/checkpoint-b/README.md)
The recorded Google Health sleep feed still needs a scene integration.

### HRV skyline

The selected date supplies a daily HRV RMSSD value. The count is the value divided by 5 ms and rounded down.
The fixtures cover 20 towers at 103.7 ms, five at 27.4 ms, two at 12.8 ms, zero towers at 4.6 ms, and unavailable HRV.
A fixed district seed assigns the five designs to fixed plots. Each plot keeps its design across dates, page loads, and replay times.
The daily count fills the fixed plots in order. The first five sites face neighborhood streets. Further plots extend inland.
To see the larger district, select November 11 and click **World view**.
An individual tower view shows its design for comparison. The inspection card shows the daily HRV and the full count.
The current district can show 30 towers. Above this display limit, the app shows the number it rendered and the full count.
Each unoccupied plot keeps its older building, pocket park, or plaza. Select one to pause replay and inspect its HRV threshold. At zero towers all 30 interim forms appear. Unavailable HRV shows paved bases with wireframe tower envelopes.

The Worker provides example data through `GET /api/replay/daily-hrv?date=YYYY-MM-DD`.
The `GOOGLE_HRV_REPLAY_ENABLED` flag enables the **Google Health** source option. The flag starts disabled.
Select **Google Health**, choose one ended date, and click **Load day**.
The same-origin POST to `/api/replay/day` requires an active owner session.
It reads daily HRV, reconciled steps, and five-minute total energy for the selected date.
Each successful stream can drive replay if another stream fails. The inspection cards show values for the current interval.
The Worker sends normalized records to the browser without storing them in D1.
Synthetic upstream responses cover this flow in tests.
The authorized production check on November 21, 2026 loaded November 18 in America/Chicago.
All three streams returned successfully. Inspection cards confirmed HRV, steps, and total-energy mappings.
Playback advanced across intervals. Seeking restored the inspected noon values.
The browser initially retained November 20 when a date-fill action failed. That unintended read preceded the confirmed November 18 check.

### Harbor walk

Select **Market crossing** in **Scene view**. On November 15, seek to 08:00 to see two figures or to 12:00 to see six.
Select **Inspect steps** to pause and view the five-minute interval, its step total, and the figure count.
The provisional scale uses one figure per 80 steps, rounded up, with a limit of six figures on this walk.
The display keeps the exact step total when the figure limit applies.
A zero step total and unavailable steps both leave the walk empty. The replay panel identifies each state.
Four pedestrian routes follow the new sidewalks and marked crossings. Five vehicle loops serve the street network.
The seven models include a child and a silver-haired shopper who carries a grocery bag. Each style has its own pace and stride.
Walkers pause at the curb. Their feet follow the paving and both curb ramps.
Select **Civic plaza** for the inland view or **Orchard Lane** for a view back toward the boat.

### Harbor road

Select **Market Avenue** in **Scene view**. On November 15, seek to 00:00 for one vehicle, 12:00 for four, or 15:00 for the unavailable state.
Select **Inspect traffic** to pause and view the interval, total energy, mean rate, and vehicle count.
The preview divides the current five-minute total energy by the interval length to calculate a mean rate in kcal/min. Total energy includes basal metabolism.
The provisional scale uses one vehicle per 1.2 kcal/min, rounded up, with a limit of four on this road.
An interval with zero energy or missing data leaves the road empty. The replay panel identifies each state.
Traffic runs in both directions on the coast road. The market route turns through the inland block.
Drivers stop before the market crossing, yield to people crossing, and leave space behind the vehicle ahead.
The scene samples route distances at fixed replay intervals and interpolates between samples. Seeking restores positions and wheel angles.
On November 14, select **Market crossing** and seek to 17:57 to see the shopper cross in front of a stopped vehicle.
The front wheels steer into bends. All four wheels stop when the vehicle stops.
In Night mode, the headlamps light the road ahead of each vehicle. Street lamps light the road and boardwalk.

The road has four vehicle styles: delivery van, classic saloon, hatchback, and pickup.
The selected date seeds a separate style order for the road and walk. Each active slot keeps its style during that day's replay.
The step total and energy rate determine how many slots appear. The seed controls their style order.

### Asset sources and review

`scripts/build-boat.mjs` is the editable source for the provisional boat.
It uses project-local Three.js geometry tools and exports a self-contained GLB.
One model unit represents one metre. The bow points along positive X, and Y points upward.
Named window and lamp meshes support runtime night materials.
The model has a red-brown hull, an aft house, an open cargo deck, hatch covers, a fixed derrick, and dark rails.
Anchors, rope coils, a banded stack, framed windows, and life rings provide working-vessel detail.

Select **Cargo berth** to inspect the loading area. At 12:00, the slung pallet rests on the forward hatch.
At 12:10, the crane turns toward shore. At 12:30, the pallet rests on the flatbed. The return pass loads the boat.
The crane follows replay time. The parked forklift and flatbed are fixed berth equipment. Neither contributes to the calorie-driven traffic count.
A separate gate connects the cargo apron to the return street. The public walk passes outside the yard fence.

`scripts/build-cargo-berth.mjs` generates `public/models/cargo-berth.glb` from project-local geometry.
The turntable, hoist lines, and slung pallet have separate pivots. Work lamps share one material.
The earlier harbor house model and its editable source remain available as a design study.

`scripts/build-skyscrapers.mjs` exports the five tower GLBs in `public/models/`.
The models share units and orientation. Separate window materials support night lighting.

`scripts/build-pedestrian.mjs` exports seven pedestrian GLBs with named limb joints for the walking pose.
`scripts/build-vehicles.mjs` exports four vehicle GLBs with named wheel pivots and lamp materials.

The sleep voyage uses one metre per model unit. Birds and marine animals use a readability scale. The flying fish measures 0.9 m long with a 1 m fin span. The largest companion, the humpback, measures 16 m. [Checkpoint E wildlife review](design/visual-studies/sleep-voyage-v3/checkpoint-e/README.md)

Regenerate an asset after an authoring change:

```sh
npm run asset:boat -- --city
npm run asset:port
npm run asset:city
npm run asset:fleet
npm run asset:sleep
npm run asset:building
npm run asset:skyscrapers
npm run asset:pedestrian
npm run asset:vehicles
```

The browser loads the exported asset. It does not execute the authoring script.
This step checks the GLB delivery boundary without installing Blender.
It does not establish the final modeling workflow or replace the accepted mixed asset strategy.

The user responded positively to the cargo boat and current water, then requested one representative building.
The boat and water remain the visual baseline.
The user liked the five different tower designs after comparison.
The user accepted the full city at checkpoint B. See the [visual review](design/visual-studies/city-v2/checkpoint-b/README.md) and [performance results](design/visual-studies/city-v2/performance.md).

## Backend

The Worker is deployed at [healthcity.yahsiu.workers.dev](https://healthcity.yahsiu.workers.dev).
The Cloudflare dashboard listed the Workers Free plan on November 9, 2026.

| Route | Current behavior |
| --- | --- |
| `GET /health` | Reports backend availability |
| `GET /` | Serves the synthetic frontend when the Static Assets binding is available |
| `GET /auth/status` | Displays sign-in or current session status |
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
This historical result used the retired sample reader. The replacement rollup reader passed an authorized November 18, 2026 check.
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

Protected inspection and disconnect routes return HTTP 401 with a sign-in link when the session is unavailable.
Session API responses retain their existing JSON or plain-text format.

The global limit of 16 pending OAuth flows bounds storage. It does not prevent deliberate sign-in denial.
An unauthenticated client can fill this limit until flows expire. Origin checks prevent browser CSRF, but do not authenticate clients.
Deployment-level abuse protection remains unresolved. This change does not configure Cloudflare rate limiting.
Replacing the oldest flow would cancel valid pending sign-ins and would not eliminate the denial risk.

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
| Heart rate | Five-minute `rollUp` | API interval averages in bpm |
| Sleep | `reconcile` | Complete intersecting sessions, stage chronology, and separate short awakenings |
| Exercise | `reconcile` | Complete intersecting sessions, completion time, active seconds, pause events, and optional vigorous/peak seconds |
| Heart rate zones | `reconcile` | Zone intervals without an inferred intensity or saturation score |

Filters use snake case, such as `daily_resting_heart_rate.date`. JSON fields use camel case, such as `dailyRestingHeartRate`.
The calories and heart-rate endpoints use POST for a read-only aggregation. This request does not create or change source records.
Sleep queries include sessions ending on the selected or following date. Exercise queries include starts on the previous or selected date.
The adapter keeps whole sessions that intersect the selected day. Unusually long sessions can extend beyond these bounded query windows.
This first inspection does not establish exhaustive session history, source reconciliation correctness, or complete sensor coverage.
A finished page sequence establishes only that pagination finished for that bounded query.
Google Health API responses are the authoritative product data. App and Takeout comparisons are optional diagnostics.
Heart rate now uses API-provided five-minute means. The earlier sample-based read is retired.
The continuation workflow adds `Continue incomplete streams` for partial results across all eight streams. Deployment passed on November 14, 2026. Live continuation verification remains pending for responses that need the manual continuation button.
Each click reads up to ten additional pages. Each page uses a separate protected Worker request and at most two Google requests.
The Worker refreshes access and reads one page per request, using the original stream-specific page size and filters.
It returns normalized data and an opaque pagination cursor.
Heart-rate continuation appends complete rollup intervals. Duplicate intervals stop the batch and preserve earlier results.
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
Vite transpiles TypeScript and builds browser assets. It does not check TypeScript types.
The separate typecheck command checks Worker, browser, shared-core, test, and tooling code.
The build command writes browser assets to `dist/client` and the Worker bundle to `dist/healthcity`.
The generated `dist/healthcity/wrangler.json` references the browser output. Building does not deploy.
There is no configured lint command yet.

Run `npm run dev` only when a local server is needed and startup has authorization.
Run `npm run deploy` only when a deployment has authorization.
Wrangler uses the existing Cloudflare login. The project commands disable telemetry and keep logs in `.wrangler/logs`.

Vite and the Cloudflare plugin serve the frontend and Worker under one local origin.
The local command uses `127.0.0.1:8787`. It does not deploy or configure local Google sign-in.
The existing OAuth configuration still requires its configured HTTPS origin.

Cloudflare sends `/auth/*`, `/api/*`, `/checks/*`, `/settings/*`, and `/health` to the Worker first.
The Worker serves the root document through its Static Assets binding.
There is no SPA fallback that can replace authentication or API responses with frontend HTML.
Built client files contain no Worker authentication modules.

The inspection page now loads a separate browser entry at `/checks/form.js`.
Vite bundles its shared merge functions through normal imports.
The Worker no longer embeds function source with `toString()`.
The runtime regression test executes the built entry with synthetic continuation responses.
It checks that continuation requires an explicit action.

After an authorized local server starts, run the browser checks:

```sh
npm run test:browser
```

Playwright uses the existing Chrome installation and blocks external requests.
It never starts a server. Start the local preview separately before these checks.
The browser tests check model readiness, playback, asset inspection, tower comparison, and the narrow layout.
They also check date changes, camera preservation, and restoration of the harbor walk and road traffic when seeking.
They also check frozen frames during pause and identical surface restoration after seeking backward.
These behavioral checks do not establish visual acceptance or a performance budget.

## Source map

- `index.html` supplies the browser document and React mounting point.
- `src/frontend/main.tsx` mounts the React application and imports its stylesheet.
- `src/frontend/App.tsx` defines scene controls, the inspection card, and the replay interface.
- `src/frontend/styles.css` defines the desktop and narrow-screen layouts.
- `src/frontend/inspection.ts` controls the existing manual health-check form and continuation requests.
- `src/core/replay.ts` owns replay time, speed, seeking, pause, and interruption handling.
- `src/core/representative-day.ts` defines synthetic dates, five-minute step and energy data, preview counts, and boat poses.
- `src/core/inspection-pages.ts` defines inspection tables and combines normalized continuation results.
- `src/scene/BoatScene.tsx` composes the harbor assets, water, and lighting, and manages camera controls.
- `src/scene/CargoBerth.tsx` poses the crane and mooring lines and controls the work lamps.
- `src/scene/HarborWalk.tsx` positions and poses the walking figures from the replay clock and step totals.
- `src/scene/harbor-layout.ts` defines the landing and waterfront coordinates.
- `src/scene/HarborBlock.tsx` builds the quays, piers, and breakwater.
- `src/scene/city/city-plan.data.ts` defines the street graph and HRV plots. `CityGround.tsx` builds the streets and shoreline.
- `src/scene/district-motion.ts` calculates distances along the routes and coordinates stops, crossings, and queues.
- `src/scene/HarborRoad.tsx` positions vehicles and turns their wheels. The energy rate determines the vehicle count.
- `src/scene/WaterSurface.tsx` renders the ocean. A refraction pre-pass records scene color and depth before the flat water surface draws. Depth controls the transition from visible sand to cobalt water. Shore wash, caustics, boat wakes, and fish splashes follow replay time.
- `scripts/build-boat.mjs` supplies the provisional editable model source.
- `scripts/build-building.mjs` supplies the editable building source and combines static geometry by material.
- `public/models/city-working-boat.glb` supplies the browser delivery asset.
- `public/models/cargo-berth.glb` supplies the cargo equipment and transit shed.
- `public/_headers` defines security headers for static resources.
- `vite.config.ts` separates browser entries from the Worker build through the Cloudflare plugin.
- `vitest.config.ts` selects source tests without loading the development server configuration.
- `playwright.config.ts` and `tests/browser/boat.spec.ts` define local Chrome interaction checks.
- `src/worker/index.ts` serves public resources and delegates application requests.
- `src/worker/http.ts` supplies shared response headers and response construction.
- `src/worker/auth.ts` defines application routes and handles sign-in, callback validation, sessions, activity, logout, disconnect, and health checks.
- `src/worker/google.ts` constructs Google requests and checks signed ID tokens with `jose`.
- `src/worker/google-health.ts` checks account linkage and bounds API pagination for eight core streams.
- `src/worker/health-data.ts` derives time-zone boundaries and converts source records into inspection tables.
- `src/worker/health-check.ts` renders the combined form and results, and supplies its stylesheet.
- `src/worker/store.ts` contains D1 authentication queries and session deadlines.
- `src/worker/security.ts` handles random values, hashes, cookies, and token encryption.
- `src/worker/*.test.ts` checks routes, identity verification, persistence, and authorization boundaries.
- `src/worker/google.runtime.test.ts` checks exchange, refresh, revocation, health reads, and redirect rejection in the Workers runtime.
- `migrations/` defines the authentication schema and additive callback-lifecycle changes.
- `wrangler.jsonc` selects the Worker entry point, Cloudflare account, URL settings, and runtime compatibility date.
- `tsconfig.json` checks backend source with web API types. `tsconfig.test.json` also checks Node-based tests.
- `tsconfig.frontend.json` checks React, scene, and shared-core source. `tsconfig.tools.json` checks configuration and browser tests.
- `package.json` declares tools and commands. `package-lock.json` records resolved dependency versions.
- `docs/product-spec.md`, `docs/data-sources.md`, and `docs/adr/` contain accepted behavior and architecture decisions.


The heart-rate rollup reader was deployed as version `0776cad7-2503-46f3-bbd4-1a0717c8e1c6`.
The authorized November 18, 2026 check used America/Chicago and completed all eight streams.
Heart rate returned 284 five-minute intervals with valid API averages. Four intervals were omitted.
The initial bounded read completed heart-rate pagination. The manual continuation button was unnecessary for this result.
