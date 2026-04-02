import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserWorkspaceRole,
  updateMemberRole,
} from "@/lib/db/queries/workspaces";
import type { MemberRole } from "@/lib/db/schema";

/**
 * PATCH /api/v1/members/[userId]/role
 * Change a member's role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const { userId } = await params;
    const body = await request.json();
    const { role } = body as { role: MemberRole };

    if (!session?.user?.workspaceId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!role || !["admin", "member"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'admin' or 'member'" },
        { status: 400 }
      );
    }

    const workspaceId = session.user.workspaceId;
    const currentUserId = session.user.id;

    // Check if current user is admin or owner
    const currentUserRole = await getUserWorkspaceRole(currentUserId, workspaceId);
    if (currentUserRole !== "admin" && currentUserRole !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent changing your own role
    if (userId === currentUserId) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    // Check target user's role
    const targetUserRole = await getUserWorkspaceRole(userId, workspaceId);
    if (!targetUserRole) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Cannot change owner's role
    if (targetUserRole === "owner") {
      return NextResponse.json(
        { error: "Cannot change the workspace owner's role" },
        { status: 400 }
      );
    }

    // Admins cannot change other admins' roles (only owners can)
    if (currentUserRole === "admin" && targetUserRole === "admin") {
      return NextResponse.json(
        { error: "Admins cannot change other admins' roles" },
        { status: 403 }
      );
    }

    await updateMemberRole(workspaceId, userId, role);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/v1/members/[userId]/role] Error:", error);
    return NextResponse.json({ error: "Failed to change role" }, { status: 500 });
  }
}
