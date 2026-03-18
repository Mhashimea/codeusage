# Afterburn CLI

Track your team's AI coding tool usage with zero friction. The Afterburn CLI integrates with AI coding tools to automatically capture task-level telemetry and sync it to your dashboard.

## Supported Providers

| Provider | Status | Description |
|----------|--------|-------------|
| **Claude Code** | Active | Anthropic's AI coding assistant |
| **Codex** | Coming Soon | OpenAI's code generation model |

## Installation

### From GitHub Release (Team Members)

Since the repo is private, you need the GitHub CLI (`gh`) authenticated with access to the radixhr organization.

```bash
# Download the tarball (requires gh auth)
gh release download cli-v0.1.0 --repo radixhr/afterburn --pattern "*.tgz" --dir /tmp

# Install globally
npm install -g /tmp/afterburn-0.1.0.tgz

# Clean up
rm /tmp/afterburn-0.1.0.tgz
```

### One-liner (macOS/Linux)

```bash
gh release download cli-v0.1.0 --repo radixhr/afterburn --pattern "*.tgz" --dir /tmp && npm install -g /tmp/afterburn-0.1.0.tgz && rm /tmp/afterburn-0.1.0.tgz
```

### Prerequisites

1. Install GitHub CLI: `brew install gh`
2. Authenticate: `gh auth login`
3. Ensure you have access to the radixhr organization

### Verify Installation

```bash
afterburn --version
```

**Requirements:** Node.js 18+

## Quick Start

### 1. Get Your Workspace Key

Sign in to [afterburn.text2charts.com](https://afterburn.text2charts.com) and copy your workspace API key from **Settings**. The key looks like `ab-ws-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.

### 2. Initialize

```bash
afterburn init
```

You'll be prompted for:

| Prompt | Description |
|--------|-------------|
| **AI Coding Tool** | Select your provider (Claude Code, etc.) |
| **Workspace Key** | Your `ab-ws-*` key from the dashboard |
| **Developer Alias** | Your name (shown in the dashboard) |
| **Hook Scope** | `global` (all projects) or `project` (this repo only) |

The CLI will:
- Validate your key against the API
- Auto-detect the project name from git remote
- Register hooks with your selected AI coding tool
- Save your configuration

### 3. Start Using Your AI Coding Tool

That's it. Every time you complete a task, Afterburn automatically captures:

- Token usage (input, output, cache)
- Estimated cost
- Model used
- Tools invoked
- Files changed
- Task duration

View your data at [afterburn.text2charts.com](https://afterburn.text2charts.com).

## Commands

### `afterburn init`

Interactive setup wizard. Connects the CLI to your workspace and registers hooks with your AI coding tool.

```bash
afterburn init

# Re-run setup (overwrites existing config)
afterburn init --force
```

### `afterburn status`

Show current configuration and connection status.

```bash
afterburn status
```

Output includes:
- Workspace key (masked)
- Developer alias
- Current provider
- Hook scope and registration status
- Current project name
- Buffer status (pending syncs)

### `afterburn provider`

Manage AI coding tool providers.

```bash
# List all available providers
afterburn provider list

# Show current provider
afterburn provider current

# Switch to a different provider (re-registers hooks)
afterburn provider switch claude_code
```

**Note:** Only active providers can be selected. Coming soon providers are displayed but disabled.

### `afterburn project`

Manage project name mappings per directory.

```bash
# Set a custom project name for the current directory
afterburn project set my-project

# List all custom mappings
afterburn project list

# Show how the current directory resolves
afterburn project current

# Stop tracking this directory
afterburn project ignore

# Resume tracking
afterburn project unignore
```

**Project name resolution priority:**
1. Custom override (`project set`)
2. Git remote URL (e.g., `github.com/org/repo` → `repo`)
3. Default project (if configured)
4. Directory name

### `afterburn sync`

Manually flush any buffered tasks to the API. Useful after regaining network connectivity.

```bash
afterburn sync
```

Tasks are buffered locally when the API is unreachable. The CLI automatically flushes the buffer on each task, but you can force it with this command.

### `afterburn config`

View or modify configuration.

```bash
# Show current config
afterburn config show

# Change hook scope
afterburn config scope global
afterburn config scope project

# Change developer alias
afterburn config alias "Jane Smith"
```

### `afterburn logout`

Disconnect from the workspace and clean up.

```bash
afterburn logout

# Skip confirmation prompt
afterburn logout --force
```

This will:
- Unregister hooks from your AI coding tool
- Clear buffered tasks
- Remove local configuration

## How It Works

### Hook Integration

Afterburn registers hooks with your AI coding tool to capture telemetry:

| Hook | Purpose |
|------|---------|
| `Stop` | Captures task telemetry when a session completes |
| `PostToolUse` | Reserved for future use |
| `Notification` | Reserved for future use |

**Claude Code hooks** are registered in:
- **Global scope:** `~/.claude/settings.json`
- **Project scope:** `.claude/settings.json` in your repo

The CLI **always merges** with existing settings—it never overwrites other tools' hooks.

### Data Captured

Each task record includes:

| Field | Description |
|-------|-------------|
| `developer_alias` | Your name |
| `project_slug` | Project identifier |
| `tool_source` | AI coding tool (e.g., `claude_code`) |
| `model_name` | e.g., `claude-sonnet-4-5` |
| `input_tokens` | Tokens sent to the model |
| `output_tokens` | Tokens generated |
| `cache_tokens` | Cached tokens used |
| `cost_usd` | Estimated cost |
| `files_changed` | Number of files edited |
| `tools_used` | List of tools invoked |
| `task_duration_sec` | Session duration |

**Privacy:** Afterburn captures metadata only. It never collects prompt text, AI responses, file contents, or diffs.

### Offline Support

When the API is unreachable, tasks are buffered locally at `~/.afterburn/buffer/`. The buffer:

- Holds up to 50 tasks
- Flushes automatically on next successful sync
- Preserves chronological order
- Can be manually flushed with `afterburn sync`

## Configuration

Configuration is stored at `~/.afterburn/config.json`:

```json
{
  "workspace_key": "ab-ws-...",
  "developer_alias": "Jane Smith",
  "provider": "claude_code",
  "hook_scope": "global",
  "default_project": "",
  "project_overrides": {
    "/path/to/repo": "custom-name",
    "/path/to/ignored": "__ignored__"
  }
}
```

| Field | Description |
|-------|-------------|
| `workspace_key` | Your API key |
| `developer_alias` | Name shown in dashboard |
| `provider` | AI coding tool (`claude_code`, `codex`) |
| `hook_scope` | `global` or `project` |
| `default_project` | Fallback project name |
| `project_overrides` | Per-directory project mappings |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AFTERBURN_API_URL` | API base URL | `https://afterburn.text2charts.com` |

For local development:

```bash
export AFTERBURN_API_URL="http://localhost:3003"
```

## Troubleshooting

### "Could not parse session log"

Claude Code's session log wasn't found or is empty. This can happen if:
- You haven't run any Claude Code tasks yet
- The session file path changed

Check that `~/.claude/projects/` contains session files.

### "Invalid workspace key"

Your API key may have been rotated. Get a new key from the dashboard and run:

```bash
afterburn init --force
```

### "Buffered: Network error"

The API is unreachable. Tasks are saved locally. Run `afterburn sync` when back online.

### Hooks not firing

Verify hooks are registered:

```bash
afterburn status
```

If hooks show as "not registered", re-run `afterburn init`.

### Check hook registration manually

```bash
# Global hooks
cat ~/.claude/settings.json

# Project hooks
cat .claude/settings.json
```

Look for `afterburn hook stop` in the `hooks.Stop` array.

## Uninstalling

```bash
# Remove hooks and config
afterburn logout

# Uninstall the package
npm uninstall -g afterburn
```

## Development

```bash
# Clone the repo
git clone https://github.com/yourorg/afterburn.git
cd afterburn

# Install dependencies
pnpm install

# Build the CLI
pnpm --filter cli build

# Run locally
node packages/cli/dist/index.js status

# Watch mode during development
pnpm --filter cli dev
```

### Testing hooks locally

```bash
# Dry run (parses session log but doesn't send)
node packages/cli/dist/index.js hook stop --dry-run
```

## License

MIT
