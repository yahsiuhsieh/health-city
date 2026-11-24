# Sleep Voyage and Island Redesign Plan

**Superseded by the [tropical voyage plan](sleep-voyage-v3.md).** The sections below record the earlier design.

Date: November 23, 2026. Audience: the implementing coding agent.

This plan replaces the current sleep island and the circular sleep voyage. It records decisions that the user made on November 23, 2026. Read the whole plan before you change code. Follow the phase order in [section 17](#17-implementation-phases).

The [product specification](../product-spec.md) still controls data behavior. This plan adds visual and layout decisions. If this plan and the specification disagree, stop and ask the user. Do not resolve the conflict yourself.

Complete the [ocean redesign](ocean-redesign.md) before this plan. Its [section 13](ocean-redesign.md#13-changes-to-the-sleep-voyage-plan) replaces parts of section 8 below. Use the flat water surface, shared seabed, absorption shader, and wake ribbon. Connect the stage masks and the new voyage path to those systems.

## Delivery status

The synthetic voyage has reached checkpoint B. The user requested the complete voyage after reviewing checkpoint A. The implementation retains the open product decisions in section 20. [Checkpoint B review](../../design/visual-studies/sleep-voyage-v2/checkpoint-b/README.md)

## 1. User feedback and decisions

### Feedback on the current scene

The user reviewed four screenshots of the current sleep island. The user rejected these features:

1. The island is a circle. It looks artificial.
2. The island forms slice by slice while the boat circles it. The user does not want the island to form gradually.
3. Stage environments surround the island. Trees and coral stand in rings on open water. Trees in the sea look wrong.
4. Island details look poor. The ground has two flat colors. Trees are rows of identical cones. Reeds are thin lines on sand.
5. The coral, the anchor, and the awakening buoy look poor. They need a new design.

### Accepted decisions

| Topic | Decision |
| --- | --- |
| Journey | The boat departs from the city harbor at session start. It arrives at the island at session end. |
| Ocean | The ocean changes along the route with the sleep stage. The island is the destination. It does not grow. |
| DEEP | A sheltered channel between rocky banks. Forest grows on top of the banks. No tree stands in water. |
| Persistence | Revealed stage environments stay visible for the rest of the selected day. The route shows the night's chronology. |
| Route length | Fixed length for every session. A longer session gives a slower boat, not a longer route. |
| Island distance | Move the island much farther from the city than its current position at `x = 57`. |
| Island shape | A natural coastline with bays and headlands. No circle and no wedges. |
| Extreme sizes | Area stays strictly proportional to asleep time. No minimum and no maximum clamp. |
| Scope | Includes cabin lighting changes, REM companions, a new coral design, a new anchor, and a new wake buoy. |
| Style | Realistic forms that match the current stylized city. No external island reference exists. Use your own design within this plan. |
| Reef reference | The user supplied a reef image: [reef-reference.png](../../design/visual-studies/images/reef-reference.png). It shows clear water and a visible seabed. See [section 9.3](#93-rem-reef). |
| Boat wake | The moving boat leaves a realistic wake. See [section 8.5](#85-boat-wake). |

The REM habitat on the island is a coastal cove on land. The voyage does not pass many islands. The DEEP channel banks are narrow rock ridges. They must not look like sleep islands. See [section 9.2](#92-deep-sheltered-channel).

## 2. Data rules that must not change

These rules come from the product specification. Every phase must keep them.

- One complete sleep session gives one route and one island. Midnight does not split a session. A temporary awakening does not split a session.
- Island land area is proportional to recorded asleep time. AWAKE time adds no land area.
- Doubling asleep time doubles the area, not the diameter.
- Use one common area scale for all dates and sessions.
- Island habitats keep the LIGHT, DEEP, and REM asleep-duration proportions. Unclassified asleep time gets a neutral habitat.
- Arrival at the island happens only at the final session end. A temporary awakening is not arrival.
- Stage environments appear progressively along the journey.
- Pause freezes every motion. This includes water, reeds, trees, creatures, buoy motion, lights, and reveal effects.
- Seeking in either direction restores the exact state for that replay time. The user must not need to watch earlier animation.
- The return voyage is a scene transition. It is not recorded sleep. It must not replay stages in reverse.
- Decorative details carry no health meaning. Creature species carry no separate health score.
- Do not invent an island when no session exists. Loading and API failure do not mean absence.

## 3. Scope

### In scope

- A new fixed route from the berth to a distant island pier.
- A pure timeline module that maps a session to route positions.
- Stage environments for LIGHT, DEEP, REM, AWAKE, and unclassified sleep.
- Water shader support for stage zones, clear water, and a visible seabed.
- A boat wake while the boat moves.
- A new destination island with a natural coastline, terrain, habitats, and a pier.
- Boat cabin states, cabin shutters, an anchor, an anchor ball, and an anchor light.
- A new wake buoy.
- REM companions: ray, whale, shark, and small fish.
- A sea mist bank that hides the island until the final approach.
- Two new camera views and updated inspection cards.
- Unit tests, browser tests, screenshots, and documentation updates.

### Out of scope

- Real Google Health sleep data in the scene. The scene keeps the synthetic November 11–12 session.
- Several sessions on one day, such as a nap and a night. The layout for this case remains open. Section 20 lists it.
- Short awakenings that overlap stages in API data. Section 20 lists it.
- Historical daylight and weather. The Day and Night buttons remain manual review controls.
- New D1 tables or fields. This work persists no data.
- Blender. Its installation requires separate user approval.

## 4. Current implementation to replace

| File | Current role | Action |
| --- | --- | --- |
| `src/scene/sleep-voyage.ts` | Fixture intervals, circular coast path, `voyage()` state | Replace with the modules in section 6. Keep a compatible `voyage()` export. |
| `src/scene/SleepIsland.tsx` | Circular wedge terrain, cone trees, coral arms, ray, buoy, pier | Delete after the new components work. |
| `src/scene/sleep-voyage.test.ts` | Midnight continuity and return timing | Keep the assertions that still apply. Move them to the new test files. |
| `src/scene/BoatScene.tsx` | Boat cabin light logic, camera rig, light rig | Update as sections 10, 15, and 16 describe. |
| `src/scene/WaterSurface.tsx` | Opaque water shader | Extend as section 8 describes. |
| `src/frontend/App.tsx` | Sleep header, cards, view options | Update as section 16 describes. |
| `src/scene/CargoBerth.tsx` | `MooringLines` use `voyage().moored` | Keep the call. Check that it still works. |
| `scripts/build-boat.mjs` | Boat GLB source | Add shutters, anchor, anchor ball, and anchor light. |

The fixture session stays the same:

| Field | Value |
| --- | --- |
| Start | November 11, 2026, 23:00 (Chicago) |
| End | November 12, 2026, 06:30 |
| Segments (minutes) | LIGHT 60, DEEP 85, REM 40, LIGHT 55, AWAKE 8, LIGHT 52, DEEP 65, REM 50, LIGHT 35 |
| Asleep | 442 minutes |
| Elapsed | 450 minutes |
| Awakening | 03:00–03:08 |

## 5. Target experience

Read this section as the reference sequence for the fixture.

1. Before 23:00 on November 11, the boat stays at the berth. Mooring lines are visible. No stage environment is visible. No mist bank is visible.
2. At 23:00, the boat departs. It leaves the harbor in the first 10 minutes of sleep. A wake forms behind it. A low sea mist bank appears far out at the island anchorage.
3. Outside the harbor mouth, the first LIGHT environment appears just ahead of the boat. The water becomes clear and shallow. Sandbars and reed beds line the route.
4. At 00:00, the boat enters a DEEP channel. Rock banks with forest rise on both sides. The water becomes dark, calm, and glassy. Cabin shutters close. Cabin lights dim.
5. At 01:25, the boat enters a REM reef. The water becomes clear turquoise. Coral, sponges, and sea grass are visible on the seabed. A ray glides beside the boat. At night, the water and some plants glow softly.
6. At 03:00, the boat stops and anchors. An anchor drops from the bow. The cabin lights become bright. A wake buoy appears beside the boat. At 03:08, the anchor rises and the boat continues. The buoy stays.
7. The second half of the night repeats the stage vocabulary. The second REM segment has a whale that surfaces at a distance.
8. In the last part of the route, the island starts to show through the mist. At 06:30, the boat reaches the pier. The mist is gone and the complete island is visible.
9. The boat waits 10 minutes at the pier. Then it returns to the harbor on a separate lane in 30 minutes. The route environments and the island stay visible for the rest of November 12.

## 6. Data model and pure modules

Create the folder `src/scene/sleep/`. Keep all timing and layout logic in pure functions without React or Three.js scene objects. Unit tests must cover these functions.

### 6.1 Session model: `src/scene/sleep/session.ts`

```ts
export type SleepStage = "LIGHT" | "DEEP" | "REM" | "AWAKE" | "ASLEEP"; // ASLEEP = unclassified
export interface SleepSegment { stage: SleepStage; start: number; end: number } // seconds from session start
export interface SleepSession {
  id: string;                 // deterministic seed source
  startDate: string;          // "2026-11-11"
  endDate: string;            // "2026-11-12"
  startSecondOfDay: number;   // 23 * 3600
  segments: SleepSegment[];   // contiguous, ordered, no gaps
}
export const SYNTHETIC_SESSION: SleepSession; // the fixture in section 4
export function asleepSeconds(session: SleepSession): number;
export function elapsedSeconds(session: SleepSession): number;
```

Move `departureDate`, `arrivalDate`, `departure`, and `dayOffset()` here. Keep their current behavior.

### 6.2 Deterministic random numbers: `src/scene/sleep/random.ts`

Use a small seeded generator, for example mulberry32 with a string hash. Derive each seed from `session.id` plus a stable label, such as `"island-shape"` or `"rem-2-companion"`. Never use `Math.random()` in sleep code. The same session must give the same world on every load and every seek.

### 6.3 Route: `src/scene/sleep/route.ts`

The route is fixed. It does not depend on session data.

Outbound route control points (x, z), in metres. Use a centripetal `CatmullRomCurve3` and arc-length parameterization.

| Point | x | z | Note |
| --- | --- | --- | --- |
| P0 | -1.745 | -1.2 | Berth (`port.boatX`, `port.boatZ`) |
| P1 | -1.0 | 2.4 | Leave the berth |
| P2 | 9 | 4 | Harbor water |
| P3 | 24 | 1 | Harbor mouth. Name this `S_MOUTH`. |
| P4 | 52 | -8 | Open sea |
| P5 | 84 | 2 | |
| P6 | 112 | 12 | |
| P7 | 140 | 4 | |
| P8 | 162 | -4 | Final approach starts near here |
| P9 | 178 | 0 | Pier head. Name this `PIER_HEAD`. |

Requirements:

- Compute and export `ROUTE_LENGTH` and `S_MOUTH` from the curve. The expected values are about 190 m and 29 m. Record the final values in the code comment.
- The minimum curve radius must be 25 m or more outside the harbor. Adjust P4–P8 by up to 8 m if a check fails.
- The route must stay at least 10 m from every `HarborFleet` berth and from the freighter hull.
- Export `routeFrame(s)`. It returns position, unit tangent, unit left normal, and yaw for a route distance `s`.

Return lane control points (x, z). This lane must stay at least 20 m from the outbound route outside the harbor.

| Point | x | z |
| --- | --- | --- |
| R0 | 178 | 0 (pier head) |
| R1 | 170 | 30 |
| R2 | 115 | 36 |
| R3 | 60 | 30 |
| R4 | 24 | 12 |
| R5 | 9 | 5.5 |
| R6 | -1.0 | 2.4 |
| R7 | -1.745 | -1.2 (berth) |

You may adjust R1–R4 by up to 8 m to keep clearance. The return lane has no stage environment. No stage prop may stand within 6 m of it.

### 6.4 Timeline: `src/scene/sleep/timeline.ts`

Define the asleep clock `a(t)`. It counts asleep seconds from session start to session time `t`. AWAKE time does not advance it. Let `A` be the total asleep seconds.

Harbor exit lead: let `E = min(600, 0.25 × asleep seconds of the first non-AWAKE segment)`.

Map the asleep clock to route distance:

```
s(a) = S_MOUTH * a / E                                   when a <= E
s(a) = S_MOUTH + (ROUTE_LENGTH - S_MOUTH) * (a - E) / (A - E)   when a > E
```

Rules:

- Route length for each non-AWAKE stage segment is proportional to its asleep time, except for the harbor-exit part.
- AWAKE segments have zero route length. The boat holds its route position.
- No stage environment appears for `s < S_MOUTH`. The harbor stays clean.
- If the first segment is AWAKE, the boat stays at the berth. Its cabin uses the AWAKE state. It departs when the first asleep segment starts.

Export these functions:

```ts
export interface RouteSpan { stage: SleepStage; index: number; start: number; end: number; s0: number; s1: number }
export function routeSpans(session: SleepSession): RouteSpan[];
export function routeDistanceAt(session: SleepSession, t: number): number; // clamps to [0, ROUTE_LENGTH]
export function revealDistanceAt(session: SleepSession, t: number): number;
export function islandRevealAt(session: SleepSession, t: number): number;   // 0..1
export function voyageState(session: SleepSession, t: number): VoyageState;
```

`VoyageState` contains:

| Field | Meaning |
| --- | --- |
| `phase` | `"harbor" \| "sailing" \| "anchored" \| "arrived" \| "returning" \| "moored"` |
| `stage` | Current `SleepStage`, or `null` outside the session |
| `span` | Current `RouteSpan`, or `null` |
| `s` | Route distance |
| `x`, `z`, `yaw` | Boat pose. Yaw matches the current `voyage()` convention. |
| `cabin` | Cabin state from section 10.1 |
| `anchor` | Anchor state from section 10.2 |
| `t` | Session time |

Reveal rules:

- `revealDistanceAt(t) = s(a(t + 300))`. This is the route distance 5 replay minutes ahead of the boat. Clamp it to `ROUTE_LENGTH - 12`.
- Before session start, the reveal distance is `-1`. Nothing is revealed.
- The reveal distance never decreases while `t` increases.
- `islandRevealAt(t)` is 0 while the boat is more than 12 m from `PIER_HEAD`. It rises with a smoothstep to 1 at session end. It stays 1 after session end.

Return timing: keep the current values. The boat waits 600 s at the pier. It returns in 1,800 s along the return lane. If a later session starts sooner, scale both durations down by the same factor. Add a unit test for this scale.

Keep a compatibility wrapper `voyage(offset, seconds)` in `src/scene/sleep-voyage.ts` or its replacement. It must return `x`, `z`, `yaw`, `t`, `progress`, `stage`, and `moored`, as callers use today. Set `progress = s / ROUTE_LENGTH`. Keep the stage labels `"Harbor"`, `"At island"`, and `"Returning"` for the header. Use readable labels for stages in the UI (section 16).

### 6.5 Layout: `src/scene/sleep/layout.ts`

This module places every stage prop. It returns plain arrays of transforms. Each record contains position, yaw, scale, variant name, and `routeS`. `routeS` is the route distance that reveals the record.

General placement rules:

- Keep a clear lane of 3 m on each side of the route centerline. Only the boat, the buoy, the anchor chain, and companions may enter it.
- Place no prop for `s < S_MOUTH`.
- Place no stage prop within 8 m of the island coastline.
- Place no prop within 6 m of the return lane.
- Use Poisson-disk sampling for trees, reed clumps, and coral colonies. Do not use regular rows or rings.
- Short spans need a reduced form. Section 9 gives the thresholds.

## 7. Reveal system

All sleep props use one shared reveal mechanism. Create `src/scene/sleep/reveal-material.ts`.

- Each prop vertex or instance has a `routeS` attribute. Use an `InstancedBufferAttribute` for instanced meshes.
- A shared uniform `uRevealS` holds the current reveal distance.
- Patch `MeshStandardMaterial` with `onBeforeCompile`. In the fragment shader, compute `v = smoothstep(routeS - 3.0, routeS, uRevealS)`.
- Discard the fragment when an interleaved gradient noise value of `gl_FragCoord.xy` is greater than `v`. This gives a dithered fade without transparency sorting.
- Apply the same patch to the shadow depth material (`customDepthMaterial`). Hidden props must not cast shadows.
- Island materials use `uIslandReveal` instead of `uRevealS`.
- Set `uRevealS` once per frame from `revealDistanceAt(t)`. Do not use wall-clock time.

## 8. Water and seabed

The current water is opaque. The user's reef reference needs clear water with a visible seabed. Extend `WaterSurface.tsx` with stage zones and local transparency.

### 8.1 Water mesh resolution

The current grid has fine spacing only within ±32 m of the origin. At `x = 200`, vertices stand about 18 m apart. This would show large flat triangles, which the user rejected earlier.

- Build a custom grid. Keep vertex spacing of 0.85 m or less in `x ∈ [-40, 245]` and `z ∈ [-50, 50]`.
- Keep the current cubic spread outside that core.
- Keep the total vertex count below 120,000.

### 8.2 Sleep water textures: `src/scene/sleep/water-map.ts`

Build two `DataTexture` objects from the session. Cover `x ∈ [-10, 245]`, `z ∈ [-50, 50]` at 0.5 m spacing.

Texture `sleepZones` (RGBA):

| Channel | Content |
| --- | --- |
| R | LIGHT mask, 0..1 |
| G | DEEP mask, 0..1 |
| B | REM mask, 0..1. Also the lagoon beside the island REM cove. |
| A | Reveal key: `routeS / ROUTE_LENGTH` of the nearest route point. Use 1.0 for the island lagoon. |

Texture `sleepLand` (RGBA):

| Channel | Content |
| --- | --- |
| R | Distance to the nearest sleep land (channel banks or island), divided by 24 m |
| G | Reveal key of that land. Use 1.0 for the island. |
| B | 1 when the nearest land is the island, else 0 |
| A | Seabed depth below the water surface, divided by 4 m. Section 8.4 defines it. |

Mask widths:

| Stage | Half-width from route centerline | Edge blend |
| --- | --- | --- |
| LIGHT | 14 m | 5 m |
| DEEP | Between the bank feet, plus 4 m outside | 3 m |
| REM | 13 m | 5 m |

Blend masks over 2 m at each span start and end. Unclassified spans have no mask. They use the base sea.

### 8.3 Shader changes

Add these uniforms: `sleepZones`, `sleepLand`, `sleepBounds`, `uRevealS`, `uRevealLength`, `uIslandReveal`, `uBoatPosition`.

A zone is visible only when its reveal key is less than or equal to `uRevealS / ROUTE_LENGTH`. Island features need `uIslandReveal > 0`. Blend over 3 m.

Stage water appearance:

| Stage | Day color | Night color | Surface | Clarity (alpha) |
| --- | --- | --- | --- | --- |
| Base sea | current `#286492` | current `#264962` | current | 1.0 (opaque) |
| LIGHT shallows | `#8fd3c4` | `#5f9895` | wave height × 0.7 | 0.55 over seabed |
| DEEP channel | `#1d4f5e` | `#173b4a` | wave height × 0.35, ripple × 0.5, reflection weight + 0.25 | 1.0 |
| REM reef | `#5cc4b8` near seabed, `#2f8f9a` deeper | `#2f7f86` | current | 0.4 over shallow seabed, rising to 1.0 at 4 m depth |

Rules:

- Sample `sleepZones` in the vertex shader too. Scale the wave height there with the same factor. Shading and displacement must agree.
- DEEP water must be darker than the base sea but not black. Its day luminance must stay at least 60 percent of the base deep color.
- Set `transparent: true` on the water material. Write alpha from the clarity value. Keep `depthWrite: true`. Opaque objects render first, so the seabed shows through.
- Clarity also depends on seabed depth: `alpha = mix(clarityShallow, 1.0, smoothstep(0.3, 4.0, depth))`.
- Add foam and shallow tint at sleep land with the existing foam method. Use `sleepLand.R` as the bank distance. Gate the effect with the reveal key.
- REM bioluminescence: add small soft sparkles in the REM mask. Use color `#6ff2dc`. Use intensity 0.08 in day and 0.9 at night. Add a brighter trail within 6 m behind the boat while the boat is in a REM span.
- All animated terms use `replayTime`. Pause must freeze them.

### 8.4 Seabed meshes

Create `src/scene/sleep/Seabed.tsx`. The seabed shows under LIGHT shallows, REM reefs, and the island shore. Do not build a seabed under DEEP channels or the base sea.

- Build one height-field mesh per LIGHT or REM span. Use about 1 m vertex spacing.
- Depth profile: 0.6–1.2 m below the surface near sandbars and reef mounds. It slopes to 3.5–4 m at the mask edge.
- REM seabed has flat-topped rock mounds. Each mound is 3–8 m across, rises to 0.5–0.9 m below the surface, and has rounded edges. Use dark moss green `#3f6b5a` with lighter tops `#5a8a6e`. The reference image shows these mounds.
- Sand color: `#e3d3a6` near the surface. It shifts to `#7fb6a6` at 3 m depth through the underwater tint.
- Underwater tint for every submerged material: mix the surface color toward `#3d8f95` by `smoothstep(0.0, 3.5, depth) × 0.55`. Reduce contrast with depth. This tint gives the depth look in the reference.
- Caustics: project a soft moving light pattern on the seabed and coral tops in REM and LIGHT zones. Use two scrolling Voronoi-like noise layers. Drive the scroll with `replayTime`. Use intensity 0.18 in day and 0.05 at night.
- Encode the seabed depth in `sleepLand.A` for the water shader.

### 8.5 Boat wake

The user wants a wake behind the moving boat. The wake applies on the outbound route, in the harbor exit, and on the return lane.

Earlier feedback limits the design. The user rejected artificial rings around the hull and uniform repeating bright marks. Keep the wake broken, irregular, and low in contrast at its far end.

Path history: add a pure function to `timeline.ts`.

```ts
export function wakePath(session: SleepSession, t: number, count = 24, spacing = 1.2): { x: number; z: number; behind: number }[];
export function wakeStrength(session: SleepSession, t: number): number; // 0..1
```

- `wakePath` returns points along the path behind the boat, every `spacing` metres. `behind` is the path distance from the stern. Follow the actual path: berth exit, outbound route, or return lane.
- `wakeStrength` is 1 while the boat moves. It rises from 0 to 1 over the first 60 replay seconds of motion. It falls to 0 over 600 replay seconds after the boat stops (AWAKE, pier, berth).
- Compute both values from session time only. Seeking must restore the same wake.
- Pass the points to the water shader as a uniform array `uWakePath[24]` and the strength as `uWakeStrength`.

Wake parts, from strongest to weakest:

| Part | Shape | Appearance |
| --- | --- | --- |
| Stern wash | A turbulent band on the path centerline. It is 1.2 m wide at the stern and widens to 4 m at 20 m. | Broken foam (the existing `lace` noise style) over lighter churned water. Intensity falls with `exp(-behind / 8 m)`. |
| Kelvin arms | Two thin lines that diverge at ±19.5° from the stern. They are 20–25 m long. | Short feathered crests along each arm. Break them with noise. Fade them with distance. Keep the contrast low. |
| Bow wave | A small foam crescent on each side of the bow, about 1.5 m long | Moves with the boat. Its strength follows `uWakeStrength`. |
| Surface disturbance | The whole wake area | Perturb the fragment normal with small ripples. Reflections break behind the boat. |

Stage interaction:

- DEEP: the calm water keeps the wake longer. Use an e-fold distance of 12 m for the stern wash.
- REM: foam reduces water clarity behind the boat. Merge the bioluminescent trail (section 8.3) with the stern wash.
- Night: dim the foam with `nightAmount`, as the current shore foam does.

Performance: skip the wake loop when the fragment is more than 30 m from the boat.

Pause freezes the wake. The noise scroll uses `replayTime`.

## 9. Stage environments

Build each environment from shared GLB assets (section 12) and runtime layout data. Each prop uses the reveal material.

### 9.1 LIGHT: reed-lined shallows

Character: clear, bright, shallow water with a sandy bottom. Low sandbars and reed beds line both sides of the route.

- Sandbars: elongated low mounds, 3–10 m long and 1.5–3 m wide. Tops rise 0.05–0.15 m above water. Place them 5–10 m from the centerline, every 8–14 m, on alternate sides with jitter. Use sand `#dccb9c` with a wet edge `#bca77c`.
- Reed clumps: place clumps on sandbars and in shallow water 4–9 m from the centerline. Use one clump per 2.5 m of sandbar edge. Add loose clumps in the water at a density of one per 12 m² of the band.
- Sea grass: short blade tufts on the seabed between sandbars, one per 3 m².
- Wind sway: bend each blade by `height² × 0.06 m × sin(ambientTime × 1.3 + phase)`. Derive `phase` from the world position.
- Reduced forms: for spans shorter than 4 m, use one sandbar and 3–5 clumps.

### 9.2 DEEP: sheltered channel

Character: a calm, dark, narrow channel between two rocky banks. Forest grows on top of the banks. Daylight stays daylight. Do not darken the sky or the scene lights.

Channel banks: `src/scene/sleep/ChannelBanks.tsx` and layout code in `layout.ts`.

- For spans of 10 m or more, build two continuous banks, one on each side.
- Inner foot of each bank: 8.5 m from the centerline, with ±1.5 m low-frequency noise. The channel is 14–20 m wide.
- Each bank is 6–10 m wide, so it reads as a ridge and not as an island.
- Height: 4.5–8 m, with low-frequency variation along the route.
- Cross-section: a steep inner rock face (60–75°) with one or two ledges, a rounded top, and a gentler outer slope down to the water.
- Ends: extend each bank 2 m beyond the span ends. Taper each end over 4 m into a low rocky headland. This gives a gate at each channel entrance.
- Mesh: build sections every 1.2 m along the route, with 7–9 profile points. Add ±0.35 m vertex noise for rock facets. Use smooth normals blended 65 percent with face normals.
- Colors: rock `#7d7468` and `#6b6459`, lichen at top edges `#8b8f6f`, forest soil on top `#5f7350`, wet rock band 0.3 m above water `#4a4a44`.
- Trees: place trees only on the top surface where the slope is less than 25°. Keep each trunk base at least 0.8 m from the top edge. Use 1.4 m Poisson-disk spacing. Use 70 percent layered conifers and 30 percent umbrella pines.
- Shoreline: add small boulders at the water line, one per 4 m.
- No sand beach, no pier, and no path on channel banks. These features belong only to the sleep island.

Reduced forms:

| Span length | Form |
| --- | --- |
| 10 m or more | Two continuous banks |
| 4 m to less than 10 m | Two or three rock stacks on each side. Each stack is 2–4 m tall with 3–6 trees. |
| Less than 4 m | One rock pair with one or two trees |

Camera occlusion: the follow camera looks from above and behind the boat. A near bank can hide the boat.

- Add a uniform `uOccluder` with the boat position and the camera position.
- In the bank and tree fragment shaders, find the distance from the fragment to the camera–boat segment.
- Dither the fragment to 30 percent coverage under two conditions. The distance is less than 5 m. The fragment lies between the camera and the boat.
- Apply this only in the follow view (`sleep`).

### 9.3 REM: reef

The user supplied a reef reference image: [`design/visual-studies/images/reef-reference.png`](../../design/visual-studies/images/reef-reference.png). Open it and look at it before you build the reef. Use it as the main visual target for REM.

The image comes from another creator's work. Use it as a reference for quality, depth, and variety. Do not copy its exact composition or its objects one to one. Its beach house and palm trees are not in scope.

Features of the reference to reproduce:

- Clear turquoise water. The seabed is visible.
- Depth tint: deeper objects are more blue-green and lower in contrast.
- Dark green flat-topped rock mounds carry most of the coral.
- Many coral types in clusters, with sand gaps between clusters.
- Rounded, soft, matte forms with moderately saturated colors. No thin spikes.
- Small fish groups and moving light patterns on the seabed.

Coral and reef asset set (section 12 gives names):

| Type | Form | Colors |
| --- | --- | --- |
| Boulder (brain) coral | Rounded dome, 0.4–1.0 m. Surface has shallow bumps or grooves made with vertex displacement. | `#e8c86a`, `#d9a85a` |
| Tiered cone coral | Stacked soft tiers like a rounded pine cone, 0.4–0.9 m | `#4fb3a8`, `#6cc5b5` |
| Table (mushroom) coral | Short stem with a wide, slightly domed cap. Add lighter spots as vertex color. | `#d98aa0`, `#c97b92` |
| Plate (lettuce) coral | Wide, thin, wavy plates in overlapping layers | `#a8dcc0`, `#8fcab0` |
| Tube sponge cluster | Three to seven upright cylinders with open tops and rounded rims | `#7b5fc4`, `#8f74d6` |
| Small tube coral | Short orange tube clusters | `#e08a4c` |
| Anemone rosette | Rosette of broad pointed leaves, like a succulent | `#c9507a`, `#e07a9a` |
| Branching coral | Thick rounded branches with ball tips, two levels, branch radius 0.06 m or more | `#e2a184`, `#d9826e` |
| Sea grass tuft | Blade tuft | `#5f9a5a`, `#7fb36a` |
| Glow anemone | Small anemone with emissive tips. Emissive is 0.2 in day and 1.2 at night. | body `#4f7d74`, tips `#7ff5e0` |

Placement:

- Place reef colonies in patches of 5–15. Most patches sit on rock mounds. Leave sand gaps between patches.
- Keep the 3 m clear lane on each side of the route. Place colonies 3–13 m from the centerline.
- Place colony tops 0.15–0.6 m below the water surface. No coral breaks the surface.
- Use one patch per 18 m² of REM band. Mix at least six coral types in each patch.
- Apply the underwater tint and caustics from section 8.4.
- Reduced forms: for spans shorter than 5 m, use one mound with one patch.

Night: glow anemones and the water sparkles provide the bioluminescence. Do not make the whole reef emissive.

### 9.4 AWAKE: anchoring

- The boat holds its route position. Section 10.2 defines the anchor sequence.
- The cabin uses the AWAKE state (section 10.1).
- The wake buoy appears 3 m to the left of the boat at the start of the awakening. It stays for the rest of the day. Section 11 defines it.
- No environment change and no land area come from AWAKE time.

### 9.5 Unclassified asleep time

- Base open sea. No stage mask, no seabed, and no props.
- The boat sails normally. The cabin uses the LIGHT state.
- The island gets a neutral grass habitat for this time (section 13).

## 10. Boat states

### 10.1 Cabin state

Create a pure function `cabinState(stage, phase)` and use it in `BoatScene.tsx`. Ease every change over 90 replay seconds. Compute the easing from session time, not from frame history, so seeking gives the same result.

| Stage or phase | Shutters | Window emissive (day / night) | Interior point lights (night) | Captain |
| --- | --- | --- | --- | --- |
| Harbor, moored | Open | 0 / 0.65 | 1.0 × current | Default deck position |
| LIGHT, unclassified | Open | 0 / 0.65 | 1.0 × | Default deck position |
| DEEP | Closed | 0 / 0.18 | 0.15 × | Hidden (inside the cabin) |
| REM | Open | 0 / 0.65 | 1.0 × | Default deck position |
| AWAKE | Open | 1.4 / 1.4, color `#ffd27f` | 1.6 × | Foredeck, near the anchor |
| Arrived, returning | Open | 0 / 0.65 | 1.0 × | Default deck position |

The captain is one static mesh without a walk animation. Change the captain position and visibility only during the 90-second transitions. Do not slide the captain.

### 10.2 Anchor

Add these parts to `scripts/build-boat.mjs`. The bow points along positive X.

- `bow-anchor`: a stockless anchor, about 0.55 m tall. It has a shank, a crown, two broad flukes, and a ring. Use dark iron `#3b4446`, roughness 0.8. Stow it at a hawse opening on the starboard bow.
- `anchor-ball`: a black sphere with radius 0.3 m on the foremast or derrick top. It is hidden by default. This is the real day signal for an anchored vessel.
- `anchor-light`: a small white all-round lamp at the bow. Its emissive is 0 by default.

Anchor chain: build it at runtime as an instanced chain of alternating oval links, 0.09 m long. Show links only from the hawse to the water surface.

Sequence for an AWAKE segment of duration `D` seconds:

| Condition | Behavior |
| --- | --- |
| `D < 240` | No anchor drop. The boat holds position and swings gently. The cabin and buoy change as usual. |
| `D >= 240` | Drop for the first 60 s: the anchor lowers from the hawse to 1.5 m below the surface. Hold. Raise for the last 60 s. |
| Anchor below the surface, day | Show `anchor-ball`. |
| Anchor below the surface, night | Set `anchor-light` emissive to 1.5. |
| Anchor entry | Show a small foam burst at the entry point for 20 s. Do not add a ring around the hull. |

While anchored, the boat yaws ±6° around the bow with a period of 120 replay seconds. All values come from session time.

### 10.3 Shutters

Add one `cabin-shutter-<n>` mesh for each `cabin-window` mesh in `scripts/build-boat.mjs`.

- A shutter is a slatted panel the size of its window, 0.02 m outside the glass.
- Use a timber color `#b9a27a` with darker slat lines `#8f7a55` as vertex color.
- Each shutter has a thin roll box above its window.
- Put the shutter pivot at the top edge. Runtime code scales `scale.y` from 0.06 (open) to 1.0 (closed).
- Update `src/scene/boat-asset.test.ts`. The shutter count must equal the window count. The anchor parts must exist. Keep the triangle and file size limits.

## 11. Wake buoy

Replace the current cone buoy. Add `wake-buoy` to the sleep asset GLB (section 12).

Form, about 1.9 m tall:

- Float: a rounded drum, 1.0 m in diameter and 0.7 m tall, with 16 sides and soft normals. Color cream `#efe2c4` with two terracotta bands `#c86a45`. Add a dark waterline band `#4d5a58`.
- Mast: a tapered tube, 0.08 m at the top. It carries a small brass lantern housing `#bc9758` with an amber lens `wake-buoy-lens`, `#ffc46b`.
- Topmark: `wake-buoy-topmark`, a flat half-sun disc with three short rays, matte cream. It shows "waking" without text.
- A short chain stub below the float.

Do not use navigation red or green as the main body color. This marker must not look like a channel buoy.

Motion and light:

- Bob ±0.06 m and tilt ±4°. Use `ambientTime` (section 14) and a phase from the buoy position.
- At night, flash the lens: emissive 1.8 for 0.6 ambient units, every 4 ambient units. In day, keep the lens at 0.3.
- In the `sleep-route` overview, scale the buoy to 0.6 and the lens intensity to 0.3. The specification asks for less prominence in the overview.
- Keep the click behavior. A click pauses replay and opens the awakening card.

## 12. Shared sleep assets

Follow [ADR-0004](../adr/0004-hybrid-world-assets.md). Reusable forms are GLB files made by build scripts. Runtime code places them from data. Runtime code builds the channel banks, seabed, and island terrain.

Create `scripts/build-sleep-assets.mjs` with the pattern of `scripts/build-boat.mjs`. Add `"asset:sleep": "node scripts/build-sleep-assets.mjs"` to `package.json`. Output two files.

`public/models/sleep-world.glb` nodes:

| Node names | Triangle limit each |
| --- | --- |
| `tree-conifer-a`, `tree-conifer-b`, `tree-conifer-c` | 450 |
| `tree-umbrella-a`, `tree-umbrella-b` | 750 |
| `reed-clump-a`, `reed-clump-b`, `reed-clump-c` | 400 |
| `seagrass-a`, `seagrass-b` | 120 |
| `coral-boulder-a/b`, `coral-tiered-a/b`, `coral-table-a/b`, `coral-plate-a/b`, `sponge-tubes-a/b`, `coral-tube-a`, `anemone-a/b`, `coral-branch-a/b`, `glow-anemone-a` | 350 |
| `glow-plant-a`, `glow-plant-b` (island REM cove) | 300 |
| `rock-a`, `rock-b`, `rock-c`, `rubble-a`, `rubble-b` | 200 |
| `shrub-a`, `shrub-b`, `tussock-a` | 250 |
| `wake-buoy` with `wake-buoy-lens` and `wake-buoy-topmark` | 1,200 |

`public/models/sea-life.glb` nodes:

| Node | Parts | Triangle limit |
| --- | --- | --- |
| `ray` | `ray-body`, `ray-wing-left`, `ray-wing-right`, `ray-tail` | 900 |
| `whale` | `whale-body`, `whale-flukes` | 1,600 |
| `shark` | `shark-body`, `shark-dorsal`, `shark-tail` | 1,000 |
| `fish-a`, `fish-b` | single mesh | 60 |

Put each animated part pivot at its joint.

### 12.1 Tree design

The current single cones look poor. Use the canopy direction from the visual handoff: broad layered or umbrella canopies, a few soft planar changes, no individual leaves. Use `design/visual-studies/images/i-retro-garden.png` for the umbrella pine character.

Layered conifer:

- Visible tapered trunk, 7 sides, 0.6–1.0 m exposed, color `#6a5440`.
- Four or five canopy tiers. Each tier is an irregular skirt with 8 or 9 sides. Lower its rim vertices and jitter them so each tier droops.
- Tier radius decreases upward. Offset and twist each tier a little. End with a short spire.
- Color `#3f6150` at the bottom to `#557a62` at the top, with small variation per tier.
- Height 4–8 m after scale.

Umbrella pine:

- A curved trunk that splits into two or three branches.
- A broad, flattened canopy of three to five overlapping soft clusters (icosphere detail 1, flattened).
- Color `#5f8a64` with lighter tops `#739c6c`.

Every asset uses `MeshStandardMaterial`, roughness 0.85–0.95, metalness 0. Use vertex colors for small variation. Do not use noisy, dotted, or mottled textures. The user disliked those before.

Tree sway: tilt the canopy ±1.5° with `ambientTime`. Pause freezes it.

### 12.2 Creature design

- Ray: a broad diamond body with thin rounded wings, a raised head bump, two small eyes, and a long thin tail. Top color `#4d6f7a`, underside `#c9d6d6`.
- Whale: a long body with a pale belly, a small dorsal fin, and broad flukes. Color `#50656f`, belly `#b9c4c4`.
- Shark: a slender body with a tall dorsal fin and a crescent tail. Color `#7d8b91`, belly `#d9dedc`.
- Fish: small simple bodies. Colors `#f2c94c` and `#4f86c6`, as in the reef reference.

### 12.3 img2threejs skill

No reference image exists for most assets. Do not run the full img2threejs pipeline without a reference image. For trees, you may use `i-retro-garden.png` as the reference. For coral, use the reef reference image. Follow the staged pass order for every asset: blockout, form, material, lighting. Take a browser screenshot after each pass.

## 13. Destination island

Create `src/scene/sleep/island-shape.ts` (pure) and `src/scene/sleep/DestinationIsland.tsx`.

### 13.1 Area

- Export `ISLAND_M2_PER_ASLEEP_MINUTE = 2.4`. This is the current scale. Do not change it without user approval.
- Target land area = asleep minutes × 2.4 m². The fixture gives 1,060.8 m².
- Land is the polygon at the water line (y = 0). The underwater shore apron does not count as land.
- No minimum and no maximum. A 20-minute nap gives 48 m², an islet with an equivalent radius of about 3.9 m.

### 13.2 Coastline shape

Build a star-shaped polygon with 256 points.

```
r(θ) = R × (1 + Σ_{k=2..6} a_k × j_k × cos(kθ + φ_k)) × bay(θ)
a = [0.16, 0.10, 0.06, 0.04, 0.025], j_k ∈ [0.7, 1.0] from the seed, φ_k from the seed
```

- Stretch the result along one axis by a factor of 1.35. Rotate it by a seeded angle.
- `bay(θ)`: a smooth dent of depth 0.22 × R and width ±0.35 rad. Center it on the pier direction.
- The pier direction faces back along the route end tangent.
- Require `r(θ) ≥ 0.45 × R` everywhere. Check that the polygon does not intersect itself.
- Scale the polygon uniformly so its area matches the target within 0.2 percent. Use the shoelace formula.
- For islands under 60 asleep minutes, halve the `a_k` values. If `R < 6 m`, use no bay.

Placement:

- `PIER_HEAD` is fixed by the route.
- The pier is 6 m long. Its shore end touches the bay coastline.
- Compute the island center from the pier position, the pier direction, and the scaled polygon. The island position therefore depends on its size, but the route does not change.
- Check that no part of the island comes within 25 m of the outbound route before `s = ROUTE_LENGTH - 20`.

### 13.3 Terrain

Use a 0.5 m analysis grid inside the polygon.

- `d` = distance from a cell to the coastline.
- `Hmax = clamp(0.28 × R_eq, 1.2, 8)` m, where `R_eq = sqrt(area / π)`.
- `h = Hmax × (d / d_max)^0.8 + noise`. Noise is low-frequency fBm with an amplitude of ±0.18 × Hmax. Fade the noise to 0 at the coast.
- Beach band: `h ≤ 0.35` m where `d < 2.5` m.
- Shore apron: outside the polygon, slope from 0 to −1.6 m over 3–6 m. This apron is seabed, not land.

Mesh:

- Do not use a radial fan. The user disliked the center point and the wedge stripes.
- Use a square grid with 1.0 m cells clipped by the polygon. Cells fully inside give two triangles. Clip boundary cells with Sutherland–Hodgman and triangulate them.
- Put boundary vertices exactly on the polygon.
- Jitter interior vertices by up to ±0.25 m and keep them inside.
- Normals: blend 65 percent smooth normals with 35 percent face normals. This gives soft facets.

### 13.4 Habitats

Assign one habitat to each analysis cell (0.25 m² each). Use the asleep-minute fractions of LIGHT, DEEP, REM, and unclassified time.

1. REM cove: set the cove angle to the pier angle plus 100°. Give each coastal cell (`d ≤ 0.35 × R_eq`) the priority `angularDistance × R_eq + 1.5 × d`. Take the cells with the lowest priority until the REM fraction is full.
2. DEEP forest: from the remaining cells, take the highest cells until the DEEP fraction is full.
3. Unclassified grass: from the remaining cells, take the highest cells until that fraction is full.
4. LIGHT lowlands: all remaining cells.

Each habitat area must match its fraction within ±1 percent of the total land area. Blend vertex colors over 1.5 m at boundaries. The blend is visual only. It does not change the cell counts.

### 13.5 Habitat dressing

| Habitat | Ground | Shore | Props |
| --- | --- | --- | --- |
| DEEP | Forest floor `#5f7350` | Rocky boulders | Trees, one per 7 m² where `d > 1.5` m. Use 65 percent conifers and 35 percent umbrella pines. Use 1.2 m Poisson-disk spacing. Rock outcrops, one per 40 m². |
| LIGHT | Meadow `#a8b071` and marsh `#8f9a5e` | Sand `#d9c79c` with reeds | Reed clumps along the shore, one per 2.5 m of coastline. Shrubs, one per 25 m². Tussocks. |
| REM | Coral-rubble beach `#e8d6c6` with pink tint `#dcb7aa` | Rubble beach and tide pools | Tide pools with small coral and glow anemones, one per 30 m². Glow plants, one per 6 m². Rubble pieces. |
| Unclassified | Grass `#b3b48c` | Sand | Sparse rocks, one per 50 m² |

- Wet sand at the water line: `#bca77c`.
- Add the clear lagoon water (section 8) up to 8 m off the REM cove. Show coral on the apron seabed there.
- Add foam and shallows around the whole island with the existing foam style.
- Never place a tree or plant outside the land polygon.

### 13.6 Pier and arrival

- Build a timber pier, 6 m × 2.4 m, with the deck colors from `Mooring` in `BoatScene.tsx` (`#b8a17c`, `#c1ad88`). Add three bollards.
- Add a short path of stepping stones from the pier into the LIGHT area.
- Add no buildings. Add no lighthouse.

### 13.7 Mist bank

Create `src/scene/sleep/SeaMist.tsx`.

- Center the mist on the anchorage. Its radius is a fixed 30 m. It must not depend on island size, because its size must not reveal the asleep time early.
- Use 8–10 large horizontal planes at heights 0.5–3 m. Use a soft noise alpha shader with `depthWrite: false`.
- Day color `#e8f0ec` with alpha 0.55. Night color `#9fb3b8` with alpha 0.45.
- Drift the noise with `ambientTime`.
- Show the mist from session start. Before session start, hide it.
- While `islandRevealAt(t)` rises from 0 to 1, fade the mist to 0. The island reveal dithers in at the same rate.

## 14. REM companions and ambient time

Ambient time: define `ambientTime = replaySeconds / 190` in one shared module. The water shader already uses this rate. Every ambient cycle uses it. Pause freezes it.

Companion assignment: `companionFor(session, remIndex)` cycles through `["ray", "whale", "shark"]`. The start index comes from the session seed. For the fixture, set the result to REM 1 = ray and REM 2 = whale. Assert this in a unit test.

A companion exists only while the boat is in its REM span. It enters over the first 60 replay seconds and leaves over the last 60 replay seconds. Companions do not persist after their span.

| Species | Behavior |
| --- | --- |
| Ray | Glides 0.45 m below the surface, 3.5 m beside the boat. The side comes from the seed. It trails the boat by 1–2 m. Wings rotate ±18° with a period of 2.4 ambient units. The body undulates slightly. It shows through the clear REM water. |
| Whale | Swims parallel to the route, 25–35 m to the side away from the return lane. It matches the boat speed. Every 12 ambient units, its back arcs above the water for 3 units. A white spout puff shows for 1.2 units. Then it dives and its flukes rise. Between surfacings, it stays hidden in opaque water. |
| Shark | Cruises 10–16 m from the route on a slow S-curve. Its dorsal fin and tail tip break the surface. The tail sways slowly. It never enters the 3 m clear lane. |
| Fish groups (optional with any species) | 12–24 instanced fish near reef patches, 3–8 m from the route. Each group loops around an anchor point. |

Compute every companion position from session time, ambient time, and the seed only. The same replay time must give the same position.

## 15. Camera, lights, and fog

### 15.1 Views

Add these values to `SceneView` in `src/scene/skyline-layout.ts`:

| Value | Label in the view picker | Framing |
| --- | --- | --- |
| `sleep` (existing) | `Sleep voyage` | The current boat-following camera. Keep its behavior. |
| `sleep-route` (new) | `Sleep route overview` | An oblique view of the bounding box `x ∈ [-10, 235]`, `z ∈ [-45, 45]`. It shows the harbor, the route, and the island. |
| `sleep-island` (new) | `Sleep island` | An oblique view of the island center. Set zoom to fit 2.6 × `R_eq`. |

Note: the specification excludes train and boat follow modes from the current scope. The `sleep` view exists already. Keep it as a review view and do not expand its features.

Camera bounds: the current target clamp is `x ∈ [-258, 96]`. For the three sleep views, raise the maximum `x` to 245.

### 15.2 Lights and shadows

The directional light has a fixed shadow box of ±90 m around the origin. The island at `x ≈ 200` gets no shadows.

- In the three sleep views, move the light target to the camera target every frame.
- Set the light position to the target plus the current direction, at a distance of 120 m.
- Shadow box: ±40 m for `sleep`, ±45 m for `sleep-island`, and ±130 m for `sleep-route`.
- Do not change light color or intensity for DEEP. Daylight stays daylight.

### 15.3 Fog and horizon

- Check that the scene fog and the water horizon fade do not hide the island in `sleep-route`.
- If they hide it, increase the fade distances only for the sleep views.

## 16. Inspection and UI copy

Use English UI copy. Click handlers must ignore a pointer drag (keep the current 4–5 px rule).

- Stage label mapping for the header: `LIGHT` → `Light sleep`, `DEEP` → `Deep sleep`, `REM` → `REM sleep`, `AWAKE` → `Awake`, `ASLEEP` → `Asleep (unclassified)`.
- Header example: `Deep sleep · Synthetic sleep`.
- Stage inspection: build an invisible hit ribbon, 16 m wide, along each revealed span. A click pauses replay and opens a card. The card shows the stage name, the start and end times with dates, and the duration in minutes. Example: `Deep sleep`, `Nov 12, 00:00 – 01:25`, `85 min`, `Synthetic sleep session`.
- Island inspection: a click on the island opens a card. The card shows the full start and end with dates, the elapsed duration, and the asleep minutes. It also shows the minutes and percent for each stage, and the area. Example line: `1,061 m² · 2.4 m² per asleep minute`.
- Keep the existing awakening card.
- Unrevealed spans and an unrevealed island are not clickable.

## 17. Implementation phases

Run `npm run typecheck`, `npm test`, and `npm run build` after each phase. Fix every failure before the next phase.

The browser checks need the local app at `http://127.0.0.1:8787`. AGENTS.md forbids starting a development server without an explicit request. Ask the user before you start `npm run dev`. Stop the server after the checks.

### Phase 1: Timeline and route

1. Create `session.ts`, `random.ts`, `route.ts`, and `timeline.ts`.
2. Keep the `voyage()` compatibility wrapper. Update `App.tsx`, `BoatScene.tsx`, and `CargoBerth.tsx` imports.
3. Delete the circular sailing path. The boat follows the new route. Use the old island as a temporary placeholder at the new position, or show no island.
4. Add the unit tests in section 18.1 for timeline and route.

### Phase 2: Water zones and seabed

1. Build the custom water grid (section 8.1).
2. Build `water-map.ts` and the shader changes (sections 8.2 and 8.3).
3. Build the seabed with depth tint and caustics (section 8.4).
4. Add `wakePath`, `wakeStrength`, and the wake shader (section 8.5).
5. Add the reveal system (section 7).
6. Add the `sleep-route` view and the light rig (section 15).

### Phase 3: Stage environments and assets

1. Write `scripts/build-sleep-assets.mjs`. Build the trees, reeds, coral set, rocks, and buoy.
2. Build the LIGHT, DEEP, and REM environments (section 9).
3. Add the camera occlusion dither for channel banks.

**Review checkpoint A.** Take the screenshots in section 19, items 1–6 and 12. Save them in `design/visual-studies/sleep-voyage-v2/`. Stop and ask the user for review. Do not start Phase 4 before the user responds.

### Phase 4: Boat states, anchor, buoy, companions

1. Update `scripts/build-boat.mjs` with shutters and anchor parts. Run `npm run asset:boat`.
2. Add `cabinState()` and the anchor sequence (section 10).
3. Add the new wake buoy (section 11).
4. Build `sea-life.glb` and the companions (section 14).

### Phase 5: Destination island

1. Write `island-shape.ts` with shape, terrain, and habitats.
2. Build `DestinationIsland.tsx` with dressing, shore, lagoon, and pier.
3. Build `SeaMist.tsx` and the island reveal.
4. Add the `sleep-island` view.
5. Delete `SleepIsland.tsx` and unused code from `sleep-voyage.ts`.

### Phase 6: Inspection, tests, documentation

1. Add the stage and island cards (section 16).
2. Add the browser tests (section 18.2).
3. Measure performance (section 18.3).
4. Update the documents (section 21).

**Review checkpoint B.** Take all screenshots in section 19. Stop and ask the user for review.

## 18. Tests and measurements

### 18.1 Unit tests (Vitest)

Timeline and route:

- The fixture totals are 442 asleep minutes and 450 elapsed minutes.
- The sum of non-AWAKE span lengths from `S_MOUTH` equals `ROUTE_LENGTH - S_MOUTH` within 1e-6.
- Each span length after the harbor exit is proportional to its asleep time within 1e-6.
- AWAKE spans have zero length. The boat position is constant during an AWAKE span.
- The voyage at 24:00 on November 11 equals the voyage at 00:00 on November 12. Keep this test from `sleep-voyage.test.ts`.
- `revealDistanceAt` never decreases over 1,000 sorted sample times.
- `voyageState(t)` is a pure function. Two calls with the same `t` give equal results, also after calls with other times.
- `islandRevealAt` is 0 when the boat is more than 12 m from the pier and 1 at session end.
- The return lane stays at least 20 m from the outbound route outside the harbor.
- The return durations scale down when a following session starts early.
- `wakePath` points are `spacing` metres apart along the path and lie behind the stern.
- `wakeStrength` is 0 at the berth before departure, 1 while sailing, and 0 after 600 s at anchor or at the pier.

Island:

- Area matches the target within 0.2 percent for 20, 60, 180, 442, and 720 asleep minutes.
- Doubling asleep minutes doubles the area within 0.5 percent.
- The polygon is simple and star-shaped for 50 different seeds.
- Each habitat area matches its fraction within ±1 percent of the total land.
- The median height of DEEP cells is greater than the median height of LIGHT cells.
- The same seed gives the same polygon. Different seeds give different polygons.

Layout:

- Every tree base lies on land (a channel bank top or the island) and at least 0.5 m above water.
- No prop lies within 3 m of the route centerline, except the boat, buoy, anchor chain, and companions.
- No prop lies at `s < S_MOUTH`, within 6 m of the return lane, or within 8 m of the island coast (stage props only).
- Coral tops are between 0.15 m and 0.6 m below the surface.
- The fixture companions are ray (REM 1) and whale (REM 2).
- Prop counts stay inside the budget in section 18.3.

Assets:

- `sleep-world.glb` and `sea-life.glb` load. Every node in section 12 exists. Triangle limits hold. Each file is less than 3 MB.
- `working-boat.glb` has one shutter per window and the three anchor parts.

Water map:

- A sample inside a DEEP channel has `G > 0.9`.
- A sample outside the corridor has all masks equal to 0.

### 18.2 Browser tests (Playwright)

Create `tests/browser/sleep.spec.ts`. Use the route-blocking setup from `boat.spec.ts`. Add the new GLB files to the model wait list.

1. Select November 11 and `Sleep route overview`. Seek to 23:30, 00:30, 02:00, and 03:04. Check the header stage text for each time.
2. Seek to 03:04 and click the buoy. Check the awakening card and the paused state.
3. Select November 12 and seek to 07:00. Check the `At island` or `Returning` header. Click the island. Check the island card values.
4. Pause the replay and compare two screenshots of the canvas 1 s apart. They must be equal. Use the method of the existing water freeze test.
5. Seek forward to 05:00, then back to 00:30. Compare the screenshot with a direct seek to 00:30. They must match within the tolerance of the existing tests.
6. Check that no page error occurs.

### 18.3 Performance

The specification asks for measurement on the user's current Mac with Chrome. Record the hardware and the browser version.

Measure in `sleep` and `sleep-route` views at 240× playback:

| Item | Budget |
| --- | --- |
| Added draw calls in `sleep-route` | 60 or fewer |
| Added triangles | 400,000 or fewer |
| Trees (banks and island) | 1,500 instances or fewer |
| Reed clumps | 400 or fewer |
| Coral colonies | 700 or fewer |
| Median frame time | Record it. Report it against 16.7 ms. |

Read draw calls and triangles from `renderer.info`. Do not report a budget as met unless you measured it.

## 19. Screenshot checklist

Capture each item in day and in night. Save the files in `design/visual-studies/sleep-voyage-v2/`.

1. `sleep-route` on November 12 at 07:00. The full chronology and the island are visible.
2. `sleep` view in LIGHT shallows. Sandbars, reeds, and the sandy seabed are visible.
3. `sleep` view in the first DEEP channel. The boat is visible. Shutters are closed. Forest is on the banks.
4. `sleep` view in REM 1. The reef and the ray are visible. Compare with the reef reference.
5. `sleep` view in REM 2 while the whale surfaces.
6. A close view of the REM seabed. Check depth tint and caustics.
7. `sleep` view at 03:04. The anchor chain, the anchor ball (day) or anchor light (night), the bright cabin, and the buoy are visible.
8. The island emerging from mist during the final approach.
9. `sleep-island` after arrival: overview, pier bay, DEEP forest hills, and the REM cove at night.
10. Island size comparison for 20, 180, 442, and 720 asleep minutes. Use a development-only query parameter `?sleepPreview=<minutes>`. Guard it with `import.meta.env.DEV`.
11. A narrow mobile layout of `sleep-route`.
12. The boat wake in LIGHT, DEEP, and REM water, and during a turn. Check that no ring forms around the hull.

## 20. Open items

Do not decide these items. List them in your final report.

- Several sessions on one day: island slots, route sharing, and naps.
- Short awakenings that overlap stages in API data, and their effect on route time.
- An unfinished session at the end of the latest available data.
- Wiring real Google Health sleep sessions into the scene.
- Final art approval. The user approves art quality at checkpoints A and B.

## 21. Documentation updates

Update these documents in Phase 6. Write Markdown in English.

- `docs/product-spec.md`, section "Sleep sessions and islands":
  - Replace "Shape, area conversion, and extreme-size handling remain open." with the accepted decisions: natural coastline, 2.4 m² per asleep minute, and no size clamp.
  - Add the fixed route length, the persistent chronology for the selected day, and the island emergence during the final approach.
  - State that DEEP banks are land with forest and that no tree stands in water.
  - State that the REM island habitat is a coastal cove on land.
- `GLOSSARY.md`: add "Sleep route" and "Channel bank". Define a channel bank as a narrow rock ridge beside a DEEP channel that is not a sleep island.
- `design/visual-studies/visual-handoff.md`: add a section "Sleep voyage review: November 23, 2026". Record the feedback in section 1, the reef reference, and the results of checkpoints A and B.
- `README.md`: update the sleep status line and describe the new views.

## 22. Final report

At the end, report these items:

- The changed files.
- The commands you ran and their results.
- The screenshot paths.
- The performance measurements with hardware and browser versions.
- Any deviation from this plan and its reason.
- The open items in section 20.
