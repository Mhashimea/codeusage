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

const program = new Command();

program
  .name('afterburn')
  .description('Post-session intelligence for AI-assisted coding')
  .version('0.1.0-beta');

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
  .action((_path: string, _options: Record<string, unknown>) => {
    // TODO: Implement analyze command
    console.error('Not implemented yet');
    process.exit(1);
  });

program
  .command('init')
  .description('Create a .afterburnrc configuration file')
  .action(() => {
    // TODO: Implement init command
    console.error('Not implemented yet');
    process.exit(1);
  });

program
  .command('config')
  .description('Manage configuration')
  .argument('<action>', 'Action: set, get, list')
  .argument('[key]', 'Configuration key')
  .argument('[value]', 'Configuration value')
  .action((_action: string, _key?: string, _value?: string) => {
    // TODO: Implement config command
    console.error('Not implemented yet');
    process.exit(1);
  });

// Default command: analyze current directory
program
  .argument('[path]', 'Path to analyze')
  .option('--explain', 'Include LLM-powered explanations')
  .option('--since <timespec>', 'Scope analysis to changes since timespec')
  .option('--output <path>', 'Output path for report')
  .option('--json', 'Output in JSON format')
  .option('--ci', 'CI mode')
  .action((path: string | undefined, _options: Record<string, unknown>) => {
    if (path && !path.startsWith('-')) {
      // TODO: Run analyze on path
      console.error('Not implemented yet');
      process.exit(1);
    }
  });

program.parse();
