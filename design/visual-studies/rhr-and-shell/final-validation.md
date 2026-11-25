# Final validation · November 25, 2026

The user approved Checkpoint D. The checks used synthetic replays and local Worker fixtures. They made no live Google Health requests.

## Function and interaction

- The TypeScript checks and production build passed. Vite reported the existing client chunk size warning.
- All 228 unit tests and 11 Worker runtime tests passed. Miniflare used a local test database.
- All 43 Chrome browser tests passed in one final run (4.4 minutes). An earlier island click used an off-screen coordinate before the camera settled. The test now checks that the canvas receives the projected point before it clicks.
- The dock test used the keyboard to reach all seven chips. Chrome exposed each chip's accessible name and showed its focus ring. Escape restored focus to the chip. This check used the browser accessibility API.
- A date change preserved the camera after manual rotation and zoom. The new date started paused at 00:00. Closing the card also preserved the pose. Selecting World during playback kept the clock running.
- The reservoir test checked the water surface, intake range, unavailable state, and outlet jet. Seeking changed the jet phase. The daily waterline stayed fixed. The tailwater channel uses static geometry.
- Replay tests covered ocean waves, the boat, wildlife, pedestrians, road traffic, and restoration after seeking. These checks apply to the sampled states and dates.
- The chart check compared all six cards with the synthetic fixture. The HRV tower count and RHR water level matched the daily readings. The heart chart and the ridge elevation matched the selected five-minute interval. The sleep chart matched total asleep time after arrival. The projected island mesh measured 10 m² per minute asleep.
- Steps and energy use three time scales. The hero accumulates completed intervals, the intraday bars show hourly totals, and the scene uses the current five-minute interval. The test checked each scale and compared the full-day heroes with the weekly chart.

## City rendering budget

The production profile used local Chrome 158.0.8127.38 on an Apple M1 Pro with 16 GiB of memory. The viewport and drawing buffer measured 1440 × 900 pixels. The profiler played each date from noon, warmed up for 55 frames, and measured the next 110. Counts include shadows, ocean refraction, and the main pass.

| Synthetic date | Day calls | Night calls | Day triangles | Night triangles | Median interval, day / night |
| --- | ---: | ---: | ---: | ---: | ---: |
| Nov 11 | 276 | 292 | 1,503,320 | 1,520,778 | 16.7 / 16.7 ms |
| Nov 12 | 265 | 279 | 968,612 | 982,146 | 16.7 / 16.7 ms |
| Nov 13 | 185 | 199 | 1,048,967 | 1,073,209 | 16.7 / 16.7 ms |
| Nov 14 | 196 | 210 | 1,078,208 | 1,101,708 | 16.7 / 16.7 ms |
| Nov 15 | 229 | 245 | 1,142,998 | 1,165,000 | 16.7 / 16.7 ms |

The world budget is 350 draw calls and 2.5 million triangles. Before batching, the November 11 night view reached 434 calls with the same triangle count. The overview now draws street modules, cabin windows, and shutters in batches. The focused views retain their detailed models.

A separate 30-tower fixture used the recorded-data path with mocked responses. The world view reached 177 calls and 1,304,802 triangles by day and 185 calls and 1,318,144 triangles at night. Both median intervals were 16.7 ms.

The production Steps, HRV, and RHR focus views each had a median interval of 16.7 ms. The HRV close view reached 1,615 calls. The 350-call budget applies to the world overview.

With the local app running, use the project Node version to repeat the city and glass measurements.

```sh
node scripts/profile-city.mjs
node scripts/profile-city.mjs --glass-only
```

## Glass and camera transitions

Chrome traced the production client at 1440 × 900 with the same camera and paused replay time for each comparison. The six passes used the following order. First hide the controls, then disable only their backdrop filters, then enable glass twice. Repeat the two baseline configurations in reverse order. Each pass used 55 warm-up frames and 110 measured frames.

| View | Active filters | Median frame interval | Display draw and swap | GPU process swap task |
| --- | ---: | ---: | ---: | ---: |
| World, shell hidden | 0 | 16.7 ms | 0.082–0.085 ms | 0.119–0.124 ms |
| World, filters off | 0 | 16.7 ms | 0.078–0.080 ms | 0.125–0.129 ms |
| World, glass on | 4 | 16.7 ms | 0.417–0.437 ms | 0.906–0.915 ms |
| RHR, shell hidden | 0 | 16.7 ms | 0.091–0.096 ms | 0.126–0.133 ms |
| RHR, filters off | 0 | 16.7 ms | 0.101–0.105 ms | 0.154–0.178 ms |
| RHR, glass on | 5 | 16.7 ms | 0.495–0.504 ms | 1.054–1.151 ms |

The ranges show the two medians for each configuration. With five glass surfaces, the GPU process swap task took about 0.97 ms longer than with the shell hidden. Chrome reported zero device execution intervals. Instruments Game Performance attached to the test browser's GPU process for five seconds. Its GPU interval, execution point, and counter interval tables had zero rows. The 2 ms hardware GPU limit remains unverified.

The profiler sampled two seconds from each chip selection. Median frame intervals were 16.7 ms for HRV, RHR, Steps, and World. The 95th percentiles ranged from 16.7 to 16.8 ms. The longest interval was 66.6 ms on return to World.

The checks used desktop Chrome with ANGLE Metal on one Mac. The mobile layout check used Chrome viewport emulation. Physical phones, VoiceOver audio, and live account data were outside this run.
