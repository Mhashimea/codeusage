import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTaskStats, getTasksByWorkspace, getTopProjects, getDailyActivity } from "@/lib/db/queries/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCost, formatTokens } from "@afterburn/shared";
import { Coins, Zap, ListTodo, Users, Clock, FileCode, TrendingUp, ArrowRight } from "lucide-react";
import { PeriodSelector } from "@/components/dashboard/overview/PeriodSelector";
import { TopProjects } from "@/components/dashboard/overview/TopProjects";
import { Heatmap } from "@/components/shared/Heatmap";
import { getPeriodDates, type Period } from "@/lib/period";
import Link from "next/link";

interface OverviewContentProps {
  period: Period;
}

async function OverviewContent({ period }: OverviewContentProps) {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;

  // Get dates based on selected period
  const { startDate, label: periodLabel } = getPeriodDates(period);

  const [stats, recentTasks, topProjects, dailyActivity] = await Promise.all([
    getTaskStats(workspaceId, { startDate }),
    getTasksByWorkspace(workspaceId, { limit: 5 }),
    getTopProjects(workspaceId, { startDate, limit: 5 }),
    getDailyActivity(workspaceId, { weeks: 26 }),
  ]);

  const totalTokens = stats.total_input_tokens + stats.total_output_tokens;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground">
            {periodLabel} summary for your workspace
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-10 w-40" />}>
          <PeriodSelector defaultPeriod={period} />
        </Suspense>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Cost */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-3xl font-bold text-emerald-500 mt-1">
                  {formatCost(stats.total_cost_usd)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Estimated spend</p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-2.5">
                <Coins className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Tokens */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tokens</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {formatTokens(totalTokens)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTokens(stats.total_input_tokens)} in · {formatTokens(stats.total_output_tokens)} out
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Zap className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasks</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {stats.total_tasks.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.unique_projects} projects
                </p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <ListTodo className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Developers */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Developers</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {stats.unique_developers}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Active contributors</p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-muted p-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatTokens(stats.total_cache_tokens)}</p>
                <p className="text-xs text-muted-foreground">Cache tokens saved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-muted p-2">
                <FileCode className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.total_files_changed.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Files changed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-muted p-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold">{Math.round(stats.total_duration_sec / 60)}m</p>
                <p className="text-xs text-muted-foreground">Total duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Heatmap */}
      <Heatmap data={dailyActivity} weeks={26} />

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
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
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
                <p className="text-sm text-muted-foreground">
                  No tasks yet. Connect the CLI to start tracking.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {task.developer_alias.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm truncate">
                          {task.developer_alias}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {task.project_slug}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-8">
                        {formatTokens(task.input_tokens + task.output_tokens)} tokens · {task.files_changed} files
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-medium text-emerald-500 text-sm">
                        {formatCost(parseFloat(task.cost_usd))}
                      </p>
                      <p className="text-xs text-muted-foreground">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function OverviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = (params.period as Period) || "30d";

  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewContent period={period} />
    </Suspense>
  );
}
