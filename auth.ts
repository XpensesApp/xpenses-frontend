import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  // Auth.js normally auto-derives this from an env var literally named
  // AUTH_URL (or from platform-specific ones like VERCEL/CF_PAGES) — that's
  // an @auth/core convention, not something we control by naming our own
  // var. We don't set AUTH_URL at all (our own NEXT_PUBLIC_DEPLOYMENT_URL var
  // is unrelated and only read directly by cognito-logout/route.ts), and even
  // when we did,
  // AWS Amplify's SSR compute didn't reliably expose Console-configured
  // environment variables to the Lambda at request time the way it does at
  // build time — trustHost ended up false there even with AUTH_URL set,
  // throwing "UntrustedHost". Setting it explicitly removes the dependency
  // on that auto-detection working correctly on any given host.
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
