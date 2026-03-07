/**
 * AB010: AI TODO/FIXME Detection
 *
 * Detects incomplete implementation markers commonly left by AI coding tools:
 * - TODO/FIXME comments
 * - "implement this", "add logic here" placeholders
 * - throw new Error("Not implemented")
 * - // ... continuation markers
 * - Python pass statements
 */

import type { RiskFinding } from '../types.js';
import type { Rule } from './index.js';

interface TodoPattern {
  name: string;
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warn' | 'info';
}

// ============================================================================
// TODO/FIXME COMMENT PATTERNS
// ============================================================================
const TODO_PATTERNS: TodoPattern[] = [
  // Standard TODO comments
  {
    name: 'TODO Comment',
    pattern: /\/\/\s*TODO\b[:\s]*(.*)/gi,
    message: 'TODO comment indicates incomplete implementation',
    severity: 'info',
  },
  {
    name: 'FIXME Comment',
    pattern: /\/\/\s*FIXME\b[:\s]*(.*)/gi,
    message: 'FIXME comment indicates known issue needing attention',
    severity: 'warn',
  },
  {
    name: 'HACK Comment',
    pattern: /\/\/\s*HACK\b[:\s]*(.*)/gi,
    message: 'HACK comment indicates temporary workaround',
    severity: 'warn',
  },
  {
    name: 'XXX Comment',
    pattern: /\/\/\s*XXX\b[:\s]*(.*)/gi,
    message: 'XXX comment indicates problematic code needing review',
    severity: 'warn',
  },
  // Block comment variants
  {
    name: 'Block TODO',
    pattern: /\/\*\s*TODO\b[:\s]*([^*]*)\*\//gi,
    message: 'TODO comment indicates incomplete implementation',
    severity: 'info',
  },
  {
    name: 'Block FIXME',
    pattern: /\/\*\s*FIXME\b[:\s]*([^*]*)\*\//gi,
    message: 'FIXME comment indicates known issue needing attention',
    severity: 'warn',
  },
  // Python-style comments
  {
    name: 'Python TODO',
    pattern: /#\s*TODO\b[:\s]*(.*)/gi,
    message: 'TODO comment indicates incomplete implementation',
    severity: 'info',
  },
  {
    name: 'Python FIXME',
    pattern: /#\s*FIXME\b[:\s]*(.*)/gi,
    message: 'FIXME comment indicates known issue needing attention',
    severity: 'warn',
  },
];

// ============================================================================
// AI PLACEHOLDER PATTERNS
// ============================================================================
const AI_PLACEHOLDER_PATTERNS: TodoPattern[] = [
  // "implement this/here" variants
  {
    name: 'Implement Placeholder',
    pattern: /\/\/\s*(?:implement|add|put|insert)\s+(?:this|here|your|the|logic|code|implementation)/gi,
    message: 'AI placeholder comment: implementation needed',
    severity: 'warn',
  },
  // "add logic here" variants
  {
    name: 'Add Logic Placeholder',
    pattern: /\/\/\s*(?:add|implement|put)\s+(?:your\s+)?(?:logic|code|implementation)\s+here/gi,
    message: 'AI placeholder comment: logic needs to be added',
    severity: 'warn',
  },
  // "... rest of implementation"
  {
    name: 'Rest Placeholder',
    pattern: /\/\/\s*\.{3}\s*(?:rest|more|remaining|other)/gi,
    message: 'AI continuation marker: incomplete implementation',
    severity: 'warn',
  },
  // Bare "// ..." continuation
  {
    name: 'Continuation Marker',
    pattern: /^\s*\/\/\s*\.{3}\s*$/gm,
    message: 'AI continuation marker left in code',
    severity: 'warn',
  },
  // "your code here" variants
  {
    name: 'Your Code Here',
    pattern: /\/\/\s*(?:your|add your|put your)\s+code\s+here/gi,
    message: 'Placeholder comment: code needs to be added',
    severity: 'warn',
  },
  // "fill in" / "complete this"
  {
    name: 'Fill In Placeholder',
    pattern: /\/\/\s*(?:fill\s+in|complete\s+this|finish\s+this)/gi,
    message: 'Placeholder comment: completion needed',
    severity: 'warn',
  },
];

// ============================================================================
// NOT IMPLEMENTED PATTERNS
// ============================================================================
const NOT_IMPLEMENTED_PATTERNS: TodoPattern[] = [
  // throw new Error("Not implemented")
  {
    name: 'Not Implemented Error',
    pattern: /throw\s+new\s+Error\s*\(\s*["'`](?:Not\s+implemented|TODO|FIXME|Implement\s+this)["'`]\s*\)/gi,
    message: 'Throw "Not implemented" indicates incomplete code',
    severity: 'error',
  },
  // throw "Not implemented"
  {
    name: 'Throw Not Implemented',
    pattern: /throw\s+["'`](?:Not\s+implemented|TODO)["'`]/gi,
    message: 'Throw "Not implemented" indicates incomplete code',
    severity: 'error',
  },
  // console.log("TODO") / console.warn("FIXME")
  {
    name: 'Console TODO',
    pattern: /console\.(?:log|warn|error)\s*\(\s*["'`](?:TODO|FIXME|Not\s+implemented)/gi,
    message: 'Console message indicates incomplete implementation',
    severity: 'warn',
  },
  // Python: raise NotImplementedError
  {
    name: 'Python NotImplemented',
    pattern: /raise\s+NotImplementedError/g,
    message: 'NotImplementedError indicates incomplete implementation',
    severity: 'error',
  },
  // Python: pass statement (in function/class body context)
  {
    name: 'Python Pass',
    pattern: /^\s*pass\s*(?:#.*)?$/gm,
    message: 'Empty pass statement may indicate incomplete implementation',
    severity: 'info',
  },
];

// ============================================================================
// STUB FUNCTION PATTERNS
// ============================================================================
const STUB_PATTERNS: TodoPattern[] = [
  // Empty function body with just return
  {
    name: 'Stub Return Null',
    pattern: /(?:function|const|let|var)\s+\w+\s*[=:]\s*(?:async\s*)?\([^)]*\)\s*(?::\s*\w+)?\s*=>\s*(?:null|undefined|void\s+0|\{\s*\})/g,
    message: 'Stub function returns null/undefined - implementation may be incomplete',
    severity: 'info',
  },
  // Function body is just "return;"
  {
    name: 'Empty Return',
    pattern: /\{\s*return\s*;\s*\}/g,
    message: 'Empty function body may indicate incomplete implementation',
    severity: 'info',
  },
];

// Combine all patterns
const ALL_TODO_PATTERNS: TodoPattern[] = [
  ...TODO_PATTERNS,
  ...AI_PLACEHOLDER_PATTERNS,
  ...NOT_IMPLEMENTED_PATTERNS,
  ...STUB_PATTERNS,
];

// Files to exclude
const EXCLUDE_FILE_PATTERNS = [
  /\.d\.ts$/,
  /\.min\.js$/,
  /\.bundle\.js$/,
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

export const ab010AiTodos: Rule = {
  id: 'AB010',
  name: 'AI TODO/FIXME Detection',
  description: 'Detects TODO comments, FIXME markers, and incomplete implementation placeholders',
  defaultSeverity: 'info',
  appliesTo: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py'],

  check(content: string, filePath: string): RiskFinding[] {
    const findings: RiskFinding[] = [];

    if (shouldExcludeFile(filePath)) {
      return findings;
    }

    // Track reported lines to avoid duplicates
    const reportedLines = new Set<number>();

    for (const { pattern, message, severity } of ALL_TODO_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNum = getLineNumber(content, match.index);

        // Skip if already reported on this line
        if (reportedLines.has(lineNum)) {
          continue;
        }

        reportedLines.add(lineNum);
        const snippet = getSnippet(content, match.index);

        findings.push({
          ruleId: 'AB010',
          severity,
          file: filePath,
          line: lineNum,
          message,
          snippet: snippet.length > 80 ? snippet.substring(0, 77) + '...' : snippet,
        });
      }
    }

    // Add summary if many TODOs found
    const todoCount = findings.filter(f => f.message.includes('TODO')).length;
    const fixmeCount = findings.filter(f => f.message.includes('FIXME')).length;
    const placeholderCount = findings.filter(f =>
      f.message.includes('placeholder') || f.message.includes('continuation')
    ).length;

    if (findings.length >= 5) {
      findings.unshift({
        ruleId: 'AB010',
        severity: 'warn',
        file: filePath,
        line: 1,
        message: `File has ${findings.length} incomplete implementation markers (${todoCount} TODOs, ${fixmeCount} FIXMEs, ${placeholderCount} placeholders)`,
        snippet: 'Consider completing or removing these markers before shipping',
      });
    }

    return findings;
  },
};
