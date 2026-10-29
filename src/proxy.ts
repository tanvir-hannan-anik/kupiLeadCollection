import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * Bounces visitors without a valid admin JWT away from /admin. This is an
 * optimistic check — every admin page, server action and API route re-verifies
 * the token and that the admin still exists.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin");
  const signedIn = Boolean(await verifySession(request.cookies.get(SESSION_COOKIE)?.value));

  if (!signedIn && !isLoginPage) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    if (pathname !== "/admin") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Already signed in → skip the login form. But not when the server sent us
  // here because it rejected the session (revoked token, removed admin, or the
  // database didn't answer): the signature alone looks valid, so bouncing back
  // would loop forever.
  if (signedIn && isLoginPage && !request.nextUrl.searchParams.has("error")) {
    return NextResponse.redirect(new URL("/admin/leads", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
