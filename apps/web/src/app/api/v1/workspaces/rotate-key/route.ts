import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rotateApiKey } from "@/lib/db/queries/workspaces";

/**
 * POST /api/v1/workspaces/rotate-key
 * Rotate the workspace API key (requires authentication)
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const newApiKey = await rotateApiKey(session.user.workspaceId);

    return NextResponse.json({
      api_key: newApiKey,
      message: "API key rotated successfully. Save this key - it won't be shown again.",
    });
  } catch (error) {
    console.error("[POST /api/v1/workspaces/rotate-key] Error:", error);
    return NextResponse.json(
      { error: "Failed to rotate API key" },
      { status: 500 }
    );
  }
}
