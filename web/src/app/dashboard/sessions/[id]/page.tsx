import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSession, getUserOrganization } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatCost(cost: string | number | null): string {
  if (!cost) return "$0.00";
  const num = typeof cost === "string" ? parseFloat(cost) : cost;
  return `$${num.toFixed(4)}`;
}

function formatTokens(tokens: number | null): string {
  if (!tokens) return "0";
  return tokens.toLocaleString();
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function getTypeBadgeVariant(type: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch (type?.toLowerCase()) {
    case "feature":
      return "default";
    case "bug fix":
      return "destructive";
    case "refactor":
      return "secondary";
    default:
      return "outline";
  }
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const authSession = await auth();
  if (!authSession?.user?.id) {
    redirect("/login");
  }

  const organization = await getUserOrganization(authSession.user.id);
  if (!organization) {
    redirect("/dashboard");
  }

  const session = await getSession(id);
  if (!session) {
    notFound();
  }

  // Parse actions JSON if available
  const actions = session.actionsJson as Array<{
    type: string;
    tool?: string;
    file?: string;
    timestamp?: string;
  }> | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span>{session.projectName}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Session {formatDate(session.startedAt)}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            {session.aiType && (
              <Badge variant={getTypeBadgeVariant(session.aiType)}>
                {session.aiType}
              </Badge>
            )}
            {session.branch && (
              <Badge variant="outline" className="font-mono">
                {session.branch}
              </Badge>
            )}
            {session.commitHash && (
              <Badge variant="outline" className="font-mono text-xs">
                {session.commitHash.slice(0, 7)}
              </Badge>
            )}
          </div>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(session.durationSeconds)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Files Changed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session.filesChanged}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{session.linesAdded}</span>
              {" / "}
              <span className="text-red-600">-{session.linesRemoved}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session.commitsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tokens Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTokens(session.totalTokens)}</div>
            <p className="text-xs text-muted-foreground">
              {session.model || "Unknown model"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(session.estimatedCost)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="report">Full Report</TabsTrigger>
          <TabsTrigger value="actions">Actions ({session.actionsCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>AI Summary</CardTitle>
              <CardDescription>
                Generated analysis of this coding session
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session.aiSummary ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{session.aiSummary}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No AI summary available for this session.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle>Full Report</CardTitle>
              <CardDescription>
                Complete session report in markdown format
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session.reportMarkdown ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {session.reportMarkdown}
                  </pre>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No report available for this session.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Session Actions</CardTitle>
              <CardDescription>
                Tools and operations used during this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actions && actions.length > 0 ? (
                <div className="space-y-2">
                  {actions.map((action, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                    >
                      <Badge variant="outline" className="font-mono text-xs">
                        {action.tool || action.type}
                      </Badge>
                      {action.file && (
                        <span className="text-sm font-mono text-muted-foreground truncate">
                          {action.file}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No actions recorded for this session.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Token breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Token Usage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Input Tokens</p>
              <p className="text-xl font-semibold">{formatTokens(session.inputTokens)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Output Tokens</p>
              <p className="text-xl font-semibold">{formatTokens(session.outputTokens)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cache Read Tokens</p>
              <p className="text-xl font-semibold">{formatTokens(session.cacheReadTokens)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tokens</p>
              <p className="text-xl font-semibold">{formatTokens(session.totalTokens)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
