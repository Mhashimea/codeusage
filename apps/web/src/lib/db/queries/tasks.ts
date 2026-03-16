import { db } from "..";
import { tasks, type NewTask } from "../schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

/**
 * Insert a new task
 * CRITICAL: Always use workspace_id from authenticated workspace
 */
export async function insertTask(task: NewTask) {
  const [inserted] = await db.insert(tasks).values(task).returning();
  return inserted;
}

/**
 * Get task by ID
 * CRITICAL: Always verify workspace_id matches
 */
export async function getTaskById(taskId: string, workspaceId: string) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.workspace_id, workspaceId)))
    .limit(1);

  return task || null;
}

/**
 * Get tasks for a workspace with pagination and filters
 * CRITICAL: Always filter by workspace_id
 */
export async function getTasksByWorkspace(
  workspaceId: string,
  options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    developer?: string;
    project?: string;
  } = {}
) {
  const { limit = 50, offset = 0, startDate, endDate, developer, project } = options;

  const conditions = [eq(tasks.workspace_id, workspaceId)];

  if (startDate) {
    conditions.push(gte(tasks.created_at, startDate));
  }
  if (endDate) {
    conditions.push(lte(tasks.created_at, endDate));
  }
  if (developer) {
    conditions.push(eq(tasks.developer_alias, developer));
  }
  if (project) {
    conditions.push(eq(tasks.project_slug, project));
  }

  const result = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.created_at))
    .limit(limit)
    .offset(offset);

  return result;
}

/**
 * Get task statistics for a workspace
 * CRITICAL: Always filter by workspace_id
 */
export async function getTaskStats(
  workspaceId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const { startDate, endDate } = options;

  const conditions = [eq(tasks.workspace_id, workspaceId)];

  if (startDate) {
    conditions.push(gte(tasks.created_at, startDate));
  }
  if (endDate) {
    conditions.push(lte(tasks.created_at, endDate));
  }

  const [stats] = await db
    .select({
      total_tasks: sql<number>`count(*)::int`,
      total_input_tokens: sql<number>`coalesce(sum(${tasks.input_tokens}), 0)::int`,
      total_output_tokens: sql<number>`coalesce(sum(${tasks.output_tokens}), 0)::int`,
      total_cache_tokens: sql<number>`coalesce(sum(${tasks.cache_tokens}), 0)::int`,
      total_cost_usd: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      total_files_changed: sql<number>`coalesce(sum(${tasks.files_changed}), 0)::int`,
      total_duration_sec: sql<number>`coalesce(sum(${tasks.task_duration_sec}), 0)::int`,
      unique_developers: sql<number>`count(distinct ${tasks.developer_alias})::int`,
      unique_projects: sql<number>`count(distinct ${tasks.project_slug})::int`,
    })
    .from(tasks)
    .where(and(...conditions));

  return {
    total_tasks: stats.total_tasks,
    total_input_tokens: stats.total_input_tokens,
    total_output_tokens: stats.total_output_tokens,
    total_cache_tokens: stats.total_cache_tokens,
    total_cost_usd: parseFloat(stats.total_cost_usd),
    total_files_changed: stats.total_files_changed,
    total_duration_sec: stats.total_duration_sec,
    unique_developers: stats.unique_developers,
    unique_projects: stats.unique_projects,
  };
}

/**
 * Count tasks in workspace
 */
export async function countTasks(workspaceId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(eq(tasks.workspace_id, workspaceId));

  return result.count;
}
