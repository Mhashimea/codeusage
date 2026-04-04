import { Command } from "commander";
import chalk from "chalk";
import { checkPrompt } from "../lib/patterns.js";
import { isConfigured } from "../lib/config.js";

/**
 * UserPromptSubmit hook handler for Prompt Guard
 *
 * This hook is called by Claude Code before a prompt is sent to the AI model.
 * The prompt content is provided via stdin.
 *
 * Exit codes:
 *   0 = Allow prompt (no match or Prompt Guard disabled)
 *   2 = Block prompt (credential detected)
 */
export const hookUserPromptSubmitCommand = new Command("user-prompt-submit")
  .description("Handle UserPromptSubmit hook for Prompt Guard (internal)")
  .option("--dry-run", "Check prompt but don't block (for testing)")
  .action(async (options) => {
    // Silent exit if not configured
    if (!isConfigured()) {
      process.exit(0);
    }

    // Read prompt from stdin
    const prompt = await readStdin();

    if (!prompt || prompt.trim().length === 0) {
      // Empty prompt, allow through
      process.exit(0);
    }

    // Check prompt against patterns
    const result = checkPrompt(prompt);

    // Handle warning (stale cache, missing cache, etc.)
    if (result.warning && !result.blocked) {
      // Print warning to stderr so it doesn't interfere with stdout
      console.error(chalk.dim(`afterburn: ${result.warning}`));
    }

    // If not blocked, allow through
    if (!result.blocked || !result.match) {
      process.exit(0);
    }

    // Prompt is blocked - print warning message
    printBlockMessage(result.match.pattern.name, result.match.pattern.description);

    // Exit with code 2 to block the prompt
    if (options.dryRun) {
      console.log(chalk.dim("\n(dry-run mode - prompt would be blocked)"));
      process.exit(0);
    }

    process.exit(2);
  });

/**
 * Read all input from stdin
 */
async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";

    // Check if stdin is available
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }

    process.stdin.setEncoding("utf8");

    process.stdin.on("readable", () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });

    process.stdin.on("end", () => {
      resolve(data);
    });

    // Timeout after 100ms in case stdin is empty
    setTimeout(() => {
      resolve(data);
    }, 100);
  });
}

/**
 * Print the blocked prompt warning message
 */
function printBlockMessage(patternName: string, description: string): void {
  const divider = chalk.gray("─".repeat(60));

  console.log();
  console.log(divider);
  console.log();
  console.log(
    chalk.yellow("⚠"),
    chalk.yellow.bold(" afterburn · prompt blocked")
  );
  console.log();
  console.log(divider);
  console.log();
  console.log(`  ${chalk.gray("Reason:")}  ${chalk.yellow(description)}`);
  console.log(`  ${chalk.gray("Pattern:")} ${patternName}`);
  console.log();
  console.log(
    `  Your prompt was ${chalk.yellow("not sent")} to Claude Code.`
  );
  console.log("  Remove the sensitive value and try again.");
  console.log();
  console.log(divider);
}
