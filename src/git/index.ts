/**
 * Git integration module - parses diffs and session history
 */

export interface GitDiff {
  files: GitFileDiff[];
  commits: GitCommit[];
}

export interface GitFileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  content?: string;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
}

export async function getSessionDiff(
  _repoPath: string,
  _since?: string
): Promise<GitDiff> {
  // TODO: Implement using simple-git
  // - Get uncommitted changes
  // - Get recent commits within session window
  throw new Error('Not implemented');
}
