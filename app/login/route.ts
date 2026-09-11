import { NextRequest } from "next/server";
import { signIn } from "@/auth";

// Configured as auth.ts's pages.signIn target so unauthenticated requests land
// here instead of Auth.js's own generic provider-picker page, then get sent
// straight into Cognito's Hosted UI (which already lists Google + email/password).
export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") ?? "/";
  await signIn("cognito", { redirectTo: callbackUrl });
}
