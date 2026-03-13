/**
 * Rule engine module - static analysis for AI-specific patterns
 */

import type { RiskFinding, Severity } from '../types.js';
import type { CustomRuleDefinition } from '../config/index.js';
import { ab001HardcodedCredentials } from './ab001-credentials.js';
import { ab002ErrorSwallowing } from './ab002-error-swallowing.js';
import { ab003TypeAssertions } from './ab003-type-assertions.js';
import { ab004DuplicateLogic } from './ab004-duplicate-logic.js';
import { ab005NullChecks } from './ab005-null-checks.js';
import { ab006HardcodedConfig } from './ab006-hardcoded-config.js';
import { ab007Security } from './ab007-security.js';
import { ab008OverAbstraction } from './ab008-over-abstraction.js';
import { ab009Timeouts } from './ab009-timeouts.js';
import { ab010AiTodos } from './ab010-ai-todos.js';
import { runPythonRules } from './python/index.js';
import { createAstContext, resetAstContext, type AstContext } from '../parser/context.js';

export interface Rule {
  id: string;
  name: string;
  description: string;
  defaultSeverity: Severity;
  /** File extensions this rule applies to (e.g., ['.ts', '.js']) */
  appliesTo?: string[];
  /** Check file content and return findings (sync) */
  check: (content: string, filePath: string) => RiskFinding[];
  /** Optional AST-aware check (async, for improved accuracy) */
  checkWithAst?: (content: string, filePath: string, ast: AstContext) => RiskFinding[];
}

export interface RuleRunnerOptions {
  /** List of rule IDs to enable (default: all) */
  enabledRules?: string[];
  /** File patterns to ignore */
  ignorePatterns?: string[];
  /** Override severity levels */
  severityOverrides?: Record<string, Severity>;
  /** Enable AST-based analysis for improved accuracy */
  useAst?: boolean;
  /** Custom rules from configuration */
  customRules?: CustomRuleDefinition[];
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

// All available built-in rules
const ALL_RULES: Rule[] = [
  ab001HardcodedCredentials,
  ab002ErrorSwallowing,
  ab003TypeAssertions,
  ab004DuplicateLogic,
  ab005NullChecks,
  ab006HardcodedConfig,
  ab007Security,
  ab008OverAbstraction,
  ab009Timeouts,
  ab010AiTodos,
];

/**
 * Convert a custom rule definition to a Rule object
 */
function createCustomRule(def: CustomRuleDefinition): Rule {
  const pattern = new RegExp(def.pattern, def.flags || 'g');

  return {
    id: def.id,
    name: def.name,
    description: def.description,
    defaultSeverity: def.severity,
    appliesTo: def.appliesTo,
    check(content: string, filePath: string): RiskFinding[] {
      const findings: RiskFinding[] = [];
      const lines = content.split('\n');

      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNum = beforeMatch.split('\n').length;
        const line = lines[lineNum - 1] || '';

        findings.push({
          ruleId: def.id,
          severity: def.severity,
          file: filePath,
          line: lineNum,
          message: def.message,
          snippet: line.trim().substring(0, 80) + (line.length > 80 ? '...' : ''),
          suggestion: def.suggestion,
        });
      }

      return findings;
    },
  };
}

/**
 * RuleRunner - executes rules against file content
 */
export class RuleRunner {
  private rules: Rule[];
  private ignorePatterns: RegExp[];
  private severityOverrides: Record<string, Severity>;
  private useAst: boolean;
  // Pre-computed rule cache by file extension for fast lookup
  private rulesByExtension: Map<string, Rule[]>;
  private universalRules: Rule[]; // Rules that apply to all files

  constructor(options: RuleRunnerOptions = {}) {
    const enabledRuleIds = options.enabledRules ?? ALL_RULES.map(r => r.id);
    this.rules = ALL_RULES.filter(r => enabledRuleIds.includes(r.id));

    // Add custom rules
    if (options.customRules && options.customRules.length > 0) {
      for (const customDef of options.customRules) {
        try {
          const customRule = createCustomRule(customDef);
          this.rules.push(customRule);
        } catch (error) {
          console.warn(`Failed to create custom rule ${customDef.id}:`, error);
        }
      }
    }

    this.ignorePatterns = (options.ignorePatterns ?? []).map(p => this.patternToRegex(p));
    this.severityOverrides = options.severityOverrides ?? {};
    this.useAst = options.useAst ?? false;

    // Pre-compute rule applicability by extension
    this.rulesByExtension = new Map();
    this.universalRules = [];

    for (const rule of this.rules) {
      if (!rule.appliesTo || rule.appliesTo.length === 0) {
        this.universalRules.push(rule);
      } else {
        for (const ext of rule.appliesTo) {
          const existing = this.rulesByExtension.get(ext) ?? [];
          existing.push(rule);
          this.rulesByExtension.set(ext, existing);
        }
      }
    }
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
      // Ignore afterburn's own rule files (they contain pattern definitions that trigger false positives)
      /[\/\\]?src[\/\\]rules[\/\\]ab\d{3}-.*\.ts$/,
      /[\/\\]?src[\/\\]rules[\/\\]index\.ts$/,
    ];

    for (const pattern of [...defaultIgnores, ...this.ignorePatterns]) {
      if (pattern.test(filePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get applicable rules for a file (uses pre-computed cache)
   */
  private getApplicableRules(filePath: string): Rule[] {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    const extensionRules = this.rulesByExtension.get(ext) ?? [];
    return [...this.universalRules, ...extensionRules];
  }

  /**
   * Run all enabled rules against file content
   */
  run(content: string, filePath: string): RiskFinding[] {
    if (this.shouldIgnore(filePath)) {
      return [];
    }

    const findings: RiskFinding[] = [];

    // Use pre-computed applicable rules for this file extension
    const applicableRules = this.getApplicableRules(filePath);

    for (const rule of applicableRules) {
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

    // Run Python-specific rules for Python files
    if (filePath.endsWith('.py') || filePath.endsWith('.pyw')) {
      try {
        const pythonFindings = runPythonRules(content, filePath);
        for (const finding of pythonFindings) {
          if (this.severityOverrides[finding.ruleId]) {
            finding.severity = this.severityOverrides[finding.ruleId];
          }
          findings.push(finding);
        }
      } catch (error) {
        console.warn(`Python rules failed on ${filePath}:`, error);
      }
    }

    // Sort findings by severity
    return this.aggregateFindings(findings);
  }

  /**
   * Run all enabled rules with AST support for improved accuracy
   */
  async runWithAst(content: string, filePath: string): Promise<RiskFinding[]> {
    if (this.shouldIgnore(filePath)) {
      return [];
    }

    // Create AST context for this file
    let astContext: AstContext | null = null;
    if (this.useAst) {
      try {
        astContext = await createAstContext(filePath, content);
      } catch (error) {
        // AST parsing failed, will fall back to regex-only analysis
        console.warn(`AST parsing failed for ${filePath}:`, error);
      }
    }

    const findings: RiskFinding[] = [];

    // Use pre-computed applicable rules for this file extension
    const applicableRules = this.getApplicableRules(filePath);

    for (const rule of applicableRules) {
      try {
        let ruleFindings: RiskFinding[];

        // Use AST-aware check if available and AST was parsed
        if (astContext && rule.checkWithAst) {
          ruleFindings = rule.checkWithAst(content, filePath, astContext);
        } else {
          ruleFindings = rule.check(content, filePath);
        }

        // If we have AST, filter out findings in comments
        if (astContext) {
          ruleFindings = ruleFindings.filter(finding => {
            // Keep finding if line is not in a comment
            return !astContext!.isLineInComment(finding.line);
          });
        }

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

    // Run Python-specific rules for Python files
    if (filePath.endsWith('.py') || filePath.endsWith('.pyw')) {
      try {
        const pythonFindings = runPythonRules(content, filePath);
        for (const finding of pythonFindings) {
          if (this.severityOverrides[finding.ruleId]) {
            finding.severity = this.severityOverrides[finding.ruleId];
          }
          // Filter out findings in comments if AST is available
          if (astContext && astContext.isLineInComment(finding.line)) {
            continue;
          }
          findings.push(finding);
        }
      } catch (error) {
        console.warn(`Python rules failed on ${filePath}:`, error);
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
   * Run rules against multiple files with AST support
   */
  async runOnFilesWithAst(files: Array<{ path: string; content: string }>): Promise<RiskFinding[]> {
    const allFindings: RiskFinding[] = [];

    // Reset AST cache before batch processing
    resetAstContext();

    for (const file of files) {
      const findings = await this.runWithAst(file.content, file.path);
      allFindings.push(...findings);
    }

    // Clear AST cache after batch processing
    resetAstContext();

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
export { ab004DuplicateLogic } from './ab004-duplicate-logic.js';
export { ab005NullChecks } from './ab005-null-checks.js';
export { ab006HardcodedConfig } from './ab006-hardcoded-config.js';
export { ab007Security } from './ab007-security.js';
export { ab008OverAbstraction } from './ab008-over-abstraction.js';
export { ab009Timeouts } from './ab009-timeouts.js';
export { ab010AiTodos } from './ab010-ai-todos.js';

// Re-export AST context for rules that want to use it
export type { AstContext } from '../parser/context.js';
