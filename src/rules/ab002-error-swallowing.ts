/**
 * AB002: Error Handling Anti-Patterns Detection (Enhanced)
 *
 * Comprehensive detection of improper error handling:
 * - Empty catch blocks
 * - Console-only error handling
 * - Swallowed errors (ignored parameters)
 * - Missing error propagation
 * - Async/await without try-catch
 * - Promise anti-patterns
 * - Callback error ignoring
 * - Silent failure patterns
 */

import type { RiskFinding } from '../types.js';
import type { Rule } from './index.js';

interface ErrorPattern {
  name: string;
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warn' | 'info';
  suggestion?: string;
}

// ============================================================================
// EMPTY CATCH BLOCKS
// ============================================================================
const EMPTY_CATCH_PATTERNS: ErrorPattern[] = [
  // Empty catch block (single line)
  {
    name: 'Empty Catch Block',
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    message: 'Empty catch block silently swallows errors',
    severity: 'error',
    suggestion: 'Log the error or rethrow it',
  },
  // Catch with only a comment
  {
    name: 'Catch With Only Comment',
    pattern: /catch\s*\([^)]*\)\s*\{\s*\/\/[^\n]*\s*\}/g,
    message: 'Catch block only contains a comment, error is swallowed',
    severity: 'error',
    suggestion: 'Handle or log the error properly',
  },
  // Empty finally without catch
  {
    name: 'Try Without Catch',
    pattern: /try\s*\{[^}]+\}\s*finally\s*\{/g,
    message: 'Try block without catch may miss errors',
    severity: 'info',
    suggestion: 'Consider adding a catch block for error handling',
  },
];

// ============================================================================
// CONSOLE-ONLY ERROR HANDLING
// ============================================================================
const CONSOLE_ONLY_PATTERNS: ErrorPattern[] = [
  // Catch with only console.log
  {
    name: 'Console Log Only',
    pattern: /catch\s*\([^)]*\)\s*\{\s*console\.log\s*\([^)]*\)\s*;?\s*\}/g,
    message: 'Catch block only logs error without proper handling',
    severity: 'warn',
    suggestion: 'Consider rethrowing, returning error state, or using proper error reporting',
  },
  // Catch with only console.warn
  {
    name: 'Console Warn Only',
    pattern: /catch\s*\([^)]*\)\s*\{\s*console\.warn\s*\([^)]*\)\s*;?\s*\}/g,
    message: 'Catch block only warns without proper handling',
    severity: 'warn',
    suggestion: 'Consider error recovery or proper error reporting',
  },
  // Catch with only console.error
  {
    name: 'Console Error Only',
    pattern: /catch\s*\([^)]*\)\s*\{\s*console\.error\s*\([^)]*\)\s*;?\s*\}/g,
    message: 'Catch block only logs to console.error without recovery',
    severity: 'info',
    suggestion: 'Consider adding error recovery or user feedback',
  },
  // Console.log error without context
  {
    name: 'Console Log Without Context',
    pattern: /catch\s*\(\s*(\w+)\s*\)\s*\{[^}]*console\.log\s*\(\s*\1\s*\)[^}]*\}/g,
    message: 'Error logged without context or stack trace',
    severity: 'info',
    suggestion: 'Add context like console.error("Operation failed:", error)',
  },
];

// ============================================================================
// IGNORED ERROR PARAMETERS
// ============================================================================
const IGNORED_ERROR_PATTERNS: ErrorPattern[] = [
  // Catch with underscore parameter
  {
    name: 'Ignored Error Underscore',
    pattern: /catch\s*\(\s*_\s*\)/g,
    message: 'Error parameter explicitly ignored with underscore',
    severity: 'warn',
    suggestion: 'If intentional, add a comment explaining why',
  },
  // Catch with "ignored" parameter name
  {
    name: 'Ignored Error Named',
    pattern: /catch\s*\(\s*(?:ignored|unused|_err|_error|_e)\s*\)/gi,
    message: 'Error parameter named to indicate it\'s ignored',
    severity: 'warn',
    suggestion: 'If intentional, add a comment explaining why',
  },
  // Catch without using the error
  {
    name: 'Unused Error Variable',
    pattern: /catch\s*\(\s*(\w+)\s*\)\s*\{(?:(?!\1)[^}])*\}/g,
    message: 'Caught error is not used in catch block',
    severity: 'info',
    suggestion: 'Use the error for logging or handling',
  },
];

// ============================================================================
// PROMISE ANTI-PATTERNS
// ============================================================================
const PROMISE_PATTERNS: ErrorPattern[] = [
  // Promise without catch
  {
    name: 'Promise Without Catch',
    pattern: /\.then\s*\([^)]*\)(?!\s*\.\s*(?:catch|finally))/g,
    message: 'Promise chain without .catch() may have unhandled rejections',
    severity: 'warn',
    suggestion: 'Add .catch() to handle potential rejections',
  },
  // Promise.all without error handling
  {
    name: 'Promise.all Without Catch',
    pattern: /Promise\.all\s*\([^)]+\)(?!\s*\.\s*catch)/g,
    message: 'Promise.all without .catch() will reject on first error',
    severity: 'warn',
    suggestion: 'Add .catch() or use Promise.allSettled() for partial success',
  },
  // Empty catch in promise chain
  {
    name: 'Empty Promise Catch',
    pattern: /\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g,
    message: 'Empty .catch() handler swallows promise rejections',
    severity: 'error',
    suggestion: 'Handle or log the rejection',
  },
  // Catch returning undefined implicitly
  {
    name: 'Catch Returns Nothing',
    pattern: /\.catch\s*\(\s*(?:\w+|\([^)]*\))\s*=>\s*\{\s*console\.[^}]+\}\s*\)/g,
    message: 'Catch handler logs but returns undefined, may cause issues downstream',
    severity: 'info',
    suggestion: 'Consider returning a default value or rethrowing',
  },
  // New Promise without reject handling
  {
    name: 'Promise Without Reject',
    pattern: /new\s+Promise\s*\(\s*\(\s*resolve\s*\)\s*=>/g,
    message: 'Promise constructor without reject parameter',
    severity: 'info',
    suggestion: 'Add reject parameter: (resolve, reject) =>',
  },
  // Promise executor with try but no reject
  {
    name: 'Promise Executor Catch Without Reject',
    pattern: /new\s+Promise\s*\([^)]*\)\s*=>\s*\{[^}]*try\s*\{[^}]*\}\s*catch[^}]*console/g,
    message: 'Promise executor catches error but doesn\'t reject',
    severity: 'warn',
    suggestion: 'Call reject(error) in the catch block',
  },
];

// ============================================================================
// ASYNC/AWAIT ANTI-PATTERNS
// ============================================================================
const ASYNC_PATTERNS: ErrorPattern[] = [
  // Async function without try-catch
  {
    name: 'Async Without Try-Catch',
    pattern: /async\s+(?:function\s+\w+|(?:\w+|\([^)]*\))\s*=>)\s*\{(?:(?!try\s*\{)[^}])*await\s+/g,
    message: 'Async function with await but no try-catch',
    severity: 'info',
    suggestion: 'Wrap await calls in try-catch for error handling',
  },
  // Await without error handling in arrow function
  {
    name: 'Unhandled Await Arrow',
    pattern: /=>\s*\{\s*(?:const|let|var)?\s*\w*\s*=?\s*await\s+[^;]+;\s*\}/g,
    message: 'Await in arrow function without error handling',
    severity: 'info',
    suggestion: 'Add try-catch or handle errors at call site',
  },
  // Fire and forget async call
  {
    name: 'Fire And Forget Async',
    pattern: /(?:^|\s)(?!return\s)(?!await\s)\w+\s*\(\s*\)(?:\s*;|\s*$)/gm,
    message: 'Async function called without await (fire and forget)',
    severity: 'info',
    suggestion: 'Use await or add .catch() for async functions',
  },
  // Async IIFE without catch
  {
    name: 'Async IIFE Without Catch',
    pattern: /\(\s*async\s*\([^)]*\)\s*=>\s*\{[^}]+\}\s*\)\s*\(\s*\)(?!\s*\.\s*catch)/g,
    message: 'Async IIFE without .catch() for error handling',
    severity: 'warn',
    suggestion: 'Add .catch() to handle potential rejections',
  },
];

// ============================================================================
// CALLBACK ERROR HANDLING
// ============================================================================
const CALLBACK_PATTERNS: ErrorPattern[] = [
  // Callback ignoring error parameter
  {
    name: 'Callback Ignoring Error',
    pattern: /\(\s*(?:err|error|e)\s*,\s*\w+\s*\)\s*=>\s*\{(?:(?!err|error|e)[^}])*\}/g,
    message: 'Callback receives error parameter but doesn\'t check it',
    severity: 'warn',
    suggestion: 'Check if error exists before processing data',
  },
  // Node-style callback without error check
  {
    name: 'Node Callback No Error Check',
    pattern: /function\s*\(\s*(?:err|error)\s*,\s*\w+\s*\)\s*\{(?:(?!if\s*\(\s*(?:err|error))[^}])*\}/g,
    message: 'Node-style callback without error check',
    severity: 'warn',
    suggestion: 'Add if (err) check at the start of the callback',
  },
];

// ============================================================================
// SILENT FAILURE PATTERNS
// ============================================================================
const SILENT_FAILURE_PATTERNS: ErrorPattern[] = [
  // Return null/undefined in catch
  {
    name: 'Catch Returns Null',
    pattern: /catch\s*\([^)]*\)\s*\{[^}]*return\s+(?:null|undefined)\s*;?\s*\}/g,
    message: 'Catch block silently returns null/undefined',
    severity: 'warn',
    suggestion: 'Log the error or use a more meaningful error handling strategy',
  },
  // Return empty object/array in catch
  {
    name: 'Catch Returns Empty',
    pattern: /catch\s*\([^)]*\)\s*\{[^}]*return\s+(?:\{\}|\[\])\s*;?\s*\}/g,
    message: 'Catch block silently returns empty object/array',
    severity: 'info',
    suggestion: 'Consider logging the error or returning an error state',
  },
  // Return false in catch without logging
  {
    name: 'Catch Returns False',
    pattern: /catch\s*\([^)]*\)\s*\{\s*return\s+false\s*;?\s*\}/g,
    message: 'Catch block silently returns false without logging',
    severity: 'warn',
    suggestion: 'Log the error before returning false',
  },
  // Catch sets error state but doesn't log
  {
    name: 'Catch Sets State Only',
    pattern: /catch\s*\([^)]*\)\s*\{\s*(?:this\.)?(?:set)?(?:Error|error|err)\s*(?:=|\()/g,
    message: 'Catch sets error state but may not log the original error',
    severity: 'info',
    suggestion: 'Consider also logging the error for debugging',
  },
];

// ============================================================================
// ERROR PROPAGATION ANTI-PATTERNS
// ============================================================================
const PROPAGATION_PATTERNS: ErrorPattern[] = [
  // Catch and throw generic error
  {
    name: 'Catch Throw Generic',
    pattern: /catch\s*\([^)]*\)\s*\{[^}]*throw\s+new\s+Error\s*\(\s*["'][^"']*["']\s*\)/g,
    message: 'Catching error but throwing a new generic error loses stack trace',
    severity: 'warn',
    suggestion: 'Include original error: throw new Error("message", { cause: error })',
  },
  // Catch and rethrow string
  {
    name: 'Catch Throw String',
    pattern: /catch\s*\([^)]*\)\s*\{[^}]*throw\s+["'][^"']+["']/g,
    message: 'Throwing string instead of Error object',
    severity: 'error',
    suggestion: 'Throw an Error object: throw new Error("message")',
  },
  // Wrapping error without cause
  {
    name: 'Error Without Cause',
    pattern: /catch\s*\(\s*(\w+)\s*\)\s*\{[^}]*throw\s+new\s+\w*Error\s*\([^)]*\)(?:(?!\1)[^}])*\}/g,
    message: 'Wrapping error but not preserving the original cause',
    severity: 'info',
    suggestion: 'Use { cause: originalError } or include error message',
  },
];

// ============================================================================
// EVENT HANDLER ERROR PATTERNS
// ============================================================================
const EVENT_HANDLER_PATTERNS: ErrorPattern[] = [
  // Event handler without try-catch
  {
    name: 'Event Handler No Try-Catch',
    pattern: /(?:addEventListener|on\w+)\s*\(\s*["'][^"']+["']\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{(?:(?!try)[^}])*await/g,
    message: 'Event handler with async code but no try-catch',
    severity: 'warn',
    suggestion: 'Wrap async event handler code in try-catch',
  },
  // onClick/onChange without error handling
  {
    name: 'React Handler No Error Handling',
    pattern: /on(?:Click|Change|Submit|Focus|Blur)\s*=\s*\{\s*async\s*\([^)]*\)\s*=>\s*\{(?:(?!try)[^}])*await/g,
    message: 'React async event handler without try-catch',
    severity: 'warn',
    suggestion: 'Wrap async handler code in try-catch',
  },
];

// ============================================================================
// CLEANUP AND RESOURCE PATTERNS
// ============================================================================
const RESOURCE_PATTERNS: ErrorPattern[] = [
  // Try without finally for resources
  {
    name: 'Resource Without Finally',
    pattern: /(?:createConnection|openFile|acquireLock|beginTransaction)[^;]*;[^}]*try\s*\{[^}]+\}\s*catch[^}]*\}(?!\s*finally)/g,
    message: 'Resource acquired before try but no finally for cleanup',
    severity: 'warn',
    suggestion: 'Use try-finally to ensure resource cleanup',
  },
];

// Combine all patterns
const ALL_ERROR_PATTERNS: ErrorPattern[] = [
  ...EMPTY_CATCH_PATTERNS,
  ...CONSOLE_ONLY_PATTERNS,
  ...IGNORED_ERROR_PATTERNS,
  ...PROMISE_PATTERNS,
  ...ASYNC_PATTERNS,
  ...CALLBACK_PATTERNS,
  ...SILENT_FAILURE_PATTERNS,
  ...PROPAGATION_PATTERNS,
  ...EVENT_HANDLER_PATTERNS,
  ...RESOURCE_PATTERNS,
];

// Patterns that indicate intentional error swallowing
const INTENTIONAL_PATTERNS = [
  /\/\/\s*(?:intentional|expected|ignore|ok|safe|suppress|optional)/i,
  /\/\*\s*(?:intentional|expected|ignore|ok|safe|suppress|optional)/i,
  /\/\/\s*eslint-disable/i,
  /\/\/\s*noop/i,
  /\/\/\s*best effort/i,
  /\/\/\s*graceful/i,
  /\/\/\s*fallback/i,
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /test\//,
  /tests\//,
];

function shouldExcludeFile(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function hasIntentionalComment(content: string, matchIndex: number): boolean {
  const beforeMatch = content.substring(Math.max(0, matchIndex - 200), matchIndex);
  const lines = beforeMatch.split('\n');
  const lastTwoLines = lines.slice(-2).join('\n');

  return INTENTIONAL_PATTERNS.some(pattern => pattern.test(lastTwoLines));
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

export const ab002ErrorSwallowing: Rule = {
  id: 'AB002',
  name: 'Error Handling Anti-Patterns',
  description: 'Detects improper error handling patterns that may hide bugs',
  defaultSeverity: 'warn',
  appliesTo: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],

  check(content: string, filePath: string): RiskFinding[] {
    const findings: RiskFinding[] = [];

    // Skip excluded files
    if (shouldExcludeFile(filePath)) {
      return findings;
    }

    // Track to avoid duplicates
    const reportedLines = new Set<string>();

    for (const { pattern, message, severity, suggestion } of ALL_ERROR_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Skip if there's an intentional comment
        if (hasIntentionalComment(content, match.index)) {
          continue;
        }

        const lineNum = getLineNumber(content, match.index);
        const lineKey = `${lineNum}:${message}`;

        // Skip duplicates
        if (reportedLines.has(lineKey)) {
          continue;
        }

        const snippet = getSnippet(content, match.index);
        reportedLines.add(lineKey);

        const fullMessage = suggestion ? `${message}. ${suggestion}` : message;

        findings.push({
          ruleId: 'AB002',
          severity,
          file: filePath,
          line: lineNum,
          message: fullMessage,
          snippet: snippet.length > 80 ? snippet.substring(0, 77) + '...' : snippet,
        });
      }
    }

    // Additional check: multi-line empty catch blocks
    const multiLineEmptyCatch = /catch\s*\([^)]*\)\s*\{[\s\n]*\}/g;
    let match;
    while ((match = multiLineEmptyCatch.exec(content)) !== null) {
      if (hasIntentionalComment(content, match.index)) {
        continue;
      }

      const lineNum = getLineNumber(content, match.index);
      const lineKey = `${lineNum}:empty-catch`;

      if (reportedLines.has(lineKey)) {
        continue;
      }

      reportedLines.add(lineKey);

      findings.push({
        ruleId: 'AB002',
        severity: 'error',
        file: filePath,
        line: lineNum,
        message: 'Empty catch block silently swallows errors. Log the error or rethrow it',
        snippet: 'catch block is empty',
      });
    }

    return findings;
  },
};
