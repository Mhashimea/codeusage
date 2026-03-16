import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const PREFIX = "ab-ws-";

/**
 * Generate a new workspace API key
 * Format: ab-ws-{36 hex chars}
 */
export function generateApiKey(): string {
  return PREFIX + randomBytes(18).toString("hex");
}

/**
 * Hash an API key for storage
 * Uses bcrypt - never store the plaintext key
 */
export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}

/**
 * Verify an API key against a stored hash
 */
export async function verifyApiKey(
  key: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

/**
 * Mask an API key for display
 * Shows prefix and last 4 chars only
 */
export function maskApiKey(key: string): string {
  if (!key.startsWith(PREFIX)) {
    return "••••••••••••";
  }
  return `${PREFIX}${"•".repeat(28)}${key.slice(-4)}`;
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return /^ab-ws-[a-f0-9]{36}$/.test(key);
}
