import { NextResponse } from "next/server";
import { db, verificationTokens, workspaces } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { generateApiKey, hashApiKey } from "@/lib/api-key";
import { verifyOTP, sendWelcomeEmail } from "@/lib/email";
import { rateLimiters, getClientIp } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { createHash } from "crypto";

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

    // Check if user (workspace) exists
    const existingWorkspace = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.name, normalizedEmail))
      .limit(1);

    let workspaceId: string;
    let displayName: string;

    if (existingWorkspace.length === 0) {
      // Create new workspace for this user
      const apiKey = generateApiKey();
      const apiKeyHash = await hashApiKey(apiKey);
      const apiKeyPrefix = apiKey.slice(0, 12); // Store prefix for O(1) lookup

      const [newWorkspace] = await db
        .insert(workspaces)
        .values({
          name: normalizedEmail,
          display_name: normalizedEmail.split("@")[0],
          api_key_hash: apiKeyHash,
          api_key_prefix: apiKeyPrefix,
          plan: "free",
        })
        .returning();

      workspaceId = newWorkspace.id;
      displayName = newWorkspace.display_name || normalizedEmail.split("@")[0];

      // Send welcome email (non-blocking — don't delay login)
      sendWelcomeEmail(normalizedEmail, displayName).catch((err) => {
        console.error("Failed to send welcome email:", err);
      });
    } else {
      workspaceId = existingWorkspace[0].id;
      displayName = existingWorkspace[0].display_name || normalizedEmail.split("@")[0];
    }

    // Create JWT token with IP binding for session security
    const ipHash = hashIp(clientIp);
    const sessionMaxAge = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;

    const jwtToken = await encode({
      token: {
        email: normalizedEmail,
        name: displayName,
        id: workspaceId,
        workspaceId: workspaceId,
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
