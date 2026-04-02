import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserWorkspaceRole,
  updateUserCurrentWorkspace,
} from "@/lib/db/queries/workspaces";

/**
 * POST /api/v1/workspaces/switch
 * Switch the user's current workspace
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Verify user is a member of this workspace
    const role = await getUserWorkspaceRole(session.user.id, workspaceId);
    if (!role) {
      return NextResponse.json(
        { error: "You are not a member of this workspace" },
        { status: 403 }
      );
    }

    // Update user's current workspace
    await updateUserCurrentWorkspace(session.user.id, workspaceId);

    return NextResponse.json({ success: true, workspaceId });
  } catch (error) {
    console.error("[POST /api/v1/workspaces/switch] Error:", error);
    return NextResponse.json(
      { error: "Failed to switch workspace" },
      { status: 500 }
    );
  }
}
