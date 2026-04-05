import fs from "fs/promises";
import path from "path";
import os from "os";
import { execa } from "execa";
import { diffLines } from "diff";
import {
  type ProviderId,
  type FileChangeDetail,
  type FileChangeType,
  getProviderById,
  isProviderActive,
  DEFAULT_PROVIDER,
} from "@codeusage/shared";
import { logError, logDebug } from "./logger.js";

/**
 * Calculate accurate line additions and deletions using diff algorithm
 */
function calculateLineDiff(
  oldString: string,
  newString: string
): { additions: number; deletions: number } {
  const changes = diffLines(oldString, newString);
  let additions = 0;
  let deletions = 0;

  for (const change of changes) {
    if (change.added) {
      additions += change.count ?? 0;
    } else if (change.removed) {
      deletions += change.count ?? 0;
    }
  }

  return { additions, deletions };
}

/**
 * Get git root directory for the current working directory
 */
async function getGitRoot(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"], {
      cwd,
    });
    // Normalize to OS-native path separators (git returns forward slashes on Windows)
    return path.normalize(stdout.trim());
  } catch {
    return null;
  }
}

export interface SessionData {
  session_id: string;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  model: string;
  tools_used: { name: string; count: number }[];
  tool_counts: Record<string, number>;
  files_changed: number;
  files_created: number;
  files_modified: number;
  files_deleted: number;
  files_changed_details: FileChangeDetail[];
  duration_sec: number;
  start_time: number | null;
  end_time: number | null;
  /** The actual working directory from the session (for Codex) */
  session_cwd?: string;
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
  codex: parseCodexSession,
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
  // Claude Code encodes project paths by replacing ALL non-alphanumeric
  // characters (including underscores) with hyphens, then lowercasing.
  // Examples:
  // - Unix: /Users/foo/project -> -Users-foo-project
  // - Windows: C:\agents\powertek_new -> c--agents-powertek-new

  // Normalize to forward slashes first (for Windows compatibility)
  const normalized = cwd.replace(/\\/g, "/");

  // Replace all non-alphanumeric characters (except hyphen) with "-"
  // This includes underscores, slashes, colons, dots, spaces, etc.
  const hash = normalized.replace(/[^a-zA-Z0-9-]/g, "-");

  // Claude Code lowercases on Windows
  return process.platform === "win32" ? hash.toLowerCase() : hash;
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
 * Find Claude Code project directory using multiple strategies
 * This handles cases where our hash algorithm doesn't match Claude's exactly
 */
async function findClaudeProjectDirectory(projectDir: string): Promise<string | null> {
  const claudeProjectsDir = path.join(os.homedir(), ".claude", "projects");

  // Strategy 1: Try our computed hash
  const computedHash = getClaudeProjectHash(projectDir);
  const computedPath = path.join(claudeProjectsDir, computedHash);

  try {
    await fs.access(computedPath);
    return computedPath;
  } catch {
    // Directory doesn't exist with computed hash, try fallback strategies
    await logDebug("session-log", `Computed hash miss: ${computedHash}`, `projectDir=${projectDir}`).catch(() => {});
  }

  // Strategy 2: Search for a directory ending with the project name
  // This helps when the path encoding differs (e.g., Windows drive letter handling)
  try {
    const projectName = path.basename(projectDir);
    const allDirs = await fs.readdir(claudeProjectsDir);

    // Find directories that end with the project name
    // Normalize both sides: lowercase + replace underscores with hyphens
    // to handle encoding differences between our hash and Claude's
    const normalize = (s: string) => s.toLowerCase().replace(/_/g, "-");
    const normalizedName = normalize(projectName);
    const matchingDirs = allDirs.filter((dir) => {
      const normalizedDir = normalize(dir);
      return normalizedDir.endsWith(normalizedName) || normalizedDir.endsWith(`-${normalizedName}`);
    });

    if (matchingDirs.length === 0) {
      await logError("session-log", `No matching project directory found`, `projectDir=${projectDir} projectName=${projectName} availableDirs=[${allDirs.slice(0, 10).join(",")}]`).catch(() => {});
      return null;
    }

    // If multiple matches, prefer the most recently modified one
    let bestMatch = matchingDirs[0];
    let bestMtime = 0;

    for (const dir of matchingDirs) {
      try {
        const dirPath = path.join(claudeProjectsDir, dir);
        const stat = await fs.stat(dirPath);
        if (stat.mtimeMs > bestMtime) {
          bestMtime = stat.mtimeMs;
          bestMatch = dir;
        }
      } catch {
        // Skip dirs we can't stat
      }
    }

    return path.join(claudeProjectsDir, bestMatch);
  } catch (err) {
    await logError("session-log", `Failed to read projects directory`, `dir=${claudeProjectsDir} error=${(err as Error).message}`).catch(() => {});
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

  // Find the project directory using multiple strategies
  // This handles cases where our hash doesn't match Claude's exactly (e.g., Windows paths)
  const projectPath = await findClaudeProjectDirectory(projectDir);
  if (!projectPath) return null;

  const sessionFile = await findLatestClaudeSession(projectPath);
  if (!sessionFile) return null;

  // Extract session ID from filename (e.g., "abc123.jsonl" -> "abc123")
  const sessionId = path.basename(sessionFile, ".jsonl");

  try {
    const content = await fs.readFile(sessionFile, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    let inputTokens = 0;
    let outputTokens = 0;
    let cacheTokens = 0;
    let model = "claude-sonnet-4-5";
    const toolCounts: Record<string, number> = {};
    const fileChanges: Map<string, { additions: number; deletions: number; change_type: FileChangeType }> = new Map();
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

                // Track file changes with additions/deletions using proper diff
                if (block.name === "Edit") {
                  const filePath = block.input?.file_path;
                  if (filePath && typeof filePath === "string") {
                    const oldString = block.input?.old_string || "";
                    const newString = block.input?.new_string || "";
                    const { additions, deletions } = calculateLineDiff(oldString, newString);

                    const existing = fileChanges.get(filePath) || { additions: 0, deletions: 0, change_type: "modified" as FileChangeType };
                    fileChanges.set(filePath, {
                      additions: existing.additions + additions,
                      deletions: existing.deletions + deletions,
                      change_type: existing.change_type, // Keep original type (could be created then edited)
                    });
                  }
                } else if (block.name === "Write") {
                  const filePath = block.input?.file_path;
                  if (filePath && typeof filePath === "string") {
                    const content = block.input?.content || "";
                    // For new file writes, all lines are additions
                    const additions = content.split("\n").length;

                    const existing = fileChanges.get(filePath);
                    if (existing) {
                      // File was already touched in this task, add to it
                      fileChanges.set(filePath, {
                        additions: existing.additions + additions,
                        deletions: existing.deletions,
                        change_type: existing.change_type,
                      });
                    } else {
                      // New file creation
                      fileChanges.set(filePath, {
                        additions,
                        deletions: 0,
                        change_type: "created",
                      });
                    }
                  }
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

    // Convert file changes map to array
    const files_changed_details: FileChangeDetail[] = Array.from(fileChanges.entries()).map(
      ([filePath, stats]) => ({
        path: filePath,
        additions: stats.additions,
        deletions: stats.deletions,
        change_type: stats.change_type,
      })
    );

    // Count files by change type
    const files_created = files_changed_details.filter(f => f.change_type === "created").length;
    const files_modified = files_changed_details.filter(f => f.change_type === "modified").length;
    const files_deleted = files_changed_details.filter(f => f.change_type === "deleted").length;

    return {
      session_id: sessionId,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_tokens: cacheTokens,
      model,
      tools_used,
      tool_counts: toolCounts,
      files_changed: fileChanges.size,
      files_created,
      files_modified,
      files_deleted,
      files_changed_details,
      duration_sec,
      start_time: startTime,
      end_time: endTime,
    };
  } catch {
    return null;
  }
}

// === Codex Session Parser ===

/**
 * Find the most recent Codex session log file
 * Codex stores logs in ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
 */
async function findLatestCodexSession(): Promise<string | null> {
  const codexSessionsDir = path.join(os.homedir(), ".codex", "sessions");

  try {
    // Check if codex sessions directory exists
    await fs.access(codexSessionsDir);
  } catch {
    return null;
  }

  try {
    // Get all year directories
    const years = await fs.readdir(codexSessionsDir);
    const sortedYears = years
      .filter((y) => /^\d{4}$/.test(y))
      .sort()
      .reverse();

    for (const year of sortedYears) {
      const yearPath = path.join(codexSessionsDir, year);
      const months = await fs.readdir(yearPath);
      const sortedMonths = months
        .filter((m) => /^\d{2}$/.test(m))
        .sort()
        .reverse();

      for (const month of sortedMonths) {
        const monthPath = path.join(yearPath, month);
        const days = await fs.readdir(monthPath);
        const sortedDays = days
          .filter((d) => /^\d{2}$/.test(d))
          .sort()
          .reverse();

        for (const day of sortedDays) {
          const dayPath = path.join(monthPath, day);
          const files = await fs.readdir(dayPath);
          const rolloutFiles = files.filter(
            (f) => f.startsWith("rollout-") && f.endsWith(".jsonl")
          );

          if (rolloutFiles.length > 0) {
            // Get most recent by mtime
            let latestFile = rolloutFiles[0];
            let latestMtime = 0;

            for (const file of rolloutFiles) {
              const stat = await fs.stat(path.join(dayPath, file));
              if (stat.mtimeMs > latestMtime) {
                latestMtime = stat.mtimeMs;
                latestFile = file;
              }
            }

            return path.join(dayPath, latestFile);
          }
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Parse Codex session log
 *
 * Codex log format uses entries with:
 * - type: "session_meta" | "event_msg" | "turn_context" | "response_item"
 * - payload: nested object containing the actual data
 *
 * Each user "task" is a turn, marked by:
 * - task_started (with turn_id) - marks beginning of a turn
 * - task_complete (with turn_id) - marks end of a turn
 *
 * We only track the LAST completed turn to get accurate per-task metrics.
 * This avoids reporting cumulative session totals when hook fires.
 *
 * Token usage: We track tokens between the last task_started and task_complete.
 */
async function parseCodexSession(_cwd: string): Promise<SessionData | null> {
  // Codex doesn't use per-project session files, it's global
  // We'll use the most recent session file
  const sessionFile = await findLatestCodexSession();
  if (!sessionFile) return null;

  try {
    const content = await fs.readFile(sessionFile, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    // First pass: find all turns and their boundaries
    interface TurnData {
      turnId: string;
      startIndex: number;
      endIndex: number;
      startTime: number;
      endTime: number;
    }
    const turns: TurnData[] = [];
    let currentTurn: Partial<TurnData> | null = null;

    let model = "gpt-5.4"; // Default Codex model
    let sessionCwd: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      try {
        const entry = JSON.parse(lines[i]);
        const payload = entry.payload;
        if (!payload) continue;

        // Extract cwd from session_meta entry (happens once per session)
        if (entry.type === "session_meta" && payload.cwd) {
          sessionCwd = payload.cwd;
        }

        // Extract model from turn_context entries
        if (entry.type === "turn_context" && payload.model) {
          model = payload.model;
        }

        // Track turn boundaries
        if (entry.type === "event_msg") {
          if (payload.type === "task_started" && payload.turn_id) {
            // Start a new turn
            currentTurn = {
              turnId: payload.turn_id,
              startIndex: i,
              startTime: new Date(entry.timestamp).getTime(),
            };
          } else if (payload.type === "task_complete" && payload.turn_id && currentTurn && currentTurn.turnId) {
            // End current turn
            if (currentTurn.turnId === payload.turn_id) {
              turns.push({
                turnId: currentTurn.turnId,
                startIndex: currentTurn.startIndex!,
                endIndex: i,
                startTime: currentTurn.startTime!,
                endTime: new Date(entry.timestamp).getTime(),
              });
              currentTurn = null;
            }
          }
        }
      } catch {
        // Skip malformed lines
      }
    }

    // If no completed turns, return null (no task to report)
    if (turns.length === 0) {
      return null;
    }

    // Get the last completed turn
    const lastTurn = turns[turns.length - 1];

    // For accurate per-turn token tracking, we need to:
    // 1. Find the total_token_usage BEFORE the turn started (from previous token_count event)
    // 2. Find the total_token_usage at the END of the turn
    // 3. Calculate the difference

    // First, find the token counts just before this turn started
    let prevInputTokens = 0;
    let prevOutputTokens = 0;
    let prevCacheTokens = 0;

    // Look for the last token_count before this turn started
    for (let i = lastTurn.startIndex - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        const payload = entry.payload;
        if (entry.type === "event_msg" && payload?.type === "token_count" && payload.info?.total_token_usage) {
          const total = payload.info.total_token_usage;
          prevInputTokens = total.input_tokens || 0;
          prevOutputTokens = total.output_tokens || 0;
          prevCacheTokens = total.cached_input_tokens || 0;
          break;
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Second pass: find the final token counts for this turn and extract other metrics
    let endInputTokens = 0;
    let endOutputTokens = 0;
    let endCacheTokens = 0;
    const toolCounts: Record<string, number> = {};
    const fileChanges: Map<string, { additions: number; deletions: number; change_type: FileChangeType }> = new Map();

    for (let i = lastTurn.startIndex; i <= lastTurn.endIndex; i++) {
      try {
        const entry = JSON.parse(lines[i]);
        const payload = entry.payload;
        if (!payload) continue;

        // Get the latest total_token_usage within this turn
        if (entry.type === "event_msg" && payload.type === "token_count" && payload.info?.total_token_usage) {
          const total = payload.info.total_token_usage;
          endInputTokens = total.input_tokens || 0;
          endOutputTokens = total.output_tokens || 0;
          endCacheTokens = total.cached_input_tokens || 0;
        }

        // Track tool usage from response_item entries with function calls
        if (entry.type === "response_item" && payload.type === "function_call") {
          const toolName = payload.name;
          if (toolName) {
            toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
          }
        }

        // Track tool usage from custom_tool_call (apply_patch, etc.)
        if (entry.type === "response_item" && payload.type === "custom_tool_call") {
          const toolName = payload.name;
          if (toolName) {
            toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
          }

          // Extract file changes from apply_patch
          if (toolName === "apply_patch" && payload.input) {
            const patchContent = payload.input as string;
            // Parse "*** Update File: /path/to/file" lines (modified files)
            const updateMatches = patchContent.matchAll(/\*\*\* Update File: ([^\n]+)/g);
            for (const match of updateMatches) {
              const filePath = match[1].trim();
              const existing = fileChanges.get(filePath) || { additions: 0, deletions: 0, change_type: "modified" as FileChangeType };
              // Count lines starting with + and - in the patch
              const additions = (patchContent.match(/^\+[^+]/gm) || []).length;
              const deletions = (patchContent.match(/^-[^-]/gm) || []).length;
              fileChanges.set(filePath, {
                additions: existing.additions + additions,
                deletions: existing.deletions + deletions,
                change_type: existing.change_type,
              });
            }
            // Parse "*** Add File: /path/to/file" lines (created files)
            const addMatches = patchContent.matchAll(/\*\*\* Add File: ([^\n]+)/g);
            for (const match of addMatches) {
              const filePath = match[1].trim();
              const additions = (patchContent.split("\n").length || 1);
              fileChanges.set(filePath, { additions, deletions: 0, change_type: "created" });
            }
            // Parse "*** Delete File: /path/to/file" lines (deleted files)
            const deleteMatches = patchContent.matchAll(/\*\*\* Delete File: ([^\n]+)/g);
            for (const match of deleteMatches) {
              const filePath = match[1].trim();
              const existing = fileChanges.get(filePath);
              const deletions = existing?.additions || 0; // Count previous additions as deletions
              fileChanges.set(filePath, { additions: 0, deletions, change_type: "deleted" });
            }
          }
        }

        // Also track tools from response_item with content array containing tool_use
        if (entry.type === "response_item" && payload.role === "assistant" && Array.isArray(payload.content)) {
          for (const block of payload.content) {
            if (block.type === "tool_use" && block.name) {
              toolCounts[block.name] = (toolCounts[block.name] || 0) + 1;
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

    // Calculate token deltas for this turn only (end - start)
    const inputTokens = Math.max(0, endInputTokens - prevInputTokens);
    const outputTokens = Math.max(0, endOutputTokens - prevOutputTokens);
    const cacheTokens = Math.max(0, endCacheTokens - prevCacheTokens);

    // Calculate duration from the last turn's start/end times
    const duration_sec = Math.round((lastTurn.endTime - lastTurn.startTime) / 1000);

    // Convert file changes map to array
    const files_changed_details: FileChangeDetail[] = Array.from(fileChanges.entries()).map(
      ([filePath, stats]) => ({
        path: filePath,
        additions: stats.additions,
        deletions: stats.deletions,
        change_type: stats.change_type,
      })
    );

    // Count files by change type
    const files_created = files_changed_details.filter(f => f.change_type === "created").length;
    const files_modified = files_changed_details.filter(f => f.change_type === "modified").length;
    const files_deleted = files_changed_details.filter(f => f.change_type === "deleted").length;

    // Use turn_id as session_id for Codex to enable per-turn tracking
    // This allows delta tracking to work correctly across multiple hook calls
    return {
      session_id: lastTurn.turnId,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_tokens: cacheTokens,
      model,
      tools_used,
      tool_counts: toolCounts,
      files_changed: fileChanges.size,
      files_created,
      files_modified,
      files_deleted,
      files_changed_details,
      duration_sec,
      start_time: lastTurn.startTime,
      end_time: lastTurn.endTime,
      session_cwd: sessionCwd,
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
      // Use the smart directory finder that handles Windows path differences
      return findClaudeProjectDirectory(projectDir);
    }
    case "codex": {
      // Codex uses a global sessions directory organized by date
      return path.join(os.homedir(), ".codex", "sessions");
    }
    default:
      return null;
  }
}
