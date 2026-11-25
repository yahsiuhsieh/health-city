# Sleep Voyage v3: Tropical Voyage Plan

**Delivery complete.** The user approved the final voyage chart artwork on November 23, 2026. [Final acceptance and verification](../../design/visual-studies/sleep-voyage-v3/checkpoint-c/README.md#final-acceptance)

The user approved the subsequent harbor, wildlife, and card revisions through Checkpoint F on November 24, 2026. [Review 1 delivery record](sleep-voyage-v3-review-1.md)

This plan replaces [sleep-island-redesign.md](sleep-island-redesign.md) and the sleep parts of checkpoint B. It also changes the working-boat parts of [city-redesign.md](city-redesign.md). When this plan disagrees with an older plan, this plan controls.

The [product specification](../product-spec.md) still controls data behavior. Phase 0 of this plan changes several sleep rules in that specification. The user approved these changes on November 23, 2026. Section 3 lists them.

Read these files before you start:

- `AGENTS.md`
- `docs/product-spec.md`, sections "Sleep sessions and islands" and "Daylight and weather"
- `design/visual-studies/visual-handoff.md`
- `.agents/skills/img2threejs/SKILL.md`
- `docs/adr/0004-hybrid-world-assets.md`
- `design/visual-studies/sleep-voyage-v2/checkpoint-b/README.md`

Write Markdown in English. Use the `asd-ste100` skill for English technical writing.

## 1. User feedback and decisions

### 1.1 Feedback on checkpoint B

The user reviewed the checkpoint B route overview on November 23, 2026. The user said the scene is very ugly and completely unrealistic. The review found these causes:

1. The route is only 174.45 m long. Every landform became toy-sized. The DEEP banks are 8 m wide and 5 m high. The island radius is about 18 m.
2. The stage environments grow along the route. Sandbars repeat every 4 m along the route centerline (`water-map.ts`, `sleepFeatures`). They merge into capsule shapes that follow the route. The stage water tint fills a 14 m tube around the route (`waterMap`).
3. The DEEP banks are one fixed profile extruded along the route (`layout.ts`, `bankProfile`). They end abruptly. Their trees stand in one row on the ridge. Their rocks stand in one row at the foot.
4. Placement uses fixed spacing. LIGHT islets repeat about every 9 m. REM reef pairs repeat about every 5 m. This gives a mechanical rhythm.
5. The island terrain shows habitat colors. The REM cove is pink (`#d6b6a8` in `island-mesh.ts`). The island looks like a map legend.
6. The island has a uniform 8.8 m sand shelf (`shoreWidth: 8.8`). Refraction shows it as a bright halo around the whole island.
7. The scene mixes climates. Fjord-like banks, conifers, coral reefs, and a turquoise lagoon do not occur together.
8. The tests checked rules such as exact area and route clearance. No test or gate checked visual realism.

The user also gave this feedback:

- The animals are too small to see.
- The island is not realistic. The reef near the island looks scattered.
- The boat moves backward into the harbor. This is not realistic. The user understands the cause: the harbor has too little room to turn. The user authorized a harbor redesign.
- The departure path from the island crosses the island pier.
- LIGHT needs more frequent seabirds and flying fish. This makes the stage easier to read.
- The captain's actions and position must change with the stage. The current boat is too small for the captain to walk around.

### 1.2 Accepted decisions

| Topic | Decision |
| --- | --- |
| Climate | Tropical. White coral sand, turquoise shallows, coral reefs, coconut palms, and broadleaf beach forest. |
| Stage encoding | Geography is fixed. Stages change wildlife, light phenomena, and boat behavior. Stages do not create landforms. |
| Chronology | A voyage chart card records the night. It replaces the persistent stage environments. |
| Coral | Coral occurs only on the reef around the destination island. LIGHT has no coral. |
| Harbor | Redesign the harbor so that the boat never moves stern first. |
| Boat | Build a larger working boat with walkable decks. |
| Captain | The captain walks between deck stations. The station depends on the stage. |

### 1.3 Correction to the stage proposal

An earlier proposal used sea state for stages: a gentle swell for LIGHT and a glassy calm for DEEP. The specification reserves wind-driven effects for historical weather. Sea state is a wind-driven effect. This plan therefore does not change waves, ripples, whitecaps, flecks, or swell by stage. Section 12 uses wildlife, bioluminescence, boat lights, and the captain instead.

## 2. Rules that prevent the checkpoint B failures

Apply these rules in every phase. A reviewer rejects work that breaks one of them.

1. **No stage geometry.** Sleep stages never create, move, resize, or color terrain, seabed, reefs, or vegetation.
2. **No route-shaped scenery.** No mesh, texture, or placement uses the route as its centerline or its spine. Static scenery must look the same if the route is removed.
3. **No fixed spacing.** Place natural objects with blue-noise sampling inside density fields. Never place them at fixed intervals along a line.
4. **No data colors on natural surfaces.** Terrain, sand, rock, water, and vegetation use natural colors only. Data colors appear only in the voyage chart card.
5. **Real scale.** One unit is one metre. Every natural object uses a real size range from section 18. A documented exception may enlarge an object by at most 1.5 times.
6. **Continuous landforms.** Every landform ends with a natural taper into the seabed. No landform shows a cut end or a vertical extrusion.
7. **One climate.** Use only tropical species and materials. Remove conifers, reeds, and kelp from the sleep scene.
8. **Visual gates.** Do not start a phase that depends on a checkpoint until the user approves that checkpoint.
9. **Reference first.** Compare every checkpoint screenshot with the approved reference images. Record the comparison in the checkpoint README.

## 3. Data rules

### 3.1 Rules that do not change

- One complete sleep session gives one route and one island. Midnight and temporary awakenings do not split a session.
- Land area is proportional to recorded asleep time. AWAKE time adds no land area. Doubling asleep time doubles the area, not the diameter.
- One common area scale applies to all dates and sessions. No minimum or maximum island area applies.
- Arrival happens only at the final session end. A temporary awakening is not arrival.
- Pause freezes every motion. Seeking in either direction restores the exact state for that replay time.
- The return voyage is a scene transition. It is not recorded sleep. It does not replay stages in reverse.
- Decorative details carry no health meaning. Creature species carry no separate score.
- Do not invent an island when no session exists. Loading and API failure do not mean absence.
- Sky and wind-driven effects stay reserved for historical weather.

### 3.2 Rules that change in Phase 0

Update `docs/product-spec.md` with these changes. Keep the rest of the section.

| Current rule | New rule |
| --- | --- |
| Use 2.4 m² of land per asleep minute. | Use 24 m² of land per asleep minute. Section 11.2 gives the reason. |
| Use the same 174.45 m route for every session. The route leaves the current working berth, passes the harbor mouth, and ends at the island pier. | Use the same fixed route for every session. The route leaves the working berth, passes the outer harbor mouth, and ends at the island jetty head. Record the measured route length. |
| Preserve the revealed stage environments for the selected day. | Record the voyage chronology for the selected day in the voyage chart. Stage effects appear only while the boat is in that stage. |
| Reveal the whole island through thinning mist during the final 12 m of the approach. | Reveal the whole island through thinning mist during the final 60 m of the approach. |
| Prioritize duration and continuity in the overview. Show stage detail at closer scales. | The voyage chart shows duration and continuity. The voyage view shows stage detail. |
| Reveal stage environments progressively along the journey. | Reveal the voyage chart track progressively with replay time. |
| The REM island habitat occupies a coastal cove on land. Completed habitats preserve LIGHT, DEEP, and REM asleep-duration proportions. | Remove both sentences. The island does not encode stage proportions. The voyage chart shows them. |
| Form a natural coastline with headlands and a bay at the landing. | Form a natural coral cay on a reef platform. A jetty crosses the reef flat from the beach to the reef edge. |
| Sharks cruise calmly outside the route. | Whale sharks cruise slowly near the surface beside the route. |
| REM companions may include fish, whales, rays, and sharks. | REM companions may include fish, whales, rays, sharks, and dolphins. A dolphin pod counts as one large creature type. Dolphins ride the bow wave. |

Replace the stage vocabulary table with this table:

| Recorded stage | Scene behavior |
| --- | --- |
| LIGHT | Seabirds follow the boat and dive. Flying fish leave the water ahead of the bow. The captain is at the helm or on deck. |
| DEEP | No wildlife appears. The cabin shutters close. The wheelhouse changes to dim red night lighting. The captain sits at the helm. |
| REM | One large marine companion per REM segment, optionally with a fish school. At night, bioluminescent plankton glows in the bow wave, the wake, and around the companion. The captain watches from the rail. |
| AWAKE | Temporary stop or anchoring. Bright cabin lights. The captain works at the bow. |
| ASLEEP without stage classification | Neutral open-water passage. The captain stands at the helm. Preserve asleep duration without inventing a stage. |

Update `GLOSSARY.md`:

- Remove "Channel bank".
- Change "Sleep island" to: "An island for one complete sleep session. Land area is proportional to recorded time asleep. Naps have separate islands. Awake segments do not add islands or land area."
- Change "Sleep route" to: "The fixed outbound passage from the working berth to the sleep island jetty head."
- Change "REM companions" to: "Fish, whales, rays, sharks, or dolphins that accompany REM portions of a sleep journey. Species vary encounters without encoding separate health scores."
- Add "Voyage chart": "A card that shows the chronology of one sleep session as a track on a nautical chart. It shows stage segments, awakenings, and durations."

## 4. Scope

### 4.1 In scope

- The outer harbor, the turning basin, and the working-boat berth.
- A new 20 m working boat with walkable decks and COLREG navigation lights.
- Boat maneuvers at the harbor and at the island. The boat never moves stern first.
- A route of about 1,000 m through open tropical sea.
- A destination coral cay on a reef platform, with a jetty, zoned reef, beach, and vegetation.
- Stage wildlife: seabirds, flying fish, companions, and fish schools.
- Bioluminescent plankton for REM at night.
- Captain behavior by stage.
- The voyage chart card.
- Removal of the checkpoint B stage geography.

### 4.2 Out of scope

- Weather effects. Waves, swell, wind ripples, and whitecaps do not change with stage.
- The ocean surface shader, except for the bioluminescence and the island seabed hook-up.
- The city districts, towers, and streets, except for the harbor changes in section 7.
- Google Health sleep data wiring. Use the synthetic session.
- Several sessions on one day.

## 5. Target experience

This storyboard uses the synthetic session. It departs at 23:00 and arrives at 06:30.

1. **23:00, berth.** The boat lies alongside the new working quay with its bow toward the outer mouth. The captain removes the stern line and the bow line, steps aboard, and walks to the helm.
2. **Harbor exit.** The boat moves off the quay and goes forward through the outer basin and the outer mouth. The city falls behind.
3. **Open sea.** The water is deep blue. No seabed is visible. The route bends gently. No land is near the route.
4. **LIGHT.** Terns and boobies circle the boat. Every few seconds, a bird dives with a small splash. Flying fish leave the water ahead of the bow and glide away in groups.
5. **DEEP.** The birds leave. The shutters close. The wheelhouse glows dim red. Only the navigation lights and the wake remain. The captain sits at the helm.
6. **REM.** A manta ray glides beside the boat, or a humpback whale surfaces and spouts. At night, the bow wave and the wake glow blue-green. The captain stands at the rail and watches.
7. **AWAKE.** The boat stops. The captain walks to the bow and drops the anchor. The anchor light comes on. The cabin lights are bright. A wake buoy marks the position.
8. **Approach.** Mist thins over the final 60 m. A low tropical island appears on a wide reef platform. The water changes from deep blue to turquoise at a sharp reef edge.
9. **06:30, arrival.** The boat comes alongside the T-head of the jetty, parallel to the reef edge. The captain makes the lines fast and walks onto the jetty.
10. **Return.** The boat continues forward along the reef edge, turns offshore, and sails back. In the outer basin it turns 180° and comes alongside the quay with its bow toward the mouth.

## 6. World layout and clocks

### 6.1 Coordinates

- One unit is one metre. X points east. The current harbor mouth is near `(27, -6)`.
- The open sea lies east of the harbor. Check this against `coastline.ts` and `city-plan.data.ts` before you place the route.
- The island lies about 1,000 m along the route. It is outside the city overview.

### 6.2 Route

Replace the control points in `src/scene/sleep/route.ts`.

- The route starts at `WORK_BOAT_BERTH` and ends at `JETTY_HEAD`.
- It goes forward through the outer basin and the outer mouth. Section 7 gives the positions.
- In open water, use 5 to 7 control points with gentle bends. Keep the heading change between neighbouring points below 25°.
- Keep the minimum turning radius at 60 m or more in open water. Keep it at 30 m or more inside the basin.
- The final 120 m is straight and parallel to the reef edge. The boat comes alongside the jetty head on its port side.
- Tune the control points so that the measured length is 1,000 ± 25 m. Export the measured value as `ROUTE_LENGTH`. Record it in the specification.

Keep the distance function in `timeline.ts`. The harbor-exit lead stays `E = min(600, 0.25 × first span)` seconds. The lead covers the distance from the berth to `S_MOUTH`. `S_MOUTH` is now the arc length at the outer mouth.

### 6.3 Clocks

- `t` is session time in seconds.
- `a = replaySeconds / 190` is ambient time. It comes from `ambientTime()`. Pause freezes it.
- Drive all wildlife, captain walks, maneuver animation, and bioluminescence from `a` or `t`. Never use wall-clock time.
- At the default 240× playback speed, one ambient unit lasts about 0.79 s on screen.
- Derive every random schedule from a hash of the session ID, the span index, and an integer cell or slot index. Seeking must reproduce it exactly.

### 6.4 Speed check

For the synthetic session, the boat covers about 7.2 m per ambient unit during the voyage. At 240×, this is about 9 m/s on screen, or about 0.45 boat lengths per second. Report this value in the checkpoint README. Do not change it without user approval.

## 7. Harbor redesign

### 7.1 Requirements

- The working boat turns in a turning basin. Its clear diameter is at least 2.5 times the boat length, which is 50 m.
- The turning basin has at least 6 m of clearance to every breakwater, quay, and berthed vessel.
- The outer mouth is at least 30 m wide. Its depth is at least 4 m.
- The berth faces the mouth. The boat departs forward and arrives forward.
- The freighter, the trawlers, the tug, the water taxi, and the marina keep their berths. Their swept paths do not change.
- The outer harbor uses the typed coast from the city plan. Breakwaters are revetment segments. The working quay is a quay segment.

### 7.2 Starting layout

Use this layout as a starting point. Move the coordinates if they collide with city geometry. Keep every requirement in section 7.1.

| Element | Starting position |
| --- | --- |
| New south arm | From the existing south arm head at `(27, -22)` to `(27, -40)`, then east to `(100, -40)`, then to the head at `(106, -24)` |
| New north arm | From the existing north arm at `(29, 16)` to `(36, 30)`, then east to `(100, 34)`, then to the head at `(106, 14)` |
| Outer mouth | Between `(106, -24)` and `(106, 14)`. Centre `(106, -5)`. Direction `[1, 0]`. |
| Turning basin | Centre `(66, -2)`. Clear radius 27 m. |
| Working quay | Along the inner face of the new south arm, from `(40, -36)` to `(80, -36)`. Top at 1.6 m. |
| `WORK_BOAT_BERTH` | `(58, -32.6)`, yaw 0. The bow points east. |

The old harbor mouth stays open. It becomes the inner entrance for the existing fleet. Rename `HARBOR_MOUTH` to `OUTER_MOUTH` and add `INNER_MOUTH`. Update every import.

### 7.3 Harbor details

- Build the working quay with the city kit: concrete edge, granite coping, rubber fenders every 4 m, and bollards every 8 m.
- Add two bollards at the berth for the bow line and the stern line. The captain uses them in section 14.
- Add a harbor light on each arm head. Put the red light on the north arm head and the green light on the south arm head. A vessel that enters from the east keeps red to starboard, as IALA Region B requires. Each light flashes at night only.
- Dredge the outer basin to 5 m in `buildSeabed()`. Use the existing basin blend.
- Update `harbor-layout.ts`, `harbor-plan.ts`, `HarborBlock.tsx`, the coast segments, and the camera spots.

## 8. Working boat

### 8.1 Dimensions

Build a new hull in `scripts/build-boat.mjs`. Keep the approved character of the red cargo-boat reference: red-brown hull, open foredeck, timber hatch covers, cargo derrick, aft house, and dark rails.

| Item | Value |
| --- | --- |
| Length overall | 20 m |
| Beam | 5.6 m |
| Draft | 1.8 m |
| Freeboard at the waist | 1.3 m |
| Main deck height above the waterline | 1.3 m |
| Side decks | 0.9 m clear width on both sides |
| Foredeck | 6.5 m long, with a 3.2 m × 2.4 m hatch and the derrick |
| Wheelhouse | 4.2 m long × 3.6 m wide × 2.3 m high inside. Doors on both sides. |
| Aft deck | 4.5 m long, with two bitts and a coiled line |
| Bridge wings | 1.0 m deep on both sides of the wheelhouse roof level |
| Mast | Above the wheelhouse, 4.5 m tall |

The captain is 1.8 m tall. Every walkway has at least 0.9 m clear width and 2.0 m clear height. Rails are 1.0 m high.

### 8.2 Wheelhouse interior

The windows show the interior. Build these items:

- A helm seat and a wheel.
- A chart table with a lamp.
- An instrument console.
- An interior light with two modes: warm white and dim red.

The shutters from checkpoint B stay. Rebuild them for the new window sizes.

### 8.3 Navigation lights

Follow COLREG rules for a power-driven vessel under 50 m.

| Light | Position | Color and arc | When |
| --- | --- | --- | --- |
| Masthead | Mast, 4.5 m above the wheelhouse roof | White, 225° forward | Underway at night |
| Sidelights | Wheelhouse sides | Red port, green starboard, 112.5° each | Underway at night |
| Stern light | Aft rail | White, 135° aft | Underway at night |
| Anchor light | Bow, all-round | White, 360° | At anchor at night |
| Anchor ball | Forestay | Black ball | At anchor by day |

Use small emissive meshes plus one soft sprite per light. Do not add real-time point lights for the navigation lights.

### 8.4 Sockets

Export these empty nodes in the GLB. The captain uses them in section 14.

`captain-helm`, `captain-wh-door-port`, `captain-wh-door-starboard`, `captain-side-port-fwd`, `captain-side-port-aft`, `captain-side-starboard-fwd`, `captain-side-starboard-aft`, `captain-foredeck`, `captain-bow-windlass`, `captain-aft-deck`, `captain-wing-port`, `captain-wing-starboard`, `captain-ladder-base`, `captain-ladder-top`, `captain-boarding-port`.

Also export `bow-line-fairlead`, `stern-line-fairlead`, `anchor-hawse`, `stern` (for the wake), and the five light positions.

### 8.5 City version

The city scene and the sleep scene use the same boat. Keep the `--city` low-detail build. Update the existing naming contract and `boat-asset.test.ts`. Update `vesselLengths` and `vesselBeams`.

## 9. Boat motion

### 9.1 Pose model

Replace the pose logic in `voyageState()` with a maneuver timeline. Each element is one of these types:

| Type | Motion |
| --- | --- |
| `path` | The boat follows a curve. The heading equals the curve tangent. |
| `pivot` | The boat turns in place. The position changes by at most 3 m. |
| `lateral` | The boat moves sideways by at most 3 m, for berthing or unberthing. |
| `hold` | The boat does not move. It keeps the swell bob. |

Each element has a start time, an end time, and a smooth speed profile with zero speed at both ends, except where two `path` elements join.

### 9.2 Invariants

Test these at every 5 s of session time and return time:

- The angle between the bow direction and the velocity is 20° or less when the speed is above 0.05 m per ambient unit. `lateral` elements are the only exception.
- The bow direction and the velocity never point in opposite directions. The boat never moves stern first.
- The yaw rate in a `pivot` is 150° per ambient unit or less.

### 9.3 Harbor departure

1. `hold` at the berth until departure. The lines are on the bollards.
2. `lateral` 1.5 m away from the quay. Duration: 0.6 ambient units.
3. `path` forward to the outer mouth and into open water. This is the route from section 6.2.

### 9.4 Island arrival and departure

1. The final 120 m of the route is straight and parallel to the reef edge. The boat slows to zero speed alongside the T-head.
2. `lateral` 1.0 m toward the T-head. The fenders touch.
3. `hold` during the arrival wait.
4. Departure: `lateral` 1.0 m away from the T-head.
5. `path` forward along the reef edge for at least 40 m past the T-head. Then turn offshore with a radius of 60 m or more. Turn away from the reef.
6. `path` back toward the outer mouth. This return path is separate from the outbound route. Keep it at least 80 m from the outbound route in open water. Do not cross the outbound route.

### 9.5 Harbor arrival

1. `path` through the outer mouth, heading west, to the turning basin centre.
2. `pivot` 180° to heading east. Duration: at least 300 s of return time.
3. `path` toward the berth at an angle of 15° or less to the quay.
4. `lateral` the final 1.5 m to the quay.
5. `hold` at the berth.

Keep `returnDurations()`. If there is enough awake time, use a 600 s wait and a 3,600 s return. If there is less time, scale both down. The pivot keeps at least 25% of the return time that remains after the wait.

### 9.6 Swept-hull clearance

Add `src/scene/sleep/clearance.ts`. Define the hull footprint as a rounded rectangle of 20.6 m × 5.8 m. This includes the fenders. Add a 1.5 m margin.

Sample the pose every 0.5 m of travel and every 2° of yaw. The footprint must not intersect these:

- Breakwaters, quays, and the old harbor arms.
- Berthed vessels.
- The jetty and its T-head, except at the berthing contact during `lateral` and `hold`.
- The island polygon and the reef crest. Treat any seabed shallower than 2.6 m as an obstacle. This value is the draft plus 0.8 m.
- The wake buoy.

Write unit tests for the outbound route, the return path, and all island sizes from section 11.2.

## 10. Open sea

### 10.1 Remove the stage geography

Remove or empty these items:

- `src/scene/sleep/ChannelBanks.tsx`.
- The channel and colony code in `src/scene/sleep/layout.ts`.
- `sleepFeatures()` and the stage RGB channels in `src/scene/sleep/water-map.ts`. Keep only the island lagoon mask if the new seabed still needs it.
- The `stages` tint and the `stages.g` fleck reduction in `WaterSurface.tsx`.
- `StageEnvironments.tsx`. Replace it with the wildlife system in section 12.
- `StageInspection.tsx`. The voyage chart replaces it.
- Conifers, reeds, seagrass, glow plants, and glow anemones in `scripts/build-sleep-assets.mjs`.
- The `routeS` reveal attribute and `reveal-material.ts`, after nothing uses them.

### 10.2 Open sea look

- The open sea is deeper than the shelf fade. It shows `DEEP_COLOR` with the existing ripples and flecks.
- No seabed texture covers the open sea. Use the city seabed near the city and the island seabed near the island. Everywhere else, the depth is 40 m.
- The water surface must cover the whole route. If the current plane is too small, move it with the camera target in steps of one noise period. The pattern stays fixed in world space.
- Keep `SeaSplashes` in open water. It does not depend on stage.

### 10.3 Wake buoy

Keep the buoy design. Place it at the anchoring position, 6 m to starboard of the hull centreline. It must pass the clearance check.

## 11. Destination island

### 11.1 Island type

The island is a low coral cay on a reef platform. The [reference README](../../design/visual-studies/sleep-voyage-v3/README.md) lists the images. It uses two kinds of reference:

- The atoll recording and `reef-reference.png` are the style reference. They define each coral, the coral palette, the stylization, and the near-shore water.
- The aerial photographs of Heron Island and the Maldives are the structure references. They define the cay shape, the platform, the reef edge, the jetty, and the vegetation layout.

The recording shows only about 30 m of shore. Do not invent the platform layout from it. Use `maldives-cay-jetty-spit.jpg` as the primary arrival composition. Do not start Phase 3 until the user approves the reference set.

### 11.2 Area

- Land area is `24 × asleep minutes` m². The synthetic session gives 10,608 m².
- The user asked for a natural proportion to the main city. The city land inside the coastline is about 54,500 m², about 260 m × 240 m. Its harbor is not included.
- At this scale, a typical night of 7 to 8 hours gives a cay of about 1 ha. This is about one fifth of the city. A 12-hour session gives about one third of the city. Every island stays clearly smaller than the city, as an offshore cay is smaller than a coastal town.
- For comparison, one tower plot is 20 m × 20 m, or 400 m². A 20-minute nap gives a 480 m² sandbank, about the size of one tower plot.
- Land is the area above the mean waterline. The reef platform and the beach below the waterline are not land.
- Test these sizes: 5, 20, 60, 180, 442, and 720 minutes. Areas: 120, 480, 1,440, 4,320, 10,608, and 17,280 m².
- The area must match within 0.5%.

### 11.3 Reef platform

The platform is larger than the island. It has a fixed position at the end of the route. Its size depends on the island size:

- Platform area = max(15,000 m², 2.5 × land area). The synthetic session gives 26,520 m². The reef platform is under water and does not count as land.
- The platform is elongated, with a length-to-width ratio between 1.6 and 2.2.
- The long axis is parallel to the final route segment.
- The island sits toward the leeward end of the platform, away from the jetty side. It stays at least 25 m from the reef edge on the jetty side.

Build the platform outline with domain-warped noise on the radius. Use at least three octaves. Do not use a sum of a few sine harmonics, which gives the soft blob shape of checkpoint B.

### 11.4 Reef zones

Write the depths into the island seabed texture. The ocean absorption shader must create every water color from these depths. Do not paint any tint for the island.

| Zone | Distance | Depth | Seabed | Objects |
| --- | --- | --- | --- | --- |
| Beach toe | 0–6 m from the waterline | 0–0.8 m | Rippled white sand | None |
| Sand lagoon | Between the beach toe and the reef flat | 0.8–2.5 m | Sand with darker seagrass patches | Rare coral heads, 1 per 300 m² |
| Reef flat | 15–35 m wide inside the crest | 0.4–1.2 m | Coral rubble and dense low coral | Dense coral, 1 colony per 3–6 m² |
| Reef crest | 4–8 m wide band at the platform edge | 0.2–0.6 m | Coral | The densest coral band |
| Fore-reef slope | 15–25 m outside the crest | 1–22 m | Spur-and-groove ridges every 6–10 m | Large coral colonies on the spurs |
| Open sea | Outside the slope | 40 m | None | None |

The reef edge is sharp. The water changes from turquoise to deep blue within 15–25 m. Foam forms a broken line along the reef crest. Use the existing shore-wash function with the rock lace type. The foam has gaps.

### 11.5 Coral placement

The checkpoint B reef looks scattered. Fix it with these rules:

- Coral grows in the zones in section 11.4 only. No coral grows in the open sea.
- Each zone has a density field from noise. The field has clusters and gaps. Use blue-noise sampling inside the field.
- Coral colonies touch or overlap in the dense zones. The crest reads as one continuous band.
- Use 8 to 12 colony types from the reef reference: table, plate, branching, boulder, brain, tube sponge, sea fan, and soft coral.
- Colony sizes: 0.4–3.0 m. Large table corals: up to 3 m.
- Group colonies on bommies, as in the reef reference. A bommie is a rounded rock mound, 3–8 m wide and 0.5–1.5 m high, with 12–40 colonies on it. Sand shows between bommies. This keeps the reef readable at the voyage zoom.
- In the sand lagoon and near the jetty, use the arrangement of the reef reference: separate bommies with sand gaps of 2–6 m. On the reef flat and the crest, the bommies join into continuous bands.
- The reef reference shows a 4–5 m boat. The working boat is 20 m. Keep the coral at real size. Do not enlarge coral to match the proportions in the recording.
- Take the coral palette from the reef reference: teal, lilac, coral pink, butter yellow, sage, and sand. Use these colors as albedo. The absorption shader mutes them with depth. Do not add extra desaturation.

### 11.6 Coastline and terrain

- Build the coastline with domain-warped noise. Add one sand spit at the leeward end. The spit is 10–30% of the island length.
- The beach width changes between 4 m and 14 m. The leeward side is wider.
- Add beach rock in two or three places at the waterline. Beach rock is flat grey slabs, each 2–8 m long.
- The cay is low. The beach berm is 1.0–1.5 m above the waterline. The interior rises to 2–3.5 m. Islands over 15,000 m² may rise to 5 m.
- The beach has a wet band at the waterline, a dry band, a wrack line, and a vegetation edge.

### 11.7 Vegetation

Zone the vegetation by distance from the beach. Never use data for vegetation.

| Zone | Plants | Density |
| --- | --- | --- |
| Beach crest | Low beach shrubs (Scaevola type), 0.8–1.5 m, and beach grass | Continuous hedge with gaps |
| Outer belt | Coconut palms, 8–15 m tall. They lean toward the sea by 5–25°. | Groups of 2–6 |
| Interior | Broadleaf beach forest (Pisonia type), 8–12 m, with a closed canopy | Dense. The canopy covers 80–95%. |

Small islands keep the order of the zones. A 120 m² sandbank has no trees. A 480 m² cay has a few shrubs and one to three palms.

### 11.8 Jetty

- The jetty starts at the beach. It crosses the reef flat to the reef edge on the route side.
- The T-head is 14 m long and 3 m wide. It lies parallel to the final route segment. Its deck is 1.4 m above the waterline.
- Build it from timber decking on round piles. Add fenders, four bollards, a ladder, and a small solar lamp on the T-head.
- The jetty position is fixed. The island grows away from it. The jetty length changes with the island size.
- The jetty has no collision with the boat during approach, berthing, or departure.

### 11.9 Mist

Keep `SeaMist.tsx`. Move it to the island side of the final 60 m of the route. Reveal the island over the final 60 m. Use `uIslandReveal`.

## 12. Stage wildlife and effects

### 12.1 Common rules

- Each effect belongs to one stage. It starts within 1 ambient unit after the stage starts. It ends within 1 ambient unit after the stage ends.
- Wildlife never enters the island seabed area or the harbor.
- Seeking restores every animal pose exactly.
- Wildlife does not change the water surface, except for local splashes and ripples that the animal makes.

### 12.2 LIGHT: seabirds

- Species: brown boobies and terns. Wingspan: boobies 1.4 m, terns 0.8 m.
- A flock of 5–9 birds stays near the boat during LIGHT.
- The birds fly 4–14 m above the water. They circle within 25 m of the boat and follow it.
- Plunge dives: one dive every 1.5–3 ambient units. A dive makes a splash with 6–10 drops and a ring of foam that fades over 1 ambient unit.
- At night, keep 3 birds near the boat. The deck lights light them.

### 12.3 LIGHT: flying fish

- A group of 4–10 fish leaves the water 10–30 m ahead of the bow, on either side. Real flying fish flee from the bow wave.
- One group every 1.5–3 ambient units.
- Each fish glides 20–45 m in 1.2–2.5 ambient units. It flies 0.3–1.2 m above the water. Some fish touch the water once and continue.
- Each takeoff and each touch leaves a thin line of ripples on the water.
- Real length is 0.3 m. Render them at 0.45 m. Record this exception in the asset README.
- The pectoral fins are spread wide and catch the light.

The synthetic session has 202 LIGHT minutes, about 64 ambient units. It shows about 20–40 groups and about 20–40 dives. Report the counts.

### 12.4 DEEP

- No birds, flying fish, or companions appear.
- The shutters close over 90 s.
- The wheelhouse light changes to dim red.
- Deck lights go off. The navigation lights stay on at night.
- The captain sits at the helm.

### 12.5 REM: companions

Use one large companion per REM segment. Keep `companionFor()`, but change the species.

| Species | Real size | Behavior |
| --- | --- | --- |
| Humpback whale | 13 m long | Swims 14–20 m off the beam. Surfaces every 4–6 ambient units. Spouts a 3–4 m bushy blow. Shows its flukes before each dive. Breaches once per encounter, with a large splash. |
| Manta ray | 4.5 m wingspan | Glides 4–8 m off the beam at 0.3–0.8 m depth. The wingtips break the surface now and then. It barrel-rolls once per encounter. |
| Whale shark | 9 m long | Cruises 8–12 m off the beam, just below the surface. The dorsal fin and the tail tip break the surface. |
| Dolphin pod | 6–12 animals, each 2.4 m long | Two to four dolphins ride the bow wave 1–4 m ahead of the stem. The others swim 3–10 m off the beam. Each dolphin surfaces to breathe every 1–2 ambient units. One to three dolphins leap clear of the water per ambient unit. |

Visibility requirements:

- The companion stays at 0.2–1.0 m depth for at least 70% of the encounter.
- In the voyage view at 1250 × 870 px, the companion's projected length is at least 90 px. For a dolphin pod, each dolphin is at least 45 px long and the pod covers at least 10 m.
- Each surfacing makes a ripple ring and foam that fade over 1 ambient unit.
- The voyage camera keeps the companion in the frame. It may widen by up to 1.5 times during the encounter. This extends the existing whale behavior.

Fish schools:

- A school has 150–300 fish of 0.25–0.4 m. Use one instanced mesh.
- The school forms a moving cloud of 4–7 m at 0.5–2 m depth. It turns as a group and shows a silver flash when it turns.

### 12.6 REM: bioluminescence

- Apply only at night. Use `nightAmount`.
- Add blue-green emissive sparkle to the bow wave, the wake foam, and the water around a moving companion. Use `#4fe3c1` at full strength.
- The sparkle is grainy. It consists of short-lived points, not a smooth glow. It fades within 6 m behind the stern.
- In daylight, the REM stage shows the companion only.

### 12.7 AWAKE

Keep the checkpoint B anchor and buoy behavior. Move them to the new boat sockets. Turn on the anchor light at night and the anchor ball by day.

### 12.8 Unclassified asleep time

No wildlife. Cabin lights stay warm white. The captain stands at the helm.

## 13. Captain

### 13.1 Deck graph

Add `src/scene/sleep/captain.ts`. Build a walk graph from the sockets in section 8.4. Connect them along the real walkways: side decks, doors, ladder, foredeck, and aft deck. Add the jetty and quay boarding points as nodes outside the boat.

- The captain walks at 1.2 m per ambient unit.
- Use `walk-gait.ts` for the steps.
- Use the shortest path in the graph.
- The captain never walks through a wall, a rail, or the hatch.

### 13.2 Stations and actions

| Phase or stage | Station | Action loop |
| --- | --- | --- |
| Before departure | Quay, then aft deck, then helm | Lift the stern line from the bollard. Walk forward. Lift the bow line. Step aboard. Walk to the helm. |
| Harbor exit | Helm | Hands on the wheel. Looks forward. |
| LIGHT | Helm, with deck rounds | Every 6–9 ambient units, walk to a bridge wing or the foredeck, look at the birds with binoculars for 2–3 units, and return. |
| DEEP | Helm seat | Sits. Turns the head slowly now and then. |
| REM | Rail on the companion's side | Stands at the rail. Points toward the companion when it surfaces. |
| AWAKE, 4 minutes or longer | Bow windlass | Releases the anchor. Stands at the bow. Raises the anchor at the end. |
| AWAKE, under 4 minutes | Wheelhouse door | Steps out, looks around, and returns. |
| Unclassified | Helm | Stands at the wheel. |
| Arrival | Boarding point, then jetty | Throws the bow line and the stern line onto the jetty bollards. Steps onto the T-head. Walks toward the beach and waits. |
| Return | Helm | Boards before the departure `lateral`. Stands at the wheel. |

### 13.3 Transitions

- At a stage boundary, the captain walks to the next station. The walk starts at the boundary.
- If the walk takes longer than the stage, the captain goes as far as possible and then turns back to the next station.
- The captain state is a pure function of `t` and `a`. Seeking restores it.
- Replace the `captain: "inside" | "bow" | "wing"` enum in `vessel-state.ts` with the station model.

## 14. Sleep voyage card

### 14.1 Content

The card shows time asleep, stage durations, a four-row timeline, the route, and session details. The light card uses amber for Awake, teal for REM, blue for Light, and violet for Deep. Grey hatching marks unclassified sleep. Direct labels and a screen-reader table identify the stages. The synthetic session contains 202 minutes of Light, 150 minutes of Deep, and 90 minutes of REM.

### 14.2 Behavior

The card counts only the elapsed part of each stage. The timeline hides future stages. Selecting an interval marks its place on the route. Both views follow replay across midnight. The card scrolls within the scene on desktop and opens as a bottom sheet on phones. [Review 1 card requirements](sleep-voyage-v3-review-1.md#5-sleep-voyage-card)

## 15. Cameras

| View | Change |
| --- | --- |
| `sleep` (voyage) | Follows the boat. Width about 60 m for the 20 m boat. Widen it for companions as in section 12.5. |
| `sleep-island` | Frames the reef platform and the jetty. Use the platform bounds. |
| `sleep-route` | Remove. The voyage chart replaces it. |
| `berth` | Frame the new working quay. |
| `harbor` | Include the outer basin. |
| World overview | Include the outer harbor. The island stays outside this view. |

The light rig fits its shadow bounds to the visible ground. Keep this behavior. Check shadows in the voyage view at the island and at the harbor.

## 16. Assets

Use the `img2threejs` skill for every new asset. Build them in the existing scripts.

| Asset | Script | Notes |
| --- | --- | --- |
| Working boat | `scripts/build-boat.mjs` | Section 8. |
| Coconut palm, 3 variants | `scripts/build-sleep-assets.mjs` | Curved trunk with ring texture. 9–14 fronds. A coconut cluster. |
| Broadleaf beach tree, 3 variants | Same | Layered umbrella canopy, as in the G and I references. |
| Beach shrub, 2 variants | Same | Low rounded mounds with a few planar faces. |
| Beach grass, driftwood, beach rock | Same | |
| Coral colonies, 8–12 types | Same | Rebuild from the reef reference image. |
| Jetty kit | Same | Piles, decking, T-head, bollards, ladder, lamp. |
| Seabirds, flying fish | `scripts/sleep-sea-life.mjs` | Wing animation by bone or by node rotation. |
| Humpback whale, manta ray, whale shark, dolphin, school fish | Same | Rebuild at real scale. The dolphin has a leap clip and a bow-ride clip. |

Remove the unused checkpoint B assets from the GLB files. Update `assets.test.ts`.

## 17. Implementation phases

Report and stop at each checkpoint. Do not continue until the user approves.

### Phase 0: Documents

1. Update the specification and the glossary as in section 3.2.
2. Add a "Sleep voyage review: November 23, 2026" section to the visual handoff. Record section 1 of this plan.
3. Mark `sleep-island-redesign.md` as replaced by this plan.

### Phase 1: Harbor and boat

1. Build the outer harbor and the turning basin.
2. Build the new boat with sockets and lights.
3. Implement the maneuver timeline for the harbor only. The boat leaves and returns at the harbor with a temporary straight route.
4. Add the clearance and heading tests.

**Checkpoint A: harbor.** Capture the screenshots in section 19.2. Stop for review.

### Phase 2: Route, open sea, and removals

1. Remove the stage geography in section 10.1.
2. Build the 1,000 m route and the return path.
3. Make the water cover the whole route.

### Phase 3: Island

1. Build the reef platform, the reef zones, and the island seabed.
2. Build the cay, the vegetation, and the jetty.
3. Implement the island arrival and departure maneuvers.

**Checkpoint B: island.** Capture the screenshots in section 19.3. Include all six island sizes. Stop for review.

### Phase 4: Wildlife and captain

1. Build the seabirds and the flying fish.
2. Build the companions, the fish schools, and the bioluminescence.
3. Build the captain graph and the station behaviors.

**Checkpoint C: stages.** Capture the screenshots in section 19.4. Stop for review.

### Phase 5: Voyage chart and completion

1. Build the voyage chart.
2. Update the cameras.
3. Measure performance.
4. Update the README, the handoff, and the checkpoint README.

## 18. Real size ranges

Review 1 sets the rendered wildlife sizes below. Tests check these dimensions in the exported assets.

| Object | Size |
| --- | --- |
| Captain | 1.8 m tall |
| Working boat | 20 m × 5.6 m |
| Coconut palm | 8–15 m tall |
| Broadleaf beach tree | 8–12 m tall, canopy 6–12 m wide |
| Beach shrub | 0.8–1.5 m tall |
| Coral colony | 0.4–3.0 m wide |
| Brown booby | 2.8 m wingspan |
| Tern | 1.8 m wingspan |
| Flying fish | 0.12 m long and 1.0 m across the fins |
| Manta ray | 8.0 m wingspan |
| Whale shark | 12 m long |
| Dolphin | 4.0 m long |
| Humpback whale | 16 m long |
| Jetty T-head | 14 m × 3 m |

## 19. Screenshots and references

### 19.1 References

The reference set is in `design/visual-studies/sleep-voyage-v3/`. Its README states what each image defines, with the source and license. The user approves this set before Phase 3.

Each checkpoint README shows each screenshot next to its closest reference. Keep the attribution from the reference README in any document that shows a reference image.

### 19.2 Checkpoint A

Store screenshots in `design/visual-studies/sleep-voyage-v3/checkpoint-a/`. Capture day and night for each:

- The outer harbor overview with the turning basin.
- The boat at the berth, with lines on the bollards.
- Departure: three frames across the lateral move and the exit.
- Return: three frames across the pivot.
- The boat close-up at night with the navigation lights.
- The captain on the side deck, to show the scale.

### 19.3 Checkpoint B

Store screenshots in `checkpoint-b/`. Capture day and night for each:

- The island at 442 minutes, from the `sleep-island` view.
- The reef edge close-up.
- The jetty with the moored boat.
- Departure from the jetty: three frames.
- Size study: 5, 20, 60, 180, 442, and 720 minutes, at the same camera.

### 19.4 Checkpoint C

Store screenshots in `checkpoint-c/`. Capture day and night for each:

- LIGHT with birds and flying fish.
- A bird dive.
- DEEP with closed shutters and red light.
- REM with each companion: whale spout, whale breach, manta, whale shark, dolphins on the bow wave, and a dolphin leap.
- REM bioluminescent wake at night.
- AWAKE at anchor.
- The captain at each station.
- The voyage chart on desktop and phone.

## 20. Tests

### 20.1 Unit tests

- Route length is 1,000 ± 25 m. The minimum turning radius meets section 6.2.
- Heading invariants in section 9.2.
- Swept-hull clearance in section 9.6, for all six island sizes.
- Island area within 0.5% for all six sizes.
- Reef zone depths in section 11.4. The reef crest is continuous for at least 80% of its length.
- No natural object lies within 30 m of the route, except the island, the reef, and the jetty. This test checks rule 2 in section 2.
- No placement uses fixed spacing. For each object type, the coefficient of variation of nearest-neighbour distances is at least 0.25.
- Asset sizes match section 18 within 10%.
- Wildlife schedules repeat exactly after a seek.
- LIGHT event counts for the synthetic session fall inside section 12.3.
- Captain paths stay on the walk graph.

### 20.2 Browser tests

Update `tests/browser/sleep.spec.ts`:

- Pause freezes birds, fish, companions, the captain, and bioluminescence.
- Seeking backward and forward restores the same frame.
- The boat never shows its stern toward the direction of travel. Check 20 sampled times.
- The voyage chart opens from the boat and from the island. It shows only the revealed track.
- The companion's projected size meets section 12.5 in the voyage view.

Run the browser tests against a server that the user starts. Do not start a development server unless the user asks.

## 21. Performance

Measure with the checkpoint B method in `design/visual-studies/sleep-voyage-v2/checkpoint-b/README.md`.

- Added draw calls: 60 or fewer in the voyage view. 80 or fewer in the island view.
- Added triangles: 400,000 or fewer in each view.
- Median frame interval: 16.7 ms or less on the same hardware.

Use instancing for coral, vegetation, birds, flying fish, and school fish.

## 22. Open items

Do not decide these items. List them in the final report.

- Several sessions on one day: island slots, route sharing, and naps.
- An unfinished session at the end of the available data.
- Wiring real Google Health sleep sessions into the scene.

The user approved Checkpoints A, B, and C and the final voyage chart.

## 23. Final report

At the end of each phase, report:

- The changed files.
- The commands you ran and their results.
- The screenshot paths.
- The performance measurements with hardware and browser versions.
- Any deviation from this plan and its reason.
- The open items in section 22.
