import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  // Auth.js normally auto-derives this from AUTH_URL being present in
  // process.env (or from platform-specific env vars like VERCEL/CF_PAGES),
  // but AWS Amplify's SSR compute doesn't reliably expose Console-configured
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
  },
});
