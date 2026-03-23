import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWeeklySummary, getMonthlyCostReport } from "@/lib/db/queries/reports";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider") || undefined;

  const [weeklySummary, monthlyCost] = await Promise.all([
    getWeeklySummary(workspaceId, { provider }),
    getMonthlyCostReport(workspaceId, { provider }),
  ]);

  return NextResponse.json({
    weeklySummary,
    monthlyCost,
  });
}
