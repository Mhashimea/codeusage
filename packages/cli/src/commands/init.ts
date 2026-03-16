import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as readline from "readline";
import { setFullConfig, getConfig, isConfigured } from "../lib/config.js";
import { validateApiKey } from "../lib/api.js";
import { detectProjectSlug } from "../lib/git.js";
import { registerHooks } from "../lib/hooks-file.js";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptSelect(
  question: string,
  options: { label: string; value: string }[]
): Promise<string> {
  console.log(question);
  options.forEach((opt, i) => {
    console.log(chalk.dim(`  ${i + 1}) ${opt.label}`));
  });

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(chalk.dim("Enter choice (1-" + options.length + "): "), (answer) => {
      rl.close();
      const index = parseInt(answer.trim(), 10) - 1;
      if (index >= 0 && index < options.length) {
        resolve(options[index].value);
      } else {
        resolve(options[0].value); // Default to first option
      }
    });
  });
}

export const initCommand = new Command("init")
  .description("Initialize Afterburn CLI and connect to your workspace")
  .option("--force", "Reinitialize even if already configured")
  .action(async (options) => {
    console.log(chalk.bold("\n🔥 Afterburn CLI Setup\n"));

    // Check if already configured
    if (isConfigured() && !options.force) {
      const config = getConfig();
      console.log(chalk.yellow("Already configured for workspace."));
      console.log(chalk.dim(`Developer: ${config.developer_alias}`));
      console.log(chalk.dim(`Scope: ${config.hook_scope}`));
      console.log(
        chalk.dim("\nRun with --force to reconfigure, or use 'afterburn config'\n")
      );
      return;
    }

    // Step 1: Get workspace key
    console.log(
      chalk.dim("Get your workspace key from the Afterburn dashboard Settings page.\n")
    );

    const workspaceKey = await prompt(chalk.cyan("Workspace API key: "));

    if (!workspaceKey) {
      console.log(chalk.red("\nWorkspace key is required.\n"));
      process.exit(1);
    }

    if (!workspaceKey.startsWith("ab-ws-")) {
      console.log(
        chalk.red("\nInvalid key format. Keys start with 'ab-ws-'.\n")
      );
      process.exit(1);
    }

    // Step 2: Validate key with API
    const spinner = ora("Validating workspace key...").start();

    const validation = await validateApiKey(workspaceKey);

    if (!validation.valid) {
      spinner.fail("Invalid workspace key");
      console.log(chalk.red(`\n${validation.error}\n`));
      process.exit(1);
    }

    spinner.succeed(`Connected to workspace: ${chalk.bold(validation.workspace?.name)}`);

    // Step 3: Get developer alias
    const defaultAlias =
      process.env.USER || process.env.USERNAME || "developer";
    const developerAlias = await prompt(
      chalk.cyan(`Your name/alias [${defaultAlias}]: `)
    );

    const finalAlias = developerAlias || defaultAlias;

    // Step 4: Choose hook scope
    const hookScope = await promptSelect(
      chalk.cyan("\nHook registration scope:"),
      [
        {
          label: "Global (recommended) - track all projects",
          value: "global",
        },
        {
          label: "Project only - track only this directory",
          value: "project",
        },
      ]
    );

    // Step 5: Detect project
    const cwd = process.cwd();
    const detectedProject = await detectProjectSlug(cwd);

    console.log(chalk.dim(`\nDetected project: ${detectedProject}`));

    // Step 6: Register hooks
    const hookSpinner = ora("Registering Claude Code hooks...").start();

    try {
      await registerHooks(hookScope as "global" | "project", cwd);
      hookSpinner.succeed("Hooks registered");
    } catch (err) {
      hookSpinner.fail("Failed to register hooks");
      console.log(chalk.red(`\n${(err as Error).message}\n`));
      process.exit(1);
    }

    // Step 7: Save config
    setFullConfig({
      workspace_key: workspaceKey,
      developer_alias: finalAlias,
      hook_scope: hookScope as "global" | "project",
      default_project: detectedProject,
      project_overrides: {},
    });

    // Success!
    console.log(chalk.green("\n✅ Afterburn is ready!\n"));
    console.log(chalk.dim("Your Claude Code sessions will now be tracked."));
    console.log(chalk.dim("View your dashboard at: https://app.afterburn.dev\n"));

    console.log(chalk.bold("Quick commands:"));
    console.log(chalk.dim("  afterburn status     Check connection status"));
    console.log(chalk.dim("  afterburn project    Manage project mappings"));
    console.log(chalk.dim("  afterburn sync       Flush buffered tasks"));
    console.log(chalk.dim("  afterburn logout     Disconnect and cleanup\n"));
  });
