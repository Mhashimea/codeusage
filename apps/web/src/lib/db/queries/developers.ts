import { db } from "..";
import { tasks } from "../schema";
import { eq, desc, sql } from "drizzle-orm";

/**
 * Get all developers for a workspace with their stats
 * CRITICAL: Always filter by workspace_id
 */
export async function getDevelopersByWorkspace(workspaceId: string) {
  const result = await db
    .select({
      alias: tasks.developer_alias,
      taskCount: sql<number>`count(*)::int`,
      lastActive: sql<string>`max(${tasks.created_at})::text`,
      totalTokens: sql<number>`sum(${tasks.input_tokens} + ${tasks.output_tokens})::int`,
      totalCost: sql<string>`sum(${tasks.cost_usd})::numeric(10,6)`,
    })
    .from(tasks)
    .where(eq(tasks.workspace_id, workspaceId))
    .groupBy(tasks.developer_alias)
    .orderBy(desc(sql`max(${tasks.created_at})`));

  return result.map((row) => ({
    alias: row.alias,
    taskCount: row.taskCount,
    lastActive: row.lastActive,
    totalTokens: row.totalTokens,
    totalCost: parseFloat(row.totalCost || "0"),
  }));
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
      totalInputTokens: sql<number>`coalesce(sum(${tasks.input_tokens}), 0)::int`,
      totalOutputTokens: sql<number>`coalesce(sum(${tasks.output_tokens}), 0)::int`,
      totalCacheTokens: sql<number>`coalesce(sum(${tasks.cache_tokens}), 0)::int`,
      totalCost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      totalFilesChanged: sql<number>`coalesce(sum(${tasks.files_changed}), 0)::int`,
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
    totalInputTokens: stats.totalInputTokens,
    totalOutputTokens: stats.totalOutputTokens,
    totalCacheTokens: stats.totalCacheTokens,
    totalCost: parseFloat(stats.totalCost),
    totalFilesChanged: stats.totalFilesChanged,
    uniqueProjects: stats.uniqueProjects,
    firstTask: stats.firstTask,
    lastTask: stats.lastTask,
  };
}
