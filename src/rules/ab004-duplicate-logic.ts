/**
 * AB004: Duplicate Logic Detection
 *
 * Detects patterns that indicate code duplication:
 * - Repeated magic numbers
 * - Repeated string literals
 * - Similar function structures
 * - Copy-paste indicators
 * - Repeated error handling blocks
 */

import type { RiskFinding } from '../types.js';
import type { Rule } from './index.js';

// ============================================================================
// MAGIC NUMBER DETECTION
// ============================================================================
function detectMagicNumbers(content: string, filePath: string): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const lines = content.split('\n');

  // Track number occurrences (excluding common values like 0, 1, 2, -1)
  const numberOccurrences = new Map<string, number[]>();

  // Common numbers to ignore
  const commonNumbers = new Set([
    '0', '1', '2', '3', '4', '5', '10', '100', '1000',
    '-1', '0.5', '0.0', '1.0', '2.0',
    '24', '60', '3600', '86400', // Time constants
    '256', '512', '1024', '2048', '4096', // Powers of 2
    '200', '201', '204', '400', '401', '403', '404', '500', // HTTP codes
    '8080', '3000', '5000', '8000', '443', '80', // Common ports
  ]);

  // Pattern for numbers not in common set
  const numberPattern = /(?<![a-zA-Z_$])(\d+\.?\d*)(?![a-zA-Z_$])/g;

  lines.forEach((line, index) => {
    // Skip comments and imports
    if (line.trim().startsWith('//') || line.trim().startsWith('*') ||
        line.includes('import ') || line.includes('require(')) {
      return;
    }

    let match;
    while ((match = numberPattern.exec(line)) !== null) {
      const num = match[1];

      // Skip common numbers and very small numbers
      if (commonNumbers.has(num) || num.length <= 1) {
        continue;
      }

      // Skip array indices and obvious constants
      if (line.includes(`[${num}]`) || line.match(new RegExp(`\\b${num}\\s*[,\\]]`))) {
        continue;
      }

      if (!numberOccurrences.has(num)) {
        numberOccurrences.set(num, []);
      }
      numberOccurrences.get(num)!.push(index + 1);
    }
  });

  // Report numbers that appear 3+ times
  for (const [num, lineNums] of numberOccurrences) {
    if (lineNums.length >= 3) {
      findings.push({
        ruleId: 'AB004',
        severity: 'info',
        file: filePath,
        line: lineNums[0],
        message: `Magic number ${num} appears ${lineNums.length} times (lines: ${lineNums.slice(0, 5).join(', ')}${lineNums.length > 5 ? '...' : ''})`,
        snippet: `Consider extracting to a named constant`,
      });
    }
  }

  return findings;
}

// ============================================================================
// REPEATED STRING DETECTION
// ============================================================================
function detectRepeatedStrings(content: string, filePath: string): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const lines = content.split('\n');

  // Track string occurrences
  const stringOccurrences = new Map<string, number[]>();

  // Strings to ignore
  const ignoreStrings = new Set([
    '', ' ', ',', '.', ':', ';', '-', '_', '/', '\\',
    'true', 'false', 'null', 'undefined', 'none', 'None',
    'utf-8', 'utf8', 'json', 'text', 'html', 'xml',
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH',
    'id', 'name', 'type', 'value', 'data', 'error', 'message',
    'click', 'change', 'submit', 'load', 'error',
    'px', 'em', 'rem', '%', 'vh', 'vw',
    'div', 'span', 'button', 'input', 'form',
  ]);

  // Pattern for string literals
  const stringPattern = /["'`]([^"'`]{4,50})["'`]/g;

  lines.forEach((line, index) => {
    // Skip comments and imports
    if (line.trim().startsWith('//') || line.trim().startsWith('*') ||
        line.includes('import ') || line.includes('require(')) {
      return;
    }

    let match;
    while ((match = stringPattern.exec(line)) !== null) {
      const str = match[1].trim().toLowerCase();

      // Skip ignored strings and those that look like paths/URLs
      if (ignoreStrings.has(str) || str.startsWith('http') ||
          str.includes('/') || str.includes('\\')) {
        continue;
      }

      // Skip template literal expressions
      if (str.includes('${')) {
        continue;
      }

      const key = match[1].trim();
      if (!stringOccurrences.has(key)) {
        stringOccurrences.set(key, []);
      }
      stringOccurrences.get(key)!.push(index + 1);
    }
  });

  // Report strings that appear 3+ times
  for (const [str, lineNums] of stringOccurrences) {
    if (lineNums.length >= 3 && str.length >= 5) {
      const displayStr = str.length > 30 ? str.substring(0, 27) + '...' : str;
      findings.push({
        ruleId: 'AB004',
        severity: 'info',
        file: filePath,
        line: lineNums[0],
        message: `String "${displayStr}" repeated ${lineNums.length} times`,
        snippet: `Consider extracting to a constant or config`,
      });
    }
  }

  return findings;
}

// ============================================================================
// SIMILAR CODE BLOCK DETECTION
// ============================================================================
function detectSimilarBlocks(content: string, filePath: string): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const lines = content.split('\n');

  // Normalize a line for comparison
  const normalizeLine = (line: string): string => {
    return line
      .trim()
      .replace(/["'`][^"'`]*["'`]/g, '""') // Replace strings with placeholder
      .replace(/\b\d+\b/g, 'N') // Replace numbers with placeholder
      .replace(/\b[a-z][a-zA-Z0-9]*\b/g, 'VAR') // Replace identifiers
      .replace(/\s+/g, ' ');
  };

  // Build normalized blocks (3 consecutive lines)
  const blockSize = 3;
  const blocks = new Map<string, number[]>();

  for (let i = 0; i < lines.length - blockSize + 1; i++) {
    // Skip if line is mostly whitespace or braces
    if (lines[i].trim().length < 10) continue;

    const block = lines.slice(i, i + blockSize).map(normalizeLine).join('|');

    // Skip blocks that are too simple (just braces, empty, etc.)
    if (block.replace(/[{}\[\]();|VAR\s"N]/g, '').length < 10) {
      continue;
    }

    if (!blocks.has(block)) {
      blocks.set(block, []);
    }
    blocks.get(block)!.push(i + 1);
  }

  // Report blocks that appear 2+ times and aren't overlapping
  for (const [, lineNums] of blocks) {
    // Filter out overlapping blocks
    const nonOverlapping = lineNums.filter((line, idx) => {
      if (idx === 0) return true;
      return line - lineNums[idx - 1] >= blockSize;
    });

    if (nonOverlapping.length >= 2) {
      const snippet = lines[nonOverlapping[0] - 1]?.trim().substring(0, 60) || '';
      findings.push({
        ruleId: 'AB004',
        severity: 'warn',
        file: filePath,
        line: nonOverlapping[0],
        message: `Similar code block appears ${nonOverlapping.length} times (lines: ${nonOverlapping.join(', ')})`,
        snippet: snippet.length > 60 ? snippet.substring(0, 57) + '...' : snippet,
      });
    }
  }

  return findings;
}

// ============================================================================
// REPEATED TRY-CATCH PATTERN DETECTION
// ============================================================================
function detectRepeatedTryCatch(content: string, filePath: string): RiskFinding[] {
  const findings: RiskFinding[] = [];

  // Count try-catch blocks
  const tryCatchCount = (content.match(/\btry\s*\{/g) || []).length;

  // Count console.error/log in catch blocks
  const consoleCatchPattern = /catch\s*\([^)]*\)\s*\{[^}]*console\.(error|log)/g;
  const consoleInCatch = (content.match(consoleCatchPattern) || []).length;

  // Count empty catch blocks
  const emptyCatchPattern = /catch\s*\([^)]*\)\s*\{\s*\}/g;
  const emptyCatch = (content.match(emptyCatchPattern) || []).length;

  if (tryCatchCount >= 5) {
    findings.push({
      ruleId: 'AB004',
      severity: 'info',
      file: filePath,
      line: 1,
      message: `File has ${tryCatchCount} try-catch blocks - consider centralized error handling`,
      snippet: 'High try-catch count may indicate repetitive error handling',
    });
  }

  if (consoleInCatch >= 3) {
    findings.push({
      ruleId: 'AB004',
      severity: 'warn',
      file: filePath,
      line: 1,
      message: `${consoleInCatch} catch blocks with console.error/log - extract to error handler`,
      snippet: 'Repeated catch patterns should be centralized',
    });
  }

  if (emptyCatch >= 2) {
    findings.push({
      ruleId: 'AB004',
      severity: 'warn',
      file: filePath,
      line: 1,
      message: `${emptyCatch} empty catch blocks detected`,
      snippet: 'Empty catch blocks silently swallow errors',
    });
  }

  return findings;
}

// ============================================================================
// REPEATED CONDITIONAL PATTERNS
// ============================================================================
function detectRepeatedConditions(content: string, filePath: string): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const lines = content.split('\n');

  // Track conditional patterns
  const conditions = new Map<string, number[]>();

  // Pattern for if conditions
  const ifPattern = /if\s*\(([^)]+)\)/g;

  lines.forEach((line, index) => {
    let match;
    while ((match = ifPattern.exec(line)) !== null) {
      const condition = match[1].trim();

      // Skip very short conditions
      if (condition.length < 10) continue;

      // Normalize: remove whitespace differences
      const normalized = condition.replace(/\s+/g, ' ');

      if (!conditions.has(normalized)) {
        conditions.set(normalized, []);
      }
      conditions.get(normalized)!.push(index + 1);
    }
  });

  // Report conditions that appear 3+ times
  for (const [condition, lineNums] of conditions) {
    if (lineNums.length >= 3) {
      const displayCond = condition.length > 40 ? condition.substring(0, 37) + '...' : condition;
      findings.push({
        ruleId: 'AB004',
        severity: 'warn',
        file: filePath,
        line: lineNums[0],
        message: `Condition "${displayCond}" repeated ${lineNums.length} times`,
        snippet: `Consider extracting to a function or variable`,
      });
    }
  }

  return findings;
}

// ============================================================================
// REPEATED IMPORT ALIAS PATTERNS
// ============================================================================
function detectRepeatedObjectPatterns(content: string, filePath: string): RiskFinding[] {
  const findings: RiskFinding[] = [];

  // Detect repeated object spread patterns
  const spreadPattern = /\{\s*\.{3}\w+\s*,\s*(\w+)\s*:\s*\w+\s*\}/g;
  const spreads = new Map<string, number>();

  let match;
  while ((match = spreadPattern.exec(content)) !== null) {
    const pattern = match[0].replace(/\w+/g, 'X').replace(/\s+/g, '');
    spreads.set(pattern, (spreads.get(pattern) || 0) + 1);
  }

  for (const [, count] of spreads) {
    if (count >= 4) {
      findings.push({
        ruleId: 'AB004',
        severity: 'info',
        file: filePath,
        line: 1,
        message: `Spread pattern used ${count} times - consider a utility function`,
        snippet: `Repeated spread patterns can be abstracted`,
      });
      break; // Only report once
    }
  }

  return findings;
}

// Files to exclude
const EXCLUDE_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /\.d\.ts$/,
  /\.min\.js$/,
  /\.bundle\.js$/,
  /node_modules\//,
];

function shouldExcludeFile(filePath: string): boolean {
  return EXCLUDE_FILE_PATTERNS.some(pattern => pattern.test(filePath));
}

export const ab004DuplicateLogic: Rule = {
  id: 'AB004',
  name: 'Duplicate Logic Detection',
  description: 'Detects code duplication patterns including magic numbers, repeated strings, and similar code blocks',
  defaultSeverity: 'info',
  appliesTo: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],

  check(content: string, filePath: string): RiskFinding[] {
    if (shouldExcludeFile(filePath)) {
      return [];
    }

    // Skip very small files
    if (content.length < 500) {
      return [];
    }

    const findings: RiskFinding[] = [];

    // Run all detection functions
    findings.push(...detectMagicNumbers(content, filePath));
    findings.push(...detectRepeatedStrings(content, filePath));
    findings.push(...detectSimilarBlocks(content, filePath));
    findings.push(...detectRepeatedTryCatch(content, filePath));
    findings.push(...detectRepeatedConditions(content, filePath));
    findings.push(...detectRepeatedObjectPatterns(content, filePath));

    // Deduplicate by line number
    const seen = new Set<number>();
    const deduped = findings.filter(f => {
      if (seen.has(f.line)) return false;
      seen.add(f.line);
      return true;
    });

    // Add summary if many issues
    if (deduped.length >= 5) {
      deduped.unshift({
        ruleId: 'AB004',
        severity: 'warn',
        file: filePath,
        line: 1,
        message: `File has ${deduped.length} potential duplication issues`,
        snippet: 'Consider refactoring to reduce code repetition',
      });
    }

    return deduped;
  },
};
