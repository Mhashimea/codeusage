/**
 * Hallucinated Package Detection
 *
 * Detects packages that may have been hallucinated by an AI:
 * - Package doesn't exist on npm registry
 * - Very low adoption (<100 weekly downloads)
 * - Unmaintained (>12 months since last update)
 * - Deprecated packages
 */

import type { DependencyInfo } from '../types.js';
import { fetchPackageInfo, fetchPackagesBatch, type NpmPackageInfo } from './npm-client.js';

// Thresholds for warnings
const LOW_DOWNLOADS_THRESHOLD = 100;
const UNMAINTAINED_MONTHS = 12;

export interface DependencyAuditResult {
  dependencies: DependencyInfo[];
  summary: {
    total: number;
    verified: number;
    warnings: number;
    hallucinated: number;
    errors: number;
  };
}

/**
 * Analyze a single package and return dependency info
 */
export function analyzePackage(npmInfo: NpmPackageInfo): DependencyInfo {
  const result: DependencyInfo = {
    name: npmInfo.name,
    version: npmInfo.version,
    status: 'unknown',
  };

  // Check if package exists
  if (!npmInfo.exists) {
    result.status = 'hallucinated';
    result.message = 'Package not found on npm registry - possibly hallucinated by AI';
    return result;
  }

  // Check for errors
  if (npmInfo.error && !npmInfo.exists) {
    result.status = 'unknown';
    result.message = `Could not verify: ${npmInfo.error}`;
    return result;
  }

  // Check if deprecated
  if (npmInfo.deprecated) {
    result.status = 'warning';
    result.message = typeof npmInfo.deprecated === 'string'
      ? `Deprecated: ${npmInfo.deprecated}`
      : 'Package is deprecated';
    return result;
  }

  // Check weekly downloads
  if (npmInfo.weeklyDownloads !== undefined && npmInfo.weeklyDownloads < LOW_DOWNLOADS_THRESHOLD) {
    result.status = 'warning';
    result.weeklyDownloads = npmInfo.weeklyDownloads;
    result.message = `Low adoption: only ${npmInfo.weeklyDownloads} weekly downloads`;
    return result;
  }

  // Check last updated
  if (npmInfo.lastPublished) {
    const monthsSinceUpdate = getMonthsSince(npmInfo.lastPublished);
    result.lastUpdated = formatTimeAgo(npmInfo.lastPublished);

    if (monthsSinceUpdate > UNMAINTAINED_MONTHS) {
      result.status = 'warning';
      result.message = `Unmaintained: last updated ${result.lastUpdated}`;
      return result;
    }
  }

  // Package is verified
  result.status = 'verified';
  result.weeklyDownloads = npmInfo.weeklyDownloads;
  result.message = npmInfo.weeklyDownloads
    ? `${formatDownloads(npmInfo.weeklyDownloads)} weekly downloads`
    : 'Verified on npm';

  return result;
}

/**
 * Audit a list of dependencies
 */
export async function auditDependencies(
  packageNames: string[],
  options: {
    concurrency?: number;
    onProgress?: (current: number, total: number, packageName: string) => void;
  } = {}
): Promise<DependencyAuditResult> {
  const { concurrency = 5, onProgress } = options;

  // Remove duplicates
  const uniquePackages = [...new Set(packageNames)];

  const dependencies: DependencyInfo[] = [];
  const summary = {
    total: uniquePackages.length,
    verified: 0,
    warnings: 0,
    hallucinated: 0,
    errors: 0,
  };

  // Fetch all package info
  const packageInfoMap = await fetchPackagesBatch(uniquePackages, concurrency);

  // Analyze each package
  let current = 0;
  for (const packageName of uniquePackages) {
    current++;
    if (onProgress) {
      onProgress(current, uniquePackages.length, packageName);
    }

    const npmInfo = packageInfoMap.get(packageName);
    if (!npmInfo) {
      dependencies.push({
        name: packageName,
        status: 'unknown',
        message: 'Could not fetch package info',
      });
      summary.errors++;
      continue;
    }

    const depInfo = analyzePackage(npmInfo);
    dependencies.push(depInfo);

    // Update summary
    switch (depInfo.status) {
      case 'verified':
        summary.verified++;
        break;
      case 'warning':
        summary.warnings++;
        break;
      case 'hallucinated':
        summary.hallucinated++;
        break;
      default:
        summary.errors++;
    }
  }

  // Sort by status: hallucinated first, then warnings, then verified
  dependencies.sort((a, b) => {
    const order = { hallucinated: 0, warning: 1, unknown: 2, verified: 3 };
    return order[a.status] - order[b.status];
  });

  return { dependencies, summary };
}

/**
 * Quick check for a single package
 */
export async function checkPackage(packageName: string): Promise<DependencyInfo> {
  const npmInfo = await fetchPackageInfo(packageName);
  return analyzePackage(npmInfo);
}

/**
 * Calculate months since a date
 */
function getMonthsSince(date: Date): number {
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Math.floor(diffDays / 30);
}

/**
 * Format a date as "X ago"
 */
function formatTimeAgo(date: Date): string {
  const months = getMonthsSince(date);

  if (months < 1) {
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  if (months < 12) {
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  const years = Math.floor(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Format download count for display
 */
function formatDownloads(downloads: number): string {
  if (downloads >= 1_000_000) {
    return `${(downloads / 1_000_000).toFixed(1)}M`;
  }
  if (downloads >= 1_000) {
    return `${(downloads / 1_000).toFixed(1)}K`;
  }
  return downloads.toString();
}
