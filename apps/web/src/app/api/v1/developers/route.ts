import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDevelopersByWorkspace } from "@/lib/db/queries/developers";

/**
 * GET /api/v1/developers
 * Get all developers for the current workspace
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const developers = await getDevelopersByWorkspace(session.user.workspaceId);

    return NextResponse.json({ developers });
  } catch (error) {
    console.error("[GET /api/v1/developers] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch developers" },
      { status: 500 }
    );
  }
}
