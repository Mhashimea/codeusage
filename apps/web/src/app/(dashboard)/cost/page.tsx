import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getThisMonthStats,
  getMonthlyCostTrend,
  getCostByProject,
  getCostByDeveloper,
} from "@/lib/db/queries/cost";
import { CostMetrics } from "@/components/dashboard/cost/CostMetrics";
import { MonthlyTrend } from "@/components/dashboard/cost/MonthlyTrend";
import { CostByProject } from "@/components/dashboard/cost/CostByProject";
import { CostByDeveloper } from "@/components/dashboard/cost/CostByDeveloper";

async function CostContent() {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;

  // Get this month's date range for breakdowns
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthStats, monthlyTrend, costByProject, costByDeveloper] =
    await Promise.all([
      getThisMonthStats(workspaceId),
      getMonthlyCostTrend(workspaceId, { months: 6 }),
      getCostByProject(workspaceId, { startDate: startOfMonth }),
      getCostByDeveloper(workspaceId, { startDate: startOfMonth }),
    ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cost & Usage</h1>
        <p className="text-muted-foreground">
          Track AI tool spending across your workspace
        </p>
      </div>

      {/* This Month Metrics */}
      <CostMetrics
        totalCost={monthStats.total_cost}
        totalTokens={monthStats.total_tokens}
        taskCount={monthStats.task_count}
        avgCostPerTask={monthStats.avg_cost_per_task}
      />

      {/* Monthly Trend Chart */}
      <MonthlyTrend data={monthlyTrend} />

      {/* Cost Breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CostByProject data={costByProject} />
        <CostByDeveloper data={costByDeveloper} />
      </div>
    </div>
  );
}

function CostSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-36 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export default function CostPage() {
  return (
    <Suspense fallback={<CostSkeleton />}>
      <CostContent />
    </Suspense>
  );
}
