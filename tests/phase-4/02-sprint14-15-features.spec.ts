/**
 * Phase 4 Dashboard Tests - Sprint 14 & 15
 * Tests for Session Viewer, Filtering, Export, Comparison & Analytics
 */

import { test, expect } from '@playwright/test';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const execAsync = promisify(exec);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const CLI_PATH = path.join(PROJECT_ROOT, 'dist/cli.js');
const FIXTURES_PATH = path.join(PROJECT_ROOT, 'tests/fixtures/phase-4');

test.describe('Phase 4: Sprint 14 - Enhanced Session Viewer', () => {
  let tempDir: string;
  let serverProcess: ChildProcess;
  let port: number;

  test.beforeAll(async () => {
    // Create temp directory with multiple sessions
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-studio-viewer-'));
    const afterburnDir = path.join(tempDir, '.afterburn');

    // Create sessions for multiple dates
    const dates = ['2024-01-15', '2024-01-16', '2024-01-17'];
    for (const date of dates) {
      const dateDir = path.join(afterburnDir, date);
      fs.mkdirSync(dateDir, { recursive: true });

      // Multiple sessions per day
      for (let i = 0; i < 2; i++) {
        const time = `${10 + i}-30-00`;
        const fixture = fs.readFileSync(path.join(FIXTURES_PATH, 'sample-session.md'), 'utf-8');
        fs.writeFileSync(path.join(dateDir, `session-${time}.md`), fixture);
      }
    }

    port = 3700 + Math.floor(Math.random() * 100);
    serverProcess = spawn('node', [CLI_PATH, 'studio', '--path', tempDir, '--port', String(port)], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      env: { ...process.env, BROWSER: 'none' },
    });

    await new Promise(resolve => setTimeout(resolve, 2500));
  });

  test.afterAll(async () => {
    if (serverProcess) serverProcess.kill();
    if (tempDir) fs.rmSync(tempDir, { recursive: true });
  });

  test.describe('14.1 Session Detail Display', () => {

    test('14.1.1 - Session detail includes summary grid', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('summary-grid');
      expect(html).toContain('summary-card');
    });

    test('14.1.2 - Session detail has collapsible sections', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('card');
      expect(html).toContain('card-header');
      expect(html).toContain('card-content');
    });

    test('14.1.3 - Tools section shows tool usage', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('tools-list');
      expect(html).toContain('tool-row');
    });

    test('14.1.4 - Files section shows changed files', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('data-table');
      expect(html).toContain('file-path');
    });

    test('14.1.5 - AI Summary section exists', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('ai-summary');
    });
  });

  test.describe('14.2 Session Filtering', () => {

    test('14.2.1 - Filter dropdowns exist', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('filter-project');
      expect(html).toContain('filter-author');
      expect(html).toContain('filter-model');
    });

    test('14.2.2 - Sort dropdown exists', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('filter-sort');
      expect(html).toContain('Newest First');
      expect(html).toContain('Oldest First');
    });

    test('14.2.3 - Multiple sessions are listed', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions`);
      const sessions = await response.json();

      expect(sessions.length).toBeGreaterThanOrEqual(6); // 3 dates x 2 sessions
    });

    test('14.2.4 - Sessions grouped by date', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('date-group');
      expect(html).toContain('date-label');
    });
  });

  test.describe('14.3 Export Features', () => {

    test('14.3.1 - Download markdown endpoint works', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions/2024-01-15/session-10-30-00.md`);
      const data = await response.json();

      expect(data.markdown).toBeDefined();
      expect(data.markdown.length).toBeGreaterThan(0);
      expect(data.markdown).toContain('# Afterburn Session Report');
    });

    test('14.3.2 - HTML export available via API', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions/2024-01-15/session-10-30-00.md`);
      const data = await response.json();

      expect(data.html).toBeDefined();
      expect(data.html).toContain('<h1>');
    });
  });
});

test.describe('Phase 4: Sprint 15 - Comparison & Analytics', () => {
  let tempDir: string;
  let serverProcess: ChildProcess;
  let port: number;

  test.beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-studio-analytics-'));
    const afterburnDir = path.join(tempDir, '.afterburn');

    // Create multiple sessions with varying data
    const sessions = [
      { date: '2024-01-15', time: '10-30-00', cost: 0.05, tokens: 1500 },
      { date: '2024-01-16', time: '11-00-00', cost: 0.08, tokens: 2000 },
      { date: '2024-01-17', time: '14-30-00', cost: 0.03, tokens: 1000 },
    ];

    for (const s of sessions) {
      const dateDir = path.join(afterburnDir, s.date);
      fs.mkdirSync(dateDir, { recursive: true });

      const content = `# Afterburn Session Report

**Project:** test-project | **Author:** test-user | **Generated:** ${s.date} ${s.time.replace(/-/g, ':')}

## Summary

| Metric | Value |
|--------|-------|
| Files Changed | 5 |
| Lines Added | +100 |
| Lines Removed | -50 |
| Commits | 2 |

## AI Provider Stats

| Metric | Value |
|--------|-------|
| Model | claude-sonnet-4-20250514 |
| Total Tokens | ${s.tokens.toLocaleString()} |
| Input Tokens | ${Math.round(s.tokens * 0.7).toLocaleString()} |
| Output Tokens | ${Math.round(s.tokens * 0.3).toLocaleString()} |
| Estimated Cost | $${s.cost.toFixed(2)} |
`;
      fs.writeFileSync(path.join(dateDir, `session-${s.time}.md`), content);
    }

    port = 3800 + Math.floor(Math.random() * 100);
    serverProcess = spawn('node', [CLI_PATH, 'studio', '--path', tempDir, '--port', String(port)], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      env: { ...process.env, BROWSER: 'none' },
    });

    await new Promise(resolve => setTimeout(resolve, 2500));
  });

  test.afterAll(async () => {
    if (serverProcess) serverProcess.kill();
    if (tempDir) fs.rmSync(tempDir, { recursive: true });
  });

  test.describe('15.1 Analytics Dashboard', () => {

    test('15.1.1 - Reports page exists', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('Reports');
      expect(html).toContain('showPage');
    });

    test('15.1.2 - Stats include total cost', async () => {
      const response = await fetch(`http://localhost:${port}/api/stats`);
      const stats = await response.json();

      expect(stats.totalCost).toBeGreaterThan(0);
      expect(stats.totalCost).toBeCloseTo(0.16, 2); // 0.05 + 0.08 + 0.03
    });

    test('15.1.3 - Stats include total tokens', async () => {
      const response = await fetch(`http://localhost:${port}/api/stats`);
      const stats = await response.json();

      expect(stats.totalTokens).toBe(4500); // 1500 + 2000 + 1000
    });

    test('15.1.4 - Stats include total files', async () => {
      const response = await fetch(`http://localhost:${port}/api/stats`);
      const stats = await response.json();

      expect(stats.totalFiles).toBeGreaterThan(0);
    });

    test('15.1.5 - Stats include lines added/removed', async () => {
      const response = await fetch(`http://localhost:${port}/api/stats`);
      const stats = await response.json();

      expect(stats.totalLinesAdded).toBeGreaterThan(0);
      expect(stats.totalLinesRemoved).toBeGreaterThan(0);
    });
  });

  test.describe('15.2 Reports UI', () => {

    test('15.2.1 - Reports grid exists', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('reports-grid');
      expect(html).toContain('report-card');
    });

    test('15.2.2 - Usage by Model section exists', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('Usage by Model');
      expect(html).toContain('model-item');
    });

    test('15.2.3 - Usage by Project section exists', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('Usage by Project');
    });

    test('15.2.4 - Summary section exists', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('Summary');
      expect(html).toContain('report-stat-row');
    });

    test('15.2.5 - Report filters exist', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('report-filter-project');
      expect(html).toContain('report-filter-author');
      expect(html).toContain('report-filter-model');
    });
  });

  test.describe('15.3 Stats API', () => {

    test('15.3.1 - Stats returns recent sessions', async () => {
      const response = await fetch(`http://localhost:${port}/api/stats`);
      const stats = await response.json();

      expect(stats.recentSessions).toBeDefined();
      expect(Array.isArray(stats.recentSessions)).toBe(true);
      expect(stats.recentSessions.length).toBeLessThanOrEqual(10);
    });

    test('15.3.2 - Stats returns unique projects', async () => {
      const response = await fetch(`http://localhost:${port}/api/stats`);
      const stats = await response.json();

      expect(stats.projects).toBeDefined();
      expect(Array.isArray(stats.projects)).toBe(true);
    });

    test('15.3.3 - Stats returns unique models', async () => {
      const response = await fetch(`http://localhost:${port}/api/stats`);
      const stats = await response.json();

      expect(stats.models).toBeDefined();
      expect(Array.isArray(stats.models)).toBe(true);
    });

    test('15.3.4 - Stats returns unique authors', async () => {
      const response = await fetch(`http://localhost:${port}/api/stats`);
      const stats = await response.json();

      expect(stats.authors).toBeDefined();
      expect(Array.isArray(stats.authors)).toBe(true);
    });
  });

  test.describe('15.4 UI Components', () => {

    test('15.4.1 - Empty state component exists', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('empty-state');
      expect(html).toContain('empty-icon');
      expect(html).toContain('empty-title');
    });

    test('15.4.2 - Card components exist', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('card');
      expect(html).toContain('card-badge');
    });

    test('15.4.3 - Tool icons function exists', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('getToolIcon');
    });

    test('15.4.4 - Format tokens function exists', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('formatTokens');
    });

    test('15.4.5 - Relative date function exists', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('getRelativeDate');
    });
  });

  test.describe('15.5 Session List', () => {

    test('15.5.1 - Sessions include metadata', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions`);
      const sessions = await response.json();

      expect(sessions[0]).toHaveProperty('id');
      expect(sessions[0]).toHaveProperty('date');
      expect(sessions[0]).toHaveProperty('time');
      expect(sessions[0]).toHaveProperty('metadata');
    });

    test('15.5.2 - Session metadata includes cost', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions`);
      const sessions = await response.json();

      expect(sessions[0].metadata).toHaveProperty('estimatedCost');
    });

    test('15.5.3 - Session metadata includes tokens', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions`);
      const sessions = await response.json();

      expect(sessions[0].metadata).toHaveProperty('totalTokens');
    });

    test('15.5.4 - Sessions are sorted by date desc', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions`);
      const sessions = await response.json();

      // Sessions should be newest first
      const dates = sessions.map((s: any) => s.date + s.time);
      const sorted = [...dates].sort().reverse();
      expect(dates).toEqual(sorted);
    });
  });
});
