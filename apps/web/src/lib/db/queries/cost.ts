import { db } from "..";
import { tasks } from "../schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

/**
 * Get monthly cost data for the last N months
 * CRITICAL: Always filter by workspace_id
 */
export async function getMonthlyCostTrend(
  workspaceId: string,
  options: { months?: number } = {}
) {
  const { months = 6 } = options;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const result = await db
    .select({
      month: sql<string>`to_char(${tasks.created_at}, 'YYYY-MM')`,
      total_cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      total_tokens: sql<number>`(coalesce(sum(${tasks.input_tokens}), 0) + coalesce(sum(${tasks.output_tokens}), 0))::int`,
      task_count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(eq(tasks.workspace_id, workspaceId), gte(tasks.created_at, startDate)))
    .groupBy(sql`to_char(${tasks.created_at}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${tasks.created_at}, 'YYYY-MM')`);

  return result.map((row) => ({
    month: row.month,
    total_cost: parseFloat(row.total_cost),
    total_tokens: row.total_tokens,
    task_count: row.task_count,
  }));
}

/**
 * Get cost breakdown by project
 * CRITICAL: Always filter by workspace_id
 */
export async function getCostByProject(
  workspaceId: string,
  options: { startDate?: Date; endDate?: Date; limit?: number } = {}
) {
  const { startDate, endDate, limit = 10 } = options;

  const conditions = [eq(tasks.workspace_id, workspaceId)];
  if (startDate) conditions.push(gte(tasks.created_at, startDate));
  if (endDate) conditions.push(lte(tasks.created_at, endDate));

  const result = await db
    .select({
      project_slug: tasks.project_slug,
      total_cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      total_tokens: sql<number>`(coalesce(sum(${tasks.input_tokens}), 0) + coalesce(sum(${tasks.output_tokens}), 0))::int`,
      task_count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(...conditions))
    .groupBy(tasks.project_slug)
    .orderBy(desc(sql`sum(${tasks.cost_usd})`))
    .limit(limit);

  const totalCost = result.reduce((sum, r) => sum + parseFloat(r.total_cost), 0);

  return result.map((row) => ({
    project_slug: row.project_slug,
    total_cost: parseFloat(row.total_cost),
    total_tokens: row.total_tokens,
    task_count: row.task_count,
    share_percentage: totalCost > 0 ? (parseFloat(row.total_cost) / totalCost) * 100 : 0,
  }));
}

/**
 * Get cost breakdown by developer
 * CRITICAL: Always filter by workspace_id
 */
export async function getCostByDeveloper(
  workspaceId: string,
  options: { startDate?: Date; endDate?: Date } = {}
) {
  const { startDate, endDate } = options;

  const conditions = [eq(tasks.workspace_id, workspaceId)];
  if (startDate) conditions.push(gte(tasks.created_at, startDate));
  if (endDate) conditions.push(lte(tasks.created_at, endDate));

  const result = await db
    .select({
      developer_alias: tasks.developer_alias,
      total_cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      total_tokens: sql<number>`(coalesce(sum(${tasks.input_tokens}), 0) + coalesce(sum(${tasks.output_tokens}), 0))::int`,
      task_count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(...conditions))
    .groupBy(tasks.developer_alias)
    .orderBy(desc(sql`sum(${tasks.cost_usd})`));

  const totalCost = result.reduce((sum, r) => sum + parseFloat(r.total_cost), 0);

  return result.map((row) => ({
    developer_alias: row.developer_alias,
    total_cost: parseFloat(row.total_cost),
    total_tokens: row.total_tokens,
    task_count: row.task_count,
    share_percentage: totalCost > 0 ? (parseFloat(row.total_cost) / totalCost) * 100 : 0,
  }));
}

/**
 * Get this month's cost stats
 */
export async function getThisMonthStats(workspaceId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [stats] = await db
    .select({
      total_cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      total_tokens: sql<number>`(coalesce(sum(${tasks.input_tokens}), 0) + coalesce(sum(${tasks.output_tokens}), 0))::int`,
      task_count: sql<number>`count(*)::int`,
      avg_cost_per_task: sql<string>`coalesce(avg(${tasks.cost_usd}), 0)::numeric(10,6)`,
    })
    .from(tasks)
    .where(
      and(eq(tasks.workspace_id, workspaceId), gte(tasks.created_at, startOfMonth))
    );

  return {
    total_cost: parseFloat(stats.total_cost),
    total_tokens: stats.total_tokens,
    task_count: stats.task_count,
    avg_cost_per_task: parseFloat(stats.avg_cost_per_task),
  };
}
