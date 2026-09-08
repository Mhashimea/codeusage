# Codeusage

AI coding tool intelligence platform for engineering teams — visibility into how AI coding assistants are used across your organization: who's using them, on which projects, and what it costs. Captures usage metadata only — never prompts, responses, or code content.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Coding     │     │   Codeusage     │     │    Dashboard    │
│     Tool        │────▶│      CLI        │────▶│    (Next.js)    │
│ (Claude Code)   │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       hooks              task telemetry           view & analyze
```

A monorepo with three pieces:

- **`apps/web`** — Next.js dashboard + API (TypeScript, Tailwind, PostgreSQL/Drizzle, NextAuth v5)
- **`packages/cli`** — the `codeusage` CLI developers install locally, published to npm as [`codeusage-cli`](https://www.npmjs.com/package/codeusage-cli)
- **`packages/shared`** — types, Zod schemas and cost-estimation logic shared by both

**Supported providers:**

| Provider | Status |
|----------|--------|
| Claude Code | Active |
| Codex | Coming Soon |

## Setup

**Prerequisites:** Node.js 18+, [Bun](https://bun.sh), Docker (for local PostgreSQL).

**Environment variables** go in `apps/web/.env.local` — copy `apps/web/.env.example` and fill these in:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5435/afterburn"  # matches docker-compose.yml
AUTH_SECRET="..."                # openssl rand -base64 32
NEXTAUTH_SECRET="..."            # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3003"
APP_URL="http://localhost:3003"
API_KEY_ENCRYPTION_KEY="..."     # openssl rand -hex 32 (64 hex chars)
```

Optional: `RESEND_API_KEY` + `EMAIL_FROM` (send real emails instead of logging OTPs to the console), `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` (GitHub OAuth login).

## How to Clone and Install

```bash
git clone https://github.com/Mhashimea/afterburn.git
cd afterburn

bun install

docker-compose up -d              # starts local PostgreSQL

cp apps/web/.env.example apps/web/.env.local
# edit apps/web/.env.local as described above

bun run db:migrate

bun run dev
```

The dashboard runs at [http://localhost:3003](http://localhost:3003).

## How to Use It on the Server

**Deploying (project managers / admins):**

1. Deploy `apps/web` to Vercel or self-host it (set the environment variables above against your production database).
2. Sign up, create a workspace, and copy its API key from Settings.
3. Share the key with your development team.

**Connecting a developer's machine:**

```bash
npm install -g codeusage-cli   # installs the `codeusage` command
codeusage init
```

Or without installing: `npx codeusage-cli init`. You'll be prompted for the workspace API key, your name, and hook scope (global or project-only) — after that, the CLI reports task telemetry to your server automatically on every Claude Code session. Point it at a self-hosted server with `CODEUSAGE_API_URL=https://your-domain.example`. Full command reference: [`packages/cli/README.md`](./packages/cli/README.md).

## Data Privacy

Codeusage captures **metadata only**:

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

## License

This project uses a dual license:

- **Web app & shared packages** — [AGPL-3.0](LICENSE)
- **CLI (`packages/cli`)** — [MIT](packages/cli/LICENSE)

See the respective LICENSE files for details.
