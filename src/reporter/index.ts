/**
 * Report generator module - produces markdown and terminal output
 */

import os from 'os';
import fs from 'fs';
import path from 'path';
import type { GitDiff } from '../git/index.js';
import type { RiskFinding, DependencyInfo, FileChange } from '../types.js';
import type { AIProviderInfo } from '../ai-provider.js';
import type { LLMAnalysisResult } from '../llm/index.js';
import { formatDuration } from '../utils/timespec.js';
import { categorizeFiles, sortByImpact, getCategoryIcon, getCategoryLabel } from '../analyzer/file-categorizer.js';
import { formatCost } from '../llm/utils.js';

/**
 * Session action logged by Claude Code hook
 */
export interface SessionAction {
  tool_name: string;
  tool_input?: Record<string, unknown>;
  session_id?: string;
  timestamp?: string;
}

/**
 * Get the system username (works on macOS, Windows, Linux)
 */
function getSystemAuthor(): string {
  try {
    const userInfo = os.userInfo();
    return userInfo.username || process.env.USER || process.env.USERNAME || 'Unknown';
  } catch {
    return process.env.USER || process.env.USERNAME || 'Unknown';
  }
}

export interface ReportData {
  diff: GitDiff;
  findings?: RiskFinding[];
  dependencies?: DependencyInfo[];
  fileChanges?: FileChange[];
  sessionActions?: SessionAction[];
  tokenUsage?: TokenUsage;
  analysisTime: number;
  projectPath: string;
  since?: string;
  aiProvider?: AIProviderInfo;
  llmAnalysis?: LLMAnalysisResult;
  llmSkippedReason?: string;
}

/**
 * Token usage statistics from a session
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  model: string;
  estimatedCost: number;
}

/**
 * Result from reading transcript - includes actions and token usage
 */
export interface TranscriptData {
  actions: SessionAction[];
  tokenUsage: TokenUsage;
}

/**
 * State tracking for transcript position (per-transcript)
 */
interface TranscriptState {
  lastLineCount: number;
}

/**
 * Get the state file path for tracking transcript position (per-transcript)
 */
function getTranscriptStatePath(transcriptPath: string): string {
  return transcriptPath + '.afterburn-state';
}

/**
 * Get the project-level state file path for tracking files across sessions
 */
function getProjectStatePath(transcriptPath: string): string {
  const dir = path.dirname(transcriptPath);
  return path.join(dir, '.afterburn-project-state.json');
}

/**
 * Read the state from state file
 */
function getTranscriptState(transcriptPath: string): TranscriptState {
  const statePath = getTranscriptStatePath(transcriptPath);
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
  } catch {
    // Ignore errors
  }
  return { lastLineCount: 0 };
}

/**
 * Save the current state to state file
 */
function saveTranscriptState(transcriptPath: string, state: TranscriptState): void {
  const statePath = getTranscriptStatePath(transcriptPath);
  try {
    fs.writeFileSync(statePath, JSON.stringify(state), 'utf-8');
  } catch {
    // Ignore errors
  }
}

/**
 * Read the last processed line count from state file
 */
function getLastProcessedLine(transcriptPath: string): number {
  return getTranscriptState(transcriptPath).lastLineCount || 0;
}

/**
 * Save the current line count to state file
 */
function saveLastProcessedLine(transcriptPath: string, lineCount: number): void {
  saveTranscriptState(transcriptPath, { lastLineCount: lineCount });
}

/**
 * Project-level state for tracking files across sessions
 */
interface ProjectState {
  lastCommitHash?: string;
  lastReportedFiles?: string[];
  lastReportTime?: string;
}

/**
 * Read project state
 */
function getProjectState(transcriptPath: string): ProjectState {
  const statePath = getProjectStatePath(transcriptPath);
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
  } catch {
    // Ignore errors
  }
  return {};
}

/**
 * Save project state
 */
function saveProjectState(transcriptPath: string, state: ProjectState): void {
  const statePath = getProjectStatePath(transcriptPath);
  try {
    fs.writeFileSync(statePath, JSON.stringify(state), 'utf-8');
  } catch {
    // Ignore errors
  }
}

/**
 * Get the last reported files from project state
 */
export function getLastReportedFiles(transcriptPath: string): string[] {
  return getProjectState(transcriptPath).lastReportedFiles || [];
}

/**
 * Save the reported files to project state
 */
export function saveLastReportedFiles(transcriptPath: string, files: string[]): void {
  const state = getProjectState(transcriptPath);
  state.lastReportedFiles = files;
  state.lastReportTime = new Date().toISOString();
  saveProjectState(transcriptPath, state);
}

/**
 * Get the last commit hash from project state
 */
export function getLastCommitHash(transcriptPath: string): string | undefined {
  return getProjectState(transcriptPath).lastCommitHash;
}

/**
 * Save the last commit hash to project state
 */
export function saveLastCommitHash(transcriptPath: string, commitHash: string): void {
  const state = getProjectState(transcriptPath);
  state.lastCommitHash = commitHash;
  saveProjectState(transcriptPath, state);
}

/**
 * Read session actions and token usage from Claude Code transcript file
 * The transcript is a JSONL file with tool_use nested in .message.content[]
 * Only reads NEW lines since the last report to avoid duplicates
 */
export function readActionsFromTranscript(transcriptPath: string): TranscriptData {
  const emptyResult: TranscriptData = {
    actions: [],
    tokenUsage: { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, totalTokens: 0, model: '', estimatedCost: 0 },
  };

  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return emptyResult;
  }

  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8');
    const allLines = content.trim().split('\n').filter(line => line.trim());

    // Get the last processed line count
    const lastProcessedLine = getLastProcessedLine(transcriptPath);

    // Only process new lines (lines after the last processed position)
    const newLines = allLines.slice(lastProcessedLine);

    // Save the new line count for next run
    saveLastProcessedLine(transcriptPath, allLines.length);

    const actions: SessionAction[] = [];
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheCreationTokens = 0;
    let cacheReadTokens = 0;
    let model = '';

    for (const line of newLines) {
      try {
        const entry = JSON.parse(line);

        // Extract model from message.model (use first non-empty one)
        if (entry.message?.model && !model) {
          model = entry.message.model;
        }

        // Extract token usage from message.usage
        if (entry.message?.usage) {
          const usage = entry.message.usage;
          inputTokens += usage.input_tokens || 0;
          outputTokens += usage.output_tokens || 0;
          cacheCreationTokens += usage.cache_creation_input_tokens || 0;
          cacheReadTokens += usage.cache_read_input_tokens || 0;
        }

        // Tool uses are nested in message.content array
        if (entry.message?.content && Array.isArray(entry.message.content)) {
          for (const item of entry.message.content) {
            if (item.type === 'tool_use' && item.name) {
              actions.push({
                tool_name: item.name,
                tool_input: item.input,
                timestamp: entry.timestamp,
              });
            }
          }
        }
      } catch {
        // Skip malformed lines
      }
    }

    const tokenUsage: TokenUsage = {
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      totalTokens: inputTokens + outputTokens,
      model,
      estimatedCost: calculateTokenCostByModel(inputTokens, outputTokens, cacheReadTokens, model),
    };

    return { actions, tokenUsage };
  } catch {
    return emptyResult;
  }
}

/**
 * Calculate cost based on model
 * Official Anthropic pricing (March 2026) per 1M tokens:
 * - Claude Opus 4.5/4.6: $5 input, $25 output, $0.50 cache read
 * - Claude Sonnet 4/4.5/4.6: $3 input, $15 output, $0.30 cache read
 * - Claude Haiku 4.5: $1 input, $5 output, $0.10 cache read
 * - Claude Haiku 3.5: $0.80 input, $4 output, $0.08 cache read
 * Source: https://platform.claude.com/docs/en/about-claude/pricing
 */
function calculateTokenCostByModel(inputTokens: number, outputTokens: number, cacheReadTokens: number, model: string): number {
  let inputCostPerMillion = 3;
  let outputCostPerMillion = 15;
  let cacheReadCostPerMillion = 0.30;

  if (model.includes('opus')) {
    inputCostPerMillion = 5;
    outputCostPerMillion = 25;
    cacheReadCostPerMillion = 0.50;
  } else if (model.includes('haiku-4-5') || model.includes('haiku-4.5')) {
    inputCostPerMillion = 1;
    outputCostPerMillion = 5;
    cacheReadCostPerMillion = 0.10;
  } else if (model.includes('haiku-3-5') || model.includes('haiku-3.5')) {
    inputCostPerMillion = 0.80;
    outputCostPerMillion = 4;
    cacheReadCostPerMillion = 0.08;
  }
  // Default: sonnet pricing ($3/$15/$0.30)

  const inputCost = (inputTokens / 1_000_000) * inputCostPerMillion;
  const outputCost = (outputTokens / 1_000_000) * outputCostPerMillion;
  const cacheReadCost = (cacheReadTokens / 1_000_000) * cacheReadCostPerMillion;

  return inputCost + outputCost + cacheReadCost;
}

/**
 * Read session actions from the JSONL log file (legacy method)
 */
export function readSessionActions(projectPath: string): SessionAction[] {
  const actionsPath = path.join(projectPath, '.afterburn', 'session-actions.jsonl');

  if (!fs.existsSync(actionsPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(actionsPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    const actions: SessionAction[] = [];
    for (const line of lines) {
      try {
        const action = JSON.parse(line) as SessionAction;
        // Add timestamp if not present
        if (!action.timestamp) {
          action.timestamp = new Date().toISOString();
        }
        actions.push(action);
      } catch {
        // Skip malformed lines
      }
    }

    return actions;
  } catch {
    return [];
  }
}

/**
 * Clear session actions file after reading (for next session)
 */
export function clearSessionActions(projectPath: string): void {
  const actionsPath = path.join(projectPath, '.afterburn', 'session-actions.jsonl');

  if (fs.existsSync(actionsPath)) {
    try {
      fs.writeFileSync(actionsPath, '');
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Get a friendly name for the tool
 */
function getToolDisplayName(toolName: string): string {
  const toolNames: Record<string, string> = {
    'Bash': '💻 Bash',
    'Read': '📖 Read',
    'Edit': '✏️ Edit',
    'Write': '📝 Write',
    'Glob': '🔍 Glob',
    'Grep': '🔎 Grep',
    'WebFetch': '🌐 WebFetch',
    'WebSearch': '🔍 WebSearch',
    'Task': '📋 Task',
    'TodoWrite': '✅ TodoWrite',
  };
  return toolNames[toolName] || `🔧 ${toolName}`;
}

/**
 * Summarize tool input for display
 */
function summarizeToolInput(toolName: string, input: Record<string, unknown> | undefined): string {
  if (!input) return '-';

  switch (toolName) {
    case 'Bash':
      return input.command ? `\`${truncateInput(String(input.command), 80)}\`` : '-';
    case 'Read':
      return input.file_path ? `\`${String(input.file_path)}\`` : '-';
    case 'Edit':
    case 'Write':
      return input.file_path ? `\`${String(input.file_path)}\`` : '-';
    case 'Glob':
      return input.pattern ? `\`${String(input.pattern)}\`` : '-';
    case 'Grep':
      return input.pattern ? `\`${String(input.pattern)}\`` : '-';
    case 'WebFetch':
      return input.url ? `\`${String(input.url)}\`` : '-';
    case 'WebSearch':
      return input.query ? `"${truncateInput(String(input.query), 80)}"` : '-';
    default:
      return '-';
  }
}

/**
 * Truncate input string for display
 */
function truncateInput(str: string, maxLength: number): string {
  // Remove newlines and extra spaces
  const cleaned = str.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength - 3) + '...';
}

export interface ReportOptions {
  format: 'markdown' | 'json' | 'terminal';
  outputPath?: string;
}

/**
 * Generate a markdown report from the analysis data
 */
export function generateMarkdownReport(data: ReportData): string {
  const { diff, analysisTime, projectPath } = data;
  const { stats, commits, files } = diff;
  const timestamp = new Date().toISOString();
  const projectName = projectPath.split('/').pop() || 'Unknown';
  const author = getSystemAuthor();

  let md = '';

  // Header
  md += `# Afterburn Session Report\n\n`;
  md += `_Generated: ${formatTimestamp(timestamp)} | Author: ${author} | Project: ${projectName} | Analysis: ${formatDuration(analysisTime)}_\n\n`;
  md += `---\n\n`;

  // Session Summary
  md += `## Session Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Files Changed | ${stats.filesChanged} |\n`;
  md += `| Lines Added | +${stats.insertions} |\n`;
  md += `| Lines Removed | -${stats.deletions} |\n`;
  md += `| Commits | ${stats.commitCount} |\n`;
  md += `| Uncommitted Changes | ${stats.hasUncommittedChanges ? 'Yes' : 'No'} |\n`;

  // Token usage and cost from transcript
  if (data.tokenUsage && data.tokenUsage.totalTokens > 0) {
    if (data.tokenUsage.model) {
      md += `| Model | ${data.tokenUsage.model} |\n`;
    }
    md += `| Total Tokens | ${formatNumber(data.tokenUsage.totalTokens)} |\n`;
    md += `| Input Tokens | ${formatNumber(data.tokenUsage.inputTokens)} |\n`;
    md += `| Output Tokens | ${formatNumber(data.tokenUsage.outputTokens)} |\n`;
    if (data.tokenUsage.cacheReadTokens > 0) {
      md += `| Cache Read Tokens | ${formatNumber(data.tokenUsage.cacheReadTokens)} |\n`;
    }
    md += `| Estimated Cost | $${data.tokenUsage.estimatedCost.toFixed(4)} |\n`;
  }

  // AI Provider info
  if (data.aiProvider?.provider) {
    md += `| AI Provider | ${data.aiProvider.provider} |\n`;
    if (data.aiProvider.sessionId) {
      md += `| AI Session ID | \`${data.aiProvider.sessionId}\` |\n`;
    }
  }
  md += `\n`;

  // Claude Actions (from session log)
  const sessionActions = data.sessionActions ?? [];
  if (sessionActions.length > 0) {
    md += `## Claude Actions\n\n`;
    md += `_${sessionActions.length} actions logged during this session_\n\n`;

    // Group actions by tool type for summary
    const toolCounts = new Map<string, number>();
    for (const action of sessionActions) {
      const tool = action.tool_name || 'Unknown';
      toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
    }

    // Tool usage summary
    md += `### Tool Usage Summary\n\n`;
    md += `| Tool | Count |\n`;
    md += `|------|-------|\n`;
    for (const [tool, count] of Array.from(toolCounts.entries()).sort((a, b) => b[1] - a[1])) {
      md += `| ${getToolDisplayName(tool)} | ${count} |\n`;
    }
    md += `\n`;

    // Detailed action log (all actions)
    md += `### All Actions\n\n`;
    md += `| Tool | Action |\n`;
    md += `|------|--------|\n`;

    for (const action of sessionActions) {
      const tool = getToolDisplayName(action.tool_name || 'Unknown');
      const summary = summarizeToolInput(action.tool_name, action.tool_input);
      md += `| ${tool} | ${summary} |\n`;
    }
    md += `\n`;
  }

  // Recent Commits
  if (commits.length > 0) {
    md += `## Recent Commits\n\n`;
    md += `| Hash | Message | Author | Date |\n`;
    md += `|------|---------|--------|------|\n`;

    for (const commit of commits.slice(0, 10)) {
      const shortHash = commit.hash.substring(0, 7);
      const message = escapeMarkdown(truncate(commit.message, 50));
      const date = formatTimestamp(commit.date.toISOString());
      md += `| \`${shortHash}\` | ${message} | ${commit.author} | ${date} |\n`;
    }

    if (commits.length > 10) {
      md += `\n_...and ${commits.length - 10} more commits_\n`;
    }
    md += `\n`;
  }

  // Files Changed with Categorization
  if (files.length > 0) {
    // Generate categorized file changes
    const categorizedFiles = data.fileChanges ?? categorizeFiles(files, commits);
    const sortedFiles = sortByImpact(categorizedFiles);

    md += `## Files Changed\n\n`;
    md += `| Category | File | Changes | Complexity |\n`;
    md += `|----------|------|---------|------------|\n`;

    for (const file of sortedFiles) {
      const icon = getCategoryIcon(file.category);
      const label = getCategoryLabel(file.category);
      const changes = file.linesAdded + file.linesRemoved > 0
        ? `+${file.linesAdded}/-${file.linesRemoved}`
        : '-';
      const complexity = file.complexityDelta
        ? '●'.repeat(Math.min(file.complexityDelta, 5))
        : '-';
      md += `| ${icon} ${label} | \`${file.path}\` | ${changes} | ${complexity} |\n`;
    }
    md += `\n`;

    // Summary by category
    const categoryCount = new Map<string, number>();
    for (const file of categorizedFiles) {
      const label = getCategoryLabel(file.category);
      categoryCount.set(label, (categoryCount.get(label) || 0) + 1);
    }

    if (categoryCount.size > 1) {
      md += `**Summary:** `;
      const summaryParts: string[] = [];
      for (const [label, count] of categoryCount) {
        summaryParts.push(`${count} ${label.toLowerCase()}`);
      }
      md += summaryParts.join(', ') + `\n\n`;
    }
  }

  // AI Summary (after Files Changed)
  if (data.llmAnalysis) {
    md += `## AI Summary\n\n`;
    md += data.llmAnalysis.summary + '\n\n';

    if (data.llmAnalysis.changelog) {
      md += `## Changelog\n\n`;
      md += data.llmAnalysis.changelog + '\n\n';
    }

    if (data.llmAnalysis.architectureDecisions) {
      md += `## Architecture Decisions\n\n`;
      md += data.llmAnalysis.architectureDecisions + '\n\n';
    }

    if (data.llmAnalysis.tradeoffs) {
      md += `## Trade-off Analysis\n\n`;
      md += data.llmAnalysis.tradeoffs + '\n\n';
    }

    md += `---\n`;
    md += `*LLM Analysis: ${data.llmAnalysis.usage.totalTokens} tokens, ${formatCost(data.llmAnalysis.usage.estimatedCost)}, ${(data.llmAnalysis.latencyMs / 1000).toFixed(1)}s*\n\n`;
  } else if (data.llmSkippedReason) {
    // Show why AI Summary was not generated
    md += `## AI Summary\n\n`;
    md += `> ⚠️ AI Summary not available: ${data.llmSkippedReason}\n\n`;
  }

  // Risk Report - v1: Only show if there are errors
  const findings = data.findings ?? [];
  const errors = findings.filter(f => f.severity === 'error');

  if (errors.length > 0) {
    md += `## Risk Report\n\n`;
    md += `| Severity | Count |\n`;
    md += `|----------|-------|\n`;
    md += `| ❌ Errors | ${errors.length} |\n`;
    md += `\n`;

    md += `### Errors\n\n`;
    for (const finding of errors) {
      md += `- **${finding.message}**\n`;
      md += `  - File: \`${finding.file}:${finding.line}\`\n`;
      if (finding.snippet) {
        md += `  - Code: \`${escapeMarkdown(finding.snippet)}\`\n`;
      }
    }
    md += `\n`;
  }

  // v2: Warnings and Info sections (commented out for v1)
  /*
  const warnings = findings.filter(f => f.severity === 'warn');
  const infos = findings.filter(f => f.severity === 'info');

  if (warnings.length > 0) {
    md += `### Warnings\n\n`;
    for (const finding of warnings) {
      md += `- **${finding.message}**\n`;
      md += `  - File: \`${finding.file}:${finding.line}\`\n`;
      if (finding.snippet) {
        md += `  - Code: \`${escapeMarkdown(finding.snippet)}\`\n`;
      }
    }
    md += `\n`;
  }

  if (infos.length > 0) {
    md += `### Info\n\n`;
    for (const finding of infos) {
      md += `- ${finding.message} (\`${finding.file}:${finding.line}\`)\n`;
    }
    md += `\n`;
  }
  */

  // v2: Dependency Audit (commented out for v1)
  /*
  md += `## Dependency Audit\n\n`;

  const dependencies = data.dependencies ?? [];
  if (dependencies.length === 0) {
    md += `> No dependencies to audit.\n\n`;
  } else {
    const hallucinated = dependencies.filter(d => d.status === 'hallucinated');
    const depWarnings = dependencies.filter(d => d.status === 'warning');
    const verified = dependencies.filter(d => d.status === 'verified');
    const unknown = dependencies.filter(d => d.status === 'unknown');

    md += `| Status | Count |\n`;
    md += `|--------|-------|\n`;
    md += `| ❌ Hallucinated | ${hallucinated.length} |\n`;
    md += `| ⚠️ Warnings | ${depWarnings.length} |\n`;
    md += `| ✅ Verified | ${verified.length} |\n`;
    if (unknown.length > 0) {
      md += `| ❓ Unknown | ${unknown.length} |\n`;
    }
    md += `\n`;

    if (hallucinated.length > 0) {
      md += `### Hallucinated Packages\n\n`;
      md += `> These packages were not found on npm. They may have been hallucinated by an AI.\n\n`;
      for (const dep of hallucinated) {
        md += `- **${dep.name}** — ${dep.message || 'Not found on npm'}\n`;
      }
      md += `\n`;
    }

    if (depWarnings.length > 0) {
      md += `### Warnings\n\n`;
      for (const dep of depWarnings) {
        const version = dep.version ? `@${dep.version}` : '';
        md += `- **${dep.name}${version}** — ${dep.message || 'Warning'}\n`;
      }
      md += `\n`;
    }

    if (verified.length > 0 && verified.length <= 10) {
      md += `### Verified Packages\n\n`;
      for (const dep of verified) {
        const version = dep.version ? `@${dep.version}` : '';
        const downloads = dep.weeklyDownloads
          ? ` (${formatDownloads(dep.weeklyDownloads)} weekly downloads)`
          : '';
        md += `- ✅ ${dep.name}${version}${downloads}\n`;
      }
      md += `\n`;
    } else if (verified.length > 10) {
      md += `### Verified Packages\n\n`;
      md += `✅ ${verified.length} packages verified on npm registry.\n\n`;
    }
  }
  */

  // Footer
  md += `---\n\n`;
  md += `_Generated by [Afterburn](https://github.com/Mhashimea/afterburn) v0.1.0_\n`;

  return md;
}


/**
 * Format ISO timestamp to readable format
 */
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate string to max length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Escape markdown special characters
 */
function escapeMarkdown(str: string): string {
  return str.replace(/[|\\`*_{}[\]()#+\-.!]/g, '\\$&');
}

// v2: Format download count for display (commented out for v1 - used by Dependency Audit)
/*
function formatDownloads(downloads: number): string {
  if (downloads >= 1_000_000) {
    return `${(downloads / 1_000_000).toFixed(1)}M`;
  }
  if (downloads >= 1_000) {
    return `${(downloads / 1_000).toFixed(1)}K`;
  }
  return downloads.toString();
}
*/

/**
 * Format number with thousand separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}


/**
 * Legacy function for compatibility
 */
export function generateReport(
  _result: unknown,
  _options: ReportOptions
): string {
  throw new Error('Use generateMarkdownReport instead');
}
