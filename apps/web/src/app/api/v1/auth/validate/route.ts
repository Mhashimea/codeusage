import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceByApiKey } from "@/lib/db/queries/workspaces";

/**
 * GET /api/v1/auth/validate
 * Validates an API key and returns workspace info
 * Used by CLI during `codeusage init`
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Read Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const apiKey = authHeader.slice(7); // Remove "Bearer " prefix

    // 2. Verify API key and get workspace
    const workspace = await getWorkspaceByApiKey(apiKey);
    if (!workspace) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // 3. Return workspace info
    return NextResponse.json({
      workspace_id: workspace.id,
      workspace_name: workspace.name,
      plan: workspace.plan,
    });
  } catch (error) {
    console.error("[GET /api/v1/auth/validate] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
