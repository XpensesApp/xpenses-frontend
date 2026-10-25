import { fetchAuthSession, signOut } from "aws-amplify/auth";

// The backend's /transactions, /subscriptions and /accounts sit behind a
// Cognito Lambda Authorizer: every request needs Authorization: Bearer <token>,
// and the caller's identity is derived from the verified token.
//
// fetchAuthSession() hands back the stored ID token and, when it has expired,
// renews it through the refresh token first (concurrent renewals are
// de-duplicated by Amplify), so callers always get a usable token until the
// refresh token itself dies. Only then does the user have to sign in again.

// A page typically fires several independent calls at once (e.g. the
// movements page's Promise.all of four stores' loads), plus the background
// SessionWatcher poll and the Navbar's hover-prefetch — all of which can find
// the session dead within moments of each other. This flag coordinates "we're
// already leaving" so only the first starts the sign-out, and the rest of the
// app stops rendering broken-looking fallback state meanwhile.
let reauthing = false;
const reauthListeners = new Set<() => void>();

// Safety net against a sign-in loop: if the backend keeps answering 401 for
// the token a fresh login produced (e.g. a misconfigured App Client), signing
// out again would bounce the user through Cognito forever. localStorage so the
// guard also holds across tabs.
const LAST_REAUTH_KEY = "xpenses.lastReauthAt";
const REAUTH_COOLDOWN_MS = 120_000;

function reauthedRecently(): boolean {
  try {
    const startedAt = Number(localStorage.getItem(LAST_REAUTH_KEY));
    return Number.isFinite(startedAt) && Date.now() - startedAt < REAUTH_COOLDOWN_MS;
  } catch {
    return false;
  }
}

/** Subscribes to the moment a forced reauth starts — used by SessionWatcher to show a "session expired" overlay immediately, instead of leaving whatever page is up rendering its normal (now-empty/zeroed) state while the redirect is in flight. */
export function onReauthTriggered(listener: () => void): () => void {
  reauthListeners.add(listener);
  return () => reauthListeners.delete(listener);
}

export function isReauthenticating(): boolean {
  return reauthing;
}

/** Full sign-out (local tokens and Cognito's hosted session — the redirect lands back on the app, which then sends the user to the login) rather than only discarding the stale token, so the user ends up on a real sign-in flow instead of silently failing requests. */
export function forceReauth(): never {
  if (!reauthing && !reauthedRecently()) {
    reauthing = true;
    try {
      localStorage.setItem(LAST_REAUTH_KEY, String(Date.now()));
    } catch {}
    reauthListeners.forEach(listener => listener());

    // signOut() only navigates away when the session came from the hosted UI;
    // otherwise it resolves in place, so fall back to the login page. The
    // timer dies with the page when the hosted-UI redirect does happen.
    const goToLogin = () => {
      window.location.href = "/login";
    };
    console.error("[auth] No usable session (or the backend rejected the token): signing out to sign in again");
    signOut().then(
      () => setTimeout(goToLogin, 5_000),
      error => {
        console.error("[auth] signOut failed, going straight to the login page:", error);
        goToLogin();
      }
    );
  } else if (!reauthing) {
    console.error(
      "[auth] Session is unusable but a sign-out already ran in the last 2 minutes; not repeating it (is the backend rejecting the new token?)"
    );
  }
  throw new Error("Session expired — signing in again.");
}

export async function getCurrentAuthToken(): Promise<string> {
  // Already leaving — keep every caller from proceeding until the redirect lands.
  if (reauthing) forceReauth();

  let token: string | undefined;
  try {
    const { tokens } = await fetchAuthSession();
    token = tokens?.idToken?.toString();
  } catch (error) {
    console.error("[auth] fetchAuthSession failed:", error);
    // A network blip while renewing says nothing about the session itself.
    if (error instanceof Error && error.name === "NetworkError") throw error;
  }

  if (!token) forceReauth();
  return token;
}
