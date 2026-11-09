# HealthCity Visual Direction

This document preserves feedback from the separate style research chat through November 7, 2026. It is the maintained reference for provisional art direction.

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
| Boats | **I**. Use substantial retro industrial or working maritime forms, a shaped hull, rounded cabin, useful decks, and recognizable equipment. Retain subtle low-poly geometry. Vessel inventory and functional roles remain product decisions. |
| Trees | **G and I**. I's subtle low-poly quality is particularly appealing. Use broad layered or umbrella canopies, expressive branches, and a few soft planar changes. Individual leaves and fuzzy realistic foliage are unnecessary. |
| Quays and paving | Elements from **E, G and I**. Use curved waterfront edges, large paving slabs, timber boardwalks, steps, and integrated planting. The user disliked E's overall direction but liked its paving and harbor elements. |
| Water | **F's water structure**, with lighter colors. Use continuous overlapping ripples, shoreline depth, translucent shallows, and layered reflections. Use pale jade through light turquoise. Avoid obvious polygon patches, triangular tessellation, graphic color stripes, and excessively dark seas. |
| People | Small, simple low-poly adults, consistent with the supplied asset-pack references. Use readable poses, basic clothing colors, simple hair or helmets, and convincing overall anatomy. Detailed faces, fingers, fabric folds, and animated-film portraits are unnecessary. |
| Vehicles | Practical, complete stylized forms with readable wheels, glazing, doors, and useful lighting. Car and van studies remain candidates. No specific vehicle design has final approval. |

The user disliked H's overall direction. The initial preference for D established rounded, tactile miniature forms. It did not approve every D element or require coarse clay textures.

## Detail level

The user rejected both ornate architectural-showcase realism and an overly simplified correction with generic forms. The target lies between them.

Preserve distinctive massing, window-frame depth, selected facade articulation, and a few carefully designed balconies. Boats need shaped hulls, cabin framing, railings, and limited working equipment. Keep surfaces clean and small props sparse. People may be simpler than buildings and boats.

Refinement should come mainly from proportions, geometry, spatial layers, and composition. The intermediate study remains a reference for review, not an approved final asset.

Reference scenes demonstrate visual language. Their factories, cranes, military objects, farm objects, animals, and activities do not automatically become product requirements.

## Night and motion

At night, provide:

- Building window lights.
- Boat cabin, deck, and navigation lights.
- Vehicle headlights and taillights.
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
