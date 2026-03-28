import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjectsByWorkspace, hasUntaggedTasks } from "@/lib/db/queries/projects";
import { getUniqueProviders } from "@/lib/db/queries/tasks";
import { ProjectList } from "@/components/dashboard/projects/ProjectList";
import { ProviderFilter } from "@/components/shared/ProviderFilter";

interface ProjectsPageProps {
  searchParams: Promise<{
    provider?: string;
  }>;
}

async function ProjectsContent({ searchParams }: ProjectsPageProps) {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;
  const params = await searchParams;
  const provider = params.provider;

  const [projects, hasUntagged, providers] = await Promise.all([
    getProjectsByWorkspace(workspaceId, { provider }),
    hasUntaggedTasks(workspaceId),
    getUniqueProviders(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">
            AI tool usage across your repositories
          </p>
        </div>
        <ProviderFilter providers={providers} />
      </div>

      {/* Project List */}
      <ProjectList projects={projects} hasUntagged={hasUntagged} />
    </div>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

export default function ProjectsPage(props: ProjectsPageProps) {
  return (
    <Suspense fallback={<ProjectsSkeleton />}>
      <ProjectsContent {...props} />
    </Suspense>
  );
}
