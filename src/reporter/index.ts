/**
 * Report generator module - produces markdown and terminal output
 */

import type { GitDiff, GitFileDiff } from '../git/index.js';
import type { RiskFinding, DependencyInfo } from '../types.js';
import { formatDuration } from '../utils/timespec.js';

export interface ReportData {
  diff: GitDiff;
  findings?: RiskFinding[];
  dependencies?: DependencyInfo[];
  analysisTime: number;
  projectPath: string;
  since?: string;
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

  let md = '';

  // Header
  md += `# Afterburn Session Report\n\n`;
  md += `_Generated: ${formatTimestamp(timestamp)} | Project: ${projectName} | Analysis: ${formatDuration(analysisTime)}_\n\n`;
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
  md += `\n`;

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

  // Files Changed
  if (files.length > 0) {
    md += `## Files Changed\n\n`;
    md += `| Status | File | Changes |\n`;
    md += `|--------|------|--------|\n`;

    // Sort by status: added, modified, deleted, renamed
    const sortedFiles = [...files].sort((a, b) => {
      const order = { added: 0, modified: 1, renamed: 2, deleted: 3, copied: 4 };
      return order[a.status] - order[b.status];
    });

    for (const file of sortedFiles) {
      const statusIcon = getStatusIcon(file.status);
      const changes = file.additions + file.deletions > 0
        ? `+${file.additions}/-${file.deletions}`
        : '-';
      md += `| ${statusIcon} | \`${file.path}\` | ${changes} |\n`;
    }
    md += `\n`;
  }

  // Risk Report
  md += `## Risk Report\n\n`;

  const findings = data.findings ?? [];
  if (findings.length === 0) {
    md += `✅ **No issues detected**\n\n`;
  } else {
    const errors = findings.filter(f => f.severity === 'error');
    const warnings = findings.filter(f => f.severity === 'warn');
    const infos = findings.filter(f => f.severity === 'info');

    md += `| Severity | Count |\n`;
    md += `|----------|-------|\n`;
    md += `| ❌ Errors | ${errors.length} |\n`;
    md += `| ⚠️ Warnings | ${warnings.length} |\n`;
    md += `| ℹ️ Info | ${infos.length} |\n`;
    md += `\n`;

    if (errors.length > 0) {
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
  }

  // Dependency Audit
  md += `## Dependency Audit\n\n`;

  const dependencies = data.dependencies ?? [];
  if (dependencies.length === 0) {
    md += `> No dependencies to audit.\n\n`;
  } else {
    const hallucinated = dependencies.filter(d => d.status === 'hallucinated');
    const warnings = dependencies.filter(d => d.status === 'warning');
    const verified = dependencies.filter(d => d.status === 'verified');
    const unknown = dependencies.filter(d => d.status === 'unknown');

    md += `| Status | Count |\n`;
    md += `|--------|-------|\n`;
    md += `| ❌ Hallucinated | ${hallucinated.length} |\n`;
    md += `| ⚠️ Warnings | ${warnings.length} |\n`;
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

    if (warnings.length > 0) {
      md += `### Warnings\n\n`;
      for (const dep of warnings) {
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

  // Footer
  md += `---\n\n`;
  md += `_Generated by [Afterburn](https://github.com/Mhashimea/afterburn) v0.1.0-beta_\n`;

  return md;
}

/**
 * Get status icon for file status
 */
function getStatusIcon(status: GitFileDiff['status']): string {
  switch (status) {
    case 'added':
      return '🟢 Added';
    case 'modified':
      return '🟡 Modified';
    case 'deleted':
      return '🔴 Deleted';
    case 'renamed':
      return '🔵 Renamed';
    case 'copied':
      return '⚪ Copied';
    default:
      return '⚪ Unknown';
  }
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

/**
 * Format download count for display
 */
function formatDownloads(downloads: number): string {
  if (downloads >= 1_000_000) {
    return `${(downloads / 1_000_000).toFixed(1)}M`;
  }
  if (downloads >= 1_000) {
    return `${(downloads / 1_000).toFixed(1)}K`;
  }
  return downloads.toString();
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
