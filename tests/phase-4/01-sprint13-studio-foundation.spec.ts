/**
 * Phase 4 Dashboard Tests - Sprint 13
 * Tests for Afterburn Studio Foundation
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

test.describe('Phase 4: Sprint 13 - Studio Foundation', () => {
  test.describe('13.1 Core Studio Server', () => {

    test('13.1.1 - studio server module exists', async () => {
      const serverPath = path.join(PROJECT_ROOT, 'dist/studio/server.js');
      expect(fs.existsSync(serverPath)).toBe(true);
    });

    test('13.1.2 - startStudio requires .afterburn directory', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-studio-test-'));

      try {
        // No .afterburn directory - should fail
        const result = await execAsync(
          `node ${CLI_PATH} studio --path ${tempDir} 2>&1`,
          { timeout: 5000 }
        ).catch(e => e);

        const output = (result.stdout || '') + (result.stderr || '');
        expect(output).toContain('afterburn');
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });
  });

  test.describe('13.2 Studio API', () => {
    let tempDir: string;
    let serverProcess: ChildProcess;
    let port: number;

    test.beforeAll(async () => {
      // Create temp directory with .afterburn structure
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-studio-api-'));
      const afterburnDir = path.join(tempDir, '.afterburn');
      const dateDir = path.join(afterburnDir, '2024-01-15');
      fs.mkdirSync(dateDir, { recursive: true });

      // Copy fixture
      const fixture = fs.readFileSync(path.join(FIXTURES_PATH, 'sample-session.md'), 'utf-8');
      fs.writeFileSync(path.join(dateDir, 'session-10-30-00.md'), fixture);

      // Start studio server on random port
      port = 3400 + Math.floor(Math.random() * 100);
      serverProcess = spawn('node', [CLI_PATH, 'studio', '--path', tempDir, '--port', String(port)], {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        env: { ...process.env, BROWSER: 'none' }, // Don't open browser
      });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test.afterAll(async () => {
      if (serverProcess) {
        serverProcess.kill();
      }
      if (tempDir) {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    test('13.2.1 - /api/sessions returns session list', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions`);
      expect(response.ok).toBe(true);

      const sessions = await response.json();
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThan(0);
    });

    test('13.2.2 - /api/sessions/:date/:filename returns session details', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions/2024-01-15/session-10-30-00.md`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty('markdown');
      expect(data).toHaveProperty('html');
      expect(data).toHaveProperty('metadata');
    });

    test('13.2.3 - /api/stats returns aggregate stats', async () => {
      const response = await fetch(`http://localhost:${port}/api/stats`);
      expect(response.ok).toBe(true);

      const stats = await response.json();
      expect(stats).toHaveProperty('totalSessions');
      expect(stats).toHaveProperty('totalTokens');
      expect(stats).toHaveProperty('totalCost');
    });

    test('13.2.4 - Session metadata is parsed correctly', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions/2024-01-15/session-10-30-00.md`);
      const data = await response.json();

      expect(data.metadata.project).toBe('test-project');
      expect(data.metadata.author).toBe('test-user');
      expect(data.metadata.filesChanged).toBe(5);
      expect(data.metadata.linesAdded).toBe(100);
      expect(data.metadata.linesRemoved).toBe(50);
    });

    test('13.2.5 - Session markdown is converted to HTML', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions/2024-01-15/session-10-30-00.md`);
      const data = await response.json();

      expect(data.html).toContain('<h1>');
      expect(data.html).toContain('Afterburn Session Report');
    });

    test('13.2.6 - 404 for non-existent session', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions/2099-01-01/nonexistent.md`);
      expect(response.status).toBe(404);
    });
  });

  test.describe('13.3 Studio CLI Command', () => {

    test('13.3.1 - afterburn studio command exists', async () => {
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} --help 2>&1`
      );
      const output = stdout + stderr;
      expect(output).toContain('studio');
    });

    test('13.3.2 - --port option is recognized', async () => {
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} studio --port 4000 --help 2>&1 || true`
      );
      const output = stdout + stderr;
      expect(output).not.toContain('unknown option');
    });

    test('13.3.3 - --path option is recognized', async () => {
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} studio --path /tmp --help 2>&1 || true`
      );
      const output = stdout + stderr;
      expect(output).not.toContain('unknown option');
    });
  });

  test.describe('13.4 Studio UI', () => {
    let tempDir: string;
    let serverProcess: ChildProcess;
    let port: number;

    test.beforeAll(async () => {
      // Create temp directory with .afterburn structure
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-studio-ui-'));
      const afterburnDir = path.join(tempDir, '.afterburn');
      const dateDir = path.join(afterburnDir, '2024-01-15');
      fs.mkdirSync(dateDir, { recursive: true });

      // Copy fixture
      const fixture = fs.readFileSync(path.join(FIXTURES_PATH, 'sample-session.md'), 'utf-8');
      fs.writeFileSync(path.join(dateDir, 'session-10-30-00.md'), fixture);

      // Start studio server
      port = 3500 + Math.floor(Math.random() * 100);
      serverProcess = spawn('node', [CLI_PATH, 'studio', '--path', tempDir, '--port', String(port)], {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        env: { ...process.env, BROWSER: 'none' },
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test.afterAll(async () => {
      if (serverProcess) {
        serverProcess.kill();
      }
      if (tempDir) {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    test('13.4.1 - Root serves HTML dashboard', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      expect(response.ok).toBe(true);

      const html = await response.text();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Afterburn');
    });

    test('13.4.2 - Dashboard contains sidebar', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('sidebar');
      expect(html).toContain('sessions-list');
    });

    test('13.4.3 - Dashboard contains stats section', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('sidebar-stats');
      expect(html).toContain('stat-box');
    });

    test('13.4.4 - Dashboard contains main content area', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('main-content');
      expect(html).toContain('content-body');
    });

    test('13.4.5 - Dashboard has navigation tabs', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('nav-tab');
      expect(html).toContain('Sessions');
      expect(html).toContain('Reports');
    });

    test('13.4.6 - Dashboard has dark theme CSS', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('--bg:');
      expect(html).toContain('#121212');
    });

    test('13.4.7 - Dashboard includes Inter font', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('Inter');
      expect(html).toContain('fonts.googleapis.com');
    });

    test('13.4.8 - Dashboard includes JetBrains Mono for code', async () => {
      const response = await fetch(`http://localhost:${port}/`);
      const html = await response.text();

      expect(html).toContain('JetBrains Mono');
    });
  });

  test.describe('13.5 Metadata Parsing', () => {
    let tempDir: string;
    let serverProcess: ChildProcess;
    let port: number;

    test.beforeAll(async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-studio-meta-'));
      const afterburnDir = path.join(tempDir, '.afterburn');
      const dateDir = path.join(afterburnDir, '2024-01-15');
      fs.mkdirSync(dateDir, { recursive: true });

      const fixture = fs.readFileSync(path.join(FIXTURES_PATH, 'sample-session.md'), 'utf-8');
      fs.writeFileSync(path.join(dateDir, 'session-10-30-00.md'), fixture);

      port = 3600 + Math.floor(Math.random() * 100);
      serverProcess = spawn('node', [CLI_PATH, 'studio', '--path', tempDir, '--port', String(port)], {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        env: { ...process.env, BROWSER: 'none' },
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test.afterAll(async () => {
      if (serverProcess) serverProcess.kill();
      if (tempDir) fs.rmSync(tempDir, { recursive: true });
    });

    test('13.5.1 - Parses token counts', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions/2024-01-15/session-10-30-00.md`);
      const data = await response.json();

      expect(data.metadata.totalTokens).toBe(1500);
      expect(data.metadata.inputTokens).toBe(1000);
      expect(data.metadata.outputTokens).toBe(500);
    });

    test('13.5.2 - Parses cost', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions/2024-01-15/session-10-30-00.md`);
      const data = await response.json();

      expect(data.metadata.estimatedCost).toBe(0.05);
    });

    test('13.5.3 - Parses model name', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions/2024-01-15/session-10-30-00.md`);
      const data = await response.json();

      expect(data.metadata.model).toBe('claude-sonnet-4-20250514');
    });

    test('13.5.4 - Parses commits count', async () => {
      const response = await fetch(`http://localhost:${port}/api/sessions/2024-01-15/session-10-30-00.md`);
      const data = await response.json();

      expect(data.metadata.commits).toBe(2);
    });

    test('13.5.5 - Stats aggregates across sessions', async () => {
      const response = await fetch(`http://localhost:${port}/api/stats`);
      const stats = await response.json();

      expect(stats.totalSessions).toBeGreaterThanOrEqual(1);
      expect(stats.projects).toContain('test-project');
      expect(stats.models).toContain('claude-sonnet-4-20250514');
      expect(stats.authors).toContain('test-user');
    });
  });
});
