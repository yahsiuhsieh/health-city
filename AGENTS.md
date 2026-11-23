# HealthCity Agent Instructions

HealthCity development follows the accepted product specification and architecture decisions.

## Project guidance

- Prioritize usable product workflows and maintainable code.
- Keep implementation scoped to the current workflow.
- Summarize changes, validation, and material limitations concisely.
- Discuss in Traditional Chinese. Write Markdown files in English.
- Use English for code, identifiers, and UI copy where appropriate.
- Use the `asd-ste100` skill for English technical writing.
- Use Strict mode for instructions and procedures. Use STE-flavored mode for explanatory documentation.
- Preserve facts, uncertainty, exceptions, scope, and requirement strength during rewrites.
- Follow [docs/product-spec.md](docs/product-spec.md) for accepted behavior, scope, and acceptance criteria.
- Treat both the product and technical architecture interviews as closed. The user closed technical planning on November 8, 2026.
- Do not reopen settled decisions without new evidence or a user request.
- Follow accepted architecture decisions in [docs/adr/](docs/adr/).
- Use [docs/data-sources.md](docs/data-sources.md) for API contracts, limits, and required checks.
- Use [GLOSSARY.md](GLOSSARY.md) for domain definitions.
- Use [the visual direction document](design/visual-studies/visual-handoff.md) for provisional art direction.
- Use the [img2threejs skill](.agents/skills/img2threejs/SKILL.md) to create or refine procedural Three.js models from visual references.
- Follow [ADR-0004](docs/adr/0004-hybrid-world-assets.md) for asset delivery and browser checks.
- Check final browser quality and the asset workflow before expansion.
- Read the relevant document sections. Do not load every document on each turn.
- Use the Takeout evidence summary in [docs/data-sources.md](docs/data-sources.md) for historical fixture findings.
- Use Google Health API for production data. Do not substitute Takeout as the production source.
- Treat Google Health API responses as the authoritative product data. Use app or Takeout comparisons only for targeted diagnosis, not mandatory manual acceptance.
- Check retrieval completeness, units, dates, missing-data states, and transformations in code. Do not require the user to check each metric manually.
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
- Obtain explicit approval before installing Blender or integrating it into asset production.
- Do not start development servers without an explicit request.
- Run available lint and build checks after meaningful JavaScript or TypeScript changes. Use the established project commands.

Keep this file focused on durable agent behavior. Put product rules, evidence, and milestone details in their maintained documents. Avoid copying the specification here.
