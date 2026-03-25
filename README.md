# CodeUsage

AI coding tool intelligence platform for engineering teams. Get visibility into how AI coding assistants are used across your organization—who's using them, on which projects, and what it costs.

## Overview

CodeUsage provides:

- **Usage tracking** — Automatic capture of token usage, costs, and task metadata
- **Team dashboard** — Real-time visibility into AI tool usage across developers and projects
- **Cost analytics** — Track spending by developer, project, and time period
- **Privacy-first** — Metadata only. No prompts, responses, or code content captured.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Coding     │     │   CodeUsage     │     │    Dashboard    │
│     Tool        │────▶│      CLI        │────▶│    (Next.js)    │
│ (Claude Code)   │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       hooks              task telemetry           view & analyze
```

**Supported providers:**

| Provider | Status |
|----------|--------|
| Claude Code | Active |
| Codex | Coming Soon |

## Quick Start

### For Project Managers

1. **Deploy the dashboard** to Vercel or self-host
2. **Create a workspace** and get your API key
3. **Share the key** with your development team

### For Developers

```bash
# Install the CLI
npm install -g codeusage

# Initialize (one-time setup)
codeusage init
```

You'll be prompted for:
- Your workspace API key (from your PM)
- Your name (for the dashboard)
- Hook scope (global or project-only)

That's it. CodeUsage now tracks your AI coding tool usage automatically.

## Project Structure

```
codeusage/
├── apps/
│   └── web/                 # Next.js dashboard + API
│       ├── app/
│       │   ├── (dashboard)/ # Dashboard pages
│       │   └── api/         # API routes
│       ├── components/
│       └── lib/
│           └── db/          # Drizzle ORM schema & queries
├── packages/
│   ├── cli/                 # Developer CLI (npm: codeusage)
│   └── shared/              # Shared types, schemas, utilities
└── docs/
```

## Development

### Prerequisites

- Node.js 18+
- Bun (package manager)
- Docker (for local PostgreSQL)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourorg/codeusage.git
cd codeusage

# Install dependencies
bun install

# Start the database
docker-compose up -d

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your database URL

# Run database migrations
bun run db:migrate

# Start development servers
bun run dev
```

### Available Scripts

```bash
# Development
bun run dev              # Start all packages in dev mode
bun run dev:web          # Start web app only (localhost:3003)
bun run dev:cli          # Start CLI in watch mode

# Build
bun run build            # Build all packages
bun run build:web        # Build web app
bun run build:cli        # Build CLI

# Database
bun run db:generate      # Generate migration from schema changes
bun run db:migrate       # Apply pending migrations
bun run db:studio        # Open Drizzle Studio

# Quality
bun run typecheck        # TypeScript check
bun run lint             # ESLint
bun run test             # Run tests
```

### Testing the CLI locally

```bash
# Build the CLI
bun run build:cli

# Run commands
node packages/cli/dist/index.js status
node packages/cli/dist/index.js hook stop --dry-run
```

## Tech Stack

### Web App (`apps/web`)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Database | PostgreSQL + Drizzle ORM |
| Auth | NextAuth.js v5 (magic link) |
| Data fetching | TanStack Query v5 |
| Real-time | Server-Sent Events |

### CLI (`packages/cli`)

| Layer | Technology |
|-------|------------|
| Language | TypeScript |
| CLI framework | Commander.js |
| Build | tsup |
| Config | conf |
| Terminal UI | chalk, ora |

### Shared (`packages/shared`)

- TypeScript types and interfaces
- Zod validation schemas
- Cost estimation utilities
- Provider registry

## Environment Variables

### Web App (`apps/web/.env.local`)

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/codeusage"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3003"
```

### CLI

```bash
# Optional: override API URL for local development
CODEUSAGE_API_URL="http://localhost:3003"
```

## API Reference

### Task Ingestion

```
POST /api/v1/tasks
Authorization: Bearer cu-ws-{key}
Content-Type: application/json

{
  "developer_alias": "jane",
  "project_slug": "my-project",
  "tool_source": "claude_code",
  "model_name": "claude-sonnet-4-5",
  "input_tokens": 1500,
  "output_tokens": 800,
  "cache_tokens": 200,
  "cost_usd": 0.0135,
  "files_changed": 3,
  "tools_used": [{"name": "Edit", "count": 5}],
  "task_duration_sec": 120,
  "hook_scope": "global",
  "cli_version": "0.1.0"
}
```

**Responses:**
- `201` — Task created
- `400` — Validation error
- `401` — Invalid API key
- `429` — Rate limited (100 req/min per workspace)

### Auth Validation

```
GET /api/v1/auth/validate
Authorization: Bearer cu-ws-{key}
```

Returns workspace info if key is valid.

## Dashboard Pages

| Route | Description |
|-------|-------------|
| `/` | Overview with key metrics and recent activity |
| `/tasks` | Task feed with filtering and export |
| `/developers` | Developer activity and stats |
| `/projects` | Project breakdown |
| `/cost` | Cost analytics (read-only) |
| `/reports` | Weekly and monthly summaries |
| `/settings` | API key, workspace config |

## Data Privacy

CodeUsage captures **metadata only**:

- Token counts and costs
- Model names
- Tool invocations (names and counts)
- File change counts
- Timestamps and durations

**Never captured:**
- Prompt text or AI responses
- File contents or diffs
- Code snippets
- Personal data beyond developer alias

## Documentation

- [CLI Guide](./packages/cli/README.md) — Full CLI command reference
- [CLAUDE.md](./CLAUDE.md) — Architecture decisions and coding standards

## License

MIT

---

Built for teams who want visibility into their AI coding tool investments.
