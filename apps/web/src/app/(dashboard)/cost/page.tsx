import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getThisMonthStats,
  getMonthlyCostTrend,
  getCostByProject,
  getCostByDeveloper,
  getCostByProvider,
  getDistinctProviders,
} from "@/lib/db/queries/cost";
import { CostPageContent } from "@/components/dashboard/cost/CostPageContent";

interface CostPageProps {
  searchParams: Promise<{
    provider?: string;
  }>;
}

async function CostContent({ searchParams }: CostPageProps) {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;
  const params = await searchParams;
  const provider = params.provider;

  // Get this month's date range for breakdowns
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthStats, monthlyTrend, costByProject, costByDeveloper, costByProvider, distinctProviders] =
    await Promise.all([
      getThisMonthStats(workspaceId, { provider }),
      getMonthlyCostTrend(workspaceId, { months: 6, provider }),
      getCostByProject(workspaceId, { startDate: startOfMonth, provider }),
      getCostByDeveloper(workspaceId, { startDate: startOfMonth, provider }),
      getCostByProvider(workspaceId, { startDate: startOfMonth }),
      getDistinctProviders(workspaceId),
    ]);

  return (
    <CostPageContent
      data={{
        monthStats,
        monthlyTrend,
        costByProject,
        costByDeveloper,
        costByProvider,
      }}
      providers={distinctProviders}
      currentProvider={provider}
    />
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

export default function CostPage(props: CostPageProps) {
  return (
    <Suspense fallback={<CostSkeleton />}>
      <CostContent {...props} />
    </Suspense>
  );
}
