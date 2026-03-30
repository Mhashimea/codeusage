import { Command } from "commander";
import chalk from "chalk";
import {
  getConfig,
  setConfig,
  getConfigPath,
  isConfigured,
  getProviders,
  addProvider,
  removeProvider,
  hasProvider,
} from "../lib/config.js";
import { registerHooks, unregisterHooks } from "../lib/hooks-file.js";
import {
  getProviderById,
  isProviderActive,
  getAllProviders,
  type ProviderId,
} from "@codeusage/shared";

export const configCommand = new Command("config")
  .description("View or modify Codeusage configuration");

configCommand
  .command("show")
  .description("Show current configuration")
  .action(async () => {
    if (!isConfigured()) {
      console.log(chalk.yellow("\nNot configured. Run: codeusage init\n"));
      return;
    }

    const config = getConfig();
    const enabledProviders = getProviders();

    console.log(chalk.bold("\nCodeusage Configuration:\n"));

    const maskedKey = config.workspace_key.slice(0, 10) + "••••••••••••";
    console.log(`  Workspace Key: ${chalk.dim(maskedKey)}`);
    console.log(`  Developer: ${chalk.cyan(config.developer_alias)}`);
    console.log(`  Hook Scope: ${chalk.cyan(config.hook_scope)}`);
    console.log(`  Default Project: ${chalk.cyan(config.default_project || "(none)")}`);

    // Show enabled providers
    const providerNames = enabledProviders.map(p => getProviderById(p)?.displayName || p).join(", ");
    console.log(`  Providers: ${chalk.cyan(providerNames)}`);

    const overrides = Object.keys(config.project_overrides).length;
    console.log(`  Project Overrides: ${chalk.cyan(overrides)}`);

    console.log(chalk.bold("\nConfig File:"));
    console.log(chalk.dim(`  ${getConfigPath()}\n`));
  });

configCommand
  .command("scope <type>")
  .description("Change hook scope (global or project)")
  .action(async (type: string) => {
    if (!isConfigured()) {
      console.log(chalk.yellow("\nNot configured. Run: codeusage init\n"));
      return;
    }

    if (type !== "global" && type !== "project") {
      console.log(chalk.red("\nInvalid scope. Use 'global' or 'project'.\n"));
      return;
    }

    const config = getConfig();
    const cwd = process.cwd();
    const oldScope = config.hook_scope;

    if (oldScope === type) {
      console.log(chalk.dim(`\nScope is already set to '${type}'.\n`));
      return;
    }

    // Unregister from old scope
    await unregisterHooks(oldScope, cwd);

    // Register to new scope
    await registerHooks(type, cwd);

    // Update config
    setConfig("hook_scope", type);

    console.log(chalk.green(`\n✓ Hook scope changed to: ${type}`));
    console.log(chalk.dim(`  Hooks moved from ${oldScope} to ${type}\n`));
  });

configCommand
  .command("alias <name>")
  .description("Change developer alias")
  .action(async (name: string) => {
    if (!isConfigured()) {
      console.log(chalk.yellow("\nNot configured. Run: codeusage init\n"));
      return;
    }

    const oldAlias = getConfig().developer_alias;
    setConfig("developer_alias", name);

    console.log(chalk.green(`\n✓ Developer alias changed`));
    console.log(chalk.dim(`  ${oldAlias} → ${name}\n`));
  });

configCommand
  .command("set-key <api-key>")
  .description("Update the workspace API key")
  .action(async (apiKey: string) => {
    if (!apiKey.startsWith("cu-ws-")) {
      console.log(chalk.red("\nInvalid API key format. Key should start with 'cu-ws-'\n"));
      return;
    }

    setConfig("workspace_key", apiKey);

    const maskedKey = apiKey.slice(0, 10) + "••••••••••••";
    console.log(chalk.green(`\n✓ API key updated`));
    console.log(chalk.dim(`  New key: ${maskedKey}\n`));
  });

// Provider management subcommand
const providerSubCommand = configCommand
  .command("provider <action> [name]")
  .description("Manage providers: add, remove, or list")
  .action(async (action: string, name?: string) => {
    if (!isConfigured()) {
      console.log(chalk.yellow("\nNot configured. Run: codeusage init\n"));
      return;
    }

    const config = getConfig();
    const cwd = process.cwd();

    switch (action) {
      case "list": {
        console.log(chalk.bold("\n🤖 Configured Providers\n"));
        const enabledProviders = getProviders();
        const allProviders = getAllProviders();

        for (const provider of allProviders) {
          const isEnabled = enabledProviders.includes(provider.id as ProviderId);
          const statusBadge =
            provider.status === "active"
              ? chalk.green("[Active]")
              : chalk.yellow("[Coming Soon]");

          if (isEnabled) {
            console.log(chalk.cyan(`  ✓ ${provider.displayName} ${statusBadge}`));
          } else if (provider.status === "active") {
            console.log(chalk.dim(`    ${provider.displayName} ${statusBadge}`));
          }
        }
        console.log(chalk.dim(`\nUse 'codeusage config provider add <name>' to enable a provider.\n`));
        break;
      }

      case "add": {
        if (!name) {
          console.log(chalk.red("\nPlease specify a provider name."));
          console.log(chalk.dim("Example: codeusage config provider add codex\n"));
          return;
        }

        const provider = getProviderById(name);
        if (!provider) {
          console.log(chalk.red(`\nUnknown provider: ${name}`));
          console.log(chalk.dim("Available providers: claude_code, codex\n"));
          return;
        }

        if (!isProviderActive(name)) {
          console.log(chalk.yellow(`\n${provider.displayName} is coming soon!\n`));
          return;
        }

        if (hasProvider(name as ProviderId)) {
          console.log(chalk.dim(`\n${provider.displayName} is already enabled.\n`));
          return;
        }

        console.log(chalk.bold(`\n📊 Adding ${provider.displayName}\n`));

        // Register hooks for the new provider
        console.log(chalk.dim(`  Registering ${provider.displayName} hooks...`));
        try {
          await registerHooks(config.hook_scope, cwd, name as ProviderId);
          addProvider(name as ProviderId);
          console.log(chalk.green(`\n✓ ${provider.displayName} added successfully!\n`));

          const allEnabled = getProviders();
          console.log(chalk.dim(`Enabled providers: ${allEnabled.map(p => getProviderById(p)?.displayName || p).join(", ")}\n`));
        } catch (err) {
          console.log(chalk.red(`\nFailed to register hooks: ${(err as Error).message}\n`));
        }
        break;
      }

      case "remove": {
        if (!name) {
          console.log(chalk.red("\nPlease specify a provider name."));
          console.log(chalk.dim("Example: codeusage config provider remove codex\n"));
          return;
        }

        const provider = getProviderById(name);
        if (!provider) {
          console.log(chalk.red(`\nUnknown provider: ${name}`));
          return;
        }

        if (!hasProvider(name as ProviderId)) {
          console.log(chalk.dim(`\n${provider.displayName} is not enabled.\n`));
          return;
        }

        const enabledCount = getProviders().length;
        if (enabledCount <= 1) {
          console.log(chalk.red(`\nCannot remove the last provider. At least one provider must be enabled.\n`));
          return;
        }

        console.log(chalk.bold(`\n📊 Removing ${provider.displayName}\n`));

        // Unregister hooks
        console.log(chalk.dim(`  Unregistering ${provider.displayName} hooks...`));
        try {
          await unregisterHooks(config.hook_scope, cwd, name as ProviderId);
          removeProvider(name as ProviderId);
          console.log(chalk.green(`\n✓ ${provider.displayName} removed.\n`));
        } catch (err) {
          console.log(chalk.red(`\nFailed to unregister hooks: ${(err as Error).message}\n`));
        }
        break;
      }

      default:
        console.log(chalk.red(`\nUnknown action: ${action}`));
        console.log(chalk.dim("Available actions: list, add, remove\n"));
    }
  });

// Default action (no subcommand)
configCommand.action(async () => {
  // Run 'show' by default
  const showCmd = configCommand.commands.find((c) => c.name() === "show");
  if (showCmd) {
    await showCmd.parseAsync([], { from: "user" });
  }
});
