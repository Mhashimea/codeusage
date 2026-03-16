import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTaskStats, getTasksByWorkspace } from "@/lib/db/queries/tasks";
import { MetricCard } from "@/components/shared/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { formatCost, formatTokens } from "@afterburn/shared";
import {
  Coins,
  Zap,
  ListTodo,
  Users,
  Clock,
  FileCode,
} from "lucide-react";

async function OverviewContent() {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;

  // Get stats for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [stats, recentTasks] = await Promise.all([
    getTaskStats(workspaceId, { startDate: thirtyDaysAgo }),
    getTasksByWorkspace(workspaceId, { limit: 5 }),
  ]);

  const totalTokens = stats.total_input_tokens + stats.total_output_tokens;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-bold text-foreground">Overview</h1>
              <p className="text-muted-foreground">
                Last 30 days summary for your workspace
              </p>
            </div>

            {/* Metric Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Cost"
                value={formatCost(stats.total_cost_usd)}
                subtitle="Estimated spend"
                icon={Coins}
              />
              <MetricCard
                title="Total Tokens"
                value={formatTokens(totalTokens)}
                subtitle={`${formatTokens(stats.total_input_tokens)} in / ${formatTokens(stats.total_output_tokens)} out`}
                icon={Zap}
              />
              <MetricCard
                title="Tasks Completed"
                value={stats.total_tasks.toLocaleString()}
                subtitle={`${stats.unique_projects} projects`}
                icon={ListTodo}
              />
              <MetricCard
                title="Active Developers"
                value={stats.unique_developers}
                subtitle="Contributors"
                icon={Users}
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                title="Cache Tokens"
                value={formatTokens(stats.total_cache_tokens)}
                subtitle="Saved from cache"
                icon={Zap}
              />
              <MetricCard
                title="Files Changed"
                value={stats.total_files_changed.toLocaleString()}
                subtitle="Across all tasks"
                icon={FileCode}
              />
              <MetricCard
                title="Total Duration"
                value={`${Math.round(stats.total_duration_sec / 60)}m`}
                subtitle="Time in sessions"
                icon={Clock}
              />
            </div>

            {/* Recent Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {recentTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No tasks yet. Connect the CLI to start tracking.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{task.developer_alias}</span>
                            <Badge variant="secondary">{task.project_slug}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatTokens(task.input_tokens + task.output_tokens)} tokens
                            {" · "}
                            {task.files_changed} files
                            {" · "}
                            {new Date(task.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-500">
                            {formatCost(parseFloat(task.cost_usd))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {task.model_name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex h-screen bg-background">
      <div className="w-64 bg-card border-r border-border animate-pulse" />
      <div className="flex flex-1 flex-col">
        <div className="h-16 border-b border-border animate-pulse" />
        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div>
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewContent />
    </Suspense>
  );
}
