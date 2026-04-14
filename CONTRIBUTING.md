# Contributing to CodeUsage

Thanks for your interest in contributing! This guide covers the basics.

## Development setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.2
- [Node.js](https://nodejs.org) >= 18
- PostgreSQL (local Docker or hosted)

### Getting started

```bash
git clone https://github.com/flowtrail/codeusage.git
cd codeusage
bun install

cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your database URL

bun db:migrate
bun dev
```

## Code conventions

- **TypeScript strict mode** everywhere. No `any` — use `unknown` and narrow.
- **File naming:** `kebab-case.ts` for all files, `PascalCase` for React components.
- **Tailwind only** — no inline `style` props or CSS modules. Use semantic tokens (`bg-background`, `text-foreground`, etc.), not hardcoded colours.
- **`async/await`** — no `.then()` chains.
- **Drizzle ORM** — all queries go in `apps/web/lib/db/queries/`. Every query on the `tasks` table must filter by `workspace_id`.
- **shadcn/ui** components in `components/ui/` are auto-generated. Don't edit them manually.
- Shared types and schemas come from `@codeusage/shared`. Don't redefine them.

## Making changes

1. **Fork and branch** — create a feature branch from `main`.
2. **Keep it focused** — one logical change per PR.
3. **Run checks before pushing:**

```bash
bun typecheck
bun lint
bun test
```

4. **Open a PR** against `main` with a clear description of what changed and why.

## What not to do

- Don't capture prompt text, AI responses, file contents, or diffs. Metadata only.
- Don't store API keys in plaintext.
- Don't query the `tasks` table without a `workspace_id` filter.
- Don't edit files in `components/ui/` — use `npx shadcn@latest add <component>` instead.
- Don't overwrite `.claude/settings.json` — always read-merge-write.

## Project structure

```
codeusage/
├── apps/web/         # Next.js 15 dashboard + API
├── packages/cli/     # npm CLI package
└── packages/shared/  # Shared types, schemas, cost utilities
```

See [CLAUDE.md](./CLAUDE.md) for detailed architecture docs.

## License

By contributing, you agree that your contributions will be licensed under the project's respective licenses (AGPL-3.0 for the web app, MIT for the CLI).
