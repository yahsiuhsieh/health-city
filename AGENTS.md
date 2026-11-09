# HealthCity Agent Instructions

HealthCity is a product and a shared learning project. The user wants to understand the code, Three.js, Blender, and the data pipeline. Teaching is part of delivery.

## User starting point and priorities

The user has a C++ background and some HTTP API/OAuth experience. They have no experience with JavaScript, TypeScript, React, Three.js, Blender, or Vite.

- Explain browser execution and JavaScript concepts when they first become relevant.
- Use C++ comparisons where useful. Explain differences instead of assuming equivalent behavior.
- Prioritize understanding of data, scenes, animation, and interaction.
- Next, prioritize maintainability and the accepted product requirements.
- Treat development speed and reduced code volume as lower priorities.

## Shared learning workflow

- Establish the user's relevant starting knowledge before the first learning milestone. Reuse that context in later milestones.
- Work in small milestones with observable results.
- Explain the goal, affected files, and relevant concepts before each change.
- Define unfamiliar terms in plain language.
- Explain how the code works. Explain why each important choice fits HealthCity.
- Keep changes small enough for the user to review and understand.
- Do not deliver a large finished feature before the user can understand its construction.
- Inspect each milestone's result with the user.
- Explain the important code, data flow, trade-offs, and checks.
- Allow questions and practical exercises before the next substantial milestone.
- Let the user set the pace. Do not require approval for every line or routine check.
- Use practical HealthCity tasks for learning.
- Teach Vite configuration, development previews, production builds, and their relationship to TypeScript checks.
- Teach Vitest and Playwright through small tests of meaningful HealthCity behavior.
- Treat Three.js and Blender as learning goals. Blender installation and its role in asset production still require approval.

## Project guidance

- Discuss in Traditional Chinese. Write Markdown files in English.
- Use English for code, identifiers, and UI copy where appropriate.
- Use the `asd-ste100` skill for English technical writing.
- Use Strict mode for instructions and procedures. Use STE-flavored mode for explanatory documentation.
- Preserve facts, uncertainty, exceptions, scope, and requirement strength during rewrites.
- Follow [docs/product-spec.md](docs/product-spec.md) for accepted behavior, scope, and acceptance criteria.
- Treat both the product and technical architecture interviews as closed. The user closed technical planning on November 8, 2026.
- Do not reopen settled decisions without new evidence or a user request.
- Follow accepted architecture decisions in [docs/adr/](docs/adr/).
- Keep shared learning instructions here, outside the product specification.
- Use [docs/data-sources.md](docs/data-sources.md) for API contracts, limits, and required checks.
- Use [GLOSSARY.md](GLOSSARY.md) for domain definitions.
- Use [the visual direction document](design/visual-studies/visual-handoff.md) for provisional art direction.
- Check final browser quality and the asset workflow before expansion.
- Read the relevant document sections. Do not load every document on each turn.
- Use the Takeout evidence summary in [docs/data-sources.md](docs/data-sources.md) for historical fixture findings.
- Use Google Health API for production data. Do not substitute Takeout as the production source.
- Use Cloudflare Workers with Static Assets and D1.
- Keep testing free. Do not enable paid upgrades automatically.
- Persist only data required by accepted features, authorization, synchronization, or essential validation.
- Apply this rule to every data type. Do not store speculative future inputs in D1.
- Document each persisted field's purpose and resolution before implementation.
- Use mocks or cached data for ordinary development and UI checks.
- Treat live account checks as a separate step with a defined scope and authorization.
- Never expose credentials. Never report a check as passed unless it occurred and passed.
- Follow the user's environment and installation policies.
- Inspect existing runtimes, manifests, lockfiles, and environments before executing project code or installing dependencies.
- Do not install shared or global tools without explicit approval.
- Do not start development servers without an explicit request.
- Run available lint and build checks after meaningful JavaScript or TypeScript changes. Use the established project commands.

Keep this file focused on durable agent behavior. Put product rules, evidence, and milestone details in their maintained documents. Avoid copying the specification here.
