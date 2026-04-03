import { NextRequest, NextResponse } from "next/server";
import { db, invitations, users, workspaceMembers } from "@/lib/db";
import { eq, and, gt, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { verifyOTP, sendWelcomeEmail, sendNewUserNotification } from "@/lib/email";
import { rateLimiters, getClientIp } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { createHash } from "crypto";
import type { MemberRole } from "@/lib/db/schema";
import { invitationOtps } from "../send-otp/route";

const MAX_OTP_ATTEMPTS = 5;
const SESSION_MAX_AGE_DAYS = 7;

const COOKIE_NAME = process.env.NODE_ENV === "production"
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";

function hashIp(ip: string): string {
  return createHash("sha256").update(ip + AUTH_SECRET).digest("hex").slice(0, 16);
}

/**
 * POST /api/v1/invitations/verify-and-accept
 * Verify OTP and accept invitation (for new users)
 */
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    // Rate limit by IP
    const ipRateLimit = await rateLimiters.authByIp(clientIp);
    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ipRateLimit.retryAfter || 60) } }
      );
    }

    const body = await request.json();
    const { token, otp, name } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!otp || typeof otp !== "string") {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
    }

    // Validate OTP format
    const normalizedOtp = otp.trim();
    if (!/^\d{6}$/.test(normalizedOtp)) {
      return NextResponse.json({ error: "Invalid verification code format" }, { status: 400 });
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

    // Get stored OTP for this invitation
    const storedOtp = invitationOtps.get(matchedInvitation.id);

    if (!storedOtp) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new code." },
        { status: 400 }
      );
    }

    // Check if OTP expired
    if (storedOtp.expires < new Date()) {
      invitationOtps.delete(matchedInvitation.id);
      return NextResponse.json(
        { error: "Verification code expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Check max attempts
    if (storedOtp.attempts >= MAX_OTP_ATTEMPTS) {
      invitationOtps.delete(matchedInvitation.id);
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValidOtp = await verifyOTP(normalizedOtp, storedOtp.hash);

    if (!isValidOtp) {
      // Increment attempts
      storedOtp.attempts += 1;
      invitationOtps.set(matchedInvitation.id, storedOtp);

      const remainingAttempts = MAX_OTP_ATTEMPTS - storedOtp.attempts;
      if (remainingAttempts <= 2) {
        return NextResponse.json(
          { error: `Invalid code. ${remainingAttempts} attempts remaining.` },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // OTP verified - clean up
    invitationOtps.delete(matchedInvitation.id);

    const invitedEmail = matchedInvitation.email;

    // Double-check user doesn't exist (race condition protection)
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, invitedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "An account already exists for this email. Please sign in instead." },
        { status: 400 }
      );
    }

    // Create user
    const userName = name?.trim() || invitedEmail.split("@")[0];
    const [newUser] = await db
      .insert(users)
      .values({
        email: invitedEmail,
        name: userName,
        current_workspace_id: matchedInvitation.workspace_id,
      })
      .returning();

    // Add user to workspace
    await db.insert(workspaceMembers).values({
      workspace_id: matchedInvitation.workspace_id,
      user_id: newUser.id,
      role: matchedInvitation.role,
      invited_by: matchedInvitation.invited_by,
    });

    // Mark invitation as accepted
    await db
      .update(invitations)
      .set({ status: "accepted" })
      .where(eq(invitations.id, matchedInvitation.id));

    // Send welcome email (non-blocking)
    sendWelcomeEmail(invitedEmail, userName).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

    // Get total user count and notify admin (non-blocking)
    db.select({ count: count() })
      .from(users)
      .then(([userCount]) => {
        const totalUsers = Number(userCount?.count) || 1;
        sendNewUserNotification(invitedEmail, userName, "email", totalUsers).catch((err) => {
          console.error("Failed to send admin notification:", err);
        });
      })
      .catch((err) => {
        console.error("Failed to get user count:", err);
      });

    // Create JWT session
    const ipHash = hashIp(clientIp);
    const sessionMaxAge = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;

    const jwtToken = await encode({
      token: {
        email: invitedEmail,
        name: userName,
        id: newUser.id,
        workspaceId: matchedInvitation.workspace_id,
        role: matchedInvitation.role as MemberRole,
        ipHash: ipHash,
      },
      secret: AUTH_SECRET,
      salt: COOKIE_NAME,
      maxAge: sessionMaxAge,
    });

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionMaxAge,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/v1/invitations/verify-and-accept] Error:", error);
    return NextResponse.json({ error: "Failed to verify and accept invitation" }, { status: 500 });
  }
}
