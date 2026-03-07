/**
 * LLM Provider Types and Interfaces
 * Core abstraction for multi-provider LLM support
 */

export type LLMProviderName = 'anthropic' | 'openai' | 'openrouter' | 'ollama';

export interface LLMOptions {
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature (0-1, lower = more deterministic) */
  temperature?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** System prompt */
  systemPrompt?: string;
}

export interface LLMResponse {
  /** Generated text content */
  content: string;
  /** Token usage statistics */
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  /** Model used for generation */
  model: string;
  /** Response latency in milliseconds */
  latencyMs: number;
  /** Estimated cost in USD (if available) */
  estimatedCost?: number;
}

export interface LLMConfig {
  /** Provider name */
  provider: LLMProviderName;
  /** Model identifier */
  model: string;
  /** API key (direct value or env: reference) */
  apiKey?: string;
  /** Base URL for API (optional, for custom endpoints) */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retries on failure */
  maxRetries?: number;
}

export interface LLMProvider {
  /** Provider name */
  readonly name: LLMProviderName;

  /** Model being used */
  readonly model: string;

  /**
   * Send a completion request to the LLM
   * @param prompt - The user prompt
   * @param options - Generation options
   * @returns LLM response with content and metadata
   */
  complete(prompt: string, options?: LLMOptions): Promise<LLMResponse>;

  /**
   * Validate the provider configuration (API key, connectivity)
   * @returns true if configuration is valid
   */
  validateConfig(): Promise<boolean>;

  /**
   * Estimate cost for a given token count
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @returns Estimated cost in USD
   */
  estimateCost(inputTokens: number, outputTokens: number): number;

  /**
   * Check if provider is available (API reachable, Ollama running, etc.)
   */
  isAvailable(): Promise<boolean>;
}

export interface LLMError extends Error {
  /** Error code for programmatic handling */
  code: LLMErrorCode;
  /** Original error from provider SDK */
  cause?: Error;
  /** Whether the error is retryable */
  retryable: boolean;
  /** HTTP status code if applicable */
  statusCode?: number;
}

export type LLMErrorCode =
  | 'INVALID_API_KEY'
  | 'RATE_LIMITED'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'MODEL_NOT_FOUND'
  | 'PROVIDER_ERROR'
  | 'CONFIGURATION_ERROR';

/**
 * Create a typed LLM error
 */
export function createLLMError(
  message: string,
  code: LLMErrorCode,
  options?: { cause?: Error; retryable?: boolean; statusCode?: number }
): LLMError {
  const error = new Error(message) as LLMError;
  error.name = 'LLMError';
  error.code = code;
  error.cause = options?.cause;
  error.retryable = options?.retryable ?? false;
  error.statusCode = options?.statusCode;
  return error;
}

/**
 * Pricing per 1M tokens (input/output) in USD
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  // Ollama (local, free)
  'llama3': { input: 0, output: 0 },
  'llama3.1': { input: 0, output: 0 },
  'codellama': { input: 0, output: 0 },
  'mistral': { input: 0, output: 0 },
  'mixtral': { input: 0, output: 0 },
};

/**
 * Default models for each provider
 */
export const DEFAULT_MODELS: Record<LLMProviderName, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o-mini',
  openrouter: 'openai/gpt-4o-mini',
  ollama: 'llama3.1',
};
