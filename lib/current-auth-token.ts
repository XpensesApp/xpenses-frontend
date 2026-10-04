import { getSession } from "next-auth/react";

// The backend's /transactions and /subscriptions are now behind a Cognito
// Lambda Authorizer: every request needs Authorization: Bearer <token>, and
// the caller's identity is derived from the verified token — no more
// `email` field on requests.
//
// getSession() always does a fresh fetch to /api/auth/session — memoized
// here so every backend call isn't paying for that round-trip on top of the
// actual request. The token itself never changes after sign-in (see auth.ts's
// caveat about it not being refreshed), so caching the session fetch is safe
// — but the token still expires (~1h, per Cognito's default App Client
// setting) while the app's own session lasts much longer, so every call
// below re-checks expiry against the cached value rather than trusting it
// forever.
let cachedToken: Promise<string | undefined> | null = null;

/** Cognito ID tokens are JWTs; decoding (not verifying) the payload locally is enough to read `exp` — the backend still verifies the signature on every request. */
function isExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp !== "number" || json.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

// A page typically fires several independent calls at once (e.g. the
// movements page's Promise.all of four stores' loads, each hitting an
// expired token), plus the background SessionWatcher poll and the Navbar's
// hover-prefetch — all of which can detect the same expired token within
// moments of each other. Without this guard, each one independently
// re-triggers the redirect; the window.location.href assignment is harmless
// to repeat, but the resulting pile of concurrent rejected promises is what
// produced the "spinner / 0 / spinner" flicker — nothing coordinated "we're
// already leaving" with the rest of the app, so every caller kept rendering
// its own (broken-looking, all-zero) fallback state in the meantime.
let reauthing = false;
const reauthListeners = new Set<() => void>();

/** Subscribes to the moment a forced reauth is triggered — used by SessionWatcher to show a "signing out" overlay immediately, instead of leaving whatever page is up rendering its normal (now-empty/zeroed) state while the redirect is in flight. */
export function onReauthTriggered(listener: () => void): () => void {
  reauthListeners.add(listener);
  return () => reauthListeners.delete(listener);
}

export function isReauthenticating(): boolean {
  return reauthing;
}

/** Full logout (clears the local session and Cognito's/Google's hosted session too — see app/api/auth/cognito-logout/route.ts) rather than just discarding the stale token, so the user lands back on a real sign-in flow instead of silently failing requests. */
export function forceReauth(): never {
  if (!reauthing) {
    reauthing = true;
    reauthListeners.forEach(listener => listener());
    if (typeof window !== "undefined") {
      window.location.href = "/api/auth/cognito-logout";
    }
  }
  throw new Error("Session expired — signing out.");
}

export async function getCurrentAuthToken(): Promise<string> {
  // Already leaving — don't bother re-fetching the session or re-decoding
  // the token, just keep every caller from proceeding until the redirect
  // actually lands.
  if (reauthing) forceReauth();

  if (!cachedToken) {
    // Only a genuine failure to reach /api/auth/session (network blip) resets
    // the cache for a retry — a session that resolves without an idToken is a
    // real "not usable" outcome, not a transient one, so it falls through to
    // the same forced-reauth path as an expired token below.
    cachedToken = getSession()
      .then(session => session?.idToken)
      .catch(error => {
        cachedToken = null;
        throw error;
      });
  }

  const token = await cachedToken;
  if (!token || isExpired(token)) forceReauth();
  return token;
}
