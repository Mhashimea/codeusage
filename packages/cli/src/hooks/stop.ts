import { Command } from "commander";
import chalk from "chalk";
import {
  estimateCost,
  type TelemetryPayload,
  getProviderById,
  DEFAULT_PROVIDER,
} from "@afterburn/shared";
import { getConfig, isConfigured, getProvider } from "../lib/config.js";
import { parseSessionLog } from "../lib/session-log.js";
import { detectProjectSlug } from "../lib/git.js";
import { sendTask } from "../lib/api.js";
import {
  bufferTask,
  getBufferedTasks,
  removeBufferedTask,
} from "../lib/buffer.js";

const CLI_VERSION = "0.1.0";

export const hookStopCommand = new Command("stop")
  .description("Handle AI coding tool stop hook (internal)")
  .option("--dry-run", "Parse session but don't send to API")
  .action(async (options) => {
    // Silent exit if not configured
    if (!isConfigured()) {
      return;
    }

    const config = getConfig();
    const cwd = process.cwd();

    // Get provider from config (with migration fallback)
    const providerId = getProvider();
    const providerInfo = getProviderById(providerId);

    // Check for ignored directory
    if (config.project_overrides[cwd] === "__ignored__") {
      return; // Silently skip
    }

    // Resolve project slug
    let projectSlug = config.project_overrides[cwd];
    if (!projectSlug) {
      projectSlug = await detectProjectSlug(cwd);
      if (projectSlug === cwd.split("/").pop()) {
        // Just directory name, no git remote
        console.log(
          chalk.dim("Tip: Set a project name: afterburn project set <name>")
        );
      }
    }

    // Parse session log for the configured provider
    const session = await parseSessionLog(cwd, providerId);
    if (!session) {
      if (options.dryRun) {
        console.log(chalk.yellow("Could not parse session log"));
      }
      return;
    }

    // Build payload
    const cost = estimateCost(
      session.model,
      session.input_tokens,
      session.output_tokens,
      session.cache_tokens
    );

    const payload: TelemetryPayload = {
      developer_alias: config.developer_alias,
      project_slug: projectSlug || "untagged",
      tool_source: providerId,
      model_name: session.model,
      input_tokens: session.input_tokens,
      output_tokens: session.output_tokens,
      cache_tokens: session.cache_tokens,
      cost_usd: cost,
      files_changed: session.files_changed,
      tools_used: session.tools_used,
      task_duration_sec: session.duration_sec,
      hook_scope: config.hook_scope,
      cli_version: CLI_VERSION,
    };

    if (options.dryRun) {
      console.log(chalk.bold("\n📊 Session Summary (dry run)\n"));
      console.log(`Provider: ${chalk.cyan(providerInfo?.displayName || providerId)}`);
      console.log(`Project: ${chalk.cyan(payload.project_slug)}`);
      console.log(`Model: ${chalk.cyan(payload.model_name)}`);
      console.log(
        `Tokens: ${chalk.yellow(payload.input_tokens.toLocaleString())} in / ${chalk.yellow(payload.output_tokens.toLocaleString())} out`
      );
      if (payload.cache_tokens > 0) {
        console.log(
          `Cache: ${chalk.green(payload.cache_tokens.toLocaleString())} tokens`
        );
      }
      console.log(`Cost: ${chalk.green(`~$${payload.cost_usd.toFixed(4)}`)}`);
      console.log(`Files changed: ${chalk.yellow(payload.files_changed)}`);
      console.log(`Duration: ${chalk.yellow(payload.task_duration_sec)}s`);
      if (payload.tools_used.length > 0) {
        console.log(
          `Tools: ${payload.tools_used.map((t) => `${t.name}(${t.count})`).join(", ")}`
        );
      }
      console.log();
      return;
    }

    // Flush buffer first
    const buffered = await getBufferedTasks();
    for (const { file, payload: bufferedPayload } of buffered) {
      const result = await sendTask(bufferedPayload);
      if (result.success) {
        await removeBufferedTask(file);
      } else {
        break; // Stop flushing if API is still down
      }
    }

    // Send current task
    const result = await sendTask(payload);

    if (result.success) {
      console.log(chalk.green("✓ Task synced"));
    } else {
      console.log(chalk.yellow(`Buffered: ${result.error}`));
      await bufferTask(payload);
    }
  });
