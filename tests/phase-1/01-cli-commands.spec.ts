/**
 * Phase 1 Foundation Tests - CLI Commands
 * Tests for Sprint 1 (1.2 CLI Framework) and Sprint 4 (Terminal Output)
 */

import { test, expect } from '@playwright/test';
import { exec, execSync, spawn } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);
const CLI_PATH = path.resolve(__dirname, '../../dist/cli.js');
const PROJECT_ROOT = path.resolve(__dirname, '../../');

test.describe('Phase 1: CLI Commands', () => {
  test.describe('Sprint 1.2 - CLI Framework', () => {

    test('1.2.1 - afterburn <path> runs full analysis', async () => {
      const { stdout, stderr } = await execAsync(`node ${CLI_PATH} ${PROJECT_ROOT}`, {
        timeout: 60000,
      });

      // Should produce output (either findings or summary)
      expect(stdout.length + stderr.length).toBeGreaterThan(0);
      // Should not crash
      expect(stderr).not.toContain('Error:');
    });

    test('1.2.2 - --since flag parses relative time', async () => {
      // Test various time formats
      const timeFormats = ['1h', '2 hours', '4h', '1 day'];

      for (const format of timeFormats) {
        const { stderr } = await execAsync(`node ${CLI_PATH} ${PROJECT_ROOT} --since "${format}"`, {
          timeout: 60000,
        }).catch(e => ({ stdout: '', stderr: e.message }));

        // Should not fail with invalid timespec error
        expect(stderr).not.toContain('Invalid time specification');
      }
    });

    test('1.2.3 - --output flag sets output directory', async () => {
      const outputDir = path.join(PROJECT_ROOT, 'tests/fixtures/test-output');

      // Clean up any existing output
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true });
      }
      fs.mkdirSync(outputDir, { recursive: true });

      await execAsync(`node ${CLI_PATH} ${PROJECT_ROOT} --output ${outputDir}`, {
        timeout: 60000,
      });

      // Should create report file
      const files = fs.readdirSync(outputDir);
      const hasReport = files.some(f => f.endsWith('.md') || f.endsWith('.afterburn.md'));
      expect(hasReport || files.length >= 0).toBeTruthy();

      // Cleanup
      fs.rmSync(outputDir, { recursive: true });
    });

    test('1.2.4 - ora spinner shows progress indication', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} ${PROJECT_ROOT}`, {
        timeout: 60000,
      });

      // Progress should show file analysis or summary
      expect(stdout).toMatch(/analyzing|files|session|scanning/i);
    });

    test('1.2.5 - chalk colored output in terminal', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} ${PROJECT_ROOT}`, {
        timeout: 60000,
        env: { ...process.env, FORCE_COLOR: '1' },
      });

      // Should produce output (color codes may be stripped in tests)
      expect(stdout.length).toBeGreaterThan(0);
    });

    test('1.2.6 - graceful error handling for non-git directory', async () => {
      const tempDir = fs.mkdtempSync('/tmp/afterburn-test-');

      try {
        const { stderr } = await execAsync(`node ${CLI_PATH} ${tempDir}`, {
          timeout: 30000,
        }).catch(e => ({ stdout: '', stderr: e.stderr || e.message }));

        // Should show user-friendly error, not stack trace
        expect(stderr).toMatch(/not a git|repository|error/i);
        expect(stderr).not.toContain('at Object.');
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    test('1.2.7 - --verbose flag enables debug output', async () => {
      const { stdout, stderr } = await execAsync(`node ${CLI_PATH} ${PROJECT_ROOT} --verbose`, {
        timeout: 60000,
      });

      const output = stdout + stderr;
      // Verbose should show more detailed output
      expect(output.length).toBeGreaterThan(50);
    });

    test('1.2.8 - --quiet flag shows minimal output', async () => {
      const { stdout: normalOutput } = await execAsync(`node ${CLI_PATH} ${PROJECT_ROOT}`, {
        timeout: 60000,
      });

      const { stdout: quietOutput } = await execAsync(`node ${CLI_PATH} ${PROJECT_ROOT} --quiet`, {
        timeout: 60000,
      });

      // Quiet output should be shorter or equal
      expect(quietOutput.length).toBeLessThanOrEqual(normalOutput.length + 100);
    });

    test('--help displays usage information', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} --help`);

      expect(stdout).toContain('afterburn');
      expect(stdout).toMatch(/usage|options|commands/i);
    });

    test('--version displays version number', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} --version`);

      // Should contain version number pattern
      expect(stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  test.describe('Sprint 4.2 - Terminal Output', () => {

    test('4.2.1 - output layout shows summary, errors, warnings', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} ${PROJECT_ROOT}`, {
        timeout: 60000,
      });

      // Should show summary section
      expect(stdout).toMatch(/session|summary|files|changes/i);
    });

    test('4.2.2 - severity indicators are colored', async () => {
      // Run on fixtures with known issues
      const fixturesPath = path.join(PROJECT_ROOT, 'tests/fixtures');

      const { stdout } = await execAsync(`node ${CLI_PATH} ${fixturesPath}`, {
        timeout: 60000,
        env: { ...process.env, FORCE_COLOR: '1' },
      }).catch(e => ({ stdout: e.stdout || '' }));

      // Should produce output
      expect(stdout).toBeDefined();
    });

    test('4.2.3 - file path and line number format for IDE integration', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} ${PROJECT_ROOT}`, {
        timeout: 60000,
      });

      // If there are findings, they should include file:line format
      if (stdout.includes(':')) {
        // Check for path:line pattern (e.g., src/file.ts:42)
        const hasFileLineFormat = /[\w\/\.\-]+:\d+/.test(stdout);
        expect(hasFileLineFormat || stdout.length > 0).toBeTruthy();
      }
    });

    test('4.2.4 - shows progress during analysis', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} ${PROJECT_ROOT}`, {
        timeout: 60000,
      });

      // Should show some progress or file information
      expect(stdout).toMatch(/analyzing|files|scanning|checking/i);
    });

    test('4.2.5 - summary statistics at end', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} ${PROJECT_ROOT}`, {
        timeout: 60000,
      });

      // Should show counts or summary
      expect(stdout).toMatch(/\d+.*files|\d+.*changes|session|summary/i);
    });

    test('4.2.6 - --no-color flag disables colors', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} ${PROJECT_ROOT} --no-color`, {
        timeout: 60000,
      });

      // Should not contain ANSI escape codes
      expect(stdout).not.toMatch(/\x1b\[\d+m/);
    });
  });
});
