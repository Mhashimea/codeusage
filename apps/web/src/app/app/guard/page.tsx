import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserWorkspaceRole } from "@/lib/db/queries/workspaces";
import { getPromptGuardSettings } from "@/lib/db/queries/prompt-guard";
import { GuardPageContent } from "@/components/dashboard/guard/GuardPageContent";

async function GuardContent() {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  // Fetch role and settings
  const [userRole, settings] = await Promise.all([
    getUserWorkspaceRole(session.user.id, session.user.workspaceId),
    getPromptGuardSettings(session.user.workspaceId),
  ]);

  const isEnabled = settings?.enabled === 1;
  const canEdit = userRole === "admin" || userRole === "owner";
  const disabledPatterns = (settings?.disabled_patterns as string[]) || [];
  const disabledCategories = (settings?.disabled_categories as string[]) || [];

  return (
    <GuardPageContent
      enabled={isEnabled}
      canEdit={canEdit}
      disabledPatterns={disabledPatterns}
      disabledCategories={disabledCategories}
      updatedAt={settings?.updated_at?.toISOString()}
    />
  );
}

function GuardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-6 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

export default function GuardPage() {
  return (
    <Suspense fallback={<GuardSkeleton />}>
      <GuardContent />
    </Suspense>
  );
}
