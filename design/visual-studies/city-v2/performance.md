# City redesign closeout

The user accepted the full city at checkpoint B on November 23, 2026. The final review covered tower surfaces during rotation and grass along curved sidewalks. [Checkpoint B gallery](checkpoint-b/README.md)

## World view

Chrome recorded up to 342 draw calls and 1,409,745 triangles per frame across five synthetic dates in daylight and at night. The limits are 350 calls and 2,500,000 triangles. The 20-tower daytime reference used 2,187 draw calls before phase 6.

| Fixture | Daily HRV state | Day calls | Night calls | Day triangles | Night triangles | Day median (ms) | Night median (ms) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Nov 11 | 20 towers | 313 | 326 | 1,393,037 | 1,409,745 | 16.7 | 16.7 |
| Nov 12 | Unavailable | 275 | 286 | 897,021 | 909,805 | 16.7 | 16.7 |
| Nov 13 | Zero towers | 285 | 296 | 1,111,405 | 1,134,897 | 16.7 | 16.7 |
| Nov 14 | Two towers | 295 | 306 | 1,139,874 | 1,162,670 | 16.7 | 16.7 |
| Nov 15 | Five towers | 329 | 342 | 1,205,464 | 1,226,716 | 16.7 | 16.7 |

The nine permanent street buildings use 862 module instances by day and 1,234 at night. The night count includes lit windows. These counts exclude interim buildings, towers, and street furniture. [Final day view](world-performance-day.png) · [Final night view](world-performance-night.png)

## Frame time and ambient occlusion

The reference for median frame time is 16.7 ms. The following measurements use the 20-tower fixture in daylight. The draw and triangle limits apply to the world view.

| View | Median frame interval (ms) | Peak calls | Peak triangles |
| --- | ---: | ---: | ---: |
| world | 16.7 | 313 | 1,393,037 |
| harbor | 16.7 | 1,678 | 1,193,149 |
| walk | 16.7 | 451 | 630,969 |
| skyline | 16.7 | 1,774 | 1,271,067 |

The optional full-resolution `GTAOPass` added 5.43 ms of median GPU time across 109 valid samples. This exceeded the 2 ms allowance. The delivered scene uses baked ambient occlusion and its existing shadows.

## Measurement conditions

- The Mac used an Apple M1 Pro and 16 GiB of memory. Chrome 158.0.8127.37 used WebGL 2 through ANGLE Metal.
- Playwright used desktop Chrome at 1440 × 900 CSS pixels. The drawing buffer measured 1354 × 583 pixels.
- Each run started at 12:00 with synthetic data and 1× playback. Each case used 55 warm-up frames and 110 measured frame intervals.
- The profiler counted shadow draws, the ocean refraction pass, and the main render together. The frame interval includes display synchronization.
- A separate run measured the optional occlusion pass with WebGL timer queries. The profiler excluded disjoint samples.
- Run `node scripts/profile-city.mjs` with the local app available at `http://127.0.0.1:8787`. Add `--capture` to refresh the two final images. The profiler builds a temporary production client and uses the existing local Worker for synthetic records.

## Delivery and validation

| Files changed in phase 6 | Purpose |
| --- | --- |
| `src/scene/city/OverviewModel.tsx`, `BoatScene.tsx`, `SkylineDistrict.tsx` | Batch distant model parts and repeated tower floors. Restore close detail when the user zooms in. |
| `CargoBerth.tsx`, `HarborFleet.tsx`, `HarborRoad.tsx`, `HarborWalk.tsx` | Preserve crane motion, ship movement, vehicle steering, and pedestrian poses across detail levels. |
| `StreetLamp.tsx`, `city/CityStreetLamps.tsx`, `city/BackgroundBuildings.tsx` | Keep lamp lenses and light pools visible at city scale. Simplify distant roof equipment and small props. |
| `scripts/profile-city.mjs`, `tests/browser/boat.spec.ts` | Measure render cost. Check asset loading and the paused night scene after a camera and lighting change. |
| `README.md`, `GLOSSARY.md`, `docs/product-spec.md`, `docs/plans/city-redesign.md`, `design/visual-studies/visual-handoff.md` | Record scene controls, asset commands, definitions, and the results of both reviews. |

The type checks passed. All 176 unit tests and 18 Chrome interaction tests passed. The production build succeeded. Vite reported its size warning for the main client chunk.

```sh
npm run typecheck
npm test
npm run build
npm run test:browser -- --workers=1
node scripts/profile-city.mjs --capture
```

## Design decisions and open items

The waterfront uses the city kit. The repository retains `harbor-building.glb` as a reference asset. At city scale, the dock uses a continuous deck surface. Close views restore individual planks and mooring lines.

The approved layout extends the outer banks to fit 30 HRV plots and two reserved sites. Six permanent infill buildings supplement the original three street buildings. The layout keeps open space at the coves, on reserved land, and around the garden paths.

Section 16 of the plan leaves these decisions open.

- Fixed construction sites outside HRV plots, including any workers or machinery.
- Parked cars near traffic that represents calorie data.
- People without step data, such as seated cafe guests.
- The detailed dam, reservoir, and exercise garden designs.
- HRV display capacity above 30 plots.
- Historical daylight and weather.
