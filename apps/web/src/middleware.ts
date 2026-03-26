import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

const COOKIE_NAME = process.env.NODE_ENV === "production"
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

/**
 * Hash IP for comparison (must match verify-otp/route.ts)
 */
function hashIp(ip: string): string {
  return createHash("sha256").update(ip + process.env.NEXTAUTH_SECRET).digest("hex").slice(0, 16);
}

/**
 * Get client IP from request headers
 */
function getClientIp(req: Request): string {
  // Vercel/Cloudflare set these headers
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") ||
                     req.nextUrl.pathname.startsWith("/register");
  const isApiRoute = req.nextUrl.pathname.startsWith("/api");
  const isPublicApiRoute = req.nextUrl.pathname.startsWith("/api/v1/tasks") ||
                           req.nextUrl.pathname.startsWith("/api/v1/auth/validate") ||
                           req.nextUrl.pathname.startsWith("/api/auth");

  // Allow public API routes (CLI endpoints and auth endpoints)
  if (isPublicApiRoute) {
    return NextResponse.next();
  }

  // Allow other API routes to handle their own auth
  if (isApiRoute) {
    return NextResponse.next();
  }

  // IP binding validation for logged-in users
  // Check if session's IP hash matches current request IP
  if (isLoggedIn && req.auth) {
    const token = req.auth as { ipHash?: string };
    if (token.ipHash) {
      const currentIp = getClientIp(req);
      const currentIpHash = hashIp(currentIp);

      // If IP doesn't match, invalidate session by clearing cookie and redirecting to login
      if (token.ipHash !== currentIpHash) {
        console.warn(`[SECURITY] IP mismatch detected. Session IP hash: ${token.ipHash}, Current IP hash: ${currentIpHash}`);
        const response = NextResponse.redirect(new URL("/login?error=session_expired", req.nextUrl));
        // Clear the session cookie
        response.cookies.delete(COOKIE_NAME);
        return response;
      }
    }
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  // Redirect unauthenticated users to login (except auth pages)
  if (!isLoggedIn && !isAuthPage) {
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
