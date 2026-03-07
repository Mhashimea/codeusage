/**
 * Dependency Extraction Module
 *
 * Extracts dependencies from:
 * - package.json (dependencies, devDependencies)
 * - Import/require statements in source files
 * - Detects new dependencies added in session
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface ExtractedDependency {
  name: string;
  version?: string;
  source: 'package.json' | 'import' | 'require';
  isDev: boolean;
  file?: string;
  line?: number;
}

export interface DependencyDiff {
  added: ExtractedDependency[];
  removed: string[];
  unchanged: ExtractedDependency[];
}

/**
 * Parse package.json and extract all dependencies
 */
export function parsePackageJson(projectPath: string): PackageJson | null {
  const packageJsonPath = join(projectPath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const content = readFileSync(packageJsonPath, 'utf-8');
    return JSON.parse(content) as PackageJson;
  } catch {
    return null;
  }
}

/**
 * Get all dependencies from package.json
 */
export function getAllDependencies(packageJson: PackageJson): ExtractedDependency[] {
  const deps: ExtractedDependency[] = [];

  // Production dependencies
  if (packageJson.dependencies) {
    for (const [name, version] of Object.entries(packageJson.dependencies)) {
      deps.push({
        name,
        version,
        source: 'package.json',
        isDev: false,
      });
    }
  }

  // Dev dependencies
  if (packageJson.devDependencies) {
    for (const [name, version] of Object.entries(packageJson.devDependencies)) {
      deps.push({
        name,
        version,
        source: 'package.json',
        isDev: true,
      });
    }
  }

  // Peer dependencies
  if (packageJson.peerDependencies) {
    for (const [name, version] of Object.entries(packageJson.peerDependencies)) {
      deps.push({
        name,
        version,
        source: 'package.json',
        isDev: false,
      });
    }
  }

  // Optional dependencies
  if (packageJson.optionalDependencies) {
    for (const [name, version] of Object.entries(packageJson.optionalDependencies)) {
      deps.push({
        name,
        version,
        source: 'package.json',
        isDev: false,
      });
    }
  }

  return deps;
}

/**
 * Extract import/require statements from source code
 */
export function extractImportsFromCode(content: string, filePath: string): ExtractedDependency[] {
  const deps: ExtractedDependency[] = [];
  const lines = content.split('\n');

  // Patterns for different import styles
  const patterns = [
    // ES6 imports: import x from 'package', import { x } from 'package'
    /import\s+(?:[\w{}\s,*]+\s+from\s+)?['"]([^'"./][^'"]*)['"]/g,
    // CommonJS require: require('package'), require("package")
    /require\s*\(\s*['"]([^'"./][^'"]*)['"]\s*\)/g,
    // Dynamic import: import('package')
    /import\s*\(\s*['"]([^'"./][^'"]*)['"]\s*\)/g,
  ];

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(line)) !== null) {
        const packageName = extractPackageName(match[1]);

        if (packageName && !isBuiltinModule(packageName)) {
          deps.push({
            name: packageName,
            source: line.includes('require') ? 'require' : 'import',
            isDev: false,
            file: filePath,
            line: lineNum + 1,
          });
        }
      }
    }
  }

  return deps;
}

/**
 * Extract the package name from an import path
 * Handles scoped packages (@org/package) and subpaths (package/subpath)
 */
function extractPackageName(importPath: string): string | null {
  if (!importPath) return null;

  // Handle scoped packages: @org/package/subpath -> @org/package
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return null;
  }

  // Handle regular packages: package/subpath -> package
  const parts = importPath.split('/');
  return parts[0];
}

/**
 * Check if a module is a Node.js built-in
 */
function isBuiltinModule(name: string): boolean {
  const builtins = new Set([
    'assert', 'async_hooks', 'buffer', 'child_process', 'cluster',
    'console', 'constants', 'crypto', 'dgram', 'dns', 'domain',
    'events', 'fs', 'http', 'http2', 'https', 'inspector', 'module',
    'net', 'os', 'path', 'perf_hooks', 'process', 'punycode',
    'querystring', 'readline', 'repl', 'stream', 'string_decoder',
    'sys', 'timers', 'tls', 'trace_events', 'tty', 'url', 'util',
    'v8', 'vm', 'wasi', 'worker_threads', 'zlib',
    // Node.js prefixed modules
    'node:assert', 'node:buffer', 'node:child_process', 'node:cluster',
    'node:console', 'node:constants', 'node:crypto', 'node:dgram',
    'node:dns', 'node:events', 'node:fs', 'node:http', 'node:http2',
    'node:https', 'node:module', 'node:net', 'node:os', 'node:path',
    'node:process', 'node:querystring', 'node:readline', 'node:stream',
    'node:string_decoder', 'node:timers', 'node:tls', 'node:tty',
    'node:url', 'node:util', 'node:v8', 'node:vm', 'node:worker_threads',
    'node:zlib', 'node:test',
  ]);

  return builtins.has(name) || name.startsWith('node:');
}

/**
 * Find imports in changed files that aren't in package.json
 */
export function findUnlistedImports(
  fileImports: ExtractedDependency[],
  packageDeps: ExtractedDependency[]
): ExtractedDependency[] {
  const packageDepNames = new Set(packageDeps.map(d => d.name));

  // Deduplicate imports
  const uniqueImports = new Map<string, ExtractedDependency>();
  for (const imp of fileImports) {
    if (!uniqueImports.has(imp.name)) {
      uniqueImports.set(imp.name, imp);
    }
  }

  // Filter to those not in package.json
  return Array.from(uniqueImports.values()).filter(
    imp => !packageDepNames.has(imp.name)
  );
}

/**
 * Find the nearest package.json for a file
 */
export function findNearestPackageJson(filePath: string): string | null {
  let dir = dirname(filePath);

  while (dir !== '/') {
    const packageJsonPath = join(dir, 'package.json');
    if (existsSync(packageJsonPath)) {
      return dir;
    }
    dir = dirname(dir);
  }

  return null;
}

/**
 * Detect which lock file is being used
 */
export function detectLockFile(projectPath: string): 'npm' | 'yarn' | 'pnpm' | null {
  if (existsSync(join(projectPath, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (existsSync(join(projectPath, 'yarn.lock'))) {
    return 'yarn';
  }
  if (existsSync(join(projectPath, 'package-lock.json'))) {
    return 'npm';
  }
  return null;
}
