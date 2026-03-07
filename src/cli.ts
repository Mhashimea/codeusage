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
import { getSessionDiff, isGitRepo, getFileContent, type GitDiff } from './git/index.js';
import { formatDuration } from './utils/timespec.js';
import { generateMarkdownReport } from './reporter/index.js';
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
  formatLLMAnalysisForReport,
  resolveApiKey,
  formatCost,
  estimateTokenCount,
  estimateCost,
  type LLMConfig,
  type LLMAnalysisResult,
} from './llm/index.js';
import * as readline from 'readline';

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
        console.error(chalk.red(`Error: ${absolutePath} is not a git repository`));
      }
      process.exit(2);
    }

    if (spinner) {
      spinner.text = 'Loading configuration...';
    }

    // Load configuration
    const { config, configPath, errors: configErrors } = await loadConfig(absolutePath);
    if (configErrors.length > 0 && !quiet) {
      for (const err of configErrors) {
        console.warn(chalk.yellow(`Config warning: ${err}`));
      }
    }
    if (configPath && options.verbose) {
      console.log(chalk.gray(`Using config: ${configPath}`));
    }

    if (spinner) {
      spinner.text = 'Reading git history...';
    }

    // Get session diff - use config session window if not overridden
    const since = options.since ?? config.session?.window ?? '4h';
    const diff = await getSessionDiff(absolutePath, since);

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
    });
    const findings: RiskFinding[] = [];

    for (const file of diff.files) {
      // Skip deleted files
      if (file.status === 'deleted') {
        continue;
      }

      try {
        const content = await getFileContent(absolutePath, file.path);
        if (content) {
          const fileFindings = ruleRunner.run(content, file.path);
          findings.push(...fileFindings);
        }
      } catch {
        // File couldn't be read, skip it
      }
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

    if (options.explain) {
      // Check for LLM config
      const llmConfig = config.llm as LLMConfig | undefined;
      const resolvedApiKey = llmConfig?.apiKey ? resolveApiKey(llmConfig.apiKey) : undefined;

      if (!llmConfig || !resolvedApiKey) {
        if (spinner) {
          spinner.warn('LLM analysis skipped: No API key configured');
        } else if (!quiet && !jsonOutput) {
          console.warn(chalk.yellow('⚠️  --explain requires LLM configuration. Set llm.apiKey in .afterburnrc'));
        }
      } else {
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
              const errMsg = error instanceof Error ? error.message : 'Unknown error';
              if (spinner) {
                spinner.warn(`LLM analysis failed: ${errMsg}`);
              } else if (!quiet && !jsonOutput) {
                console.warn(chalk.yellow(`⚠️  LLM analysis failed: ${errMsg}`));
              }
            }
          }
        } else {
          // Auto-confirm mode (CI, --yes, free model, etc.)
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
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            if (spinner) {
              spinner.warn(`LLM analysis failed: ${errMsg}`);
            } else if (!quiet && !jsonOutput) {
              console.warn(chalk.yellow(`⚠️  LLM analysis failed: ${errMsg}`));
            }
          }
        }
      }
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

    let markdownReport = generateMarkdownReport({
      diff,
      findings: sortedFindings,
      dependencies: auditResult?.dependencies,
      analysisTime: duration,
      projectPath: absolutePath,
      since,
      aiProvider,
    });

    // Append LLM analysis to report if available
    if (llmAnalysis) {
      markdownReport += '\n\n' + formatLLMAnalysisForReport(llmAnalysis);
    }

    fs.writeFileSync(reportPath, markdownReport, 'utf-8');

    if (!quiet && !jsonOutput) {
      console.log(chalk.green(`\n📄 Report saved to: ${reportPath}\n`));
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
  .option('--verbose', 'Show verbose output including errors')
  .option('--quiet', 'Suppress all output except errors')
  .option('--no-color', 'Disable colored output (for CI environments)')
  .action(async (targetPath: string, options: AnalyzeOptions) => {
    await runAnalyze(targetPath, options);
  });

// Init command
program
  .command('init')
  .description('Create a .afterburnrc configuration file')
  .option('--force', 'Overwrite existing config file')
  .option('--format <format>', 'Config format: json or js', 'json')
  .action((options: { force?: boolean; format?: string }) => {
    const cwd = process.cwd();
    const existingConfig = findConfigFile(cwd);

    if (existingConfig && !options.force) {
      console.log(chalk.yellow(`Config file already exists: ${existingConfig}`));
      console.log(chalk.gray('Use --force to overwrite'));
      process.exit(1);
    }

    // Detect project type
    const hasPackageJson = fs.existsSync(path.join(cwd, 'package.json'));
    const hasRequirements = fs.existsSync(path.join(cwd, 'requirements.txt'));
    const hasPyproject = fs.existsSync(path.join(cwd, 'pyproject.toml'));

    // Create initial config
    const config: Partial<AfterburnerConfig> = {
      rules: {
        // All rules enabled by default, user can customize
      },
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

    // Add language-specific ignores
    if (hasPackageJson) {
      config.ignore?.push('package-lock.json', 'yarn.lock', 'pnpm-lock.yaml');
    }
    if (hasRequirements || hasPyproject) {
      config.ignore?.push('__pycache__/**', '*.pyc', '.venv/**', 'venv/**');
    }

    // Determine file name and write
    const fileName = options.format === 'js' ? 'afterburn.config.js' : '.afterburnrc';
    const configPath = path.join(cwd, fileName);

    writeConfigFile(configPath, config);

    console.log(chalk.green(`✓ Created ${fileName}`));
    console.log();
    console.log(chalk.gray('Configuration options:'));
    console.log(chalk.gray('  rules     - Configure rule severities (error, warn, info, off)'));
    console.log(chalk.gray('  ignore    - Glob patterns for files to skip'));
    console.log(chalk.gray('  session   - Session detection settings'));
    console.log(chalk.gray('  output    - Report output settings'));
    console.log();
    console.log(chalk.gray('Example rule configuration:'));
    console.log(chalk.cyan('  "rules": { "AB001": "error", "AB004": "off" }'));
    console.log();

    // Suggest adding to .gitignore
    const gitignorePath = path.join(cwd, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('.afterburn')) {
        console.log(chalk.yellow('Tip: Add .afterburn/ to your .gitignore'));
      }
    }
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

// Default action: if path is provided without command, run analyze
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
  .option('--verbose', 'Show verbose output')
  .option('--quiet', 'Suppress output')
  .option('--no-color', 'Disable colored output')
  .action(async (targetPath: string | undefined, options: AnalyzeOptions) => {
    // If a path is provided (and it's not a subcommand), run analyze
    if (targetPath && !['analyze', 'init', 'config', 'help'].includes(targetPath)) {
      await runAnalyze(targetPath, options);
    } else if (!targetPath) {
      // No path provided, run analyze on current directory
      await runAnalyze('./', options);
    }
  });

program.parse();
