import bcrypt from "bcryptjs";

const PREFIX = "cu-ws-";

/**
 * Generate random bytes using Web Crypto API (Edge Runtime compatible)
 */
function getRandomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a new workspace API key
 * Format: cu-ws-{36 hex chars}
 */
export function generateApiKey(): string {
  return PREFIX + getRandomHex(18);
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
  return /^cu-ws-[a-f0-9]{36}$/.test(key);
}
