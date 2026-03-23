import { db } from "..";
import { tasks } from "../schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

/**
 * Get monthly cost data for the last N months
 * CRITICAL: Always filter by workspace_id
 */
export async function getMonthlyCostTrend(
  workspaceId: string,
  options: { months?: number; provider?: string } = {}
) {
  const { months = 6, provider } = options;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const conditions = [eq(tasks.workspace_id, workspaceId), gte(tasks.created_at, startDate)];
  if (provider) conditions.push(eq(tasks.tool_source, provider));

  const result = await db
    .select({
      month: sql<string>`to_char(${tasks.created_at}, 'YYYY-MM')`,
      total_cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      total_tokens: sql<number>`(coalesce(sum(${tasks.input_tokens}), 0) + coalesce(sum(${tasks.output_tokens}), 0))::int`,
      task_count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(...conditions))
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
  options: { startDate?: Date; endDate?: Date; limit?: number; provider?: string } = {}
) {
  const { startDate, endDate, limit = 10, provider } = options;

  const conditions = [eq(tasks.workspace_id, workspaceId)];
  if (startDate) conditions.push(gte(tasks.created_at, startDate));
  if (endDate) conditions.push(lte(tasks.created_at, endDate));
  if (provider) conditions.push(eq(tasks.tool_source, provider));

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
  options: { startDate?: Date; endDate?: Date; provider?: string } = {}
) {
  const { startDate, endDate, provider } = options;

  const conditions = [eq(tasks.workspace_id, workspaceId)];
  if (startDate) conditions.push(gte(tasks.created_at, startDate));
  if (endDate) conditions.push(lte(tasks.created_at, endDate));
  if (provider) conditions.push(eq(tasks.tool_source, provider));

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
export async function getThisMonthStats(
  workspaceId: string,
  options: { provider?: string } = {}
) {
  const { provider } = options;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const conditions = [eq(tasks.workspace_id, workspaceId), gte(tasks.created_at, startOfMonth)];
  if (provider) conditions.push(eq(tasks.tool_source, provider));

  const [stats] = await db
    .select({
      total_cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      total_tokens: sql<number>`(coalesce(sum(${tasks.input_tokens}), 0) + coalesce(sum(${tasks.output_tokens}), 0))::int`,
      task_count: sql<number>`count(*)::int`,
      avg_cost_per_task: sql<string>`coalesce(avg(${tasks.cost_usd}), 0)::numeric(10,6)`,
    })
    .from(tasks)
    .where(and(...conditions));

  return {
    total_cost: parseFloat(stats.total_cost),
    total_tokens: stats.total_tokens,
    task_count: stats.task_count,
    avg_cost_per_task: parseFloat(stats.avg_cost_per_task),
  };
}

/**
 * Get distinct providers used in this workspace
 * CRITICAL: Always filter by workspace_id
 */
export async function getDistinctProviders(workspaceId: string): Promise<string[]> {
  const result = await db
    .selectDistinct({ tool_source: tasks.tool_source })
    .from(tasks)
    .where(eq(tasks.workspace_id, workspaceId));

  return result.map((r) => r.tool_source);
}

/**
 * Get cost breakdown by provider
 * CRITICAL: Always filter by workspace_id
 */
export async function getCostByProvider(
  workspaceId: string,
  options: { startDate?: Date; endDate?: Date } = {}
) {
  const { startDate, endDate } = options;

  const conditions = [eq(tasks.workspace_id, workspaceId)];
  if (startDate) conditions.push(gte(tasks.created_at, startDate));
  if (endDate) conditions.push(lte(tasks.created_at, endDate));

  const result = await db
    .select({
      tool_source: tasks.tool_source,
      total_cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      total_tokens: sql<number>`(coalesce(sum(${tasks.input_tokens}), 0) + coalesce(sum(${tasks.output_tokens}), 0))::int`,
      task_count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(...conditions))
    .groupBy(tasks.tool_source)
    .orderBy(desc(sql`sum(${tasks.cost_usd})`));

  const totalCost = result.reduce((sum, r) => sum + parseFloat(r.total_cost), 0);

  return result.map((row) => ({
    tool_source: row.tool_source,
    total_cost: parseFloat(row.total_cost),
    total_tokens: row.total_tokens,
    task_count: row.task_count,
    share_percentage: totalCost > 0 ? (parseFloat(row.total_cost) / totalCost) * 100 : 0,
  }));
}
