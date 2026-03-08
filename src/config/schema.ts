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
 * Custom rule definition for user-defined rules
 */
export interface CustomRuleDefinition {
  /**
   * Rule ID (must start with "CUSTOM-")
   */
  id: string;

  /**
   * Human-readable rule name
   */
  name: string;

  /**
   * Description of what this rule checks
   */
  description: string;

  /**
   * Severity level
   */
  severity: Severity;

  /**
   * Regex pattern to match (string format, will be compiled)
   */
  pattern: string;

  /**
   * Regex flags (e.g., "gi" for global case-insensitive)
   */
  flags?: string;

  /**
   * Message to display when pattern is found
   */
  message: string;

  /**
   * Optional suggestion for fixing the issue
   */
  suggestion?: string;

  /**
   * File extensions this rule applies to (e.g., [".ts", ".js"])
   * If not specified, applies to all files
   */
  appliesTo?: string[];
}

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

  /**
   * Custom rules defined by the user
   */
  customRules?: CustomRuleDefinition[];
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
        errors.push(`Invalid output format: ${output.format}. Use "markdown" or "json"`);
      }
    }
  }

  // Validate LLM config
  if (cfg.llm !== undefined) {
    if (typeof cfg.llm !== 'object' || cfg.llm === null) {
      errors.push('llm must be an object');
    } else {
      const llm = cfg.llm as Record<string, unknown>;
      const validProviders = ['anthropic', 'openai', 'openrouter', 'ollama'];
      if (llm.provider && !validProviders.includes(llm.provider as string)) {
        errors.push(`Invalid LLM provider: ${llm.provider}. Use one of: ${validProviders.join(', ')}`);
      }
    }
  }

  // Validate custom rules
  if (cfg.customRules !== undefined) {
    if (!Array.isArray(cfg.customRules)) {
      errors.push('customRules must be an array');
    } else {
      for (let i = 0; i < cfg.customRules.length; i++) {
        const rule = cfg.customRules[i] as Record<string, unknown>;

        if (!rule.id || typeof rule.id !== 'string') {
          errors.push(`customRules[${i}]: id is required and must be a string`);
        } else if (!rule.id.startsWith('CUSTOM-')) {
          errors.push(`customRules[${i}]: id must start with "CUSTOM-" (got: ${rule.id})`);
        }

        if (!rule.name || typeof rule.name !== 'string') {
          errors.push(`customRules[${i}]: name is required and must be a string`);
        }

        if (!rule.pattern || typeof rule.pattern !== 'string') {
          errors.push(`customRules[${i}]: pattern is required and must be a regex string`);
        } else {
          // Test if pattern is valid regex
          try {
            new RegExp(rule.pattern as string, (rule.flags as string) || 'g');
          } catch (e) {
            errors.push(`customRules[${i}]: invalid regex pattern: ${(e as Error).message}`);
          }
        }

        if (!rule.message || typeof rule.message !== 'string') {
          errors.push(`customRules[${i}]: message is required and must be a string`);
        }

        if (rule.severity && !['error', 'warn', 'info'].includes(rule.severity as string)) {
          errors.push(`customRules[${i}]: invalid severity: ${rule.severity}`);
        }

        if (rule.appliesTo !== undefined) {
          if (!Array.isArray(rule.appliesTo)) {
            errors.push(`customRules[${i}]: appliesTo must be an array of file extensions`);
          } else if (!rule.appliesTo.every((ext: unknown) => typeof ext === 'string' && ext.startsWith('.'))) {
            errors.push(`customRules[${i}]: appliesTo must contain file extensions starting with "."`);
          }
        }
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
    customRules: userConfig.customRules,
  };
}
