import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateWorkspaceDisplayName } from "@/lib/db/queries/workspaces";

/**
 * PATCH /api/v1/workspaces/update
 * Update workspace settings (requires authentication)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { displayName } = body;

    if (!displayName || typeof displayName !== "string" || displayName.trim().length === 0) {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }

    const workspace = await updateWorkspaceDisplayName(
      session.user.workspaceId,
      displayName.trim()
    );

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        displayName: workspace.display_name,
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
