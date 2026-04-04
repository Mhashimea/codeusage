import { NextRequest, NextResponse } from "next/server";
import { getUserWorkspaceRole } from "@/lib/db/queries/workspaces";
import {
  togglePattern,
  toggleCategory,
} from "@/lib/db/queries/prompt-guard";
import { updatePatternToggleSchema } from "@codeusage/shared";
import { auth } from "@/lib/auth";

/**
 * PATCH /api/v1/prompt-guard/patterns
 *
 * Toggle a specific pattern or category on/off.
 * Used by dashboard to enable/disable individual patterns.
 *
 * Auth: Session cookie (NextAuth) - Admin or Owner role required
 *
 * Body:
 * - pattern_id?: string - ID of pattern to toggle
 * - category?: string - Category to toggle (all patterns in category)
 * - enabled: boolean - true to enable, false to disable
 */
export async function PATCH(request: NextRequest) {
  try {
    // 1. Verify session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get current workspace from session
    const workspaceId = session.user.workspaceId;
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace selected" },
        { status: 400 }
      );
    }

    // 3. Check user role - must be admin or owner
    const role = await getUserWorkspaceRole(session.user.id, workspaceId);
    if (!role || role === "member") {
      return NextResponse.json(
        { error: "Only admins and owners can update Prompt Guard settings" },
        { status: 403 }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const parsed = updatePatternToggleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // 5. Toggle pattern or category
    let updated;
    if (parsed.data.pattern_id) {
      updated = await togglePattern(
        workspaceId,
        parsed.data.pattern_id,
        parsed.data.enabled,
        session.user.id
      );
    } else if (parsed.data.category) {
      updated = await toggleCategory(
        workspaceId,
        parsed.data.category,
        parsed.data.enabled,
        session.user.id
      );
    } else {
      return NextResponse.json(
        { error: "Either pattern_id or category must be provided" },
        { status: 400 }
      );
    }

    // 6. Return updated settings
    return NextResponse.json({
      disabled_patterns: updated.disabled_patterns,
      disabled_categories: updated.disabled_categories,
      updated_at: updated.updated_at.toISOString(),
    });
  } catch (error) {
    console.error("[PATCH /api/v1/prompt-guard/patterns] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
