/**
 * Afterburn Configuration Schema
 *
 * Defines the structure and defaults for .afterburnrc configuration files.
 */

import type { Severity } from '../types.js';

/**
 * Rule configuration - can be severity level or detailed config
 */
export type RuleConfig = Severity | 'off' | {
  severity: Severity | 'off';
  options?: Record<string, unknown>;
};

/**
 * Main configuration interface
 */
export interface AfterburnerConfig {
  /**
   * Rules configuration
   * Key is rule ID (e.g., "AB001"), value is severity or config object
   */
  rules?: Record<string, RuleConfig>;

  /**
   * File patterns to ignore (glob patterns)
   */
  ignore?: string[];

  /**
   * File patterns to include (glob patterns)
   * If specified, only matching files are analyzed
   */
  include?: string[];

  /**
   * Session configuration
   */
  session?: {
    /**
     * Default time window for session detection
     */
    window?: string;

    /**
     * Output directory for reports
     */
    outputDir?: string;
  };

  /**
   * Output configuration
   */
  output?: {
    /**
     * Default output format
     */
    format?: 'markdown' | 'json';

    /**
     * Include AI provider info in reports
     */
    includeAIProvider?: boolean;
  };

  /**
   * LLM configuration (for --explain feature)
   */
  llm?: {
    /**
     * LLM provider
     */
    provider?: string;

    /**
     * Model to use
     */
    model?: string;

    /**
     * API key (use "env:VARIABLE_NAME" to read from environment)
     */
    apiKey?: string;
  };

  /**
   * CI configuration
   */
  ci?: {
    /**
     * Fail on warnings in CI mode
     */
    failOnWarnings?: boolean;

    /**
     * Maximum allowed errors before failing
     */
    maxErrors?: number;

    /**
     * Maximum allowed warnings before failing (if failOnWarnings is true)
     */
    maxWarnings?: number;
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: AfterburnerConfig = {
  rules: {},
  ignore: [
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '.git/**',
    '*.min.js',
    '*.bundle.js',
  ],
  include: [],
  session: {
    window: '4h',
    outputDir: '.afterburn',
  },
  output: {
    format: 'markdown',
    includeAIProvider: true,
  },
  ci: {
    failOnWarnings: false,
    maxErrors: 0,
    maxWarnings: 0,
  },
};

/**
 * Supported config file names (in order of precedence)
 */
export const CONFIG_FILE_NAMES = [
  '.afterburnrc',
  '.afterburnrc.json',
  'afterburn.config.json',
  'afterburn.config.js',
  'afterburn.config.mjs',
];

/**
 * Validate configuration object
 */
export function validateConfig(config: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof config !== 'object' || config === null) {
    return { valid: false, errors: ['Configuration must be an object'] };
  }

  const cfg = config as Record<string, unknown>;

  // Validate rules
  if (cfg.rules !== undefined) {
    if (typeof cfg.rules !== 'object' || cfg.rules === null) {
      errors.push('rules must be an object');
    } else {
      const rules = cfg.rules as Record<string, unknown>;
      for (const [ruleId, ruleConfig] of Object.entries(rules)) {
        if (!ruleId.match(/^AB\d{3}$/)) {
          errors.push(`Invalid rule ID: ${ruleId}. Must be in format AB001-AB999`);
        }
        if (typeof ruleConfig === 'string') {
          if (!['error', 'warn', 'info', 'off'].includes(ruleConfig)) {
            errors.push(`Invalid severity for ${ruleId}: ${ruleConfig}`);
          }
        } else if (typeof ruleConfig === 'object' && ruleConfig !== null) {
          const rc = ruleConfig as Record<string, unknown>;
          if (rc.severity && !['error', 'warn', 'info', 'off'].includes(rc.severity as string)) {
            errors.push(`Invalid severity for ${ruleId}: ${rc.severity}`);
          }
        } else {
          errors.push(`Invalid config for ${ruleId}: must be string or object`);
        }
      }
    }
  }

  // Validate ignore patterns
  if (cfg.ignore !== undefined) {
    if (!Array.isArray(cfg.ignore)) {
      errors.push('ignore must be an array of strings');
    } else if (!cfg.ignore.every((p: unknown) => typeof p === 'string')) {
      errors.push('ignore patterns must be strings');
    }
  }

  // Validate include patterns
  if (cfg.include !== undefined) {
    if (!Array.isArray(cfg.include)) {
      errors.push('include must be an array of strings');
    } else if (!cfg.include.every((p: unknown) => typeof p === 'string')) {
      errors.push('include patterns must be strings');
    }
  }

  // Validate session config
  if (cfg.session !== undefined) {
    if (typeof cfg.session !== 'object' || cfg.session === null) {
      errors.push('session must be an object');
    }
  }

  // Validate output config
  if (cfg.output !== undefined) {
    if (typeof cfg.output !== 'object' || cfg.output === null) {
      errors.push('output must be an object');
    } else {
      const output = cfg.output as Record<string, unknown>;
      if (output.format && !['markdown', 'json'].includes(output.format as string)) {
        errors.push(`Invalid output format: ${output.format}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Merge user config with defaults
 */
export function mergeConfig(userConfig: Partial<AfterburnerConfig>): AfterburnerConfig {
  return {
    rules: { ...DEFAULT_CONFIG.rules, ...userConfig.rules },
    ignore: userConfig.ignore ?? DEFAULT_CONFIG.ignore,
    include: userConfig.include ?? DEFAULT_CONFIG.include,
    session: { ...DEFAULT_CONFIG.session, ...userConfig.session },
    output: { ...DEFAULT_CONFIG.output, ...userConfig.output },
    llm: userConfig.llm,
    ci: { ...DEFAULT_CONFIG.ci, ...userConfig.ci },
  };
}
