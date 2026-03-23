import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { parse, format, subDays } from "date-fns";
import { getTaskStats, getTasksByWorkspace, getTopProjects, getDailyActivity } from "@/lib/db/queries/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCost, formatTokens } from "@afterburn/shared";
import { Coins, Zap, ListTodo, Users, FileCode, ArrowRight, Database } from "lucide-react";
import { TopProjects } from "@/components/dashboard/overview/TopProjects";
import { Heatmap } from "@/components/shared/Heatmap";
import { OverviewDatePicker } from "@/components/dashboard/overview/OverviewDatePicker";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    activityYear?: string;
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
  const activityYear = params.activityYear ? parseInt(params.activityYear, 10) : new Date().getFullYear();

  const [stats, recentTasks, topProjects, dailyActivity] = await Promise.all([
    getTaskStats(workspaceId, { startDate, endDate }),
    getTasksByWorkspace(workspaceId, { limit: 5 }),
    getTopProjects(workspaceId, { startDate, endDate, limit: 5 }),
    getDailyActivity(workspaceId, { year: activityYear }),
  ]);

  const totalTokens = stats.total_input_tokens + stats.total_output_tokens;
  const avgCostPerTask = stats.total_tasks > 0 ? stats.total_cost_usd / stats.total_tasks : 0;
  const avgTokensPerTask = stats.total_tasks > 0 ? totalTokens / stats.total_tasks : 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">
            {periodLabel} summary for your workspace
          </p>
        </div>
        <OverviewDatePicker />
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

      {/* Activity Heatmap */}
      <Heatmap data={dailyActivity} year={activityYear} />

      {/* Two Column Layout: Projects + Recent Tasks */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Projects */}
        <TopProjects projects={topProjects} />

        {/* Recent Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Recent Tasks</CardTitle>
            <Link
              href="/tasks"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <ListTodo className="h-8 w-8 text-muted-foreground" />
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
                    className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
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
                            {formatTokens(task.input_tokens + task.output_tokens)} tokens · {task.files_changed} files
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-semibold text-emerald-500 text-sm">
                        {formatCost(parseFloat(task.cost_usd))}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(task.created_at).toLocaleDateString()}
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
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
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
