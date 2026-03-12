#!/usr/bin/env node
/**
 * Afterburn CLI - Post-Session Intelligence for AI-Assisted Coding
 *
 * Usage:
 *   afterburn ./                        # Full analysis, current directory
 *   afterburn ./ --explain              # Include LLM-powered explanations
 *   afterburn ./ --since="2 hours ago"  # Scope to recent session
 *   afterburn ./ --output ./docs/       # Custom output path
 *   afterburn ./ --json                 # Machine-readable output
 *   afterburn ./ --ci                   # CI mode (exit code based on risk)
 *   afterburn init                      # Create .afterburnrc config file
 *   afterburn config set <key> <value>  # Set configuration value
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';
import { getSessionDiff, isGitRepo, getFileContent, type GitDiff } from './git/index.js';
import { formatDuration } from './utils/timespec.js';
import { generateMarkdownReport, readSessionActions, clearSessionActions, readActionsFromTranscript, getLastCommitHash, saveLastCommitHash, getLastReportedFiles, saveLastReportedFiles } from './reporter/index.js';
import { RuleRunner } from './rules/index.js';
import { runDependencyAudit, type DependencyAuditResult } from './registry/index.js';
import { detectAIProvider } from './ai-provider.js';
import {
  loadConfig,
  findConfigFile,
  writeConfigFile,
  setConfigValue,
  getConfigValue,
  DEFAULT_CONFIG,
  type AfterburnerConfig,
} from './config/index.js';
import type { RiskFinding } from './types.js';
import {
  analyzeWithLLM,
  resolveApiKey,
  formatCost,
  estimateTokenCount,
  estimateCost,
  type LLMConfig,
  type LLMAnalysisResult,
} from './llm/index.js';
import * as readline from 'readline';
import chokidar from 'chokidar';
import { startStudio } from './studio/server.js';
import { select, input, confirm as inquirerConfirm } from '@inquirer/prompts';

/**
 * Convert glob-like pattern to regex
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<<GLOBSTAR>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<GLOBSTAR>>>/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

/**
 * Filter files based on ignore patterns
 */
function filterIgnoredFiles<T extends { path: string }>(files: T[], ignorePatterns: string[] = []): T[] {
  if (ignorePatterns.length === 0) {
    return files;
  }

  const patterns = ignorePatterns.map(p => patternToRegex(p));

  return files.filter(file => {
    for (const pattern of patterns) {
      if (pattern.test(file.path)) {
        return false; // File matches ignore pattern, filter it out
      }
    }
    return true; // File doesn't match any ignore pattern, keep it
  });
}

/**
 * Format LLM error with helpful suggestions
 */
function formatLLMError(error: unknown): { message: string; suggestion?: string } {
  if (error && typeof error === 'object' && 'code' in error) {
    const llmError = error as { code: string; message: string };

    switch (llmError.code) {
      case 'NETWORK_ERROR':
        return {
          message: 'Network connection failed',
          suggestion: 'Check your internet connection and try again',
        };
      case 'TIMEOUT':
        return {
          message: 'Request timed out',
          suggestion: 'The LLM service is slow. Try again or use a faster model',
        };
      case 'RATE_LIMITED':
        return {
          message: 'Rate limit exceeded',
          suggestion: 'Wait a moment and try again, or check your API quota',
        };
      case 'INVALID_API_KEY':
        return {
          message: 'Invalid API key',
          suggestion: 'Check your API key in .afterburnrc or environment variables',
        };
      case 'INSUFFICIENT_QUOTA':
        return {
          message: 'API quota exceeded',
          suggestion: 'Check your billing/quota at your LLM provider dashboard',
        };
      case 'MODEL_NOT_FOUND':
        return {
          message: 'Model not found',
          suggestion: 'Check the model name in your configuration',
        };
      case 'CONTEXT_LENGTH_EXCEEDED':
        return {
          message: 'Input too long for model',
          suggestion: 'Try a shorter time window or more ignore patterns',
        };
      default:
        return {
          message: llmError.message || 'Unknown LLM error',
        };
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Check for common network errors
    if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
      return {
        message: 'Network connection failed',
        suggestion: 'Check your internet connection and try again',
      };
    }
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return {
        message: 'Request timed out',
        suggestion: 'The LLM service is slow. Try again later',
      };
    }
    return { message: error.message };
  }

  return { message: 'Unknown error occurred' };
}

interface AnalyzeOptions {
  explain?: boolean;
  yes?: boolean;  // Auto-confirm LLM cost
  since?: string;
  output?: string;
  json?: boolean;
  ci?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  noColor?: boolean;
  failOnWarnings?: boolean;
  maxErrors?: number;
  stagedOnly?: boolean;
  sync?: boolean;  // Sync report to dashboard
  transcript?: string;  // Path to Claude Code transcript file
}

/**
 * Sync report to dashboard
 */
async function syncToDashboard(
  reportData: {
    projectName: string;
    sessionDuration: number;
    analyzedAt: Date;
    since: string;
    filesChanged: number;
    linesAdded: number;
    linesRemoved: number;
    commitCount: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    verifiedDeps: number;
    warningDeps: number;
    hallucinatedDeps: number;
    aiProvider?: string;
    llmSummary?: string;
    llmChangelog?: string;
    llmAdr?: string;
    llmTokens?: number;
    llmCost?: number;
    llmModel?: string;
    fullReport: unknown;
  },
  config: { dashboardUrl?: string; licenseKey?: string }
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  const dashboardUrl = config.dashboardUrl ?? 'https://afterburn.dev';
  const licenseKey = config.licenseKey ?? process.env.AFTERBURN_LICENSE_KEY;

  if (!licenseKey) {
    return {
      success: false,
      error: 'No license key configured. Set AFTERBURN_LICENSE_KEY or add licenseKey to .afterburnrc',
    };
  }

  try {
    const response = await fetch(`${dashboardUrl}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-License-Key': licenseKey,
      },
      body: JSON.stringify(reportData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
      return {
        success: false,
        error: errorData.error ?? `HTTP ${response.status}`,
      };
    }

    const result = await response.json() as { reportId?: string };
    return {
      success: true,
      reportId: result.reportId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Prompt user for confirmation
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Detect if running in a CI environment
 */
function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS ||
    process.env.JENKINS_URL ||
    process.env.BUILDKITE ||
    process.env.TF_BUILD  // Azure Pipelines
  );
}

const program = new Command();

program
  .name('afterburn')
  .description('Post-session intelligence for AI-assisted coding')
  .version('0.2.0');

/**
 * Display risk findings in terminal
 */
function displayRiskFindings(findings: RiskFinding[]): void {
  const errors = findings.filter(f => f.severity === 'error');
  const warnings = findings.filter(f => f.severity === 'warn');
  const infos = findings.filter(f => f.severity === 'info');

  if (findings.length === 0) {
    console.log(chalk.green('  ✅ No issues detected'));
    return;
  }

  // Display errors first
  for (const finding of errors) {
    console.log(`  ${chalk.red('❌')} ${chalk.red(finding.message)}`);
    console.log(chalk.gray(`     ${finding.file}:${finding.line}`));
    if (finding.snippet) {
      console.log(chalk.gray(`     ${finding.snippet}`));
    }
  }

  // Then warnings
  for (const finding of warnings) {
    console.log(`  ${chalk.yellow('⚠️')} ${chalk.yellow(finding.message)}`);
    console.log(chalk.gray(`     ${finding.file}:${finding.line}`));
    if (finding.snippet) {
      console.log(chalk.gray(`     ${finding.snippet}`));
    }
  }

  // Then info
  for (const finding of infos) {
    console.log(`  ${chalk.blue('ℹ️')} ${chalk.blue(finding.message)}`);
    console.log(chalk.gray(`     ${finding.file}:${finding.line}`));
  }

  // Summary
  console.log();
  console.log(`  ${chalk.bold('Summary:')} ${chalk.red(`${errors.length} errors`)}, ${chalk.yellow(`${warnings.length} warnings`)}, ${chalk.blue(`${infos.length} info`)}`);
}

/**
 * Display dependency audit results in terminal
 */
function displayDependencyAudit(auditResult: DependencyAuditResult): void {
  const { dependencies, summary } = auditResult;

  if (dependencies.length === 0) {
    console.log(chalk.gray('  No dependencies to audit.'));
    return;
  }

  // Display hallucinated packages first (most critical)
  const hallucinated = dependencies.filter(d => d.status === 'hallucinated');
  const warnings = dependencies.filter(d => d.status === 'warning');
  const verified = dependencies.filter(d => d.status === 'verified');
  const unknown = dependencies.filter(d => d.status === 'unknown');

  // Hallucinated packages
  for (const dep of hallucinated) {
    console.log(`  ${chalk.red('❌')} ${chalk.red(dep.name)} ${chalk.red('— PACKAGE NOT FOUND')}`);
    if (dep.message) {
      console.log(chalk.gray(`     ${dep.message}`));
    }
  }

  // Warnings
  for (const dep of warnings) {
    const version = dep.version ? `@${dep.version}` : '';
    console.log(`  ${chalk.yellow('⚠️')} ${chalk.yellow(dep.name)}${chalk.gray(version)}`);
    if (dep.message) {
      console.log(chalk.gray(`     ${dep.message}`));
    }
  }

  // Verified (show summary if many)
  if (verified.length > 5) {
    console.log(`  ${chalk.green('✅')} ${chalk.green(`${verified.length} packages verified`)}`);
  } else {
    for (const dep of verified) {
      const version = dep.version ? `@${dep.version}` : '';
      const downloads = dep.weeklyDownloads
        ? chalk.gray(` — ${formatDownloads(dep.weeklyDownloads)} weekly downloads`)
        : '';
      console.log(`  ${chalk.green('✅')} ${chalk.white(dep.name)}${chalk.gray(version)}${downloads}`);
    }
  }

  // Unknown (errors)
  if (unknown.length > 0) {
    console.log(`  ${chalk.gray('?')} ${chalk.gray(`${unknown.length} packages could not be verified`)}`);
  }

  // Summary
  console.log();
  console.log(`  ${chalk.bold('Summary:')} ${chalk.red(`${summary.hallucinated} hallucinated`)}, ${chalk.yellow(`${summary.warnings} warnings`)}, ${chalk.green(`${summary.verified} verified`)}`);
}

/**
 * Format download count for display
 */
function formatDownloads(downloads: number): string {
  if (downloads >= 1_000_000) {
    return `${(downloads / 1_000_000).toFixed(1)}M`;
  }
  if (downloads >= 1_000) {
    return `${(downloads / 1_000).toFixed(1)}K`;
  }
  return downloads.toString();
}

/**
 * Display session summary in terminal
 */
function displaySessionSummary(diff: GitDiff, findings: RiskFinding[], auditResult: DependencyAuditResult | null, duration: number): void {
  console.log();
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold.cyan('  AFTERBURN SESSION REPORT'));
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════'));
  console.log();

  // Stats summary
  console.log(chalk.bold('Session Summary'));
  console.log(chalk.gray('─'.repeat(50)));

  const stats = diff.stats;
  console.log(`  ${chalk.white('Files changed:')}    ${chalk.yellow(stats.filesChanged.toString())}`);
  console.log(`  ${chalk.white('Lines added:')}      ${chalk.green('+' + stats.insertions.toString())}`);
  console.log(`  ${chalk.white('Lines removed:')}    ${chalk.red('-' + stats.deletions.toString())}`);
  console.log(`  ${chalk.white('Commits:')}          ${chalk.blue(stats.commitCount.toString())}`);
  console.log(`  ${chalk.white('Analysis time:')}    ${chalk.gray(formatDuration(duration))}`);

  if (stats.hasUncommittedChanges) {
    console.log(`  ${chalk.yellow('⚠')}  ${chalk.yellow('Uncommitted changes detected')}`);
  }

  console.log();

  // Recent commits
  if (diff.commits.length > 0) {
    console.log(chalk.bold('Recent Commits'));
    console.log(chalk.gray('─'.repeat(50)));

    for (const commit of diff.commits.slice(0, 5)) {
      const shortHash = commit.hash.substring(0, 7);
      const message = commit.message.length > 50
        ? commit.message.substring(0, 47) + '...'
        : commit.message;
      console.log(`  ${chalk.yellow(shortHash)} ${chalk.white(message)}`);
    }

    if (diff.commits.length > 5) {
      console.log(chalk.gray(`  ... and ${diff.commits.length - 5} more commits`));
    }

    console.log();
  }

  // Files changed
  if (diff.files.length > 0) {
    console.log(chalk.bold('Files Changed'));
    console.log(chalk.gray('─'.repeat(50)));

    // Group by status
    const added = diff.files.filter(f => f.status === 'added');
    const modified = diff.files.filter(f => f.status === 'modified');
    const deleted = diff.files.filter(f => f.status === 'deleted');
    const renamed = diff.files.filter(f => f.status === 'renamed');

    const displayFiles = (files: typeof diff.files, icon: string, color: typeof chalk.green): void => {
      for (const file of files.slice(0, 10)) {
        const stats = file.additions + file.deletions > 0
          ? chalk.gray(` (+${file.additions}/-${file.deletions})`)
          : '';
        console.log(`  ${icon} ${color(file.path)}${stats}`);
      }
      if (files.length > 10) {
        console.log(chalk.gray(`  ... and ${files.length - 10} more`));
      }
    };

    if (added.length > 0) {
      displayFiles(added, chalk.green('A'), chalk.green);
    }
    if (modified.length > 0) {
      displayFiles(modified, chalk.yellow('M'), chalk.yellow);
    }
    if (deleted.length > 0) {
      displayFiles(deleted, chalk.red('D'), chalk.red);
    }
    if (renamed.length > 0) {
      displayFiles(renamed, chalk.blue('R'), chalk.blue);
    }

    console.log();
  }

  // Risk Report
  console.log(chalk.bold('Risk Report'));
  console.log(chalk.gray('─'.repeat(50)));
  displayRiskFindings(findings);
  console.log();

  // Dependency Audit
  console.log(chalk.bold('Dependency Audit'));
  console.log(chalk.gray('─'.repeat(50)));
  if (auditResult) {
    displayDependencyAudit(auditResult);
  } else {
    console.log(chalk.gray('  Dependency audit skipped.'));
  }
  console.log();

  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════'));
  console.log();
}

/**
 * Display JSON output
 */
function displayJsonOutput(
  diff: GitDiff,
  findings: RiskFinding[],
  auditResult: DependencyAuditResult | null,
  duration: number,
  options?: {
    projectPath?: string;
    configPath?: string;
    aiProvider?: { provider: string | null; sessionId: string | null };
    llmAnalysis?: LLMAnalysisResult;
  }
): void {
  const summary = RuleRunner.summarize(findings);
  const output = {
    version: '0.2.0',
    timestamp: new Date().toISOString(),
    analysisDuration: duration,
    projectPath: options?.projectPath,
    configPath: options?.configPath,
    aiProvider: options?.aiProvider,
    stats: diff.stats,
    commits: diff.commits.map(c => ({
      hash: c.hash,
      message: c.message,
      author: c.author,
      date: c.date.toISOString(),
    })),
    files: diff.files,
    risks: findings,
    riskSummary: summary,
    dependencies: auditResult?.dependencies ?? [],
    dependencySummary: auditResult?.summary ?? null,
    llmAnalysis: options?.llmAnalysis ? {
      summary: options.llmAnalysis.summary,
      changelog: options.llmAnalysis.changelog,
      architectureDecisions: options.llmAnalysis.architectureDecisions,
      tradeoffs: options.llmAnalysis.tradeoffs,
      usage: options.llmAnalysis.usage,
      latencyMs: options.llmAnalysis.latencyMs,
    } : null,
    exitCode: summary.errors > 0 || (auditResult?.summary.hallucinated ?? 0) > 0 ? 1 : 0,
  };

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Run the analyze command
 */
async function runAnalyze(targetPath: string, options: AnalyzeOptions): Promise<void> {
  // Auto-detect CI environment
  const inCI = isCI() || options.ci;

  // Disable colors if --no-color flag is set or in CI
  if (options.noColor || inCI) {
    chalk.level = 0;
  }

  const startTime = Date.now();

  // Resolve absolute path
  const absolutePath = path.resolve(targetPath);

  // Load .env file from target project directory (if exists)
  const envPath = path.join(absolutePath, '.env');
  const envExists = fs.existsSync(envPath);
  if (envExists) {
    dotenv.config({ path: envPath });
  }

  // Debug logger - writes to .afterburn/debug.log when --explain is used
  const debugLogPath = path.join(absolutePath, '.afterburn', 'debug.log');
  const debugLog = (msg: string) => {
    if (options.explain) {
      const timestamp = new Date().toISOString();
      const logDir = path.dirname(debugLogPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(debugLogPath, `[${timestamp}] ${msg}\n`);
    }
  };

  // Log environment setup
  debugLog(`=== New Analysis Run ===`);
  debugLog(`CWD: ${process.cwd()}`);
  debugLog(`Target path: ${absolutePath}`);
  debugLog(`.env exists: ${envExists}`);
  debugLog(`OPENROUTER_API_KEY in env: ${!!process.env.OPENROUTER_API_KEY}`);
  debugLog(`ANTHROPIC_API_KEY in env: ${!!process.env.ANTHROPIC_API_KEY}`);
  debugLog(`OPENAI_API_KEY in env: ${!!process.env.OPENAI_API_KEY}`);

  // Detect AI provider (Claude Code, Cursor, etc.)
  const aiProvider = detectAIProvider(absolutePath);

  // Check if quiet mode
  const quiet = options.quiet ?? false;
  const jsonOutput = options.json ?? false;

  // Create spinner (only if not quiet, not json, and not in CI)
  const spinner = !quiet && !jsonOutput && !inCI
    ? ora({ text: 'Analyzing session...', color: 'cyan' }).start()
    : null;

  try {
    // Check if git repo
    const isRepo = await isGitRepo(absolutePath);
    if (!isRepo) {
      spinner?.fail('Not a git repository');
      if (!quiet) {
        console.error(chalk.red(`\n❌ Error: ${absolutePath} is not a git repository\n`));
        console.log(chalk.gray('Afterburn requires a git repository to track changes.'));
        console.log();
        console.log(chalk.gray('To initialize a git repository:'));
        console.log(chalk.white(`  cd ${absolutePath}`));
        console.log(chalk.white('  git init'));
        console.log();
      }
      process.exit(2);
    }

    if (spinner) {
      spinner.text = 'Loading configuration...';
    }

    // Load configuration
    const { config, configPath, errors: configErrors } = await loadConfig(absolutePath);
    if (configErrors.length > 0 && !quiet) {
      spinner?.stop();
      console.log();
      console.log(chalk.yellow('⚠️  Configuration issues detected:'));
      for (const err of configErrors) {
        console.log(chalk.yellow(`   • ${err}`));
      }
      console.log(chalk.gray('\n   Using default configuration. Fix the issues above or run:'));
      console.log(chalk.white('   afterburn init'));
      console.log();
      spinner?.start();
    }
    if (configPath && options.verbose) {
      console.log(chalk.gray(`Using config: ${configPath}`));
    }

    if (spinner) {
      spinner.text = 'Reading git history...';
    }

    // Get session diff - use config session window if not overridden
    const since = options.since ?? config.session?.window ?? '4h';

    // Get the last commit hash and reported files from previous report (for incremental tracking)
    const lastCommitHash = options.transcript ? getLastCommitHash(options.transcript) : undefined;
    const lastReportedFiles = options.transcript ? getLastReportedFiles(options.transcript) : undefined;
    const diff = await getSessionDiff(absolutePath, since, lastCommitHash, lastReportedFiles);

    // Filter files based on ignore patterns
    if (config.ignore && config.ignore.length > 0) {
      diff.files = filterIgnoredFiles(diff.files, config.ignore);
      // Update stats to reflect filtered files
      diff.stats.filesChanged = diff.files.length;
      diff.stats.insertions = diff.files.reduce((sum, f) => sum + f.additions, 0);
      diff.stats.deletions = diff.files.reduce((sum, f) => sum + f.deletions, 0);
    }

    // Handle empty sessions (no changes)
    if (diff.files.length === 0 && diff.commits.length === 0) {
      spinner?.succeed('No changes detected');
      if (!quiet && !jsonOutput) {
        console.log();
        console.log(chalk.yellow('📭 No changes found in the specified time window.'));
        console.log();
        console.log(chalk.gray('Tips:'));
        console.log(chalk.gray(`  • Try a longer time window: ${chalk.white('--since "1 day ago"')}`));
        console.log(chalk.gray(`  • Check if you have uncommitted changes: ${chalk.white('git status')}`));
        console.log(chalk.gray(`  • Make sure you're in the right directory`));
        console.log();
      }
      if (jsonOutput) {
        console.log(JSON.stringify({ status: 'empty', message: 'No changes found' }));
      }
      process.exit(0);
    }

    // Warn about large diffs (>100 files)
    const isLargeDiff = diff.files.length > 100;
    if (isLargeDiff && !quiet && !jsonOutput) {
      spinner?.warn(`Large session detected: ${diff.files.length} files`);
      console.log(chalk.yellow(`⚠️  Analyzing ${diff.files.length} files may take longer and use more LLM tokens.`));
      console.log(chalk.gray(`   Consider using a shorter time window or more specific ignore patterns.`));
      spinner?.start();
    }

    if (spinner) {
      spinner.text = 'Running static analysis...';
    }

    // Build severity overrides from config
    const severityOverrides: Record<string, 'error' | 'warn' | 'info'> = {};
    if (config.rules) {
      for (const [ruleId, ruleConfig] of Object.entries(config.rules)) {
        const severity = typeof ruleConfig === 'string' ? ruleConfig : ruleConfig.severity;
        if (severity && severity !== 'off') {
          severityOverrides[ruleId] = severity as 'error' | 'warn' | 'info';
        }
      }
    }

    // Get disabled rules
    const disabledRules = new Set<string>();
    if (config.rules) {
      for (const [ruleId, ruleConfig] of Object.entries(config.rules)) {
        const severity = typeof ruleConfig === 'string' ? ruleConfig : ruleConfig.severity;
        if (severity === 'off') {
          disabledRules.add(ruleId);
        }
      }
    }

    // Run rules on changed files
    const ruleRunner = new RuleRunner({
      ignorePatterns: config.ignore,
      severityOverrides,
      customRules: config.customRules,
    });
    const findings: RiskFinding[] = [];

    // Process files in parallel with concurrency limit
    const CONCURRENCY_LIMIT = 10;
    const filesToProcess = diff.files.filter(f => f.status !== 'deleted');

    const processFile = async (file: typeof filesToProcess[0]): Promise<RiskFinding[]> => {
      try {
        const content = await getFileContent(absolutePath, file.path);
        if (content) {
          return ruleRunner.run(content, file.path);
        }
      } catch {
        // File couldn't be read, skip it
      }
      return [];
    };

    // Process files in batches with concurrency limit
    const totalFiles = filesToProcess.length;
    let processedFiles = 0;

    for (let i = 0; i < filesToProcess.length; i += CONCURRENCY_LIMIT) {
      const batch = filesToProcess.slice(i, i + CONCURRENCY_LIMIT);

      // Update progress
      if (spinner && totalFiles > 10) {
        spinner.text = `Analyzing files... (${processedFiles}/${totalFiles})`;
      }

      const batchResults = await Promise.all(batch.map(processFile));
      for (const fileFindings of batchResults) {
        findings.push(...fileFindings);
      }
      processedFiles += batch.length;
    }

    // Final progress update
    if (spinner && totalFiles > 10) {
      spinner.text = `Analyzing files... (${totalFiles}/${totalFiles})`;
    }

    // Filter out disabled rules
    const enabledFindings = findings.filter(f => !disabledRules.has(f.ruleId));

    // Deduplicate findings (same file, line, and ruleId)
    const deduplicatedFindings = enabledFindings.filter((finding, index, self) => {
      return index === self.findIndex(f =>
        f.file === finding.file &&
        f.line === finding.line &&
        f.ruleId === finding.ruleId &&
        f.message === finding.message
      );
    });

    // Sort findings by severity
    const sortedFindings = deduplicatedFindings.sort((a, b) => {
      const order = { error: 0, warn: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });

    // Run dependency audit
    if (spinner) {
      spinner.text = 'Auditing dependencies...';
    }

    let auditResult: DependencyAuditResult | null = null;
    try {
      auditResult = await runDependencyAudit({
        projectPath: absolutePath,
        changedFiles: diff.files.map(f => ({ path: f.path })),
        checkAllDependencies: true,
        onProgress: spinner ? (current, total, pkg) => {
          spinner.text = `Auditing dependencies... (${current}/${total}) ${pkg}`;
        } : undefined,
      });
    } catch {
      // Dependency audit failed (offline, etc.) - continue without it
    }

    // LLM Analysis (if --explain flag is set)
    let llmAnalysis: LLMAnalysisResult | null = null;
    let llmSkippedReason: string | undefined;

    // Read session actions early for LLM analysis and report generation
    let sessionActions: import('./reporter/index.js').SessionAction[] = [];
    let tokenUsage: import('./reporter/index.js').TokenUsage | undefined;
    if (options.transcript) {
      const transcriptData = readActionsFromTranscript(options.transcript);
      sessionActions = transcriptData.actions;
      tokenUsage = transcriptData.tokenUsage;
    } else {
      sessionActions = readSessionActions(absolutePath);
    }

    if (options.explain) {
      debugLog(`LLM analysis requested (--explain)`);

      // Check for LLM config - first from config file, then auto-detect from env vars
      let llmConfig = config.llm as LLMConfig | undefined;
      let resolvedApiKey = llmConfig?.apiKey ? resolveApiKey(llmConfig.apiKey) : undefined;

      debugLog(`Config LLM: ${llmConfig ? JSON.stringify({ provider: llmConfig.provider, model: llmConfig.model, hasApiKey: !!llmConfig.apiKey }) : 'none'}`);
      debugLog(`Config API key resolved: ${resolvedApiKey ? `yes (${resolvedApiKey.slice(0, 8)}...)` : 'no'}`);

      // Debug logging for verbose mode
      if (options.verbose) {
        console.log(chalk.gray(`[DEBUG] LLM config from file: ${llmConfig ? JSON.stringify({ provider: llmConfig.provider, model: llmConfig.model, hasApiKey: !!llmConfig.apiKey }) : 'none'}`));
        console.log(chalk.gray(`[DEBUG] Resolved API key: ${resolvedApiKey ? 'present (' + resolvedApiKey.slice(0, 8) + '...)' : 'missing'}`));
      }

      // Auto-detect from environment variables if no config found
      if (!llmConfig || !resolvedApiKey) {
        debugLog(`Auto-detecting from env vars...`);
        if (process.env.OPENROUTER_API_KEY) {
          llmConfig = { provider: 'openrouter', model: 'openai/gpt-4o-mini', apiKey: process.env.OPENROUTER_API_KEY };
          resolvedApiKey = process.env.OPENROUTER_API_KEY;
          debugLog(`Found OPENROUTER_API_KEY in env`);
        } else if (process.env.ANTHROPIC_API_KEY) {
          llmConfig = { provider: 'anthropic', model: 'claude-sonnet-4-20250514', apiKey: process.env.ANTHROPIC_API_KEY };
          resolvedApiKey = process.env.ANTHROPIC_API_KEY;
          debugLog(`Found ANTHROPIC_API_KEY in env`);
        } else if (process.env.OPENAI_API_KEY) {
          llmConfig = { provider: 'openai', model: 'gpt-4o-mini', apiKey: process.env.OPENAI_API_KEY };
          resolvedApiKey = process.env.OPENAI_API_KEY;
          debugLog(`Found OPENAI_API_KEY in env`);
        } else {
          debugLog(`No API key found in env vars`);
        }
      }

      if (!llmConfig || !resolvedApiKey) {
        llmSkippedReason = 'No API key configured';
        debugLog(`SKIPPED: ${llmSkippedReason}`);
        if (spinner) {
          spinner.warn('LLM analysis skipped: No API key configured');
        } else if (!quiet && !jsonOutput) {
          console.warn(chalk.yellow('⚠️  --explain requires LLM configuration. Set llm.apiKey in .afterburnrc or OPENROUTER_API_KEY/ANTHROPIC_API_KEY/OPENAI_API_KEY env var'));
        }
        if (options.verbose) {
          console.log(chalk.gray(`[DEBUG] Environment vars: OPENROUTER=${!!process.env.OPENROUTER_API_KEY}, ANTHROPIC=${!!process.env.ANTHROPIC_API_KEY}, OPENAI=${!!process.env.OPENAI_API_KEY}`));
        }
      } else {
        debugLog(`Proceeding with LLM: provider=${llmConfig.provider}, model=${llmConfig.model}`);
        // Get diff content for LLM
        const diffContent = diff.files
          .filter(f => f.status !== 'deleted' && f.diff)
          .map(f => `--- ${f.path}\n${f.diff}`)
          .join('\n\n');

        // Estimate cost before calling LLM
        const estimatedInputTokens = estimateTokenCount(diffContent) + 500; // +500 for prompts
        const estimatedOutputTokens = 1500; // Approximate for summary + changelog + ADR
        const estimatedCostUsd = estimateCost(llmConfig.model, estimatedInputTokens, estimatedOutputTokens);

        // Show cost estimate and confirm (unless --yes, CI, or quiet)
        const autoConfirm = options.yes || inCI || quiet || jsonOutput;

        if (!autoConfirm && estimatedCostUsd > 0) {
          spinner?.stop();
          console.log();
          console.log(chalk.cyan(`📊 LLM Analysis Cost Estimate:`));
          console.log(`   Model: ${chalk.white(llmConfig.model)}`);
          console.log(`   Input: ~${chalk.yellow(estimatedInputTokens.toLocaleString())} tokens`);
          console.log(`   Output: ~${chalk.yellow(estimatedOutputTokens.toLocaleString())} tokens`);
          console.log(`   Estimated cost: ${chalk.green(formatCost(estimatedCostUsd))}`);
          console.log();

          const confirmed = await confirm('Proceed with LLM analysis?');
          if (!confirmed) {
            console.log(chalk.gray('LLM analysis skipped.'));
            spinner?.start();
          } else {
            spinner?.start();
            spinner && (spinner.text = 'Generating AI summary...');
          }

          if (!confirmed) {
            // Skip LLM analysis
          } else {
            try {
              llmAnalysis = await analyzeWithLLM(
                { ...llmConfig, apiKey: resolvedApiKey },
                {
                  diff: diffContent,
                  fileList: diff.files.map(f => f.path),
                  commitMessages: diff.commits.map(c => c.message),
                  projectName: path.basename(absolutePath),
                  newDependencies: auditResult?.dependencies
                    .filter(d => d.status === 'verified')
                    .map(d => d.name),
                  sessionActions: sessionActions,
                },
                {
                  includeChangelog: true,
                  includeADR: true,
                  includeTradeoffs: false,
                  onProgress: spinner ? (step) => { spinner.text = step; } : undefined,
                }
              );

              if (spinner) {
                spinner.text = `AI analysis complete (${formatCost(llmAnalysis.usage.estimatedCost)})`;
              }
            } catch (error) {
              const { message, suggestion } = formatLLMError(error);
              llmSkippedReason = `LLM failed: ${message}`;
              if (spinner) {
                spinner.warn(`LLM analysis failed: ${message}`);
              } else if (!quiet && !jsonOutput) {
                console.warn(chalk.yellow(`⚠️  LLM analysis failed: ${message}`));
              }
              if (suggestion && !quiet && !jsonOutput) {
                console.log(chalk.gray(`   💡 ${suggestion}`));
              }
            }
          }
        } else {
          // Auto-confirm mode (CI, --yes, free model, etc.)
          debugLog(`Auto-confirm mode - calling LLM...`);
          if (spinner) {
            spinner.text = 'Generating AI summary...';
          }

          try {
            llmAnalysis = await analyzeWithLLM(
              { ...llmConfig, apiKey: resolvedApiKey },
              {
                diff: diffContent,
                fileList: diff.files.map(f => f.path),
                commitMessages: diff.commits.map(c => c.message),
                projectName: path.basename(absolutePath),
                newDependencies: auditResult?.dependencies
                  .filter(d => d.status === 'verified')
                  .map(d => d.name),
                sessionActions: sessionActions,
              },
              {
                includeChangelog: true,
                includeADR: true,
                includeTradeoffs: false,
                onProgress: spinner ? (step) => { spinner.text = step; } : undefined,
              }
            );

            debugLog(`SUCCESS: LLM analysis complete, tokens=${llmAnalysis.usage.totalTokens}, cost=${formatCost(llmAnalysis.usage.estimatedCost)}`);
            if (spinner) {
              spinner.text = `AI analysis complete (${formatCost(llmAnalysis.usage.estimatedCost)})`;
            }
          } catch (error) {
            const { message, suggestion } = formatLLMError(error);
            llmSkippedReason = `LLM failed: ${message}`;
            debugLog(`ERROR (auto-confirm): ${message}`);
            debugLog(`Full error: ${error instanceof Error ? error.stack : String(error)}`);
            if (spinner) {
              spinner.warn(`LLM analysis failed: ${message}`);
            } else if (!quiet && !jsonOutput) {
              console.warn(chalk.yellow(`⚠️  LLM analysis failed: ${message}`));
            }
            if (suggestion && !quiet && !jsonOutput) {
              console.log(chalk.gray(`   💡 ${suggestion}`));
            }
          }
        }
      }
    } else if (options.explain) {
      // --explain was passed but we got here without running LLM
      // This shouldn't happen, but track it for debugging
      llmSkippedReason = llmSkippedReason || 'Unknown reason (logic error)';
    }

    const duration = Date.now() - startTime;
    const summary = RuleRunner.summarize(sortedFindings);
    const hasHallucinated = auditResult?.summary.hallucinated ?? 0;

    if (summary.errors > 0 || hasHallucinated > 0) {
      const msg = hasHallucinated > 0
        ? `${summary.errors} errors, ${hasHallucinated} hallucinated packages`
        : `${summary.errors} errors`;
      spinner?.warn(`Analysis complete in ${formatDuration(duration)} - ${msg}`);
    } else if (summary.warnings > 0) {
      spinner?.succeed(`Analysis complete in ${formatDuration(duration)} - ${summary.warnings} warnings`);
    } else {
      spinner?.succeed(`Analysis complete in ${formatDuration(duration)}`);
    }

    // Generate and write markdown report
    const baseOutputDir = options.output ? path.resolve(options.output) : absolutePath;
    const afterburnDir = path.join(baseOutputDir, '.afterburn');

    // Create date-based folder structure
    const now = new Date();
    const dateFolder = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStamp = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const sessionDir = path.join(afterburnDir, dateFolder);
    const reportFileName = `session-${timeStamp}.md`;
    const reportPath = path.join(sessionDir, reportFileName);

    // Create directories if they don't exist
    if (!fs.existsSync(afterburnDir)) {
      fs.mkdirSync(afterburnDir, { recursive: true });
    }
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const markdownReport = generateMarkdownReport({
      diff,
      findings: sortedFindings,
      dependencies: auditResult?.dependencies,
      sessionActions,
      tokenUsage,
      analysisTime: duration,
      projectPath: absolutePath,
      since,
      aiProvider,
      llmAnalysis: llmAnalysis ?? undefined,
      llmSkippedReason: options.explain ? llmSkippedReason : undefined,
    });

    fs.writeFileSync(reportPath, markdownReport, 'utf-8');

    // Save state for incremental tracking
    if (options.transcript) {
      // Save the most recent commit hash
      if (diff.commits.length > 0) {
        const latestCommit = diff.commits[0]; // commits are sorted newest first
        saveLastCommitHash(options.transcript, latestCommit.hash);
      }

      // Save the reported files (combine with previous to track all uncommitted files)
      const currentFiles = diff.files.map(f => f.path);
      const allReportedFiles = [...new Set([...(lastReportedFiles || []), ...currentFiles])];
      saveLastReportedFiles(options.transcript, allReportedFiles);
    }

    // Clear session actions after report is generated (for next session)
    if (sessionActions.length > 0 && !options.transcript) {
      clearSessionActions(absolutePath);
    }

    if (!quiet && !jsonOutput) {
      console.log(chalk.green(`\n📄 Report saved to: ${reportPath}\n`));
    }

    // Sync to dashboard if requested
    if (options.sync) {
      const syncSpinner = !quiet && !jsonOutput
        ? ora({ text: 'Syncing to dashboard...', color: 'cyan' }).start()
        : null;

      const syncResult = await syncToDashboard(
        {
          projectName: path.basename(absolutePath),
          sessionDuration: duration,
          analyzedAt: new Date(),
          since,
          filesChanged: diff.stats.filesChanged,
          linesAdded: diff.stats.insertions,
          linesRemoved: diff.stats.deletions,
          commitCount: diff.stats.commitCount,
          errorCount: summary.errors,
          warningCount: summary.warnings,
          infoCount: summary.info,
          verifiedDeps: auditResult?.summary.verified ?? 0,
          warningDeps: auditResult?.summary.warnings ?? 0,
          hallucinatedDeps: auditResult?.summary.hallucinated ?? 0,
          aiProvider: aiProvider.provider ?? undefined,
          llmSummary: llmAnalysis?.summary,
          llmChangelog: llmAnalysis?.changelog,
          llmAdr: llmAnalysis?.architectureDecisions,
          llmTokens: llmAnalysis?.usage.totalTokens,
          llmCost: llmAnalysis?.usage.estimatedCost,
          llmModel: config.llm?.model,
          fullReport: {
            stats: diff.stats,
            commits: diff.commits,
            files: diff.files,
            findings: sortedFindings,
            dependencies: auditResult?.dependencies,
          },
        },
        {
          dashboardUrl: (config as { dashboardUrl?: string }).dashboardUrl,
          licenseKey: (config as { licenseKey?: string }).licenseKey,
        }
      );

      if (syncResult.success) {
        syncSpinner?.succeed(`Synced to dashboard (ID: ${syncResult.reportId})`);
      } else {
        syncSpinner?.warn(`Sync failed: ${syncResult.error}`);
        if (!quiet && !jsonOutput) {
          console.log(chalk.gray('  Tip: Set AFTERBURN_LICENSE_KEY or run `afterburn config set licenseKey YOUR_KEY`'));
        }
      }
    }

    // Output results
    if (jsonOutput) {
      displayJsonOutput(diff, sortedFindings, auditResult, duration, {
        projectPath: absolutePath,
        configPath: configPath ?? undefined,
        aiProvider,
        llmAnalysis: llmAnalysis ?? undefined,
      });
    } else if (!quiet) {
      displaySessionSummary(diff, sortedFindings, auditResult, duration);

      // Display LLM summary if available
      if (llmAnalysis) {
        console.log(chalk.bold('AI Summary'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(llmAnalysis.summary);
        console.log();
        console.log(chalk.gray(`  Tokens: ${llmAnalysis.usage.totalTokens} | Cost: ${formatCost(llmAnalysis.usage.estimatedCost)} | Time: ${(llmAnalysis.latencyMs / 1000).toFixed(1)}s`));
        console.log();
      }
    }

    // CI mode exit codes
    if (options.ci || inCI) {
      const maxErrors = options.maxErrors ?? 0;
      const failOnWarnings = options.failOnWarnings ?? false;

      // Exit code 1: errors exceed threshold or hallucinated packages
      if (summary.errors > maxErrors || hasHallucinated > 0) {
        if (!quiet && !jsonOutput) {
          console.log(chalk.red(`\n❌ CI check failed: ${summary.errors} errors, ${hasHallucinated} hallucinated packages`));
        }
        process.exit(1);
      }

      // Exit code 1 if --fail-on-warnings and warnings exist
      if (failOnWarnings && summary.warnings > 0) {
        if (!quiet && !jsonOutput) {
          console.log(chalk.red(`\n❌ CI check failed: ${summary.warnings} warnings (--fail-on-warnings enabled)`));
        }
        process.exit(1);
      }

      if (!quiet && !jsonOutput) {
        console.log(chalk.green('\n✅ CI check passed'));
      }
      process.exit(0);
    }

  } catch (error) {
    spinner?.fail('Analysis failed');

    const message = error instanceof Error ? error.message : 'Unknown error';

    if (!quiet) {
      console.error(chalk.red(`Error: ${message}`));
    }

    if (options.verbose) {
      console.error(error);
    }

    process.exit(2);
  }
}

// Analyze command
program
  .command('analyze')
  .alias('a')
  .description('Analyze a directory for AI coding session changes')
  .argument('[path]', 'Path to analyze', './')
  .option('--explain', 'Include LLM-powered explanations (requires API key)')
  .option('-y, --yes', 'Auto-confirm LLM cost (skip confirmation prompt)')
  .option('--since <timespec>', 'Scope analysis to changes since timespec', '4h')
  .option('--output <path>', 'Output path for report', './')
  .option('--json', 'Output in JSON format')
  .option('--ci', 'CI mode - exit with error code based on findings')
  .option('--fail-on-warnings', 'Fail CI if warnings are found')
  .option('--max-errors <n>', 'Maximum allowed errors before failing (default: 0)', parseInt)
  .option('--staged-only', 'Analyze only staged changes (for pre-commit hooks)')
  .option('--sync', 'Sync report to Afterburn dashboard')
  .option('--verbose', 'Show verbose output including errors')
  .option('--quiet', 'Suppress all output except errors')
  .option('--no-color', 'Disable colored output (for CI environments)')
  .option('--transcript <path>', 'Path to Claude Code transcript file (for extracting session actions)')
  .action(async (targetPath: string, options: AnalyzeOptions) => {
    await runAnalyze(targetPath, options);
  });

// Project type detection
interface ProjectInfo {
  type: 'node' | 'python' | 'go' | 'rust' | 'mixed' | 'unknown';
  frameworks: string[];
  hasTests: boolean;
}

function detectProjectType(cwd: string): ProjectInfo {
  const info: ProjectInfo = { type: 'unknown', frameworks: [], hasTests: false };

  // Node.js detection
  const hasPackageJson = fs.existsSync(path.join(cwd, 'package.json'));
  if (hasPackageJson) {
    info.type = 'node';
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.react || deps['react-dom']) info.frameworks.push('React');
      if (deps.vue) info.frameworks.push('Vue');
      if (deps.next) info.frameworks.push('Next.js');
      if (deps.express) info.frameworks.push('Express');
      if (deps.nestjs || deps['@nestjs/core']) info.frameworks.push('NestJS');
      if (deps.jest || deps.vitest || deps.mocha) info.hasTests = true;
    } catch { /* ignore */ }
  }

  // Python detection
  const hasRequirements = fs.existsSync(path.join(cwd, 'requirements.txt'));
  const hasPyproject = fs.existsSync(path.join(cwd, 'pyproject.toml'));
  const hasSetupPy = fs.existsSync(path.join(cwd, 'setup.py'));
  if (hasRequirements || hasPyproject || hasSetupPy) {
    info.type = hasPackageJson ? 'mixed' : 'python';
    if (fs.existsSync(path.join(cwd, 'django')) || fs.existsSync(path.join(cwd, 'manage.py'))) {
      info.frameworks.push('Django');
    }
    if (fs.existsSync(path.join(cwd, 'tests')) || fs.existsSync(path.join(cwd, 'test'))) {
      info.hasTests = true;
    }
  }

  // Go detection
  const hasGoMod = fs.existsSync(path.join(cwd, 'go.mod'));
  if (hasGoMod) {
    info.type = info.type === 'unknown' ? 'go' : 'mixed';
  }

  // Rust detection
  const hasCargoToml = fs.existsSync(path.join(cwd, 'Cargo.toml'));
  if (hasCargoToml) {
    info.type = info.type === 'unknown' ? 'rust' : 'mixed';
  }

  return info;
}

// Interactive prompt helpers using @inquirer/prompts (arrow key navigation)
async function prompt(question: string, defaultValue?: string): Promise<string> {
  return input({
    message: question,
    default: defaultValue,
  });
}

async function promptChoice(question: string, choices: string[], defaultIdx = 0): Promise<string> {
  const result = await select({
    message: question,
    choices: choices.map((choice) => ({
      name: choice,
      value: choice,
    })),
    default: choices[defaultIdx],
  });
  return result;
}

async function promptConfirm(question: string, defaultValue = true): Promise<boolean> {
  return inquirerConfirm({
    message: question,
    default: defaultValue,
  });
}

// Template configurations for setup wizard
interface SetupTemplate {
  name: string;
  description: string;
  config: Partial<AfterburnerConfig>;
}

const SETUP_TEMPLATES: Record<string, SetupTemplate> = {
  plain: {
    name: 'Plain',
    description: 'Minimal config - just the essentials, no rules configured',
    config: {
      rules: {},
      ignore: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
      session: { window: '4h', outputDir: '.afterburn' },
      output: { format: 'markdown', includeAIProvider: true },
    },
  },
  basic: {
    name: 'Basic',
    description: 'Standard rules with balanced severity - good for most projects',
    config: {
      rules: {
        AB001: 'error',  // Credentials - always critical
        AB002: 'warn',   // Error swallowing
        AB003: 'info',   // Type assertions
        AB004: 'info',   // Duplicate logic
        AB005: 'warn',   // Null checks
        AB006: 'info',   // Hardcoded config
        AB007: 'error',  // Security - always critical
        AB008: 'info',   // Over-abstraction
        AB009: 'warn',   // Timeouts
        AB010: 'info',   // AI TODOs
      },
      ignore: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '.git/**', '*.min.js'],
      session: { window: '4h', outputDir: '.afterburn' },
      output: { format: 'markdown', includeAIProvider: true },
    },
  },
  advanced: {
    name: 'Advanced',
    description: 'Strict rules with CI integration - for production projects',
    config: {
      rules: {
        AB001: 'error',
        AB002: 'error',
        AB003: 'warn',
        AB004: 'warn',
        AB005: 'error',
        AB006: 'warn',
        AB007: 'error',
        AB008: 'warn',
        AB009: 'error',
        AB010: 'warn',
      },
      ignore: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '.git/**', '*.min.js', '*.bundle.js'],
      session: { window: '8h', outputDir: '.afterburn' },
      output: { format: 'markdown', includeAIProvider: true },
      ci: { failOnWarnings: false, maxErrors: 0, maxWarnings: 10 },
    },
  },
  custom: {
    name: 'Custom',
    description: 'Start from scratch - configure everything yourself',
    config: {
      rules: {},
      ignore: [],
      session: { window: '4h', outputDir: '.afterburn' },
      output: { format: 'markdown', includeAIProvider: true },
    },
  },
};

/**
 * Interactive setup wizard for first-time users
 */
async function runSetupWizard(): Promise<void> {
  const cwd = process.cwd();

  console.log(chalk.cyan('\n🔥 Welcome to Afterburn Setup!\n'));
  console.log(chalk.gray('This wizard will help you configure Afterburn for your project.\n'));

  // Step 1: Check for existing config
  const existingConfig = findConfigFile(cwd);
  if (existingConfig) {
    console.log(chalk.yellow(`Config file already exists: ${existingConfig}`));
    const overwrite = await promptConfirm('Do you want to overwrite it?', false);
    if (!overwrite) {
      console.log(chalk.gray('\nSetup cancelled. Your existing config is unchanged.'));
      return;
    }
    console.log();
  }

  // Step 2: Ask for project name
  const detectedName = path.basename(cwd);
  const projectName = await prompt('Project name', detectedName);
  console.log();

  // Step 3: Detect project type
  const projectInfo = detectProjectType(cwd);
  console.log(chalk.gray('Detected project:'));
  console.log(chalk.white(`  Type: ${projectInfo.type}`));
  if (projectInfo.frameworks.length > 0) {
    console.log(chalk.white(`  Frameworks: ${projectInfo.frameworks.join(', ')}`));
  }
  console.log();

  // Step 4: Choose template
  const templateChoice = await promptChoice(
    'Choose a configuration template:',
    [
      `${chalk.bold('Plain')}    - ${SETUP_TEMPLATES.plain.description}`,
      `${chalk.bold('Basic')}    - ${SETUP_TEMPLATES.basic.description}`,
      `${chalk.bold('Advanced')} - ${SETUP_TEMPLATES.advanced.description}`,
      `${chalk.bold('Custom')}   - ${SETUP_TEMPLATES.custom.description}`,
    ],
    1 // Default to Basic
  );

  const templateKey = templateChoice.includes('Plain') ? 'plain'
    : templateChoice.includes('Basic') ? 'basic'
    : templateChoice.includes('Advanced') ? 'advanced'
    : 'custom';

  const template = SETUP_TEMPLATES[templateKey];
  const config: Partial<AfterburnerConfig> = JSON.parse(JSON.stringify(template.config));

  // Add project name as a comment in the config (we'll store it in session metadata)
  console.log();
  console.log(chalk.green(`✓ Using ${template.name} template`));

  // Step 5: Add language-specific ignores
  if (projectInfo.type === 'node' || projectInfo.type === 'mixed') {
    config.ignore?.push('package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock');
  }
  if (projectInfo.type === 'python' || projectInfo.type === 'mixed') {
    config.ignore?.push('__pycache__/**', '*.pyc', '.venv/**', 'venv/**', '*.egg-info/**');
  }
  if (projectInfo.type === 'go') {
    config.ignore?.push('vendor/**');
  }
  if (projectInfo.type === 'rust') {
    config.ignore?.push('target/**', 'Cargo.lock');
  }

  // Step 6: Custom template - additional questions
  if (templateKey === 'custom') {
    console.log();
    console.log(chalk.cyan('Custom configuration:\n'));

    // Session window
    const window = await prompt('Session time window (e.g., 4h, 1d, 30m)', '4h');
    config.session = { ...config.session, window };

    // Output format
    console.log();
    const format = await promptChoice('Output format:', ['Markdown', 'JSON'], 0);
    config.output = { ...config.output, format: format.toLowerCase() as 'markdown' | 'json' };

    // Ignore patterns
    console.log();
    const defaultIgnores = 'node_modules/**, dist/**, .git/**';
    const ignoreInput = await prompt('Ignore patterns (comma-separated)', defaultIgnores);
    config.ignore = ignoreInput.split(',').map(p => p.trim()).filter(p => p.length > 0);
  }

  // Step 7: LLM configuration (optional)
  console.log();
  const configureLLM = await promptConfirm('Configure LLM for AI-powered summaries?', false);
  if (configureLLM) {
    console.log();
    const provider = await promptChoice(
      'Choose LLM provider:',
      ['OpenRouter (recommended)', 'OpenAI', 'Anthropic', 'Ollama (local)'],
      0
    );

    const providerMap: Record<string, string> = {
      'OpenRouter (recommended)': 'openrouter',
      'OpenAI': 'openai',
      'Anthropic': 'anthropic',
      'Ollama (local)': 'ollama',
    };

    const modelDefaults: Record<string, string> = {
      openrouter: 'openai/gpt-4o-mini',
      openai: 'gpt-4o-mini',
      anthropic: 'claude-sonnet-4-20250514',
      ollama: 'llama3',
    };

    const envVars: Record<string, string> = {
      openrouter: 'OPENROUTER_API_KEY',
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      ollama: '',
    };

    const p = providerMap[provider];
    config.llm = {
      provider: p,
      model: modelDefaults[p],
      apiKey: envVars[p] ? `env:${envVars[p]}` : undefined,
    };

    if (envVars[p]) {
      console.log(chalk.gray(`\n  💡 Set ${envVars[p]} in your environment to enable LLM features.`));
    }
  }

  // Step 8: Write config file
  console.log();
  const formatChoice = await promptChoice('Config file format:', ['.afterburnrc (JSON)', 'afterburn.config.js'], 0);
  const fileName = formatChoice.includes('JSON') ? '.afterburnrc' : 'afterburn.config.js';
  const configPath = path.join(cwd, fileName);

  writeConfigFile(configPath, config);
  console.log();
  console.log(chalk.green(`✓ Created ${fileName}`));

  // Step 9: Add to .gitignore
  const gitignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('.afterburn')) {
      console.log();
      const addGitignore = await promptConfirm('Add .afterburn/ to .gitignore?', true);
      if (addGitignore) {
        fs.appendFileSync(gitignorePath, '\n# Afterburn reports\n.afterburn/\n');
        console.log(chalk.green('✓ Added .afterburn/ to .gitignore'));
      }
    }
  }

  // Step 10: AI Coding Assistant hooks integration
  console.log();
  const aiProvider = await promptChoice(
    'Which AI coding assistant are you using?',
    [
      `${chalk.bold('Claude Code')} - Anthropic's CLI assistant`,
      `${chalk.bold('Codex')}       - OpenAI's coding assistant`,
      `${chalk.bold('None')}        - Skip hook setup`,
    ],
    0
  );

  if (aiProvider.includes('Claude Code')) {
    console.log();
    const scopeChoice = await promptChoice(
      'Where should the hooks be installed?',
      [
        `${chalk.bold('Project')} - Only this project (./${path.basename(cwd)}/.claude/)`,
        `${chalk.bold('Global')}  - All projects (~/.claude/)`,
      ],
      0
    );
    const scope: 'project' | 'global' = scopeChoice.includes('Project') ? 'project' : 'global';

    console.log();
    const sharingChoice = await promptChoice(
      'How should hooks be configured?',
      [
        `${chalk.bold('Team')}     - Share with team (settings.json) ${chalk.green('← recommended')}`,
        `${chalk.bold('Personal')} - Only for you (settings.local.json, gitignored)`,
      ],
      0
    );
    const sharing: 'team' | 'personal' = sharingChoice.includes('Team') ? 'team' : 'personal';

    await setupClaudeCodeHooks(cwd, projectName, scope, sharing);
  } else if (aiProvider.includes('Codex')) {
    console.log();
    const scopeChoice = await promptChoice(
      'Where should the hooks be installed?',
      [
        `${chalk.bold('Project')} - Only this project (./${path.basename(cwd)}/.codex/)`,
        `${chalk.bold('Global')}  - All projects (~/.codex/)`,
      ],
      0
    );
    const scope: 'project' | 'global' = scopeChoice.includes('Project') ? 'project' : 'global';

    console.log();
    const sharingChoice = await promptChoice(
      'How should hooks be configured?',
      [
        `${chalk.bold('Team')}     - Share with team (config.json) ${chalk.green('← recommended')}`,
        `${chalk.bold('Personal')} - Only for you (config.local.json, gitignored)`,
      ],
      0
    );
    const sharing: 'team' | 'personal' = sharingChoice.includes('Team') ? 'team' : 'personal';

    await setupCodexHooks(cwd, projectName, scope, sharing);
  }

  // Done!
  console.log();
  console.log(chalk.cyan('━'.repeat(50)));
  console.log(chalk.green('\n✨ Afterburn setup complete!\n'));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.white('  1.'), chalk.gray('Run'), chalk.cyan('afterburn'), chalk.gray('to analyze your project'));
  console.log(chalk.white('  2.'), chalk.gray('Run'), chalk.cyan('afterburn --explain'), chalk.gray('for AI-powered summaries'));
  console.log(chalk.white('  3.'), chalk.gray('Run'), chalk.cyan('afterburn studio'), chalk.gray('to view the dashboard'));
  console.log();
}

/**
 * Setup Claude Code hooks for automatic analysis
 * @param cwd - Current working directory (project path)
 * @param projectName - Name of the project
 * @param scope - 'project' for local .claude/ or 'global' for ~/.claude/
 * @param sharing - 'team' for settings.json (shared) or 'personal' for settings.local.json (gitignored)
 */
async function setupClaudeCodeHooks(cwd: string, _projectName: string, scope: 'project' | 'global', sharing: 'team' | 'personal'): Promise<void> {
  const homeDir = os.homedir();
  const claudeDir = scope === 'global'
    ? path.join(homeDir, '.claude')
    : path.join(cwd, '.claude');

  // Create .claude directory if it doesn't exist
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  // Determine settings file based on sharing preference
  // team = settings.json (committed to git, shared with team)
  // personal = settings.local.json (gitignored, personal only)
  const settingsFileName = sharing === 'team' ? 'settings.json' : 'settings.local.json';
  const settingsPath = path.join(claudeDir, settingsFileName);
  let settings: Record<string, unknown> = {};

  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      // Ignore parse errors, start fresh
    }
  }

  // Stop hook command that:
  // 1. Reads stdin to get session info (including transcript_path)
  // 2. Extracts transcript_path using jq
  // 3. Passes it to afterburn via --transcript flag
  // This allows afterburn to read Claude's actions directly from the transcript
  const stopHookCommand = 'INPUT=$(cat); TRANSCRIPT=$(echo "$INPUT" | jq -r \'.transcript_path // empty\'); if [ -n "$TRANSCRIPT" ]; then afterburn --since=1h --quiet --transcript "$TRANSCRIPT"; else afterburn --since=1h --quiet; fi';

  // Merge with existing hooks if present
  const existingHooks = (settings.hooks as Record<string, unknown[]>) || {};
  const existingStopHooks = (existingHooks.Stop as unknown[]) || [];

  // Helper to check if a hook command exists
  const hookExists = (hooks: unknown[], searchStr: string): boolean => {
    return hooks.some((hook: unknown) => {
      if (typeof hook === 'object' && hook !== null) {
        const h = hook as Record<string, unknown>;
        const innerHooks = h.hooks as Array<Record<string, unknown>> | undefined;
        return innerHooks?.some(innerHook =>
          typeof innerHook.command === 'string' && innerHook.command.includes(searchStr)
        );
      }
      return false;
    });
  };

  // Add Stop hook for running afterburn at session end
  // The hook extracts transcript_path from stdin and passes it to afterburn
  if (!hookExists(existingStopHooks, 'afterburn')) {
    existingStopHooks.push({
      matcher: '',
      hooks: [
        {
          type: 'command',
          command: stopHookCommand,
        },
      ],
    });
  }

  settings.hooks = {
    ...existingHooks,
    Stop: existingStopHooks,
  };

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

  // IMPORTANT: If settings.local.json exists with hooks, we need to update it too
  // because settings.local.json takes precedence over settings.json
  const localSettingsPath = path.join(claudeDir, 'settings.local.json');
  let updatedLocalSettings = false;

  if (sharing === 'team' && fs.existsSync(localSettingsPath)) {
    try {
      const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf-8')) as Record<string, unknown>;

      // Check if local settings has hooks defined - update Stop hook if needed
      if (localSettings.hooks) {
        const localHooks = localSettings.hooks as Record<string, unknown[]>;
        const localStopHooks = (localHooks.Stop as unknown[]) || [];

        // Update Stop hook to use the new command
        if (!hookExists(localStopHooks, 'afterburn')) {
          localStopHooks.push({
            matcher: '',
            hooks: [
              {
                type: 'command',
                command: stopHookCommand,
              },
            ],
          });
        }

        localSettings.hooks = {
          ...localHooks,
          Stop: localStopHooks,
        };

        fs.writeFileSync(localSettingsPath, JSON.stringify(localSettings, null, 2));
        updatedLocalSettings = true;
      }
    } catch {
      // Ignore errors reading local settings
    }
  }

  const displayPath = scope === 'global' ? '~/.claude' : '.claude';
  const sharingLabel = sharing === 'team' ? 'team-shared' : 'personal';
  console.log(chalk.green(`✓ Created Claude Code hooks (${scope}, ${sharingLabel})`));
  console.log(chalk.gray(`  ${displayPath}/${settingsFileName}`));
  if (updatedLocalSettings) {
    console.log(chalk.gray(`  ${displayPath}/settings.local.json (also updated)`));
  }
  console.log(chalk.gray(`  Hooks configured:`));
  console.log(chalk.gray(`    • Stop → Run Afterburn analysis (with session actions from transcript)`));

  if (scope === 'global') {
    console.log(chalk.gray('\n  Global hooks will run for all Claude Code sessions.'));
  }
  if (sharing === 'team') {
    console.log(chalk.gray('\n  💡 Commit .claude/settings.json to share hooks with your team.'));
  }
  if (updatedLocalSettings) {
    console.log(chalk.yellow('\n  ⚠️  Also updated settings.local.json (takes precedence over settings.json)'));
  }
}

/**
 * Setup Codex (OpenAI) hooks for automatic analysis
 * @param cwd - Current working directory (project path)
 * @param projectName - Name of the project
 * @param scope - 'project' for local .codex/ or 'global' for ~/.codex/
 * @param sharing - 'team' for config.json (shared) or 'personal' for config.local.json (gitignored)
 */
async function setupCodexHooks(cwd: string, _projectName: string, scope: 'project' | 'global', sharing: 'team' | 'personal'): Promise<void> {
  const homeDir = os.homedir();
  const codexDir = scope === 'global'
    ? path.join(homeDir, '.codex')
    : path.join(cwd, '.codex');

  // Create .codex directory if it doesn't exist
  if (!fs.existsSync(codexDir)) {
    fs.mkdirSync(codexDir, { recursive: true });
  }

  // Determine config file based on sharing preference
  const configFileName = sharing === 'team' ? 'config.json' : 'config.local.json';
  const configPath = path.join(codexDir, configFileName);
  let config: Record<string, unknown> = {};

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      // Ignore parse errors, start fresh
    }
  }

  // Use correct Codex hooks format (similar to Claude Code)
  const hookCommand = 'npx afterburn --since="1h" --quiet';

  // Merge with existing hooks if present
  const existingHooks = (config.hooks as Record<string, unknown[]>) || {};
  const existingStopHooks = (existingHooks.Stop as unknown[]) || [];

  // Check if afterburn hook already exists
  const afterburnHookExists = existingStopHooks.some((hook: unknown) => {
    if (typeof hook === 'object' && hook !== null) {
      const h = hook as Record<string, unknown>;
      const hooks = h.hooks as Array<Record<string, unknown>> | undefined;
      return hooks?.some(innerHook =>
        typeof innerHook.command === 'string' && innerHook.command.includes('afterburn')
      );
    }
    return false;
  });

  if (!afterburnHookExists) {
    existingStopHooks.push({
      matcher: '',
      hooks: [
        {
          type: 'command',
          command: hookCommand,
        },
      ],
    });
  }

  config.hooks = {
    ...existingHooks,
    Stop: existingStopHooks,
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  const displayPath = scope === 'global' ? '~/.codex' : '.codex';
  const sharingLabel = sharing === 'team' ? 'team-shared' : 'personal';
  console.log(chalk.green(`✓ Created Codex hooks (${scope}, ${sharingLabel})`));
  console.log(chalk.gray(`  ${displayPath}/${configFileName}`));
  console.log(chalk.gray(`  Hook event: Stop (runs when session ends)`));

  if (scope === 'global') {
    console.log(chalk.gray('\n  Global hooks will run for all Codex sessions.'));
  }
  if (sharing === 'team') {
    console.log(chalk.gray('\n  💡 Commit .codex/config.json to share hooks with your team.'));
  }
}

// Setup command
program
  .command('setup')
  .description('Interactive setup wizard for first-time configuration')
  .action(async () => {
    await runSetupWizard();
  });

// Init command
program
  .command('init')
  .description('Create a .afterburnrc configuration file')
  .option('--force', 'Overwrite existing config file')
  .option('--format <format>', 'Config format: json or js', 'json')
  .option('-i, --interactive', 'Interactive mode with prompts')
  .option('-y, --yes', 'Accept all defaults (non-interactive)')
  .action(async (options: { force?: boolean; format?: string; interactive?: boolean; yes?: boolean }) => {
    const cwd = process.cwd();
    const existingConfig = findConfigFile(cwd);

    if (existingConfig && !options.force) {
      console.log(chalk.yellow(`Config file already exists: ${existingConfig}`));
      console.log(chalk.gray('Use --force to overwrite'));
      process.exit(1);
    }

    // Detect project type
    const projectInfo = detectProjectType(cwd);

    console.log(chalk.cyan('\nAfterburn Configuration Setup\n'));
    console.log(chalk.gray('Detected project:'));
    console.log(chalk.white(`  Type: ${projectInfo.type}`));
    if (projectInfo.frameworks.length > 0) {
      console.log(chalk.white(`  Frameworks: ${projectInfo.frameworks.join(', ')}`));
    }
    console.log();

    // Default config
    const config: Partial<AfterburnerConfig> = {
      rules: {},
      ignore: [
        'node_modules/**',
        'dist/**',
        'build/**',
        'coverage/**',
        '.git/**',
        '*.min.js',
      ],
      session: {
        window: '4h',
        outputDir: '.afterburn',
      },
      output: {
        format: 'markdown',
        includeAIProvider: true,
      },
    };

    // Add language-specific ignores based on detected type
    if (projectInfo.type === 'node' || projectInfo.type === 'mixed') {
      config.ignore?.push('package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock');
    }
    if (projectInfo.type === 'python' || projectInfo.type === 'mixed') {
      config.ignore?.push('__pycache__/**', '*.pyc', '.venv/**', 'venv/**', '*.egg-info/**');
    }
    if (projectInfo.type === 'go') {
      config.ignore?.push('vendor/**');
    }
    if (projectInfo.type === 'rust') {
      config.ignore?.push('target/**', 'Cargo.lock');
    }

    // Interactive mode
    if (options.interactive && !options.yes) {
      // Strictness level
      const strictness = await promptChoice(
        'Choose strictness level:',
        ['Relaxed (info only)', 'Standard (warnings + errors)', 'Strict (all errors)'],
        1
      );

      if (strictness.includes('Relaxed')) {
        config.rules = {
          AB001: 'error',  // Credentials always error
          AB002: 'info',
          AB003: 'info',
          AB004: 'info',
          AB005: 'info',
          AB006: 'info',
          AB007: 'error',  // Security always error
          AB008: 'info',
          AB009: 'info',
          AB010: 'info',
        };
      } else if (strictness.includes('Strict')) {
        config.rules = {
          AB001: 'error',
          AB002: 'error',
          AB003: 'error',
          AB004: 'warn',
          AB005: 'error',
          AB006: 'warn',
          AB007: 'error',
          AB008: 'warn',
          AB009: 'warn',
          AB010: 'warn',
        };
      }
      // Standard uses defaults

      // Session window
      console.log();
      const window = await prompt('Session time window', '4h');
      config.session = { ...config.session, window };

      // LLM provider
      console.log();
      const useLLM = await prompt('Configure LLM for AI summaries? (y/n)', 'n');
      if (useLLM.toLowerCase() === 'y') {
        const provider = await promptChoice(
          'Choose LLM provider:',
          ['OpenRouter (recommended)', 'OpenAI', 'Anthropic', 'Ollama (local)'],
          0
        );

        const providerMap: Record<string, string> = {
          'OpenRouter (recommended)': 'openrouter',
          'OpenAI': 'openai',
          'Anthropic': 'anthropic',
          'Ollama (local)': 'ollama',
        };

        const modelDefaults: Record<string, string> = {
          openrouter: 'openai/gpt-4o-mini',
          openai: 'gpt-4o-mini',
          anthropic: 'claude-sonnet-4-20250514',
          ollama: 'llama3',
        };

        const envVars: Record<string, string> = {
          openrouter: 'OPENROUTER_API_KEY',
          openai: 'OPENAI_API_KEY',
          anthropic: 'ANTHROPIC_API_KEY',
          ollama: '',
        };

        const p = providerMap[provider];
        config.llm = {
          provider: p,
          model: modelDefaults[p],
          apiKey: envVars[p] ? `env:${envVars[p]}` : undefined,
        };

        if (envVars[p]) {
          console.log(chalk.gray(`\n  Set ${envVars[p]} in your environment to enable LLM features.`));
        }
      }
    }

    // Determine file name and write
    const fileName = options.format === 'js' ? 'afterburn.config.js' : '.afterburnrc';
    const configPath = path.join(cwd, fileName);

    writeConfigFile(configPath, config);

    console.log();
    console.log(chalk.green(`✓ Created ${fileName}`));
    console.log();
    console.log(chalk.gray('Configuration options:'));
    console.log(chalk.gray('  rules     - Configure rule severities (error, warn, info, off)'));
    console.log(chalk.gray('  ignore    - Glob patterns for files to skip'));
    console.log(chalk.gray('  session   - Session detection settings'));
    console.log(chalk.gray('  output    - Report output settings'));
    console.log();

    // Offer to add to .gitignore
    const gitignorePath = path.join(cwd, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('.afterburn')) {
        if (options.interactive && !options.yes) {
          const addGitignore = await prompt('Add .afterburn/ to .gitignore? (y/n)', 'y');
          if (addGitignore.toLowerCase() === 'y') {
            fs.appendFileSync(gitignorePath, '\n# Afterburn reports\n.afterburn/\n');
            console.log(chalk.green('✓ Added .afterburn/ to .gitignore'));
          }
        } else {
          console.log(chalk.yellow('Tip: Add .afterburn/ to your .gitignore'));
        }
      }
    }

    console.log();
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.gray('  1. Run'), chalk.white('afterburn ./'), chalk.gray('to analyze your project'));
    console.log(chalk.gray('  2. Run'), chalk.white('afterburn hook install'), chalk.gray('to add pre-commit hook'));
  });

// Hook command
program
  .command('hook')
  .description('Manage git hooks')
  .argument('<action>', 'Action: install, uninstall')
  .option('--fail-on-warnings', 'Fail pre-commit if warnings are found')
  .option('--max-errors <n>', 'Maximum allowed errors before failing (default: 0)', parseInt)
  .action(async (action: string, options: { failOnWarnings?: boolean; maxErrors?: number }) => {
    const cwd = process.cwd();
    const gitDir = path.join(cwd, '.git');
    const hooksDir = path.join(gitDir, 'hooks');
    const preCommitPath = path.join(hooksDir, 'pre-commit');

    if (!fs.existsSync(gitDir)) {
      console.error(chalk.red('Error: Not a git repository'));
      console.log(chalk.gray('Run this command from your project root'));
      process.exit(1);
    }

    if (action === 'install') {
      // Create hooks directory if it doesn't exist
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }

      // Build hook script
      const failOnWarnings = options.failOnWarnings ? ' --fail-on-warnings' : '';
      const maxErrors = options.maxErrors !== undefined ? ` --max-errors ${options.maxErrors}` : '';

      const hookScript = `#!/bin/sh
# Afterburn pre-commit hook
# Auto-generated by: afterburn hook install

# Run afterburn on staged changes
npx afterburn --staged-only --ci${failOnWarnings}${maxErrors}

# Exit with afterburn's exit code
exit $?
`;

      // Check for existing hook
      if (fs.existsSync(preCommitPath)) {
        const existingContent = fs.readFileSync(preCommitPath, 'utf-8');
        if (existingContent.includes('afterburn')) {
          console.log(chalk.yellow('Afterburn hook already installed'));
          console.log(chalk.gray('Use `afterburn hook uninstall` to remove it first'));
          process.exit(0);
        }

        // Append to existing hook
        const updatedHook = existingContent + '\n\n' + hookScript.split('\n').slice(3).join('\n');
        fs.writeFileSync(preCommitPath, updatedHook, { mode: 0o755 });
        console.log(chalk.green('Afterburn added to existing pre-commit hook'));
      } else {
        // Create new hook
        fs.writeFileSync(preCommitPath, hookScript, { mode: 0o755 });
        console.log(chalk.green('Pre-commit hook installed'));
      }

      console.log();
      console.log(chalk.gray('The hook will run before each commit and check for:'));
      console.log(chalk.gray('  - Security vulnerabilities'));
      console.log(chalk.gray('  - Hardcoded credentials'));
      console.log(chalk.gray('  - Hallucinated dependencies'));
      console.log();
      console.log(chalk.gray('To skip the hook, use: git commit --no-verify'));
      return;
    }

    if (action === 'uninstall') {
      if (!fs.existsSync(preCommitPath)) {
        console.log(chalk.yellow('No pre-commit hook found'));
        process.exit(0);
      }

      const content = fs.readFileSync(preCommitPath, 'utf-8');

      if (!content.includes('afterburn')) {
        console.log(chalk.yellow('Afterburn hook not found in pre-commit'));
        process.exit(0);
      }

      // Check if it's our standalone hook
      if (content.includes('# Afterburn pre-commit hook') && content.trim().split('\n').length <= 10) {
        // Remove the entire hook file
        fs.unlinkSync(preCommitPath);
        console.log(chalk.green('Pre-commit hook removed'));
      } else {
        // Remove just the afterburn section
        const lines = content.split('\n');
        const filteredLines: string[] = [];
        let skipUntilExit = false;

        for (const line of lines) {
          if (line.includes('npx afterburn')) {
            skipUntilExit = true;
            continue;
          }
          if (skipUntilExit && line.includes('exit $?')) {
            skipUntilExit = false;
            continue;
          }
          if (!skipUntilExit) {
            filteredLines.push(line);
          }
        }

        fs.writeFileSync(preCommitPath, filteredLines.join('\n'), { mode: 0o755 });
        console.log(chalk.green('Afterburn removed from pre-commit hook'));
      }
      return;
    }

    console.error(chalk.red(`Unknown action: ${action}`));
    console.log(chalk.gray('Available actions: install, uninstall'));
    process.exit(1);
  });

// Config command
program
  .command('config')
  .description('Manage configuration')
  .argument('<action>', 'Action: set, get, list')
  .argument('[key]', 'Configuration key (dot notation: rules.AB001)')
  .argument('[value]', 'Configuration value')
  .action(async (action: string, key?: string, value?: string) => {
    const cwd = process.cwd();
    const configPath = findConfigFile(cwd);

    if (action === 'list') {
      // List all configuration
      const { config, configPath: foundPath } = await loadConfig(cwd);

      if (foundPath) {
        console.log(chalk.gray(`Config file: ${foundPath}`));
      } else {
        console.log(chalk.gray('No config file found, using defaults'));
      }
      console.log();
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    if (action === 'get') {
      if (!key) {
        console.error(chalk.red('Error: key is required for get'));
        process.exit(1);
      }

      const { config } = await loadConfig(cwd);
      const configValue = getConfigValue(config, key);

      if (configValue === undefined) {
        console.log(chalk.gray('(not set)'));
      } else {
        console.log(typeof configValue === 'object'
          ? JSON.stringify(configValue, null, 2)
          : String(configValue)
        );
      }
      return;
    }

    if (action === 'set') {
      if (!key) {
        console.error(chalk.red('Error: key is required for set'));
        process.exit(1);
      }
      if (value === undefined) {
        console.error(chalk.red('Error: value is required for set'));
        process.exit(1);
      }

      // Load existing config or use defaults
      let config: AfterburnerConfig;
      let targetPath: string;

      if (configPath) {
        const result = await loadConfig(cwd);
        config = result.config;
        targetPath = configPath;
      } else {
        config = { ...DEFAULT_CONFIG };
        targetPath = path.join(cwd, '.afterburnrc');
      }

      // Parse value (handle JSON, booleans, numbers)
      let parsedValue: unknown = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (value === 'null') parsedValue = null;
      else if (/^-?\d+$/.test(value)) parsedValue = parseInt(value, 10);
      else if (/^-?\d*\.\d+$/.test(value)) parsedValue = parseFloat(value);
      else {
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // Keep as string
        }
      }

      // Update config
      const updatedConfig = setConfigValue(config, key, parsedValue);

      // Write back
      writeConfigFile(targetPath, updatedConfig);

      console.log(chalk.green(`✓ Set ${key} = ${JSON.stringify(parsedValue)}`));
      console.log(chalk.gray(`  in ${targetPath}`));
      return;
    }

    console.error(chalk.red(`Unknown action: ${action}`));
    console.log(chalk.gray('Available actions: set, get, list'));
    process.exit(1);
  });

// Watch command
program
  .command('watch')
  .alias('w')
  .description('Watch for file changes and re-run analysis')
  .argument('[path]', 'Path to watch', './')
  .option('--debounce <ms>', 'Debounce delay in milliseconds', '1000')
  .option('--ignore <patterns>', 'Additional patterns to ignore (comma-separated)')
  .option('--since <timespec>', 'Scope analysis to changes since timespec', '4h')
  .option('--verbose', 'Show verbose output')
  .option('--quiet', 'Suppress output')
  .action(async (targetPath: string, options: { debounce?: string; ignore?: string; since?: string; verbose?: boolean; quiet?: boolean }) => {
    const absolutePath = path.resolve(targetPath);
    const debounceMs = parseInt(options.debounce || '1000', 10);
    const quiet = options.quiet ?? false;
    const verbose = options.verbose ?? false;

    // Verify it's a git repo
    if (!await isGitRepo(absolutePath)) {
      console.error(chalk.red('Error: Not a git repository'));
      process.exit(1);
    }

    // Load config for ignore patterns
    const { config } = await loadConfig(absolutePath);
    const ignorePatterns = [
      ...(config.ignore ?? []),
      ...(options.ignore?.split(',').map(p => p.trim()) ?? []),
      '.afterburn/**',
      '.git/**',
    ];

    if (!quiet) {
      console.log(chalk.cyan('Afterburn Watch Mode'));
      console.log(chalk.gray('━'.repeat(40)));
      console.log(chalk.gray(`  Watching: ${absolutePath}`));
      console.log(chalk.gray(`  Debounce: ${debounceMs}ms`));
      console.log(chalk.gray(`  Press Ctrl+C to stop`));
      console.log();
    }

    let analysisRunning = false;
    let pendingAnalysis = false;
    let debounceTimer: NodeJS.Timeout | null = null;

    const runWatchAnalysis = async () => {
      if (analysisRunning) {
        pendingAnalysis = true;
        return;
      }

      analysisRunning = true;
      const startTime = Date.now();

      try {
        if (!quiet) {
          console.log(chalk.yellow(`\n[${new Date().toLocaleTimeString()}] Changes detected, analyzing...`));
        }

        await runAnalyze(targetPath, {
          since: options.since ?? '4h',
          yes: true,
          quiet: true,
          verbose: false,
        });

        const duration = Date.now() - startTime;
        if (!quiet) {
          console.log(chalk.green(`[${new Date().toLocaleTimeString()}] Analysis complete (${duration}ms)`));
        }
      } catch (error) {
        if (verbose) {
          console.error(chalk.red('Analysis failed:'), error);
        }
      } finally {
        analysisRunning = false;
        if (pendingAnalysis) {
          pendingAnalysis = false;
          runWatchAnalysis();
        }
      }
    };

    // Set up file watcher
    const watcher = chokidar.watch(absolutePath, {
      ignored: ignorePatterns.map(p => {
        // Convert glob to regex-like patterns for chokidar
        if (p.includes('**')) {
          return new RegExp(p.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        }
        return p;
      }),
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    });

    watcher.on('change', (filePath) => {
      if (verbose && !quiet) {
        console.log(chalk.gray(`  Changed: ${path.relative(absolutePath, filePath)}`));
      }

      // Debounce
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(runWatchAnalysis, debounceMs);
    });

    watcher.on('add', (filePath) => {
      if (verbose && !quiet) {
        console.log(chalk.gray(`  Added: ${path.relative(absolutePath, filePath)}`));
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(runWatchAnalysis, debounceMs);
    });

    watcher.on('unlink', (filePath) => {
      if (verbose && !quiet) {
        console.log(chalk.gray(`  Deleted: ${path.relative(absolutePath, filePath)}`));
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(runWatchAnalysis, debounceMs);
    });

    watcher.on('error', (error) => {
      console.error(chalk.red('Watcher error:'), error);
    });

    // Run initial analysis
    if (!quiet) {
      console.log(chalk.gray('Running initial analysis...'));
    }
    await runWatchAnalysis();

    // Keep process running
    process.on('SIGINT', () => {
      if (!quiet) {
        console.log(chalk.yellow('\n\nStopping watch mode...'));
      }
      watcher.close();
      process.exit(0);
    });
  });

// Studio command
program
  .command('studio')
  .description('Launch Afterburn Studio - local dashboard to view session reports')
  .option('-p, --port <port>', 'Port to run the server on', '3333')
  .option('--path <path>', 'Path to project directory', './')
  .action(async (options: { port?: string; path?: string }) => {
    const projectPath = path.resolve(options.path ?? './');
    const port = parseInt(options.port ?? '3333', 10);

    // Check if .afterburn directory exists
    const afterburnDir = path.join(projectPath, '.afterburn');
    if (!fs.existsSync(afterburnDir)) {
      console.log(chalk.yellow('\n📭 No .afterburn directory found.\n'));
      console.log(chalk.gray('Run an analysis first to generate session reports:'));
      console.log(chalk.white('  afterburn ./\n'));
      process.exit(1);
    }

    console.log(chalk.cyan('\n🔥 Starting Afterburn Studio...\n'));
    await startStudio(projectPath, port);
  });

// Default action: if path is provided without command, run analyze
// If no config exists and no args, trigger setup wizard
program
  .argument('[path]', 'Path to analyze')
  .option('--explain', 'Include LLM-powered explanations')
  .option('-y, --yes', 'Auto-confirm LLM cost')
  .option('--since <timespec>', 'Scope analysis to changes since timespec', '4h')
  .option('--output <path>', 'Output path for report', './')
  .option('--json', 'Output in JSON format')
  .option('--ci', 'CI mode')
  .option('--fail-on-warnings', 'Fail CI if warnings are found')
  .option('--max-errors <n>', 'Maximum allowed errors', parseInt)
  .option('--staged-only', 'Analyze only staged changes')
  .option('--sync', 'Sync report to dashboard')
  .option('--verbose', 'Show verbose output')
  .option('--quiet', 'Suppress output')
  .option('--no-color', 'Disable colored output')
  .option('--transcript <path>', 'Path to Claude Code transcript file')
  .action(async (targetPath: string | undefined, options: AnalyzeOptions) => {
    const subcommands = ['analyze', 'init', 'config', 'watch', 'hook', 'studio', 'setup', 'help'];

    // If a path is provided (and it's not a subcommand), run analyze
    if (targetPath && !subcommands.includes(targetPath)) {
      await runAnalyze(targetPath, options);
    } else if (!targetPath) {
      // No path provided - check if this is first-time setup
      const cwd = process.cwd();
      const existingConfig = findConfigFile(cwd);

      // If no config exists and not in CI mode, offer setup wizard
      if (!existingConfig && !options.ci && !options.quiet) {
        console.log(chalk.cyan('\n🔥 Welcome to Afterburn!\n'));
        console.log(chalk.gray('No configuration file found in this project.\n'));

        const runSetup = await promptConfirm('Would you like to run the setup wizard?', true);
        if (runSetup) {
          await runSetupWizard();
          return;
        }

        console.log(chalk.gray('\nRunning with default settings...\n'));
      }

      // Run analyze on current directory
      await runAnalyze('./', options);
    }
  });

program.parse();
