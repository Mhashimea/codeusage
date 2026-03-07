# Afterburn

> Post-session intelligence for AI-assisted coding. The documentation that vibe coding never produces.

Afterburn analyzes your AI coding sessions and generates comprehensive reports with:

- **LLM-powered summaries** - Human-readable session analysis with changelogs
- Session summaries with file changes and commit history
- Static analysis for AI-specific anti-patterns (10 rules)
- Hallucinated package detection via npm/PyPI registry verification
- Multi-language support (TypeScript, JavaScript, Python)
- CI/CD integration with configurable exit codes

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

# Run with CI mode
afterburn --ci
```

## LLM-Powered Analysis

Generate human-readable summaries, changelogs, and architecture decision records using AI:

```bash
# Analyze with AI explanations
afterburn --explain

# Auto-confirm cost (for scripts/CI)
afterburn --explain --yes
```

### Supported Providers

| Provider | Models | API Key Env Var |
|----------|--------|-----------------|
| Anthropic | Claude Sonnet, Opus, Haiku | `ANTHROPIC_API_KEY` |
| OpenAI | GPT-4o, GPT-4o-mini | `OPENAI_API_KEY` |
| OpenRouter | Any model via OpenRouter | `OPENROUTER_API_KEY` |
| Ollama | Llama 3, Mistral, etc. | (none - local) |

### LLM Configuration

Add to your `.afterburnrc`:

```json
{
  "llm": {
    "provider": "openrouter",
    "model": "openai/gpt-4o-mini",
    "apiKey": "env:OPENROUTER_API_KEY"
  }
}
```

Or use environment variables directly:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
afterburn --explain
```

### What LLM Analysis Provides

- **Session Summary** - 2-3 paragraph overview of what was accomplished
- **Changelog** - Intent-based changelog grouped by purpose (Added/Changed/Fixed)
- **Architecture Decisions** - Identifies technology choices and trade-offs

### Cost Estimation

Before making LLM calls, Afterburn shows estimated cost and asks for confirmation:

```
📊 LLM Analysis Cost Estimate:
   Model: openai/gpt-4o-mini
   Input: ~2,500 tokens
   Output: ~1,500 tokens
   Estimated cost: <$0.01

Proceed with LLM analysis? (y/N)
```

Use `--yes` or `-y` to skip confirmation (auto-confirms in CI mode).

## Usage

```bash
# Analyze current directory
afterburn ./

# Scope to recent changes
afterburn ./ --since "2 hours ago"
afterburn ./ --since "30m"

# Output to specific directory
afterburn ./ --output ./reports/

# CI mode (exits with error code on findings)
afterburn ./ --ci

# Fail on warnings too
afterburn ./ --ci --fail-on-warnings

# Allow up to 3 errors before failing
afterburn ./ --ci --max-errors 3

# JSON output for machine processing
afterburn ./ --json

# Analyze only staged changes (for pre-commit hooks)
afterburn ./ --staged-only
```

## Configuration

Create a `.afterburnrc` file in your project root:

```bash
afterburn init
```

Example configuration:

```json
{
  "rules": {
    "AB001": "error",
    "AB004": "info",
    "AB008": "off"
  },
  "ignore": [
    "node_modules/**",
    "dist/**",
    "**/*.test.ts"
  ],
  "session": {
    "window": "4h",
    "outputDir": ".afterburn"
  },
  "output": {
    "format": "markdown",
    "includeAIProvider": true
  },
  "ci": {
    "failOnWarnings": false,
    "maxErrors": 0
  }
}
```

### Inline Disable Comments

Disable rules inline in your code:

```typescript
// afterburn-disable-next-line AB001
const apiKey = "sk-1234567890";

// afterburn-disable AB001, AB002
// ... code block ...
// afterburn-enable AB001, AB002
```

## Static Analysis Rules

| Rule | Description | Default |
|------|-------------|---------|
| AB001 | Hardcoded credentials (API keys, passwords, tokens, secrets) | Error |
| AB002 | Generic error swallowing (empty catch blocks) | Warning |
| AB003 | Optimistic type assertions (`as any`, non-null `!`) | Info |
| AB004 | Duplicate logic detection (repeated code blocks) | Info |
| AB005 | Missing null/undefined checks | Warning |
| AB006 | Hardcoded config values (localhost URLs, ports) | Warning |
| AB007 | Security anti-patterns (eval, SQL injection, XSS) | Error |
| AB008 | Over-abstraction (wrapper functions, single-impl interfaces) | Info |
| AB009 | Missing timeout configuration (fetch, DB queries) | Warning |
| AB010 | AI TODO/FIXME detection (incomplete implementations) | Info |

### Python-Specific Rules

For Python files, additional checks are performed:

- Bare `except:` clauses (should specify exception type)
- `pass` in except blocks (silent error swallowing)
- `eval()` / `exec()` usage (code injection risk)
- `pickle` with untrusted data
- SQL string formatting (injection risk)
- `subprocess` with `shell=True`

## Dependency Audit

### npm (JavaScript/TypeScript)

Afterburn verifies all imported packages against the npm registry:

- **Hallucinated**: Package not found on npm (may have been invented by AI)
- **Low Adoption**: Less than 100 weekly downloads
- **Unmaintained**: Not updated in over 12 months
- **Deprecated**: Marked as deprecated on npm

### PyPI (Python)

For Python projects, Afterburn parses:
- `requirements.txt`
- `pyproject.toml` (PEP 621 / Poetry)
- `setup.py`
- `Pipfile`

And verifies packages against the PyPI registry.

## CI Integration

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | No errors found |
| `1` | Errors detected (hallucinated packages or error-severity findings) |
| `2` | Execution error (not a git repo, config error, etc.) |

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

Add to `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/hashimea/afterburn
    rev: v0.1.0
    hooks:
      - id: afterburn
```

Or use a local hook:

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

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--explain` | Include LLM-powered analysis (requires API key) | `false` |
| `-y, --yes` | Auto-confirm LLM cost (skip confirmation) | `false` |
| `--since <timespec>` | Scope analysis to changes since timespec | `4h` |
| `--output <path>` | Output path for report | `./` |
| `--ci` | CI mode - exit with error code based on findings | `false` |
| `--fail-on-warnings` | Fail CI if warnings are found | `false` |
| `--max-errors <n>` | Maximum allowed errors before failing | `0` |
| `--staged-only` | Analyze only staged changes | `false` |
| `--json` | Output in JSON format | `false` |
| `--no-color` | Disable colored output | `false` |
| `--verbose` | Show verbose output | `false` |
| `--quiet` | Suppress all output except errors | `false` |

## Commands

| Command | Description |
|---------|-------------|
| `afterburn [path]` | Analyze a directory |
| `afterburn init` | Create `.afterburnrc` config file |
| `afterburn config list` | Show current configuration |
| `afterburn config get <key>` | Get a config value |
| `afterburn config set <key> <value>` | Set a config value |

## Timespec Format

The `--since` flag supports various formats:

- `30m`, `2h`, `1d` - Relative time shorthand
- `"2 hours ago"`, `"30 minutes ago"` - Natural language
- `"1 day ago"`, `"3 days ago"` - Days
- ISO 8601 dates - Absolute timestamps

## AI Provider Detection

Afterburn automatically detects when you're using AI coding assistants:

- **Claude Code** - Detects sessions via `~/.claude/projects/`
- **Cursor** - Detects via `.cursor/` directory
- **GitHub Copilot** - Detects via VS Code extensions
- **Windsurf** - Detects via Codeium integration

Session IDs are included in reports for traceability.

## Output

Reports are saved to `.afterburn/YYYY-MM-DD/session-HH-MM-SS.md`:

```
# Afterburn Session Report

_Generated: Mar 7, 2026 | Project: my-app | AI: Claude Code_

## Session Summary

| Metric | Value |
|--------|-------|
| Files Changed | 6 |
| Lines Added | +313 |
| Lines Removed | -35 |
| Commits | 4 |

## Risk Report

| Severity | Count |
|----------|-------|
| Errors | 0 |
| Warnings | 2 |
| Info | 5 |

## Dependency Audit

| Status | Count |
|--------|-------|
| Hallucinated | 0 |
| Warnings | 1 |
| Verified | 10 |
```

## Requirements

- Node.js >= 18.0.0
- Git repository

## License

MIT
