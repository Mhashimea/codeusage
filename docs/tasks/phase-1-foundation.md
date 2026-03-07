# Phase 1: Foundation

**Duration:** Sprints 1-4
**Goal:** Working CLI that generates a basic report from git diffs with core static analysis rules.

---

## Sprint 1: Git Integration & CLI Core ✅

### 1.1 Git Diff Parser
- [x] **1.1.1** Install and configure `simple-git` package
- [x] **1.1.2** Implement `getUncommittedChanges()` — returns all staged and unstaged changes
- [x] **1.1.3** Implement `getRecentCommits(since: string)` — returns commits within time window
- [x] **1.1.4** Implement `parseFileDiff(diff: string)` — extracts additions, deletions, file status
- [x] **1.1.5** Implement `getFileContent(path: string, ref?: string)` — reads file at HEAD or working tree
- [x] **1.1.6** Handle edge cases: new repo (no commits), binary files, renamed files, deleted files
- [x] **1.1.7** Add unit tests for git module (mock simple-git)
- [x] **1.1.8** Test with real repositories of varying sizes (small, medium, large)

### 1.2 CLI Framework
- [x] **1.2.1** Implement `afterburn <path>` default command — runs full analysis
- [x] **1.2.2** Implement `--since <timespec>` flag — parses relative time (e.g., "2 hours ago", "4h")
- [x] **1.2.3** Implement `--output <path>` flag — sets output directory for report
- [x] **1.2.4** Add `ora` spinner for progress indication during analysis
- [x] **1.2.5** Add `chalk` colored output for terminal results
- [x] **1.2.6** Implement graceful error handling with user-friendly messages
- [x] **1.2.7** Add `--verbose` flag for debug output
- [x] **1.2.8** Add `--quiet` flag for minimal output (errors only)

### 1.3 Session Detection
- [x] **1.3.1** Implement time-based session boundary detection (default 4h window)
- [x] **1.3.2** Parse `--since` timespec into Date object (support: "Xh", "X hours ago", "X days ago", ISO date)
- [x] **1.3.3** Group commits and uncommitted changes into single session object
- [x] **1.3.4** Calculate session duration from first to last change

### 1.4 Local Build & Test
- [x] **1.4.1** Run `npm run build` — verify TypeScript compiles without errors
- [x] **1.4.2** Run `npm link` — install CLI globally from local source
- [x] **1.4.3** Test `afterburn --help` — verify CLI is accessible
- [x] **1.4.4** Test `afterburn ./` in a real project — verify git parsing works
- [x] **1.4.5** Fix any issues discovered during local testing
- [x] **1.4.6** Document any manual testing steps for future sprints

**Sprint 1 Deliverable:** CLI that reads git history and uncommitted changes, outputs raw session data to terminal. ✅

---

## Sprint 2: Core Static Analysis Rules ✅

### 2.1 Rule Engine Architecture
- [x] **2.1.1** Define `Rule` interface: `{ id, name, description, severity, check(content, filePath) }`
- [x] **2.1.2** Implement `RuleRunner` class — loads rules, executes against file content
- [x] **2.1.3** Implement finding aggregation — collect all findings, sort by severity
- [x] **2.1.4** Add severity levels: error (blocks CI), warn (highlighted), info (informational)
- [x] **2.1.5** Implement file filtering — skip files matching ignore patterns

### 2.2 Rule AB001: Hardcoded Credentials
- [x] **2.2.1** Detect API key patterns: `sk-`, `pk_live_`, `ghp_`, `gho_`, `AKIA`, etc.
- [x] **2.2.2** Detect password assignments: `password = "..."`, `pwd`, `secret`, `token`
- [x] **2.2.3** Detect connection strings: `mongodb://`, `postgres://`, `mysql://` with credentials
- [x] **2.2.4** Detect AWS patterns: access key ID, secret access key formats
- [x] **2.2.5** Exclude false positives: test files, example configs, environment variable references
- [x] **2.2.6** Add line number and code snippet to findings
- [x] **2.2.7** Write test suite with 20+ positive and negative test cases

### 2.3 Rule AB002: Generic Error Swallowing
- [x] **2.3.1** Detect empty catch blocks: `catch (e) {}`
- [x] **2.3.2** Detect console-only catch: `catch (e) { console.log(e) }`
- [x] **2.3.3** Detect ignored error parameter: `catch (_)`, `catch (ignored)`
- [x] **2.3.4** Detect Promise without catch: `.then()` without `.catch()`
- [x] **2.3.5** Allow legitimate patterns: intentional swallowing with comment
- [x] **2.3.6** Write test suite with 15+ test cases

### 2.4 Rule AB003: Optimistic Type Assertions
- [x] **2.4.1** Detect `as any` type assertions
- [x] **2.4.2** Detect non-null assertions: `foo!`, `bar!.baz`
- [x] **2.4.3** Detect `as unknown as T` double casting
- [x] **2.4.4** Detect `@ts-ignore` and `@ts-expect-error` comments
- [x] **2.4.5** Detect `// @ts-nocheck` file-level ignores
- [x] **2.4.6** Count and report frequency (high count = higher severity)
- [x] **2.4.7** Write test suite with 15+ test cases

### 2.5 Rule AB006: Hardcoded Config Values
- [x] **2.5.1** Detect hardcoded URLs: `http://localhost`, `https://api.example.com`
- [x] **2.5.2** Detect hardcoded ports: `:3000`, `:8080`, `:5432`
- [x] **2.5.3** Detect hardcoded IPs: `192.168.x.x`, `127.0.0.1`, `0.0.0.0`
- [x] **2.5.4** Detect hardcoded paths: absolute file paths
- [x] **2.5.5** Exclude test files and fixture data
- [x] **2.5.6** Suggest environment variable alternative in finding message
- [x] **2.5.7** Write test suite with 15+ test cases

### 2.6 Local Build & Test
- [x] **2.6.1** Run `npm run build` — verify TypeScript compiles without errors
- [x] **2.6.2** Run `npm run test` — verify all unit tests pass
- [x] **2.6.3** Run `npm link` — update local global installation
- [x] **2.6.4** Test `afterburn ./` on afterburn project itself — verify rules detect issues
- [x] **2.6.5** Test `afterburn ./` on a personal project with known issues
- [x] **2.6.6** Verify terminal output shows findings correctly
- [x] **2.6.7** Fix any false positives or missed detections

**Sprint 2 Deliverable:** Four core rules running against changed files, findings displayed in terminal. ✅

---

## Sprint 3: npm Registry Integration & Dependency Audit ✅

### 3.1 Dependency Extraction
- [x] **3.1.1** Parse `package.json` for dependencies and devDependencies
- [ ] **3.1.2** Detect new dependencies added in session (diff old vs new package.json) _(deferred)_
- [x] **3.1.3** Parse import/require statements from changed files
- [x] **3.1.4** Identify imports that aren't in package.json (potential hallucinations)
- [ ] **3.1.5** Handle monorepo structures (multiple package.json files) _(deferred)_
- [x] **3.1.6** Support yarn.lock and pnpm-lock.yaml detection

### 3.2 npm Registry API Integration
- [x] **3.2.1** Implement `fetchPackageInfo(name: string)` — calls registry.npmjs.org
- [x] **3.2.2** Extract: exists, version, weekly downloads, last publish date, deprecated flag
- [x] **3.2.3** Implement rate limiting (avoid hitting npm API limits)
- [x] **3.2.4** Implement caching (don't re-fetch same package in single run)
- [x] **3.2.5** Handle network errors gracefully (offline mode)
- [x] **3.2.6** Add timeout handling (5 second max per request)

### 3.3 Hallucinated Package Detection
- [x] **3.3.1** Cross-reference imports with npm registry existence
- [x] **3.3.2** Flag packages that return 404 from registry as "hallucinated"
- [x] **3.3.3** Flag packages with <100 weekly downloads as "low adoption warning"
- [x] **3.3.4** Flag packages not updated in >12 months as "unmaintained warning"
- [x] **3.3.5** Flag deprecated packages as "deprecated warning"
- [x] **3.3.6** Generate dependency audit section in report

### 3.4 Dependency Report Section
- [x] **3.4.1** Format: `✅ package@version — X weekly downloads, updated Y ago`
- [x] **3.4.2** Format: `⚠️ package@version — low adoption / unmaintained`
- [x] **3.4.3** Format: `❌ package — PACKAGE NOT FOUND (hallucinated?)`
- [x] **3.4.4** Sort by status: errors first, then warnings, then verified

### 3.5 Local Build & Test
- [x] **3.5.1** Run `npm run build` — verify TypeScript compiles without errors
- [x] **3.5.2** Run `npm run test` — verify all unit tests pass
- [x] **3.5.3** Run `npm link` — update local global installation
- [x] **3.5.4** Test on project with new dependencies — verify registry lookup works
- [x] **3.5.5** Test with fake/hallucinated import — verify detection works
- [x] **3.5.6** Test offline mode — verify graceful degradation
- [x] **3.5.7** Verify dependency audit section appears in output

**Sprint 3 Deliverable:** Dependency audit with hallucinated package detection working end-to-end. ✅

---

## Sprint 4: Report Generation & npm Publishing

### 4.1 Markdown Report Generator
- [x] **4.1.1** Implement report template structure (as defined in PRD section 6.1)
- [x] **4.1.2** Generate header: timestamp, session duration, file count
- [x] **4.1.3** Generate session summary: files changed, lines +/-, new dependencies
- [x] **4.1.4** Generate risk report section with severity icons (❌ ⚠️ ℹ️)
- [x] **4.1.5** Generate dependency audit section
- [x] **4.1.6** Generate changes by file table: file, category, +/-, complexity
- [x] **4.1.7** Write report to `.afterburn.md` in project root (or --output path)
- [x] **4.1.8** Handle overwriting existing report (with timestamp in filename option)

### 4.2 Terminal Output
- [x] **4.2.1** Design terminal output layout (summary → errors → warnings → info)
- [x] **4.2.2** Implement colored severity indicators using chalk
- [x] **4.2.3** Implement file path + line number clickable format (for IDE integration)
- [x] **4.2.4** Show progress during analysis (file count, rule count)
- [x] **4.2.5** Show summary statistics at end (X errors, Y warnings, Z info)
- [x] **4.2.6** Add `--no-color` flag for CI environments

### 4.3 File Change Categorization
- [x] **4.3.1** Implement heuristics for change type detection:
  - New file in `src/` → "new-feature"
  - Modified test file → "test"
  - Modified config file → "config"
  - File with "fix" in recent commit → "bugfix"
  - Large structural changes → "refactor"
- [x] **4.3.2** Calculate complexity delta (line count based for v0.1, cyclomatic later)
- [x] **4.3.3** Sort files by impact (most lines changed first)

### 4.4 npm Publishing Preparation
- [x] **4.4.1** Verify package.json metadata is complete (description, keywords, repository)
- [x] **4.4.2** Add LICENSE file (MIT)
- [x] **4.4.3** Create README.md with installation, usage, and examples
- [x] **4.4.4** Test global installation locally: `npm link` and run `afterburn`
- [ ] **4.4.5** Test on fresh machine / clean environment
- [ ] **4.4.6** Publish to npm as `afterburn@0.1.0-beta`
- [ ] **4.4.7** Verify installation works: `npm install -g afterburn`

### 4.5 Integration Testing
- [ ] **4.5.1** Create test fixture: 50-file TypeScript project with known issues
- [ ] **4.5.2** Run full analysis, verify all 4 rules trigger correctly
- [ ] **4.5.3** Verify performance: <30 seconds for 50-file project
- [ ] **4.5.4** Verify report output matches expected format
- [x] **4.5.5** Test with real-world projects (afterburn on itself!)

**Sprint 4 Deliverable:** v0.1.0-beta published to npm, working end-to-end with 4 rules.

---

## Phase 1 Completion Checklist

- [x] CLI runs with `afterburn ./` command
- [x] Git diff parsing works for uncommitted changes and recent commits
- [x] 4 rules implemented: AB001, AB002, AB003, AB006
- [x] npm registry integration detects hallucinated packages
- [x] Markdown report generated to `.afterburn.md`
- [x] Terminal output with colors and progress
- [ ] Published to npm as v0.1.0-beta
- [x] README with basic documentation
- [x] All unit tests passing
- [x] Tested on 3+ real-world projects

---

## Technical Debt to Track

- [ ] Cyclomatic complexity calculation (using line count as proxy for now)
- [ ] Python/requirements.txt support (deferred to Phase 2)
- [ ] Tree-sitter AST parsing (using regex for now)
- [ ] Monorepo edge cases
- [ ] Windows path handling
