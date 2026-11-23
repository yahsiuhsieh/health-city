# HRV Plot Interim Forms: Amendment to the City Redesign Plan

Date: November 23, 2026. Audience: the implementing coding agent.

This amendment changes the city redesign plan (`city-redesign.md`, which the user holds). Execute it together with that plan. If this amendment and the city plan disagree, this amendment controls.

## 1. Purpose

An unoccupied HRV plot must not look empty. The city plan showed a pocket park or a plaza on every unoccupied plot. On low-HRV days, about 25 of 30 plots would be parks. The downtown would still look empty.

The user proposed construction sites on unoccupied plots. The user then accepted a different approach on November 23, 2026, for these reasons:

- A construction site suggests a growing quantity: "a tower is coming". The product specification states that HRV is not cumulative. It forbids construction progress for HRV.
- HRV changes from day to day. A plot would alternate between construction and a finished tower. This looks like repeated demolition.
- Real downtowns do not have most lots under construction at the same time.
- The specification reserves construction workers for a possible future accumulating quantity.

The accepted approach: an unoccupied plot shows an older low-rise building that has not been redeveloped yet, or a pocket park or plaza. Real downtowns often contain such buildings between towers.

## 2. Changes to the city plan

| City plan section | Change |
| --- | --- |
| 1, decisions table, row "Empty tower plots" | Replace with: "An unoccupied HRV plot shows its fixed interim form: an older low-rise building, a pocket park, or a plaza. A tower replaces it on days when HRV occupies the plot." |
| 1, decisions table | Add the row "Construction sites: none on HRV plots." |
| 2, rules | Add the rule in section 3 of this amendment. |
| 8.1, kit modules | Add the modules in section 5.3 of this amendment. |
| 8.3 | Replace the whole section with sections 4–8 of this amendment. |
| 12, Phase 2 slice | Replace "One HRV plot shown in both states" with: "Two HRV plots, each shown in both states. Plot 1: a tower and a shophouse row. Plot 2: a tower from another family and a pocket park." |
| 12, Phase 5, step 2 | Replace "Add the pocket parks" with "Add the interim forms and the `HRV plot` card." |
| 14, screenshots | Add the items in section 9 of this amendment. |
| 16, open items | Add the item in section 10 of this amendment. |
| 17, documentation | Apply section 11 of this amendment. |

## 3. New rule

Add this rule to the city plan's section 2:

- No HRV plot shows construction. This excludes fences, hoardings, cranes, scaffolding, excavation, building materials, workers, and construction machines. HRV is not cumulative, and the specification forbids construction progress for it.

## 4. Interim forms

Each HRV plot has one fixed **interim form**. Assign it once from the plot id with the district seed. Store it in the plot table in `city-plan.data.ts`. The form never changes across dates.

| Form | Plots | Description |
| --- | --- | --- |
| Shophouse row | 8 | Two or three attached buildings of 2–3 storeys on the frontage. Shops on the ground floor. Flats above. A rear yard. |
| Corner walk-up | 5 | One 3-storey building with a corner shop. Corner plots only. |
| Market hall | 3 | One tall single-storey hall, 7–9 m to the ridge. A gabled or barrel roof with clerestory windows. Open arcades on the street side. Market stalls inside. |
| Low office or bank | 2 | A 2-storey masonry building with a formal entrance and tall windows |
| Pocket park | 7 | Lawn, 3–6 trees, a path, and benches |
| Plaza | 5 | Pavers, 2–4 trees in planters, benches, and a fountain basin without water motion |

The total is 30, which equals `SKYLINE_DISPLAY_CAPACITY`. If the plot count changes, keep the same proportions.

Placement rules:

- Two adjacent plots must not have the same form. Adjacent means that the plots share a lot boundary or face each other across a local street.
- The first five plots in occupancy order must include at least two building forms and at least one park or plaza. A low-HRV day then shows a mixed street.
- Each downtown block keeps a continuous street wall on at least two sides. Where a park would break the wall on a third side, use a building form.
- Corner walk-ups go only on corner plots. If too few corner plots exist, use shophouse rows in their place and record the change.

## 5. Interim building style

### 5.1 Character

Interim buildings are older than the surrounding background buildings. Their style also stays clearly different from the HRV towers.

| Item | Rule |
| --- | --- |
| Height | 2–3 storeys, or one tall hall. 12 m or less, including roofs and chimneys. |
| Era | Earlier than the background buildings: brick or lime render, smaller punched windows with stone sills, timber shopfronts, pitched roofs or simple parapets, chimneys |
| Ground floor | Active: shop windows with goods, awnings, one or two cafe tables, market stalls in the hall |
| Lot coverage | Building forms stand on the plot frontage. The rear part of the plot is a yard with a tree, a shed, or a small garden. |
| Night | Lit shop windows and 30–45 percent lit upper windows. Use the deterministic window pattern from the city plan's section 8.1. |

### 5.2 Colors

| Use | Colors |
| --- | --- |
| Brick | `#a86a52`, `#9a5e4a` |
| Render | `#d8c7a6`, `#c9b48e`, `#b9a88a` |
| Shopfront timber | `#5f6f62`, `#7a4f3c`, `#3f5a6a` |
| Roof tiles | `#8c5a48`, `#6f6a66` |
| Market hall roof | `#7c8a86` standing seam |

Vary each building's main color by ±5 percent.

### 5.3 Kit modules

Add these modules to `scripts/build-city-kit.mjs`. Use the same rules as the other kit modules. These rules are fixed bay widths, recessed glazing, restrained rounding, baked ambient occlusion, and 600 triangles or fewer per module.

| Module | Variants |
| --- | --- |
| `gf-timber-shopfront` | 3 |
| `upper-sash-window` | 3 |
| `pitched-roof-terrace` | 2 |
| `chimney` | 2 |
| `market-hall` | 2 (gabled, barrel) |
| `market-stall` | 3 |
| `bank-front` | 1 |
| `yard-shed` | 2 |

### 5.4 Forbidden details

These details suggest vacancy, demolition, or construction. Do not use them on interim plots:

- Boarded or broken windows
- Fences, hoardings, scaffolding, or cranes
- "For sale" or "To let" signs
- Rubble, bare dirt, piles of materials, or excavation
- Workers or machines

## 6. States

| HRV state | The plot shows |
| --- | --- |
| Occupied: the plot's occupancy index is less than the day's count | The tower with its podium |
| Not occupied | Its interim form |
| HRV unavailable | A neutral paved plaza base and the tower-envelope wireframe. No interim form. This keeps the unavailable state visibly different from a low count. |

- The tower and the interim form never show together.
- Choose the state once when the day's HRV loads. Do not animate the change.
- Seeking does not change the state, because the count stays fixed during a day.
- Keep the overflow message when the count is more than 30.

## 7. Inspection

- A click on an interim building, a plot park, or a plot plaza pauses replay. Ignore pointer drags, as the other click handlers do.
- Open a card titled `HRV plot`.
- First line: `A tower stands here when daily HRV is at least N ms.` Compute `N = 5 × (occupancy index + 1)`.
- Second line: the day's value, for example `Today: 27.40 ms · 5 towers`. When HRV is unavailable, show `No HRV data`.
- The card explains the mapping. It adds no new data.

## 8. Tests

Add these unit tests:

- The form counts match the table in section 4.
- No two adjacent plots share a form.
- The first five plots in occupancy order contain at least two building forms and at least one park or plaza.
- Corner walk-ups stand only on corner plots.
- Every interim building is 12 m tall or less, including roofs and chimneys.
- For counts 0, 5, 20, and 30, each plot shows exactly one of its tower or its interim form.
- With HRV unavailable, no plot shows an interim form, and every plot shows a wireframe.
- The card threshold for occupancy index 4 is 25 ms.

Add this browser test:

- Load the 27.4 ms fixture. Click one interim building. Check the `HRV plot` card text and the paused state.

## 9. Screenshots

Add these items to the city plan's screenshot list. Capture each in day and in night.

1. Each interim form at close range: shophouse row, corner walk-up, market hall, low office, pocket park, and plaza.
2. One downtown street at 0 towers and at 20 towers, from the same camera position.
3. The `world` view at 5 towers. Check that the downtown does not look empty.
4. The `world` view with unavailable HRV. Check that it looks different from the 0-tower state.

## 10. Open item

Add this item to the city plan's open items:

- One or two fixed construction sites outside the HRV plots, for example in the harbor district. Their position and stage would never change. Moving workers and machines would be actors without data meaning, so the user must approve them first.

## 11. Documentation updates

- `docs/product-spec.md`, section "Daily HRV skyline":
  - An unoccupied plot shows a fixed interim form: an older low-rise building, a pocket park, or a plaza.
  - HRV plots never show construction.
  - Unavailable HRV shows a paved base with the wireframe and no interim form.
- `GLOSSARY.md`: add "Interim form". Define it as the fixed non-tower appearance of an unoccupied HRV plot.
- `design/visual-studies/visual-handoff.md`: in the city review section, record the user's construction-site proposal, the reasons in section 1, and the accepted approach.
