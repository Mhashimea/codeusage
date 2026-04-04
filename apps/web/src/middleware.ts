import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const hasWorkspace = !!req.auth?.user?.workspaceId;

  // Public routes that don't require auth
  const isPublicRoute = pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/cli/connect") || // CLI browser auth - handles its own redirects
    pathname === "/docs" ||
    pathname === "/privacy" ||
    pathname === "/terms";

  // Workspace creation route
  const isWorkspaceCreate = pathname === "/workspace/create";

  // Dashboard routes that require workspace
  const isAppRoute = pathname.startsWith("/app");

  // API routes (except auth) that require workspace
  const isApiRoute = pathname.startsWith("/api/v1") && !pathname.startsWith("/api/v1/workspaces/create");

  // If not logged in and trying to access protected route
  if (!isLoggedIn && (isAppRoute || isWorkspaceCreate)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // If logged in but no workspace
  if (isLoggedIn && !hasWorkspace) {
    // Allow workspace creation page
    if (isWorkspaceCreate) {
      return NextResponse.next();
    }
    // Redirect to workspace creation for app routes
    if (isAppRoute) {
      return NextResponse.redirect(new URL("/workspace/create", req.url));
    }
  }

  // If logged in with workspace, redirect away from workspace create
  if (isLoggedIn && hasWorkspace && isWorkspaceCreate) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  // If logged in and on login page, redirect to app
  if (isLoggedIn && pathname === "/login") {
    if (hasWorkspace) {
      return NextResponse.redirect(new URL("/app", req.url));
    } else {
      return NextResponse.redirect(new URL("/workspace/create", req.url));
    }
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
