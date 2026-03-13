/**
 * LLM Prompt Templates
 * Carefully crafted prompts for code analysis
 */

export const SYSTEM_PROMPT = `You are Afterburn, an AI assistant that analyzes code changes from development sessions. Your role is to:
- Summarize what was accomplished in plain language
- Identify the intent behind changes
- Note architectural decisions and trade-offs
- Be concise but comprehensive

Always be factual and base your analysis only on the provided diff and context. If something is unclear, say so rather than speculating.`;

/**
 * Session action from Claude Code
 */
interface SessionActionSummary {
  tool: string;
  action: string;
}

/**
 * Generate a session summary prompt
 */
export function createSessionSummaryPrompt(options: {
  diff: string;
  fileList: string[];
  commitMessages?: string[];
  projectName?: string;
  sessionActions?: SessionActionSummary[];
}): string {
  const { diff, fileList, commitMessages, projectName, sessionActions } = options;

  let prompt = `Analyze this Claude Code session and provide a concise summary.\n\n`;

  if (projectName) {
    prompt += `**Project:** ${projectName}\n\n`;
  }

  // Include session actions from Claude Code
  if (sessionActions?.length) {
    prompt += `**Claude Code Actions (${sessionActions.length} actions):**\n`;
    // Group actions by tool for cleaner display
    const toolGroups = new Map<string, string[]>();
    for (const action of sessionActions) {
      if (!toolGroups.has(action.tool)) {
        toolGroups.set(action.tool, []);
      }
      if (action.action && action.action !== '-') {
        toolGroups.get(action.tool)!.push(action.action);
      }
    }
    for (const [tool, actions] of toolGroups) {
      if (actions.length > 0) {
        prompt += `- **${tool}**: ${actions.slice(0, 5).join(', ')}${actions.length > 5 ? ` (+${actions.length - 5} more)` : ''}\n`;
      } else {
        prompt += `- **${tool}**: ${sessionActions.filter(a => a.tool === tool).length} calls\n`;
      }
    }
    prompt += '\n';
  }

  prompt += `**Files Changed (${fileList.length}):**\n`;
  prompt += fileList.map(f => `- ${f}`).join('\n');
  prompt += '\n\n';

  if (commitMessages?.length) {
    prompt += `**Commit Messages:**\n`;
    prompt += commitMessages.map(m => `- ${m}`).join('\n');
    prompt += '\n\n';
  }

  if (diff && diff.trim()) {
    prompt += `**Code Diff:**\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;
  }

  prompt += `Based on the Claude Code actions and code changes above, provide a developer-focused summary:

1. **What was done** (1-2 sentences): Clearly state the feature added, bug fixed, or improvement made. Be specific - e.g., "Added dark mode toggle to settings page" not "Made UI changes".

2. **Type**: Classify as one of: Feature | Bug Fix | Refactor | Config | Docs | Test | Research

3. **Impact**: Who/what does this affect? (e.g., "Users can now export reports to PDF", "Fixes login failure on Safari")

4. **Technical Details** (optional, 2-3 bullets max): Only include if there are notable implementation choices, new dependencies, or architecture decisions.

Rules:
- Focus on WHAT was accomplished, not HOW (don't list tools used)
- Be specific and actionable - another developer should understand the change
- If no code was changed but research was done, summarize what was learned
- Keep total response under 150 words`;

  return prompt;
}

/**
 * Generate an intent-based changelog prompt
 */
export function createChangelogPrompt(options: {
  diff: string;
  fileList: string[];
  commitMessages?: string[];
}): string {
  const { diff, fileList, commitMessages } = options;

  let prompt = `Generate a changelog entry from this session's changes.\n\n`;

  prompt += `**Files Changed:**\n${fileList.map(f => `- ${f}`).join('\n')}\n\n`;

  if (commitMessages?.length) {
    prompt += `**Commits:**\n${commitMessages.map(m => `- ${m}`).join('\n')}\n\n`;
  }

  prompt += `**Diff:**\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;

  prompt += `Generate a changelog grouped by PURPOSE (not by file). Use this format:

### Added
- Feature or capability that was added

### Changed
- Modifications to existing functionality

### Fixed
- Bug fixes

### Removed
- Features or code that was removed

Rules:
- Group related changes together even if they span multiple files
- Use action verbs (Added, Implemented, Fixed, Updated, Removed)
- Be specific but concise
- Skip empty sections`;

  return prompt;
}

/**
 * Generate an Architecture Decision Record prompt
 */
export function createADRPrompt(options: {
  diff: string;
  fileList: string[];
  newDependencies?: string[];
}): string {
  const { diff, fileList, newDependencies } = options;

  let prompt = `Analyze this code for architectural decisions.\n\n`;

  prompt += `**Files Changed:**\n${fileList.map(f => `- ${f}`).join('\n')}\n\n`;

  if (newDependencies?.length) {
    prompt += `**New Dependencies:**\n${newDependencies.map(d => `- ${d}`).join('\n')}\n\n`;
  }

  prompt += `**Diff:**\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;

  prompt += `Identify any architectural decisions made in this code. For each decision found, provide:

### Decision: [Name of Decision]
**Context:** Why was this decision needed?
**Decision:** What was chosen?
**Alternatives:** What other options existed?
**Consequences:** What are the trade-offs?

If no significant architectural decisions are present, respond with "No significant architectural decisions identified in this session."

Focus on:
- New frameworks/libraries chosen
- Design patterns implemented
- API design choices
- Data structure decisions
- Performance vs simplicity trade-offs`;

  return prompt;
}

/**
 * Generate a trade-off analysis prompt
 */
export function createTradeoffPrompt(options: {
  diff: string;
  fileList: string[];
}): string {
  const { diff, fileList } = options;

  let prompt = `Analyze this code for potential trade-offs and technical debt.\n\n`;

  prompt += `**Files Changed:**\n${fileList.map(f => `- ${f}`).join('\n')}\n\n`;

  prompt += `**Diff:**\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;

  prompt += `Identify any trade-offs or potential technical debt in this code:

1. **Simplicity vs Robustness**: Are there shortcuts taken?
2. **Performance vs Readability**: Any optimization that hurts clarity?
3. **Flexibility vs Complexity**: Over-engineering or under-engineering?
4. **Security Considerations**: Any security trade-offs?
5. **Maintenance Burden**: Will this be hard to maintain?

For each issue found, briefly explain:
- What the trade-off is
- Why it might be acceptable
- What to watch out for

If the code looks solid with no significant trade-offs, say "No significant trade-offs or technical debt identified."`;

  return prompt;
}
