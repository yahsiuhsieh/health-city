# HealthCity Product Specification

This specification records accepted product behavior and first-release acceptance criteria. Unverified assumptions are not implementation guarantees. Large-scale implementation still requires technical feasibility and visual review.

Use [GLOSSARY.md](../GLOSSARY.md) for domain definitions. Use [data-sources.md](data-sources.md) for API contracts, documented limits, historical Takeout findings, and pending account checks. This specification is the maintained reference for product behavior.

Production access must use Google Health API. Manual Takeout downloads must not be a product requirement. Takeout availability alone does not establish a production feature.

## Experience and world

- Create an explorable life record that is fun, cute, and helps the user understand and remember a day.
- Target the first release at the user alone, connected to their Google Health account.
- Defer other-user registration, multi-user workflows, and city sharing.
- Use a private website on Cloudflare Workers with Static Assets and D1. Exclude Pages. Technical storage details remain open.
- Keep testing free, without automatic paid upgrades. Assess actual constraints if usage reaches free limits. Avoid premature quota optimization.
- The user confirms Google Health API access is free. Planning did not configure accounts, deploy services, or upload data.
- Use the inspected Takeout for discovery and comparison. Use Google Health API for production.
- Prioritize desktop exploration, with a simplified mobile view.
- Keep recognizable roads, coastline, and landmarks stable across dates. Data changes local terrain details and daily activity.
- Give data buildings or blocks recognizable, stable roles across dates. Records change their state rather than automatically adding one building per record.
- A data role does not require one metric per building or finalize an unspecified mapping.
- Use lower, distinctive landmarks for specific data themes. Use ordinary high-rises to represent daily HRV through their count.
- Keep high-rise plots fixed. Count may differ across dates, but remains fixed within a day's replay. Specific low-rise landmark mappings remain open.
- Focus on the selected day. A few areas may preserve memories accumulated through that date. Earlier dates restore earlier memories.
- Give major object classes and environmental effects an explainable data or functional meaning. Small expressive actions may remain decorative.

## Exploration and inspection

- Use an elevated oblique view with free rotation, pan, and neighborhood-scale zoom. Exact camera limits remain open.
- Provide a `World view` button that restores the overview camera. It must preserve date, time, and playback state.
- Exclude train and boat follow modes from the current scope.
- Clicking a data object pauses a playing world and opens a compact record/explanation card. Preserve date, replay time, and camera.
- Closing-card and resume behavior remain open.

## Sign-in lifetime

- Require sign-in again after 30 minutes without user activity or seven days after sign-in, whichever occurs first.
- Automatic playback and background synchronization do not count as user activity.
- Continued activity must not extend the seven-day limit. Enforce expiry on the backend.
- Session expiry must not delete saved health history or disconnect Google authorization.

## Date selection and replay

### Selected date and clock

- On opening, select the most recent ended calendar date with available records. An ended date is not necessarily complete.
- Preserve missing-data indications. Exact default-date eligibility and the no-data fallback remain open.
- Enter a selected date paused at 00:00. Wait for an explicit Play action.
- Show a timeline from local midnight to the next midnight, labeled 00:00–24:00.
- For today, retain the full-day axis. Restrict seeking and playback to elapsed time.
- Mark future segments separately from synchronization lag and missing records in elapsed time. Do not predict future health-derived states.
- Preserve camera angle, target, and zoom when changing dates. Each new date still starts paused at 00:00.
- Safe camera adjustment for an invalid or obstructed target remains open.
- Use one explicit replay time zone for the calendar and intraday clock. Default to the home city's zone.
- Weather-city overrides must not change the replay zone automatically. Allow an explicit zone change for the whole view.
- Preserve source timestamps and offsets. Reconcile daily-summary date attribution with the source and account, particularly for HRV.
- Do not blindly shift midnight timestamps to assign daily summaries.
- Preserve the true midnight-to-next-midnight interval across clock changes, including 23- and 25-hour days.
- Distinguish repeated clock times and skip nonexistent times naturally. Do not force every date into 1,440 minutes. Exact labels remain open.

### Playback and state restoration

- Allow direct seeking and shortcuts, including the completed-day state.
- Default to 240x elapsed-time playback. A standard 24-hour day takes six minutes.
- Preserve that rate across clock changes. Allow speed adjustment.
- Exact speed presets remain open. Review the default with actual scenes.
- Pause freezes the replay clock and every world animation. This includes traffic, pedestrians, water, foliage, boat bobbing, gardener actions, and train movement.
- Route progress, data changes, and reveal effects also stop. Ambient motion has no pause exception.
- Keep viewing controls usable while paused. The user can inspect the frozen scene or explicitly seek another time.
- Show the full day's heart-rate terrain immediately. Actors follow replay time, while sleep scenes use progressive reveal.
- Seeking in either direction restores the corresponding world and reveal state. The user need not watch earlier animation to see later states.
- Pause automatically when the page becomes hidden. Do not accumulate background time.
- Keep the world paused when the page becomes visible again. Require an explicit Play action to continue.
- After an unusually long execution interruption, preserve the last presented replay position and pause instead of advancing through unviewed time.
- Determine the interruption threshold through measurement. This protection does not claim to detect operating-system sleep reliably.

### Missing records

- Keep missing records distinct from recorded zero values and rest. A gap in one stream must not invalidate unrelated streams.
- Only successful, sufficiently scoped queries can establish that a selected date has no health records.
- In that case, preserve the date and base home world. Show `No health records for this date`.
- Keep valid daylight and weather. Do not invent health-driven activity or select another date automatically.
- Distinguish loading, authorization errors, incomplete retrieval, and cached data from confirmed absence.

## Synchronization and retention

### Source authority and retained history

- Treat successfully synchronized Google Health records as authoritative, including historical corrections and confirmed source deletions.
- Update existing memories without duplication. Preserve source fidelity instead of immutable historical world snapshots.
- Keep the last successful data after failed or incomplete synchronization. Neither condition establishes source deletion.
- Initially synchronize the most recent 30 days. Retrieve older dates on demand.
- Include the selected month's exercise records needed for its complete garden.
- The initial range is not a history or retention cap. Batch sizes and temporary-cache details remain open.
- Keep synchronized replay history until the user clears it, subject to authoritative source corrections and deletions.
- Do not purge history automatically after 30 days.
- Assess an actual free-storage constraint before deleting history or purchasing capacity. Temporary high-frequency cache details still require checks.

### Minimum necessary storage

- During testing, use D1 Free and persist only data needed by accepted features, authorization, synchronization, or essential validation.
- Apply this rule to every data type, not only heart rate.
- Define the purpose, resolution, and retention of each stored field before implementation.
- Do not preserve extra fields, unused streams, or complete vendor responses for hypothetical future features.
- Add storage for new needs when those needs become concrete. Earlier aggregates may not support future detailed analysis.
- Measure storage and read/write usage with a small representative dataset before expanding synchronization.
- Keep the accepted historical-retention policy for necessary replay records. Minimizing stored content must not silently delete retained history.
- Any temporary raw-data cache needs a specific purpose, bounded scope, and explicit expiry. Do not move unnecessary persistence elsewhere.

### Updates to the visible world

- Check for source updates when the website opens. Allow manual refresh.
- Exclude scheduled synchronization while the website is closed from the first release. Freshness thresholds and retries remain open.
- Keep the visible world stable when synchronization finds updates. Show an update-available indication.
- Apply updates when the user chooses to refresh the world.
- Preserve date, replay time, and camera during application. Pause the world after application.
- A newly entered date uses the latest available confirmed data. Exact cache strategy remains open.

### Clearing and disconnection

- Provide `Clear HealthCity Data and Disconnect` in settings.
- The action clears saved HealthCity health data and its connection, preventing automatic reimport.
- Preserve Google Health source records.
- Inventory actual stored copies and credentials before implementation.
- Establish the deletion and revocation behavior before implementation.
- This policy does not authorize deletion of current files or account data during planning.

## Record review and display limits

- Preserve questionable source records. Explain the reason for review instead of silently correcting or discarding records.
- Give suspicious but structurally valid exercise sessions a clearly marked review placeholder, rather than an ordinary oversized flower.
- Keep the placeholder until the user includes the session or omits its world representation.
- Inclusion and omission are local presentation choices. They must not edit Google Health.
- Keep omitted and pending records discoverable.
- Do not discard high or low physiological values solely because they are unusual. Numerical flagging criteria still require data checks.
- Do not force malformed records into numerical geometry. Keep unrelated valid streams usable.
- If a value or count exceeds scene capacity, explicitly indicate the exceeded display range.
- Preserve the precise value and full total on inspection.
- Do not silently truncate values, normalize dates independently, delete records, or expand world space without bounds.
- Determine capacities through measurement. Overflow indicates a display limit, not physiological abnormality.

## Energy traffic

- Use road traffic to represent total Calories Burned, including basal metabolism. Do not substitute active-only energy or Cardio Load.
- Use the current five-minute interval's mean total energy expenditure rate. Do not use expenditure accumulated since midnight.
- Review minute-detail inspection and its storage cost before deciding whether underlying minute records need persistence.
- Use the same mapping across dates. Equal rates must produce comparable traffic at the same viewing scale.
- Do not normalize individual dates.
- For an interval without calorie records, show no data-driven vehicles. Show a local `No calorie data` indication.
- Continue replay time and unrelated world elements. This state means unavailable information, not zero expenditure or frozen vehicles.
- The nonlinear conversion, capacity, partial-coverage policy, and vehicle-speed behavior remain open. Traffic quantity is already the accepted expression.

## Pedestrian activity

- Use recorded step volume in the current five-minute interval to determine pedestrian activity on world paths.
- Pedestrians do not represent actual routes, a literal count of people, or inferred exercise types.
- Source reconciliation, scaling, missing-record presentation, and exact actor behavior remain open.

## Exercise memories

### Monthly garden and session attribution

- Use a monthly exercise garden. It replaces the memory-neighborhood and venue-exploration proposal.
- Create one flower per completed reconciled exercise session. The flower appears at the recorded end time.
- Seeking before completion removes the flower. Seeking forward restores it without duplication or an animation prerequisite.
- Assign each complete memory to its completion date and month, including sessions across midnight or a month boundary.
- Preserve the full original interval and duration. Do not split or duplicate flowers.
- This assigns a memory to a month. It does not assign every exercise minute to that month.
- Arrange flowers chronologically along a path. Group sessions from the same date with subtle date markers.
- Preserve earlier flower positions as later sessions appear. Exact geometry and dense-day handling remain open.
- Each new month starts without flowers. Historical dates provide access to earlier gardens without permanent expansion of the world.
- The month-end garden reflects recorded exercise. Do not fill plots automatically as calendar time passes.

### Flower category and size

- Distinguish recorded exercise types through flower color and a consistent shape per category.
- Shape reinforces the category. It does not encode another metric.
- Exact category handling, colors, and shapes remain open.
- Use a dedicated general-workout color and shape for generic or unspecified types. Preserve the source label on inspection.
- Do not infer a specific type from heart rate or calories.
- Blossom size represents API `activeDuration`, excluding recorded pauses. Longer sessions produce larger blossoms within a readable range.
- Show active and elapsed duration on inspection. Duration does not represent intensity.
- Conversion, size bounds, missing-`activeDuration` fallback, and anomalous-session handling remain open.

### Gardener and saturation

- During replay of a known exercise interval, show a gardener tending its future flower position.
- At the recorded end, show the complete flower. Seeking restores the corresponding state.
- Gardener actions are expressive cues, not measured physical actions. They do not promise live detection before API synchronization.
- Saturation represents the fraction of trustworthy observed exercise-zone time spent in VIGOROUS or PEAK zones.
- Exclude pauses consistently. Higher fractions produce stronger saturation within a restrained range.
- This fraction is not a universal effort score or total exercise load.
- Require sufficient verified coverage. Otherwise, preserve the category's standard color and show `Intensity unavailable` on inspection.
- Coverage threshold, pause alignment, and saturation conversion remain open.
- Do not substitute unavailable Cardio Load, duration, or calories for intensity.

Venue interiors, per-session buildings, category venues, and a separate collection-to-replay navigation flow are outside the active design. Unrelated candidate data landmarks remain possible.

## Daily HRV skyline

- Use the selected date's daily HRV summary to determine ordinary high-rise count. Keep the count fixed during that day's replay.
- Calculate count as `floor(daily HRV RMSSD in milliseconds / 5)`. Use the same raw-value conversion across dates.
- Preserve precise HRV on inspection. Values within a five-millisecond bin share a count.
- High-rise height and architectural appearance must not encode additional metrics.
- Keep building forms consistent at the same plots across dates. Do not randomly rearrange heights or silhouettes.
- Exact art direction and plot-occupancy order remain open.
- HRV is not cumulative activity or an overall health score. Do not sum intraday RMSSD values to create construction progress.
- When daily HRV is unavailable, use fixed neutral translucent wireframe placeholders at the designated plots. Show `No HRV data`.
- Placeholders mean unavailable information, not an HRV value or yesterday's count. Other world elements continue normally.
- Capacity, sleep-day attribution, and optional personal-reference comparison remain open.
- Exact distinctions between loading, missing records, and authorization failure remain open.
- Do not silently cap counts or use the current fixture maximum as a permanent upper bound.
- Construction workers remain a possible future expression for an accumulating quantity. They are not an HRV skyline requirement.

## Resting heart rate landmark

- Include daily RHR in the first release, using a fixed dam and inland reservoir.
- Reservoir water level represents daily RHR and remains fixed during the selected day's replay.
- Higher raw values produce higher water levels on a shared scale across dates. Exact conversion remains open.
- Keep the basin separate from the sleep ocean and weather encoding.
- Water level represents physiology, not rainfall, actual city water supply, or a health grade.
- Dam form, location, capacity, missing-value appearance, and auxiliary motion remain open.
- Missing RHR must not become zero or an invented value from another date.
- Distinguish daily RHR from intraday heart-rate samples and HRV. Do not infer instantaneous resting heart rate, stress, or an overall health grade.
- Check the API's daily date and calculation-method metadata against the app before selecting a canonical value.
- Do not average conflicting methods or fabricate a missing value.

## Heart-rate mountains and ridge train

- Use a continuous flowing ridge to show chronological five-minute mean heart rate. Higher terrain represents higher mean heart rate.
- Use one heart-rate-to-elevation mapping across dates, relative to a fixed baseline. Equal means produce equal heights.
- Do not normalize each date's minimum and maximum independently. Exact baseline, vertical scale, and exceptional-value handling remain open.
- Preserve source chronology and meaningful events. Rounded geometry must not introduce invented peaks.
- Persist five-minute means with their calculated precision, interval boundaries, and necessary coverage and source information.
- Inspection shows the interval mean and data status, not an original-sample heart-rate curve.
- Use original heart-rate samples for aggregation and necessary checks. Do not retain them permanently by default.
- Use a mountain sightseeing train near the upper ridge to indicate replay time. Avoid roller-coaster-like motion through sharp changes.
- Use labeled railway tunnels for missing heart-rate intervals.
- The train disappears while replay time continues. It returns when records resume.
- Do not invent heart rate through gaps.

## Sleep sessions and islands

### Session, island, and reveal

- Preserve each complete reconciled sleep session, including a nap, as one session and one island.
- Midnight and temporary awakenings must not split a session.
- Query relevant sessions that intersect the selected day, including sessions across midnight.
- If a successful query finds no relevant record, keep the boat at the city harbor. Show `No sleep record`.
- Do not invent an island or infer sleeplessness. Keep other valid streams usable.
- Loading and API failure must not mean confirmed absence.
- Replay only the portion that intersects the selected day. A session may already be underway or remain unfinished at midnight.
- Do not force departure or arrival at the date boundary. Preserve complete start and end dates in the session overview.
- Make land area proportional to recorded time asleep, excluding awake intervals. Use a common scale across dates and sessions.
- Doubling asleep duration doubles area, not diameter.
- Show elapsed start-to-end duration separately. Shape, area conversion, and extreme-size handling remain open.
- Prioritize duration and continuity in the overview. Show stage detail at closer scales.
- Reveal stage environments progressively along the journey.
- Final session end means arrival at the completed sleep island and full reveal. A temporary awakening is not arrival.
- Completed habitats preserve LIGHT, DEEP, and REM asleep-duration proportions. Awake interruptions add no land area.
- Show islands relevant to the selected day, including naps and sessions across midnight.
- Historical dates provide access to older islands. Do not accumulate them permanently in the bay.

### Stage vocabulary

| Recorded stage | Environment and boat behavior |
| --- | --- |
| LIGHT | Reed-lined shallows and normal cruising. |
| DEEP | Sheltered forest channel, closed cabin, and dim cabin lights. Daylight remains daylight. |
| REM | Coral, bioluminescent plants, and marine companions. |
| AWAKE | Temporary pause or anchoring and brighter cabin activity. |
| ASLEEP without stage classification | Neutral open-water passage and neutral island habitat. Preserve asleep duration without inventing a stage. |

- Preserve every recorded short awakening without rebuilding surrounding habitat. Show boat behavior when playback permits.
- Wake buoys in the focused view expose timing and duration. Reduce their prominence in the overview.
- REM companions may include fish, whales, rays, and sharks. Species vary encounters without encoding separate scores.
- Feature one large creature type per REM segment, optionally with fish. Keep encounters consistent on replay.
- Whales surface farther away. Rays glide beside or below the boat. Sharks cruise calmly outside the route.

### Return voyage

- Return the boat to the city during the awake interval, including before dawn or at night.
- Adapt return timing to allow the next sleep departure.
- The return is a functional scene transition, not recorded sleep or actual travel.

## Daylight and weather

- Base day and night on sunrise and sunset for the selected historical date and relevant location.
- Do not use waking time or the viewer's current clock.
- Use a default city selected by the user. Allow manual overrides for travel dates.
- Do not silently substitute the viewer's current location for a historical date.
- Initially use one representative city per date, including travel dates.
- Treat a travel day's weather and daylight as a single-location approximation. Defer location changes within a day.
- Reserve sky and wind-driven effects for historical weather estimates. Use distinct encodings for physiology.
- If weather is unavailable, use neutral lighting and show `Weather unavailable`.
- Disable data-driven rain, snow, and wind effects in that state. Continue valid astronomical daylight for the known date and location.
- Do not substitute today's weather or invent historical sunshine.
- Include simplified city-level historical weather in the first release. Clearly identify model-based estimates instead of claiming exact local observations.
- Open-Meteo Historical Weather with ECMWF IFS remains a documented candidate pending implementation checks. No live requests occurred.
- Forecast snapshots do not prove observed conditions. Apply the replay time-zone rules above.

## Visual review and scope boundaries

Use the [visual direction document](../design/visual-studies/visual-handoff.md) for element preferences, reference assets, detail level, materials, and lighting direction. Keep those details there rather than copying them into this specification.

- Create a warm, inhabited miniature city with softened silhouettes, clean matte color areas, and moderate structural detail.
- Concentrate industrial character in useful vessels, harbor activity, maintenance, and restrained equipment.
- Preserve readable silhouettes and required data distinctions, including exercise categories and missing information.
- Study traffic quantities, worker tasks, motion speeds, and manual lighting controls do not define data mappings or historical daylight.
- The latest interactive study is approximately 60/100. Its broad direction is correct, but final quality lacks approval.
- Pause repeated complete-scene style changes. Apply the representative-art gate below before asset expansion.
- The mixed asset strategy has approval in [ADR-0004](adr/0004-hybrid-world-assets.md). Blender remains a candidate without installation or integration approval.
- Reference objects are not mandatory product objects. Specific low-rise landmark themes remain open.
- Current public documentation does not establish Cardio Load as a dependable API landmark candidate.

## First-release scope

The user accepts these eight representations:

1. Total-energy traffic.
2. Step-driven pedestrians.
3. Daily HRV skyline.
4. Daily RHR dam and reservoir.
5. Heart-rate mountains and ridge train.
6. Sleep boat, stage environments, and islands.
7. Monthly exercise garden and gardener.
8. Historical daylight and estimated city weather.

Include the accepted synchronization, date selection, inspection, replay, missing-data states, free private hosting, and free-camera controls needed to use these representations.

Defer new physiological metrics and landmarks, multi-user registration, sharing, and follow-camera modes. Scope agreement does not establish successful account access, final art quality, or calibrated numerical scales.

## Acceptance criteria

| Scenario | Required behavior |
| --- | --- |
| Ordinary recorded day | Preserve recognizable home geography. Daily HRV/RHR and intraday activity/heart-rate representations agree with confirmed source values. Sleep chronology is inspectable. |
| Day with exercise sessions | Show correct reconciled flower count, category, active duration, completion timing, gardener state, and conditional high-zone saturation. Seeking never duplicates memories. |
| Partial or absent records | Distinguish zero, unavailable records, future time, loading, and synchronization failure. Keep unrelated valid streams and the last successful data usable. |
| Time-boundary cases | Sleep across midnight remains one session/island. Assign exercise to its completion month. Restore historical garden state. Preserve elapsed time across clock changes. |

Use verified account records for ordinary behavior. If real history lacks a rare boundary case, use clearly separated local synthetic fixtures. Do not insert fake records into Google Health.

Across all scenarios, check state restoration after replay and seeking, complete pause, camera preservation, and the overview button.

Apply the representative-art gate below before asset expansion. Overall visual approval and measured desktop performance remain required. The current 60/100 study is provisional.

## Remaining validation and calibration

- Account access, date attribution, RHR methods, source reconciliation, overlapping sleep awakenings, and agreement with source/app values.
- Numerical scales, scene capacity, exceptional values, coverage thresholds, and size/saturation conversions using actual records and prototypes.
- Incomplete or conflicting sessions, pause records, dense exercise days, sleep-route geometry, and very short return intervals.
- Exact camera limits, small control details, loading, retries, cache and retention mechanics, and measured performance.
- Historical weather availability and UTC/DST conversion for the source candidate.

These tasks refine or test the approved design. They do not approve new features. Record routine refinements here. Use ADRs only for consequential trade-offs.

## Validation gates and failure responses

These gates define evidence required after planning closure. They are not completed checks.

### Core account and API access

Pass evidence:

- Authorized read-only calls return accepted record types for selected dates.
- Units, timestamps, methods, and reconciliation are traceable.
- Values agree with the selected source interpretation. Any app differences have an explained cause.

Failure response:

1. Stop the affected representation.
2. Record the exact discrepancy.
3. Revisit only the necessary decision.

Do not silently substitute a metric, switch production to Takeout, or present fixtures as live records.

### Record quality and chronology

Pass evidence comes from representative records and isolated synthetic edge cases. It must demonstrate:

- Sessions without duplication.
- Valid accounting for stages, awake time, and active duration.
- Correct monthly attribution.
- Distinct zero, missing, error, and future states.

On failure, preserve source records. Flag review or unknown states. Correct the transformation. Check affected cases again before expansion.

### Numerical scene calibration

Typical, low, high, missing, and out-of-range fixtures must remain interpretable under shared scales across dates. Exact values and overflow must remain inspectable.

On failure, adjust the shared conversion and layout using evidence. Document the refinement. Do not normalize individual dates or hide exhausted capacity.

### Weather and historical clock

Pass evidence must demonstrate:

- Correct replay instants for source timestamps, weather categories, sunrise, and sunset, including clock changes.
- Source attribution.
- Disclosure that weather is a model estimate.

On failure, use the accepted unavailable-weather state. Keep valid astronomical daylight. Correct source and time handling before presenting weather as available.

### Representative art and performance

The user must accept one representative working boat in the browser before asset expansion. Check overview and detail scales, day and night, and motion. Then check representative architecture and vegetation.

Measure responsiveness and frame behavior on the user's primary desktop. Set the integrated prototype's performance budget before expanding assets.

Use the user's current Mac with Chrome as the primary desktop validation target. Record hardware and browser versions when measuring performance.

On failure, refine the representative asset and materials. Reduce decorative rendering cost where necessary while preserving data meaning. Do not expand unapproved assets. Offline renders do not establish runtime quality.

### Personal access, free operation, and clearing

Pass evidence must demonstrate:

- Only the intended account can retrieve health data.
- Client assets and logs do not expose credentials.
- Clear/disconnect removes actual app-held health data and its connection.
- Disconnection prevents automatic reimport without changing Google Health source records.
- Free-tier limit handling cannot trigger billing.

Resolve failed access, storage, or deletion checks before private deployment or real-data use. Stop or defer work constrained by quotas. Preserve the last successful data. Do not enable paid upgrades.

Use mocks or cached values for ordinary development and UI checks. Live read-only checks require a separately authorized connection step with a defined scope. Planning approval alone does not authorize that step.

The plan excludes source-record edits and synthetic test-data insertion into Google Health.

## Specification status

The user approved the consolidated plan on November 7, 2026, including:

- The eight-part scope.
- Four acceptance scenario categories.
- Retention and clearing policy.
- Record-review policy.
- Explicit display-overflow behavior.

The `grill-with-docs` planning interview is formally closed. Product policies and acceptance criteria have approval.

The user also closed the technical architecture interview on November 8, 2026. The [architecture decisions](adr/) define the accepted technical baseline. Implementation proceeds through small shared-learning milestones and the validation gates above.

API access and values, final art quality, and numerical and performance budgets remain unverified. The gates above define required evidence. Planning approval does not establish successful checks.

Recommended validation sequence:

1. Prepare a narrow read-only feasibility check using [data-sources.md](data-sources.md).
2. Check field values, date attribution, methods, reconciliation, and coverage before relying on them.
3. Apply the representative-working-boat visual gate.
4. Build a small one-day integrated prototype after the required authorization and quality gates.
5. Exercise ordinary, exercise, missing-data, and time-boundary scenarios.
6. Calibrate scales, density, and performance before expanding the world.

Actual account access requires connection setup and authorization. None occurred. The mixed asset strategy has approval. Blender and the detailed production workflow still require review and approval.

The current work is documentation and planning. Interview answers did not perform or authorize live health/weather calls, OAuth changes, cloud deployment, or large-scale implementation.
