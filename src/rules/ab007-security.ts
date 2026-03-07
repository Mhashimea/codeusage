/**
 * AB007: Security Anti-Patterns Detection
 *
 * Detects common security vulnerabilities in code:
 * - Weak cryptography (MD5/SHA1 for passwords)
 * - SQL injection risks
 * - Code injection (eval, Function)
 * - XSS vulnerabilities (innerHTML)
 * - Missing CSRF protection
 * - JWT without expiration
 * - Insecure CORS configuration
 * - Disabled SSL verification
 */

import type { RiskFinding } from '../types.js';
import type { Rule } from './index.js';

interface SecurityPattern {
  name: string;
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warn' | 'info';
  suggestion?: string;
}

// ============================================================================
// WEAK CRYPTOGRAPHY PATTERNS
// ============================================================================
const CRYPTO_PATTERNS: SecurityPattern[] = [
  // MD5 for password hashing
  {
    name: 'MD5 Password',
    pattern: /(?:crypto|md5|hash).*(?:password|passwd|pwd)/gi,
    message: 'MD5 should not be used for password hashing',
    severity: 'error',
    suggestion: 'Use bcrypt, scrypt, or argon2 instead',
  },
  {
    name: 'MD5 Usage',
    pattern: /(?:createHash|crypto\.hash)\s*\(\s*["'`]md5["'`]\s*\)/gi,
    message: 'MD5 is cryptographically weak',
    severity: 'warn',
    suggestion: 'Use SHA-256 or stronger for integrity checks',
  },
  // SHA1 for password hashing
  {
    name: 'SHA1 Password',
    pattern: /sha1.*(?:password|passwd|pwd)/gi,
    message: 'SHA1 should not be used for password hashing',
    severity: 'error',
    suggestion: 'Use bcrypt, scrypt, or argon2 instead',
  },
  {
    name: 'SHA1 Usage',
    pattern: /(?:createHash|crypto\.hash)\s*\(\s*["'`]sha1["'`]\s*\)/gi,
    message: 'SHA1 is cryptographically weak',
    severity: 'warn',
    suggestion: 'Use SHA-256 or stronger',
  },
  // Weak random for security
  {
    name: 'Math.random for Security',
    pattern: /Math\.random\s*\(\s*\).*(?:token|secret|key|password|salt|nonce|id)/gi,
    message: 'Math.random() is not cryptographically secure',
    severity: 'error',
    suggestion: 'Use crypto.randomBytes() or crypto.randomUUID()',
  },
];

// ============================================================================
// SQL INJECTION PATTERNS
// ============================================================================
const SQL_INJECTION_PATTERNS: SecurityPattern[] = [
  // String concatenation in SQL
  {
    name: 'SQL Concatenation',
    pattern: /(?:query|execute|exec|sql)\s*\(\s*["'`](?:SELECT|INSERT|UPDATE|DELETE|DROP)[^"'`]*["'`]\s*\+/gi,
    message: 'SQL string concatenation is vulnerable to SQL injection',
    severity: 'error',
    suggestion: 'Use parameterized queries or prepared statements',
  },
  // Template literal in SQL without escaping
  {
    name: 'SQL Template Literal',
    pattern: /(?:query|execute|exec|sql)\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`\s*\)/gi,
    message: 'Unescaped template literal in SQL is vulnerable to injection',
    severity: 'error',
    suggestion: 'Use parameterized queries instead of string interpolation',
  },
  // Raw SQL with variable
  {
    name: 'Raw SQL Query',
    pattern: /\.(?:raw|rawQuery|unsafeRaw)\s*\(\s*["'`].*\$\{/gi,
    message: 'Raw SQL with interpolation is vulnerable to injection',
    severity: 'error',
    suggestion: 'Use parameterized queries',
  },
  // Direct SQL execution
  {
    name: 'Direct SQL Execution',
    pattern: /(?:executeQuery|runQuery)\s*\(\s*(?:\w+\s*\+|`[^`]*\$\{)/gi,
    message: 'Direct SQL execution with dynamic input',
    severity: 'warn',
    suggestion: 'Ensure input is properly sanitized or use parameterized queries',
  },
];

// ============================================================================
// CODE INJECTION PATTERNS
// ============================================================================
const CODE_INJECTION_PATTERNS: SecurityPattern[] = [
  // eval() usage
  {
    name: 'eval() Usage',
    pattern: /\beval\s*\(/g,
    message: 'eval() executes arbitrary code and is a security risk',
    severity: 'error',
    suggestion: 'Use JSON.parse() for data, or safer alternatives',
  },
  // new Function() usage
  {
    name: 'new Function()',
    pattern: /new\s+Function\s*\(/g,
    message: 'new Function() can execute arbitrary code',
    severity: 'error',
    suggestion: 'Avoid dynamic code generation',
  },
  // setTimeout/setInterval with string
  {
    name: 'setTimeout String',
    pattern: /setTimeout\s*\(\s*["'`][^"'`]+["'`]/g,
    message: 'setTimeout with string argument uses eval internally',
    severity: 'warn',
    suggestion: 'Pass a function reference instead of a string',
  },
  {
    name: 'setInterval String',
    pattern: /setInterval\s*\(\s*["'`][^"'`]+["'`]/g,
    message: 'setInterval with string argument uses eval internally',
    severity: 'warn',
    suggestion: 'Pass a function reference instead of a string',
  },
  // Python exec/eval (exclude .exec() method calls like regex.exec())
  {
    name: 'Python exec()',
    pattern: /(?<!\.)\bexec\s*\(/g,
    message: 'exec() executes arbitrary code and is a security risk',
    severity: 'error',
    suggestion: 'Avoid dynamic code execution',
  },
  // vm.runInContext without sandbox
  {
    name: 'VM Run',
    pattern: /vm\.(?:runInContext|runInNewContext|runInThisContext)\s*\(/g,
    message: 'VM execution can be dangerous with untrusted code',
    severity: 'warn',
    suggestion: 'Ensure code is trusted or use isolated-vm',
  },
];

// ============================================================================
// XSS PATTERNS
// ============================================================================
const XSS_PATTERNS: SecurityPattern[] = [
  // innerHTML assignment
  {
    name: 'innerHTML Assignment',
    pattern: /\.innerHTML\s*=(?!\s*["'`](?:<[^>]*>)*["'`])/g,
    message: 'innerHTML assignment can lead to XSS if data is not sanitized',
    severity: 'warn',
    suggestion: 'Use textContent, or sanitize with DOMPurify',
  },
  // outerHTML assignment
  {
    name: 'outerHTML Assignment',
    pattern: /\.outerHTML\s*=/g,
    message: 'outerHTML assignment can lead to XSS',
    severity: 'warn',
    suggestion: 'Use safer DOM manipulation methods',
  },
  // document.write
  {
    name: 'document.write',
    pattern: /document\.write\s*\(/g,
    message: 'document.write() can introduce XSS vulnerabilities',
    severity: 'warn',
    suggestion: 'Use DOM manipulation methods instead',
  },
  // insertAdjacentHTML
  {
    name: 'insertAdjacentHTML',
    pattern: /\.insertAdjacentHTML\s*\(/g,
    message: 'insertAdjacentHTML can lead to XSS if data is not sanitized',
    severity: 'warn',
    suggestion: 'Sanitize input with DOMPurify before insertion',
  },
  // dangerouslySetInnerHTML (React)
  {
    name: 'dangerouslySetInnerHTML',
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:/g,
    message: 'dangerouslySetInnerHTML can lead to XSS',
    severity: 'warn',
    suggestion: 'Sanitize HTML content before using',
  },
  // v-html (Vue)
  {
    name: 'Vue v-html',
    pattern: /v-html\s*=\s*["'`]/g,
    message: 'v-html can lead to XSS if data is not sanitized',
    severity: 'warn',
    suggestion: 'Sanitize content or use v-text instead',
  },
];

// ============================================================================
// AUTHENTICATION/AUTHORIZATION PATTERNS
// ============================================================================
const AUTH_PATTERNS: SecurityPattern[] = [
  // JWT without expiration
  {
    name: 'JWT No Expiration',
    pattern: /jwt\.sign\s*\([^)]*\)\s*(?!.*(?:expiresIn|exp))/gi,
    message: 'JWT token created without expiration',
    severity: 'error',
    suggestion: 'Always set expiresIn or exp claim',
  },
  // Hardcoded JWT secret
  {
    name: 'JWT Hardcoded Secret',
    pattern: /jwt\.(?:sign|verify)\s*\([^,]*,\s*["'`][^"'`]{8,}["'`]/gi,
    message: 'JWT secret appears to be hardcoded',
    severity: 'error',
    suggestion: 'Use environment variable for JWT secret',
  },
  // Disabled JWT verification
  {
    name: 'JWT No Verify',
    pattern: /jwt\.decode\s*\(/g,
    message: 'jwt.decode() does not verify signature',
    severity: 'warn',
    suggestion: 'Use jwt.verify() to validate tokens',
  },
  // Password comparison timing attack
  {
    name: 'Password String Compare',
    pattern: /(?:password|passwd|pwd)\s*===?\s*(?:\w+|["'`])/gi,
    message: 'String comparison for passwords is vulnerable to timing attacks',
    severity: 'warn',
    suggestion: 'Use crypto.timingSafeEqual() or bcrypt.compare()',
  },
];

// ============================================================================
// CORS & NETWORK SECURITY PATTERNS
// ============================================================================
const CORS_PATTERNS: SecurityPattern[] = [
  // CORS allow all origins
  {
    name: 'CORS All Origins',
    pattern: /(?:cors|Access-Control-Allow-Origin)\s*[:=]\s*["'`]\*["'`]/gi,
    message: 'CORS configured to allow all origins',
    severity: 'error',
    suggestion: 'Specify allowed origins explicitly',
  },
  // Credentials with wildcard CORS
  {
    name: 'CORS Credentials Wildcard',
    pattern: /credentials\s*:\s*true.*origin\s*:\s*["'`]\*["'`]|origin\s*:\s*["'`]\*["'`].*credentials\s*:\s*true/gi,
    message: 'CORS credentials with wildcard origin is insecure',
    severity: 'error',
    suggestion: 'Cannot use credentials: true with origin: "*"',
  },
  // Disabled SSL verification
  {
    name: 'Disabled SSL',
    pattern: /rejectUnauthorized\s*:\s*false/g,
    message: 'SSL certificate verification is disabled',
    severity: 'error',
    suggestion: 'Enable SSL verification in production',
  },
  {
    name: 'Disabled SSL Verify',
    pattern: /(?:NODE_TLS_REJECT_UNAUTHORIZED|SSL_VERIFY)\s*=\s*["'`]?(?:0|false)/gi,
    message: 'SSL verification is disabled via environment',
    severity: 'error',
    suggestion: 'Enable SSL verification in production',
  },
  // Insecure HTTP
  {
    name: 'Insecure HTTP',
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/g,
    message: 'Using insecure HTTP instead of HTTPS',
    severity: 'warn',
    suggestion: 'Use HTTPS for external connections',
  },
];

// ============================================================================
// SENSITIVE DATA EXPOSURE PATTERNS
// ============================================================================
const DATA_EXPOSURE_PATTERNS: SecurityPattern[] = [
  // Logging sensitive data
  {
    name: 'Log Password',
    pattern: /console\.(?:log|info|debug)\s*\([^)]*(?:password|passwd|pwd|secret|token|apiKey)/gi,
    message: 'Logging sensitive data (password/secret/token)',
    severity: 'error',
    suggestion: 'Never log sensitive information',
  },
  // Error message with stack trace in production
  {
    name: 'Error Stack Exposure',
    pattern: /res\.(?:send|json)\s*\(\s*(?:err|error)\.(?:stack|message)\s*\)/g,
    message: 'Error details sent to client may expose sensitive info',
    severity: 'warn',
    suggestion: 'Send generic error messages to clients',
  },
  // Python pickle with untrusted data
  {
    name: 'Python Pickle',
    pattern: /pickle\.(?:load|loads)\s*\(/g,
    message: 'pickle.load() with untrusted data can execute arbitrary code',
    severity: 'error',
    suggestion: 'Use JSON or other safe serialization formats',
  },
  // Yaml load (Python)
  {
    name: 'Python Yaml Load',
    pattern: /yaml\.load\s*\([^)]*\)(?!.*Loader\s*=\s*yaml\.SafeLoader)/g,
    message: 'yaml.load() without SafeLoader can execute arbitrary code',
    severity: 'error',
    suggestion: 'Use yaml.safe_load() or specify SafeLoader',
  },
];

// ============================================================================
// COMMAND INJECTION PATTERNS
// ============================================================================
const COMMAND_INJECTION_PATTERNS: SecurityPattern[] = [
  // exec with template literal
  {
    name: 'Exec Template',
    pattern: /(?:exec|spawn|execSync|spawnSync)\s*\(\s*`[^`]*\$\{/g,
    message: 'Command execution with interpolation is vulnerable to injection',
    severity: 'error',
    suggestion: 'Use execFile with arguments array instead',
  },
  // exec with string concatenation
  {
    name: 'Exec Concatenation',
    pattern: /(?:exec|execSync)\s*\(\s*(?:\w+\s*\+|["'`][^"'`]+["'`]\s*\+)/g,
    message: 'Command string concatenation is vulnerable to injection',
    severity: 'error',
    suggestion: 'Use execFile with arguments array instead',
  },
  // child_process with shell: true
  {
    name: 'Shell True',
    pattern: /(?:spawn|exec)\s*\([^)]*shell\s*:\s*true/g,
    message: 'shell: true enables shell injection attacks',
    severity: 'warn',
    suggestion: 'Avoid shell: true unless necessary',
  },
  // Python subprocess with shell=True
  {
    name: 'Python Shell True',
    pattern: /subprocess\.(?:call|run|Popen)\s*\([^)]*shell\s*=\s*True/g,
    message: 'shell=True enables shell injection attacks',
    severity: 'warn',
    suggestion: 'Use shell=False and pass args as a list',
  },
];

// Combine all patterns
const ALL_SECURITY_PATTERNS: SecurityPattern[] = [
  ...CRYPTO_PATTERNS,
  ...SQL_INJECTION_PATTERNS,
  ...CODE_INJECTION_PATTERNS,
  ...XSS_PATTERNS,
  ...AUTH_PATTERNS,
  ...CORS_PATTERNS,
  ...DATA_EXPOSURE_PATTERNS,
  ...COMMAND_INJECTION_PATTERNS,
];

// Files to exclude
const EXCLUDE_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /test\//,
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

export const ab007Security: Rule = {
  id: 'AB007',
  name: 'Security Anti-Patterns',
  description: 'Detects common security vulnerabilities and anti-patterns',
  defaultSeverity: 'error',
  appliesTo: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py'],

  check(content: string, filePath: string): RiskFinding[] {
    const findings: RiskFinding[] = [];

    if (shouldExcludeFile(filePath)) {
      return findings;
    }

    // Track reported to avoid duplicates
    const reported = new Set<string>();

    for (const { pattern, message, severity, suggestion } of ALL_SECURITY_PATTERNS) {
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNum = getLineNumber(content, match.index);
        const key = `${lineNum}:${message}`;

        if (reported.has(key)) {
          continue;
        }
        reported.add(key);

        const snippet = getSnippet(content, match.index);
        const fullMessage = suggestion ? `${message}. ${suggestion}` : message;

        findings.push({
          ruleId: 'AB007',
          severity,
          file: filePath,
          line: lineNum,
          message: fullMessage,
          snippet: snippet.length > 80 ? snippet.substring(0, 77) + '...' : snippet,
        });
      }
    }

    // Add summary for critical files
    const errors = findings.filter(f => f.severity === 'error').length;
    if (errors >= 3) {
      findings.unshift({
        ruleId: 'AB007',
        severity: 'error',
        file: filePath,
        line: 1,
        message: `Critical: ${errors} security vulnerabilities detected`,
        snippet: 'Immediate attention required',
      });
    }

    return findings;
  },
};
