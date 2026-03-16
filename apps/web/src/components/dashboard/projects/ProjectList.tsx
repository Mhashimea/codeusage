"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { formatCost, formatTokens } from "@afterburn/shared";

interface Project {
  project_slug: string;
  task_count: number;
  total_tokens: number;
  total_cost: number;
  total_files_changed: number;
  contributor_count: number;
  contributors: string[];
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
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No projects yet. Connect the CLI to start tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {hasUntagged && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Untagged tasks detected</AlertTitle>
          <AlertDescription>
            Some tasks are not associated with a project. Run{" "}
            <code className="bg-muted px-1 rounded">afterburn project set &lt;name&gt;</code>{" "}
            in those directories to tag them.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.project_slug}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">
                      {project.project_slug}
                    </h3>
                    {project.project_slug === "untagged" && (
                      <Badge variant="destructive">Untagged</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {project.contributors.slice(0, 3).map((contributor) => (
                      <div
                        key={contributor}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium"
                        title={contributor}
                      >
                        {contributor.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {project.contributors.length > 3 && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                        +{project.contributors.length - 3}
                      </div>
                    )}
                  </div>
                </div>

                {/* Share bar */}
                <div className="mb-3">
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${project.share_percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {project.share_percentage.toFixed(1)}% of total usage
                  </p>
                </div>

                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tasks</p>
                    <p className="font-medium">{project.task_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tokens</p>
                    <p className="font-medium">{formatTokens(project.total_tokens)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cost</p>
                    <p className="font-medium text-green-500">
                      {formatCost(project.total_cost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Files Changed</p>
                    <p className="font-medium">{project.total_files_changed}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Contributors</p>
                    <p className="font-medium">{project.contributor_count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
