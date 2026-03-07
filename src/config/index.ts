/**
 * Configuration module - loads and validates .afterburnrc
 */

import type { AfterBurnConfig } from '../types.js';

export const DEFAULT_CONFIG: AfterBurnConfig = {
  language: 'auto',
  sessionWindow: '4h',
  rules: {
    hardcodedCredentials: 'error',
    missingErrorHandling: 'warn',
    duplicateLogic: 'warn',
    hallucinatedPackages: 'error',
    optimisticTypes: 'info',
  },
  ignore: ['*.test.ts', '*.spec.js', 'node_modules/**'],
};

export function loadConfig(projectPath: string): AfterBurnConfig {
  // TODO: Implement config loading
  // - Look for .afterburnrc in projectPath
  // - Merge with defaults
  // - Resolve env: prefixed values for API keys
  void projectPath;
  return DEFAULT_CONFIG;
}

export function initConfig(projectPath: string): void {
  // TODO: Create .afterburnrc file with defaults
  void projectPath;
  throw new Error('Not implemented');
}
