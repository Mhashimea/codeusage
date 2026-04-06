# Codeusage — Phase 2: Codex Integration Tasks

**Created:** March 2026
**Status:** Planning
**Target:** Q4 2026

---

## Overview

This document outlines the tasks required to add OpenAI Codex CLI support to Codeusage. Currently, Codeusage only supports Claude Code. Phase 2 adds Codex as a second provider.

---

## Research Summary

### Codex CLI Hook System

- Codex has an **experimental hooks engine** (v0.114.0+)
- Hook events: `SessionStart`, `Stop`, `AfterAgent`, `AfterToolUse`
- Hooks configured via `~/.codex/hooks.json` (separate from Claude Code)
- Enable with: `codex -c features.codex_hooks=true`
- Hooks run synchronous commands that block turn progression

### Codex Session Logs

- Location: `~/.codex/sessions/YYYY/MM/DD/rollout-{timestamp}-{uuid}.jsonl`
- Format: JSON Lines with event objects
- Token events: `turn.completed` with `usage` object containing `input_tokens`, `cached_input_tokens`, `output_tokens`
- Model tracked in `turn_context` metadata

### Codex Models & Pricing (2026)

| Model | Input (per 1M) | Output (per 1M) |
|-------|----------------|-----------------|
| gpt-5.4 | $2.50 | $15.00 |
| gpt-5.3-codex | $1.75 | $14.00 |
| gpt-5.3-codex-spark | $1.00 | $8.00 |

### Key Differences from Claude Code

| Aspect | Claude Code | Codex |
|--------|-------------|-------|
| Hook Config | `.claude/settings.json` | `~/.codex/hooks.json` |
| Session Logs | `~/.claude/projects/{hash}/sessions/*.jsonl` | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` |
| Hook Maturity | Stable | Experimental |
| Token Format | Per-task aggregation | Per-turn event-based |

---

## Task Breakdown

### 1. Shared Package Updates (`packages/shared`)

- [ ] **1.1** Add Codex model pricing to `cost.ts`
  - Add `gpt-5.4`, `gpt-5.3-codex`, `gpt-5.3-codex-spark` pricing
  - Create `estimateCostCodex()` function or extend existing `estimateCost()`
  - Update `PRICING_LAST_UPDATED` constant

- [ ] **1.2** Update provider registry in `providers.ts`
  - Change Codex status from `coming_soon` to `active`
  - Add Codex-specific metadata (hook config path, session log path pattern)

- [ ] **1.3** Update types in `types.ts`
  - Add Codex-specific session log types
  - Add `CodexTurnEvent`, `CodexTokenUsage` interfaces
  - Ensure `tool_source` enum includes `codex`

- [ ] **1.4** Update schemas in `schemas.ts`
  - Add Zod schemas for Codex session data validation
  - Update `TelemetryPayloadSchema` if needed

---

### 2. CLI Updates (`packages/cli`)

#### 2.1 Session Log Parser

- [ ] **2.1.1** Create `session-log-codex.ts` in `src/lib/`
  - Parse Codex JSONL format from `~/.codex/sessions/YYYY/MM/DD/`
  - Find most recent rollout file for current date
  - Extract token counts from `turn.completed` events
  - Handle cumulative vs delta token calculation
  - Extract model name from `turn_context`

- [ ] **2.1.2** Create unified session parser interface
  - Abstract `parseSessionLog(provider: string, cwd: string)` function
  - Route to Claude Code or Codex parser based on provider
  - Return consistent `SessionData` type

#### 2.2 Hook Management

- [ ] **2.2.1** Create `hooks-file-codex.ts` in `src/lib/`
  - Read/write `~/.codex/hooks.json`
  - Register Codeusage hooks for `Stop` event
  - Merge with existing hooks (never overwrite)
  - Handle hook removal on logout

- [ ] **2.2.2** Update `hooks-file.ts`
  - Add provider parameter to hook functions
  - Route to appropriate hook file handler

#### 2.3 Commands

- [ ] **2.3.1** Update `init.ts`
  - Allow Codex selection in provider prompt
  - Detect Codex installation (`~/.codex/` exists)
  - Warn if Codex hooks are experimental
  - Register hooks in `~/.codex/hooks.json`

- [ ] **2.3.2** Update `provider.ts` switch command
  - Unregister old provider hooks
  - Register new provider hooks
  - Update config with new provider

- [ ] **2.3.3** Update `status.ts`
  - Show Codex-specific paths if active
  - Show Codex version if detectable

- [ ] **2.3.4** Update `logout.ts`
  - Remove hooks from Codex config if applicable

#### 2.4 Stop Hook

- [ ] **2.4.1** Update `hooks/stop.ts`
  - Detect current provider from config
  - Use appropriate session log parser
  - Use appropriate cost calculation
  - Handle Codex-specific session ID format

---

### 3. Web App Updates (`apps/web`)

#### 3.1 Database

- [ ] **3.1.1** Verify `tool_source` column supports `codex` value
  - Check schema allows new provider values
  - No migration needed if using text type

#### 3.2 Dashboard Filters

- [ ] **3.2.1** Add provider filter to Tasks page
  - Show filter only when multiple providers exist in data
  - Filter options: All, Claude Code, Codex

- [ ] **3.2.2** Add provider filter to Cost & Usage page
  - Allow cost breakdown by provider
  - Show comparative view when both providers have data

- [ ] **3.2.3** Add provider filter to Developers page
  - Show which providers each developer uses

- [ ] **3.2.4** Add provider filter to Projects page
  - Show provider breakdown per project

#### 3.3 Provider Indicator

- [ ] **3.3.1** Add provider badge/icon to task rows
  - Show "C" for Claude Code, "X" for Codex (or appropriate icons)
  - Consistent across all task lists

- [ ] **3.3.2** Update TaskDetailPanel
  - Show provider name in detail view
  - Show provider-specific model names

#### 3.4 Overview Page

- [ ] **3.4.1** Add provider breakdown to stats
  - Show cost split by provider
  - Show token split by provider

- [ ] **3.4.2** Update heatmap
  - Option to filter by provider or show combined

#### 3.5 Queries

- [ ] **3.5.1** Update `tasks.ts` queries
  - Add optional `provider` filter parameter
  - Update `getTaskStats` for provider filtering
  - Update `getTopProjects` for provider filtering

- [ ] **3.5.2** Add `getUniqueProviders` query
  - Return list of providers with data in workspace
  - Used for showing/hiding provider filter

---

### 4. Testing

- [ ] **4.1** Create Codex JSONL fixtures
  - Sample rollout files with various event types
  - Files with different token patterns

- [ ] **4.2** Unit tests for Codex session parser
  - Parse token counts correctly
  - Handle missing/malformed events
  - Extract model names

- [ ] **4.3** Unit tests for Codex hook management
  - Register hooks correctly
  - Merge with existing hooks
  - Remove hooks on logout

- [ ] **4.4** Integration tests
  - Full flow from Stop hook to API
  - Provider switching
  - Multi-provider data queries

---

### 5. Documentation

- [ ] **5.1** Update CLAUDE.md
  - Add Codex-specific paths and patterns
  - Document Codex hook format

- [ ] **5.2** Update PRD
  - Mark Codex as active
  - Add Codex-specific architecture details

- [ ] **5.3** Update CLI help text
  - Reflect Codex as active option

- [ ] **5.4** Create user guide for Codex setup
  - Installation steps
  - Enable experimental hooks
  - Troubleshooting

---

### 6. Future Considerations (Out of Scope)

- [ ] OpenTelemetry integration for Codex metrics
- [ ] Real-time streaming from Codex sessions
- [ ] Codex-specific tool tracking (different tool names)
- [ ] Cross-provider efficiency comparison analytics

---

## Implementation Order

**Recommended sequence:**

1. **Phase 2.1 - Foundation** (Week 1-2)
   - Tasks 1.1, 1.2, 1.3, 1.4 (Shared package)
   - Task 2.1.1 (Codex session parser)

2. **Phase 2.2 - CLI Integration** (Week 3-4)
   - Tasks 2.1.2, 2.2.1, 2.2.2 (Unified parsers, hook management)
   - Tasks 2.3.1 - 2.3.4 (Command updates)
   - Task 2.4.1 (Stop hook)

3. **Phase 2.3 - Dashboard** (Week 5-6)
   - Tasks 3.1.1, 3.2.1 - 3.2.4 (Database, filters)
   - Tasks 3.3.1, 3.3.2 (Provider indicators)
   - Tasks 3.4.1, 3.4.2, 3.5.1, 3.5.2 (Overview, queries)

4. **Phase 2.4 - Testing & Docs** (Week 7-8)
   - Tasks 4.1 - 4.4 (Testing)
   - Tasks 5.1 - 5.4 (Documentation)

---

## Dependencies

- Codex CLI must be installed for testing
- Codex experimental hooks must be enabled: `codex -c features.codex_hooks=true`
- Access to Codex session logs requires active Codex usage

---

## Risks

| Risk | Mitigation |
|------|------------|
| Codex hooks remain experimental | Build with fallback to polling-based approach |
| Codex session format changes | Abstract parser with version detection |
| Different tool names in Codex | Map Codex tools to unified tool taxonomy |
| Codex not installed on dev machines | Mock session files for testing |

---

## Technical Details

### Codex Session Log Format

**File location:** `~/.codex/sessions/YYYY/MM/DD/rollout-{timestamp}-{uuid}.jsonl`

**Example filename:** `rollout-2026-03-11T00-04-17-019cdb11-1b11-7323-aaf3-edaac90171b5.jsonl`

**Event structure:**
```json
{
  "type": "turn.completed",
  "usage": {
    "input_tokens": 24763,
    "cached_input_tokens": 24448,
    "output_tokens": 122
  }
}
```

### Codex Hook Configuration

**File location:** `~/.codex/hooks.json`

**Format:**
```json
{
  "hooks": {
    "Stop": [{
      "type": "command",
      "command": "codeusage hook stop",
      "statusMessage": "Syncing to Codeusage...",
      "timeout": 10
    }]
  }
}
```

### Codex Cost Calculation

```typescript
// packages/shared/src/cost.ts

export const CODEX_MODEL_PRICING: Record<string, { input: number; output: number; cache: number }> = {
  'gpt-5.4': { input: 2.5, output: 15.0, cache: 1.25 },
  'gpt-5.3-codex': { input: 1.75, output: 14.0, cache: 0.875 },
  'gpt-5.3-codex-spark': { input: 1.0, output: 8.0, cache: 0.5 },
};

export function estimateCost(
  provider: 'claude_code' | 'codex',
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheTokens: number
): number {
  const pricing = provider === 'codex' ? CODEX_MODEL_PRICING : MODEL_PRICING;
  const fallback = provider === 'codex' ? 'gpt-5.4' : 'claude-sonnet-4-5';
  const p = pricing[model] ?? pricing[fallback];

  return (
    (inputTokens / 1_000_000) * p.input +
    (outputTokens / 1_000_000) * p.output +
    (cacheTokens / 1_000_000) * p.cache
  );
}
```

---

## Summary

| Section | Tasks | Estimated Effort |
|---------|-------|------------------|
| 1. Shared Package | 4 tasks | 1 week |
| 2. CLI Updates | 9 tasks | 2 weeks |
| 3. Web App Updates | 10 tasks | 2 weeks |
| 4. Testing | 4 tasks | 1 week |
| 5. Documentation | 4 tasks | 0.5 week |
| **Total** | **31 tasks** | **6-8 weeks** |

---

_Last Updated: March 2026_
