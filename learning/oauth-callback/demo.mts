import assert from "node:assert/strict";
import { CALLBACK_URI, inspectCallback } from "./callback.mts";
import type { PendingAuthorization } from "./callback.mts";

// All values are synthetic. No credentials, network requests, or server exist here.
const now = 1_000;
const fakeState = "synthetic-state-for-local-practice";
function createPending(): PendingAuthorization {
  return { state: fakeState, expiresAt: now + 60_000, consumed: false };
}

function makeCallback(parameters: Record<string, string>): string {
  const url = new URL(CALLBACK_URI);
  url.search = new URLSearchParams(parameters).toString();
  return url.toString();
}

const successUrl = makeCallback({ state: fakeState, code: "synthetic-code" });
const pending = createPending();
const accepted = inspectCallback(successUrl, pending, now);
assert.deepEqual(accepted, { kind: "code-received", code: "synthetic-code" });
assert.equal(pending.consumed, true);
console.log("PASS: A matching callback returns a synthetic code.");

assert.equal(inspectCallback(successUrl, pending, now).kind, "rejected");
console.log("PASS: A repeated callback is rejected.");

const cases = [
  ["Consent denial", makeCallback({ state: fakeState, error: "access_denied" }), "consent-denied"],
  ["Wrong state", makeCallback({ state: "wrong-state", code: "synthetic-code" }), "rejected"],
  ["Missing state", makeCallback({ code: "synthetic-code" }), "rejected"],
  ["Duplicate state", `${successUrl}&state=${fakeState}`, "rejected"],
  ["Conflicting result", `${successUrl}&error=access_denied`, "rejected"],
  ["Empty code", makeCallback({ state: fakeState, code: "" }), "rejected"],
  ["Wrong route", successUrl.replace("/auth/google/callback", "/other"), "rejected"],
  ["Invalid URL", "invalid-url", "rejected"],
] as const;

for (const [label, url, expectedKind] of cases) {
  assert.equal(inspectCallback(url, createPending(), now).kind, expectedKind);
  console.log(`PASS: ${label}.`);
}

const expired = createPending();
assert.equal(inspectCallback(successUrl, expired, expired.expiresAt).kind, "rejected");
console.log("PASS: An expired authorization is rejected.");
console.log("Offline exercise complete. No Google account is connected.");
