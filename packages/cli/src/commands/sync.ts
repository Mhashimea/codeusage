import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { isConfigured } from "../lib/config.js";
import { sendTask } from "../lib/api.js";
import {
  getBufferedTasks,
  removeBufferedTask,
  getBufferCount,
} from "../lib/buffer.js";

export const syncCommand = new Command("sync")
  .description("Manually flush buffered tasks to the server")
  .action(async () => {
    if (!isConfigured()) {
      console.log(chalk.yellow("\nNot configured. Run: codeusage init\n"));
      return;
    }

    const bufferCount = await getBufferCount();

    if (bufferCount === 0) {
      console.log(chalk.dim("\nNo buffered tasks to sync.\n"));
      return;
    }

    console.log(chalk.bold(`\nSyncing ${bufferCount} buffered task(s)...\n`));

    const buffered = await getBufferedTasks();
    let synced = 0;
    let failed = 0;

    for (const { file, payload } of buffered) {
      const spinner = ora(
        `Syncing: ${payload.project_slug} (${payload.developer_alias})`
      ).start();

      const result = await sendTask(payload);

      if (result.success) {
        await removeBufferedTask(file);
        spinner.succeed(`Synced: ${payload.project_slug}`);
        synced++;
      } else {
        spinner.fail(`Failed: ${result.error}`);
        failed++;
        // Stop on first failure to preserve order
        break;
      }
    }

    console.log();
    if (synced > 0) {
      console.log(chalk.green(`✓ ${synced} task(s) synced successfully`));
    }
    if (failed > 0) {
      console.log(chalk.yellow(`○ ${failed} task(s) still buffered`));
    }
    console.log();
  });
