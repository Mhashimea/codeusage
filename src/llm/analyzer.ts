/**
 * LLM-Powered Analysis
 * Generates human-readable summaries from code changes
 */

import {
  LLMConfig,
  createProvider,
  truncateToTokenLimit,
  formatCost,
} from './index.js';
import {
  SYSTEM_PROMPT,
  createSessionSummaryPrompt,
  createChangelogPrompt,
  createADRPrompt,
  createTradeoffPrompt,
} from './prompts.js';

export interface LLMAnalysisResult {
  /** Human-readable session summary */
  summary: string;
  /** Intent-based changelog */
  changelog?: string;
  /** Architecture decision records */
  architectureDecisions?: string;
  /** Trade-off analysis */
  tradeoffs?: string;
  /** Token usage statistics */
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  /** Total latency in milliseconds */
  latencyMs: number;
}

export interface AnalyzerOptions {
  /** Generate changelog */
  includeChangelog?: boolean;
  /** Generate ADR */
  includeADR?: boolean;
  /** Generate trade-off analysis */
  includeTradeoffs?: boolean;
  /** Maximum tokens for diff (will truncate if exceeded) */
  maxDiffTokens?: number;
  /** Callback for progress updates */
  onProgress?: (step: string) => void;
}

const DEFAULT_MAX_DIFF_TOKENS = 8000;

/**
 * Analyze code changes using LLM
 */
/**
 * Session action from Claude Code transcript
 */
interface SessionAction {
  tool_name: string;
  tool_input?: Record<string, unknown>;
}

export async function analyzeWithLLM(
  config: LLMConfig,
  options: {
    diff: string;
    fileList: string[];
    commitMessages?: string[];
    projectName?: string;
    newDependencies?: string[];
    sessionActions?: SessionAction[];
  },
  analyzerOptions?: AnalyzerOptions
): Promise<LLMAnalysisResult> {
  const {
    includeChangelog = false,
    includeADR = false,
    includeTradeoffs = false,
    maxDiffTokens = DEFAULT_MAX_DIFF_TOKENS,
    onProgress,
  } = analyzerOptions ?? {};

  // Truncate diff if too large
  const truncatedDiff = truncateToTokenLimit(options.diff, maxDiffTokens, {
    preserveEnd: 1000,
    marker: '\n\n[... diff truncated for length ...]\n\n',
  });

  const provider = createProvider(config);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  const startTime = Date.now();

  // Generate session summary (always)
  onProgress?.('Generating session summary...');

  // Convert session actions to summary format for the prompt
  const sessionActionsSummary = options.sessionActions?.map(action => {
    let actionDescription = '-';
    if (action.tool_input) {
      // Extract meaningful action description from tool input
      if (action.tool_input.file_path) {
        actionDescription = String(action.tool_input.file_path);
      } else if (action.tool_input.command) {
        actionDescription = String(action.tool_input.command).slice(0, 100);
      } else if (action.tool_input.pattern) {
        actionDescription = String(action.tool_input.pattern);
      } else if (action.tool_input.query) {
        actionDescription = String(action.tool_input.query);
      }
    }
    return {
      tool: action.tool_name,
      action: actionDescription,
    };
  });

  const summaryPrompt = createSessionSummaryPrompt({
    diff: truncatedDiff,
    fileList: options.fileList,
    commitMessages: options.commitMessages,
    projectName: options.projectName,
    sessionActions: sessionActionsSummary,
  });

  const summaryResponse = await provider.complete(summaryPrompt, {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 1000,
    temperature: 0.3,
  });

  totalInputTokens += summaryResponse.usage.inputTokens;
  totalOutputTokens += summaryResponse.usage.outputTokens;
  totalCost += summaryResponse.estimatedCost || 0;

  const result: LLMAnalysisResult = {
    summary: summaryResponse.content,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
    },
    latencyMs: 0,
  };

  // Generate changelog if requested
  if (includeChangelog) {
    onProgress?.('Generating changelog...');
    const changelogPrompt = createChangelogPrompt({
      diff: truncatedDiff,
      fileList: options.fileList,
      commitMessages: options.commitMessages,
    });

    const changelogResponse = await provider.complete(changelogPrompt, {
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 800,
      temperature: 0.3,
    });

    result.changelog = changelogResponse.content;
    totalInputTokens += changelogResponse.usage.inputTokens;
    totalOutputTokens += changelogResponse.usage.outputTokens;
    totalCost += changelogResponse.estimatedCost || 0;
  }

  // Generate ADR if requested
  if (includeADR) {
    onProgress?.('Analyzing architecture decisions...');
    const adrPrompt = createADRPrompt({
      diff: truncatedDiff,
      fileList: options.fileList,
      newDependencies: options.newDependencies,
    });

    const adrResponse = await provider.complete(adrPrompt, {
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 1000,
      temperature: 0.3,
    });

    result.architectureDecisions = adrResponse.content;
    totalInputTokens += adrResponse.usage.inputTokens;
    totalOutputTokens += adrResponse.usage.outputTokens;
    totalCost += adrResponse.estimatedCost || 0;
  }

  // Generate trade-off analysis if requested
  if (includeTradeoffs) {
    onProgress?.('Analyzing trade-offs...');
    const tradeoffPrompt = createTradeoffPrompt({
      diff: truncatedDiff,
      fileList: options.fileList,
    });

    const tradeoffResponse = await provider.complete(tradeoffPrompt, {
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 800,
      temperature: 0.3,
    });

    result.tradeoffs = tradeoffResponse.content;
    totalInputTokens += tradeoffResponse.usage.inputTokens;
    totalOutputTokens += tradeoffResponse.usage.outputTokens;
    totalCost += tradeoffResponse.estimatedCost || 0;
  }

  result.usage = {
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    estimatedCost: totalCost,
  };
  result.latencyMs = Date.now() - startTime;

  return result;
}

/**
 * Format LLM analysis result for markdown report
 */
export function formatLLMAnalysisForReport(analysis: LLMAnalysisResult): string {
  let output = '';

  output += '## AI Summary\n\n';
  output += analysis.summary + '\n\n';

  if (analysis.changelog) {
    output += '## Changelog\n\n';
    output += analysis.changelog + '\n\n';
  }

  if (analysis.architectureDecisions) {
    output += '## Architecture Decisions\n\n';
    output += analysis.architectureDecisions + '\n\n';
  }

  if (analysis.tradeoffs) {
    output += '## Trade-off Analysis\n\n';
    output += analysis.tradeoffs + '\n\n';
  }

  output += '---\n';
  output += `*LLM Analysis: ${analysis.usage.totalTokens} tokens, ${formatCost(analysis.usage.estimatedCost)}, ${(analysis.latencyMs / 1000).toFixed(1)}s*\n`;

  return output;
}
