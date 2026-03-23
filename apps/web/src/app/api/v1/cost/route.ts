import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getThisMonthStats,
  getMonthlyCostTrend,
  getCostByProject,
  getCostByDeveloper,
  getCostByProvider,
} from "@/lib/db/queries/cost";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider") || undefined;

  // Get this month's date range for breakdowns
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthStats, monthlyTrend, costByProject, costByDeveloper, costByProvider] =
    await Promise.all([
      getThisMonthStats(workspaceId, { provider }),
      getMonthlyCostTrend(workspaceId, { months: 6, provider }),
      getCostByProject(workspaceId, { startDate: startOfMonth, provider }),
      getCostByDeveloper(workspaceId, { startDate: startOfMonth, provider }),
      getCostByProvider(workspaceId, { startDate: startOfMonth }),
    ]);

  return NextResponse.json({
    monthStats,
    monthlyTrend,
    costByProject,
    costByDeveloper,
    costByProvider,
  });
}
