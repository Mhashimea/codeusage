import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateWorkspaceName, getUserWorkspaceRole } from "@/lib/db/queries/workspaces";

/**
 * PATCH /api/v1/workspaces/update
 * Update workspace settings (requires admin or owner role)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId || !session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch role from database (more reliable than session)
    const userRole = await getUserWorkspaceRole(session.user.id, session.user.workspaceId);

    // Only admins and owners can update workspace settings
    if (userRole !== "admin" && userRole !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Admin or owner role required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 }
      );
    }

    const workspace = await updateWorkspaceName(
      session.user.workspaceId,
      name.trim()
    );

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/v1/workspaces/update] Error:", error);
    return NextResponse.json(
      { error: "Failed to update workspace" },
      { status: 500 }
    );
  }
}
