import type { ResourcesConfig } from "aws-amplify";

// All NEXT_PUBLIC_ so Next.js inlines them at build time: Amplify Hosting does
// not reliably expose Console-configured env vars to the SSR runtime, but it
// always has them in the build container.
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
const deploymentUrl = process.env.NEXT_PUBLIC_DEPLOYMENT_URL;

if (!userPoolId || !userPoolClientId || !cognitoDomain || !deploymentUrl) {
  throw new Error(
    "Missing Cognito configuration: set NEXT_PUBLIC_COGNITO_USER_POOL_ID, NEXT_PUBLIC_COGNITO_CLIENT_ID, NEXT_PUBLIC_COGNITO_DOMAIN and NEXT_PUBLIC_DEPLOYMENT_URL (see .env.example)."
  );
}

// Must match the App Client's "Allowed callback URLs" / "Allowed sign-out
// URLs" exactly. The callback is a public page (excluded from proxy.ts) that
// finishes the OAuth code exchange in the browser.
export const SIGN_IN_CALLBACK_PATH = "/auth/callback";

export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      loginWith: {
        oauth: {
          domain: cognitoDomain.replace(/^https?:\/\//, ""),
          scopes: ["openid", "email", "profile"],
          redirectSignIn: [new URL(SIGN_IN_CALLBACK_PATH, deploymentUrl).toString()],
          redirectSignOut: [new URL("/", deploymentUrl).toString()],
          responseType: "code",
        },
      },
    },
  },
};
