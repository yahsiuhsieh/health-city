# Milestone 1: Environment and API preparation

Review date: November 8, 2026 (America/Chicago).

## Goal and current result

Check the existing environment and prepare a bounded read-only Google Health API check.
Product and architecture interviews remain closed.
Follow [ADR-0001 through ADR-0004](../adr/), the [product validation gates](../product-spec.md#validation-gates-and-failure-responses), and [data-source requirements](../data-sources.md).

Environment review is complete. Account access and API feasibility remain untested.
This milestone adds only this document. It installs no dependencies and creates no cloud resources.

## Verified environment

| Item | Observed result |
| --- | --- |
| Workspace | `/Users/yahsiu/Documents/Codex/HealthCity` |
| Node.js | `v24.15.0`, from `/Users/yahsiu/.nvm/versions/node/v24.15.0/bin/node` |
| npm | `11.12.1`, from the same nvm version directory |
| Application setup | No application manifest, dependency lockfile, or `node_modules` found |
| Runtime selection | No project `.nvmrc` or `.node-version` found |
| Cloudflare tooling | No `wrangler` command found on the current PATH |
| Git | The workspace is not currently a Git repository |

The review used file inspection, executable lookup, and version commands.
It did not inspect account credentials or establish whether cloud projects already exist.
These versions establish availability, not compatibility with packages that remain unselected.

## Tools and execution boundaries

- Node.js executes JavaScript outside the browser. Future local tooling can use the existing nvm runtime.
- npm manages project dependencies. `package.json` declares scripts and dependencies. A lockfile records resolved dependency versions.
- TypeScript adds static type checks to JavaScript. Its types do not validate incoming JSON at runtime.
- Vite serves development files and builds browser assets. Vite transpilation does not replace TypeScript checks.
- Wrangler supports local Worker execution and Cloudflare resource management. Installation alone does not require deployment.
- D1 provides SQL persistence for the Worker. Use D1 Free during testing.

The accepted application runs React and R3F in the browser.
The Worker handles protected API access and OAuth secrets.
Independent TypeScript modules transform records into presentation state.

No application scaffold or tool installation is necessary for this preparation step.
Before setup, check exact package compatibility and explain every proposed dependency and file.
Do not start a development server without an explicit request.

## Proposed first authorized account check

This proposal is not authorization to configure OAuth, connect an account, call the API, or deploy.

Start with `daily-resting-heart-rate` for one completed source date that the user can compare with the app.
RHR is a small daily record with an explicit calculation-method check.
Its success cannot establish feasibility for other data types or historical synchronization.

Official [Vitals documentation](https://developers.google.com/health/data-types/vitals) lists `list` and `reconcile` for this type.
The [scopes documentation](https://developers.google.com/health/scopes) identifies the read-only permission:

```text
https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly
```

This scope covers more than RHR. Restrict the check's requests to the agreed data type and date.
Do not request activity, sleep, profile, location, or write scopes for this first slice.
Later accepted types require separate checks under [data-sources.md](../data-sources.md#account-comparison).

### Required preparation before live execution

1. Confirm the comparison date and its source-date meaning with the user.
2. Check the current REST request schema, date filter, pagination, and reconciliation behavior.
3. Prepare a small local implementation with synthetic responses before account access.
4. Explain the OAuth client, callback route, token handling, and affected files before implementation.
5. Check callback validation, owner access, and credential redaction before real-data use.
6. Obtain separate authorization for account configuration and connection.
7. Obtain authorization for the exact live requests, date, page budget, and temporary-data handling.

The initial proposed budget is two health-data requests: one `list` request and one `reconcile` request.
This budget excludes the separately scoped OAuth exchange.
Do not follow additional pages or retry automatically within this first check.
If pagination prevents complete retrieval, report the check as incomplete.
OAuth requests and health-data requests both require explicit scope before execution.

The [Google setup guide](https://developers.google.com/health/setup) requires a Cloud project and OAuth client.
It describes test-user configuration and states that Google Health has no separate API sandbox.
A test project still accesses real account data after consent.
Review existing account configuration only during a separately authorized connection step.

### Evidence and stop conditions

- Check consented scope and HTTP status without recording tokens.
- Compare `date`, `beatsPerMinute`, and calculation-method metadata with the selected source interpretation.
- Preserve method distinctions. Do not average methods or automatically select the lowest value.
- Record only a non-sensitive outcome summary in this document after an authorized check.
- Treat a successful empty result separately from errors or incomplete retrieval.
- Stop on authorization failures, ambiguous dates, unexplained differences, or exhausted request budget.
- Stop on `429` without automatic retries during this bounded check.

The [quota guide](https://developers.google.com/health/rate-limits) identifies `429` as a rate-limit response.
No quota increase or paid upgrade is part of this check.
Do not substitute Takeout for production access if the check fails.

## Persistence boundary

This milestone stores no health data or credentials and creates no D1 database or schema.
For the proposed first live check, prefer temporary in-memory response inspection with no raw-response files or response-body logs.
Release temporary responses when the check ends. Do not paste health records or credentials into chat or documentation.

Before any persisted field exists, document its purpose, resolution, retention, and clearing behavior.
This includes authorization state, tokens, and operational records, as well as health data.
Measure D1 storage and read/write usage before expanding synchronization.
Keep the accepted retention policy for necessary replay history.

## Shared-learning checkpoint

The user's starting knowledge includes C++ and some HTTP API/OAuth experience.
JavaScript, TypeScript, React, R3F, and Vite are new learning topics.

Optional local practice:

1. Run `command -v node` in the project directory.
2. Run `node --version`.
3. Run `npm --version`.
4. Compare the results with the environment table.

These commands do not install packages, start servers, or connect accounts.
Pause here for questions and practice before the next implementation milestone.
The recommended next milestone is a small local request/response exercise with synthetic RHR data.
Explain each affected file and tool before creating that exercise.
