/**
 * AB005: Missing Null/Undefined Checks Detection
 *
 * Detects potential null/undefined access patterns:
 * - Function parameters used without nullish checks
 * - Object property access without optional chaining
 * - Array access without bounds checking
 * - Return values used without existence check
 */

import type { RiskFinding } from '../types.js';
import type { Rule } from './index.js';

interface NullCheckPattern {
  name: string;
  pattern: RegExp;
  safePattern?: RegExp; // If this matches in context, it's safe
  message: string;
  severity: 'error' | 'warn' | 'info';
  suggestion: string;
}

// ============================================================================
// PROPERTY ACCESS PATTERNS
// ============================================================================
const PROPERTY_ACCESS_PATTERNS: NullCheckPattern[] = [
  // Deep property access without optional chaining
  {
    name: 'Deep Property Access',
    pattern: /(\w+)\.(\w+)\.(\w+)\.(\w+)/g,
    safePattern: /\?\./,
    message: 'Deep property access without optional chaining',
    severity: 'info',
    suggestion: 'Consider using optional chaining: obj?.prop1?.prop2?.prop3',
  },
  // Property access on function result
  {
    name: 'Function Result Property',
    pattern: /\b(?:find|get|fetch|load|query)\w*\s*\([^)]*\)\s*\.(?!\s*(?:then|catch|finally))/g,
    safePattern: /\?\./,
    message: 'Accessing property on function result that may return null/undefined',
    severity: 'warn',
    suggestion: 'Use optional chaining: result?.property',
  },
  // Array find result used directly
  {
    name: 'Array Find Direct Use',
    pattern: /\.find\s*\([^)]+\)\s*\./g,
    safePattern: /\?\./,
    message: 'Array.find() result used directly without null check',
    severity: 'warn',
    suggestion: 'Use optional chaining or check for undefined: arr.find(...)?.prop',
  },
  // Map.get result used directly
  {
    name: 'Map Get Direct Use',
    pattern: /\.get\s*\([^)]+\)\s*\./g,
    safePattern: /\?\./,
    message: 'Map.get() result used directly without undefined check',
    severity: 'warn',
    suggestion: 'Use optional chaining: map.get(key)?.prop',
  },
];

// ============================================================================
// ARRAY ACCESS PATTERNS
// ============================================================================
const ARRAY_ACCESS_PATTERNS: NullCheckPattern[] = [
  // Direct array index access on variable
  {
    name: 'Array Index Access',
    pattern: /(\w+)\[(\d+|[\w.]+)\]\./g,
    safePattern: /\?\[|\?\.|\?\s*&&/,
    message: 'Array index access without bounds check',
    severity: 'info',
    suggestion: 'Consider checking array length or using optional chaining: arr[0]?.prop',
  },
  // Array destructuring without default
  {
    name: 'Array Destructure No Default',
    pattern: /const\s+\[\s*(\w+)\s*\]\s*=\s*\w+(?!\.filter|\.map)/g,
    safePattern: /=\s*\w+\s*\|\||\?\?/,
    message: 'Array destructuring first element may be undefined',
    severity: 'info',
    suggestion: 'Provide default: const [item = defaultValue] = arr',
  },
  // pop/shift result used directly
  {
    name: 'Pop Shift Direct Use',
    pattern: /\.(?:pop|shift)\s*\(\s*\)\s*\./g,
    safePattern: /\?\./,
    message: 'pop()/shift() result used directly (may be undefined on empty array)',
    severity: 'warn',
    suggestion: 'Check result before accessing properties',
  },
];

// ============================================================================
// PARAMETER ACCESS PATTERNS
// ============================================================================
const PARAMETER_PATTERNS: NullCheckPattern[] = [
  // Object destructuring in parameters without defaults
  {
    name: 'Param Destructure No Default',
    pattern: /function\s+\w+\s*\(\s*\{\s*\w+\s*\}\s*[^=)]/g,
    message: 'Destructured parameter without default value',
    severity: 'info',
    suggestion: 'Provide default: function fn({ prop = defaultValue })',
  },
  // Optional parameter property access
  {
    name: 'Optional Param Property',
    pattern: /function\s+\w+\s*\([^)]*(\w+)\?\s*:[^)]+\)[^{]*\{[^}]*\1\./g,
    safePattern: /\?\.|if\s*\(/,
    message: 'Optional parameter used without null check',
    severity: 'warn',
    suggestion: 'Check if parameter exists before accessing properties',
  },
];

// ============================================================================
// RETURN VALUE PATTERNS
// ============================================================================
const RETURN_VALUE_PATTERNS: NullCheckPattern[] = [
  // JSON.parse result used directly
  {
    name: 'JSON Parse Direct Use',
    pattern: /JSON\.parse\s*\([^)]+\)\s*\./g,
    safePattern: /\?\./,
    message: 'JSON.parse result used directly without null check',
    severity: 'info',
    suggestion: 'JSON.parse can return null, check before property access',
  },
  // querySelector result used directly
  {
    name: 'QuerySelector Direct Use',
    pattern: /(?:querySelector|getElementById|getElementsByClassName)\s*\([^)]+\)\s*\.(?!(?:length|forEach))/g,
    safePattern: /\?\./,
    message: 'DOM query result used directly without null check',
    severity: 'warn',
    suggestion: 'Element may not exist, use optional chaining or check for null',
  },
  // localStorage.getItem used directly
  {
    name: 'LocalStorage Direct Use',
    pattern: /localStorage\.getItem\s*\([^)]+\)\s*\./g,
    safePattern: /\?\./,
    message: 'localStorage.getItem result used directly (may return null)',
    severity: 'warn',
    suggestion: 'Check for null before accessing properties',
  },
  // sessionStorage.getItem used directly
  {
    name: 'SessionStorage Direct Use',
    pattern: /sessionStorage\.getItem\s*\([^)]+\)\s*\./g,
    safePattern: /\?\./,
    message: 'sessionStorage.getItem result used directly (may return null)',
    severity: 'warn',
    suggestion: 'Check for null before accessing properties',
  },
];

// ============================================================================
// ASYNC/PROMISE PATTERNS
// ============================================================================
const ASYNC_PATTERNS: NullCheckPattern[] = [
  // Await result property access
  {
    name: 'Await Result Direct Use',
    pattern: /\(\s*await\s+\w+[^)]*\)\s*\./g,
    safePattern: /\?\./,
    message: 'Await result used directly without null check',
    severity: 'info',
    suggestion: 'Async operations may return null/undefined',
  },
  // Response.json() property access
  {
    name: 'Response JSON Direct Use',
    pattern: /\.json\s*\(\s*\)\s*\)\s*\./g,
    safePattern: /\?\./,
    message: 'Response JSON parsed and accessed directly',
    severity: 'info',
    suggestion: 'JSON response may be null or have unexpected shape',
  },
];

// ============================================================================
// OBJECT PATTERNS
// ============================================================================
const OBJECT_PATTERNS: NullCheckPattern[] = [
  // Object.keys/values/entries on potentially null
  {
    name: 'Object Keys On Variable',
    pattern: /Object\.(?:keys|values|entries)\s*\(\s*\w+\s*\)/g,
    safePattern: /\w+\s*&&\s*Object\.|if\s*\(\s*\w+\s*\)/,
    message: 'Object methods called on value that may be null/undefined',
    severity: 'info',
    suggestion: 'Ensure object exists before calling Object.keys/values/entries',
  },
  // Spread operator on potentially null
  {
    name: 'Spread Potentially Null',
    pattern: /\{\s*\.{3}\s*\w+\s*[,}]/g,
    safePattern: /\w+\s*&&|\w+\s*\?\?|\w+\s*\|\|/,
    message: 'Spread operator on value that may be null/undefined',
    severity: 'info',
    suggestion: 'Provide fallback: { ...obj ?? {} }',
  },
  // for...in on potentially null
  {
    name: 'ForIn On Variable',
    pattern: /for\s*\(\s*(?:const|let|var)\s+\w+\s+in\s+(\w+)\s*\)/g,
    safePattern: /if\s*\(|&&/,
    message: 'for...in on value that may be null/undefined',
    severity: 'warn',
    suggestion: 'Check object exists before iterating',
  },
  // for...of on potentially null
  {
    name: 'ForOf On Variable',
    pattern: /for\s*\(\s*(?:const|let|var)\s+\w+\s+of\s+(\w+)\s*\)/g,
    safePattern: /if\s*\(|&&|\?\?/,
    message: 'for...of on value that may be null/undefined',
    severity: 'warn',
    suggestion: 'Check array exists: for (const x of arr ?? [])',
  },
];

// ============================================================================
// TYPESCRIPT-SPECIFIC PATTERNS
// ============================================================================
const TYPESCRIPT_PATTERNS: NullCheckPattern[] = [
  // Using ! non-null assertion
  {
    name: 'Non-Null Assertion',
    pattern: /\w+!\./g,
    message: 'Non-null assertion (!) bypasses type safety',
    severity: 'warn',
    suggestion: 'Use optional chaining or proper null checks instead',
  },
  // Type assertion from nullable
  {
    name: 'Type Assert From Nullable',
    pattern: /as\s+(?!const|any|unknown|never)[\w<>[\]]+(?:\s*\||\s*[,;)])/g,
    safePattern: /as\s+const/,
    message: 'Type assertion may hide null/undefined issues',
    severity: 'info',
    suggestion: 'Consider using type guards instead of assertions',
  },
];

// Combine all patterns
const ALL_NULL_CHECK_PATTERNS: NullCheckPattern[] = [
  ...PROPERTY_ACCESS_PATTERNS,
  ...ARRAY_ACCESS_PATTERNS,
  ...PARAMETER_PATTERNS,
  ...RETURN_VALUE_PATTERNS,
  ...ASYNC_PATTERNS,
  ...OBJECT_PATTERNS,
  ...TYPESCRIPT_PATTERNS,
];

// Files to exclude
const EXCLUDE_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /\.d\.ts$/,
];

function shouldExcludeFile(filePath: string): boolean {
  return EXCLUDE_FILE_PATTERNS.some(pattern => pattern.test(filePath));
}

function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

function getSnippet(content: string, index: number): string {
  const lines = content.split('\n');
  const lineNum = getLineNumber(content, index);
  const line = lines[lineNum - 1];
  return line?.trim().substring(0, 100) || '';
}

function getContext(content: string, index: number, range: number = 100): string {
  const start = Math.max(0, index - range);
  const end = Math.min(content.length, index + range);
  return content.substring(start, end);
}

export const ab005NullChecks: Rule = {
  id: 'AB005',
  name: 'Missing Null/Undefined Checks',
  description: 'Detects potential null/undefined access without proper guards',
  defaultSeverity: 'info',
  appliesTo: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],

  check(content: string, filePath: string): RiskFinding[] {
    const findings: RiskFinding[] = [];

    if (shouldExcludeFile(filePath)) {
      return findings;
    }

    // Check if file has TypeScript strict null checks
    const hasStrictNullChecks = content.includes('// @ts-check') ||
      content.includes('"strict": true') ||
      content.includes('"strictNullChecks": true');

    // Track reported lines
    const reported = new Set<string>();

    for (const { name, pattern, safePattern, message, severity, suggestion } of ALL_NULL_CHECK_PATTERNS) {
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNum = getLineNumber(content, match.index);
        const key = `${lineNum}:${name}`;

        if (reported.has(key)) {
          continue;
        }

        // Check if safe pattern exists in context
        if (safePattern) {
          const context = getContext(content, match.index);
          if (safePattern.test(context)) {
            continue; // Skip - has proper guard
          }
        }

        reported.add(key);
        const snippet = getSnippet(content, match.index);

        // Reduce severity if TypeScript strict mode is enabled
        const effectiveSeverity = hasStrictNullChecks && severity === 'warn' ? 'info' : severity;

        findings.push({
          ruleId: 'AB005',
          severity: effectiveSeverity,
          file: filePath,
          line: lineNum,
          message: `${message}. ${suggestion}`,
          snippet: snippet.length > 80 ? snippet.substring(0, 77) + '...' : snippet,
        });
      }
    }

    // Add summary if many issues found
    if (findings.length >= 10) {
      findings.unshift({
        ruleId: 'AB005',
        severity: 'warn',
        file: filePath,
        line: 1,
        message: `File has ${findings.length} potential null/undefined access issues`,
        snippet: 'Consider enabling TypeScript strict null checks',
      });
    }

    return findings;
  },
};
