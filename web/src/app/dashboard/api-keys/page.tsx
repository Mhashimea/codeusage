import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserOrganization, listApiKeysWithStats } from "@/lib/api-keys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiKeyList } from "./api-key-list";
import { CreateApiKeyButton } from "./create-api-key-button";

export default async function ApiKeysPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const organization = await getUserOrganization(session.user.id);
  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-semibold mb-2">No Organization Found</h2>
        <p className="text-muted-foreground">Please contact support if this persists.</p>
      </div>
    );
  }

  const apiKeys = await listApiKeysWithStats(organization.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for the Afterburn CLI
          </p>
        </div>
        <CreateApiKeyButton organizationId={organization.id} userId={session.user.id} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            API keys are used to authenticate the Afterburn CLI with your account.
            Keep them secure and never share them publicly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyList apiKeys={apiKeys} organizationId={organization.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>
            Use your API key with the Afterburn CLI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Option 1: Environment Variable</p>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
              <code>export AFTERBURN_API_KEY=ab_your_key_here</code>
            </pre>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Option 2: Command Line Flag</p>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
              <code>afterburn --api-key ab_your_key_here</code>
            </pre>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Option 3: Login Command</p>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
              <code>afterburn login</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
