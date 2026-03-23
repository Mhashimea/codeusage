import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWeeklySummary, getMonthlyCostReport } from "@/lib/db/queries/reports";
import { getDistinctProviders } from "@/lib/db/queries/cost";
import { ReportsPageContent } from "@/components/dashboard/reports/ReportsPageContent";

async function ReportsContent() {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;

  const [weeklySummary, monthlyCost, distinctProviders] = await Promise.all([
    getWeeklySummary(workspaceId),
    getMonthlyCostReport(workspaceId),
    getDistinctProviders(workspaceId),
  ]);

  return (
    <ReportsPageContent
      initialData={{
        weeklySummary,
        monthlyCost,
      }}
      distinctProviders={distinctProviders}
    />
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
