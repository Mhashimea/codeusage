import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWorkspaceMembers } from "@/lib/db/queries/workspaces";

/**
 * GET /api/v1/members
 * List all members of the current workspace
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const members = await getWorkspaceMembers(session.user.workspaceId);

    return NextResponse.json({ members });
  } catch (error) {
    console.error("[GET /api/v1/members] Error:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}
