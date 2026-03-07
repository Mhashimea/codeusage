# Phase 2: Rule Engine & Configuration

**Duration:** Sprints 5-8
**Goal:** Complete rule catalog, configurable analysis, multi-language support, CI integration.

---

## Sprint 5: Remaining Static Analysis Rules

### 5.1 Rule AB004: Duplicate Logic Detection
- [ ] **5.1.1** Implement function body extraction from changed files
- [ ] **5.1.2** Implement AST-based similarity comparison (normalize variable names)
- [ ] **5.1.3** Calculate similarity score (0-100%) between function pairs
- [ ] **5.1.4** Flag functions with >80% similarity across different files
- [ ] **5.1.5** Group duplicates by cluster (A similar to B, B similar to C)
- [ ] **5.1.6** Exclude intentional duplicates: test fixtures, generated code
- [ ] **5.1.7** Add "consider extracting to shared utility" suggestion
- [ ] **5.1.8** Write test suite with 10+ duplicate scenarios

### 5.2 Rule AB005: Missing Null/Undefined Checks
- [ ] **5.2.1** Detect function parameters used without nullish checks
- [ ] **5.2.2** Detect object property access without optional chaining
- [ ] **5.2.3** Detect array access without bounds checking
- [ ] **5.2.4** Detect return values used without existence check
- [ ] **5.2.5** Respect TypeScript strict null checks (reduce severity if enabled)
- [ ] **5.2.6** Exclude parameters with non-nullable types in TS
- [ ] **5.2.7** Write test suite with 15+ test cases

### 5.3 Rule AB007: Security Anti-Patterns
- [ ] **5.3.1** Detect MD5/SHA1 usage for password hashing
- [ ] **5.3.2** Detect SQL string concatenation (SQL injection risk)
- [ ] **5.3.3** Detect `eval()`, `Function()`, `new Function()` usage
- [ ] **5.3.4** Detect `innerHTML` assignment without sanitization
- [ ] **5.3.5** Detect missing CSRF protection patterns
- [ ] **5.3.6** Detect JWT without expiration
- [ ] **5.3.7** Detect hardcoded CORS `*` origins
- [ ] **5.3.8** Detect disabled SSL verification
- [ ] **5.3.9** Write test suite with 20+ security scenarios

### 5.4 Rule AB008: Over-Abstraction Detection
- [ ] **5.4.1** Detect wrapper functions that just call another function
- [ ] **5.4.2** Detect interfaces with only one implementation
- [ ] **5.4.3** Detect classes with only static methods (should be module)
- [ ] **5.4.4** Detect factory functions that always return same type
- [ ] **5.4.5** Detect excessive inheritance depth (>3 levels)
- [ ] **5.4.6** Default to 'info' severity (these are style suggestions)
- [ ] **5.4.7** Write test suite with 10+ test cases

### 5.5 Rule AB009: Missing Timeout Configuration
- [ ] **5.5.1** Detect `fetch()` calls without AbortController/timeout
- [ ] **5.5.2** Detect `axios` calls without timeout config
- [ ] **5.5.3** Detect database queries without limit/timeout
- [ ] **5.5.4** Detect `setTimeout`/`setInterval` without cleanup
- [ ] **5.5.5** Detect WebSocket connections without heartbeat
- [ ] **5.5.6** Suggest specific timeout values in finding message
- [ ] **5.5.7** Write test suite with 10+ test cases

### 5.6 Rule AB010: AI TODO/FIXME Detection
- [ ] **5.6.1** Detect TODO comments in changed code
- [ ] **5.6.2** Detect FIXME comments in changed code
- [ ] **5.6.3** Detect "implement this", "add logic here" placeholder comments
- [ ] **5.6.4** Detect `throw new Error("Not implemented")` patterns
- [ ] **5.6.5** Detect `// ...` continuation markers left by AI
- [ ] **5.6.6** Detect `pass` statements in Python
- [ ] **5.6.7** Count and highlight as incomplete implementation warning
- [ ] **5.6.8** Write test suite with 10+ test cases

### 5.7 Local Build & Test
- [ ] **5.7.1** Run `npm run build` — verify TypeScript compiles without errors
- [ ] **5.7.2** Run `npm run test` — verify all unit tests pass (including new rules)
- [ ] **5.7.3** Run `npm link` — update local global installation
- [ ] **5.7.4** Test all 10 rules on afterburn project itself
- [ ] **5.7.5** Test on a personal project — verify new rules detect real issues
- [ ] **5.7.6** Test security rules (AB007) on intentionally vulnerable code samples
- [ ] **5.7.7** Verify no regression in existing rules

**Sprint 5 Deliverable:** All 10 rules implemented and tested.

---

## Sprint 6: Configuration System

### 6.1 Configuration File Support
- [ ] **6.1.1** Implement `.afterburnrc` JSON file loading
- [ ] **6.1.2** Implement `.afterburnrc.json` alternative filename
- [ ] **6.1.3** Implement `afterburn.config.js` JavaScript config support
- [ ] **6.1.4** Implement config file discovery (walk up directory tree)
- [ ] **6.1.5** Merge file config with CLI flags (CLI takes precedence)
- [ ] **6.1.6** Validate config schema and report errors clearly

### 6.2 Rule Configuration
- [ ] **6.2.1** Allow per-rule severity override: `"AB001": "error"` | `"warn"` | `"info"` | `"off"`
- [ ] **6.2.2** Allow rule-specific options (e.g., AB004 similarity threshold)
- [ ] **6.2.3** Implement `ignore` patterns for files/directories
- [ ] **6.2.4** Implement `include` patterns for limiting scope
- [ ] **6.2.5** Support glob patterns in ignore/include
- [ ] **6.2.6** Add inline disable comments: `// afterburn-disable-next-line AB001`
- [ ] **6.2.7** Add file-level disable: `// afterburn-disable AB001, AB002`

### 6.3 Session Configuration
- [ ] **6.3.1** Configure default session window (`sessionWindow: "4h"`)
- [ ] **6.3.2** Configure language detection mode (`language: "auto" | "typescript" | ...`)
- [ ] **6.3.3** Configure output format (`format: "markdown" | "json"`)
- [ ] **6.3.4** Configure output path (`output: "./docs/"`)

### 6.4 LLM Configuration (Preparation)
- [ ] **6.4.1** Define LLM config structure in schema
- [ ] **6.4.2** Support `env:VARIABLE_NAME` syntax for API keys
- [ ] **6.4.3** Support multiple provider configurations
- [ ] **6.4.4** Validate provider/model combinations

### 6.5 Init Command
- [ ] **6.5.1** Implement `afterburn init` command
- [ ] **6.5.2** Generate `.afterburnrc` with sensible defaults
- [ ] **6.5.3** Interactive mode: ask about language, strictness level
- [ ] **6.5.4** Detect project type (package.json → Node, requirements.txt → Python)
- [ ] **6.5.5** Add .afterburn.md to .gitignore suggestion

### 6.6 Config Command
- [ ] **6.6.1** Implement `afterburn config set <key> <value>`
- [ ] **6.6.2** Implement `afterburn config get <key>`
- [ ] **6.6.3** Implement `afterburn config list`
- [ ] **6.6.4** Support dot notation: `afterburn config set rules.AB001 off`
- [ ] **6.6.5** Validate values before writing

### 6.7 Local Build & Test
- [ ] **6.7.1** Run `npm run build` — verify TypeScript compiles without errors
- [ ] **6.7.2** Run `npm run test` — verify all unit tests pass
- [ ] **6.7.3** Run `npm link` — update local global installation
- [ ] **6.7.4** Test `afterburn init` — verify config file generation
- [ ] **6.7.5** Test `afterburn config set` and `afterburn config get`
- [ ] **6.7.6** Test with custom `.afterburnrc` — verify rules respect config
- [ ] **6.7.7** Test ignore patterns — verify excluded files are skipped
- [ ] **6.7.8** Test inline disable comments in real code

**Sprint 6 Deliverable:** Full configuration system with init command.

---

## Sprint 7: Multi-Language Support (Tree-sitter)

### 7.1 Tree-sitter Integration
- [ ] **7.1.1** Install tree-sitter and language bindings (TypeScript, JavaScript, Python)
- [ ] **7.1.2** Implement `parseFile(content, language)` → AST
- [ ] **7.1.3** Implement language detection from file extension
- [ ] **7.1.4** Handle parse errors gracefully (fall back to regex-based rules)
- [ ] **7.1.5** Cache parsed ASTs within single analysis run

### 7.2 AST-Based Rule Improvements
- [ ] **7.2.1** Refactor AB001 (credentials) to use AST for string literal detection
- [ ] **7.2.2** Refactor AB002 (error swallowing) to use AST for try-catch detection
- [ ] **7.2.3** Refactor AB003 (type assertions) to use AST for TypeScript nodes
- [ ] **7.2.4** Refactor AB004 (duplicates) to use AST for function comparison
- [ ] **7.2.5** Improve accuracy and reduce false positives

### 7.3 Python Support
- [ ] **7.3.1** Implement Python-specific rule variants
- [ ] **7.3.2** Parse `requirements.txt` for dependencies
- [ ] **7.3.3** Parse `pyproject.toml` for dependencies
- [ ] **7.3.4** Parse `setup.py` for dependencies
- [ ] **7.3.5** Integrate PyPI registry API for package verification
- [ ] **7.3.6** Detect Python-specific anti-patterns:
  - `except:` bare exception
  - `pass` in except block
  - `eval()` / `exec()` usage
  - `pickle` with untrusted data

### 7.4 JavaScript/TypeScript Parity
- [ ] **7.4.1** Ensure all rules work on `.js`, `.jsx`, `.ts`, `.tsx`
- [ ] **7.4.2** Handle JSX/TSX syntax in AST parsing
- [ ] **7.4.3** Support CommonJS and ES modules equally
- [ ] **7.4.4** Handle TypeScript decorators

### 7.5 Local Build & Test
- [ ] **7.5.1** Run `npm run build` — verify TypeScript compiles without errors
- [ ] **7.5.2** Run `npm run test` — verify all unit tests pass
- [ ] **7.5.3** Run `npm link` — update local global installation
- [ ] **7.5.4** Test on TypeScript project — verify AST-based rules work
- [ ] **7.5.5** Test on JavaScript project — verify JS parsing works
- [ ] **7.5.6** Test on Python project — verify Python rules and PyPI integration
- [ ] **7.5.7** Compare rule accuracy: regex vs AST (fewer false positives)
- [ ] **7.5.8** Test mixed-language project (JS + Python)

**Sprint 7 Deliverable:** Tree-sitter-based parsing for TS/JS/Python with improved rule accuracy.

---

## Sprint 8: CI/CD Integration & v0.1.0 Stable

### 8.1 CI Mode Implementation
- [ ] **8.1.1** Implement `--ci` flag behavior
- [ ] **8.1.2** Exit code 0: no errors (warnings allowed)
- [ ] **8.1.3** Exit code 1: one or more errors found
- [ ] **8.1.4** Exit code 2: analysis failed (git error, config error)
- [ ] **8.1.5** Implement `--fail-on-warnings` flag
- [ ] **8.1.6** Implement `--max-errors <n>` threshold
- [ ] **8.1.7** Suppress spinner and colors in CI mode (detect CI environment)

### 8.2 JSON Output
- [ ] **8.2.1** Implement `--json` flag
- [ ] **8.2.2** Output complete analysis result as JSON to stdout
- [ ] **8.2.3** Include all findings with file, line, column, message
- [ ] **8.2.4** Include dependency audit results
- [ ] **8.2.5** Include session statistics
- [ ] **8.2.6** Include metadata: version, timestamp, config used
- [ ] **8.2.7** Ensure JSON is valid and parseable by common tools

### 8.3 GitHub Actions Example
- [ ] **8.3.1** Create example workflow file for GitHub Actions
- [ ] **8.3.2** Document usage in README
- [ ] **8.3.3** Show how to fail PR on errors
- [ ] **8.3.4** Show how to post comment with results (future)

### 8.4 Pre-commit Hook Support
- [ ] **8.4.1** Create `.pre-commit-hooks.yaml` for pre-commit framework
- [ ] **8.4.2** Document standalone pre-commit hook setup
- [ ] **8.4.3** Implement `--staged-only` flag (analyze only staged changes)

### 8.5 Local Build & Test
- [ ] **8.5.1** Run `npm run build` — verify TypeScript compiles without errors
- [ ] **8.5.2** Run `npm run test` — verify all unit tests pass
- [ ] **8.5.3** Run `npm link` — update local global installation
- [ ] **8.5.4** Test `--ci` flag — verify exit codes work correctly
- [ ] **8.5.5** Test `--json` flag — verify JSON output is valid
- [ ] **8.5.6** Test in actual CI environment (GitHub Actions on a test repo)
- [ ] **8.5.7** Test pre-commit hook integration
- [ ] **8.5.8** Full regression test on 3+ real projects

### 8.6 Release Preparation
- [ ] **8.6.1** Update version to 0.1.0 (remove beta)
- [ ] **8.6.2** Update README with full feature documentation
- [ ] **8.6.3** Add CHANGELOG.md
- [ ] **8.6.4** Add CONTRIBUTING.md
- [ ] **8.6.5** Run full test suite
- [ ] **8.6.6** Test on 5+ real-world repositories
- [ ] **8.6.7** Publish to npm as `afterburn@0.1.0`
- [ ] **8.6.8** Create GitHub release with release notes
- [ ] **8.6.9** Announce on social media / dev communities

**Sprint 8 Deliverable:** v0.1.0 stable released with CI support and full documentation.

---

## Phase 2 Completion Checklist

- [ ] All 10 rules (AB001-AB010) implemented and tested
- [ ] .afterburnrc configuration file fully functional
- [ ] `afterburn init` and `afterburn config` commands working
- [ ] Tree-sitter AST parsing for TypeScript/JavaScript/Python
- [ ] PyPI registry integration for Python packages
- [ ] CI mode with exit codes
- [ ] JSON output format
- [ ] Pre-commit hook support
- [ ] GitHub Actions example
- [ ] v0.1.0 published to npm
- [ ] Full documentation in README

---

## Technical Debt to Track

- [ ] Rule performance optimization (large files)
- [ ] Incremental analysis (cache previous results)
- [ ] More languages (Go, Rust, Java)
- [ ] Rule auto-fix suggestions
- [ ] IDE extension groundwork
