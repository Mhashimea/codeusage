/**
 * Afterburn Cloud Integration
 * Handles API key validation and session upload to cloud
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const DEFAULT_API_URL = 'https://afterburn.dev';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Cached validation result with timestamp
 */
interface CachedValidation {
  apiKeyHash: string; // Hash of API key for comparison
  result: ValidationResult;
  timestamp: number;
  apiUrl: string;
}

/**
 * Get cache file path
 */
function getCacheFilePath(): string {
  const cacheDir = path.join(os.homedir(), '.afterburn');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return path.join(cacheDir, 'auth-cache.json');
}

/**
 * Simple hash function for API key (for cache comparison, not security)
 */
function hashApiKey(apiKey: string): string {
  // Use first 8 and last 4 chars as a simple identifier
  if (apiKey.length < 12) return apiKey;
  return `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`;
}

/**
 * Load cached validation result
 */
function loadCachedValidation(): CachedValidation | null {
  try {
    const cachePath = getCacheFilePath();
    if (!fs.existsSync(cachePath)) return null;

    const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as CachedValidation;
    return data;
  } catch {
    return null;
  }
}

/**
 * Save validation result to cache
 */
function saveCachedValidation(cache: CachedValidation): void {
  try {
    const cachePath = getCacheFilePath();
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  } catch {
    // Ignore cache write errors
  }
}

/**
 * Clear the validation cache
 */
export function clearValidationCache(): void {
  try {
    const cachePath = getCacheFilePath();
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
  } catch {
    // Ignore cache clear errors
  }
}

export interface CloudConfig {
  apiKey?: string;
  apiUrl?: string;
}

export interface ValidationResult {
  valid: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
  error?: string;
}

export interface SessionUploadData {
  projectName: string;
  projectSlug?: string;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  branch?: string;
  commitHash?: string;
  author?: string;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  commitsCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  estimatedCost: number;
  model?: string;
  actionsCount: number;
  actionsJson?: unknown;
  aiSummary?: string;
  aiType?: string;
  reportMarkdown: string;
}

export interface UploadResult {
  success: boolean;
  sessionId?: string;
  projectId?: string;
  error?: string;
}

/**
 * Get API key from environment or config
 */
export function getApiKey(configApiKey?: string): string | undefined {
  // Priority: CLI flag > env var > config file
  return configApiKey || process.env.AFTERBURN_API_KEY;
}

/**
 * Get API URL from environment or config
 */
export function getApiUrl(configApiUrl?: string): string {
  return configApiUrl || process.env.AFTERBURN_API_URL || DEFAULT_API_URL;
}

/**
 * Validate API key with the cloud server (with caching)
 */
export async function validateApiKey(
  apiKey: string,
  apiUrl: string = DEFAULT_API_URL,
  options: { skipCache?: boolean } = {}
): Promise<ValidationResult> {
  const keyHash = hashApiKey(apiKey);

  // Check cache first (unless skipCache is set)
  if (!options.skipCache) {
    const cached = loadCachedValidation();
    if (cached) {
      const isExpired = Date.now() - cached.timestamp > CACHE_EXPIRY_MS;
      const isSameKey = cached.apiKeyHash === keyHash;
      const isSameUrl = cached.apiUrl === apiUrl;

      if (!isExpired && isSameKey && isSameUrl && cached.result.valid) {
        return cached.result;
      }
    }
  }

  // Make network request
  try {
    const response = await fetch(`${apiUrl}/api/v1/auth/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json() as {
      valid?: boolean;
      organization?: ValidationResult['organization'];
      error?: string;
    };

    if (!response.ok) {
      return {
        valid: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    const result: ValidationResult = {
      valid: data.valid ?? false,
      organization: data.organization,
      error: data.error,
    };

    // Cache successful validations
    if (result.valid) {
      saveCachedValidation({
        apiKeyHash: keyHash,
        result,
        timestamp: Date.now(),
        apiUrl,
      });
    }

    return result;
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Upload a session report to the cloud
 */
export async function uploadSession(
  apiKey: string,
  data: SessionUploadData,
  apiUrl: string = DEFAULT_API_URL
): Promise<UploadResult> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectName: data.projectName,
        projectSlug: data.projectSlug,
        startedAt: data.startedAt.toISOString(),
        endedAt: data.endedAt?.toISOString(),
        durationSeconds: data.durationSeconds,
        branch: data.branch,
        commitHash: data.commitHash,
        author: data.author,
        filesChanged: data.filesChanged,
        linesAdded: data.linesAdded,
        linesRemoved: data.linesRemoved,
        commitsCount: data.commitsCount,
        totalTokens: data.totalTokens,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        cacheReadTokens: data.cacheReadTokens,
        estimatedCost: data.estimatedCost,
        model: data.model,
        actionsCount: data.actionsCount,
        actionsJson: data.actionsJson,
        aiSummary: data.aiSummary,
        aiType: data.aiType,
        reportMarkdown: data.reportMarkdown,
      }),
    });

    const result = await response.json() as {
      sessionId?: string;
      projectId?: string;
      error?: string;
    };

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      sessionId: result.sessionId,
      projectId: result.projectId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Check if cloud mode is enabled
 */
export function isCloudEnabled(config?: { cloud?: { enabled?: boolean } }): boolean {
  // Cloud is enabled if API key is set OR config explicitly enables it
  const hasApiKey = !!getApiKey();
  const configEnabled = config?.cloud?.enabled;

  return hasApiKey || configEnabled === true;
}
