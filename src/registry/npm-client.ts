/**
 * npm Registry API Client
 *
 * Features:
 * - Fetch package metadata from registry.npmjs.org
 * - In-memory caching (per-run)
 * - Rate limiting to avoid API limits
 * - Timeout handling
 * - Graceful offline mode
 */

export interface NpmPackageInfo {
  name: string;
  exists: boolean;
  version?: string;
  description?: string;
  weeklyDownloads?: number;
  lastPublished?: Date;
  deprecated?: string | boolean;
  license?: string;
  repository?: string;
  maintainers?: number;
  error?: string;
}

interface NpmRegistryResponse {
  name: string;
  'dist-tags'?: {
    latest?: string;
  };
  versions?: Record<string, {
    deprecated?: string;
  }>;
  time?: Record<string, string>;
  description?: string;
  license?: string;
  repository?: {
    url?: string;
  };
  maintainers?: Array<{ name: string }>;
}

interface NpmDownloadsResponse {
  downloads: number;
  package: string;
}

// Cache for package info (per-run)
const packageCache = new Map<string, NpmPackageInfo>();

// Rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms between requests

// Default timeout
const REQUEST_TIMEOUT = 5000; // 5 seconds

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'afterburn-cli/0.1.0',
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Wait for rate limit
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

/**
 * Fetch package info from npm registry
 */
export async function fetchPackageInfo(packageName: string): Promise<NpmPackageInfo> {
  // Check cache first
  const cached = packageCache.get(packageName);
  if (cached) {
    return cached;
  }

  // Wait for rate limit
  await waitForRateLimit();

  const result: NpmPackageInfo = {
    name: packageName,
    exists: false,
  };

  try {
    // Fetch package metadata
    // For scoped packages like @org/pkg, encode only the slash: @org%2Fpkg
    const encodedName = packageName.startsWith('@')
      ? '@' + encodeURIComponent(packageName.slice(1))
      : encodeURIComponent(packageName);
    const registryUrl = `https://registry.npmjs.org/${encodedName}`;
    const response = await fetchWithTimeout(registryUrl, REQUEST_TIMEOUT);

    if (response.status === 404) {
      result.exists = false;
      result.error = 'Package not found on npm registry';
      packageCache.set(packageName, result);
      return result;
    }

    if (!response.ok) {
      result.error = `Registry error: ${response.status}`;
      packageCache.set(packageName, result);
      return result;
    }

    const data = await response.json() as NpmRegistryResponse;

    result.exists = true;
    result.version = data['dist-tags']?.latest;
    result.description = data.description;
    result.license = data.license;
    result.maintainers = data.maintainers?.length;

    // Check if deprecated
    if (result.version && data.versions?.[result.version]?.deprecated) {
      result.deprecated = data.versions[result.version].deprecated;
    }

    // Get last published date
    if (data.time && result.version) {
      const publishTime = data.time[result.version] || data.time.modified;
      if (publishTime) {
        result.lastPublished = new Date(publishTime);
      }
    }

    // Repository URL
    if (data.repository?.url) {
      result.repository = data.repository.url
        .replace(/^git\+/, '')
        .replace(/\.git$/, '');
    }

    // Fetch weekly downloads (separate API)
    try {
      await waitForRateLimit();
      const downloadsUrl = `https://api.npmjs.org/downloads/point/last-week/${encodedName}`;
      const downloadsResponse = await fetchWithTimeout(downloadsUrl, REQUEST_TIMEOUT);

      if (downloadsResponse.ok) {
        const downloadsData = await downloadsResponse.json() as NpmDownloadsResponse;
        result.weeklyDownloads = downloadsData.downloads;
      }
    } catch {
      // Downloads API failure is not critical
    }

    packageCache.set(packageName, result);
    return result;

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        result.error = 'Request timeout';
      } else if (error.message.includes('fetch')) {
        result.error = 'Network error (offline?)';
      } else {
        result.error = error.message;
      }
    } else {
      result.error = 'Unknown error';
    }

    packageCache.set(packageName, result);
    return result;
  }
}

/**
 * Batch fetch multiple packages with concurrency control
 */
export async function fetchPackagesBatch(
  packageNames: string[],
  concurrency: number = 5
): Promise<Map<string, NpmPackageInfo>> {
  const results = new Map<string, NpmPackageInfo>();

  // Process in batches
  for (let i = 0; i < packageNames.length; i += concurrency) {
    const batch = packageNames.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(name => fetchPackageInfo(name))
    );

    for (const result of batchResults) {
      results.set(result.name, result);
    }
  }

  return results;
}

/**
 * Clear the package cache (useful for testing)
 */
export function clearCache(): void {
  packageCache.clear();
}

/**
 * Check if we're in offline mode (after network failures)
 */
export function isOffline(): boolean {
  // Check last few cached results for network errors
  const recentErrors = Array.from(packageCache.values())
    .slice(-5)
    .filter(p => p.error?.includes('Network') || p.error?.includes('offline'));

  return recentErrors.length >= 3;
}
