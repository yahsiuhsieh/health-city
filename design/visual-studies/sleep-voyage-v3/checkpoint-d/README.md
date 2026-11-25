# Checkpoint D · Shared harbor and reef passage

**Approved by the user on November 24, 2026.** Review 1 moves the sleep island closer to the city. The working boat and freighter share one turning basin. The replay uses the synthetic November 11–12 session. [Review 1 plan](../../../../docs/plans/sleep-voyage-v3-review-1.md)

## Day and night captures

Each pair uses the same instant on November 12 and changes only the lighting. The world, harbor, and berth images use their replay cameras. The three pivot images use one fixed camera so the quay and the freighter stay in place. The passage and jetty images use fixed inspection cameras. The two reef-group views use the same camera before the island appears and after arrival.

| Scene | Chicago replay time | Day | Night | Closest reference |
| --- | --- | --- | --- | --- |
| World overview | 07:43:20 | [![World overview in day lighting](world-day.png)](world-day.png) | [![World overview in night lighting](world-night.png)](world-night.png) | [![Island and platform](../checkpoint-b/island-day.png)](../checkpoint-b/island-day.png) |
| Shared harbor | 07:43:20 | [![Shared harbor in day lighting](harbor-day.png)](harbor-day.png) | [![Shared harbor in night lighting](harbor-night.png)](harbor-night.png) | [![Working harbor](../../images/k-working-harbor.png)](../../images/k-working-harbor.png) |
| Working berth | 07:43:20 | [![Working berth in day lighting](berth-day.png)](berth-day.png) | [![Working berth in night lighting](berth-night.png)](berth-night.png) | [![Working boat](../../images/red-cargo-boat-reference.png)](../../images/red-cargo-boat-reference.png) |
| Basin turn begins | 07:16:00 | [![Basin turn begins in day lighting](pivot-entry-day.png)](pivot-entry-day.png) | [![Basin turn begins in night lighting](pivot-entry-night.png)](pivot-entry-night.png) | [![Turn entry](../checkpoint-a/pivot-start-day.png)](../checkpoint-a/pivot-start-day.png) |
| Basin turn at 90° | 07:24:06 | [![Basin turn at 90° in day lighting](pivot-mid-day.png)](pivot-mid-day.png) | [![Basin turn at 90° in night lighting](pivot-mid-night.png)](pivot-mid-night.png) | [![Turn midpoint](../checkpoint-a/pivot-middle-day.png)](../checkpoint-a/pivot-middle-day.png) |
| Basin turn ends | 07:32:12 | [![Basin turn ends in day lighting](pivot-exit-day.png)](pivot-exit-day.png) | [![Basin turn ends in night lighting](pivot-exit-night.png)](pivot-exit-night.png) | [![Turn exit](../checkpoint-a/pivot-end-day.png)](../checkpoint-a/pivot-end-day.png) |
| Freighter test path | Test diagram | [![Freighter test path in day lighting](freighter-day.png)](freighter-day.png) | [![Freighter test path in night lighting](freighter-night.png)](freighter-night.png) | [![Harbor layout](../../images/k-working-harbor.png)](../../images/k-working-harbor.png) |
| Marked north passage | 01:27:02 | [![Marked north passage in day lighting](passage-day.png)](passage-day.png) | [![Marked north passage in night lighting](passage-night.png)](passage-night.png) | [![Submerged reef outline](../heron-reef-satellite.jpg)](../heron-reef-satellite.jpg) |
| Reef channels, close view | 01:27:02 | [Day](reef-channels-day.png) | [Night](reef-channels-night.png) | [Heron Reef flat and patches](../heron-reef-flat-patches.jpg) |
| Outer reef before the island appears | 01:27:02 | [Day](reef-group-day.png) | [Night](reef-group-night.png) | [Submerged reef reference](../heron-reef-satellite.jpg) |
| Outer reef after arrival | 06:36:40 | [Day](reef-arrival-day.png) | [Night](reef-arrival-night.png) | Same camera as the preceding row |
| Approach from the east | 06:20:49 | [![Approach from the east in day lighting](jetty-approach-day.png)](jetty-approach-day.png) | [![Approach from the east in night lighting](jetty-approach-night.png)](jetty-approach-night.png) | [![Jetty at the reef edge](../maldives-cay-jetty-spit.jpg)](../maldives-cay-jetty-spit.jpg) |

The harbor study supplies the quay and vessel references. The world view includes the city, the outer reef, and the island at the same scale. These checkpoint captures show four lateral buoys at the north passage. After the Phase F review, the user requested their removal. The boat still follows the north passage. The westbound boat approaches the T-head with its starboard side toward the jetty.

The Heron Reef satellite image is by NASA/JPL ASTER and is in the public domain. Dr. Ondřej Havelka took the Maldives photograph, licensed under CC BY-SA 4.0. [Reference sources and licenses](../README.md)

## Harbor and freight clearance

The design vessel measures 58 × 10.5 m. The working quay follows the inside of the breakwater. The revised coordinates place the entrance farther east and farther north than the starting sketch. This gives the working boat room to align with the quay after the pivot. It also gives the freighter a separate track through the same entrance while the working boat is berthed.

| Shared harbor measurement | Result |
| --- | ---: |
| Turning basin diameter | 96.00 m |
| Smallest clearance around the basin | 8.40 m |
| Entrance width between the rock toes used in the clearance test | 62.80 m |
| Dredged depth at basin center | 7.00 m |
| Depth at entrance center | 8.96 m |

The freight diagram uses the same poses as the unit test. The test moves a rounded 59 × 11 m hull 3 m from the cargo quay. It holds the heading during the tug-assisted move into the basin. The hull turns 90° within the 87 m circle, then leaves the harbor. During cast-off, the fender face defines the allowed contact side. After cast-off, the smallest gap exceeds the 2 m safety margin by 1.03 m. The harbor view shows open water. Only the test diagram shows construction circles. [Freighter poses](../../../../tests/freighter-path.ts) · [Swept-hull test](../../../../src/scene/cargo-berth.test.ts) · [Clearance model](../../../../src/scene/sleep/clearance.ts)

## Voyage measurements

| Measurement | Result |
| --- | ---: |
| Outbound route, including both lateral moves | 911.14 m |
| Straight distance from the harbor mouth to the jetty head | 481.30 m |
| Route length divided by straight distance | 1.89 |
| Shortest sampled turning radius in open water, outbound / return | 62.50 m / 65.61 m |
| Shortest sampled return radius inside the harbor | 31.65 m |
| Outer reef group length × width along its longest span | 233.00 × 69.35 m |
| Outer reef center east of the harbor mouth | 201.00 m |
| Closest approach to the fixed outer reef, outbound / return | 44.88 m / 57.09 m |
| Closest approach to the island crest before the final 120 m, across six island sizes | 42.87 m |

Five submerged patches form the outer reef. A submerged sand shelf links the five crests. The midpoint of the narrowest gap (12.92 m wide) is 3.76 m deep. The deeper channel crosses the middle of the group at an angle and reaches 9.50 m at the sampled midpoint. The voyage chart draws each outline separately. Before the final 60 m of the approach, the water shows the outer reef and excludes the destination seabed from refraction. Seeking back to the passage restores that view.

The route passes north of the fixed reef, rounds the east end of the island platform, and runs west along the south edge. The return passes south of the fixed reef. The offshore tracks do not cross. The first 20.50 m of the outbound route reach the harbor mouth. [Route](../../../../src/scene/sleep/route.ts) · [Fixed reef](../../../../src/scene/sleep/outer-reef.ts) · [Route tests](../../../../src/scene/sleep/timeline.test.ts)

## Verification

The local checks used Node 24.15.0 and the existing project dependencies. Chrome 158.0.8127.38 captured 22 scene images at 1,164 × 564 CSS pixels and two diagrams at 1,140 × 700 pixels. The capture run reported zero page or shader errors.

| Command | Result |
| --- | --- |
| `npm test` | 204 tests passed in 31 files. |
| `npm run typecheck` | All four TypeScript projects passed. |
| `npm run build` | The production build passed with the existing Vite chunk-size advisory. |
| `npm run test:browser -- --workers=1` | All 29 Chrome tests passed before the channel revision. This run covered destination visibility before arrival, after arrival, and after a backward seek. |
| `npm run test:browser -- --grep 'each scene view\|waterfront plots' --workers=1` | Both affected tests passed after the final harbor fog adjustment. |

After the channel revision, all three targeted Chrome tests passed. They cover seeking through the voyage, world framing, and destination seabed visibility. The close reef captures showed no page or shader errors.

An earlier browser run recorded a graphics context loss and a city preview timeout. Both cases passed in the full run with an unchanged preview. The final harbor captures use the wider view's fog distance so the opposite quay remains visible.

## Rendering measurements before the channel revision

Chrome 158.0.8127.38 ran on an Apple M1 Pro with 16 GiB of memory at 240× playback. Each sample includes 57 frame intervals after eight warm-up frames. The figures include the full scene, shadows, and water refraction.

| Lighting | View | Median interval | Peak draw calls | Peak triangles |
| --- | --- | ---: | ---: | ---: |
| Day | Overview | 16.7 ms | 374 | 1,263,777 |
| Day | Shared harbor | 16.7 ms | 662 | 858,251 |
| Day | North passage | 16.7 ms | 221 | 57,148 |
| Day | Jetty approach | 16.7 ms | 258 | 278,136 |
| Night | Overview | 16.7 ms | 382 | 1,276,369 |
| Night | Shared harbor | 16.7 ms | 667 | 870,843 |
| Night | North passage | 16.6 ms | 226 | 59,472 |
| Night | Jetty approach | 16.7 ms | 260 | 277,676 |

## Review boundary

Phase E covers animals after Checkpoint D approval. Phase F covers the card and remaining visual fixes after Checkpoint E approval. The dark card theme, multiple sessions on one day, and recorded Google Health sleep integration remain open.
