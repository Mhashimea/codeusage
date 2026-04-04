import { db, workspaces, users, workspaceMembers, invitations } from "..";
import { eq, and } from "drizzle-orm";
import { generateApiKey, hashApiKey, verifyApiKey } from "@/lib/api-key";
import { encrypt, decrypt } from "@/lib/encryption";
import type { MemberRole } from "../schema";

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
 * Get user by ID
 */
export async function getUserById(id: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user || null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user || null;
}

/**
 * Get user's role in a workspace
 */
export async function getUserWorkspaceRole(userId: string, workspaceId: string): Promise<MemberRole | null> {
  const [membership] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.user_id, userId),
        eq(workspaceMembers.workspace_id, workspaceId)
      )
    )
    .limit(1);

  return membership?.role || null;
}

/**
 * Get all workspaces a user belongs to
 * Returns simplified format for workspace switcher
 */
export async function getUserWorkspaces(userId: string) {
  const result = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      role: workspaceMembers.role,
      joined_at: workspaceMembers.joined_at,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspace_id, workspaces.id))
    .where(eq(workspaceMembers.user_id, userId));

  return result;
}

/**
 * Update user's currently selected workspace
 */
export async function updateUserCurrentWorkspace(userId: string, workspaceId: string | null) {
  const [user] = await db
    .update(users)
    .set({ current_workspace_id: workspaceId, updated_at: new Date() })
    .where(eq(users.id, userId))
    .returning();

  return user;
}

/**
 * Get workspace by verifying API key
 * Uses prefix-based lookup for O(1) query performance (prevents timing attacks)
 * Returns workspace if key is valid, null otherwise
 */
export async function getWorkspaceByApiKey(apiKey: string) {
  // Extract prefix for O(1) database lookup (prevents timing attack)
  const prefix = apiKey.slice(0, 12);

  // Query only workspaces matching the prefix
  const candidates = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.api_key_prefix, prefix))
    .limit(1);

  if (candidates.length === 0) {
    // Add artificial delay to prevent timing-based prefix enumeration
    await new Promise(resolve => setTimeout(resolve, 50));
    return null;
  }

  const workspace = candidates[0];

  // Workspace has no API key set yet
  if (!workspace.api_key_hash) {
    return null;
  }

  // Verify full key using bcrypt (constant-time comparison)
  const isValid = await verifyApiKey(apiKey, workspace.api_key_hash);

  if (!isValid) {
    return null;
  }

  return workspace;
}

/**
 * Create a new workspace with API key and add owner as member
 * Returns the workspace and the plaintext API key (shown once)
 */
export async function createWorkspace(name: string, ownerId: string) {
  const apiKey = generateApiKey();
  const apiKeyHash = await hashApiKey(apiKey);
  const apiKeyPrefix = apiKey.slice(0, 12); // Store prefix for O(1) lookup
  const apiKeyEncrypted = encrypt(apiKey); // Store encrypted for CLI browser auth retrieval

  // Create workspace
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name,
      owner_id: ownerId,
      api_key_hash: apiKeyHash,
      api_key_prefix: apiKeyPrefix,
      api_key_encrypted: apiKeyEncrypted,
      plan: "free",
    })
    .returning();

  // Add owner as member with owner role
  await db.insert(workspaceMembers).values({
    workspace_id: workspace.id,
    user_id: ownerId,
    role: "owner",
    invited_by: null, // Owner wasn't invited
  });

  // Set this as the user's current workspace
  await db
    .update(users)
    .set({ current_workspace_id: workspace.id })
    .where(eq(users.id, ownerId));

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
  const apiKeyPrefix = apiKey.slice(0, 12); // Store prefix for O(1) lookup
  const apiKeyEncrypted = encrypt(apiKey); // Store encrypted for CLI browser auth retrieval

  await db
    .update(workspaces)
    .set({
      api_key_hash: apiKeyHash,
      api_key_prefix: apiKeyPrefix,
      api_key_encrypted: apiKeyEncrypted,
    })
    .where(eq(workspaces.id, workspaceId));

  return apiKey;
}

/**
 * Update workspace name
 */
export async function updateWorkspaceName(workspaceId: string, name: string) {
  const [workspace] = await db
    .update(workspaces)
    .set({ name, updated_at: new Date() })
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
    .set({ plan, updated_at: new Date() })
    .where(eq(workspaces.id, workspaceId))
    .returning();

  return workspace;
}

/**
 * Get workspace members with user details
 */
export async function getWorkspaceMembers(workspaceId: string) {
  const result = await db
    .select({
      id: workspaceMembers.id,
      user: users,
      role: workspaceMembers.role,
      joined_at: workspaceMembers.joined_at,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.user_id, users.id))
    .where(eq(workspaceMembers.workspace_id, workspaceId));

  return result;
}

/**
 * Add a member to a workspace
 */
export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: MemberRole,
  invitedBy: string | null
) {
  const [member] = await db
    .insert(workspaceMembers)
    .values({
      workspace_id: workspaceId,
      user_id: userId,
      role,
      invited_by: invitedBy,
    })
    .returning();

  return member;
}

/**
 * Update member role
 */
export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: MemberRole
) {
  const [member] = await db
    .update(workspaceMembers)
    .set({ role })
    .where(
      and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, userId)
      )
    )
    .returning();

  return member;
}

/**
 * Remove a member from a workspace
 */
export async function removeWorkspaceMember(workspaceId: string, userId: string) {
  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, userId)
      )
    );
}

/**
 * Delete a workspace (owner only)
 */
export async function deleteWorkspace(workspaceId: string) {
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
}

/**
 * Get decrypted API key for CLI browser authentication
 * Returns null if workspace has no encrypted key (needs rotation)
 */
export async function getWorkspaceApiKey(workspaceId: string): Promise<string | null> {
  const workspace = await getWorkspaceById(workspaceId);

  if (!workspace?.api_key_encrypted) {
    return null; // Workspace needs to rotate API key to get encrypted version
  }

  try {
    return decrypt(workspace.api_key_encrypted);
  } catch {
    return null; // Decryption failed (key changed or corrupted)
  }
}
