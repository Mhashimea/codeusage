/**
 * LLM Provider Factory
 * Creates provider instances based on configuration
 */

import { LLMConfig, LLMProvider, LLMProviderName, DEFAULT_MODELS, createLLMError } from '../types.js';
import { resolveApiKey } from '../utils.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { OpenRouterProvider } from './openrouter.js';
import { OllamaProvider, isOllamaRunning, getOllamaModels } from './ollama.js';

export { AnthropicProvider } from './anthropic.js';
export { OpenAIProvider } from './openai.js';
export { OpenRouterProvider } from './openrouter.js';
export { OllamaProvider, isOllamaRunning, getOllamaModels } from './ollama.js';

/**
 * Create an LLM provider instance based on configuration
 */
export function createProvider(config: LLMConfig): LLMProvider {
  const { provider } = config;

  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider(config);

    case 'openai':
      return new OpenAIProvider(config);

    case 'openrouter':
      return new OpenRouterProvider(config);

    case 'ollama':
      return new OllamaProvider(config);

    default:
      throw createLLMError(
        `Unknown LLM provider: ${provider}. Supported: anthropic, openai, openrouter, ollama`,
        'CONFIGURATION_ERROR'
      );
  }
}

/**
 * Auto-detect the best available provider
 * Priority: Anthropic (if key) > OpenAI (if key) > OpenRouter (if key) > Ollama (if running)
 */
export async function detectProvider(): Promise<LLMConfig | null> {
  // Check for Anthropic API key
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    return {
      provider: 'anthropic',
      model: DEFAULT_MODELS.anthropic,
      apiKey: anthropicKey,
    };
  }

  // Check for OpenAI API key
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      provider: 'openai',
      model: DEFAULT_MODELS.openai,
      apiKey: openaiKey,
    };
  }

  // Check for OpenRouter API key
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    return {
      provider: 'openrouter',
      model: DEFAULT_MODELS.openrouter,
      apiKey: openrouterKey,
    };
  }

  // Check for local Ollama
  if (await isOllamaRunning()) {
    const models = await getOllamaModels();
    const model = models.length > 0 ? models[0] : DEFAULT_MODELS.ollama;
    return {
      provider: 'ollama',
      model,
    };
  }

  return null;
}

/**
 * Get user-friendly provider name
 */
export function getProviderDisplayName(provider: LLMProviderName): string {
  switch (provider) {
    case 'anthropic':
      return 'Anthropic Claude';
    case 'openai':
      return 'OpenAI';
    case 'openrouter':
      return 'OpenRouter';
    case 'ollama':
      return 'Ollama (Local)';
    default:
      return provider;
  }
}

/**
 * Validate that a provider configuration is usable
 */
export async function validateProviderConfig(config: LLMConfig): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    // Check API key for cloud providers
    if (config.provider === 'anthropic' || config.provider === 'openai' || config.provider === 'openrouter') {
      const apiKey = resolveApiKey(config.apiKey);
      if (!apiKey) {
        const envVars: Record<string, string> = {
          anthropic: 'ANTHROPIC_API_KEY',
          openai: 'OPENAI_API_KEY',
          openrouter: 'OPENROUTER_API_KEY',
        };
        const envVar = envVars[config.provider] || 'API_KEY';
        return {
          valid: false,
          error: `API key required. Set ${envVar} environment variable or configure in .afterburnrc`,
        };
      }
    }

    // Check Ollama availability
    if (config.provider === 'ollama') {
      const running = await isOllamaRunning(config.baseUrl);
      if (!running) {
        return {
          valid: false,
          error: `Ollama is not running. Start it with: ollama serve`,
        };
      }

      const models = await getOllamaModels(config.baseUrl);
      if (!models.some(m => m.startsWith(config.model) || config.model.startsWith(m))) {
        return {
          valid: false,
          error: `Model "${config.model}" not found. Pull it with: ollama pull ${config.model}`,
        };
      }
    }

    // Try to create provider (validates config further)
    const provider = createProvider(config);
    const isValid = await provider.validateConfig();

    if (!isValid) {
      return {
        valid: false,
        error: 'API key validation failed. Please check your credentials.',
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown configuration error',
    };
  }
}
