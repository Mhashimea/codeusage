/**
 * LLM Module
 * Multi-provider LLM integration for Afterburn
 */

// Types
export {
  LLMProviderName,
  LLMOptions,
  LLMResponse,
  LLMConfig,
  LLMProvider,
  LLMError,
  LLMErrorCode,
  createLLMError,
  MODEL_PRICING,
  DEFAULT_MODELS,
} from './types.js';

// Utilities
export {
  estimateTokenCount,
  estimateCost,
  formatCost,
  truncateToTokenLimit,
  resolveApiKey,
  maskApiKey,
  withRetry,
  withTimeout,
  sleep,
} from './utils.js';

// Providers
export {
  createProvider,
  detectProvider,
  validateProviderConfig,
  getProviderDisplayName,
  AnthropicProvider,
  OpenAIProvider,
  OpenRouterProvider,
  OllamaProvider,
  isOllamaRunning,
  getOllamaModels,
} from './providers/index.js';

// Prompts
export {
  SYSTEM_PROMPT,
  createSessionSummaryPrompt,
  createChangelogPrompt,
  createADRPrompt,
  createTradeoffPrompt,
} from './prompts.js';

// Analyzer
export {
  analyzeWithLLM,
  formatLLMAnalysisForReport,
  type LLMAnalysisResult,
  type AnalyzerOptions,
} from './analyzer.js';
