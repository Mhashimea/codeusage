"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProviderIndicator } from "@/components/shared/ProviderBadge";
import { AlertTriangle, FolderGit2, Users, FileCode, Zap } from "lucide-react";
import { formatCost, formatTokens } from "@codeusage/shared";

interface Project {
  project_slug: string;
  task_count: number;
  total_tokens: number;
  total_cost: number;
  total_files_changed: number;
  contributor_count: number;
  contributors: string[];
  providers: string[];
  last_activity: string;
  share_percentage: number;
}

interface ProjectListProps {
  projects: Project[];
  hasUntagged: boolean;
}

export function ProjectList({ projects, hasUntagged }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FolderGit2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Connect the CLI to start tracking your projects. Run{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">npx codeusage init</code>{" "}
              to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary stats
  const totalCost = projects.reduce((sum, p) => sum + p.total_cost, 0);
  const totalTasks = projects.reduce((sum, p) => sum + p.task_count, 0);
  const totalFiles = projects.reduce((sum, p) => sum + p.total_files_changed, 0);
  const uniqueContributors = new Set(projects.flatMap(p => p.contributors)).size;

  return (
    <div className="space-y-6">
      {hasUntagged && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-200">
            Some tasks are not tagged to a project. Run{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">codeusage project set &lt;name&gt;</code>{" "}
            in those directories.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <FolderGit2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueContributors}</p>
                <p className="text-xs text-muted-foreground">Contributors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTasks}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <FileCode className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-500">{formatCost(totalCost)}</p>
                <p className="text-xs text-muted-foreground">Total Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.project_slug} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                    <FolderGit2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base truncate">
                        {project.project_slug}
                      </CardTitle>
                      {project.providers.map((p) => (
                        <ProviderIndicator key={p} providerId={p} />
                      ))}
                    </div>
                    {project.project_slug === "untagged" && (
                      <Badge variant="outline" className="mt-1 text-amber-500 border-amber-500/50">
                        Untagged
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-emerald-500">
                    {formatCost(project.total_cost)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {project.share_percentage.toFixed(1)}% of total
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Usage bar */}
              <div className="mb-4">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${project.share_percentage}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold">{project.task_count}</p>
                  <p className="text-xs text-muted-foreground">Tasks</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{formatTokens(project.total_tokens)}</p>
                  <p className="text-xs text-muted-foreground">Tokens</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{project.total_files_changed}</p>
                  <p className="text-xs text-muted-foreground">Files</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{project.contributor_count}</p>
                  <p className="text-xs text-muted-foreground">Devs</p>
                </div>
              </div>

              {/* Contributors */}
              {project.contributors.length > 0 && (
                <div className="flex items-center gap-1 mt-4 pt-4 border-t border-border">
                  <div className="flex -space-x-2">
                    {project.contributors.slice(0, 4).map((contributor) => (
                      <div
                        key={contributor}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium border-2 border-background"
                        title={contributor}
                      >
                        {contributor.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {project.contributors.length > 4 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs border-2 border-background">
                        +{project.contributors.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    {project.contributors.slice(0, 2).join(", ")}
                    {project.contributors.length > 2 && ` +${project.contributors.length - 2}`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
