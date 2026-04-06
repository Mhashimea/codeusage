import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { parse } from "date-fns";
import {
  getTasksGroupedBySession,
  getUniqueDevelopers,
  getUniqueProjects,
  getUniqueProviders,
  getTodayStats,
} from "@/lib/db/queries/tasks";
import { formatTokens } from "@codeusage/shared";
import { Activity, ListTodo, Users, Zap } from "lucide-react";
import { TaskList } from "@/components/dashboard/tasks/TaskList";
import { TaskFilters } from "@/components/dashboard/tasks/TaskFilters";

interface TasksPageProps {
  searchParams: Promise<{
    page?: string;
    developer?: string;
    project?: string;
    provider?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

function parseDateRange(startDateStr?: string, endDateStr?: string): { startDate: Date; endDate: Date } {
  // Default to last 5 days
  const today = new Date();
  const fiveDaysAgo = new Date(today);
  fiveDaysAgo.setDate(today.getDate() - 5);
  fiveDaysAgo.setHours(0, 0, 0, 0);

  const defaultEnd = new Date(today);
  defaultEnd.setHours(23, 59, 59, 999);

  if (!startDateStr) {
    return { startDate: fiveDaysAgo, endDate: defaultEnd };
  }

  try {
    const startDate = parse(startDateStr, "yyyy-MM-dd", new Date());
    // Set start of day
    startDate.setHours(0, 0, 0, 0);

    let endDate: Date;
    if (endDateStr) {
      endDate = parse(endDateStr, "yyyy-MM-dd", new Date());
      // Set end of day
      endDate.setHours(23, 59, 59, 999);
    } else {
      // If only start date, use end of that day
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  } catch {
    return { startDate: fiveDaysAgo, endDate: defaultEnd };
  }
}

async function TasksContent({ searchParams }: TasksPageProps) {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const pageSize = 20;

  const { startDate, endDate } = parseDateRange(params.startDate, params.endDate);

  const [groupedData, developers, projects, providers, todayStats] = await Promise.all([
    getTasksGroupedBySession(workspaceId, {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      developer: params.developer,
      project: params.project,
      provider: params.provider,
      startDate,
      endDate,
    }),
    getUniqueDevelopers(workspaceId),
    getUniqueProjects(workspaceId),
    getUniqueProviders(workspaceId),
    getTodayStats(workspaceId),
  ]);

  const { groups: sessionGroups, totalTasks, totalSessions } = groupedData;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground">
            {totalTasks.toLocaleString()} task{totalTasks !== 1 ? 's' : ''} in {totalSessions.toLocaleString()} session{totalSessions !== 1 ? 's' : ''}
          </p>
        </div>
        <TaskFilters developers={developers} projects={projects} providers={providers} />
      </div>

      {/* Today's Activity */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#D97757]/10 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5 text-[#D97757]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{todayStats.totalSessions}</p>
            <p className="text-xs text-muted-foreground mt-1">Sessions today</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <ListTodo className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{todayStats.totalTasks}</p>
            <p className="text-xs text-muted-foreground mt-1">Tasks today</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{todayStats.activeDevelopers}</p>
            <p className="text-xs text-muted-foreground mt-1">Active devs</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{formatTokens(todayStats.totalTokens)}</p>
            <p className="text-xs text-muted-foreground mt-1">Tokens today</p>
          </div>
        </div>
      </div>

      {/* Task List */}
      <TaskList
        sessionGroups={sessionGroups}
        pagination={{
          page,
          pageSize,
          totalSessions,
          totalTasks,
        }}
      />
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

export default function TasksPage(props: TasksPageProps) {
  return (
    <Suspense fallback={<TasksSkeleton />}>
      <TasksContent {...props} />
    </Suspense>
  );
}
