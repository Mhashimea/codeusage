import { db } from "..";
import { tasks } from "../schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

/**
 * Get all projects for a workspace with their stats
 * CRITICAL: Always filter by workspace_id
 */
export async function getProjectsByWorkspace(
  workspaceId: string,
  options: { startDate?: Date; provider?: string } = {}
) {
  const { startDate, provider } = options;

  const conditions = [eq(tasks.workspace_id, workspaceId)];
  if (startDate) {
    conditions.push(gte(tasks.created_at, startDate));
  }
  if (provider) {
    conditions.push(eq(tasks.tool_source, provider));
  }

  const result = await db
    .select({
      project_slug: tasks.project_slug,
      task_count: sql<number>`count(*)::int`,
      total_tokens: sql<number>`(coalesce(sum(${tasks.input_tokens}), 0) + coalesce(sum(${tasks.output_tokens}), 0))::int`,
      total_cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      total_files_changed: sql<number>`coalesce(sum(${tasks.files_changed}), 0)::int`,
      contributor_count: sql<number>`count(distinct ${tasks.developer_alias})::int`,
      contributors: sql<string>`string_agg(distinct ${tasks.developer_alias}, ',')`,
      providers: sql<string>`array_agg(distinct ${tasks.tool_source})::text`,
      last_activity: sql<string>`max(${tasks.created_at})::text`,
    })
    .from(tasks)
    .where(and(...conditions))
    .groupBy(tasks.project_slug)
    .orderBy(desc(sql`sum(${tasks.input_tokens} + ${tasks.output_tokens})`));

  // Calculate total for share percentages
  const totalTokens = result.reduce((sum, r) => sum + r.total_tokens, 0);

  return result.map((row) => ({
    project_slug: row.project_slug,
    task_count: row.task_count,
    total_tokens: row.total_tokens,
    total_cost: parseFloat(row.total_cost),
    total_files_changed: row.total_files_changed,
    contributor_count: row.contributor_count,
    contributors: row.contributors ? row.contributors.split(",") : [],
    // Parse the array string format {claude_code,codex} to array
    providers: row.providers
      ? row.providers.replace(/[{}]/g, "").split(",").filter(Boolean)
      : [],
    last_activity: row.last_activity,
    share_percentage: totalTokens > 0 ? (row.total_tokens / totalTokens) * 100 : 0,
  }));
}

/**
 * Check if there are any untagged tasks
 */
export async function hasUntaggedTasks(workspaceId: string): Promise<boolean> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspace_id, workspaceId),
        eq(tasks.project_slug, "untagged")
      )
    );

  return result.count > 0;
}

/**
 * Get stats for a specific project
 * CRITICAL: Always filter by workspace_id
 */
export async function getProjectStats(
  workspaceId: string,
  projectSlug: string
) {
  const [stats] = await db
    .select({
      totalTasks: sql<number>`count(*)::int`,
      totalInputTokens: sql<number>`coalesce(sum(${tasks.input_tokens}), 0)::int`,
      totalOutputTokens: sql<number>`coalesce(sum(${tasks.output_tokens}), 0)::int`,
      totalCacheTokens: sql<number>`coalesce(sum(${tasks.cache_tokens}), 0)::int`,
      totalCost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      totalFilesChanged: sql<number>`coalesce(sum(${tasks.files_changed}), 0)::int`,
      uniqueDevelopers: sql<number>`count(distinct ${tasks.developer_alias})::int`,
      firstTask: sql<string>`min(${tasks.created_at})::text`,
      lastTask: sql<string>`max(${tasks.created_at})::text`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspace_id, workspaceId),
        eq(tasks.project_slug, projectSlug)
      )
    );

  return {
    totalTasks: stats.totalTasks,
    totalInputTokens: stats.totalInputTokens,
    totalOutputTokens: stats.totalOutputTokens,
    totalCacheTokens: stats.totalCacheTokens,
    totalCost: parseFloat(stats.totalCost),
    totalFilesChanged: stats.totalFilesChanged,
    uniqueDevelopers: stats.uniqueDevelopers,
    firstTask: stats.firstTask,
    lastTask: stats.lastTask,
  };
}

/**
 * Get daily activity for a specific project (for heatmap)
 * CRITICAL: Always filter by workspace_id
 */
export async function getProjectDailyActivity(
  workspaceId: string,
  projectSlug: string,
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
        eq(tasks.project_slug, projectSlug),
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
 * Get developers working on a specific project
 * CRITICAL: Always filter by workspace_id
 */
export async function getProjectDevelopers(
  workspaceId: string,
  projectSlug: string,
  options: { limit?: number } = {}
) {
  const { limit = 10 } = options;

  const result = await db
    .select({
      developer_alias: tasks.developer_alias,
      task_count: sql<number>`count(*)::int`,
      total_cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      total_tokens: sql<number>`(coalesce(sum(${tasks.input_tokens}), 0) + coalesce(sum(${tasks.output_tokens}), 0))::int`,
      last_activity: sql<string>`max(${tasks.created_at})::text`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspace_id, workspaceId),
        eq(tasks.project_slug, projectSlug)
      )
    )
    .groupBy(tasks.developer_alias)
    .orderBy(desc(sql`sum(${tasks.cost_usd})`))
    .limit(limit);

  return result.map((row) => ({
    developer_alias: row.developer_alias,
    task_count: row.task_count,
    total_cost: parseFloat(row.total_cost),
    total_tokens: row.total_tokens,
    last_activity: row.last_activity,
  }));
}

/**
 * Get providers used in a specific project
 * CRITICAL: Always filter by workspace_id
 */
export async function getProjectProviders(
  workspaceId: string,
  projectSlug: string
): Promise<string[]> {
  const result = await db
    .selectDistinct({ tool_source: tasks.tool_source })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspace_id, workspaceId),
        eq(tasks.project_slug, projectSlug)
      )
    );

  return result.map((r) => r.tool_source);
}
