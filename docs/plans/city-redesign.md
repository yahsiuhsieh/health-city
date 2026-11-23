# City, Harbor, and Fleet Redesign Plan

Date: November 23, 2026. Audience: the implementing coding agent.

This plan rebuilds the HealthCity city so that it reads as a believable place. It covers the street network, the ground, the coastline, background buildings, the HRV towers, the harbor, the boats, and the lighting. Read the whole plan before you change code.

## 0. Plan order

Run the three plans in this order:

1. [Ocean redesign](ocean-redesign.md)
2. This plan
3. The sleep voyage plan (the user holds it separately)

Section 15 lists the interfaces that this plan must give to the ocean and sleep work.

## 1. User feedback and decisions

The user reviewed the current city screenshots on November 23, 2026. The user said that the city does not look real. The user chose "both structure and materials" as the cause.

The current state is in these files:

- [`design/visual-studies/full-harbor/city-30.png`](../../design/visual-studies/full-harbor/city-30.png)
- [`design/visual-studies/full-harbor/harbor.png`](../../design/visual-studies/full-harbor/harbor.png)
- [`design/visual-studies/walkable-district/street-plan.jpg`](../../design/visual-studies/walkable-district/street-plan.jpg)
- [`design/visual-studies/walkable-district/skyline.jpg`](../../design/visual-studies/walkable-district/skyline.jpg)

### Diagnosis

| Problem | Evidence in the current city |
| --- | --- |
| No middle density | Only two-storey houses and HRV towers exist. Real cities consist mostly of 3–8 storey buildings that line the streets. |
| Empty blocks | HRV decides the tower count. At 27 ms only 5 towers stand. The other blocks are empty pale-green rectangles. |
| Ground looks like sand | The whole city stands on a beige plate in the beach color. A full ring of beach surrounds it. It reads as a model on a sandbar. |
| Uniform grid | All blocks have the same size. All roads have the same width. Every corner is a right angle. Roads are wide in relation to the blocks. |
| Wrong proportions | Towers are about 8 m wide and up to 45 m tall (`TOWER_SCALE = 0.75`). Real towers of that height are 18–30 m wide. Blocks are about 16 m across. The quay is 0.6 m above the water. |
| Repetition | Five tower models repeat six times. The small houses use one model. |
| Flat light | Contrast is low. Objects have no contact shadows. Sky, fog, and sea are all pale mint. The shadow box covers only ±90 m around the origin, so the western city has no shadows. |

### Accepted decisions

| Topic | Decision |
| --- | --- |
| Background buildings | Add non-data buildings of 3–8 storeys. Their style must stay clearly different from HRV towers. |
| Empty tower plots | An unoccupied HRV plot shows its fixed interim form. A tower replaces the older low-rise building, pocket park, or plaza when daily HRV occupies the plot. |
| Construction sites | HRV plots never show construction. |
| Street network | Full redesign. Rebuild vehicle and pedestrian routes on the new network. |
| Coastline | Mixed urban coast. Seawalls, promenades, and quays line the downtown. One or two coves keep a sand beach. |
| Towers | Redesign allowed. Keep the five style families that the user liked. Rebuild them with real proportions. |
| Harbor | Redesign allowed. |
| Boats | Redesign allowed. |

## 2. Rules that must not change

These rules come from the product specification. Every phase must keep them.

- Daily HRV sets the ordinary high-rise count: `floor(RMSSD ms / 5)`. Height and appearance must not encode another metric.
- High-rise plots are fixed. Each plot keeps its building form across dates. The count stays fixed during one day's replay.
- Unavailable HRV shows a neutral paved base and a translucent tower envelope on every plot. Show `No HRV data`.
- Keep construction off HRV plots. Exclude work fences, hoardings, cranes, scaffolding, excavation, building materials, workers, and construction machines. Daily HRV does not accumulate.
- Do not silently cap the count. Keep the overflow message when the count exceeds the display capacity.
- Road traffic represents total calories through the current five-minute interval rate. Pedestrian activity represents step volume. Keep both mappings.
- An interval without calorie records shows no data-driven vehicles. An interval without step records keeps the current missing-data behavior.
- Background buildings, parks, trees, and street furniture carry no data. They must not look like HRV towers.
- Do not add moving or parked vehicles that are not data-driven. Do not add pedestrians that are not data-driven. Parked cars remain an open item (section 16).
- Keep roads, coastline, and landmarks stable across dates.
- Pause freezes every motion. Seeking restores the exact state for that replay time.
- The heart-rate ridge stays where it is. Its data mapping does not change.
- Reserve land for two accepted features that do not exist yet: the RHR dam with its inland reservoir, and the monthly exercise garden. Do not build them in this plan.
- No D1 changes. This work persists no data.

The product specification says: "Pause repeated complete-scene style changes. Apply the representative-art gate below before asset expansion." The user requested this redesign on November 23, 2026. Apply the gate through the representative slice in Phase 2.

## 3. Realism principles

Use these principles for every decision that this plan does not specify.

1. **Real scale.** One unit is one metre. Use the dimensions in section 4. Do not compress one object class only.
2. **Urban logic.** Every object has a reason to be where it is. Streets have a hierarchy. Buildings face streets. Service areas face alleys or quays.
3. **Density gradient.** The downtown core is tallest and densest. Density falls toward the ridge, the cove, and the harbor edges.
4. **Street walls.** Background buildings stand on the lot frontage. They form continuous walls along streets. Gaps are deliberate: alleys, plazas, and parks.
5. **Variation within a system.** Buildings share a kit and a palette. Each building varies in width, height, color tint, and ground floor. No two neighbours are identical.
6. **Structure gives detail.** The visual handoff asks for straight edges, thin panels, restrained rounding, window depth, and selected balconies. Avoid noisy textures and small decorative clutter.
7. **Grounding.** Every object touches the ground with a contact shadow. Bases are darker than tops.

## 4. Dimensions

### 4.1 World datums

| Item | Value |
| --- | --- |
| Water level | `WATER_LEVEL = -0.025` (unchanged) |
| Quay and seawall coping | +1.6 m |
| Waterfront promenade | +1.6 m |
| City ground | Rises from +1.6 m at the waterfront to +5.0 m at the ridge foot. Maximum street grade 2.5 percent. |
| Ridge foot | Where the ridge terrain meets the city ground, at about `x = -205` |

Create `src/scene/city/terrain.ts` with `groundHeight(x, z)`. Every road, sidewalk, lot, and building base uses it. Buildings sit on a level plinth at the highest footprint corner. Expose the plinth on the low side with a base course in a darker tone.

### 4.2 Street cross-sections

| Class | Total width | Parts |
| --- | --- | --- |
| Waterfront boulevard | 30 m | 8 m promenade on the water side, 3.5 m sidewalk, 2 × 2 lanes at 3.3 m, 2 m planted median, 3.5 m sidewalk |
| Arterial avenue | 22 m | 3.5 m sidewalk, 2 × 2 lanes at 3.3 m, 1.8 m median, 3.5 m sidewalk |
| Local street | 14 m | 2.6 m sidewalk, 2 lanes at 3.2 m, 2.4 m planting strip (no parking), 2.6 m sidewalk |
| Service alley | 6 m | One shared surface, no curbs |
| Quay road | 12 m | 2 lanes at 3.5 m and a 5 m loading apron |

| Detail | Value |
| --- | --- |
| Curb height | 0.15 m |
| Curb radius at corners | 6 m on arterials, 4 m on local streets |
| Crosswalk | 3 m wide, white bars 0.5 m wide with 0.5 m gaps |
| Lane markings | White dashed lane lines (3 m dash, 6 m gap). Double yellow centre lines on two-way local streets. White stop lines 0.3 m wide. |
| Traffic side | Right-hand. Lane centre 1.65 m from the edge line. |

### 4.3 Blocks and lots

| Item | Value |
| --- | --- |
| Downtown block | 45–70 m per side |
| Residential block | 40–60 m per side |
| Lot frontage | 9–24 m |
| Lot depth | 14–22 m |
| Inner courtyard | The block interior behind the lots. Gardens, trees, and low sheds. |

### 4.4 Buildings

| Item | Value |
| --- | --- |
| Ground floor (retail) | 4.2 m |
| Upper floor (residential or office) | 3.2 m |
| Parapet | 0.9–1.2 m |
| Background building height | 3–8 storeys, 10.6 m to 26.6 m with parapet |
| HRV tower height | 40–92 m (section 8.2) |
| Window bay | 1.4–1.8 m wide, recessed 0.12–0.18 m |

The tallest background building must stay at least 12 m below the lowest HRV tower. This keeps the data towers readable.

### 4.5 People, vehicles, and boats

| Item | Value |
| --- | --- |
| Adult | 1.70–1.80 m |
| Child | 1.10–1.35 m |
| Car | 4.5 m × 1.8 m |
| Van | 5.2 m × 2.0 m |
| Street tree | 7–12 m tall, canopy 5–8 m |
| Street lamp | 6 m on local streets, 8 m on arterials |

Boat sizes are in section 11.

Check the current pedestrian and vehicle GLB sizes against this table. Rescale an asset if it is wrong by more than 5 percent.

## 5. City layout

### 5.1 Site

- The city occupies the land between the ridge foot (about `x = -205`) and the coast (about `x = -4`), from about `z = -78` to `z = 82`.
- The ridge stays at its current position: `x ≈ -231`, `z ∈ [-73, 73]`.
- Keep the harbor in the same general location as today. The sleep boat berth stays within 15 m of the current berth (`port.boatX`, `port.boatZ`).

### 5.2 Districts

| District | Location | Character |
| --- | --- | --- |
| Downtown core | Centre of the site, around the main crossing of the two avenues | HRV tower plots, mid-rise street walls of 6–8 storeys, a civic plaza |
| Waterfront | Along the waterfront boulevard | 4–6 storey mixed-use buildings, cafes on ground floors, the promenade |
| Harbor district | South-east, behind the harbor | Warehouses, the fish market, workshops, 2–4 storeys |
| North residential | North of the core, down to the cove | 3–5 storey apartments, row houses, courtyard gardens |
| South residential | South of the core | 3–5 storey apartments and row houses |
| Ridge foot | Along the ridge road | Low density, 2–3 storeys, trees, the reserved reservoir site |
| Cove | North coast | Sand beach, a small park, a beach pavilion |

### 5.3 Street network concept

Author the network by hand as data. Do not generate it randomly. A designed city needs deliberate choices.

| Street | Class | Route |
| --- | --- | --- |
| Waterfront Boulevard | Waterfront boulevard | Follows the coast from the cove in the north to the harbor gate in the south. It curves with the shore. |
| Market Avenue | Arterial | East–west from the waterfront to the ridge road, at about `z = 18`. |
| Harbor Avenue | Arterial | East–west from the harbor gate to the ridge road, at about `z = -30`. |
| Central Avenue | Arterial | North–south through the core, at about `x = -95`. |
| Ridge Road | Arterial | North–south along the ridge foot. It curves with the ridge. |
| Diagonal | Arterial | From the civic plaza near the waterfront to the north-west, toward the reserved reservoir site. |
| Local streets | Local | Subdivide the areas between arterials into blocks of the sizes in section 4.3. Some local streets bend or end in T-junctions. |
| Service alleys | Alley | Behind the waterfront lots and inside the larger downtown blocks |
| Quay Road | Quay road | Along the harbor quays |

Rules:

- No more than 60 percent of intersections may be four-way right angles. Use T-junctions, a few skewed angles, and the diagonal.
- Arterial intersections get traffic signals. Local intersections get stop signs on the minor street.
- The network must connect every district to the waterfront and to the ridge road.
- Keep at least one public walking route from the harbor pier to the ridge foot. The current `cityWalk` has this role.

### 5.4 Reserved sites

| Site | Area | Location | Ground treatment now |
| --- | --- | --- | --- |
| RHR dam and inland reservoir | About 45 m × 35 m | A valley at the ridge foot in the north-west, at the end of the diagonal | Meadow with a few trees and a low retaining edge. No water and no dam. |
| Monthly exercise garden | About 50 m × 40 m | A park block next to the downtown core | A park with lawn, paths, and trees. Leave an open central lawn of at least 30 m × 20 m for the future flower path. |

Export both site polygons from the layout module. Later work places the features there.

## 6. Layout system

Create the folder `src/scene/city/`. Keep all layout code pure and covered by unit tests.

### 6.1 Street graph: `street-graph.ts` and `city-plan.data.ts`

```ts
export type StreetClass = "boulevard" | "arterial" | "local" | "alley" | "quay";
export interface StreetNode { id: string; x: number; z: number; control?: "signal" | "stop" | "none" }
export interface StreetEdge { id: string; from: string; to: string; cls: StreetClass; bend?: [number, number][]; name?: string }
export interface StreetGraph { nodes: StreetNode[]; edges: StreetEdge[] }
export const CITY_PLAN: StreetGraph; // in city-plan.data.ts, authored by hand
```

Derived products (pure functions):

| Function | Output |
| --- | --- |
| `edgeCenterline(edge)` | Polyline. Use the `bend` points with a centripetal Catmull–Rom curve. |
| `roadSurfaces(graph)` | Carriageway polygons with intersection patches and curb returns |
| `sidewalks(graph)` | Raised sidewalk polygons and curb strips |
| `blocks(graph)` | Block polygons. Compute the faces of the planar graph. Inset each face by half the street width. |
| `lots(block)` | Lots along the block perimeter. Use the frontage and depth ranges in section 4.3. Put corner lots at corners. |
| `crosswalks(graph)` | Crosswalk rectangles at signal and stop intersections |
| `laneCenterlines(graph)` | Directed lane polylines with right-hand offset |
| `turnConnectors(node)` | Curved connectors between lanes at each intersection |
| `walkNetwork(graph)` | Sidewalk centrelines joined by crosswalks |

Implementation notes:

- Do not install a geometry library without user approval. Write the polygon offset and the planar face search yourself. Keep blocks simple polygons with 3–6 sides.
- Store all outputs in metres.
- Every derived product must be deterministic. The same graph gives the same output.

### 6.2 Routes for motion: `routes.ts`

`district-motion.ts` uses `StreetRoute` objects from `roundedRoute()` and fixed node lists today. Keep the `StreetRoute` interface (`at(distance)`, `nearest(x, z)`, `length`). Build new routes from the graph.

- `vehicleLoop(nodeIds)`: compiles a closed loop of graph nodes into one lane path. It uses the lane centrelines and the turn connectors.
- `walkLoop(nodeIds)`: compiles a closed loop on the walk network. It uses crosswalks to change sides.
- Define 5 vehicle loops. Together they cover every arterial and at least half of the local streets. One loop reaches the ridge road. One loop uses the waterfront boulevard.
- Define walk routes that replace `cityWalk`, `neighborhoodWalk`, `promenadeRoute`, and `plazaRoute`. Keep their roles: the pier to the ridge foot, the market to both residential districts, the promenade, and a plaza loop.

### 6.3 Motion migration

Rewrite `district-motion.ts` so that it reads intersections, crossings, and stop positions from the graph. Do not hard-code coordinates.

Keep every current behavior. The current tests describe them:

- The longest vehicle fits inside the road on every bend.
- A vehicle stops on an empty approach and yields to a pedestrian at a crossing.
- The queue restores after a backward seek.
- Active vehicles stay clear of each other and of people on crossings, on all five fixture days.
- Every visible vehicle slot goes inland. One car reaches the ridge road.
- The first pedestrian reaches the ridge foot and both residential districts on every fixture day.

Add traffic signals: signal phases are a pure function of replay time. Vehicles stop at red. Pedestrians cross on the walk phase. Pause freezes the signals.

### 6.4 HRV plots: `skyline-layout.ts`

- Define 30 fixed tower plots in the downtown core and the waterfront. Each plot is a lot of 20–30 m × 20–30 m.
- Replace `plotSite()` with a plot table in `city-plan.data.ts`. Each entry has `id`, `x`, `z`, `yaw`, `width`, `depth`, and `height`.
- Keep `assignTowerPlots()`, `skylineDisplay()`, the seeded design order, and the occupancy rules. Keep the rule from the current test: the first plots occupy the front, middle, and back of the city before the sixth tower.
- Keep `SKYLINE_DISPLAY_CAPACITY = 30`. Capacity remains open in the specification.

### 6.5 Camera spots

Redefine the views `harbor`, `walk`, `road`, `square`, `side`, `berth`, and `detail` on the new layout:

| View | New subject |
| --- | --- |
| `harbor` | The harbor basin with the quays and the fleet |
| `walk` | A signalized crossing on Market Avenue with pedestrians |
| `road` | Market Avenue with traffic |
| `square` | The civic plaza |
| `side` | A local residential street |
| `berth` | The cargo quay with the coaster and the crane |
| `detail` | The working boat at its berth |

Update `cameraSpots` and `CameraRig`. Update the camera bounds for the new city.

## 7. Ground, streets, and coast

### 7.1 Materials

Create `src/scene/city/palette.ts`. All city materials read colors from it.

| Surface | Color | Notes |
| --- | --- | --- |
| Asphalt | `#55595b` | Add very low-contrast large patches (±3 percent, 6–20 m) and slightly darker wheel paths. No dots or speckles. |
| Lane markings | `#e9e6dc`, yellow `#d8b448` | |
| Sidewalk concrete | `#c8c3b6` | Joints every 1.5 m as thin darker lines |
| Curb | `#a9a49a` | |
| Promenade pavers | `#b9a58c` and `#a8957d` | Large slabs, 1.2 m × 0.6 m |
| Plaza pavers | `#c2b29a` | |
| Park lawn | `#86a862`, shade `#6f9152` | |
| Planting strip | `#7f9a5c` with soil edge `#6d5a45` | |
| Courtyard gardens | `#93ad6c` | |
| Quay concrete | `#a7a69a` | Saw-cut slabs, 4 m |
| Seawall face | `#8d8a80` | Dark wet band 0.4 m above water `#5e5d57` |
| Beach sand | `#dccb9c` | Only in the coves |

Do not use the beach color on city ground.

### 7.2 Street details

| Item | Rule |
| --- | --- |
| Street trees | On arterials and the boulevard median, every 9 m. On planting strips of local streets, every 11 m. Keep them clear of crosswalks, signals, and driveways. |
| Street lamps | Every 25 m on arterials, alternating sides. Every 30 m on local streets. Reuse and rescale `StreetLamp.tsx`. |
| Traffic signals | At signal nodes. A pole with a mast arm over the near lane. Red, amber, and green lenses. Emissive follows the signal phase. |
| Stop signs | At stop nodes, on the minor approach. Reuse the current octagonal sign. |
| Benches | On the promenade every 30 m and in plazas and parks |
| Bus shelters | Two on Market Avenue, two on Central Avenue |
| Fire hydrants, bollards | Sparse. One hydrant per block face. Bollards at plaza edges. |
| Manholes | Small dark discs, two per street segment |

### 7.3 Coast

Replace the beach ring. Rebuild `coastline.ts` with typed segments.

```ts
export type ShoreType = "quay" | "seawall" | "revetment" | "beach";
export interface CoastSegment { points: [number, number][]; type: ShoreType }
```

| Shore type | Where | Form |
| --- | --- | --- |
| `quay` | Harbor | Vertical concrete wall to +1.6 m. Coping stone, rubber fenders every 8 m, bollards every 15 m, ladders every 30 m. |
| `seawall` | Downtown waterfront | Vertical stone wall to +1.6 m with a railing on the promenade. One set of steps down to the water. |
| `revetment` | Breakwaters and the south edge | Rock armor slope 1:1.5. Boulders 0.8–1.6 m. |
| `beach` | The north cove and one small south cove | Sand beach with the ocean plan's wash and wet sand |

- Export the segments for `buildSeabed()` from the ocean plan. Map `quay` and `seawall` to the hard shore profile. Map `revetment` to a rock slope that reaches −4 m within 6 m. Map `beach` to the soft shore profile.
- The coast outline must stay closed. Update `harbor-layout.ts` users and `district-layout.test.ts`.

## 8. Buildings

### 8.1 Background building kit

Background buildings carry no data. Their style must stay clearly different from the HRV towers.

Create `scripts/build-city-kit.mjs` with the pattern of the existing build scripts. Add `"asset:city": "node scripts/build-city-kit.mjs"` to `package.json`. Output `public/models/city-kit.glb`.

Kit modules (each node is one module, in metres):

| Module | Variants | Notes |
| --- | --- | --- |
| `gf-shopfront` | 4 | 4.2 m tall bays with large glazing, a recessed door, a sign band, and an optional awning |
| `gf-entrance` | 2 | Residential entrance with steps and a canopy |
| `gf-solid` | 2 | Service or warehouse ground floor with a roller door |
| `upper-window` | 5 | 3.2 m tall bays: single window, paired windows, French window with a small balcony, and two office types |
| `upper-balcony` | 2 | A bay with a projecting balcony and thin rails |
| `corner-bay` | 2 | A chamfered or rounded corner bay |
| `cornice`, `parapet` | 3 each | Top edges |
| `string-course` | 2 | A band between the ground floor and upper floors |
| `roof-equipment` | 6 | HVAC units, a stair house, a water tank, a vent cluster, solar panels, and a roof garden planter |
| `pitched-roof` | 2 | For row houses and warehouses |
| `gf-timber-shopfront` | 3 | Timber frame, display goods, door, and awning |
| `upper-sash-window` | 3 | Two sashes with a projecting sill |
| `pitched-roof-terrace` | 2 | Roof tiles and ridge cap |
| `chimney` | 2 | Brick stack with one or two pots |
| `market-hall` | 2 (gabled, barrel) | Open arcade and clerestory glazing |
| `market-stall` | 3 | Covered produce stand |
| `bank-front` | 1 | Columned masonry entrance |
| `yard-shed` | 2 | Rear service building |

Rules:

- Bays have a fixed width per module (1.6 m, 2.4 m, or 3.2 m). The assembler fills each facade length with bays and adjusts with a small pier.
- Use recessed glazing, thick window surrounds, and restrained rounding (bevel 0.02–0.05 m). This applies the G direction from the visual handoff.
- Bake ambient occlusion into vertex colors. Darken recesses and the lower 0.6 m of each module.
- Triangle limit: 600 per module.

Assembler: `src/scene/city/building-assembler.ts` (pure) and `src/scene/city/BackgroundBuildings.tsx`.

- For each lot, choose a building type from the district table below. Seed the choice from the lot id.
- Choose storeys, facade modules, and a color from the district palette.
- Output instance transforms per module. Render each module type with one `InstancedMesh`.
- Vary per building: storeys, color tint ±5 percent, ground floor type, cornice type, and roof equipment.
- Keep neighbours different: two adjacent buildings must differ in at least two of storeys, color, and cornice.

| District | Storeys | Types | Wall colors |
| --- | --- | --- | --- |
| Downtown core | 6–8 | Office, mixed use | `#d9cfbd`, `#c9b89c`, `#b9a690`, `#a8b2ad` |
| Waterfront | 4–6 | Mixed use with cafes | `#e6d8bf`, `#d7b9a0`, `#c7d0c6`, `#e0c9a6` |
| Harbor district | 2–4 | Warehouse, workshop, fish market | `#b08a6a`, `#9a9488`, `#7f8c86` |
| North and south residential | 3–5, row houses 2–3 | Apartments, row houses | `#d9b8a0`, `#c98e72`, `#e3d3b8`, `#b7c4b0`, `#cfa98a` |
| Ridge foot | 2–3 | Houses, small apartments | `#e3d3b8`, `#c9b79c`, `#b7c4b0` |

Night lighting: light 30–45 percent of windows in a deterministic pattern seeded by building id. Use a warm `#ffd9a0` emissive at 0.7. The pattern must not change during replay. It encodes nothing.

The existing `harbor-building.glb` low-rise passed a representative review. Keep it as one variant in the waterfront district or retire it. Record the choice.

### 8.2 HRV towers

Keep the five style families: modern glass, Art Deco, Brutalist concrete, organic ribbon, and classic brick. Rebuild them with real proportions.

Create a modular tower kit in `scripts/build-skyscrapers.mjs`. Each family has these nodes: `podium`, `lobby`, `typical-floor`, `setback-floor` (optional), `mechanical`, and `crown`. The runtime stacks floors to the plot height.

| Item | Value |
| --- | --- |
| Floor height | 3.8 m |
| Podium | 2–4 floors. Its height matches the street wall of the block within 2 m. It fills the plot frontage. |
| Tower footprint | 18–26 m per side, inside the podium |
| Slenderness | Height divided by the narrowest width must stay at 4.5 or less |
| Height | Fixed per plot (section 6.4). Use `36 + 56 × exp(−(d / 75)²)` m, where `d` is the plot distance from the core crossing. Round to whole floors. |

Family details:

| Family | Rules |
| --- | --- |
| Modern glass | Unitized curtain wall with mullions every 1.5 m. Spandrel bands at each floor. A glass lobby. A crown with a mechanical screen and a short spire. |
| Art Deco | Setbacks at 60 and 80 percent of the height. Vertical piers and dark spandrels. A stone base. A stepped crown with bronze trim. |
| Brutalist concrete | Board-formed concrete. Deep recessed windows. Cantilevered terraces every third floor. An expressed service core. |
| Organic ribbon | Oval floor plates. Each floor rotates 1.5° from the floor below. Continuous white balcony ribbons. |
| Classic brick | Base, shaft, and capital. Punched windows with stone lintels. A copper crown. |

Rules:

- The tower entrance faces the sidewalk of the plot's main street.
- Remove `TOWER_SCALE`. Build at 1:1.
- The `No HRV data` wireframe shows the plot's tower envelope at its fixed height.
- Update the tower views in `CameraRig` for the new heights.
- Update `skyline-layout.test.ts` and `district-layout.test.ts`.

### 8.3 HRV plot interim forms

Assign each plot a fixed interim form from the district seed and its plot ID. Keep the assignment in the plot table. The 30 plots contain eight shophouse rows, five corner walk-ups, three market halls, two low offices or banks, seven pocket parks, and five plazas. All five walk-ups fit on corner sites in this layout.

Keep different forms on plots that share a boundary or face each other across a local street. Keep two continuous street frontages per downtown block. The first five plots must include at least two types of interim building and one open space. If capacity changes, retain the proportions. Substitute shophouses for walk-ups only if the layout has too few corners. Record any substitution.

Older buildings have active street fronts and rear yards. Keep roofs and chimneys within 12 m. Use timber shopfronts, recessed sash windows, masonry or render, and pitched roofs or parapets. Light shop windows at night. Light 30–45 percent of upper windows with a fixed pattern. Keep market stalls inside open arcades. Use lawn, paths, benches, and three to six trees for parks. Use pavers, two to four planted trees, benches, and a still fountain for plazas.

Use the detailed [building descriptions, colors, module variants, and excluded details](hrv-plot-interim-forms.md#5-interim-building-style). Keep the interim buildings in use and in good repair.

Show the tower and its podium when the daily count exceeds the zero-based occupancy index. Otherwise show the fixed interim form. If HRV is unavailable, show only a neutral paved base and the tower envelope. Apply the state when the date loads. Seeking preserves it. Keep the full count and the overflow message above 30.

Clicking an interim building, park, or plaza pauses the replay and opens the **HRV plot** card. Ignore drags. Show the threshold in milliseconds, calculated as five times the one-based plot number. Show the day's precise HRV and full tower count, or **No HRV data**.

Run the [allocation, model-height, daily-state, threshold, and browser inspection tests](hrv-plot-interim-forms.md#8-tests).

## 9. Vegetation

Create `scripts/build-city-flora.mjs`. Output `public/models/city-flora.glb`.

| Node | Use | Form |
| --- | --- | --- |
| `street-tree-a`, `street-tree-b` | Streets | A plane-tree type: a straight trunk with a raised crown, a broad oval canopy made of 4–6 soft clusters |
| `park-tree-a`, `park-tree-b`, `park-tree-c` | Parks, courtyards | Broadleaf trees with irregular crowns, 8–12 m |
| `umbrella-pine-a` | Waterfront, cove | The umbrella pine character from `design/visual-studies/images/i-retro-garden.png` |
| `shrub-a`, `shrub-b`, `hedge-segment` | Planting | Low soft clusters, clipped hedge 1 m |
| `lawn-tuft` | Lawn edges | Optional |

- Canopy colors: `#6f8f55`, `#7f9c5e`, `#5e7f4c`. Vary per instance by ±6 percent.
- Trunk color: `#6a5440`.
- Sway: ±1° with `ambientTime` from the ocean plan. Pause freezes it.
- The sleep plan can reuse these trees for its island and channel banks.

## 10. Lighting and atmosphere

### 10.1 Shadows

- Fit the directional light shadow box to the current view every frame. Set the light target to the camera target. Fit the box to the visible ground bounds plus 15 m.
- Use a 4096 shadow map in `world` and `skyline` views. Use 2048 in close views.
- Use `PCFSoftShadowMap`.
- Small props (benches, hydrants, signs) cast no shadow in `world` view.

### 10.2 Contact shadows and ambient occlusion

- Bake vertex ambient occlusion into every new GLB in the build scripts. Darken recesses, the lower parts of walls, and the undersides of canopies.
- Add soft contact shadow decals under buildings, trees, vehicles, and boats on the ground. Use one instanced quad mesh with a radial gradient texture. Alpha 0.35 for buildings and 0.25 for small objects.
- Test the three.js `GTAOPass` as an option. Use it only if it adds no more than 2 ms per frame. Record the measurement and the decision.

### 10.3 Light and sky

| Item | Day | Night |
| --- | --- | --- |
| Sun (directional) | `#fff1d6`, intensity 3.0 | `#b5cfe5`, intensity 0.8 |
| Hemisphere sky | `#dce8ef` | `#9fb6c8` |
| Hemisphere ground | `#8a8f7f` | `#2f4448` |
| Hemisphere intensity | 1.2 | 0.9 |
| Background and fog | `#cfe0ea` | `#1f3541` |

- Remove the mint background `#b8dad3`.
- The horizon rule in the ocean plan (section 11) uses the new background color.
- Check the tone mapping mode and the exposure. Use ACES Filmic. Tune the exposure so that sunlit walls do not clip.
- Keep the Day and Night buttons as manual review controls.

### 10.4 Night

- Street lamps light at night. Use warm `#ffd39a` light. Add point lights only for the 12 lamps nearest the camera target. Other lamps use emissive heads and a ground glow decal.
- Traffic signals glow.
- Windows light as section 8.1 describes.
- Vehicle lights keep their current behavior.

## 11. Harbor and fleet

### 11.1 Harbor layout

Rebuild the harbor as a small coastal port with these zones:

| Zone | Content |
| --- | --- |
| Breakwater | A rubble-mound breakwater with rock armor. It shelters the basin. Its end forms the harbor mouth. A small light tower stands on the breakwater head with a green light. A red light stands on the opposite pier head. |
| Cargo quay | One general-cargo coaster at a 70 m quay. A rail-mounted jib crane. A transit shed. A truck apron. |
| Fishing harbor | Two or three trawlers. A fish market hall with an open side. Fish boxes and ice crates. |
| Marina | Floating pontoons with 6–10 sailboats and small motorboats |
| Public pier | A pier from the promenade with the water-taxi stop |
| Work-boat berth | The berth of the working boat (the sleep voyage vessel). Near the harbor mouth. |
| Tug berth | The tug |

Rules:

- The harbor mouth must open toward the open sea in the positive `x` direction.
- Export `HARBOR_MOUTH` (a point and a direction) and `WORK_BOAT_BERTH` (a position and a yaw) from `src/scene/city/harbor-plan.ts`.
- The work-boat berth stays within 15 m of the current berth. The path from the berth to the harbor mouth must be free of other boats and structures with 8 m clearance.
- Quay height is +1.6 m (section 4.1). Rebuild `CargoBerth.tsx` and `port-layout.ts` for this height.
- Keep the cargo crane behavior from `CargoBerth.tsx` if it remains useful. Keep its tests if they still apply. Update the coordinates.

### 11.2 Boat design rules

The ocean plan makes the water clear. Hulls below the waterline are now visible near the surface. Every hull needs a modelled underwater body.

| Rule | Detail |
| --- | --- |
| Hull lines | A sheer line that rises toward the bow. Flare at the bow. A rounded or chined bilge by type. No box hulls. |
| Underwater body | Keel, rudder, and propeller. Antifouling paint below the waterline in a dark red-brown or dark grey. A boot-top band 0.2–0.4 m at the waterline. |
| Superstructure | Window frames, doors, ladders, and railings with stanchions every 1.2 m |
| Equipment | Each vessel type has its working equipment (table below). Keep it restrained. |
| Details | Fenders, mooring bitts, anchors in hawse pipes, lifebuoys, a radar mast, navigation lights |
| Materials | Matte paint with roughness 0.7–0.8. Light weathering only: a slightly darker lower hull band. No rust streaks. |

### 11.3 Fleet

| Vessel | Length | Beam | Key features |
| --- | --- | --- | --- |
| Working boat (sleep vessel) | 16 m | 5.0 m | Red-brown hull (keep the character of the approved reference `red-cargo-boat-reference.png`). Aft wheelhouse, open foredeck, timber hatch covers, cargo derrick, dark rails. |
| General-cargo coaster | 58 m | 10.5 m | Two hatches, two deck cranes, a four-deck aft superstructure, a raked bow, and a transom stern |
| Trawler | 20 m | 6.5 m | Forward wheelhouse, aft gantry, net drum, outriggers |
| Tug | 24 m | 9 m | High wheelhouse with all-round windows, heavy fendering, a towing hook |
| Sailboats | 9–12 m | 3–4 m | Masts, booms, furled sails, small cockpits |
| Motorboats | 6–8 m | 2.4 m | Small consoles, outboard engines |
| Water taxi | 12 m | 4 m | Covered passenger cabin with large windows |

Working boat contract: the sleep plan depends on these parts. Name them exactly.

| Node name | Count or role |
| --- | --- |
| `cargo-hull`, `open-cargo-deck`, `cargo-hatches`, `cargo-crane`, `wheelhouse` | The current asset test checks these names |
| `cabin-window*` | More than 12 |
| `cabin-shutter*` | One per `cabin-window` |
| `bow-anchor`, `anchor-ball`, `anchor-light` | Anchor parts |
| `navigation-lamp*`, `mast-lamp*` | Lights |

Put the captain socket on the deck at the wheelhouse door. Export its position from the build script as a node named `captain-socket`.

Asset files:

- Rebuild `scripts/build-boat.mjs` for the working boat. Update `boat-asset.test.ts` for the new length (15–17 m) and the new parts.
- Rebuild `scripts/build-harbor-fleet.mjs` for the other vessels. Keep one node per vessel and the `Captain` node.
- Triangle limits: 30,000 for the working boat, 60,000 for the coaster, 15,000 for each other vessel.

### 11.4 Boat motion

- Berthed vessels keep a slow bob and roll from replay time. Scale the bob by vessel length: ±0.06 m for small boats, ±0.02 m for the coaster.
- Mooring lines connect bitts to bollards. They sag slightly.
- The ocean plan's wake applies only to moving boats.

## 12. Implementation phases

Run `npm run typecheck`, `npm test`, and `npm run build` after each phase. Fix every failure before the next phase.

Browser checks need the local app at `http://127.0.0.1:8787`. AGENTS.md forbids starting a development server without an explicit request. Ask the user before you start `npm run dev`. Stop the server after the checks.

Ask the user before you install any package. This plan needs no new package.

### Phase 1: Foundations

1. Create `terrain.ts`, `palette.ts`, and the lighting changes in section 10.1 and 10.3.
2. Fix the shadow coverage. Check the western city in `world` view.
3. Create `street-graph.ts` and its derived products with unit tests. Use a small test graph first.

### Phase 2: Representative slice

Build one complete slice before the whole city. The specification requires the representative-art gate before asset expansion.

The slice contains:

- One signalized arterial crossing and one local street
- One downtown block with background buildings from the kit, a courtyard, and street trees
- Two HRV plots in both states. The sixth plot switches between a shophouse row and the ribbon tower. The eighth switches between a pocket park and the Art Deco tower.
- One seawall segment with the promenade
- The new working boat at a quay
- One car and two pedestrians from the existing assets at the new scale
- Contact shadows and baked ambient occlusion
- Day and night

Show the slice in a development-only view. Guard it with `import.meta.env.DEV` and the query parameter `?citySlice=1`.

**Review checkpoint A.** Take the screenshots in section 14, items 1–4, for the slice. Save them in `design/visual-studies/city-v2/`. Stop and ask the user for review. Do not start Phase 3 before the user approves the slice.

The user accepted checkpoint A on November 23, 2026, after reviewing the shopfronts, raised median and turning arrows.

### Phase 3: Full layout

1. Author `CITY_PLAN` in `city-plan.data.ts` with the concept in section 5.3.
2. Build roads, sidewalks, crosswalks, markings, and blocks for the whole city.
3. Rebuild the coast with typed segments (section 7.3). Connect it to `buildSeabed()`.
4. Place the 30 HRV plots and the reserved sites.
5. Remove the old `HarborBlock` district geometry that the new layout replaces. Keep code that the harbor still uses until Phase 5.

The default scene now uses the full layout. The harbor retains its operating berths and loading apron. The street network connects the freight quay to Ridge Road.

The outer banks extend to approximately `z = -120` and `z = 118`. This layout uses the additional land for 30 separate 20 m square plots, street rights-of-way and the two reserved sites. The ridge and boat berth retain their original coordinates.

The November 23 review images show the [daytime layout](../../design/visual-studies/city-v2/layout-day.png), [nighttime layout](../../design/visual-studies/city-v2/layout-night.png) and [working harbor](../../design/visual-studies/city-v2/layout-harbor.png).

### Phase 4: Motion migration

1. Build `routes.ts` with vehicle loops and walk routes.
2. Rewrite `district-motion.ts` on the graph. Add traffic signals.
3. Port every behavior test in `district-motion.test.ts` to the new layout.
4. Update the camera spots and views (section 6.5).

The full city now uses five vehicle loops. Each day uses the Ridge Road loop and three other loops. Five-minute calorie data controls how many vehicles appear. Step data controls how many people appear on the four walking routes. Nearby intersections share a signal when the street between them is too short for two crossings.

To see the crossing, select the synthetic date November 15, 2026. Select **Market crossing** and set the replay to **12:00**. Two vehicles wait behind the stop line while a pedestrian crosses Market Avenue. [Daytime crossing](../../design/visual-studies/city-v2/market-crossing-replay.png)

### Phase 5: Buildings, towers, harbor, fleet

1. Build the city kit and the assembler. Fill every lot.
2. Rebuild the tower kit and the five families. Add the interim forms and the **HRV plot** card.
3. Rebuild the harbor layout, the quays, the breakwater, and the harbor buildings.
4. Rebuild the working boat and the fleet.
5. Add vegetation and street details.

**Review checkpoint B.** Take all screenshots in section 14. Stop and ask the user for review.

The main city now uses modular tower floors, permanent street buildings, and the 16 m working boat. Six new street buildings occupy sites outside the 30 HRV parcels. The waterfront uses the city kit. The earlier `harbor-building.glb` remains a reference asset.

The 70 m cargo quay serves the 58 m coaster. Separate piers serve the fishing fleet, tug, water taxi, and marina. The working boat leaves through the east entrance. The original pedestrian landing connects to the new boarding float.

The user accepted checkpoint B on November 23, 2026, after the tower and curved sidewalk corrections. The gallery includes the four HRV states, fixed-camera comparisons, tower families, interim forms, harbor views, and the mobile layout. [Day and night gallery](../../design/visual-studies/city-v2/checkpoint-b/README.md)

### Phase 6: Performance, tests, documentation

1. Measure performance (section 13).
2. Update the browser tests.
3. Update the documents (section 17).

Phase 6 is complete. The closeout records the render budgets, Chrome checks, asset decisions, and remaining product questions. [Performance and validation report](../../design/visual-studies/city-v2/performance.md)

## 13. Performance

Measure on the user's current Mac with Chrome. Record the hardware and the browser version.

| Item | Budget |
| --- | --- |
| Draw calls in `world` view | 350 or fewer |
| Triangles in `world` view | 2.5 million or fewer |
| Background building module instances | Record the number |
| Median frame time | Record it in `world`, `harbor`, `walk`, and `skyline` views. Report it against 16.7 ms. |

Methods:

- Use one `InstancedMesh` per kit module, per tree type, and per street-furniture type.
- Merge static road, sidewalk, and marking geometry per district.
- In `world` view, hide props smaller than 1 m and use the simple roof equipment set.
- Do not report a budget as met unless you measured it.

## 14. Screenshot checklist

Capture each item in day and in night. Save the files in `design/visual-studies/city-v2/`. Put the old and new versions of items 1, 2, and 5 side by side.

1. `world` view with 5 towers (November 15 fixture, 27.4 ms).
2. `world` view with 20 towers (103.7 ms fixture).
3. `world` view with unavailable HRV (wireframes).
4. `walk` view: a signalized crossing with pedestrians and a car.
5. `harbor` view.
6. `berth` view: the coaster and the crane.
7. `detail` view: the working boat.
8. `square` view: the civic plaza.
9. `side` view: a residential street.
10. The waterfront promenade and seawall.
11. The north cove beach.
12. Each of the five tower families at close range.
13. A narrow mobile layout of `world` view.
14. Each of the six interim forms at close range.
15. The same downtown street at zero and 20 towers. Keep the camera fixed.
16. Compare the five-tower world view with the unavailable world view. Check that both differ from a zero-tower day.

The interim-form images use synthetic dates. November 13 has zero towers, November 15 has five, November 11 has 20, and November 12 has unavailable HRV. The street comparison keeps the same Market Avenue camera position. The slice comparison keeps the same waterfront camera position.

| Subject | Day | Night |
| --- | --- | --- |
| Shophouse row | [Day](../../design/visual-studies/city-v2/interim-forms/shophouse-day.png) | [Night](../../design/visual-studies/city-v2/interim-forms/shophouse-night.png) |
| Corner walk-up | [Day](../../design/visual-studies/city-v2/interim-forms/walkup-day.png) | [Night](../../design/visual-studies/city-v2/interim-forms/walkup-night.png) |
| Market hall | [Day](../../design/visual-studies/city-v2/interim-forms/hall-day.png) | [Night](../../design/visual-studies/city-v2/interim-forms/hall-night.png) |
| Low bank | [Day](../../design/visual-studies/city-v2/interim-forms/bank-day.png) | [Night](../../design/visual-studies/city-v2/interim-forms/bank-night.png) |
| Pocket park | [Day](../../design/visual-studies/city-v2/interim-forms/park-day.png) | [Night](../../design/visual-studies/city-v2/interim-forms/park-night.png) |
| Plaza | [Day](../../design/visual-studies/city-v2/interim-forms/plaza-day.png) | [Night](../../design/visual-studies/city-v2/interim-forms/plaza-night.png) |
| Market Avenue at zero towers | [Day](../../design/visual-studies/city-v2/interim-forms/street-zero-day.png) | [Night](../../design/visual-studies/city-v2/interim-forms/street-zero-night.png) |
| Market Avenue at 20 towers | [Day](../../design/visual-studies/city-v2/interim-forms/street-twenty-day.png) | [Night](../../design/visual-studies/city-v2/interim-forms/street-twenty-night.png) |
| World at zero towers | [Day](../../design/visual-studies/city-v2/interim-forms/world-zero-day.png) | [Night](../../design/visual-studies/city-v2/interim-forms/world-zero-night.png) |
| World at five towers | [Day](../../design/visual-studies/city-v2/interim-forms/world-five-day.png) | [Night](../../design/visual-studies/city-v2/interim-forms/world-five-night.png) |
| World with unavailable HRV | [Day](../../design/visual-studies/city-v2/interim-forms/world-unavailable-day.png) | [Night](../../design/visual-studies/city-v2/interim-forms/world-unavailable-night.png) |
| Slice with shophouses and a pocket park | [Day](../../design/visual-studies/city-v2/interim-forms/slice-five-day.png) | [Night](../../design/visual-studies/city-v2/interim-forms/slice-five-night.png) |
| Slice with ribbon and Art Deco towers | [Day](../../design/visual-studies/city-v2/interim-forms/slice-twenty-day.png) | [Night](../../design/visual-studies/city-v2/interim-forms/slice-twenty-night.png) |

## 15. Interfaces for the other plans

### 15.1 Ocean plan

- `buildSeabed()` reads the typed coast segments (section 7.3).
- The breakwater revetment and the quay walls use the ocean shore rules.
- The ocean plan's harbor tint applies inside the new breakwater.

### 15.2 Sleep voyage plan

The sleep plan defines its route from the old berth. Apply these changes there:

- Replace its route points P0–P3 with a path from `WORK_BOAT_BERTH` to `HARBOR_MOUTH`. `S_MOUTH` is the route distance at `HARBOR_MOUTH`.
- Replace its return points R5–R7 with the same path in reverse. Keep 8 m clearance from berthed vessels.
- The working boat is now 16 m long and 5 m wide. Raise the clear lane beside the route from 3 m to 4 m. Use `beam = 5` for the wake.
- The shutters and the anchor parts already exist in the new boat. The sleep plan's step "Update `scripts/build-boat.mjs`" becomes a check of these parts.
- The sleep plan can reuse `city-flora.glb` trees for its island and channel banks.

## 16. Open items

Do not decide these items. List them in your final report.

- One or two fixed construction sites outside the HRV plots, such as the harbor district. Keep their location and stage fixed. Get user approval before adding moving workers or machines with no data meaning.
- Parked cars. They make streets look real, but they could look like calorie traffic. The user must decide.
- Non-data people, such as cafe guests. The specification ties pedestrians to step data.
- The dam, reservoir, and garden designs. This plan only reserves their sites.
- HRV capacity above 30 plots.
- Historical daylight and weather.

## 17. Documentation updates

Write Markdown in English.

- `docs/product-spec.md`:
  - In "Experience and world", add that non-data background buildings of 3–8 storeys fill city lots. They stay at least 12 m lower than the lowest HRV tower and use a different style.
  - In "Daily HRV skyline", describe the fixed interim forms, the construction exclusion, and the paved base with an envelope for unavailable HRV.
  - Record the typed urban coast.
- `GLOSSARY.md`: add "Background building", "Pocket park", "Street graph", and "Interim form".
- `design/visual-studies/visual-handoff.md`: add a section "City review: November 23, 2026" with the diagnosis in section 1, the decisions, and the checkpoint results. Update the element table rows for buildings, boats, quays, and paving.
- `README.md`: update the city description, the views, and the asset commands.

## 18. Final report

At the end, report these items:

- The changed files.
- The commands you ran and their results.
- The screenshot paths.
- The performance measurements with hardware and browser versions.
- The decisions on `harbor-building.glb` (section 8.1) and `GTAOPass` (section 10.2).
- Any deviation from this plan and its reason.
- The open items in section 16.
