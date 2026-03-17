import fs from "fs/promises";
import path from "path";
import os from "os";
import { execa } from "execa";
import {
  type ProviderId,
  getProviderById,
  isProviderActive,
  DEFAULT_PROVIDER,
} from "@afterburn/shared";

/**
 * Get git root directory for the current working directory
 */
async function getGitRoot(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"], {
      cwd,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

export interface SessionData {
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  model: string;
  tools_used: { name: string; count: number }[];
  files_changed: number;
  duration_sec: number;
}

/**
 * Session parser function type
 */
type SessionParser = (cwd: string) => Promise<SessionData | null>;

/**
 * Registry of session parsers by provider
 */
const SESSION_PARSERS: Record<ProviderId, SessionParser | null> = {
  claude_code: parseClaudeCodeSession,
  codex: null, // Will be implemented when Codex support is added
};

/**
 * Get session parser for a provider
 */
export function getSessionParser(
  providerId: ProviderId
): SessionParser | null {
  const provider = getProviderById(providerId);
  if (!provider || !isProviderActive(providerId)) {
    return null;
  }
  return SESSION_PARSERS[providerId];
}

// === Claude Code Session Parser ===

function getClaudeProjectHash(cwd: string): string {
  // Claude Code replaces "/" and spaces with "-" in the path
  return cwd.replace(/[/ ]/g, "-");
}

async function findLatestClaudeSession(
  projectPath: string
): Promise<string | null> {
  try {
    // Session files are directly in the project folder (not in a sessions/ subdirectory)
    const files = await fs.readdir(projectPath);
    // Filter for session files (UUID.jsonl format, exclude agent- prefixed files)
    const jsonlFiles = files.filter(
      (f) => f.endsWith(".jsonl") && !f.startsWith("agent-")
    );

    if (jsonlFiles.length === 0) return null;

    // Get most recent by mtime
    let latestFile = jsonlFiles[0];
    let latestMtime = 0;

    for (const file of jsonlFiles) {
      const stat = await fs.stat(path.join(projectPath, file));
      if (stat.mtimeMs > latestMtime) {
        latestMtime = stat.mtimeMs;
        latestFile = file;
      }
    }

    return path.join(projectPath, latestFile);
  } catch {
    return null;
  }
}

/**
 * Parse Claude Code session log
 */
async function parseClaudeCodeSession(
  cwd: string
): Promise<SessionData | null> {
  // Claude Code uses the git root directory for session storage
  const gitRoot = await getGitRoot(cwd);
  const projectDir = gitRoot || cwd;

  const projectHash = getClaudeProjectHash(projectDir);
  const projectPath = path.join(
    os.homedir(),
    ".claude",
    "projects",
    projectHash
  );

  const sessionFile = await findLatestClaudeSession(projectPath);
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

        // Extract from message object (Claude Code session format)
        const message = entry.message;
        if (message) {
          // Extract token usage from message.usage
          if (message.usage) {
            inputTokens += message.usage.input_tokens || 0;
            outputTokens += message.usage.output_tokens || 0;
            cacheTokens += message.usage.cache_read_input_tokens || 0;
          }

          // Extract model from message.model
          if (message.model) {
            model = message.model;
          }

          // Track tool usage from message.content array
          if (Array.isArray(message.content)) {
            for (const block of message.content) {
              if (block.type === "tool_use" && block.name) {
                toolCounts[block.name] = (toolCounts[block.name] || 0) + 1;

                // Track file changes (Edit, Write tools)
                if (block.name === "Edit" || block.name === "Write") {
                  filesChanged++;
                }
              }
            }
          }
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

// === Main API ===

/**
 * Parse session log for the given provider
 * Uses provider-specific parser based on the configured provider
 */
export async function parseSessionLog(
  cwd: string,
  providerId: ProviderId = DEFAULT_PROVIDER
): Promise<SessionData | null> {
  const parser = getSessionParser(providerId);
  if (!parser) {
    return null;
  }
  return parser(cwd);
}

/**
 * Get sessions directory for a provider
 */
export async function getSessionsDirectory(
  cwd: string,
  providerId: ProviderId = DEFAULT_PROVIDER
): Promise<string | null> {
  // Provider-specific session directories
  switch (providerId) {
    case "claude_code": {
      // Claude Code uses the git root directory for session storage
      const gitRoot = await getGitRoot(cwd);
      const projectDir = gitRoot || cwd;
      const projectHash = getClaudeProjectHash(projectDir);
      // Session files are directly in the project folder
      return path.join(os.homedir(), ".claude", "projects", projectHash);
    }
    case "codex":
      // Will be implemented when Codex support is added
      return null;
    default:
      return null;
  }
}
