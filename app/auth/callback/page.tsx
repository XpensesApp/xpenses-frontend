"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2Icon } from "lucide-react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { Button } from "@/components/ui/button";
import { consumePostLoginTarget } from "@/lib/post-login-redirect";

const SYNC_URL = process.env.NEXT_PUBLIC_AUTH_SYNC_API_BASE_URL;
const COMPLETION_TIMEOUT_MS = 20_000;

// Idempotent get-or-create of the user's backend record (and its default
// account), required after every login. A failure doesn't block signing in:
// the call is repeated on the next login.
async function syncUser() {
  if (!SYNC_URL) return;

  try {
    const { tokens } = await fetchAuthSession();
    if (!tokens?.idToken) {
      console.error("[auth] User sync skipped: signed in but no ID token available");
      return;
    }

    const res = await fetch(SYNC_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.idToken}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.error(`[auth] User sync failed: ${res.status} ${res.statusText}`, await res.text());
    }
  } catch (error) {
    console.error("[auth] User sync failed:", error);
  }
}

// What Cognito put in the redirect URL, without the single-use `code`/`state` values.
function describeRedirectUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    hasCode: params.has("code"),
    hasState: params.has("state"),
    error: params.get("error"),
    errorDescription: params.get("error_description"),
  };
}

// Cognito redirects here with `?code=`. Amplify exchanges it for tokens on its
// own as soon as it's configured (components/ConfigureAmplify.tsx); this page
// only waits for that to finish, then hands over to the app with a full
// navigation so the server sees the freshly written token cookies.
export default function AuthCallbackPage() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let finished = false;
    // The SDK clears the URL once the exchange completes, so capture it first.
    const redirectInfo = describeRedirectUrl();

    async function finish() {
      if (finished) return;
      finished = true;
      await syncUser();
      window.location.replace(consumePostLoginTarget());
    }

    const stopListening = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signInWithRedirect") void finish();
      if (payload.event === "signInWithRedirect_failure") {
        console.error("[auth] Sign-in exchange failed:", payload.data, redirectInfo);
        setFailed(true);
      }
    });

    // The exchange may have completed before this listener existed.
    getCurrentUser().then(finish, () => {});

    const timeout = setTimeout(() => {
      if (finished) return;
      console.error(
        `[auth] Sign-in did not complete within ${COMPLETION_TIMEOUT_MS / 1000}s: no success or failure event from Amplify`,
        redirectInfo
      );
      setFailed(true);
    }, COMPLETION_TIMEOUT_MS);

    return () => {
      stopListening();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      {failed ? (
        <div className="flex flex-col items-center gap-3 text-sm">
          <p className="text-destructive">No se pudo completar el inicio de sesión.</p>
          <Button asChild>
            <Link href="/login">Volver a intentar</Link>
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Iniciando sesión...
        </div>
      )}
    </main>
  );
}
