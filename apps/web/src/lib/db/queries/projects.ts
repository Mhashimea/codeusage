import { db } from "..";
import { tasks } from "../schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

/**
 * Get all projects for a workspace with their stats
 * CRITICAL: Always filter by workspace_id
 */
export async function getProjectsByWorkspace(
  workspaceId: string,
  options: { startDate?: Date } = {}
) {
  const { startDate } = options;

  const conditions = [eq(tasks.workspace_id, workspaceId)];
  if (startDate) {
    conditions.push(gte(tasks.created_at, startDate));
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
