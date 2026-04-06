import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserWorkspaceRole } from "@/lib/db/queries/workspaces";
import { mergeDeveloperAlias } from "@/lib/db/queries/developers";

/**
 * POST /api/v1/developers/merge
 * Merge one developer alias into another (admin/owner only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = session.user.workspaceId;

    // Check role — only admin or owner can merge
    const role = await getUserWorkspaceRole(session.user.id, workspaceId);
    if (!role || role === "member") {
      return NextResponse.json(
        { error: "Only admins and owners can merge developers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fromAlias, toAlias } = body;

    if (!fromAlias || !toAlias) {
      return NextResponse.json(
        { error: "Both fromAlias and toAlias are required" },
        { status: 400 }
      );
    }

    if (fromAlias === toAlias) {
      return NextResponse.json(
        { error: "Source and target aliases must be different" },
        { status: 400 }
      );
    }

    const updatedCount = await mergeDeveloperAlias(
      workspaceId,
      fromAlias,
      toAlias
    );

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Merged ${updatedCount} tasks from "${fromAlias}" into "${toAlias}"`,
    });
  } catch (error) {
    console.error("[POST /api/v1/developers/merge] Error:", error);
    return NextResponse.json(
      { error: "Failed to merge developers" },
      { status: 500 }
    );
  }
}
