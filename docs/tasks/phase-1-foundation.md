# Phase 1: Foundation

**Duration:** Sprints 1-4
**Goal:** Working CLI that generates a basic report from git diffs with core static analysis rules.

---

## Sprint 1: Git Integration & CLI Core

### 1.1 Git Diff Parser
- [ ] **1.1.1** Install and configure `simple-git` package
- [ ] **1.1.2** Implement `getUncommittedChanges()` — returns all staged and unstaged changes
- [ ] **1.1.3** Implement `getRecentCommits(since: string)` — returns commits within time window
- [ ] **1.1.4** Implement `parseFileDiff(diff: string)` — extracts additions, deletions, file status
- [ ] **1.1.5** Implement `getFileContent(path: string, ref?: string)` — reads file at HEAD or working tree
- [ ] **1.1.6** Handle edge cases: new repo (no commits), binary files, renamed files, deleted files
- [ ] **1.1.7** Add unit tests for git module (mock simple-git)
- [ ] **1.1.8** Test with real repositories of varying sizes (small, medium, large)

### 1.2 CLI Framework
- [ ] **1.2.1** Implement `afterburn <path>` default command — runs full analysis
- [ ] **1.2.2** Implement `--since <timespec>` flag — parses relative time (e.g., "2 hours ago", "4h")
- [ ] **1.2.3** Implement `--output <path>` flag — sets output directory for report
- [ ] **1.2.4** Add `ora` spinner for progress indication during analysis
- [ ] **1.2.5** Add `chalk` colored output for terminal results
- [ ] **1.2.6** Implement graceful error handling with user-friendly messages
- [ ] **1.2.7** Add `--verbose` flag for debug output
- [ ] **1.2.8** Add `--quiet` flag for minimal output (errors only)

### 1.3 Session Detection
- [ ] **1.3.1** Implement time-based session boundary detection (default 4h window)
- [ ] **1.3.2** Parse `--since` timespec into Date object (support: "Xh", "X hours ago", "X days ago", ISO date)
- [ ] **1.3.3** Group commits and uncommitted changes into single session object
- [ ] **1.3.4** Calculate session duration from first to last change

### 1.4 Local Build & Test
- [ ] **1.4.1** Run `npm run build` — verify TypeScript compiles without errors
- [ ] **1.4.2** Run `npm link` — install CLI globally from local source
- [ ] **1.4.3** Test `afterburn --help` — verify CLI is accessible
- [ ] **1.4.4** Test `afterburn ./` in a real project — verify git parsing works
- [ ] **1.4.5** Fix any issues discovered during local testing
- [ ] **1.4.6** Document any manual testing steps for future sprints

**Sprint 1 Deliverable:** CLI that reads git history and uncommitted changes, outputs raw session data to terminal.

---

## Sprint 2: Core Static Analysis Rules

### 2.1 Rule Engine Architecture
- [ ] **2.1.1** Define `Rule` interface: `{ id, name, description, severity, check(content, filePath) }`
- [ ] **2.1.2** Implement `RuleRunner` class — loads rules, executes against file content
- [ ] **2.1.3** Implement finding aggregation — collect all findings, sort by severity
- [ ] **2.1.4** Add severity levels: error (blocks CI), warn (highlighted), info (informational)
- [ ] **2.1.5** Implement file filtering — skip files matching ignore patterns

### 2.2 Rule AB001: Hardcoded Credentials
- [ ] **2.2.1** Detect API key patterns: `sk-`, `pk_live_`, `ghp_`, `gho_`, `AKIA`, etc.
- [ ] **2.2.2** Detect password assignments: `password = "..."`, `pwd`, `secret`, `token`
- [ ] **2.2.3** Detect connection strings: `mongodb://`, `postgres://`, `mysql://` with credentials
- [ ] **2.2.4** Detect AWS patterns: access key ID, secret access key formats
- [ ] **2.2.5** Exclude false positives: test files, example configs, environment variable references
- [ ] **2.2.6** Add line number and code snippet to findings
- [ ] **2.2.7** Write test suite with 20+ positive and negative test cases

### 2.3 Rule AB002: Generic Error Swallowing
- [ ] **2.3.1** Detect empty catch blocks: `catch (e) {}`
- [ ] **2.3.2** Detect console-only catch: `catch (e) { console.log(e) }`
- [ ] **2.3.3** Detect ignored error parameter: `catch (_)`, `catch (ignored)`
- [ ] **2.3.4** Detect Promise without catch: `.then()` without `.catch()`
- [ ] **2.3.5** Allow legitimate patterns: intentional swallowing with comment
- [ ] **2.3.6** Write test suite with 15+ test cases

### 2.4 Rule AB003: Optimistic Type Assertions
- [ ] **2.4.1** Detect `as any` type assertions
- [ ] **2.4.2** Detect non-null assertions: `foo!`, `bar!.baz`
- [ ] **2.4.3** Detect `as unknown as T` double casting
- [ ] **2.4.4** Detect `@ts-ignore` and `@ts-expect-error` comments
- [ ] **2.4.5** Detect `// @ts-nocheck` file-level ignores
- [ ] **2.4.6** Count and report frequency (high count = higher severity)
- [ ] **2.4.7** Write test suite with 15+ test cases

### 2.5 Rule AB006: Hardcoded Config Values
- [ ] **2.5.1** Detect hardcoded URLs: `http://localhost`, `https://api.example.com`
- [ ] **2.5.2** Detect hardcoded ports: `:3000`, `:8080`, `:5432`
- [ ] **2.5.3** Detect hardcoded IPs: `192.168.x.x`, `127.0.0.1`, `0.0.0.0`
- [ ] **2.5.4** Detect hardcoded paths: absolute file paths
- [ ] **2.5.5** Exclude test files and fixture data
- [ ] **2.5.6** Suggest environment variable alternative in finding message
- [ ] **2.5.7** Write test suite with 15+ test cases

### 2.6 Local Build & Test
- [ ] **2.6.1** Run `npm run build` — verify TypeScript compiles without errors
- [ ] **2.6.2** Run `npm run test` — verify all unit tests pass
- [ ] **2.6.3** Run `npm link` — update local global installation
- [ ] **2.6.4** Test `afterburn ./` on afterburn project itself — verify rules detect issues
- [ ] **2.6.5** Test `afterburn ./` on a personal project with known issues
- [ ] **2.6.6** Verify terminal output shows findings correctly
- [ ] **2.6.7** Fix any false positives or missed detections

**Sprint 2 Deliverable:** Four core rules running against changed files, findings displayed in terminal.

---

## Sprint 3: npm Registry Integration & Dependency Audit

### 3.1 Dependency Extraction
- [ ] **3.1.1** Parse `package.json` for dependencies and devDependencies
- [ ] **3.1.2** Detect new dependencies added in session (diff old vs new package.json)
- [ ] **3.1.3** Parse import/require statements from changed files
- [ ] **3.1.4** Identify imports that aren't in package.json (potential hallucinations)
- [ ] **3.1.5** Handle monorepo structures (multiple package.json files)
- [ ] **3.1.6** Support yarn.lock and pnpm-lock.yaml detection

### 3.2 npm Registry API Integration
- [ ] **3.2.1** Implement `fetchPackageInfo(name: string)` — calls registry.npmjs.org
- [ ] **3.2.2** Extract: exists, version, weekly downloads, last publish date, deprecated flag
- [ ] **3.2.3** Implement rate limiting (avoid hitting npm API limits)
- [ ] **3.2.4** Implement caching (don't re-fetch same package in single run)
- [ ] **3.2.5** Handle network errors gracefully (offline mode)
- [ ] **3.2.6** Add timeout handling (5 second max per request)

### 3.3 Hallucinated Package Detection
- [ ] **3.3.1** Cross-reference imports with npm registry existence
- [ ] **3.3.2** Flag packages that return 404 from registry as "hallucinated"
- [ ] **3.3.3** Flag packages with <100 weekly downloads as "low adoption warning"
- [ ] **3.3.4** Flag packages not updated in >12 months as "unmaintained warning"
- [ ] **3.3.5** Flag deprecated packages as "deprecated warning"
- [ ] **3.3.6** Generate dependency audit section in report

### 3.4 Dependency Report Section
- [ ] **3.4.1** Format: `✅ package@version — X weekly downloads, updated Y ago`
- [ ] **3.4.2** Format: `⚠️ package@version — low adoption / unmaintained`
- [ ] **3.4.3** Format: `❌ package — PACKAGE NOT FOUND (hallucinated?)`
- [ ] **3.4.4** Sort by status: errors first, then warnings, then verified

### 3.5 Local Build & Test
- [ ] **3.5.1** Run `npm run build` — verify TypeScript compiles without errors
- [ ] **3.5.2** Run `npm run test` — verify all unit tests pass
- [ ] **3.5.3** Run `npm link` — update local global installation
- [ ] **3.5.4** Test on project with new dependencies — verify registry lookup works
- [ ] **3.5.5** Test with fake/hallucinated import — verify detection works
- [ ] **3.5.6** Test offline mode — verify graceful degradation
- [ ] **3.5.7** Verify dependency audit section appears in output

**Sprint 3 Deliverable:** Dependency audit with hallucinated package detection working end-to-end.

---

## Sprint 4: Report Generation & npm Publishing

### 4.1 Markdown Report Generator
- [ ] **4.1.1** Implement report template structure (as defined in PRD section 6.1)
- [ ] **4.1.2** Generate header: timestamp, session duration, file count
- [ ] **4.1.3** Generate session summary: files changed, lines +/-, new dependencies
- [ ] **4.1.4** Generate risk report section with severity icons (❌ ⚠️ ℹ️)
- [ ] **4.1.5** Generate dependency audit section
- [ ] **4.1.6** Generate changes by file table: file, category, +/-, complexity
- [ ] **4.1.7** Write report to `.afterburn.md` in project root (or --output path)
- [ ] **4.1.8** Handle overwriting existing report (with timestamp in filename option)

### 4.2 Terminal Output
- [ ] **4.2.1** Design terminal output layout (summary → errors → warnings → info)
- [ ] **4.2.2** Implement colored severity indicators using chalk
- [ ] **4.2.3** Implement file path + line number clickable format (for IDE integration)
- [ ] **4.2.4** Show progress during analysis (file count, rule count)
- [ ] **4.2.5** Show summary statistics at end (X errors, Y warnings, Z info)
- [ ] **4.2.6** Add `--no-color` flag for CI environments

### 4.3 File Change Categorization
- [ ] **4.3.1** Implement heuristics for change type detection:
  - New file in `src/` → "new-feature"
  - Modified test file → "test"
  - Modified config file → "config"
  - File with "fix" in recent commit → "bugfix"
  - Large structural changes → "refactor"
- [ ] **4.3.2** Calculate complexity delta (line count based for v0.1, cyclomatic later)
- [ ] **4.3.3** Sort files by impact (most lines changed first)

### 4.4 npm Publishing Preparation
- [ ] **4.4.1** Verify package.json metadata is complete (description, keywords, repository)
- [ ] **4.4.2** Add LICENSE file (MIT)
- [ ] **4.4.3** Create README.md with installation, usage, and examples
- [ ] **4.4.4** Test global installation locally: `npm link` and run `afterburn`
- [ ] **4.4.5** Test on fresh machine / clean environment
- [ ] **4.4.6** Publish to npm as `afterburn@0.1.0-beta`
- [ ] **4.4.7** Verify installation works: `npm install -g afterburn`

### 4.5 Integration Testing
- [ ] **4.5.1** Create test fixture: 50-file TypeScript project with known issues
- [ ] **4.5.2** Run full analysis, verify all 4 rules trigger correctly
- [ ] **4.5.3** Verify performance: <30 seconds for 50-file project
- [ ] **4.5.4** Verify report output matches expected format
- [ ] **4.5.5** Test with real-world projects (afterburn on itself!)

**Sprint 4 Deliverable:** v0.1.0-beta published to npm, working end-to-end with 4 rules.

---

## Phase 1 Completion Checklist

- [ ] CLI runs with `afterburn ./` command
- [ ] Git diff parsing works for uncommitted changes and recent commits
- [ ] 4 rules implemented: AB001, AB002, AB003, AB006
- [ ] npm registry integration detects hallucinated packages
- [ ] Markdown report generated to `.afterburn.md`
- [ ] Terminal output with colors and progress
- [ ] Published to npm as v0.1.0-beta
- [ ] README with basic documentation
- [ ] All unit tests passing
- [ ] Tested on 3+ real-world projects

---

## Technical Debt to Track

- [ ] Cyclomatic complexity calculation (using line count as proxy for now)
- [ ] Python/requirements.txt support (deferred to Phase 2)
- [ ] Tree-sitter AST parsing (using regex for now)
- [ ] Monorepo edge cases
- [ ] Windows path handling
