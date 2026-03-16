import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWeeklySummary, getMonthlyCostReport } from "@/lib/db/queries/reports";
import { WeeklySummary } from "@/components/dashboard/reports/WeeklySummary";
import { MonthlyCost } from "@/components/dashboard/reports/MonthlyCost";

async function ReportsContent() {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;

  const [weeklySummary, monthlyCost] = await Promise.all([
    getWeeklySummary(workspaceId),
    getMonthlyCostReport(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">
          Weekly and monthly summaries of AI tool usage
        </p>
      </div>

      {/* Weekly Summary */}
      <WeeklySummary data={weeklySummary} />

      {/* Monthly Cost Report */}
      <MonthlyCost data={monthlyCost} />
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-80 animate-pulse rounded-lg bg-muted" />
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <ReportsContent />
    </Suspense>
  );
}
