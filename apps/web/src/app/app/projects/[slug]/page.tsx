import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import {
  getProjectStats,
  getProjectDailyActivity,
  getProjectDevelopers,
  getProjectProviders,
} from "@/lib/db/queries/projects";
import { getTasksByWorkspace } from "@/lib/db/queries/tasks";
import {
  ProjectProfileHeader,
  ProjectMetrics,
  ProjectDevelopersBreakdown,
  ProjectHeatmap,
  ProjectTasksSection,
} from "@/components/dashboard/projects/profile";

interface ProjectProfilePageProps {
  params: Promise<{ slug: string }>;
}

async function ProjectProfileContent({ params }: ProjectProfilePageProps) {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const currentYear = new Date().getFullYear();

  // Fetch all project data in parallel
  const [stats, activity, developers, tasks, providers] = await Promise.all([
    getProjectStats(workspaceId, decodedSlug),
    getProjectDailyActivity(workspaceId, decodedSlug, { year: currentYear }),
    getProjectDevelopers(workspaceId, decodedSlug, { limit: 10 }),
    getTasksByWorkspace(workspaceId, { project: decodedSlug, limit: 100 }),
    getProjectProviders(workspaceId, decodedSlug),
  ]);

  // Extract unique developer aliases for filter
  const developerAliases = [...new Set(tasks.map((t) => t.developer_alias))];

  // If no stats found (totalTasks = 0 and no firstTask), project doesn't exist
  if (stats.totalTasks === 0 && !stats.firstTask) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <ProjectProfileHeader
        projectSlug={decodedSlug}
        firstTask={stats.firstTask}
        lastTask={stats.lastTask}
        providers={providers}
      />

      {/* Metrics */}
      <ProjectMetrics stats={stats} />

      {/* Two Column Layout: Heatmap + Developers */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Heatmap */}
        <ProjectHeatmap
          projectSlug={decodedSlug}
          initialData={activity}
          initialYear={currentYear}
        />
        <ProjectDevelopersBreakdown developers={developers} />
      </div>

      {/* Tasks Section - Full Width */}
      <ProjectTasksSection
        tasks={tasks}
        developers={developerAliases}
        projectSlug={decodedSlug}
      />
    </div>
  );
}

function ProjectProfileSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-xl animate-pulse bg-muted" />
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

      {/* Two column skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Tasks skeleton */}
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

export default function ProjectProfilePage(props: ProjectProfilePageProps) {
  return (
    <Suspense fallback={<ProjectProfileSkeleton />}>
      <ProjectProfileContent {...props} />
    </Suspense>
  );
}
