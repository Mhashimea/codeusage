import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import type { ToolUsage, FileChangeDetail } from "@codeusage/shared";

// Enums
export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "member"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "expired", "revoked"]);

/**
 * Users table
 * Each row represents an individual user account
 * A user can belong to multiple workspaces with different roles
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name"),
    avatar_url: text("avatar_url"),
    current_workspace_id: uuid("current_workspace_id"), // Currently selected workspace (null if none)
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_users_email").on(table.email),
  ]
);

/**
 * Workspaces table
 * Each workspace represents a team/organization using Codeusage
 */
export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(), // Workspace name (e.g. "Acme Engineering")
    owner_id: uuid("owner_id").references(() => users.id, { onDelete: "restrict" }), // Owner cannot be deleted while workspace exists
    api_key_hash: text("api_key_hash").unique(), // bcrypt hash for CLI API key
    api_key_prefix: text("api_key_prefix"), // First 12 chars for O(1) lookup (e.g. "ab-ws-4f9a2c")
    plan: text("plan").notNull().default("free"), // free | team | enterprise
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_workspaces_api_key_prefix").on(table.api_key_prefix),
    index("idx_workspaces_owner").on(table.owner_id),
  ]
);

/**
 * Workspace members table
 * Links users to workspaces with their role
 * A user can be a member of multiple workspaces
 */
export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    invited_by: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    joined_at: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_workspace_members_unique").on(table.workspace_id, table.user_id),
    index("idx_workspace_members_user").on(table.user_id),
    index("idx_workspace_members_workspace").on(table.workspace_id),
  ]
);

/**
 * Invitations table
 * Tracks pending invitations to join a workspace
 * Invitations expire after 7 days
 */
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspace_id: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(), // Email of the invitee
    role: memberRoleEnum("role").notNull().default("member"), // Role to assign on acceptance
    token_hash: text("token_hash").notNull(), // bcrypt hash of invitation token
    status: invitationStatusEnum("status").notNull().default("pending"),
    invited_by: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires_at: timestamp("expires_at").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_invitations_workspace").on(table.workspace_id),
    index("idx_invitations_email").on(table.email),
    index("idx_invitations_token").on(table.token_hash),
    index("idx_invitations_status").on(table.status),
  ]
);

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
    files_created: integer("files_created").notNull().default(0),
    files_modified: integer("files_modified").notNull().default(0),
    files_deleted: integer("files_deleted").notNull().default(0),
    files_changed_details: jsonb("files_changed_details").$type<FileChangeDetail[]>().notNull().default([]),
    tools_used: jsonb("tools_used").$type<ToolUsage[]>().notNull().default([]),
    task_duration_sec: integer("task_duration_sec").notNull().default(0),
    hook_scope: text("hook_scope").notNull().default("global"), // global | project
    cli_version: text("cli_version"),
    session_id: text("session_id"), // Claude Code or Codex session identifier
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

/**
 * Verification tokens table for magic link / OTP authentication
 * Tokens expire after 5 minutes and are deleted after use
 * Brute force protection: max 5 attempts per token
 */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    token_hash: text("token_hash").notNull(), // bcrypt hash of 6-digit OTP (not plaintext!)
    attempts: integer("attempts").notNull().default(0), // Track failed verification attempts
    expires_at: timestamp("expires_at").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_verification_tokens_email").on(table.email),
    index("idx_verification_tokens_expires").on(table.expires_at), // For cleanup queries
  ]
);

/**
 * Rate limiting table for distributed rate limiting across serverless instances
 * Used for IP-based and email-based rate limiting
 */
export const rateLimits = pgTable(
  "rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(), // Format: "ip:{ip}" or "email:{email}" or "api:{workspace_id}"
    count: integer("count").notNull().default(1),
    window_start: timestamp("window_start").defaultNow().notNull(),
    expires_at: timestamp("expires_at").notNull(),
  },
  (table) => [
    index("idx_rate_limits_key").on(table.key),
    index("idx_rate_limits_expires").on(table.expires_at), // For cleanup
  ]
);

// Type exports for use in queries
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;

// Role type for use in authorization
export type MemberRole = "owner" | "admin" | "member";
