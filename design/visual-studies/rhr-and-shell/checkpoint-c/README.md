# Checkpoint C · Glass interface

The captures show local synthetic replays. The desktop viewport is 1440 × 900 px. Chrome emulated a 390 × 844 px phone viewport. Sleep uses the November 12 voyage. The other five cards use November 15 at 12:20.

[Watch the card transitions](cards.webm)

## Desktop

| View | Day | Night | Reduced transparency | Seven-day view |
| --- | --- | --- | --- | --- |
| World | [Day](desktop-day-world.jpg) | [Night](desktop-night-world.jpg) | [Opaque](desktop-opaque-world.jpg) | — |
| Sleep | [Day](desktop-day-sleep.jpg) | [Night](desktop-night-sleep.jpg) | [Opaque](desktop-opaque-sleep.jpg) | [History](desktop-day-sleep-week.jpg) |
| Heart | [Day](desktop-day-heart.jpg) | [Night](desktop-night-heart.jpg) | [Opaque](desktop-opaque-heart.jpg) | [History](desktop-day-heart-week.jpg) |
| HRV | [Day](desktop-day-hrv.jpg) | [Night](desktop-night-hrv.jpg) | [Opaque](desktop-opaque-hrv.jpg) | — |
| RHR | [Day](desktop-day-rhr.jpg) | [Night](desktop-night-rhr.jpg) | [Opaque](desktop-opaque-rhr.jpg) | — |
| Steps | [Day](desktop-day-steps.jpg) | [Night](desktop-night-steps.jpg) | [Opaque](desktop-opaque-steps.jpg) | [History](desktop-day-steps-week.jpg) |
| Energy | [Day](desktop-day-energy.jpg) | [Night](desktop-night-energy.jpg) | [Opaque](desktop-opaque-energy.jpg) | [History](desktop-day-energy-week.jpg) |

## Phone

| View | Day | Night | Reduced transparency | Seven-day view |
| --- | --- | --- | --- | --- |
| World | [Day](phone-day-world.jpg) | [Night](phone-night-world.jpg) | [Opaque](phone-opaque-world.jpg) | — |
| Sleep | [Day](phone-day-sleep.jpg) | [Night](phone-night-sleep.jpg) | [Opaque](phone-opaque-sleep.jpg) | [History](phone-day-sleep-week.jpg) |
| Heart | [Day](phone-day-heart.jpg) | [Night](phone-night-heart.jpg) | [Opaque](phone-opaque-heart.jpg) | [History](phone-day-heart-week.jpg) |
| HRV | [Day](phone-day-hrv.jpg) | [Night](phone-night-hrv.jpg) | [Opaque](phone-opaque-hrv.jpg) | — |
| RHR | [Day](phone-day-rhr.jpg) | [Night](phone-night-rhr.jpg) | [Opaque](phone-opaque-rhr.jpg) | — |
| Steps | [Day](phone-day-steps.jpg) | [Night](phone-night-steps.jpg) | [Opaque](phone-opaque-steps.jpg) | [History](phone-day-steps-week.jpg) |
| Energy | [Day](phone-day-energy.jpg) | [Night](phone-night-energy.jpg) | [Opaque](phone-opaque-energy.jpg) | [History](phone-day-energy-week.jpg) |

The Sleep sheet has two heights. [Compact sheet](phone-day-sleep-compact.jpg) · [Expanded sheet](phone-day-sleep.jpg)

## Data states

| Condition | Desktop | Phone |
| --- | --- | --- |
| Missing HRV | [Desktop](desktop-day-missing.jpg) | [Phone](phone-day-missing.jpg) |
| Two RHR records with different values and methods | [Desktop](desktop-day-conflict.jpg) | [Phone](phone-day-conflict.jpg) |
| Partial coverage for steps | [Desktop](desktop-day-partial.jpg) | [Phone](phone-day-partial.jpg) |
| Two earlier dates with sleep records | [Desktop](desktop-day-insufficient-history.jpg) | [Phone](phone-day-insufficient-history.jpg) |

## Validation

Chrome completed four browser tests. They cover desktop and mobile framing, reduced motion, keyboard navigation, tab selection, focus restoration, and history retry. The retry test uses local HTTP fixtures. The complete browser suite passed across two runs. The first run passed 36 of 39 tests. Two scene loads timed out. An earlier island test still expected the visible island to reject clicks. The three cases passed on rerun after the island assertion changed.

The palette check used sRGB relative luminance over the card fills. It included a black scene under the day card and a white scene under the night card. Minimum secondary text contrast was 7.44:1 by day and 5.43:1 at night. Minimum series contrast was 3.69:1 by day and 3.02:1 at night. The check also simulated protanopia, deuteranopia, and tritanopia. The sleep timeline uses labeled rows. The weekly chart gives stage values in its data table.

## Frame timing

Chrome ran the November 11 world view at noon, at 1440 × 900 px. Each pass used 55 warm-up frames and 110 measured frames. The runs used the same scene and shell with backdrop filters disabled, enabled, enabled, then disabled.

| Median (ms) | Filters off, first | Filters on, first | Filters on, second | Filters off, second |
| --- | ---: | ---: | ---: | ---: |
| Animation frame interval | 33.3 | 33.3 | 33.3 | 33.3 |
| Display compositor draw and swap | 0.119 | 0.658 | 0.697 | 0.139 |
| GPU process swap task | 0.166 | 1.203 | 1.188 | 0.194 |

An additional run after screenshot capture measured a median frame interval of 16.7 ms with both settings.

These trace events measure work on the compositor and GPU process threads. The Metal trace contained command-buffer completion events. Its GPU execution interval table contained no samples. Neither trace isolated the hardware execution time for the CSS backdrop pass. The 2 ms hardware GPU limit remains unverified.
