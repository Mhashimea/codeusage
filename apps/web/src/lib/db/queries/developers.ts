import { db } from "..";
import { tasks } from "../schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

/**
 * Get all developers for a workspace with their stats
 * CRITICAL: Always filter by workspace_id
 */
export async function getDevelopersByWorkspace(
  workspaceId: string,
  options: { provider?: string } = {}
) {
  const { provider } = options;

  const conditions = [eq(tasks.workspace_id, workspaceId)];
  if (provider) {
    conditions.push(eq(tasks.tool_source, provider));
  }

  const result = await db
    .select({
      alias: tasks.developer_alias,
      taskCount: sql<number>`count(*)::int`,
      lastActive: sql<string>`max(${tasks.created_at})::text`,
      totalTokens: sql<string>`sum(${tasks.input_tokens} + ${tasks.output_tokens})::bigint`,
      totalCost: sql<string>`sum(${tasks.cost_usd})::numeric(10,6)`,
      providers: sql<string>`array_agg(distinct ${tasks.tool_source})::text`,
      projectCount: sql<number>`count(distinct ${tasks.project_slug})::int`,
    })
    .from(tasks)
    .where(and(...conditions))
    .groupBy(tasks.developer_alias)
    .orderBy(desc(sql`max(${tasks.created_at})`));

  return result.map((row) => ({
    alias: row.alias,
    taskCount: row.taskCount,
    lastActive: row.lastActive,
    totalTokens: Number(row.totalTokens || "0"),
    totalCost: parseFloat(row.totalCost || "0"),
    // Parse the array string format {claude_code,codex} to array
    providers: row.providers
      ? row.providers.replace(/[{}]/g, "").split(",").filter(Boolean)
      : [],
    projectCount: row.projectCount,
  }));
}

/**
 * Merge one developer alias into another
 * Updates all tasks from fromAlias to toAlias within a workspace
 * CRITICAL: Always filter by workspace_id
 */
export async function mergeDeveloperAlias(
  workspaceId: string,
  fromAlias: string,
  toAlias: string
): Promise<number> {
  const result = await db
    .update(tasks)
    .set({ developer_alias: toAlias })
    .where(
      and(
        eq(tasks.workspace_id, workspaceId),
        eq(tasks.developer_alias, fromAlias)
      )
    )
    .returning({ id: tasks.id });

  return result.length;
}

/**
 * Get developer stats for a specific period
 */
export async function getDeveloperStats(
  workspaceId: string,
  developerAlias: string
) {
  const [stats] = await db
    .select({
      totalTasks: sql<number>`count(*)::int`,
      totalInputTokens: sql<string>`coalesce(sum(${tasks.input_tokens}), 0)::bigint`,
      totalOutputTokens: sql<string>`coalesce(sum(${tasks.output_tokens}), 0)::bigint`,
      totalCacheTokens: sql<string>`coalesce(sum(${tasks.cache_tokens}), 0)::bigint`,
      totalCost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      totalFilesChanged: sql<string>`coalesce(sum(${tasks.files_changed}), 0)::bigint`,
      uniqueProjects: sql<number>`count(distinct ${tasks.project_slug})::int`,
      firstTask: sql<string>`min(${tasks.created_at})::text`,
      lastTask: sql<string>`max(${tasks.created_at})::text`,
    })
    .from(tasks)
    .where(
      sql`${tasks.workspace_id} = ${workspaceId} AND ${tasks.developer_alias} = ${developerAlias}`
    );

  return {
    totalTasks: stats.totalTasks,
    totalInputTokens: Number(stats.totalInputTokens),
    totalOutputTokens: Number(stats.totalOutputTokens),
    totalCacheTokens: Number(stats.totalCacheTokens),
    totalCost: parseFloat(stats.totalCost),
    totalFilesChanged: Number(stats.totalFilesChanged),
    uniqueProjects: stats.uniqueProjects,
    firstTask: stats.firstTask,
    lastTask: stats.lastTask,
  };
}

/**
 * Get developer activity for the last 14 days
 * CRITICAL: Always filter by workspace_id
 */
export async function getDeveloperActivity(
  workspaceId: string,
  options: { days?: number } = {}
) {
  const { days = 14 } = options;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await db
    .select({
      developer_alias: tasks.developer_alias,
      date: sql<string>`date(${tasks.created_at})::text`,
      task_count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(eq(tasks.workspace_id, workspaceId), gte(tasks.created_at, startDate)))
    .groupBy(tasks.developer_alias, sql`date(${tasks.created_at})`)
    .orderBy(tasks.developer_alias, sql`date(${tasks.created_at})`);

  // Group by developer
  const activityByDeveloper: Record<string, Record<string, number>> = {};
  for (const row of result) {
    if (!activityByDeveloper[row.developer_alias]) {
      activityByDeveloper[row.developer_alias] = {};
    }
    activityByDeveloper[row.developer_alias][row.date] = row.task_count;
  }

  return activityByDeveloper;
}

/**
 * Get daily activity for a specific developer (for heatmap)
 * CRITICAL: Always filter by workspace_id
 */
export async function getDeveloperDailyActivity(
  workspaceId: string,
  developerAlias: string,
  options: { year?: number } = {}
) {
  const { year = new Date().getFullYear() } = options;
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

  const result = await db
    .select({
      date: sql<string>`date(${tasks.created_at})::text`,
      task_count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspace_id, workspaceId),
        eq(tasks.developer_alias, developerAlias),
        gte(tasks.created_at, startDate),
        lte(tasks.created_at, endDate)
      )
    )
    .groupBy(sql`date(${tasks.created_at})`)
    .orderBy(sql`date(${tasks.created_at})`);

  const activityMap: Record<string, number> = {};
  for (const row of result) {
    activityMap[row.date] = row.task_count;
  }

  return activityMap;
}

/**
 * Get projects worked on by a specific developer
 * CRITICAL: Always filter by workspace_id
 */
export async function getDeveloperProjects(
  workspaceId: string,
  developerAlias: string,
  options: { limit?: number } = {}
) {
  const { limit = 10 } = options;

  const result = await db
    .select({
      project_slug: tasks.project_slug,
      task_count: sql<number>`count(*)::int`,
      total_cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      total_tokens: sql<string>`(coalesce(sum(${tasks.input_tokens}), 0) + coalesce(sum(${tasks.output_tokens}), 0))::bigint`,
      last_activity: sql<string>`max(${tasks.created_at})::text`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspace_id, workspaceId),
        eq(tasks.developer_alias, developerAlias)
      )
    )
    .groupBy(tasks.project_slug)
    .orderBy(desc(sql`sum(${tasks.cost_usd})`))
    .limit(limit);

  return result.map((row) => ({
    project_slug: row.project_slug,
    task_count: row.task_count,
    total_cost: parseFloat(row.total_cost),
    total_tokens: Number(row.total_tokens || "0"),
    last_activity: row.last_activity,
  }));
}

/**
 * Get providers used by a specific developer
 * CRITICAL: Always filter by workspace_id
 */
export async function getDeveloperProviders(
  workspaceId: string,
  developerAlias: string
): Promise<string[]> {
  const result = await db
    .selectDistinct({ tool_source: tasks.tool_source })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspace_id, workspaceId),
        eq(tasks.developer_alias, developerAlias)
      )
    );

  return result.map((r) => r.tool_source);
}
