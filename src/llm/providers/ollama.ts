/**
 * Ollama Provider
 * Local LLM support via Ollama (free, no API key required)
 * https://ollama.ai/
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
} from '../utils.js';

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_TIMEOUT_MS = 120000; // 2 minutes for local inference
const DEFAULT_MAX_RETRIES = 2;

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  options?: {
    temperature?: number;
    num_predict?: number;
    stop?: string[];
  };
  stream: false;
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaTagsResponse {
  models: Array<{
    name: string;
    modified_at: string;
    size: number;
  }>;
}

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama' as const;
  readonly model: string;

  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: LLMConfig) {
    this.model = config.model || 'llama3.1';
    this.baseUrl = config.baseUrl || DEFAULT_OLLAMA_URL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async complete(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    const request: OllamaGenerateRequest = {
      model: this.model,
      prompt,
      stream: false,
    };

    if (options?.systemPrompt) {
      request.system = options.systemPrompt;
    }

    if (options?.temperature !== undefined || options?.maxTokens || options?.stopSequences?.length) {
      request.options = {};
      if (options.temperature !== undefined) {
        request.options.temperature = options.temperature;
      }
      if (options.maxTokens) {
        request.options.num_predict = options.maxTokens;
      }
      if (options.stopSequences?.length) {
        request.options.stop = options.stopSequences;
      }
    }

    const makeRequest = async (): Promise<LLMResponse> => {
      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });
      } catch (error) {
        throw createLLMError(
          `Cannot connect to Ollama at ${this.baseUrl}. Is Ollama running? Start it with: ollama serve`,
          'NETWORK_ERROR',
          { retryable: true, cause: error as Error }
        );
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');

        if (response.status === 404 && errorText.includes('model')) {
          throw createLLMError(
            `Model "${this.model}" not found in Ollama. Pull it with: ollama pull ${this.model}`,
            'MODEL_NOT_FOUND',
            { retryable: false, statusCode: response.status }
          );
        }

        throw createLLMError(
          `Ollama API error: ${errorText || `HTTP ${response.status}`}`,
          'PROVIDER_ERROR',
          { retryable: response.status >= 500, statusCode: response.status }
        );
      }

      const data = await response.json() as OllamaGenerateResponse;
      const latencyMs = Date.now() - startTime;

      // Ollama reports token counts in response
      const inputTokens = data.prompt_eval_count || 0;
      const outputTokens = data.eval_count || 0;

      return {
        content: data.response,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
        model: data.model,
        latencyMs,
        estimatedCost: 0, // Ollama is free
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
          console.warn(`Ollama request failed, retrying (${attempt}/${this.maxRetries}) in ${delayMs}ms...`);
        },
      }),
      this.timeout,
      `Ollama request timed out after ${this.timeout}ms. Local inference can be slow; try a smaller model.`
    );
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Check if Ollama is running and model is available
      const available = await this.isAvailable();
      if (!available) return false;

      // Check if model exists
      const models = await this.listModels();
      return models.some(m => m.startsWith(this.model) || this.model.startsWith(m));
    } catch {
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models in Ollama
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as OllamaTagsResponse;
      return data.models.map(m => m.name);
    } catch {
      return [];
    }
  }

  estimateCost(_inputTokens: number, _outputTokens: number): number {
    return 0; // Ollama is free (local inference)
  }
}

/**
 * Check if Ollama is running locally
 */
export async function isOllamaRunning(baseUrl: string = DEFAULT_OLLAMA_URL): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get list of available Ollama models
 */
export async function getOllamaModels(baseUrl: string = DEFAULT_OLLAMA_URL): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { method: 'GET' });
    if (!response.ok) return [];
    const data = await response.json() as OllamaTagsResponse;
    return data.models.map(m => m.name);
  } catch {
    return [];
  }
}
