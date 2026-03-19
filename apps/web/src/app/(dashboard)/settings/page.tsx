import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWorkspaceById } from "@/lib/db/queries/workspaces";
import { ApiKeySection } from "@/components/dashboard/settings/ApiKeySection";
import { WorkspaceConfig } from "@/components/dashboard/settings/WorkspaceConfig";
import { DeveloperRoster } from "@/components/dashboard/settings/DeveloperRoster";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function SettingsContent() {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const workspace = await getWorkspaceById(session.user.workspaceId);

  if (!workspace) {
    redirect("/login");
  }

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
      <WorkspaceConfig workspace={workspace} />

      {/* API Key */}
      <ApiKeySection workspaceId={workspace.id} hasExistingKey={!!workspace.api_key_hash} />

      {/* Developer Roster */}
      <DeveloperRoster workspaceId={workspace.id} />

      {/* CLI Installation */}
      <Card>
        <CardHeader>
          <CardTitle>CLI Installation</CardTitle>
          <CardDescription>
            Install the Afterburn CLI to start tracking Claude Code usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 font-mono text-sm">
            npm install -g @hashim_ea/afterburn
          </div>
          <div className="text-sm text-muted-foreground">
            After installation, run <code className="rounded bg-muted px-1">afterburn init</code> and
            enter your API key when prompted.
          </div>
        </CardContent>
      </Card>
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
