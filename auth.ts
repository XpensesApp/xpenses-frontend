import { createHash } from "crypto";
import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";

// AUTH_URL is the env var name @auth/core specifically auto-reads for its own
// base URL — but reading it as a plain runtime var doesn't work reliably here:
// AWS Amplify's SSR compute doesn't consistently expose Console-configured
// env vars to the Lambda at request time the way it does at build time. That
// unreliability previously caused "UntrustedHost" (worked around below with
// trustHost) and, worse, made Auth.js reconstruct the OAuth callback's
// redirect_uri from the incoming request's Host header — which on this
// platform is the container's internal address, not the public domain. Cognito
// then rejects the token exchange (`invalid_redirect`) because that redirect_uri
// doesn't match the one used in the original /authorize request. Seeding
// AUTH_URL from NEXT_PUBLIC_DEPLOYMENT_URL sidesteps this: NEXT_PUBLIC_ vars
// are inlined as literal strings at build time, so this value is immune to
// Amplify's runtime env-delivery flakiness.
process.env.AUTH_URL ??= process.env.NEXT_PUBLIC_DEPLOYMENT_URL;

// TEMPORARY diagnostic for a production bug: the OAuth callback intermittently
// fails to decrypt the PKCE cookie with Auth.js's InvalidCheck error, but only
// after a long-idle auto-logout (never a manual one) — i.e. only when a
// Lambda container has likely gone cold in between. The #1 known cause of
// InvalidCheck on serverless deployments is AUTH_SECRET not being identical
// across every container. This logs a short hash (never the secret itself)
// plus when this module was (re-)evaluated, so CloudWatch logs around a
// repro can show whether the container that set the PKCE cookie (handling
// `/login`) and the one that read it back (the callback) agree. Remove once
// resolved.
console.log(
  `[auth-debug] module evaluated at ${new Date().toISOString()}, AUTH_SECRET hash=${
    process.env.AUTH_SECRET
      ? createHash("sha256").update(process.env.AUTH_SECRET).digest("hex").slice(0, 8)
      : "MISSING"
  }`
);

function isIdTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  // Kept as a fallback for any path not covered by the explicit AUTH_URL set
  // above — harmless now that AUTH_URL is reliably populated.
  trustHost: true,
  providers: [
    Cognito({
      // Cognito re-mints its own ID token after federating through Google and
      // always stamps a "nonce" claim onto it, but Auth.js's default checks
      // for this provider are just ["pkce"] — no nonce is ever generated or
      // expected, so the validator compares the claim against `undefined`
      // and throws "unexpected ID Token nonce claim value". Enabling the
      // nonce check makes Auth.js actually generate/track one to match.
      checks: ["pkce", "nonce"],
    }),
  ],
  // Skips Auth.js's own multi-provider picker page and goes straight to
  // Cognito's Hosted UI (app/login/route.ts) — there's only one provider,
  // and Cognito's own page already offers Google + email/password.
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // The session cookie outlives the Cognito ID token it carries (Auth.js
    // default ~30 days vs. the token's ~1h). Treating "has a cookie" as
    // authenticated let an expired-token session through the proxy, where the
    // client would detect the dead token, bounce through Cognito's logout, and
    // land back on a page the proxy still considered signed in — an endless
    // "Tu sesión expiró" loop. Checking expiry here sends such requests to
    // /login for a fresh token instead.
    authorized({ auth }) {
      return !!auth?.idToken && !isIdTokenExpired(auth.idToken);
    },
    // `account` is only populated on the initial sign-in (not on later
    // token refreshes), so this block runs exactly once per login. It both
    // provisions the user's backend record and persists the ID token onto
    // the session's JWT, so client code (transactions/subscriptions
    // services) can read it later via getSession()/useSession() to send as
    // a Bearer token — the backend's CognitoAuthorizer requires one on every
    // request now, and derives the caller's identity from it directly (no
    // more `email` field on requests). A sync failure here doesn't block
    // sign-in: the backend's own auth is idempotent, so the next call (this
    // one on the next login, or the backend's own auth middleware) can
    // still provision the user later.
    //
    // Caveat: this is the token from the moment of sign-in, not refreshed
    // afterward — Cognito ID tokens are typically short-lived (~1h), while
    // the app's own session lasts much longer, so API calls can start
    // 401ing well before the user is prompted to sign in again. No refresh
    // flow is implemented yet.
    async jwt({ token, account }) {
      if (account?.id_token) {
        token.idToken = account.id_token;
        try {
          await fetch(process.env.AUTH_SYNC_API_BASE_URL!, {
            method: "POST",
            headers: { Authorization: `Bearer ${account.id_token}` },
          });
        } catch (error) {
          console.error("Failed to sync user with backend:", error);
        }
      }
      return token;
    },
    session({ session, token }) {
      session.idToken = token.idToken;
      return session;
    },
  },
});
