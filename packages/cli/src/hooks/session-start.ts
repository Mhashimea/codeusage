import { Command } from "commander";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { isConfigured } from "../lib/config.js";
import { logDebug } from "../lib/logger.js";

const SESSION_FILE = path.join(os.homedir(), ".codeusage", "current-session.json");

export interface CurrentSession {
  session_id: string;
  transcript_path: string;
  cwd: string;
  started_at: string;
}

/**
 * Save current session info for use by other hooks (stop, post-tool-use)
 */
export async function saveCurrentSession(session: CurrentSession): Promise<void> {
  const dir = path.dirname(SESSION_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SESSION_FILE, JSON.stringify(session, null, 2));
}

/**
 * Load current session info saved by SessionStart hook
 */
export async function loadCurrentSession(): Promise<CurrentSession | null> {
  try {
    const content = await fs.readFile(SESSION_FILE, "utf-8");
    return JSON.parse(content) as CurrentSession;
  } catch {
    return null;
  }
}

/**
 * SessionStart hook handler
 *
 * Receives session info from Claude Code via stdin JSON:
 * { session_id, transcript_path, cwd, hook_event_name }
 *
 * Saves session_id and transcript_path so the stop hook
 * can use them directly instead of guessing file paths.
 */
export const hookSessionStartCommand = new Command("session-start")
  .description("Handle SessionStart hook (internal)")
  .option("--provider <provider>", "Provider ID (claude_code or codex)")
  .action(async () => {
    if (!isConfigured()) {
      return;
    }

    // Read session info from stdin
    const input = await readStdin();
    if (!input) return;

    try {
      const data = JSON.parse(input);

      if (!data.session_id) return;

      const session: CurrentSession = {
        session_id: data.session_id,
        transcript_path: data.transcript_path || "",
        cwd: data.cwd || process.cwd(),
        started_at: new Date().toISOString(),
      };

      await saveCurrentSession(session);
      await logDebug("hook:session-start", `Session started: ${session.session_id}`, `cwd=${session.cwd} transcript=${session.transcript_path}`);
    } catch {
      // Silent fail — don't break the session
    }
  });

/**
 * Read all input from stdin
 */
async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";

    if (process.stdin.isTTY) {
      resolve("");
      return;
    }

    process.stdin.setEncoding("utf8");

    process.stdin.on("readable", () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });

    process.stdin.on("end", () => {
      resolve(data);
    });

    setTimeout(() => {
      resolve(data);
    }, 100);
  });
}
