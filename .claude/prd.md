# Afterburn — Product Requirements Document

**Post-Session Intelligence for AI-Assisted Coding**

*The documentation that vibe coding never produces.*

---

| | |
|---|---|
| **Version** | 1.0 |
| **Author** | Hashim |
| **Date** | March 2026 |
| **Status** | Draft |
| **Classification** | Internal |
| **Target Launch** | Q2 2026 (v0.1 CLI Beta) |
| **Platform** | npm (Node.js CLI) → GitHub Action → Hosted Dashboard |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Target Users](#3-target-users)
4. [Product Architecture](#4-product-architecture)
5. [Feature Specification](#5-feature-specification)
6. [Output Specification](#6-output-specification)
7. [Competitive Positioning](#7-competitive-positioning)
8. [Business Model](#8-business-model)
9. [Development Roadmap](#9-development-roadmap)
10. [Success Metrics](#10-success-metrics)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Open Questions](#12-open-questions)

---

## 1. Executive Summary

Afterburn is a CLI tool that generates a human-readable summary of every AI-assisted coding session. When a developer finishes a vibe coding session — with dozens of file changes across the codebase — Afterburn produces a clear, structured document explaining what changed, why it changed, and what's risky. No more reading every file, every diff, every line.

**Core thesis:** The readable summary of a coding session is the primary value. Developers using AI coding tools produce massive diffs they can't practically review line-by-line. Afterburn's LLM-powered summaries (via BYOK — bring-your-own-key) make every session understandable in 60 seconds. A static analysis layer underneath catches dangerous patterns at zero cost, but the human-readable intelligence is what customers will pay for.

> **KEY DIFFERENTIATORS**
>
> (1) Human-readable session summaries powered by LLM (BYOK model — no infrastructure cost to us) • (2) Session-level context, not single-commit isolation • (3) Curated AI-specific static analysis ruleset • (4) Hallucinated package detection via registry verification • (5) Zero hosting cost: user's API key, user's LLM cost (~$0.01–0.05/session)

### 1.1 Product at a Glance

| Dimension | Detail |
|---|---|
| Product Type | Developer CLI tool (npm package) |
| Primary Command | `afterburn ./ --explain` (run after any AI coding session) |
| Output | `.afterburn.md` — human-readable session summary + risk report |
| Primary Engine | LLM-powered session intelligence (BYOK: user's own API key) |
| Foundation Layer | Static analysis (deterministic, zero LLM cost) for risk detection |
| Cost Model | BYOK — user provides their own LLM API key (~$0.01–0.05/session) |
| Target User | Developers using Claude Code, Cursor, Copilot, or any AI coding tool |
| Pricing | Free (OSS CLI, static only) → Pro $12/mo (LLM features) → Enterprise |
| Distribution | `npm install -g afterburn` |
| Launch Target | Q2 2026 (v0.1 beta) |

---

## 2. Problem Statement

### 2.1 The AI Coding Accountability Gap

AI coding tools have fundamentally changed how software is written. But they've created a dangerous blind spot: velocity without documentation. When a developer finishes a session with Claude Code, Cursor, or Copilot, they're left with working code and zero record of why decisions were made.

This isn't a minor inconvenience. It's a compounding crisis:

- 46% of GitHub commits are now AI-generated, yet only 3% of developers report high trust in AI code output
- 66% of developers spend more time fixing "almost-right" AI code than writing it from scratch
- 45% of AI-generated code contains security vulnerabilities
- AI code creates 1.7x more production issues than human-written code
- 75% of technology companies are projected to face moderate-to-severe AI-induced technical debt by late 2026

### 2.2 Why Existing Tools Don't Solve This

| Tool Category | What It Does | What It Misses |
|---|---|---|
| AI Code Detectors (Span, CodeSpy) | Identifies whether code is AI-generated | Doesn't assess quality or provide documentation |
| Generic Linters (ESLint, SonarQube) | Catches syntax issues and standard anti-patterns | No awareness of AI-specific failure patterns |
| Observability Platforms (Langfuse, LangSmith) | Traces LLM calls and latency | Focused on agents, not coding sessions; cost is secondary |
| Code Review Tools (CodeRabbit, GitHub Copilot Review) | Automated PR feedback | Generic suggestions, no session context or historical trends |
| Pre-commit LLM Hooks (DIY) | LLM-powered commit review | Single-commit isolation, inconsistent results, no maintenance |

### 2.3 The Core Insight

> **AFTERBURN'S THESIS**
>
> The problem isn't that AI writes bad code — it's that nobody documents what happened. The most dangerous outcome of AI coding isn't bugs; it's an entire codebase that nobody understands six weeks later. Afterburn creates the paper trail that AI coding tools never provide.

---

## 3. Target Users

### 3.1 Primary Persona: Solo Developer / Indie Hacker

**Profile:** Full-stack developer using AI coding tools daily (Claude Code, Cursor, or Copilot). Ships fast, iterates alone or with 1–2 collaborators. Builds side projects or freelance products. Needs to understand their own codebases weeks later when they revisit or hand off to clients.

- Uses AI coding tools for 60–80% of coding output
- Moves fast, rarely writes documentation voluntarily
- Has experienced the "what did I build last month?" problem
- Cost-sensitive; won't pay for tools they don't use daily
- Values CLI tools over web dashboards

### 3.2 Secondary Persona: Engineering Team Lead

**Profile:** Manages a team of 4–15 engineers adopting AI coding tools. Responsible for code quality, review throughput, and shipping velocity. Bottlenecked on PR reviews because they're the only person who catches AI-pattern issues. Needs to enforce standards without slowing the team.

- Team is adopting "agentic engineering" workflows
- Spends 30–40% of time on code review
- Concerned about technical debt accumulation
- Wants data on AI tool usage patterns across the team
- Would pay for a tool that reduces review burden

### 3.3 Tertiary Persona: Consultant / Freelancer

**Profile:** Builds codebases for clients using AI tools. Needs to demonstrate quality and transparency in deliverables. The `.afterburn.md` report becomes a client-facing artifact that builds trust and justifies rates.

---

## 4. Product Architecture

### 4.1 Two-Layer Design

Afterburn is deliberately designed as a two-layer system. The LLM-powered readable summary is the primary value customers pay for. The static analysis foundation runs underneath at zero cost, catching dangerous patterns deterministically. This architecture keeps Afterburn's infrastructure cost near zero while delivering the highest-value output.

> **BYOK ECONOMICS**
>
> Afterburn never calls LLM APIs on its own infrastructure. The user configures their own API key (OpenAI, Anthropic, or any compatible provider). Their key, their cost. A typical session summary costs ~$0.01–0.05 in LLM tokens depending on diff size and model choice. This means: (1) zero marginal cost per user for Afterburn, (2) no need to manage API quotas or rate limits, (3) users control their own provider and model preferences, (4) no data leaves the user's machine except to their own LLM provider.

#### Layer 1: LLM-Powered Session Intelligence (Primary Value — BYOK)

This is what customers pay for. The LLM reads the full session diff in context and produces a readable summary that replaces manually reviewing every changed file. This is especially critical for vibe coding sessions where AI models generate large volumes of changes across many files.

- **Human-Readable Session Summary** — A 2–3 paragraph overview of everything that happened in the session, written in plain language. The developer reads this instead of reviewing 40+ files of diff.
- **Intent-Based Changelog** — Groups changes by purpose (not file), answering "what was the developer trying to accomplish?" Example: "Added Stripe payment integration with webhook verification" rather than listing 8 files that changed.
- **Architecture Decision Record** — LLM interprets the diff to explain why specific frameworks, libraries, and patterns were selected and how they fit the codebase context.
- **Trade-off Analysis** — Identifies decisions that have alternatives and briefly explains the pros/cons of the chosen approach vs. alternatives.

#### Layer 2: Static Analysis Foundation (Free, Zero LLM Cost)

This layer runs without any API key and catches dangerous patterns deterministically. It's the safety net — even if a user doesn't configure an LLM key, they still get risk detection and dependency auditing. It also serves as the free tier that drives adoption.

- **Risk Report** — Flags patterns AI commonly gets wrong: hardcoded credentials, missing error boundaries, optimistic type assertions, generic try/catch blocks, duplicate logic across files
- **Dependency Audit** — Identifies new packages, checks maintenance status via npm/PyPI registry lookups, detects hallucinated packages (imports that don't exist in any registry)
- **Session Diff Summary** — Organizes changes by file with categorization (new feature, refactor, bugfix, config change), line count, and complexity scoring
- **Session Statistics** — Lines added/removed, files touched, new dependencies introduced, estimated complexity delta

### 4.2 Why BYOK Is Non-Negotiable

The decision to use bring-your-own-key rather than hosting LLM calls is a fundamental business constraint, not just a preference:

- **Cost at scale** — If Afterburn provided the LLM API, every user session would cost $0.01–0.05 in tokens. At 10,000 active users running 3 sessions/day, that's $900–$4,500/month in pure API costs before any revenue. Unsustainable for a solo-founder product.
- **No margin erosion** — With BYOK, Afterburn's revenue is pure software margin. The $12/mo Pro subscription has zero variable cost per usage.
- **User control** — Users choose their provider (Anthropic, OpenAI, local via Ollama), their model (fast/cheap vs. smart/expensive), and their data handling preferences.
- **Privacy** — Code diffs are sent directly from the user's machine to their own LLM provider. Afterburn's servers never see the code.

### 4.3 System Architecture

High-level data flow:

```
$ afterburn ./ --explain
  │
  ├── [1] Git Diff Parser → reads uncommitted + recent commits
  ├── [2] AST Analyzer → parses changed files into syntax trees
  ├── [3] Rule Engine → runs AI-specific pattern detection rules
  ├── [4] Registry Checker → verifies packages against npm/PyPI
  ├── [5] LLM Layer → sends diff + context to user's own API key
  │       (Anthropic / OpenAI / Ollama — user's choice + cost)
  │
  └── [6] Report Generator → .afterburn.md + terminal output
```

### 4.4 Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| Runtime | Node.js (18+) | npm ecosystem, fast startup, matches target audience toolchain |
| Language | TypeScript | Type safety for rule engine, familiar to target users |
| Git Integration | simple-git / child_process | Read diffs, log history, detect session boundaries |
| AST Parsing | tree-sitter (via bindings) | Multi-language support, fast, mature |
| Package Registry | npm registry API + PyPI JSON API | Hallucinated package verification |
| LLM Integration | Vercel AI SDK / raw fetch | Provider-agnostic, supports OpenAI/Anthropic/local |
| Output | Markdown + terminal (chalk/ora) | Universal, committable, readable |
| Distribution | npm (global install) | One command: `npm install -g afterburn` |

---

## 5. Feature Specification

### 5.1 CLI Interface

Afterburn's primary interface is a single CLI command with sensible defaults and progressive disclosure of options.

#### Core Commands

```bash
afterburn ./                        # Full analysis, current directory
afterburn ./ --explain              # Include LLM-powered explanations
afterburn ./ --since="2 hours ago"  # Scope to recent session
afterburn ./ --output ./docs/       # Custom output path
afterburn ./ --json                 # Machine-readable output
afterburn ./ --ci                   # CI mode (exit code based on risk)
afterburn init                      # Create .afterburnrc config file
afterburn config set llm.provider anthropic
afterburn config set llm.apiKey sk-...
```

#### Configuration (.afterburnrc)

```json
{
  "language": "auto",
  "sessionWindow": "4h",
  "rules": {
    "hardcodedCredentials": "error",
    "missingErrorHandling": "warn",
    "duplicateLogic": "warn",
    "hallucinatedPackages": "error",
    "optimisticTypes": "info"
  },
  "ignore": ["*.test.ts", "*.spec.js"],
  "llm": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "apiKey": "env:ANTHROPIC_API_KEY"
  }
}
```

### 5.2 Report Modules (Detailed)

#### Module 1: Risk Report

**Tier:** Free (Static Analysis)

Scans changed files for patterns that AI coding tools commonly produce incorrectly. Each rule has a severity level (error, warn, info) and produces annotated output with file path, line number, code snippet, and explanation.

**Rule catalog (v0.1):**

| Rule ID | Pattern | Severity | Description |
|---|---|---|---|
| AB001 | Hardcoded Credentials | Error | Detects API keys, passwords, tokens, and connection strings in source code |
| AB002 | Generic Error Swallowing | Warning | try/catch blocks with empty catch or console.log-only handling |
| AB003 | Optimistic Type Assertions | Warning | TypeScript `as any`, non-null assertions (!), type casting without validation |
| AB004 | Duplicate Logic | Warning | Substantially similar function bodies across files (>80% AST similarity) |
| AB005 | Missing Null/Undefined Checks | Info | Function parameters used without nullish guards |
| AB006 | Hardcoded URLs/Config | Warning | URLs, ports, hostnames that should be environment variables |
| AB007 | Security Anti-Patterns | Error | MD5/SHA1 for passwords, SQL concatenation, missing auth middleware |
| AB008 | Over-Abstraction | Info | Wrapper functions that add no logic, interfaces with single implementation |
| AB009 | Missing Timeout Config | Warning | HTTP/fetch calls without timeout, database queries without limits |
| AB010 | TODO/FIXME from AI | Info | AI-generated placeholder comments indicating incomplete implementation |

#### Module 2: Dependency Audit

**Tier:** Free (Static Analysis + Registry API)

Identifies every new dependency introduced in the session and verifies it against package registries. This is critical because AI tools sometimes "hallucinate" package names — generating import statements for packages that don't exist.

- Lists all new packages added to package.json, requirements.txt, or import statements
- Checks npm registry and/or PyPI for existence, version, last publish date, weekly downloads, and known vulnerabilities
- Flags hallucinated packages (import exists but package doesn't) as critical errors
- Highlights packages with no recent updates (>12 months) or very low adoption (<100 weekly downloads)

#### Module 3: Session Diff Summary

**Tier:** Free (Static Analysis)

A structured changelog of everything that changed in the session, organized by file. Unlike a raw git diff, this adds context: lines added/removed, change category, and a complexity score based on cyclomatic complexity delta.

#### Module 4: Architecture Decision Record

**Tier:** Pro (LLM-Powered, Bring-Your-Own-Key)

The LLM analyzes the session diff in the context of the existing codebase and generates structured ADRs explaining: what technology decisions were made, what alternatives existed, why the chosen approach fits, and what trade-offs were accepted. This is the "why" that static analysis cannot provide.

#### Module 5: Intent-Based Changelog

**Tier:** Pro (LLM-Powered)

Groups changes by purpose rather than file, answering "what was the developer trying to accomplish?" Example: "Added JWT authentication with refresh token rotation" rather than listing 7 files that changed.

---

## 6. Output Specification

### 6.1 Report Structure (.afterburn.md)

The primary output is a markdown file designed to be committed alongside code:

```markdown
# Afterburn Session Report
_Generated: 2026-03-07 14:32 UTC | Session: 2h 15m | Files: 12_

## Session Summary
12 files changed | +347 / -89 lines | 3 new dependencies

## Risk Report (2 errors, 4 warnings)
❌ AB001 src/config.ts:14 — Hardcoded API key detected
❌ AB007 src/auth.ts:42 — MD5 used for password hashing
⚠️  AB002 src/api.ts:78 — Empty catch block swallows errors
...

## Dependency Audit
✅ jsonwebtoken@9.0.2 — 1.2M weekly downloads, updated 3mo ago
⚠️  bcrypt-lite@0.1.3 — 23 weekly downloads, last updated 14mo ago
❌ super-auth-utils — PACKAGE NOT FOUND (hallucinated?)

## Changes by File
| File | Category | +/- | Complexity |
|------|----------|-----|------------|
| src/auth.ts | New Feature | +89/-0 | +12 |
...

## [Pro] Architecture Decisions
### Chose Express over Fastify
Express was selected for its middleware ecosystem...
```

### 6.2 Terminal Output

Rich terminal output using chalk for colors and ora for progress spinners. Mirrors the markdown structure but uses ANSI formatting for readability. Summary statistics are shown first, followed by errors, then warnings.

### 6.3 JSON Output (--json)

Machine-readable output for CI/CD integration. Includes all data from the markdown report in structured JSON format, suitable for piping to other tools or uploading to dashboards.

---

## 7. Competitive Positioning

### 7.1 Why Not a DIY Pre-Commit Hook?

The strongest objection to Afterburn is: "Why not just add an LLM call to my pre-commit hook?" This is a legitimate question. Here's the honest answer:

- **Session-level context** — A pre-commit hook sees one commit in isolation. Afterburn sees the full session: multiple commits, progression of changes, what was tried and reverted, relationships between files changed together.
- **Curated AI-specific ruleset** — A generic LLM prompt gives inconsistent results. Afterburn has a versioned, tested ruleset specifically targeting patterns that Cursor, Claude Code, and Copilot get wrong. Institutional knowledge baked into the tool.
- **Hallucinated package detection** — An LLM cannot reliably tell you if a package exists. Afterburn deterministically checks registries.
- **Historical trending (Pro)** — A pre-commit hook is stateless. Afterburn tracks patterns over time: AI reliance trends, recurring risk categories, quality scores per module.
- **Consistency** — LLM outputs vary every run. Afterburn's static analysis core gives deterministic, reproducible results.

> **THE ESLINT ANALOGY**
>
> Anyone can ask ChatGPT to review their code. But ESLint exists — and 24 million projects use it — because people want maintained, configurable, reproducible, team-shareable analysis. Afterburn is ESLint for the AI coding era: the maintained, opinionated version of what someone would hack together and abandon in a week.

### 7.2 Competitive Landscape

| Competitor | Focus | Afterburn Advantage |
|---|---|---|
| ESLint / Biome | Generic JavaScript linting | No AI-specific rules, no session context, no documentation generation |
| SonarQube | Enterprise code quality | Heavy, server-based, no AI awareness, not CLI-first |
| CodeRabbit | AI-powered PR review | Generic suggestions, no AI-pattern specialization, SaaS-only |
| Langfuse / LangSmith | LLM observability | Agent-focused, not coding-session-focused, cost is secondary |
| AI Code Detectors (Span) | Detection of AI-written code | Detection ≠ quality; tells you WHO, not WHETHER it's safe to ship |
| Pre-commit LLM hooks | DIY code review | Stateless, inconsistent, unmaintained, single-commit isolation |

### 7.3 Three-Pillar Differentiation

No existing tool combines these three capabilities in a single CLI:

1. **Post-session documentation generation** — structured reports from git diffs
2. **AI-specific static analysis** — curated ruleset targeting patterns AI tools get wrong
3. **Deterministic zero-LLM-cost core** — 70% of value with no API keys or network calls

---

## 8. Business Model

### 8.1 Pricing Tiers

| Feature | Free (OSS) | Pro ($12/mo) | Enterprise |
|---|---|---|---|
| Core CLI | ✅ | ✅ | ✅ |
| Risk Report (static analysis) | ✅ | ✅ | ✅ |
| Dependency Audit | ✅ | ✅ | ✅ |
| Session Diff Summary (by file) | ✅ | ✅ | ✅ |
| Session Statistics | ✅ | ✅ | ✅ |
| LLM Readable Summary (BYOK) | — | ✅ (primary value) | ✅ |
| Intent-Based Changelog (LLM) | — | ✅ | ✅ |
| Architecture Decision Records (LLM) | — | ✅ | ✅ |
| Trade-off Analysis (LLM) | — | ✅ | ✅ |
| Historical Trending | — | ✅ | ✅ |
| Team Sharing Dashboard | — | ✅ | ✅ |
| CI/CD Integration (exit codes) | ✅ (basic) | ✅ (full) | ✅ |
| Custom Rule Configuration | ✅ (local) | ✅ (synced) | ✅ |
| Org-Wide Compliance Reports | — | — | ✅ |
| Audit Trails | — | — | ✅ |
| SSO / SAML | — | — | ✅ |
| Priority Support | — | Email | Dedicated |

### 8.2 Revenue Model & BYOK Economics

Open-source core (static analysis only) drives adoption and community contributions. Pro tier unlocks the LLM-powered readable summaries at $12/month — priced below developer discretionary spending thresholds (no manager approval needed). Enterprise tier is custom-priced for teams needing compliance and audit features.

**Critical cost advantage:** Because users bring their own API keys, Afterburn's cost structure is pure software margin. The only infrastructure costs are npm hosting (free), a lightweight license verification endpoint, and the optional Pro dashboard. There is zero per-usage cost to Afterburn regardless of how many sessions a user runs. The user pays their LLM provider directly (~$0.01–0.05 per session), and Afterburn collects a flat $12/month subscription.

#### Revenue Projections (Conservative)

| Milestone | Timeline | Users (Free) | Pro Subscribers | MRR |
|---|---|---|---|---|
| Beta Launch | Q2 2026 | 500 | 0 | $0 |
| v1.0 Stable | Q3 2026 | 2,000 | 50 | $600 |
| Growth Phase | Q4 2026 | 5,000 | 200 | $2,400 |
| Maturity | Q2 2027 | 15,000 | 750 | $9,000 |

### 8.3 Distribution Strategy

- **npm as primary distribution** — `npm install -g afterburn`
- **GitHub stars/community as growth engine** — open-source CLI drives organic discovery
- **Content marketing via Hashim's LinkedIn/X audience** — practical tutorials, Claude Code tips, "what AI gets wrong" content series
- **Product Hunt launch at v1.0**
- **Conference talks / dev community posts** on AI code accountability

---

## 9. Development Roadmap

### 9.1 Phase 1: Foundation (Weeks 1–4)

**Goal: Working CLI that generates a basic report from git diffs.**

- Set up TypeScript project with npm packaging
- Implement git diff parser (simple-git integration)
- Build 4 core rules: AB001 (credentials), AB002 (error swallowing), AB003 (type assertions), AB006 (hardcoded config)
- Implement npm registry checker for hallucinated package detection
- Generate markdown report (.afterburn.md)
- Terminal output with colors (chalk) and progress (ora)
- Publish to npm as v0.1.0-beta

### 9.2 Phase 2: Rule Engine + Config (Weeks 5–8)

**Goal: Configurable rule engine with full v0.1 rule catalog.**

- Implement remaining rules (AB004 through AB010)
- Add .afterburnrc configuration support
- Add `--since` flag for session scoping
- Add `--json` output for CI/CD
- Add `--ci` mode with exit codes based on severity
- Tree-sitter integration for multi-language AST parsing
- PyPI registry checker (Python support)
- Publish v0.1.0 stable

### 9.3 Phase 3: LLM Layer + Pro (Weeks 9–12)

**Goal: Ship LLM-powered features and Pro tier.**

- Implement BYOK LLM integration (Vercel AI SDK or raw fetch)
- Build Architecture Decision Record generation
- Build Intent-Based Changelog generation
- Add `--explain` flag
- Build license verification / Pro gating
- Set up Stripe billing for Pro tier ($12/mo)
- Publish v0.2.0 (Pro launch)

### 9.4 Phase 4: Teams + Dashboard (Weeks 13–20)

**Goal: Team features, historical trending, hosted dashboard.**

- Build web dashboard for Pro users (report history, trends)
- Implement team sharing (invite teammates, shared reports)
- Historical trend analysis ("your AI reliance increased 30% this month")
- GitHub Action for automated CI/CD integration
- Custom rule authoring (user-defined patterns)
- Publish v1.0.0

### 9.5 Future Roadmap (Post v1.0)

| Feature | Description | Priority |
|---|---|---|
| Python CLI port | `pip install afterburn` for Python-first teams | High |
| VS Code extension | Inline risk annotations in editor after sessions | Medium |
| Cursor/Copilot plugins | Auto-trigger Afterburn after AI coding sessions | Medium |
| Org-wide compliance | Enterprise tier: audit trails, policy enforcement, SSO | Medium |
| MCP Server | Expose Afterburn as an MCP tool for AI agents | Low |
| Local LLM support | Ollama integration for zero-API-cost explanations | Low |

---

## 10. Success Metrics

### 10.1 North Star Metric

> **NORTH STAR**
>
> Weekly `--explain` runs — developers running `afterburn ./ --explain` (LLM-powered summary) at least once per week. This measures adoption of the primary value feature, not just static analysis. Secondary metric: total CLI runs (including free tier).

### 10.2 Key Performance Indicators

| KPI | Target (6 months) | Measurement |
|---|---|---|
| npm installs (total) | 10,000+ | npm download stats |
| Weekly active runs | 2,000+ | Anonymous telemetry (opt-in) |
| GitHub stars | 1,500+ | GitHub |
| Pro conversion rate | 3–5% of active users | Stripe / license checks |
| Monthly recurring revenue | $2,400+ | Stripe |
| Average risk findings per session | Track trend | Aggregated anonymous data |
| User retention (30-day) | 40%+ | Telemetry |
| Mean time to first report | <30 seconds | Performance benchmarks |

### 10.3 Quality Gates for Launch

- **v0.1 beta:** CLI generates accurate report for a 50-file TypeScript project in <30 seconds
- **v0.1 beta:** Zero false positives on hallucinated package detection
- **v0.1 beta:** All 10 rules produce accurate results on a curated test suite of 50 AI-generated code samples
- **v0.1 stable:** Report has been personally used by Hashim on 20+ real coding sessions
- **v1.0:** Pro features validated by 10+ beta testers

---

## 11. Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| AI coding tools add built-in review | High | Medium | Focus on post-session documentation (not review). Even if Cursor adds review, it won't generate committable ADRs. |
| Low free-to-paid conversion | Medium | Medium | Ensure free tier is genuinely useful. Pro must add clear, measurable value (LLM explanations, trends). |
| Rule false positives erode trust | High | Medium | Invest heavily in test suite. Dogfood on real projects. Default to info severity for uncertain patterns. |
| Tree-sitter complexity for multi-lang | Medium | High | Start with TypeScript/JavaScript only. Add Python in Phase 2. Defer other languages to community. |
| LLM provider API changes | Low | Medium | Abstract behind Vercel AI SDK. Support multiple providers from day one. |
| Competitor enters with more resources | Medium | Medium | Move fast, build community, accumulate rules. Open-source moat makes forking easy but contributing easier. |
| User privacy concerns (code analysis) | Medium | Low | Local-first by design. No code leaves the machine unless user opts into LLM features with their own key. |

---

## 12. Open Questions

Decisions to be resolved before or during Phase 1:

1. **Session boundary detection** — How does Afterburn determine where a "session" starts and ends? Options: time-based window (default 4h), explicit markers (afterburn start/stop), or git branch boundaries.
2. **Monorepo support** — Should v0.1 support monorepos with multiple package.json files, or scope to single-package projects only?
3. **Rule contribution model** — How do external contributors add rules? Plugin system vs. core-only for v1.0?
4. **Telemetry opt-in/out** — What anonymous usage data should be collected for the north star metric? Must be clearly opt-in.
5. **Naming: afterburn vs. alternatives** — Final name decision. Alternatives considered: ignite, debrief, postmortem. Afterburn is current frontrunner.
6. **License model** — MIT for CLI core? What license for Pro-only modules?

---

*End of Document*