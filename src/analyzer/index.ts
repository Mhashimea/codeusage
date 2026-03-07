/**
 * Main analyzer module - orchestrates all analysis components
 */

import type { AfterBurnConfig, AnalysisResult } from '../types.js';

export async function analyze(
  _path: string,
  _config: AfterBurnConfig
): Promise<AnalysisResult> {
  // TODO: Implement analysis orchestration
  // 1. Parse git diff
  // 2. Run static analysis rules
  // 3. Check dependencies
  // 4. Optionally run LLM analysis
  throw new Error('Not implemented');
}
