# Codeusage CLI

Track your team's AI coding tool usage with zero friction. Get visibility into how Claude Code and other AI tools are used across your organization.

## Requirements

- Node.js 18+
- Claude Code or Codex CLI installed

## Installation

```bash
bun add -g codeusage-cli
```

Or with npm:

```bash
npm install -g codeusage-cli
```

## Quick Start

1. **Sign up** at [codeusage.dev](https://codeusage.dev) to get your workspace API key

2. **Initialize** the CLI:

```bash
codeusage init
```

3. **Done!** Usage is now tracked automatically when you use Claude Code.

## Commands

### `codeusage init`

Interactive setup wizard. Configures your API key, developer alias, and installs hooks.

```bash
codeusage init
```

### `codeusage status`

Check your current configuration and connection status.

```bash
codeusage status
```

### `codeusage project`

Manage project mappings for the current directory.

```bash
# Set a custom project name for current directory
codeusage project set my-project

# List all project mappings
codeusage project list

# Ignore current directory (no tracking)
codeusage project ignore

# Re-enable tracking for current directory
codeusage project unignore
```

### `codeusage sync`

Manually sync the last task (useful for testing).

```bash
codeusage sync
```

### `codeusage config`

View or update configuration values.

```bash
# View all config
codeusage config

# View specific value
codeusage config get developer_alias

# Set a value
codeusage config set developer_alias "john"
```

### `codeusage logout`

Remove all local configuration and uninstall hooks.

```bash
codeusage logout
```

## Uninstall

```bash
bun remove -g codeusage-cli
```

Or with npm:

```bash
npm uninstall -g codeusage-cli
```

## Documentation

For full documentation, visit [codeusage.dev/docs](https://codeusage.dev/docs)

## License

MIT
