/**
 * Auth middleware. Redirects unauthenticated users to /login,
 * and authenticated users away from /login. Auth API routes pass through.
 *
 * Checks two cookie names because HTTPS prefixes with `__Secure-`.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const sessionCookie =
    req.cookies.get("better-auth.session_token") ||
    req.cookies.get("__Secure-better-auth.session_token");

  const isLoggedIn = !!sessionCookie;
  const isOnLoginPage = req.nextUrl.pathname.startsWith("/login");
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");

  // Let Better Auth handle its own routes.
  if (isAuthRoute) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isOnLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isOnLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
