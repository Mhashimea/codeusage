import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceByApiKey, getUserWorkspaceRole } from "@/lib/db/queries/workspaces";
import {
  getPromptGuardSettings,
  upsertPromptGuardSettings,
} from "@/lib/db/queries/prompt-guard";
import { BUILT_IN_PATTERNS } from "@codeusage/shared";
import { updatePromptGuardSettingsSchema } from "@codeusage/shared";
import { auth } from "@/lib/auth";

/**
 * Filter patterns based on disabled settings
 * A pattern is disabled if:
 * - Its ID is in disabled_patterns
 * - OR its category is in disabled_categories
 */
function getEnabledPatterns(
  disabledPatterns: string[],
  disabledCategories: string[]
) {
  return BUILT_IN_PATTERNS.filter(pattern => {
    // Check if category is disabled
    if (disabledCategories.includes(pattern.category)) {
      return false;
    }
    // Check if individual pattern is disabled
    if (disabledPatterns.includes(pattern.id)) {
      return false;
    }
    return true;
  });
}

/**
 * GET /api/v1/prompt-guard/settings
 *
 * Returns Prompt Guard settings for a workspace.
 * Used by CLI to sync pattern cache.
 *
 * Auth: Bearer token (workspace API key)
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
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // 3. Get Prompt Guard settings
    const settings = await getPromptGuardSettings(workspace.id);
    const enabled = settings?.enabled === 1;
    const disabledPatterns = (settings?.disabled_patterns as string[]) || [];
    const disabledCategories = (settings?.disabled_categories as string[]) || [];

    // 4. Filter to only enabled patterns
    const enabledPatterns = getEnabledPatterns(disabledPatterns, disabledCategories);

    // 5. Return settings with filtered patterns
    return NextResponse.json({
      enabled,
      patterns: enabledPatterns,
      disabled_patterns: disabledPatterns,
      disabled_categories: disabledCategories,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/v1/prompt-guard/settings] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/prompt-guard/settings
 *
 * Updates Prompt Guard settings for a workspace.
 * Used by dashboard to enable/disable Prompt Guard.
 *
 * Auth: Session cookie (NextAuth) - Admin or Owner role required
 */
export async function PUT(request: NextRequest) {
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
    const parsed = updatePromptGuardSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // 5. Update settings
    const updated = await upsertPromptGuardSettings(
      workspaceId,
      parsed.data.enabled,
      session.user.id
    );

    // 6. Return updated settings
    return NextResponse.json({
      enabled: updated.enabled === 1,
      updated_at: updated.updated_at.toISOString(),
    });
  } catch (error) {
    console.error("[PUT /api/v1/prompt-guard/settings] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
