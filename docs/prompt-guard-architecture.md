# Prompt Guard — Architecture & Implementation Plan

**Version:** 0.3
**Status:** Planning
**Last Updated:** 2026-04-04

---

## 1. Executive Summary

Prompt Guard is a client-side credential detection system that intercepts prompts before they reach Claude Code. The entire check happens locally on the developer's machine — no prompt content is ever sent to Afterburn servers.

### Key Principles
- **100% Local Processing** — Pattern matching runs on developer machine
- **Fail Open** — Never block developer workflow due to infrastructure issues
- **Privacy First** — No prompt content stored or transmitted
- **Workspace Policy** — Admin controls, developers cannot override

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN DASHBOARD                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Settings → Prompt Guard                                             │   │
│  │  ┌─────────────────┐  ┌──────────────────────────────────────────┐  │   │
│  │  │ [Toggle ON/OFF] │  │ Built-in Pattern Categories              │  │   │
│  │  │                 │  │ ☑ AWS Credentials                        │  │   │
│  │  │ Enabled for     │  │ ☑ Database Connection Strings            │  │   │
│  │  │ workspace       │  │ ☑ Private Keys                           │  │   │
│  │  └─────────────────┘  │ ☑ API Keys & Tokens                      │  │   │
│  │                       │ ☑ Environment Variables                   │  │   │
│  │                       └──────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│                                     │ GET /api/v1/prompt-guard/settings      │
│                                     ▼                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Synced every 24h or on-demand
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEVELOPER MACHINE                                  │
│                                                                              │
│  ~/.afterburn/patterns.json                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ {                                                                    │   │
│  │   "enabled": true,                                                   │   │
│  │   "synced_at": "2026-04-04T10:30:00Z",                              │   │
│  │   "patterns": [                                                      │   │
│  │     { "id": "aws-access-key", "name": "AWS Access Key", ... },      │   │
│  │     { "id": "postgres-url", "name": "Database URL", ... }           │   │
│  │   ]                                                                  │   │
│  │ }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│                                     │ Read at prompt time                    │
│                                     ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  UserPromptSubmit Hook                                               │   │
│  │                                                                      │   │
│  │  Developer types prompt → Hook fires → Pattern check                 │   │
│  │                                           │                          │   │
│  │                                    ┌──────┴──────┐                   │   │
│  │                                    │             │                   │   │
│  │                                 MATCH         NO MATCH               │   │
│  │                                    │             │                   │   │
│  │                              Exit code 2    Exit code 0              │   │
│  │                              Prompt BLOCKED  Prompt ALLOWED          │   │
│  │                                    │             │                   │   │
│  │                              Show warning    Continue to             │   │
│  │                              to developer    Claude Code             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Nothing sent to Afterburn servers. Nothing logged. Nothing stored.         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow

### 3.1 Pattern Sync Flow (Background)

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│   CLI        │     │  Afterburn API      │     │  Database            │
│              │     │                     │     │                      │
│ afterburn    │────▶│ GET /api/v1/        │────▶│ prompt_guard_        │
│ patterns     │     │ prompt-guard/       │     │ settings             │
│ sync         │     │ settings            │     │ (workspace-level)    │
│              │◀────│                     │◀────│                      │
│              │     │ { enabled, patterns }│     │                      │
└──────┬───────┘     └─────────────────────┘     └──────────────────────┘
       │
       │ Write to local cache
       ▼
┌──────────────────────────┐
│ ~/.afterburn/patterns.json│
└──────────────────────────┘
```

### 3.2 Prompt Check Flow (Real-time)

```
┌────────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐
│ Developer  │    │ Claude Code     │    │ UserPromptSubmit │    │ Pattern     │
│            │    │                 │    │ Hook             │    │ Matcher     │
│ Types      │───▶│ Submits prompt  │───▶│ Fires before     │───▶│ Check       │
│ prompt     │    │                 │    │ AI processing    │    │ patterns.json│
│            │    │                 │    │                  │    │             │
│            │    │                 │    │                  │    │   Match?    │
│            │    │                 │    │                  │    │   ├── YES   │
│            │    │                 │    │                  │◀───│   │  exit 2 │
│            │◀───│                 │◀───│ Blocked/Allowed  │    │   └── NO    │
│ Sees       │    │ Continues or    │    │                  │    │      exit 0 │
│ warning    │    │ prompt blocked  │    │                  │    │             │
└────────────┘    └─────────────────┘    └──────────────────┘    └─────────────┘

                  ┌─────────────────────────────────────────────────┐
                  │  NO NETWORK CALL AT PROMPT TIME                 │
                  │  Everything happens locally in < 20ms           │
                  └─────────────────────────────────────────────────┘
```

---

## 4. Database Schema Changes

### 4.1 New Table: `prompt_guard_settings`

```typescript
// apps/web/src/lib/db/schema.ts

export const promptGuardSettings = pgTable("prompt_guard_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspace_id: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" })
    .unique(), // One settings row per workspace
  enabled: boolean("enabled").notNull().default(false),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  updated_by: uuid("updated_by").references(() => users.id),
});
```

### 4.2 Why No Custom Patterns Table (v0.3)

Custom patterns are deferred to v0.4. In v0.3, all patterns are built-in and shipped with the CLI. The database only stores the workspace-level enabled/disabled toggle.

---

## 5. API Changes

### 5.1 New Endpoint: `GET /api/v1/prompt-guard/settings`

**Purpose:** CLI fetches workspace Prompt Guard settings + pattern library

**Auth:** Bearer token (workspace API key)

**Response:**
```typescript
interface PromptGuardSettingsResponse {
  enabled: boolean;
  patterns: Pattern[];
  synced_at: string; // ISO timestamp
}

interface Pattern {
  id: string;           // "aws-access-key"
  name: string;         // "AWS Access Key"
  category: string;     // "aws" | "database" | "keys" | "tokens" | "env"
  regex: string;        // Pattern regex
  description: string;  // Human-readable explanation
}
```

**Example Response:**
```json
{
  "enabled": true,
  "patterns": [
    {
      "id": "aws-access-key",
      "name": "AWS Access Key",
      "category": "aws",
      "regex": "AKIA[0-9A-Z]{16}",
      "description": "AWS access key ID starting with AKIA"
    },
    {
      "id": "postgres-url",
      "name": "Database URL — Postgres",
      "category": "database",
      "regex": "postgres(ql)?:\\/\\/[^\\s]+:[^\\s]+@[^\\s]+",
      "description": "PostgreSQL connection string with credentials"
    }
  ],
  "synced_at": "2026-04-04T10:30:00.000Z"
}
```

### 5.2 New Endpoint: `PUT /api/v1/prompt-guard/settings`

**Purpose:** Admin toggles Prompt Guard on/off from dashboard

**Auth:** Session cookie (NextAuth) — Admin or Owner role required

**Request:**
```typescript
interface UpdatePromptGuardRequest {
  enabled: boolean;
}
```

**Response:**
```typescript
interface UpdatePromptGuardResponse {
  enabled: boolean;
  updated_at: string;
}
```

---

## 6. CLI Changes

### 6.1 New Files

```
packages/cli/
├── src/
│   ├── commands/
│   │   └── patterns.ts          # NEW: patterns subcommand group
│   ├── hooks/
│   │   └── user-prompt-submit.ts # NEW: UserPromptSubmit hook handler
│   └── lib/
│       ├── patterns.ts          # NEW: Pattern loading, matching, caching
│       └── built-in-patterns.ts # NEW: Default pattern definitions
```

### 6.2 Hook Registration Update

Add `UserPromptSubmit` hook to existing hook registration in `hooks-file.ts`:

```typescript
// Current hooks (existing)
{
  "hooks": {
    "Stop": [...],
    "PostToolUse": [...],
    "Notification": [...],
    // NEW: Add UserPromptSubmit
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "afterburn hook user-prompt-submit"
        }]
      }
    ]
  }
}
```

### 6.3 New Commands

```bash
# Subcommand group: afterburn patterns
afterburn patterns sync      # Force sync patterns from workspace
afterburn patterns status    # Show cache status
afterburn patterns list      # List all active patterns
afterburn patterns test      # Test a string against patterns
```

### 6.4 Pattern Cache File

**Location:** `~/.afterburn/patterns.json`

```typescript
interface PatternCache {
  enabled: boolean;
  synced_at: string;           // ISO timestamp
  workspace_id: string;        // For cache invalidation
  patterns: Pattern[];
  version: string;             // CLI version that synced
}
```

### 6.5 UserPromptSubmit Hook Handler

**File:** `packages/cli/src/hooks/user-prompt-submit.ts`

```typescript
// Receives prompt via stdin from Claude Code
// Exit codes:
//   0 = Allow prompt (no match or Prompt Guard disabled)
//   2 = Block prompt (pattern matched)

async function handleUserPromptSubmit(): Promise<void> {
  // 1. Read prompt from stdin
  const prompt = await readStdin();

  // 2. Load pattern cache (fail open if missing/corrupted)
  const cache = loadPatternCache();
  if (!cache || !cache.enabled) {
    process.exit(0); // Allow through
  }

  // 3. Check for stale cache (> 7 days)
  if (isCacheStale(cache)) {
    printWarning("Pattern cache is outdated. Run: afterburn patterns sync");
    process.exit(0); // Fail open
  }

  // 4. Match against patterns
  const match = findMatch(prompt, cache.patterns);

  if (match) {
    // 5. Print block message and exit with code 2
    printBlockMessage(match);
    process.exit(2);
  }

  // 6. No match — allow through
  process.exit(0);
}
```

---

## 7. Shared Package Changes

### 7.1 New Types

```typescript
// packages/shared/src/types.ts

export interface Pattern {
  id: string;
  name: string;
  category: PatternCategory;
  regex: string;
  description: string;
}

export type PatternCategory =
  | "aws"
  | "database"
  | "keys"
  | "tokens"
  | "env";

export interface PatternCache {
  enabled: boolean;
  synced_at: string;
  workspace_id: string;
  patterns: Pattern[];
  version: string;
}

export interface PatternMatch {
  pattern: Pattern;
  match: string;        // The matched substring (redacted)
  position: number;     // Character position in prompt
}

export interface PromptGuardSettings {
  enabled: boolean;
  updated_at: string;
}
```

### 7.2 New Schemas

```typescript
// packages/shared/src/schemas.ts

export const patternCategorySchema = z.enum([
  "aws", "database", "keys", "tokens", "env"
]);

export const patternSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: patternCategorySchema,
  regex: z.string(),
  description: z.string(),
});

export const patternCacheSchema = z.object({
  enabled: z.boolean(),
  synced_at: z.string().datetime(),
  workspace_id: z.string().uuid(),
  patterns: z.array(patternSchema),
  version: z.string(),
});

export const promptGuardSettingsSchema = z.object({
  enabled: z.boolean(),
  updated_at: z.string().datetime(),
});
```

---

## 8. Built-in Patterns (v0.3)

Shipped with CLI, not fetched from server. Categorized for future dashboard display.

```typescript
// packages/cli/src/lib/built-in-patterns.ts

export const BUILT_IN_PATTERNS: Pattern[] = [
  // AWS
  {
    id: "aws-access-key",
    name: "AWS Access Key",
    category: "aws",
    regex: "AKIA[0-9A-Z]{16}",
    description: "AWS access key ID starting with AKIA"
  },
  {
    id: "aws-secret-key",
    name: "AWS Secret Key",
    category: "aws",
    regex: "(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\\s*[=:]\\s*[A-Za-z0-9/+=]{40}",
    description: "AWS secret access key in config format"
  },

  // Database
  {
    id: "postgres-url",
    name: "Database URL — Postgres",
    category: "database",
    regex: "postgres(?:ql)?:\\/\\/[^\\s:]+:[^\\s@]+@[^\\s]+",
    description: "PostgreSQL connection string with password"
  },
  {
    id: "mysql-url",
    name: "Database URL — MySQL",
    category: "database",
    regex: "mysql:\\/\\/[^\\s:]+:[^\\s@]+@[^\\s]+",
    description: "MySQL connection string with password"
  },
  {
    id: "mongodb-url",
    name: "Database URL — MongoDB",
    category: "database",
    regex: "mongodb(?:\\+srv)?:\\/\\/[^\\s:]+:[^\\s@]+@[^\\s]+",
    description: "MongoDB connection string with password"
  },

  // Private Keys
  {
    id: "private-rsa-key",
    name: "Private RSA Key",
    category: "keys",
    regex: "-----BEGIN RSA PRIVATE KEY-----",
    description: "RSA private key PEM block"
  },
  {
    id: "private-ec-key",
    name: "Private EC Key",
    category: "keys",
    regex: "-----BEGIN EC PRIVATE KEY-----",
    description: "Elliptic curve private key PEM block"
  },
  {
    id: "private-key-generic",
    name: "Generic Private Key",
    category: "keys",
    regex: "-----BEGIN PRIVATE KEY-----",
    description: "Generic private key PEM block"
  },

  // API Tokens
  {
    id: "github-pat",
    name: "GitHub Personal Token",
    category: "tokens",
    regex: "ghp_[A-Za-z0-9]{36}",
    description: "GitHub personal access token"
  },
  {
    id: "github-oauth",
    name: "GitHub OAuth Token",
    category: "tokens",
    regex: "gho_[A-Za-z0-9]{36}",
    description: "GitHub OAuth token"
  },
  {
    id: "slack-bot",
    name: "Slack Bot Token",
    category: "tokens",
    regex: "xoxb-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24}",
    description: "Slack bot token"
  },
  {
    id: "slack-user",
    name: "Slack User Token",
    category: "tokens",
    regex: "xoxp-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24}",
    description: "Slack user token"
  },
  {
    id: "stripe-secret",
    name: "Stripe Secret Key",
    category: "tokens",
    regex: "sk_live_[A-Za-z0-9]{24,}",
    description: "Stripe live secret key"
  },
  {
    id: "openai-key",
    name: "OpenAI API Key",
    category: "tokens",
    regex: "sk-[A-Za-z0-9]{32,}",
    description: "OpenAI API key"
  },
  {
    id: "anthropic-key",
    name: "Anthropic API Key",
    category: "tokens",
    regex: "sk-ant-[A-Za-z0-9-]{32,}",
    description: "Anthropic API key"
  },
  {
    id: "google-api-key",
    name: "Google API Key",
    category: "tokens",
    regex: "AIzaSy[A-Za-z0-9_-]{33}",
    description: "Google API key"
  },
  {
    id: "jwt-token",
    name: "JWT Token",
    category: "tokens",
    regex: "eyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+",
    description: "JSON Web Token"
  },

  // Environment Variables
  {
    id: "env-secret",
    name: ".env Secret",
    category: "env",
    regex: "(?:PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY|DATABASE_URL)\\s*=\\s*['\"]?[^\\s'\"]+",
    description: "Environment variable with sensitive key name"
  },
  {
    id: "high-entropy-secret",
    name: "High-Entropy Secret",
    category: "env",
    regex: "(?:api_key|apikey|secret|password|token)\\s*[=:]\\s*['\"]?[A-Za-z0-9+/]{32,}['\"]?",
    description: "Long random string after secret-like key name"
  }
];
```

---

## 9. Dashboard UI Changes

### 9.1 New Page: Prompt Guard (`/app/guard`)

Prompt Guard gets its own dedicated page accessible from the sidebar navigation.

**Route:** `/app/guard`
**Location:** `apps/web/src/app/app/guard/page.tsx`

**Features:**
- Toggle switch to enable/disable Prompt Guard (admin only)
- Full pattern library organized by category
- Pattern details table (name, description, example format, status)
- Stats row (pattern count, version, privacy mode)
- Info boxes for privacy explanation and v0.4 preview

### 9.2 Component Hierarchy

```
GuardPage (/app/guard)
├── PageHeader
│   ├── Title + Status Badge
│   └── EnableToggle (admin only)
├── StatsRow
│   ├── ActivePatterns
│   ├── LastUpdate
│   └── PrivacyMode
├── PatternSection (AWS)
│   └── PatternTable
├── PatternSection (Database)
│   └── PatternTable
├── PatternSection (Keys)
│   └── PatternTable
├── PatternSection (Tokens)
│   └── PatternTable
├── PatternSection (Environment)
│   └── PatternTable
└── InfoBoxes
    ├── PrivacyInfo
    └── ComingSoonInfo (v0.4)

SettingsPage (unchanged)
├── ApiKeySection
├── MembersSection
├── DeveloperRoster
└── WorkspaceConfig
```

### 9.3 Sidebar Navigation Update

Add Prompt Guard to sidebar navigation between Projects and Settings:

```tsx
// apps/web/src/components/dashboard/Sidebar.tsx
<SidebarItem href="/app/guard" icon={ShieldIcon}>
  Prompt Guard
</SidebarItem>
```

---

## 10. Implementation Order

### Phase 1: Core Infrastructure (Week 1)
1. Add `prompt_guard_settings` table + migration
2. Add API endpoints (`GET`/`PUT` `/api/v1/prompt-guard/settings`)
3. Add shared types and schemas
4. Add built-in patterns to CLI

### Phase 2: CLI Hook (Week 1-2)
1. Implement `user-prompt-submit.ts` hook handler
2. Implement pattern matching logic
3. Implement pattern cache file management
4. Update hook registration in `hooks-file.ts`
5. Implement `afterburn patterns` subcommand group

### Phase 3: Dashboard UI (Week 2)
1. Create `PromptGuardSection` component
2. Add toggle API integration
3. Add pattern category display
4. Update Settings page layout

### Phase 4: Testing & Polish (Week 2)
1. Unit tests for pattern matching
2. Integration tests for hook behavior
3. E2E tests for dashboard toggle
4. Documentation updates

---

## 11. Security Considerations

### 11.1 What We DO Store (Server)
- `prompt_guard_settings.enabled` — Boolean toggle per workspace
- `prompt_guard_settings.updated_at` — Timestamp
- `prompt_guard_settings.updated_by` — User who changed setting

### 11.2 What We DON'T Store (Server)
- Prompt content (NEVER)
- Blocked prompt content (NEVER)
- Pattern match details (NEVER)
- Number of blocked prompts (NEVER)

### 11.3 What We Store Locally (Developer Machine)
- `~/.afterburn/patterns.json` — Pattern cache (no prompts)
- Nothing else related to Prompt Guard

### 11.4 Fail-Safe Behavior
| Scenario | Behavior |
|----------|----------|
| Cache missing | Fail open — prompt allowed |
| Cache corrupted | Fail open — warn user |
| Cache > 7 days old | Fail open — warn user |
| Hook script crashes | Fail open — Claude Code continues |
| Network unavailable | Use last known cache |

---

## 12. Testing Strategy

### 12.1 Unit Tests
- Pattern regex validation
- Pattern matching logic
- Cache loading/saving
- Cache staleness detection

### 12.2 Integration Tests
- Hook fires correctly on prompt submit
- Exit code 0 when no match
- Exit code 2 when match found
- Pattern sync API works

### 12.3 E2E Tests
- Admin enables Prompt Guard in dashboard
- Developer syncs patterns
- Prompt with AWS key is blocked
- Prompt without secrets is allowed

---

## 13. Rollout Plan

### 13.1 Feature Flag
Not needed — Prompt Guard is opt-in via dashboard toggle. Disabled by default.

### 13.2 Migration
- Existing workspaces: Prompt Guard disabled by default
- New workspaces: Prompt Guard disabled by default
- No automatic enablement — admin must explicitly turn on

### 13.3 CLI Compatibility
- CLI v0.2.x: No Prompt Guard support
- CLI v0.3.0+: Full Prompt Guard support
- Older CLI versions will not have `UserPromptSubmit` hook registered

---

## 14. Future Enhancements (v0.4+)

| Feature | Version | Notes |
|---------|---------|-------|
| Custom patterns | v0.4 | Admin defines regex in dashboard |
| Codex integration | v0.4 | When Codex hook matures |
| Pattern allowlist | v0.4 | Temporarily allow a pattern |
| Pattern testing UI | v0.4 | Test regex in dashboard |
| Community patterns | Post-v0.4 | Marketplace concept |

---

## 15. Open Questions

1. **Hook availability:** Is `UserPromptSubmit` stable in Claude Code? Need to verify exact behavior and stdin format.

2. **Pattern sync frequency:** 24 hours default — is this too aggressive or too conservative?

3. **Cache location:** `~/.afterburn/patterns.json` — should this be in a subdirectory for organization?

4. **Error reporting:** When a developer runs into a corrupted cache, should we auto-sync or just warn?

---

_Afterburn Prompt Guard Architecture — v0.3_
