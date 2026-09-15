import { NextResponse } from "next/server";
import { signOut } from "@/auth";

// signOut() alone only clears our session cookie — it doesn't end the Cognito
// Hosted UI session (or the Google session Cognito is tracking), so without this
// extra redirect a user could sign back in without being re-prompted.
export async function GET() {
  await signOut({ redirect: false });

  const domain = process.env.COGNITO_DOMAIN!.replace(/^https?:\/\//, "");
  const logoutUrl = new URL(`https://${domain}/logout`);
  logoutUrl.searchParams.set("client_id", process.env.AUTH_COGNITO_ID!);
  // NEXT_PUBLIC_DEPLOYMENT_URL, not request.url or a plain server-only env var:
  // on Amplify's SSR compute, request.url reflects the container's internal
  // address rather than the public domain (previously leaking into logout_uri
  // as https://localhost:3000/), and Amplify also doesn't reliably expose
  // Console-configured env vars to the Lambda at *request* time — only at
  // *build* time. The NEXT_PUBLIC_ prefix makes Next.js inline this as a
  // literal string during the build, sidestepping that unreliability entirely.
  logoutUrl.searchParams.set(
    "logout_uri",
    new URL("/", process.env.NEXT_PUBLIC_DEPLOYMENT_URL!).toString()
  );

  return NextResponse.redirect(logoutUrl);
}
