# Checkpoint F · Sleep voyage card and scene review

**Final acceptance · November 24, 2026.** The user approved Checkpoint F after removal of the four outer reef buoys. This approval completes Sleep Voyage v3 Review 1. [Delivery record for Checkpoints D, E, and F](../../../../docs/plans/sleep-voyage-v3-review-1.md)

## Card comparison

Each reference shows one state of the approved mockup. The first product image shows the card when it opens. The second shows the bottom of the same panel after a scroll. Desktop uses a 1250 × 870 viewport. Phone uses 390 × 844. [Design study](../voyage-card/mockup.html) · [Original desktop reference](../voyage-card/mockup-desktop.png) · [Original phone reference](../voyage-card/mockup-phone.png)

| State | Reference | Card in the scene | Lower sections |
| --- | --- | --- | --- |
| Desktop · sailing at 05:26 | ![Desktop sailing reference](reference-desktop-sailing.png) | ![Sailing panel](desktop-sailing.png) | ![Sailing timeline and map](desktop-sailing-details.png) |
| Desktop · after arrival at 07:00 | ![Desktop arrival reference](reference-desktop-arrived.png) | ![Arrival panel](desktop-arrived.png) | ![Complete timeline and map](desktop-arrived-details.png) |
| Phone · sailing at 05:26 | ![Phone sailing reference](reference-phone-sailing.png) | ![Sailing sheet](phone-sailing.png) | ![Sailing details](phone-sailing-details.png) |
| Phone · after arrival at 07:00 | ![Phone arrival reference](reference-phone-arrived.png) | ![Arrival sheet](phone-arrived.png) | ![Arrival details](phone-arrived-details.png) |

At 05:26 the card shows 6 h 18 min asleep, one eight-minute awakening, and 06:30 as the arrival time. The timeline hatches the remaining 64 minutes. At 07:00 the card shows 7 h 22 min asleep and a 10,608 m² island. The marker follows the boat on its return. The schematic uses the world coastline, breakwaters, split outer reef, island, jetty, and actual course.

The header and hero stay sharp. Sections below them sharpen as they enter the panel. Keyboard focus sharpens a section immediately. Reduced motion disables the effect. The 4.1-second Chrome recording shows the phone sheet at 05:26. Chrome decoded different frames near the beginning and end of the recording. [Scroll reveal recording](scroll-reveal.webm)

## Mist on approach

Each row uses one camera position and scale across the approach. The inspection camera includes the bank's outer edge. The three sizes use the development island-size preview and the same synthetic voyage clock. The columns show remaining route distance, rounded to the nearest metre.

| Asleep minutes | 60 m · before clearing | 30 m · jetty side clearing | 0 m · moored |
| --- | --- | --- | --- |
| 20 | ![20-minute bank at 60 m](mist-20-60.png) | ![20-minute bank at 30 m](mist-20-30.png) | ![20-minute island at arrival](mist-20-0.png) |
| 442 | ![442-minute bank at 60 m](mist-442-60.png) | ![442-minute bank at 30 m](mist-442-30.png) | ![442-minute island at arrival](mist-442-0.png) |
| 720 | ![720-minute bank at 60 m](mist-720-60.png) | ![720-minute bank at 30 m](mist-720-30.png) | ![720-minute island at arrival](mist-720-0.png) |

The dense bank follows the full reef outline, including a 30 m margin. Twelve drifting patches vary the density across the elongated bank. The jetty becomes visible first. At arrival, the three islands retain their different cay sizes and reef outlines. [Island structure references](../README.md#structure-references)

## Wake, buoy, and reef

The user requested removal of the four red and green buoys at the outer reef. The boat follows the same north passage. The awakening buoy still opens the sleep record. [Revised voyage view](north-passage.png)

| Underway · 02:55 | At anchor · 03:03:10 | At anchor · 03:06:20 |
| --- | --- | --- |
| ![Propeller wash](wash-underway.png) | ![Residual wake](wash-stopping.png) | ![Wake after two ambient units](wash-clear.png) |

The wash widens behind the stern. At anchor, foam clears near the hull before the distant trail fades. The fully stopped boat holds its heading. At the jetty and harbor berth, the boat keeps its heave and pitch with half the roll. [Turning wake reference](../../ocean-reference/frame-wake-turn.jpg)

| Daytime title and buoy | Night title and buoy | Colonies beside the jetty |
| --- | --- | --- |
| ![Anchor in daylight](anchor-day.png) | ![Anchor at night](anchor-night.png) | ![Coral colonies](reef-colonies.png) |

The complete buoy projects to 36.8 px in the desktop voyage view. A separate browser check requires at least 24 px above water. The title and stage line share a dark translucent surface. Their minimum calculated contrast over white is 9.84:1. The 0.3–1.2 m flecks have soft edges and half the previous mixing strength. The reef uses irregular spurs with 5–14 m spacing and 6–18 m lengths. Clusters of coral share uneven rock mounds with sand gaps between them. [Coral style reference](../../images/reef-reference.png)

## Implementation and checks

- [Card and replay interactions](../../../../src/frontend/VoyageChart.tsx) · [Layout, palette, and scroll reveal](../../../../src/frontend/voyage-chart.css) · [World-to-map projection](../../../../src/frontend/voyage-chart-data.ts)
- [Mist footprint](../../../../src/scene/sleep/mist-bank.ts) · [Mist rendering](../../../../src/scene/sleep/SeaMist.tsx) · [Reef relief](../../../../src/scene/sleep/reef.ts) · [Colony placement](../../../../src/scene/sleep/island-layout.ts) · [Coral and rock assets](../../../../scripts/build-sleep-assets.mjs)
- [Wake rendering](../../../../src/scene/ocean/BoatWake.tsx) · [Wake timing](../../../../src/scene/sleep/timeline.ts) · [Water flecks](../../../../src/scene/WaterSurface.tsx) · [Hull motion](../../../../src/scene/BoatScene.tsx)
- [Island and mist coverage tests](../../../../src/scene/sleep/island.test.ts) · [Heading tests](../../../../src/scene/sleep/timeline.test.ts) · [Card and scene browser tests](../../../../tests/browser/sleep.spec.ts)

The asset build, four TypeScript checks, 207 unit tests, 35 Chrome tests, and the production build passed. The checks used `npm run asset:sleep`, `npm run typecheck`, `npm test`, `npm run test:browser`, and `npm run build`. Vite reported its existing bundle-size advisory. The asset build reproduced the approved wildlife file byte for byte. The coverage test checks the outline and its 30 m margin at all six supported island sizes.

The 35 Chrome tests and rendering measurements preceded the final buoy removal. After removal, all 207 unit tests, four TypeScript checks, and the production build passed again. Chrome showed the unmarked passage in both lighting settings. Clicking the awakening buoy opened the sleep record.

## Rendering measurements

Chrome 158.0.8127.38 ran on an Apple M1 Pro with 16 GiB at 240× replay. Each pair used the same lighting, camera, and replay start. The baseline omitted the sleep scenery and island seabed. The open-card comparison kept the card open in both runs. Each run measured 57 frame intervals after eight warm-up frames. The table shows additional peak draw calls and triangles, including the refraction pass. [Measurement method](../checkpoint-c/README.md#voyage-chart)

| Lighting | View | Added calls | Added triangles | Median frame interval |
| --- | --- | ---: | ---: | ---: |
| Day | Approach | 37 | 130,868 | 16.7 ms |
| Day | Island overview | 48 | 384,660 | 16.7 ms |
| Day | Open card | 7 | 3,814 | 16.7 ms |
| Night | Approach | 40 | 130,762 | 16.7 ms |
| Night | Island overview | 48 | 384,660 | 16.7 ms |
| Night | Open card | 8 | 6,154 | 16.6 ms |

## Open items

A dark card theme, multiple sleep sessions on one day, and recorded Google Health sleep sessions in the scene remain open.
