import type { ModelPricing } from "./types.js";

/**
 * Last updated date for pricing information
 * Update this when Anthropic publishes pricing changes
 */
export const PRICING_LAST_UPDATED = "2026-03-01";

/**
 * Model pricing per 1,000,000 tokens (USD)
 * Source: Anthropic pricing page
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude 4 family
  "claude-opus-4": { input: 15.0, output: 75.0, cache: 1.5 },
  "claude-opus-4-5": { input: 15.0, output: 75.0, cache: 1.5 },
  "claude-sonnet-4": { input: 3.0, output: 15.0, cache: 0.3 },
  "claude-sonnet-4-5": { input: 3.0, output: 15.0, cache: 0.3 },
  "claude-haiku-4": { input: 0.8, output: 4.0, cache: 0.08 },
  "claude-haiku-4-5": { input: 0.8, output: 4.0, cache: 0.08 },

  // Claude 3.5 family (legacy)
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0, cache: 0.3 },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0, cache: 0.08 },

  // Claude 3 family (legacy)
  "claude-3-opus-20240229": { input: 15.0, output: 75.0, cache: 1.5 },
  "claude-3-sonnet-20240229": { input: 3.0, output: 15.0, cache: 0.3 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25, cache: 0.03 },
};

/**
 * Default model to use for pricing if the model name is not found
 */
const FALLBACK_MODEL = "claude-sonnet-4-5";

/**
 * Calculate the estimated cost for a task based on token usage
 *
 * @param model - The model name (e.g., "claude-sonnet-4-5")
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param cacheTokens - Number of cache read tokens
 * @returns Estimated cost in USD
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheTokens: number
): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING[FALLBACK_MODEL];

  if (!pricing) {
    // Should never happen since FALLBACK_MODEL is always defined
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const cacheCost = (cacheTokens / 1_000_000) * pricing.cache;

  return inputCost + outputCost + cacheCost;
}

/**
 * Format a USD cost for display
 * Always uses the ~ prefix to indicate estimate
 *
 * @param usd - Cost in USD
 * @returns Formatted string (e.g., "~$0.079")
 */
export function formatCost(usd: number): string {
  if (usd < 0.001) {
    return "~$0.00";
  }
  if (usd < 1) {
    return `~$${usd.toFixed(3)}`;
  }
  return `~$${usd.toFixed(2)}`;
}

/**
 * Format token count for display (with K/M suffixes)
 *
 * @param tokens - Number of tokens
 * @returns Formatted string (e.g., "1.2K", "3.5M")
 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return tokens.toString();
  }
  if (tokens < 1_000_000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return `${(tokens / 1_000_000).toFixed(2)}M`;
}

/**
 * Get all supported model names
 */
export function getSupportedModels(): string[] {
  return Object.keys(MODEL_PRICING);
}

/**
 * Check if a model name is supported
 */
export function isModelSupported(model: string): boolean {
  return model in MODEL_PRICING;
}
