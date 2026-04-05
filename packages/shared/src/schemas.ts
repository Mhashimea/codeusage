import { z } from "zod";

/**
 * Tool usage schema
 */
export const toolUsageSchema = z.object({
  name: z.string().min(1),
  count: z.number().int().min(0),
});

/**
 * File change type enum
 */
export const fileChangeTypeSchema = z.enum(["created", "modified", "deleted"]);

/**
 * File change detail schema
 */
export const fileChangeDetailSchema = z.object({
  path: z.string().min(1),
  additions: z.number().int().min(0),
  deletions: z.number().int().min(0),
  change_type: fileChangeTypeSchema,
});

/**
 * Tool source enum
 */
export const toolSourceSchema = z.enum(["claude_code", "codex"]);

/**
 * Hook scope enum
 */
export const hookScopeSchema = z.enum(["global", "project"]);

/**
 * Telemetry payload schema - validates CLI requests
 */
export const telemetryPayloadSchema = z.object({
  developer_alias: z.string().min(1).max(100),
  project_slug: z.string().min(1).max(200),
  tool_source: toolSourceSchema,
  model_name: z.string().min(1).max(100),
  input_tokens: z.number().int().min(0),
  output_tokens: z.number().int().min(0),
  cache_tokens: z.number().int().min(0),
  cost_usd: z.number().min(0).max(50), // Sanity check: no single task costs > $50
  files_changed: z.number().int().min(0),
  files_created: z.number().int().min(0),
  files_modified: z.number().int().min(0),
  files_deleted: z.number().int().min(0),
  files_changed_details: z.array(fileChangeDetailSchema).default([]),
  tools_used: z.array(toolUsageSchema),
  task_duration_sec: z.number().int().min(0),
  hook_scope: hookScopeSchema,
  cli_version: z.string().min(1).max(50),
  session_id: z.string().max(200).optional(),
});

/**
 * Task record schema - full record including server-generated fields
 */
export const taskRecordSchema = telemetryPayloadSchema.extend({
  task_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  created_at: z.string().datetime(),
});

/**
 * CLI configuration schema
 */
export const codeUsageConfigSchema = z.object({
  workspace_key: z.string(),
  developer_alias: z.string(),
  provider: toolSourceSchema.default("claude_code"),
  hook_scope: hookScopeSchema,
  default_project: z.string(),
  project_overrides: z.record(z.string(), z.string()),
});

/**
 * Workspace info schema (returned during auth validation)
 */
export const workspaceInfoSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  plan: z.enum(["free", "team", "enterprise"]),
});

/**
 * API key format validation
 * Format: cu-ws-{36 hex chars}
 */
export const apiKeySchema = z
  .string()
  .regex(/^cu-ws-[a-f0-9]{36}$/, "Invalid API key format");

/**
 * Task create response schema
 */
export const taskCreateResponseSchema = z.object({
  task_id: z.string().uuid(),
});

/**
 * API error response schema
 */
export const apiErrorResponseSchema = z.object({
  error: z.string(),
});

/**
 * Codex event type enum
 */
export const codexEventTypeSchema = z.enum([
  "session.start",
  "turn.started",
  "turn.completed",
  "tool.use",
  "session.stop",
]);

/**
 * Codex token usage schema
 */
export const codexTokenUsageSchema = z.object({
  input_tokens: z.number().int().min(0),
  cached_input_tokens: z.number().int().min(0),
  output_tokens: z.number().int().min(0),
});

/**
 * Codex turn context schema
 */
export const codexTurnContextSchema = z.object({
  model: z.string().optional(),
  turn_id: z.string().optional(),
});

/**
 * Codex session event schema
 */
export const codexSessionEventSchema = z.object({
  type: codexEventTypeSchema,
  timestamp: z.string().optional(),
  usage: codexTokenUsageSchema.optional(),
  turn_context: codexTurnContextSchema.optional(),
  tool_name: z.string().optional(),
  tool_id: z.string().optional(),
});

/**
 * Parsed session data schema (unified format)
 */
export const parsedSessionDataSchema = z.object({
  provider: toolSourceSchema,
  model: z.string(),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  cacheTokens: z.number().int().min(0),
  sessionId: z.string().optional(),
  toolsUsed: z.array(toolUsageSchema),
});

// ============================================
// Prompt Guard Schemas
// ============================================

/**
 * Pattern category enum
 */
export const patternCategorySchema = z.enum([
  "aws",
  "database",
  "keys",
  "tokens",
  "env",
]);

/**
 * Single pattern schema
 */
export const patternSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: patternCategorySchema,
  regex: z.string().min(1),
  description: z.string(),
});

/**
 * Pattern match result schema
 */
export const patternMatchSchema = z.object({
  pattern: patternSchema,
  position: z.number().int().min(0),
});

/**
 * Local pattern cache schema
 */
export const patternCacheSchema = z.object({
  enabled: z.boolean(),
  synced_at: z.string().datetime(),
  workspace_id: z.string().optional(), // Optional - not used in pattern matching
  patterns: z.array(patternSchema),
  version: z.string(),
});

/**
 * Prompt Guard settings schema (from database)
 */
export const promptGuardSettingsSchema = z.object({
  enabled: z.boolean(),
  disabled_patterns: z.array(z.string()),
  disabled_categories: z.array(z.string()),
  updated_at: z.string().datetime(),
});

/**
 * Prompt Guard settings API response schema
 */
export const promptGuardSettingsResponseSchema = z.object({
  enabled: z.boolean(),
  patterns: z.array(patternSchema), // Only enabled patterns
  disabled_patterns: z.array(z.string()),
  disabled_categories: z.array(z.string()),
  synced_at: z.string().datetime(),
});

/**
 * Update Prompt Guard settings request schema (master toggle)
 */
export const updatePromptGuardSettingsSchema = z.object({
  enabled: z.boolean(),
});

/**
 * Update pattern toggle request schema
 */
export const updatePatternToggleSchema = z.object({
  pattern_id: z.string().optional(),
  category: z.string().optional(),
  enabled: z.boolean(),
}).refine(
  (data) => data.pattern_id !== undefined || data.category !== undefined,
  { message: "Either pattern_id or category must be provided" }
);

// Type exports inferred from schemas
export type ToolUsageInput = z.infer<typeof toolUsageSchema>;
export type TelemetryPayloadInput = z.infer<typeof telemetryPayloadSchema>;
export type TaskRecordInput = z.infer<typeof taskRecordSchema>;
export type CodeusageConfigInput = z.infer<typeof codeUsageConfigSchema>;
export type WorkspaceInfoInput = z.infer<typeof workspaceInfoSchema>;
export type CodexSessionEventInput = z.infer<typeof codexSessionEventSchema>;
export type ParsedSessionDataInput = z.infer<typeof parsedSessionDataSchema>;
export type PatternInput = z.infer<typeof patternSchema>;
export type PatternCacheInput = z.infer<typeof patternCacheSchema>;
export type PromptGuardSettingsInput = z.infer<typeof promptGuardSettingsSchema>;
export type UpdatePromptGuardSettingsInput = z.infer<typeof updatePromptGuardSettingsSchema>;
export type UpdatePatternToggleInput = z.infer<typeof updatePatternToggleSchema>;
