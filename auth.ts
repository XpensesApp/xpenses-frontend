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
    authorized({ auth }) {
      return !!auth;
    },
    // `account` is only populated on the initial sign-in (not on later
    // token refreshes), so this fires exactly once per login — provisioning
    // the user's backend record via the same Cognito ID token every other
    // backend call will use to authenticate. A failure here doesn't block
    // sign-in: the backend's own auth is idempotent, so the next call
    // (this one on the next login, or the backend's own auth middleware)
    // can still provision the user later.
    async jwt({ token, account }) {
      if (account?.id_token) {
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
  },
});
