/**
 * LLM integration module - BYOK (Bring Your Own Key) LLM calls
 */

import type { LLMConfig } from '../types.js';

export interface LLMAnalysisResult {
  summary: string;
  architectureDecisions: string[];
  intentChangelog: string[];
  tradeoffs?: string[];
}

export function analyzeDiffWithLLM(
  _diff: string,
  _context: string,
  _config: LLMConfig
): LLMAnalysisResult {
  // TODO: Implement LLM analysis using user's API key
  // - Support Anthropic (Claude)
  // - Support OpenAI
  // - Support Ollama (local)
  throw new Error('Not implemented');
}
