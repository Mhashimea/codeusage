/**
 * PyPI Registry API Client
 *
 * Features:
 * - Fetch package metadata from pypi.org
 * - In-memory caching (per-run)
 * - Rate limiting to avoid API limits
 * - Timeout handling
 * - Graceful offline mode
 */

export interface PyPIPackageInfo {
  name: string;
  exists: boolean;
  version?: string;
  description?: string;
  weeklyDownloads?: number;
  lastPublished?: Date;
  deprecated?: boolean;
  license?: string;
  repository?: string;
  maintainers?: number;
  error?: string;
  pythonVersion?: string;
}

interface PyPIRegistryResponse {
  info: {
    name: string;
    version: string;
    summary?: string;
    license?: string;
    author?: string;
    author_email?: string;
    maintainer?: string;
    home_page?: string;
    project_url?: string;
    project_urls?: Record<string, string>;
    requires_python?: string;
    classifiers?: string[];
    yanked?: boolean;
    yanked_reason?: string;
  };
  releases?: Record<string, Array<{
    upload_time?: string;
    yanked?: boolean;
  }>>;
  urls?: Array<{
    upload_time?: string;
  }>;
}

// Cache for package info (per-run)
const packageCache = new Map<string, PyPIPackageInfo>();

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
        'User-Agent': 'afterburn-cli/0.2.0',
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
 * Normalize package name (PyPI uses hyphen/underscore interchangeably)
 */
function normalizePackageName(name: string): string {
  return name.toLowerCase().replace(/[_-]+/g, '-');
}

/**
 * Fetch package info from PyPI registry
 */
export async function fetchPackageInfo(packageName: string): Promise<PyPIPackageInfo> {
  const normalizedName = normalizePackageName(packageName);

  // Check cache first
  const cached = packageCache.get(normalizedName);
  if (cached) {
    return cached;
  }

  // Wait for rate limit
  await waitForRateLimit();

  const result: PyPIPackageInfo = {
    name: packageName,
    exists: false,
  };

  try {
    // Fetch package metadata from PyPI JSON API
    const registryUrl = `https://pypi.org/pypi/${encodeURIComponent(normalizedName)}/json`;
    const response = await fetchWithTimeout(registryUrl, REQUEST_TIMEOUT);

    if (response.status === 404) {
      result.exists = false;
      result.error = 'Package not found on PyPI registry';
      packageCache.set(normalizedName, result);
      return result;
    }

    if (!response.ok) {
      result.error = `Registry error: ${response.status}`;
      packageCache.set(normalizedName, result);
      return result;
    }

    const data = await response.json() as PyPIRegistryResponse;

    result.exists = true;
    result.version = data.info.version;
    result.description = data.info.summary;
    result.license = data.info.license;
    result.pythonVersion = data.info.requires_python;

    // Check if deprecated/yanked
    if (data.info.yanked) {
      result.deprecated = true;
    }

    // Check classifiers for deprecated status
    if (data.info.classifiers?.some(c =>
      c.includes('Inactive') || c.includes('Obsolete')
    )) {
      result.deprecated = true;
    }

    // Get last published date from releases or urls
    if (data.urls && data.urls.length > 0 && data.urls[0].upload_time) {
      result.lastPublished = new Date(data.urls[0].upload_time);
    } else if (data.releases && result.version) {
      const versionReleases = data.releases[result.version];
      if (versionReleases && versionReleases.length > 0 && versionReleases[0].upload_time) {
        result.lastPublished = new Date(versionReleases[0].upload_time);
      }
    }

    // Repository URL from project_urls
    if (data.info.project_urls) {
      const repoUrl = data.info.project_urls['Source'] ||
                      data.info.project_urls['Repository'] ||
                      data.info.project_urls['Code'] ||
                      data.info.project_urls['Homepage'] ||
                      data.info.home_page;
      if (repoUrl) {
        result.repository = repoUrl;
      }
    } else if (data.info.home_page) {
      result.repository = data.info.home_page;
    }

    // Count maintainers (PyPI doesn't expose this directly, estimate from author/maintainer)
    result.maintainers = (data.info.author ? 1 : 0) + (data.info.maintainer ? 1 : 0);

    // Note: PyPI doesn't have a public download stats API like npm
    // The pypistats.org API could be used but requires additional integration

    packageCache.set(normalizedName, result);
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

    packageCache.set(normalizedName, result);
    return result;
  }
}

/**
 * Batch fetch multiple packages with concurrency control
 */
export async function fetchPackagesBatch(
  packageNames: string[],
  concurrency: number = 5
): Promise<Map<string, PyPIPackageInfo>> {
  const results = new Map<string, PyPIPackageInfo>();

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
