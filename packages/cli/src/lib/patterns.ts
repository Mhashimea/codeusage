import fs from "fs";
import path from "path";
import os from "os";
import type { PatternCache, Pattern, PatternMatch } from "@codeusage/shared";
import { patternCacheSchema, BUILT_IN_PATTERNS } from "@codeusage/shared";
import { getConfig } from "./config.js";

const AFTERBURN_DIR = path.join(os.homedir(), ".afterburn");
const PATTERNS_FILE = path.join(AFTERBURN_DIR, "patterns.json");

// Cache is stale if older than 7 days
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

// Cache needs refresh if older than 24 hours
const REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Ensure ~/.afterburn directory exists
 */
function ensureDir(): void {
  if (!fs.existsSync(AFTERBURN_DIR)) {
    fs.mkdirSync(AFTERBURN_DIR, { recursive: true });
  }
}

/**
 * Load pattern cache from disk
 * Returns null if cache doesn't exist or is invalid
 */
export function loadPatternCache(): PatternCache | null {
  try {
    if (!fs.existsSync(PATTERNS_FILE)) {
      return null;
    }

    const raw = fs.readFileSync(PATTERNS_FILE, "utf-8");
    const data = JSON.parse(raw);

    // Validate with zod schema
    const result = patternCacheSchema.safeParse(data);
    if (!result.success) {
      console.error("Pattern cache validation failed:", result.error.message);
      return null;
    }

    return result.data;
  } catch (err) {
    console.error("Failed to load pattern cache:", (err as Error).message);
    return null;
  }
}

/**
 * Save pattern cache to disk
 */
export function savePatternCache(cache: PatternCache): void {
  ensureDir();
  fs.writeFileSync(PATTERNS_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

/**
 * Check if pattern cache is stale (> 7 days old)
 */
export function isCacheStale(cache: PatternCache): boolean {
  const syncedAt = new Date(cache.synced_at).getTime();
  const now = Date.now();
  return now - syncedAt > STALE_THRESHOLD_MS;
}

/**
 * Check if pattern cache needs refresh (> 24 hours old)
 */
export function cacheNeedsRefresh(cache: PatternCache): boolean {
  const syncedAt = new Date(cache.synced_at).getTime();
  const now = Date.now();
  return now - syncedAt > REFRESH_THRESHOLD_MS;
}

/**
 * Get cache age in human-readable format
 */
export function getCacheAge(cache: PatternCache): string {
  const syncedAt = new Date(cache.synced_at).getTime();
  const now = Date.now();
  const diffMs = now - syncedAt;

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

/**
 * Delete pattern cache file
 */
export function deletePatternCache(): void {
  if (fs.existsSync(PATTERNS_FILE)) {
    fs.unlinkSync(PATTERNS_FILE);
  }
}

/**
 * Get pattern cache file path
 */
export function getPatternCachePath(): string {
  return PATTERNS_FILE;
}

/**
 * Fetch Prompt Guard settings from API and save to cache
 */
export async function syncPatternCache(): Promise<{
  success: boolean;
  enabled?: boolean;
  patternCount?: number;
  error?: string;
}> {
  const config = getConfig();

  if (!config.workspace_key) {
    return {
      success: false,
      error: "No workspace key configured. Run: afterburn init",
    };
  }

  const apiBase = config.api_url || "https://codeusage.dev";

  try {
    const response = await fetch(`${apiBase}/api/v1/prompt-guard/settings`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.workspace_key}`,
      },
    });

    if (response.status === 401) {
      return {
        success: false,
        error: "Invalid workspace key. Run: afterburn init",
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      enabled: boolean;
      patterns: Pattern[];
      synced_at: string;
    };

    // Build and save cache
    const cache: PatternCache = {
      enabled: data.enabled,
      synced_at: data.synced_at,
      workspace_id: "", // We don't expose workspace_id in the response
      patterns: data.patterns,
      version: getCliVersion(),
    };

    savePatternCache(cache);

    return {
      success: true,
      enabled: data.enabled,
      patternCount: data.patterns.length,
    };
  } catch (err) {
    return {
      success: false,
      error: `Network error: ${(err as Error).message}`,
    };
  }
}

/**
 * Get CLI version from package.json
 */
function getCliVersion(): string {
  try {
    // In bundled CLI, we'll hardcode this or use a different method
    return "0.3.0";
  } catch {
    return "unknown";
  }
}

/**
 * Match a prompt against all patterns
 * Returns the first match found, or null if no match
 */
export function matchPatterns(
  prompt: string,
  patterns: Pattern[]
): PatternMatch | null {
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern.regex, "i");
      const match = regex.exec(prompt);

      if (match) {
        return {
          pattern,
          position: match.index,
        };
      }
    } catch (err) {
      // Skip invalid regex patterns
      console.error(`Invalid pattern regex: ${pattern.id}`, err);
    }
  }

  return null;
}

/**
 * Check a prompt for credentials using the local pattern cache
 * Returns match result or null if no patterns matched
 *
 * Fail-open behavior:
 * - If cache missing/invalid → returns null (allow prompt)
 * - If Prompt Guard disabled → returns null (allow prompt)
 * - If cache stale → returns null with warning (allow prompt)
 */
export function checkPrompt(prompt: string): {
  blocked: boolean;
  match: PatternMatch | null;
  warning?: string;
} {
  // Load cache
  const cache = loadPatternCache();

  // Fail open: no cache
  if (!cache) {
    return {
      blocked: false,
      match: null,
      warning: "Pattern cache not found. Run: afterburn patterns sync",
    };
  }

  // Fail open: Prompt Guard disabled
  if (!cache.enabled) {
    return {
      blocked: false,
      match: null,
    };
  }

  // Fail open with warning: stale cache
  if (isCacheStale(cache)) {
    return {
      blocked: false,
      match: null,
      warning: "Pattern cache is outdated. Run: afterburn patterns sync",
    };
  }

  // Check patterns
  const match = matchPatterns(prompt, cache.patterns);

  if (match) {
    return {
      blocked: true,
      match,
    };
  }

  return {
    blocked: false,
    match: null,
  };
}

/**
 * Get patterns grouped by category from cache or built-in
 */
export function getPatternsByCategory(): Record<string, Pattern[]> {
  const cache = loadPatternCache();
  const patterns = cache?.patterns || BUILT_IN_PATTERNS;

  const grouped: Record<string, Pattern[]> = {};
  for (const pattern of patterns) {
    if (!grouped[pattern.category]) {
      grouped[pattern.category] = [];
    }
    grouped[pattern.category].push(pattern);
  }

  return grouped;
}
