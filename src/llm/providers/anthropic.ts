/**
 * Anthropic Claude Provider
 * Supports Claude Sonnet, Opus, and Haiku models
 */

import {
  LLMProvider,
  LLMConfig,
  LLMOptions,
  LLMResponse,
  LLMError,
  createLLMError,
} from '../types.js';
import {
  withRetry,
  withTimeout,
  resolveApiKey,
  estimateCost,
  httpStatusToErrorCode,
  isRetryableStatus,
} from '../utils.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MAX_TOKENS = 4096;

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string;
  stop_sequences?: string[];
  temperature?: number;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{ type: 'text'; text: string }>;
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicErrorResponse {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic' as const;
  readonly model: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: LLMConfig) {
    const resolvedKey = resolveApiKey(config.apiKey);
    if (!resolvedKey) {
      throw createLLMError(
        'Anthropic API key is required. Set it via config or ANTHROPIC_API_KEY environment variable.',
        'INVALID_API_KEY'
      );
    }

    this.apiKey = resolvedKey;
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.baseUrl = config.baseUrl || ANTHROPIC_API_URL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async complete(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    const request: AnthropicRequest = {
      model: this.model,
      max_tokens: options?.maxTokens || DEFAULT_MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    };

    if (options?.systemPrompt) {
      request.system = options.systemPrompt;
    }

    if (options?.temperature !== undefined) {
      request.temperature = options.temperature;
    }

    if (options?.stopSequences?.length) {
      request.stop_sequences = options.stopSequences;
    }

    const makeRequest = async (): Promise<LLMResponse> => {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({})) as AnthropicErrorResponse;
        const errorMessage = errorBody?.error?.message || `HTTP ${response.status}`;

        throw createLLMError(
          `Anthropic API error: ${errorMessage}`,
          httpStatusToErrorCode(response.status),
          {
            retryable: isRetryableStatus(response.status),
            statusCode: response.status,
          }
        );
      }

      const data = await response.json() as AnthropicResponse;
      const latencyMs = Date.now() - startTime;

      const content = data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');

      return {
        content,
        usage: {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        model: data.model,
        latencyMs,
        estimatedCost: this.estimateCost(data.usage.input_tokens, data.usage.output_tokens),
      };
    };

    return withTimeout(
      () => withRetry(makeRequest, {
        maxRetries: this.maxRetries,
        isRetryable: (error) => {
          if (error && typeof error === 'object' && 'retryable' in error) {
            return (error as LLMError).retryable;
          }
          return false;
        },
        onRetry: (attempt, _error, delayMs) => {
          console.warn(`Anthropic request failed, retrying (${attempt}/${this.maxRetries}) in ${delayMs}ms...`);
        },
      }),
      this.timeout,
      `Anthropic API request timed out after ${this.timeout}ms`
    );
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Make a minimal request to validate API key
      await this.complete('Hi', { maxTokens: 1 });
      return true;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        const llmError = error as LLMError;
        if (llmError.code === 'INVALID_API_KEY') {
          return false;
        }
      }
      // Other errors (network, etc.) - might be valid config but service issue
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      // Any response means API is reachable
      return response.status !== 0;
    } catch {
      return false;
    }
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return estimateCost(this.model, inputTokens, outputTokens);
  }
}
