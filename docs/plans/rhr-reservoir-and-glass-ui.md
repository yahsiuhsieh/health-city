# RHR Reservoir, Compact World, and Glass Interface Plan

**Checkpoint D passed visual review on November 25, 2026.** The user approved the Site A dam, intake gauge, and city view during rotation. The new gallery shows the reservoir with 30 towers, the staff gauge, and the unavailable state. [Checkpoint A gallery](../../design/visual-studies/rhr-and-shell/checkpoint-a/README.md) · [Checkpoint B recordings](../../design/visual-studies/rhr-and-shell/checkpoint-b/README.md) · [Checkpoint C gallery](../../design/visual-studies/rhr-and-shell/checkpoint-c/README.md) · [Checkpoint D gallery](../../design/visual-studies/rhr-and-shell/checkpoint-d/README.md)

This plan adds the daily RHR dam and reservoir. It also answers four user complaints about the current build. When this plan disagrees with an older plan, this plan controls. The [product specification](../product-spec.md) still controls data behavior. Phase 0 changes several specification rules. Section 3 lists them.

Read these files before you start:

- `AGENTS.md`
- `docs/product-spec.md`, sections "Exploration and inspection", "Playback and state restoration", "Resting heart rate landmark", and "Sleep sessions and islands"
- `docs/data-sources.md`, section "Daily RHR checks"
- `design/visual-studies/visual-handoff.md`
- `docs/adr/0004-hybrid-world-assets.md`
- `.agents/skills/img2threejs/SKILL.md`
- `docs/plans/sleep-voyage-v3.md`, sections 6, 7, and 11

Write Markdown in English. Use the `asd-ste100` skill for English technical writing.

## 1. User feedback

The user reviewed the build at commit `7de2ca0` on November 25, 2026:

1. The scene does not fill the screen. The user wants a full-screen scene with floating, translucent controls. Buttons and cards must look like Apple Liquid Glass. Cards must animate when they change. The user authorized a complete interface redesign. Keep only the controls that earn their place. The user named `Start of day` and `Completed day` as unnecessary.
2. The sleep island is too large. The largest island must be at most one third of the city. The user does not want to zoom far out to see the whole world. A shorter voyage is acceptable.
3. There are too many camera views. Each metric gets exactly one view. A click opens the card, and the camera rotates and flies to the object. Remove per-tower views and street views. The user can orbit to those places.
4. The harbor is too large for the city and uses too much space.

### 1.1 Measured causes

| Complaint | Cause in the code |
| --- | --- |
| Not full screen | `.app` has `max-width: 1680px` and side padding. `.world` has `height: min(65dvh, 780px)`. The header and replay panel sit outside the scene (`src/frontend/styles.css:12-20`). |
| Island too large | City land is about 54,400 m² (shoelace area of `coastSegments` in `src/scene/coastline.ts`). The island uses 24 m² per asleep minute, and the reef platform is `max(15000, 2.5 × land)` (`src/scene/sleep/island-shape.ts:76`). An 8 h night gives 11,520 m² of land and a 28,800 m² platform. The platform is 53% of the city. |
| World too wide | The jetty head is 275 m east and 395 m south of the harbor mouth (`src/scene/sleep/route.ts:11`). The route is 911 m. The world overview spans about 780 m × 520 m. The city is 258 m wide. |
| Too many views | `SceneView` has 13 values plus 5 tower views (`src/scene/skyline-layout.ts:8`). `CameraRig` sets each pose with a jump, without animation (`src/scene/BoatScene.tsx:89-232`). |
| Harbor too large | The breakwater arms span about 193 m × 195 m (`breakwaterArms` in `src/scene/city/harbor-plan.ts`). This is about the size of the city. The 58 m freighter and its cargo quay set most of that size. |

### 1.2 User decisions on November 25, 2026

| Topic | Decision |
| --- | --- |
| Island scale | 10 m² per asleep minute, no cap. The user accepts that a night longer than 12 h makes an island larger than one third of the city. |
| Freighter | Remove the freighter and the cargo crane. Fill the space with smaller harbor objects, so the harbor does not look empty (section 6.2). |
| RHR range | The user's RHR is usually 55–65 bpm. A 110 bpm ceiling wastes most of the gauge. Use 40–80 bpm (section 9.3). |
| Date loading | Load automatically when the date changes. |
| Cards | Each card shows the selected day, the previous seven days, and their average, with charts. Visual hierarchy must make the main value clear at a glance (section 8.5). Intraday cards put the seven-day chart in a second tab. |
| Lighting | Remove `Day` and `Night`. Lighting becomes automatic from the sun position in the daylight and weather plan. |
| Ridge | Remove the thin lines on the heart-rate ridge (section 6.4). |
| Seven-day data | Read from D1. Store each stream in its own table at source resolution, like `heart_rate_days`. Compute daily totals at read time (section 10). |

## 2. Accepted direction

| Topic | Proposal |
| --- | --- |
| Shell | Full-screen canvas. No page header and no page footer. Every control floats on the scene. |
| Material | Liquid-glass surfaces: blur, saturation, a specular edge, and a soft shadow. Use a solid fallback for reduced transparency. |
| Navigation | One metric dock. One chip per metric plus `World`. A chip or a scene object opens the card and starts a camera flight. |
| Views | Seven focus targets. No other preset views in the product UI. |
| Island scale | 10 m² of land per asleep minute. Linear, no cap. A 12 h night uses one third of the city. |
| Reef orientation | Move the mouth toward the city. Orient the elongated island platform north–south to meet the world width target. |
| Voyage | Route of 400 ± 20 m. Island east of the harbor, inside the city's north–south extent. |
| Harbor | Compact working harbor, outer size at most 95 m × 80 m. Replace the freighter and cargo quay with small fishing-harbor objects. |
| RHR site | A fixed upland valley at the north-west corner of the city, separate from the heart-rate ridge. |
| Dam | Curved concrete gravity dam with a gated spillway, an intake tower, and a staff gauge in bpm. |
| RHR mapping | 40–80 bpm over 16 m, 0.4 m per bpm. |
| Cards | Hero value, neutral comparison with the seven-day average, a today chart where intraday data exists, and a seven-day chart. |

## 3. Specification changes for Phase 0

Update `docs/product-spec.md`, `GLOSSARY.md`, and `docs/data-sources.md` after the user approves. Record the approval date.

### 3.1 Rules that change

| Current rule | New rule |
| --- | --- |
| "Use 24 m² of land per asleep minute across all session sizes." | Use 10 m² of land per asleep minute across all session sizes. Apply no minimum or maximum island area. |
| Reef platform minimum of 15,000 m² (code only). | Reef platform area is 2.5 × land area, with a 2,500 m² minimum. |
| "The measured route is 911.14 m against a target of 900 ± 25 m." | The measured route is 400 ± 20 m. Keep the fixed harbor mouth, the marked reef passage, the eastern rounding, and the 1 m jetty slide. Record the measured length and passage distances. |
| "Allow direct seeking and shortcuts, including the completed-day state." | Keep the rule. Satisfy it with the scrubber and keyboard keys (`Home`, `End`). Remove the two buttons. |
| "Provide a `World view` button." | Keep the rule. The `World` chip in the metric dock is that button. |
| Exploration has no rule about preset views. | Each data representation has exactly one focus view. A focus change animates the camera. |
| RHR: "Dam form, location, capacity, missing-value appearance, and auxiliary motion remain open." | Resolve these items with sections 9.2 to 9.6 of this plan. |
| RHR: "Exact conversion remains open." | Water level is `4 + (bpm − 40) × 0.4` m above the dam toe for every date. Values outside 40–80 bpm sit at the nearest gauge limit, and the card states this. |
| Exploration has no rule about history in cards. | A card shows the selected date's value, the values of the seven previous dates, and the mean of those seven. The mean uses only available values and states how many dates it uses. Comparisons use neutral words, without a grade or good/bad colors. |
| Sleep-day attribution for summaries is open. | The seven-night chart assigns each session's asleep time to the civil date on which the session ends, in the replay time zone. Naps count toward that date. |
| `docs/data-sources.md` storage inventory | Add the six per-stream tables with the fields, purposes, and resolutions in section 10.2. Add them to the clearing inventory. Replace "The Worker does not store sleep records in D1" with the `sleep_sessions` rules. |
| Data loads after an explicit `Load day` action. | The selected date loads automatically after a date change. `Refresh` stays available. |

### 3.2 Rules that do not change

- Island area is proportional to time asleep. Doubling asleep time doubles area.
- A 12 h night reaches one third of the city. A longer night is larger than one third. A hard cap breaks proportionality, so this plan does not add one. The user accepted this trade-off on November 25, 2026.
- Clicking a data object pauses replay and keeps date, replay time, and camera state. The camera flight is a requested camera change, not a change caused by the card.
- Missing RHR must not become zero or an invented value.
- The reservoir stays separate from the sea and from weather effects.

## 4. Scope

### 4.1 In scope

1. Full-screen glass interface.
2. Seven focus targets with animated camera flights.
3. Compact harbor, smaller island scale, shorter route, moved outer reef.
4. RHR data in the day replay response and the synthetic fixtures.
5. Dam, reservoir, valley terrain, and RHR card.
6. Seven-day summary data and card charts for Sleep, Heart, HRV, RHR, Steps, and Energy.

### 4.2 Out of scope

- Exercise garden and weather. Leave a dock slot plan for them, but do not build them.
- History longer than seven previous dates, and trend analysis.
- Full background synchronization and correction detection for older dates. A later synchronization plan owns them. This plan adds only the per-stream tables in section 10.2.
- New npm dependencies. Use CSS, the Web Animations API, and the View Transitions API.

## 5. Phase order

| Phase | Work | Gate |
| --- | --- | --- |
| 0 | Specification changes in section 3 | User approval |
| 1 | Compact world: harbor, island, route, reef | Checkpoint A screenshots |
| 2 | Focus targets and camera flights | Checkpoint B video |
| 3 | Glass interface shell | Checkpoint C screenshots and video |
| 4 | RHR data path (section 9.8) and seven-day summary data (section 10) | Unit tests |
| 5 | Dam, reservoir, and RHR card | Checkpoint D screenshots |
| 6 | Final checks and performance | Section 11 |

Phase 4 does not depend on phases 1 to 3. The card charts in section 8.5 need Phase 4 data. Build them with synthetic fixtures first. Phase 5 depends on Phase 1, because the valley position depends on the final world bounds. Store checkpoint media in `design/visual-studies/rhr-and-shell/checkpoint-<letter>/` with a `README.md`.

## 6. Phase 1: compact world

### 6.1 Targets

| Measure | Current | Target |
| --- | --- | --- |
| Harbor outer bounds (breakwater to breakwater) | about 193 m × 195 m | ≤ 95 m × 80 m |
| Turning basin radius | 48 m | 18 m (0.9 × the 20 m working boat length) |
| Route length | 911.14 m | 400 ± 20 m |
| Reef platform for a 12 h night | 43,200 m² | 18,000 m² (≤ 1/3 of city land) |
| World bounds (city, harbor, reef, 12 h island) | about 780 m × 520 m | ≤ 1.7 × city width and ≤ 1.15 × city depth |
| City share of the overview at 1440 × 900 | not measured | City spans ≥ 50% of the canvas width |

Compute the city land area in a unit test from `coastSegments`. Do not hard-code 54,400 m².

### 6.2 Harbor

Keep a small, believable working harbor on the east waterfront:

1. Remove the freighter, the cargo quay, the rail-mounted jib crane, the forklift, the trailer, and the storage bays. Remove the `berth` card and the `cargo` view.
2. Fill the former cargo area with small fishing-harbor objects at true scale. The harbor must look busy at the harbor close view, not empty:
   - Two inshore fishing boats (8–10 m) and one small crab boat along the quay.
   - A harbor master office: two storeys, a signal mast, and a flag.
   - An open-sided fish market shed with an awning, ice bins, and crates.
   - A slipway with a small boat on a cradle and a winch house.
   - A small quay davit crane (2–3 t) with a hook block.
   - A fuel pontoon with one pump.
   - Quay clutter: stacked fish crates (0.6 m), lobster pots (0.8 m), coiled ropes, net drying racks, bollards, cleats, ladders, fenders, and lifebuoy posts.
   - Two parked vans and a hand cart.
   - No extra people. Pedestrians stay step-driven.
   Keep the clutter in groups, not spread evenly. Leave clear walking lanes along the quay edge. Check every object at the harbor close view and the world overview.
3. Keep the working boat berth on a quay. The boat must still leave bow first and return bow first (sleep-voyage-v3, section 7). Keep the 180° turn in the basin.
4. Keep one trawler, one water taxi, and a marina finger pier with four small boats (two schooners, two motorboats). Remove the tug and the second trawler.
5. Use two short rubble breakwaters with red and green light towers. The mouth faces east.
6. Reconnect Quay Road, the promenade, the pedestrian routes, and traffic routes to the new quay edge. Remove orphaned roads and walk segments.
7. Update `scripts/build-harbor-fleet.mjs` and `scripts/build-cargo-berth.mjs`. Delete generated `.glb` files that nothing loads. Keep the build scripts reproducible.

### 6.3 Island and route

1. Set `ISLAND_M2_PER_ASLEEP_MINUTE` to 10. Set the platform rule to `max(2500, 2.5 × area)`.
2. Move the island east of the harbor. Keep the island platform between z = −120 and z = +120 (the city's north–south extent).
3. Move and scale the outer reef so that the marked passage stays north of the reef. Keep five crests on a shared shelf. Scale crest spacing with the route.
4. Rebuild `offshoreCourse` and `inbound` in `src/scene/sleep/route.ts` for the new jetty head. Keep the turn radius at or above 3 × the boat length.
5. Recheck the boat speed. The boat covers the route over the same session time, so it moves more slowly. Confirm that wake and bow wave still look correct at the slower speed (sleep-voyage-v3, section 6.4).
6. Recheck mist reveal distances, wildlife clearances, and wake buoy spacing. Scale distances that the old route length set.
7. Update tests that assert 900 m, 24 m², or old coordinates. Change the expected values. Do not delete the assertions.
8. Update the route map in `VoyageChart` and the `0.9 km` label.

### 6.4 Heart-rate ridge surface

With recorded data, the ridge shows many thin lines. The user finds this unrealistic. The code review found these probable causes in `src/scene/HeartRidge.tsx` and `src/scene/ridge-profile.ts`. Confirm them with a screenshot before you change the code.

| Cause | Code | Effect |
| --- | --- | --- |
| Staircase crest | `height()` holds each five-minute mean flat and blends only at interval edges with a half smoothstep. | 288 terraces over 146 m, each about 0.5 m wide. Noisy recorded data gives a step at almost every interval. |
| Thin facets | `ridgeMesh` extrudes one 10-point cross-section every 0.25 m. The geometry is not indexed, so `computeVertexNormals` gives one normal per triangle. | Each strip catches light differently. The flanks show vertical stripes. |
| One cross-section shape | Every section uses the same 10 points, scaled by height. | Long creases run along the full ridge, like contour lines. |
| Color bands | Nine palette colors, one per cross-section band, with a small per-strip tint change. | Horizontal color stripes along the ridge. |
| Line rails | The track uses `lineSegments` with `lineBasicMaterial`. | 1 px aliased lines that flicker with steep track changes. |

Fix:

1. **Crest curve.** Interpolate between interval centers with a monotone cubic (Fritsch–Carlson or Steffen). The curve passes through each interval's elevation at its center. It never goes above or below its two neighbors, so it adds no peaks. Inspection still reports the exact interval mean.
2. **Terrain.** Replace the strip extrusion with an indexed heightfield grid at about 0.75 m spacing. Derive each height from the crest curve and a cross-ridge falloff. Shared vertices give smooth normals.
3. **Natural relief.** Add fixed, seeded noise for spurs, gullies, and erosion on the flanks. The noise is the same on every date. Clamp it so that no point rises above the crest height at its position. Spurs run downhill, perpendicular to the crest, as on real ridges.
4. **Material.** Replace the nine color bands with a material from slope, height, and world-space noise. Use grass and forest low and scrub higher. Use exposed rock on steep slopes and scree below cliffs. Use no per-strip tint.
5. **Rails.** Build rails as thin mesh profiles and sleepers as instanced boxes. Keep the rail bed on the smoothed `shelves` line.
6. **Vegetation.** Place trees by slope and height, denser in gullies. Keep the existing tree and rock counts as an upper limit.

Tests:

- The crest equals each interval elevation at the interval center.
- Between two centers, the crest stays within the two elevations.
- Noise never lifts the surface above the crest.
- Gaps keep the tunnel behavior and the `No data` signs.

### 6.5 Checkpoint A

Capture day and night images: world overview, harbor close view, island at 4 h, 8 h, and 12 h asleep. Put the old and new overview side by side at the same canvas size. Add before and after images of the heart-rate ridge with one recorded day, from the `heart` focus and from a low side angle.

## 7. Phase 2: focus targets and camera flights

### 7.1 Focus targets

Replace `SceneView` with `FocusTarget`. Remove every other preset view from the product UI. Dev-only review query parameters (`reviewPlot`, `reviewCoast`, `reviewStreet`, `cityPreview`) can stay behind `import.meta.env.DEV`.

| Focus | Scene objects that open it | Camera target |
| --- | --- | --- |
| `world` | none | Fit the world bounds from section 6.1 |
| `sleep` | Boat, island, wake buoy, jetty | Follow the boat while it sails. Frame the island after arrival. Frame the berth when no session exists. |
| `heart` | Ridge, train, tunnel | Ridge center, side view along the ridge |
| `hrv` | Any tower or HRV plot | Skyline district, three-quarter view |
| `rhr` | Dam, reservoir, gauge, intake tower | Dam and reservoir, from downstream and above |
| `steps` | Pedestrians | Main pedestrian route at the market crossing |
| `energy` | Vehicles | Market Avenue |

Remove the boat card, the berth card, the tower design views, the street views (`walk`, `road`, `square`, `side`), `detail`, `harbor`, and `sleep-island`. A click on the boat opens the Sleep card. A click on a wake buoy opens the Sleep card and highlights that awakening. A click on the ridge opens the Heart card at that interval.

### 7.2 Pose definition

Each focus defines a target point, an azimuth, a polar angle, and a framing box in metres. The zoom is `min(canvasWidth / boxWidth, canvasHeight / boxHeight)`, as now.

When a card is open, the object must not sit under the card. Use `camera.setViewOffset` to move the frame center into the free area. On desktop, the free area is the canvas minus the card column. On mobile, it is the area above the bottom sheet.

### 7.3 Flight

1. Duration: `clamp(0.9 + 0.35 × log2(1 + distance / 50), 0.9, 1.8)` seconds. `distance` is the target travel in metres.
2. Target path: cubic ease-in-out.
3. Azimuth: take the shorter arc. If the arc is less than 25°, add a 25° sweep in the same direction and settle back. This gives the requested rotation on short moves.
4. Zoom: interpolate in log space. A long flight pulls out at the midpoint. "Long" means travel over 1.5 × the larger framing width. The midpoint zoom is 0.7 × the smaller of the two zoom values.
5. Moving target (sleep boat): blend from the flight pose into the live follow pose over the last 30% of the flight.
6. Disable `OrbitControls` during the flight. Any pointer, wheel, or touch input cancels the flight and leaves the camera at its current pose.
7. With `prefers-reduced-motion: reduce`, use a 250 ms fade of the target and zoom, with no sweep.
8. Respect the existing polar limits and `addCameraClearance`.
9. A flight does not change date, replay time, or play state. The click handler pauses replay, as the specification requires.

### 7.4 Tests

- Unit test: the final pose of each flight equals the static focus pose within 0.01 m and 0.1°.
- Unit test: input during a flight cancels it.
- Browser test: a chip click opens the card and the final screenshot matches the static focus pose.

### 7.5 Checkpoint B

Record a video at 1440 × 900: World, then Sleep, HRV, Heart, RHR placeholder, Steps, Energy, then World. Record one reduced-motion pass.

## 8. Phase 3: glass interface shell

### 8.1 Layout

The canvas fills `100vw × 100dvh`. Floating layers use safe-area insets.

```text
┌────────────────────────────────────────────────────────────────┐
│ ( HealthCity · Wed, Nov 11 ▾ )  ● Google Health        ( ⚙ )   │
│                                                 ┌────────────┐ │
│                                                 │            │ │
│                  full-screen 3D scene           │    card    │ │
│                                                 │            │ │
│                                                 └────────────┘ │
│     ┌──────────────────────────────────────────────────────┐   │
│     │ World │ Sleep 7h22 │ Heart 72 │ HRV 48 │ RHR 58 │ …  │   │
│     └──────────────────────────────────────────────────────┘   │
│         ( ▶ )  09:05  ━━━━━━━━━●──────────────────  240×       │
└────────────────────────────────────────────────────────────────┘
```

| Element | Content |
| --- | --- |
| Date pill (top left) | Brand mark, date, and previous/next day arrows. The pill opens a popover with the date list (synthetic) or a date field (Google Health). The popover shows the replay time zone. |
| Status (beside the date) | One dot and one short label: `Synthetic data`, `Google Health`, `Cached`, `Loading…`, or an error. Partial stream failures appear in a toast. |
| Settings button (top right) | Menu: data source, refresh, account, and sign in. |
| Metric dock (bottom) | `World` plus one chip per metric. Each chip shows an icon, a name, and its current value. Missing data shows an em dash and a dimmed chip. The active chip has a filled glass state. |
| Playback capsule (bottom) | Play/pause, time readout, scrubber with 00:00–24:00 ticks, and a speed chip that cycles 60×, 240×, 480×. Mark future time and missing intervals on the scrubber track. |
| Card | Desktop: right column, 380 px wide, full height minus margins. The Sleep card uses 520 px. Mobile: bottom sheet with two detents. |
| Toast (top center) | Loading errors, `No health records for this date`, graphics loss, update available. |

### 8.2 Controls to remove

| Control | Action |
| --- | --- |
| Page header, footer review note, scene heading `h1` | Remove. The date pill and the card carry this content. |
| `Start of day`, `Completed day` | Remove. Use the scrubber, `Home`, and `End`. |
| View picker select, `Inspect …` button | Remove. The dock replaces them. |
| Steps and energy readouts in the replay panel | Move into the dock chips. |
| `Day` / `Night` buttons | Remove from the product UI. Keep the night lighting code. Add a dev-only `?lighting=night` query parameter for asset review. The later daylight and weather plan replaces both with automatic lighting (section 8.8). |
| Orbit hint text | Show once as a toast on the first visit. Store the dismissal in `localStorage` inside `try`/`catch`. |
| `Load day` button | Load automatically when the date changes, with a 300 ms debounce. Keep `Refresh` in the settings menu. |
| Sleep session select | Move into the Sleep card as a segmented control when more than one session exists. |
| Separate wake buoy and heart interval cards | Merge into the Sleep and Heart cards. |

Keyboard: `Space` toggles play. `←` and `→` move 5 min. `Home` and `End` seek. `Esc` closes the card and returns focus to its chip. `1` to `7` select dock chips.

### 8.3 Glass material

Define tokens on `:root`. Use them for every glass surface.

```css
--glass-fill: rgb(255 255 255 / 0.20);
--glass-fill-strong: rgb(255 255 255 / 0.42); /* text-heavy cards */
--glass-blur: blur(22px) saturate(180%) brightness(1.04);
--glass-edge: rgb(255 255 255 / 0.55);
--glass-shadow: 0 1px 0 rgb(255 255 255 / 0.45) inset, 0 18px 50px rgb(8 28 36 / 0.20);
--radius-capsule: 999px;
--radius-card: 28px;
```

1. Draw the edge as a gradient border with `mask`, bright at the top and faint at the bottom.
2. Add a specular highlight with a top-to-middle linear gradient at about 25% opacity.
3. In Chromium, add a refraction layer with an SVG `feDisplacementMap` in `backdrop-filter: url(#glass)`. Feature-detect it. Other browsers use blur only.
4. Night lighting switches the glass to a dark tint (`rgb(16 26 34 / 0.38)`) with light text.
5. With `prefers-reduced-transparency: reduce`, use opaque fills.
6. Text contrast must be at least 4.5:1 over the brightest and the busiest scene areas. Check sea glare, white towers, and the night sky.

### 8.4 Motion

1. Chip to card: shared-element morph with the View Transitions API (`view-transition-name`). Fallback: FLIP with the Web Animations API.
2. Use a spring curve written as CSS `linear()` (stiffness about 300, damping about 26). Card content fades in with a 30 ms stagger.
3. Card to card: keep the card frame. Animate its height. Cross-fade the content. Do not close and reopen.
4. Chip press: scale to 0.96, then spring back.
5. Synchronize the card morph with the camera flight start.
6. Reduced motion: opacity transitions only, 150 ms.

### 8.5 Cards and charts

Keep existing data rules and labels for missing, failed, synthetic, and cached states.

#### 8.5.1 Card anatomy

Every card uses the same order, from most to least important. The reader must get the answer from the first two rows. The comparison line always stays above any tabs, so the seven-day context is visible without a tap.

Daily metrics (HRV, RHR) have one chart only, so they have no tabs:

```text
┌──────────────────────────────────────┐
│ RESTING HEART RATE               ×   │  1 Category (12 px caps, secondary ink)
│                                      │
│ 58 bpm                               │  2 Hero value (44 px, tabular numerals)
│ ▲ 2 above 7-day average · 56         │  3 Comparison (14 px, neutral ink)
│ Wed, Nov 11 · With sleep data        │  4 Context (13 px, muted ink)
│ ──────────────────────────────────── │
│ LAST 7 DAYS                          │  5 Seven-day chart
│ •──•──•──•──•──•──•──●  - - avg 56   │
│ ──────────────────────────────────── │
│ Method      With sleep data          │  6 Details list
│ In the city 11.2 m water level        │
│ A daily summary. Not your heart rate │  7 Footnote (11 px, muted ink)
│ at this moment.                      │
└──────────────────────────────────────┘
```

Intraday metrics (Sleep, Heart, Steps, Energy) have a today view and a seven-day view. They use a two-segment control:

```text
┌──────────────────────────────────────┐
│ STEPS                            ×   │
│ 4,210  · Day total 9,830                      │
│ ▼ 1,140 below 7-day average · 10,970 │
│ Wed, Nov 11 · 09:05                  │
│ ( Today | 7 days )                   │  Segmented control
│ ▁▂▂▃▅▇▆▅▃▂ ┊ ░░░░░                   │  Panel for the selected segment
│ ──────────────────────────────────── │
│ Details list                         │
└──────────────────────────────────────┘
```

Tab rules:

1. Default segment: `Today`. The world shows today, so the card starts with today.
2. Keep the selected segment for the session across cards. A user who picks `7 days` on Steps sees `7 days` on Energy.
3. The segment change slides the panel horizontally and animates the card height with the spring from section 8.4.
4. The details list and footnote stay outside the panel. They do not change with the segment.
5. Keyboard: arrow keys move between segments. Use `role="tablist"` semantics.

Why tabs only for intraday metrics: a tab that contains the only chart adds a tap and hides nothing. Stacked charts make the intraday cards too tall, mainly on phones. The comparison line already answers "is today unusual?", so the seven-day chart can sit one tap away.

1. The hero value is the selected date's value. For intraday metrics, it is the value at the replay time, because that is what the world shows.
2. The comparison line compares the selected date with the mean of the seven previous dates. Use `above`, `below`, or `same as`. Use a red ▲ for above and a green ▼ for below. Keep the comparison text in neutral ink.
3. Show the comparison only when at least 3 of the 7 previous dates have values. Otherwise show `Not enough earlier data (2 of 7 days)`.
4. When fewer than 7 previous dates have values, the average label states the count: `avg of 5 days`.
5. Section titles inside the card use 11 px caps in secondary ink.

#### 8.5.2 Per-card content

| Card | Hero | `Today` panel | `7 days` panel, or the single chart | Details |
| --- | --- | --- | --- | --- |
| Sleep | Time asleep through the replay position, as now (`7 h 22 min`) | Current stage bar and four-row timeline from `VoyageChart` | Stacked bars per night: Deep, Light, REM, unclassified asleep. Awake time is excluded. | Route map, sleep start, wake time, awakenings, island area |
| Heart | Five-minute mean at the replay time or the selected interval (`72 bpm`) | 24 h line of five-minute means. Gaps for missing intervals. Replay cursor. | Thin lines connect the lowest and highest five-minute means per day. A dot marks the daily mean. | Interval, source, `Five-minute averages` note |
| HRV | Daily RMSSD (`48.2 ms`) | none | Bars from zero. The bars echo the towers. | Tower count, `1 tower per 5 ms`, display-limit note |
| RHR | Daily bpm (`58 bpm`) | none | Dots joined by a line. Y axis does not start at zero. | Section 9.7 |
| Steps | Steps so far today (`4,210`), with the replay time and a separate `Day total` before 24:00 | Hourly bars. Bars after the replay time use the future style. Replay cursor. | Daily total bars from zero | Five-minute steps, figures on the walk, mapping note |
| Energy | kcal so far today (`1,240 kcal`), with the day total in muted ink | Hourly bars, as for steps | Daily total bars from zero | Five-minute kcal/min, vehicles on the road, basal energy note |

The Sleep card keeps its 520 px width. Its seven-night chart goes after the timeline and before the route map.

#### 8.5.3 Chart rules

Build the charts as plain SVG React components in `src/frontend/charts/`. Do not add a chart library. Shared parts: `SevenDayBars`, `SevenDayDots`, `SevenDayRange`, `SevenDayStack`, `IntradayLine`, `HourlyBars`, `AverageLine`, and `ChartTooltip`.

| Rule | Value |
| --- | --- |
| Size | Seven-day chart 112 px high. Today chart 96 px high. Full card width minus padding. |
| Order | Oldest date on the left. The selected date is the eighth and last mark. |
| Emphasis | The selected date uses the full metric color and carries the only value label. The seven earlier dates use the same hue at a lighter step. Do not use opacity for this. Opacity mixes with the glass and the scene. |
| Average | Dashed 1.5 px line in secondary ink across the seven earlier dates. Place its label above the grid. |
| Bars | 4 px rounded top corners, square at the baseline. 2 px gap between stacked segments. Bars start at zero. |
| Lines and dots | 2 px line. 8 px dots. A 2 px surface-color ring around each dot. |
| Grid and axes | At most three horizontal grid lines, 1 px, very low contrast. Axis labels 11 px, tabular numerals, secondary ink. Label the lower and upper Y-axis bounds. X labels use short weekday names. The selected date label is bold. |
| Missing date | No mark. A short dash at the baseline. Tooltip: `No data`. |
| Partial date | Use the available measurements and the regular series mark. Omit coverage text from the reading card. |
| RHR conflict date | Show the unavailable mark. Exclude the date from the average. |
| Intraday future | Lighter step, no hatch. The replay cursor is a 1 px vertical line in primary ink. |
| Text | Values, labels, and legends use text ink, never the series color. |
| Legend | Single-series charts need no legend. The Sleep stacked chart reuses the stage legend that already sits above it. |

Metric colors: give each metric one fixed hue. The dock chip icon uses the same hue. Reuse the existing sleep stage colors. Check the metric hues and the stage hues with a palette validator for color-vision deficiency separation and contrast. Check them against the light glass surface and the night glass surface. Marks need at least 3:1 contrast against the card surface.

Interaction and access:

1. Hover or touch on a mark shows a tooltip with the date, the value, and the status. The hit target is the full column, not only the mark. The intraday line uses a crosshair.
2. Each chart has `role="img"` and an `aria-label` that states the selected value and the average.
3. Show the selected reading in a compact card. Support pointer, touch, and arrow-key selection. On the Heart card, show the mean, low, and high. Display local clock times as HH:mm throughout the replay.
4. Charts animate in once when the card opens: bars grow from the baseline over 300 ms with a 20 ms stagger. A metric change in an open card animates values from old to new. Reduced motion: no growth, fade only.

Loading and errors:

1. The day card content shows at once. The seven-day chart shows a skeleton until its data arrives.
2. If the seven-day read fails, show `Could not load the last 7 days` with a `Retry` button. The rest of the card stays usable.

#### 8.5.4 Dock chips

Each chip shows the hero value in short form: `7h 22m`, `72`, `48`, `58`, `4.2k`, `1.2k`. Chips do not show the comparison. Missing data shows an em dash.

### 8.6 Performance

`backdrop-filter` over a WebGL canvas costs GPU time. Keep at most five glass surfaces visible at once. Measure with the method in `design/visual-studies/city-v2/performance.md`. The shell may add at most 2 ms of GPU frame time at 1440 × 900. If it adds more, reduce the blur radius before you remove surfaces.

### 8.7 Checkpoint C

Capture desktop and phone screenshots: overview with no card, each card open with its charts, day lighting and `?lighting=night`, and reduced transparency. Include the missing, partial, and "not enough earlier data" chart states. Record a video of card-to-card changes.

### 8.8 Lighting handoff

This plan removes the `Day` and `Night` buttons. A later daylight and weather plan makes lighting automatic. It does not need user input. Prepare for it now:

1. Put all lighting values in one module. The module holds sun direction, sun color and intensity, sky gradient, fog color, and ambient light. It also holds window lights, street lamps, and the glass tint. Drive them from one input, the sun elevation in degrees. Today the input is fixed at a day value, or a night value with `?lighting=night`.
2. The later plan computes sun elevation from the home city's latitude and longitude and the replay instant. This is astronomy and needs no API call. It gives dawn and dusk phases that a sunrise and sunset pair cannot give:

| Sun elevation | Phase |
| --- | --- |
| above 6° | Day |
| 0° to 6° | Golden hour |
| −6° to 0° | Civil twilight. Street lamps turn on at −2°. |
| −12° to −6° | Blue hour |
| below −12° | Night |

3. Interpolate between phases. Do not switch at a threshold.
4. Weather from Open-Meteo then adds cloud cover, rain, and snow on top of the sun-driven lighting. Compare the computed sunrise and sunset with Open-Meteo values in a test.

The specification already requires daylight from the historical date and location. This handoff changes no rule.

## 9. Phases 4 and 5: RHR dam and reservoir

### 9.1 Can it look real?

Yes, if the design copies how real reservoirs show their level. Real reservoirs show a pale drawdown band of bare rock and soil between the water and the full supply line. Vegetation starts above that line. A staff gauge on the intake tower gives the exact level. This plan uses both cues. The band shows the level at a glance. The gauge gives the number.

### 9.2 Site

Add a fixed upland valley at the north-west corner of the city:

1. The valley lies north of the heart-rate ridge's north end. A fixed saddle separates it from the ridge. Data never changes the valley terrain.
2. The valley opens to the south-east, toward the default overview camera. The downstream dam face and the reservoir are both visible in the overview.
3. Towers must not hide the dam crest in the world overview. Check this with the maximum HRV tower count.
4. The tailwater creek runs from the stilling basin to the north coast. A road crosses it on a small bridge.
5. Use forested hills in the city's temperate palette. Do not reuse the bare ridge material.

The user selected Site A at the ridge saddle after reviewing both candidates. The north-west shore extends around the dam and its outlet. The full water surface measures 71 m × 43 m. A grass verge separates the outer slope from Valley Lane.

### 9.3 Dimensions and level mapping

| Element | Value |
| --- | --- |
| Dam type | Concrete gravity dam, curved in plan (radius about 120 m) |
| Crest length | about 70 m |
| Height above the toe | 22 m |
| Crest | 6 m service road, parapets, lamps |
| Reservoir at the full display level | about 80 m × 50 m |
| Dead storage level | +3 m (always under water) |
| Gauge range | 40 to 80 bpm |
| Level at 40 bpm | +4 m |
| Level at 80 bpm | +20 m |
| Scale | 0.4 m per bpm, linear |
| Spillway crest | +20.5 m |
| Dam crest | +22 m (2 m freeboard) |

Level formula: `level = 4 + (bpm − 40) × 0.4` metres above the toe. Use the same formula for every date.

Why 40–80 bpm: the user's RHR is usually 55–65 bpm. With 30–110 bpm, that band uses only 12% of the gauge, and a 3 bpm change moves the water 0.6 m. With 40–80 bpm, the band sits at 10–14 m, near the middle of the gauge, with room above and below. A 3 bpm change moves the water 1.2 m, which shows clearly on the drawdown band.

A value outside 40–80 bpm sits at the nearest gauge limit. The card shows the exact value and `Outside the gauge range`. This is not a silent cap. Illness or travel can push RHR above 80 bpm, so test that state.

The water never reaches the spillway crest. The spillway gates stay closed. A full reservoir does not mean a good result. The card must not imply a grade.

### 9.4 Dam details

- Ogee spillway in the center with three radial gates on piers. The gate hoist houses stand on the crest.
- Smooth spillway chute to a stilling basin with baffle blocks.
- Intake tower in the reservoir, joined to the crest by a footbridge. The tower carries the staff gauge.
- Staff gauge: small marks every 1 bpm (0.4 m apart), long marks every 5 bpm, numbers every 10 bpm. Long marks must be readable in the RHR focus view.
- Small powerhouse at the toe, with a penstock.
- Low-level outlet at the toe with a constant small release jet into the creek. This is the only auxiliary motion. It does not encode data. It stops when replay pauses.
- Night: crest lamps, a tower light, and a lit gauge.

### 9.5 Reservoir

1. Model the basin as a heightfield. The water area must grow smoothly with level. No sudden flooding of flat shelves.
2. Render the water as a flat plane at the level height, clipped by the terrain. Use a depth-based shore tint.
3. Water color: still, darker green-blue than the sea. Small ripples only. No surf, no foam, no swell. Weather effects must not change it.
4. Drawdown band: bare pale rock and soil between the water line and the full supply line (+20 m). Add faint horizontal strand lines. Grass and trees start above +20.5 m.
5. Do not show cracked mud or dead fish. These suggest drought or damage.

### 9.6 Missing, failed, and conflicting values

| State | Scene | Card |
| --- | --- | --- |
| Loading | Last confirmed level is not shown. Basin uses the unavailable look. | `Loading…` |
| No record (successful query) | Unavailable look | `No RHR data` |
| Read failed | Unavailable look | `RHR read failed` |
| One record | Water at the mapped level | Value and method |
| Several records, same value and method | Water at the mapped level | Value and method |
| Records that disagree after method selection | Unavailable look | `—` |

Unavailable look: no water plane. A neutral survey-grey basin floor, not cracked mud. A translucent capacity envelope, in the same visual language as the HRV tower envelope. A closed shutter covers the gauge. This look must not read as an empty reservoir or zero.

The specification forbids averaging methods or picking the lowest value. The conflict state follows that rule. Select `WITH_SLEEP` first, then `ONLY_WITH_AWAKE_DATA`. Apply the agreement check to the selected records.

### 9.7 RHR card

Follow the anatomy in section 8.5.1:

- Category: `Resting heart rate`.
- Hero: `58 bpm`.
- Comparison: `▲ 2 above 7-day average · 56`.
- Context: `Wed, Nov 11 · With sleep data`.
- Seven-day chart: dots joined by a line, with the average line. The y axis spans the visible values ± 3 bpm, rounded to 5 bpm.
- Details: calculation method (`With sleep data`, `Awake data only`, `Method not specified`, or the raw unknown enum), source (`Google Health` or `Synthetic`), water level (`11.2 m above the toe · 0.4 m per bpm`).
- Footnote: `A daily summary. It is not your heart rate at this moment.`
- A method change between dates is not a trend. If the seven dates use more than one method, mark each dot's method in its tooltip and add the footnote `Methods differ across these days.`

### 9.8 Data path (Phase 4)

1. Add `rhr` to the `/api/replay/day` response in the Worker. Read `daily-resting-heart-rate` through `reconcile` for the selected civil date. Reuse the existing filter, page limits, and date checks in `src/worker/health-data.ts`.
2. Response type: `ReplayStream<RhrRecord[]>`, where `RhrRecord = { bpm: number; method: string | null }`. Keep unknown method names. `null` means absent metadata.
3. Add a pure function `canonicalRhr(records)` in `src/core/` that returns `{ status: "value", bpm, method }`, `{ status: "none" }`, or `{ status: "conflict", records }`. Test every row of section 9.6.
4. Add `parseRecordedReplay` validation: positive integer bpm, string or null method.
5. Add synthetic RHR to `SYNTHETIC_DAYS`. Include one ordinary day, one missing day, one conflict day, and one value outside the gauge range.
6. Store RHR only in `rhr_days`, as section 10.2 defines. Do not store raw responses or source references.

### 9.9 Checkpoint D

Capture day and night images of the overview and the RHR focus. Capture gauge close views at 52, 60, and 68 bpm and at a value above 80 bpm. Capture the unavailable look and the conflict state. Put the 52 and 68 bpm views side by side at the same camera.

## 10. Seven-day summary data (Phase 4)

### 10.1 Current storage

On November 25, 2026, D1 holds only authorization tables and `heart_rate_days` (five-minute heart-rate means, migration `0003_heart_rate_days.sql`). `/api/replay/day` reads HRV, steps, energy, and sleep from Google Health on each request and does not store them. The synchronized history in the product specification ("Synchronization and retention") does not exist yet. A seven-day card therefore cannot read only D1 today.

The seven-day cards are now an accepted feature. They need stored history for HRV, RHR, steps, energy, and sleep. The product specification and the storage inventory in `docs/data-sources.md` already name the content to keep. It is five-minute step totals, five-minute energy totals, daily RMSSD, daily RHR with method, and reconciled sleep sessions. This plan stores that content in one table per stream, at source resolution. It follows the pattern of `heart_rate_days`.

### 10.2 Tables

Do not add a shared daily summary table. Daily totals can be derived from the five-minute series and the sleep sessions. A summary table would hold a second copy of the same data. The minimum-storage policy forbids redundant copies, and two copies can disagree after a correction.

Add migration `0005_metric_history.sql`:

| Table | Key | Columns | Purpose | Resolution |
| --- | --- | --- | --- | --- |
| `rhr_days` | `google_sub, date` | `status`, `records`, `synced_at` | Reservoir level, RHR card, conflict display | `records` is a JSON array of `{bpm, method}`: integer bpm and the enum name as returned |
| `hrv_days` | `google_sub, date` | `status`, `rmssd_ms`, `synced_at` | Tower count, HRV card | Two decimal places in ms |
| `step_days` | `google_sub, date, zone` | `start_utc`, `end_utc`, `totals`, `synced_at` | Pedestrians, Steps card | JSON array of five-minute integer totals, `null` for a missing interval |
| `energy_days` | `google_sub, date, zone` | `start_utc`, `end_utc`, `totals`, `synced_at` | Traffic, Energy card | JSON array of five-minute kcal totals at two decimal places, `null` for a missing interval |
| `sleep_sessions` | `google_sub, session_id` | `start_utc`, `end_utc`, `segments`, `short_awakenings`, `synced_at` | Sleep voyage, island, Sleep card | Stage segments in whole seconds from session start |
| `sleep_query_days` | `google_sub, date, zone` | `synced_at` | Separates "no sleep record" from "not read yet" | One row per successfully read date |

Common rules:

1. Every table references `google_connection(google_sub)` with `ON DELETE CASCADE`.
2. `status` in `rhr_days` and `hrv_days` is `ready` or `none`. `none` records a successful, sufficiently scoped query that found no record.
3. In `step_days` and `energy_days`, a successful read with no data stores an array of `null` values. This matches `heart_rate_days`.
4. Never write a row after a failed or incomplete read.
5. Daily RHR and HRV use the civil date only, so their key has no zone. Intraday tables include `zone`, because the zone sets the day boundaries.
6. Sleep sessions are keyed by session, not by date. A session can cross midnight.
7. Retention: keep every row until the user clears the account history, as the specification requires ("Keep synchronized replay history until the user clears it"). Do not delete rows older than seven days, or older than any other age. The seven-day window limits only what the card shows. A source correction replaces a row. A confirmed source deletion removes it.

Values computed at read time, never stored:

| Value | Source |
| --- | --- |
| Daily step and energy totals | Sum of non-null five-minute totals. Coverage is the count of non-null intervals × 300 s. |
| Heart lowest, mean, and highest five-minute mean | `heart_rate_days` |
| Sleep stage totals per date | `sleep_sessions`, assigned to the date on which each session ends |
| Canonical RHR | `canonicalRhr(records)` |

Update the storage inventory and the clearing inventory in `docs/data-sources.md`. Account clearing must delete all six tables. The current text says the Worker does not store sleep records in D1. Replace it with the `sleep_sessions` rules. Size check: about five rows per date plus one or two sessions. A five-minute array is about 2–3 KB. One year is about 2 MB, far inside the 500 MB database limit.

### 10.3 Read and write flow

1. **Write-through.** `/api/replay/day` already reads these streams for the selected date. After a complete read, it writes the rows for that date. Normal browsing fills the tables.
2. **Day replay from D1.** `/api/replay/day` reads stored rows first, as it already does for heart rate (`cachedHeartRate`). It reads Google Health only for missing or stale streams.
3. **Seven-day read.** Add `POST /api/summary/week` with `date` and `timeZone`. It reads the eight dates from `date − 7` to `date` in one D1 batch, then computes the values in the table above.
4. **Missing dates.** For dates without rows, the Worker reads Google Health for those dates only. It uses one range request per stream, then writes the rows. Eight days of five-minute rollups are 2,304 intervals per stream. That fits within the existing three pages of 1,000.
5. **Recent dates.** A watch can sync late. Rows for the three most recent ended dates are stale after 6 hours. The Worker returns the stale data at once and revalidates it with `ctx.waitUntil`. If a value changes, the next read returns it, and the app shows the update-available indication from the specification. It does not change the visible world by itself.
6. **Sleep deletions.** A revalidation reads every session in its date range. It deletes stored sessions in that range that the source no longer returns. This applies the confirmed-deletion rule from the specification.
7. **Older dates.** `Refresh` in the settings menu revalidates all eight dates. Correction detection for older dates belongs to the later synchronization plan.

Rules:

1. Use the same five-minute rollups as the day replay. Do not mix in `dailyRollUp` totals. The card total must equal the sum that the world shows.
2. Use the replay time zone for date boundaries. Keep 23 h and 25 h days. A time-zone change uses different intraday rows, because `zone` is part of the key.
3. Do not fill missing intervals. Coverage below 24 h for an ended date gives `partial`.
4. A stream failure fails only that metric. The other metrics stay usable.
5. The selected date's value in the summary must equal the value in `/api/replay/day`. Add a test for this.
6. Load the summary in parallel with the day replay. A date change cancels the earlier request.
7. Synthetic mode never reads or writes D1.

### 10.4 Synthetic data

Add synthetic seven-day summaries for every date in `SYNTHETIC_DAYS`. Include one missing date, one partial date, one RHR conflict date, and one RHR value above 80 bpm. Keep RHR values mostly between 55 and 65 bpm.

### 10.5 Tests

- Runtime test with Miniflare D1: the first read fetches and writes missing dates. The second read uses D1 only.
- A failed or incomplete read writes no row.
- A stale recent row returns at once and revalidates.
- Account clearing deletes all six new tables.
- A sleep session removed at the source is deleted on revalidation.
- Mean, count, and comparison text for 7, 3, 2, and 0 available earlier dates.
- Sleep attribution for a session across midnight and for a nap.
- Day-boundary handling for a 23 h and a 25 h day.
- Partial, missing, failed, and conflict states in each chart component.

## 11. Final checks

All 43 browser checks passed. The measured city views met their rendering budget. The 2 ms hardware GPU limit for the glass shell remains unverified. [Final validation](../../design/visual-studies/rhr-and-shell/final-validation.md)

1. Run `npm run typecheck`, `npm test`, and `npm run build`.
2. Run `npm run test:browser`. Update the browser tests for the new shell and focus targets. Keep the existing sleep, wildlife, and HRV coverage.
3. Check that pause stops the release jet, the creek flow, and every other animation.
4. Check that the RHR level stays fixed through replay and seeking.
5. Check that date changes keep the camera pose, as the specification requires.
6. Check keyboard access, focus rings on glass, and screen reader labels on every chip.
7. Measure frame time against section 8.6 and the existing city budget.
8. Check that each chart's selected-date value equals the card hero and the world state.
9. Report every check that did not run. Do not report a check as passed unless it ran and passed.

## 12. Open decisions for the user

1. The user selected RHR Site A after the Phase 5 site study.
2. The user approved checkpoints A through D.

Section 1.2 records the decisions that are closed.
