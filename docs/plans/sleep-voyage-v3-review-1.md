# Sleep Voyage v3: Review 1 Changes

**Review 1 complete.** On November 24, 2026, the user approved Checkpoint F after removal of the four outer reef buoys.

| Approved checkpoint | Delivered scope |
| --- | --- |
| [D · Harbor and route](../../design/visual-studies/sleep-voyage-v3/checkpoint-d/README.md) | Shared harbor, freighter clearance, and the route around the outer reef |
| [E · Marine wildlife](../../design/visual-studies/sleep-voyage-v3/checkpoint-e/README.md) | Seven recognizable animals with replay-driven motion |
| [F · Card and scene](../../design/visual-studies/sleep-voyage-v3/checkpoint-f/README.md) | Desktop and phone cards, mist on approach, reef and wake refinements, and the unmarked north passage |

This plan changes [sleep-voyage-v3.md](sleep-voyage-v3.md). When the two plans disagree, this plan controls. Keep every rule in section 2 of the v3 plan.

Read these files before you start:

- `docs/plans/sleep-voyage-v3.md`
- `design/visual-studies/sleep-voyage-v3/README.md` (the reference set)
- `design/visual-studies/sleep-voyage-v3/voyage-card/mockup.html`, with `mockup-desktop.png` and `mockup-phone.png`

Write Markdown in English. Use the `asd-ste100` skill for English technical writing.

## 1. Review findings

### 1.1 User feedback, November 24, 2026

1. The island is acceptable. It is too far from the city. Move it closer. Keep the route long. A route that bends around obstacles is acceptable.
2. The animals are not recognizable. The fish school looks like a shapeless lump. The whale moves as a rigid object, not as a soft living animal. The user approved animal sizes larger than real life, so that viewers can recognize the animals from a distance.
3. The voyage chart card is ugly. Redesign it with a clear visual hierarchy.
4. The outer turning basin is too large, and only the working boat uses it. This is not realistic. Enlarge the original harbor instead. The harbor must also let the largest vessel, the 58 m freighter, turn and leave. The freighter never leaves in the product, but the harbor must allow it.

### 1.2 Live review, November 24, 2026

The review used the local development server at commit `1b7290f`, Chrome, and a 1250 × 870 viewport. It found these additional problems:

| Area | Problem |
| --- | --- |
| Animals | The whale and the manta render above the water surface without depth absorption. They look like toys that float on the water. |
| Animals | The fish school renders over the boat deck. It is the shapeless lump in the user feedback. |
| Animals | Seabirds are dark specks of about 10 px. No flying fish were visible in the LIGHT capture at 02:30. |
| Scene titles | The scene title and the stage line ("Sleep voyage", "Light sleep · Synthetic sleep") use dark text on the dark sea. They are not readable. |
| Water | The flecks are 2–5 m white shapes with hard edges. They look like paper scraps and compete with the animals. |
| Wake | The wake starts as a rectangular foam slab at the stern. |
| Wake | At anchor, a long fresh wake stays behind the stopped boat. |
| Harbor | The dredged outer basin shows the seabed as a large turquoise rectangle. Real harbor water is darker and less clear. |
| Harbor | A wide turquoise apron surrounds the outer breakwaters. |
| Reef | The spur-and-groove edge forms a regular saw-tooth line. Coral colonies on the reef flat read as flat colored discs. |
| Card | The close button shows an orange focus ring when the card opens with a pointer. It looks like an error state. |

## 2. Harbor

### 2.1 Decision

Remove the outer harbor. Enlarge the original harbor so that every vessel shares one turning basin. Real ports work this way: one basin in front of the quays, sized for the largest vessel.

### 2.2 Design vessel

The design vessel is the freighter: 58 m long and 10.5 m wide.

| Item | Rule | Value |
| --- | --- | --- |
| Turning basin diameter | 1.5 × freighter length, with tug assistance | 87 m or more. Use 96 m. |
| Clearance around the basin | To quays, breakwaters, and berthed vessels | 6 m or more |
| Harbor mouth width | Between the breakwater heads | 60 m or more |
| Harbor mouth depth | | 8 m or more |
| Basin depth | Dredged | 7 m |

The basin is open water. Do not mark it with a color, a texture, or a line.

### 2.3 Starting layout

Use this layout as a starting point. Move the coordinates if they collide with city geometry. Keep every rule in section 2.2. In this project, negative Z is north.

| Element | Starting position |
| --- | --- |
| South breakwater | `(-15, -80)` → `(14, -88)` → `(60, -92)` → `(110, -88)` → `(122, -74)` → head `(124, -52)` |
| North breakwater | `(-22, 78)` → `(21, 84)` → `(70, 82)` → `(112, 72)` → `(124, 52)` → head `(126, 10)` |
| Harbor mouth | Between the two heads. Centre about `(125, -21)`. Direction `[1, 0]`. Width about 62 m. |
| Turning basin | Centre `(64, -22)`. Radius 48 m. |
| Working quay | A quay along the inner face of the south breakwater, between x = 66 and x = 100 |
| `WORK_BOAT_BERTH` | On the working quay. Yaw 0, with the bow toward the east. |

Remove these items:

- The old inner arm segments `(27, -72)` → `(27, -22)` and `(36, 23)` → `(29, 16)`.
- The outer arms and `OUTER_MOUTH`. Use one `HARBOR_MOUTH`.
- `INNER_MOUTH`.
- The working quay slab of the outer harbor.

Keep the cargo quay, the freighter berth, the fishing piers, the tug berth, the water taxi, and the marina.

### 2.4 Harbor water

- Real harbor water is less clear than the open sea. Hide the seabed inside the harbor at depths below 2.5 m. Use the existing `harborTint` and extend its mask to the new basin.
- The breakwater toe shows rock rubble to 2–3 m from the crest. After that, the water is dark. Remove the wide turquoise apron.
- Remove the turquoise rectangle of the dredged outer basin.

### 2.5 Maneuvers

Keep the maneuver types and the heading invariants in section 9 of the v3 plan.

- Departure: `lateral` off the working quay, then `path` forward to the harbor mouth. Keep a turning radius of 30 m or more.
- Return: `path` through the mouth to the basin centre, `pivot` 180°, `path` to the quay, then `lateral` alongside.

### 2.6 Freighter clearance test

The freighter does not move in the product. Add a unit test that proves it could leave:

1. Unberth the freighter 3 m from the cargo quay.
2. Move it into the turning basin.
3. Turn it 90° to face east inside the 87 m circle.
4. Move it out through the harbor mouth.

Use the swept-hull method in section 9.6 of the v3 plan with a 59 m × 11 m footprint and a 2 m margin.

## 3. Island position and route

### 3.1 Targets

| Item | Value |
| --- | --- |
| Route length | 900 ± 25 m. Record the measured value in the specification. |
| Straight-line distance from the harbor mouth to the jetty head | 450–500 m |
| Ratio of route length to straight-line distance | 2.0 or less |
| Minimum turning radius in open water | 60 m |
| Minimum distance from the route to a reef crest | 40 m, except during the final jetty approach |

### 3.2 Outer reef

Add one fixed reef between the harbor and the island. The route must go around it. Real boats go around reefs to reach a sheltered landing.

- Build it with the reef platform generator from section 11 of the v3 plan. It has no cay, no beach, and no vegetation.
- Size: 220–320 m long and 50–90 m wide. Place its long axis roughly north-south, across the direct line from the harbor to the island.
- Place it 200–280 m east of the harbor mouth.
- Its shape is fixed. It does not change with the session.
- The outbound boat follows an unmarked passage north of the outer reef.

### 3.3 Route shape

1. Leave the harbor mouth toward the east-northeast.
2. Pass through the north passage of the outer reef.
3. Continue east, north of the island platform.
4. Round the east end of the island platform.
5. Run west along the south reef edge of the island. The final 120 m is straight and parallel to the reef edge. The boat arrives at the jetty heading west.

The jetty is on the south side of the island. Move it there.

### 3.4 Return path

1. Depart forward to the west along the south reef edge. The boat already faces the harbor.
2. Pass south of the outer reef.
3. Enter the harbor mouth heading west.

The outbound route and the return path form one loop around the outer reef. They do not cross. This loop is a transition, not a repeated circuit around the island.

### 3.5 World overview

When the selected day has a sleep island, fit the world overview to the city, the harbor, the outer reef, and the island. Otherwise keep the current framing.

## 4. Animals

### 4.1 Readability scale

The user approved sizes larger than real life. Use these sizes. No animal is longer than 16 m, which is 0.8 times the boat length.

The voyage view shows about 60 m across 1250 px. One metre is about 21 px.

| Animal | Real size | Rendered size | Minimum projected size in the voyage view |
| --- | --- | --- | --- |
| Brown booby | 1.4 m wingspan | 2.8 m wingspan | 55 px |
| Tern | 0.8 m wingspan | 1.8 m wingspan | 38 px |
| Flying fish | 0.3 m long | 0.9 m long, 1.0 m fin span | 18 px, plus the glint and the ripple trail |
| Dolphin | 2.4 m long | 4.0 m long | 85 px |
| Manta ray | 4.5 m wingspan | 8.0 m wingspan | 165 px |
| Whale shark | 9 m long | 12 m long | 250 px |
| Humpback whale | 13 m long | 16 m long | 330 px |

Update section 18 of the v3 plan and `assets.test.ts`. Record this exception in the specification: "Marine animals and birds use a readability scale. No animal is longer than 0.8 times the working boat."

### 4.2 Silhouettes and markings

Each animal must be recognizable as a silhouette at 40 px. Use the markings below. Do not use one flat color for a whole animal.

| Animal | Silhouette | Markings |
| --- | --- | --- |
| Humpback whale | Long white pectoral fins, one third of the body length. Knobbed head. Small dorsal hump. Wide flukes. | Dark grey-black back. White fins and white fluke underside. Pale ventral grooves. |
| Whale shark | Wide flat head with a straight mouth line. Tall dorsal fin. Tall tail. | Dark blue-grey back with a grid of white spots and pale stripes. Pale belly. |
| Manta ray | Diamond shape. Two cephalic fins at the front. Short tail. | Black back with two white shoulder chevrons. White belly, visible in a barrel roll. |
| Dolphin | Beak. Curved dorsal fin. Slim body. | Grey back, lighter sides, white belly. |
| Brown booby | Pointed, straight wings. Wedge tail. | Dark brown head, back, and wings. White belly. |
| Tern | Long narrow wings. Forked tail. | White body. Black cap. |
| Flying fish | Very large pectoral fins, spread like wings. | Blue back, silver sides. The fins catch the sun as a bright glint. |

### 4.3 Under the water

- Render submerged body parts below the water surface. The ocean absorption must tint them with depth. Put them in the pass that the water refraction samples.
- Keep companions at 0.2–1.2 m depth for at least 70% of the encounter. At 1 m depth, the body is clearly blue-tinted but its markings stay visible.
- Only these parts break the surface: the back and the dorsal fin, the wingtips, the flukes, the blow, and a breach. Each one makes foam and a short V-shaped wake while it moves.
- Never render a whole body on top of the water, except during a breach or a leap.

### 4.4 Soft-body motion

Replace rigid node rotations with body deformation. Use a vertex shader. Bake an `along` attribute into each asset, from 0 at the head to 1 at the tail. Drive every wave from ambient time.

| Animal | Deformation | Tail or tip amplitude | Frequency |
| --- | --- | --- | --- |
| Humpback whale | Up-and-down wave along the body | 12% of the body length | 0.3 cycles per ambient unit |
| Dolphin | Up-and-down wave along the body | 15% of the body length | 1.2 cycles per ambient unit |
| Whale shark | Side-to-side wave along the body | 10% of the body length | 0.4 cycles per ambient unit |
| Manta ray | Wave along each wing, from the leading edge to the trailing edge and from the root to the tip | 20% of the wingspan | 0.5 cycles per ambient unit |
| Birds | Wing flap, then a glide | Wing rotation 35° | 3 flaps per ambient unit during flapping |
| Flying fish | Tail beat at takeoff only | 20% of the body length | 6 cycles per ambient unit |

Also apply these rules:

- The amplitude is zero at the head and increases toward the tail.
- The body bends along the curvature of its path.
- Pectoral fins rotate slightly with the body wave.
- Seeking restores the exact deformation.

### 4.5 Behavior

| Animal | Sequence per encounter |
| --- | --- |
| Humpback whale | Swims beside the boat. Surfaces every 4–6 ambient units with a 3–4 m bushy blow. The back arches and the flukes rise before each dive. One breach with a large splash. |
| Dolphins | A pod of 6–10. Two to four ride the bow wave. The others porpoise in arcs beside the boat. One to three leaps per ambient unit. |
| Manta ray | Glides beside the boat with slow wing waves. The wingtips break the surface now and then. One barrel roll shows the white belly. |
| Whale shark | Cruises slowly just below the surface. The dorsal fin and the tail tip cut the surface with a V-shaped wake. |

### 4.6 Fish schools

Remove the fish school system (`Silver school` in `wildlife-render.ts`). It is not readable at this scale. The specification lets the fish be optional.

### 4.7 Birds and flying fish

- Each bird casts a soft shadow on the water. The shadow shows the height of the bird.
- Each flying fish leaves a ripple trail at takeoff and at each touch. Its fins make a bright glint in daylight.
- At night, the deck lights light the birds near the boat.

## 5. Sleep voyage card

### 5.1 Reference

Build the card from `design/visual-studies/sleep-voyage-v3/voyage-card/mockup.html`. Match its layout, type scale, spacing, and colors. The mockup is a static design study. Write the React component from it. Do not copy its script.

Replace `src/frontend/VoyageChart.tsx` and `voyage-chart.css`. Rename the card to "Sleep voyage". Update its accessible name and the browser tests.

### 5.2 Visual hierarchy

| Level | Content | Style |
| --- | --- | --- |
| 1 | Time asleep, for example "7 h 22 min asleep" | 40 px semibold. 34 px at phone width. |
| 2 | Stage durations, the timeline, the island area | 16 px semibold values. Full-width charts. |
| 3 | Section headings and labels | 13 px medium, secondary ink |
| 4 | Meta text, axis labels, and units | 11–12 px, muted ink |

Use these sections, in this order:

1. **Header.** The eyebrow "Sleep voyage", the night title "Night of Wed, Nov 11", the time range, and the time zone. The close button is on the right.
2. **Status pill.** Only during the voyage. It shows the current stage, its start time, and the replay time.
3. **Hero.** Time asleep, with one supporting line: time in bed and awakenings. An island chip on the right shows the island area. Before arrival, it shows the arrival time.
4. **Stages.** A 12 px stacked bar with 2 px gaps. A direct legend under it shows the name, the duration, and the percentage. Show "Unclassified" only when its value is above zero. Keep a visually hidden table for screen readers.
5. **Timeline.** A hypnogram with four rows: Awake, REM, Light, and Deep. Each segment is a 22 px bar with 4 px corners. Thin vertical risers join the segments. Hour gridlines and labels run at the bottom.
6. **Route and details.** A small schematic map and a definition list, side by side on desktop and stacked on phones.

Remove these items from the current card:

- The large chart as the main element.
- The contour line stacks.
- The visible stage table.
- The "Unclassified 0 0.0%" row.
- The bottom totals row.
- The "Replay · 05:26" reading strip. The status pill and the tooltips replace it.

### 5.3 Colors

The user asked for colors that are easy to tell apart at a glance. Do not use one hue for all stages. Use four distinct hues. Their lightness still falls from REM to Light to Deep, so the depth order stays visible.

| Token | Color | Hue |
| --- | --- | --- |
| `--awake` | `#e0862f` | Amber. Always with an anchor icon and a label. |
| `--rem` | `#29b0a0` | Teal |
| `--light` | `#4479d6` | Blue |
| `--deep` | `#5a3aa6` | Violet |
| `--unclassified` | `#8e979f` | Grey, always with a 45° hatch |

The dataviz validator passed the four hues in light mode against the card surface `#fbfcfa`, with `--pairs all`. The worst color-vision-deficiency separation is ΔE 13.3 (deutan). The validator warns that amber and teal have less than 3:1 contrast against the surface. The direct legend labels and the hidden table give the required relief. Keep both.

These colors replace the chart colors in section 14.1 of the v3 plan. Text always uses the ink tokens, never a stage color. If a dark theme ships, choose dark-mode steps of the same hues and run the validator against the dark surface.

Use the surface, ink, and line tokens from the mockup: `--surface #fbfcfa`, `--ink #1d3833`, `--ink-2 #4b6560`, `--ink-3 #7b8f8a`, `--line #e1e9e6`, and `--accent #2e5e4e`.

### 5.4 States

| State | Behavior |
| --- | --- |
| After arrival | All values are complete. The island chip shows the area. The timeline is complete. |
| During the voyage | The hero shows "asleep so far". The stage values count only the replayed part. A cursor marks the replay time. A hatched area covers the rest of the session. The island chip shows "Island on arrival" and the arrival time. |

### 5.5 Interaction

- Hovering or focusing a timeline segment shows a tooltip, for example "REM · 05:05–05:55 · 50 min".
- Clicking a segment selects it. The same segment gets a ring on the route map. The status pill shows the selection with a "Clear" button.
- Tab moves through the segments. Enter selects. Escape closes the card.
- The close button shows a focus ring only for keyboard focus. Use `:focus-visible`.
- Pause and seek update the card.

### 5.6 Layout

- Desktop: a floating panel over the scene, at most 760 px wide, with a 24 px margin. It scrolls inside when it is taller than the scene.
- Phone width, 640 px or less: a bottom sheet with a drag handle, at most 85% of the viewport height.
- Render the timeline at the width of its container. Labels never fall below 11 px. Below 480 px, show an hour label every two hours.

### 5.7 Scroll reveal

The user asked for content below the visible area to start blurred and become sharp as the user scrolls. The mockup shows this behavior.

- The header, the status pill, and the hero never blur.
- The Stages section, the Timeline section, and the Route and details block reveal as they enter the scroll area of the card.
- At the start of the reveal, the content has an 8 px blur, 35% opacity, and a 12 px downward offset. It becomes sharp, opaque, and in place over the first 70% of its entry.
- Use a CSS scroll-driven animation with `animation-timeline: view()`. The timeline uses the nearest scroll container, which is the card panel.
- If the browser does not support scroll-driven animations, use an `IntersectionObserver` that sets the same values from the intersection ratio.
- With `prefers-reduced-motion: reduce`, show all content sharp at once.
- When keyboard focus enters a section, show that section sharp at once. Use `:focus-within`.
- The blur must not hide content from screen readers. Do not use `aria-hidden` or `visibility` for the reveal.
- If the whole card fits without scrolling, nothing blurs.

### 5.8 Route map

Draw the map from world coordinates: the coastline, the breakwaters, the outer reef, the island platform, the cay, the jetty, and the route. Simplify the shapes. Color the route by stage with a 2 px surface outline. Show each awakening as a ring in the awake color. Show the boat marker at the replay position.

## 6. Other fixes

| Area | Fix |
| --- | --- |
| Scene titles | Put the scene title and the stage line on a translucent surface chip, or switch to light text with a soft shadow over dark scenes. The contrast must be at least 4.5:1. |
| Flecks | Reduce the size to 0.3–1.2 m. Soften the edges. Lower the contrast by half. Keep them independent of stage. They stay neutral, because wind effects remain reserved for weather. |
| Wake start | Start the wake as turbulent propeller wash as wide as the stern. It widens and softens behind the boat. Remove the rectangular slab. |
| Wake at anchor | When the boat stops, the wake fades from the stern backward over 2 ambient units. |
| Reef edge | Break the regular saw-tooth line. Vary the spur spacing between 5 m and 14 m and the spur length between 6 m and 18 m. |
| Reef colonies | Use the bommie rule in section 11.5 of the v3 plan. Deeper colonies look darker through the water. No colony reads as a flat disc from above. |
| Wake buoy | Make the buoy visible in the voyage view. Its projected height is at least 24 px. |
| Anchor swing | Remove the anchor yaw swing. Section 6.1 gives the reason. |
| Sea mist | Rebuild the mist bank as in section 6.2. |

### 6.1 Anchor swing

The boat swings from side to side while it is at anchor. `cabinState()` in `vessel-state.ts` sets `swing` to ±6° (`Math.PI/30`) with a 120 s period of session time. At the default 240× speed, one swing lasts 0.5 s on screen. The boat appears to shake.

A real boat swings at anchor because of wind and current, over several minutes. The specification reserves wind-driven effects for historical weather. Make these changes:

- Remove the yaw swing at anchor. Set `swing` to zero and keep `anchoredPose()` only if another feature needs it.
- Keep the gentle swell motion from `boatPose()`: 0.055 m heave, 0.7° roll, and 0.35° pitch.
- At the jetty and at the berth, the mooring lines hold the boat. Use the same swell motion with half the roll.
- Add a unit test for each `hold`, including anchoring and mooring. The yaw changes by less than 0.5° across the hold.

### 6.2 Sea mist

The mist bank does not match the island size. `SeaMist.tsx` has these causes:

- The mist centre is at `JETTY_HEAD[0] - 15` on the X axis, not at the reef platform centre. Part of a large island is outside the mist.
- The dense part of each layer covers only about the inner third of its radius (`smoothstep(.31, 1., ...)`). The visible bank is much smaller than its plane.
- The bank is one ellipse. The island platform is elongated and irregular.

Rebuild the mist with these rules:

- Centre the bank on the reef platform centre. Rotate it to the long axis of the platform.
- Make the dense part cover the whole platform plus a 30 m margin. Use the distance to the platform outline for the falloff, not a fixed ellipse.
- Use a minimum bank size of 120 m × 80 m. The mist around a small island then still looks like a natural bank.
- Build the bank from 6–12 overlapping patches of 30–80 m. Drift them slowly with ambient time.
- During the final 60 m of the approach, the mist thins first on the jetty side, then over the rest of the platform.
- Add a unit test for the island sizes in section 11.2 of the v3 plan. The dense mist covers the whole platform before the reveal starts.



## 7. Specification and glossary

Update `docs/product-spec.md`:

- Replace "passes the outer harbor mouth" with "passes the harbor mouth". Record the new measured route length.
- Add the readability scale rule in section 4.1.
- State that the voyage passes one fixed outer reef and arrives at the jetty on the south side of the island.

Update `GLOSSARY.md`:

- Rename "Voyage chart" to "Sleep voyage card". Keep the definition.
- Add "Outer reef": "A fixed reef between the harbor and the sleep island. The voyage goes around it. It is not a sleep island."

## 8. Phases and checkpoints

Report and stop at each checkpoint. Do not continue until the user approves.

### Phase D: Harbor and route

1. Rebuild the harbor as in section 2.
2. Add the outer reef, move the island and the jetty, and rebuild the route and the return path as in section 3.
3. Apply the harbor water and the breakwater toe changes.

**Checkpoint D.** Capture these screenshots in day and night:

- The world overview with the island.
- The harbor view, with the turning basin left unmarked.
- The working boat at its berth.
- Three frames of the return pivot.
- A diagram of the freighter test path from section 2.6.
- The north passage of the outer reef.
- The jetty approach from the east.

### Phase E: Animals

1. Rebuild the animals as in section 4.
2. Remove the fish school.

**Checkpoint E.** Capture each animal in the voyage view and in a close view. Capture the whale sequence: blow, fluke dive, and breach. Capture the dolphins on the bow wave. Capture the manta barrel roll. Add a short screen recording of each animal in motion.

### Phase F: Card and fixes

1. Build the card as in section 5.
2. Apply the fixes in section 6.

**Checkpoint F.** Capture the card on desktop and at phone width, after arrival and during the voyage. Place each capture next to the matching mockup image. Add a short screen recording of the scroll reveal. Capture the mist bank at 60 m, 30 m, and 0 m before arrival for the 20-minute, 442-minute, and 720-minute islands.

## 9. Tests

- Harbor: the turning basin clearance, the mouth width, and the freighter test in section 2.6.
- Route: the targets in section 3.1. The outbound route and the return path do not cross.
- Animals: the projected sizes in section 4.1. No animal is longer than 16 m.
- Deformation: at two ambient times, the tail moves by at least 5% of the body length and the head moves by at most 1%.
- Under the water: companion body meshes are in the refraction pass. Only the surfacing parts render above the water.
- Card: the hierarchy order, the "so far" state, the hidden future, keyboard selection, Escape, and `:focus-visible`.
- Card scroll reveal: below-the-fold sections start blurred, become sharp after scrolling, and stay sharp with reduced motion and with keyboard focus.
- Anchor and hold: the yaw test in section 6.1.
- Mist: the coverage test in section 6.2.
- Keep every test from the v3 plan that still applies.

## 10. Open items

Do not decide these items. List them in the final report.

- A dark theme for the card.
- Several sessions on one day.
- Wiring real Google Health sleep sessions into the scene.
