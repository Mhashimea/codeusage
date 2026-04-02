import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import {
  getDeveloperStats,
  getDeveloperDailyActivity,
  getDeveloperProjects,
  getDeveloperProviders,
} from "@/lib/db/queries/developers";
import { getTasksByWorkspace } from "@/lib/db/queries/tasks";
import {
  DeveloperProfileHeader,
  DeveloperMetrics,
  DeveloperProjectsBreakdown,
  DeveloperHeatmap,
  DeveloperTasksSection,
} from "@/components/dashboard/developers/profile";

interface DeveloperProfilePageProps {
  params: Promise<{ alias: string }>;
}

async function DeveloperProfileContent({ params }: DeveloperProfilePageProps) {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;
  const { alias } = await params;
  const decodedAlias = decodeURIComponent(alias);
  const currentYear = new Date().getFullYear();

  // Fetch all developer data in parallel
  const [stats, activity, projects, tasks, providers] = await Promise.all([
    getDeveloperStats(workspaceId, decodedAlias),
    getDeveloperDailyActivity(workspaceId, decodedAlias, { year: currentYear }),
    getDeveloperProjects(workspaceId, decodedAlias, { limit: 10 }),
    getTasksByWorkspace(workspaceId, { developer: decodedAlias, limit: 100 }),
    getDeveloperProviders(workspaceId, decodedAlias),
  ]);

  // Extract unique project slugs for filter
  const projectSlugs = [...new Set(tasks.map((t) => t.project_slug))];

  // If no stats found (totalTasks = 0 and no firstTask), developer doesn't exist
  if (stats.totalTasks === 0 && !stats.firstTask) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <DeveloperProfileHeader
        alias={decodedAlias}
        firstTask={stats.firstTask}
        lastTask={stats.lastTask}
        providers={providers}
      />

      {/* Metrics */}
      <DeveloperMetrics stats={stats} />

      {/* Two Column Layout: Heatmap + Projects */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Heatmap */}
        <DeveloperHeatmap
          alias={decodedAlias}
          initialData={activity}
          initialYear={currentYear}
        />
        <DeveloperProjectsBreakdown projects={projects} />
      </div>

      {/* Tasks Section - Full Width */}
      <DeveloperTasksSection
        tasks={tasks}
        projects={projectSlugs}
        alias={decodedAlias}
      />
    </div>
  );
}

function DeveloperProfileSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full animate-pulse bg-muted" />
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>

      {/* Hero metrics skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-36 animate-pulse rounded-lg bg-muted" />
        <div className="h-36 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Secondary stats skeleton */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>

      {/* Heatmap skeleton */}
      <div className="h-48 animate-pulse rounded-lg bg-muted" />

      {/* Two column skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export default function DeveloperProfilePage(props: DeveloperProfilePageProps) {
  return (
    <Suspense fallback={<DeveloperProfileSkeleton />}>
      <DeveloperProfileContent {...props} />
    </Suspense>
  );
}
