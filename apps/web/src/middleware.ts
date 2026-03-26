import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Public routes - no auth required
  const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/privacy" || pathname === "/terms";
  const isAuthPage = pathname === "/login";
  const isApiRoute = pathname.startsWith("/api");
  const isPublicApiRoute =
    pathname.startsWith("/api/v1/tasks") ||
    pathname.startsWith("/api/v1/auth/validate") ||
    pathname.startsWith("/api/auth");

  // Allow public API routes (CLI endpoints and auth endpoints)
  if (isPublicApiRoute) {
    return NextResponse.next();
  }

  // Allow other API routes to handle their own auth
  if (isApiRoute) {
    return NextResponse.next();
  }

  // Allow public pages
  if (isPublicPage && !isLoggedIn) {
    return NextResponse.next();
  }

  // Redirect logged-in users from auth pages to dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Redirect logged-in users from landing page to dashboard
  if (isLoggedIn && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Redirect unauthenticated users from protected routes to login
  if (!isLoggedIn && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
