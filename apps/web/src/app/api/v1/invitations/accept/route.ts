import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, invitations, users, workspaceMembers } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * POST /api/v1/invitations/accept
 * Accept an invitation and join the workspace (logged-in users only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Must be logged in
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to accept this invitation" },
        { status: 401 }
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

    // Verify the logged-in user's email matches the invitation
    if (session.user.email.toLowerCase() !== invitedEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation is for a different email address" },
        { status: 403 }
      );
    }

    // Check if already a member
    const existingMember = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspace_id, matchedInvitation.workspace_id),
          eq(workspaceMembers.user_id, session.user.id)
        )
      )
      .limit(1);

    if (existingMember.length > 0) {
      return NextResponse.json(
        { error: "You are already a member of this workspace" },
        { status: 400 }
      );
    }

    // Add user to workspace
    await db.insert(workspaceMembers).values({
      workspace_id: matchedInvitation.workspace_id,
      user_id: session.user.id,
      role: matchedInvitation.role,
      invited_by: matchedInvitation.invited_by,
    });

    // Update user's current workspace to the newly joined one
    await db
      .update(users)
      .set({ current_workspace_id: matchedInvitation.workspace_id })
      .where(eq(users.id, session.user.id));

    // Mark invitation as accepted
    await db
      .update(invitations)
      .set({ status: "accepted" })
      .where(eq(invitations.id, matchedInvitation.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/v1/invitations/accept] Error:", error);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}
