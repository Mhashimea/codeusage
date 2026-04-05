import { Command } from "commander";
import chalk from "chalk";
import { readLogs, clearLogs, getLogPath } from "../lib/logger.js";

export const logsCommand = new Command("logs")
  .description("View CLI error and diagnostic logs")
  .option("-n, --lines <number>", "Number of lines to show", "50")
  .option(
    "--level <level>",
    "Filter by level: error, warn, info, debug",
    "error"
  )
  .option("--all", "Show all log levels")
  .option("--clear", "Clear all logs")
  .option("--path", "Print log file path")
  .action(async (options) => {
    if (options.path) {
      console.log(getLogPath());
      return;
    }

    if (options.clear) {
      await clearLogs();
      console.log(chalk.green("Logs cleared."));
      return;
    }

    const level = options.all ? undefined : options.level;
    const lines = await readLogs({
      level: level as "error" | "warn" | "info" | "debug" | undefined,
      lines: parseInt(options.lines, 10),
    });

    if (lines.length === 0) {
      console.log(chalk.dim("No logs found."));
      console.log(chalk.dim(`Log file: ${getLogPath()}`));
      return;
    }

    for (const line of lines) {
      if (line.includes("[ERROR]")) {
        console.log(chalk.red(line));
      } else if (line.includes("[WARN]")) {
        console.log(chalk.yellow(line));
      } else if (line.includes("[INFO]")) {
        console.log(chalk.blue(line));
      } else {
        console.log(chalk.dim(line));
      }
    }

    console.log();
    console.log(chalk.dim(`Showing ${lines.length} entries from ${getLogPath()}`));
  });
