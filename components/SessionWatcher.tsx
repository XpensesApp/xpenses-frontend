"use client";

import { useEffect } from "react";
import { getCurrentAuthToken } from "@/lib/current-auth-token";

// Expiry is otherwise only caught reactively, the next time some page
// happens to call a transactions/subscriptions service (on mount, or a
// save). That leaves a gap: an idle tab past the token's ~1h lifetime keeps
// showing stale data instead of signing out. This polls in the background so
// that gap doesn't depend on the user doing anything — getCurrentAuthToken()
// already forces a full reauth redirect the moment it finds the token
// missing or expired, this just calls it on a timer instead of only when a
// request needs it.
const CHECK_INTERVAL_MS = 60_000;

export function SessionWatcher() {
  useEffect(() => {
    const interval = setInterval(() => {
      getCurrentAuthToken().catch(() => {});
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
