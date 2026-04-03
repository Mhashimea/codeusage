import { NextRequest, NextResponse } from "next/server";
import { db, invitations, users, workspaces } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateOTP, hashOTP, sendOTPEmail } from "@/lib/email";
import { rateLimiters, getClientIp } from "@/lib/rate-limit";

// Store OTPs temporarily (in production, use Redis)
// Key: invitation_id, Value: { hash, expires, attempts }
const invitationOtps = new Map<string, { hash: string; expires: Date; attempts: number }>();

// Clean up expired OTPs periodically
setInterval(() => {
  const now = new Date();
  for (const [key, value] of invitationOtps.entries()) {
    if (value.expires < now) {
      invitationOtps.delete(key);
    }
  }
}, 60000); // Every minute

export { invitationOtps };

/**
 * POST /api/v1/invitations/send-otp
 * Send OTP to the invitation email for verification
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const clientIp = getClientIp(request);
    const ipRateLimit = await rateLimiters.authByIp(clientIp);

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ipRateLimit.retryAfter || 60) } }
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find the matching invitation
    const pendingInvitations = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.status, "pending"),
          gt(invitations.expires_at, new Date())
        )
      );

    let matchedInvitation = null;
    for (const inv of pendingInvitations) {
      const isValid = await bcrypt.compare(token, inv.token_hash);
      if (isValid) {
        matchedInvitation = inv;
        break;
      }
    }

    if (!matchedInvitation) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    const invitedEmail = matchedInvitation.email;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, invitedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      // User exists - they need to login instead
      return NextResponse.json({
        userExists: true,
        message: "An account exists for this email. Please sign in to accept the invitation.",
      });
    }

    // Rate limit OTP sending for this email
    const otpRateLimit = await rateLimiters.sendOtp(invitedEmail);
    if (!otpRateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(otpRateLimit.retryAfter || 60) } }
      );
    }

    // Generate and send OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    // Store OTP with 5-minute expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    invitationOtps.set(matchedInvitation.id, {
      hash: otpHash,
      expires: expiresAt,
      attempts: 0,
    });

    // Send OTP email
    const emailResult = await sendOTPEmail(invitedEmail, otp);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Failed to send verification code" },
        { status: 500 }
      );
    }

    // Get workspace name for response
    const [workspace] = await db
      .select({ name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, matchedInvitation.workspace_id))
      .limit(1);

    return NextResponse.json({
      success: true,
      otpSent: true,
      email: invitedEmail,
      workspaceName: workspace?.name || "Workspace",
    });
  } catch (error) {
    console.error("[POST /api/v1/invitations/send-otp] Error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
