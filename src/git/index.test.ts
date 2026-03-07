import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isGitRepo, getUncommittedChanges, getRecentCommits, getFileDiff, getFileAtHead, getFileContent, getSessionDiff, getRawDiff } from './index.js';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';

describe('Git Module', () => {
  let testRepoPath: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    testRepoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'afterburn-test-'));

    // Initialize a git repo
    execSync('git init', { cwd: testRepoPath, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: testRepoPath, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: testRepoPath, stdio: 'pipe' });
  });

  afterEach(() => {
    // Clean up the temporary directory
    fs.rmSync(testRepoPath, { recursive: true, force: true });
  });

  describe('isGitRepo', () => {
    it('should return true for a git repository', async () => {
      const result = await isGitRepo(testRepoPath);
      expect(result).toBe(true);
    });

    it('should return false for a non-git directory', async () => {
      const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'non-git-'));
      try {
        const result = await isGitRepo(nonGitDir);
        expect(result).toBe(false);
      } finally {
        fs.rmSync(nonGitDir, { recursive: true, force: true });
      }
    });
  });

  describe('getUncommittedChanges', () => {
    it('should return empty array for clean repo', async () => {
      // Create initial commit so repo is not empty
      fs.writeFileSync(path.join(testRepoPath, 'initial.txt'), 'initial');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testRepoPath, stdio: 'pipe' });

      const result = await getUncommittedChanges(testRepoPath);
      expect(result).toEqual([]);
    });

    it('should detect new files', async () => {
      // Create initial commit
      fs.writeFileSync(path.join(testRepoPath, 'initial.txt'), 'initial');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testRepoPath, stdio: 'pipe' });

      // Add a new file
      fs.writeFileSync(path.join(testRepoPath, 'newfile.txt'), 'new content');
      execSync('git add newfile.txt', { cwd: testRepoPath, stdio: 'pipe' });

      const result = await getUncommittedChanges(testRepoPath);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(f => f.path === 'newfile.txt')).toBe(true);
    });

    it('should detect modified files', async () => {
      // Create initial commit
      fs.writeFileSync(path.join(testRepoPath, 'file.txt'), 'original');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testRepoPath, stdio: 'pipe' });

      // Modify the file
      fs.writeFileSync(path.join(testRepoPath, 'file.txt'), 'modified');

      const result = await getUncommittedChanges(testRepoPath);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(f => f.path === 'file.txt' && f.status === 'modified')).toBe(true);
    });

    it('should detect deleted files', async () => {
      // Create initial commit
      fs.writeFileSync(path.join(testRepoPath, 'todelete.txt'), 'to delete');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testRepoPath, stdio: 'pipe' });

      // Delete the file
      fs.unlinkSync(path.join(testRepoPath, 'todelete.txt'));

      const result = await getUncommittedChanges(testRepoPath);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(f => f.path === 'todelete.txt' && f.status === 'deleted')).toBe(true);
    });
  });

  describe('getRecentCommits', () => {
    it('should return empty array for repo with no commits', async () => {
      const result = await getRecentCommits(testRepoPath);
      expect(result).toEqual([]);
    });

    it('should return recent commits', async () => {
      // Create commits
      fs.writeFileSync(path.join(testRepoPath, 'file1.txt'), 'content1');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "first commit"', { cwd: testRepoPath, stdio: 'pipe' });

      fs.writeFileSync(path.join(testRepoPath, 'file2.txt'), 'content2');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "second commit"', { cwd: testRepoPath, stdio: 'pipe' });

      const result = await getRecentCommits(testRepoPath, '1h');
      expect(result.length).toBe(2);
      expect(result[0].message).toBe('second commit');
      expect(result[1].message).toBe('first commit');
    });

    it('should filter commits by since parameter', async () => {
      const oldDate = '2020-01-01T00:00:00';

      // Create old commit (by backdating it with environment variables)
      fs.writeFileSync(path.join(testRepoPath, 'old.txt'), 'old');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "old commit"', {
        cwd: testRepoPath,
        stdio: 'pipe',
        env: {
          ...process.env,
          GIT_AUTHOR_DATE: oldDate,
          GIT_COMMITTER_DATE: oldDate,
        },
      });

      // Create recent commit
      fs.writeFileSync(path.join(testRepoPath, 'new.txt'), 'new');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "new commit"', { cwd: testRepoPath, stdio: 'pipe' });

      const result = await getRecentCommits(testRepoPath, '1h');
      expect(result.length).toBe(1);
      expect(result[0].message).toBe('new commit');
    });
  });

  describe('getFileDiff', () => {
    it('should return diff for modified file', async () => {
      // Create initial commit
      fs.writeFileSync(path.join(testRepoPath, 'file.txt'), 'line1\nline2\n');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testRepoPath, stdio: 'pipe' });

      // Modify the file
      fs.writeFileSync(path.join(testRepoPath, 'file.txt'), 'line1\nline2\nline3\n');

      const result = await getFileDiff(testRepoPath, 'file.txt');
      expect(result).toContain('+line3');
    });

    it('should return empty string for non-existent file', async () => {
      const result = await getFileDiff(testRepoPath, 'nonexistent.txt');
      expect(result).toBe('');
    });
  });

  describe('getFileAtHead', () => {
    it('should return file content at HEAD', async () => {
      fs.writeFileSync(path.join(testRepoPath, 'file.txt'), 'original content');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testRepoPath, stdio: 'pipe' });

      // Modify working copy
      fs.writeFileSync(path.join(testRepoPath, 'file.txt'), 'modified content');

      const result = await getFileAtHead(testRepoPath, 'file.txt');
      expect(result).toBe('original content');
    });

    it('should return null for non-existent file', async () => {
      const result = await getFileAtHead(testRepoPath, 'nonexistent.txt');
      expect(result).toBeNull();
    });
  });

  describe('getFileContent', () => {
    it('should return file content from working tree when no ref specified', async () => {
      fs.writeFileSync(path.join(testRepoPath, 'file.txt'), 'working tree content');

      const result = await getFileContent(testRepoPath, 'file.txt');
      expect(result).toBe('working tree content');
    });

    it('should return file content at specific ref', async () => {
      fs.writeFileSync(path.join(testRepoPath, 'file.txt'), 'initial');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testRepoPath, stdio: 'pipe' });

      // Get the commit hash
      const hash = execSync('git rev-parse HEAD', { cwd: testRepoPath, encoding: 'utf-8' }).trim();

      // Modify and commit
      fs.writeFileSync(path.join(testRepoPath, 'file.txt'), 'modified');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "modified"', { cwd: testRepoPath, stdio: 'pipe' });

      // Check content at old ref
      const result = await getFileContent(testRepoPath, 'file.txt', hash);
      expect(result).toBe('initial');
    });

    it('should return null for non-existent file', async () => {
      const result = await getFileContent(testRepoPath, 'nonexistent.txt');
      expect(result).toBeNull();
    });
  });

  describe('getSessionDiff', () => {
    it('should throw error for non-git directory', async () => {
      const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'non-git-'));
      try {
        await expect(getSessionDiff(nonGitDir)).rejects.toThrow('Not a git repository');
      } finally {
        fs.rmSync(nonGitDir, { recursive: true, force: true });
      }
    });

    it('should return session diff with commits and uncommitted changes', async () => {
      // Create committed file
      fs.writeFileSync(path.join(testRepoPath, 'committed.txt'), 'committed');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testRepoPath, stdio: 'pipe' });

      // Create uncommitted change
      fs.writeFileSync(path.join(testRepoPath, 'uncommitted.txt'), 'uncommitted');
      execSync('git add uncommitted.txt', { cwd: testRepoPath, stdio: 'pipe' });

      const result = await getSessionDiff(testRepoPath, '1h');

      expect(result.commits.length).toBe(1);
      expect(result.stats.hasUncommittedChanges).toBe(true);
      expect(result.files.some(f => f.path === 'uncommitted.txt')).toBe(true);
    });

    it('should calculate session duration', async () => {
      // Create commit
      fs.writeFileSync(path.join(testRepoPath, 'file.txt'), 'content');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "commit"', { cwd: testRepoPath, stdio: 'pipe' });

      const result = await getSessionDiff(testRepoPath, '1h');

      expect(result.sessionDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRawDiff', () => {
    it('should return raw diff output', async () => {
      // Create initial commit
      fs.writeFileSync(path.join(testRepoPath, 'file.txt'), 'original\n');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testRepoPath, stdio: 'pipe' });

      // Modify the file
      fs.writeFileSync(path.join(testRepoPath, 'file.txt'), 'original\nmodified\n');

      const result = await getRawDiff(testRepoPath);
      expect(result).toContain('+modified');
    });

    it('should return empty string for clean repo', async () => {
      fs.writeFileSync(path.join(testRepoPath, 'file.txt'), 'content');
      execSync('git add .', { cwd: testRepoPath, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: testRepoPath, stdio: 'pipe' });

      const result = await getRawDiff(testRepoPath);
      expect(result).toBe('');
    });
  });
});
