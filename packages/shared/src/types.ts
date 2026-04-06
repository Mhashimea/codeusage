/**
 * Represents a single tool usage within a task
 */
export interface ToolUsage {
  name: string;
  count: number;
}

/**
 * Type of file change
 */
export type FileChangeType = "created" | "modified" | "deleted";

/**
 * Represents a file change with addition/deletion stats
 */
export interface FileChangeDetail {
  path: string;
  additions: number;
  deletions: number;
  change_type: FileChangeType;
}

/**
 * Tool source - which AI coding tool generated the task
 */
export type ToolSource = "claude_code" | "codex";

/**
 * Hook scope - where the Codeusage hook is registered
 */
export type HookScope = "global" | "project";

/**
 * Complete task record as stored in the database
 */
export interface TaskRecord {
  task_id: string;
  workspace_id: string;
  developer_alias: string;
  project_slug: string;
  tool_source: ToolSource;
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  cost_usd: number;
  files_changed: number;
  files_created: number;
  files_modified: number;
  files_deleted: number;
  files_changed_details: FileChangeDetail[];
  tools_used: ToolUsage[];
  task_duration_sec: number;
  hook_scope: HookScope;
  cli_version: string;
  session_id?: string; // Claude Code or Codex session identifier
  created_at: string; // ISO 8601 timestamp
}

/**
 * Telemetry payload sent from CLI to API
 * Does not include task_id (generated server-side) or workspace_id (from API key)
 */
export interface TelemetryPayload {
  developer_alias: string;
  project_slug: string;
  tool_source: ToolSource;
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  cost_usd: number;
  files_changed: number;
  files_created: number;
  files_modified: number;
  files_deleted: number;
  files_changed_details: FileChangeDetail[];
  tools_used: ToolUsage[];
  task_duration_sec: number;
  hook_scope: HookScope;
  cli_version: string;
  session_id?: string; // Claude Code or Codex session identifier
}

/**
 * CLI configuration stored in ~/.codeusage/config.json
 */
export interface CodeusageConfig {
  workspace_key: string;
  developer_alias: string;
  /** Primary AI coding tool provider (for backwards compatibility) */
  provider: ToolSource;
  /** List of all enabled providers */
  providers?: ToolSource[];
  hook_scope: HookScope;
  default_project: string;
  /** Maps directory path to project slug, or "__ignored__" to skip */
  project_overrides: Record<string, string>;
  /** Optional custom API URL (for development/self-hosted) */
  api_url?: string;
}

/**
 * Workspace configuration (subset exposed to CLI during auth)
 */
export interface WorkspaceInfo {
  id: string;
  name: string;
  plan: "free" | "team" | "enterprise";
}

/**
 * API response for successful task creation
 */
export interface TaskCreateResponse {
  task_id: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  error: string;
}

/**
 * Model pricing information
 */
export interface ModelPricing {
  input: number; // per 1M tokens
  output: number; // per 1M tokens
  cache: number; // per 1M tokens
}

/**
 * Codex session log event types
 */
export type CodexEventType =
  | "session.start"
  | "turn.started"
  | "turn.completed"
  | "tool.use"
  | "session.stop";

/**
 * Codex token usage from turn.completed events
 */
export interface CodexTokenUsage {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
}

/**
 * Codex turn context metadata
 */
export interface CodexTurnContext {
  model?: string;
  turn_id?: string;
}

/**
 * Codex session log event structure
 */
export interface CodexSessionEvent {
  type: CodexEventType;
  timestamp?: string;
  usage?: CodexTokenUsage;
  turn_context?: CodexTurnContext;
  tool_name?: string;
  tool_id?: string;
}

/**
 * Parsed session data (unified format for both providers)
 */
export interface ParsedSessionData {
  provider: ToolSource;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  sessionId?: string;
  toolsUsed: ToolUsage[];
}

// ============================================
// Prompt Guard Types
// ============================================

/**
 * Pattern category for grouping credential detection patterns
 */
export type PatternCategory = "aws" | "database" | "keys" | "tokens" | "env";

/**
 * A single credential detection pattern
 */
export interface Pattern {
  id: string;
  name: string;
  category: PatternCategory;
  regex: string;
  description: string;
}

/**
 * Pattern match result when a credential is detected
 */
export interface PatternMatch {
  pattern: Pattern;
  position: number; // Character position in prompt where match starts
}

/**
 * Local pattern cache stored on developer machine
 * Location: ~/.codeusage/patterns.json
 */
export interface PatternCache {
  enabled: boolean;
  synced_at: string; // ISO 8601 timestamp
  workspace_id?: string; // Optional - not used in pattern matching
  patterns: Pattern[];
  version: string; // CLI version that synced
}

/**
 * Prompt Guard settings stored in database (workspace-level)
 */
export interface PromptGuardSettings {
  enabled: boolean;
  disabled_patterns: string[]; // Pattern IDs that are disabled
  disabled_categories: string[]; // Category IDs that are fully disabled
  updated_at: string; // ISO 8601 timestamp
}

/**
 * API response for GET /api/v1/prompt-guard/settings
 * Returns only enabled patterns (filtered by disabled_patterns/disabled_categories)
 */
export interface PromptGuardSettingsResponse {
  enabled: boolean;
  patterns: Pattern[]; // Only enabled patterns
  disabled_patterns: string[]; // For UI to know what's disabled
  disabled_categories: string[]; // For UI to know what categories are disabled
  synced_at: string; // ISO 8601 timestamp
}

/**
 * Request body for updating pattern/category toggles
 */
export interface UpdatePatternToggleRequest {
  pattern_id?: string; // Toggle a specific pattern
  category?: string; // Toggle an entire category
  enabled: boolean; // true = enable, false = disable
}
