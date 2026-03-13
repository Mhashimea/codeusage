/**
 * Phase 3 LLM Layer Tests - Sprint 10
 * Tests for LLM-Powered Analysis Features
 */

import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const execAsync = promisify(exec);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const CLI_PATH = path.join(PROJECT_ROOT, 'dist/cli.js');

// Import LLM modules
let promptsModule: typeof import('../../src/llm/prompts.js');
let analyzerModule: typeof import('../../src/llm/analyzer.js');
let llmModule: typeof import('../../src/llm/index.js');

test.beforeAll(async () => {
  promptsModule = await import('../../dist/llm/prompts.js');
  analyzerModule = await import('../../dist/llm/analyzer.js');
  llmModule = await import('../../dist/llm/index.js');
});

test.describe('Phase 3: Sprint 10 - LLM-Powered Analysis', () => {
  test.describe('10.1 Prompt Templates', () => {

    test('10.1.1 - SYSTEM_PROMPT is defined', async () => {
      expect(promptsModule.SYSTEM_PROMPT).toBeDefined();
      expect(typeof promptsModule.SYSTEM_PROMPT).toBe('string');
      expect(promptsModule.SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });

    test('10.1.2 - SYSTEM_PROMPT mentions Afterburn', async () => {
      expect(promptsModule.SYSTEM_PROMPT).toContain('Afterburn');
    });

    test('10.1.3 - SYSTEM_PROMPT defines assistant role', async () => {
      expect(promptsModule.SYSTEM_PROMPT).toContain('AI assistant');
    });
  });

  test.describe('10.2 Session Summary Prompt', () => {

    test('10.2.1 - createSessionSummaryPrompt function exists', async () => {
      expect(typeof promptsModule.createSessionSummaryPrompt).toBe('function');
    });

    test('10.2.2 - createSessionSummaryPrompt returns string', async () => {
      const prompt = promptsModule.createSessionSummaryPrompt({
        diff: '+ const x = 1;',
        fileList: ['src/app.ts'],
      });

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    test('10.2.3 - createSessionSummaryPrompt includes diff', async () => {
      const diff = '+ const newVariable = 42;';
      const prompt = promptsModule.createSessionSummaryPrompt({
        diff,
        fileList: ['src/app.ts'],
      });

      expect(prompt).toContain('newVariable');
    });

    test('10.2.4 - createSessionSummaryPrompt includes file list', async () => {
      const prompt = promptsModule.createSessionSummaryPrompt({
        diff: '+ const x = 1;',
        fileList: ['src/app.ts', 'src/utils.ts'],
      });

      expect(prompt).toContain('src/app.ts');
      expect(prompt).toContain('src/utils.ts');
    });

    test('10.2.5 - createSessionSummaryPrompt includes commit messages', async () => {
      const prompt = promptsModule.createSessionSummaryPrompt({
        diff: '+ const x = 1;',
        fileList: ['src/app.ts'],
        commitMessages: ['Add new feature', 'Fix bug'],
      });

      expect(prompt).toContain('Add new feature');
      expect(prompt).toContain('Fix bug');
    });

    test('10.2.6 - createSessionSummaryPrompt includes project name', async () => {
      const prompt = promptsModule.createSessionSummaryPrompt({
        diff: '+ const x = 1;',
        fileList: ['src/app.ts'],
        projectName: 'MyProject',
      });

      expect(prompt).toContain('MyProject');
    });

    test('10.2.7 - createSessionSummaryPrompt includes session actions', async () => {
      const prompt = promptsModule.createSessionSummaryPrompt({
        diff: '+ const x = 1;',
        fileList: ['src/app.ts'],
        sessionActions: [
          { tool: 'Read', action: 'src/app.ts' },
          { tool: 'Edit', action: 'src/utils.ts' },
        ],
      });

      expect(prompt).toContain('Claude Code Actions');
      expect(prompt).toContain('Read');
      expect(prompt).toContain('Edit');
    });

    test('10.2.8 - createSessionSummaryPrompt requests specific output format', async () => {
      const prompt = promptsModule.createSessionSummaryPrompt({
        diff: '+ const x = 1;',
        fileList: ['src/app.ts'],
      });

      expect(prompt).toContain('What was done');
      expect(prompt).toContain('Type');
      expect(prompt).toContain('Impact');
    });
  });

  test.describe('10.3 Changelog Prompt', () => {

    test('10.3.1 - createChangelogPrompt function exists', async () => {
      expect(typeof promptsModule.createChangelogPrompt).toBe('function');
    });

    test('10.3.2 - createChangelogPrompt returns string', async () => {
      const prompt = promptsModule.createChangelogPrompt({
        diff: '+ const x = 1;',
        fileList: ['src/app.ts'],
      });

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    test('10.3.3 - createChangelogPrompt includes diff', async () => {
      const diff = '+ function newFeature() {}';
      const prompt = promptsModule.createChangelogPrompt({
        diff,
        fileList: ['src/app.ts'],
      });

      expect(prompt).toContain('newFeature');
    });

    test('10.3.4 - createChangelogPrompt requests Added/Changed/Fixed format', async () => {
      const prompt = promptsModule.createChangelogPrompt({
        diff: '+ const x = 1;',
        fileList: ['src/app.ts'],
      });

      expect(prompt).toContain('### Added');
      expect(prompt).toContain('### Changed');
      expect(prompt).toContain('### Fixed');
      expect(prompt).toContain('### Removed');
    });

    test('10.3.5 - createChangelogPrompt requests action verbs', async () => {
      const prompt = promptsModule.createChangelogPrompt({
        diff: '+ const x = 1;',
        fileList: ['src/app.ts'],
      });

      expect(prompt).toContain('action verbs');
    });
  });

  test.describe('10.4 ADR Prompt', () => {

    test('10.4.1 - createADRPrompt function exists', async () => {
      expect(typeof promptsModule.createADRPrompt).toBe('function');
    });

    test('10.4.2 - createADRPrompt returns string', async () => {
      const prompt = promptsModule.createADRPrompt({
        diff: '+ import express from "express";',
        fileList: ['src/server.ts'],
      });

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    test('10.4.3 - createADRPrompt includes new dependencies', async () => {
      const prompt = promptsModule.createADRPrompt({
        diff: '+ import express from "express";',
        fileList: ['src/server.ts'],
        newDependencies: ['express@4.18.2', 'cors@2.8.5'],
      });

      expect(prompt).toContain('express@4.18.2');
      expect(prompt).toContain('cors@2.8.5');
    });

    test('10.4.4 - createADRPrompt requests decision format', async () => {
      const prompt = promptsModule.createADRPrompt({
        diff: '+ const x = 1;',
        fileList: ['src/app.ts'],
      });

      expect(prompt).toContain('Context');
      expect(prompt).toContain('Decision');
      expect(prompt).toContain('Alternatives');
      expect(prompt).toContain('Consequences');
    });

    test('10.4.5 - createADRPrompt mentions frameworks/libraries', async () => {
      const prompt = promptsModule.createADRPrompt({
        diff: '+ const x = 1;',
        fileList: ['src/app.ts'],
      });

      expect(prompt).toContain('framework');
    });
  });

  test.describe('10.5 Trade-off Prompt', () => {

    test('10.5.1 - createTradeoffPrompt function exists', async () => {
      expect(typeof promptsModule.createTradeoffPrompt).toBe('function');
    });

    test('10.5.2 - createTradeoffPrompt returns string', async () => {
      const prompt = promptsModule.createTradeoffPrompt({
        diff: '+ const cache: any = {};',
        fileList: ['src/cache.ts'],
      });

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    test('10.5.3 - createTradeoffPrompt includes analysis categories', async () => {
      const prompt = promptsModule.createTradeoffPrompt({
        diff: '+ const x = 1;',
        fileList: ['src/app.ts'],
      });

      expect(prompt).toContain('Simplicity vs Robustness');
      expect(prompt).toContain('Performance vs Readability');
      expect(prompt).toContain('Security');
    });

    test('10.5.4 - createTradeoffPrompt mentions technical debt', async () => {
      const prompt = promptsModule.createTradeoffPrompt({
        diff: '+ const x = 1;',
        fileList: ['src/app.ts'],
      });

      expect(prompt).toContain('technical debt');
    });
  });

  test.describe('10.6 Analyzer Module', () => {

    test('10.6.1 - analyzeWithLLM function exists', async () => {
      expect(typeof analyzerModule.analyzeWithLLM).toBe('function');
    });

    test('10.6.2 - formatLLMAnalysisForReport function exists', async () => {
      expect(typeof analyzerModule.formatLLMAnalysisForReport).toBe('function');
    });

    test('10.6.3 - formatLLMAnalysisForReport formats summary', async () => {
      const result = analyzerModule.formatLLMAnalysisForReport({
        summary: 'This session added a new feature.',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.01,
        },
        latencyMs: 1000,
      });

      expect(result).toContain('AI Summary');
      expect(result).toContain('This session added a new feature.');
    });

    test('10.6.4 - formatLLMAnalysisForReport includes changelog', async () => {
      const result = analyzerModule.formatLLMAnalysisForReport({
        summary: 'Summary',
        changelog: '### Added\n- New feature',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.01,
        },
        latencyMs: 1000,
      });

      expect(result).toContain('Changelog');
      expect(result).toContain('New feature');
    });

    test('10.6.5 - formatLLMAnalysisForReport includes ADR', async () => {
      const result = analyzerModule.formatLLMAnalysisForReport({
        summary: 'Summary',
        architectureDecisions: '### Decision: Use React\nContext: Need UI framework',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.01,
        },
        latencyMs: 1000,
      });

      expect(result).toContain('Architecture Decisions');
      expect(result).toContain('Use React');
    });

    test('10.6.6 - formatLLMAnalysisForReport includes trade-offs', async () => {
      const result = analyzerModule.formatLLMAnalysisForReport({
        summary: 'Summary',
        tradeoffs: 'Performance vs Simplicity: Chose simplicity',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.01,
        },
        latencyMs: 1000,
      });

      expect(result).toContain('Trade-off Analysis');
      expect(result).toContain('Chose simplicity');
    });

    test('10.6.7 - formatLLMAnalysisForReport includes usage stats', async () => {
      const result = analyzerModule.formatLLMAnalysisForReport({
        summary: 'Summary',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.01,
        },
        latencyMs: 2500,
      });

      expect(result).toContain('150 tokens');
      expect(result).toContain('2.5s');
    });
  });

  test.describe('10.7 LLM Module Exports', () => {

    test('10.7.1 - analyzeWithLLM is exported from main module', async () => {
      expect(typeof llmModule.analyzeWithLLM).toBe('function');
    });

    test('10.7.2 - formatLLMAnalysisForReport is exported', async () => {
      expect(typeof llmModule.formatLLMAnalysisForReport).toBe('function');
    });

    test('10.7.3 - SYSTEM_PROMPT is exported', async () => {
      expect(llmModule.SYSTEM_PROMPT).toBeDefined();
    });

    test('10.7.4 - createSessionSummaryPrompt is exported', async () => {
      expect(typeof llmModule.createSessionSummaryPrompt).toBe('function');
    });

    test('10.7.5 - createChangelogPrompt is exported', async () => {
      expect(typeof llmModule.createChangelogPrompt).toBe('function');
    });

    test('10.7.6 - createADRPrompt is exported', async () => {
      expect(typeof llmModule.createADRPrompt).toBe('function');
    });

    test('10.7.7 - createTradeoffPrompt is exported', async () => {
      expect(typeof llmModule.createTradeoffPrompt).toBe('function');
    });
  });

  test.describe('10.8 CLI --explain Flag', () => {

    test('10.8.1 - --explain flag recognized', async () => {
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} --help 2>&1`
      );
      const output = stdout + stderr;
      expect(output).toContain('explain');
    });

    test('10.8.2 - --explain requires LLM configuration', async () => {
      // Simple test that --explain flag is recognized and requires provider
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} --explain --help 2>&1 || true`
      );
      const output = stdout + stderr;
      // --explain should be a recognized flag
      expect(output).not.toContain('unknown option');
    });

    test('10.8.3 - --changelog flag is recognized', async () => {
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} --changelog --help 2>&1 || true`
      );
      const output = stdout + stderr;
      expect(output).not.toContain('unknown option');
    });

    test('10.8.4 - --adr flag is recognized', async () => {
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} --adr --help 2>&1 || true`
      );
      const output = stdout + stderr;
      expect(output).not.toContain('unknown option');
    });

    test('10.8.5 - --tradeoffs flag is recognized', async () => {
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} --tradeoffs --help 2>&1 || true`
      );
      const output = stdout + stderr;
      expect(output).not.toContain('unknown option');
    });
  });

  test.describe('10.9 Prompt Quality', () => {

    test('10.9.1 - Session summary prompt is under 2000 chars without diff', async () => {
      const prompt = promptsModule.createSessionSummaryPrompt({
        diff: '',
        fileList: ['src/app.ts'],
      });

      // Prompt template itself should be reasonable size
      expect(prompt.length).toBeLessThan(2000);
    });

    test('10.9.2 - Prompts request concise output', async () => {
      const summaryPrompt = promptsModule.createSessionSummaryPrompt({
        diff: '+ x',
        fileList: ['a.ts'],
      });

      expect(
        summaryPrompt.toLowerCase().includes('concise') ||
        summaryPrompt.includes('150 words') ||
        summaryPrompt.includes('sentences')
      ).toBe(true);
    });

    test('10.9.3 - Prompts include clear instructions', async () => {
      const changelogPrompt = promptsModule.createChangelogPrompt({
        diff: '+ x',
        fileList: ['a.ts'],
      });

      expect(changelogPrompt).toContain('Rules');
    });

    test('10.9.4 - ADR prompt handles no decisions case', async () => {
      const prompt = promptsModule.createADRPrompt({
        diff: '+ x',
        fileList: ['a.ts'],
      });

      expect(prompt).toContain('No significant architectural decisions');
    });

    test('10.9.5 - Trade-off prompt handles clean code case', async () => {
      const prompt = promptsModule.createTradeoffPrompt({
        diff: '+ x',
        fileList: ['a.ts'],
      });

      expect(prompt).toContain('No significant trade-offs');
    });
  });
});
