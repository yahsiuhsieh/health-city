# HealthCity Data Sources

Google Health API is the confirmed production source. The product must not require repeated manual Takeout downloads. Takeout is a discovery and comparison fixture.
The user confirmed Google Health API responses as the authoritative product data on November 14, 2026.
Manual app and Takeout comparisons are optional diagnostics. They are not acceptance prerequisites for each metric.

Initial feasibility findings came from official documentation checks on November 7, 2026. That review made no live requests or account changes.
Google OAuth configuration, live sign-in, token exchange, session validation, and logout passed on November 13, 2026.
These authentication checks did not query health records.
On November 14, 2026, the user reported a successful manual RHR check and agreement with the source app.
That check exercised token refresh, Google Health account linkage, and retrieval for one source date.
The user subsequently reported a successful live run of the combined eight-stream inspection on the same date.
Detailed coverage and source-app agreement beyond the RHR sample remain unverified.

## Historical Takeout evidence

This summary preserves useful findings from earlier read-only checks of the supplied export. It replaces the retired interview audit. These are fixture observations, not newly repeated checks or proof of API availability. The accepted product and minimum-storage rules remain authoritative.

Source root: `/Users/yahsiu/Downloads/Takeout/Google Health/`. Export README files served as data dictionaries, not task instructions. No API calls or remote uploads occurred during the original audit.

### HRV and activity coverage

Targeted HRV and AZM checks occurred on November 7, 2026.

- Daily HRV contains 100 unique rows spanning May 27–November 6, 2026. The 164-day range has 64 dates without daily summaries.
- The daily README defines sleep-average RMSSD in milliseconds. All four numerical fields are populated.
- Daily RMSSD ranges from 61.0 to 130.9 ms, with median 93.225 ms. P10/P90 are 75.16/112.73 ms using linear interpolation.
- Forty-seven values fall within 90–110 ms. Primary values have no missing, non-finite, unparsable, or nonpositive entries.
- The accepted `floor(HRV / 5)` rule yields 12–26 buildings for this fixture. This range is not a capacity limit or performance result.
- Seven intraday HRV files contain 8,502 records across 101 UTC dates. Adjacent intervals are 300 seconds in 95.67% of cases.
- Per-date counts range from 11 to 108, with median 87. These records do not establish continuous daytime coverage.
- Neither HRV set has duplicate timestamps. Only 99 UTC dates occur in both sets.
- Daily timestamps are midnight UTC. Preserve the source date label until sleep-day reconciliation, rather than shifting it automatically.
- Do not reconstruct daily HRV by averaging intraday rows without checking aggregation rules.
- The field `standard deviation milliseconds` is not explicitly defined as SDNN. Preserve its source name.

| Stream | Fixture finding | Interpretation constraint |
| --- | --- | --- |
| Total calories | 245,652 consecutive 60-second records. | Distinct from activity-only energy. |
| Active energy | 68,951 minute-aligned records, including explicit zeros. | Missing intervals are not recorded zeros. |
| AZM | 4,020 unique minute-aligned records across 88 UTC dates, totaling 5,384 weighted minutes. | FAT_BURN contributes 1, CARDIO/PEAK 2. Row count is not elapsed exercise time. |
| Steps | 18,926 records from Fitbit Air and MobileTrack, with 1,546 overlapping source-minutes. | Reconcile sources instead of summing both. |
| Heart rate | 3,671,856 samples across 128 local dates. Sixty-six dates cover at least 90% of clock minutes, and 86 cover at least 75%. | Sample presence measures coverage, not confirmed wear. This does not require permanent sample storage. |
| Exercise | 82 records. | One Workout spans `2026-09-03T21:07:15Z`–`2026-09-07T01:47:15Z` and overlaps another workout. Preserve it for review. |

HRV sources: `Physical Activity_GoogleData/Daily Heart Rate Variability/daily_heart_rate_variability.csv`, its README, and monthly files under `Heart Rate Variability/`.
Activity sources: monthly CSVs and READMEs under `Physical Activity_GoogleData/Calories/`, `Active Energy Burned/`, `Active Zone Minutes/`, `Steps/`, and `Heart Rate/`.

### Sleep chronology

- The export contains 228 sessions, equally split between v1 and v2, with 111 overlapping session pairs. Do not count versions separately.
- There are 11,935 stage records, including 30-second segments.
- Of 114 v2 sessions, 113 STAGES sessions have complete continuous stage coverage, no overlaps, and positive durations.
- One CLASSIC session contains only unclassified ASLEEP data. Do not relabel it LIGHT.
- The 100 sessions lasting at least four hours have a median of 28 segments and 27 transitions.
- That duration filter defines an analytical subset, not a provider main-sleep label.
- Across 3,995 v2 segments, 22.0% last at most one minute. Of AWAKE segments, 66.7% last at most one minute.
- Preserve short awakenings and exact transitions. These export partitions do not establish the API's separate short-awakening representation.

Sources: `Health Fitness Data_GoogleData/UserSleeps_2026-05-20.csv`, `UserSleepStages_2026-05-20.csv`, and their README dictionaries.

### Reproducible time and missing-data cases

The November 4, 2026 example uses America/Chicago, CST (UTC−06:00). Heart-rate samples cover 1,399 of 1,440 minutes (97.15%). The 41-minute interval from 21:13 through 21:53 has no samples and must not become confirmed rest.

A Strength training record runs 20:10:06–21:12:36. Active-energy records total 279.856212 kcal across 692 minutes, and AZM totals 81. Missing energy minutes were not filled to produce a daily estimate.

November 1, 2026 has 1,500 local minutes because daylight saving ends. CSV filenames can identify a monthly starting date rather than daily granularity. Preserve timestamps and available offsets.

### Export-only candidates and limitations

Cardio Load has 7,770 positive records across seven monthly files, attributed to Fitbit Air. The range is `2026-05-26T16:21:00Z`–`2026-11-06T04:50:00Z`. Of 7,769 adjacent pairs, 6,289 are 60 seconds apart.

Values decrease 3,753 times, supporting interval contributions rather than a running counter. Total approximately equals workout plus background, with maximum difference 0.0001. No timestamps duplicate, but 57 additional records share occupied clock minutes.

The November 4 load sum is 76.0074 across 57 distinct minutes, without independent app reconciliation. Five-minute sums peak at 9.0997 during 20:55–21:00. All load uses the background field despite a recorded exercise. From 22:00 to midnight, heart rate covers every minute but load has no records. These findings do not establish inactivity or approve Cardio Load as an API-backed representation.

Other discovery findings remain outside accepted scope:

- Weather has 151 snapshots across two files from October 10–November 6, 2026 UTC. Forecasts and rain probabilities are not observed rainfall.
- Monthly Sleep Profile includes Tortoise, Hedgehog, and two insufficient-data entries. These are monthly classifications, without an identified dependable public API mapping.
- Swim Lengths has 1,687 candidate rows but only three Swim exercise records. Row counts do not establish verified laps or sessions.
- Floors has no CSV. No usable actual elevation gain or VO2 max was identified.
- Other populated streams include breathing, temperature, oxygen saturation, distance, pace, motion, stillness, sedentary intervals, activity probabilities, and readiness.
- Their quality questions include repeated SpO2 values, missing temperature baselines, ambiguous breathing units, unspecified readiness labels, and limited stress history.

These observations do not approve new features or extra persistence. Recheck source dictionaries before interpreting unused streams.

## Accepted visual requirements

| Representation | Public API data type | Documented access and practical requirement |
| --- | --- | --- |
| Energy traffic | `total-calories` | Derived total energy includes basal metabolism. Access uses `rollUp` and `dailyRollUp`, not raw `list`. Storage resolution is one minute. A five-minute rollup is compatible with the requested replay interval. |
| Pedestrians | `steps` | Intervals have minute resolution. Reconcile sources before aggregation. |
| Heart-rate mountains | `heart-rate` | Documented storage resolution is one second. Actual recording cadence and coverage may vary. Five-minute means can be derived. |
| Daily high-rise count | `daily-heart-rate-variability` | Daily RMSSD summary. Preserve API date semantics. Reconcile sleep-day assignment with Takeout and the app. |
| RHR dam and reservoir | `daily-resting-heart-rate` | Daily date and beats-per-minute summary. Reconcile calculation methods before claiming agreement with the app. |
| Sleep boat and islands | `sleep` | Complete sessions contain stage intervals and separate short awakenings. Preserve sessions across midnight and naps. |
| Monthly exercise garden | `exercise`, with `time-in-heart-rate-zone` or validated zone-summary fields | Requires reconciled sessions, recorded type, active duration, completion time, and adequate zone coverage for saturation. |

References: [data types](https://developers.google.com/health/data-types), [calories](https://developers.google.com/health/data-types/calories), [sleep](https://developers.google.com/health/data-types/sleep), and [vitals](https://developers.google.com/health/data-types/vitals).

These documented types make the accepted core plausible through the public API. They do not establish identical values, historical coverage, source selection, or complete field equivalence with this account's Takeout.

## Other candidates and unsupported assumptions

Public types include `active-zone-minutes`, `exercise`, `activity-level`, `sedentary-period`, sample HRV, resting-heart-rate summaries, and other physiological summaries. A documented type alone does not approve a visual mapping.

The checked public type catalog and v4 schema did not identify retrievable types for:

- Cardio Load.
- Readiness.
- Sleep Score.
- Monthly Sleep Profile.

Treat these as unavailable for a dependable API-only feature until evidence identifies an official supported interface. Do not use a locally invented score under the same name. The earlier Cardio Load landmark suggestion relied on Takeout availability. Current evidence does not support committing to that API mapping.

Some Takeout sensor and internal streams have no identified public counterpart. Similar names do not establish identical fields, device support, or granularity. Raw skin-temperature sensor access is a separate v4beta type with limited device support. Daily sleep-temperature derivations are a different type.

Historical weather requires a separate integration. Google Health's public catalog does not expose the exported weather snapshots. A provider for long-term history remains unselected. Google Maps Weather's documented 24-hour history alone cannot support replay of months-old dates.

References: [public v4 schema](https://developers.google.com/health/reference/rpc/google.devicesandservices.health.v4), [type catalog](https://developers.google.com/health/data-types), and [Google Maps Weather overview](https://developers.google.com/maps/documentation/weather/overview).

## Access and synchronization

The [product specification](product-spec.md#synchronization-and-retention) defines synchronization, retention, explicit world refresh, and clearing behavior. Its [record-review rules](product-spec.md#record-review-and-display-limits) define local presentation choices and display overflow. Its [validation gates](product-spec.md#validation-gates-and-failure-responses) define required evidence and failure responses.

These product rules remain separate from API capabilities. Failed or incomplete retrieval cannot establish source deletion. Quota failures must preserve the last successful data.

A future authorized connection requires these steps:

1. Configure Google Cloud and Google OAuth.
2. Obtain user consent.
3. Check that the Google Account links to Google Health.
4. Check refresh-token handling for long-term access.

The manual RHR workflow implements steps 3 and 4. Its deployment passed on November 14, 2026.
The user reported a successful live single-date RHR check on the same date.
Long-term refresh behavior and access to other core data types remain unverified.

The accepted health representations require read-only scope groups for activity/fitness, health-metrics/measurements, and sleep. Request only the necessary permissions.

Official documentation allows queries of recorded history without a general historical-age cutoff. Retrieval still requires pagination, quota handling, and bounded aggregation requests. Current rollup limits are:

- 14 days per request for total calories and heart rate.
- 90 days per request for most other types.

These limits apply to request intervals, not retention. Device records become available after synchronization. API access is not a continuous live sensor feed. Webhooks can notify supported data changes, but cannot create missing measurements.

References: [setup](https://developers.google.com/health/setup), [scopes](https://developers.google.com/health/scopes), [historical queries](https://developers.google.com/health/endpoints#query_historical_data), and [data availability](https://developers.google.com/health/data-types).

## Daily RHR checks

Daily RHR is part of the first-release scope. The public API supports `daily-resting-heart-rate` through `list` and `reconcile` under the existing health-metrics read-only scope.

REST fields are:

- `date`, a civil Date object.
- `beatsPerMinute`.
- Optional `dailyRestingHeartRateMetadata.calculationMethod`.

The documented methods are:

- `WITH_SLEEP`.
- `ONLY_WITH_AWAKE_DATA`.
- `CALCULATION_METHOD_UNSPECIFIED`.

Preserve these enum names instead of adapting older or exported field names. The checked documentation does not establish a universal method priority for the app. Selection of a canonical daily value and agreement with the app still require checks.

Do not average methods or automatically select the lowest value. Do not present a method change as a physiological trend. RHR is a daily summary, not instantaneous heart rate or a standalone health or stress grade.

References: [RHR schema](https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints#DailyRestingHeartRate), [method enum](https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints#DailyRestingHeartRate.DailyRestingHeartRateMetadata.CalculationMethod), and [vitals guide](https://developers.google.com/health/data-types/vitals).

The schema findings above come from official documentation.

The manual check first refreshes access and checks `users/me/identity` under the existing health-metrics read-only scope.
An `ACCOUNT_NOT_LINKED` response stops the check. The Worker does not follow a provider-supplied setup URL.
The check then requests one civil date through `dataPoints:reconcile`, with an inclusive start and exclusive next-date boundary.
Use `daily_resting_heart_rate.date` in filters. The JSON response field remains `dailyRestingHeartRate`.
The [filter guide](https://developers.google.com/health/filters) specifies snake case for filter identifiers.
The RHR stream permits three pages of 25 records. Further pages produce an explicitly incomplete result, without automatic retries.
The adapter checks the date and integer-string value. It preserves optional method names and source references without selecting a canonical value.
Unknown method names remain distinct. Absent method metadata remains unknown.
An empty response establishes only that the query returned no records.
Health records and source references remain in request memory. Only date, beats per minute, and calculation method appear in the browser result.
No health record, identity response, access token, or page token enters D1. No new migration is necessary.
These limits define the RHR inspection, not the final synchronization or retention policy.
The user reported one successful live result with method `WITH_SLEEP`, and checked that its date and value agreed with the source app.
This is evidence for one sample. It does not establish agreement across dates, method selection, missing-data handling, or broader reconciliation correctness.
Reference: [Google Health identity](https://developers.google.com/health/reference/rest/v4/users/getIdentity).

## Historical weather candidate

Official documentation identifies Open-Meteo Historical Weather with `models=ecmwf_ifs` as a single-source candidate for yesterday and older months. The documented global model provides:

- Hourly data since 2017.
- 9 km resolution.
- Updates every six hours.
- No stated delay.

ERA5 variants have a five-day delay. These are documentation findings, not results from a successful API availability test.

Candidate fields include hourly weather code, cloud cover, rain, snowfall, and wind speed, plus sunrise and sunset. Use hourly codes for replay. The daily code summarizes the day's most severe conditions.

The user accepts model-based city estimates and weather in the first release. Open-Meteo with IFS remains a candidate pending implementation checks. Do not describe these estimates as exact observations of the user's surroundings or a tested live integration.

Request absolute UTC/Unix times. Apply the selected IANA replay zone in the app. Do not assume the provider's documented timezone behavior produces a uniform 24-hour historical day across DST.

Evaluate daylight at the replay instant and chosen world location. Use the accepted unavailable-weather state when records are absent.

References: [Historical Weather](https://open-meteo.com/en/docs/historical-weather-api), [Historical Forecast distinctions](https://open-meteo.com/en/docs/historical-forecast-api), and [noncommercial pricing](https://open-meteo.com/en/pricing).

No weather data API requests occurred.

## Zero-cost testing and selected deployment

The user selected a private website on Cloudflare Workers with Static Assets and D1. The selected stack excludes Pages.
Testing must remain free. The user confirms Google Health API access is free.
The authentication Worker and dedicated D1 database are deployed. The frontend and automatic synchronization are not implemented.

The following limits reflect documentation checks on November 7, 2026:

| Service | Documented free capacity and behavior |
| --- | --- |
| Workers | 100,000 dynamic requests per day and 10 ms CPU per request. Excess requests fail. Workers handles static frontend/assets and API/OAuth routes. |
| D1 | 5 million rows read per day, 100,000 rows written per day, and 5 GB per account. Each database has a 500 MB limit. D1 provides persistence. |
| Workers Static Assets | Free, unlimited static asset requests without asset-storage charges. Routes that invoke Worker code consume the applicable Worker quota. Free supports 20,000 asset files, with a 25 MiB maximum per file. |
| Open-Meteo | Noncommercial forecast/history access within free limits, including fewer than 10,000 calls per day, with attribution. It remains a candidate. A private noncommercial personal application fits its stated examples. |

Browser rendering avoids a hosted rendering or GPU service. Private data and OAuth handling still require authorization controls.

Use free capacity to assess feasibility. Address measured limits before adding infrastructure.
OAuth setup and live sign-in passed. The user reported successful Google Health access and app agreement for one RHR sample.
The user also reported a successful combined inspection. Broader record correctness and coverage checks remain pending.
These are access and correctness checks, not an unresolved API-price question. No paid public-app verification or third-party assessment has approval.

Keep services on free tiers. Do not enable paid plans, metered add-ons, or automatic upgrades. If usage reaches a free limit, suspend or defer synchronization. Preserve the last successful data.

Do not interpret a quota error as deletion. A spending alert alone does not guarantee zero cost. Free hosting does not provide access control. Checks did not establish a credit-card exemption or unlimited private hosting.

References: [new-project Workers recommendation](https://developers.cloudflare.com/pages/), [Workers Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [Open-Meteo terms](https://open-meteo.com/en/terms), [Google Health quotas](https://developers.google.com/health/rate-limits), and [OAuth setup](https://developers.google.com/health/setup).

## Planned persistence review

The [minimum-storage policy](product-spec.md#minimum-necessary-storage) applies to all streams. The following inventory defines intended content, not a final schema or proof of API compatibility.

| Representation or operation | Candidate necessary content | Excluded or pending content |
| --- | --- | --- |
| Heart-rate terrain | Five-minute means, interval boundaries, and necessary coverage/source information. | No permanent original-sample history or detailed sample curve. |
| Traffic | Five-minute total-energy rates and necessary coverage/source information. | Minute-detail inspection and persistence need review. Do not archive full calorie responses by default. |
| Pedestrians | Five-minute step totals and necessary coverage/source information. | No speculative higher-resolution history. |
| HRV skyline | Daily RMSSD, source date, and necessary source information. | No finer HRV streams solely for possible future features. |
| RHR reservoir | Daily value, source date, and calculation-method metadata needed for interpretation. | No unused physiological streams. |
| Sleep journey | Reconciled session bounds, stage/awake timing, and required source and coverage information. | Five-minute averaging cannot replace stage chronology. Exclude unrelated vendor fields. |
| Exercise garden | Session identity, type, start/end, active/elapsed duration, intensity inputs or derived fraction/coverage, and necessary review/source metadata. | Validate which zone summaries suffice before persisting detailed zone intervals. |
| Weather | City/date attribution, replay weather values, sunrise/sunset, and necessary source/estimate metadata. | No complete model grids or unused provider fields. |
| Authentication and synchronization | Necessary owner/session/token state, expiry, synchronization status, and correction/deletion tracking. | No indefinite operational logs or redundant payload copies by default. |

Preserve exact values required by the current representation. Aggregation does not authorize inventing coverage, zeros, or stage boundaries. Raw samples may be needed during conversion without requiring permanent storage.

Measure representative storage and read/write costs before expanding synchronized history. Add fields for concrete new requirements when needed. Previously discarded detail may require another source query and may not remain available.

## Required account checks

### Authentication storage

The OAuth implementation uses these operational tables in D1 Free. It does not store health records or complete Google responses.
All expiry timestamps use Unix milliseconds. The Worker rejects expired records even before physical cleanup.
Authentication requests delete expired flows and sessions. No background synchronization or cleanup schedule is configured.

| Table and field | Purpose and resolution | Retention |
| --- | --- | --- |
| `oauth_flows.state_hash` | SHA-256 of a random state, primary key for atomic callback claiming | Ten-minute validity, deletion after callback completion, clearing, or the next authentication cleanup after expiry |
| `oauth_flows.browser_hash` | SHA-256 of a separate random HttpOnly cookie, binds the flow to its initiating browser | Same as the flow |
| `oauth_flows.pkce_verifier` | Random PKCE verifier for the backend token exchange | Same as the flow |
| `oauth_flows.oidc_nonce` | Random value checked against the signed Google ID token | Same as the flow |
| `oauth_flows.expires_at` | Enforces the ten-minute authorization limit | Same as the flow |
| `oauth_flows.claimed` | Boolean flag for single-use callback processing and guarded sign-in persistence | Same as the flow |
| `google_connection.id` | Singleton key fixed at `1`, prevents multiple owner connections | Until disconnection |
| `google_connection.google_sub` | Stable Google subject, pins the first verified owner identity | Until disconnection |
| `google_connection.refresh_ciphertext` | AES-256-GCM encrypted refresh token, includes its random IV and format version | Until replacement or disconnection |
| `google_connection.refresh_expires_at` | Optional Google refresh-token expiry, converted to milliseconds | Same as the connection |
| `google_connection.granted_scope` | Granted scopes required to interpret the current authorization | Same as the connection |
| `sessions.id_hash` | SHA-256 of the opaque session cookie, primary lookup key | Until logout or the next authentication cleanup after expiry |
| `sessions.google_sub` | Associates the session with the pinned owner connection | Same as the session |
| `sessions.created_at` | Enforces the seven-day absolute sign-in limit | Same as the session |
| `sessions.last_active_at` | Enforces the thirty-minute idle limit | Same as the session |

Status requests do not extend session lifetime. An explicit same-origin activity request records user interaction.
Logout deletes only the current HealthCity session. It preserves the Google connection and retained history.
Access tokens and ID tokens remain in request memory and are not persisted.
OAuth state, session cookies, and token responses must not enter application logs or browser response bodies.
The token-encryption key and Google client secret belong in Cloudflare secrets, outside D1 and the repository.
The scope request includes `openid`, `email`, and the activity/fitness, health-metrics/measurements, and sleep read-only scopes.
The original RHR-only connection requested only the metrics scope. The combined workflow requires renewed consent for older connections.
The callback requires a new refresh token when the saved connection lacks the expanded scopes.
OpenID Connect establishes the owner's verified identity. Authentication alone calls no health-data endpoints.
The separate combined health check calls Google Health only after an explicit form submission.
It requires an active session before token refresh. Refresh cannot create or restore a HealthCity session.
Known Google refresh-token expiry stops the request before any outbound call. Failed refresh preserves the saved connection for renewal or disconnection.
Explicit renewal requests the same scopes with `prompt=consent`, through the existing browser-bound OAuth flow.
Disconnect requires an active owner session, a same-origin POST, and explicit confirmation.
The Worker decrypts the refresh token in memory and submits it to Google's revocation endpoint in the POST body.
Only HTTP 200 or an explicit HTTP 400 `invalid_token` response permits local clearing.
Other failures preserve local authorization and sessions so the owner can retry. No automatic retries occur.
Successful clearing deletes all sessions, OAuth flows, and the Google connection in one D1 transaction.
Sign-in persistence requires its claimed flow to remain present. Clearing the flows prevents an older callback from restoring a connection.
No health-history tables, raw-response caches, or synchronization jobs exist yet. Their future implementation must extend the clearing inventory.
Application secrets, the D1 schema, local project files, and Google Health source records remain unchanged.
Cloudflare-managed recovery backups are outside SQL deletion. Earlier encrypted records can remain until provider retention expires.
Google revocation can affect all OAuth clients and scopes in the same Google Cloud project, not only the current client.
References: [Google revocation](https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke) and [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).

### Combined core inspection

The combined workflow replaced the separate RHR-only form on November 14, 2026.
Deployment and unauthenticated HTTP checks passed. The user reported a successful live run of the expanded workflow on the same date.
This report establishes workflow completion. It does not establish complete retrieval or correct transformations for every data type.
The user requested one inspection across the three accepted read-only scope groups.
One selected date and IANA time zone define the check. Temporal computes UTC boundaries without assuming a 24-hour day.
Daily RHR and HRV preserve their source date. Intraday streams use the selected day's physical interval.

The workflow checks eight streams: daily RHR, daily HRV, total calories, steps, heart rate, sleep, exercise, and heart-rate-zone intervals.
Total calories uses a read-only five-minute `rollUp` POST. Other streams use `reconcile` reads.
Heart-rate means use only returned samples. Counts and first/last timestamps accompany each mean without an inferred continuous-coverage percentage.
Missing averages and missing buckets remain unavailable. Explicit zero values remain zero.
Sleep stage intervals and short awakenings remain separate. Exercise retains completion time, active duration, events, and optional zone durations.
These fields support essential inspection of accepted features. No health data or new operational fields enter D1.

Each stream permits three pages: 25 records per page for daily summaries and sessions, or 1,000 for other streams.
One refresh and one identity request bring the maximum to 26 Google requests per run.
Individual requests have ten-second timeouts. The stream sequence stops after 45 seconds.
The Worker stops remaining streams after quota, network, authorization-expiry, or sequence-timeout failures. No automatic retries occur.
Independent stream failures do not discard successful results. Results identify partial, failed, and skipped streams explicitly.
Session validity is checked before each stream and before the response.

Sleep queries include sessions ending on the selected or following date. Exercise filters use civil starts on the previous or selected date.
Complete intersecting sessions remain intact. Sessions longer than these bounded windows can escape retrieval.
The known multi-day exercise fixture therefore still requires a broader historical query before full synchronization.
Finished pagination does not establish exhaustive history, missing-source evidence, or source/app agreement.
Free-tier CPU time, larger sample sets, and production synchronization remain separate validation gates.
References: [rollup contract](https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints/rollUp),
[filter rules](https://developers.google.com/health/filters), and [Temporal implementation](https://github.com/js-temporal/temporal-polyfill).

### Candidate exercise intensity input

Official documentation identifies two possible inputs:

- `time-in-heart-rate-zone` intervals.
- `exercise.metricsSummary.heartRateZoneDurations`, with light, moderate, vigorous, and peak durations.

These can support a clearly labeled custom heart-rate-zone measure. They do not supply an overall exercise-intensity score. Session `activeZoneMinutes` is cumulative. It cannot represent intensity without time normalization and coverage checks.

Session `activeDuration` excludes pauses. Zone-summary pause semantics and missing optional fields still require checks.

The accepted saturation mapping uses the VIGOROUS-plus-PEAK fraction of trustworthy observed exercise-zone time, with sufficient coverage. Without sufficient coverage, preserve the category's standard flower color and show an unavailable indication.

Required checks and calibration include:

- Reconciled intervals without duplication.
- Consistent sources.
- Pause handling.
- Coverage threshold.
- Conversion to saturation.

Missing zone records must not become zero intensity. This measure does not describe complete effort for every exercise type.

References: [exercise fields](https://developers.google.com/health/data-types/workouts), [zone and summary schema](https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints), and [missing records versus true zeros](https://developers.google.com/health/data-presence-and-true-zeros).

These findings come from documentation. No account calls occurred.

### Account and transformation checks

Before large-scale implementation, check authorized API responses for the accepted core types. Use automated checks for:

- Daily HRV values and source-date attribution.
- Daily RHR values, date attribution, and calculation-method consistency.
- Five-minute total-calorie rollups, including basal energy and explicit zeros versus missing intervals.
- Step-source reconciliation and heart-rate sample coverage.
- Sleep sessions, unclassified stages, and short awakenings.
- Historical retrieval, corrections, changed records, and synchronization delay.

API `shortAwakenings` can overlap stage intervals. Do not count their duration twice or assume the API uses Takeout's stage partition.

The user-reported single-date RHR check passed, including an optional comparison with the source app. Broader automated checks remain pending.
Use app or Takeout comparisons only when a specific discrepancy needs diagnosis. Do not require the user to check each metric manually.
A documented type does not establish a successful account check.
Handle authentication secrets through the connection flow. Do not paste them into chat or documentation.

### November 4 inspection outcome

On November 14, the agent inspected the browser result for November 4, 2026, in `America/Chicago`.
The UTC window was November 4 at 06:00 through November 5 at 06:00, with an exclusive end.
Seven stream reads completed. The heart-rate read stopped at the three-page limit with 3,000 samples.
A targeted read of the supplied export found 35,316 heart-rate samples across that full local day.
Those export samples occupied 1,399 clock minutes, consistent with the earlier fixture summary.
Heart-rate files split by UTC date. The November 1 file alone cannot establish the November 4 baseline.

The existing partial response contains only the final part of the day. It cannot establish full-day means or missing intervals.
The first returned five-minute bucket can also contain only part of its samples because pagination stops inside that bucket.
Resolve bounded heart-rate pagination before treating these means as complete replay inputs. Do not infer a source gap from unrequested pages.
The continuation implementation supports all eight streams and retains their original filters and page sizes.
Each explicit batch reads at most ten additional pages across the pending streams.
Each continuation request requires a valid owner session, the same origin, the selected date and zone, and an opaque page cursor.
It refreshes access and reads one page: up to 25 daily summaries or sessions, or 1,000 other records.
The Worker checks session validity again before the response.
Only normalized inspection data and the next cursor reach the browser. Heart-rate pages combine sample sums and counts across non-overlapping spans.
Other streams retain their normalized rows and separate methods. Session labels remain unique across continuation pages.
An empty next cursor establishes pagination completion. Quota, network, expiry, or malformed-response failures stop the batch without automatic retry.
Progress remains in the current browser page. No D1 fields or migrations are added. Deployment and unauthenticated route checks passed on November 14, 2026. Live continuation verification remains pending.
Optional export comparisons found matching daily HRV and sleep-session bounds and stage count.
Calories and reconciled steps differed from simple export sums. These differences do not override the authoritative API values.
Their exact causes remain unverified. Do not describe them as confirmed rounding or a known source-priority algorithm.
No additional manual app comparison is required. No health record was added to D1 during this inspection.
