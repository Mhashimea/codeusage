import { eq } from "drizzle-orm";
import { db } from "../index";
import { promptGuardSettings } from "../schema";
import { BUILT_IN_PATTERNS } from "@codeusage/shared";

/**
 * Get Prompt Guard settings for a workspace
 * Returns null if no settings exist (feature never enabled)
 */
export async function getPromptGuardSettings(workspaceId: string) {
  const result = await db
    .select()
    .from(promptGuardSettings)
    .where(eq(promptGuardSettings.workspace_id, workspaceId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Create or update Prompt Guard settings for a workspace
 * Uses upsert pattern - creates if doesn't exist, updates if exists
 */
export async function upsertPromptGuardSettings(
  workspaceId: string,
  enabled: boolean,
  updatedBy: string | null
) {
  // Check if settings exist
  const existing = await getPromptGuardSettings(workspaceId);

  if (existing) {
    // Update existing settings
    const result = await db
      .update(promptGuardSettings)
      .set({
        enabled: enabled ? 1 : 0,
        updated_at: new Date(),
        updated_by: updatedBy,
      })
      .where(eq(promptGuardSettings.workspace_id, workspaceId))
      .returning();

    return result[0];
  } else {
    // Create new settings
    const result = await db
      .insert(promptGuardSettings)
      .values({
        workspace_id: workspaceId,
        enabled: enabled ? 1 : 0,
        updated_by: updatedBy,
      })
      .returning();

    return result[0];
  }
}

/**
 * Check if Prompt Guard is enabled for a workspace
 * Returns false if no settings exist
 */
export async function isPromptGuardEnabled(workspaceId: string): Promise<boolean> {
  const settings = await getPromptGuardSettings(workspaceId);
  return settings?.enabled === 1;
}

/**
 * Toggle a specific pattern on/off
 * Adds to disabled_patterns if disabling, removes if enabling
 */
export async function togglePattern(
  workspaceId: string,
  patternId: string,
  enabled: boolean,
  updatedBy: string | null
) {
  // Get existing settings or create new
  let existing = await getPromptGuardSettings(workspaceId);

  if (!existing) {
    // Create settings first with Prompt Guard disabled
    const result = await db
      .insert(promptGuardSettings)
      .values({
        workspace_id: workspaceId,
        enabled: 0,
        disabled_patterns: [],
        disabled_categories: [],
        updated_by: updatedBy,
      })
      .returning();
    existing = result[0];
  }

  const disabledPatterns = [...(existing.disabled_patterns as string[])];
  const patternIndex = disabledPatterns.indexOf(patternId);

  if (enabled && patternIndex !== -1) {
    // Enable: remove from disabled list
    disabledPatterns.splice(patternIndex, 1);
  } else if (!enabled && patternIndex === -1) {
    // Disable: add to disabled list
    disabledPatterns.push(patternId);
  }

  const result = await db
    .update(promptGuardSettings)
    .set({
      disabled_patterns: disabledPatterns,
      updated_at: new Date(),
      updated_by: updatedBy,
    })
    .where(eq(promptGuardSettings.workspace_id, workspaceId))
    .returning();

  return result[0];
}

/**
 * Toggle an entire category on/off
 * When disabling a category, adds to disabled_categories
 * When enabling a category, removes from disabled_categories AND removes individual patterns from disabled_patterns
 */
export async function toggleCategory(
  workspaceId: string,
  category: string,
  enabled: boolean,
  updatedBy: string | null
) {
  // Get existing settings or create new
  let existing = await getPromptGuardSettings(workspaceId);

  if (!existing) {
    // Create settings first with Prompt Guard disabled
    const result = await db
      .insert(promptGuardSettings)
      .values({
        workspace_id: workspaceId,
        enabled: 0,
        disabled_patterns: [],
        disabled_categories: [],
        updated_by: updatedBy,
      })
      .returning();
    existing = result[0];
  }

  const disabledCategories = [...(existing.disabled_categories as string[])];
  let disabledPatterns = [...(existing.disabled_patterns as string[])];
  const categoryIndex = disabledCategories.indexOf(category);

  // Get all pattern IDs in this category
  const categoryPatternIds = BUILT_IN_PATTERNS
    .filter(p => p.category === category)
    .map(p => p.id);

  if (enabled) {
    // Enable category: remove from disabled_categories
    if (categoryIndex !== -1) {
      disabledCategories.splice(categoryIndex, 1);
    }
    // Also remove any individually disabled patterns from this category
    disabledPatterns = disabledPatterns.filter(id => !categoryPatternIds.includes(id));
  } else {
    // Disable category: add to disabled_categories
    if (categoryIndex === -1) {
      disabledCategories.push(category);
    }
    // Remove individual patterns from disabled_patterns since the whole category is disabled
    disabledPatterns = disabledPatterns.filter(id => !categoryPatternIds.includes(id));
  }

  const result = await db
    .update(promptGuardSettings)
    .set({
      disabled_categories: disabledCategories,
      disabled_patterns: disabledPatterns,
      updated_at: new Date(),
      updated_by: updatedBy,
    })
    .where(eq(promptGuardSettings.workspace_id, workspaceId))
    .returning();

  return result[0];
}
