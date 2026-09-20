import { getSession } from "next-auth/react";

// The backend is currently unprotected: requests identify whose data they
// touch via an `email` field, instead of a JWT. This is temporary (see the
// .env.example notes) — swapping it for a bearer token later should only
// touch the services that call this.
//
// getSession() always does a fresh fetch to /api/auth/session — memoized
// here so every backend call isn't paying for that round-trip on top of the
// actual request. Safe to cache for the page's lifetime: the signed-in email
// can't change without a full sign-out (navigates away) or sign-in (reloads
// the page).
let cachedEmail: Promise<string> | null = null;

export async function getCurrentEmail(): Promise<string> {
  if (!cachedEmail) {
    cachedEmail = getSession()
      .then(session => {
        const email = session?.user?.email;
        if (!email) throw new Error("No authenticated user email available.");
        return email;
      })
      .catch(error => {
        cachedEmail = null;
        throw error;
      });
  }
  return cachedEmail;
}
