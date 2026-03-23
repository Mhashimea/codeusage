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
    provider?: string;
  } = {}
) {
  const { limit = 50, offset = 0, startDate, endDate, developer, project, provider } = options;

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
  if (provider) {
    conditions.push(eq(tasks.tool_source, provider));
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

/**
 * Count tasks with filters
 * CRITICAL: Always filter by workspace_id
 */
export async function countTasksFiltered(
  workspaceId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    developer?: string;
    project?: string;
    provider?: string;
  } = {}
) {
  const { startDate, endDate, developer, project, provider } = options;

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
  if (provider) {
    conditions.push(eq(tasks.tool_source, provider));
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(...conditions));

  return result.count;
}

/**
 * Get top projects by token volume
 * CRITICAL: Always filter by workspace_id
 */
export async function getTopProjects(
  workspaceId: string,
  options: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const { limit = 5, startDate, endDate } = options;

  const conditions = [eq(tasks.workspace_id, workspaceId)];

  if (startDate) {
    conditions.push(gte(tasks.created_at, startDate));
  }
  if (endDate) {
    conditions.push(lte(tasks.created_at, endDate));
  }

  const result = await db
    .select({
      project_slug: tasks.project_slug,
      total_tokens: sql<number>`(coalesce(sum(${tasks.input_tokens}), 0) + coalesce(sum(${tasks.output_tokens}), 0))::int`,
      total_cost_usd: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      task_count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(...conditions))
    .groupBy(tasks.project_slug)
    .orderBy(desc(sql`(coalesce(sum(${tasks.input_tokens}), 0) + coalesce(sum(${tasks.output_tokens}), 0))`))
    .limit(limit);

  return result.map((row) => ({
    project_slug: row.project_slug,
    total_tokens: row.total_tokens,
    total_cost_usd: parseFloat(row.total_cost_usd),
    task_count: row.task_count,
  }));
}

/**
 * Get unique developers for a workspace (for filters)
 */
export async function getUniqueDevelopers(workspaceId: string) {
  const result = await db
    .selectDistinct({ developer_alias: tasks.developer_alias })
    .from(tasks)
    .where(eq(tasks.workspace_id, workspaceId))
    .orderBy(tasks.developer_alias);

  return result.map((r) => r.developer_alias);
}

/**
 * Get unique projects for a workspace (for filters)
 */
export async function getUniqueProjects(workspaceId: string) {
  const result = await db
    .selectDistinct({ project_slug: tasks.project_slug })
    .from(tasks)
    .where(eq(tasks.workspace_id, workspaceId))
    .orderBy(tasks.project_slug);

  return result.map((r) => r.project_slug);
}

/**
 * Get unique providers (tool_source) for a workspace (for filters)
 */
export async function getUniqueProviders(workspaceId: string) {
  const result = await db
    .selectDistinct({ tool_source: tasks.tool_source })
    .from(tasks)
    .where(eq(tasks.workspace_id, workspaceId))
    .orderBy(tasks.tool_source);

  return result.map((r) => r.tool_source);
}

/**
 * Get daily activity for heatmap by year
 * CRITICAL: Always filter by workspace_id
 */
export async function getDailyActivity(
  workspaceId: string,
  options: { year?: number } = {}
) {
  const { year = new Date().getFullYear() } = options;

  const startDate = new Date(year, 0, 1); // January 1st
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st

  const result = await db
    .select({
      date: sql<string>`date(${tasks.created_at})::text`,
      task_count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(
      eq(tasks.workspace_id, workspaceId),
      gte(tasks.created_at, startDate),
      lte(tasks.created_at, endDate)
    ))
    .groupBy(sql`date(${tasks.created_at})`)
    .orderBy(sql`date(${tasks.created_at})`);

  const activityMap: Record<string, number> = {};
  for (const row of result) {
    activityMap[row.date] = row.task_count;
  }

  return activityMap;
}
