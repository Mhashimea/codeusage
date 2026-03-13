import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserOrganization, getOrganizationSessions, getOrganizationProjects } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatCost(cost: string | number | null): string {
  if (!cost) return "$0.00";
  const num = typeof cost === "string" ? parseFloat(cost) : cost;
  return `$${num.toFixed(2)}`;
}

function formatTokens(tokens: number | null): string {
  if (!tokens) return "0";
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
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

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; page?: string }>;
}) {
  const { project: projectFilter, page: pageParam } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const organization = await getUserOrganization(session.user.id);
  if (!organization) {
    redirect("/dashboard");
  }

  const page = parseInt(pageParam || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const [{ sessions: allSessions, total }, projects] = await Promise.all([
    getOrganizationSessions(organization.id, {
      limit,
      offset,
      projectId: projectFilter,
    }),
    getOrganizationProjects(organization.id),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
        <p className="text-muted-foreground">
          All your AI coding sessions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search sessions..."
                className="max-w-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                href="/dashboard/sessions"
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  !projectFilter
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                }`}
              >
                All Projects
              </Link>
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/sessions?project=${p.id}`}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    projectFilter === p.id
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  }`}
                >
                  {p.name}
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions table */}
      <Card>
        <CardContent className="pt-6">
          {allSessions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-4 text-lg font-semibold">No sessions found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {projectFilter
                  ? "No sessions found for this project."
                  : "Run your first analysis with Afterburn CLI to see sessions here."}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Changes</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/sessions/${s.id}`}
                          className="font-medium hover:underline"
                        >
                          {s.projectName}
                        </Link>
                        {s.branch && (
                          <div className="text-xs text-muted-foreground font-mono">{s.branch}</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <Link href={`/dashboard/sessions/${s.id}`}>
                          {s.aiSummary ? (
                            <span className="text-sm truncate block">{s.aiSummary.slice(0, 60)}...</span>
                          ) : (
                            <span className="text-muted-foreground">No summary</span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {s.aiType && (
                          <Badge variant={getTypeBadgeVariant(s.aiType)}>
                            {s.aiType}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDuration(s.durationSeconds)}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600">+{s.linesAdded}</span>
                        {" / "}
                        <span className="text-red-600">-{s.linesRemoved}</span>
                      </TableCell>
                      <TableCell className="text-right">{formatTokens(s.totalTokens)}</TableCell>
                      <TableCell className="text-right">{formatCost(s.estimatedCost)}</TableCell>
                      <TableCell>{formatDate(s.startedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} sessions
                  </p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={`/dashboard/sessions?page=${page - 1}${projectFilter ? `&project=${projectFilter}` : ""}`}
                        className="px-3 py-1.5 text-sm rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      >
                        Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/dashboard/sessions?page=${page + 1}${projectFilter ? `&project=${projectFilter}` : ""}`}
                        className="px-3 py-1.5 text-sm rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      >
                        Next
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
