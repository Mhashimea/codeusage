/**
 * Configuration Module
 *
 * Handles loading, parsing, and managing afterburn configuration.
 */

export {
  type AfterburnerConfig,
  type RuleConfig,
  type CustomRuleDefinition,
  DEFAULT_CONFIG,
  CONFIG_FILE_NAMES,
  validateConfig,
  mergeConfig,
} from './schema.js';

export {
  type ConfigLoadResult,
  findConfigFile,
  loadConfigFile,
  loadConfig,
  getRuleSeverity,
  shouldIgnoreFile,
  writeConfigFile,
  setConfigValue,
  getConfigValue,
} from './loader.js';

export {
  parseInlineDirectives,
  shouldDisableLine,
  type InlineDirective,
} from './inline-directives.js';
