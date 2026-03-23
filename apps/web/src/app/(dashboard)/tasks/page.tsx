import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getTasksByWorkspace,
  countTasksFiltered,
  getUniqueDevelopers,
  getUniqueProjects,
} from "@/lib/db/queries/tasks";
import { TaskList } from "@/components/dashboard/tasks/TaskList";
import { TaskFilters } from "@/components/dashboard/tasks/TaskFilters";

interface TasksPageProps {
  searchParams: Promise<{
    page?: string;
    developer?: string;
    project?: string;
    date?: string;
  }>;
}

function getDateRange(dateFilter: string | undefined): { startDate?: Date; endDate?: Date } {
  if (!dateFilter || dateFilter === "all") {
    return {};
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (dateFilter) {
    case "today":
      return { startDate: today };
    case "7d":
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      return { startDate: sevenDaysAgo };
    case "30d":
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return { startDate: thirtyDaysAgo };
    case "90d":
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(today.getDate() - 90);
      return { startDate: ninetyDaysAgo };
    case "this_month":
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: startOfMonth };
    case "last_month":
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { startDate: startOfLastMonth, endDate: endOfLastMonth };
    default:
      return {};
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

  const { startDate, endDate } = getDateRange(params.date);

  const [tasks, total, developers, projects] = await Promise.all([
    getTasksByWorkspace(workspaceId, {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      developer: params.developer,
      project: params.project,
      startDate,
      endDate,
    }),
    countTasksFiltered(workspaceId, {
      developer: params.developer,
      project: params.project,
      startDate,
      endDate,
    }),
    getUniqueDevelopers(workspaceId),
    getUniqueProjects(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground">
            {total.toLocaleString()} task{total !== 1 ? 's' : ''} tracked
          </p>
        </div>
        <TaskFilters developers={developers} projects={projects} />
      </div>

      {/* Task List */}
      <TaskList
        tasks={tasks}
        pagination={{
          page,
          pageSize,
          total,
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
