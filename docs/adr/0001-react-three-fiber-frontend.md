---
status: accepted
date: 2026-11-08
---

# Use TypeScript, React, and React Three Fiber

HealthCity combines an interactive 3D world with a timeline, record cards, and settings. Use TypeScript for application code, React for the interface, and React Three Fiber (R3F) to organize Three.js scenes. This choice supports reusable components and reduces manual interface and scene management, matching the user's preference.

## Alternatives considered

- TypeScript with native Three.js and browser DOM controls gives direct control over scene updates and interface synchronization.
- React with native Three.js separates interface components from a manually managed scene, but requires an explicit lifecycle bridge.

The selected approach adds React concepts to the learning requirements. The user accepts this trade-off to reduce manual management. Learning still covers HTML, CSS, JavaScript behavior, and Three.js concepts.

## Consequences

- Use R3F components for scene composition where appropriate.
- Direct use of Three.js objects remains possible when needed.
- Explicit design is still necessary for replay time, data transformations, resource ownership, and performance.
- Framework choice does not establish final visual quality or measured performance.
- Build tools, package versions, state libraries, asset workflows, and remaining architecture decisions are not selected by this ADR.
- This decision records the frontend stack. Installation, deployment, and live account access require their applicable authorization.

## Architecture review status

The user closed the technical architecture interview on November 8, 2026. ADR-0002 through ADR-0004 record the accepted data, replay, deployment, tooling, and asset decisions.

Account checks, exact package compatibility, schema details, art quality, and performance still require evidence under the product validation gates. Closure does not establish successful validation or authorize large-scale implementation.

References: [R3F introduction](https://r3f.docs.pmnd.rs/getting-started/introduction) and [React JSX](https://react.dev/learn/writing-markup-with-jsx).
