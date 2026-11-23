# HealthCity Visual Direction

This document preserves visual feedback through November 21, 2026. It is the maintained reference for provisional art direction.

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
| Buildings | **G preferred over F**. Use staggered rounded volumes, thick window surrounds, recessed glazing, vertical timber accents, and layered terraces. F's architectural forms remain a secondary reference. Avoid its noisy, dotted, or mottled tiles. Timber is an accent, not a requirement for every object. |
| Boats | **The supplied red cargo-boat reference** is the current primary direction. Use a red-brown shaped hull, compact aft house, open foredeck, timber hatch covers, cargo derrick, dark rails, and restrained working equipment. I remains a secondary reference. Retain subtle low-poly geometry. Vessel inventory and functional roles remain product decisions. |
| Trees | **G and I**. I's subtle low-poly quality is particularly appealing. Use broad layered or umbrella canopies, expressive branches, and a few soft planar changes. Individual leaves and fuzzy realistic foliage are unnecessary. |
| Quays and paving | Elements from **E, G and I**. Use curved waterfront edges, large paving slabs, timber boardwalks, steps, and integrated planting. The user disliked E's overall direction but liked its paving and harbor elements. |
| Water | **The first revised browser water** is preferred over the subsequent broad-wave treatment. Restore its blue-turquoise palette, fine surface motion, and layered reflections. Reduce sweeping arcs and circular ripple patterns. F remains a secondary reference for water structure. Avoid obvious polygon patches, triangular tessellation, graphic color stripes, and excessively dark seas. |
| People | Small, simple low-poly figures, including men, women, and children. Use distinct silhouettes, proportions that fit the character's age, readable poses, and simple hair and clothing. Detailed faces, fingers, and fabric folds are unnecessary. |
| Vehicles | Practical, complete stylized forms with readable wheels, glazing, doors, and useful lighting. Car and van studies remain candidates. No specific vehicle design has final approval. |

The user disliked H's overall direction. The initial preference for D established rounded, tactile miniature forms. It did not approve every D element or require coarse clay textures.

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
