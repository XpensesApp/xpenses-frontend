import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /** Cognito ID token from sign-in, sent as a Bearer token to the backend. See auth.ts's jwt/session callbacks. */
    idToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    idToken?: string;
  }
}
