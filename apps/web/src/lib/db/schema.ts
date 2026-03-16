import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/**
 * Workspaces table
 * Each workspace represents a team/organization using Afterburn
 */
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  api_key_hash: text("api_key_hash").notNull().unique(), // bcrypt hash — never store plaintext
  plan: text("plan").notNull().default("free"), // free | team | enterprise
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Tasks table
 * Each row represents a single Claude Code task completion
 */
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    developer_alias: text("developer_alias").notNull(),
    project_slug: text("project_slug").notNull(),
    tool_source: text("tool_source").notNull().default("claude_code"), // claude_code | codex
    model_name: text("model_name").notNull(),
    input_tokens: integer("input_tokens").notNull().default(0),
    output_tokens: integer("output_tokens").notNull().default(0),
    cache_tokens: integer("cache_tokens").notNull().default(0),
    cost_usd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull(),
    files_changed: integer("files_changed").notNull().default(0),
    tools_used: jsonb("tools_used").notNull().default([]), // Array<{ name: string; count: number }>
    task_duration_sec: integer("task_duration_sec").notNull().default(0),
    hook_scope: text("hook_scope").notNull().default("global"), // global | project
    cli_version: text("cli_version"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Every dashboard query filters by workspace_id + time — this index is mandatory
    index("idx_tasks_workspace_time").on(table.workspace_id, table.created_at),
    // Index for filtering by developer within a workspace
    index("idx_tasks_workspace_developer").on(table.workspace_id, table.developer_alias),
    // Index for filtering by project within a workspace
    index("idx_tasks_workspace_project").on(table.workspace_id, table.project_slug),
  ]
);

// Type exports for use in queries
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
