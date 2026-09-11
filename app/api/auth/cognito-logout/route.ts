import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/auth";

// signOut() alone only clears our session cookie — it doesn't end the Cognito
// Hosted UI session (or the Google session Cognito is tracking), so without this
// extra redirect a user could sign back in without being re-prompted.
export async function GET(request: NextRequest) {
  await signOut({ redirect: false });

  const domain = process.env.COGNITO_DOMAIN!.replace(/^https?:\/\//, "");
  const logoutUrl = new URL(`https://${domain}/logout`);
  logoutUrl.searchParams.set("client_id", process.env.AUTH_COGNITO_ID!);
  logoutUrl.searchParams.set("logout_uri", new URL("/", request.url).toString());

  return NextResponse.redirect(logoutUrl);
}
