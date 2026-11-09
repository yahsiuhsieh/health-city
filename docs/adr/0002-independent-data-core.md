---
status: accepted
date: 2026-11-08
---

# Keep data transformations independent of React and R3F

Use framework-independent TypeScript modules to derive world state from health records and replay time. React and R3F present the results and handle interaction. This boundary keeps data rules readable and testable without mounting interface components or creating a graphics context.

The alternative mixes data transformations into interface and scene components. It needs fewer explicit boundaries initially, but couples data checks to presentation code.

The selected approach requires explicit data contracts between the core and presentation. A state library remains unselected.

## Replay control

Use one framework-independent TypeScript controller for replay time, speed, pause, and seeking. React controls send commands to this controller. Scene objects update from the same replay time instead of maintaining separate playback clocks.

Keep camera interaction and necessary rendering independent of paused world time. Frequent animation updates must not require a React state update for every frame.

Follow the [product playback rules](../product-spec.md#playback-and-state-restoration) for background interruptions. Reset the frame-time baseline on resumption so hidden or interrupted time does not advance replay unexpectedly. The interruption threshold still requires measurement. A long frame interval does not establish that the operating system slept.

Reference: [R3F performance guidance](https://r3f.docs.pmnd.rs/advanced/pitfalls).
