# Testing Guide

This document describes how to test the Afterburn CLI locally.

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Git installed and configured

## Running Tests

### Unit Tests

Run all unit tests:
```bash
npm test
```

Run tests once (without watch mode):
```bash
npm run test:run
```

### Test Coverage

The test suite includes:
- **Timespec Parsing** (21 tests): Tests for parsing relative time strings
- **Git Module** (21 tests): Tests for git integration functions

## Local Development Testing

### Build the Project

```bash
npm run build
```

### Test CLI Locally

After building, you can test the CLI in any git repository:

```bash
# From the afterburn project directory
node dist/cli.js /path/to/your/repo

# Or use npm start
npm start -- /path/to/your/repo
```

### Test Options

```bash
# Analyze current directory
node dist/cli.js ./

# Analyze with time scope
node dist/cli.js ./ --since="2 hours ago"

# JSON output
node dist/cli.js ./ --json

# Quiet mode (only errors)
node dist/cli.js ./ --quiet

# Verbose mode (includes error details)
node dist/cli.js ./ --verbose

# CI mode (exit code based on findings)
node dist/cli.js ./ --ci
```

### Test the analyze command explicitly

```bash
node dist/cli.js analyze ./
node dist/cli.js a ./  # shorthand alias
```

## Testing in Another Project

1. Build Afterburn:
   ```bash
   cd /path/to/afterburn
   npm run build
   ```

2. Navigate to your test project:
   ```bash
   cd /path/to/your-project
   ```

3. Run Afterburn:
   ```bash
   node /path/to/afterburn/dist/cli.js ./
   ```

4. Check the output:
   - Terminal shows session summary
   - Report saved to `.afterburn/YYYY-MM-DD/session-HH-MM-SS.md`

## Report Output

Reports are saved in the `.afterburn` folder with the following structure:
```
.afterburn/
└── 2024-01-15/
    ├── session-10-30-45.md
    ├── session-14-22-10.md
    └── session-18-05-33.md
```

Each report includes:
- Session summary (files changed, lines added/removed, commits)
- Recent commits table
- Files changed table with status icons
- Risk report (placeholder for Sprint 2)
- Dependency audit (placeholder for Sprint 3)

## Troubleshooting

### "Not a git repository" error
Ensure you're running Afterburn in a directory that contains a `.git` folder.

### No changes detected
By default, Afterburn looks at changes from the last 4 hours. Use `--since` to adjust:
```bash
node dist/cli.js ./ --since="24h"
node dist/cli.js ./ --since="7 days ago"
```

### TypeScript compilation errors
Run the linter to check for issues:
```bash
npm run lint
```
