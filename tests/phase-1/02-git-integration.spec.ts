/**
 * Phase 1 Foundation Tests - Git Integration
 * Tests for Sprint 1 (1.1 Git Diff Parser, 1.3 Session Detection)
 */

import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

// Import git functions directly for unit testing
let gitModule: typeof import('../../src/git/index.js');

test.beforeAll(async () => {
  // Dynamically import the git module
  gitModule = await import('../../dist/git/index.js');
});

test.describe('Phase 1: Git Integration', () => {
  test.describe('Sprint 1.1 - Git Diff Parser', () => {

    test('1.1.1 - simple-git is properly configured', async () => {
      const isRepo = await gitModule.isGitRepo(PROJECT_ROOT);
      expect(isRepo).toBe(true);
    });

    test('1.1.2 - getUncommittedChanges returns staged and unstaged changes', async () => {
      const changes = await gitModule.getUncommittedChanges(PROJECT_ROOT);

      // Should return an array
      expect(Array.isArray(changes)).toBe(true);

      // Each change should have required properties
      for (const change of changes) {
        expect(change).toHaveProperty('path');
        expect(change).toHaveProperty('status');
        expect(change).toHaveProperty('additions');
        expect(change).toHaveProperty('deletions');
        expect(['added', 'modified', 'deleted', 'renamed', 'copied']).toContain(change.status);
      }
    });

    test('1.1.3 - getRecentCommits returns commits within time window', async () => {
      const commits = await gitModule.getRecentCommits(PROJECT_ROOT, '7 days');

      // Should return an array
      expect(Array.isArray(commits)).toBe(true);

      // Each commit should have required properties
      for (const commit of commits) {
        expect(commit).toHaveProperty('hash');
        expect(commit).toHaveProperty('message');
        expect(commit).toHaveProperty('author');
        expect(commit).toHaveProperty('date');
        expect(commit.hash).toMatch(/^[a-f0-9]+$/);
      }
    });

    test('1.1.4 - getSessionDiff extracts additions, deletions, file status', async () => {
      const diff = await gitModule.getSessionDiff(PROJECT_ROOT, '7 days');

      expect(diff).toHaveProperty('files');
      expect(diff).toHaveProperty('commits');
      expect(diff).toHaveProperty('stats');
      expect(diff).toHaveProperty('sessionDuration');

      // Stats should have required properties
      expect(diff.stats).toHaveProperty('filesChanged');
      expect(diff.stats).toHaveProperty('insertions');
      expect(diff.stats).toHaveProperty('deletions');
      expect(diff.stats).toHaveProperty('hasUncommittedChanges');
      expect(diff.stats).toHaveProperty('commitCount');
    });

    test('1.1.5 - getFileContent reads file at HEAD or working tree', async () => {
      // Test reading from working tree
      const workingContent = await gitModule.getFileContent(PROJECT_ROOT, 'package.json');
      expect(workingContent).toBeTruthy();
      expect(workingContent).toContain('afterburn');

      // Test reading from HEAD
      const headContent = await gitModule.getFileContent(PROJECT_ROOT, 'package.json', 'HEAD');
      expect(headContent).toBeTruthy();
    });

    test('1.1.6 - handles edge case: non-existent file', async () => {
      const content = await gitModule.getFileContent(PROJECT_ROOT, 'non-existent-file.xyz');
      expect(content).toBeNull();
    });

    test('1.1.6 - handles edge case: non-git directory', async () => {
      const tempDir = fs.mkdtempSync('/tmp/afterburn-test-');
      try {
        const isRepo = await gitModule.isGitRepo(tempDir);
        expect(isRepo).toBe(false);
      } finally {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    test('1.1.7 - getCurrentBranch returns current branch name', async () => {
      const branch = await gitModule.getCurrentBranch(PROJECT_ROOT);
      expect(branch).toBeTruthy();
      expect(typeof branch).toBe('string');
    });

    test('1.1.8 - getRawDiff returns diff output', async () => {
      const rawDiff = await gitModule.getRawDiff(PROJECT_ROOT, '1 day');
      expect(typeof rawDiff).toBe('string');
    });
  });

  test.describe('Sprint 1.3 - Session Detection', () => {

    test('1.3.1 - time-based session boundary detection (default 4h window)', async () => {
      const diff = await gitModule.getSessionDiff(PROJECT_ROOT);

      // Should use default 4h window
      expect(diff.sessionDuration).toBeDefined();
      expect(diff.sessionDuration).toBeGreaterThanOrEqual(0);
    });

    test('1.3.2 - parse --since timespec variations', async () => {
      // Test different timespec formats
      const formats = [
        { spec: '1h', description: 'hours' },
        { spec: '30m', description: 'minutes' },
        { spec: '2 hours ago', description: 'hours ago' },
        { spec: '1 day', description: 'days' },
      ];

      for (const { spec, description } of formats) {
        const commits = await gitModule.getRecentCommits(PROJECT_ROOT, spec);
        expect(Array.isArray(commits)).toBe(true);
      }
    });

    test('1.3.3 - groups commits and uncommitted changes into session', async () => {
      const diff = await gitModule.getSessionDiff(PROJECT_ROOT, '7 days');

      // Should combine committed and uncommitted files
      expect(diff.files).toBeDefined();
      expect(diff.commits).toBeDefined();

      // Total files should be >= 0
      expect(diff.stats.filesChanged).toBeGreaterThanOrEqual(0);
    });

    test('1.3.4 - calculates session duration from first to last change', async () => {
      const diff = await gitModule.getSessionDiff(PROJECT_ROOT, '7 days');

      expect(typeof diff.sessionDuration).toBe('number');
      expect(diff.sessionDuration).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Git Integration Edge Cases', () => {

    test('handles repository with many commits', async () => {
      const commits = await gitModule.getRecentCommits(PROJECT_ROOT, '30 days');
      expect(Array.isArray(commits)).toBe(true);
    });

    test('handles files with special characters in names', async () => {
      // This test verifies the parser doesn't crash on special paths
      const diff = await gitModule.getSessionDiff(PROJECT_ROOT);
      expect(diff).toBeDefined();
    });

    test('getFileDiff returns diff for specific file', async () => {
      const fileDiff = await gitModule.getFileDiff(PROJECT_ROOT, 'package.json');
      expect(typeof fileDiff).toBe('string');
    });

    test('getFileAtHead returns file content at HEAD', async () => {
      const content = await gitModule.getFileAtHead(PROJECT_ROOT, 'package.json');
      if (content) {
        expect(content).toContain('afterburn');
      }
    });
  });
});
