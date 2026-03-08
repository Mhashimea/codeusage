/**
 * Core type definitions for Afterburn
 */

export type Severity = 'error' | 'warn' | 'info';

export interface RuleConfig {
  hardcodedCredentials: Severity;
  missingErrorHandling: Severity;
  duplicateLogic: Severity;
  hallucinatedPackages: Severity;
  optimisticTypes: Severity;
}

// Import and re-export LLMConfig from llm module
import type { LLMConfig as LLMConfigType } from './llm/types.js';
export type LLMConfig = LLMConfigType;

export interface AfterBurnConfig {
  language: 'auto' | 'typescript' | 'javascript' | 'python';
  sessionWindow: string;
  rules: RuleConfig;
  ignore: string[];
  llm?: LLMConfigType;
}

export interface RiskFinding {
  ruleId: string;
  severity: Severity;
  file: string;
  line: number;
  column?: number;
  message: string;
  snippet?: string;
  suggestion?: string;
}

export interface DependencyInfo {
  name: string;
  version?: string;
  status: 'verified' | 'warning' | 'hallucinated' | 'unknown';
  weeklyDownloads?: number;
  lastUpdated?: string;
  message?: string;
}

export interface FileChange {
  path: string;
  category: 'new-feature' | 'refactor' | 'bugfix' | 'config' | 'test' | 'docs' | 'unknown';
  linesAdded: number;
  linesRemoved: number;
  complexityDelta?: number;
}

export interface SessionStats {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  newDependencies: number;
  sessionDuration?: string;
}

export interface AnalysisResult {
  timestamp: Date;
  stats: SessionStats;
  risks: RiskFinding[];
  dependencies: DependencyInfo[];
  fileChanges: FileChange[];
  llmSummary?: string;
  architectureDecisions?: string[];
  intentChangelog?: string[];
}
