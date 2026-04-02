import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserWorkspaceRole,
  updateMemberRole,
  removeWorkspaceMember,
} from "@/lib/db/queries/workspaces";
import type { MemberRole } from "@/lib/db/schema";

/**
 * DELETE /api/v1/members/[userId]
 * Remove a member from the workspace
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const { userId } = await params;

    if (!session?.user?.workspaceId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = session.user.workspaceId;
    const currentUserId = session.user.id;

    // Check if current user is admin or owner
    const currentUserRole = await getUserWorkspaceRole(currentUserId, workspaceId);
    if (currentUserRole !== "admin" && currentUserRole !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent removing yourself
    if (userId === currentUserId) {
      return NextResponse.json(
        { error: "Cannot remove yourself from the workspace" },
        { status: 400 }
      );
    }

    // Check target user's role - cannot remove an owner
    const targetUserRole = await getUserWorkspaceRole(userId, workspaceId);
    if (!targetUserRole) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (targetUserRole === "owner") {
      return NextResponse.json(
        { error: "Cannot remove the workspace owner" },
        { status: 400 }
      );
    }

    // Admins cannot remove other admins (only owners can)
    if (currentUserRole === "admin" && targetUserRole === "admin") {
      return NextResponse.json(
        { error: "Admins cannot remove other admins" },
        { status: 403 }
      );
    }

    await removeWorkspaceMember(workspaceId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/v1/members/[userId]] Error:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
