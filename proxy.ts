import { NextResponse, type NextRequest } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/amplify-server";

// Gate only: it checks that the cookies hold a session Amplify can use,
// refreshing the tokens through the refresh token when the ID token expired
// (the renewed cookies ride on `response`). The backend still verifies every
// token's signature on each API call.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async contextSpec => {
      try {
        const session = await fetchAuthSession(contextSpec);
        return !!session.tokens?.idToken;
      } catch (error) {
        console.error("[auth] Could not read the session in proxy.ts:", error);
        return false;
      }
    },
  });

  if (authenticated) return response;

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|auth/callback|_next/static|_next/image|favicon.ico).*)"],
};
