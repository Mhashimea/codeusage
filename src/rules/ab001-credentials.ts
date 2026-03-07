/**
 * AB001: Hardcoded Credentials Detection (Enhanced)
 *
 * Comprehensive detection of secrets, API keys, tokens, and credentials:
 * - Cloud provider keys (AWS, GCP, Azure, DigitalOcean, etc.)
 * - SaaS API keys (Stripe, Twilio, SendGrid, etc.)
 * - Database credentials and connection strings
 * - Authentication tokens (JWT, OAuth, Bearer)
 * - Encryption keys, certificates, private keys
 * - Webhook secrets and signing keys
 */

import type { RiskFinding } from '../types.js';
import type { Rule } from './index.js';

interface CredentialPattern {
  name: string;
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warn';
}

// ============================================================================
// CLOUD PROVIDER API KEYS
// ============================================================================
const CLOUD_PROVIDER_PATTERNS: CredentialPattern[] = [
  // AWS
  {
    name: 'AWS Access Key ID',
    pattern: /(?:^|[^A-Z0-9])AKIA[0-9A-Z]{16}(?:[^A-Z0-9]|$)/g,
    message: 'AWS Access Key ID detected',
    severity: 'error',
  },
  {
    name: 'AWS Secret Access Key',
    pattern: /(?:aws_secret_access_key|aws_secret_key|secret_?access_?key)\s*[:=]\s*["'][A-Za-z0-9/+=]{40}["']/gi,
    message: 'AWS Secret Access Key detected',
    severity: 'error',
  },
  {
    name: 'AWS Session Token',
    pattern: /(?:aws_session_token|session_?token)\s*[:=]\s*["'][A-Za-z0-9/+=]{100,}["']/gi,
    message: 'AWS Session Token detected',
    severity: 'error',
  },
  // Google Cloud
  {
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z_-]{35}/g,
    message: 'Google API key detected',
    severity: 'error',
  },
  {
    name: 'Google OAuth Client Secret',
    pattern: /(?:client_secret|clientSecret)\s*[:=]\s*["'][A-Za-z0-9_-]{24}["']/gi,
    message: 'Google OAuth client secret detected',
    severity: 'error',
  },
  {
    name: 'GCP Service Account Key',
    pattern: /"private_key":\s*"-----BEGIN (?:RSA )?PRIVATE KEY-----/g,
    message: 'GCP service account private key detected',
    severity: 'error',
  },
  // Azure
  {
    name: 'Azure Storage Key',
    pattern: /(?:DefaultEndpointsProtocol|AccountKey)\s*=\s*[A-Za-z0-9+/=]{86,}/gi,
    message: 'Azure Storage account key detected',
    severity: 'error',
  },
  {
    name: 'Azure AD Client Secret',
    pattern: /(?:client_secret|clientSecret|AZURE_CLIENT_SECRET)\s*[:=]\s*["'][A-Za-z0-9~_.-]{34,}["']/gi,
    message: 'Azure AD client secret detected',
    severity: 'error',
  },
  {
    name: 'Azure Connection String',
    pattern: /(?:Endpoint|SharedAccessKey)\s*=\s*[A-Za-z0-9+/=]{40,}/gi,
    message: 'Azure connection string with key detected',
    severity: 'error',
  },
  // DigitalOcean
  {
    name: 'DigitalOcean Token',
    pattern: /(?:do_token|digitalocean_token|DIGITALOCEAN_ACCESS_TOKEN)\s*[:=]\s*["'][a-f0-9]{64}["']/gi,
    message: 'DigitalOcean access token detected',
    severity: 'error',
  },
  // Heroku
  {
    name: 'Heroku API Key',
    pattern: /(?:heroku_api_key|HEROKU_API_KEY)\s*[:=]\s*["'][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}["']/gi,
    message: 'Heroku API key detected',
    severity: 'error',
  },
  // Cloudflare
  {
    name: 'Cloudflare API Key',
    pattern: /(?:cloudflare_api_key|CF_API_KEY)\s*[:=]\s*["'][a-f0-9]{37}["']/gi,
    message: 'Cloudflare API key detected',
    severity: 'error',
  },
  {
    name: 'Cloudflare API Token',
    pattern: /(?:cloudflare_api_token|CF_API_TOKEN)\s*[:=]\s*["'][A-Za-z0-9_-]{40}["']/gi,
    message: 'Cloudflare API token detected',
    severity: 'error',
  },
];

// ============================================================================
// AI/ML SERVICE API KEYS
// ============================================================================
const AI_SERVICE_PATTERNS: CredentialPattern[] = [
  // OpenAI
  {
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9]{20,}/g,
    message: 'OpenAI API key detected',
    severity: 'error',
  },
  {
    name: 'OpenAI Organization ID',
    pattern: /org-[a-zA-Z0-9]{24}/g,
    message: 'OpenAI organization ID detected',
    severity: 'warn',
  },
  // Anthropic
  {
    name: 'Anthropic API Key',
    pattern: /sk-ant-[a-zA-Z0-9_-]{90,}/g,
    message: 'Anthropic API key detected',
    severity: 'error',
  },
  // Cohere
  {
    name: 'Cohere API Key',
    pattern: /(?:cohere_api_key|COHERE_API_KEY)\s*[:=]\s*["'][A-Za-z0-9]{40}["']/gi,
    message: 'Cohere API key detected',
    severity: 'error',
  },
  // Hugging Face
  {
    name: 'Hugging Face Token',
    pattern: /hf_[a-zA-Z0-9]{34}/g,
    message: 'Hugging Face API token detected',
    severity: 'error',
  },
  // Replicate
  {
    name: 'Replicate API Token',
    pattern: /r8_[a-zA-Z0-9]{37}/g,
    message: 'Replicate API token detected',
    severity: 'error',
  },
];

// ============================================================================
// PAYMENT & FINTECH API KEYS
// ============================================================================
const PAYMENT_PATTERNS: CredentialPattern[] = [
  // Stripe
  {
    name: 'Stripe Secret Key',
    pattern: /sk_live_[a-zA-Z0-9]{24,}/g,
    message: 'Stripe live secret key detected',
    severity: 'error',
  },
  {
    name: 'Stripe Publishable Key (Live)',
    pattern: /pk_live_[a-zA-Z0-9]{24,}/g,
    message: 'Stripe live publishable key detected',
    severity: 'warn',
  },
  {
    name: 'Stripe Restricted Key',
    pattern: /rk_live_[a-zA-Z0-9]{24,}/g,
    message: 'Stripe restricted live key detected',
    severity: 'error',
  },
  {
    name: 'Stripe Webhook Secret',
    pattern: /whsec_[a-zA-Z0-9]{32,}/g,
    message: 'Stripe webhook signing secret detected',
    severity: 'error',
  },
  // PayPal
  {
    name: 'PayPal Client Secret',
    pattern: /(?:paypal_client_secret|PAYPAL_SECRET)\s*[:=]\s*["'][A-Za-z0-9_-]{60,}["']/gi,
    message: 'PayPal client secret detected',
    severity: 'error',
  },
  // Square
  {
    name: 'Square Access Token',
    pattern: /sq0atp-[A-Za-z0-9_-]{22}/g,
    message: 'Square access token detected',
    severity: 'error',
  },
  {
    name: 'Square OAuth Secret',
    pattern: /sq0csp-[A-Za-z0-9_-]{43}/g,
    message: 'Square OAuth secret detected',
    severity: 'error',
  },
  // Plaid
  {
    name: 'Plaid Secret',
    pattern: /(?:plaid_secret|PLAID_SECRET)\s*[:=]\s*["'][a-f0-9]{30}["']/gi,
    message: 'Plaid secret key detected',
    severity: 'error',
  },
];

// ============================================================================
// COMMUNICATION SERVICE API KEYS
// ============================================================================
const COMMUNICATION_PATTERNS: CredentialPattern[] = [
  // Twilio
  {
    name: 'Twilio API Key',
    pattern: /SK[a-f0-9]{32}/g,
    message: 'Twilio API key detected',
    severity: 'error',
  },
  {
    name: 'Twilio Auth Token',
    pattern: /(?:twilio_auth_token|TWILIO_AUTH_TOKEN)\s*[:=]\s*["'][a-f0-9]{32}["']/gi,
    message: 'Twilio auth token detected',
    severity: 'error',
  },
  // SendGrid
  {
    name: 'SendGrid API Key',
    pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,
    message: 'SendGrid API key detected',
    severity: 'error',
  },
  // Mailgun
  {
    name: 'Mailgun API Key',
    pattern: /key-[a-f0-9]{32}/g,
    message: 'Mailgun API key detected',
    severity: 'error',
  },
  // Mailchimp
  {
    name: 'Mailchimp API Key',
    pattern: /[a-f0-9]{32}-us\d{1,2}/g,
    message: 'Mailchimp API key detected',
    severity: 'error',
  },
  // Postmark
  {
    name: 'Postmark Server Token',
    pattern: /(?:postmark_token|POSTMARK_SERVER_TOKEN)\s*[:=]\s*["'][a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}["']/gi,
    message: 'Postmark server token detected',
    severity: 'error',
  },
  // Slack
  {
    name: 'Slack Bot Token',
    pattern: /xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}/g,
    message: 'Slack bot token detected',
    severity: 'error',
  },
  {
    name: 'Slack User Token',
    pattern: /xoxp-[0-9]{10,13}-[0-9]{10,13}-[0-9]{10,13}-[a-f0-9]{32}/g,
    message: 'Slack user token detected',
    severity: 'error',
  },
  {
    name: 'Slack Webhook URL',
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]{8,}\/B[A-Z0-9]{8,}\/[a-zA-Z0-9]{24}/g,
    message: 'Slack webhook URL detected',
    severity: 'error',
  },
  // Discord
  {
    name: 'Discord Bot Token',
    pattern: /(?:discord_token|DISCORD_TOKEN)\s*[:=]\s*["'][A-Za-z0-9_-]{59,}["']/gi,
    message: 'Discord bot token detected',
    severity: 'error',
  },
  {
    name: 'Discord Webhook URL',
    pattern: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g,
    message: 'Discord webhook URL detected',
    severity: 'error',
  },
  // Telegram
  {
    name: 'Telegram Bot Token',
    pattern: /\d{9,10}:[A-Za-z0-9_-]{35}/g,
    message: 'Telegram bot token detected',
    severity: 'error',
  },
];

// ============================================================================
// VERSION CONTROL & CI/CD API KEYS
// ============================================================================
const VCS_CICD_PATTERNS: CredentialPattern[] = [
  // GitHub
  {
    name: 'GitHub Personal Access Token',
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    message: 'GitHub personal access token detected',
    severity: 'error',
  },
  {
    name: 'GitHub OAuth Token',
    pattern: /gho_[a-zA-Z0-9]{36}/g,
    message: 'GitHub OAuth token detected',
    severity: 'error',
  },
  {
    name: 'GitHub App Token',
    pattern: /(?:ghu|ghs)_[a-zA-Z0-9]{36}/g,
    message: 'GitHub App token detected',
    severity: 'error',
  },
  {
    name: 'GitHub Refresh Token',
    pattern: /ghr_[a-zA-Z0-9]{36}/g,
    message: 'GitHub refresh token detected',
    severity: 'error',
  },
  // GitLab
  {
    name: 'GitLab Personal Access Token',
    pattern: /glpat-[a-zA-Z0-9_-]{20}/g,
    message: 'GitLab personal access token detected',
    severity: 'error',
  },
  {
    name: 'GitLab Pipeline Token',
    pattern: /glptt-[a-f0-9]{40}/g,
    message: 'GitLab pipeline trigger token detected',
    severity: 'error',
  },
  // Bitbucket
  {
    name: 'Bitbucket App Password',
    pattern: /(?:bitbucket_app_password|BITBUCKET_APP_PASSWORD)\s*[:=]\s*["'][A-Za-z0-9]{20}["']/gi,
    message: 'Bitbucket app password detected',
    severity: 'error',
  },
  // CircleCI
  {
    name: 'CircleCI Token',
    pattern: /(?:circle_token|CIRCLE_TOKEN|circleci_token)\s*[:=]\s*["'][a-f0-9]{40}["']/gi,
    message: 'CircleCI token detected',
    severity: 'error',
  },
  // Travis CI
  {
    name: 'Travis CI Token',
    pattern: /(?:travis_token|TRAVIS_TOKEN)\s*[:=]\s*["'][A-Za-z0-9_-]{22}["']/gi,
    message: 'Travis CI token detected',
    severity: 'error',
  },
  // Jenkins
  {
    name: 'Jenkins API Token',
    pattern: /(?:jenkins_token|JENKINS_API_TOKEN)\s*[:=]\s*["'][a-f0-9]{32,}["']/gi,
    message: 'Jenkins API token detected',
    severity: 'error',
  },
  // npm
  {
    name: 'npm Access Token',
    pattern: /npm_[a-zA-Z0-9]{36}/g,
    message: 'npm access token detected',
    severity: 'error',
  },
  // PyPI
  {
    name: 'PyPI API Token',
    pattern: /pypi-[A-Za-z0-9_-]{100,}/g,
    message: 'PyPI API token detected',
    severity: 'error',
  },
];

// ============================================================================
// DATABASE CREDENTIALS & CONNECTION STRINGS
// ============================================================================
const DATABASE_PATTERNS: CredentialPattern[] = [
  // MongoDB
  {
    name: 'MongoDB Connection String',
    pattern: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^\s"']+/gi,
    message: 'MongoDB connection string with credentials detected',
    severity: 'error',
  },
  // PostgreSQL
  {
    name: 'PostgreSQL Connection String',
    pattern: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^\s"']+/gi,
    message: 'PostgreSQL connection string with credentials detected',
    severity: 'error',
  },
  // MySQL
  {
    name: 'MySQL Connection String',
    pattern: /mysql:\/\/[^:]+:[^@]+@[^\s"']+/gi,
    message: 'MySQL connection string with credentials detected',
    severity: 'error',
  },
  // Redis
  {
    name: 'Redis Connection String',
    pattern: /redis(?:s)?:\/\/[^:]+:[^@]+@[^\s"']+/gi,
    message: 'Redis connection string with credentials detected',
    severity: 'error',
  },
  // SQL Server
  {
    name: 'SQL Server Connection String',
    pattern: /(?:Server|Data Source)=[^;]+;.*(?:User ID|UID)=[^;]+;.*(?:Password|PWD)=[^;]+/gi,
    message: 'SQL Server connection string with credentials detected',
    severity: 'error',
  },
  // AMQP/RabbitMQ
  {
    name: 'AMQP Connection String',
    pattern: /amqps?:\/\/[^:]+:[^@]+@[^\s"']+/gi,
    message: 'AMQP connection string with credentials detected',
    severity: 'error',
  },
  // Elasticsearch
  {
    name: 'Elasticsearch Credentials',
    pattern: /https?:\/\/[^:]+:[^@]+@[^\s"']*(?:elastic|es|elasticsearch)[^\s"']*/gi,
    message: 'Elasticsearch URL with credentials detected',
    severity: 'error',
  },
];

// ============================================================================
// GENERIC PASSWORD/SECRET PATTERNS
// ============================================================================
const GENERIC_SECRET_PATTERNS: CredentialPattern[] = [
  // Password assignments
  {
    name: 'Password Assignment',
    pattern: /(?:password|passwd|pwd|pass)\s*[:=]\s*["'][^"']{6,}["']/gi,
    message: 'Hardcoded password detected',
    severity: 'error',
  },
  // Secret assignments
  {
    name: 'Secret Assignment',
    pattern: /(?:secret|api_?key|apikey|auth_?token|access_?token|bearer)\s*[:=]\s*["'][^"']{8,}["']/gi,
    message: 'Hardcoded secret/token detected',
    severity: 'error',
  },
  // Private key assignments
  {
    name: 'Private Key Assignment',
    pattern: /(?:private_?key|privatekey|priv_?key)\s*[:=]\s*["'][^"']+["']/gi,
    message: 'Hardcoded private key detected',
    severity: 'error',
  },
  // Signing key/secret
  {
    name: 'Signing Secret',
    pattern: /(?:signing_?secret|signing_?key|hmac_?secret|hmac_?key)\s*[:=]\s*["'][^"']{16,}["']/gi,
    message: 'Hardcoded signing secret detected',
    severity: 'error',
  },
  // Encryption key
  {
    name: 'Encryption Key',
    pattern: /(?:encryption_?key|encrypt_?key|aes_?key|cipher_?key)\s*[:=]\s*["'][^"']{16,}["']/gi,
    message: 'Hardcoded encryption key detected',
    severity: 'error',
  },
  // Master key
  {
    name: 'Master Key',
    pattern: /(?:master_?key|root_?key)\s*[:=]\s*["'][^"']{16,}["']/gi,
    message: 'Hardcoded master/root key detected',
    severity: 'error',
  },
];

// ============================================================================
// JWT & AUTH TOKENS
// ============================================================================
const AUTH_TOKEN_PATTERNS: CredentialPattern[] = [
  // JWT Token (eyJ pattern)
  {
    name: 'JWT Token',
    pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
    message: 'Hardcoded JWT token detected',
    severity: 'error',
  },
  // Bearer token in code
  {
    name: 'Bearer Token',
    pattern: /["']Bearer\s+[A-Za-z0-9_-]{20,}["']/g,
    message: 'Hardcoded Bearer token detected',
    severity: 'error',
  },
  // Basic auth header
  {
    name: 'Basic Auth Header',
    pattern: /["']Basic\s+[A-Za-z0-9+/=]{10,}["']/g,
    message: 'Hardcoded Basic auth credentials detected',
    severity: 'error',
  },
  // Session secret
  {
    name: 'Session Secret',
    pattern: /(?:session_?secret|cookie_?secret|express_?secret)\s*[:=]\s*["'][^"']{16,}["']/gi,
    message: 'Hardcoded session secret detected',
    severity: 'error',
  },
];

// ============================================================================
// PRIVATE KEYS & CERTIFICATES
// ============================================================================
const CRYPTO_PATTERNS: CredentialPattern[] = [
  // RSA Private Key
  {
    name: 'RSA Private Key',
    pattern: /-----BEGIN RSA PRIVATE KEY-----/g,
    message: 'RSA private key detected in source code',
    severity: 'error',
  },
  // EC Private Key
  {
    name: 'EC Private Key',
    pattern: /-----BEGIN EC PRIVATE KEY-----/g,
    message: 'EC private key detected in source code',
    severity: 'error',
  },
  // Generic Private Key
  {
    name: 'Private Key',
    pattern: /-----BEGIN (?:ENCRYPTED )?PRIVATE KEY-----/g,
    message: 'Private key detected in source code',
    severity: 'error',
  },
  // PGP Private Key
  {
    name: 'PGP Private Key',
    pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g,
    message: 'PGP private key block detected',
    severity: 'error',
  },
  // SSH Private Key
  {
    name: 'SSH Private Key',
    pattern: /-----BEGIN (?:OPENSSH|DSA|RSA|EC) PRIVATE KEY-----/g,
    message: 'SSH private key detected in source code',
    severity: 'error',
  },
  // Certificate
  {
    name: 'Hardcoded Certificate',
    pattern: /-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----/g,
    message: 'Certificate embedded in source code',
    severity: 'warn',
  },
];

// ============================================================================
// WEBHOOK & CALLBACK SECRETS
// ============================================================================
const WEBHOOK_PATTERNS: CredentialPattern[] = [
  // Generic webhook secret
  {
    name: 'Webhook Secret',
    pattern: /(?:webhook_?secret|WEBHOOK_SECRET)\s*[:=]\s*["'][^"']{16,}["']/gi,
    message: 'Hardcoded webhook secret detected',
    severity: 'error',
  },
  // GitHub webhook secret
  {
    name: 'GitHub Webhook Secret',
    pattern: /(?:github_webhook_secret|GITHUB_WEBHOOK_SECRET)\s*[:=]\s*["'][^"']{20,}["']/gi,
    message: 'GitHub webhook secret detected',
    severity: 'error',
  },
  // Shopify webhook
  {
    name: 'Shopify Secret',
    pattern: /shpss_[a-f0-9]{32}/g,
    message: 'Shopify shared secret detected',
    severity: 'error',
  },
  {
    name: 'Shopify Access Token',
    pattern: /shpat_[a-f0-9]{32}/g,
    message: 'Shopify access token detected',
    severity: 'error',
  },
];

// Combine all patterns
const ALL_CREDENTIAL_PATTERNS: CredentialPattern[] = [
  ...CLOUD_PROVIDER_PATTERNS,
  ...AI_SERVICE_PATTERNS,
  ...PAYMENT_PATTERNS,
  ...COMMUNICATION_PATTERNS,
  ...VCS_CICD_PATTERNS,
  ...DATABASE_PATTERNS,
  ...GENERIC_SECRET_PATTERNS,
  ...AUTH_TOKEN_PATTERNS,
  ...CRYPTO_PATTERNS,
  ...WEBHOOK_PATTERNS,
];

// Files/patterns to exclude (tests, examples, etc.)
const EXCLUDE_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /test\//,
  /tests\//,
  /fixtures?\//,
  /examples?\//,
  /\.example\./,
  /\.sample\./,
  /\.template\./,
  /mock/i,
  /\.md$/,
  /\.txt$/,
  /ab\d{3}-.*\.ts$/,  // Afterburn rule files (contain detection patterns)
];

// Content patterns to exclude (env var references, placeholders)
const EXCLUDE_CONTENT_PATTERNS = [
  /process\.env\./,
  /import\.meta\.env\./,
  /\$\{[^}]+\}/,
  /<%[^%]+%>/,
  /\{\{[^}]+\}\}/,
  /<YOUR[_-]?/i,
  /PLACEHOLDER/i,
  /EXAMPLE/i,
  /xxxxxxx/i,
  /\*\*\*\*\*\*\*/,
  /your[_-]?api[_-]?key/i,
  /insert[_-]?your/i,
  /replace[_-]?with/i,
  /sk_test_/,  // Stripe test keys are OK
  /pk_test_/,
  /test_/i,
  /dummy/i,
  /fake/i,
  /mock/i,
  /git\+https?:\/\/github\.com/i,  // Git repository URLs
  /git\+https?:\/\/gitlab\.com/i,
  /git\+https?:\/\/bitbucket\.org/i,
];

function shouldExcludeFile(filePath: string): boolean {
  return EXCLUDE_FILE_PATTERNS.some(pattern => pattern.test(filePath));
}

function shouldExcludeContent(line: string): boolean {
  return EXCLUDE_CONTENT_PATTERNS.some(pattern => pattern.test(line));
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

function maskSecret(snippet: string): string {
  // Mask the actual secret value for safety
  return snippet.replace(/[:=]\s*["'][^"']+["']/g, (match) => {
    const prefix = match.substring(0, match.indexOf('"') + 1) || match.substring(0, match.indexOf("'") + 1);
    return prefix + '***REDACTED***' + match.charAt(match.length - 1);
  });
}

export const ab001HardcodedCredentials: Rule = {
  id: 'AB001',
  name: 'Hardcoded Credentials',
  description: 'Detects API keys, passwords, tokens, and secrets hardcoded in source files',
  defaultSeverity: 'error',
  appliesTo: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.yaml', '.yml', '.env.example'],

  check(content: string, filePath: string): RiskFinding[] {
    const findings: RiskFinding[] = [];

    // Skip excluded files
    if (shouldExcludeFile(filePath)) {
      return findings;
    }

    // Track to avoid duplicate reports
    const reportedLines = new Set<string>();

    for (const { pattern, message, severity } of ALL_CREDENTIAL_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNum = getLineNumber(content, match.index);
        const lineKey = `${lineNum}:${message}`;

        // Skip duplicates
        if (reportedLines.has(lineKey)) {
          continue;
        }

        const snippet = getSnippet(content, match.index);

        // Skip if line contains exclusion patterns
        if (shouldExcludeContent(snippet)) {
          continue;
        }

        // Skip if it looks like a type definition or interface
        if (/:\s*string\s*[;,}]/.test(snippet) || /type\s+\w+\s*=/.test(snippet)) {
          continue;
        }

        // Skip if in comment
        if (/^\s*\/\//.test(snippet) || /^\s*\*/.test(snippet) || /^\s*\/\*/.test(snippet)) {
          continue;
        }

        reportedLines.add(lineKey);

        findings.push({
          ruleId: 'AB001',
          severity,
          file: filePath,
          line: lineNum,
          message,
          snippet: maskSecret(snippet.length > 80 ? snippet.substring(0, 77) + '...' : snippet),
        });
      }
    }

    return findings;
  },
};
