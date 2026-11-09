---
status: accepted
date: 2026-11-08
---

# Render the application in the browser and use a Worker API

Use a browser-rendered React application for the interface and R3F world. Use Cloudflare Workers for authentication, Google Health API access, synchronization, and authorization checks. Workers access retained data in D1, while the browser derives presentation state through the independent TypeScript core.

Keep OAuth secrets and refresh tokens on the backend. The browser retrieves authorized data through the Worker API.

## Data and authentication boundaries

Use Worker-side source adapters to convert Google Health records into a consistent HealthCity data contract. Define units, timestamps, date attribution, source identity, and missing-data states explicitly. The independent TypeScript core and frontend consume this contract instead of interpreting vendor fields separately.

Preserve traceability and the accepted source-correction and record-review rules. Conversion must not silently repair records or replace unknown values with zeros. Actual field mappings and calculation-method reconciliation still require account checks.

Serve the frontend, API, and authentication callbacks under the same HTTPS origin. Use opaque random session identifiers in Secure HttpOnly cookies. The Worker checks session validity and the single owner's authorization for protected requests.

Keep session state on the server, separate from Google access and refresh tokens. Implement expiry, logout, callback validation, and CSRF protection. Storage schema and library selection remain open.

Expire sessions after 30 minutes without user activity or seven days after sign-in, whichever occurs first. Automatic playback and background synchronization do not count as user activity. Enforce both limits on the Worker. Continued activity must not extend the seven-day absolute limit.

Session expiry requires sign-in again. It does not delete retained health history or disconnect the Google authorization. These durations are product choices, not claims of compliance with a security standard.

This approach keeps frontend and backend responsibilities explicit. The application still needs API contracts, session handling, and loading and error states. The alternative uses a full-stack React framework with server-rendered pages. The accepted application behavior does not require that approach.

Use Vite for development and production builds, with the Cloudflare integration. Run TypeScript checks separately because Vite transpilation does not check types. Exact package versions require environment and compatibility checks before project setup.

Keep the interface, 3D scene, data core, and Worker backend in one project with distinct directories and dependency boundaries. Preserve separate browser and backend build boundaries so backend code does not enter the browser bundle.

OAuth callback routing and runtime compatibility still require checks before implementation. In particular, SPA fallback must not intercept backend authentication routes.

## Minimum necessary persistence

Use the [product storage policy](../product-spec.md#minimum-necessary-storage) for every data type. Persist only fields and resolution needed by current accepted behavior or essential operation. Do not retain complete source payloads, unused streams, or speculative detail by default.

Document field purpose and measure storage, rows read, and rows written before expanding synchronization. Temporary raw-data caches need explicit scope and expiry. This policy also applies to fixtures and operational data stored in D1.

Heart-rate history uses five-minute means and necessary coverage and provenance, without permanent original-sample storage. Exact per-type schemas still require API checks and a storage-necessity review.

## Validation tooling

Use Vitest for data rules and replay-controller tests. Use Playwright for a small set of browser interaction tests covering important accepted behavior. Use local fixtures or cached records under the existing development-data policy.

Keep art approval and measured Mac/Chrome performance checks separate from automated behavioral tests. Exact versions and runtime requirements need compatibility checks before installation.

References: [Cloudflare React and Vite architecture](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/) and [Vite TypeScript support](https://vite.dev/guide/features.html#typescript).
