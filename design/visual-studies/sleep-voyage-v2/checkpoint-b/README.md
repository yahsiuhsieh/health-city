# Sleep voyage review

Select November 12, 2026 in the synthetic replay. Times in this review use Chicago local time. Day and Night are independent lighting settings.

The session begins on November 11 at 23:00. The boat reaches the island at 06:30, leaves at 06:40, and returns to the harbor at 07:10. The 450-minute session includes 442 asleep minutes and an eight-minute awakening. Its island measures 1,060.8 m².

## Scene captures

| Scene | Replay time | Day | Night |
| --- | --- | --- | --- |
| Full route | 07:00 | [Day](route-day.png) | [Night](route-night.png) |
| LIGHT shallows and stern wash | 02:48 | [Day](light-day.png) | [Night](light-night.png) |
| First DEEP channel and shutters | 00:49 | [Day](deep-day.png) | [Night](deep-night.png) |
| First REM reef and ray | 01:51 | [Day](rem-one-day.png) | [Night](rem-one-night.png) |
| Second REM reef and surfacing whale | 05:46:15 | [Day](rem-two-day.png) | [Night](rem-two-night.png) |
| Reef floor and caustics | 07:00 | [Day](reef-detail-day.png) | [Night](reef-detail-night.png) |
| Awakening and buoy | 03:04 | [Day](anchored-day.png) | [Night](anchored-night.png) |
| Anchor detail | 03:04 | [Day](anchor-detail-day.png) | [Night](anchor-detail-night.png) |
| Final approach and mist | 06:15 | [Day](approach-day.png) | [Night](approach-night.png) |
| Island overview | 07:00 | [Day](island-day.png) | [Night](island-night.png) |
| Pier bay | 07:00 | [Day](pier-day.png) | [Night](pier-night.png) |
| Forest hills | 07:00 | [Day](forest-day.png) | [Night](forest-night.png) |
| REM cove and tide pools | 07:00 | [Day](cove-day.png) | [Night](cove-night.png) |
| Return wake | 06:51 | [Day](wake-turn-day.png) | [Night](wake-turn-night.png) |
| Mobile route overview | 07:00 | [Day](mobile-day.png) | [Night](mobile-night.png) |

## Island size at one camera scale

The development preview changes land area for the size study. It preserves the fixture's stage proportions and pier location. Each image uses the same camera position and zoom.

| Asleep time | Land area | Day | Night |
| --- | ---: | --- | --- |
| 20 min | 48.0 m² | [Day](size-20-day.png) | [Night](size-20-night.png) |
| 180 min | 432.0 m² | [Day](size-180-day.png) | [Night](size-180-night.png) |
| 442 min | 1,060.8 m² | [Day](size-442-day.png) | [Night](size-442-night.png) |
| 720 min | 1,728.0 m² | [Day](size-720-day.png) | [Night](size-720-night.png) |

## Implementation notes

- The boat uses the city working vessel and its bridge-wing socket. Both delivery versions have shutters and anchor fittings.
- The pier head has a 3.75 m lateral offset from the boat centerline. The 6 m pier lies alongside the hull. Its shore end meets the coastline.
- The island generator reserves 25 m of clearance from the route before its last 20 m. It corrects the area on the far side after fitting the coast.
- The city light rig fits its shadow bounds to the visible ground. The sleep cameras use this rig. The whale view widens during its entrance and restores the previous scale when it leaves.
- The water uses the shared ocean refraction pass. The seabed extends under the island so that the water stays continuous during the reveal.
- Cliff banks and habitat samples use seeded geometry. Some tide pools extend into coastal cells above the wet sand.
- The close inspection and size-study captures use fixed review cameras. The application offers the voyage, route overview, and destination views.
- The checkpoint uses a synthetic session. Google Health integration, multiple sessions per day, overlapping awakenings, and incomplete sessions remain open. The user will review the final artwork.

## Performance

The measurements used headless Chrome 158.0.8127.37 on an Apple M1 Pro with 16 GiB of memory. The local development app used the synthetic fixture, day lighting, a 1250 × 870 CSS-pixel viewport, and 240× playback.

The baseline kept the same city, boat, camera, replay clock, and vessel rig. It omitted the sleep scenery and its seabed features. The comparison used identical replay start times for each pair. The route overview started at 07:15 after arrival. The follow view started at 00:32:20 in the first DEEP channel.

| View | Peak calls, baseline → complete | Added calls | Peak triangles, baseline → complete | Added triangles | Median frame interval, complete |
| --- | ---: | ---: | ---: | ---: | ---: |
| Route overview | 816 → 874 | 58 | 687,778 → 996,639 | 308,861 | 16.6 ms |
| Voyage follow | 609 → 656 | 47 | 345,574 → 573,723 | 228,149 | 16.7 ms |

The counters include the ocean refraction pass and shadows. Each run discarded eight initial frame intervals and retained the next 56. The overview fits the incremental budgets of 60 calls and 400,000 triangles. The median frame intervals meet the 16.7 ms reference at the reported precision. The fixture uses 102 trees, 80 reed clumps, and 171 coral colonies across its route and island.

## Verification

- `npm run asset:boat` and `npm run asset:sleep` rebuilt both vessel sizes, the sleep landscape assets, and the marine animals.
- `npm run typecheck` and `npm run build` passed. Vite reported its existing bundle-size advisory.
- `npm test` passed all 190 tests, including coast clearance, habitat proportions, multiple island sizes, water masks, and model budgets.
- `npm run test:browser -- --workers=1` passed all 20 Chrome tests. The sleep tests cover backward seeking, frozen water, hidden areas, buoy inspection, stage inspection, and island inspection.

## Changed components

The sleep scene now includes vessel states, companion animation, the final island terrain, tide pools, vegetation, sea mist, and stage selection. The boat and sleep asset builders export the meshes. The shared ocean renderer handles the island apron and lagoon. The frontend supplies the three review views and the inspection cards. The README, product specification, glossary, and visual handoff describe the synthetic voyage and its limits.
