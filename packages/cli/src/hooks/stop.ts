import { Command } from "commander";
import path from "path";
import chalk from "chalk";
import {
  estimateCost,
  type TelemetryPayload,
  type ProviderId,
  getProviderById,
  isValidProviderId,
} from "@codeusage/shared";
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
import { logError, logInfo, logDebug } from "../lib/logger.js";

const CLI_VERSION = "0.1.32";

export const hookStopCommand = new Command("stop")
  .description("Handle AI coding tool stop hook (internal)")
  .option("--dry-run", "Parse session but don't send to API")
  .option("--debug", "Show debug information for troubleshooting")
  .option("--provider <provider>", "Provider ID (claude_code or codex)")
  .action(async (options) => {
    // Silent exit if not configured
    if (!isConfigured()) {
      if (options.debug) {
        console.log(chalk.yellow("CLI not configured. Run: codeusage init"));
      }
      await logDebug("hook:stop", "Skipped: CLI not configured");
      return;
    }

    const config = getConfig();
    const cwd = process.cwd();

    // Get provider from option or fall back to config
    let providerId: ProviderId;
    if (options.provider && isValidProviderId(options.provider)) {
      providerId = options.provider;
    } else {
      providerId = getProvider();
    }
    const providerInfo = getProviderById(providerId);

    if (options.debug) {
      console.log(chalk.bold("\n🔍 Debug Info\n"));
      console.log(`Platform: ${chalk.cyan(process.platform)}`);
      console.log(`CWD: ${chalk.cyan(cwd)}`);
      console.log(`Provider: ${chalk.cyan(providerId)}`);
      console.log(`Home: ${chalk.cyan(require("os").homedir())}`);
    }

    // Parse session log for the configured provider
    const session = await parseSessionLog(cwd, providerId);
    if (!session) {
      if (options.dryRun || options.debug) {
        console.log(chalk.yellow("Could not parse session log"));
        if (options.debug) {
          const { getSessionsDirectory } = await import("../lib/session-log.js");
          const sessionsDir = await getSessionsDirectory(cwd, providerId);
          console.log(`Sessions directory: ${chalk.cyan(sessionsDir || "not found")}`);
        }
      }
      await logError("hook:stop", "Could not parse session log", `cwd=${cwd} provider=${providerId} platform=${process.platform} home=${require("os").homedir()}`);
      return;
    }

    // Use session's cwd if available (for Codex), otherwise use process.cwd()
    const effectiveCwd = session.session_cwd || cwd;

    // Check for ignored directory
    if (config.project_overrides[effectiveCwd] === "__ignored__") {
      return; // Silently skip
    }

    // Resolve project slug using the effective cwd
    let projectSlug = config.project_overrides[effectiveCwd];
    if (!projectSlug) {
      projectSlug = await detectProjectSlug(effectiveCwd);
      if (projectSlug === path.basename(effectiveCwd)) {
        // Just directory name, no git remote
        console.log(
          chalk.dim("Tip: Set a project name: codeusage project set <name>")
        );
      }
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
        files_created: session.files_created,
        files_modified: session.files_modified,
        files_deleted: session.files_deleted,
        files_changed_details: session.files_changed_details,
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
      files_created: delta.files_created,
      files_modified: delta.files_modified,
      files_deleted: delta.files_deleted,
      files_changed_details: delta.files_changed_details,
      tools_used: delta.tools_used,
      task_duration_sec: taskDuration,
      hook_scope: config.hook_scope,
      cli_version: CLI_VERSION,
      session_id: session.session_id,
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
      console.log(
        `Files: ${chalk.yellow(payload.files_changed)} changed (${chalk.green(`+${payload.files_created}`)} created, ${chalk.blue(`~${payload.files_modified}`)} modified, ${chalk.red(`-${payload.files_deleted}`)} deleted)`
      );
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
      await logInfo("hook:stop", `Task synced: ${payload.project_slug}`, `model=${payload.model_name} tokens=${payload.input_tokens}+${payload.output_tokens} cost=$${payload.cost_usd.toFixed(4)}`);

      // Save current cumulative state for next delta calculation
      // Convert files_changed_details to file_stats record
      const file_stats: SessionState["file_stats"] = {};
      for (const file of session.files_changed_details) {
        file_stats[file.path] = {
          additions: file.additions,
          deletions: file.deletions,
          change_type: file.change_type,
        };
      }

      const newState: SessionState = {
        session_id: session.session_id,
        input_tokens: session.input_tokens,
        output_tokens: session.output_tokens,
        cache_tokens: session.cache_tokens,
        files_changed: session.files_changed,
        files_created: session.files_created,
        files_modified: session.files_modified,
        files_deleted: session.files_deleted,
        file_stats,
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
      await logError("hook:stop", `Task send failed, buffered`, `error=${result.error} project=${payload.project_slug}`);
      await bufferTask(payload);

      // Still save state even when buffering to avoid double-counting
      // Convert files_changed_details to file_stats record
      const bufferedFileStats: SessionState["file_stats"] = {};
      for (const file of session.files_changed_details) {
        bufferedFileStats[file.path] = {
          additions: file.additions,
          deletions: file.deletions,
          change_type: file.change_type,
        };
      }

      const newState: SessionState = {
        session_id: session.session_id,
        input_tokens: session.input_tokens,
        output_tokens: session.output_tokens,
        cache_tokens: session.cache_tokens,
        files_changed: session.files_changed,
        files_created: session.files_created,
        files_modified: session.files_modified,
        files_deleted: session.files_deleted,
        file_stats: bufferedFileStats,
        tool_counts: session.tool_counts,
        last_timestamp: session.end_time || Date.now(),
        updated_at: new Date().toISOString(),
      };
      await saveSessionState(newState);
    }
  });
