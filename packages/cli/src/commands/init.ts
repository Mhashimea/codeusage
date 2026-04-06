import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import select from "@inquirer/select";
import input from "@inquirer/input";
import { setFullConfig, getConfig, isConfigured } from "../lib/config.js";
import { detectProjectSlug } from "../lib/git.js";
import { registerHooks, unregisterHooks } from "../lib/hooks-file.js";
import { syncPatternCache } from "../lib/patterns.js";
import { browserAuth } from "../lib/browser-auth.js";
import {
  getAllProviders,
  getProviderById,
  isProviderActive,
  type ProviderId,
} from "@codeusage/shared";

export const initCommand = new Command("init")
  .description("Initialize Codeusage CLI and connect to your workspace")
  .option("--force", "Reinitialize even if already configured")
  .action(async (options) => {
    console.log(chalk.bold("\n📊 Codeusage CLI Setup\n"));

    // Check if already configured
    if (isConfigured() && !options.force) {
      const config = getConfig();
      const providerInfo = getProviderById(config.provider);
      console.log(chalk.yellow("Already configured for workspace."));
      console.log(chalk.dim(`Provider: ${providerInfo?.displayName || config.provider}`));
      console.log(chalk.dim(`Developer: ${config.developer_alias}`));
      console.log(chalk.dim(`Scope: ${config.hook_scope}`));
      console.log(
        chalk.dim("\nRun with --force to reconfigure, or use 'codeusage config'\n")
      );
      return;
    }

    // Step 1: Select AI coding tool
    const providers = getAllProviders();
    const providerChoices = providers.map((p) => ({
      name: p.status === "active"
        ? `${p.displayName} - ${p.description}`
        : chalk.gray(`${p.displayName} - ${p.description} [Coming Soon]`),
      value: p.id,
      disabled: p.status !== "active",
    }));

    const selectedProvider = await select({
      message: "Select your AI coding tool:",
      choices: providerChoices,
    });

    const providerInfo = getProviderById(selectedProvider);
    if (!providerInfo || !isProviderActive(selectedProvider)) {
      console.log(chalk.red("\nSelected provider is not available yet.\n"));
      process.exit(1);
    }

    console.log(chalk.dim(`\nUsing ${providerInfo.displayName}\n`));

    // Step 2: Browser authentication
    console.log(chalk.dim("Opening browser to connect to your workspace...\n"));

    const authSpinner = ora("Waiting for browser authentication...").start();

    const authResult = await browserAuth();

    if (!authResult.success) {
      authSpinner.fail("Browser authentication failed");
      console.log(chalk.red(`\n${authResult.error}\n`));
      process.exit(1);
    }

    authSpinner.succeed(`Connected to workspace: ${chalk.bold(authResult.workspaceName)}`);

    const workspaceKey = authResult.workspaceKey!;

    // Step 3: Get developer alias (use profile name from browser auth if available)
    const defaultAlias =
      authResult.userName || process.env.USER || process.env.USERNAME || "developer";
    const finalAlias = await input({
      message: "Your name/alias:",
      default: defaultAlias,
    });

    // Step 4: Choose hook scope
    const hookScope = await select({
      message: "Hook registration scope:",
      choices: [
        {
          name: "Global (recommended) - track all projects",
          value: "global",
        },
        {
          name: "Project only - track only this directory",
          value: "project",
        },
      ],
    });

    // Step 5: Detect project
    const cwd = process.cwd();
    const detectedProject = await detectProjectSlug(cwd);

    console.log(chalk.dim(`\nDetected project: ${detectedProject}`));

    // Step 7: Register hooks
    const hookSpinner = ora(`Registering ${providerInfo.displayName} hooks...`).start();

    try {
      // When reinitializing, unregister old hooks first to ensure fresh config
      if (options.force) {
        await unregisterHooks(
          hookScope as "global" | "project",
          cwd,
          selectedProvider as ProviderId
        );
      }

      await registerHooks(
        hookScope as "global" | "project",
        cwd,
        selectedProvider as ProviderId
      );
      hookSpinner.succeed(`${providerInfo.displayName} hooks registered`);
    } catch (err) {
      hookSpinner.fail("Failed to register hooks");
      console.log(chalk.red(`\n${(err as Error).message}\n`));
      process.exit(1);
    }

    // Step 8: Save config
    setFullConfig({
      workspace_key: workspaceKey,
      developer_alias: finalAlias,
      provider: selectedProvider as ProviderId,
      hook_scope: hookScope as "global" | "project",
      default_project: detectedProject,
      project_overrides: {},
    });

    // Step 9: Sync Prompt Guard patterns
    const patternSpinner = ora("Syncing Prompt Guard patterns...").start();

    try {
      const patternResult = await syncPatternCache();
      if (patternResult.success) {
        if (patternResult.enabled) {
          patternSpinner.succeed(`Prompt Guard active (${patternResult.patternCount} patterns)`);
        } else {
          patternSpinner.succeed(chalk.dim("Prompt Guard disabled by workspace admin"));
        }
      } else {
        patternSpinner.warn(chalk.dim(`Prompt Guard sync skipped: ${patternResult.error}`));
      }
    } catch {
      patternSpinner.warn(chalk.dim("Prompt Guard sync skipped"));
    }

    // Success!
    console.log(chalk.green("\n✅ Codeusage is ready!\n"));
    console.log(chalk.dim(`Your ${providerInfo.displayName} sessions will now be tracked.`));
    console.log(chalk.dim("View your dashboard at: https://codeusage.dev\n"));

    console.log(chalk.bold("Quick commands:"));
    console.log(chalk.dim("  codeusage status     Check connection status"));
    console.log(chalk.dim("  codeusage project    Manage project mappings"));
    console.log(chalk.dim("  codeusage sync       Flush buffered tasks"));
    console.log(chalk.dim("  codeusage logout     Disconnect and cleanup\n"));

    process.exit(0);
  });
