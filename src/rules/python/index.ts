/**
 * Python-Specific Rules
 *
 * Detects Python-specific anti-patterns:
 * - AB002-PY: Bare except clauses, pass in except blocks
 * - AB007-PY: Python security anti-patterns (eval, exec, pickle)
 * - AB010-PY: Python incomplete implementations (pass, NotImplementedError)
 */

import type { RiskFinding } from '../../types.js';

/**
 * AB002-PY: Python Error Swallowing
 *
 * Detects:
 * - Bare `except:` clauses (should specify exception type)
 * - `except Exception:` without logging/handling
 * - `pass` in except blocks
 */
export function checkPythonErrorSwallowing(content: string, filePath: string): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const lines = content.split('\n');

  // Track if we're inside an except block
  let inExceptBlock = false;
  let exceptStartLine = 0;
  let exceptIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Detect bare except clause
    if (/^except\s*:/.test(trimmed)) {
      findings.push({
        ruleId: 'AB002',
        severity: 'error',
        file: filePath,
        line: lineNum,
        message: 'Bare except clause catches all exceptions including SystemExit and KeyboardInterrupt',
        snippet: trimmed.substring(0, 80),
      });
      inExceptBlock = true;
      exceptStartLine = lineNum;
      exceptIndent = line.search(/\S/);
    }

    // Detect except Exception
    if (/^except\s+Exception\s*:/.test(trimmed)) {
      inExceptBlock = true;
      exceptStartLine = lineNum;
      exceptIndent = line.search(/\S/);
    }

    // Check for pass in except block
    if (inExceptBlock) {
      const currentIndent = line.search(/\S/);

      // Check if we're still in the except block
      if (trimmed && currentIndent <= exceptIndent && lineNum > exceptStartLine) {
        inExceptBlock = false;
      } else if (/^\s*pass\s*$/.test(line) && currentIndent > exceptIndent) {
        findings.push({
          ruleId: 'AB002',
          severity: 'warn',
          file: filePath,
          line: lineNum,
          message: 'Silent exception handling - error swallowed without logging',
          snippet: `except block at line ${exceptStartLine} contains only 'pass'`,
        });
      }
    }
  }

  return findings;
}

/**
 * AB007-PY: Python Security Anti-Patterns
 *
 * Detects:
 * - eval() usage
 * - exec() usage
 * - pickle with untrusted data
 * - shell=True in subprocess
 * - SQL string concatenation
 * - Insecure hash functions (md5, sha1 for passwords)
 * - hardcoded secrets in code
 */
export function checkPythonSecurity(content: string, filePath: string): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const lines = content.split('\n');

  const patterns: Array<{
    pattern: RegExp;
    message: string;
    severity: 'error' | 'warn';
  }> = [
    {
      pattern: /\beval\s*\(/,
      message: 'eval() can execute arbitrary code - security risk',
      severity: 'error',
    },
    {
      pattern: /\bexec\s*\(/,
      message: 'exec() can execute arbitrary code - security risk',
      severity: 'error',
    },
    {
      pattern: /pickle\.loads?\s*\(/,
      message: 'pickle can execute arbitrary code - never use with untrusted data',
      severity: 'error',
    },
    {
      pattern: /subprocess\.[^(]+\([^)]*shell\s*=\s*True/,
      message: 'subprocess with shell=True is vulnerable to shell injection',
      severity: 'error',
    },
    {
      pattern: /os\.system\s*\(/,
      message: 'os.system() is vulnerable to shell injection - use subprocess instead',
      severity: 'warn',
    },
    {
      pattern: /["']SELECT\s+.*["']\s*%/,
      message: 'SQL string formatting - vulnerable to SQL injection',
      severity: 'error',
    },
    {
      pattern: /f["']SELECT\s+.*\{/,
      message: 'SQL f-string formatting - vulnerable to SQL injection',
      severity: 'error',
    },
    {
      pattern: /\.execute\s*\(\s*["'][^"']*["']\s*%/,
      message: 'SQL query with string formatting - use parameterized queries',
      severity: 'error',
    },
    {
      pattern: /hashlib\.md5\s*\([^)]*password/i,
      message: 'MD5 should not be used for password hashing - use bcrypt or argon2',
      severity: 'error',
    },
    {
      pattern: /hashlib\.sha1\s*\([^)]*password/i,
      message: 'SHA1 should not be used for password hashing - use bcrypt or argon2',
      severity: 'error',
    },
    {
      pattern: /\bAWS_SECRET_ACCESS_KEY\s*=\s*["'][A-Za-z0-9/+=]{40}["']/,
      message: 'Hardcoded AWS secret key detected',
      severity: 'error',
    },
    {
      pattern: /requests\.get\s*\([^)]*verify\s*=\s*False/,
      message: 'SSL verification disabled - vulnerable to MITM attacks',
      severity: 'error',
    },
    {
      pattern: /urllib3\.disable_warnings/,
      message: 'SSL warnings disabled - may hide security issues',
      severity: 'warn',
    },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('#')) continue;

    for (const { pattern, message, severity } of patterns) {
      if (pattern.test(line)) {
        findings.push({
          ruleId: 'AB007',
          severity,
          file: filePath,
          line: lineNum,
          message,
          snippet: trimmed.substring(0, 80),
        });
      }
    }
  }

  return findings;
}

/**
 * AB010-PY: Python Incomplete Implementation
 *
 * Detects:
 * - pass statements in function/class bodies
 * - NotImplementedError raises
 * - TODO/FIXME comments
 * - Ellipsis (...) as placeholder
 */
export function checkPythonIncomplete(content: string, filePath: string): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const lines = content.split('\n');

  // Track function/class definitions
  let inDefinition = false;
  let definitionIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Track function/class definitions
    if (/^(def|class|async def)\s+\w+/.test(trimmed)) {
      inDefinition = true;
      definitionIndent = line.search(/\S/);
    }

    // Check for placeholder code
    const currentIndent = line.search(/\S/);

    // End of definition block
    if (inDefinition && currentIndent <= definitionIndent && trimmed && currentIndent >= 0) {
      inDefinition = false;
    }

    // NotImplementedError
    if (/raise\s+NotImplementedError/.test(trimmed)) {
      findings.push({
        ruleId: 'AB010',
        severity: 'warn',
        file: filePath,
        line: lineNum,
        message: 'NotImplementedError - incomplete implementation',
        snippet: trimmed.substring(0, 80),
      });
    }

    // pass as placeholder (not in except block - that's AB002)
    if (/^\s*pass\s*$/.test(line) && inDefinition) {
      // Check if this is the only statement after a definition
      const prevLine = lines[i - 1]?.trim() || '';
      if (/^(def|class|async def|if|elif|else|for|while|with|try)\s/.test(prevLine) ||
          prevLine.endsWith(':')) {
        findings.push({
          ruleId: 'AB010',
          severity: 'info',
          file: filePath,
          line: lineNum,
          message: 'Empty block with pass - likely placeholder',
          snippet: `${prevLine}\n    pass`,
        });
      }
    }

    // Ellipsis as placeholder
    if (/^\s*\.\.\.\s*$/.test(line)) {
      findings.push({
        ruleId: 'AB010',
        severity: 'info',
        file: filePath,
        line: lineNum,
        message: 'Ellipsis placeholder - incomplete implementation',
        snippet: trimmed,
      });
    }

    // TODO/FIXME in comments
    if (/#\s*(TODO|FIXME|XXX|HACK)/i.test(line)) {
      const match = line.match(/#\s*(TODO|FIXME|XXX|HACK)\s*:?\s*(.*)/i);
      findings.push({
        ruleId: 'AB010',
        severity: 'info',
        file: filePath,
        line: lineNum,
        message: `${match?.[1].toUpperCase()}: ${match?.[2] || '(no description)'}`,
        snippet: trimmed.substring(0, 80),
      });
    }
  }

  return findings;
}

/**
 * Run all Python-specific rules
 */
export function runPythonRules(content: string, filePath: string): RiskFinding[] {
  // Only run on Python files
  if (!filePath.endsWith('.py') && !filePath.endsWith('.pyw')) {
    return [];
  }

  return [
    ...checkPythonErrorSwallowing(content, filePath),
    ...checkPythonSecurity(content, filePath),
    ...checkPythonIncomplete(content, filePath),
  ];
}
