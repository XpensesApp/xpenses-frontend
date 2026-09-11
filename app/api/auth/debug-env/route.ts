import { NextResponse } from "next/server";

// TEMPORARY — remove once we've confirmed Amplify's runtime env vars are
// wired up correctly. Reports presence/length only, never actual values.
// Lives under /api/auth/ specifically so proxy.ts's matcher (which excludes
// api/auth) doesn't block it — needed since auth doesn't work yet.
const REQUIRED_ENV_VARS = [
  "AUTH_COGNITO_ID",
  "AUTH_COGNITO_SECRET",
  "AUTH_COGNITO_ISSUER",
  "AUTH_SECRET",
  "AUTH_URL",
  "COGNITO_DOMAIN",
] as const;

export async function GET() {
  const status = Object.fromEntries(
    REQUIRED_ENV_VARS.map(key => {
      const value = process.env[key];
      return [key, { present: value != null && value !== "", length: value?.length ?? 0 }];
    })
  );

  console.log("[debug-env]", JSON.stringify(status));

  return NextResponse.json(status);
}
