# Checkpoint B · Coral cay and jetty

The synthetic session has 442 asleep minutes. It produces **10,608 m² of dry land** on a **26,520 m² submerged platform**. At 06:30 Chicago time, the boat finishes a 1 m slide to port alongside the timber T-head. It holds for ten minutes, clears the fenders, and sails 45 m forward before turning offshore.

## Arrival and departure

The island overview uses the product camera. The close-ups show the crest, lagoon, and landing at 06:33:20. The last three rows use one camera throughout departure. The lighting control changes independently of replay time.

| View | Day | Night | Closest reference |
| --- | --- | --- | --- |
| 442-minute island | ![442-minute island, day](island-day.png) | ![442-minute island, night](island-night.png) | ![Heron Island](../heron-island-cay-jetty.jpg) |
| Reef edge | ![Reef edge, day](reef-edge-day.png) | ![Reef edge, night](reef-edge-night.png) | ![Supplied coral style study](../../images/reef-reference.png) |
| Landing lagoon | ![Lagoon colonies, day](lagoon-day.png) | ![Lagoon colonies, night](lagoon-night.png) | ![Supplied coral style study](../../images/reef-reference.png) |
| Moored at the T-head | ![Moored at the T-head, day](jetty-day.png) | ![Moored at the T-head, night](jetty-night.png) | ![Maldives landing](../maldives-cay-jetty-spit.jpg) |
| 06:40:00 · Cast off | ![06:40:00 · Cast off, day](cast-off-day.png) | ![06:40:00 · Cast off, night](cast-off-night.png) | ![Maldives landing](../maldives-cay-jetty-spit.jpg) |
| 06:41:12 · Lateral move complete | ![06:41:12 · Lateral move complete, day](clear-fenders-day.png) | ![06:41:12 · Lateral move complete, night](clear-fenders-night.png) | ![Maldives landing](../maldives-cay-jetty-spit.jpg) |
| 06:44:55 · Forward of the jetty | ![06:44:55 · Forward of the jetty, day](past-jetty-day.png) | ![06:44:55 · Forward of the jetty, night](past-jetty-night.png) | ![Maldives landing](../maldives-cay-jetty-spit.jpg) |

## One camera for all six sizes

Each pair uses the same target, direction, and 365 m review framing. The 120 m² sandbank has no trees. The 480 m² cay has two palms. The platform keeps a minimum area of 15,000 m². The jetty head stays fixed in every frame.

| Asleep minutes · dry area | Day | Night | Platform reference |
| --- | --- | --- | --- |
| 5 min · 120 m² | ![5 min · 120 m², day](size-5-day.png) | ![5 min · 120 m², night](size-5-night.png) | ![Baa Atoll platforms](../baa-atoll-cays-on-platforms.jpg) |
| 20 min · 480 m² | ![20 min · 480 m², day](size-20-day.png) | ![20 min · 480 m², night](size-20-night.png) | ![Baa Atoll platforms](../baa-atoll-cays-on-platforms.jpg) |
| 60 min · 1,440 m² | ![60 min · 1,440 m², day](size-60-day.png) | ![60 min · 1,440 m², night](size-60-night.png) | ![Baa Atoll platforms](../baa-atoll-cays-on-platforms.jpg) |
| 180 min · 4,320 m² | ![180 min · 4,320 m², day](size-180-day.png) | ![180 min · 4,320 m², night](size-180-night.png) | ![Baa Atoll platforms](../baa-atoll-cays-on-platforms.jpg) |
| 442 min · 10,608 m² | ![442 min · 10,608 m², day](size-442-day.png) | ![442 min · 10,608 m², night](size-442-night.png) | ![Baa Atoll platforms](../baa-atoll-cays-on-platforms.jpg) |
| 720 min · 17,280 m² | ![720 min · 17,280 m², day](size-720-day.png) | ![720 min · 17,280 m², night](size-720-night.png) | ![Baa Atoll platforms](../baa-atoll-cays-on-platforms.jpg) |

The Maldives photograph is by Dr. Ondřej Havelka, CC BY-SA 4.0. The Baa Atoll photograph is by Frédéric Ducarme, CC BY-SA 4.0. The Heron Island photograph is CC BY-SA 3.0. The supplied coral study defines the colony shapes and palette. The local reference index gives the original source and license for each photograph. [Reference index](../README.md)

## Geometry and materials

| Asleep minutes | Measured land, m² | Measured platform, m² | Crest to nearest land on the jetty side, m | Palms | Broadleaf trees |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 120 | 15,000 | 26.6 | 0 | 0 |
| 20 | 480 | 15,000 | 27.2 | 2 | 0 |
| 60 | 1,440 | 15,000 | 28.1 | 16 | 5 |
| 180 | 4,320 | 15,000 | 29.7 | 28 | 42 |
| 442 | 10,608 | 26,520 | 31.8 | 44 | 160 |
| 720 | 17,280 | 43,200 | 33.4 | 56 | 251 |

- The source polygons determine area at mean water level. Normalization keeps the area error below 0.001% for all six cases. The 442-minute platform has a length-to-width ratio of 1.79.
- The reef texture stores depth, shore distance, and crest foam. The refraction pass shows coral albedo through the water. The fore-reef slope reaches 22 m depth at 22 m outside the crest. A further 5 m blends it into the 40 m open sea.
- The 442-minute fixture has 219 rounded coral mounds and 4,837 live colony instances across eight forms. Twelve mounds sit in the sand lagoon, including two beside the jetty approach. At 97.4% of sampled crest positions, a mound footprint falls within 1.5 m. A close view uses the sculpted GLB colonies. The wide view uses simpler crowns with the same footprint and palette.
- The land mesh has a separate beach, wrack line, shrub belt, palm groups, and broadleaf canopy. The canopy footprint estimate is 91.6% of the synthetic interior, measured on a 1.4 m grid using 4.6 m crown radii scaled per tree. This is a plan-view estimate. The GLB palm variants measure 9.90–11.70 m before placement scaling.
- The T-head measures 14 × 3 m. Its deck is 1.4 m above the waterline. Four bollards, suspended tire fenders, a ladder, and a solar lamp mark the landing. The fenders move outward on their bridles as the hull settles alongside. The one-metre slide adds one metre to the Phase 2 route measurement, for a total of 1,001.07 m.
- The close reef study led to softer fore-reef relief and smaller sage plates along the crest. The foliage and coral are stylized procedural assets. The source photographs guide proportions and composition.

## Performance

Headless Chrome 158.0.8127.38 ran on an Apple M1 Pro with 16 GiB of memory. The viewport was 1,250 × 870 CSS pixels. Both runs used synthetic replay at 240×. The baseline used the same boat, city, time, and camera with the sleep scenery and island floor disabled. The follow camera started at 06:28:40. The island camera started at 07:15. Counters include shadows and the water pre-pass.

| View | Peak calls, baseline → full | Added calls | Peak triangles, baseline → full | Added triangles | Median frame interval, full |
| --- | ---: | ---: | ---: | ---: | ---: |
| Voyage follow | 216 → 251 | 35 | 51,306 → 267,238 | 215,932 | 16.6 ms |
| Island overview | 29 → 77 | 48 | 7,608 → 394,596 | 386,988 | 16.7 ms |

The measurements met the draw-call, triangle, and median frame-time limits for the 442-minute fixture. The six-size comparison measures geometry and shows each result under both lighting settings.

## Implementation and verification

- The terrain and planting sources are [island-shape.ts](../../../../src/scene/sleep/island-shape.ts), [island-mesh.ts](../../../../src/scene/sleep/island-mesh.ts), [reef.ts](../../../../src/scene/sleep/reef.ts), [island-layout.ts](../../../../src/scene/sleep/island-layout.ts), and [island-preview.ts](../../../../src/scene/sleep/island-preview.ts).
- The model builder exports vegetation, eight coral forms, jetty fittings, and the existing buoy in [sleep-world.glb](../../../../public/models/sleep-world.glb). The scene instances these assets, limits detail to the camera field, and disposes its own geometry and materials. [Builder](../../../../scripts/build-sleep-assets.mjs) · [Destination renderer](../../../../src/scene/sleep/DestinationIsland.tsx)
- The ocean changes affect [the provider](../../../../src/scene/ocean/OceanEnvironment.tsx), [texture packing](../../../../src/scene/ocean/seabed.ts), [seabed geometry](../../../../src/scene/ocean/Seabed.tsx), and [water shading](../../../../src/scene/WaterSurface.tsx). The route, timing, island camera, mist, mooring lines, and detail card use the new destination. [Route](../../../../src/scene/sleep/route.ts) · [Replay](../../../../src/scene/sleep/timeline.ts) · [Camera](../../../../src/scene/BoatScene.tsx) · [Mist](../../../../src/scene/sleep/SeaMist.tsx) · [Mooring lines](../../../../src/scene/CargoBerth.tsx) · [Detail card](../../../../src/frontend/SleepDetails.tsx)
- The checks cover measured areas, reef depths, crest continuity, vegetation, repeatability, spacing variation, swept clearance against the filtered depth texture, the T-head, the slide, and delivered asset sizes. [Island tests](../../../../src/scene/sleep/island.test.ts) · [Timeline tests](../../../../src/scene/sleep/timeline.test.ts) · [Asset tests](../../../../src/scene/sleep/assets.test.ts) · [Browser tests](../../../../tests/browser/sleep.spec.ts)

- `npm run asset:sleep` rebuilt the delivered GLB assets.
- `npm run typecheck` and `npm run build` passed. Vite reported its existing client chunk size advisory.
- `npm test` passed all 196 unit tests.
- `npm run test:browser -- --workers=1` passed all 21 desktop Chrome tests. After the last island refinements, the three sleep browser tests passed again.
- The capture run wrote 26 PNGs and reported no uncaught page errors or shader errors. The two additional lagoon frames show the sand gaps and coral mounds near the landing.

## Open items

The user approved Checkpoint B and authorized Phase 4. The wildlife and captain review is in [Checkpoint C](../checkpoint-c/README.md). The project also leaves several sessions on one day, nap slots and shared routes, unfinished sessions, and the Google Health sleep integration open.
