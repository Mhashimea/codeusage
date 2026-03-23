import { db } from "..";
import { tasks } from "../schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

/**
 * Get weekly summary for the current or specified week
 * CRITICAL: Always filter by workspace_id
 */
export async function getWeeklySummary(
  workspaceId: string,
  options: { weekStart?: Date; provider?: string } = {}
) {
  const { provider } = options;
  const now = new Date();

  // Default to current week (Monday start)
  let weekStart = options.weekStart;
  if (!weekStart) {
    weekStart = new Date(now);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const baseConditions = [
    eq(tasks.workspace_id, workspaceId),
    gte(tasks.created_at, weekStart),
    lte(tasks.created_at, weekEnd),
  ];
  if (provider) baseConditions.push(eq(tasks.tool_source, provider));

  const [summary] = await db
    .select({
      total_tasks: sql<number>`count(*)::int`,
      total_cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      total_tokens: sql<number>`(coalesce(sum(${tasks.input_tokens}), 0) + coalesce(sum(${tasks.output_tokens}), 0))::int`,
      total_files: sql<number>`coalesce(sum(${tasks.files_changed}), 0)::int`,
      unique_developers: sql<number>`count(distinct ${tasks.developer_alias})::int`,
      unique_projects: sql<number>`count(distinct ${tasks.project_slug})::int`,
    })
    .from(tasks)
    .where(and(...baseConditions));

  // Get daily breakdown
  const dailyBreakdown = await db
    .select({
      date: sql<string>`date(${tasks.created_at})::text`,
      task_count: sql<number>`count(*)::int`,
      cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
    })
    .from(tasks)
    .where(and(...baseConditions))
    .groupBy(sql`date(${tasks.created_at})`)
    .orderBy(sql`date(${tasks.created_at})`);

  // Get top contributors
  const topContributors = await db
    .select({
      developer: tasks.developer_alias,
      task_count: sql<number>`count(*)::int`,
      cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
    })
    .from(tasks)
    .where(and(...baseConditions))
    .groupBy(tasks.developer_alias)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  return {
    week_start: weekStart.toISOString().split("T")[0],
    week_end: weekEnd.toISOString().split("T")[0],
    total_tasks: summary.total_tasks,
    total_cost: parseFloat(summary.total_cost),
    total_tokens: summary.total_tokens,
    total_files: summary.total_files,
    unique_developers: summary.unique_developers,
    unique_projects: summary.unique_projects,
    daily_breakdown: dailyBreakdown.map((d) => ({
      date: d.date,
      task_count: d.task_count,
      cost: parseFloat(d.cost),
    })),
    top_contributors: topContributors.map((c) => ({
      developer: c.developer,
      task_count: c.task_count,
      cost: parseFloat(c.cost),
    })),
  };
}

/**
 * Get monthly cost report
 * CRITICAL: Always filter by workspace_id
 */
export async function getMonthlyCostReport(
  workspaceId: string,
  options: { month?: Date; provider?: string } = {}
) {
  const { provider } = options;
  const now = new Date();
  const month = options.month || new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

  const baseConditions = [
    eq(tasks.workspace_id, workspaceId),
    gte(tasks.created_at, monthStart),
    lte(tasks.created_at, monthEnd),
  ];
  if (provider) baseConditions.push(eq(tasks.tool_source, provider));

  const [summary] = await db
    .select({
      total_tasks: sql<number>`count(*)::int`,
      total_cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      total_input_tokens: sql<number>`coalesce(sum(${tasks.input_tokens}), 0)::int`,
      total_output_tokens: sql<number>`coalesce(sum(${tasks.output_tokens}), 0)::int`,
      total_cache_tokens: sql<number>`coalesce(sum(${tasks.cache_tokens}), 0)::int`,
      total_files: sql<number>`coalesce(sum(${tasks.files_changed}), 0)::int`,
      unique_developers: sql<number>`count(distinct ${tasks.developer_alias})::int`,
      unique_projects: sql<number>`count(distinct ${tasks.project_slug})::int`,
      avg_cost_per_task: sql<string>`coalesce(avg(${tasks.cost_usd}), 0)::numeric(10,6)`,
    })
    .from(tasks)
    .where(and(...baseConditions));

  // Cost by project
  const costByProject = await db
    .select({
      project: tasks.project_slug,
      cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      task_count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(...baseConditions))
    .groupBy(tasks.project_slug)
    .orderBy(desc(sql`sum(${tasks.cost_usd})`));

  // Cost by developer
  const costByDeveloper = await db
    .select({
      developer: tasks.developer_alias,
      cost: sql<string>`coalesce(sum(${tasks.cost_usd}), 0)::numeric(10,6)`,
      task_count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(...baseConditions))
    .groupBy(tasks.developer_alias)
    .orderBy(desc(sql`sum(${tasks.cost_usd})`));

  return {
    month: monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    month_start: monthStart.toISOString().split("T")[0],
    month_end: monthEnd.toISOString().split("T")[0],
    total_tasks: summary.total_tasks,
    total_cost: parseFloat(summary.total_cost),
    total_input_tokens: summary.total_input_tokens,
    total_output_tokens: summary.total_output_tokens,
    total_cache_tokens: summary.total_cache_tokens,
    total_files: summary.total_files,
    unique_developers: summary.unique_developers,
    unique_projects: summary.unique_projects,
    avg_cost_per_task: parseFloat(summary.avg_cost_per_task),
    cost_by_project: costByProject.map((p) => ({
      project: p.project,
      cost: parseFloat(p.cost),
      task_count: p.task_count,
    })),
    cost_by_developer: costByDeveloper.map((d) => ({
      developer: d.developer,
      cost: parseFloat(d.cost),
      task_count: d.task_count,
    })),
  };
}
