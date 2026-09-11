import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
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
