"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { signInWithRedirect, signOut } from "aws-amplify/auth";
import { Button } from "@/components/ui/button";
import { rememberPostLoginTarget } from "@/lib/post-login-redirect";

async function startSignIn(onError: (message: string) => void) {
  rememberPostLoginTarget(new URLSearchParams(window.location.search).get("callbackUrl"));

  try {
    await signInWithRedirect();
  } catch (error) {
    if (error instanceof Error && error.name === "UserAlreadyAuthenticatedException") {
      // The browser still holds a session that the server turned down: clear
      // it completely (Cognito's too) and come back through here.
      console.error("[auth] Browser holds a session the server rejected; signing out to start over:", error);
      await signOut();
      return;
    }
    console.error("[auth] signInWithRedirect failed:", error);
    onError("No se pudo iniciar sesión. Intenta de nuevo.");
  }
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void startSignIn(setError);
  }, []);

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      {error ? (
        <div className="flex flex-col items-center gap-3 text-sm">
          <p className="text-destructive">{error}</p>
          <Button
            onClick={() => {
              setError(null);
              void startSignIn(setError);
            }}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Redirigiendo al inicio de sesión...
        </div>
      )}
    </main>
  );
}
