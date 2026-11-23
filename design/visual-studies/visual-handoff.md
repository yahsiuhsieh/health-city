# HealthCity Visual Direction

This document preserves visual feedback through November 23, 2026. It is the maintained reference for provisional art direction.

The [product specification](../../docs/product-spec.md) defines product behavior and data mappings. Visual feedback does not replace those rules. Final art direction and the production asset pipeline still require approval.

## Current direction

Create an inviting miniature city that feels inhabited, maintained, and purposefully working for the user's health. Combine residential warmth with functional industrial character in appropriate places:

- Working vessels and harbor operations.
- Maintenance activity and restrained building services.
- Practical vehicles.

Keep the whole city clean and welcoming. Use cohesive stylized 3D, readable silhouettes, softened edges, mostly matte materials, and controlled areas of solid color. Object classes may use different geometry while sharing proportions, palette, and lighting.

## Element preferences

| Element | User preference |
| --- | --- |
| Buildings | Keep party walls clear and close the gaps between attached shops. Use the five tower families for HRV. **G preferred over F**. Use staggered rounded volumes, thick window surrounds, recessed glazing, vertical timber accents, and layered terraces. F's architectural forms remain a secondary reference. Avoid its noisy, dotted, or mottled tiles. Timber is an accent, not a requirement for every object. |
| Boats | The 16 m working boat uses a separate boarding float beside the cargo quay. **The supplied red cargo-boat reference** is the current primary direction. Use a red-brown shaped hull, compact aft house, open foredeck, timber hatch covers, cargo derrick, dark rails, and restrained working equipment. I remains a secondary reference. Retain subtle low-poly geometry. Vessel inventory and functional roles remain product decisions. |
| Trees | **G and I**. I's subtle low-poly quality is particularly appealing. Use broad layered or umbrella canopies, expressive branches, and a few soft planar changes. Individual leaves and fuzzy realistic foliage are unnecessary. |
| Quays and paving | Use continuous path junctions, raised medians, curved sidewalks, and stone edges at the quay. Elements from **E, G and I**. Use curved waterfront edges, large paving slabs, timber boardwalks, steps, and integrated planting. The user disliked E's overall direction but liked its paving and harbor elements. |
| Water | Calm cobalt offshore, clear turquoise over sand, thin shore wash, sparse flecks, and broken foam along the stern path. See the [shelf](ocean-reference/frame-shallows-overview.jpg), [open sea](ocean-reference/frame-open-sea-splashes.jpg), and [turning wake](ocean-reference/frame-wake-turn.jpg). |
| People | Small, simple low-poly figures, including men, women, and children. Use distinct silhouettes, proportions that fit the character's age, readable poses, and simple hair and clothing. Detailed faces, fingers, and fabric folds are unnecessary. |
| Vehicles | Practical, complete stylized forms with readable wheels, glazing, doors, and useful lighting. Car and van studies remain candidates. No specific vehicle design has final approval. |

The user disliked H's overall direction. The initial preference for D established rounded, tactile miniature forms. It did not approve every D element or require coarse clay textures.

## City review: November 23, 2026

The previous city had narrow towers, large empty plots, and little variation between its streets. Beach-colored ground and limited shadow coverage made the city look flat.

The new direction uses streets of different widths, mid-rise street walls, and a waterfront promenade. An unoccupied HRV plot keeps its fixed older building, pocket park, or plaza. Background buildings carry no health data.

The user accepted the original checkpoint A streetscape. The development preview opens at 09:05:45 Chicago time. Select **Market crossing** to see a car wait while two people cross. Select **Working boat** to inspect the hull at the quay.

| Synthetic replay | Daily HRV | Whole city | Sixth and eighth plots in the sample block |
| --- | ---: | --- | --- |
| November 15 | 27.4 ms | 5 towers | Timber shophouses and pocket park |
| November 11 | 103.7 ms | 20 towers | Ribbon tower and Art Deco tower |
| November 12 | Unavailable | No HRV data | Paved bases and tower envelopes |

The comparison images use the same date, replay time, and updated lighting on both sides. The checkpoint A captures show the earlier architecture around the sample block for scale. See the [park](city-v2/block-park-day.png), [tower](city-v2/block-tower-day.png), [night crossing](city-v2/crossing-night.png), and [full comparison set](city-v2/).

The original sample kit had ten modules. The expanded kit includes timber bays, sash windows, roof sections, chimneys, market halls and stalls, a bank entrance, sheds, cafe furniture, and a fountain. The 16.02 m working boat has 13,390 triangles. Its submerged fittings follow the written design because the reference shows the boat above water. Checkpoint A used a separate boat file. The full layout now places the working boat at its new berth.

The user proposed construction sites for unoccupied HRV plots. Daily HRV does not accumulate. A site that switches between construction and a finished tower would suggest repeated demolition. A low-count day would also show an implausible number of active construction sites. Construction workers remain available for a possible future accumulating quantity.

The accepted design uses 18 older buildings or rows, seven pocket parks, and five plazas. All five corner walk-ups fit on corner parcels. No substitutions were necessary. The November 13 fixture shows all 30 interim forms. The unavailable fixture shows the paved bases and tower envelopes. See the [day and night review images](city-v2/interim-forms/).

The user accepted checkpoint B after reviewing the full city, the tower surfaces during camera rotation, and the grass beside the curved sidewalks. The full city uses the new working boat and fleet. The earlier harbor house remains a reference asset. See the [day and night gallery](city-v2/checkpoint-b/README.md).

## Ocean review: November 23, 2026

The November 23 ocean recording replaces the earlier water preferences. Day and Night remain manual review controls. The jumping fish carry no health meaning.

The user approved the surface, shelf gradient, and shore wash at checkpoint A. See the [day shelf comparison](ocean-v2/shelf-day-comparison.jpg) and [night harbor comparison](ocean-v2/harbor-night-comparison.jpg).

The user accepted checkpoint B after viewing the fish leap in the November 15, 2026 synthetic replay at 01:29:30 Chicago time. The [checkpoint B images](ocean-v2/checkpoint-b/) show the straight and turning wakes, fish leap, entry splash, and mobile view. The temporary fish mesh remains in use until the sleep voyage provides `sea-life.glb`.

The wake uses one draw call per moving boat. The optional mask would brighten the water under the foam by 6 percent. In a 1440 × 900 replay preview, the median render time rose from 6.30 ms to 7.00 ms with the mask. The 0.70 ms increase exceeded the 0.50 ms allowance, so the final version omits the mask.

The city seabed has 68,321 triangles. The sleep island brings the total to 75,744. The fish review captured one active event. Separate images show the leap and the rings after entry. See the [daytime turn](ocean-v2/checkpoint-b/turn-wake-day-comparison.jpg), [daytime leap](ocean-v2/checkpoint-b/fish-leap-day.png), and [nighttime entry](ocean-v2/checkpoint-b/fish-entry-night.png).

GPU timings use a 1440 × 900 canvas on a MacBook Pro with an Apple M1 Pro and 16 GB of memory. Chrome 157.0.8103.80 used WebGL 2 through ANGLE Metal. Each column shows a separate production-build comparison after warm-up.

| Median time | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| Previous reflection pass | 1.473 ms | 1.593 ms | 1.577 ms |
| Refraction pre-pass | 2.004 ms | 1.736 ms | 1.733 ms |
| Water surface draw | 0.870 ms | 0.875 ms | 0.871 ms |

The refraction pass stayed within 20 percent of the previous pass in two of three runs. It exceeded the allowance in the first run. The water draw stayed below 0.90 ms in all three runs. During playback, the median frame interval was 16.7 ms in the world, harbor, and sleep views.

## Water review: November 20, 2026

The user rejected the representative boat scene's water color, texture, and visible pattern.
The user requested livelier water.

- Use overlapping ripples, moving highlights, and broken reflections to make the surface feel active.
- Avoid uniform repeating bright marks and painted patterns.
- Preserve readable boat silhouettes and a clear distinction between water and the vessel.
- Freeze water motion with replay pause.

The revised browser water remains subject to visual review. This feedback does not approve a final material or palette.

### Follow-up harbor reference

The user preferred [this supplied harbor image](images/water-harbor-reference.png) over the first revised browser water.
The water has a greener turquoise color, broad rounded waves, quiet highlights, and soft reflections.
The user subsequently rejected the broad-wave browser interpretation. It is not the current water target.

### Latest correction and cargo-boat reference

The user requested the first revised browser water, with fewer visible arcs and more natural ripple distribution.
Restore that version's palette, highlights, and reflections. Reduce large-scale wave bending and remove artificial rings around the hull.

The user also preferred [this red working cargo boat](images/red-cargo-boat-reference.png).
Its main features are an open foredeck, timber hatch covers, a cargo derrick, an aft house, and dark working rails.
Use those structural features and its red-brown hull for the representative boat.
The reference does not add cargo operations or new health-data mappings.
The user responded positively to the revised cargo boat and water, then authorized a representative building.

## Representative building review

Keep the cargo boat and corrected water as the current baseline.
Build one waterfront low-rise before adding representative trees.
Apply the G direction through staggered rounded volumes, recessed glazing, thick surrounds, selected balconies, and restrained timber accents.
Use clean matte materials and large paving slabs.
Keep the building reusable as a separate GLB with its editable source.
Check its overview, detail, day, and night appearances beside the existing boat.
The building has no assigned health metric. Its form and window lighting do not encode HRV.
This step does not establish the full city layout or an integrated performance budget.

## Skyscraper comparison

The user requested five distinct styles and liked all five designs: modern glass, Art Deco, Brutalist concrete, organic ribbons, and classic brick.
Keep the five designs in the skyline catalog. Use a fixed district seed to assign them to plots.
Daily HRV determines plot occupancy. Each plot keeps its building form across dates.

## Detail level

The user rejected both ornate architectural-showcase realism and an overly simplified correction with generic forms. The target lies between them.

Preserve distinctive massing, window-frame depth, selected facade articulation, and a few carefully designed balconies. Boats need shaped hulls, cabin framing, railings, and limited working equipment. Keep surfaces clean and small props sparse. People may be simpler than buildings and boats.

Refinement should come mainly from proportions, geometry, spatial layers, and composition. The intermediate study remains a reference for review, not an approved final asset.

Reference scenes demonstrate visual language. Their factories, cranes, military objects, farm objects, animals, and activities do not automatically become product requirements.

## Animated construction-site reference: November 13, 2026

The user likes the construction-site recording and wants comparable visual quality in HealthCity, at a much larger world scale. This preference concerns the visual treatment and sense of activity. It does not add construction-site objects or behaviors to the product.

Source: [user-supplied recording](<ScreenRecording_11-13-2026 23-14-41_1.mov>), stored beside this document. The observations below preserve the reference's main qualities.

The review identified these qualities:

- Simple individual models form a rich, complete scene through careful placement and repetition.
- Recognizable structure supplies detail: crane frames, floor slabs, columns, vehicle bodies, and wheels.
- Straight edges, thin panels, and restrained rounding give the scene a precise miniature-model appearance.
- Clean color areas and readable lighting support the geometry. Dense surface textures and small decorations are secondary.
- Changes in vehicle positions and crane angles convey continuous work across the scene.

This reference supports the existing direction. It also suggests less sculptural softness and less decorative material detail than some earlier art studies. Detail quality depends on structure, proportions, arrangement, and activity, rather than detail count alone.

Recommended application, subject to later visual review:

- Use this recording as a primary reference for scene completeness, detail density, and coordinated activity.
- Retain the preferred G building forms and I boat and tree qualities. Adapt their detail to the cleaner treatment.
- Preserve necessary model structure when simplifying. Generic blocks do not establish the intended quality.
- Vary density across the larger world. Busy harbor areas and quieter residential areas can coexist with open mountains and sea.
- Check the combined result in a compact harbor street scene with a boat, a vehicle, and simple people.

The combined scene is a proposed review step after representative asset checks. It does not replace the boat-first sequence below or authorize implementation. Existing data mappings continue to control meaningful activity.

The short recording supports a comparison of overall appearance and visible movement. It does not establish close-up quality, implementation technology, performance, or a night-lighting standard.

## Night and motion

At night, provide:

- Building window lights.
- Boat cabin, deck, and navigation lights.
- Vehicle headlights with soft visible beams and light on the road. Use separate rear lights.
- Appropriate street and harbor lights.

Favor restrained warm light against a cooler environment. Keep silhouettes readable and glow limited.

A procedural Three.js study demonstrated these effects:

- Day/night switching, lit windows and vehicles, and simplified water reflections.
- Moving traffic, walking people, and working poses.
- Boat bobbing and smooth water motion.

These are visual and technical studies. Their animation speeds, traffic quantities, actor tasks, and manual day/night controls do not define health-data mappings or historical timing.

Follow the product rules for pedestrians, HRV, the exercise gardener, sleep stages, and historical daylight and weather. Art palettes must preserve required distinctions, including exercise categories and unavailable data.

## Readiness and next step

The user rated the interactive result approximately **60/100**. The broad direction is correct, but final quality still requires approval. Pause further iterations of the complete scene.

At the first refined modeling stage:

1. Create one representative working boat.
2. Inspect it in the browser at overview and detail scales, in day and night, and in motion.
3. Refine it until the user accepts its quality.
4. Next, check representative architecture and vegetation.

Blender remains a candidate. Its installation, integration, and role in the pipeline still require approval. A successful offline render does not establish browser quality.

The user accepted the mixed asset strategy in [ADR-0004](../../docs/adr/0004-hybrid-world-assets.md):

- A modeling tool supplies reusable assets and animation clips.
- Runtime code controls terrain that depends on data, navigation, traffic, replay, weather, and interaction.

Production quality, performance budgets, exact materials, palette, geometry, and the final asset workflow remain open.

## Reference index

- [G: preferred building and one tree direction](images/g-carved-timber.png)
- [I: preferred boat and subtle tree treatment](images/i-retro-garden.png)
- [F: water structure with colors to lighten](images/f-glazed-bay.png)
- [Intermediate detail study: still provisional](images/intermediate-detail-study.png)
- [Latest interactive day/night/motion study](interactive/healthcity-day-night-motion.html)
- Additional user references: [Low Poly Worlds](https://www.behance.net/gallery/89934319/Low-Poly-Worlds) and [Tropical Island](https://motion-demos-smoky.vercel.app/#/tropical-island).

Browser checks covered loading, day/night switching, animation play/pause, camera buttons, close-up selection, and narrow layouts. Automated pointer-drag checks remained incomplete. The study contains procedural assets, not Blender models, and does not establish final production quality. Temporary localhost preview servers stopped after the checks.

## Sleep voyage review, November 23, 2026

The user requested a voyage through successive sleep environments and an island at the destination. The previous prototype arranged the stages in wedges around a circular island. The reef study informed the open sponge tubes, layered coral, rock shelves, and sand gaps. [Reef reference](images/reef-reference.png)

Checkpoint A is ready for user review. Select **Sleep voyage** to follow the synthetic November 11–12 session. The times below use Chicago local time. The Day and Night controls change the lighting independently of the replay clock.

| November 12 | View | Day | Night |
| --- | --- | --- | --- |
| 00:49 | First DEEP channel | [Day](sleep-voyage-v2/deep-day.png) | [Night](sleep-voyage-v2/deep-night.png) |
| 01:51 | First REM reef | [Day](sleep-voyage-v2/rem-one-day.png) | [Night](sleep-voyage-v2/rem-one-night.png) |
| 02:48 | LIGHT shallows | [Day](sleep-voyage-v2/light-day.png) | [Night](sleep-voyage-v2/light-night.png) |
| 05:41 | Second REM reef | [Day](sleep-voyage-v2/rem-two-day.png) | [Night](sleep-voyage-v2/rem-two-night.png) |
| 06:51 | Return wake | [Day](sleep-voyage-v2/wake-turn-day.png) | [Night](sleep-voyage-v2/wake-turn-night.png) |
| 07:00 | Sleep route overview | [Day](sleep-voyage-v2/route-day.png) | [Night](sleep-voyage-v2/route-night.png) |
| 07:00 | Second reef, inspection camera | [Day](sleep-voyage-v2/reef-detail-day.png) | [Night](sleep-voyage-v2/reef-detail-night.png) |

The outbound route measures 174.45 m from the working berth to the island pier. The harbor mouth is 19.63 m from the berth. The two lanes share their approaches to the berth and pier. The offshore transit legs have at least 20 m of separation between x = 55 m and x = 163 m. Both DEEP channels keep at least 6 m of clearance from the return lane.

The model sheets show the same assets with four rendering treatments. [Silhouette](sleep-voyage-v2/assets-blockout.png) · [Form](sleep-voyage-v2/assets-form.png) · [Material](sleep-voyage-v2/assets-material.png) · [Lighting](sleep-voyage-v2/assets-lighting.png)

The destination uses a temporary island and pier. Phase 4 adds the cabin states, anchoring sequence, and REM companions. Phase 5 supplies the island terrain and habitats. User approval of checkpoint A is pending.
