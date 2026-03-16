CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"developer_alias" text NOT NULL,
	"project_slug" text NOT NULL,
	"tool_source" text DEFAULT 'claude_code' NOT NULL,
	"model_name" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cache_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 6) NOT NULL,
	"files_changed" integer DEFAULT 0 NOT NULL,
	"tools_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"task_duration_sec" integer DEFAULT 0 NOT NULL,
	"hook_scope" text DEFAULT 'global' NOT NULL,
	"cli_version" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"api_key_hash" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_api_key_hash_unique" UNIQUE("api_key_hash")
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tasks_workspace_time" ON "tasks" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_tasks_workspace_developer" ON "tasks" USING btree ("workspace_id","developer_alias");--> statement-breakpoint
CREATE INDEX "idx_tasks_workspace_project" ON "tasks" USING btree ("workspace_id","project_slug");