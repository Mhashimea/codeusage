import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDevelopersByWorkspace, getDeveloperActivity } from "@/lib/db/queries/developers";
import { getUniqueProviders } from "@/lib/db/queries/tasks";
import { DeveloperList } from "@/components/dashboard/developers/DeveloperList";
import { ProviderFilter } from "@/components/shared/ProviderFilter";

interface DevelopersPageProps {
  searchParams: Promise<{
    provider?: string;
  }>;
}

async function DevelopersContent({ searchParams }: DevelopersPageProps) {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;
  const params = await searchParams;
  const provider = params.provider;

  const [developers, activity, providers] = await Promise.all([
    getDevelopersByWorkspace(workspaceId, { provider }),
    getDeveloperActivity(workspaceId, { days: 14 }),
    getUniqueProviders(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Developers</h1>
          <p className="text-muted-foreground">
            Team members using AI coding tools
          </p>
        </div>
        <ProviderFilter providers={providers} />
      </div>

      {/* Developer List */}
      <DeveloperList developers={developers} activity={activity} />
    </div>
  );
}

function DevelopersSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

export default function DevelopersPage(props: DevelopersPageProps) {
  return (
    <Suspense fallback={<DevelopersSkeleton />}>
      <DevelopersContent {...props} />
    </Suspense>
  );
}
