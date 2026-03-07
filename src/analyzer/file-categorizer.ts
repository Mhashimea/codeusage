/**
 * File Change Categorization
 *
 * Analyzes file changes to categorize them by type:
 * - new-feature: New files in src/
 * - test: Test files
 * - config: Configuration files
 * - bugfix: Files with "fix" in commit message
 * - refactor: Large structural changes
 * - docs: Documentation files
 */

import type { FileChange } from '../types.js';
import type { GitFileDiff, GitCommit } from '../git/index.js';

// File patterns for categorization
const PATTERNS = {
  test: [
    /\.test\.[jt]sx?$/,
    /\.spec\.[jt]sx?$/,
    /__tests__\//,
    /tests?\//,
    /\.stories\.[jt]sx?$/,
  ],
  config: [
    /\.config\.[jt]s$/,
    /\.config\.m?[jt]s$/,
    /\.rc$/,
    /\.rc\.[jt]s$/,
    /\.json$/,
    /\.ya?ml$/,
    /\.toml$/,
    /\.env/,
    /tsconfig/,
    /eslint/,
    /prettier/,
    /webpack/,
    /vite/,
    /rollup/,
    /babel/,
    /jest/,
    /vitest/,
  ],
  docs: [
    /\.md$/,
    /\.mdx$/,
    /\.txt$/,
    /docs?\//,
    /README/i,
    /CHANGELOG/i,
    /LICENSE/i,
    /CONTRIBUTING/i,
  ],
  styles: [
    /\.css$/,
    /\.scss$/,
    /\.sass$/,
    /\.less$/,
    /\.styl$/,
  ],
  types: [
    /\.d\.ts$/,
    /types?\//,
  ],
};

// Keywords in commit messages that indicate bugfix
const BUGFIX_KEYWORDS = [
  /\bfix(es|ed|ing)?\b/i,
  /\bbug(s|fix)?\b/i,
  /\bpatch(es|ed|ing)?\b/i,
  /\bhotfix\b/i,
  /\brepair(s|ed|ing)?\b/i,
  /\bresolve[ds]?\b/i,
  /\bcorrect(s|ed|ing)?\b/i,
];

// Keywords indicating refactor
const REFACTOR_KEYWORDS = [
  /\brefactor(s|ed|ing)?\b/i,
  /\brestructure[ds]?\b/i,
  /\breorganize[ds]?\b/i,
  /\bclean(s|ed|ing)?\s*up\b/i,
  /\bsimplif(y|ies|ied)\b/i,
];

/**
 * Categorize a single file based on its path
 */
export function categorizeByPath(filePath: string): FileChange['category'] {
  // Check patterns in order of specificity
  for (const pattern of PATTERNS.test) {
    if (pattern.test(filePath)) return 'test';
  }

  for (const pattern of PATTERNS.types) {
    if (pattern.test(filePath)) return 'config'; // Types are like config
  }

  for (const pattern of PATTERNS.docs) {
    if (pattern.test(filePath)) return 'docs';
  }

  for (const pattern of PATTERNS.config) {
    if (pattern.test(filePath)) return 'config';
  }

  // Source files - check if it's in src/ or lib/
  if (/^(?:src|lib|app|components|pages|features)\//i.test(filePath)) {
    return 'new-feature'; // Will be refined based on commit message
  }

  return 'unknown';
}

/**
 * Check if commit message indicates a bugfix
 */
export function isBugfixCommit(message: string): boolean {
  return BUGFIX_KEYWORDS.some(pattern => pattern.test(message));
}

/**
 * Check if commit message indicates a refactor
 */
export function isRefactorCommit(message: string): boolean {
  return REFACTOR_KEYWORDS.some(pattern => pattern.test(message));
}

/**
 * Categorize file changes based on paths and commit messages
 */
export function categorizeFiles(
  files: GitFileDiff[],
  commits: GitCommit[] = []
): FileChange[] {
  // Collect commit messages
  const commitMessages = commits.map(c => c.message).join(' ');
  const hasBugfixCommit = isBugfixCommit(commitMessages);
  const hasRefactorCommit = isRefactorCommit(commitMessages);

  return files.map(file => {
    let category = categorizeByPath(file.path);

    // Refine category based on file status and commit messages
    if (file.status === 'added') {
      // New files in src are new features
      if (category === 'unknown' || category === 'new-feature') {
        category = 'new-feature';
      }
    } else if (file.status === 'modified') {
      // Modified source files - check commit message
      if (category === 'new-feature' || category === 'unknown') {
        if (hasBugfixCommit) {
          category = 'bugfix';
        } else if (hasRefactorCommit) {
          category = 'refactor';
        } else {
          // Default to refactor for modified files without clear indicator
          category = 'refactor';
        }
      }
    } else if (file.status === 'deleted') {
      category = 'refactor';
    }

    // Calculate complexity (simple line-based for now)
    const complexity = calculateComplexity(file);

    return {
      path: file.path,
      category,
      linesAdded: file.additions,
      linesRemoved: file.deletions,
      complexityDelta: complexity,
    };
  });
}

/**
 * Calculate complexity delta based on line changes
 * Simple heuristic: more lines = more complexity
 */
function calculateComplexity(file: GitFileDiff): number {
  const totalChanges = file.additions + file.deletions;

  // Simple complexity score based on changes
  if (totalChanges > 200) return 5; // Major change
  if (totalChanges > 100) return 4; // Large change
  if (totalChanges > 50) return 3;  // Medium change
  if (totalChanges > 20) return 2;  // Small change
  if (totalChanges > 0) return 1;   // Minor change
  return 0;
}

/**
 * Sort files by impact (most changed first)
 */
export function sortByImpact(files: FileChange[]): FileChange[] {
  return [...files].sort((a, b) => {
    // Sort by total lines changed (descending)
    const aTotal = a.linesAdded + a.linesRemoved;
    const bTotal = b.linesAdded + b.linesRemoved;
    return bTotal - aTotal;
  });
}

/**
 * Get category display name
 */
export function getCategoryLabel(category: FileChange['category']): string {
  switch (category) {
    case 'new-feature': return 'New Feature';
    case 'bugfix': return 'Bug Fix';
    case 'refactor': return 'Refactor';
    case 'config': return 'Config';
    case 'test': return 'Test';
    case 'docs': return 'Docs';
    default: return 'Other';
  }
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: FileChange['category']): string {
  switch (category) {
    case 'new-feature': return '✨';
    case 'bugfix': return '🐛';
    case 'refactor': return '♻️';
    case 'config': return '⚙️';
    case 'test': return '🧪';
    case 'docs': return '📝';
    default: return '📄';
  }
}

/**
 * Group files by category
 */
export function groupByCategory(files: FileChange[]): Map<FileChange['category'], FileChange[]> {
  const groups = new Map<FileChange['category'], FileChange[]>();

  for (const file of files) {
    const existing = groups.get(file.category) || [];
    existing.push(file);
    groups.set(file.category, existing);
  }

  return groups;
}
