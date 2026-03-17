# Provider Abstraction — Task List

> **Goal:** Make Afterburn provider-agnostic to support Claude Code, Codex, and future AI coding tools.
> **Current State:** Claude Code only (MVP)
> **This Sprint:** Prepare architecture for multi-provider support, show Codex as "Coming Soon"

---

## Overview

| Area | Changes Required |
|------|------------------|
| CLI | Provider selection in init, provider-aware hooks, config updates |
| Shared | Generic types, provider registry |
| Web Dashboard | Provider-agnostic terminology, provider badges |
| Documentation | Update all references from "Claude Code" to generic terms |

---

## 1. Shared Package Updates (`packages/shared`)

### 1.1 Provider Types & Registry

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P1.1.1 | Define Provider enum | Create `Provider` type: `'claude_code' \| 'codex'` | `packages/shared/src/types.ts` |
| P1.1.2 | Create provider registry | Define provider metadata (name, status, icon, hook support) | `packages/shared/src/providers.ts` |
| P1.1.3 | Add provider status | `'active' \| 'coming_soon' \| 'beta'` for each provider | Same file |
| P1.1.4 | Export from barrel | Add to `index.ts` exports | `packages/shared/src/index.ts` |

**Provider registry structure:**

```typescript
// packages/shared/src/providers.ts
export type ProviderStatus = 'active' | 'coming_soon' | 'beta';

export interface ProviderInfo {
  id: string;
  name: string;
  displayName: string;
  status: ProviderStatus;
  description: string;
  sessionLogPath?: string; // Provider-specific log location pattern
  hooksSupported: boolean;
}

export const PROVIDERS: Record<string, ProviderInfo> = {
  claude_code: {
    id: 'claude_code',
    name: 'Claude Code',
    displayName: 'Claude Code',
    status: 'active',
    description: 'Anthropic\'s AI coding assistant',
    sessionLogPath: '~/.claude/projects/{hash}/sessions/*.jsonl',
    hooksSupported: true,
  },
  codex: {
    id: 'codex',
    name: 'Codex',
    displayName: 'OpenAI Codex',
    status: 'coming_soon',
    description: 'OpenAI\'s code generation model',
    hooksSupported: false,
  },
};

export function getActiveProviders(): ProviderInfo[] {
  return Object.values(PROVIDERS).filter(p => p.status === 'active');
}

export function getProviderById(id: string): ProviderInfo | undefined {
  return PROVIDERS[id];
}
```

### 1.2 Update Existing Types

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P1.2.1 | Update TelemetryPayload | Ensure `tool_source` uses Provider type | `packages/shared/src/types.ts` |
| P1.2.2 | Update TaskRecord | Add provider display helpers | Same file |
| P1.2.3 | Update AfterBurnConfig | Add `provider` field to config type | Same file |

**Updated config type:**

```typescript
export interface AfterBurnConfig {
  workspace_key: string;
  developer_alias: string;
  provider: 'claude_code' | 'codex'; // NEW
  hook_scope: 'global' | 'project';
  default_project: string;
  project_overrides: Record<string, string>;
}
```

---

## 2. CLI Updates (`packages/cli`)

### 2.1 Provider Selection in Init

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P2.1.1 | Add provider selection step | Show list of providers with status badges | `packages/cli/src/commands/init.ts` |
| P2.1.2 | Display "Coming Soon" providers | Show Codex as disabled with label | Same file |
| P2.1.3 | Save provider to config | Store selected provider in config | Same file |
| P2.1.4 | Update init flow order | Provider → Key → Alias → Scope → Project | Same file |

**Init flow mockup:**

```
$ afterburn init

? Select your AI coding tool:
  ● Claude Code          Anthropic's AI coding assistant
  ○ Codex               [Coming Soon] OpenAI's code generation model

? Enter your workspace key: ab-ws-...
? Developer alias: [Jane Smith]
? Hook scope: (global/project)

✓ Connected to workspace: Acme Corp
✓ Hooks registered for Claude Code
✓ Configuration saved

You're all set! View your dashboard at https://app.afterburn.dev
```

### 2.2 Provider-Aware Configuration

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P2.2.1 | Update config defaults | Add `provider: 'claude_code'` as default | `packages/cli/src/lib/config.ts` |
| P2.2.2 | Add provider getter | `getProvider()` function | Same file |
| P2.2.3 | Migrate existing configs | Handle configs without `provider` field (default to claude_code) | Same file |

### 2.3 Provider-Aware Hooks

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P2.3.1 | Create provider hook registry | Map provider → hook registration logic | `packages/cli/src/lib/provider-hooks.ts` |
| P2.3.2 | Abstract hook registration | `registerHooksForProvider(provider)` | Same file |
| P2.3.3 | Update hooks-file.ts | Use provider-specific paths | `packages/cli/src/lib/hooks-file.ts` |
| P2.3.4 | Guard non-active providers | Skip hook registration for coming_soon providers | Same file |

**Provider hooks abstraction:**

```typescript
// packages/cli/src/lib/provider-hooks.ts
import { PROVIDERS, ProviderInfo } from '@afterburn/shared';

interface ProviderHookConfig {
  settingsPath: (scope: 'global' | 'project', cwd: string) => string;
  hooks: Record<string, { command: string }[]>;
}

const PROVIDER_HOOKS: Record<string, ProviderHookConfig> = {
  claude_code: {
    settingsPath: (scope, cwd) =>
      scope === 'global'
        ? path.join(os.homedir(), '.claude', 'settings.json')
        : path.join(cwd, '.claude', 'settings.json'),
    hooks: {
      Stop: [{ command: 'afterburn hook stop' }],
      PostToolUse: [{ command: 'afterburn hook post-tool-use' }],
      Notification: [{ command: 'afterburn hook notification' }],
    },
  },
  // Codex will be added when implemented
};

export function getProviderHookConfig(providerId: string): ProviderHookConfig | null {
  const provider = PROVIDERS[providerId];
  if (!provider || provider.status !== 'active') {
    return null;
  }
  return PROVIDER_HOOKS[providerId] || null;
}
```

### 2.4 Provider-Aware Session Parsing

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P2.4.1 | Create session parser registry | Map provider → session parsing logic | `packages/cli/src/lib/session-parsers.ts` |
| P2.4.2 | Extract Claude Code parser | Move existing logic to provider-specific parser | Same file |
| P2.4.3 | Update session-log.ts | Use provider from config to select parser | `packages/cli/src/lib/session-log.ts` |

**Session parser abstraction:**

```typescript
// packages/cli/src/lib/session-parsers.ts
import { SessionData } from './session-log';

type SessionParser = (cwd: string) => Promise<SessionData | null>;

const SESSION_PARSERS: Record<string, SessionParser> = {
  claude_code: parseClaudeCodeSession,
  // codex: parseCodexSession,  // Future
};

export function getSessionParser(providerId: string): SessionParser | null {
  return SESSION_PARSERS[providerId] || null;
}
```

### 2.5 Update Stop Hook

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P2.5.1 | Read provider from config | Get current provider before parsing | `packages/cli/src/hooks/stop.ts` |
| P2.5.2 | Use provider-specific parser | Select parser based on provider | Same file |
| P2.5.3 | Include provider in payload | Ensure `tool_source` matches provider | Same file |

### 2.6 Update Status Command

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P2.6.1 | Show current provider | Display provider name in status output | `packages/cli/src/commands/status.ts` |
| P2.6.2 | Show provider-specific info | e.g., "Hooks registered for Claude Code" | Same file |

### 2.7 Add Provider Switch Command

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P2.7.1 | Create provider command | `afterburn provider` subcommand group | `packages/cli/src/commands/provider.ts` |
| P2.7.2 | Implement provider list | Show all providers with status | Same file |
| P2.7.3 | Implement provider switch | `afterburn provider switch <id>` (only active providers) | Same file |
| P2.7.4 | Re-register hooks on switch | Unregister old, register new | Same file |

---

## 3. Web Dashboard Updates (`apps/web`)

### 3.1 Terminology Updates

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P3.1.1 | Update Sidebar labels | "AI Tools" or "Providers" instead of tool-specific | `apps/web/components/dashboard/Sidebar.tsx` |
| P3.1.2 | Update page titles | Generic titles: "AI Coding Usage" not "Claude Code Usage" | Various page files |
| P3.1.3 | Update metric labels | "AI Tasks" not "Claude Code Tasks" | `apps/web/components/shared/MetricCard.tsx` |
| P3.1.4 | Update empty states | Generic messaging | Various components |

### 3.2 Provider Badges & Display

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P3.2.1 | Create ProviderBadge component | Small badge with provider icon/name | `apps/web/components/shared/ProviderBadge.tsx` |
| P3.2.2 | Add to task list | Show provider for each task | `apps/web/components/dashboard/tasks/TaskList.tsx` |
| P3.2.3 | Add to task detail panel | Provider info in expanded view | `apps/web/components/shared/TaskDetailPanel.tsx` |
| P3.2.4 | Add provider filter | Filter tasks by provider | `apps/web/components/dashboard/tasks/TaskFilters.tsx` |

**ProviderBadge component:**

```tsx
// apps/web/components/shared/ProviderBadge.tsx
import { PROVIDERS } from '@afterburn/shared';

interface ProviderBadgeProps {
  providerId: string;
  showLabel?: boolean;
}

export function ProviderBadge({ providerId, showLabel = true }: ProviderBadgeProps) {
  const provider = PROVIDERS[providerId];

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-xs">
      <ProviderIcon id={providerId} className="w-3 h-3" />
      {showLabel && <span>{provider?.displayName || providerId}</span>}
    </span>
  );
}
```

### 3.3 Provider Statistics

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P3.3.1 | Add provider breakdown to Overview | Pie/bar chart by provider | `apps/web/components/dashboard/overview/ProviderBreakdown.tsx` |
| P3.3.2 | Add provider column to exports | Include in CSV exports | `apps/web/lib/reports/csv-generator.ts` |
| P3.3.3 | Update cost page | Cost breakdown by provider | `apps/web/components/dashboard/cost/CostByProvider.tsx` |

---

## 4. Documentation Updates

### 4.1 CLI README

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P4.1.1 | Update installation section | Mention multi-provider support | `packages/cli/README.md` |
| P4.1.2 | Update Quick Start | Show provider selection step | Same file |
| P4.1.3 | Add provider command docs | Document `afterburn provider` | Same file |
| P4.1.4 | Update How It Works | Generic hook explanation | Same file |

### 4.2 CLAUDE.md

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P4.2.1 | Update project description | "AI coding tools" not just "Claude Code" | `CLAUDE.md` |
| P4.2.2 | Add provider architecture section | Document provider abstraction | Same file |
| P4.2.3 | Update CLI section | Provider-aware config and hooks | Same file |
| P4.2.4 | Update "What NOT to do" | Provider-specific constraints | Same file |

### 4.3 Main README

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P4.3.1 | Update project tagline | Multi-provider messaging | `README.md` |
| P4.3.2 | Add supported providers section | List with status badges | Same file |
| P4.3.3 | Update screenshots | Show provider selection | Same file |

---

## 5. Database Considerations

### 5.1 Schema (No Changes Required)

The current schema already supports multiple providers via `tool_source`:

```typescript
tool_source: text('tool_source').notNull().default('claude_code'),
```

No migration needed. The `tool_source` field will store the provider ID.

### 5.2 Query Updates

| Task ID | Task | Description | Files |
|---------|------|-------------|-------|
| P5.2.1 | Add provider filter to queries | `getTasksByProvider()` | `apps/web/lib/db/queries/tasks.ts` |
| P5.2.2 | Add provider stats query | `getProviderBreakdown()` | Same file |

---

## Summary

| Section | Tasks | Priority |
|---------|-------|----------|
| 1. Shared Package | 7 tasks | High |
| 2. CLI Updates | 17 tasks | High |
| 3. Web Dashboard | 10 tasks | Medium |
| 4. Documentation | 10 tasks | Medium |
| 5. Database | 2 tasks | Low |

**Total: 46 tasks**

---

## Implementation Order

1. **Shared Package** (P1.x) — Foundation for all other changes
2. **CLI Config & Init** (P2.1, P2.2) — User-facing provider selection
3. **CLI Hooks Abstraction** (P2.3, P2.4, P2.5) — Provider-aware internals
4. **CLI Commands** (P2.6, P2.7) — Status and provider management
5. **Web Dashboard** (P3.x) — Visual updates
6. **Documentation** (P4.x) — Final polish

---

## Notes

- **Backwards Compatibility:** Existing configs without `provider` field default to `claude_code`
- **Coming Soon UX:** Disabled providers show a badge, are not selectable, link to "notify me" signup
- **No Breaking Changes:** All existing functionality continues to work
- **Future Providers:** Adding a new provider requires:
  1. Add to `PROVIDERS` registry
  2. Implement session parser
  3. Implement hook registration (if supported)
  4. Update status to `active`

---

_End of Provider Abstraction Tasks_
