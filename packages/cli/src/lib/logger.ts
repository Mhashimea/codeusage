import fs from "fs/promises";
import path from "path";
import os from "os";

const LOG_DIR = path.join(os.homedir(), ".codeusage", "logs");
const LOG_FILE = path.join(LOG_DIR, "error.log");
const MAX_LOG_SIZE = 512 * 1024; // 512KB max

export interface LogEntry {
  timestamp: string;
  level: "error" | "warn" | "info" | "debug";
  source: string;
  message: string;
  details?: string;
}

function formatEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
    `[${entry.source}]`,
    entry.message,
  ];
  if (entry.details) {
    parts.push(`\n  ${entry.details}`);
  }
  return parts.join(" ");
}

export async function logError(
  source: string,
  message: string,
  details?: string
): Promise<void> {
  await writeLog({ level: "error", source, message, details });
}

export async function logWarn(
  source: string,
  message: string,
  details?: string
): Promise<void> {
  await writeLog({ level: "warn", source, message, details });
}

export async function logInfo(
  source: string,
  message: string,
  details?: string
): Promise<void> {
  await writeLog({ level: "info", source, message, details });
}

export async function logDebug(
  source: string,
  message: string,
  details?: string
): Promise<void> {
  await writeLog({ level: "debug", source, message, details });
}

async function writeLog(
  entry: Omit<LogEntry, "timestamp">
): Promise<void> {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });

    const fullEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    const line = formatEntry(fullEntry) + "\n";

    // Rotate if too large
    try {
      const stat = await fs.stat(LOG_FILE);
      if (stat.size > MAX_LOG_SIZE) {
        // Keep the last half
        const content = await fs.readFile(LOG_FILE, "utf-8");
        const lines = content.split("\n");
        const half = Math.floor(lines.length / 2);
        await fs.writeFile(LOG_FILE, lines.slice(half).join("\n"));
      }
    } catch {
      // File doesn't exist yet, that's fine
    }

    await fs.appendFile(LOG_FILE, line);
  } catch {
    // Logger itself should never crash the CLI
  }
}

export async function readLogs(options: {
  level?: "error" | "warn" | "info" | "debug";
  lines?: number;
}): Promise<string[]> {
  try {
    const content = await fs.readFile(LOG_FILE, "utf-8");
    let lines = content.trim().split("\n").filter(Boolean);

    if (options.level) {
      const tag = `[${options.level.toUpperCase()}]`;
      lines = lines.filter((l) => l.includes(tag));
    }

    if (options.lines) {
      lines = lines.slice(-options.lines);
    }

    return lines;
  } catch {
    return [];
  }
}

export async function clearLogs(): Promise<void> {
  try {
    await fs.unlink(LOG_FILE);
  } catch {
    // Already gone
  }
}

export function getLogPath(): string {
  return LOG_FILE;
}
