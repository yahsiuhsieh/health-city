# Ocean Redesign Plan

Date: November 23, 2026. Audience: the implementing coding agent.

This plan replaces the look and the rendering method of the HealthCity ocean. It applies to the whole world: the harbor, the city coast, the open sea, and the sleep route. Read the whole plan before you change code.

Execute this plan **before** [the sleep voyage plan](sleep-island-redesign.md). The sleep plan builds its stage water, seabed, and boat wake on the systems in this plan. Section 13 lists the parts of the sleep plan that this plan replaces.

## 1. Reference and user direction

The user supplied a screen recording as the target feel:

- Video: [`design/visual-studies/ocean-reference/ocean-reference.mov`](../../design/visual-studies/ocean-reference/ocean-reference.mov) (11 s)
- Key frames in the same folder:
  - `frame-shallows-overview.jpg`: deep sea, shelf gradient, reef, and beach
  - `frame-wake-turn.jpg`: a curved wake after a turn, splashes, and caustics on sand
  - `frame-open-sea-splashes.jpg`: open sea with surface flecks and jumping fish
  - `frame-straight-wake.jpg`: a long straight wake in open sea
  - `frame-reef-arrival.jpg`: the wake ends at the reef edge
- Related still: [`design/visual-studies/images/reef-reference.png`](../../design/visual-studies/images/reef-reference.png)

Open the frames and look at them before you start. The video comes from another creator's work. Use it as a reference for feel, color, and motion. Do not copy its scene, objects, or interface.

This direction replaces the earlier water preferences in the [visual handoff](../../design/visual-studies/visual-handoff.md#water-review-november-20-2026). Record this change in Phase 6.

## 2. What the reference shows

Read this list as the visual target. Each item has a section that implements it.

| Observation | Section |
| --- | --- |
| The deep sea is a calm, saturated cobalt blue. It has almost no visible wave geometry, crest lines, or sharp glints. | 5.1 |
| The surface has very little reflection. The water reads as a clear volume, not as a mirror. | 4, 5.1 |
| The color goes smoothly from deep blue to teal, turquoise, green, and pale sand as the water gets shallow. | 4.3, 5.2 |
| The seabed and coral are visible in shallow water. Deeper objects become bluer and lose contrast. Far below, dark shapes are faintly visible. | 4, 6 |
| A bright web of caustic lines moves on shallow sand. | 6.2 |
| Sparse, soft white flecks drift on the open sea. They have irregular sizes and broken edges. | 5.3 |
| A soft white foam line washes up the beach and breaks into lace. | 7 |
| The boat leaves a long, broken foam trail that follows its actual path, including curves. Old parts of the trail break into separate pieces and fade. | 8 |
| Fish jump out of the water. Each jump makes a droplet splash and faint expanding rings. | 9 |
| Palm shadows fall on the sand under clear water. | 6.1 |
| The camera looks down from high above at a steep angle. | 11 |

## 3. Constraints

These rules come from the product specification, the visual handoff, and earlier user feedback. Every phase must keep them.

- Pause freezes every ocean motion: flecks, caustics, shore wash, wake, splashes, and fish. Seeking restores the exact state for that replay time.
- Use one ambient clock: `ambientTime = replaySeconds / 190`. The current water already uses this rate. Put this function in one shared module.
- The product specification reserves wind-driven effects for historical weather estimates. Surface flecks use a fixed, neutral drift. Their direction and strength must not vary as if they were wind data.
- Earlier feedback rejected obvious polygon patches, triangular tessellation, graphic color stripes, uniform repeating bright marks, artificial rings around the hull, and excessively dark seas. Do not reintroduce any of them.
- Keep boat silhouettes readable. Keep a clear distinction between water and vessels.
- Ocean decoration carries no health meaning. Jumping fish are ambient life. They are not REM companions.
- Keep the Day and Night buttons as manual review controls. They are not historical daylight.
- No D1 changes. This work persists no data.

## 4. Rendering architecture

The current water uses a planar reflection pass and an opaque surface. The reference shows almost no reflection and clear water. Replace the reflection pass with a refraction pass.

### 4.1 Frame structure

Each frame renders in this order:

1. **Opaque pre-pass.** Render the scene without the water mesh into `oceanTarget`. This target has a color texture and a `DepthTexture`. Use the canvas size multiplied by 0.75. The pre-pass includes the seabed, the land, the boats, the coral, and the creatures.
2. **Main pass.** Render the scene normally. The water shader reads `oceanTarget` color and depth.

Rules:

- Remove the mirror camera, the reflection render target, the clip plane, and the reflection uniforms from `WaterSurface.tsx`.
- Hide the water mesh during the pre-pass. Disable shadow map updates during the pre-pass, as the current reflection pass does.
- Resize `oceanTarget` when the canvas size or the device pixel ratio changes.
- Dispose of the target and the depth texture on unmount.
- The water material stays opaque (`transparent: false`). It composites the refracted scene itself. This removes transparency sorting problems.
- Transparent objects (mist, splash droplets, wake ribbons) render after the water in the main pass. Exclude them from the pre-pass with a layer.

### 4.2 Water thickness

The scene uses an orthographic camera. Depth is linear in view space.

- Convert the depth texture sample with `orthographicDepthToViewZ`.
- `thickness` = distance along the view ray from the water surface to the first opaque surface behind it.
- `verticalDepth` = `thickness × sin(cameraElevation)`.
- If no opaque surface exists behind the water (depth = 1), use `verticalDepth = 40 m`.
- Smooth the thickness at object silhouettes. Take the minimum of three taps 1 px apart. This prevents bright halos at the hull waterline caused by the lower target resolution.

### 4.3 Absorption model

Use per-channel exponential absorption. This model gives the deep-to-sand gradient without a painted ramp.

```
transmittance = exp(-verticalDepth * ABSORPTION)        // per channel
scatter      = DEEP_COLOR * (1.0 - transmittance)
underwater   = refractedColor * transmittance + scatter
```

Starting values (day). Tune them against the reference frames.

| Constant | Value | Meaning |
| --- | --- | --- |
| `ABSORPTION` | `vec3(0.42, 0.13, 0.075)` per metre | Red disappears first. Shallow sand looks pale green. |
| `DEEP_COLOR` | `#174f8e` | Open-sea cobalt blue |
| `SHALLOW_TINT` | `#5fd0c0` | Turquoise added between 0.5 m and 4 m |
| `SHALLOW_TINT` weight | `smoothstep(0.3, 1.2, d) × (1 − smoothstep(2.5, 6.0, d))` × 0.35 | `d` = vertical depth |

Night values:

| Constant | Value |
| --- | --- |
| `DEEP_COLOR` | `#0e2f55` |
| `SHALLOW_TINT` | `#2f7f86` |
| Weight multiplier | 0.5 |

Check against earlier feedback: the open sea must not look excessively dark. In day, the relative luminance of `DEEP_COLOR` must stay at 0.06 or more.

### 4.4 Refraction distortion

- Offset the refraction sample by the surface normal: `uv += normal.xz × 0.012 × smoothstep(0.0, 1.5, verticalDepth)`.
- Check the offset sample depth. If the offset sample lies in front of the water surface, use the undistorted sample. This prevents boat parts above the water from bleeding into the water color.

### 4.5 Surface shading

The surface adds very little on top of the underwater color.

- Sky reflection: `fresnel × 0.06`. The camera looks steeply down, so this term stays small.
- Sun glint: one soft lobe only, with exponent 60 and intensity 0.04. Break it with the fleck noise. No sharp sparkle points.
- Remove the current crest streaks, wave groups, and broad swell bands.

### 4.6 Water mesh

- The water surface is flat. Remove vertex displacement. The reference shows no visible wave geometry.
- A flat plane needs no fine grid. Use a large plane with few segments. This also removes the triangle patches that the user rejected earlier.
- All surface motion comes from fragment-shader normals and the effects in sections 5–9.
- Keep `WATER_LEVEL = -0.025`.
- Boat bobbing stays in `boatPose()`. Check that boats do not look detached from a flat surface. Reduce their bob amplitude by up to 50 percent if they do.

## 5. Open sea

### 5.1 Base surface

- Base color: the absorption result from section 4.3. In open sea, this is close to `DEEP_COLOR`.
- Large-scale variation: multiply brightness by `1 ± 0.035` with two layers of low-frequency noise. Use feature sizes of 40 m and 90 m. Drift them at 0.02 m per ambient unit. The variation must not form stripes or a visible repeat.
- Surface normal: two layers of fine ripple normals with feature sizes of 1.5 m and 4 m. Use a normal strength of 0.04. They only break the glint and the refraction a little.

### 5.2 Shelves and depth

The deep-to-shallow gradient comes from the seabed depth and the absorption model. Do not paint a color ramp on the water.

- The city coast shelf, the sleep island shore, and the reef zones need a real seabed (section 6).
- The open sea far from land has no seabed mesh. Use the 40 m fallback depth.

### 5.3 Surface flecks

The reference shows sparse, soft white patches on the open sea. They look like small foam patches and cloud glints.

- Source: domain-warped fBm noise in world space. Use a warp amplitude of 3 m.
- Threshold: show a fleck where the noise is greater than 0.78. This gives 2–4 percent coverage.
- Size: patches from 0.6 m to 4 m. Vary the size with a second low-frequency noise.
- Edge: break the edge with a fine noise. Use the existing `lace` style.
- Life: animate the threshold with `ambientTime`. Each patch forms and dissolves over 6–10 ambient units.
- Drift: a fixed direction `(0.78, 0.63)` at 0.08 m per ambient unit. This is ambient motion, not wind data.
- Color: `#e3f0f4` with alpha 0.45 in day. Use `#7f99a6` with alpha 0.25 at night.
- Fade the flecks to 0 where the vertical depth is less than 3 m. Shallow water stays clean, as in the reference.
- Fade the flecks inside DEEP sleep channels (the sleep plan's `sleepZones.G` mask) to 20 percent. Those channels must look glassy.

### 5.4 Distant silhouettes

The reference shows faint dark shapes under the deep water near the shelf edge.

- Add scattered deep rock mounds on the seabed at 6–12 m depth near the shelf edges. The absorption model makes them faint.
- Use one mound per 300 m² of shelf edge band. Keep them at least 15 m from the shore.

## 6. Seabed

### 6.1 World seabed

Create `src/scene/ocean/seabed.ts` (pure) and `src/scene/ocean/Seabed.tsx`.

Seabed depth texture: replace `coastalDepth()` with `buildSeabed(options)`.

```ts
export interface SeabedFeature { kind: "mound" | "sandbar" | "reef"; x: number; z: number; radiusX: number; radiusZ: number; yaw: number; top: number }
export interface SeabedOptions {
  extraLand?: { polygon: [number, number][]; shoreWidth: number; revealKey?: number }[]; // sleep island, channel banks
  features?: SeabedFeature[];                                                             // sleep plan sandbars, reef mounds
}
export function buildSeabed(options?: SeabedOptions): {
  texture: DataTexture; // R: depth / 40 m, G: distance to land / 24 m, B: reveal key, A: shore type
  bounds: Vector4;
  depthAt(x: number, z: number): number; // metres below WATER_LEVEL, CPU copy for layout and tests
};
```

Depth profile from the city coast:

| Shore type | Profile |
| --- | --- |
| Soft shore (beach) | Starts at the coast toe at −1.15 m (see `HarborBlock.tsx`). Slopes to −3 m over 10 m, then to −8 m over a further 25 m, then to −14 m over 30 m. |
| Hard shore (quay) | −6 m at the quay face. Slopes to −10 m over 20 m. No visible seabed at a quay. |

Rules:

- The seabed must meet the coast toe without a gap or a visible seam. Check this in a close screenshot.
- Add low-frequency noise of ±0.4 m beyond 3 m from the toe.
- `depthAt()` must return the same value as the texture, within 0.05 m.
- Keep the current `coastalDepth()` users working. `district-layout.test.ts` uses it. Update that test to the new function.

Seabed mesh:

- Build a mesh only where depth is less than 12 m. Deeper seabed is invisible after absorption.
- Use 1 m vertex spacing within 30 m of shore and 2 m spacing beyond.
- The mesh receives shadows. Palm and tree shadows must show on the sand under clear water, as in the reference.

Seabed material: a `MeshStandardMaterial` with `onBeforeCompile` patches.

| Zone | Color |
| --- | --- |
| Sand, shallow | `#e6d6a8` |
| Sand, ripples | Vertex-color variation of ±5 percent along low ripple bands, 0.6 m apart. No mottled dots. |
| Rock mounds | `#3f6b5a`, tops `#5a8a6e` |
| Deep silt beyond 6 m | `#6f8f86` |

### 6.2 Caustics

The reference shows a bright moving web on shallow sand.

- Compute caustics in the seabed fragment shader and in every underwater material (coral, rocks, creature tops).
- Pattern: two layers of animated Voronoi edge distance. Use cell sizes of 1.1 m and 1.7 m. Scroll the two layers in different directions with `ambientTime`. Take the minimum of the two edge values.
- Line: `pow(1.0 - smoothstep(0.0, 0.08, edge), 2.0)`.
- Strength: `0.55 × (1 − smoothstep(0.3, 4.5, depth)) × sunFacing`. `sunFacing` is the normal dot the sun direction.
- Color: `#fff6d8` in day. Multiply the strength by 0.08 at night.
- Shadows reduce caustics. Multiply by the shadow factor.
- The caustics must not form a visible tile repeat at the overview zoom.

### 6.3 Underwater materials

The absorption model already tints underwater objects. Do not add a second depth tint in each material. The sleep plan's per-material underwater tint (its section 8.4) is replaced by this rule.

## 7. Shoreline

The reference shows a soft white wash line that moves up and down the beach.

Apply this effect to soft shores only: the city beach sections, the sleep island, sandbars, and the bases of channel banks.

- Use the seabed texture's distance to land and the vertical depth.
- Wash cycle: a period of 7 ambient units. Offset the phase along the shore with low-frequency noise so the whole coast does not move together.
- Foam front: a band 0.4–0.8 m wide. It moves from 1.6 m offshore to 0.6 m up the beach and back.
- Lace: break the band with the fleck lace noise. Leave thin foam streaks behind the retreating front for 1.5 ambient units.
- Wet sand: darken the beach material by 18 percent behind the retreating wash. Dry it back over 3 ambient units. The beach material needs the same wash function, so put it in a shared GLSL chunk.
- Color: `#f4fbf8`, alpha 0.85 in day. `#9bb7bd`, alpha 0.5 at night.
- Hard shores (quays): use only a thin contact line, 0.15 m, with alpha 0.25. No wash.
- Rocks and channel banks: a narrow broken foam ring with alpha 0.4. No wash up the face.

## 8. Boat wake

The reference wake is a long, broken foam trail that follows the boat's actual path. It is the main wake feature. A weak V pattern is a secondary feature only.

### 8.1 Wake source interface

Create `src/scene/ocean/wake.ts`.

```ts
export interface WakePoint { x: number; z: number; behind: number } // behind = path distance from the stern, metres
export interface WakeSource {
  sample(replaySeconds: number): { points: WakePoint[]; strength: number; beam: number };
}
```

- `points` start at the stern and go back along the path. Use 1.0 m spacing. The trail length is 55 m.
- `strength` is 0..1. It is 1 while the boat moves.
- `beam` is the boat width in metres.
- Every value must come from replay time only. Seeking must restore the same trail.
- The sleep plan provides the working-boat source through its `wakePath()` and `wakeStrength()` functions. Use 1.0 m spacing and 55 points there.

### 8.2 Wake ribbon

Create `src/scene/ocean/BoatWake.tsx`. Render the trail as a ribbon mesh on the water, not inside the water shader.

- Geometry: one quad strip along `points`. Rebuild positions every frame in a preallocated buffer.
- Height: `WATER_LEVEL + 0.012`. Use `depthWrite: false` and the transparent layer from section 4.1.
- Width: `beam × 0.9` at the stern. Widen to `beam × 2.2` at 55 m.
- Attributes: `behind` (metres) and `side` (−1..1).
- Foam pattern: sample noise in **world space**, not in ribbon space. The foam pattern must stay fixed on the water while the boat moves away.
- Erosion: foam coverage falls with `behind`. Use `coverage = 0.85 × exp(−behind / 18)`. Threshold the world noise against the coverage. Old parts break into separate pieces, as in the reference.
- Core: within 6 m of the stern, add a dense churned band, 0.6 × beam wide, with alpha 0.9.
- Edges: soften the outer 25 percent of the width with the lace noise.
- Color: `#f2f8fa` in day. At night, use `#9fb6bf` with alpha × 0.55.
- Multiply all alpha by `strength`.
- Under the foam, the water shader brightens the water by 6 percent inside the ribbon footprint. Pass the ribbon as a mask through a small screen-space target, or skip this step if its cost is more than 0.5 ms. Record the decision.

### 8.3 Secondary features

| Feature | Rule |
| --- | --- |
| Bow splash | Small foam crescents, 1.2 m long, on both sides of the bow. Alpha 0.6 × strength. |
| Kelvin V | Two faint lines at ±19.5° from the stern, 14 m long. Alpha 0.12. They must stay much weaker than the foam trail. |
| Turn rings | None. Do not draw rings around the hull. |

### 8.4 Stage interactions for the sleep voyage

- DEEP channel: use `exp(−behind / 26)` for erosion. Calm water keeps the trail longer.
- REM reef: blend the sleep plan's bioluminescent trail into the core band at night.
- AWAKE and the pier: `strength` falls to 0 over 600 replay seconds, as the sleep plan defines.

## 9. Jumping fish and splashes

The reference shows fish that jump and splash in open water. This is ambient life. It carries no data meaning.

Create `src/scene/ocean/SeaSplashes.tsx` and a pure schedule in `src/scene/ocean/splash-schedule.ts`.

Schedule:

- Divide the world sea into 40 m cells. Seed each cell from its integer coordinates.
- Each cell has a repeating schedule with a period of 30 ambient units. It holds 0–2 events at seeded times and positions.
- Events need a vertical depth of more than 4 m and a distance of more than 12 m from any boat path point. Reject other positions.
- Evaluate only cells inside the current camera view plus one cell of margin.
- The schedule is a pure function of `ambientTime` and the cell coordinates.

Event sequence (in ambient units):

| Time | Part |
| --- | --- |
| 0.0–0.8 | A small fish (`fish-a` or `fish-b` from the sleep plan's `sea-life.glb`) leaps in an arc, 0.5–0.8 m high and 1.2–1.8 m long. |
| 0.0 and 0.8 | Exit and entry splashes: 8–12 droplet sprites each. They rise 0.3–0.5 m and fall under gravity. |
| 0.8–3.5 | Two expanding rings at the entry point. Radius grows from 0.2 m to 1.6 m. Alpha falls from 0.35 to 0. |

Rules:

- Draw rings as small transparent decals on the water. Do not draw them in the base water shader.
- Use one instanced mesh for droplets and one for rings. Use a pool of 24 events.
- The rings are allowed here because they belong to discrete splash events. They never appear around the boat hull.
- Keep the rate low: 0.5–1.5 events per camera view per 10 ambient units.
- If `sea-life.glb` does not exist yet, use a temporary fish placeholder. Replace it when the sleep plan builds the asset.

## 10. Harbor

The reference shows no harbor. Use these rules so the harbor matches the new sea.

- The harbor basin is deep (6–10 m). It reads as a slightly greener blue: add `#1d6a86` at weight 0.25 inside the harbor area.
- Quays get only the thin contact line from section 7.
- The berthed fleet and the freighter must keep readable hulls. Check that the hull parts below the water line show through the water as dark tinted shapes near the surface, then disappear with depth.
- Mooring lines and the Mooring deck stay above water. Check them in the `detail` and `berth` views.

## 11. Views and lighting

- Check every existing view: `world`, `skyline`, `ridge`, `harbor`, `walk`, `road`, `square`, `side`, `detail`, `berth`, and each tower view.
- The current wide-view horizon fade mixes the water into the sky color. Keep a horizon fade, but fade to `DEEP_COLOR` blended 40 percent with the sky color. A cobalt sea must not turn grey at the horizon.
- Remove the near-view fade to sky color that uses `smoothstep(42.0, 105.0, ...)`. Replace it with the same horizon rule.
- The directional light keeps its current color and intensity. Seabed shadows need the shadow map to cover shallow water near the camera target. Check the soft city shore in `harbor` and `world` views.

## 12. Performance

Measure on the user's current Mac with Chrome. Record the hardware and the browser version.

| Item | Budget |
| --- | --- |
| Opaque pre-pass | Replaces the reflection pass. Report its GPU time. It must not be more than the old reflection pass by more than 20 percent. |
| Water fragment shader | 0.9 ms or less at 1440 × 900 in `world` view |
| Seabed triangles | 150,000 or fewer |
| Splash events active | 24 or fewer |
| Wake ribbon | One draw call per moving boat |
| Median frame time | Record it in `world`, `harbor`, and `sleep` views. Report it against 16.7 ms. |

Use `EXT_disjoint_timer_query_webgl2` if Chrome exposes it. Otherwise report frame times only. Do not report a budget as met unless you measured it.

## 13. Changes to the sleep voyage plan

This plan replaces these parts of [the sleep plan](sleep-island-redesign.md). Apply the sleep plan with these changes.

| Sleep plan section | Change |
| --- | --- |
| 8.1 Water mesh resolution | Obsolete. The water is flat (section 4.6). |
| 8.2 Sleep water textures | Keep `sleepZones`. Replace `sleepLand` with `buildSeabed({ extraLand, features })`. |
| 8.3 Shader changes | Keep the stage colors as tint targets. Remove the alpha and `transparent: true` rules. Clarity comes from the absorption model. |
| 8.4 Seabed meshes | Feed sandbars and reef mounds into `buildSeabed` as features. Use the world seabed mesh and material. Remove the per-material underwater tint. Caustics come from section 6.2. |
| 8.5 Boat wake | Keep `wakePath()` and `wakeStrength()`. Render the wake with section 8 of this plan. The parts table in the sleep plan no longer applies. |

## 14. Implementation phases

Run `npm run typecheck`, `npm test`, and `npm run build` after each phase. Fix every failure before the next phase.

Browser checks need the local app at `http://127.0.0.1:8787`. AGENTS.md forbids starting a development server without an explicit request. Ask the user before you start `npm run dev`. Stop the server after the checks.

### Phase 1: Refraction architecture

1. Create `src/scene/ocean/ambient-time.ts` with `ambientTime()`.
2. Remove the reflection pass. Add the opaque pre-pass and `oceanTarget` (section 4.1).
3. Add water thickness, absorption, and refraction distortion (sections 4.2–4.4).
4. Make the water mesh flat (section 4.6).
5. Use a temporary seabed: a flat plane at −3 m near the city coast. This step only tests the architecture.

### Phase 2: Seabed and caustics

1. Write `buildSeabed()` and its CPU `depthAt()` (section 6.1).
2. Build the seabed mesh and material.
3. Add caustics (section 6.2).
4. Update `district-layout.test.ts`.

### Phase 3: Surface and shore

1. Add the base surface variation and ripple normals (section 5.1).
2. Add surface flecks (section 5.3).
3. Add the shore wash and wet sand (section 7).
4. Add distant mounds (section 5.4).
5. Apply the harbor rules and the horizon rule (sections 10 and 11).

**Review checkpoint A.** Take the screenshots in section 16, items 1–6. Save them in `design/visual-studies/ocean-v2/`. Put each screenshot next to the matching reference frame in one comparison image. Stop and ask the user for review. Do not start Phase 4 before the user responds.

### Phase 4: Wake and splashes

1. Write `wake.ts` and `BoatWake.tsx` (section 8).
2. Until the sleep plan runs, test the wake with a development-only source. Guard it with `import.meta.env.DEV` and the query parameter `?wakePreview=1`. The source drives the working boat on a closed test loop in open water.
3. Write `splash-schedule.ts` and `SeaSplashes.tsx` (section 9).

### Phase 5: Tests, performance, documentation

1. Add the tests in section 15.
2. Measure performance (section 12).
3. Update the documents (section 17).

**Review checkpoint B.** Take all screenshots in section 16. Stop and ask the user for review.

## 15. Tests

### 15.1 Unit tests (Vitest)

- `ambientTime(0) = 0` and `ambientTime(190) = 1`.
- `buildSeabed()`:
  - Depth at a soft-shore toe is 1.15 m within 0.05 m.
  - Depth increases away from a soft shore until 65 m.
  - Depth at a quay face is 6 m within 0.2 m.
  - `depthAt()` matches the texture within 0.05 m at 200 random points.
  - An extra land polygon gives depth 0 at its coastline and positive depth outside it.
- Absorption helper (a TypeScript copy of the GLSL function):
  - At 0.3 m depth, the result is closer to the sand color than to `DEEP_COLOR`.
  - At 30 m depth, the result is within 3 percent of `DEEP_COLOR` per channel.
- Wake:
  - Points are 1.0 m apart and ordered from the stern.
  - The same replay time gives the same points.
  - `strength` is 0 for a moored boat.
- Splash schedule:
  - The same `ambientTime` and cell give the same events.
  - No event lies within 12 m of a boat path point or in water shallower than 4 m.
  - The event rate per cell stays within the limits in section 9.

### 15.2 Browser tests (Playwright)

Extend `tests/browser/boat.spec.ts` or add `tests/browser/ocean.spec.ts`. Keep the existing route blocking.

1. Keep the existing test "water freezes while paused and seeking restores the same surface". It must still pass.
2. Pause and compare two canvas screenshots 1 s apart in `world` view. Flecks, caustics, shore wash, and splashes must not move.
3. Seek forward, then back to the same time. Compare with a direct seek. The images must match within the existing tolerance.
4. Check every existing view loads without a page error.
5. With `?wakePreview=1`, check that the wake shows behind the moving boat and fades after the boat stops.

## 16. Screenshot checklist

Capture each item in day and in night. Save the files in `design/visual-studies/ocean-v2/`.

1. `world` view: the whole sea and the city coast.
2. `harbor` view: quays, the fleet, and the harbor basin.
3. A close view of the soft city shore: seabed, caustics, wash line, and wet sand.
4. A close view of open sea with flecks. Compare with `frame-open-sea-splashes.jpg`.
5. The shelf gradient from deep sea to beach. Compare with `frame-shallows-overview.jpg`.
6. `detail` view: the boat hull at the water line. Check for halos and bleeding.
7. The wake on a straight path. Compare with `frame-straight-wake.jpg`.
8. The wake after a turn. Compare with `frame-wake-turn.jpg`.
9. A jumping fish with splash and rings.
10. A narrow mobile layout of `world` view.

## 17. Documentation updates

Write Markdown in English.

- `design/visual-studies/visual-handoff.md`:
  - Replace the "Water" row in the element table with the new direction and links to the reference frames.
  - Add a section "Ocean review: November 23, 2026". State that this reference replaces the earlier water preferences. Record the checkpoint results.
- `docs/adr/0004-hybrid-world-assets.md`: no change. Ocean geometry is runtime code, which the ADR allows.
- `README.md`: describe the new water rendering in one short paragraph. Mention the refraction pre-pass.
- `docs/plans/sleep-island-redesign.md`: add a note at the top that this plan runs first and changes its section 8.

## 18. Final report

At the end, report these items:

- The changed files.
- The commands you ran and their results.
- The screenshot and comparison image paths.
- The performance measurements with hardware and browser versions.
- The decision on the wake brightening mask in section 8.2.
- Any deviation from this plan and its reason.
