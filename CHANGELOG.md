# Changelog

All notable changes to Afterburn will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-07

### Added

- **LLM-Powered Analysis** - Generate human-readable summaries with `--explain` flag
  - Session summaries with key changes and purpose
  - Intent-based changelogs grouped by Added/Changed/Fixed
  - Architecture Decision Records (ADR) for tech choices
- **Multi-Provider LLM Support**
  - Anthropic Claude (Sonnet, Opus, Haiku)
  - OpenAI (GPT-4o, GPT-4o-mini)
  - OpenRouter (access any model)
  - Ollama (local LLM, free)
- **Cost Estimation** - Shows estimated token usage and cost before LLM calls
- **Auto-confirm Flag** - `-y/--yes` to skip cost confirmation prompts
- **OpenRouter Provider** - Access multiple LLM providers through single API

### Changed

- Improved error messages for LLM configuration issues
- Better handling of large diffs with token truncation

## [0.1.0] - 2026-03-07

### Added

- **Core Analysis Engine**
  - Git integration for session detection
  - File change tracking with diff analysis
  - Commit history extraction
- **Static Analysis Rules (10 rules)**
  - AB001: Hardcoded credentials detection
  - AB002: Empty catch blocks / error swallowing
  - AB003: Optimistic type assertions (`as any`, `!`)
  - AB004: Duplicate logic detection
  - AB005: Missing null/undefined checks
  - AB006: Hardcoded config values (URLs, ports)
  - AB007: Security anti-patterns (eval, SQL injection)
  - AB008: Over-abstraction detection
  - AB009: Missing timeout configuration
  - AB010: AI TODO/FIXME detection
- **Dependency Audit**
  - npm registry verification
  - PyPI registry verification
  - Hallucinated package detection
  - Low adoption warnings (<100 weekly downloads)
  - Unmaintained package warnings (>12 months)
- **Configuration System**
  - `.afterburnrc` JSON configuration
  - Per-rule severity overrides
  - Ignore patterns (glob)
  - Inline disable comments
- **CLI Commands**
  - `afterburn [path]` - Analyze directory
  - `afterburn init` - Create config file
  - `afterburn config` - Manage configuration
- **CI/CD Integration**
  - `--ci` mode with exit codes
  - `--fail-on-warnings` option
  - `--max-errors` threshold
  - `--staged-only` for pre-commit hooks
  - `--json` output format
- **Multi-Language Support**
  - TypeScript, JavaScript, JSX, TSX
  - Python with AST parsing
- **AI Provider Detection**
  - Claude Code session detection
  - Cursor detection
  - GitHub Copilot detection
  - Windsurf detection
- **Report Generation**
  - Markdown reports with session summaries
  - Risk reports with severity levels
  - Dependency audit results
- **Pre-commit Hooks**
  - `.pre-commit-hooks.yaml` for pre-commit framework
  - GitHub Actions example workflow

## [0.1.0-beta] - 2026-03-06

### Added

- Initial beta release
- Core analysis functionality
- Basic rule engine

---

[0.2.0]: https://github.com/Mhashimea/afterburn/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Mhashimea/afterburn/compare/v0.1.0-beta...v0.1.0
[0.1.0-beta]: https://github.com/Mhashimea/afterburn/releases/tag/v0.1.0-beta
