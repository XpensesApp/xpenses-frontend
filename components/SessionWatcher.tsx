"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { isPublicPath } from "@/lib/public-routes";
import {
  getCurrentAuthToken,
  isReauthenticating,
  onReauthTriggered,
} from "@/lib/current-auth-token";

// A dead session (refresh token expired or revoked) is otherwise only caught
// reactively, the next time some page happens to call a backend service (on
// mount, or a save). That leaves a gap: an idle tab keeps showing stale data
// instead of signing out. This polls in the background so that gap doesn't
// depend on the user doing anything — getCurrentAuthToken() already forces a
// full reauth the moment it finds no usable session (and renews the ID token
// on the way when it merely expired), this just calls it on a timer instead
// of only when a request needs it.
const CHECK_INTERVAL_MS = 60_000;

export function SessionWatcher() {
  // Once any code path (this poll, a page's own data load, a hover-prefetch)
  // detects the token is dead, the actual redirect still takes a moment —
  // it's a full chain through Cognito's /logout and back, not instant. Until
  // it lands, this overlay covers the page instead of leaving whatever was
  // already rendered showing broken-looking zeroed/empty state underneath.
  const [reauthing, setReauthing] = useState(isReauthenticating);
  const isPublicPage = isPublicPath(usePathname());

  useEffect(() => {
    if (isPublicPage) return;

    const unsubscribe = onReauthTriggered(() => setReauthing(true));

    const interval = setInterval(() => {
      getCurrentAuthToken().catch(() => {});
    }, CHECK_INTERVAL_MS);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isPublicPage]);

  if (!reauthing || isPublicPage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Tu sesión expiró, inicia sesión nuevamente
      </div>
    </div>
  );
}
