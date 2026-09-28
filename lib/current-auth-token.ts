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
let cachedToken: Promise<string> | null = null;

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

/** Full logout (clears the local session and Cognito's/Google's hosted session too — see app/api/auth/cognito-logout/route.ts) rather than just discarding the stale token, so the user lands back on a real sign-in flow instead of silently failing requests. */
export function forceReauth(): never {
  if (typeof window !== "undefined") {
    window.location.href = "/api/auth/cognito-logout";
  }
  throw new Error("Session expired — signing out.");
}

export async function getCurrentAuthToken(): Promise<string> {
  if (!cachedToken) {
    cachedToken = getSession()
      .then(session => {
        const token = session?.idToken;
        if (!token) throw new Error("No authenticated session token available.");
        return token;
      })
      .catch(error => {
        cachedToken = null;
        throw error;
      });
  }

  const token = await cachedToken;
  if (isExpired(token)) forceReauth();
  return token;
}
