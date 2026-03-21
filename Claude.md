# Afterburn — CLAUDE.md

> This file is read by Claude Code at the start of every session.
> Keep it accurate. Update it when architecture decisions change.

---

## What this project is

Afterburn is a cloud-based AI coding tool intelligence platform. It gives engineering teams and project managers visibility into how AI coding tools (Claude Code, Codex, and future agents) are used across their organisation — who is using them, on which projects, how much it costs, and what changed in each task.

Two deliverables:

1. **`apps/web`** — Next.js application serving both the dashboard (frontend) and the API (backend via Route Handlers).
2. **`packages/cli`** — npm package (`afterburn`) that developers install on their machines. Hooks into Claude Code's native event system and sends task-level telemetry to the API.

---

## Tech stack

### Web app (`apps/web`)

| Layer         | Choice                                                             |
| ------------- | ------------------------------------------------------------------ |
| Framework     | Next.js 15 (App Router)                                            |
| Language      | TypeScript (strict)                                                |
| Styling       | Tailwind CSS v4                                                    |
| Components    | shadcn/ui                                                          |
| ORM           | Drizzle ORM                                                        |
| Database      | PostgreSQL (Neon or Supabase in prod, local Docker in dev)         |
| Data fetching | TanStack Query v5 for client components; Server Components for SSR |
| Auth          | NextAuth.js v5 (Auth.js) — email magic link                        |
| Real-time     | Server-Sent Events (SSE) via Route Handler for live task feed      |
| Deployment    | Vercel                                                             |

### CLI (`packages/cli`)

| Layer             | Choice                                                                   |
| ----------------- | ------------------------------------------------------------------------ |
| Language          | TypeScript (strict)                                                      |
| CLI framework     | Commander.js                                                             |
| Dev runner        | tsx                                                                      |
| Build             | tsup (single CJS bundle, zero runtime external deps)                     |
| Terminal colours  | chalk                                                                    |
| Spinners          | ora                                                                      |
| Config management | conf (handles `~/.afterburn/config.json`, cross-platform, atomic writes) |
| Shell commands    | execa (git remote detection, etc.)                                       |
| HTTP client       | native `fetch` (Node 18+) — no axios                                     |
| Validation        | zod (shared with web via `packages/shared`)                              |

### Shared (`packages/shared`)

TypeScript types, Zod schemas, and `estimateCost()` utility. Used by both the CLI and the web app. Import as `@afterburn/shared`.

---

## Monorepo structure

```
afterburn/
├── apps/
│   └── web/                          # Next.js app (dashboard + API)
│       ├── app/
│       │   ├── (dashboard)/          # route group — authenticated pages
│       │   │   ├── layout.tsx        # dashboard shell (sidebar, topnav)
│       │   │   ├── page.tsx          # / → Overview
│       │   │   ├── tasks/page.tsx    # /tasks → Task feed
│       │   │   ├── developers/page.tsx
│       │   │   ├── projects/page.tsx
│       │   │   ├── cost/page.tsx     # /cost → read-only Cost & usage
│       │   │   ├── reports/page.tsx
│       │   │   └── settings/page.tsx
│       │   ├── api/
│       │   │   └── v1/
│       │   │       ├── tasks/route.ts       # POST — CLI ingestion endpoint
│       │   │       ├── tasks/[id]/route.ts  # GET — single task
│       │   │       └── stream/route.ts      # GET — SSE live feed
│       │   ├── auth/
│       │   │   ├── login/page.tsx
│       │   │   └── [...nextauth]/route.ts
│       │   └── layout.tsx
│       ├── components/
│       │   ├── ui/                   # shadcn/ui — DO NOT edit manually
│       │   ├── dashboard/            # page-level composed components
│       │   │   ├── overview/
│       │   │   ├── tasks/
│       │   │   ├── developers/
│       │   │   ├── projects/
│       │   │   ├── cost/
│       │   │   └── settings/
│       │   └── shared/               # used across multiple pages
│       │       ├── TaskDetailPanel.tsx
│       │       ├── Heatmap.tsx
│       │       ├── MetricCard.tsx
│       │       └── DataTable.tsx
│       ├── lib/
│       │   ├── db/
│       │   │   ├── schema.ts         # Drizzle schema — single source of truth
│       │   │   ├── index.ts          # db client
│       │   │   └── queries/          # one file per domain
│       │   │       ├── tasks.ts
│       │   │       ├── workspaces.ts
│       │   │       └── developers.ts
│       │   ├── auth.ts               # NextAuth config
│       │   ├── api-key.ts            # key generation + bcrypt hashing
│       │   └── cost.ts               # re-exports from @afterburn/shared
│       └── hooks/                    # client-side React hooks
│           ├── use-tasks.ts
│           ├── use-developers.ts
│           └── use-live-feed.ts      # SSE consumer
├── packages/
│   ├── cli/
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── init.ts
│   │   │   │   ├── status.ts
│   │   │   │   ├── project.ts        # set / list / ignore / unignore
│   │   │   │   ├── log.ts
│   │   │   │   ├── sync.ts
│   │   │   │   ├── config.ts
│   │   │   │   └── logout.ts
│   │   │   ├── hooks/
│   │   │   │   ├── stop.ts           # main task capture — fired by Claude Code
│   │   │   │   ├── post-tool-use.ts  # accumulates tools_used array
│   │   │   │   └── notification.ts   # reserved
│   │   │   └── lib/
│   │   │       ├── session-log.ts    # reads ~/.claude/projects/.../sessions/*.jsonl
│   │   │       ├── git.ts            # git remote URL detection
│   │   │       ├── config.ts         # read/write config via conf
│   │   │       ├── api.ts            # POST /api/v1/tasks
│   │   │       ├── buffer.ts         # offline buffering
│   │   │       └── hooks-file.ts     # read/write .claude/settings.json
│   │   └── index.ts                  # Commander root + command registration
│   └── shared/
│       └── src/
│           ├── types.ts              # TaskRecord, TelemetryPayload, WorkspaceConfig
│           ├── schemas.ts            # Zod schemas matching types
│           └── cost.ts               # estimateCost(), formatCost(), MODEL_PRICING
├── CLAUDE.md
├── turbo.json
└── package.json
```

---

## Database schema (Drizzle)

`apps/web/lib/db/schema.ts` is the single source of truth. Do not define table shapes anywhere else.

```typescript
import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  api_key_hash: text("api_key_hash").notNull().unique(), // bcrypt — never plaintext
  plan: text("plan").notNull().default("free"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    developer_alias: text("developer_alias").notNull(),
    project_slug: text("project_slug").notNull(),
    tool_source: text("tool_source").notNull().default("claude_code"),
    model_name: text("model_name").notNull(),
    input_tokens: integer("input_tokens").notNull().default(0),
    output_tokens: integer("output_tokens").notNull().default(0),
    cache_tokens: integer("cache_tokens").notNull().default(0),
    cost_usd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull(),
    files_changed: integer("files_changed").notNull().default(0),
    tools_used: jsonb("tools_used").notNull().default([]),
    task_duration_sec: integer("task_duration_sec").notNull().default(0),
    hook_scope: text("hook_scope").notNull().default("global"),
    cli_version: text("cli_version"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // Every dashboard query filters workspace_id + time — this index is mandatory
    workspaceTimeIdx: index("idx_tasks_workspace_time").on(
      table.workspace_id,
      table.created_at,
    ),
  }),
);
```

---

## API route — task ingestion

`apps/web/app/api/v1/tasks/route.ts` handles `POST /api/v1/tasks` from the CLI.

**Auth flow:**

1. Read `Authorization: Bearer <key>` header
2. Hash the key with bcrypt and look up `workspaces` by `api_key_hash`
3. Return `401` if not found — never reveal which workspace a key belongs to in the error

**Validation:** parse body with the shared Zod schema from `@afterburn/shared`. Return `400` with Zod's error message on failure.

**Sanity check:** reject if `cost_usd > 50` — return `400`, log the anomaly. No single task costs this much; it means a calculation error.

**Rate limiting:** 100 requests per minute per `workspace_id`. Return `429` with `Retry-After: 60`.

**On success:** insert into `tasks`, emit SSE event to dashboard clients watching this workspace, return `201 { task_id }`.

---

## API key handling

```typescript
// apps/web/lib/api-key.ts
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const PREFIX = "ab-ws-";

export function generateApiKey(): string {
  // "ab-ws-" + 36 hex chars = recognisable, hard to guess
  return PREFIX + randomBytes(18).toString("hex");
}

export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}

export async function verifyApiKey(
  key: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(key, hash);
}
```

The plaintext key is shown to the PM exactly once — on creation and after rotation. Never stored. The Settings page shows `ab-ws-••••••••••••••••••••••••` with a Copy button that is only functional immediately after generation/rotation. After that the button is disabled.

---

## Cost estimation

Defined in `packages/shared/src/cost.ts`. Import from `@afterburn/shared` everywhere. Never redefine inline.

```typescript
export const PRICING_LAST_UPDATED = "2026-03-01";

// Per 1,000,000 tokens (USD)
export const MODEL_PRICING: Record<
  string,
  { input: number; output: number; cache: number }
> = {
  "claude-opus-4": { input: 15.0, output: 75.0, cache: 1.5 },
  "claude-sonnet-4-5": { input: 3.0, output: 15.0, cache: 0.3 },
  "claude-haiku-4-5": { input: 0.8, output: 4.0, cache: 0.08 },
};

const FALLBACK = "claude-sonnet-4-5";

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheTokens: number,
): number {
  const p = MODEL_PRICING[model] ?? MODEL_PRICING[FALLBACK];
  return (
    (inputTokens / 1_000_000) * p.input +
    (outputTokens / 1_000_000) * p.output +
    (cacheTokens / 1_000_000) * p.cache
  );
}

// Use this everywhere cost is displayed — never format inline
export function formatCost(usd: number): string {
  return `~$${usd.toFixed(3)}`;
}
```

Update `MODEL_PRICING` and `PRICING_LAST_UPDATED` when Anthropic publishes pricing changes.

---

## CLI — how it works

### Hook registration

During `afterburn init`, the CLI writes to one of two files:

- **Global scope:** `~/.claude/settings.json`
- **Project scope:** `.claude/settings.json` (current working directory)

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "afterburn hook stop" }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "afterburn hook post-tool-use" }]
      }
    ],
    "Notification": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "afterburn hook notification" }]
      }
    ]
  }
}
```

**Always merge** into the existing file — read first, inject hooks, write back. Never overwrite. If the file does not exist, create it.

### Session log path

```
~/.claude/projects/{base64url(cwd)}/sessions/{session-id}.jsonl
```

Read only the most recent `.jsonl` file for the current working directory. Extract: `input_tokens`, `output_tokens`, `cache_tokens`, `model`.

### Project detection — priority order

1. `project_overrides[cwd]` in `~/.afterburn/config.json`
2. `git remote get-url origin` → parse repo name from URL (via execa)
3. `default_project` field in config (optional fallback set during init)
4. `path.basename(process.cwd())`

If the resolved value is `"__ignored__"`, skip the task silently — do not sync, do not warn.

If the result is a bare directory name with no git remote, print a dim hint: `To set a project name: afterburn project set <name>` — then sync with the directory name anyway.

### Config shape

```typescript
interface AfterBurnConfig {
  workspace_key: string;
  developer_alias: string;
  hook_scope: "global" | "project";
  default_project: string;
  // cwd → project slug, or "__ignored__" to skip
  project_overrides: Record<string, string>;
}
```

Managed by the `conf` package. Atomic writes. XDG-compliant paths on Linux.

### Offline buffer

Path: `~/.afterburn/buffer/{task_id}.json`

On every sync:

1. Flush buffered files first (chronological, oldest first)
2. Send new record
3. If send fails → write to buffer
4. If buffer count exceeds 50 → warn and drop (never buffer indefinitely)

---

## shadcn/ui conventions

- Add components with: `npx shadcn@latest add <component>` from `apps/web/`
- Files in `components/ui/` are owned by shadcn — do not edit them manually
- Use `cn()` from `lib/utils.ts` for conditional Tailwind class merging
- Tailwind classes only — no inline `style` props, no CSS modules
- Dashboard is **dark-mode first**. Use `dark:` variants consistently.

### Semantic Tailwind tokens to use

```
bg-background          main page background
bg-card                card surfaces
bg-muted               subtle fill (metric cards, alt table rows)
border-border          all dividers and outlines
text-foreground        primary text
text-muted-foreground  labels and secondary text
text-primary           accent colour (blue)
```

Do not hardcode colour values like `bg-slate-900`. Use the semantic tokens so light/dark mode works without duplication.

---

## Drizzle conventions

- All queries in `apps/web/lib/db/queries/` — one file per domain
- Use Drizzle query builder — no raw SQL strings
- **Every query on the `tasks` table must include `.where(eq(tasks.workspace_id, wsId))`**
- Migrations in `apps/web/lib/db/migrations/` — generated by `drizzle-kit generate`
- Never edit migration files manually after generation

```bash
bun db:generate     # generate migration from schema changes
bun db:migrate      # apply pending migrations
bun db:studio       # open Drizzle Studio (local browser)
```

---

## TypeScript conventions

- `"strict": true` in all `tsconfig.json` files
- No `any` — use `unknown` and narrow, or use the shared Zod schemas
- All shared types and schemas come from `@afterburn/shared`
- `async/await` everywhere — no `.then()` chains
- Error handling: never swallow silently. API routes return `{ error: string }` JSON. CLI prints a chalk warning.
- File naming: `kebab-case.ts` for all files, `PascalCase` for React components

---

## What NOT to do

- **Never capture prompt text, AI response content, file paths, or diff content.** Metadata only. If you are about to read file contents or `git diff` output to include in a payload — stop.
- **Never store the workspace API key in plaintext.** Always hash with bcrypt before writing to the database.
- **Never query the `tasks` table without a `workspace_id` filter.** No exceptions. This is a data isolation requirement.
- **Never add per-developer API keys.** One workspace key. Settings page has one key with Copy + Rotate only.
- **Never add budget alerts, spending limits, or threshold configuration.** The Cost page is read-only. No inputs related to budget anywhere.
- **Never overwrite `.claude/settings.json`** — always read-merge-write.
- **Never silently drop a failed task sync.** Buffer to disk. Warn if buffering fails.
- **Never build Codex integration in Phase 1.** That is Phase 2.
- **Never make the file review badge interactive in Phase 1.** Render it as static with a "coming v1.1" label.

---

## Commands

```bash
# Install
bun install

# Dev
bun dev                           # all packages
bun --filter web dev              # Next.js on :3003
bun --filter cli dev              # CLI watch mode (tsx watch)

# Database
bun db:generate                   # generate migration
bun db:migrate                    # apply migrations
bun db:studio                     # Drizzle Studio

# Build
bun run build                     # all packages
bun --filter cli build            # CLI only (tsup → dist/)

# Quality
bun typecheck                     # tsc --noEmit across all
bun lint                          # eslint
bun test                          # vitest

# shadcn (run from apps/web/)
cd apps/web && npx shadcn@latest add <component>

# CLI local test
node packages/cli/dist/index.js hook stop --dry-run
```

---

## Environment variables

```bash
# apps/web/.env.local
DATABASE_URL="postgresql://postgres:password@localhost:5432/afterburn"
NEXTAUTH_SECRET="dev-secret-change-in-prod"
NEXTAUTH_URL="http://localhost:3003"

# apps/web (Vercel — production)
DATABASE_URL="postgresql://..."   # Neon or Supabase
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://app.afterburn.dev"

# packages/cli — no env vars
# All config lives in ~/.afterburn/config.json via conf
```

---

## Current phase

**Phase 1 — MVP (Beta).** Claude Code integration only. No Codex, no AI summaries, no interactive file review, no SSO, no RBAC.

Build only what is described in this file. If a feature is not mentioned here, check the PRD (`Afterburn_PRD_v2.0.docx`) before building it. When in doubt, ask.
