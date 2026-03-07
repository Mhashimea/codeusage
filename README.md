# Afterburn

> Post-session intelligence for AI-assisted coding. The documentation that vibe coding never produces.

Afterburn analyzes your AI coding sessions and generates comprehensive reports with:

- Session summaries with file changes and commit history
- Static analysis for AI-specific anti-patterns
- Hallucinated package detection via npm registry verification
- Risk findings with severity levels

## Installation

```bash
npm install -g afterburn
```

Requires Node.js 18.0.0 or higher.

## Usage

```bash
# Analyze current directory (last 4 hours by default)
afterburn ./

# Scope to recent changes
afterburn ./ --since "2 hours ago"
afterburn ./ --since "30m"

# Output to specific directory
afterburn ./ --output ./reports/

# CI mode (exits with error code on findings)
afterburn ./ --ci

# Disable colors for CI environments
afterburn ./ --no-color

# JSON output for machine processing
afterburn ./ --json
```

## Output

Afterburn generates a markdown report saved to `.afterburn/YYYY-MM-DD/session-HH-MM-SS.md`:

```
# Afterburn Session Report

_Generated: Mar 7, 2026, 08:31 PM | Project: my-app | Analysis: 4s_

---

## Session Summary

| Metric | Value |
|--------|-------|
| Files Changed | 6 |
| Lines Added | +313 |
| Lines Removed | -35 |
| Commits | 4 |
| Uncommitted Changes | Yes |

## Files Changed

| Category | File | Changes | Complexity |
|----------|------|---------|------------|
| New Feature | `src/auth/login.ts` | +120/-0 | |
| Bug Fix | `src/api/users.ts` | +15/-8 | |
| Refactor | `src/utils/helpers.ts` | +45/-30 | |

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

## Static Analysis Rules

Afterburn includes rules designed to catch common AI coding pitfalls:

| Rule | Description | Severity |
|------|-------------|----------|
| AB001 | Hardcoded credentials (API keys, passwords, tokens) | Error |
| AB002 | Generic error swallowing (empty catch blocks) | Warning |
| AB003 | Optimistic type assertions (`as any`, non-null `!`) | Info |
| AB006 | Hardcoded config values (localhost URLs, ports) | Warning |

## Hallucinated Package Detection

Afterburn verifies all imported packages against the npm registry:

- **Hallucinated**: Package not found on npm (may have been invented by AI)
- **Low Adoption**: Less than 100 weekly downloads
- **Unmaintained**: Not updated in over 12 months
- **Deprecated**: Marked as deprecated on npm

## CI Integration

Use Afterburn in your CI pipeline to catch issues before merging:

```yaml
# GitHub Actions example
- name: Run Afterburn
  run: npx afterburn ./ --ci --no-color
```

Exit codes:
- `0`: No errors found
- `1`: Errors detected (hallucinated packages or error-severity findings)
- `2`: Execution error (not a git repo, etc.)

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--since <timespec>` | Scope analysis to changes since timespec | `4h` |
| `--output <path>` | Output path for report | `./` |
| `--ci` | CI mode - exit with error code based on findings | `false` |
| `--no-color` | Disable colored output | `false` |
| `--json` | Output in JSON format | `false` |
| `--verbose` | Show verbose output | `false` |
| `--quiet` | Suppress all output except errors | `false` |

## Timespec Format

The `--since` flag supports various formats:

- `30m`, `2h`, `1d` - Relative time shorthand
- `"2 hours ago"`, `"30 minutes ago"` - Natural language
- `"1 day ago"`, `"3 days ago"` - Days
- ISO 8601 dates - Absolute timestamps

## Requirements

- Node.js >= 18.0.0
- Git repository (uncommitted changes and recent commits are analyzed)

## License

MIT
