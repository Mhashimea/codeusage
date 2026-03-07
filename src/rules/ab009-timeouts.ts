/**
 * AB009: Missing Timeout Configuration Detection
 *
 * Detects network and async operations without proper timeout configuration:
 * - fetch() calls without AbortController/timeout
 * - axios calls without timeout config
 * - Database queries without limit/timeout
 * - setTimeout/setInterval without cleanup
 * - WebSocket connections without heartbeat
 * - HTTP server without request timeout
 */

import type { RiskFinding } from '../types.js';
import type { Rule } from './index.js';

interface TimeoutPattern {
  name: string;
  pattern: RegExp;
  antiPattern?: RegExp; // If this matches, it's OK (has timeout)
  message: string;
  severity: 'error' | 'warn' | 'info';
  suggestion: string;
}

// ============================================================================
// FETCH/HTTP PATTERNS
// ============================================================================
const FETCH_PATTERNS: TimeoutPattern[] = [
  // fetch() without AbortController
  {
    name: 'Fetch No Timeout',
    pattern: /\bfetch\s*\(\s*(?:["'`][^"'`]+["'`]|\w+)/g,
    antiPattern: /(?:AbortController|signal\s*:|timeout)/i,
    message: 'fetch() without timeout/AbortController can hang indefinitely',
    severity: 'warn',
    suggestion: 'Add AbortController with timeout: const controller = new AbortController(); setTimeout(() => controller.abort(), 30000)',
  },
  // node-fetch without timeout
  {
    name: 'Node Fetch No Timeout',
    pattern: /(?:const|let|var)\s+(?:fetch|nodeFetch)\s*=\s*require\s*\(\s*["'`]node-fetch["'`]\s*\)/g,
    message: 'node-fetch usage detected - ensure timeout is configured',
    severity: 'info',
    suggestion: 'Pass timeout option in fetch options',
  },
];

// ============================================================================
// AXIOS PATTERNS
// ============================================================================
const AXIOS_PATTERNS: TimeoutPattern[] = [
  // axios without timeout in config
  {
    name: 'Axios No Timeout',
    pattern: /axios\.(?:get|post|put|patch|delete|request)\s*\(\s*(?:["'`][^"'`]+["'`]|\w+)(?:\s*,\s*\{[^}]*\})?\s*\)/g,
    antiPattern: /timeout\s*:/i,
    message: 'axios request without timeout configuration',
    severity: 'warn',
    suggestion: 'Add timeout: 30000 to axios config',
  },
  // axios.create without default timeout
  {
    name: 'Axios Instance No Timeout',
    pattern: /axios\.create\s*\(\s*\{[^}]*\}\s*\)/g,
    antiPattern: /timeout\s*:/i,
    message: 'axios instance created without default timeout',
    severity: 'warn',
    suggestion: 'Set timeout in axios.create() defaults',
  },
];

// ============================================================================
// DATABASE QUERY PATTERNS
// ============================================================================
const DATABASE_PATTERNS: TimeoutPattern[] = [
  // MongoDB find without limit
  {
    name: 'MongoDB No Limit',
    pattern: /\.find\s*\(\s*\{[^}]*\}\s*\)(?!.*\.limit\s*\()/g,
    message: 'MongoDB query without .limit() may return too many documents',
    severity: 'warn',
    suggestion: 'Add .limit() to prevent unbounded result sets',
  },
  // SQL SELECT without LIMIT
  {
    name: 'SQL No Limit',
    pattern: /["'`]SELECT\s+(?:\*|[\w\s,]+)\s+FROM\s+\w+(?:\s+WHERE[^"'`]+)?["'`](?![^;]*LIMIT)/gi,
    message: 'SQL SELECT without LIMIT may return too many rows',
    severity: 'info',
    suggestion: 'Add LIMIT clause to prevent unbounded results',
  },
  // Prisma findMany without take
  {
    name: 'Prisma No Take',
    pattern: /\.findMany\s*\(\s*(?:\{[^}]*\})?\s*\)/g,
    antiPattern: /take\s*:/i,
    message: 'Prisma findMany() without take limit',
    severity: 'info',
    suggestion: 'Add take: N to limit results',
  },
  // Database connection without timeout
  {
    name: 'DB Connection No Timeout',
    pattern: /(?:createConnection|connect)\s*\(\s*\{[^}]*\}\s*\)/g,
    antiPattern: /(?:connectTimeout|connectionTimeout|timeout)\s*:/i,
    message: 'Database connection without timeout configuration',
    severity: 'warn',
    suggestion: 'Set connection timeout to prevent hanging connections',
  },
  // Query without statement timeout
  {
    name: 'Query No Timeout',
    pattern: /(?:query|execute)\s*\(\s*["'`][^"'`]+["'`]/g,
    antiPattern: /(?:timeout|statement_timeout)/i,
    message: 'Database query without statement timeout',
    severity: 'info',
    suggestion: 'Consider setting statement timeout for long-running queries',
  },
];

// ============================================================================
// TIMER PATTERNS
// ============================================================================
const TIMER_PATTERNS: TimeoutPattern[] = [
  // setInterval without clearInterval reference
  {
    name: 'SetInterval No Clear',
    pattern: /setInterval\s*\([^)]+\)/g,
    antiPattern: /(?:const|let|var)\s+\w+\s*=\s*setInterval|clearInterval/i,
    message: 'setInterval without stored reference for cleanup',
    severity: 'warn',
    suggestion: 'Store interval ID and clear in cleanup: const id = setInterval(...); clearInterval(id)',
  },
  // setTimeout in loop without management
  {
    name: 'SetTimeout In Loop',
    pattern: /(?:for|while|forEach|map)\s*\([^)]*\)\s*\{[^}]*setTimeout/g,
    message: 'setTimeout in loop may cause memory issues',
    severity: 'info',
    suggestion: 'Consider using Promise.all with delays or a queue',
  },
  // Recursive setTimeout without exit condition (hard to detect, use heuristic)
  {
    name: 'Recursive Timeout',
    pattern: /function\s+(\w+)[^{]*\{[^}]*setTimeout\s*\([^,]*\1/g,
    message: 'Recursive setTimeout detected - ensure exit condition exists',
    severity: 'info',
    suggestion: 'Add clear exit condition to prevent infinite recursion',
  },
];

// ============================================================================
// WEBSOCKET PATTERNS
// ============================================================================
const WEBSOCKET_PATTERNS: TimeoutPattern[] = [
  // WebSocket without ping/pong or heartbeat
  {
    name: 'WebSocket No Heartbeat',
    pattern: /new\s+WebSocket\s*\(/g,
    antiPattern: /(?:ping|pong|heartbeat|keepAlive)/i,
    message: 'WebSocket connection without heartbeat/ping mechanism',
    severity: 'warn',
    suggestion: 'Implement ping/pong or heartbeat to detect dead connections',
  },
  // ws library without ping interval
  {
    name: 'WS No Ping',
    pattern: /new\s+(?:WebSocketServer|Server)\s*\(\s*\{[^}]*\}\s*\)/g,
    antiPattern: /(?:pingInterval|clientTracking)/i,
    message: 'WebSocket server without ping interval configuration',
    severity: 'info',
    suggestion: 'Configure pingInterval to detect stale connections',
  },
];

// ============================================================================
// HTTP SERVER PATTERNS
// ============================================================================
const SERVER_PATTERNS: TimeoutPattern[] = [
  // HTTP server without timeout
  {
    name: 'Server No Timeout',
    pattern: /(?:createServer|express|fastify|koa)\s*\([^)]*\)/g,
    antiPattern: /(?:timeout|requestTimeout|headersTimeout)/i,
    message: 'HTTP server without request timeout configuration',
    severity: 'warn',
    suggestion: 'Set server.timeout or request timeout middleware',
  },
  // Express without timeout middleware
  {
    name: 'Express No Timeout',
    pattern: /const\s+app\s*=\s*express\s*\(\s*\)/g,
    antiPattern: /(?:timeout|connect-timeout)/i,
    message: 'Express app without timeout middleware',
    severity: 'info',
    suggestion: 'Consider using connect-timeout middleware',
  },
];

// ============================================================================
// PROMISE PATTERNS
// ============================================================================
const PROMISE_PATTERNS: TimeoutPattern[] = [
  // Promise.race without timeout (when waiting for external)
  {
    name: 'Await No Timeout',
    pattern: /await\s+(?:fetch|axios|request|query)/g,
    antiPattern: /Promise\.race|timeout|AbortController/i,
    message: 'Async operation without timeout wrapper',
    severity: 'info',
    suggestion: 'Wrap in Promise.race with timeout promise',
  },
  // Long-running promise without timeout
  {
    name: 'Promise No Timeout',
    pattern: /new\s+Promise\s*\(\s*(?:async\s*)?\([^)]*\)\s*=>/g,
    antiPattern: /(?:setTimeout|reject.*timeout|AbortController)/i,
    message: 'Promise without timeout may hang forever',
    severity: 'info',
    suggestion: 'Add timeout rejection to long-running promises',
  },
];

// ============================================================================
// STREAM PATTERNS
// ============================================================================
const STREAM_PATTERNS: TimeoutPattern[] = [
  // Readable stream without timeout
  {
    name: 'Stream No Timeout',
    pattern: /\.pipe\s*\(\s*\w+\s*\)/g,
    antiPattern: /(?:timeout|destroy|unpipe)/i,
    message: 'Stream piping without timeout handling',
    severity: 'info',
    suggestion: 'Set stream timeout and handle timeout event',
  },
];

// Combine all patterns
const ALL_TIMEOUT_PATTERNS: TimeoutPattern[] = [
  ...FETCH_PATTERNS,
  ...AXIOS_PATTERNS,
  ...DATABASE_PATTERNS,
  ...TIMER_PATTERNS,
  ...WEBSOCKET_PATTERNS,
  ...SERVER_PATTERNS,
  ...PROMISE_PATTERNS,
  ...STREAM_PATTERNS,
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

function getContext(content: string, index: number, range: number = 200): string {
  const start = Math.max(0, index - range);
  const end = Math.min(content.length, index + range);
  return content.substring(start, end);
}

export const ab009Timeouts: Rule = {
  id: 'AB009',
  name: 'Missing Timeout Configuration',
  description: 'Detects network and async operations without proper timeout configuration',
  defaultSeverity: 'warn',
  appliesTo: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],

  check(content: string, filePath: string): RiskFinding[] {
    const findings: RiskFinding[] = [];

    if (shouldExcludeFile(filePath)) {
      return findings;
    }

    // Track reported lines
    const reported = new Set<string>();

    for (const { name, pattern, antiPattern, message, severity, suggestion } of ALL_TIMEOUT_PATTERNS) {
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNum = getLineNumber(content, match.index);
        const key = `${lineNum}:${name}`;

        if (reported.has(key)) {
          continue;
        }

        // Check if anti-pattern exists (meaning it's properly configured)
        if (antiPattern) {
          const context = getContext(content, match.index);
          if (antiPattern.test(context)) {
            continue; // Skip - has proper configuration
          }
        }

        reported.add(key);
        const snippet = getSnippet(content, match.index);

        findings.push({
          ruleId: 'AB009',
          severity,
          file: filePath,
          line: lineNum,
          message: `${message}. ${suggestion}`,
          snippet: snippet.length > 80 ? snippet.substring(0, 77) + '...' : snippet,
        });
      }
    }

    return findings;
  },
};
