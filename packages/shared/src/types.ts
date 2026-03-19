/**
 * Represents a single tool usage within a task
 */
export interface ToolUsage {
  name: string;
  count: number;
}

/**
 * Represents a file change with addition/deletion stats
 */
export interface FileChangeDetail {
  path: string;
  additions: number;
  deletions: number;
}

/**
 * Tool source - which AI coding tool generated the task
 */
export type ToolSource = "claude_code" | "codex";

/**
 * Hook scope - where the Afterburn hook is registered
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
  files_changed_details: FileChangeDetail[];
  tools_used: ToolUsage[];
  task_duration_sec: number;
  hook_scope: HookScope;
  cli_version: string;
  session_id?: string; // Claude Code or Codex session identifier
}

/**
 * CLI configuration stored in ~/.afterburn/config.json
 */
export interface AfterBurnConfig {
  workspace_key: string;
  developer_alias: string;
  /** Selected AI coding tool provider */
  provider: ToolSource;
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
