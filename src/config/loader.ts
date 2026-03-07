/**
 * Configuration File Loader
 *
 * Handles discovery, loading, and parsing of configuration files.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  type AfterburnerConfig,
  CONFIG_FILE_NAMES,
  DEFAULT_CONFIG,
  validateConfig,
  mergeConfig,
} from './schema.js';

export interface ConfigLoadResult {
  config: AfterburnerConfig;
  configPath: string | null;
  errors: string[];
}

/**
 * Find configuration file by walking up the directory tree
 */
export function findConfigFile(startDir: string): string | null {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const configPath = path.join(currentDir, fileName);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }
    currentDir = path.dirname(currentDir);
  }

  // Check root directory
  for (const fileName of CONFIG_FILE_NAMES) {
    const configPath = path.join(root, fileName);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  return null;
}

/**
 * Load configuration from a specific file
 */
export async function loadConfigFile(configPath: string): Promise<{ config: unknown; error?: string }> {
  const ext = path.extname(configPath);
  const basename = path.basename(configPath);

  try {
    const content = fs.readFileSync(configPath, 'utf-8');

    // JSON files (.afterburnrc, .afterburnrc.json, afterburn.config.json)
    if (ext === '.json' || basename === '.afterburnrc') {
      try {
        const config = JSON.parse(content);
        return { config };
      } catch {
        return { config: null, error: `Invalid JSON in ${configPath}` };
      }
    }

    // JavaScript config files
    if (ext === '.js' || ext === '.mjs') {
      try {
        // Use dynamic import for JS files
        const fileUrl = `file://${configPath}`;
        const module = await import(fileUrl);
        return { config: module.default || module };
      } catch (err) {
        return { config: null, error: `Failed to load ${configPath}: ${err}` };
      }
    }

    return { config: null, error: `Unsupported config file format: ${ext}` };
  } catch (err) {
    return { config: null, error: `Failed to read ${configPath}: ${err}` };
  }
}

/**
 * Load configuration for a project
 *
 * 1. Finds config file by walking up directory tree
 * 2. Loads and parses the config
 * 3. Validates the config
 * 4. Merges with defaults
 */
export async function loadConfig(projectPath: string): Promise<ConfigLoadResult> {
  const errors: string[] = [];

  // Find config file
  const configPath = findConfigFile(projectPath);

  if (!configPath) {
    // No config file found, use defaults
    return {
      config: DEFAULT_CONFIG,
      configPath: null,
      errors: [],
    };
  }

  // Load config file
  const { config: rawConfig, error: loadError } = await loadConfigFile(configPath);

  if (loadError) {
    errors.push(loadError);
    return {
      config: DEFAULT_CONFIG,
      configPath,
      errors,
    };
  }

  // Validate config
  const { valid, errors: validationErrors } = validateConfig(rawConfig);

  if (!valid) {
    errors.push(...validationErrors.map(e => `${configPath}: ${e}`));
    return {
      config: DEFAULT_CONFIG,
      configPath,
      errors,
    };
  }

  // Merge with defaults
  const mergedConfig = mergeConfig(rawConfig as Partial<AfterburnerConfig>);

  return {
    config: mergedConfig,
    configPath,
    errors,
  };
}

/**
 * Get effective rule severity from config
 */
export function getRuleSeverity(
  config: AfterburnerConfig,
  ruleId: string,
  defaultSeverity: 'error' | 'warn' | 'info'
): 'error' | 'warn' | 'info' | 'off' {
  const ruleConfig = config.rules?.[ruleId];

  if (!ruleConfig) {
    return defaultSeverity;
  }

  if (typeof ruleConfig === 'string') {
    return ruleConfig;
  }

  return ruleConfig.severity;
}

/**
 * Check if a file should be ignored based on config
 */
export function shouldIgnoreFile(config: AfterburnerConfig, filePath: string): boolean {
  const ignorePatterns = config.ignore ?? [];
  const includePatterns = config.include ?? [];

  // Convert glob patterns to regex
  const toRegex = (pattern: string): RegExp => {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/\{\{GLOBSTAR\}\}/g, '.*');
    return new RegExp(`^${escaped}$`);
  };

  // Check include patterns first (if specified)
  if (includePatterns.length > 0) {
    const included = includePatterns.some(pattern => toRegex(pattern).test(filePath));
    if (!included) {
      return true; // Not in include list, ignore
    }
  }

  // Check ignore patterns
  return ignorePatterns.some(pattern => toRegex(pattern).test(filePath));
}

/**
 * Write configuration to file
 */
export function writeConfigFile(configPath: string, config: Partial<AfterburnerConfig>): void {
  const ext = path.extname(configPath);

  if (ext === '.js' || ext === '.mjs') {
    const content = `/** @type {import('afterburn').AfterburnerConfig} */
export default ${JSON.stringify(config, null, 2)};
`;
    fs.writeFileSync(configPath, content, 'utf-8');
  } else {
    // JSON format
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}

/**
 * Update a specific config value using dot notation
 */
export function setConfigValue(
  config: AfterburnerConfig,
  key: string,
  value: unknown
): AfterburnerConfig {
  const keys = key.split('.');
  const result = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;

  let current = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in current) || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;

  return result as unknown as AfterburnerConfig;
}

/**
 * Get a specific config value using dot notation
 */
export function getConfigValue(config: AfterburnerConfig, key: string): unknown {
  const keys = key.split('.');
  let current: unknown = config;

  for (const k of keys) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[k];
  }

  return current;
}
