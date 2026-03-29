import { NextRequest, NextResponse } from "next/server";
import { telemetryPayloadSchema } from "@codeusage/shared";
import { getWorkspaceByApiKey } from "@/lib/db/queries/workspaces";
import { insertTask } from "@/lib/db/queries/tasks";
import { broadcastToWorkspace } from "@/app/api/v1/stream/route";
import { rateLimiters } from "@/lib/rate-limit";

/**
 * POST /api/v1/tasks
 * Task ingestion endpoint for CLI
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Read Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const apiKey = authHeader.slice(7); // Remove "Bearer " prefix

    // 2. Verify API key and get workspace
    const workspace = await getWorkspaceByApiKey(apiKey);
    if (!workspace) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // 3. Check rate limit (database-backed for serverless)
    const rateCheck = await rateLimiters.taskIngestion(workspace.id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfter || 60) }
        }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const parseResult = telemetryPayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const payload = parseResult.data;

    // 5. Sanity check: reject if cost > $50
    if (payload.cost_usd > 50) {
      console.error(
        `[ANOMALY] Task cost exceeds $50: workspace=${workspace.id}, cost=${payload.cost_usd}`
      );
      return NextResponse.json(
        { error: "Task cost exceeds sanity threshold ($50). Please verify your calculations." },
        { status: 400 }
      );
    }

    // 6. Insert task into database
    const task = await insertTask({
      workspace_id: workspace.id,
      developer_alias: payload.developer_alias,
      project_slug: payload.project_slug,
      tool_source: payload.tool_source,
      model_name: payload.model_name,
      input_tokens: payload.input_tokens,
      output_tokens: payload.output_tokens,
      cache_tokens: payload.cache_tokens,
      cost_usd: String(payload.cost_usd), // Drizzle expects string for numeric
      files_changed: payload.files_changed,
      files_created: payload.files_created,
      files_modified: payload.files_modified,
      files_deleted: payload.files_deleted,
      files_changed_details: payload.files_changed_details,
      tools_used: payload.tools_used,
      task_duration_sec: payload.task_duration_sec,
      hook_scope: payload.hook_scope,
      cli_version: payload.cli_version,
      session_id: payload.session_id,
    });

    // 7. Broadcast new task to connected dashboard clients
    broadcastToWorkspace(workspace.id, {
      type: "new_task",
      task: {
        id: task.id,
        developer_alias: task.developer_alias,
        project_slug: task.project_slug,
        cost_usd: task.cost_usd,
        input_tokens: task.input_tokens,
        output_tokens: task.output_tokens,
        created_at: task.created_at.toISOString(),
      },
    });

    // 8. Return success
    return NextResponse.json(
      { task_id: task.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/v1/tasks] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
