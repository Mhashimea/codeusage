import { NextRequest, NextResponse } from "next/server";
import { db, invitations, workspaces, users } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * GET /api/v1/invitations/verify?token=...
 * Verify an invitation token and return details
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find all pending, non-expired invitations and check token
    const pendingInvitations = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        token_hash: invitations.token_hash,
        workspace_id: invitations.workspace_id,
        invited_by: invitations.invited_by,
      })
      .from(invitations)
      .where(
        and(
          eq(invitations.status, "pending"),
          gt(invitations.expires_at, new Date())
        )
      );

    // Find the matching invitation by verifying token hash
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

    // Get workspace and inviter details
    const [workspace] = await db
      .select({ name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, matchedInvitation.workspace_id))
      .limit(1);

    const [inviter] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, matchedInvitation.invited_by))
      .limit(1);

    return NextResponse.json({
      invitation: {
        email: matchedInvitation.email,
        role: matchedInvitation.role,
        workspaceName: workspace?.name || "Unknown workspace",
        inviterName: inviter?.name || "A team member",
      },
    });
  } catch (error) {
    console.error("[GET /api/v1/invitations/verify] Error:", error);
    return NextResponse.json({ error: "Failed to verify invitation" }, { status: 500 });
  }
}
