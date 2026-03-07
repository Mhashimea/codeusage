/**
 * Rule engine module - static analysis for AI-specific patterns
 */

import type { RiskFinding, Severity } from '../types.js';
import { ab001HardcodedCredentials } from './ab001-credentials.js';
import { ab002ErrorSwallowing } from './ab002-error-swallowing.js';
import { ab003TypeAssertions } from './ab003-type-assertions.js';
import { ab006HardcodedConfig } from './ab006-hardcoded-config.js';

export interface Rule {
  id: string;
  name: string;
  description: string;
  defaultSeverity: Severity;
  /** File extensions this rule applies to (e.g., ['.ts', '.js']) */
  appliesTo?: string[];
  /** Check file content and return findings */
  check: (content: string, filePath: string) => RiskFinding[];
}

export interface RuleRunnerOptions {
  /** List of rule IDs to enable (default: all) */
  enabledRules?: string[];
  /** File patterns to ignore */
  ignorePatterns?: string[];
  /** Override severity levels */
  severityOverrides?: Record<string, Severity>;
}

// Rule IDs as defined in PRD
export const RULE_IDS = {
  AB001: 'AB001',
  AB002: 'AB002',
  AB003: 'AB003',
  AB004: 'AB004',
  AB005: 'AB005',
  AB006: 'AB006',
  AB007: 'AB007',
  AB008: 'AB008',
  AB009: 'AB009',
  AB010: 'AB010',
} as const;

// All available rules
const ALL_RULES: Rule[] = [
  ab001HardcodedCredentials,
  ab002ErrorSwallowing,
  ab003TypeAssertions,
  ab006HardcodedConfig,
];

/**
 * RuleRunner - executes rules against file content
 */
export class RuleRunner {
  private rules: Rule[];
  private ignorePatterns: RegExp[];
  private severityOverrides: Record<string, Severity>;

  constructor(options: RuleRunnerOptions = {}) {
    const enabledRuleIds = options.enabledRules ?? ALL_RULES.map(r => r.id);
    this.rules = ALL_RULES.filter(r => enabledRuleIds.includes(r.id));
    this.ignorePatterns = (options.ignorePatterns ?? []).map(p => this.patternToRegex(p));
    this.severityOverrides = options.severityOverrides ?? {};
  }

  /**
   * Convert glob-like pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(escaped);
  }

  /**
   * Check if a file should be ignored
   */
  private shouldIgnore(filePath: string): boolean {
    // Always ignore common non-source files
    const defaultIgnores = [
      /node_modules\//,
      /\.git\//,
      /dist\//,
      /build\//,
      /coverage\//,
      /\.min\.js$/,
      /\.bundle\.js$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /pnpm-lock\.yaml$/,
    ];

    for (const pattern of [...defaultIgnores, ...this.ignorePatterns]) {
      if (pattern.test(filePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a rule applies to a file based on extension
   */
  private ruleAppliesToFile(rule: Rule, filePath: string): boolean {
    if (!rule.appliesTo || rule.appliesTo.length === 0) {
      return true; // Rule applies to all files
    }

    const ext = filePath.substring(filePath.lastIndexOf('.'));
    return rule.appliesTo.includes(ext);
  }

  /**
   * Run all enabled rules against file content
   */
  run(content: string, filePath: string): RiskFinding[] {
    if (this.shouldIgnore(filePath)) {
      return [];
    }

    const findings: RiskFinding[] = [];

    for (const rule of this.rules) {
      if (!this.ruleAppliesToFile(rule, filePath)) {
        continue;
      }

      try {
        const ruleFindings = rule.check(content, filePath);

        // Apply severity overrides
        for (const finding of ruleFindings) {
          if (this.severityOverrides[rule.id]) {
            finding.severity = this.severityOverrides[rule.id];
          }
          findings.push(finding);
        }
      } catch (error) {
        // Rule execution failed, skip this rule
        console.warn(`Rule ${rule.id} failed on ${filePath}:`, error);
      }
    }

    return findings;
  }

  /**
   * Run rules against multiple files
   */
  runOnFiles(files: Array<{ path: string; content: string }>): RiskFinding[] {
    const allFindings: RiskFinding[] = [];

    for (const file of files) {
      const findings = this.run(file.content, file.path);
      allFindings.push(...findings);
    }

    return this.aggregateFindings(allFindings);
  }

  /**
   * Aggregate and sort findings by severity
   */
  private aggregateFindings(findings: RiskFinding[]): RiskFinding[] {
    const severityOrder: Record<Severity, number> = {
      error: 0,
      warn: 1,
      info: 2,
    };

    return findings.sort((a, b) => {
      // Sort by severity first
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Then by file
      const fileDiff = a.file.localeCompare(b.file);
      if (fileDiff !== 0) return fileDiff;

      // Then by line number
      return a.line - b.line;
    });
  }

  /**
   * Get summary statistics for findings
   */
  static summarize(findings: RiskFinding[]): { errors: number; warnings: number; info: number } {
    return {
      errors: findings.filter(f => f.severity === 'error').length,
      warnings: findings.filter(f => f.severity === 'warn').length,
      info: findings.filter(f => f.severity === 'info').length,
    };
  }
}

/**
 * Legacy function for compatibility - use RuleRunner instead
 */
export function runRules(
  content: string,
  filePath: string,
  enabledRules?: string[]
): RiskFinding[] {
  const runner = new RuleRunner({ enabledRules });
  return runner.run(content, filePath);
}

// Re-export rules for direct access
export { ab001HardcodedCredentials } from './ab001-credentials.js';
export { ab002ErrorSwallowing } from './ab002-error-swallowing.js';
export { ab003TypeAssertions } from './ab003-type-assertions.js';
export { ab006HardcodedConfig } from './ab006-hardcoded-config.js';
