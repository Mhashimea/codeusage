# Afterburn

> Post-session intelligence for AI-assisted coding. The documentation that vibe coding never produces.

Afterburn analyzes your AI coding sessions and generates comprehensive reports with:

- **Afterburn Studio** - Local dashboard to visualize all your sessions
- **LLM-powered summaries** - Human-readable session analysis with changelogs
- **Session summaries** - File changes, commits, author tracking
- **Static analysis** - 10 rules for AI-specific anti-patterns
- **Hallucinated package detection** - npm/PyPI registry verification
- **Multi-language support** - TypeScript, JavaScript, Python
- **CI/CD integration** - Configurable exit codes

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Afterburn Studio](#afterburn-studio)
- [Claude Code Integration](#claude-code-integration)
- [Commands](#commands)
- [Configuration](#configuration)
- [Static Analysis Rules](#static-analysis-rules)
- [LLM-Powered Analysis](#llm-powered-analysis)
- [Dependency Audit](#dependency-audit)
- [CI Integration](#ci-integration)

---

## Installation

```bash
npm install -g afterburn
```

Requires Node.js 18.0.0 or higher.

## Quick Start

```bash
# Analyze current directory (last 4 hours by default)
afterburn

# Initialize configuration
afterburn init

# Run with AI-powered explanations
afterburn --explain

# Launch the local dashboard
afterburn studio

# Run in CI mode
afterburn --ci
```

---

## Afterburn Studio

Afterburn Studio is a local dashboard to visualize all your AI coding sessions.

### Launch Studio

```bash
# Start Studio (default port 3333)
afterburn studio

# Specify a custom port
afterburn studio --port 8080

# Specify project directory
afterburn studio --path /path/to/project
```

### Features

- **Session Browser** - View all sessions grouped by date
- **AI Summary** - LLM-generated overview displayed prominently
- **Health Score** - Visual indicator of code quality (0-100)
- **Session Comparison** - Compare two sessions side-by-side
- **Reports Dashboard** - Aggregate analytics with charts
- **Hotspots** - Files/directories with most issues
- **Author & Project Tracking** - Multi-user and multi-project support

### Session Details

Each session displays:
- AI Summary (if `--explain` was used)
- Health Score calculation
- Files changed with line counts
- Issues (errors, warnings, info)
- Dependencies (verified vs hallucinated)
- Full rendered markdown report

### Multi-User Support

Each session automatically captures:
- **Author** - System username (macOS/Windows/Linux)
- **Project** - Repository/folder name

This is useful when multiple developers share a Claude Code license across projects.

---

## Claude Code Integration

Afterburn works seamlessly with Claude Code via hooks.

### Setup Automatic Analysis

Add to your `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "afterburn ./ --explain -y"
          }
        ]
      }
    ]
  }
}
```

This automatically runs Afterburn with AI explanations after each Claude Code session.

### LLM Configuration

For the `--explain` flag to work, add to your project's `.afterburnrc`:

```json
{
  "llm": {
    "provider": "openrouter",
    "model": "openai/gpt-4o-mini",
    "apiKey": "env:OPENROUTER_API_KEY"
  }
}
```

Then add `OPENROUTER_API_KEY` to your `.env` file:

```
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

Afterburn automatically loads `.env` from the project directory.

---

## Commands

### `afterburn [path]`

Analyze a directory for AI coding session changes.

```bash
# Analyze current directory
afterburn ./

# Analyze with AI explanations
afterburn ./ --explain

# Scope to recent changes
afterburn ./ --since "2 hours ago"
afterburn ./ --since "30m"

# Output to specific directory
afterburn ./ --output ./reports/

# JSON output
afterburn ./ --json

# CI mode
afterburn ./ --ci --fail-on-warnings
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--explain` | Include LLM-powered analysis | `false` |
| `-y, --yes` | Auto-confirm LLM cost | `false` |
| `--since <timespec>` | Scope to changes since timespec | `4h` |
| `--output <path>` | Output path for report | `./` |
| `--ci` | CI mode with exit codes | `false` |
| `--fail-on-warnings` | Fail CI on warnings | `false` |
| `--max-errors <n>` | Max allowed errors | `0` |
| `--staged-only` | Analyze only staged changes | `false` |
| `--json` | JSON output format | `false` |
| `--verbose` | Show verbose output | `false` |
| `--quiet` | Suppress output | `false` |
| `--no-color` | Disable colors | `false` |

### `afterburn init`

Create a `.afterburnrc` configuration file.

```bash
afterburn init
```

### `afterburn studio`

Launch the local dashboard.

```bash
afterburn studio
afterburn studio --port 8080
afterburn studio --path /path/to/project
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--port <n>` | Port to run Studio on | `3333` |
| `--path <dir>` | Project directory | `./` |

### `afterburn watch`

Watch for file changes and re-run analysis.

```bash
afterburn watch
afterburn watch --since "1h"
```

### `afterburn config`

Manage configuration.

```bash
# Show all config
afterburn config list

# Get a value
afterburn config get rules.AB001

# Set a value
afterburn config set session.window "2h"

# Set LLM provider
afterburn config set-llm
```

### `afterburn hook`

Manage git hooks.

```bash
# Install pre-commit hook
afterburn hook install

# Remove pre-commit hook
afterburn hook uninstall
```

---

## Configuration

Create `.afterburnrc` in your project root:

```bash
afterburn init
```

### Full Configuration

```json
{
  "rules": {
    "AB001": "error",
    "AB002": "warn",
    "AB003": "info",
    "AB004": "info",
    "AB005": "warn",
    "AB006": "warn",
    "AB007": "error",
    "AB008": "off",
    "AB009": "warn",
    "AB010": "info"
  },
  "ignore": [
    "node_modules/**",
    "dist/**",
    "build/**",
    "coverage/**",
    ".git/**",
    "*.min.js",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml"
  ],
  "session": {
    "window": "4h",
    "outputDir": ".afterburn"
  },
  "output": {
    "format": "markdown",
    "includeAIProvider": true
  },
  "llm": {
    "provider": "openrouter",
    "model": "openai/gpt-4o-mini",
    "apiKey": "env:OPENROUTER_API_KEY"
  },
  "ci": {
    "failOnWarnings": false,
    "maxErrors": 0,
    "maxWarnings": 0
  }
}
```

### Config File Names

Afterburn looks for these files (in order):
1. `.afterburnrc`
2. `.afterburnrc.json`
3. `afterburn.config.json`
4. `afterburn.config.js`
5. `afterburn.config.mjs`

### Inline Disable Comments

Disable rules inline in your code:

```typescript
// afterburn-disable-next-line AB001
const apiKey = "sk-1234567890";

// afterburn-disable AB001, AB002
// ... code block ...
// afterburn-enable AB001, AB002

// afterburn-disable-file AB003
```

---

## Static Analysis Rules

### Rule Reference

| Rule | Name | Description | Default |
|------|------|-------------|---------|
| AB001 | Hardcoded Credentials | API keys, passwords, tokens, secrets | Error |
| AB002 | Error Swallowing | Empty catch blocks, ignored errors | Warning |
| AB003 | Type Assertions | `as any`, non-null `!`, unsafe casts | Info |
| AB004 | Duplicate Logic | Repeated code blocks | Info |
| AB005 | Null Checks | Missing null/undefined checks | Warning |
| AB006 | Hardcoded Config | Localhost URLs, ports, hardcoded values | Warning |
| AB007 | Security | eval(), SQL injection, XSS vulnerabilities | Error |
| AB008 | Over-Abstraction | Unnecessary wrappers, single-impl interfaces | Info |
| AB009 | Timeouts | Missing timeout on fetch, DB queries | Warning |
| AB010 | AI TODOs | Incomplete implementations, TODO/FIXME | Info |

### AB001: Hardcoded Credentials

Detects:
- AWS keys (`AKIA...`)
- Google API keys (`AIza...`)
- Stripe keys (`sk_live_...`, `pk_live_...`)
- GitHub tokens (`ghp_...`, `gho_...`)
- JWT tokens
- Database connection strings
- Private keys and certificates

### AB007: Security

Detects:
- `eval()` and `new Function()`
- SQL string concatenation
- XSS vulnerabilities (innerHTML with variables)
- Prototype pollution
- Path traversal
- CORS `*` wildcards
- Hardcoded CORS origins

### Python-Specific Rules

For Python files:
- Bare `except:` clauses
- `pass` in except blocks
- `eval()` / `exec()` usage
- `pickle` with untrusted data
- SQL string formatting
- `subprocess` with `shell=True`

### Custom Rules

Define custom rules in `.afterburnrc`:

```json
{
  "customRules": [
    {
      "id": "CUSTOM-001",
      "name": "Console Log",
      "description": "Detect console.log statements",
      "severity": "warn",
      "pattern": "console\\.log\\(",
      "flags": "g",
      "message": "Remove console.log before committing",
      "suggestion": "Use a proper logger instead",
      "appliesTo": [".ts", ".js", ".tsx", ".jsx"]
    }
  ]
}
```

---

## LLM-Powered Analysis

Generate AI summaries, changelogs, and architecture decisions.

### Supported Providers

| Provider | Models | API Key Env Var |
|----------|--------|-----------------|
| Anthropic | Claude Sonnet, Opus, Haiku | `ANTHROPIC_API_KEY` |
| OpenAI | GPT-4o, GPT-4o-mini | `OPENAI_API_KEY` |
| OpenRouter | Any model | `OPENROUTER_API_KEY` |
| Ollama | Llama 3, Mistral, etc. | (none - local) |

### Usage

```bash
# Analyze with AI explanations
afterburn --explain

# Auto-confirm cost (for CI/scripts)
afterburn --explain --yes
```

### LLM Output Includes

1. **Session Summary** - 2-3 paragraph overview
2. **Changelog** - Grouped by purpose (Added/Changed/Fixed)
3. **Architecture Decisions** - Technology choices and trade-offs

### Cost Estimation

Before making LLM calls, Afterburn shows:

```
📊 LLM Analysis Cost Estimate:
   Model: openai/gpt-4o-mini
   Input: ~2,500 tokens
   Output: ~1,500 tokens
   Estimated cost: <$0.01

Proceed with LLM analysis? (y/N)
```

---

## Dependency Audit

### npm (JavaScript/TypeScript)

Verifies all imported packages against npm registry:

| Status | Meaning |
|--------|---------|
| **Hallucinated** | Package not found on npm |
| **Low Adoption** | < 100 weekly downloads |
| **Unmaintained** | No updates in 12+ months |
| **Deprecated** | Marked deprecated on npm |
| **Verified** | Package exists and is healthy |

### PyPI (Python)

Parses and verifies packages from:
- `requirements.txt`
- `pyproject.toml`
- `setup.py`
- `Pipfile`

---

## CI Integration

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | No errors found |
| `1` | Errors detected |
| `2` | Execution error |

### GitHub Actions

```yaml
name: Afterburn Analysis
on: [pull_request]

jobs:
  afterburn:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install -g afterburn

      - run: afterburn --ci --json > report.json

      - uses: actions/upload-artifact@v4
        with:
          name: afterburn-report
          path: report.json
```

### Pre-commit Hook

```yaml
repos:
  - repo: local
    hooks:
      - id: afterburn
        name: Afterburn Analysis
        entry: afterburn --ci --staged-only
        language: node
        pass_filenames: false
        always_run: true
```

---

## Output

Reports are saved to `.afterburn/YYYY-MM-DD/session-HH-MM-SS.md`:

```markdown
# Afterburn Session Report

_Generated: Mar 8, 2026, 02:36 PM | Author: hashimea | Project: workly | Analysis: 11s_

---

## Session Summary

| Metric | Value |
|--------|-------|
| Files Changed | 22 |
| Lines Added | +1858 |
| Lines Removed | -319 |
| Commits | 0 |

## AI Summary

1. **Summary**: In this coding session, various updates were made...
2. **Key Changes**: ...
3. **Purpose**: ...

## Risk Report

| Severity | Count |
|----------|-------|
| Errors | 0 |
| Warnings | 2 |
| Info | 5 |

## Dependency Audit

| Status | Package |
|--------|---------|
| ✅ Verified | express |
| ❌ Hallucinated | fake-package |
```

---

## Timespec Format

The `--since` flag supports:

- `30m`, `2h`, `1d` - Shorthand
- `"2 hours ago"` - Natural language
- `"1 day ago"` - Days
- ISO 8601 - Absolute timestamps

---

## AI Provider Detection

Afterburn detects AI coding assistants:

- **Claude Code** - Via `~/.claude/projects/`
- **Cursor** - Via `.cursor/` directory
- **GitHub Copilot** - Via VS Code extensions
- **Windsurf** - Via Codeium integration

---

## Requirements

- Node.js >= 18.0.0
- Git repository

---

## License

MIT

---

## Contributing

Contributions welcome! Please read our contributing guidelines.

## Support

- GitHub Issues: https://github.com/hashimea/afterburn/issues
- Documentation: https://github.com/hashimea/afterburn#readme
