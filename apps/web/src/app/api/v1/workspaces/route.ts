import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserWorkspaces } from "@/lib/db/queries/workspaces";

/**
 * GET /api/v1/workspaces
 * List all workspaces the current user belongs to
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await getUserWorkspaces(session.user.id);

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("[GET /api/v1/workspaces] Error:", error);
    return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }
}
