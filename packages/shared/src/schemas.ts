import { z } from "zod";

/**
 * Tool usage schema
 */
export const toolUsageSchema = z.object({
  name: z.string().min(1),
  count: z.number().int().min(0),
});

/**
 * File change detail schema
 */
export const fileChangeDetailSchema = z.object({
  path: z.string().min(1),
  additions: z.number().int().min(0),
  deletions: z.number().int().min(0),
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
export const afterBurnConfigSchema = z.object({
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
 * Format: ab-ws-{36 hex chars}
 */
export const apiKeySchema = z
  .string()
  .regex(/^ab-ws-[a-f0-9]{36}$/, "Invalid API key format");

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

// Type exports inferred from schemas
export type ToolUsageInput = z.infer<typeof toolUsageSchema>;
export type TelemetryPayloadInput = z.infer<typeof telemetryPayloadSchema>;
export type TaskRecordInput = z.infer<typeof taskRecordSchema>;
export type AfterBurnConfigInput = z.infer<typeof afterBurnConfigSchema>;
export type WorkspaceInfoInput = z.infer<typeof workspaceInfoSchema>;
