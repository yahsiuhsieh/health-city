# Milestone 2: An offline OAuth callback exercise

## Goal and boundary

Trace a callback URL through state validation and result handling.
This exercise runs locally without an HTTP server, network requests, account access, or persistence.
It uses no real credentials, authorization codes, tokens, or health records.
It does not establish account identity or successful Google Health access.

The user reports a Web application OAuth client with Testing status, all read-only scopes, and no redirect URI.
These settings are user-reported, not console-verified.
The first future RHR request still needs only the health-metrics read-only scope described in [milestone 1](01-environment-and-api-preparation.md).
No Google Cloud settings changed during this exercise.

## Files and tools

| File | Purpose |
| --- | --- |
| `learning/oauth-callback/callback.mts` | Parses a callback URL and checks a pending authorization |
| `learning/oauth-callback/demo.mts` | Runs synthetic cases with Node's built-in assertions |
| This document | Explains the exercise and its limits |

Node.js v24.15.0 remains the existing runtime. No dependencies or package scripts are necessary for this exercise.
The `.mts` extension selects a TypeScript module with explicit imports and exports.
Node removes supported type annotations before execution. It does not check types or use `tsconfig.json` for this process.
See [Node TypeScript support](https://nodejs.org/docs/latest-v24.x/api/typescript.html).

No project lint, build, or type-check command exists yet.
The assertions check this exercise's runtime behavior. They do not replace future TypeScript, Vitest, or browser checks.
The exercise remains separate from the accepted Worker application architecture.

## Data flow and C++ comparisons

1. `demo.mts` creates a synthetic pending authorization and callback URL.
2. `inspectCallback` parses the URL with the built-in `URL` class.
3. The function checks the destination, state, expiry, and previous consumption.
4. A matching callback consumes the pending authorization.
5. The function returns a code, consent denial, or rejection.
6. Assertions compare the result with the expected outcome.

`PendingAuthorization` describes an object shape, similar to a small C++ struct.
The result type is a tagged union, comparable to a `std::variant` with a named discriminator.
The `kind` property identifies the result branch.
TypeScript types disappear during execution. Runtime checks must still validate external input.

JavaScript passes an object reference by value. The function's `pending.consumed` assignment changes the caller's object.
This resembles passing a pointer to a mutable C++ object, without manual memory management.
`const pending` prevents variable reassignment. It does not make the object's properties immutable.

The fixed `fakeState` makes the exercise repeatable. A live flow must use an unpredictable state bound to the initiating browser.
Expiry uses milliseconds. The fake clock makes boundary checks reproducible without waiting.
The callback result contains a synthetic code, but output prints only case labels.

The [Google web-server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server) explains state validation and authorization-code exchange.
Receiving a code does not prove successful token exchange, granted scopes, owner identity, or a linked Google Health account.

## Run and inspect

1. Open a terminal in the HealthCity project directory.
2. Run the following command.

```sh
node learning/oauth-callback/demo.mts
```

Expect eleven `PASS` lines and a final offline-completion message.
An assertion failure stops execution with a nonzero exit status.

The candidate route is `http://localhost:8787/auth/google/callback`.
It is only a string in this exercise. No port opens and no HTTP routing check occurs.
Keep the Console redirect URI unchanged until the local HTTP receiver is prepared and its port is confirmed.
The live authorization request and registered redirect URI must match exactly.

## Practice and next checkpoint

1. Find the assignment to `pending.consumed` in `callback.mts`.
2. Explain why the same pending object rejects the second callback.
3. Change the fake expiry to `now` in `createPending`.
4. Run the exercise again and inspect the failed success assertion.
5. Restore the original expiry before continuing.

Pause for questions before the next milestone.
The project now uses real HealthCity workflows for subsequent implementation and learning.
See the [project README](../../README.md) for the actual Worker and callback status.
This isolated exercise remains a reference for the small OAuth concept.
Account connection, token exchange, and health-data requests still require their applicable authorization.
No D1 database or schema is necessary for this exercise. Future testing must use D1 Free.
