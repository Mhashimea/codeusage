/**
 * Git integration module - parses diffs and session history
 */

import simpleGit, { SimpleGit, DiffResult } from 'simple-git';
import { parseTimespec } from '../utils/timespec.js';

export interface GitDiff {
  files: GitFileDiff[];
  commits: GitCommit[];
  stats: GitStats;
  sessionDuration: number; // Duration in milliseconds
}

export interface GitFileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  additions: number;
  deletions: number;
  oldPath?: string; // For renamed files
  content?: string;
  diff?: string;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  email: string;
  date: Date;
}

export interface GitStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
  hasUncommittedChanges: boolean;
  commitCount: number;
}

/**
 * Check if a directory is a git repository
 */
export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    const git: SimpleGit = simpleGit(repoPath);
    await git.revparse(['--git-dir']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get uncommitted changes (staged + unstaged)
 */
export async function getUncommittedChanges(repoPath: string): Promise<GitFileDiff[]> {
  const git: SimpleGit = simpleGit(repoPath);
  const files: GitFileDiff[] = [];

  // Get status to see all changed files
  const status = await git.status();

  // Combine all changed files
  const changedFiles = new Set<string>();

  // Staged files
  for (const file of status.staged) {
    changedFiles.add(file);
  }

  // Modified (unstaged)
  for (const file of status.modified) {
    changedFiles.add(file);
  }

  // New files (untracked that are staged)
  for (const file of status.created) {
    changedFiles.add(file);
  }

  // Deleted files
  for (const file of status.deleted) {
    changedFiles.add(file);
  }

  // Renamed files
  for (const file of status.renamed) {
    changedFiles.add(file.to);
  }

  // Get diff stats for each file
  if (changedFiles.size > 0) {
    try {
      // Get diff against HEAD (or empty tree if no commits)
      let diffResult: DiffResult;

      try {
        diffResult = await git.diffSummary(['HEAD']);
      } catch {
        // No commits yet, diff against empty tree
        diffResult = await git.diffSummary(['--cached']);
      }

      for (const file of diffResult.files) {
        const filePath = file.file;
        let fileStatus: GitFileDiff['status'] = 'modified';

        if (status.created.includes(filePath) || status.not_added.includes(filePath)) {
          fileStatus = 'added';
        } else if (status.deleted.includes(filePath)) {
          fileStatus = 'deleted';
        } else if (status.renamed.some(r => r.to === filePath)) {
          fileStatus = 'renamed';
        }

        // Handle different file types (text vs binary)
        const additions = 'insertions' in file ? file.insertions : 0;
        const deletions = 'deletions' in file ? file.deletions : 0;

        files.push({
          path: filePath,
          status: fileStatus,
          additions,
          deletions,
        });
      }

      // Add untracked files that aren't in diff
      for (const file of status.not_added) {
        if (!files.some(f => f.path === file)) {
          files.push({
            path: file,
            status: 'added',
            additions: 0,
            deletions: 0,
          });
        }
      }
    } catch {
      // If diff fails, just list the files without stats
      for (const file of changedFiles) {
        files.push({
          path: file,
          status: 'modified',
          additions: 0,
          deletions: 0,
        });
      }
    }
  }

  return files;
}

/**
 * Get recent commits within a time window
 * @param repoPath - Path to the repository
 * @param since - Time specification (e.g., "1h", "30m")
 * @param sinceCommit - Only include commits AFTER this commit hash (exclusive)
 */
export async function getRecentCommits(
  repoPath: string,
  since?: string,
  sinceCommit?: string
): Promise<GitCommit[]> {
  const git: SimpleGit = simpleGit(repoPath);
  const commits: GitCommit[] = [];

  try {
    // If we have a sinceCommit, get commits after that
    if (sinceCommit) {
      try {
        // Get commits from sinceCommit to HEAD (exclusive of sinceCommit)
        const log = await git.log({ from: sinceCommit, to: 'HEAD' });

        for (const entry of log.all) {
          // Skip the sinceCommit itself
          if (entry.hash === sinceCommit) continue;

          commits.push({
            hash: entry.hash,
            message: entry.message,
            author: entry.author_name,
            email: entry.author_email,
            date: new Date(entry.date),
          });
        }
        return commits;
      } catch {
        // If sinceCommit doesn't exist, fall back to time-based
      }
    }

    // Fall back to time-based filtering
    const sinceDate = since ? parseTimespec(since) : new Date(Date.now() - 4 * 60 * 60 * 1000); // Default 4 hours

    const logOptions: Record<string, string | null> = {
      '--since': sinceDate.toISOString(),
    };

    const log = await git.log(logOptions);

    for (const entry of log.all) {
      commits.push({
        hash: entry.hash,
        message: entry.message,
        author: entry.author_name,
        email: entry.author_email,
        date: new Date(entry.date),
      });
    }
  } catch {
    // No commits or git log failed
    return [];
  }

  return commits;
}

/**
 * Get file diff content for a specific file
 */
export async function getFileDiff(repoPath: string, filePath: string): Promise<string> {
  const git: SimpleGit = simpleGit(repoPath);

  try {
    // Try diff against HEAD first
    const diff = await git.diff(['HEAD', '--', filePath]);
    return diff;
  } catch {
    try {
      // If no HEAD, try cached diff
      const diff = await git.diff(['--cached', '--', filePath]);
      return diff;
    } catch {
      return '';
    }
  }
}

/**
 * Get the full content of a file at HEAD
 */
export async function getFileAtHead(repoPath: string, filePath: string): Promise<string | null> {
  const git: SimpleGit = simpleGit(repoPath);

  try {
    const content = await git.show([`HEAD:${filePath}`]);
    return content;
  } catch {
    return null;
  }
}

/**
 * Get the content of a file at a specific ref or working tree
 * @param repoPath - Path to the repository
 * @param filePath - Path to the file relative to repo root
 * @param ref - Git ref (commit hash, branch, tag) or undefined for working tree
 */
export async function getFileContent(
  repoPath: string,
  filePath: string,
  ref?: string
): Promise<string | null> {
  const git: SimpleGit = simpleGit(repoPath);

  try {
    if (ref) {
      // Get content at specific ref
      const content = await git.show([`${ref}:${filePath}`]);
      return content;
    } else {
      // Get content from working tree
      const fs = await import('fs');
      const path = await import('path');
      const fullPath = path.join(repoPath, filePath);

      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf-8');
      }
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Get complete session diff including uncommitted changes and recent commits
 * @param repoPath - Path to the repository
 * @param since - Time specification (e.g., "1h", "30m")
 * @param sinceCommit - Only include commits AFTER this commit hash (exclusive)
 * @param excludeFiles - Files to exclude (already reported in previous session)
 */
export async function getSessionDiff(
  repoPath: string,
  since?: string,
  sinceCommit?: string,
  excludeFiles?: string[]
): Promise<GitDiff> {
  const git: SimpleGit = simpleGit(repoPath);

  // Check if it's a valid git repo
  const isRepo = await isGitRepo(repoPath);
  if (!isRepo) {
    throw new Error(`Not a git repository: ${repoPath}`);
  }

  // Get uncommitted changes
  const uncommittedFiles = await getUncommittedChanges(repoPath);

  // Get recent commits (pass sinceCommit for incremental tracking)
  const commits = await getRecentCommits(repoPath, since, sinceCommit);

  // Get files changed in recent commits
  const commitFiles: GitFileDiff[] = [];

  if (commits.length > 0) {
    try {
      // If we have a sinceCommit, diff from that commit to HEAD
      // Otherwise fall back to time-based
      let diffResult;
      if (sinceCommit) {
        diffResult = await git.diffSummary([sinceCommit, 'HEAD']);
      } else {
        const sinceDate = since ? parseTimespec(since) : new Date(Date.now() - 4 * 60 * 60 * 1000);
        diffResult = await git.diffSummary([
          `--since="${sinceDate.toISOString()}"`,
          'HEAD',
        ]);
      }

      for (const file of diffResult.files) {
        // Only add if not already in uncommitted changes
        if (!uncommittedFiles.some(f => f.path === file.file)) {
          // Handle different file types (text vs binary)
          const additions = 'insertions' in file ? file.insertions : 0;
          const deletions = 'deletions' in file ? file.deletions : 0;

          commitFiles.push({
            path: file.file,
            status: 'modified', // We'd need more logic to determine exact status
            additions,
            deletions,
          });
        }
      }
    } catch {
      // If this fails, we'll just use the uncommitted files
    }
  }

  // Combine all files
  let allFiles = [...uncommittedFiles, ...commitFiles];

  // Filter out files that were already reported in previous session
  if (excludeFiles && excludeFiles.length > 0) {
    const excludeSet = new Set(excludeFiles);
    allFiles = allFiles.filter(f => !excludeSet.has(f.path));
  }

  // Calculate session duration from commits
  let sessionDuration = 0;
  if (commits.length > 0) {
    const sortedCommits = [...commits].sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstCommit = sortedCommits[0];
    const lastCommit = sortedCommits[sortedCommits.length - 1];
    sessionDuration = lastCommit.date.getTime() - firstCommit.date.getTime();

    // If there are uncommitted changes, extend duration to now
    if (uncommittedFiles.length > 0) {
      sessionDuration = Date.now() - firstCommit.date.getTime();
    }
  } else if (uncommittedFiles.length > 0) {
    // Only uncommitted changes, use time since --since
    const sinceDate = since ? parseTimespec(since) : new Date(Date.now() - 4 * 60 * 60 * 1000);
    sessionDuration = Date.now() - sinceDate.getTime();
  }

  // Calculate stats
  const stats: GitStats = {
    filesChanged: allFiles.length,
    insertions: allFiles.reduce((sum, f) => sum + f.additions, 0),
    deletions: allFiles.reduce((sum, f) => sum + f.deletions, 0),
    hasUncommittedChanges: uncommittedFiles.length > 0,
    commitCount: commits.length,
  };

  return {
    files: allFiles,
    commits,
    stats,
    sessionDuration,
  };
}

/**
 * Get the current branch name
 */
export async function getCurrentBranch(repoPath: string): Promise<string | undefined> {
  const git: SimpleGit = simpleGit(repoPath);

  try {
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get raw diff output for the session
 */
export async function getRawDiff(repoPath: string, since?: string): Promise<string> {
  const git: SimpleGit = simpleGit(repoPath);

  try {
    // Get uncommitted diff
    let diff = '';

    try {
      diff = await git.diff(['HEAD']);
    } catch {
      diff = await git.diff(['--cached']);
    }

    // Also get diff from recent commits if since is specified
    if (since) {
      const sinceDate = parseTimespec(since);
      try {
        const commitDiff = await git.diff([
          `HEAD~10`, // Look back up to 10 commits
          'HEAD',
          `--since="${sinceDate.toISOString()}"`,
        ]);
        if (commitDiff) {
          diff = commitDiff + '\n' + diff;
        }
      } catch {
        // Ignore if this fails
      }
    }

    return diff;
  } catch {
    return '';
  }
}
