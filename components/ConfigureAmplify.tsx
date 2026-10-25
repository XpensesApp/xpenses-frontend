"use client";

import { Amplify } from "aws-amplify";
// Registers the listener that exchanges the `?code=` Cognito sends back for
// tokens. The SDK only attaches it when something that pulls in
// signInWithRedirect is bundled on the page, and /auth/callback doesn't — so
// without this import the redirect is never completed.
import "aws-amplify/auth/enable-oauth-listener";
import { amplifyConfig } from "@/lib/amplify-config";

// Module scope on purpose: it has to run before any child effect, and before
// the OAuth listener checks the URL for the `?code=` that finishes a sign-in.
// `ssr: true` keeps the tokens in cookies so proxy.ts can read them.
Amplify.configure(amplifyConfig, { ssr: true });

export function ConfigureAmplify() {
  return null;
}
