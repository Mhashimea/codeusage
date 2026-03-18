import { Command } from "commander";
import chalk from "chalk";
import { getConfig, setConfig, getConfigPath, isConfigured } from "../lib/config.js";
import { registerHooks, unregisterHooks } from "../lib/hooks-file.js";

export const configCommand = new Command("config")
  .description("View or modify Afterburn configuration");

configCommand
  .command("show")
  .description("Show current configuration")
  .action(async () => {
    if (!isConfigured()) {
      console.log(chalk.yellow("\nNot configured. Run: afterburn init\n"));
      return;
    }

    const config = getConfig();

    console.log(chalk.bold("\nAfterburn Configuration:\n"));

    const maskedKey = config.workspace_key.slice(0, 10) + "••••••••••••";
    console.log(`  Workspace Key: ${chalk.dim(maskedKey)}`);
    console.log(`  Developer: ${chalk.cyan(config.developer_alias)}`);
    console.log(`  Hook Scope: ${chalk.cyan(config.hook_scope)}`);
    console.log(`  Default Project: ${chalk.cyan(config.default_project || "(none)")}`);

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
      console.log(chalk.yellow("\nNot configured. Run: afterburn init\n"));
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
      console.log(chalk.yellow("\nNot configured. Run: afterburn init\n"));
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
    if (!apiKey.startsWith("ab-ws-")) {
      console.log(chalk.red("\nInvalid API key format. Key should start with 'ab-ws-'\n"));
      return;
    }

    setConfig("workspace_key", apiKey);

    const maskedKey = apiKey.slice(0, 10) + "••••••••••••";
    console.log(chalk.green(`\n✓ API key updated`));
    console.log(chalk.dim(`  New key: ${maskedKey}\n`));
  });

// Default action (no subcommand)
configCommand.action(async () => {
  // Run 'show' by default
  const showCmd = configCommand.commands.find((c) => c.name() === "show");
  if (showCmd) {
    await showCmd.parseAsync([], { from: "user" });
  }
});
