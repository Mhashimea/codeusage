import { Command } from "commander";
import chalk from "chalk";
import * as readline from "readline";
import { clearConfig, getConfig, isConfigured, getProvider } from "../lib/config.js";
import { unregisterHooks } from "../lib/hooks-file.js";
import { clearBuffer } from "../lib/buffer.js";
import { getProviderById } from "@afterburn/shared";

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

export const logoutCommand = new Command("logout")
  .description("Disconnect from Afterburn and remove local configuration")
  .option("-f, --force", "Skip confirmation prompt")
  .action(async (options) => {
    if (!isConfigured()) {
      console.log(chalk.dim("\nNot configured. Nothing to logout from.\n"));
      return;
    }

    if (!options.force) {
      const confirmed = await confirm(
        chalk.yellow("\nThis will remove all local configuration. Continue? (y/N): ")
      );
      if (!confirmed) {
        console.log(chalk.dim("Cancelled.\n"));
        return;
      }
    }

    const config = getConfig();
    const cwd = process.cwd();
    const providerId = getProvider();
    const providerInfo = getProviderById(providerId);

    console.log(chalk.dim("\nCleaning up..."));

    // Unregister hooks from both scopes for the current provider
    await unregisterHooks("global", cwd, providerId);
    await unregisterHooks("project", cwd, providerId);
    console.log(chalk.dim(`  ✓ ${providerInfo?.displayName || providerId} hooks unregistered`));

    // Clear buffer
    const bufferedCount = await clearBuffer();
    if (bufferedCount > 0) {
      console.log(chalk.dim(`  ✓ Cleared ${bufferedCount} buffered task(s)`));
    }

    // Clear config
    clearConfig();
    console.log(chalk.dim("  ✓ Configuration cleared"));

    console.log(chalk.green("\n✓ Logged out successfully\n"));
    console.log(chalk.dim("Run 'afterburn init' to reconnect.\n"));
  });
