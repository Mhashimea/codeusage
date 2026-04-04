import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWorkspaceById, getUserWorkspaceRole } from "@/lib/db/queries/workspaces";
import { ApiKeySection } from "@/components/dashboard/settings/ApiKeySection";
import { WorkspaceConfig } from "@/components/dashboard/settings/WorkspaceConfig";
import { DeveloperRoster } from "@/components/dashboard/settings/DeveloperRoster";
import { MembersSection } from "@/components/dashboard/settings/MembersSection";

async function SettingsContent() {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspace = await getWorkspaceById(session.user.workspaceId);

  if (!workspace) {
    redirect("/login");
  }

  // Fetch role directly from database (more reliable than session)
  const userRole = await getUserWorkspaceRole(session.user.id, session.user.workspaceId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace configuration
        </p>
      </div>

      {/* Workspace Config */}
      <WorkspaceConfig workspace={workspace} userRole={userRole} />

      {/* Team Members */}
      <MembersSection
        workspaceId={workspace.id}
        userRole={userRole}
        currentUserId={session.user.id}
      />

      {/* API Key - Only visible to owners */}
      {userRole === "owner" && <ApiKeySection />}

      {/* Developer Roster */}
      <DeveloperRoster workspaceId={workspace.id} />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}
