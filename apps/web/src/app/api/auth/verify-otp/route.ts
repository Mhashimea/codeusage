import { NextResponse } from "next/server";
import { db, verificationTokens, users, workspaceMembers } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { verifyOTP, sendWelcomeEmail, sendNewUserNotification } from "@/lib/email";
import { rateLimiters, getClientIp } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { createHash } from "crypto";
import type { MemberRole } from "@/lib/db/schema";

const MAX_ATTEMPTS = 5;
const SESSION_MAX_AGE_DAYS = 7; // Reduced from 30 days

const COOKIE_NAME = process.env.NODE_ENV === "production"
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

// Get the auth secret (supports both AUTH_SECRET and NEXTAUTH_SECRET)
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";

/**
 * Hash IP for storage in JWT (privacy-preserving)
 */
function hashIp(ip: string): string {
  return createHash("sha256").update(ip + AUTH_SECRET).digest("hex").slice(0, 16);
}

export async function POST(request: Request) {
  try {
    // IP-based rate limiting first
    const clientIp = getClientIp(request);
    const ipRateLimit = await rateLimiters.authByIp(clientIp);

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(ipRateLimit.retryAfter || 60) }
        }
      );
    }

    const body = await request.json();
    const { email, otp } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!otp || typeof otp !== "string") {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedOtp = otp.trim();

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(normalizedOtp)) {
      return NextResponse.json({ error: "Invalid verification code format" }, { status: 400 });
    }

    // Email-specific rate limiting for verification attempts
    const verifyRateLimit = await rateLimiters.verifyOtp(normalizedEmail);

    if (!verifyRateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please request a new code." },
        {
          status: 429,
          headers: { "Retry-After": String(verifyRateLimit.retryAfter || 60) }
        }
      );
    }

    // Find token for this email (not expired)
    const tokenRecord = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.email, normalizedEmail),
          gt(verificationTokens.expires_at, new Date())
        )
      )
      .limit(1);

    // Return same error for all failure cases (prevents enumeration)
    const genericError = { error: "Invalid or expired verification code" };

    if (tokenRecord.length === 0) {
      // No token found - add artificial delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 100));
      return NextResponse.json(genericError, { status: 400 });
    }

    const token = tokenRecord[0];

    // Check if max attempts exceeded
    if (token.attempts >= MAX_ATTEMPTS) {
      // Delete the token - user must request a new one
      await db.delete(verificationTokens).where(eq(verificationTokens.id, token.id));
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 400 }
      );
    }

    // Verify OTP using constant-time comparison (bcrypt.compare)
    const isValid = await verifyOTP(normalizedOtp, token.token_hash);

    if (!isValid) {
      // Increment attempt counter
      await db
        .update(verificationTokens)
        .set({ attempts: token.attempts + 1 })
        .where(eq(verificationTokens.id, token.id));

      const remainingAttempts = MAX_ATTEMPTS - token.attempts - 1;
      if (remainingAttempts <= 2) {
        return NextResponse.json(
          { error: `Invalid code. ${remainingAttempts} attempts remaining.` },
          { status: 400 }
        );
      }
      return NextResponse.json(genericError, { status: 400 });
    }

    // OTP verified! Delete the used token
    await db.delete(verificationTokens).where(eq(verificationTokens.id, token.id));

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    let userId: string;
    let userName: string;
    let isNewUser = false;

    if (existingUser.length === 0) {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          name: normalizedEmail.split("@")[0],
        })
        .returning();

      userId = newUser.id;
      userName = newUser.name || normalizedEmail.split("@")[0];
      isNewUser = true;

      // Send welcome email (non-blocking — don't delay login)
      sendWelcomeEmail(normalizedEmail, userName).catch((err) => {
        console.error("Failed to send welcome email:", err);
      });

      // Notify admin of new signup (non-blocking)
      sendNewUserNotification(normalizedEmail, userName, "email").catch((err) => {
        console.error("Failed to send admin notification:", err);
      });
    } else {
      userId = existingUser[0].id;
      userName = existingUser[0].name || normalizedEmail.split("@")[0];
    }

    // Check if user has any workspace memberships
    let workspaceId: string | null = null;
    let role: MemberRole | null = null;

    const membership = await db
      .select({
        workspace_id: workspaceMembers.workspace_id,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.user_id, userId))
      .limit(1);

    if (membership.length > 0) {
      workspaceId = membership[0].workspace_id;
      role = membership[0].role;
    }

    // Create JWT token with IP binding for session security
    const ipHash = hashIp(clientIp);
    const sessionMaxAge = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;

    const jwtToken = await encode({
      token: {
        email: normalizedEmail,
        name: userName,
        id: userId,
        workspaceId: workspaceId,
        role: role,
        ipHash: ipHash, // Bind session to IP (hashed for privacy)
      },
      secret: AUTH_SECRET,
      salt: COOKIE_NAME,
      maxAge: sessionMaxAge,
    });

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionMaxAge,
    });

    // Return success without revealing if user is new (prevents enumeration)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify OTP error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
