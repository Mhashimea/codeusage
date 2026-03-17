import { Command } from "commander";
import chalk from "chalk";
import { getConfig, isConfigured, getConfigPath, getProvider } from "../lib/config.js";
import { areHooksRegistered, getSettingsPath } from "../lib/hooks-file.js";
import { getBufferCount } from "../lib/buffer.js";
import { detectProjectSlug } from "../lib/git.js";
import { getProviderById } from "@afterburn/shared";

export const statusCommand = new Command("status")
  .description("Show current Afterburn configuration and connection status")
  .action(async () => {
    console.log(chalk.bold("\n🔥 Afterburn Status\n"));

    if (!isConfigured()) {
      console.log(chalk.yellow("Not configured. Run: afterburn init\n"));
      return;
    }

    const config = getConfig();
    const cwd = process.cwd();

    // Get provider info
    const providerId = getProvider();
    const providerInfo = getProviderById(providerId);

    // Connection info
    console.log(chalk.bold("Connection:"));
    const maskedKey = config.workspace_key.slice(0, 10) + "••••••••••••";
    console.log(chalk.dim(`  API Key: ${maskedKey}`));
    console.log(chalk.dim(`  Developer: ${config.developer_alias}`));
    console.log(chalk.cyan(`  Provider: ${providerInfo?.displayName || providerId}`));
    console.log(chalk.dim(`  Scope: ${config.hook_scope}`));

    // Hook status
    console.log(chalk.bold("\nHooks:"));
    const globalHooks = await areHooksRegistered("global", cwd, providerId);
    const projectHooks = await areHooksRegistered("project", cwd, providerId);

    if (globalHooks) {
      console.log(chalk.green(`  ✓ Global hooks registered for ${providerInfo?.displayName || providerId}`));
      console.log(chalk.dim(`    ${getSettingsPath("global", cwd, providerId)}`));
    } else {
      console.log(chalk.dim(`  ○ Global hooks not registered`));
    }

    if (projectHooks) {
      console.log(chalk.green(`  ✓ Project hooks registered for ${providerInfo?.displayName || providerId}`));
      console.log(chalk.dim(`    ${getSettingsPath("project", cwd, providerId)}`));
    } else {
      console.log(chalk.dim(`  ○ Project hooks not registered`));
    }

    // Current project
    console.log(chalk.bold("\nCurrent Directory:"));
    console.log(chalk.dim(`  ${cwd}`));

    const projectSlug =
      config.project_overrides[cwd] || (await detectProjectSlug(cwd));
    if (config.project_overrides[cwd] === "__ignored__") {
      console.log(chalk.yellow(`  Project: (ignored)`));
    } else if (config.project_overrides[cwd]) {
      console.log(chalk.cyan(`  Project: ${projectSlug} (override)`));
    } else {
      console.log(chalk.cyan(`  Project: ${projectSlug} (auto-detected)`));
    }

    // Buffer status
    const bufferCount = await getBufferCount();
    if (bufferCount > 0) {
      console.log(chalk.bold("\nBuffer:"));
      console.log(
        chalk.yellow(`  ${bufferCount} task(s) pending sync`)
      );
      console.log(chalk.dim(`  Run 'afterburn sync' to flush`));
    }

    // Config path
    console.log(chalk.bold("\nConfig:"));
    console.log(chalk.dim(`  ${getConfigPath()}`));

    console.log();
  });
