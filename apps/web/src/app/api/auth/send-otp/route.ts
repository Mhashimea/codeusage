import { NextResponse } from "next/server";
import { db, verificationTokens } from "@/lib/db";
import { generateOTP, hashOTP, sendOTPEmail } from "@/lib/email";
import { rateLimiters, getClientIp } from "@/lib/rate-limit";
import { eq, sql } from "drizzle-orm";

const MAX_OTP_ATTEMPTS = 5;
const OTP_EXPIRY_MINUTES = 5;

export async function POST(request: Request) {
  try {
    // IP-based rate limiting first (protects against distributed attacks)
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
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Email-specific rate limiting (prevents email bombing)
    const emailRateLimit = await rateLimiters.sendOtp(normalizedEmail);

    if (!emailRateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${emailRateLimit.retryAfter} seconds.` },
        {
          status: 429,
          headers: { "Retry-After": String(emailRateLimit.retryAfter || 60) }
        }
      );
    }

    // Delete any existing tokens for this email (cleanup)
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.email, normalizedEmail));

    // Generate and hash OTP (never store plaintext!)
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save hashed token to database
    await db.insert(verificationTokens).values({
      email: normalizedEmail,
      token_hash: otpHash,
      attempts: 0,
      expires_at: expiresAt,
    });

    // Send email with plaintext OTP
    const result = await sendOTPEmail(normalizedEmail, otp);

    if (!result.success) {
      // Clean up on failure
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.email, normalizedEmail));

      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    // Return consistent response (prevents email enumeration)
    return NextResponse.json({ success: true });
  } catch (error) {
    // Don't log sensitive info, sanitize error
    console.error("Send OTP error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// Cleanup expired tokens - can be called by cron job
export async function DELETE() {
  try {
    const result = await db
      .delete(verificationTokens)
      .where(sql`${verificationTokens.expires_at} < NOW()`);

    return NextResponse.json({ success: true, message: "Expired tokens cleaned up" });
  } catch (error) {
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
