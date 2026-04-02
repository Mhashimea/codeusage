import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, invitations } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const INVITATION_EXPIRY_DAYS = 7;

/**
 * DELETE /api/v1/invitations/[id]
 * Revoke an invitation (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify invitation belongs to this workspace
    const invitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, id),
          eq(invitations.workspace_id, session.user.workspaceId)
        )
      )
      .limit(1);

    if (invitation.length === 0) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Update status to revoked
    await db
      .update(invitations)
      .set({ status: "revoked" })
      .where(eq(invitations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/v1/invitations/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to revoke invitation" }, { status: 500 });
  }
}

/**
 * POST /api/v1/invitations/[id]/resend
 * Resend an invitation (Admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify invitation belongs to this workspace and is pending
    const invitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, id),
          eq(invitations.workspace_id, session.user.workspaceId),
          eq(invitations.status, "pending")
        )
      )
      .limit(1);

    if (invitation.length === 0) {
      return NextResponse.json({ error: "Invitation not found or not pending" }, { status: 404 });
    }

    // Generate new token and extend expiry
    const token = randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    await db
      .update(invitations)
      .set({
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .where(eq(invitations.id, id));

    // TODO: Resend invitation email
    // await sendInvitationEmail(...)

    return NextResponse.json({
      success: true,
      inviteUrl: `/invite/${token}`,
    });
  } catch (error) {
    console.error("[POST /api/v1/invitations/[id]/resend] Error:", error);
    return NextResponse.json({ error: "Failed to resend invitation" }, { status: 500 });
  }
}
