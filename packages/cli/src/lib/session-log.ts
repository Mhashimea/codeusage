import fs from "fs/promises";
import path from "path";
import os from "os";

export interface SessionData {
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  model: string;
  tools_used: { name: string; count: number }[];
  files_changed: number;
  duration_sec: number;
}

function getProjectHash(cwd: string): string {
  // Claude Code uses base64url encoding of the cwd
  return Buffer.from(cwd).toString("base64url");
}

async function findLatestSession(projectPath: string): Promise<string | null> {
  const sessionsPath = path.join(projectPath, "sessions");

  try {
    const files = await fs.readdir(sessionsPath);
    const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

    if (jsonlFiles.length === 0) return null;

    // Get most recent by mtime
    let latestFile = jsonlFiles[0];
    let latestMtime = 0;

    for (const file of jsonlFiles) {
      const stat = await fs.stat(path.join(sessionsPath, file));
      if (stat.mtimeMs > latestMtime) {
        latestMtime = stat.mtimeMs;
        latestFile = file;
      }
    }

    return path.join(sessionsPath, latestFile);
  } catch {
    return null;
  }
}

export async function parseSessionLog(cwd: string): Promise<SessionData | null> {
  const projectHash = getProjectHash(cwd);
  const projectPath = path.join(os.homedir(), ".claude", "projects", projectHash);

  const sessionFile = await findLatestSession(projectPath);
  if (!sessionFile) return null;

  try {
    const content = await fs.readFile(sessionFile, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    let inputTokens = 0;
    let outputTokens = 0;
    let cacheTokens = 0;
    let model = "claude-sonnet-4-5";
    const toolCounts: Record<string, number> = {};
    let filesChanged = 0;
    let startTime: number | null = null;
    let endTime: number | null = null;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Track timestamps for duration
        if (entry.timestamp) {
          const ts = new Date(entry.timestamp).getTime();
          if (!startTime || ts < startTime) startTime = ts;
          if (!endTime || ts > endTime) endTime = ts;
        }

        // Extract token usage
        if (entry.usage) {
          inputTokens += entry.usage.input_tokens || 0;
          outputTokens += entry.usage.output_tokens || 0;
          cacheTokens += entry.usage.cache_read_input_tokens || 0;
        }

        // Extract model
        if (entry.model) {
          model = entry.model;
        }

        // Track tool usage
        if (entry.type === "tool_use" && entry.name) {
          toolCounts[entry.name] = (toolCounts[entry.name] || 0) + 1;
        }

        // Track file changes (Edit, Write tools)
        if (
          entry.type === "tool_use" &&
          (entry.name === "Edit" || entry.name === "Write")
        ) {
          filesChanged++;
        }
      } catch {
        // Skip malformed lines
      }
    }

    const tools_used = Object.entries(toolCounts).map(([name, count]) => ({
      name,
      count,
    }));
    const duration_sec =
      startTime && endTime ? Math.round((endTime - startTime) / 1000) : 0;

    return {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_tokens: cacheTokens,
      model,
      tools_used,
      files_changed: filesChanged,
      duration_sec,
    };
  } catch {
    return null;
  }
}

export async function getSessionsDirectory(cwd: string): Promise<string> {
  const projectHash = getProjectHash(cwd);
  return path.join(os.homedir(), ".claude", "projects", projectHash, "sessions");
}
