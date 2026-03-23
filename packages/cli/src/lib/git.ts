import { execa } from "execa";
import path from "path";

export async function getGitRemoteUrl(cwd?: string): Promise<string | null> {
  try {
    const { stdout } = await execa("git", ["remote", "get-url", "origin"], {
      cwd: cwd || process.cwd(),
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

export function parseRepoName(url: string): string {
  // Handle SSH: git@github.com:user/repo.git
  // Handle HTTPS: https://github.com/user/repo.git
  const match = url.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (match) {
    return match[1].split("/").pop() || "";
  }
  return "";
}

export async function detectProjectSlug(cwd: string): Promise<string> {
  const url = await getGitRemoteUrl(cwd);
  if (url) {
    const repoName = parseRepoName(url);
    if (repoName) {
      return repoName;
    }
  }
  return path.basename(cwd);
}

export async function isGitRepo(): Promise<boolean> {
  try {
    await execa("git", ["rev-parse", "--git-dir"]);
    return true;
  } catch {
    return false;
  }
}

export async function getGitRoot(): Promise<string | null> {
  try {
    const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"]);
    return stdout.trim();
  } catch {
    return null;
  }
}
