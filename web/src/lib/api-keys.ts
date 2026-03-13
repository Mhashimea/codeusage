import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { apiKeys, organizations, organizationMembers } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

const API_KEY_PREFIX = "ab_";
const API_KEY_LENGTH = 32; // characters after prefix

/**
 * Generate a new API key
 * Returns the full key (only shown once) and the data to store
 */
export function generateApiKey(): { fullKey: string; hash: string; prefix: string } {
  // Generate random bytes and convert to base64url
  const randomPart = randomBytes(API_KEY_LENGTH)
    .toString("base64url")
    .slice(0, API_KEY_LENGTH);

  const fullKey = `${API_KEY_PREFIX}${randomPart}`;
  const prefix = `${API_KEY_PREFIX}${randomPart.slice(0, 4)}...`;
  const hash = bcrypt.hashSync(fullKey, 10);

  return { fullKey, hash, prefix };
}

/**
 * Validate an API key and return the associated organization
 */
export async function validateApiKey(apiKey: string): Promise<{
  valid: boolean;
  apiKeyId?: string;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
  error?: string;
}> {
  if (!apiKey || !apiKey.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: "Invalid API key format" };
  }

  // Find all non-revoked API keys and check against the hash
  const keys = await db
    .select({
      id: apiKeys.id,
      keyHash: apiKeys.keyHash,
      organizationId: apiKeys.organizationId,
      expiresAt: apiKeys.expiresAt,
      orgId: organizations.id,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      orgPlan: organizations.plan,
    })
    .from(apiKeys)
    .innerJoin(organizations, eq(apiKeys.organizationId, organizations.id))
    .where(isNull(apiKeys.revokedAt));

  for (const key of keys) {
    const isMatch = bcrypt.compareSync(apiKey, key.keyHash);

    if (isMatch) {
      // Check expiration
      if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
        return { valid: false, error: "API key has expired" };
      }

      // Update last used timestamp
      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, key.id));

      return {
        valid: true,
        apiKeyId: key.id,
        organizationId: key.organizationId,
        organization: {
          id: key.orgId,
          name: key.orgName,
          slug: key.orgSlug,
          plan: key.orgPlan,
        },
      };
    }
  }

  return { valid: false, error: "Invalid API key" };
}

/**
 * Create a new API key for an organization
 */
export async function createApiKey(
  organizationId: string,
  name: string,
  createdById: string,
  expiresAt?: Date
): Promise<{ id: string; fullKey: string; prefix: string }> {
  const { fullKey, hash, prefix } = generateApiKey();

  const [newKey] = await db
    .insert(apiKeys)
    .values({
      organizationId,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      createdById,
      expiresAt,
    })
    .returning();

  return {
    id: newKey.id,
    fullKey, // Only returned once!
    prefix,
  };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string, organizationId: string): Promise<boolean> {
  const result = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.organizationId, organizationId)));

  return true;
}

/**
 * List API keys for an organization (without the actual key)
 */
export async function listApiKeys(organizationId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.organizationId, organizationId))
    .orderBy(apiKeys.createdAt);
}

/**
 * Get usage stats for an API key
 */
export async function getApiKeyUsageStats(keyId: string): Promise<{
  sessionsCount: number;
  totalTokens: number;
  totalCost: number;
}> {
  const { sessions } = await import("@/db/schema");
  const { sql } = await import("drizzle-orm");

  const result = await db
    .select({
      sessionsCount: sql<number>`count(*)::int`,
      totalTokens: sql<number>`coalesce(sum(${sessions.totalTokens}), 0)::int`,
      totalCost: sql<number>`coalesce(sum(${sessions.estimatedCost}), 0)::float`,
    })
    .from(sessions)
    .where(eq(sessions.apiKeyId, keyId));

  return {
    sessionsCount: result[0]?.sessionsCount ?? 0,
    totalTokens: result[0]?.totalTokens ?? 0,
    totalCost: result[0]?.totalCost ?? 0,
  };
}

/**
 * List API keys with usage stats
 */
export async function listApiKeysWithStats(organizationId: string) {
  const keys = await listApiKeys(organizationId);

  // Get usage stats for each key
  const keysWithStats = await Promise.all(
    keys.map(async (key) => {
      const stats = await getApiKeyUsageStats(key.id);
      return { ...key, ...stats };
    })
  );

  return keysWithStats;
}

/**
 * Get user's organization
 */
export async function getUserOrganization(userId: string) {
  const result = await db
    .select({
      orgId: organizations.id,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      orgPlan: organizations.plan,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, userId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    id: result[0].orgId,
    name: result[0].orgName,
    slug: result[0].orgSlug,
    plan: result[0].orgPlan,
    role: result[0].role,
  };
}
