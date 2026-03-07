#!/usr/bin/env npx ts-node
/**
 * Quick test for LLM provider connection
 */

import { createProvider } from '../src/llm/index.js';

async function main() {
  // Load env vars from .env file
  const fs = await import('fs');
  const envPath = new URL('../.env', import.meta.url).pathname;
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('Testing OpenRouter connection...');
  console.log(`API Key: ${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`);

  const provider = createProvider({
    provider: 'openrouter',
    model: 'openai/gpt-4o-mini',
    apiKey,
  });

  try {
    const response = await provider.complete('Say "Hello from Afterburn!" in exactly 5 words.', {
      maxTokens: 50,
      temperature: 0.7,
    });

    console.log('\n✅ Connection successful!');
    console.log(`Model: ${response.model}`);
    console.log(`Response: ${response.content}`);
    console.log(`Tokens: ${response.usage.totalTokens} (in: ${response.usage.inputTokens}, out: ${response.usage.outputTokens})`);
    console.log(`Latency: ${response.latencyMs}ms`);
    console.log(`Estimated cost: $${response.estimatedCost?.toFixed(6) || '0'}`);
  } catch (error) {
    console.error('\n❌ Connection failed:', error);
    process.exit(1);
  }
}

main();
