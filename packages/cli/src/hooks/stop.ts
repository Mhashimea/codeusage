import { Command } from "commander";
import chalk from "chalk";
import {
  estimateCost,
  type TelemetryPayload,
  getProviderById,
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
import {
  loadSessionState,
  saveSessionState,
  calculateDelta,
  cleanupOldSessionStates,
  type SessionState,
} from "../lib/session-state.js";

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

    // Load previous session state to calculate deltas
    const previousState = await loadSessionState(session.session_id);

    // Calculate delta values (only what changed since last task)
    const delta = calculateDelta(
      {
        input_tokens: session.input_tokens,
        output_tokens: session.output_tokens,
        cache_tokens: session.cache_tokens,
        files_changed: session.files_changed,
        tool_counts: session.tool_counts,
      },
      previousState
    );

    // Skip if no actual changes (avoid duplicate syncs)
    if (
      delta.input_tokens === 0 &&
      delta.output_tokens === 0 &&
      delta.tools_used.length === 0
    ) {
      if (options.dryRun) {
        console.log(chalk.yellow("No new activity since last sync"));
      }
      return;
    }

    // Calculate duration since last task (or session start)
    let taskDuration = session.duration_sec;
    if (previousState && session.end_time && previousState.last_timestamp) {
      taskDuration = Math.round(
        (session.end_time - previousState.last_timestamp) / 1000
      );
    }

    // Build payload with delta values
    const cost = estimateCost(
      session.model,
      delta.input_tokens,
      delta.output_tokens,
      delta.cache_tokens
    );

    const payload: TelemetryPayload = {
      developer_alias: config.developer_alias,
      project_slug: projectSlug || "untagged",
      tool_source: providerId,
      model_name: session.model,
      input_tokens: delta.input_tokens,
      output_tokens: delta.output_tokens,
      cache_tokens: delta.cache_tokens,
      cost_usd: cost,
      files_changed: delta.files_changed,
      tools_used: delta.tools_used,
      task_duration_sec: taskDuration,
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

      // Save current cumulative state for next delta calculation
      const newState: SessionState = {
        session_id: session.session_id,
        input_tokens: session.input_tokens,
        output_tokens: session.output_tokens,
        cache_tokens: session.cache_tokens,
        files_changed: session.files_changed,
        tool_counts: session.tool_counts,
        last_timestamp: session.end_time || Date.now(),
        updated_at: new Date().toISOString(),
      };
      await saveSessionState(newState);

      // Periodically clean up old session states
      if (Math.random() < 0.1) {
        // 10% chance on each sync
        cleanupOldSessionStates().catch(() => {});
      }
    } else {
      console.log(chalk.yellow(`Buffered: ${result.error}`));
      await bufferTask(payload);

      // Still save state even when buffering to avoid double-counting
      const newState: SessionState = {
        session_id: session.session_id,
        input_tokens: session.input_tokens,
        output_tokens: session.output_tokens,
        cache_tokens: session.cache_tokens,
        files_changed: session.files_changed,
        tool_counts: session.tool_counts,
        last_timestamp: session.end_time || Date.now(),
        updated_at: new Date().toISOString(),
      };
      await saveSessionState(newState);
    }
  });
