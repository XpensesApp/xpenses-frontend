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
  // AUTH_URL (not request.url) — on Amplify's SSR compute the Host the server
  // sees is the container's internal address, not the public domain, which
  // previously leaked into logout_uri as https://localhost:3000/.
  logoutUrl.searchParams.set("logout_uri", new URL("/", process.env.AUTH_URL!).toString());

  return NextResponse.redirect(logoutUrl);
}
