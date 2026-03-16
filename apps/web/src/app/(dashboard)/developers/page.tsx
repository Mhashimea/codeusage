import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDevelopersByWorkspace, getDeveloperActivity } from "@/lib/db/queries/developers";
import { DeveloperList } from "@/components/dashboard/developers/DeveloperList";

async function DevelopersContent() {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;

  const [developers, activity] = await Promise.all([
    getDevelopersByWorkspace(workspaceId),
    getDeveloperActivity(workspaceId, { days: 14 }),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Developers</h1>
        <p className="text-muted-foreground">
          Team members using AI coding tools
        </p>
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

export default function DevelopersPage() {
  return (
    <Suspense fallback={<DevelopersSkeleton />}>
      <DevelopersContent />
    </Suspense>
  );
}
