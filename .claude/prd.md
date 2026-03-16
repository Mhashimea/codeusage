# Afterburn — Product Requirements Document

**Version:** v2.0 — Final
**Author:** Hashim (@hashim_ea)
**Date:** March 2026
**Status:** Final — Ready for Development
**Target Launch:** Q3 2026 (Beta)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Goals](#3-product-vision--goals)
4. [User Personas](#4-user-personas)
5. [System Architecture](#5-system-architecture)
6. [CLI — Feature Specification](#6-cli--feature-specification)
7. [Dashboard — Feature Specification](#7-dashboard--feature-specification)
8. [Technical Requirements](#8-technical-requirements)
9. [Phased Roadmap](#9-phased-roadmap)
10. [Pricing Model](#10-pricing-model)
11. [Success Metrics](#11-success-metrics)
12. [Risks & Mitigations](#12-risks--mitigations)
13. [Open Questions](#13-open-questions)

---

## 1. Executive Summary

Afterburn is a cloud-based AI coding tool intelligence platform that gives engineering teams and project managers complete visibility into how AI coding tools — Claude Code, Codex, and future agents — are used across their organisation.

As AI coding tools become embedded infrastructure in software teams, managers face a new blind spot: subscriptions are purchased and tools deployed, but there is no way to track productivity, attribute costs to projects, or understand activity at the individual developer level. Afterburn closes this gap.

> **Core problem:** A team of 10 developers sharing 2–3 AI coding subscriptions has zero visibility into who is using what, how much it costs per project, or whether the AI investment is delivering value. No existing tool solves this at the team level.

Afterburn works through a lightweight CLI package (installed with one command) that hooks into Claude Code's native event system. After every task, a structured telemetry payload — tokens, cost, tools used, files changed — is sent to a cloud dashboard. Project managers see real-time team activity, per-developer breakdowns, per-project cost attribution, and exportable reports. Developers see their own task history. No code content is ever captured.

**Afterburn is the GitHub contribution graph for AI coding — making invisible work visible, measurable, and reportable.**

---

## 2. Problem Statement

### 2.1 Background

AI coding tools (Claude Code, GitHub Copilot, OpenAI Codex, Cursor) have become standard in software teams. Companies purchase subscription seats, embed tools into developer workflows, and expect productivity gains. But unlike every other category of software tooling, there is no management layer — no equivalent to Git analytics, CI dashboards, or ticket tracking — for AI-assisted coding activity.

### 2.2 Specific Pain Points

**For Project Managers and Team Leads:**

- Cannot see which developers actively use AI tools vs. never touch them
- Cannot attribute AI tool costs to specific projects, clients, or sprints
- No way to measure ROI on AI subscription spend
- No aggregate reporting for leadership, finance, or budget reviews
- Cannot identify which task types consume the most AI usage

**For Developers:**

- No personal history of what they asked the AI to do and what changed
- Cannot estimate their own subscription consumption
- No way to review a completed AI task's file changes without reading raw diffs

### 2.3 Market Gap

Existing tools fall into two categories, neither of which solves the team-level problem:

| Tool / Category                               | What it does                                                                                                     | Why it is insufficient                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Claude Code Usage Monitor (6.5k GitHub stars) | Real-time terminal monitor for individual Claude Code users                                                      | Personal only — no cloud, no team layer, no PM dashboard, no multi-developer view                |
| ccusage (10.7k GitHub stars)                  | CLI analyzer for Claude Code and Codex from local JSONL files. Covers multiple tools and multi-instance grouping | Still local and personal — no cloud sync, no team dashboard, no cross-developer visibility       |
| PostHog / LangSmith                           | General observability and LLM tracing platforms                                                                  | Not purpose-built for coding tools; requires significant custom instrumentation; no PM-facing UX |
| **None**                                      | **Team-level, task-granularity, multi-developer, multi-tool dashboard with PM-facing reporting**                 | **This is the gap Afterburn fills**                                                              |

---

## 3. Product Vision & Goals

> **Vision:** Make AI coding tool usage as visible, measurable, and reportable as Git commits — giving every engineering team a GitHub-style activity view for their AI investment.

### 3.1 Primary Goals

- **G1** — Task-level tracking of every AI coding interaction across the team
- **G2** — Cloud dashboard for PMs and team leads with per-developer and per-project breakdowns
- **G3** — Cost visibility — read-only, no budget limits or alert thresholds
- **G4** — Multi-tool support starting with Claude Code, expanding to Codex in Phase 2
- **G5** — Zero-friction developer setup via a single `npx` command
- **G6** — One workspace API key model — no per-developer key management overhead

### 3.2 Non-Goals (v1)

- Code content or prompt text storage — Afterburn captures metadata only
- Budget alert thresholds or spending limits — cost is read-only information
- AI model proxying or MITM interception — native hook APIs only
- Codex integration — Phase 2
- Per-developer API keys — one workspace key for the entire team

---

## 4. User Personas

| Persona                   | Role & Context                                                                                                                   | Primary Need                                                                                | Key Metric                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------ |
| PM / Team Lead            | Manages 5–20 developers. Has budget authority. Owns 2–5 AI subscriptions shared across the team. Presents reports to leadership. | Visibility dashboard, cost attribution by project, productivity trends, team-level reports  | Cost per project, active devs, task volume |
| Developer                 | Uses Claude Code daily. Needs personal task history. May be required by PM to install Afterburn.                                 | Personal task log, usage history, quick review of what the AI changed per task, file review | My tasks today, tokens used, files changed |
| Freelancer / Solo Founder | Works across multiple client projects. Wants to understand which projects consume AI budget.                                     | Per-project cost breakdown, monthly spend summary per client                                | Cost by project, monthly total             |
| Finance / Ops Reviewer    | Reviews monthly tool spend. Validates AI subscription ROI for budget decisions.                                                  | Exportable cost reports, monthly trend, developer breakdown                                 | Monthly cost, cost vs. last month          |

---

## 5. System Architecture

### 5.1 High-Level Components

| Component                       | Description                                                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Afterburn CLI (npm package)** | Installed on each developer machine via `npx afterburn init`. Registers Claude Code hooks. Captures task-level events. Authenticates with cloud using workspace API key. Sends telemetry payloads to the cloud API. |
| **Claude Code Hook Layer**      | Uses Claude Code's native hook system (`PostToolUse`, `Stop`, `Notification` events) to capture task completion signals without modifying the developer workflow.                                                   |
| **Telemetry Payload**           | Structured JSON record per completed task: tokens in/out/cache, cost estimate, files changed, tools invoked, project slug, developer alias, timestamp, duration.                                                    |
| **Afterburn Cloud API**         | Receives telemetry from all CLI instances in a workspace. Stores in per-workspace database. Handles authentication, rate limiting, and strict data isolation between workspaces.                                    |
| **Cloud Dashboard (Web App)**   | Next.js SPA. PM and developer views. Real-time data. Filterable by developer, project, date range, and tool. Full reporting and CSV export.                                                                         |
| **Workspace API Key**           | One key per workspace, generated by the admin/PM from the dashboard. Shared with all developers during onboarding. No per-developer key management.                                                                 |

### 5.2 Authentication & Identity Model

> **One workspace API key.** The workspace key authenticates the CLI to the cloud — it says "this data belongs to Workspace X". Developer identity is separate: a name/alias the developer sets during `afterburn init`, stored locally, and sent as a field in every telemetry payload. This mirrors how Sentry, PostHog, and Datadog work: one project/org key + individual identity on top.

Per-developer API keys were explicitly considered and rejected. Reasons: onboarding overhead (12 keys instead of 1), fragmented key rotation, no actual security benefit in a shared-visibility model, and unnecessary complexity for developers.

### 5.3 Hook Scope — Global vs Project

The CLI supports two hook registration modes, chosen during setup:

| Mode             | Description                                                                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Global**       | Hook written to `~/.claude/settings.json`. Fires for every Claude Code session on the developer's machine. Project is auto-detected from git remote URL or directory name. Developer can exclude specific directories with `afterburn project ignore`. Recommended for teams where the PM wants full visibility.    |
| **Project-only** | Hook written to `.claude/settings.json` inside the current repository. Only fires when Claude Code runs inside that specific repo. Project name is set explicitly during init. Good for developers who want selective tracking. Optional: commit the hook file to the repo so teammates are auto-prompted on clone. |

In both modes, the developer can always override the project tag per-directory with `afterburn project set <name>`, and the hook scope is shown in `afterburn status`.

### 5.4 Data Model — Task Record

| Field               | Type & Description                                                             |
| ------------------- | ------------------------------------------------------------------------------ |
| `task_id`           | UUID — unique per task                                                         |
| `workspace_id`      | UUID — workspace identifier (from API key lookup)                              |
| `developer_alias`   | String — name set by developer during init                                     |
| `project_slug`      | String — from git remote, directory name, or `afterburn project set`           |
| `tool_source`       | Enum — `claude_code` \| `codex` (Phase 2)                                      |
| `model_name`        | String — e.g. `claude-sonnet-4-5` (from session log)                           |
| `input_tokens`      | Integer — input token count                                                    |
| `output_tokens`     | Integer — output token count                                                   |
| `cache_tokens`      | Integer — cache read tokens                                                    |
| `cost_usd`          | Decimal — estimated cost using Anthropic model pricing                         |
| `files_changed`     | Integer — number of files modified                                             |
| `tools_used`        | `Array<{ name: string; count: number }>` — e.g. `[{Edit:4},{Read:6},{Bash:3}]` |
| `task_duration_sec` | Integer — elapsed time from first tool call to stop hook                       |
| `hook_scope`        | Enum — `global` \| `project`                                                   |
| `timestamp`         | DateTime — UTC task completion time                                            |
| `cli_version`       | String — Afterburn CLI version                                                 |

---

## 6. CLI — Feature Specification

### 6.1 Installation & Setup Flow

The developer runs one command. The setup wizard handles everything:

```bash
npx afterburn init
```

**Setup steps in order:**

1. Prompt for workspace API key (provided by PM from dashboard)
2. Authenticate against Afterburn Cloud — display workspace name on success
3. Set developer alias (name shown in dashboard)
4. Choose hook scope: **Global** (recommended) or **Project-only**
5. If Global: auto-detect current project from git remote. Ask for optional fallback name if no git remote found.
6. If Project-only: confirm project name from git remote suggestion. Ask whether to commit `.claude/settings.json` to the repo.
7. Register hooks in the appropriate `settings.json` file
8. Display success message with dashboard URL

### 6.2 CLI Command Reference

| Command                            | Description                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `npx afterburn init`               | First-time setup: authenticate, set alias, choose scope, register hooks        |
| `afterburn status`                 | Show connection, scope, active hooks, tracked projects, today's personal usage |
| `afterburn project set <name>`     | Tag current directory as a named project (overrides git remote detection)      |
| `afterburn project list`           | Show all directory → project mappings on this machine                          |
| `afterburn project ignore`         | Exclude current directory from tracking                                        |
| `afterburn project unignore`       | Re-enable tracking for a previously ignored directory                          |
| `afterburn log`                    | Show last 10 tasks synced from this machine (local cache)                      |
| `afterburn log --all`              | Show full local task history                                                   |
| `afterburn sync`                   | Manually push any buffered/pending task records                                |
| `afterburn config`                 | Open config or re-run setup wizard                                             |
| `afterburn config --scope global`  | Switch hook scope to global                                                    |
| `afterburn config --scope project` | Switch hook scope to project-only                                              |
| `afterburn logout`                 | Remove credentials and unregister all hooks                                    |
| `afterburn --version`              | Show CLI version                                                               |

### 6.3 Hook Integration — Claude Code

Afterburn integrates with Claude Code using three hook events:

| Hook             | Purpose                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stop**         | Primary trigger. Fires when a task completes. Afterburn reads the session log, builds the `TaskRecord`, and syncs to cloud. One task record per Stop hook. |
| **PostToolUse**  | Fires after each individual tool invocation. Accumulates the `tools_used` array (Edit, Read, Bash, TodoWrite, etc.) before Stop fires.                     |
| **Notification** | Fires on session limit warnings. Reserved for future use.                                                                                                  |

The CLI reads token counts, model name, and tool list from Claude Code's local session log at `~/.claude/projects/{hash}/sessions/`. No network interception or proxying.

### 6.4 Project Auto-Detection Logic

When a Stop hook fires, project slug is resolved in this priority order:

1. Explicit override set by `afterburn project set <name>` for this directory
2. Git remote URL — parsed to extract the repository name
3. Global default fallback name set during init (if any)
4. Directory name as last resort

If no git remote is found and no override is set, the hook output warns the developer to run `afterburn project set <name>`. The task still syncs — it appears as `untagged` in the dashboard. Tasks are never silently dropped.

### 6.5 Offline Buffering

If the Afterburn Cloud API is unreachable, task records are buffered locally in `~/.afterburn/buffer/`. On the next successful connection, all buffered records are flushed automatically in chronological order. Manual flush available via `afterburn sync`. Buffer capped at 50 records — developer is warned if the cap is approached.

---

## 7. Dashboard — Feature Specification

### 7.1 Overview Page

Default landing page for PMs and team leads.

- Metric cards: total tokens, estimated cost, tasks completed, active devs today — with period selector (7 days / 30 days / this month)
- Team activity heatmap — GitHub-style grid showing daily task volume across all developers for the past 26 weeks
- Live task feed — last 5 tasks across the team, updating in real time via SSE
- Top projects by token volume — horizontal bar chart

### 7.2 Task Feed Page

Chronological log of all tasks across all developers. Filterable by developer, project, date range, and tool source.

- Each row: developer, project, token count, estimated cost, files changed, tools summary, duration, time
- Click any row to expand full task detail
- Summary bar: total tasks, total cost, total tokens for the active filters
- CSV export button

#### 7.2.1 Task Detail Panel

When a task row is expanded, three sections appear inline:

| Section             | Content                                                                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Token breakdown** | Input tokens, output tokens, cache read tokens, estimated cost — four stat boxes                                                                                                                                        |
| **Tools used**      | Horizontal bar chart: each tool (Read, Edit, Bash, TodoWrite, etc.) with call count and plain-language annotation                                                                                                       |
| **Files changed**   | List of modified files with `+lines` / `−lines` per file. Each file has a review status badge: `pending review` or `✓ reviewed`. Review toggle is a v1.1 feature — rendered as static with "coming v1.1" label in v1.0. |

### 7.3 Developers Page

Per-developer breakdown table. Clicking a developer row opens their 14-day activity bar chart inline.

- Table columns: developer alias, hook scope (global / project), tasks, tokens, estimated cost, files changed, activity bar
- Inactive developers (0 tasks in the period) appear at the bottom

### 7.4 Projects Page

Per-project breakdown showing token consumption and cost contribution.

- Table columns: project name, tasks, tokens, cost, contributors (avatars), share bar
- Contributor attribution: which developers worked on each project and their percentage share
- Warning callout when untagged tasks are present, with instruction to run `afterburn project set`

### 7.5 Cost & Usage Page

Read-only cost visibility. **No budget limits. No alert thresholds. No configurable spending caps. The numbers are purely informational.**

- Metric cards: total cost this month, total tokens, total tasks, average cost per task
- Monthly cost trend bar chart (6 months)
- Cost by project — horizontal bars with dollar amounts
- Cost by developer table — tasks, tokens, cost, share bar
- CSV export

### 7.6 Reports Page

- Weekly summary report: auto-generated every Monday. Cost, task summary, top projects, developer breakdown. PDF and CSV download.
- Monthly cost report: full breakdown on 1st of each month. PDF and CSV download.
- Scheduled email delivery: configurable on/off per report type. Informational only — no thresholds or alerts.

### 7.7 Settings Page

#### 7.7.1 Workspace API Key

One key for the entire workspace. Displayed at creation and after rotation. Two actions available: **Copy** and **Rotate**.

- Rotating the key immediately invalidates the old one
- All developers must re-run `afterburn config` with the new key after rotation
- Key format: `ab-ws-{36 hex chars}`
- Displayed as `ab-ws-••••••••••••••••••••••••` with Copy enabled only immediately after generation/rotation

#### 7.7.2 Developer Roster

Auto-populated as developers self-register using the workspace key. No manual key generation per developer.

- Shows: developer alias, hook scope, status (active / left)
- PM can mark a developer as inactive (preserves historical data)
- **Invite developer** button: sends email with workspace key + setup instructions

#### 7.7.3 Workspace Config

- Workspace name (editable)
- Plan and seat count (links to billing)
- Data retention (12 months default)
- Scheduled report toggles: weekly digest, monthly cost report, daily summary

---

## 8. Technical Requirements

### 8.1 Tech Stack

#### Web App (`apps/web`)

| Layer         | Choice                                               |
| ------------- | ---------------------------------------------------- |
| Framework     | Next.js 15 (App Router)                              |
| Language      | TypeScript (strict)                                  |
| Styling       | Tailwind CSS v4                                      |
| Components    | shadcn/ui                                            |
| ORM           | Drizzle ORM                                          |
| Database      | PostgreSQL (Neon / Supabase in prod, Docker locally) |
| Data fetching | TanStack Query v5 (client); Server Components (SSR)  |
| Auth          | NextAuth.js v5 — email magic link                    |
| Real-time     | Server-Sent Events via Next.js Route Handler         |
| Deployment    | Vercel                                               |

#### CLI (`packages/cli`)

| Layer             | Choice                                      |
| ----------------- | ------------------------------------------- |
| Language          | TypeScript (strict)                         |
| CLI framework     | Commander.js                                |
| Dev runner        | tsx                                         |
| Build             | tsup (single CJS bundle, zero runtime deps) |
| Terminal colours  | chalk                                       |
| Spinners          | ora                                         |
| Config management | conf                                        |
| Shell commands    | execa                                       |
| HTTP client       | native `fetch` (Node 18+)                   |
| Validation        | zod (shared)                                |

### 8.2 CLI Requirements

| Requirement       | Specification                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime           | Node.js 18+ (LTS). Distributed via npm/npx.                                                                                                                    |
| Platform support  | macOS, Linux, Windows (WSL2)                                                                                                                                   |
| Dependencies      | Zero required runtime dependencies bundled by tsup                                                                                                             |
| Hook registration | Must not break existing Claude Code functionality. Graceful fallback if hook registration fails. Always merge into existing `settings.json` — never overwrite. |
| Offline buffering | Tasks buffered to `~/.afterburn/buffer/` when API unreachable. Auto-flush on reconnect. Cap at 50 records.                                                     |
| Config storage    | `~/.afterburn/config.json` managed by `conf` package                                                                                                           |

### 8.3 Cloud / API Requirements

| Requirement    | Specification                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| API            | REST, JSON, HTTPS only. `Authorization: Bearer <workspace_key>` header.                               |
| Auth           | One workspace API key. Bcrypt-hashed before storage — never stored in plaintext.                      |
| Rate limiting  | 100 task records / minute per workspace. Return `429` with `Retry-After: 60`.                         |
| Data isolation | Strict row-level security. Every query on `tasks` table must filter by `workspace_id`. No exceptions. |
| Database       | PostgreSQL with index on `(workspace_id, created_at)` for all dashboard queries                       |
| Uptime         | 99.5% for Beta, 99.9% for GA                                                                          |
| Real-time      | SSE for live task feed on Overview page                                                               |

### 8.4 Privacy & Security

> **What Afterburn captures (metadata only):** token counts, tool names and call counts, file change counts, timestamps, cost estimates, developer alias, project slug, duration, model name.
>
> **What Afterburn never captures:** prompt text, AI response text, code content, file names, file paths, diff content.

- All data encrypted in transit (TLS 1.3) and at rest (AES-256)
- Developer aliases can be pseudonymised at workspace level if required
- Data retention: 12 months default, configurable per workspace
- GDPR-ready: data export and deletion on request within 30 days
- Workspace API key bcrypt-hashed before storage, never stored in plaintext

---

## 9. Phased Roadmap

| Phase                      | Scope                                                                                                                                                                                                                                                                                                                                                                       | Timeline |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Phase 1 — MVP (Beta)**   | CLI for Claude Code only. Stop and PostToolUse hook integration. Global and project-scope setup. One workspace API key model. Dashboard: Overview, Task Feed with expanded detail (tokens + tools + file review placeholder), Developers, Projects, Cost & Usage (read-only), Reports (weekly + monthly), Settings (API key + roster). CSV export. Scheduled email reports. | Q3 2026  |
| **Phase 2 — Multi-Tool**   | Codex integration via wrapper/script approach. Tool source filter in all dashboard views. Comparative efficiency analytics: Claude Code vs Codex per task type. Multi-model cost pricing table.                                                                                                                                                                             | Q4 2026  |
| **Phase 3 — Intelligence** | File change review feature — mark files as reviewed, add notes per file. AI-generated task summaries (BYOK model). Productivity scoring. Anomaly detection (unusual token spikes). Integration with project management tools (Jira, Linear, Asana).                                                                                                                         | Q1 2027  |
| **Phase 4 — Enterprise**   | SSO / SAML. Role-based access control. On-premise deployment option. SLA and compliance features. Advanced BI tool integration (Looker, Tableau). Custom data retention. Annual contract pricing.                                                                                                                                                                           | Q2 2027  |

---

## 10. Pricing Model

| Plan                         | Target                          | Features                                                                                                                                                                            |
| ---------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Free**                     | Solo dev evaluating the product | 1 developer, 30-day data retention, basic dashboard only (Overview + Task Feed). No exports, no email reports.                                                                      |
| **Team ($X / seat / month)** | 5–50 developer teams            | All dashboard pages, full reports (PDF + CSV), 12-month retention, scheduled email digests, developer roster management, invite flow, workspace API key rotation. Priority support. |
| **Enterprise (Custom)**      | 50+ developer orgs              | Everything in Team plus: SSO/SAML, RBAC, on-premise option, dedicated support, SLA, custom retention, BI integrations. Annual contract.                                             |

> _Note: Team tier pricing to be validated through customer discovery. Initial hypothesis: $8–15 / developer / month._

---

## 11. Success Metrics

| Metric                          | Target (6 months post-Beta)                                 |
| ------------------------------- | ----------------------------------------------------------- |
| Monthly Active Workspaces       | 50+ paying teams                                            |
| CLI Installs                    | 500+ developer installs                                     |
| Task Records Processed          | 1M+ task records / month                                    |
| Net Promoter Score (NPS)        | > 40 among PM personas                                      |
| Monthly Churn (Team plan)       | < 5%                                                        |
| Time to First Task Tracked      | < 10 minutes from signup to first task visible in dashboard |
| Developer Setup Completion Rate | > 80% of invited developers complete init within 48h        |

---

## 12. Risks & Mitigations

| Risk                                                                          | Mitigation                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anthropic changes Claude Code hook schema or restricts third-party hook usage | Monitor Anthropic changelog. Abstract the hook integration layer so it can be updated independently of the rest of the CLI. Do not hard-code field names from the session log.                                                                                                     |
| Developers resist being tracked — privacy and surveillance concerns           | Be fully transparent: metadata only, zero code content captured. Make hook output visible in terminal so developers always see what is sent. Make opt-out easy (`afterburn project ignore`, `afterburn logout`). Frame it as a benefit to developers too — their own task history. |
| Cost estimation inaccuracy                                                    | Use publicly documented Anthropic model pricing. Display estimates with `~$` prefix in all UIs. Update the pricing table promptly when Anthropic publishes changes.                                                                                                                |
| Low adoption in teams — PM buys, devs don't install                           | Minimise install friction to a single command. Provide PM-shareable onboarding guide. Build bulk invite flow so PM can send workspace key + instructions to all developers in one action.                                                                                          |
| Competitor replicates the team-level feature set                              | ccusage has 10.7k stars and is moving fast. Afterburn's moat is the PM-facing cloud layer, the setup UX, and depth of task-level detail. Ship Phase 1 fast. The task detail panel and review workflow (Phase 3) are hard to replicate quickly.                                     |
| Codex integration complexity in Phase 2                                       | OpenAI Codex may not have a native hook API equivalent to Claude Code's. Research before committing to Phase 2 architecture. A wrapper-script approach may be needed.                                                                                                              |
| Workspace key compromise                                                      | Key rotation is one click. All developers re-run `afterburn config` with the new key. Consider adding key expiry and rotation reminders in a future version.                                                                                                                       |

---

## 13. Open Questions

Decisions to resolve before or during Phase 1 development:

1. Should developers be able to see each other's task logs, or only their own? Default proposal: PM can see all; developer can see only themselves. Confirm with early customers.

2. What is the right cost estimation precision to display? Show as `~$0.079` (approximate) or calculate precisely from token counts × model pricing? Approximate is safer given pricing changes.

3. Should Afterburn offer a self-hosted / on-premise option in Phase 1 for privacy-sensitive teams, or defer to Phase 4 Enterprise?

4. Is there an Anthropic usage API (separate from local log parsing) that could provide more reliable token data in the future? Monitor Anthropic's API roadmap.

5. Which project management integration should be prioritised in Phase 3: Jira, Linear, or Asana?

6. Should the file review feature (task detail panel) be built in v1.0 as a basic toggle, or deferred fully to v1.1?

---

_End of Document_

_Afterburn PRD v2.0 · March 2026 · Internal Use Only_
