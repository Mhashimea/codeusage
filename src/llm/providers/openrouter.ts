/**
 * OpenRouter Provider
 * Access multiple LLM providers through OpenRouter's unified API
 * https://openrouter.ai/
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
  httpStatusToErrorCode,
  isRetryableStatus,
} from '../utils.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MAX_TOKENS = 4096;

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
  stop?: string[];
}

interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterErrorResponse {
  error: {
    message: string;
    type: string;
    code: string | null;
  };
}

export class OpenRouterProvider implements LLMProvider {
  readonly name = 'openrouter' as const;
  readonly model: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: LLMConfig) {
    const resolvedKey = resolveApiKey(config.apiKey);
    if (!resolvedKey) {
      throw createLLMError(
        'OpenRouter API key is required. Set it via config or OPENROUTER_API_KEY environment variable.',
        'INVALID_API_KEY'
      );
    }

    this.apiKey = resolvedKey;
    this.model = config.model || 'openai/gpt-4o-mini';
    this.baseUrl = config.baseUrl || OPENROUTER_API_URL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async complete(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    const messages: OpenRouterMessage[] = [];

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const request: OpenRouterRequest = {
      model: this.model,
      messages,
      max_tokens: options?.maxTokens || DEFAULT_MAX_TOKENS,
    };

    if (options?.temperature !== undefined) {
      request.temperature = options.temperature;
    }

    if (options?.stopSequences?.length) {
      request.stop = options.stopSequences;
    }

    const makeRequest = async (): Promise<LLMResponse> => {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/hashimea/afterburn',
          'X-Title': 'Afterburn',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({})) as OpenRouterErrorResponse;
        const errorMessage = errorBody?.error?.message || `HTTP ${response.status}`;

        throw createLLMError(
          `OpenRouter API error: ${errorMessage}`,
          httpStatusToErrorCode(response.status),
          {
            retryable: isRetryableStatus(response.status),
            statusCode: response.status,
          }
        );
      }

      const data = await response.json() as OpenRouterResponse;
      const latencyMs = Date.now() - startTime;

      const content = data.choices[0]?.message?.content || '';

      return {
        content,
        usage: {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        model: data.model,
        latencyMs,
        estimatedCost: this.estimateCost(data.usage.prompt_tokens, data.usage.completion_tokens),
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
          console.warn(`OpenRouter request failed, retrying (${attempt}/${this.maxRetries}) in ${delayMs}ms...`);
        },
      }),
      this.timeout,
      `OpenRouter API request timed out after ${this.timeout}ms`
    );
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.complete('Hi', { maxTokens: 1 });
      return true;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        const llmError = error as LLMError;
        if (llmError.code === 'INVALID_API_KEY') {
          return false;
        }
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.status !== 0;
    } catch {
      return false;
    }
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    // OpenRouter pricing varies by model, approximate for gpt-4o-mini
    // $0.15/1M input, $0.60/1M output (same as OpenAI)
    const inputCost = (inputTokens / 1_000_000) * 0.15;
    const outputCost = (outputTokens / 1_000_000) * 0.60;
    return inputCost + outputCost;
  }
}
