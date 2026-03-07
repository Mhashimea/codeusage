/**
 * Package Registry Module
 *
 * Verifies dependencies against npm registry and detects:
 * - Hallucinated packages (non-existent)
 * - Low adoption packages
 * - Unmaintained packages
 * - Deprecated packages
 */

// Re-export all submodules
export {
  parsePackageJson,
  getAllDependencies,
  extractImportsFromCode,
  findUnlistedImports,
  findNearestPackageJson,
  detectLockFile,
  type PackageJson,
  type ExtractedDependency,
  type DependencyDiff,
} from './dependency-extractor.js';

export {
  fetchPackageInfo,
  fetchPackagesBatch,
  clearCache,
  isOffline,
  type NpmPackageInfo,
} from './npm-client.js';

export {
  analyzePackage,
  auditDependencies,
  checkPackage,
  type DependencyAuditResult,
} from './hallucination-detector.js';

import { parsePackageJson, getAllDependencies, extractImportsFromCode } from './dependency-extractor.js';
import { auditDependencies, type DependencyAuditResult } from './hallucination-detector.js';
import { readFileSync, existsSync } from 'fs';

export interface FullAuditOptions {
  projectPath: string;
  changedFiles?: Array<{ path: string; content?: string }>;
  checkAllDependencies?: boolean;
  onProgress?: (current: number, total: number, packageName: string) => void;
}

/**
 * Run a full dependency audit on a project
 */
export async function runDependencyAudit(options: FullAuditOptions): Promise<DependencyAuditResult> {
  const { projectPath, changedFiles = [], checkAllDependencies = true, onProgress } = options;

  // Parse package.json
  const packageJson = parsePackageJson(projectPath);
  if (!packageJson) {
    return {
      dependencies: [],
      summary: { total: 0, verified: 0, warnings: 0, hallucinated: 0, errors: 0 },
    };
  }

  // Get all declared dependencies
  const declaredDeps = getAllDependencies(packageJson);
  const declaredDepNames = new Set(declaredDeps.map(d => d.name));

  // Extract imports from changed files
  const fileImports: Array<{ name: string; file: string; line: number }> = [];

  for (const file of changedFiles) {
    // Skip non-JS/TS files
    if (!/\.[jt]sx?$/.test(file.path)) continue;

    let content = file.content;
    if (!content) {
      const fullPath = file.path.startsWith('/') ? file.path : `${projectPath}/${file.path}`;
      if (existsSync(fullPath)) {
        try {
          content = readFileSync(fullPath, 'utf-8');
        } catch {
          continue;
        }
      }
    }

    if (content) {
      const imports = extractImportsFromCode(content, file.path);
      for (const imp of imports) {
        fileImports.push({
          name: imp.name,
          file: file.path,
          line: imp.line || 0,
        });
      }
    }
  }

  // Find imports not in package.json (potential hallucinations)
  const unlistedImports = fileImports.filter(imp => !declaredDepNames.has(imp.name));

  // Build list of packages to check
  const packagesToCheck: string[] = [];

  // Add unlisted imports (highest priority - potential hallucinations)
  for (const imp of unlistedImports) {
    if (!packagesToCheck.includes(imp.name)) {
      packagesToCheck.push(imp.name);
    }
  }

  // Optionally add all declared dependencies
  if (checkAllDependencies) {
    for (const dep of declaredDeps) {
      if (!packagesToCheck.includes(dep.name)) {
        packagesToCheck.push(dep.name);
      }
    }
  }

  // Run the audit
  const auditResult = await auditDependencies(packagesToCheck, { onProgress });

  // Mark unlisted imports specially in the results
  for (const dep of auditResult.dependencies) {
    const unlistedImport = unlistedImports.find(imp => imp.name === dep.name);
    if (unlistedImport) {
      if (dep.status === 'hallucinated') {
        dep.message = `Imported in ${unlistedImport.file}:${unlistedImport.line} but not found on npm`;
      } else if (dep.status === 'verified') {
        dep.message = `Found on npm but not in package.json (imported in ${unlistedImport.file}:${unlistedImport.line})`;
        dep.status = 'warning';
        auditResult.summary.verified--;
        auditResult.summary.warnings++;
      }
    }
  }

  return auditResult;
}
