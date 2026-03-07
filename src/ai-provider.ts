/**
 * AI Provider Detection
 *
 * Detects which AI coding assistant is being used and extracts session ID.
 * Supports: Claude Code, Cursor, GitHub Copilot
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface AIProviderInfo {
  provider: string | null;
  sessionId: string | null;
  sessionPath: string | null;
}

/**
 * Detect Claude Code and get current session ID
 */
function detectClaudeCode(projectPath: string): AIProviderInfo | null {
  // Check if running in Claude Code
  if (process.env.CLAUDECODE !== '1') {
    return null;
  }

  const provider = 'Claude Code';

  // Claude Code stores sessions in ~/.claude/projects/{encoded-project-path}/
  const claudeDir = path.join(os.homedir(), '.claude', 'projects');

  if (!fs.existsSync(claudeDir)) {
    return { provider, sessionId: null, sessionPath: null };
  }

  // Encode the project path the way Claude Code does it
  const absolutePath = path.resolve(projectPath);
  const encodedPath = absolutePath.replace(/\//g, '-');
  const projectDir = path.join(claudeDir, encodedPath);

  if (!fs.existsSync(projectDir)) {
    return { provider, sessionId: null, sessionPath: null };
  }

  // Find the most recently modified session file (UUID.jsonl, not agent-*.jsonl)
  try {
    const files = fs.readdirSync(projectDir)
      .filter(f => f.endsWith('.jsonl') && !f.startsWith('agent-'))
      .map(f => ({
        name: f,
        path: path.join(projectDir, f),
        mtime: fs.statSync(path.join(projectDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > 0) {
      const sessionId = files[0].name.replace('.jsonl', '');
      return {
        provider,
        sessionId,
        sessionPath: files[0].path
      };
    }
  } catch {
    // Ignore errors reading session files
  }

  return { provider, sessionId: null, sessionPath: null };
}

/**
 * Detect Cursor IDE
 */
function detectCursor(): AIProviderInfo | null {
  // Cursor sets CURSOR_TRACE_ID or similar
  if (process.env.CURSOR_TRACE_ID || process.env.TERM_PROGRAM === 'Cursor') {
    return {
      provider: 'Cursor',
      sessionId: process.env.CURSOR_TRACE_ID || null,
      sessionPath: null
    };
  }
  return null;
}

/**
 * Detect GitHub Copilot (VS Code)
 */
function detectCopilot(): AIProviderInfo | null {
  // Check for VS Code with Copilot indicators
  if (process.env.TERM_PROGRAM === 'vscode' && process.env.VSCODE_GIT_ASKPASS_NODE) {
    // Can't get specific Copilot session, but can indicate VS Code + Copilot likely
    return {
      provider: 'VS Code (Copilot)',
      sessionId: null,
      sessionPath: null
    };
  }
  return null;
}

/**
 * Detect Windsurf
 */
function detectWindsurf(): AIProviderInfo | null {
  if (process.env.WINDSURF_SESSION_ID || process.env.TERM_PROGRAM === 'windsurf') {
    return {
      provider: 'Windsurf',
      sessionId: process.env.WINDSURF_SESSION_ID || null,
      sessionPath: null
    };
  }
  return null;
}

/**
 * Detect the AI provider being used for the current session
 */
export function detectAIProvider(projectPath: string = '.'): AIProviderInfo {
  // Try each provider in order of specificity
  const detectors = [
    () => detectClaudeCode(projectPath),
    detectCursor,
    detectWindsurf,
    detectCopilot,
  ];

  for (const detect of detectors) {
    const result = detect();
    if (result) {
      return result;
    }
  }

  // No AI provider detected
  return {
    provider: null,
    sessionId: null,
    sessionPath: null
  };
}

/**
 * Format AI provider info for display
 */
export function formatAIProviderInfo(info: AIProviderInfo): string {
  if (!info.provider) {
    return 'None detected';
  }

  if (info.sessionId) {
    return `${info.provider} (Session: ${info.sessionId})`;
  }

  return info.provider;
}
