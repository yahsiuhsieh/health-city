# Checkpoint A · Working harbor

**The user approved Checkpoint A.** Open the port-bow close-up to inspect the vessel. Compare the three return frames to see the heading change around one fixed point. [Tropical voyage plan](../../../../docs/plans/sleep-voyage-v3.md)

## Day and night captures

Each row shows the same paused replay instant under both lighting settings. Times use Chicago local time. The maneuver frames use fixed review cameras. Open a thumbnail for its full resolution.

| Scene | Replay time | Day | Night | Closest reference |
| --- | --- | --- | --- | --- |
| Outer harbor and turning basin | Nov 11, 22:55:00 | [![Outer harbor and turning basin in daylight](outer-harbor-day.png)](outer-harbor-day.png) | [![Outer harbor and turning basin at night](outer-harbor-night.png)](outer-harbor-night.png) | [![Harbor reference](../../images/k-working-harbor.png)](../../images/k-working-harbor.png) |
| Working berth and mooring lines | 22:55:00 | [![Working berth and mooring lines in daylight](berth-day.png)](berth-day.png) | [![Working berth and mooring lines at night](berth-night.png)](berth-night.png) | [![Boat reference](../../images/red-cargo-boat-reference.png)](../../images/red-cargo-boat-reference.png) |
| Departure, start of lateral move | 23:00:01 | [![Departure, start of lateral move in daylight](departure-start-day.png)](departure-start-day.png) | [![Departure, start of lateral move at night](departure-start-night.png)](departure-start-night.png) | [![Boat reference](../../images/red-cargo-boat-reference.png)](../../images/red-cargo-boat-reference.png) |
| Departure, end of lateral move | 23:01:52 | [![Departure, end of lateral move in daylight](departure-lateral-day.png)](departure-lateral-day.png) | [![Departure, end of lateral move at night](departure-lateral-night.png)](departure-lateral-night.png) | [![Boat reference](../../images/red-cargo-boat-reference.png)](../../images/red-cargo-boat-reference.png) |
| Departure, outer entrance | 23:10:00 | [![Departure, outer entrance in daylight](departure-exit-day.png)](departure-exit-day.png) | [![Departure, outer entrance at night](departure-exit-night.png)](departure-exit-night.png) | [![Harbor reference](../../images/k-working-harbor.png)](../../images/k-working-harbor.png) |
| Return, start of pivot | Nov 12, 07:09:24 | [![Return, start of pivot in daylight](pivot-start-day.png)](pivot-start-day.png) | [![Return, start of pivot at night](pivot-start-night.png)](pivot-start-night.png) | [![Boat reference](../../images/red-cargo-boat-reference.png)](../../images/red-cargo-boat-reference.png) |
| Return, halfway through pivot | 07:17:30 | [![Return, halfway through pivot in daylight](pivot-middle-day.png)](pivot-middle-day.png) | [![Return, halfway through pivot at night](pivot-middle-night.png)](pivot-middle-night.png) | [![Boat reference](../../images/red-cargo-boat-reference.png)](../../images/red-cargo-boat-reference.png) |
| Return, end of pivot | 07:25:36 | [![Return, end of pivot in daylight](pivot-end-day.png)](pivot-end-day.png) | [![Return, end of pivot at night](pivot-end-night.png)](pivot-end-night.png) | [![Boat reference](../../images/red-cargo-boat-reference.png)](../../images/red-cargo-boat-reference.png) |
| Port bow and underway lights | Nov 11, 23:10:00 | [![Port bow and underway lights in daylight](underway-day.png)](underway-day.png) | [![Port bow and underway lights at night](underway-night.png)](underway-night.png) | [![Boat reference](../../images/red-cargo-boat-reference.png)](../../images/red-cargo-boat-reference.png) |
| Captain and starboard side deck | 22:56:40 | [![Captain and starboard side deck in daylight](side-deck-day.png)](side-deck-day.png) | [![Captain and starboard side deck at night](side-deck-night.png)](side-deck-night.png) | [![Boat reference](../../images/red-cargo-boat-reference.png)](../../images/red-cargo-boat-reference.png) |

The references are the project’s working-harbor study and the user-selected red cargo boat. The island photographs apply to checkpoint B. Their sources and licenses appear in the [reference index](../README.md).

## Visual comparison

- **Harbor and exit.** The quay has stone coping, paired mooring lines, fenders, bollards, a gangway, and slab joints. The reference has a busier shore. The outer breakwaters enclose open maneuvering water. The existing freighter, trawlers, tug, water taxi, and marina retain their berths.
- **Boat and captain.** The red-brown hull, timber hatch, yellow derrick, dark rails, cream house, and banded funnel carry through from the reference. The reference has a taller aft house and more weathering. The lower wheelhouse and longer aft deck give the captain a clear passage. The starboard close-up shows the deck and door at human scale.
- **Lighting.** The port-bow view shows the forward white light and red sidelight at night. The stern and starboard sectors face away from this camera. The warm cabin light reveals the chart table and wheel. The harbor lights flash on the replay clock.
- **Motion.** The first departure frames share a camera. The hull moves 1.5 m clear of the quay before advancing. At the outer entrance the bow points offshore. The three return frames share a second camera and show the west, cross-basin, and east headings.

## Measurements and design decisions

| Check | Result |
| --- | ---: |
| Turning basin diameter | 54 m |
| Minimum distance from basin rim to modeled harbor obstacles | 8.21 m |
| Outer entrance width after a 3 m reserve at each arm head | 32.8 m |
| Depth at basin center and outer mouth | 5 m |
| Minimum sampled radius on a curved harbor path | 30.11 m |
| Parallel travel before final lateral berthing | 25 m |
| In-place basin pivot during the synthetic return | 972 s |
| Working boat length × beam, measured on the city GLB | 19.93 × 5.61 m |
| Keel depth below model waterline | 1.80 m |
| City GLB / detailed GLB | 12,544 / 47,204 triangles |

The suggested quay lay west of the suggested turning center. The design moves the berth to (150, −25.1), east of the center at (64, −3). The longer arms place the outer entrance at (185, −23.6). The approach becomes parallel before the bow reaches the quay. The nominal berth has 0.26 m of clearance between the modeled hull envelope and the projecting fenders.

The project labels positive Z as north. A westbound vessel in the renderer has starboard toward negative Z. The outer entrance follows the vessel-relative requirement. Red marks the negative-Z head and green marks the positive-Z head. The original inner marks retain their colors.

The collision check uses a 20.6 × 5.8 m rounded hull with a 1.5 m reserve. Beside the working quay, the lateral move allows the hull inside this reserve. It still checks physical clearance to the fenders. The tests sample at intervals below 0.5 m and 2° and check heading every five replay seconds.

The checkpoint uses a straight temporary route. Its length is 171.50 m, including the initial lateral move. The outer entrance is 36.50 m from the berth. The boat turns 20 m short of the old pier. The return includes a 600 s wait and 3,600 s of maneuvering. A short awake interval compresses both durations. Extremely short intervals cannot accommodate two full pivots at the specified angular speed.

The synthetic open-water leg covers 0.99 m per ambient unit, or 1.25 m per screen second at 240×. Phase 2 supplies the full route. Its target remains approximately 7.2 m per ambient unit and 9 m per screen second. Phase 3 supplies the reef, the jetty, the six island sizes, and their clearance checks.

## Verification

- `npm run asset:boat` rebuilt both GLBs from the same editable source. The detailed model occupies 1,429,200 bytes. The runtime model occupies 551,020 bytes.
- The reference passed the img2threejs image probe and reference-admission check. The reference review used the red hull plates, hatch boards, derrick, cream glazing frames, rail openings, funnel bands, and mast rigging.
- `npm run typecheck`, `npm test`, and `npm run build` passed. Vitest ran 191 tests. Vite reported its bundle-size advisory.
- `npm run test:browser -- --workers=1` passed all 21 Chrome tests against the existing local server. The rendered-hull test compares 24 displacements with the bow direction.
- The asset tests check fittings and named stations. They intersect exported triangles with a 0.9 m wide, 2 m high passage along each side of the wheelhouse.
- The visual checks use the local synthetic replay. The detailed GLB and the runtime GLB share the geometry builder. The screenshots show the runtime GLB. The visual comparison covers the browser scenes above. A separate img2threejs pixel-fidelity score is unavailable.

## Performance

Headless Chrome 158.0.8127.37 ran on an Apple M1 Pro with 16 GiB of memory. The local app used the synthetic fixture, day lighting, a 1250 × 870 CSS-pixel viewport, and 240× playback. Each run discarded eight initial frame intervals and retained the next 56.

Both cases include the new harbor, boat, lighting, camera, and replay clock. The baseline omits the sleep scenery and its seabed features. Draw calls and triangles include shadows and ocean refraction. The comparison measures the cost of enabling sleep scenery at this checkpoint.

| View and start time | Peak calls, baseline → full | Added calls | Peak triangles, baseline → full | Added triangles | Median frame interval, full |
| --- | ---: | ---: | ---: | ---: | ---: |
| Harbor, 23:00:30 | 859 → 906 | 47 | 1,199,895 → 1,380,607 | 180,712 | 16.7 ms |
| Voyage at departure, 23:00:30 | 221 → 249 | 28 | 271,484 → 411,128 | 139,644 | 16.8 ms |
| Voyage offshore, 00:32:20 | 216 → 263 | 47 | 245,990 → 426,702 | 180,712 | 16.7 ms |

Both voyage samples meet the added geometry and draw-call limits. The departure median exceeds the 16.7 ms frame target by 0.1 ms. The offshore sample uses the previous checkpoint's replay time. The final island view requires its own measurement after the reef and jetty exist.

## Changed files

- **Specifications and review records** — [GLOSSARY.md](../../../../GLOSSARY.md), [Project README](../../../../README.md), [Reference index](../README.md), [visual-handoff.md](../../visual-handoff.md), [sleep-island-redesign.md](../../../../docs/plans/sleep-island-redesign.md), [sleep-voyage-v3.md](../../../../docs/plans/sleep-voyage-v3.md), [product-spec.md](../../../../docs/product-spec.md).
- **Model source and delivery assets** — [city-working-boat.glb](../../../../public/models/city-working-boat.glb), [working-boat.glb](../../../../public/models/working-boat.glb), [build-boat.mjs](../../../../scripts/build-boat.mjs).
- **Replay and ocean** — [seabed.ts](../../../../src/scene/ocean/seabed.ts), [wake.ts](../../../../src/scene/ocean/wake.ts), [VoyageLife.tsx](../../../../src/scene/sleep/VoyageLife.tsx), [clearance.ts](../../../../src/scene/sleep/clearance.ts), [navigation-lights.ts](../../../../src/scene/sleep/navigation-lights.ts), [route.ts](../../../../src/scene/sleep/route.ts), [timeline.ts](../../../../src/scene/sleep/timeline.ts), `water-map.ts` (removed in Phase 2).
- **Harbor, cameras, and interface** — [App.tsx](../../../../src/frontend/App.tsx), [BoatScene.tsx](../../../../src/scene/BoatScene.tsx), [CargoBerth.tsx](../../../../src/scene/CargoBerth.tsx), [HarborBlock.tsx](../../../../src/scene/HarborBlock.tsx), [OverviewModel.tsx](../../../../src/scene/city/OverviewModel.tsx), [SliceContext.tsx](../../../../src/scene/city/SliceContext.tsx), [camera-spots.ts](../../../../src/scene/city/camera-spots.ts), [harbor-plan.ts](../../../../src/scene/city/harbor-plan.ts), [coastline.ts](../../../../src/scene/coastline.ts), [harbor-layout.ts](../../../../src/scene/harbor-layout.ts), [skyline-layout.ts](../../../../src/scene/skyline-layout.ts).
- **Unit and browser checks** — [boat-asset.test.ts](../../../../src/scene/boat-asset.test.ts), [cargo-berth.test.ts](../../../../src/scene/cargo-berth.test.ts), [sleep-voyage.test.ts](../../../../src/scene/sleep-voyage.test.ts), [island.test.ts](../../../../src/scene/sleep/island.test.ts), [timeline.test.ts](../../../../src/scene/sleep/timeline.test.ts), [boat.spec.ts](../../../../tests/browser/boat.spec.ts), [city-slice.spec.ts](../../../../tests/browser/city-slice.spec.ts), [sleep.spec.ts](../../../../tests/browser/sleep.spec.ts).

## Open items

The [final acceptance record](../checkpoint-c/README.md#final-acceptance) lists all four approved reviews. The [future work](../checkpoint-c/README.md#future-work) covers additional sleep sessions and the Google Health integration.
