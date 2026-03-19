import fs from "fs/promises";
import path from "path";
import os from "os";
import type { FileChangeDetail } from "@afterburn/shared";

/**
 * Stores cumulative session values to calculate deltas between tasks
 */
export interface SessionState {
  session_id: string;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  files_changed: number;
  /** Cumulative additions/deletions per file path */
  file_stats: Record<string, { additions: number; deletions: number }>;
  tool_counts: Record<string, number>;
  last_timestamp: number;
  updated_at: string;
}

const STATE_DIR = path.join(os.homedir(), ".afterburn", "session-state");

/**
 * Get the state file path for a session
 */
function getStateFilePath(sessionId: string): string {
  // Sanitize session ID for filesystem
  const safeId = sessionId.replace(/[^a-zA-Z0-9-_]/g, "_");
  return path.join(STATE_DIR, `${safeId}.json`);
}

/**
 * Load the last known state for a session
 */
export async function loadSessionState(
  sessionId: string
): Promise<SessionState | null> {
  try {
    const filePath = getStateFilePath(sessionId);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as SessionState;
  } catch {
    return null;
  }
}

/**
 * Save the current cumulative state for a session
 */
export async function saveSessionState(state: SessionState): Promise<void> {
  try {
    await fs.mkdir(STATE_DIR, { recursive: true });
    const filePath = getStateFilePath(state.session_id);
    await fs.writeFile(filePath, JSON.stringify(state, null, 2));
  } catch {
    // Silently fail - state tracking is best-effort
  }
}

/**
 * Clean up old session state files (older than 7 days)
 */
export async function cleanupOldSessionStates(): Promise<void> {
  try {
    const files = await fs.readdir(STATE_DIR);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = path.join(STATE_DIR, file);
      const stat = await fs.stat(filePath);

      if (now - stat.mtimeMs > maxAge) {
        await fs.unlink(filePath);
      }
    }
  } catch {
    // Silently fail
  }
}

/**
 * Calculate delta values between current cumulative and last stored state
 */
export function calculateDelta(
  current: {
    input_tokens: number;
    output_tokens: number;
    cache_tokens: number;
    files_changed: number;
    files_changed_details: FileChangeDetail[];
    tool_counts: Record<string, number>;
  },
  previous: SessionState | null
): {
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  files_changed: number;
  files_changed_details: FileChangeDetail[];
  tools_used: { name: string; count: number }[];
} {
  if (!previous) {
    // First task in session - use all values
    return {
      input_tokens: current.input_tokens,
      output_tokens: current.output_tokens,
      cache_tokens: current.cache_tokens,
      files_changed: current.files_changed,
      files_changed_details: current.files_changed_details,
      tools_used: Object.entries(current.tool_counts).map(([name, count]) => ({
        name,
        count,
      })),
    };
  }

  // Calculate deltas
  const deltaToolCounts: Record<string, number> = {};
  for (const [name, count] of Object.entries(current.tool_counts)) {
    const prevCount = previous.tool_counts[name] || 0;
    const delta = count - prevCount;
    if (delta > 0) {
      deltaToolCounts[name] = delta;
    }
  }

  // Calculate file change deltas
  const prevFileStats = previous.file_stats || {};
  const deltaFileDetails: FileChangeDetail[] = [];

  for (const file of current.files_changed_details) {
    const prevStats = prevFileStats[file.path];
    if (!prevStats) {
      // New file - include all changes
      deltaFileDetails.push(file);
    } else {
      // Existing file - calculate delta
      const deltaAdditions = Math.max(0, file.additions - prevStats.additions);
      const deltaDeletions = Math.max(0, file.deletions - prevStats.deletions);
      if (deltaAdditions > 0 || deltaDeletions > 0) {
        deltaFileDetails.push({
          path: file.path,
          additions: deltaAdditions,
          deletions: deltaDeletions,
        });
      }
    }
  }

  // Count unique files with changes
  const filesChangedDelta = deltaFileDetails.length;

  return {
    input_tokens: Math.max(0, current.input_tokens - previous.input_tokens),
    output_tokens: Math.max(0, current.output_tokens - previous.output_tokens),
    cache_tokens: Math.max(0, current.cache_tokens - previous.cache_tokens),
    files_changed: filesChangedDelta,
    files_changed_details: deltaFileDetails,
    tools_used: Object.entries(deltaToolCounts).map(([name, count]) => ({
      name,
      count,
    })),
  };
}
