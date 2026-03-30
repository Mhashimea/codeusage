import { Command } from "commander";
import chalk from "chalk";
import {
  getAllProviders,
  getProviderById,
  isProviderActive,
  type ProviderId,
} from "@codeusage/shared";
import {
  getConfig,
  isConfigured,
  setProvider,
  getProvider,
} from "../lib/config.js";
import {
  registerHooks,
  unregisterHooks,
} from "../lib/hooks-file.js";

export const providerCommand = new Command("provider")
  .description("Manage AI coding tool providers");

// List all providers
providerCommand
  .command("list")
  .description("List all available providers")
  .action(() => {
    console.log(chalk.bold("\n🤖 Available Providers\n"));

    const providers = getAllProviders();
    const currentProvider = isConfigured() ? getProvider() : null;

    for (const provider of providers) {
      const isCurrent = provider.id === currentProvider;
      const statusBadge =
        provider.status === "active"
          ? chalk.green("[Active]")
          : provider.status === "coming_soon"
            ? chalk.yellow("[Coming Soon]")
            : chalk.blue("[Beta]");

      const currentBadge = isCurrent ? chalk.cyan(" ← current") : "";

      console.log(
        `  ${provider.displayName} ${statusBadge}${currentBadge}`
      );
      console.log(chalk.dim(`    ${provider.description}`));
      console.log();
    }
  });

// Show current provider
providerCommand
  .command("current")
  .description("Show the currently configured provider")
  .action(() => {
    if (!isConfigured()) {
      console.log(chalk.yellow("\nNot configured. Run: codeusage init\n"));
      return;
    }

    const providerId = getProvider();
    const provider = getProviderById(providerId);

    console.log(chalk.bold("\n🤖 Current Provider\n"));
    console.log(`  ${provider?.displayName || providerId}`);
    console.log(chalk.dim(`  ${provider?.description || ""}`));
    console.log();
  });

// Add an additional provider (keep existing hooks)
providerCommand
  .command("add <provider>")
  .description("Add hooks for an additional provider (keeps existing)")
  .action(async (newProviderId: string) => {
    if (!isConfigured()) {
      console.log(chalk.yellow("\nNot configured. Run: codeusage init\n"));
      return;
    }

    const newProvider = getProviderById(newProviderId);
    if (!newProvider) {
      console.log(chalk.red(`\nUnknown provider: ${newProviderId}`));
      console.log(chalk.dim("Run 'codeusage provider list' to see available providers.\n"));
      return;
    }

    if (!isProviderActive(newProviderId)) {
      console.log(
        chalk.yellow(`\n${newProvider.displayName} is coming soon!`)
      );
      console.log(chalk.dim("This provider is not yet available.\n"));
      return;
    }

    const config = getConfig();
    const cwd = process.cwd();

    console.log(chalk.bold(`\n📊 Adding ${newProvider.displayName}\n`));

    // Register hooks for the new provider
    console.log(chalk.dim(`  Registering ${newProvider.displayName} hooks...`));
    try {
      await registerHooks(config.hook_scope, cwd, newProviderId as ProviderId);
      console.log(chalk.green(`\n✓ ${newProvider.displayName} hooks registered!\n`));
      console.log(chalk.dim(`Both providers are now active. Tasks from either tool will sync to Codeusage.\n`));
    } catch (err) {
      console.log(chalk.red(`\nFailed to register hooks: ${(err as Error).message}\n`));
    }
  });

// Switch provider
providerCommand
  .command("switch <provider>")
  .description("Switch to a different provider")
  .action(async (newProviderId: string) => {
    if (!isConfigured()) {
      console.log(chalk.yellow("\nNot configured. Run: codeusage init\n"));
      return;
    }

    const newProvider = getProviderById(newProviderId);
    if (!newProvider) {
      console.log(chalk.red(`\nUnknown provider: ${newProviderId}`));
      console.log(chalk.dim("Run 'codeusage provider list' to see available providers.\n"));
      return;
    }

    if (!isProviderActive(newProviderId)) {
      console.log(
        chalk.yellow(`\n${newProvider.displayName} is coming soon!`)
      );
      console.log(chalk.dim("This provider is not yet available.\n"));
      return;
    }

    const config = getConfig();
    const currentProviderId = getProvider();
    const cwd = process.cwd();

    if (currentProviderId === newProviderId) {
      console.log(chalk.dim(`\nAlready using ${newProvider.displayName}.\n`));
      return;
    }

    console.log(chalk.bold("\n🔄 Switching Provider\n"));

    // Unregister old hooks
    console.log(chalk.dim(`  Unregistering ${getProviderById(currentProviderId)?.displayName} hooks...`));
    await unregisterHooks(config.hook_scope, cwd, currentProviderId as ProviderId);

    // Register new hooks
    console.log(chalk.dim(`  Registering ${newProvider.displayName} hooks...`));
    await registerHooks(config.hook_scope, cwd, newProviderId as ProviderId);

    // Update config
    setProvider(newProviderId as ProviderId);

    console.log(chalk.green(`\n✓ Switched to ${newProvider.displayName}\n`));
  });

export default providerCommand;
