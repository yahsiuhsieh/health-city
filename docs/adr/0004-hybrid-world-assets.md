---
status: accepted
date: 2026-11-08
---

# Combine reusable models with procedural world geometry

Use reusable models for base forms such as boats, trees, vehicles, and buildings. Use runtime code to generate or adjust geometry and layout from data, including heart-rate terrain, sleep-island area, and garden placement. Runtime code also coordinates traffic, boat travel, flower appearance, and pause behavior with replay time.

This strategy preserves model detail while allowing health records to change the world. The alternatives create all forms in code or author complete scenes that need separate adjustments for each recorded state.

Use glTF 2.0 binary files (`.glb`) as the default browser delivery format for reusable models. Keep editable authoring files separately. Format selection does not select the authoring tool or compression tools.

Check exported scale, materials, textures, and animations in the browser. Do not assume the authoring tool and browser produce identical results.

The strategy does not select authoring software or the final asset inventory. Blender remains a candidate. Its installation and production integration still require approval.

Apply the representative-boat quality gate in the [visual direction document](../../design/visual-studies/visual-handoff.md#readiness-and-next-step) before expanding assets. Exact materials, geometry, budgets, and the production workflow remain open.

Reference: [R3F model loading](https://r3f.docs.pmnd.rs/tutorials/loading-models).
