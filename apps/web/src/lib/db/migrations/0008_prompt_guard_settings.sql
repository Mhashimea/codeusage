-- Prompt Guard settings table
-- Stores workspace-level Prompt Guard configuration (enabled/disabled toggle)

CREATE TABLE IF NOT EXISTS "prompt_guard_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL UNIQUE REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "enabled" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_prompt_guard_workspace" ON "prompt_guard_settings" ("workspace_id");
