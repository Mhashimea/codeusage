import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDeveloperDailyActivity } from "@/lib/db/queries/developers";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const alias = searchParams.get("alias");
  const yearParam = searchParams.get("year");

  if (!alias) {
    return NextResponse.json({ error: "Missing alias parameter" }, { status: 400 });
  }

  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  // Validate year
  if (isNaN(year) || year < 2000 || year > new Date().getFullYear() + 1) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const activityData = await getDeveloperDailyActivity(
    session.user.workspaceId,
    alias,
    { year }
  );

  return NextResponse.json(activityData);
}
