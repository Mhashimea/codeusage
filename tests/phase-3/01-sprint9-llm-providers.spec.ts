/**
 * Phase 3 LLM Layer Tests - Sprint 9
 * Tests for LLM Provider Integration
 */

import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const CLI_PATH = path.join(PROJECT_ROOT, 'dist/cli.js');

// Import LLM modules
let llmModule: typeof import('../../src/llm/index.js');
let typesModule: typeof import('../../src/llm/types.js');
let utilsModule: typeof import('../../src/llm/utils.js');
let providersModule: typeof import('../../src/llm/providers/index.js');

test.beforeAll(async () => {
  llmModule = await import('../../dist/llm/index.js');
  typesModule = await import('../../dist/llm/types.js');
  utilsModule = await import('../../dist/llm/utils.js');
  providersModule = await import('../../dist/llm/providers/index.js');
});

test.describe('Phase 3: Sprint 9 - LLM Provider Integration', () => {
  test.describe('9.1 Provider Abstraction Layer', () => {

    test('9.1.1 - LLMProvider interface exports exist', async () => {
      // Types should be exported
      expect(llmModule.createLLMError).toBeDefined();
      expect(llmModule.MODEL_PRICING).toBeDefined();
      expect(llmModule.DEFAULT_MODELS).toBeDefined();
    });

    test('9.1.2 - createProvider factory function exists', async () => {
      expect(typeof providersModule.createProvider).toBe('function');
    });

    test('9.1.3 - createProvider creates Anthropic provider', async () => {
      const provider = providersModule.createProvider({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key',
      });

      expect(provider).toBeDefined();
      expect(provider.name).toBe('anthropic');
      expect(provider.model).toBe('claude-sonnet-4-20250514');
    });

    test('9.1.4 - createProvider creates OpenAI provider', async () => {
      const provider = providersModule.createProvider({
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: 'test-key',
      });

      expect(provider).toBeDefined();
      expect(provider.name).toBe('openai');
      expect(provider.model).toBe('gpt-4o-mini');
    });

    test('9.1.5 - createProvider creates Ollama provider', async () => {
      const provider = providersModule.createProvider({
        provider: 'ollama',
        model: 'llama3.1',
      });

      expect(provider).toBeDefined();
      expect(provider.name).toBe('ollama');
      expect(provider.model).toBe('llama3.1');
    });

    test('9.1.6 - createProvider creates OpenRouter provider', async () => {
      const provider = providersModule.createProvider({
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        apiKey: 'test-key',
      });

      expect(provider).toBeDefined();
      expect(provider.name).toBe('openrouter');
    });

    test('9.1.7 - createProvider throws on unknown provider', async () => {
      expect(() => {
        providersModule.createProvider({
          provider: 'unknown' as any,
          model: 'test',
        });
      }).toThrow();
    });

    test('9.1.8 - DEFAULT_MODELS has all providers', async () => {
      expect(typesModule.DEFAULT_MODELS.anthropic).toBeDefined();
      expect(typesModule.DEFAULT_MODELS.openai).toBeDefined();
      expect(typesModule.DEFAULT_MODELS.openrouter).toBeDefined();
      expect(typesModule.DEFAULT_MODELS.ollama).toBeDefined();
    });

    test('9.1.9 - MODEL_PRICING has Claude models', async () => {
      expect(typesModule.MODEL_PRICING['claude-sonnet-4-20250514']).toBeDefined();
      expect(typesModule.MODEL_PRICING['claude-3-5-sonnet-20241022']).toBeDefined();
    });

    test('9.1.10 - MODEL_PRICING has OpenAI models', async () => {
      expect(typesModule.MODEL_PRICING['gpt-4o']).toBeDefined();
      expect(typesModule.MODEL_PRICING['gpt-4o-mini']).toBeDefined();
    });

    test('9.1.11 - MODEL_PRICING has Ollama models (free)', async () => {
      const llamaPricing = typesModule.MODEL_PRICING['llama3'];
      expect(llamaPricing).toBeDefined();
      expect(llamaPricing.input).toBe(0);
      expect(llamaPricing.output).toBe(0);
    });
  });

  test.describe('9.2 Token Counting & Utilities', () => {

    test('9.2.1 - estimateTokenCount function exists', async () => {
      expect(typeof utilsModule.estimateTokenCount).toBe('function');
    });

    test('9.2.2 - estimateTokenCount returns number', async () => {
      const count = utilsModule.estimateTokenCount('Hello world');
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });

    test('9.2.3 - estimateTokenCount handles empty string', async () => {
      const count = utilsModule.estimateTokenCount('');
      expect(count).toBe(0);
    });

    test('9.2.4 - estimateTokenCount approximates ~4 chars per token', async () => {
      const text = 'a'.repeat(100);
      const count = utilsModule.estimateTokenCount(text);
      // Should be roughly 25 tokens for 100 chars
      expect(count).toBeGreaterThanOrEqual(20);
      expect(count).toBeLessThanOrEqual(30);
    });

    test('9.2.5 - estimateCost function exists', async () => {
      expect(typeof utilsModule.estimateCost).toBe('function');
    });

    test('9.2.6 - estimateCost calculates cost correctly', async () => {
      // Claude Sonnet: $3/1M input, $15/1M output
      const cost = utilsModule.estimateCost('claude-sonnet-4-20250514', 1000, 500);
      expect(cost).toBeGreaterThan(0);
    });

    test('9.2.7 - estimateCost returns 0 for unknown model', async () => {
      const cost = utilsModule.estimateCost('unknown-model', 1000, 500);
      expect(cost).toBe(0);
    });

    test('9.2.8 - formatCost function exists', async () => {
      expect(typeof utilsModule.formatCost).toBe('function');
    });

    test('9.2.9 - formatCost formats free correctly', async () => {
      expect(utilsModule.formatCost(0)).toBe('Free');
    });

    test('9.2.10 - formatCost formats small amounts', async () => {
      expect(utilsModule.formatCost(0.001)).toBe('<$0.01');
    });

    test('9.2.11 - formatCost formats normal amounts', async () => {
      expect(utilsModule.formatCost(1.50)).toBe('$1.50');
    });
  });

  test.describe('9.3 Retry & Timeout Logic', () => {

    test('9.3.1 - withRetry function exists', async () => {
      expect(typeof utilsModule.withRetry).toBe('function');
    });

    test('9.3.2 - withRetry succeeds on first try', async () => {
      let callCount = 0;
      const result = await utilsModule.withRetry(
        async () => {
          callCount++;
          return 'success';
        },
        { maxRetries: 3 }
      );

      expect(result).toBe('success');
      expect(callCount).toBe(1);
    });

    test('9.3.3 - withRetry throws on non-retryable error', async () => {
      await expect(
        utilsModule.withRetry(
          async () => {
            throw new Error('Non-retryable');
          },
          { maxRetries: 3 }
        )
      ).rejects.toThrow('Non-retryable');
    });

    test('9.3.4 - withTimeout function exists', async () => {
      expect(typeof utilsModule.withTimeout).toBe('function');
    });

    test('9.3.5 - withTimeout succeeds within time limit', async () => {
      const result = await utilsModule.withTimeout(
        async () => {
          await utilsModule.sleep(10);
          return 'success';
        },
        1000
      );

      expect(result).toBe('success');
    });

    test('9.3.6 - withTimeout throws on timeout', async () => {
      await expect(
        utilsModule.withTimeout(
          async () => {
            await utilsModule.sleep(1000);
            return 'success';
          },
          50
        )
      ).rejects.toThrow(/timed out/i);
    });

    test('9.3.7 - sleep function exists', async () => {
      expect(typeof utilsModule.sleep).toBe('function');
    });

    test('9.3.8 - sleep delays for specified time', async () => {
      const start = Date.now();
      await utilsModule.sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });

  test.describe('9.4 API Key Management', () => {

    test('9.4.1 - resolveApiKey function exists', async () => {
      expect(typeof utilsModule.resolveApiKey).toBe('function');
    });

    test('9.4.2 - resolveApiKey returns direct value', async () => {
      const key = utilsModule.resolveApiKey('sk-test-key');
      expect(key).toBe('sk-test-key');
    });

    test('9.4.3 - resolveApiKey returns undefined for undefined', async () => {
      const key = utilsModule.resolveApiKey(undefined);
      expect(key).toBeUndefined();
    });

    test('9.4.4 - resolveApiKey resolves env: prefix', async () => {
      // Set up test env var
      const originalValue = process.env.TEST_API_KEY;
      process.env.TEST_API_KEY = 'env-value-123';

      try {
        const key = utilsModule.resolveApiKey('env:TEST_API_KEY');
        expect(key).toBe('env-value-123');
      } finally {
        if (originalValue !== undefined) {
          process.env.TEST_API_KEY = originalValue;
        } else {
          delete process.env.TEST_API_KEY;
        }
      }
    });

    test('9.4.5 - maskApiKey function exists', async () => {
      expect(typeof utilsModule.maskApiKey).toBe('function');
    });

    test('9.4.6 - maskApiKey masks middle of key', async () => {
      const masked = utilsModule.maskApiKey('sk-1234567890abcdef');
      expect(masked).toBe('sk-1...cdef');
    });

    test('9.4.7 - maskApiKey handles undefined', async () => {
      const masked = utilsModule.maskApiKey(undefined);
      expect(masked).toBe('(not set)');
    });

    test('9.4.8 - maskApiKey handles short keys', async () => {
      const masked = utilsModule.maskApiKey('short');
      expect(masked).toBe('****');
    });
  });

  test.describe('9.5 Truncation', () => {

    test('9.5.1 - truncateToTokenLimit function exists', async () => {
      expect(typeof utilsModule.truncateToTokenLimit).toBe('function');
    });

    test('9.5.2 - truncateToTokenLimit returns original if under limit', async () => {
      const text = 'Short text';
      const result = utilsModule.truncateToTokenLimit(text, 1000);
      expect(result).toBe(text);
    });

    test('9.5.3 - truncateToTokenLimit truncates long text', async () => {
      const text = 'a'.repeat(40000); // ~10000 tokens
      const result = utilsModule.truncateToTokenLimit(text, 2000, {
        preserveEnd: 200,
        marker: '[TRUNCATED]',
      });
      expect(result.length).toBeLessThan(text.length);
      expect(result).toContain('TRUNCATED');
    });

    test('9.5.4 - truncateToTokenLimit preserves start and end', async () => {
      const text = 'START' + 'x'.repeat(40000) + 'END';
      const result = utilsModule.truncateToTokenLimit(text, 2000, {
        preserveEnd: 200,
      });
      expect(result.startsWith('START')).toBe(true);
      expect(result.endsWith('END')).toBe(true);
    });
  });

  test.describe('9.6 LLM Error Handling', () => {

    test('9.6.1 - createLLMError function exists', async () => {
      expect(typeof typesModule.createLLMError).toBe('function');
    });

    test('9.6.2 - createLLMError creates error with code', async () => {
      const error = typesModule.createLLMError('Test error', 'INVALID_API_KEY');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('INVALID_API_KEY');
      expect(error.name).toBe('LLMError');
    });

    test('9.6.3 - createLLMError supports retryable flag', async () => {
      const error = typesModule.createLLMError('Rate limited', 'RATE_LIMITED', {
        retryable: true,
      });
      expect(error.retryable).toBe(true);
    });

    test('9.6.4 - createLLMError supports cause', async () => {
      const cause = new Error('Original error');
      const error = typesModule.createLLMError('Wrapped', 'PROVIDER_ERROR', {
        cause,
      });
      expect(error.cause).toBe(cause);
    });

    test('9.6.5 - createLLMError supports statusCode', async () => {
      const error = typesModule.createLLMError('Not found', 'MODEL_NOT_FOUND', {
        statusCode: 404,
      });
      expect(error.statusCode).toBe(404);
    });
  });

  test.describe('9.7 Provider Detection', () => {

    test('9.7.1 - detectProvider function exists', async () => {
      expect(typeof providersModule.detectProvider).toBe('function');
    });

    test('9.7.2 - getProviderDisplayName function exists', async () => {
      expect(typeof providersModule.getProviderDisplayName).toBe('function');
    });

    test('9.7.3 - getProviderDisplayName returns friendly names', async () => {
      expect(providersModule.getProviderDisplayName('anthropic')).toBe('Anthropic Claude');
      expect(providersModule.getProviderDisplayName('openai')).toBe('OpenAI');
      expect(providersModule.getProviderDisplayName('ollama')).toBe('Ollama (Local)');
    });

    test('9.7.4 - validateProviderConfig function exists', async () => {
      expect(typeof providersModule.validateProviderConfig).toBe('function');
    });

    test('9.7.5 - validateProviderConfig returns validation result', async () => {
      const result = await providersModule.validateProviderConfig({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        // No API key - should fail
      });

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('API key');
    });

    test('9.7.6 - isOllamaRunning function exists', async () => {
      expect(typeof providersModule.isOllamaRunning).toBe('function');
    });

    test('9.7.7 - getOllamaModels function exists', async () => {
      expect(typeof providersModule.getOllamaModels).toBe('function');
    });
  });

  test.describe('9.8 Provider Classes', () => {

    test('9.8.1 - AnthropicProvider class exists', async () => {
      expect(providersModule.AnthropicProvider).toBeDefined();
    });

    test('9.8.2 - OpenAIProvider class exists', async () => {
      expect(providersModule.OpenAIProvider).toBeDefined();
    });

    test('9.8.3 - OpenRouterProvider class exists', async () => {
      expect(providersModule.OpenRouterProvider).toBeDefined();
    });

    test('9.8.4 - OllamaProvider class exists', async () => {
      expect(providersModule.OllamaProvider).toBeDefined();
    });

    test('9.8.5 - Provider has complete method', async () => {
      const provider = providersModule.createProvider({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key',
      });

      expect(typeof provider.complete).toBe('function');
    });

    test('9.8.6 - Provider has validateConfig method', async () => {
      const provider = providersModule.createProvider({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key',
      });

      expect(typeof provider.validateConfig).toBe('function');
    });

    test('9.8.7 - Provider has estimateCost method', async () => {
      const provider = providersModule.createProvider({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key',
      });

      expect(typeof provider.estimateCost).toBe('function');
    });

    test('9.8.8 - Provider has isAvailable method', async () => {
      const provider = providersModule.createProvider({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'test-key',
      });

      expect(typeof provider.isAvailable).toBe('function');
    });
  });

  test.describe('9.9 CLI Integration', () => {

    test('9.9.1 - --explain flag is recognized', async () => {
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} --explain --help 2>&1 || true`
      );
      const output = stdout + stderr;
      expect(output).not.toContain('unknown option');
    });

    test('9.9.2 - --provider flag is recognized', async () => {
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} --provider anthropic --help 2>&1 || true`
      );
      const output = stdout + stderr;
      expect(output).not.toContain('unknown option');
    });

    test('9.9.3 - --model flag is recognized', async () => {
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} --model gpt-4o-mini --help 2>&1 || true`
      );
      const output = stdout + stderr;
      expect(output).not.toContain('unknown option');
    });
  });
});
