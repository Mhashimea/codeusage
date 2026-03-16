# Afterburn — Development Task List

> **Version:** 1.0
> **Created:** March 2026
> **Target:** MVP Beta Release

This document contains the complete task breakdown from zero to first version, organized by sprints. **Sprint 1-3 = MVP (Beta Release)**. Later sprints complete the full Phase 1 feature set.

---

## Overview

| Sprint | Focus | Priority |
|--------|-------|----------|
| Sprint 1 | Foundation & Infrastructure | **MVP** |
| Sprint 2 | CLI Core | **MVP** |
| Sprint 3 | Dashboard MVP | **MVP** |
| Sprint 4 | CLI Complete | Post-MVP |
| Sprint 5 | Dashboard Complete | Post-MVP |
| Sprint 6 | Reports, Polish & Testing | Post-MVP |

---

# MVP SECTION (Release Today)

---

## Sprint 1: Foundation & Infrastructure

**Goal:** Set up the monorepo, shared package, database schema, and authentication foundation.

### 1.1 Monorepo Setup

| Task ID | Task | Description | Files to Create/Modify |
|---------|------|-------------|------------------------|
| 1.1.1 | Initialize pnpm workspace | Create `pnpm-workspace.yaml` with workspace definitions for `apps/*` and `packages/*` | `pnpm-workspace.yaml` |
| 1.1.2 | Create root package.json | Define workspace scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `db:generate`, `db:migrate`, `db:studio` | `package.json` |
| 1.1.3 | Configure root TypeScript | Create `tsconfig.json` with strict mode, path aliases for `@afterburn/shared` | `tsconfig.json` |
| 1.1.4 | Create directory structure | Create folders: `apps/web/`, `packages/cli/`, `packages/shared/` with nested structure per CLAUDE.md | Multiple directories |
| 1.1.5 | Add .gitignore | Include node_modules, dist, .env.local, .next, coverage, *.log | `.gitignore` |
| 1.1.6 | Add .nvmrc | Specify Node.js 18+ LTS version | `.nvmrc` |

### 1.2 Shared Package (`packages/shared`)

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 1.2.1 | Create shared package.json | Name: `@afterburn/shared`, main entry, TypeScript config | `packages/shared/package.json` |
| 1.2.2 | Create shared tsconfig | Strict mode, ES2022 target, declaration files | `packages/shared/tsconfig.json` |
| 1.2.3 | Define TypeScript types | Create `TaskRecord`, `TelemetryPayload`, `ToolUsage`, `AfterBurnConfig` interfaces | `packages/shared/src/types.ts` |
| 1.2.4 | Create Zod schemas | Matching schemas for all types with validation rules | `packages/shared/src/schemas.ts` |
| 1.2.5 | Implement cost utilities | `MODEL_PRICING` object, `estimateCost()` function, `formatCost()` function, `PRICING_LAST_UPDATED` constant | `packages/shared/src/cost.ts` |
| 1.2.6 | Create barrel export | Export all from `src/index.ts` | `packages/shared/src/index.ts` |

**Types to define in `types.ts`:**

```typescript
export interface ToolUsage {
  name: string;
  count: number;
}

export interface TaskRecord {
  task_id: string;
  workspace_id: string;
  developer_alias: string;
  project_slug: string;
  tool_source: 'claude_code' | 'codex';
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  cost_usd: number;
  files_changed: number;
  tools_used: ToolUsage[];
  task_duration_sec: number;
  hook_scope: 'global' | 'project';
  cli_version: string;
  created_at: string; // ISO timestamp
}

export interface TelemetryPayload {
  developer_alias: string;
  project_slug: string;
  tool_source: 'claude_code';
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  cost_usd: number;
  files_changed: number;
  tools_used: ToolUsage[];
  task_duration_sec: number;
  hook_scope: 'global' | 'project';
  cli_version: string;
}

export interface AfterBurnConfig {
  workspace_key: string;
  developer_alias: string;
  hook_scope: 'global' | 'project';
  default_project: string;
  project_overrides: Record<string, string>;
}
```

**Cost utilities in `cost.ts`:**

```typescript
export const PRICING_LAST_UPDATED = '2026-03-01';

export const MODEL_PRICING: Record<string, { input: number; output: number; cache: number }> = {
  'claude-opus-4': { input: 15.0, output: 75.0, cache: 1.5 },
  'claude-sonnet-4-5': { input: 3.0, output: 15.0, cache: 0.3 },
  'claude-haiku-4-5': { input: 0.8, output: 4.0, cache: 0.08 },
};

const FALLBACK = 'claude-sonnet-4-5';

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheTokens: number
): number {
  const p = MODEL_PRICING[model] ?? MODEL_PRICING[FALLBACK];
  return (
    (inputTokens / 1_000_000) * p.input +
    (outputTokens / 1_000_000) * p.output +
    (cacheTokens / 1_000_000) * p.cache
  );
}

export function formatCost(usd: number): string {
  return `~$${usd.toFixed(3)}`;
}
```

### 1.3 Web App Foundation (`apps/web`)

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 1.3.1 | Initialize Next.js 15 | Create Next.js app with App Router, TypeScript, Tailwind CSS v4 | `apps/web/` base files |
| 1.3.2 | Configure package.json | Add dependencies: drizzle-orm, @tanstack/react-query, next-auth, bcryptjs, zod. Add dev deps: drizzle-kit, tsx | `apps/web/package.json` |
| 1.3.3 | Configure Tailwind | Set up Tailwind v4 with dark mode, custom colors for semantic tokens | `apps/web/tailwind.config.ts`, `apps/web/postcss.config.mjs` |
| 1.3.4 | Set up shadcn/ui | Initialize shadcn with dark theme, add base components: button, card, input, label | `apps/web/components.json`, `apps/web/components/ui/` |
| 1.3.5 | Create utility helpers | `cn()` function for class merging | `apps/web/lib/utils.ts` |
| 1.3.6 | Create env file template | DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL | `apps/web/.env.example` |

### 1.4 Database Setup (Drizzle + PostgreSQL)

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 1.4.1 | Create Drizzle schema | Define `workspaces` and `tasks` tables exactly as specified in CLAUDE.md | `apps/web/lib/db/schema.ts` |
| 1.4.2 | Create database client | Initialize Drizzle with postgres-js driver | `apps/web/lib/db/index.ts` |
| 1.4.3 | Configure Drizzle Kit | Set up drizzle.config.ts for migrations | `apps/web/drizzle.config.ts` |
| 1.4.4 | Generate initial migration | Run `drizzle-kit generate` to create migration file | `apps/web/lib/db/migrations/` |
| 1.4.5 | Create docker-compose | Local PostgreSQL for development | `docker-compose.yml` |

**Schema must match exactly:**

```typescript
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  api_key_hash: text('api_key_hash').notNull().unique(),
  plan: text('plan').notNull().default('free'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  developer_alias: text('developer_alias').notNull(),
  project_slug: text('project_slug').notNull(),
  tool_source: text('tool_source').notNull().default('claude_code'),
  model_name: text('model_name').notNull(),
  input_tokens: integer('input_tokens').notNull().default(0),
  output_tokens: integer('output_tokens').notNull().default(0),
  cache_tokens: integer('cache_tokens').notNull().default(0),
  cost_usd: numeric('cost_usd', { precision: 10, scale: 6 }).notNull(),
  files_changed: integer('files_changed').notNull().default(0),
  tools_used: jsonb('tools_used').notNull().default([]),
  task_duration_sec: integer('task_duration_sec').notNull().default(0),
  hook_scope: text('hook_scope').notNull().default('global'),
  cli_version: text('cli_version'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  workspaceTimeIdx: index('idx_tasks_workspace_time').on(table.workspace_id, table.created_at),
}));
```

### 1.5 Authentication (NextAuth.js v5)

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 1.5.1 | Configure NextAuth | Set up Auth.js with email magic link provider | `apps/web/lib/auth.ts` |
| 1.5.2 | Create auth API route | NextAuth route handler | `apps/web/app/api/auth/[...nextauth]/route.ts` |
| 1.5.3 | Create login page | Simple email input form for magic link | `apps/web/app/auth/login/page.tsx` |
| 1.5.4 | Add session provider | Wrap app with SessionProvider | `apps/web/app/providers.tsx` |
| 1.5.5 | Create auth middleware | Protect dashboard routes | `apps/web/middleware.ts` |

### 1.6 API Key Management

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 1.6.1 | Create API key utilities | `generateApiKey()`, `hashApiKey()`, `verifyApiKey()` functions using bcryptjs | `apps/web/lib/api-key.ts` |
| 1.6.2 | Create workspace queries | `createWorkspace()`, `getWorkspaceByApiKey()`, `rotateApiKey()` | `apps/web/lib/db/queries/workspaces.ts` |

**API key format:** `ab-ws-{36 hex chars}` using `randomBytes(18).toString('hex')`

---

## Sprint 2: CLI Core

**Goal:** Build the CLI with init command, Claude Code hook integration, session log parsing, and API sync.

### 2.1 CLI Package Setup

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 2.1.1 | Create CLI package.json | Name: `afterburn`, bin entry, dependencies: commander, chalk, ora, conf, execa, zod | `packages/cli/package.json` |
| 2.1.2 | Configure tsup | Build config for single CJS bundle, no external runtime deps | `packages/cli/tsup.config.ts` |
| 2.1.3 | Configure TypeScript | Strict mode, target ES2022 | `packages/cli/tsconfig.json` |
| 2.1.4 | Create CLI entry point | Commander program setup with version and description | `packages/cli/src/index.ts` |

### 2.2 CLI Configuration Library

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 2.2.1 | Create config manager | Use `conf` package to manage `~/.afterburn/config.json` | `packages/cli/src/lib/config.ts` |
| 2.2.2 | Define config schema | Validate config shape matches `AfterBurnConfig` type | Same file |
| 2.2.3 | Implement get/set/clear | Functions to read, write, and clear config values | Same file |

**Config manager implementation:**

```typescript
import Conf from 'conf';
import { AfterBurnConfig } from '@afterburn/shared';

const config = new Conf<AfterBurnConfig>({
  projectName: 'afterburn',
  defaults: {
    workspace_key: '',
    developer_alias: '',
    hook_scope: 'global',
    default_project: '',
    project_overrides: {},
  },
});

export function getConfig(): AfterBurnConfig {
  return config.store;
}

export function setConfig(key: keyof AfterBurnConfig, value: any): void {
  config.set(key, value);
}

export function clearConfig(): void {
  config.clear();
}
```

### 2.3 Git Integration

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 2.3.1 | Create git utilities | Function to detect git remote URL using execa | `packages/cli/src/lib/git.ts` |
| 2.3.2 | Parse repo name | Extract repository name from git URL (SSH or HTTPS format) | Same file |
| 2.3.3 | Handle missing git | Graceful fallback when not in a git repo | Same file |

**Git utilities:**

```typescript
import { execa } from 'execa';
import path from 'path';

export async function getGitRemoteUrl(): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['remote', 'get-url', 'origin']);
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
    return match[1].split('/').pop() || '';
  }
  return '';
}

export async function detectProjectSlug(cwd: string): Promise<string> {
  const url = await getGitRemoteUrl();
  if (url) {
    return parseRepoName(url) || path.basename(cwd);
  }
  return path.basename(cwd);
}
```

### 2.4 Hooks File Management

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 2.4.1 | Create hooks file manager | Read/write to `.claude/settings.json` (global or project) | `packages/cli/src/lib/hooks-file.ts` |
| 2.4.2 | Implement merge logic | **CRITICAL:** Always read existing file, merge hooks, write back. Never overwrite. | Same file |
| 2.4.3 | Handle file creation | Create file and parent directories if they don't exist | Same file |

**Hooks file manager:**

```typescript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface ClaudeSettings {
  hooks?: {
    Stop?: { command: string }[];
    PostToolUse?: { command: string }[];
    Notification?: { command: string }[];
  };
  [key: string]: unknown;
}

const AFTERBURN_HOOKS = {
  Stop: [{ command: 'afterburn hook stop' }],
  PostToolUse: [{ command: 'afterburn hook post-tool-use' }],
  Notification: [{ command: 'afterburn hook notification' }],
};

export function getSettingsPath(scope: 'global' | 'project', cwd: string): string {
  if (scope === 'global') {
    return path.join(os.homedir(), '.claude', 'settings.json');
  }
  return path.join(cwd, '.claude', 'settings.json');
}

export async function registerHooks(scope: 'global' | 'project', cwd: string): Promise<void> {
  const filePath = getSettingsPath(scope, cwd);

  // Read existing file or start with empty object
  let settings: ClaudeSettings = {};
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    settings = JSON.parse(content);
  } catch {
    // File doesn't exist, start fresh
  }

  // Merge hooks (don't overwrite existing hooks from other tools)
  settings.hooks = settings.hooks || {};

  for (const [hookType, hookDef] of Object.entries(AFTERBURN_HOOKS)) {
    const existingHooks = settings.hooks[hookType as keyof typeof settings.hooks] || [];
    const hasAfterburn = existingHooks.some(h => h.command.startsWith('afterburn'));

    if (!hasAfterburn) {
      settings.hooks[hookType as keyof typeof settings.hooks] = [...existingHooks, ...hookDef];
    }
  }

  // Ensure directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  // Write back
  await fs.writeFile(filePath, JSON.stringify(settings, null, 2));
}

export async function unregisterHooks(scope: 'global' | 'project', cwd: string): Promise<void> {
  const filePath = getSettingsPath(scope, cwd);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const settings: ClaudeSettings = JSON.parse(content);

    if (settings.hooks) {
      for (const hookType of ['Stop', 'PostToolUse', 'Notification'] as const) {
        if (settings.hooks[hookType]) {
          settings.hooks[hookType] = settings.hooks[hookType]!.filter(
            h => !h.command.startsWith('afterburn')
          );
        }
      }
    }

    await fs.writeFile(filePath, JSON.stringify(settings, null, 2));
  } catch {
    // File doesn't exist, nothing to unregister
  }
}
```

### 2.5 Session Log Parser

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 2.5.1 | Create session log reader | Read most recent `.jsonl` file from `~/.claude/projects/{hash}/sessions/` | `packages/cli/src/lib/session-log.ts` |
| 2.5.2 | Parse JSONL entries | Extract token counts, model name, tool usage from session log | Same file |
| 2.5.3 | Calculate session hash | Generate base64url hash from cwd to find correct project folder | Same file |

**Session log parser:**

```typescript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';

interface SessionData {
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  model: string;
  tools_used: { name: string; count: number }[];
  files_changed: number;
  duration_sec: number;
}

function getProjectHash(cwd: string): string {
  // Claude Code uses base64url encoding of the cwd
  return Buffer.from(cwd).toString('base64url');
}

async function findLatestSession(projectPath: string): Promise<string | null> {
  const sessionsPath = path.join(projectPath, 'sessions');

  try {
    const files = await fs.readdir(sessionsPath);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

    if (jsonlFiles.length === 0) return null;

    // Get most recent by mtime
    let latestFile = jsonlFiles[0];
    let latestMtime = 0;

    for (const file of jsonlFiles) {
      const stat = await fs.stat(path.join(sessionsPath, file));
      if (stat.mtimeMs > latestMtime) {
        latestMtime = stat.mtimeMs;
        latestFile = file;
      }
    }

    return path.join(sessionsPath, latestFile);
  } catch {
    return null;
  }
}

export async function parseSessionLog(cwd: string): Promise<SessionData | null> {
  const projectHash = getProjectHash(cwd);
  const projectPath = path.join(os.homedir(), '.claude', 'projects', projectHash);

  const sessionFile = await findLatestSession(projectPath);
  if (!sessionFile) return null;

  try {
    const content = await fs.readFile(sessionFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    let inputTokens = 0;
    let outputTokens = 0;
    let cacheTokens = 0;
    let model = 'claude-sonnet-4-5';
    const toolCounts: Record<string, number> = {};
    let filesChanged = 0;
    let startTime: number | null = null;
    let endTime: number | null = null;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Track timestamps for duration
        if (entry.timestamp) {
          const ts = new Date(entry.timestamp).getTime();
          if (!startTime || ts < startTime) startTime = ts;
          if (!endTime || ts > endTime) endTime = ts;
        }

        // Extract token usage
        if (entry.usage) {
          inputTokens += entry.usage.input_tokens || 0;
          outputTokens += entry.usage.output_tokens || 0;
          cacheTokens += entry.usage.cache_read_input_tokens || 0;
        }

        // Extract model
        if (entry.model) {
          model = entry.model;
        }

        // Track tool usage
        if (entry.type === 'tool_use' && entry.name) {
          toolCounts[entry.name] = (toolCounts[entry.name] || 0) + 1;
        }

        // Track file changes (Edit, Write tools)
        if (entry.type === 'tool_use' && (entry.name === 'Edit' || entry.name === 'Write')) {
          filesChanged++;
        }
      } catch {
        // Skip malformed lines
      }
    }

    const tools_used = Object.entries(toolCounts).map(([name, count]) => ({ name, count }));
    const duration_sec = startTime && endTime ? Math.round((endTime - startTime) / 1000) : 0;

    return {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_tokens: cacheTokens,
      model,
      tools_used,
      files_changed: filesChanged,
      duration_sec,
    };
  } catch {
    return null;
  }
}
```

### 2.6 API Client

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 2.6.1 | Create API client | POST to `/api/v1/tasks` with Authorization header | `packages/cli/src/lib/api.ts` |
| 2.6.2 | Handle response codes | 201 success, 400 validation error, 401 unauthorized, 429 rate limited | Same file |
| 2.6.3 | Return structured result | Success with task_id or error message | Same file |

**API client:**

```typescript
import { TelemetryPayload } from '@afterburn/shared';
import { getConfig } from './config';

const API_BASE = process.env.AFTERBURN_API_URL || 'https://app.afterburn.dev';

interface ApiResult {
  success: boolean;
  task_id?: string;
  error?: string;
  retryAfter?: number;
}

export async function sendTask(payload: TelemetryPayload): Promise<ApiResult> {
  const config = getConfig();

  if (!config.workspace_key) {
    return { success: false, error: 'No workspace key configured. Run: afterburn init' };
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.workspace_key}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 201) {
      const data = await response.json();
      return { success: true, task_id: data.task_id };
    }

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      return { success: false, error: 'Rate limited', retryAfter };
    }

    if (response.status === 401) {
      return { success: false, error: 'Invalid workspace key. Run: afterburn config' };
    }

    const errorData = await response.json().catch(() => ({}));
    return { success: false, error: errorData.error || `API error: ${response.status}` };
  } catch (err) {
    return { success: false, error: `Network error: ${(err as Error).message}` };
  }
}
```

### 2.7 Offline Buffer

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 2.7.1 | Create buffer manager | Store failed tasks to `~/.afterburn/buffer/{task_id}.json` | `packages/cli/src/lib/buffer.ts` |
| 2.7.2 | Implement flush logic | On sync, flush buffered tasks oldest-first before sending new | Same file |
| 2.7.3 | Enforce buffer cap | Warn at 40 records, drop oldest at 50 | Same file |

**Buffer manager:**

```typescript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { TelemetryPayload } from '@afterburn/shared';
import { randomUUID } from 'crypto';

const BUFFER_DIR = path.join(os.homedir(), '.afterburn', 'buffer');
const MAX_BUFFER = 50;
const WARN_THRESHOLD = 40;

export async function bufferTask(payload: TelemetryPayload): Promise<void> {
  await fs.mkdir(BUFFER_DIR, { recursive: true });

  const files = await getBufferedFiles();

  // Enforce cap
  if (files.length >= MAX_BUFFER) {
    console.warn(`Buffer full (${MAX_BUFFER} tasks). Dropping oldest.`);
    await fs.unlink(path.join(BUFFER_DIR, files[0]));
  } else if (files.length >= WARN_THRESHOLD) {
    console.warn(`Buffer nearly full: ${files.length}/${MAX_BUFFER} tasks`);
  }

  const taskId = randomUUID();
  const filePath = path.join(BUFFER_DIR, `${Date.now()}-${taskId}.json`);
  await fs.writeFile(filePath, JSON.stringify(payload));
}

export async function getBufferedFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(BUFFER_DIR);
    return files.filter(f => f.endsWith('.json')).sort(); // Sort by timestamp prefix
  } catch {
    return [];
  }
}

export async function getBufferedTasks(): Promise<{ file: string; payload: TelemetryPayload }[]> {
  const files = await getBufferedFiles();
  const tasks: { file: string; payload: TelemetryPayload }[] = [];

  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(BUFFER_DIR, file), 'utf-8');
      tasks.push({ file, payload: JSON.parse(content) });
    } catch {
      // Skip corrupted files
    }
  }

  return tasks;
}

export async function removeBufferedTask(file: string): Promise<void> {
  try {
    await fs.unlink(path.join(BUFFER_DIR, file));
  } catch {
    // Already deleted
  }
}

export function getBufferCount(): Promise<number> {
  return getBufferedFiles().then(f => f.length);
}
```

### 2.8 Init Command

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 2.8.1 | Create init command | Interactive setup wizard using chalk + ora | `packages/cli/src/commands/init.ts` |
| 2.8.2 | Prompt for workspace key | Validate key format starts with `ab-ws-` | Same file |
| 2.8.3 | Authenticate against API | Call `/api/v1/auth/validate` to verify key, display workspace name | Same file |
| 2.8.4 | Prompt for developer alias | Ask for name to display in dashboard | Same file |
| 2.8.5 | Choose hook scope | Global (recommended) or Project-only | Same file |
| 2.8.6 | Auto-detect project | From git remote or directory name | Same file |
| 2.8.7 | Register hooks | Write to appropriate settings.json | Same file |
| 2.8.8 | Save config | Persist to `~/.afterburn/config.json` | Same file |
| 2.8.9 | Display success | Show dashboard URL and next steps | Same file |

### 2.9 Hook Commands

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 2.9.1 | Create stop hook handler | Main task capture — reads session, builds payload, syncs | `packages/cli/src/hooks/stop.ts` |
| 2.9.2 | Create post-tool-use hook | Reserved for future tool accumulation (minimal implementation) | `packages/cli/src/hooks/post-tool-use.ts` |
| 2.9.3 | Create notification hook | Reserved for future use (minimal implementation) | `packages/cli/src/hooks/notification.ts` |
| 2.9.4 | Register hook commands | Add `afterburn hook stop`, `afterburn hook post-tool-use`, `afterburn hook notification` to CLI | `packages/cli/src/index.ts` |

**Stop hook implementation:**

```typescript
import chalk from 'chalk';
import { estimateCost, TelemetryPayload } from '@afterburn/shared';
import { getConfig } from '../lib/config';
import { parseSessionLog } from '../lib/session-log';
import { detectProjectSlug } from '../lib/git';
import { sendTask } from '../lib/api';
import { bufferTask, getBufferedTasks, removeBufferedTask } from '../lib/buffer';

const CLI_VERSION = require('../../package.json').version;

export async function handleStopHook(): Promise<void> {
  const config = getConfig();
  const cwd = process.cwd();

  // Check for ignored directory
  if (config.project_overrides[cwd] === '__ignored__') {
    return; // Silently skip
  }

  // Resolve project slug
  let projectSlug = config.project_overrides[cwd];
  if (!projectSlug) {
    projectSlug = await detectProjectSlug(cwd);
    if (projectSlug === cwd.split('/').pop()) {
      // Just directory name, no git remote
      console.log(chalk.dim(`Tip: Set a project name: afterburn project set <name>`));
    }
  }

  // Parse session log
  const session = await parseSessionLog(cwd);
  if (!session) {
    console.error(chalk.yellow('Could not parse session log'));
    return;
  }

  // Build payload
  const cost = estimateCost(
    session.model,
    session.input_tokens,
    session.output_tokens,
    session.cache_tokens
  );

  const payload: TelemetryPayload = {
    developer_alias: config.developer_alias,
    project_slug: projectSlug || 'untagged',
    tool_source: 'claude_code',
    model_name: session.model,
    input_tokens: session.input_tokens,
    output_tokens: session.output_tokens,
    cache_tokens: session.cache_tokens,
    cost_usd: cost,
    files_changed: session.files_changed,
    tools_used: session.tools_used,
    task_duration_sec: session.duration_sec,
    hook_scope: config.hook_scope,
    cli_version: CLI_VERSION,
  };

  // Flush buffer first
  const buffered = await getBufferedTasks();
  for (const { file, payload: bufferedPayload } of buffered) {
    const result = await sendTask(bufferedPayload);
    if (result.success) {
      await removeBufferedTask(file);
    } else {
      break; // Stop flushing if API is still down
    }
  }

  // Send current task
  const result = await sendTask(payload);

  if (result.success) {
    console.log(chalk.green('✓ Task synced'));
  } else {
    console.log(chalk.yellow(`Buffered: ${result.error}`));
    await bufferTask(payload);
  }
}
```

### 2.10 Task Ingestion API

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 2.10.1 | Create tasks API route | POST `/api/v1/tasks` handler | `apps/web/app/api/v1/tasks/route.ts` |
| 2.10.2 | Implement auth validation | Read Bearer token, verify against bcrypt hash, get workspace_id | Same file |
| 2.10.3 | Validate request body | Parse with TelemetryPayload Zod schema | Same file |
| 2.10.4 | Sanity check cost | Reject if cost_usd > 50, log anomaly | Same file |
| 2.10.5 | Insert task record | Insert into tasks table with workspace_id | Same file |
| 2.10.6 | Return response | 201 with task_id on success | Same file |
| 2.10.7 | Create auth validation endpoint | GET `/api/v1/auth/validate` for CLI init | `apps/web/app/api/v1/auth/validate/route.ts` |

---

## Sprint 3: Dashboard MVP

**Goal:** Build the core dashboard with Overview and Task Feed pages.

### 3.1 Dashboard Layout

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 3.1.1 | Create dashboard route group | `(dashboard)` folder with shared layout | `apps/web/app/(dashboard)/layout.tsx` |
| 3.1.2 | Build sidebar navigation | Links to Overview, Tasks, Developers, Projects, Cost, Reports, Settings | `apps/web/components/dashboard/Sidebar.tsx` |
| 3.1.3 | Build top navigation | Workspace name, user avatar, logout | `apps/web/components/dashboard/TopNav.tsx` |
| 3.1.4 | Apply dark-mode styling | Use semantic Tailwind tokens | Same files |

### 3.2 Shared Components

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 3.2.1 | Create MetricCard component | Displays title, value, optional trend indicator | `apps/web/components/shared/MetricCard.tsx` |
| 3.2.2 | Create DataTable component | Reusable table with sorting, filtering, pagination | `apps/web/components/shared/DataTable.tsx` |
| 3.2.3 | Create TaskDetailPanel component | Expandable panel showing token breakdown, tools used, files changed | `apps/web/components/shared/TaskDetailPanel.tsx` |

**MetricCard component:**

```tsx
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function MetricCard({ title, value, subtitle, trend }: MetricCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {trend && (
        <p className={cn("text-sm mt-1", trend.isPositive ? "text-green-500" : "text-red-500")}>
          {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
        </p>
      )}
    </div>
  );
}
```

### 3.3 Database Queries

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 3.3.1 | Create tasks queries | `getTasksByWorkspace()`, `getTaskById()`, `getTaskStats()` | `apps/web/lib/db/queries/tasks.ts` |
| 3.3.2 | Create developers queries | `getDevelopersByWorkspace()`, `getDeveloperStats()` | `apps/web/lib/db/queries/developers.ts` |

**CRITICAL:** Every query on `tasks` table MUST include `.where(eq(tasks.workspace_id, wsId))`

### 3.4 Overview Page

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 3.4.1 | Create Overview page | Route at `/` within dashboard group | `apps/web/app/(dashboard)/page.tsx` |
| 3.4.2 | Add metric cards | Total tokens, estimated cost, tasks completed, active devs | Same file |
| 3.4.3 | Add period selector | 7 days / 30 days / this month dropdown | `apps/web/components/dashboard/overview/PeriodSelector.tsx` |
| 3.4.4 | Add recent tasks list | Last 5 tasks with basic info | `apps/web/components/dashboard/overview/RecentTasks.tsx` |
| 3.4.5 | Add top projects bar | Horizontal bars showing token volume by project | `apps/web/components/dashboard/overview/TopProjects.tsx` |

### 3.5 Task Feed Page

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 3.5.1 | Create Tasks page | Route at `/tasks` | `apps/web/app/(dashboard)/tasks/page.tsx` |
| 3.5.2 | Build task list table | Columns: developer, project, tokens, cost, files, tools, duration, time | `apps/web/components/dashboard/tasks/TaskList.tsx` |
| 3.5.3 | Add filters | Filter by developer, project, date range | `apps/web/components/dashboard/tasks/TaskFilters.tsx` |
| 3.5.4 | Implement expandable rows | Click to expand and show TaskDetailPanel | Same as TaskList |
| 3.5.5 | Add summary bar | Total tasks, total cost, total tokens for active filters | Same file |
| 3.5.6 | Add CSV export button | Generate and download CSV of filtered tasks | Same file |

### 3.6 Settings Page (MVP)

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 3.6.1 | Create Settings page | Route at `/settings` | `apps/web/app/(dashboard)/settings/page.tsx` |
| 3.6.2 | Build API Key section | Display masked key, Copy button (only after generation), Rotate button | `apps/web/components/dashboard/settings/ApiKeySection.tsx` |
| 3.6.3 | Build Developer Roster | Auto-populated list of developers who have synced tasks | `apps/web/components/dashboard/settings/DeveloperRoster.tsx` |
| 3.6.4 | Build Workspace Config | Workspace name input | `apps/web/components/dashboard/settings/WorkspaceConfig.tsx` |
| 3.6.5 | Implement key rotation | API endpoint + UI flow | `apps/web/app/api/v1/workspaces/rotate-key/route.ts` |

### 3.7 Data Fetching Hooks

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 3.7.1 | Set up TanStack Query | Configure QueryClient, add Provider | `apps/web/app/providers.tsx` |
| 3.7.2 | Create useTasks hook | Fetch tasks with filters, pagination | `apps/web/hooks/use-tasks.ts` |
| 3.7.3 | Create useDevelopers hook | Fetch developer list and stats | `apps/web/hooks/use-developers.ts` |
| 3.7.4 | Create useWorkspace hook | Fetch current workspace info | `apps/web/hooks/use-workspace.ts` |

---

# POST-MVP SECTION

---

## Sprint 4: CLI Complete

**Goal:** Implement all remaining CLI commands.

### 4.1 Status Command

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 4.1.1 | Create status command | Show connection status, scope, tracked projects, today's usage | `packages/cli/src/commands/status.ts` |
| 4.1.2 | Display config info | Workspace key (masked), developer alias, hook scope | Same file |
| 4.1.3 | Show hook registration | Which settings.json file has hooks registered | Same file |
| 4.1.4 | Show buffer status | Number of buffered tasks if any | Same file |

### 4.2 Project Commands

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 4.2.1 | Create project command group | Parent command for subcommands | `packages/cli/src/commands/project.ts` |
| 4.2.2 | Implement `project set <name>` | Override project slug for current directory | Same file |
| 4.2.3 | Implement `project list` | Show all directory → project mappings | Same file |
| 4.2.4 | Implement `project ignore` | Set `__ignored__` for current directory | Same file |
| 4.2.5 | Implement `project unignore` | Remove override for current directory | Same file |

### 4.3 Log Command

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 4.3.1 | Create log command | Show last 10 synced tasks from local cache | `packages/cli/src/commands/log.ts` |
| 4.3.2 | Implement `--all` flag | Show full local history | Same file |
| 4.3.3 | Add local task cache | Store synced tasks in `~/.afterburn/history.json` | `packages/cli/src/lib/history.ts` |

### 4.4 Sync Command

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 4.4.1 | Create sync command | Manually flush buffered tasks | `packages/cli/src/commands/sync.ts` |
| 4.4.2 | Show progress | Display count of flushed tasks | Same file |

### 4.5 Config Command

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 4.5.1 | Create config command | Open config or re-run setup wizard | `packages/cli/src/commands/config.ts` |
| 4.5.2 | Implement `--scope global` | Switch hook scope to global | Same file |
| 4.5.3 | Implement `--scope project` | Switch hook scope to project-only | Same file |

### 4.6 Logout Command

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 4.6.1 | Create logout command | Remove credentials and unregister hooks | `packages/cli/src/commands/logout.ts` |
| 4.6.2 | Clear config file | Reset all config values | Same file |
| 4.6.3 | Remove hooks | Unregister from both global and project settings | Same file |

---

## Sprint 5: Dashboard Complete

**Goal:** Implement all remaining dashboard pages.

### 5.1 Developers Page

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 5.1.1 | Create Developers page | Route at `/developers` | `apps/web/app/(dashboard)/developers/page.tsx` |
| 5.1.2 | Build developers table | Columns: alias, scope, tasks, tokens, cost, files, activity bar | `apps/web/components/dashboard/developers/DeveloperList.tsx` |
| 5.1.3 | Add expandable row | 14-day activity bar chart inline | Same file |
| 5.1.4 | Show inactive developers | 0 tasks in period, shown at bottom | Same file |

### 5.2 Projects Page

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 5.2.1 | Create Projects page | Route at `/projects` | `apps/web/app/(dashboard)/projects/page.tsx` |
| 5.2.2 | Build projects table | Columns: project, tasks, tokens, cost, contributors, share bar | `apps/web/components/dashboard/projects/ProjectList.tsx` |
| 5.2.3 | Show contributor avatars | Which developers contributed to each project | Same file |
| 5.2.4 | Add untagged warning | Callout when `untagged` tasks exist | Same file |

### 5.3 Cost & Usage Page

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 5.3.1 | Create Cost page | Route at `/cost` | `apps/web/app/(dashboard)/cost/page.tsx` |
| 5.3.2 | Add cost metric cards | Total cost this month, tokens, tasks, avg cost per task | `apps/web/components/dashboard/cost/CostMetrics.tsx` |
| 5.3.3 | Add monthly trend chart | 6-month bar chart | `apps/web/components/dashboard/cost/MonthlyTrend.tsx` |
| 5.3.4 | Add cost by project | Horizontal bars with $ amounts | `apps/web/components/dashboard/cost/CostByProject.tsx` |
| 5.3.5 | Add cost by developer | Table with share bars | `apps/web/components/dashboard/cost/CostByDeveloper.tsx` |
| 5.3.6 | Add CSV export | Export cost data | Same files |

**IMPORTANT:** Cost page is read-only. NO budget alerts, spending limits, or threshold inputs.

### 5.4 Heatmap Component

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 5.4.1 | Create Heatmap component | GitHub-style contribution grid | `apps/web/components/shared/Heatmap.tsx` |
| 5.4.2 | Show 26 weeks | Daily task volume across all developers | Same file |
| 5.4.3 | Add color scale | Intensity based on task count | Same file |
| 5.4.4 | Add to Overview page | Replace placeholder with real component | `apps/web/app/(dashboard)/page.tsx` |

---

## Sprint 6: Reports, Polish & Testing

**Goal:** Complete reports functionality, SSE live feed, polish, and testing.

### 6.1 Reports Page

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 6.1.1 | Create Reports page | Route at `/reports` | `apps/web/app/(dashboard)/reports/page.tsx` |
| 6.1.2 | Build weekly summary section | Auto-generated every Monday | `apps/web/components/dashboard/reports/WeeklySummary.tsx` |
| 6.1.3 | Build monthly cost section | Full breakdown on 1st of month | `apps/web/components/dashboard/reports/MonthlyCost.tsx` |
| 6.1.4 | Add PDF download | Generate PDF report | `apps/web/lib/reports/pdf-generator.ts` |
| 6.1.5 | Add CSV download | Export report data as CSV | `apps/web/lib/reports/csv-generator.ts` |
| 6.1.6 | Add email toggle | Configure scheduled email delivery | `apps/web/components/dashboard/reports/EmailSettings.tsx` |

### 6.2 SSE Live Feed

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 6.2.1 | Create SSE endpoint | GET `/api/v1/stream` for real-time task events | `apps/web/app/api/v1/stream/route.ts` |
| 6.2.2 | Emit events on task insert | Broadcast new tasks to connected clients | Modify tasks API |
| 6.2.3 | Create useLiveFeed hook | SSE consumer for dashboard | `apps/web/hooks/use-live-feed.ts` |
| 6.2.4 | Update Overview page | Live updating task feed | `apps/web/components/dashboard/overview/LiveFeed.tsx` |

### 6.3 Rate Limiting

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 6.3.1 | Implement rate limiter | 100 requests/minute per workspace | `apps/web/lib/rate-limit.ts` |
| 6.3.2 | Apply to tasks API | Return 429 with Retry-After header | `apps/web/app/api/v1/tasks/route.ts` |

### 6.4 Settings Enhancements

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 6.4.1 | Add invite developer flow | Send email with workspace key + setup instructions | `apps/web/components/dashboard/settings/InviteDeveloper.tsx` |
| 6.4.2 | Add data retention config | 12 months default, configurable | `apps/web/components/dashboard/settings/DataRetention.tsx` |
| 6.4.3 | Add scheduled report toggles | Weekly digest, monthly cost, daily summary | Same as EmailSettings |

### 6.5 Polish & UX

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 6.5.1 | Add loading states | Skeleton loaders for all data-fetching components | Various components |
| 6.5.2 | Add error states | Error boundaries and fallback UI | Various components |
| 6.5.3 | Add empty states | Helpful messages when no data | Various components |
| 6.5.4 | Responsive design | Mobile-friendly dashboard layout | Layout components |
| 6.5.5 | Add toast notifications | Success/error feedback for actions | Use shadcn/ui toast |

### 6.6 Testing

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 6.6.1 | Set up Vitest | Configure test runner for both packages | `vitest.config.ts` (root and packages) |
| 6.6.2 | CLI unit tests | Test config, git, session-log, buffer modules | `packages/cli/src/**/*.test.ts` |
| 6.6.3 | Shared package tests | Test cost calculation, schema validation | `packages/shared/src/**/*.test.ts` |
| 6.6.4 | API route tests | Test task ingestion, auth validation | `apps/web/app/api/**/*.test.ts` |
| 6.6.5 | E2E tests setup | Configure Playwright for dashboard | `apps/web/e2e/` |
| 6.6.6 | E2E happy path tests | Login → view tasks → export CSV | `apps/web/e2e/dashboard.spec.ts` |

### 6.7 Documentation

| Task ID | Task | Description | Files to Create |
|---------|------|-------------|-----------------|
| 6.7.1 | Create README.md | Project overview, setup instructions | `README.md` |
| 6.7.2 | CLI documentation | Command reference, setup guide | `packages/cli/README.md` |
| 6.7.3 | API documentation | Endpoint reference | `docs/API.md` |

---

## Summary

| Sprint | Tasks | MVP? |
|--------|-------|------|
| Sprint 1 | 28 tasks | Yes |
| Sprint 2 | 38 tasks | Yes |
| Sprint 3 | 26 tasks | Yes |
| Sprint 4 | 14 tasks | No |
| Sprint 5 | 14 tasks | No |
| Sprint 6 | 27 tasks | No |

**Total MVP Tasks (Sprints 1-3):** 92 tasks
**Total Post-MVP Tasks (Sprints 4-6):** 55 tasks
**Total All Tasks:** 147 tasks

---

## Quick Reference: File Structure to Create

```
afterburn/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (dashboard)/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx                    # Overview
│       │   │   ├── tasks/page.tsx
│       │   │   ├── developers/page.tsx         # Sprint 5
│       │   │   ├── projects/page.tsx           # Sprint 5
│       │   │   ├── cost/page.tsx               # Sprint 5
│       │   │   ├── reports/page.tsx            # Sprint 6
│       │   │   └── settings/page.tsx
│       │   ├── api/
│       │   │   ├── auth/[...nextauth]/route.ts
│       │   │   └── v1/
│       │   │       ├── tasks/route.ts
│       │   │       ├── tasks/[id]/route.ts     # Sprint 5
│       │   │       ├── auth/validate/route.ts
│       │   │       ├── workspaces/rotate-key/route.ts
│       │   │       └── stream/route.ts         # Sprint 6
│       │   ├── auth/login/page.tsx
│       │   ├── layout.tsx
│       │   └── providers.tsx
│       ├── components/
│       │   ├── ui/                              # shadcn/ui
│       │   ├── dashboard/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── TopNav.tsx
│       │   │   ├── overview/
│       │   │   ├── tasks/
│       │   │   ├── developers/                  # Sprint 5
│       │   │   ├── projects/                    # Sprint 5
│       │   │   ├── cost/                        # Sprint 5
│       │   │   ├── reports/                     # Sprint 6
│       │   │   └── settings/
│       │   └── shared/
│       │       ├── MetricCard.tsx
│       │       ├── DataTable.tsx
│       │       ├── TaskDetailPanel.tsx
│       │       └── Heatmap.tsx                  # Sprint 5
│       ├── hooks/
│       │   ├── use-tasks.ts
│       │   ├── use-developers.ts
│       │   ├── use-workspace.ts
│       │   └── use-live-feed.ts                 # Sprint 6
│       ├── lib/
│       │   ├── db/
│       │   │   ├── schema.ts
│       │   │   ├── index.ts
│       │   │   ├── migrations/
│       │   │   └── queries/
│       │   │       ├── tasks.ts
│       │   │       ├── workspaces.ts
│       │   │       └── developers.ts
│       │   ├── auth.ts
│       │   ├── api-key.ts
│       │   ├── utils.ts
│       │   ├── rate-limit.ts                    # Sprint 6
│       │   └── reports/                         # Sprint 6
│       ├── middleware.ts
│       ├── tailwind.config.ts
│       ├── postcss.config.mjs
│       ├── drizzle.config.ts
│       ├── components.json
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── cli/
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── init.ts
│   │   │   │   ├── status.ts                    # Sprint 4
│   │   │   │   ├── project.ts                   # Sprint 4
│   │   │   │   ├── log.ts                       # Sprint 4
│   │   │   │   ├── sync.ts                      # Sprint 4
│   │   │   │   ├── config.ts                    # Sprint 4
│   │   │   │   └── logout.ts                    # Sprint 4
│   │   │   ├── hooks/
│   │   │   │   ├── stop.ts
│   │   │   │   ├── post-tool-use.ts
│   │   │   │   └── notification.ts
│   │   │   ├── lib/
│   │   │   │   ├── config.ts
│   │   │   │   ├── git.ts
│   │   │   │   ├── hooks-file.ts
│   │   │   │   ├── session-log.ts
│   │   │   │   ├── api.ts
│   │   │   │   ├── buffer.ts
│   │   │   │   └── history.ts                   # Sprint 4
│   │   │   └── index.ts
│   │   ├── tsup.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/
│       ├── src/
│       │   ├── types.ts
│       │   ├── schemas.ts
│       │   ├── cost.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
├── .gitignore
├── .nvmrc
├── CLAUDE.md
└── docs/
    ├── TASKS.md                                 # This file
    └── API.md                                   # Sprint 6
```

---

_End of Task List_
