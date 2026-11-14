// Learning exercise only. This module does not connect to Google.
export const CALLBACK_URI = "http://localhost:8787/auth/google/callback";

export type PendingAuthorization = {
  state: string;
  expiresAt: number;
  consumed: boolean;
};

type CallbackResult =
  | { kind: "code-received"; code: string }
  | { kind: "consent-denied" }
  | { kind: "rejected" };

export function inspectCallback(
  callbackUrl: string,
  pending: PendingAuthorization,
  now: number,
): CallbackResult {
  let url: URL;
  try {
    url = new URL(callbackUrl);
  } catch {
    return { kind: "rejected" };
  }

  const target = new URL(CALLBACK_URI);
  if (url.origin !== target.origin || url.pathname !== target.pathname ||
      url.hash || url.username || url.password) {
    return { kind: "rejected" };
  }

  const states = url.searchParams.getAll("state");
  if (pending.consumed || now >= pending.expiresAt ||
      !pending.state || states.length !== 1 || states[0] !== pending.state) {
    return { kind: "rejected" };
  }

  // A matching callback consumes this exercise's pending authorization.
  pending.consumed = true;
  const codes = url.searchParams.getAll("code");
  const errors = url.searchParams.getAll("error");
  if (codes.length === 1 && codes[0].trim() && errors.length === 0) {
    return { kind: "code-received", code: codes[0] };
  }
  if (codes.length === 0 && errors.length === 1 && errors[0] === "access_denied") {
    return { kind: "consent-denied" };
  }
  return { kind: "rejected" };
}
