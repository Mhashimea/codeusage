import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { CATEGORY_NAMES } from "@codeusage/shared";
import {
  loadPatternCache,
  syncPatternCache,
  checkPrompt,
  getCacheAge,
  isCacheStale,
  getPatternsByCategory,
  getPatternCachePath,
} from "../lib/patterns.js";
import { isConfigured } from "../lib/config.js";

/**
 * codeusage patterns - Prompt Guard pattern management commands
 */
export const patternsCommand = new Command("patterns")
  .description("Manage Prompt Guard pattern cache");

/**
 * codeusage patterns status
 */
patternsCommand
  .command("status")
  .description("Show Prompt Guard status and cache info")
  .action(async () => {
    if (!isConfigured()) {
      console.log(chalk.yellow("Not configured. Run: codeusage init"));
      process.exit(1);
    }

    const cache = loadPatternCache();

    if (!cache) {
      console.log(
        chalk.yellow("●"),
        "Prompt Guard:",
        chalk.yellow("not synced")
      );
      console.log();
      console.log(chalk.gray("  Pattern cache not found."));
      console.log(chalk.gray("  Run: codeusage patterns sync"));
      return;
    }

    // Status indicator
    if (cache.enabled) {
      if (isCacheStale(cache)) {
        console.log(
          chalk.yellow("●"),
          "Prompt Guard is",
          chalk.yellow("enabled"),
          chalk.dim("(cache stale)")
        );
      } else {
        console.log(
          chalk.green("●"),
          "Prompt Guard is",
          chalk.green("enabled")
        );
      }
    } else {
      console.log(
        chalk.gray("●"),
        "Prompt Guard is",
        chalk.gray("disabled")
      );
    }

    console.log();

    // Cache info
    const patternCount = cache.patterns.length;
    const categoryCount = Object.keys(getPatternsByCategory()).length;

    console.log(`  ${chalk.gray("Pattern cache:")}  ${isCacheStale(cache) ? chalk.yellow("⚠ Outdated") : chalk.green("✓ Valid")}`);
    console.log(`  ${chalk.gray("Patterns:")}       ${patternCount} patterns (${categoryCount} categories)`);
    console.log(`  ${chalk.gray("Last synced:")}    ${getCacheAge(cache)}`);

    if (isCacheStale(cache)) {
      console.log();
      console.log(chalk.yellow("  Your pattern cache is more than 7 days old."));
      console.log(chalk.yellow("  Run: codeusage patterns sync"));
    }
  });

/**
 * codeusage patterns list
 */
patternsCommand
  .command("list")
  .description("List all active patterns")
  .action(async () => {
    const grouped = getPatternsByCategory();

    let totalCount = 0;

    for (const [category, patterns] of Object.entries(grouped)) {
      const categoryName = CATEGORY_NAMES[category] || category;
      console.log(
        chalk.white.bold(categoryName),
        chalk.dim(`(${patterns.length})`)
      );

      for (const pattern of patterns) {
        console.log(`  ${chalk.gray("•")} ${pattern.name}`);
        totalCount++;
      }

      console.log();
    }

    console.log(chalk.dim(`${totalCount} patterns total`));
  });

/**
 * codeusage patterns sync
 */
patternsCommand
  .command("sync")
  .description("Sync patterns from workspace settings")
  .action(async () => {
    if (!isConfigured()) {
      console.log(chalk.yellow("Not configured. Run: codeusage init"));
      process.exit(1);
    }

    const spinner = ora("Fetching Prompt Guard settings...").start();

    const result = await syncPatternCache();

    if (!result.success) {
      spinner.fail(chalk.red(result.error));
      process.exit(1);
    }

    spinner.succeed(`Synced ${result.patternCount} patterns`);

    console.log();
    if (result.enabled) {
      console.log(chalk.green("Prompt Guard is active"));
    } else {
      console.log(chalk.gray("Prompt Guard is disabled by workspace admin"));
    }
  });

/**
 * codeusage patterns test <text>
 */
patternsCommand
  .command("test <text>")
  .description("Test a string against the pattern cache")
  .action(async (text: string) => {
    const result = checkPrompt(text);

    if (result.warning) {
      console.log(chalk.dim(`Warning: ${result.warning}`));
      console.log();
    }

    if (result.blocked && result.match) {
      console.log(chalk.yellow("⚠"), chalk.yellow("Match found"));
      console.log();
      console.log(`  ${chalk.gray("Pattern:")}  ${result.match.pattern.name}`);
      console.log(`  ${chalk.gray("Category:")} ${CATEGORY_NAMES[result.match.pattern.category] || result.match.pattern.category}`);
      console.log();
      console.log(chalk.dim("This text would be blocked."));
    } else {
      console.log(chalk.green("✓"), chalk.green("No match"));
      console.log();
      console.log(chalk.dim("This text would be allowed."));
    }
  });
