import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateWorkspaceName } from "@/lib/db/queries/workspaces";

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
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
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
