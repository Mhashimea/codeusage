import type { Pattern } from "./types.js";

/**
 * Built-in credential detection patterns for Prompt Guard
 * These patterns are shipped with the CLI and used for local prompt scanning
 *
 * IMPORTANT: These patterns run on developer machines - they must be fast and accurate
 * False positives are acceptable but should be minimized
 * False negatives for common credential formats are NOT acceptable
 */
export const BUILT_IN_PATTERNS: Pattern[] = [
  // ============================================
  // AWS Credentials
  // ============================================
  {
    id: "aws-access-key",
    name: "AWS Access Key",
    category: "aws",
    regex: "AKIA[0-9A-Z]{16}",
    description: "AWS access key ID starting with AKIA",
  },
  {
    id: "aws-secret-key",
    name: "AWS Secret Key",
    category: "aws",
    regex: "(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY|aws_secret_key|AWS_SECRET_KEY)\\s*[=:]\\s*['\"]?[A-Za-z0-9/+=]{40}['\"]?",
    description: "AWS secret access key in config format",
  },

  // ============================================
  // Database Connection Strings
  // ============================================
  {
    id: "postgres-url",
    name: "PostgreSQL URL",
    category: "database",
    regex: "postgres(?:ql)?:\\/\\/[^\\s:]+:[^\\s@]+@[^\\s]+",
    description: "PostgreSQL connection string with credentials",
  },
  {
    id: "mysql-url",
    name: "MySQL URL",
    category: "database",
    regex: "mysql:\\/\\/[^\\s:]+:[^\\s@]+@[^\\s]+",
    description: "MySQL connection string with credentials",
  },
  {
    id: "mongodb-url",
    name: "MongoDB URL",
    category: "database",
    regex: "mongodb(?:\\+srv)?:\\/\\/[^\\s:]+:[^\\s@]+@[^\\s]+",
    description: "MongoDB connection string with credentials",
  },

  // ============================================
  // Private Keys
  // ============================================
  {
    id: "private-rsa-key",
    name: "RSA Private Key",
    category: "keys",
    regex: "-----BEGIN RSA PRIVATE KEY-----",
    description: "RSA private key PEM block",
  },
  {
    id: "private-ec-key",
    name: "EC Private Key",
    category: "keys",
    regex: "-----BEGIN EC PRIVATE KEY-----",
    description: "Elliptic curve private key PEM block",
  },
  {
    id: "private-key-generic",
    name: "Generic Private Key",
    category: "keys",
    regex: "-----BEGIN PRIVATE KEY-----",
    description: "Generic private key PEM block",
  },

  // ============================================
  // API Keys & Tokens
  // ============================================
  {
    id: "github-pat",
    name: "GitHub Personal Token",
    category: "tokens",
    regex: "ghp_[A-Za-z0-9]{36}",
    description: "GitHub personal access token",
  },
  {
    id: "github-oauth",
    name: "GitHub OAuth Token",
    category: "tokens",
    regex: "gho_[A-Za-z0-9]{36}",
    description: "GitHub OAuth token",
  },
  {
    id: "slack-bot",
    name: "Slack Bot Token",
    category: "tokens",
    regex: "xoxb-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24}",
    description: "Slack bot token",
  },
  {
    id: "slack-user",
    name: "Slack User Token",
    category: "tokens",
    regex: "xoxp-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24}",
    description: "Slack user token",
  },
  {
    id: "stripe-secret",
    name: "Stripe Secret Key",
    category: "tokens",
    regex: "sk_live_[A-Za-z0-9]{24,}",
    description: "Stripe live secret key",
  },
  {
    id: "openai-key",
    name: "OpenAI API Key",
    category: "tokens",
    regex: "sk-[A-Za-z0-9]{32,}",
    description: "OpenAI API key",
  },
  {
    id: "anthropic-key",
    name: "Anthropic API Key",
    category: "tokens",
    regex: "sk-ant-[A-Za-z0-9-]{32,}",
    description: "Anthropic API key",
  },
  {
    id: "google-api-key",
    name: "Google API Key",
    category: "tokens",
    regex: "AIzaSy[A-Za-z0-9_-]{33}",
    description: "Google API key",
  },
  {
    id: "openrouter-key",
    name: "OpenRouter API Key",
    category: "tokens",
    regex: "sk-or-v1-[A-Za-z0-9]{64}",
    description: "OpenRouter API key",
  },
  {
    id: "jwt-token",
    name: "JWT Token",
    category: "tokens",
    regex: "eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}",
    description: "JSON Web Token",
  },

  // ============================================
  // Cloud Provider Keys
  // ============================================
  {
    id: "gcp-service-account",
    name: "GCP Service Account",
    category: "keys",
    regex: "\"type\":\\s*\"service_account\"",
    description: "Google Cloud service account JSON",
  },
  {
    id: "digitalocean-token",
    name: "DigitalOcean Token",
    category: "tokens",
    regex: "dop_v1_[a-f0-9]{64}",
    description: "DigitalOcean personal access token",
  },

  // ============================================
  // Payment & Financial
  // ============================================
  {
    id: "stripe-publishable",
    name: "Stripe Publishable Key",
    category: "tokens",
    regex: "pk_live_[A-Za-z0-9]{24,}",
    description: "Stripe live publishable key",
  },

  // ============================================
  // Communication & Messaging
  // ============================================
  {
    id: "twilio-api-key",
    name: "Twilio API Key",
    category: "tokens",
    regex: "SK[a-f0-9]{32}",
    description: "Twilio API key",
  },
  {
    id: "sendgrid-api-key",
    name: "SendGrid API Key",
    category: "tokens",
    regex: "SG\\.[A-Za-z0-9_-]{22}\\.[A-Za-z0-9_-]{43}",
    description: "SendGrid API key",
  },
  {
    id: "mailchimp-api-key",
    name: "Mailchimp API Key",
    category: "tokens",
    regex: "[a-f0-9]{32}-us[0-9]{1,2}",
    description: "Mailchimp API key",
  },
  {
    id: "discord-bot-token",
    name: "Discord Bot Token",
    category: "tokens",
    regex: "[MN][A-Za-z0-9]{23,}\\.[A-Za-z0-9_-]{6}\\.[A-Za-z0-9_-]{27}",
    description: "Discord bot token",
  },
  {
    id: "discord-webhook",
    name: "Discord Webhook URL",
    category: "tokens",
    regex: "https://discord(?:app)?\\.com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+",
    description: "Discord webhook URL",
  },
  {
    id: "telegram-bot-token",
    name: "Telegram Bot Token",
    category: "tokens",
    regex: "[0-9]{8,10}:[A-Za-z0-9_-]{35}",
    description: "Telegram bot token",
  },

  // ============================================
  // Developer Tools & CI/CD
  // ============================================
  {
    id: "npm-token",
    name: "NPM Token",
    category: "tokens",
    regex: "npm_[A-Za-z0-9]{36}",
    description: "NPM access token",
  },
  {
    id: "pypi-token",
    name: "PyPI Token",
    category: "tokens",
    regex: "pypi-[A-Za-z0-9_-]{50,}",
    description: "PyPI API token",
  },
  {
    id: "docker-hub-token",
    name: "Docker Hub Token",
    category: "tokens",
    regex: "dckr_pat_[A-Za-z0-9_-]{27}",
    description: "Docker Hub personal access token",
  },
  {
    id: "gitlab-token",
    name: "GitLab Token",
    category: "tokens",
    regex: "glpat-[A-Za-z0-9_-]{20}",
    description: "GitLab personal access token",
  },
  {
    id: "vercel-token",
    name: "Vercel Token",
    category: "tokens",
    regex: "vc_pat_[A-Za-z0-9]{24}",
    description: "Vercel personal access token",
  },
  {
    id: "supabase-key",
    name: "Supabase Service Key",
    category: "tokens",
    regex: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+",
    description: "Supabase service role key (JWT format)",
  },
  {
    id: "firebase-api-key",
    name: "Firebase API Key",
    category: "tokens",
    regex: "AIza[A-Za-z0-9_-]{35}",
    description: "Firebase API key",
  },

  // ============================================
  // Analytics & Monitoring
  // ============================================
  {
    id: "sentry-dsn",
    name: "Sentry DSN",
    category: "tokens",
    regex: "https://[a-f0-9]{32}@[a-z0-9]+\\.ingest\\.sentry\\.io/[0-9]+",
    description: "Sentry DSN URL",
  },
  {
    id: "datadog-api-key",
    name: "Datadog API Key",
    category: "tokens",
    regex: "dd[a-f0-9]{32}",
    description: "Datadog API key",
  },
  {
    id: "new-relic-key",
    name: "New Relic Key",
    category: "tokens",
    regex: "NRAK-[A-Z0-9]{27}",
    description: "New Relic API key",
  },

  // ============================================
  // AI & ML Services
  // ============================================
  {
    id: "huggingface-token",
    name: "Hugging Face Token",
    category: "tokens",
    regex: "hf_[A-Za-z0-9]{34}",
    description: "Hugging Face API token",
  },
  {
    id: "cohere-api-key",
    name: "Cohere API Key",
    category: "tokens",
    regex: "[A-Za-z0-9]{40}",
    description: "Cohere API key",
  },
  {
    id: "replicate-api-token",
    name: "Replicate API Token",
    category: "tokens",
    regex: "r8_[A-Za-z0-9]{37}",
    description: "Replicate API token",
  },

  // ============================================
  // Database Services
  // ============================================
  {
    id: "redis-url",
    name: "Redis URL",
    category: "database",
    regex: "redis(?:s)?:\\/\\/[^\\s:]*:[^\\s@]+@[^\\s]+",
    description: "Redis connection string with credentials",
  },
  {
    id: "planetscale-password",
    name: "PlanetScale Password",
    category: "database",
    regex: "pscale_pw_[A-Za-z0-9_-]{43}",
    description: "PlanetScale database password",
  },

  // ============================================
  // Environment Variables
  // ============================================
  {
    id: "env-secret",
    name: ".env Secret",
    category: "env",
    regex: "(?:PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY|DATABASE_URL|DB_PASSWORD|AUTH_SECRET)\\s*=\\s*['\"]?[^\\s'\"]{8,}['\"]?",
    description: "Environment variable with sensitive key name",
  },
  {
    id: "high-entropy-secret",
    name: "High-Entropy Secret",
    category: "env",
    regex: "(?:api_key|apikey|secret|password|token|auth)\\s*[=:]\\s*['\"]?[A-Za-z0-9+/]{32,}['\"]?",
    description: "Long random string after secret-like key name",
  },
];

/**
 * Get patterns grouped by category
 */
export function getPatternsByCategory(): Record<string, Pattern[]> {
  const grouped: Record<string, Pattern[]> = {};

  for (const pattern of BUILT_IN_PATTERNS) {
    const category = pattern.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category]!.push(pattern);
  }

  return grouped;
}

/**
 * Get category display names
 */
export const CATEGORY_NAMES: Record<string, string> = {
  aws: "AWS Credentials",
  database: "Database Connection Strings",
  keys: "Private Keys",
  tokens: "API Keys & Tokens",
  env: "Environment Variables",
};

/**
 * Get total pattern count
 */
export function getPatternCount(): number {
  return BUILT_IN_PATTERNS.length;
}
