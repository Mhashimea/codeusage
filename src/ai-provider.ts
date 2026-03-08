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
function detectCursor(projectPath: string): AIProviderInfo | null {
  // Cursor sets CURSOR_TRACE_ID or similar env vars
  if (process.env.CURSOR_TRACE_ID || process.env.TERM_PROGRAM === 'Cursor') {
    return {
      provider: 'Cursor',
      sessionId: process.env.CURSOR_TRACE_ID || null,
      sessionPath: null
    };
  }

  // Check for .cursor directory (Cursor workspace settings)
  const cursorDir = path.join(projectPath, '.cursor');
  if (fs.existsSync(cursorDir)) {
    // Try to find recent conversation files
    try {
      const composerDir = path.join(cursorDir, 'composer');
      if (fs.existsSync(composerDir)) {
        const files = fs.readdirSync(composerDir)
          .filter(f => f.endsWith('.json'))
          .map(f => ({
            name: f,
            path: path.join(composerDir, f),
            mtime: fs.statSync(path.join(composerDir, f)).mtime.getTime()
          }))
          .sort((a, b) => b.mtime - a.mtime);

        if (files.length > 0) {
          return {
            provider: 'Cursor',
            sessionId: files[0].name.replace('.json', ''),
            sessionPath: files[0].path
          };
        }
      }
    } catch {
      // Ignore errors
    }

    return {
      provider: 'Cursor',
      sessionId: null,
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
 * Detect Aider (AI pair programming)
 */
function detectAider(projectPath: string): AIProviderInfo | null {
  // Check for .aider directory or recent aider chat history
  const aiderDir = path.join(projectPath, '.aider');
  const aiderHistory = path.join(projectPath, '.aider.chat.history.md');

  if (fs.existsSync(aiderDir) || fs.existsSync(aiderHistory)) {
    // Check for recent modifications
    try {
      const historyPath = fs.existsSync(aiderHistory) ? aiderHistory : null;
      if (historyPath) {
        const stat = fs.statSync(historyPath);
        const hourAgo = Date.now() - (60 * 60 * 1000);
        if (stat.mtime.getTime() > hourAgo) {
          return {
            provider: 'Aider',
            sessionId: null,
            sessionPath: historyPath
          };
        }
      }
    } catch {
      // Ignore errors
    }

    return {
      provider: 'Aider',
      sessionId: null,
      sessionPath: null
    };
  }

  // Check for AIDER env vars
  if (process.env.AIDER_MODEL || process.env.AIDER_API_KEY) {
    return {
      provider: 'Aider',
      sessionId: null,
      sessionPath: null
    };
  }

  return null;
}

/**
 * Detect Cody (Sourcegraph)
 */
function detectCody(): AIProviderInfo | null {
  // Cody sets specific env vars
  if (process.env.CODY_API_ENDPOINT || process.env.SRC_ACCESS_TOKEN) {
    return {
      provider: 'Cody (Sourcegraph)',
      sessionId: null,
      sessionPath: null
    };
  }
  return null;
}

/**
 * Detect Continue.dev
 */
function detectContinue(projectPath: string): AIProviderInfo | null {
  // Check for .continue directory
  const continueDir = path.join(projectPath, '.continue');
  const globalContinue = path.join(os.homedir(), '.continue');

  if (fs.existsSync(continueDir) || fs.existsSync(globalContinue)) {
    // Try to find session files
    const searchDir = fs.existsSync(continueDir) ? continueDir : globalContinue;
    try {
      const sessionsDir = path.join(searchDir, 'sessions');
      if (fs.existsSync(sessionsDir)) {
        const files = fs.readdirSync(sessionsDir)
          .filter(f => f.endsWith('.json'))
          .map(f => ({
            name: f,
            path: path.join(sessionsDir, f),
            mtime: fs.statSync(path.join(sessionsDir, f)).mtime.getTime()
          }))
          .sort((a, b) => b.mtime - a.mtime);

        if (files.length > 0) {
          return {
            provider: 'Continue',
            sessionId: files[0].name.replace('.json', ''),
            sessionPath: files[0].path
          };
        }
      }
    } catch {
      // Ignore errors
    }

    return {
      provider: 'Continue',
      sessionId: null,
      sessionPath: null
    };
  }

  return null;
}

/**
 * Detect the AI provider being used for the current session
 */
export function detectAIProvider(projectPath: string = '.'): AIProviderInfo {
  const absolutePath = path.resolve(projectPath);

  // Try each provider in order of specificity
  const detectors = [
    () => detectClaudeCode(absolutePath),
    () => detectCursor(absolutePath),
    detectWindsurf,
    () => detectAider(absolutePath),
    () => detectContinue(absolutePath),
    detectCody,
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
