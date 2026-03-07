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
import { getSessionDiff, isGitRepo, type GitDiff } from './git/index.js';
import { formatDuration } from './utils/timespec.js';
import { generateMarkdownReport } from './reporter/index.js';

interface AnalyzeOptions {
  explain?: boolean;
  since?: string;
  output?: string;
  json?: boolean;
  ci?: boolean;
  verbose?: boolean;
  quiet?: boolean;
}

const program = new Command();

program
  .name('afterburn')
  .description('Post-session intelligence for AI-assisted coding')
  .version('0.1.0-beta');

/**
 * Display session summary in terminal
 */
function displaySessionSummary(diff: GitDiff, duration: number): void {
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

  // Placeholder for risk report (Phase 1 Sprint 2)
  console.log(chalk.bold('Risk Report'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.gray('  Static analysis rules not yet implemented.'));
  console.log(chalk.gray('  Coming in Sprint 2: credential detection, error handling, type assertions.'));
  console.log();

  // Placeholder for dependency audit (Phase 1 Sprint 3)
  console.log(chalk.bold('Dependency Audit'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.gray('  Dependency checking not yet implemented.'));
  console.log(chalk.gray('  Coming in Sprint 3: npm registry verification, hallucinated package detection.'));
  console.log();

  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════'));
  console.log();
}

/**
 * Display JSON output
 */
function displayJsonOutput(diff: GitDiff, duration: number): void {
  const output = {
    version: '0.1.0-beta',
    timestamp: new Date().toISOString(),
    analysisDuration: duration,
    stats: diff.stats,
    commits: diff.commits.map(c => ({
      hash: c.hash,
      message: c.message,
      author: c.author,
      date: c.date.toISOString(),
    })),
    files: diff.files,
    risks: [], // Placeholder for Sprint 2
    dependencies: [], // Placeholder for Sprint 3
  };

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Run the analyze command
 */
async function runAnalyze(targetPath: string, options: AnalyzeOptions): Promise<void> {
  const startTime = Date.now();

  // Resolve absolute path
  const absolutePath = path.resolve(targetPath);

  // Check if quiet mode
  const quiet = options.quiet ?? false;
  const jsonOutput = options.json ?? false;

  // Create spinner (only if not quiet and not json)
  const spinner = !quiet && !jsonOutput
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
      spinner.text = 'Reading git history...';
    }

    // Get session diff
    const since = options.since ?? '4h';
    const diff = await getSessionDiff(absolutePath, since);

    const duration = Date.now() - startTime;

    spinner?.succeed(`Analysis complete in ${formatDuration(duration)}`);

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
      analysisTime: duration,
      projectPath: absolutePath,
      since,
    });

    fs.writeFileSync(reportPath, markdownReport, 'utf-8');

    if (!quiet && !jsonOutput) {
      console.log(chalk.green(`\n📄 Report saved to: ${reportPath}\n`));
    }

    // Output results
    if (jsonOutput) {
      displayJsonOutput(diff, duration);
    } else if (!quiet) {
      displaySessionSummary(diff, duration);
    }

    // CI mode exit codes
    if (options.ci) {
      // For now, always exit 0 since we don't have rules yet
      // In Sprint 2+, this will exit 1 if errors are found
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
  .option('--since <timespec>', 'Scope analysis to changes since timespec', '4h')
  .option('--output <path>', 'Output path for report', './')
  .option('--json', 'Output in JSON format')
  .option('--ci', 'CI mode - exit with error code based on findings')
  .option('--verbose', 'Show verbose output including errors')
  .option('--quiet', 'Suppress all output except errors')
  .action(async (targetPath: string, options: AnalyzeOptions) => {
    await runAnalyze(targetPath, options);
  });

// Init command
program
  .command('init')
  .description('Create a .afterburnrc configuration file')
  .action(() => {
    console.log(chalk.yellow('Not implemented yet - coming in Sprint 6'));
    process.exit(0);
  });

// Config command
program
  .command('config')
  .description('Manage configuration')
  .argument('<action>', 'Action: set, get, list')
  .argument('[key]', 'Configuration key')
  .argument('[value]', 'Configuration value')
  .action((_action: string, _key?: string, _value?: string) => {
    console.log(chalk.yellow('Not implemented yet - coming in Sprint 6'));
    process.exit(0);
  });

// Default action: if path is provided without command, run analyze
program
  .argument('[path]', 'Path to analyze')
  .option('--explain', 'Include LLM-powered explanations')
  .option('--since <timespec>', 'Scope analysis to changes since timespec', '4h')
  .option('--output <path>', 'Output path for report', './')
  .option('--json', 'Output in JSON format')
  .option('--ci', 'CI mode')
  .option('--verbose', 'Show verbose output')
  .option('--quiet', 'Suppress output')
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
