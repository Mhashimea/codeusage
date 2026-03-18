import { db, workspaces } from "..";
import { eq } from "drizzle-orm";
import { generateApiKey, hashApiKey, verifyApiKey } from "@/lib/api-key";

/**
 * Get workspace by ID
 */
export async function getWorkspaceById(id: string) {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, id))
    .limit(1);

  return workspace || null;
}

/**
 * Get workspace by verifying API key
 * Returns workspace if key is valid, null otherwise
 */
export async function getWorkspaceByApiKey(apiKey: string) {
  // We need to check against all workspaces since bcrypt hashes are unique
  const allWorkspaces = await db.select().from(workspaces);

  for (const workspace of allWorkspaces) {
    const isValid = await verifyApiKey(apiKey, workspace.api_key_hash);
    if (isValid) {
      return workspace;
    }
  }

  return null;
}

/**
 * Create a new workspace with API key
 * Returns the workspace and the plaintext API key (shown once)
 */
export async function createWorkspace(name: string) {
  const apiKey = generateApiKey();
  const apiKeyHash = await hashApiKey(apiKey);

  const [workspace] = await db
    .insert(workspaces)
    .values({
      name,
      api_key_hash: apiKeyHash,
      plan: "free",
    })
    .returning();

  return {
    workspace,
    apiKey, // Return plaintext key to show to user once
  };
}

/**
 * Rotate workspace API key
 * Returns the new plaintext API key (shown once)
 */
export async function rotateApiKey(workspaceId: string) {
  const apiKey = generateApiKey();
  const apiKeyHash = await hashApiKey(apiKey);

  await db
    .update(workspaces)
    .set({ api_key_hash: apiKeyHash })
    .where(eq(workspaces.id, workspaceId));

  return apiKey;
}

/**
 * Update workspace display name
 */
export async function updateWorkspaceDisplayName(workspaceId: string, displayName: string) {
  const [workspace] = await db
    .update(workspaces)
    .set({ display_name: displayName })
    .where(eq(workspaces.id, workspaceId))
    .returning();

  return workspace;
}

/**
 * Update workspace plan
 */
export async function updateWorkspacePlan(
  workspaceId: string,
  plan: "free" | "team" | "enterprise"
) {
  const [workspace] = await db
    .update(workspaces)
    .set({ plan })
    .where(eq(workspaces.id, workspaceId))
    .returning();

  return workspace;
}
