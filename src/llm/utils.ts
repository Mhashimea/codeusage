/**
 * LLM Utility Functions
 * Token counting, retry logic, timeout handling
 */

import { LLMError, LLMErrorCode, createLLMError, MODEL_PRICING } from './types.js';

/**
 * Approximate token count for text
 * Uses a simple heuristic: ~4 characters per token for English
 * This is a rough estimate; actual tokenization varies by model
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Rough approximation: 1 token ≈ 4 characters for English
  // This is conservative; actual count may be lower
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost for a prompt and expected output
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    // Unknown model, return 0 (could be local/free)
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Format cost for display
 */
export function formatCost(costUsd: number): string {
  if (costUsd === 0) return 'Free';
  if (costUsd < 0.01) return `<$0.01`;
  return `$${costUsd.toFixed(2)}`;
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelayMs - Base delay in milliseconds
 * @param maxDelayMs - Maximum delay cap
 */
export function getBackoffDelay(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000
): number {
  // Exponential backoff with jitter
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Up to 30% jitter
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Retry options
 */
export interface RetryOptions {
  /** Maximum number of retries */
  maxRetries: number;
  /** Base delay between retries in ms */
  baseDelayMs?: number;
  /** Maximum delay between retries in ms */
  maxDelayMs?: number;
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Callback on retry (for logging) */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxRetries,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    isRetryable = (error: unknown) => {
      if (error && typeof error === 'object' && 'retryable' in error) {
        return (error as LLMError).retryable;
      }
      return false;
    },
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries || !isRetryable(error)) {
        throw error;
      }

      const delayMs = getBackoffDelay(attempt, baseDelayMs, maxDelayMs);
      onRetry?.(attempt + 1, error, delayMs);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Execute a function with a timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(createLLMError(
        errorMessage || `Operation timed out after ${timeoutMs}ms`,
        'TIMEOUT',
        { retryable: true }
      ));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Truncate text to fit within token limit
 * Preserves beginning and end, truncates middle with marker
 */
export function truncateToTokenLimit(
  text: string,
  maxTokens: number,
  options?: { preserveEnd?: number; marker?: string }
): string {
  const currentTokens = estimateTokenCount(text);
  if (currentTokens <= maxTokens) {
    return text;
  }

  const { preserveEnd = 500, marker = '\n\n[... content truncated ...]\n\n' } = options ?? {};

  // Estimate characters for token limit
  const maxChars = maxTokens * 4;
  const markerChars = marker.length;
  const preserveEndChars = preserveEnd * 4;
  const preserveStartChars = maxChars - markerChars - preserveEndChars;

  if (preserveStartChars <= 0) {
    // Just take the end if not enough room
    return text.slice(-maxChars);
  }

  const start = text.slice(0, preserveStartChars);
  const end = text.slice(-preserveEndChars);

  return start + marker + end;
}

/**
 * Parse API key from config value
 * Supports direct value or env: reference
 */
export function resolveApiKey(configValue: string | undefined): string | undefined {
  if (!configValue) {
    return undefined;
  }

  // Check for env: prefix
  if (configValue.startsWith('env:')) {
    const envVar = configValue.slice(4);
    return process.env[envVar];
  }

  // Direct value
  return configValue;
}

/**
 * Mask API key for safe logging
 */
export function maskApiKey(key: string | undefined): string {
  if (!key) return '(not set)';
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '...' + key.slice(-4);
}

/**
 * Classify HTTP status code to LLM error code
 */
export function httpStatusToErrorCode(status: number): LLMErrorCode {
  switch (status) {
    case 401:
    case 403:
      return 'INVALID_API_KEY';
    case 429:
      return 'RATE_LIMITED';
    case 400:
      return 'CONFIGURATION_ERROR';
    case 404:
      return 'MODEL_NOT_FOUND';
    case 408:
    case 504:
      return 'TIMEOUT';
    default:
      if (status >= 500) return 'PROVIDER_ERROR';
      return 'NETWORK_ERROR';
  }
}

/**
 * Check if an HTTP status code indicates a retryable error
 */
export function isRetryableStatus(status: number): boolean {
  // Retry on rate limits, timeouts, and server errors
  return status === 429 || status === 408 || status === 504 || status >= 500;
}
