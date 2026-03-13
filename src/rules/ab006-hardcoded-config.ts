/**
 * AB006: Hardcoded Configuration Values Detection (Enhanced)
 *
 * Comprehensive detection of hardcoded values that should be externalized:
 * - URLs, ports, IPs, paths
 * - Timeouts, retries, cache TTLs
 * - Resource limits, pool sizes
 * - Feature flags, rate limits
 * - Cloud/infrastructure configurations
 * - Session/token configurations
 */

import type { RiskFinding } from '../types.js';
import type { Rule } from './index.js';

interface ConfigPattern {
  name: string;
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warn' | 'info';
  suggestion?: string;
}

// ============================================================================
// NETWORK & SERVICE CONFIGURATIONS
// ============================================================================
const NETWORK_PATTERNS: ConfigPattern[] = [
  // Localhost URLs
  {
    name: 'Localhost URL',
    pattern: /["']https?:\/\/localhost(?::\d+)?(?:\/[^"']*)?["']/g,
    message: 'Hardcoded localhost URL',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.API_BASE_URL',
  },
  // 127.0.0.1 URLs
  {
    name: 'Loopback IP URL',
    pattern: /["']https?:\/\/127\.0\.0\.1(?::\d+)?(?:\/[^"']*)?["']/g,
    message: 'Hardcoded loopback IP URL',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.API_BASE_URL',
  },
  // Production URLs
  {
    name: 'Production URL',
    pattern: /["']https?:\/\/(?!localhost|127\.0\.0\.1|example\.com)[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?::\d+)?(?:\/[^"']*)?["']/g,
    message: 'Hardcoded production URL will break across environments',
    severity: 'error',
    suggestion: 'Use environment variable: process.env.SERVICE_URL',
  },
  // Hardcoded port numbers
  {
    name: 'Hardcoded Port',
    pattern: /(?:port|PORT)\s*[:=]\s*(\d{4,5})(?!\d)/g,
    message: 'Hardcoded port number',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.PORT',
  },
  // Hardcoded port in variable names
  {
    name: 'Hardcoded Port Variable',
    pattern: /(?:server|db|redis|app|http|service|listen)Port\s*[:=]\s*(\d{4,5})(?!\d)/g,
    message: 'Hardcoded port number in variable',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.PORT',
  },
  // Private IP ranges
  {
    name: 'Private IP',
    pattern: /["'](?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})["']/g,
    message: 'Hardcoded private IP address is environment-specific',
    severity: 'error',
    suggestion: 'Use environment variable or service discovery',
  },
  // 0.0.0.0 binding
  {
    name: 'Bind All Interfaces',
    pattern: /["']0\.0\.0\.0["']/g,
    message: 'Binding to 0.0.0.0 exposes service on all interfaces',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.HOST',
  },
];

// ============================================================================
// FILE SYSTEM PATHS
// ============================================================================
const PATH_PATTERNS: ConfigPattern[] = [
  // Unix absolute paths
  {
    name: 'Unix Absolute Path',
    pattern: /["']\/(?:home|usr|var|etc|opt|tmp)\/[^"']+["']/g,
    message: 'Hardcoded Unix absolute path',
    severity: 'warn',
    suggestion: 'Use environment variable or path.join with configurable base',
  },
  // Windows absolute paths
  {
    name: 'Windows Absolute Path',
    pattern: /["'][A-Z]:\\[^"']+["']/g,
    message: 'Hardcoded Windows absolute path',
    severity: 'warn',
    suggestion: 'Use environment variable or path.join with configurable base',
  },
];

// ============================================================================
// TIMEOUT, RETRY & RESILIENCE CONFIGURATIONS
// ============================================================================
const RESILIENCE_PATTERNS: ConfigPattern[] = [
  // Timeout values (in milliseconds, typically 1000+)
  {
    name: 'Hardcoded Timeout',
    pattern: /(?:timeout|TIMEOUT)\s*[:=]\s*(\d{4,})(?!\d)/gi,
    message: 'Hardcoded timeout value',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.REQUEST_TIMEOUT_MS',
  },
  // Connection timeout
  {
    name: 'Connection Timeout',
    pattern: /(?:connection_?timeout|connectTimeout)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded connection timeout',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.CONNECTION_TIMEOUT_MS',
  },
  // Socket timeout
  {
    name: 'Socket Timeout',
    pattern: /(?:socket_?timeout|socketTimeout)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded socket timeout',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.SOCKET_TIMEOUT_MS',
  },
  // Retry count/attempts
  {
    name: 'Hardcoded Retry Count',
    pattern: /(?:retry_?count|retryCount|max_?retries|maxRetries|retry_?attempts)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded retry count',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.MAX_RETRIES',
  },
  // Backoff multiplier
  {
    name: 'Backoff Multiplier',
    pattern: /(?:backoff_?multiplier|backoffMultiplier|retry_?delay)\s*[:=]\s*[\d.]+/gi,
    message: 'Hardcoded backoff/retry delay',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.RETRY_BACKOFF_MS',
  },
  // Circuit breaker thresholds
  {
    name: 'Circuit Breaker Threshold',
    pattern: /(?:failure_?threshold|failureThreshold|circuit_?breaker)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded circuit breaker threshold',
    severity: 'info',
    suggestion: 'Use configuration for circuit breaker settings',
  },
];

// ============================================================================
// CACHE CONFIGURATIONS
// ============================================================================
const CACHE_PATTERNS: ConfigPattern[] = [
  // Cache TTL
  {
    name: 'Cache TTL',
    pattern: /(?:cache_?ttl|cacheTtl|ttl|TTL)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded cache TTL',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.CACHE_TTL_SECONDS',
  },
  // Cache max size
  {
    name: 'Cache Max Size',
    pattern: /(?:cache_?size|cacheSize|max_?cache|maxCache)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded cache size limit',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.CACHE_MAX_SIZE',
  },
  // Cache expiration
  {
    name: 'Cache Expiration',
    pattern: /(?:expir(?:ation|es?)|cache_?expir)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded cache expiration',
    severity: 'info',
    suggestion: 'Use environment variable for cache expiration',
  },
];

// ============================================================================
// RESOURCE POOL & THREAD CONFIGURATIONS
// ============================================================================
const RESOURCE_PATTERNS: ConfigPattern[] = [
  // Thread pool size
  {
    name: 'Thread Pool Size',
    pattern: /(?:thread_?pool|threadPool|pool_?size|poolSize|num_?threads|numThreads)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded thread/pool size',
    severity: 'info',
    suggestion: 'Use environment variable or compute from CPU count',
  },
  // Connection pool
  {
    name: 'Connection Pool',
    pattern: /(?:max_?connections|maxConnections|pool_?max|poolMax|connection_?limit)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded connection pool limit',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.DB_POOL_SIZE',
  },
  // Batch size
  {
    name: 'Batch Size',
    pattern: /(?:batch_?size|batchSize)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded batch size',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.BATCH_SIZE',
  },
  // Queue size
  {
    name: 'Queue Size',
    pattern: /(?:queue_?size|queueSize|max_?queue|maxQueue)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded queue size',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.QUEUE_SIZE',
  },
  // Worker count
  {
    name: 'Worker Count',
    pattern: /(?:num_?workers|numWorkers|worker_?count|workerCount)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded worker count',
    severity: 'info',
    suggestion: 'Use environment variable or compute from CPU count',
  },
];

// ============================================================================
// RATE LIMITING & QUOTA CONFIGURATIONS
// ============================================================================
const RATE_LIMIT_PATTERNS: ConfigPattern[] = [
  // Rate limit
  {
    name: 'Rate Limit',
    pattern: /(?:rate_?limit|rateLimit|requests_?per|requestsPer|rpm|rps)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded rate limit',
    severity: 'warn',
    suggestion: 'Use environment variable: process.env.RATE_LIMIT_PER_MINUTE',
  },
  // Daily/hourly quota
  {
    name: 'API Quota',
    pattern: /(?:daily_?quota|dailyQuota|hourly_?limit|api_?quota)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded API quota',
    severity: 'warn',
    suggestion: 'Use environment variable: process.env.API_QUOTA_DAILY',
  },
  // Throttle threshold
  {
    name: 'Throttle Threshold',
    pattern: /(?:throttle|burst_?limit|burstLimit)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded throttle/burst limit',
    severity: 'info',
    suggestion: 'Use environment variable for rate limiting config',
  },
];

// ============================================================================
// SESSION & AUTH CONFIGURATIONS
// ============================================================================
const AUTH_PATTERNS: ConfigPattern[] = [
  // Session timeout
  {
    name: 'Session Timeout',
    pattern: /(?:session_?timeout|sessionTimeout|session_?expir)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded session timeout is a security configuration',
    severity: 'error',
    suggestion: 'Use environment variable: process.env.SESSION_TIMEOUT_SECONDS',
  },
  // Token expiration
  {
    name: 'Token Expiration',
    pattern: /(?:token_?expir|tokenExpir|jwt_?expir|access_?token_?expir)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded token expiration is a security configuration',
    severity: 'error',
    suggestion: 'Use environment variable: process.env.TOKEN_EXPIRATION_SECONDS',
  },
  // Password requirements
  {
    name: 'Password Min Length',
    pattern: /(?:min_?password|password_?min|minPasswordLength)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded password policy',
    severity: 'info',
    suggestion: 'Use configuration for password policies',
  },
  // Max login attempts
  {
    name: 'Max Login Attempts',
    pattern: /(?:max_?attempts|maxAttempts|login_?attempts|failed_?login)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded login attempt limit',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.MAX_LOGIN_ATTEMPTS',
  },
  // Lockout duration
  {
    name: 'Lockout Duration',
    pattern: /(?:lockout_?duration|lockoutDuration|lockout_?time)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded lockout duration',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.LOCKOUT_DURATION_MINUTES',
  },
];

// ============================================================================
// CLOUD & INFRASTRUCTURE CONFIGURATIONS
// ============================================================================
const CLOUD_PATTERNS: ConfigPattern[] = [
  // AWS region
  {
    name: 'AWS Region',
    pattern: /["'](?:us|eu|ap|sa|ca|me|af)-(?:east|west|south|north|central|northeast|southeast)-\d["']/g,
    message: 'Hardcoded AWS region is environment-specific',
    severity: 'error',
    suggestion: 'Use environment variable: process.env.AWS_REGION',
  },
  // S3 bucket name pattern
  {
    name: 'S3 Bucket',
    pattern: /["']s3:\/\/[a-z0-9][-a-z0-9]*["']/gi,
    message: 'Hardcoded S3 bucket URI is environment-specific',
    severity: 'error',
    suggestion: 'Use environment variable: process.env.S3_BUCKET',
  },
  // Azure region
  {
    name: 'Azure Region',
    pattern: /["'](?:eastus|westus|northeurope|westeurope|southeastasia|australiaeast)["']/gi,
    message: 'Hardcoded Azure region',
    severity: 'warn',
    suggestion: 'Use environment variable: process.env.AZURE_REGION',
  },
  // GCP project
  {
    name: 'GCP Project',
    pattern: /(?:project_?id|projectId)\s*[:=]\s*["'][a-z][-a-z0-9]{4,28}[a-z0-9]["']/gi,
    message: 'Hardcoded GCP project ID',
    severity: 'warn',
    suggestion: 'Use environment variable: process.env.GCP_PROJECT_ID',
  },
];

// ============================================================================
// PAGINATION & DATA CONFIGURATIONS
// ============================================================================
const DATA_PATTERNS: ConfigPattern[] = [
  // Page size
  {
    name: 'Page Size',
    pattern: /(?:page_?size|pageSize|per_?page|perPage|limit)\s*[:=]\s*(?:10|20|25|50|100)(?!\d)/gi,
    message: 'Hardcoded pagination limit',
    severity: 'info',
    suggestion: 'Use configuration or allow client-specified limits',
  },
  // Max results
  {
    name: 'Max Results',
    pattern: /(?:max_?results|maxResults|max_?items|maxItems)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded max results limit',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.MAX_RESULTS',
  },
  // File size limits
  {
    name: 'File Size Limit',
    pattern: /(?:max_?file_?size|maxFileSize|upload_?limit|file_?limit)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded file size limit',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.MAX_FILE_SIZE_BYTES',
  },
];

// ============================================================================
// CORS & SECURITY CONFIGURATIONS
// ============================================================================
const SECURITY_PATTERNS: ConfigPattern[] = [
  // CORS origins array
  {
    name: 'CORS Origins',
    pattern: /(?:cors_?origins|allowedOrigins|CORS_ORIGINS)\s*[:=]\s*\[/gi,
    message: 'Hardcoded CORS allowed origins',
    severity: 'warn',
    suggestion: 'Use environment variable: process.env.CORS_ALLOWED_ORIGINS',
  },
  // CORS max age
  {
    name: 'CORS Max Age',
    pattern: /(?:cors_?max_?age|maxAge|preflightMaxAge)\s*[:=]\s*\d+/gi,
    message: 'Hardcoded CORS max age',
    severity: 'info',
    suggestion: 'Use environment variable: process.env.CORS_MAX_AGE',
  },
];

// ============================================================================
// FEATURE FLAGS
// ============================================================================
const FEATURE_FLAG_PATTERNS: ConfigPattern[] = [
  // Feature flag assignments
  {
    name: 'Feature Flag',
    pattern: /(?:feature_|FEATURE_|enable_|ENABLE_|is_?enabled|isEnabled)[A-Z_]+\s*[:=]\s*(?:true|false)/gi,
    message: 'Hardcoded feature flag',
    severity: 'warn',
    suggestion: 'Use feature flag service or environment variable',
  },
];

// Combine all patterns
const ALL_CONFIG_PATTERNS: ConfigPattern[] = [
  ...NETWORK_PATTERNS,
  ...PATH_PATTERNS,
  ...RESILIENCE_PATTERNS,
  ...CACHE_PATTERNS,
  ...RESOURCE_PATTERNS,
  ...RATE_LIMIT_PATTERNS,
  ...AUTH_PATTERNS,
  ...CLOUD_PATTERNS,
  ...DATA_PATTERNS,
  ...SECURITY_PATTERNS,
  ...FEATURE_FLAG_PATTERNS,
];

// Files/patterns to exclude
const EXCLUDE_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /test\//,
  /tests\//,
  /fixtures?\//,
  /examples?\//,
  /\.config\.[jt]s$/,
  /\.config\.m?[jt]s$/,
  /vite\.config/,
  /webpack\.config/,
  /jest\.config/,
  /vitest\.config/,
  /tsconfig/,
  /eslint/,
  /prettier/,
  /\.d\.ts$/,
  /types\.ts$/,
];

// Content patterns to exclude
const EXCLUDE_CONTENT_PATTERNS = [
  /process\.env\./,
  /import\.meta\.env\./,
  /\$\{[^}]+\}/,
  /getenv/i,
  /config\./i,
  /settings\./i,
  /options\./i,
  /defaults?\./i,
  /from\s+['"][^'"]+config/i,
];

// Known safe patterns
const SAFE_PATTERNS = [
  /^\s*\/\/.*[:=]/,  // Line starting with comment //
  /^\s*\/\*.*[:=]/,  // Line starting with block comment /*
  /^\s*\*.*[:=]/,    // Line starting with * (JSDoc continuation)
  /"description":/,
  /"homepage":/,
  /"repository":/,
  /interface\s+/,    // Type definitions
  /type\s+\w+\s*=/,  // Type aliases
  /@param/,          // JSDoc
  /@returns/,
  /README/i,
  /example/i,
  /TODO/,
  /FIXME/,
];

function shouldExcludeFile(filePath: string): boolean {
  return EXCLUDE_FILE_PATTERNS.some(pattern => pattern.test(filePath));
}

function shouldExcludeContent(line: string): boolean {
  return EXCLUDE_CONTENT_PATTERNS.some(pattern => pattern.test(line));
}

function isSafeContext(content: string, matchIndex: number): boolean {
  const lineStart = content.lastIndexOf('\n', matchIndex) + 1;
  const lineEnd = content.indexOf('\n', matchIndex);
  const line = content.substring(lineStart, lineEnd === -1 ? undefined : lineEnd);

  return SAFE_PATTERNS.some(pattern => pattern.test(line));
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

export const ab006HardcodedConfig: Rule = {
  id: 'AB006',
  name: 'Hardcoded Configuration',
  description: 'Detects hardcoded configuration values that should be externalized',
  defaultSeverity: 'warn',
  appliesTo: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],

  check(content: string, filePath: string): RiskFinding[] {
    const findings: RiskFinding[] = [];

    // Skip excluded files
    if (shouldExcludeFile(filePath)) {
      return findings;
    }

    // Track findings to avoid duplicates
    const reportedLines = new Set<string>();

    for (const { pattern, message, severity, suggestion } of ALL_CONFIG_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNum = getLineNumber(content, match.index);
        const lineKey = `${lineNum}:${message}`;

        // Skip duplicates on same line
        if (reportedLines.has(lineKey)) {
          continue;
        }

        const snippet = getSnippet(content, match.index);

        // Skip if in safe context
        if (isSafeContext(content, match.index)) {
          continue;
        }

        // Skip if line has env var reference
        if (shouldExcludeContent(snippet)) {
          continue;
        }

        // Skip common false positives
        if (snippet.includes('example.com') || snippet.includes('placeholder')) {
          continue;
        }

        reportedLines.add(lineKey);

        const fullMessage = suggestion ? `${message}. ${suggestion}` : message;

        findings.push({
          ruleId: 'AB006',
          severity,
          file: filePath,
          line: lineNum,
          message: fullMessage,
          snippet: snippet.length > 80 ? snippet.substring(0, 77) + '...' : snippet,
        });
      }
    }

    return findings;
  },
};
