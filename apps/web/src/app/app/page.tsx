import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { parse, format, subDays } from "date-fns";
import { getTaskStats, getTasksByWorkspace, getDailyActivity, getUniqueProviders } from "@/lib/db/queries/tasks";
import { getCostByProvider, getCostByProject, getCostByDeveloper, getMonthlyCostTrend } from "@/lib/db/queries/cost";
import { ProviderIndicator } from "@/components/shared/ProviderBadge";
import { ProviderFilter } from "@/components/shared/ProviderFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCost, formatTokens } from "@codeusage/shared";
import { Coins, Zap, ListTodo, Users, FileCode, ArrowRight, Database, FolderGit2, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Heatmap } from "@/components/shared/Heatmap";
import { OverviewDatePicker } from "@/components/dashboard/overview/OverviewDatePicker";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    provider?: string;
  }>;
}

function parseDateRange(startDateStr?: string, endDateStr?: string): { startDate: Date; endDate: Date; label: string } {
  // Default to last 30 days
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);

  if (!startDateStr) {
    return {
      startDate: thirtyDaysAgo,
      endDate: today,
      label: "Last 30 days"
    };
  }

  try {
    const startDate = parse(startDateStr, "yyyy-MM-dd", new Date());
    startDate.setHours(0, 0, 0, 0);

    let endDate: Date;
    if (endDateStr) {
      endDate = parse(endDateStr, "yyyy-MM-dd", new Date());
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    }

    const label = `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
    return { startDate, endDate, label };
  } catch {
    return {
      startDate: thirtyDaysAgo,
      endDate: today,
      label: "Last 30 days"
    };
  }
}

async function OverviewContent({ searchParams }: PageProps) {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;
  const params = await searchParams;
  const { startDate, endDate, label: periodLabel } = parseDateRange(params.startDate, params.endDate);
  const provider = params.provider;
  const currentYear = new Date().getFullYear();

  const [stats, recentTasks, dailyActivity, costByProvider, costByProject, costByDeveloper, monthlyTrend, providers] = await Promise.all([
    getTaskStats(workspaceId, { startDate, endDate, provider }),
    getTasksByWorkspace(workspaceId, { limit: 5, provider }),
    getDailyActivity(workspaceId, { year: currentYear }),
    getCostByProvider(workspaceId, { startDate, endDate }),
    getCostByProject(workspaceId, { startDate, endDate, limit: 5, provider }),
    getCostByDeveloper(workspaceId, { startDate, endDate, provider }),
    getMonthlyCostTrend(workspaceId, { months: 6, provider }),
    getUniqueProviders(workspaceId),
  ]);

  const totalTokens = stats.total_input_tokens + stats.total_output_tokens;
  const avgCostPerTask = stats.total_tasks > 0 ? stats.total_cost_usd / stats.total_tasks : 0;
  const avgTokensPerTask = stats.total_tasks > 0 ? totalTokens / stats.total_tasks : 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground">
            {periodLabel} summary for your workspace
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProviderFilter providers={providers} />
          <OverviewDatePicker />
        </div>
      </div>

      {/* Hero Stats - Cost & Tokens */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Total Cost Card */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-400">Total Cost</p>
                <p className="text-4xl font-bold text-emerald-400 mt-2">
                  {formatCost(stats.total_cost_usd)}
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span>{formatCost(avgCostPerTask)} avg/task</span>
                </div>
              </div>
              <div className="rounded-xl bg-emerald-500/20 p-3">
                <Coins className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Tokens Card */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-blue-400">Total Tokens</p>
                <p className="text-4xl font-bold text-blue-400 mt-2">
                  {formatTokens(totalTokens)}
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span>{formatTokens(stats.total_input_tokens)} in</span>
                  <span>·</span>
                  <span>{formatTokens(stats.total_output_tokens)} out</span>
                </div>
              </div>
              <div className="rounded-xl bg-blue-500/20 p-3">
                <Zap className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Breakdown - Only show if multiple providers */}
      {costByProvider.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Cost by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {costByProvider.map((provider) => (
                <div
                  key={provider.tool_source}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 min-w-[180px]"
                >
                  <ProviderIndicator providerId={provider.tool_source} />
                  <div>
                    <p className="font-semibold text-emerald-500">
                      {formatCost(provider.total_cost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {provider.task_count} tasks · {provider.share_percentage.toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secondary Stats Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <ListTodo className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_tasks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unique_developers}</p>
                <p className="text-xs text-muted-foreground">Developers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <FileCode className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_files_changed.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Files Changed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Database className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatTokens(stats.total_cache_tokens)}</p>
                <p className="text-xs text-muted-foreground">Cache Saved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      {monthlyTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              {monthlyTrend.length === 1 ? 'This Month' : 'Monthly Usage'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTrend.length === 1 ? (
              // Single month - show as horizontal stats
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {new Date(parseInt(monthlyTrend[0].month.split('-')[0]), parseInt(monthlyTrend[0].month.split('-')[1]) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Tasks</p>
                    <p className="text-sm font-semibold">{monthlyTrend[0].task_count}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Tokens</p>
                    <p className="text-sm font-semibold">{formatTokens(monthlyTrend[0].total_tokens)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Cost</p>
                    <p className="text-sm font-semibold text-emerald-500">{formatCost(monthlyTrend[0].total_cost)}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Multiple months - show bar chart
              <>
                <div className="space-y-3">
                  {monthlyTrend.map((month, index) => {
                    const maxCost = Math.max(...monthlyTrend.map((d) => d.total_cost));
                    const widthPercent = maxCost > 0 ? (month.total_cost / maxCost) * 100 : 0;
                    const isCurrentMonth = index === monthlyTrend.length - 1;

                    return (
                      <div key={month.month} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {new Date(parseInt(month.month.split('-')[0]), parseInt(month.month.split('-')[1]) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                            </span>
                            {isCurrentMonth && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">
                              {month.task_count} tasks
                            </span>
                            <span className={`text-sm font-semibold ${isCurrentMonth ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                              {formatCost(month.total_cost)}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isCurrentMonth ? 'bg-emerald-500' : 'bg-primary/40'}`}
                            style={{ width: `${Math.max(widthPercent, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Month-over-Month Change */}
                {(() => {
                  const current = monthlyTrend[monthlyTrend.length - 1];
                  const previous = monthlyTrend[monthlyTrend.length - 2];
                  const costChange = previous.total_cost > 0
                    ? ((current.total_cost - previous.total_cost) / previous.total_cost) * 100
                    : 0;
                  return (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        {costChange > 0 ? (
                          <TrendingUp className="h-4 w-4 text-amber-500" />
                        ) : costChange < 0 ? (
                          <TrendingDown className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {costChange > 0 ? '+' : ''}{costChange.toFixed(1)}% vs last month
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity Heatmap */}
      <Heatmap initialData={dailyActivity} initialYear={currentYear} />

      {/* Three Column Layout: Projects + Developers + Recent Tasks */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cost by Project */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <FolderGit2 className="h-5 w-5 text-muted-foreground" />
              By Project
            </CardTitle>
            <Link
              href="/app/projects"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {costByProject.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <FolderGit2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No project data yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {costByProject.map((project, index) => (
                  <div
                    key={project.project_slug}
                    className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium text-sm truncate pr-2">
                          {project.project_slug}
                        </span>
                        <span className="text-sm font-semibold text-emerald-500 whitespace-nowrap">
                          {formatCost(project.total_cost)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{project.task_count} tasks</span>
                        <span>·</span>
                        <span>{formatTokens(project.total_tokens)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost by Developer */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Users className="h-5 w-5 text-muted-foreground" />
              By Developer
            </CardTitle>
            <Link
              href="/app/developers"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {costByDeveloper.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No developer data yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {costByDeveloper.slice(0, 5).map((dev) => (
                  <div
                    key={dev.developer_alias}
                    className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                      {dev.developer_alias.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium text-sm truncate pr-2">
                          {dev.developer_alias}
                        </span>
                        <span className="text-sm font-semibold text-emerald-500 whitespace-nowrap">
                          {formatCost(dev.total_cost)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{dev.task_count} tasks</span>
                        <span>·</span>
                        <span>{formatTokens(dev.total_tokens)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Recent Tasks</CardTitle>
            <Link
              href="/app/tasks"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <ListTodo className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No tasks yet</p>
                <p className="text-xs text-muted-foreground">
                  Connect the CLI to start tracking
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                          {task.developer_alias.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {task.developer_alias}
                            </span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {task.project_slug}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatTokens(task.input_tokens + task.output_tokens)} tokens
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="font-semibold text-emerald-500 text-sm">
                        {formatCost(parseFloat(task.cost_usd))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-5 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-[260px] animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-36 animate-pulse rounded-lg bg-muted" />
        <div className="h-36 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export default async function OverviewPage(props: PageProps) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewContent {...props} />
    </Suspense>
  );
}
