/**
 * AB003: Optimistic Type Assertions Detection
 *
 * Detects unsafe TypeScript type assertions and anti-patterns that bypass
 * or weaken type checking. Comprehensive detection for:
 * - Type assertions (as any, as unknown, double casting)
 * - Non-null assertions and optional chaining abuse
 * - TypeScript directive comments (ts-ignore, ts-nocheck, ts-expect-error)
 * - Unsafe type patterns (Function, Object, {})
 * - Implicit any patterns
 * - Generic type erasure
 * - Type guard bypasses
 */

import type { RiskFinding } from '../types.js';
import type { Rule } from './index.js';

interface AssertionPattern {
  name: string;
  category: string;
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warn' | 'info';
  suggestion?: string;
}

const ASSERTION_PATTERNS: AssertionPattern[] = [
  // ========================================
  // Category: Type Assertions (as X)
  // ========================================
  {
    name: 'As Any',
    category: 'Type Assertions',
    pattern: /as\s+any(?:\s*[;,)\]}]|\s*$)/g,
    message: 'Type assertion to "any" bypasses type checking',
    severity: 'warn',
    suggestion: 'Use specific type or type guard instead',
  },
  {
    name: 'As Unknown Cast',
    category: 'Type Assertions',
    pattern: /as\s+unknown(?:\s*[;,)\]}]|\s*$)/g,
    message: 'Casting to unknown may indicate type system workaround',
    severity: 'info',
    suggestion: 'Consider using proper type narrowing',
  },
  {
    name: 'Double Cast via Unknown',
    category: 'Type Assertions',
    pattern: /as\s+unknown\s+as\s+\w+/g,
    message: 'Double type casting (as unknown as X) forces unsafe type conversion',
    severity: 'warn',
    suggestion: 'Use type guard or proper type transformation',
  },
  {
    name: 'Double Cast via Any',
    category: 'Type Assertions',
    pattern: /as\s+any\s+as\s+\w+/g,
    message: 'Double type casting via any completely bypasses type safety',
    severity: 'error',
    suggestion: 'Refactor to use proper types or type guards',
  },
  {
    name: 'As Never Cast',
    category: 'Type Assertions',
    pattern: /as\s+never(?:\s*[;,)\]}]|\s*$)/g,
    message: 'Casting to never is typically a type system hack',
    severity: 'warn',
    suggestion: 'Review logic to ensure this is intentional',
  },
  {
    name: 'Angle Bracket Any',
    category: 'Type Assertions',
    pattern: /<any>\s*\w+/g,
    message: 'Angle bracket type assertion to any',
    severity: 'warn',
    suggestion: 'Use specific type assertion',
  },
  {
    name: 'Angle Bracket Unknown',
    category: 'Type Assertions',
    pattern: /<unknown>\s*\w+/g,
    message: 'Angle bracket assertion to unknown',
    severity: 'info',
  },
  {
    name: 'JSON Parse Unsafe',
    category: 'Type Assertions',
    pattern: /JSON\.parse\([^)]+\)\s+as\s+(?!unknown)/g,
    message: 'JSON.parse result cast to specific type without validation',
    severity: 'warn',
    suggestion: 'Validate parsed JSON with runtime type check or schema',
  },

  // ========================================
  // Category: Non-Null Assertions
  // ========================================
  {
    name: 'Non-Null Assertion',
    category: 'Non-Null Assertions',
    pattern: /\w+!(?:\.|(?:\s*[;,)\]}>]))/g,
    message: 'Non-null assertion operator (!) assumes value is not null/undefined',
    severity: 'info',
    suggestion: 'Use optional chaining or explicit null check',
  },
  {
    name: 'Chained Non-Null',
    category: 'Non-Null Assertions',
    pattern: /\w+!\.[\w.]+!/g,
    message: 'Multiple non-null assertions in chain indicate uncertain types',
    severity: 'warn',
    suggestion: 'Add proper null checks or fix types',
  },
  {
    name: 'Non-Null in Return',
    category: 'Non-Null Assertions',
    pattern: /return\s+[\w.]+!/g,
    message: 'Non-null assertion in return statement may cause runtime errors',
    severity: 'warn',
    suggestion: 'Validate before returning or change return type',
  },
  {
    name: 'Non-Null Property Access',
    category: 'Non-Null Assertions',
    pattern: /\]\s*!\s*\./g,
    message: 'Non-null assertion after array/object access',
    severity: 'warn',
    suggestion: 'Check array bounds or use optional chaining',
  },
  {
    name: 'Non-Null Function Call',
    category: 'Non-Null Assertions',
    pattern: /\)!\s*[.(]/g,
    message: 'Non-null assertion after function call result',
    severity: 'warn',
    suggestion: 'Handle potential undefined return value',
  },

  // ========================================
  // Category: TypeScript Directives
  // ========================================
  {
    name: 'TS Ignore',
    category: 'TypeScript Directives',
    pattern: /\/\/\s*@ts-ignore(?:\s|$)/g,
    message: 'ts-ignore suppresses TypeScript errors without explanation',
    severity: 'warn',
    suggestion: 'Use ts-expect-error with explanation or fix the type error',
  },
  {
    name: 'TS Expect Error',
    category: 'TypeScript Directives',
    pattern: new RegExp('\\/\\/\\s*@ts-expect-error(?:\\s|$)', 'g'),
    message: 'ts-expect-error comment suppresses TypeScript errors',
    severity: 'info',
    suggestion: 'Document why this is necessary',
  },
  {
    name: 'TS No Check',
    category: 'TypeScript Directives',
    pattern: /\/\/\s*@ts-nocheck(?:\s|$)/g,
    message: 'ts-nocheck disables type checking for entire file',
    severity: 'error',
    suggestion: 'Fix type errors instead of disabling checks',
  },
  {
    name: 'ESLint Disable Any',
    category: 'TypeScript Directives',
    pattern: /\/\/\s*eslint-disable[^*\n]*@typescript-eslint\/no-explicit-any/g,
    message: 'ESLint disable for no-explicit-any rule',
    severity: 'info',
    suggestion: 'Consider using unknown or specific type',
  },
  {
    name: 'ESLint Disable Unsafe',
    category: 'TypeScript Directives',
    pattern: /\/\/\s*eslint-disable[^*\n]*@typescript-eslint\/no-unsafe/g,
    message: 'ESLint disable for unsafe type operations',
    severity: 'warn',
    suggestion: 'Review and fix the unsafe operation',
  },

  // ========================================
  // Category: Unsafe Type Patterns
  // ========================================
  {
    name: 'Object Type',
    category: 'Unsafe Type Patterns',
    pattern: /:\s*Object(?:\s*[;,)\]|&]|\s*$)/g,
    message: 'Using Object type instead of specific object type',
    severity: 'info',
    suggestion: 'Use Record<string, unknown> or specific interface',
  },
  {
    name: 'Empty Object Type',
    category: 'Unsafe Type Patterns',
    pattern: /:\s*\{\s*\}(?:\s*[;,)\]|&]|\s*$)/g,
    message: 'Empty object type {} accepts any non-nullish value',
    severity: 'info',
    suggestion: 'Use Record<string, never> or specific type',
  },
  {
    name: 'Function Type',
    category: 'Unsafe Type Patterns',
    pattern: /:\s*Function(?:\s*[;,)\]|&]|\s*$)/g,
    message: 'Using Function type instead of specific function signature',
    severity: 'warn',
    suggestion: 'Define specific function type: (...args: X[]) => Y',
  },
  {
    name: 'Any Array',
    category: 'Unsafe Type Patterns',
    pattern: /:\s*any\s*\[\s*\]/g,
    message: 'Array of any loses element type safety',
    severity: 'warn',
    suggestion: 'Use unknown[] or specific element type',
  },
  {
    name: 'Any in Generic',
    category: 'Unsafe Type Patterns',
    pattern: /<\s*any\s*(?:,\s*any\s*)*>/g,
    message: 'Using any as generic type parameter',
    severity: 'warn',
    suggestion: 'Use specific type or unknown',
  },
  {
    name: 'Any in Union',
    category: 'Unsafe Type Patterns',
    pattern: /\|\s*any(?:\s*[;,)\]|&>]|\s*$)/g,
    message: 'Any in union type makes entire union unsafe',
    severity: 'warn',
    suggestion: 'Remove any from union',
  },
  {
    name: 'Any Return Type',
    category: 'Unsafe Type Patterns',
    pattern: /\)\s*:\s*any\s*(?:\{|=>)/g,
    message: 'Function with explicit any return type',
    severity: 'warn',
    suggestion: 'Specify proper return type',
  },
  {
    name: 'Any Parameter',
    category: 'Unsafe Type Patterns',
    pattern: /\(\s*\w+\s*:\s*any(?:\s*[,)])/g,
    message: 'Function parameter typed as any',
    severity: 'warn',
    suggestion: 'Use specific type or unknown',
  },
  {
    name: 'Promise Any',
    category: 'Unsafe Type Patterns',
    pattern: /Promise\s*<\s*any\s*>/g,
    message: 'Promise with any type parameter',
    severity: 'warn',
    suggestion: 'Use specific type or Promise<unknown>',
  },
  {
    name: 'Record String Any',
    category: 'Unsafe Type Patterns',
    pattern: /Record\s*<\s*string\s*,\s*any\s*>/g,
    message: 'Record with any value type',
    severity: 'info',
    suggestion: 'Use Record<string, unknown> for better type safety',
  },
  {
    name: 'Map Any Value',
    category: 'Unsafe Type Patterns',
    pattern: /Map\s*<\s*\w+\s*,\s*any\s*>/g,
    message: 'Map with any value type',
    severity: 'info',
    suggestion: 'Use specific value type or unknown',
  },
  {
    name: 'Set Any',
    category: 'Unsafe Type Patterns',
    pattern: /Set\s*<\s*any\s*>/g,
    message: 'Set with any element type',
    severity: 'info',
    suggestion: 'Use specific element type',
  },

  // ========================================
  // Category: Implicit Any Patterns
  // ========================================
  {
    name: 'Untyped Catch',
    category: 'Implicit Any',
    pattern: /catch\s*\(\s*(\w+)\s*\)\s*\{/g,
    message: 'Catch clause parameter is implicitly any (pre-TS 4.4 or no strict)',
    severity: 'info',
    suggestion: 'Use catch (error: unknown) or catch (error)',
  },
  {
    name: 'Empty Arrow Params',
    category: 'Implicit Any',
    pattern: /=\s*\(\s*\w+(?:\s*,\s*\w+)*\s*\)\s*=>/g,
    message: 'Arrow function with untyped parameters (may be implicit any)',
    severity: 'info',
    suggestion: 'Add type annotations to parameters',
  },
  {
    name: 'Callback Without Types',
    category: 'Implicit Any',
    pattern: /\.(?:map|filter|reduce|forEach|find|some|every)\s*\(\s*\(\s*\w+(?:\s*,\s*\w+)*\s*\)\s*=>/g,
    message: 'Array callback with untyped parameters',
    severity: 'info',
    suggestion: 'Add type annotations if not inferred correctly',
  },

  // ========================================
  // Category: Type Guard Bypasses
  // ========================================
  {
    name: 'Is Any Type Guard',
    category: 'Type Guard Bypasses',
    pattern: /is\s+any(?:\s*[;,)\]}]|\s*$)/g,
    message: 'Type guard returning "is any" is useless',
    severity: 'warn',
    suggestion: 'Use specific type in type guard',
  },
  {
    name: 'Typeof Any Compare',
    category: 'Type Guard Bypasses',
    pattern: /typeof\s+\w+\s*===?\s*["']any["']/g,
    message: 'typeof comparison with "any" string (typo or mistake)',
    severity: 'error',
    suggestion: 'typeof returns "object", "string", etc., not "any"',
  },
  {
    name: 'Instanceof Any',
    category: 'Type Guard Bypasses',
    pattern: /instanceof\s+Object(?:\s*[;,)\]|&?:]|\s*$)/g,
    message: 'instanceof Object is too broad',
    severity: 'info',
    suggestion: 'Use specific class or type guard',
  },

  // ========================================
  // Category: Unsafe Property Access
  // ========================================
  {
    name: 'Bracket Access String',
    category: 'Unsafe Property Access',
    pattern: /\[\s*\w+\s*\]\s*as\s+/g,
    message: 'Dynamic property access with type assertion',
    severity: 'info',
    suggestion: 'Use typed key or Record type',
  },
  {
    name: 'Index Signature Any',
    category: 'Unsafe Property Access',
    pattern: /\[\s*\w+\s*:\s*string\s*\]\s*:\s*any/g,
    message: 'Index signature with any value type',
    severity: 'warn',
    suggestion: 'Use specific value type or unknown',
  },
  {
    name: 'Object Entries Unsafe',
    category: 'Unsafe Property Access',
    pattern: /Object\.entries\([^)]+\)\s+as\s+/g,
    message: 'Object.entries result cast to different type',
    severity: 'info',
    suggestion: 'Properly type the input object',
  },
  {
    name: 'Object Keys Cast',
    category: 'Unsafe Property Access',
    pattern: /Object\.keys\([^)]+\)\s+as\s+/g,
    message: 'Object.keys result cast (keys are always string[])',
    severity: 'info',
    suggestion: 'Use keyof typeof or type the object correctly',
  },

  // ========================================
  // Category: Unsafe Async Patterns
  // ========================================
  {
    name: 'Await Any',
    category: 'Unsafe Async',
    pattern: /await\s+\([^)]+\s+as\s+any\)/g,
    message: 'Awaiting expression cast to any',
    severity: 'warn',
    suggestion: 'Fix the promise type instead',
  },
  {
    name: 'Then Any Callback',
    category: 'Unsafe Async',
    pattern: /\.then\s*\(\s*\(\s*\w+\s*:\s*any\s*\)/g,
    message: 'Promise .then callback with any parameter',
    severity: 'warn',
    suggestion: 'Let TypeScript infer the type or use proper type',
  },
  {
    name: 'Catch Any Error',
    category: 'Unsafe Async',
    pattern: /\.catch\s*\(\s*\(\s*\w+\s*:\s*any\s*\)/g,
    message: 'Promise .catch with any-typed error',
    severity: 'info',
    suggestion: 'Use unknown and narrow with type guards',
  },

  // ========================================
  // Category: Unsafe Declarations
  // ========================================
  {
    name: 'Const Any',
    category: 'Unsafe Declarations',
    pattern: /(?:const|let|var)\s+\w+\s*:\s*any\s*=/g,
    message: 'Variable explicitly typed as any',
    severity: 'warn',
    suggestion: 'Infer type or use specific type',
  },
  {
    name: 'Property Any',
    category: 'Unsafe Declarations',
    pattern: /(?:public|private|protected|readonly)?\s*\w+\s*:\s*any\s*[;=]/g,
    message: 'Class property typed as any',
    severity: 'warn',
    suggestion: 'Use specific type',
  },
  {
    name: 'Interface Any Property',
    category: 'Unsafe Declarations',
    pattern: /^\s*\w+\s*\??\s*:\s*any\s*;/gm,
    message: 'Interface/type property typed as any',
    severity: 'warn',
    suggestion: 'Use specific type or unknown',
  },

  // ========================================
  // Category: Unsafe Type Operations
  // ========================================
  {
    name: 'Spread Into Any',
    category: 'Unsafe Type Operations',
    pattern: /\.\.\.[\w.]+\s+as\s+any/g,
    message: 'Spread operator with any assertion',
    severity: 'warn',
    suggestion: 'Type the source object correctly',
  },
  {
    name: 'Destructure Any',
    category: 'Unsafe Type Operations',
    pattern: /(?:const|let|var)\s*\{[^}]+\}\s*=\s*\w+\s+as\s+any/g,
    message: 'Destructuring from any-cast expression',
    severity: 'warn',
    suggestion: 'Type the source properly',
  },
  {
    name: 'Module Augmentation Any',
    category: 'Unsafe Type Operations',
    pattern: /declare\s+(?:module|namespace)[^{]+\{[^}]*:\s*any/gs,
    message: 'Module augmentation with any type',
    severity: 'info',
    suggestion: 'Provide proper types in declaration',
  },
];

// Patterns that indicate legitimate use
const LEGITIMATE_PATTERNS = [
  /\/\/\s*(?:required|necessary|intentional|safe|tested|verified|validated)/i,
  /\/\*\s*(?:required|necessary|intentional|safe|tested|verified|validated)/i,
  /type\s+guard/i,
  /assertion\s+function/i,
  /runtime\s+(?:check|validation)/i,
  /schema\s+validation/i,
  /zod|yup|joi|ajv/i, // Schema validation libraries
  /type[dD]ef|interface|type\s+\w+\s*=/i, // Type definition context
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /test[s]?\//,
  /\.d\.ts$/,  // Type declaration files
  /node_modules\//,
  /vendor\//,
  /generated\//,
  /\.generated\.[jt]sx?$/,
  /\.min\.[jt]s$/,
];

// Strings to exclude (rule documentation, comments about patterns)
const CONTENT_EXCLUDE_PATTERNS = [
  /['"]as any['"]/,  // Strings containing the pattern
  /['"]@ts-ignore['"]/,
  /pattern:\s*\//,   // Regex pattern definitions
  /message:\s*['"]/,  // Message strings
  /\/\/.*example/i,   // Example comments
  /\/\/.*e\.g\./i,
];

function shouldExcludeFile(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function shouldExcludeMatch(content: string, matchIndex: number, matchText: string): boolean {
  // Check if match is inside a string (documentation)
  const beforeMatch = content.substring(Math.max(0, matchIndex - 50), matchIndex);
  const afterMatch = content.substring(matchIndex, Math.min(content.length, matchIndex + matchText.length + 50));

  // Check for content exclusion patterns
  const context = beforeMatch + afterMatch;
  if (CONTENT_EXCLUDE_PATTERNS.some(pattern => pattern.test(context))) {
    return true;
  }

  return false;
}

function hasLegitimateComment(content: string, matchIndex: number): boolean {
  const beforeMatch = content.substring(Math.max(0, matchIndex - 150), matchIndex);
  const lines = beforeMatch.split('\n');
  const lastLine = lines[lines.length - 1] || '';
  const prevLine = lines[lines.length - 2] || '';

  return LEGITIMATE_PATTERNS.some(
    pattern => pattern.test(lastLine) || pattern.test(prevLine)
  );
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

export const ab003TypeAssertions: Rule = {
  id: 'AB003',
  name: 'Optimistic Type Assertions',
  description: 'Detects unsafe TypeScript type assertions and anti-patterns',
  defaultSeverity: 'warn',
  appliesTo: ['.ts', '.tsx'],

  check(content: string, filePath: string): RiskFinding[] {
    const findings: RiskFinding[] = [];

    // Skip excluded files
    if (shouldExcludeFile(filePath)) {
      return findings;
    }

    // Track counts by category for summary
    const categoryCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = { error: 0, warn: 0, info: 0 };

    for (const { name, category, pattern, message, severity, suggestion } of ASSERTION_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Skip if there's a legitimate comment
        if (hasLegitimateComment(content, match.index)) {
          continue;
        }

        // Skip if it's inside a documentation/string context
        if (shouldExcludeMatch(content, match.index, match[0])) {
          continue;
        }

        const lineNum = getLineNumber(content, match.index);
        const snippet = getSnippet(content, match.index);

        // Track counts
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        severityCounts[severity]++;

        const fullMessage = suggestion ? `${message}. ${suggestion}` : message;

        findings.push({
          ruleId: 'AB003',
          severity,
          file: filePath,
          line: lineNum,
          message: `[${name}] ${fullMessage}`,
          snippet: snippet.length > 80 ? snippet.substring(0, 77) + '...' : snippet,
        });
      }
    }

    // Add summary warnings for high-frequency issues
    const totalIssues = Object.values(severityCounts).reduce((a, b) => a + b, 0);

    if (totalIssues > 10) {
      const categoryList = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([cat, count]) => `${cat}: ${count}`)
        .join(', ');

      findings.unshift({
        ruleId: 'AB003',
        severity: severityCounts.error > 0 ? 'error' : 'warn',
        file: filePath,
        line: 1,
        message: `High type safety concern: ${totalIssues} issues detected (${severityCounts.error} errors, ${severityCounts.warn} warnings)`,
        snippet: `Top categories: ${categoryList}`,
      });
    }

    // Special warning for files with multiple ts-ignore/nocheck
    const directiveCount = (categoryCounts['TypeScript Directives'] || 0);
    if (directiveCount >= 3) {
      findings.unshift({
        ruleId: 'AB003',
        severity: 'warn',
        file: filePath,
        line: 1,
        message: `File has ${directiveCount} TypeScript directives suppressing type checks`,
        snippet: 'Consider fixing underlying type issues',
      });
    }

    return findings;
  },
};
