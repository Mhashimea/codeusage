import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserWorkspaceRole, getWorkspaceById, getWorkspaceApiKey } from "@/lib/db/queries/workspaces";

/**
 * POST /api/v1/cli/connect
 * Returns the workspace API key for CLI browser authentication
 * Requires authenticated session and workspace membership
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    // Check user has access to this workspace
    const role = await getUserWorkspaceRole(session.user.id, workspaceId);
    if (!role) {
      return NextResponse.json({ error: "You don't have access to this workspace" }, { status: 403 });
    }

    // Get workspace details
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Get decrypted API key
    const apiKey = await getWorkspaceApiKey(workspaceId);
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not available. Please rotate the API key in Settings first." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      workspace_key: apiKey,
      workspace_name: workspace.name,
      user_name: session.user.name || "",
    });
  } catch (error) {
    console.error("CLI connect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
